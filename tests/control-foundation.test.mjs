import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extendWheelOptions, wheelOptions } from '../src/components/wheel-options.ts'
import { adjustCardioWheel, adjustPaceWheel, cardioPlan, cardioWheelValue, emptyCardio, paceDirectValue, paceFromSeconds, paceLabel } from '../src/features/workout-online/cardio-draft.ts'
import { actualAverageBpm } from '../src/features/workout-online/cardio-measurement.ts'
import { durationParts, durationSeconds } from '../src/components/duration.ts'

test('wheel window extends both ways while retaining the centered value and bounded row count', () => {
  const adjust = (value, direction) => {
    const next = Number(value) + direction
    return next >= 1 && next <= 1000 ? String(next) : null
  }
  for (const direction of [-1, 1]) {
    let options = wheelOptions('500', adjust)
    for (let index = 0; index < 16; index++) {
      const center = direction === -1 ? 2 : options.length - 3
      const extension = extendWheelOptions(options, adjust, direction)
      assert.equal(extension.options[center + extension.shift], options[center])
      assert.ok(extension.options.length <= 61)
      assert.equal(new Set(extension.options).size, extension.options.length)
      options = extension.options
    }
    assert.ok(direction === -1 ? Number(options[0]) < 200 : Number(options.at(-1)) > 800)
  }
  assert.equal(extendWheelOptions(wheelOptions('1', adjust), adjust, -1), null)
  assert.equal(extendWheelOptions(wheelOptions('1000', adjust), adjust, 1), null)
})

test('cardio wheel uses exact tenths from zero while direct input retains off-grid precision and bounds', () => {
  let distance = '0.0'
  for (let index = 0; index < 80; index++) distance = adjustCardioWheel(distance, 1, 'distance')
  assert.equal(distance, '8.0')
  for (let index = 0; index < 80; index++) distance = adjustCardioWheel(distance, -1, 'distance')
  assert.equal(distance, '0.0')
  assert.equal(adjustCardioWheel('100', 1, 'speed'), null)
  assert.equal(adjustCardioWheel('99.9', 1, 'speed'), '100.0')
  assert.equal(adjustCardioWheel('0.1', -1, 'distance'), '0.0')
  assert.equal(adjustCardioWheel('0.0', -1, 'distance'), null)
  assert.equal(cardioWheelValue('52.300001', 'distance'), '52.300001')
  assert.equal(cardioWheelValue('', 'distance'), '')
  assert.throws(() => cardioWheelValue('0', 'distance'), /0\.001~1000/)
})

test('goal duration retains both existing draft paths and record correction retains untouched fractional seconds', () => {
  const cardio = { ...emptyCardio(), kind: 'TREADMILL', name: '러닝머신', distance: '5.123', intensity: '8.125' }
  assert.deepEqual(cardioPlan({ ...cardio, minutes: '2.5' }), cardioPlan({ ...cardio, seconds: '150' }))
  assert.equal(cardioPlan({ ...cardio, seconds: '86400' }).targetSeconds, 86400)
  assert.throws(() => cardioPlan({ ...cardio, seconds: '86401' }))
  assert.equal(durationSeconds({ ...durationParts('62.125'), minutes: '2' }), '122.125')
  assert.throws(() => durationSeconds({ ...durationParts('62.125'), hours: '24' }))
})

test('pace wheel rolls across minutes and retains the decimal-minute API contract', () => {
  const next = adjustPaceWheel('415', 1)
  assert.equal(paceLabel(Number(next)), '7:00')
  assert.equal(adjustPaceWheel(next, -1), '415')
  assert.equal(adjustPaceWheel('0', 1), '10')
  assert.equal(adjustPaceWheel('10', -1), '0')
  assert.equal(adjustPaceWheel('7200', 1), null)
  assert.equal(paceFromSeconds('415'), '6.916667')
  assert.equal(paceDirectValue('6:55'), '6.916667')
  assert.equal(paceDirectValue('6.512345'), '6.512345')
  assert.equal(paceDirectValue('0:06'), '0.1')
  assert.equal(paceDirectValue('120:00'), '120')
  assert.equal(paceDirectValue(''), '')
  for (const value of ['0', '0:00', '3:60', '120:01']) assert.throws(() => paceDirectValue(value))
})

test('incline, resistance and actual average BPM preserve their separate bounds and optional values', () => {
  let incline = '0.0'
  for (let index=0; index<121; index++) incline = adjustCardioWheel(incline,1,'incline')
  assert.equal(incline,'12.1')
  assert.equal(adjustCardioWheel('0.0',-1,'incline'),null)
  assert.equal(adjustCardioWheel('50.0',1,'incline'),null)
  assert.equal(cardioWheelValue('0','incline'),'0')
  assert.equal(cardioWheelValue('','incline'),'')
  assert.equal(cardioWheelValue('3.512345','incline'),'3.512345')
  assert.equal(adjustCardioWheel('8',1,'resistance'),'9')
  assert.equal(adjustCardioWheel('100',1,'resistance'),null)
  assert.equal(cardioWheelValue('7.123456','resistance'),'7.123456')
  assert.throws(() => cardioWheelValue('0','resistance'))
  assert.equal(actualAverageBpm(''),null)
  assert.equal(actualAverageBpm('20'),20)
  assert.equal(actualAverageBpm('300'),300)
  for (const value of ['0','19','301','130.5']) assert.throws(() => actualAverageBpm(value),/20~300 BPM/)
})
