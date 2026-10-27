import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as m from '../src/features/workout/model.ts'
import * as c from '../src/features/workout/cardio.ts'
import { isWorkoutState, loadWorkout, persistWorkoutUpdate, STORAGE_KEY } from '../src/features/workout/storage.ts'

const NOW = new Date(2026, 9, 27, 12).getTime()
const plan = (id = 'cardio-placement', kind = 'treadmill') => ({ id, kind, name: c.CARDIO_NAMES[kind], targetSeconds: 60, targetDistance: null, intensity: null, incline: null, resistance: null })
function routineState(cardio = [plan()], weight = false) {
  let state = m.createInitialState()
  const routine = { id: 'cardio-routine', name: '유산소 루틴', exercises: weight ? [{ ...state.routines[0].exercises[0], id: 'weight-placement', setCount: 1 }] : [], cardio }
  state = m.saveRoutine(state, routine, [])
  return state
}
const start = (state = routineState()) => m.startWorkout(state, 'cardio-routine', NOW)
const id = state => state.active.cardio[0].id
function review(state = start()) { const activity = id(state); return c.reviewCardio(c.startCardio(state, activity, NOW + 1000), activity, NOW + 61000) }
const store = state => ({ getItem: key => key === STORAGE_KEY ? JSON.stringify(state) : null, setItem() {} })

test('cardio-only routine CRUD preserves weekday IDs, rest day choice and independent snapshots', () => {
  let state = routineState([plan(), plan('second', 'bike')])
  assert.equal(m.validateRoutine(state.routines.at(-1)), null)
  assert.equal(m.selectRoutine(state, new Date(2026, 10, 1)), null)
  assert.equal(m.selectRoutine(state, new Date(2026, 10, 1), 'cardio-routine').name, '유산소 루틴')
  state = start(state)
  const snapshot = structuredClone(state.active)
  assert.equal(state.active.phase, 'working')
  assert.equal(state.active.currentExerciseId, id(state))
  assert.notEqual(id(state), state.active.cardio[0].plan.id)
  const routine = state.routines.at(-1)
  state = m.saveRoutine(state, { ...routine, cardio: m.moveItem(routine.cardio, 1, -1).slice(0, 1) }, [0])
  assert.equal(state.routines.at(-1).cardio[0].kind, 'bike')
  assert.equal(state.schedule[0], routine.id)
  assert.deepEqual(state.active, snapshot)
  state = m.deleteRoutine(state, routine.id)
  assert.deepEqual(state.active, snapshot)
  assert.equal(isWorkoutState(state), true)
})

test('cardio plans validate all types, finite positive bounds and equipment-specific optional fields', () => {
  for (const kind of Object.keys(c.CARDIO_NAMES)) assert.equal(c.isCardioPlan(plan('p', kind)), true)
  for (const patch of [{ kind: 'unknown' }, { kind: '__proto__' }, { name: ' ' }, { targetSeconds: 0 }, { targetSeconds: -1 }, { targetSeconds: NaN }, { targetSeconds: Infinity }, { targetSeconds: 1.5 }, { targetSeconds: 86401 }, { targetDistance: 0 }, { targetDistance: -1 }, { targetDistance: Infinity }, { intensity: { mode: 'speed', value: 0 } }, { intensity: { mode: 'pace', value: Infinity } }, { intensity: { mode: 'x', value: 10 } }, { incline: -1 }, { resistance: 2 }]) {
    assert.equal(c.isCardioPlan({ ...plan(), ...patch }), false, JSON.stringify(patch))
    assert.throws(() => c.createCardio({ ...plan(), ...patch }))
  }
  assert.equal(c.isCardioPlan({ ...plan('bike', 'bike'), incline: 1 }), false)
  assert.equal(c.isCardioPlan({ ...plan('outdoor', 'outdoor'), incline: 1 }), false)
  assert.equal(c.isCardioPlan({ ...plan('stairs', 'stairs'), targetDistance: 1 }), false)
  assert.equal(c.isCardioPlan({ ...plan(), intensity: { mode: 'pace', value: 5.5 }, targetDistance: 2.5, incline: 0 }), true)
})

test('routine placements reject collisions across weights, cardio, definitions and other routines', () => {
  const state = routineState()
  const routine = state.routines.at(-1)
  assert.throws(() => m.saveRoutine(state, { ...routine, cardio: [plan('push-bench')] }, []), /식별자/)
  assert.throws(() => m.saveRoutine(state, { ...routine, cardio: [plan('bench')] }, []), /식별자/)
  assert.ok(m.validateRoutine({ ...routine, cardio: [plan(), plan()] }))
})

test('mixed workout retains warmup and manual last-weight transition into unstarted cardio', () => {
  let state = m.beginWorking(start(routineState([plan(), plan('second', 'bike')], true)))
  const e = state.active.exercises[0]
  state = m.completeSet(m.editReps(state, e.id, e.sets[0].id, '10'), e.id, e.sets[0].id, NOW + 1000)
  assert.equal(state.active.currentExerciseId, e.id)
  assert.equal(state.active.timer.kind, 'transition')
  assert.equal(m.nextIncompleteExercise(state.active, e.id).id, id(state))
  state = m.navigateExercise(state, id(state))
  assert.equal(state.active.cardio[0].status, 'ready')
  assert.equal(c.cardioElapsed(state.active.cardio[0], NOW + 3600000), 0)
  assert.equal(m.resolveWorkoutTimer(state.active).kind, 'transition')
  assert.deepEqual(m.summary(state.active, NOW + 1000), { sets: 1, volume: 600, elapsed: 1000 })
})

test('timestamp timer survives hours, pauses, resume and reload without writes per tick or auto-completion', () => {
  let state = start()
  const activity = id(state)
  state = c.startCardio(state, activity, NOW + 1000)
  assert.deepEqual(c.startCardio(state, activity, NOW + 9000), state)
  const raw = JSON.stringify(state)
  for (let second = 0; second <= 7200; second++) assert.equal(c.cardioElapsed(state.active.cardio[0], NOW + 1000 + second * 1000), second * 1000)
  assert.equal(JSON.stringify(state), raw)
  state = loadWorkout(store(state)).state
  assert.equal(state.active.cardio[0].status, 'running')
  state = c.pauseCardio(state, activity, NOW + 121000)
  assert.equal(c.cardioElapsed(state.active.cardio[0], NOW + 3600000), 120000)
  state = loadWorkout(store(state)).state
  state = c.startCardio(state, activity, NOW + 3600000)
  state = c.reviewCardio(state, activity, NOW + 3630000)
  assert.equal(state.active.cardio[0].accumulatedMs, 150000)
  assert.equal(state.active.cardio[0].status, 'review')
  assert.equal(isWorkoutState(state), true)
})

test('visiting cardio preserves the weight rest deadline when returning to unfinished weight sets', () => {
  let state = routineState([plan()], true)
  state.routines.at(-1).exercises[0].setCount = 2
  state = m.beginWorking(start(state))
  const e = state.active.exercises[0]
  state = m.completeSet(m.editReps(state, e.id, e.sets[0].id, '10'), e.id, e.sets[0].id, NOW + 1000)
  const deadline = state.active.timer.endAt
  state = m.navigateExercise(state, id(state))
  state = c.startCardio(state, id(state), NOW + 2000)
  state = c.pauseCardio(state, id(state), NOW + 3000)
  state = m.navigateExercise(state, e.id)
  assert.equal(state.active.timer.endAt, deadline)
  assert.equal(isWorkoutState(state), true)
})

test('review cancellation preserves paused time and persisted draft; confirmation is explicit and idempotent', () => {
  let state = review()
  const activity = id(state)
  state = c.editCardioDraft(state, activity, { distance: '1.23', bpm: '140' })
  state = c.cancelCardioReview(loadWorkout(store(state)).state, activity)
  assert.equal(state.active.cardio[0].status, 'paused')
  assert.equal(state.active.cardio[0].draft.distance, '1.23')
  state = c.reviewCardio(state, activity, NOW + 300000)
  state = c.confirmCardio(state, activity, NOW + 301000)
  assert.deepEqual(state.active.cardio[0].result, { timerMs: 60000, activeMs: 60000, corrected: false, distance: 1.23, bpm: 140, completedAt: NOW + 301000 })
  assert.deepEqual(c.confirmCardio(state, activity, NOW + 500000), state)
  assert.deepEqual(c.skipCardio(state, activity, NOW + 500000), state)
  assert.equal(isWorkoutState(state), true)
})

test('completed cardio keeps target snapshot separate from optional actuals and manual time correction', () => {
  let state = start(routineState([{ ...plan(), targetDistance: 5, intensity: { mode: 'speed', value: 8 } }]))
  state = review(state)
  state = c.editCardioDraft(state, id(state), { correctedSeconds: '30' })
  state = c.confirmCardio(state, id(state), NOW + 62000)
  const a = state.active.cardio[0]
  assert.equal(a.result.activeMs, 30000)
  assert.equal(a.result.timerMs, 60000)
  assert.equal(a.result.corrected, true)
  assert.equal(a.result.distance, null)
  assert.equal(a.result.bpm, null)
  assert.equal(a.plan.targetDistance, 5)
  state = m.finishWorkout(state, NOW + 63000)
  assert.equal(isWorkoutState(state), true)
  assert.deepEqual(loadWorkout(store(state)).state, state)
  assert.equal(m.completionCounts(state.history[0]).allComplete, true)
  assert.deepEqual(state.benchmarks, {})
  assert.deepEqual(m.summary(state.history[0], NOW + 64000), { sets: 0, volume: 0, elapsed: 63000 })
})

test('actual input boundaries reject invalid distance, BPM and corrected time without committing', () => {
  const state = review()
  for (const patch of [{ distance: '-1' }, { distance: '0' }, { distance: 'NaN' }, { distance: 'Infinity' }, { bpm: '0' }, { bpm: '301' }, { bpm: '140.5' }, { bpm: 'NaN' }, { correctedSeconds: '' }, { correctedSeconds: '0' }, { correctedSeconds: '-1' }, { correctedSeconds: 'Infinity' }, { correctedSeconds: '86401' }]) {
    const draft = c.editCardioDraft(state, id(state), patch)
    assert.throws(() => c.confirmCardio(draft, id(state), NOW + 62000))
    assert.equal(draft.active.cardio[0].result, null)
    assert.equal(isWorkoutState(draft), true)
  }
})

test('all unresolved cardio states skip explicitly on confirmed partial exit without fake actuals', () => {
  const ready = start()
  const running = c.startCardio(ready, id(ready), NOW + 1000)
  const paused = c.pauseCardio(running, id(running), NOW + 10000)
  const reviewing = c.reviewCardio(paused, id(paused), NOW + 20000)
  for (const state of [ready, running, paused, reviewing]) {
    assert.throws(() => m.finishWorkout(state, NOW + 30000), /종료/)
    const finished = m.finishWorkout(state, NOW + 30000, true)
    assert.equal(finished.history[0].cardio[0].status, 'skipped')
    assert.equal(finished.history[0].cardio[0].result, null)
    assert.equal(m.completionCounts(finished.history[0]).allComplete, false)
    assert.equal(isWorkoutState(finished), true)
    assert.deepEqual(m.finishWorkout(finished, NOW + 40000), finished)
  }
})

test('warmup exit preserves planned cardio as skipped instead of leaving an invalid active status in history', () => {
  const warmup = start(routineState([plan()], true))
  assert.equal(warmup.active.phase, 'warmup')
  const finished = m.finishWorkout(warmup, NOW + 1000, true)
  assert.equal(finished.history[0].cardio[0].status, 'skipped')
  assert.equal(isWorkoutState(finished), true)
})

test('two cardio activities keep independent results and block concurrent running timers', () => {
  let state = start(routineState([plan(), plan('second', 'bike')]))
  const [a, b] = state.active.cardio
  state = c.startCardio(state, a.id, NOW + 1000)
  assert.throws(() => c.startCardio(state, b.id, NOW + 1000), /먼저/)
  state = c.confirmCardio(c.reviewCardio(state, a.id, NOW + 61000), a.id, NOW + 62000)
  state = m.navigateExercise(state, b.id)
  state = c.skipCardio(state, b.id, NOW + 63000)
  assert.deepEqual(c.cardioCounts(state.active), { completed: 1, total: 2 })
  state = m.finishWorkout(state, NOW + 64000)
  assert.equal(m.completionCounts(state.history[0]).allComplete, false)
  assert.equal(isWorkoutState(state), true)
})

test('reviewing a paused activity cannot overlap a different running activity or a second review', () => {
  let state = start(routineState([plan(), plan('second', 'bike')]))
  const [a, b] = state.active.cardio
  state = c.pauseCardio(c.startCardio(state, a.id, NOW + 1000), a.id, NOW + 2000)
  state = c.startCardio(state, b.id, NOW + 3000)
  assert.throws(() => c.reviewCardio(state, a.id, NOW + 4000), /먼저/)
  state = c.pauseCardio(state, b.id, NOW + 4000)
  state = c.reviewCardio(state, a.id, NOW + 5000)
  assert.throws(() => c.reviewCardio(state, b.id, NOW + 6000), /먼저/)
  assert.equal(isWorkoutState(state), true)
  const corrupt = structuredClone(state)
  corrupt.active.cardio[1].plan.id = corrupt.active.cardio[0].plan.id
  assert.equal(isWorkoutState(corrupt), false)
})

test('today-only cardio never changes routine, weight progress, approval events or benchmarks', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  const baseline = structuredClone({ routines: state.routines, progress: state.progress, progressChanges: state.progressChanges, benchmarks: state.benchmarks })
  state = c.addCardio(state, plan())
  state = m.navigateExercise(state, id(state))
  state = c.confirmCardio(c.reviewCardio(c.startCardio(state, id(state), NOW + 1000), id(state), NOW + 61000), id(state), NOW + 62000)
  state = m.finishWorkout(state, NOW + 63000, true)
  assert.deepEqual({ routines: state.routines, progress: state.progress, progressChanges: state.progressChanges, benchmarks: state.benchmarks }, baseline)
  assert.equal(state.history[0].cardio.length, 1)
  assert.equal(m.summary(state.history[0], NOW).sets, 0)
})

test('skipping cardio never suppresses a fully completed weight benchmark or changes weight volume', () => {
  let state = m.beginWorking(start(routineState([plan()], true)))
  const e = state.active.exercises[0]
  state = m.completeSet(m.editReps(state, e.id, e.sets[0].id, '10'), e.id, e.sets[0].id, NOW + 1000)
  state = m.finishWorkout(state, NOW + 2000, true)
  assert.equal(Object.keys(state.benchmarks).length, 1)
  assert.equal(m.historicalWeightReview(state.history[0], state.history[0].exercises[0]).kind, 'increase')
  assert.equal(m.completionCounts(state.history[0]).allComplete, false)
  assert.equal(m.summary(state.history[0], NOW).volume, 600)
})

test('legacy v1 loads byte-equivalent without new field defaults or automatic writes', () => {
  const legacy = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  const before = JSON.stringify(legacy)
  let writes = 0
  const result = loadWorkout({ getItem: () => before, setItem() { writes++ } })
  assert.equal(result.blocked, false)
  assert.equal(JSON.stringify(result.state), before)
  assert.equal(result.state.active.cardio, undefined)
  assert.equal(writes, 0)
})

test('corrupt cardio data blocks loading without overwriting; failed saves keep drafts and retry once', () => {
  const state = review()
  for (const mutate of [s => { s.routines.at(-1).cardio[0].kind = 'invalid' }, s => { s.active.cardio[0].accumulatedMs = -1 }, s => { s.active.cardio[0].status = 'completed' }, s => { s.active.cardio[0].plan.targetDistance = 0 }, s => { s.active.cardio[0].runSince = NOW }, s => { s.active.currentExerciseId = 'missing' }]) {
    const broken = structuredClone(state); mutate(broken)
    let writes = 0
    assert.equal(loadWorkout({ getItem: () => JSON.stringify(broken), setItem() { writes++ } }).blocked, true)
    assert.equal(writes, 0)
  }
  const next = c.editCardioDraft(state, id(state), { distance: '2', bpm: '144' })
  const failed = persistWorkoutUpdate({ getItem: () => null, setItem() { throw new Error('quota') } }, state, next)
  assert.equal(failed.persisted, false)
  assert.deepEqual(failed.state, next)
  const values = new Map()
  const retry = persistWorkoutUpdate({ getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }, failed.state, failed.state)
  assert.equal(retry.persisted, true)
  assert.deepEqual(loadWorkout({ getItem: key => values.get(key) ?? null, setItem() {} }).state, next)
})
