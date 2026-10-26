import assert from 'node:assert/strict'
import { test } from 'node:test'
import { adjustRepsDraft, validReps } from '../src/features/workout/reps.ts'
import * as m from '../src/features/workout/model.ts'
import { loadWorkout, saveWorkout } from '../src/features/workout/storage.ts'

test('reps steps preserve incomplete drafts and reject zero, negatives, fractions and unsafe integers', () => {
  for (const value of ['', ' ', '.', '-', '0', '-1', '1.5', 'abc', 'Infinity', '9007199254740992']) {
    assert.equal(validReps(value), null, value)
    assert.equal(adjustRepsDraft(value, -1), null, value)
    assert.equal(adjustRepsDraft(value, 1), null, value)
  }
})

test('reps can exceed the target, step repeatedly and stop at one', () => {
  let draft = '10'
  for (let i = 0; i < 2; i++) draft = adjustRepsDraft(draft, 1)
  assert.equal(draft, '12')
  assert.equal(adjustRepsDraft(draft, -1), '11')
  assert.equal(validReps('11'), 11)
  assert.equal(adjustRepsDraft('1', -1), null)
  assert.equal(adjustRepsDraft('1', 1), '2')
})

test('reps steps protect the safe integer ceiling without rounding or overflow', () => {
  const maximum = Number.MAX_SAFE_INTEGER
  assert.equal(validReps(String(maximum)), maximum)
  assert.equal(adjustRepsDraft(String(maximum), 1), null)
  assert.equal(adjustRepsDraft(String(maximum), -1), String(maximum - 1))
  assert.equal(adjustRepsDraft(String(maximum - 1), 1), String(maximum))
})

test('stepping one draft persists independently without completion, timer or progress side effects, and undo remains editable', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', 1000))
  const e = state.active.exercises[0]
  const original = structuredClone(state)
  state = m.editReps(state, e.id, e.sets[0].id, '10')
  for (const direction of [1, 1, -1]) state = m.editReps(state, e.id, e.sets[0].id, adjustRepsDraft(state.active.exercises[0].sets[0].reps, direction))
  const set = state.active.exercises[0].sets[0]
  assert.equal(set.reps, '11')
  assert.equal(set.actual, null)
  assert.equal(state.active.timer, null)
  assert.deepEqual(state.active.exercises[0].sets.slice(1), original.active.exercises[0].sets.slice(1))
  for (const key of ['routines', 'progress', 'progressChanges', 'history', 'benchmarks']) assert.deepEqual(state[key], original[key])
  let raw
  const storage = { getItem: () => raw ?? null, setItem: (_, value) => { raw = value } }
  saveWorkout(storage, state)
  assert.deepEqual(loadWorkout(storage).state, state)
  state = m.completeSet(loadWorkout(storage).state, e.id, set.id, 2000)
  assert.equal(state.active.exercises[0].sets[0].actual.reps, 11)
  assert.equal(state.active.timer.kind, 'rest')
  saveWorkout(storage, state)
  assert.deepEqual(loadWorkout(storage).state, state)
  state = m.undoSet(state, e.id, set.id)
  state = m.editReps(state, e.id, set.id, '1')
  state = m.completeSet(state, e.id, set.id, 3000)
  assert.equal(state.active.exercises[0].sets[0].actual.reps, 1)
})

test('legacy v1 zero-rep actual records still load and round-trip without mutation', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', 1000))
  const e = state.active.exercises[0]
  state = m.editReps(state, e.id, e.sets[0].id, '1')
  state = m.completeSet(state, e.id, e.sets[0].id, 2000)
  state.active.exercises[0].sets[0].reps = '0'
  state.active.exercises[0].sets[0].actual.reps = 0
  state = m.finishWorkout(state, 3000, true)
  let raw = JSON.stringify(state)
  const original = raw
  const storage = { getItem: () => raw, setItem: (_, value) => { raw = value } }
  const loaded = loadWorkout(storage)
  assert.equal(loaded.blocked, false)
  assert.equal(raw, original)
  assert.deepEqual(loaded.state, state)
  saveWorkout(storage, loaded.state)
  assert.equal(raw, original)
})
