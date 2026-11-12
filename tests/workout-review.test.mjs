
import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as model from '../src/review/workout-model.ts'
import { exercises, reviewSample } from '../src/review/routine-samples.ts'
import { exerciseEquipment, workoutSample } from '../src/review/workout-samples.ts'

const initial = () => {
  const data = workoutSample('workout-mixed')
  return model.startReview(data.routines[0], false, 1000, data.sessions)
}

test('review sessions independently preserve initial plan, actual equipment and draft values', () => {
  let session = initial()
  const before = structuredClone(session.initialPlan)
  let weight = session.weights[0]
  session = model.finishSet(session, weight, weight.sets[0], 2000, true)
  weight = session.weights[0]
  const firstResult = structuredClone(weight.sets[0].result)
  const changed = model.changeWeight({ ...weight, loadType: 'STACK', manufacturerId: null }, '52.300000', 'today')
  assert.deepEqual(changed.sets[0].result, firstResult)
  assert.equal(changed.working, '52.3')
  assert.equal(changed.approved, '25')
  assert.equal(changed.sets[1].draft.kg, '52.3')
  assert.equal(changed.sets[1].draft.reps, '')
  assert.deepEqual(session.initialPlan, before)
  assert.equal(model.restRemaining(weight, 3000), 11)
  assert.throws(() => model.finishSet(session, changed, { ...changed.sets[1], draft: { kg: '', reps: '8', additional: '' } }, 15000, true))
})

test('review rest uses goal bands and final sets stop countdown while cancellation restores drafts', () => {
  for (const [max, seconds] of [[10, 180], [12, 120], [15, 90]]) {
    const session = initial(), weight = { ...session.weights[0], max }
    const updated = model.finishSet(session, weight, weight.sets[0], 2000, false)
    assert.equal(model.restRemaining(updated.weights[0], 2000), seconds)
  }
  let session = initial()
  for (let index = 0; index < 3; index++) {
    const weight = session.weights[0]
    session = model.finishSet(session, weight, weight.sets[index], 2000 + index * 200000, false)
  }
  assert.equal(model.weightDone(session.weights[0]), true)
  assert.equal(model.restRemaining(session.weights[0], 500000), 0)
  assert.deepEqual(session.transition, { exerciseId: session.weights[0].id, at: 402000 })
  const undone = model.cancelSet(session.weights[0], 3)
  assert.equal(undone.sets[2].result, undefined)
  assert.equal(undone.sets[2].draft.reps, '8')
})

test('review replacement uses exact exercise UUID and equipment, with blank history preserved', () => {
  const data = reviewSample('normal')
  const equipment = exerciseEquipment(exercises[0])
  const previous = model.previousSets(data.sessions, exercises[0].id, equipment)
  assert.equal(previous.get(1).reps, '8')
  assert.equal(model.previousSets(data.sessions, exercises[0].id, { ...equipment, loadType: 'STACK' }).size, 0)
  const replaced = model.newReviewWeight(exercises[2], new Map(), exerciseEquipment(exercises[2]))
  assert.equal(replaced.approved, null)
  assert.ok(replaced.sets.every(set => set.draft.kg === '' && set.draft.reps === ''))
  assert.equal(replaced.standardId, exercises[2].id)
})

test('review cardio preserves paused time, corrected time and measurements with contract validation', () => {
  const session = initial()
  const cardio = { ...session.cardio[0], phase: 'paused', accumulated: 6000, runningSince: null }
  assert.equal(model.cardioElapsed(cardio, 900000), 6000)
  assert.equal(model.cardioElapsed({ ...cardio, runningSince: 10000 }, 11000), 7000)
  const corrected = { ...cardio, draft: { speed: '8', distance: '', bpm: '120', correctedSeconds: '60' } }
  const result = model.recordCardio(corrected)
  assert.equal(result.timerMs, 6000)
  assert.equal(result.activeMs, 60000)
  assert.equal(result.distanceKm, '0.133333')
  assert.equal(result.measurement.distanceSource, 'CALCULATED')
  assert.throws(() => model.recordCardio({ ...corrected, draft: { ...corrected.draft, bpm: '301' } }), /심박수/)
  assert.throws(() => model.recordCardio({ ...corrected, draft: { ...corrected.draft, correctedSeconds: '0' } }))
})

test('review summaries follow lower-rep, temporary-weight and bodyweight volume rules', () => {
  let session = initial()
  session = { ...session, weights: session.weights.slice(0, 1),
    initialPlan: { ...session.initialPlan, weightExercises: session.initialPlan.weightExercises.slice(0, 1) } }
  for (let index = 0; index < 3; index++) {
    const weight = session.weights[0]
    weight.sets[index].draft.reps = index === 0 ? '7' : '12'
    session = model.finishSet(session, weight, weight.sets[index], 2000 + index * 200000, false)
  }
  assert.equal(model.sessionAdvice(session, session.weights[0], true).advice, 'decrease')
  const actual = session.weights[0].sets[0].result
  assert.equal(model.setVolume({ ...actual, loadType: 'BODYWEIGHT', additionalKg: null }), null)
  assert.equal(model.setVolume({ ...actual, loadType: 'BODYWEIGHT', additionalKg: '0' }), 0)
  assert.equal(model.setVolume({ ...actual, loadType: 'BODYWEIGHT', additionalKg: '2.5' }), 17.5)
  assert.equal(model.sessionAdvice({ ...session, deload: true }, session.weights[0]).advice, undefined)
  session.weights[0].sets[0].result.mode = 'today'
  assert.equal(model.sessionAdvice(session, session.weights[0], true).advice, undefined)
})
