import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as m from '../src/features/workout/model.ts'
import { isWorkoutState, loadWorkout, persistWorkoutUpdate, saveWorkout, STORAGE_KEY } from '../src/features/workout/storage.ts'

const NOW = new Date(2026, 9, 26, 12, 0).getTime()
function initial() {
  const state = m.createInitialState()
  state.routines = [{ ...state.routines[0], exercises: [state.routines[0].exercises[0]] }]
  state.schedule = { 1: 'push' }
  return state
}
function working(state = initial()) { return m.beginWorking(m.startWorkout(state, 'push', NOW)) }
function complete(state, reps, now = NOW + 1000, exerciseId = state.active.exercises[0].id) {
  for (let i = 0; i < reps.length; i++) {
    const set = state.active.exercises.find(e => e.id === exerciseId).sets[i]
    state = m.editReps(state, exerciseId, set.id, String(reps[i]))
    state = m.completeSet(state, exerciseId, set.id, now + i * 1000)
  }
  return state
}
function performed(state, reps) { return m.finishWorkout(complete(working(state), reps), NOW + 60000) }
function memory() { const values = new Map(); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } }

test('ID generation uses the native UUID API when available', t => {
  const expected = 'f043ea6b-904d-4c3b-9dc1-1db79af4779a'
  t.mock.method(crypto, 'randomUUID', () => expected)
  assert.equal(m.newId(), expected)
})

test('LAN HTTP without randomUUID can create and restore workouts with unique UUID v4 IDs', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  const getRandomValues = crypto.getRandomValues.bind(crypto)
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues } })
  try {
    const ids = Array.from({ length: 256 }, () => m.newId())
    assert.equal(new Set(ids).size, ids.length)
    for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    const state = working()
    const storage = memory()
    saveWorkout(storage, state)
    assert.deepEqual(loadWorkout(storage).state, state)
    assert.equal(loadWorkout(storage).blocked, false)
    assert.equal(new Set([state.active.id, ...state.active.exercises[0].sets.map(s => s.id)]).size, 4)
  } finally { Object.defineProperty(globalThis, 'crypto', descriptor) }
})

test('selects the current weekday or manual override without creating a workout; rest day remains empty', () => {
  const state = m.createInitialState()
  assert.equal(m.selectRoutine(state, new Date(2026, 9, 26)).id, 'push')
  assert.equal(m.selectRoutine(state, new Date(2026, 9, 26), 'pull').id, 'pull')
  assert.equal(m.selectRoutine(state, new Date(2026, 10, 1)), null)
  assert.equal(state.active, null)
  assert.equal(state.schedule[1], 'push')
})

test('routine creation, edits, multiple weekdays and delete leave completed history and active snapshots intact', () => {
  let state = performed(initial(), [10, 9, 7])
  const history = structuredClone(state.history)
  state = working(state)
  const active = structuredClone(state.active)
  const routine = structuredClone(state.routines[0])
  routine.name = '새 이름'
  routine.exercises[0] = { ...routine.exercises[0], setCount: 4, minReps: 8, maxReps: 12, initialWeight: 62.5 }
  const saved = m.saveRoutine(state, routine, [2, 4])
  assert.deepEqual(saved.schedule, { 2: 'push', 4: 'push' })
  assert.equal(saved.routines[0].exercises[0].initialWeight, 62.5)
  assert.equal(saved.progress['push-bench'], 60)
  assert.deepEqual(saved.active, active)
  assert.deepEqual(saved.history, history)
  const deleted = m.deleteRoutine(saved, 'push')
  assert.deepEqual(deleted.active, active)
  assert.deepEqual(deleted.history, history)
  assert.deepEqual(deleted.schedule, {})
  const created = m.saveRoutine(deleted, { ...routine, id: 'new', exercises: [{ ...routine.exercises[0], id: 'new-placement' }] }, [])
  assert.equal(created.progress['new-placement'], 62.5)
  assert.equal(state.routines[0].name, 'PUSH DAY')
})

test('requires explicit confirmation before replacing another routine weekday', () => {
  const state = m.createInitialState()
  const routine = state.routines[1]
  assert.deepEqual(m.scheduleConflicts(state, routine.id, [1, 2]), [1])
  assert.throws(() => m.saveRoutine(state, routine, [1, 2]), /교체/)
  assert.equal(m.saveRoutine(state, routine, [1, 2], true).schedule[1], 'pull')
})

test('routine validation accepts zero and decimals, equal min/max and rejects invalid fields', () => {
  const routine = initial().routines[0]
  assert.equal(m.validateRoutine({ ...routine, exercises: [{ ...routine.exercises[0], minReps: 10, maxReps: 10, initialWeight: 0 }] }), null)
  for (const patch of [{ setCount: 0 }, { setCount: 1.5 }, { minReps: 0 }, { maxReps: 5 }, { initialWeight: -1 }, { initialWeight: Infinity }]) assert.ok(m.validateRoutine({ ...routine, exercises: [{ ...routine.exercises[0], ...patch }] }))
  assert.ok(m.validateRoutine({ ...routine, name: ' ' }))
  assert.ok(m.validateRoutine({ ...routine, exercises: [] }))
})

test('start captures real time immediately and must enter warmup; duplicate start does not reset it', () => {
  const state = m.startWorkout(initial(), 'push', NOW)
  assert.equal(state.active.phase, 'warmup')
  assert.equal(state.active.startedAt, NOW)
  assert.equal(m.summary(state.active, NOW + 75000).elapsed, 75000)
  assert.equal(m.summary(state.active, NOW + 75000).sets, 0)
  assert.equal(m.summary(state.active, NOW + 75000).volume, 0)
  assert.equal(m.startWorkout(state, 'push', NOW + 5000), state)
  const e = state.active.exercises[0]
  assert.throws(() => m.completeSet(state, e.id, e.sets[0].id, NOW), /준비운동/)
})

test('benchmarks keep whole results: 10/9/7 → 10/8/6 → 10/9/8, keeping every actual history', () => {
  let state = performed(initial(), [10, 9, 7])
  const key = m.benchmarkKey('push', state.routines[0].exercises[0], 60)
  assert.deepEqual(state.benchmarks[key].reps, [10, 9, 7])
  state = performed(state, [10, 8, 6])
  assert.deepEqual(state.benchmarks[key].reps, [10, 9, 7])
  state = performed(state, [10, 9, 8])
  assert.deepEqual(state.benchmarks[key].reps, [10, 9, 8])
  assert.deepEqual(state.history.map(s => s.exercises[0].sets.map(s => s.actual.reps)), [[10, 9, 8], [10, 8, 6], [10, 9, 7]])
  const previous = state.benchmarks[key].sessionId
  state = performed(state, [9, 9, 9])
  assert.equal(state.benchmarks[key].sessionId, previous)
})

test('benchmark prefill is never a performance until explicitly completed', () => {
  const state = working(performed(initial(), [10, 9, 7]))
  assert.deepEqual(state.active.exercises[0].sets.map(s => s.reps), ['10', '9', '7'])
  assert.deepEqual(m.summary(state.active, NOW), { sets: 0, volume: 0, elapsed: 0 })
  const ended = m.finishWorkout(state, NOW + 10000, true)
  assert.deepEqual(ended.history[0].exercises[0].sets, [])
})

test('all upper targets recommend an increase without changing weight; lower targets recommend review', () => {
  const state = complete(working(), [10, 10, 10])
  assert.equal(m.recommendation(state.active.exercises[0]), 'increase')
  assert.equal(state.progress['push-bench'], 60)
  assert.equal(m.recommendation(complete(working(), [10, 9, 10]).active.exercises[0]), null)
  assert.equal(m.recommendation(complete(working(), [10, 5, 8]).active.exercises[0]), 'decrease')
})

test('today-only weight never alters approved progress or benchmark, while approval starts with blank reps', () => {
  let state = performed(initial(), [10, 9, 7])
  const benchmarks = structuredClone(state.benchmarks)
  state = m.changeWeight(working(state), 'push-bench', 55, 'today')
  assert.equal(state.progress['push-bench'], 60)
  state = m.finishWorkout(complete(state, [20, 20, 20]), NOW + 60000)
  assert.deepEqual(state.benchmarks, benchmarks)
  assert.equal(state.history[0].exercises[0].sets[0].actual.weight, 55)
  state = working(state)
  assert.equal(state.active.exercises[0].weight, 60)
  assert.deepEqual(state.active.exercises[0].sets.map(s => s.reps), ['10', '9', '7'])
  state = m.changeWeight(state, 'push-bench', 62.5, 'progress')
  assert.equal(state.progress['push-bench'], 62.5)
  assert.deepEqual(state.active.exercises[0].sets.map(s => s.reps), ['', '', ''])
  assert.deepEqual(state.benchmarks, benchmarks)
  state = m.finishWorkout(state, NOW + 60000, true)
  assert.equal(working(state).active.exercises[0].weight, 62.5)
})

test('changing weight preserves already completed actuals and excludes mixed weights from benchmarks', () => {
  let state = complete(working(), [10])
  const actual = structuredClone(state.active.exercises[0].sets[0].actual)
  state = m.changeWeight(state, 'push-bench', 62.5, 'progress')
  assert.deepEqual(state.active.exercises[0].sets[0].actual, actual)
  const e = state.active.exercises[0]
  for (const set of e.sets.slice(1)) {
    state = m.editReps(state, e.id, set.id, '10')
    state = m.completeSet(state, e.id, set.id, NOW + 10000)
  }
  assert.equal(m.recommendation(state.active.exercises[0]), null)
  assert.deepEqual(m.finishWorkout(state, NOW + 60000).benchmarks, {})
})

test('intermediate sets start rest by timestamps, can extend it and end it early', () => {
  let state = complete(working(), [10, 9])
  assert.equal(state.active.timer.kind, 'rest')
  assert.equal(state.active.timer.endAt, NOW + 2000 + 120000)
  state = m.adjustRest(state, 30, NOW + 4000)
  assert.equal(state.active.timer.endAt, NOW + 2000 + 150000)
  state = m.adjustRest(state, null, NOW + 5000)
  assert.equal(state.active.timer, null)
  assert.equal(m.restSeconds(8), 180)
  assert.equal(m.restSeconds(12), 120)
  assert.equal(m.restSeconds(13), 90)
})

test('transition timer uses the last completed timestamp, then the next set switches back to rest', () => {
  let state = working(m.createInitialState())
  state = complete(state, [10, 9, 7])
  const second = state.active.exercises[1]
  assert.equal(state.active.currentExerciseId, state.active.exercises[0].id)
  assert.ok(second.sets.every(s => s.actual === null))
  assert.equal(state.active.timer.kind, 'transition')
  assert.equal(state.active.timer.since, NOW + 3000)
  const transition = structuredClone(state.active.timer)
  state = m.navigateExercise(state, m.nextIncompleteExercise(state.active, state.active.currentExerciseId).id)
  assert.equal(state.active.currentExerciseId, second.id)
  assert.deepEqual(state.active.timer, transition)
  state = m.editReps(state, second.id, second.sets[0].id, '10')
  state = m.completeSet(state, second.id, second.sets[0].id, NOW + 300000)
  assert.equal(state.active.timer.kind, 'rest')
  assert.equal(state.active.timer.endAt, NOW + 420000)
})

test('session-only sets, exercises, reorder, removal and replacement preserve original routines', () => {
  let state = working(m.createInitialState())
  const originals = structuredClone(state.routines)
  const first = state.active.exercises[0]
  state = m.addSessionSet(state, first.id)
  const addedSet = state.active.exercises[0].sets.at(-1)
  state = m.removeSessionSet(state, first.id, addedSet.id)
  state = m.addSessionExercise(state, 'squat')
  const added = state.active.exercises.at(-1)
  state = m.reorderSessionExercise(state, added.id, -1)
  state = m.removeSessionExercise(state, first.id)
  assert.deepEqual(state.routines, originals)
  assert.ok(state.active.exercises.some(e => e.id === added.id))
})

test('completed data cannot be removed accidentally and explicit undo clears its timer', () => {
  let state = complete(working(), [8])
  const e = state.active.exercises[0]
  assert.throws(() => m.removeSessionSet(state, e.id, e.sets[0].id), /완료/)
  assert.throws(() => m.removeSessionExercise(state, e.id), /완료/)
  state = m.undoSet(state, e.id, e.sets[0].id)
  assert.equal(state.active.exercises[0].sets[0].actual, null)
  assert.equal(state.active.timer, null)
  assert.equal(m.summary(state.active, NOW).sets, 0)
})

test('partial completion requires confirmation and summary includes only completed volume with decimal and zero kg', () => {
  let state = working()
  state = m.changeWeight(state, 'push-bench', 62.5, 'today')
  state = complete(state, [8])
  assert.throws(() => m.finishWorkout(state, NOW + 60000), /미완료/)
  const ended = m.finishWorkout(state, NOW + 60000, true)
  assert.deepEqual(m.summary(ended.history[0], NOW + 90000), { sets: 1, volume: 500, elapsed: 60000 })
  assert.deepEqual(ended.benchmarks, {})
  state = complete(m.changeWeight(working(), 'push-bench', 0, 'today'), [8])
  assert.equal(m.summary(state.active, NOW).volume, 0)
  assert.equal(m.summary(state.active, NOW).sets, 1)
})

test('invalid repetitions including zero are rejected and completing twice is idempotent', () => {
  let state = working()
  const e = state.active.exercises[0]
  for (const value of ['', ' ', '0', '-1', '1.5', 'Infinity', 'hello', '9007199254740992']) {
    const draft = m.editReps(state, e.id, e.sets[0].id, value)
    assert.throws(() => m.completeSet(draft, e.id, e.sets[0].id, NOW), /반복/)
  }
  state = complete(state, [1])
  const completedAt = state.active.exercises[0].sets[0].actual.completedAt
  state = m.completeSet(state, e.id, e.sets[0].id, NOW + 99999)
  assert.equal(state.active.exercises[0].sets[0].actual.completedAt, completedAt)
})

test('local storage round trips warmup, active drafts, timestamps, history and changed progress', () => {
  const storage = memory()
  let state = m.startWorkout(initial(), 'push', NOW)
  saveWorkout(storage, state)
  assert.deepEqual(loadWorkout(storage).state, state)
  state = complete(m.beginWorking(state), [10])
  const e = state.active.exercises[0]
  state = m.editReps(state, e.id, e.sets[1].id, '9')
  saveWorkout(storage, state)
  const restored = loadWorkout(storage)
  assert.equal(restored.error, null)
  assert.deepEqual(restored.state, state)
  assert.equal(m.summary(restored.state.active, NOW + 3600000).elapsed, 3600000)
  state = m.finishWorkout(restored.state, NOW + 3600000, true)
  saveWorkout(storage, state)
  assert.deepEqual(loadWorkout(storage).state, state)
})

test('corrupt or unsupported saved data is never silently overwritten; storage failures surface', () => {
  for (const raw of ['{broken', 'null', '{"version":2}', JSON.stringify({ ...initial(), restSettings: null }), JSON.stringify({ ...initial(), schedule: { 9: 'push' } })]) {
    const storage = memory()
    storage.setItem(STORAGE_KEY, raw)
    const result = loadWorkout(storage)
    assert.equal(result.blocked, true)
    assert.ok(result.error)
    assert.equal(storage.getItem(STORAGE_KEY), raw)
  }
  assert.equal(isWorkoutState(initial()), true)
  assert.throws(() => saveWorkout({ setItem() { throw new Error('quota') } }, initial()), /quota/)
  assert.equal(loadWorkout({ getItem() { throw new Error('access') } }).blocked, true)
})

test('changed target ranges, set counts and repeated placements have independent benchmarks', () => {
  let state = performed(initial(), [10, 9, 7])
  const routine = structuredClone(state.routines[0])
  routine.exercises[0].maxReps = 12
  state = m.saveRoutine(state, routine, [1])
  assert.equal(working(state).active.exercises[0].benchmark, null)
  routine.exercises[0].maxReps = 10
  routine.exercises.push({ ...routine.exercises[0], id: 'second-bench' })
  state = m.saveRoutine(state, routine, [1])
  const active = working(state).active
  assert.deepEqual(active.exercises[0].benchmark, [10, 9, 7])
  assert.equal(active.exercises[1].benchmark, null)
})

test('today-only actuals remain temporary after later approval at the same weight', () => {
  let state = m.changeWeight(working(), 'push-bench', 55, 'today')
  state = complete(state, [10])
  state = m.changeWeight(state, 'push-bench', 55, 'progress')
  const e = state.active.exercises[0]
  for (const set of e.sets.slice(1)) {
    state = m.editReps(state, e.id, set.id, '10')
    state = m.completeSet(state, e.id, set.id, NOW + 5000)
  }
  assert.equal(state.active.exercises[0].sets[0].actual.temporaryWeight, true)
  assert.equal(m.recommendation(state.active.exercises[0]), null)
  assert.deepEqual(m.finishWorkout(state, NOW + 60000).benchmarks, {})
})

test('removing a draft does not renumber a completed set and restoring transition state preserves its source', () => {
  let state = working(m.createInitialState())
  const e = state.active.exercises[0]
  state = m.editReps(state, e.id, e.sets[1].id, '8')
  state = m.completeSet(state, e.id, e.sets[1].id, NOW + 1000)
  state = m.removeSessionSet(state, e.id, e.sets[0].id)
  assert.equal(state.active.exercises[0].sets[0].ordinal, 2)
  assert.equal(state.active.exercises[0].benchmark, null)
  state = working(m.createInitialState())
  state = complete(state, [10, 9, 8])
  state = m.navigateExercise(state, state.active.exercises[1].id)
  const storage = memory()
  saveWorkout(storage, state)
  assert.deepEqual(loadWorkout(storage).state.active.timer, state.active.timer)
})

test('the last remaining set can be out of order and starts elapsed time without navigating', () => {
  let state = working(m.createInitialState())
  const e = state.active.exercises[0]
  for (const [i, elapsed] of [[2, 1000], [0, 2000], [1, 3000]]) {
    state = m.editReps(state, e.id, e.sets[i].id, '8')
    state = m.completeSet(state, e.id, e.sets[i].id, NOW + elapsed)
    assert.equal(state.active.timer.kind, elapsed < 3000 ? 'rest' : 'transition')
  }
  assert.equal(state.active.timer.since, NOW + 3000)
  assert.equal(state.active.timer.setId, e.sets[1].id)
  assert.equal(state.active.currentExerciseId, e.id)
  assert.equal(m.nextIncompleteExercise(state.active, e.id).id, state.active.exercises[1].id)
  const after = structuredClone(state)
  state = m.completeSet(state, e.id, e.sets[1].id, NOW + 999999)
  assert.deepEqual(state, after)
})

test('manual navigation preserves another exercise rest and never creates a new timer', () => {
  let state = complete(working(m.createInitialState()), [10])
  const [first, second] = state.active.exercises
  const timer = structuredClone(state.active.timer)
  state = m.navigateExercise(state, second.id)
  assert.deepEqual(state.active.timer, timer)
  state = m.navigateExercise(state, first.id)
  assert.deepEqual(state.active.timer, timer)
  state = complete(state, [10, 9, 8])
  const transition = structuredClone(state.active.timer)
  state = m.navigateExercise(state, first.id)
  assert.equal(state.active.currentExerciseId, first.id)
  state = m.navigateExercise(state, second.id)
  assert.deepEqual(state.active.timer, transition)
})

test('navigation follows current order, skips completed exercises and wraps to earlier incomplete work', () => {
  let state = working(m.createInitialState())
  const [first, second, third] = state.active.exercises
  state = m.navigateExercise(state, second.id)
  state = complete(state, [8, 8, 8], NOW + 1000, second.id)
  assert.equal(state.active.currentExerciseId, second.id)
  state = m.navigateExercise(state, m.nextIncompleteExercise(state.active, second.id).id)
  assert.equal(state.active.currentExerciseId, third.id)
  state = m.reorderSessionExercise(state, third.id, -1)
  state = m.navigateExercise(state, first.id)
  state = complete(state, [8, 8, 8], NOW + 10000, first.id)
  assert.equal(state.active.currentExerciseId, first.id)
  state = m.navigateExercise(state, m.nextIncompleteExercise(state.active, first.id).id)
  assert.equal(state.active.currentExerciseId, third.id)
  state = m.undoSet(state, first.id, first.sets[0].id)
  state = complete(state, [8, 8, 8], NOW + 20000, third.id)
  assert.equal(state.active.currentExerciseId, third.id)
  state = m.navigateExercise(state, m.nextIncompleteExercise(state.active, third.id).id)
  assert.equal(state.active.currentExerciseId, first.id)
  assert.equal(state.active.timer.since, NOW + 22000)
  assert.equal(state.active.exercises[0].sets[0].actual, null)
})

test('single-set exercises wait for navigation without rest and all completed work awaits explicit finish', () => {
  const original = m.createInitialState()
  original.routines[0].exercises.forEach(e => { e.setCount = 1 })
  let state = working(original)
  for (const [i, e] of state.active.exercises.entries()) {
    state = m.navigateExercise(state, e.id)
    state = complete(state, [8], NOW + (i + 1) * 1000, e.id)
    assert.equal(state.active.currentExerciseId, e.id)
    assert.equal(state.active.timer?.kind ?? null, i < 2 ? 'transition' : null)
  }
  assert.equal(state.active.phase, 'working')
  assert.equal(state.active.endedAt, null)
  assert.deepEqual(state.history, [])
  assert.equal(m.completionCounts(state.active).allComplete, true)
  const ended = m.finishWorkout(state, NOW + 10000)
  assert.equal(ended.active, null)
  assert.equal(ended.history.length, 1)
  const single = complete(working(), [10, 9, 8])
  assert.equal(single.active.timer, null)
  assert.equal(single.active.phase, 'working')
})

test('undo invalidates a transition even if an earlier source set was undone, but preserves unrelated rest', () => {
  let state = complete(working(m.createInitialState()), [10, 9, 8])
  const [first, second] = state.active.exercises
  state = m.undoSet(state, first.id, first.sets[0].id)
  assert.equal(state.active.timer, null)
  state = complete(state, [10], NOW + 10000, first.id)
  assert.equal(state.active.timer.kind, 'transition')
  state = complete(state, [8], NOW + 20000, second.id)
  const rest = structuredClone(state.active.timer)
  state = m.undoSet(state, first.id, first.sets[1].id)
  assert.deepEqual(state.active.timer, rest)
  state = m.undoSet(state, second.id, second.sets[0].id)
  assert.equal(state.active.timer, null)
  assert.equal(isWorkoutState(state), true)
})

test('adding and excluding session sets recomputes completion without an automatic navigation event', () => {
  let state = complete(working(m.createInitialState()), [10, 9, 8])
  const first = state.active.exercises[0]
  const selected = state.active.currentExerciseId
  state = m.addSessionSet(state, first.id)
  assert.equal(state.active.timer, null)
  assert.equal(state.active.currentExerciseId, selected)
  const added = state.active.exercises[0].sets.at(-1)
  state = m.navigateExercise(state, first.id)
  state = m.editReps(state, first.id, added.id, '8')
  state = m.completeSet(state, first.id, added.id, NOW + 10000)
  assert.equal(state.active.currentExerciseId, selected)
  assert.equal(state.active.timer.since, NOW + 10000)
  state = m.undoSet(state, first.id, added.id)
  state = m.removeSessionSet(state, first.id, added.id)
  assert.equal(state.active.timer, null)
  assert.equal(state.active.currentExerciseId, selected)
  assert.equal(m.isExerciseComplete(state.active.exercises[0]), true)
  assert.equal(state.routines[0].exercises[0].setCount, 3)
})

test('removing the only remaining incomplete exercise clears rest without finishing or creating transition', () => {
  let state = working(m.createInitialState())
  const [first, second, third] = state.active.exercises
  state = m.removeSessionExercise(state, third.id)
  state = complete(state, [8, 8, 8], NOW + 1000, first.id)
  state = m.removeSessionExercise(state, second.id)
  assert.equal(state.active.timer, null)
  assert.equal(m.hasIncompleteSets(state.active), false)
  assert.equal(state.active.phase, 'working')
  assert.equal(state.history.length, 0)
  state = m.addSessionExercise(state, 'squat')
  assert.equal(m.hasIncompleteSets(state.active), true)
  assert.equal(state.active.timer, null)
  assert.equal(isWorkoutState(state), true)
})

test('resume restores selection and exact transition anchor without replaying completion', () => {
  const state = complete(working(m.createInitialState()), [10, 9, 8])
  const storage = memory()
  saveWorkout(storage, state)
  const before = storage.getItem(STORAGE_KEY)
  const restored = loadWorkout(storage)
  assert.equal(restored.blocked, false)
  assert.deepEqual(restored.state, state)
  assert.equal(storage.getItem(STORAGE_KEY), before)
  assert.equal(restored.state.active.currentExerciseId, 'push-bench')
  assert.equal(restored.state.active.timer.since, NOW + 3000)
  assert.equal(m.formatDuration(NOW + 63000 - restored.state.active.timer.since), '00:01:00')
  assert.equal(restored.state.active.exercises[1].sets.filter(s => s.actual).length, 0)
  const moved = m.navigateExercise(restored.state, 'push-incline')
  saveWorkout(storage, moved)
  assert.equal(loadWorkout(storage).state.active.currentExerciseId, 'push-incline')
  assert.deepEqual(loadWorkout(storage).state.active.timer, state.active.timer)
})

test('legacy final-set rest resolves to elapsed time from latest actual completion without changing stored data', () => {
  let state = working(m.createInitialState())
  const e = state.active.exercises[0]
  for (const [index, elapsed] of [[2, 1000], [0, 2000], [1, 3000]]) {
    state = m.editReps(state, e.id, e.sets[index].id, '8')
    state = m.completeSet(state, e.id, e.sets[index].id, NOW + elapsed)
  }
  state.active.timer = { kind: 'rest', exerciseId: e.id, setId: e.sets[1].id, endAt: NOW + 999999 }
  const before = structuredClone(state)
  const storage = memory()
  saveWorkout(storage, state)
  const raw = storage.getItem(STORAGE_KEY)
  const restored = loadWorkout(storage).state
  const expected = { kind: 'transition', exerciseId: e.id, setId: e.sets[1].id, since: NOW + 3000 }
  assert.deepEqual(m.resolveWorkoutTimer(restored.active), expected)
  assert.deepEqual(restored, before)
  assert.equal(storage.getItem(STORAGE_KEY), raw)
  const moved = m.navigateExercise(restored, restored.active.exercises[1].id)
  assert.deepEqual(moved.active.timer, expected)
  assert.deepEqual(moved.active.exercises, before.active.exercises)
  assert.deepEqual(moved.progress, before.progress)
  assert.deepEqual(moved.benchmarks, before.benchmarks)
  assert.deepEqual(moved.history, before.history)
  const undone = m.undoSet(restored, e.id, e.sets[0].id)
  assert.equal(undone.active.timer, null)
  assert.equal(undone.active.exercises[0].sets[0].actual, null)
  assert.deepEqual(undone.active.exercises[0].sets[1].actual, before.active.exercises[0].sets[1].actual)
})

test('legacy intermediate rest stays valid while undoing its source completion clears it', () => {
  const state = complete(working(m.createInitialState()), [8, 8])
  assert.deepEqual(m.resolveWorkoutTimer(state.active), state.active.timer)
  const e = state.active.exercises[0]
  const undone = m.undoSet(state, e.id, e.sets[1].id)
  assert.equal(m.resolveWorkoutTimer(undone.active), null)
})

test('history snapshots final session plan counts while actual values and original ordinals stay intact', () => {
  let state = working(m.createInitialState())
  const e = state.active.exercises[0]
  state = m.removeSessionSet(state, e.id, e.sets[0].id)
  state = m.addSessionSet(state, e.id)
  state = m.addSessionSet(state, e.id)
  state = m.changeWeight(state, e.id, 62.5, 'today')
  state = m.editReps(state, e.id, e.sets[1].id, '8')
  state = m.completeSet(state, e.id, e.sets[1].id, NOW + 5000)
  state = m.finishWorkout(state, NOW + 60000, true)
  const session = state.history[0]
  assert.deepEqual(m.completionCounts(session), { completed: 1, total: 10, allComplete: false })
  assert.equal(session.exercises[0].plannedSetCount, 4)
  assert.equal(session.exercises[0].sets[0].ordinal, 2)
  assert.deepEqual(session.exercises[0].sets[0].actual, { weight: 62.5, reps: 8, completedAt: NOW + 5000, temporaryWeight: true })
  const storage = memory()
  saveWorkout(storage, state)
  assert.deepEqual(loadWorkout(storage).state, state)
})

test('old v1 history and last-set rest load unchanged; unknown modified plans never claim full completion', () => {
  let state = performed(initial(), [10, 9, 8])
  delete state.history[0].exercises[0].plannedSetCount
  assert.deepEqual(m.completionCounts(state.history[0]), { completed: 3, total: 3, allComplete: true })
  state.history[0].exercises[0].structureModified = true
  assert.deepEqual(m.completionCounts(state.history[0]), { completed: 3, total: null, allComplete: false })
  state = complete(working(state), [10, 9, 8])
  const e = state.active.exercises[0]
  state.active.timer = { kind: 'rest', exerciseId: e.id, setId: e.sets[2].id, endAt: NOW + 123000 }
  const storage = memory()
  saveWorkout(storage, state)
  const raw = storage.getItem(STORAGE_KEY)
  assert.equal(loadWorkout(storage).blocked, false)
  assert.deepEqual(loadWorkout(storage).state, state)
  assert.equal(storage.getItem(STORAGE_KEY), raw)
})

test('optional planned counts are validated and corrupted snapshots stay protected', () => {
  for (const count of [0, -1, 1.5, '3', 2]) {
    const state = performed(initial(), [10, 9, 8])
    state.history[0].exercises[0].plannedSetCount = count
    const storage = memory()
    const raw = JSON.stringify(state)
    storage.setItem(STORAGE_KEY, raw)
    assert.equal(loadWorkout(storage).blocked, true)
    assert.equal(storage.getItem(STORAGE_KEY), raw)
  }
})

test('weekday display order keeps Sunday ID zero and all saved mappings unchanged', () => {
  assert.deepEqual(m.WEEKDAY_ORDER.map(day => m.DAYS[day]), ['월', '화', '수', '목', '금', '토', '일'])
  const original = m.createInitialState()
  const state = m.saveRoutine(original, original.routines[0], [0, 1, 4])
  assert.equal(state.schedule[0], 'push')
  assert.equal(state.schedule[1], 'push')
  assert.equal(state.schedule[4], 'push')
  assert.equal(m.selectRoutine(state, new Date(2026, 10, 1)).id, 'push')
})

test('routine save approves a decimal progress weight for one placement without overwriting original or history', () => {
  let state = performed(initial(), [10, 10, 10])
  const other = { id: 'other', name: 'Other bench', exercises: [{ ...state.routines[0].exercises[0], id: 'other-bench', initialWeight: 70 }] }
  state = m.saveRoutine(state, other, [])
  const before = structuredClone(state)
  const saved = m.saveRoutine(state, state.routines[0], [1], false, { 'push-bench': 62.5 })
  assert.equal(saved.progress['push-bench'], 62.5)
  assert.equal(saved.progress['other-bench'], 70)
  assert.equal(saved.routines[0].exercises[0].initialWeight, 60)
  assert.deepEqual(saved.routines, before.routines)
  assert.deepEqual(saved.benchmarks, before.benchmarks)
  assert.deepEqual(saved.history, before.history)
  assert.deepEqual(state, before)
  const storage = memory()
  saveWorkout(storage, saved)
  const restored = loadWorkout(storage)
  assert.equal(restored.blocked, false)
  assert.equal(restored.state.version, 1)
  assert.equal(working(restored.state).active.exercises[0].weight, 62.5)
})

test('invalid progress approvals reject the complete routine save without partial writes or foreign placements', () => {
  const state = m.createInitialState()
  const before = structuredClone(state)
  const edited = { ...state.routines[0], name: 'Pending name' }
  for (const value of [-1, NaN, Infinity, '62.5']) assert.throws(() => m.saveRoutine(state, edited, [1, 4], false, { 'push-bench': value }))
  for (const id of ['pull-lat', 'unknown']) assert.throws(() => m.saveRoutine(state, edited, [1, 4], false, { [id]: 62.5 }))
  const removed = { ...edited, exercises: edited.exercises.slice(1) }
  assert.throws(() => m.saveRoutine(state, removed, [1, 4], false, { 'push-bench': 62.5 }))
  assert.deepEqual(state, before)
  assert.equal(m.saveRoutine(state, edited, [1, 4], false, { 'push-bench': 0 }).progress['push-bench'], 0)
})

test('routine progress approval during a session preserves completed snapshots, drafts and timer until the next start', () => {
  let state = complete(working(), [10])
  const e = state.active.exercises[0]
  state = m.editReps(state, e.id, e.sets[1].id, '9')
  const active = structuredClone(state.active)
  state = m.saveRoutine(state, state.routines[0], [1], false, { [e.id]: 62.5 })
  assert.deepEqual(state.active, active)
  const storage = memory()
  saveWorkout(storage, state)
  state = loadWorkout(storage).state
  assert.deepEqual(state.active, active)
  state = m.finishWorkout(state, NOW + 60000, true)
  assert.equal(state.history[0].exercises[0].sets[0].actual.weight, 60)
  assert.deepEqual(m.completionCounts(state.history[0]), { completed: 1, total: 3, allComplete: false })
  const next = working(state)
  assert.equal(next.active.exercises[0].weight, 62.5)
  assert.equal(next.active.exercises[0].approvedWeight, 62.5)
  assert.equal(next.active.exercises[0].sets[0].reps, '')
})

const pendingIncrease = state => m.increaseBenchmark(state, state.active.routineId, state.active.exercises[0])

test('a qualifying whole-session benchmark reminds later sessions until approved weight changes, with v1 round trip', () => {
  let state = performed(initial(), [10, 10, 10])
  const achievedId = state.history[0].id
  state = performed(state, [9, 8, 7])
  const records = structuredClone(state.history)
  state = working(state)
  assert.deepEqual(pendingIncrease(state), { sessionId: achievedId, reps: [10, 10, 10] })
  const before = structuredClone(state)
  pendingIncrease(state)
  assert.deepEqual(state, before)
  const storage = memory()
  saveWorkout(storage, state)
  state = loadWorkout(storage).state
  assert.equal(loadWorkout(storage).blocked, false)
  assert.equal(pendingIncrease(state).sessionId, achievedId)
  state = m.saveRoutine(state, state.routines[0], [1], false, { 'push-bench': 62.5 })
  assert.equal(pendingIncrease(state), null)
  assert.equal(state.active.exercises[0].weight, 60)
  assert.deepEqual(state.history, records)
  state = working(m.finishWorkout(state, NOW + 61000, true))
  assert.equal(state.active.exercises[0].approvedWeight, 62.5)
  assert.equal(pendingIncrease(state), null)
  assert.ok(Object.values(state.benchmarks).some(b => b.sessionId === achievedId))
})

test('benchmark reminders never merge session maxima, downgrade a better benchmark, or cross placements and configurations', () => {
  let state = performed(initial(), [10, 9, 7])
  state = performed(state, [10, 8, 6])
  state = working(state)
  assert.deepEqual(state.active.exercises[0].benchmark, [10, 9, 7])
  assert.equal(pendingIncrease(state), null)
  let separate = performed(initial(), [10, 11, 9])
  separate = performed(separate, [9, 10, 11])
  assert.equal(pendingIncrease(working(separate)), null)
  const qualified = performed(initial(), [10, 10, 10])
  for (const config of [{ setCount: 2 }, { minReps: 7 }, { maxReps: 11 }, { id: 'new-placement' }]) {
    const routine = { ...qualified.routines[0], exercises: [{ ...qualified.routines[0].exercises[0], ...config }] }
    assert.equal(pendingIncrease(working(m.saveRoutine(qualified, routine, [1]))), null)
  }
  const other = { id: 'other', name: 'Same exercise', exercises: [{ ...qualified.routines[0].exercises[0], id: 'other-bench' }] }
  const withOther = m.saveRoutine(qualified, other, [])
  const otherSession = m.beginWorking(m.startWorkout(withOther, 'other', NOW))
  assert.equal(pendingIncrease(otherSession), null)
  const shortBenchmark = working(qualified)
  shortBenchmark.benchmarks[m.benchmarkKey('push', shortBenchmark.active.exercises[0], 60)].reps = [10, 10]
  assert.equal(pendingIncrease(shortBenchmark), null)
})

test('temporary, mixed, partial and session-modified results cannot create benchmark reminders', () => {
  const scenarios = [
    () => complete(m.changeWeight(working(), 'push-bench', 60, 'today'), [10, 10, 10]),
    () => complete(m.changeWeight(complete(working(), [10]), 'push-bench', 62.5, 'progress'), [10, 10, 10]),
    () => complete(working(), [10, 10]),
    () => complete(m.addSessionSet(working(), 'push-bench'), [10, 10, 10, 10]),
    () => complete(working(m.createInitialState()), [10, 10, 10]),
  ]
  for (const scenario of scenarios) {
    const finished = m.finishWorkout(scenario(), NOW + 60000, true)
    assert.equal(pendingIncrease(working(finished)), null)
    assert.equal(finished.history.length, 1)
  }
  let state = working(performed(initial(), [10, 10, 10]))
  state = m.addSessionSet(state, 'push-bench')
  assert.equal(pendingIncrease(state), null)
})

test('a prior approved benchmark never approves a temporary weight and uses the new weight after explicit approval', () => {
  let state = working(performed(initial(), [10, 10, 10]))
  state = m.changeWeight(state, 'push-bench', 50, 'today')
  assert.deepEqual(pendingIncrease(state).reps, [10, 10, 10])
  assert.equal(state.active.exercises[0].weight, 50)
  assert.equal(state.progress['push-bench'], 60)
  state = m.changeWeight(state, 'push-bench', 62.5, 'progress')
  assert.equal(pendingIncrease(state), null)
  assert.equal(state.progress['push-bench'], 62.5)
  assert.equal(state.history[0].exercises[0].sets[0].actual.weight, 60)
  state = m.finishWorkout(complete(state, [10, 10, 10]), NOW + 60000)
  state = working(state)
  assert.deepEqual(pendingIncrease(state).reps, [10, 10, 10])
  assert.equal(state.active.exercises[0].approvedWeight, 62.5)
  assert.equal(pendingIncrease(state).sessionId, state.history[0].id)
})

test('approval events snapshot one placement, names, time and source without inferring a triggering session', () => {
  const state = working()
  const before = structuredClone(state.active)
  let next = m.saveRoutine(state, { ...state.routines[0], name: 'Renamed PUSH' }, [1], false, { 'push-bench': 62.5 }, NOW)
  const event = next.progressChanges[0]
  assert.equal(event.previousApprovedWeight, 60)
  assert.equal(event.nextApprovedWeight, 62.5)
  assert.equal(event.placementId, 'push-bench')
  assert.equal(event.routineId, 'push')
  assert.equal(event.routineName, 'Renamed PUSH')
  assert.equal(event.exerciseName, '바벨 벤치프레스')
  assert.equal(event.source, 'routine_editor')
  assert.equal(event.occurredAt, NOW)
  assert.equal(event.relatedSessionId, undefined)
  assert.deepEqual(next.active, before)
  next = m.changeWeight(next, 'push-bench', 57.5, 'progress', NOW + 1000)
  assert.equal(next.progressChanges.length, 2)
  assert.equal(next.progressChanges[0].previousApprovedWeight, 62.5)
  assert.equal(next.progressChanges[0].nextApprovedWeight, 57.5)
  assert.equal(next.progressChanges[0].source, 'workout')
  assert.equal(next.progressChanges[0].relatedSessionId, before.id)
  next = m.deleteRoutine(next, 'push')
  assert.equal(next.progressChanges[1].routineName, 'Renamed PUSH')
  assert.equal(isWorkoutState(next), true)
})

test('same value, initial weight, invalid approval and today-only changes create no approval event', () => {
  const state = initial()
  assert.equal(m.saveRoutine(state, state.routines[0], [1], false, { 'push-bench': 60 }).progressChanges, undefined)
  assert.equal(m.saveRoutine(state, { ...state.routines[0], id: 'new', exercises: [{ ...state.routines[0].exercises[0], id: 'new-bench' }] }, []).progressChanges, undefined)
  assert.equal(m.changeWeight(working(), 'push-bench', 62.5, 'today').progressChanges, undefined)
  assert.throws(() => m.changeWeight(working(), 'unknown', 62.5, 'progress'))
  assert.throws(() => m.saveRoutine(state, state.routines[0], [1], false, { 'push-bench': -1 }))
  assert.equal(state.progressChanges, undefined)
})

test('failed atomic approvals leave progress and events unchanged; reconfirmation writes exactly one event', () => {
  const storage = memory()
  const before = initial()
  saveWorkout(storage, before)
  const raw = storage.getItem(STORAGE_KEY)
  const failed = { getItem: storage.getItem, setItem: () => { throw new Error('quota') } }
  const candidate = m.saveRoutine(before, before.routines[0], [1], false, { 'push-bench': 62.5 }, NOW)
  const rejected = persistWorkoutUpdate(failed, before, candidate)
  assert.equal(rejected.approvalRejected, true)
  assert.equal(rejected.state, before)
  assert.equal(storage.getItem(STORAGE_KEY), raw)
  const check = persistWorkoutUpdate(storage, rejected.state, rejected.state)
  assert.equal(check.state.progressChanges, undefined)
  const confirmed = persistWorkoutUpdate(storage, check.state, m.saveRoutine(check.state, check.state.routines[0], [1], false, { 'push-bench': 62.5 }, NOW + 1))
  assert.equal(confirmed.persisted, true)
  assert.equal(confirmed.state.progressChanges.length, 1)
  const repeated = m.saveRoutine(confirmed.state, confirmed.state.routines[0], [1], false, { 'push-bench': 62.5 }, NOW + 2)
  assert.equal(repeated.progressChanges.length, 1)
  assert.equal(loadWorkout(storage).state.progressChanges.length, 1)
  const active = working()
  const workoutRejected = persistWorkoutUpdate(failed, active, m.changeWeight(active, 'push-bench', 62.5, 'progress', NOW))
  assert.equal(workoutRejected.state, active)
  const draft = m.editReps(active, 'push-bench', active.active.exercises[0].sets[0].id, '9')
  const draftFailed = persistWorkoutUpdate(failed, active, draft)
  assert.equal(draftFailed.approvalRejected, false)
  assert.equal(draftFailed.state.active.exercises[0].sets[0].reps, '9')
})

test('v1 optional event history loads without normalization or inferred events and rejects malformed event fields', () => {
  const storage = memory()
  const old = performed(initial(), [10, 10, 10])
  assert.equal(old.progressChanges, undefined)
  saveWorkout(storage, old)
  const raw = storage.getItem(STORAGE_KEY)
  assert.deepEqual(loadWorkout(storage).state, old)
  assert.equal(storage.getItem(STORAGE_KEY), raw)
  const state = m.saveRoutine(old, old.routines[0], [1], false, { 'push-bench': 62.5 }, NOW)
  saveWorkout(storage, state)
  assert.deepEqual(loadWorkout(storage).state, state)
  for (const invalid of [null, {}, { ...state.progressChanges[0], source: 'automatic' }, { ...state.progressChanges[0], occurredAt: 1e308 }, { ...state.progressChanges[0], nextApprovedWeight: -1 }, { ...state.progressChanges[0], nextApprovedWeight: 60 }, { ...state.progressChanges[0], relatedSessionId: 'guessed' }]) {
    const broken = { ...state, progressChanges: [invalid] }
    const brokenRaw = JSON.stringify(broken)
    storage.setItem(STORAGE_KEY, brokenRaw)
    assert.equal(loadWorkout(storage).blocked, true)
    assert.equal(storage.getItem(STORAGE_KEY), brokenRaw)
  }
  assert.equal(isWorkoutState({ ...state, progressChanges: [state.progressChanges[0], state.progressChanges[0]] }), false)
})

test('historical judgments remain tied to frozen performance after later progress approvals', () => {
  const old = performed(initial(), [10, 10, 10])
  const session = structuredClone(old.history[0])
  const review = m.historicalWeightReview(session, session.exercises[0])
  assert.deepEqual(review, { kind: 'increase', weight: 60, reps: [10, 10, 10] })
  const current = m.saveRoutine(old, old.routines[0], [1], false, { 'push-bench': 62.5 }, NOW + 70000)
  assert.deepEqual(current.history[0], session)
  assert.deepEqual(m.historicalWeightReview(current.history[0], current.history[0].exercises[0]), review)
  assert.equal(m.currentWeightReviews(current).length, 0)
  const maintained = performed(initial(), [8, 9, 8]).history[0]
  assert.equal(m.historicalWeightReview(maintained, maintained.exercises[0]).kind, 'maintain')
})

test('current review explains both strong benchmark and weaker latest comparable exercise without automatic adjustment', () => {
  const best = performed(initial(), [10, 10, 10])
  const weak = performed(best, [5, 8, 7])
  weak.history[0].endedAt += 1000
  const review = m.currentWeightReviews(weak)[0]
  assert.deepEqual(review.benchmark.reps, [10, 10, 10])
  assert.equal(review.latest.review.kind, 'decrease')
  assert.deepEqual(review.latest.review.reps, [5, 8, 7])
  assert.equal(weak.progress['push-bench'], 60)
  assert.equal(weak.progressChanges, undefined)
  assert.equal(m.currentWeightReviews(weak, 'pull').length, 0)
  const changed = { ...weak.routines[0], exercises: [{ ...weak.routines[0].exercises[0], maxReps: 12 }] }
  assert.equal(m.currentWeightReviews(m.saveRoutine(weak, changed, [1])).length, 0)
})

test('partial, temporary, mixed or modified snapshots never become a global reduction review', () => {
  const cases = [
    complete(working(), [3]),
    complete(m.changeWeight(working(), 'push-bench', 50, 'today'), [3, 3, 3]),
    complete(m.changeWeight(complete(working(), [3]), 'push-bench', 62.5, 'progress'), [3, 3, 3]),
    complete(m.addSessionSet(working(), 'push-bench'), [3, 3, 3, 3]),
  ]
  for (const state of cases) {
    const finished = m.finishWorkout(state, NOW + 60000, true)
    assert.equal(m.historicalWeightReview(finished.history[0], finished.history[0].exercises[0]).kind, 'unavailable')
    assert.equal(m.currentWeightReviews(finished).length, 0)
  }
})
