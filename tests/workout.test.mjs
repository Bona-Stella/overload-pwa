import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as m from '../src/features/workout/model.ts'
import { isWorkoutState, loadWorkout, saveWorkout, STORAGE_KEY } from '../src/features/workout/storage.ts'

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

test('timers start for every completed set, including the last, extend by timestamps and end early', () => {
  let state = complete(working(), [10, 9, 7])
  assert.equal(state.active.timer.kind, 'rest')
  assert.equal(state.active.timer.endAt, NOW + 3000 + 120000)
  state = m.adjustRest(state, 30, NOW + 4000)
  assert.equal(state.active.timer.endAt, NOW + 3000 + 150000)
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
  state = m.navigateExercise(state, second.id)
  assert.equal(state.active.timer.kind, 'transition')
  assert.equal(state.active.timer.since, NOW + 3000)
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

test('invalid repetitions are rejected, blanks remain distinct from zero, and completing twice is idempotent', () => {
  let state = working()
  const e = state.active.exercises[0]
  for (const value of ['', ' ', '-1', '1.5', 'Infinity', 'hello']) {
    const draft = m.editReps(state, e.id, e.sets[0].id, value)
    assert.throws(() => m.completeSet(draft, e.id, e.sets[0].id, NOW), /반복/)
  }
  state = complete(state, [0])
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
