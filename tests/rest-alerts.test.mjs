import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultRestAlerts, readRestAlerts, restAlertVisual, REST_PREVIEW_SECONDS } from '../src/features/workout-flow/rest-alerts.ts'

test('rest alerts keep independent choices and only restore supported browser settings', () => {
  assert.deepEqual(readRestAlerts(null), defaultRestAlerts)
  assert.deepEqual(readRestAlerts('{'), defaultRestAlerts)
  const preferences = { visual: 'dim', top: false, bottom: true, threshold: 3, sound: false, volume: 0, middle: true, middleAt: 20, testMode: true }
  assert.deepEqual(readRestAlerts(JSON.stringify(preferences)), preferences)
  assert.deepEqual(readRestAlerts('{"visual":"both","threshold":4,"volume":105,"middleAt":10,"testMode":"true"}'), defaultRestAlerts)
  for (const middleAt of [20, 30, 60]) {
    assert.deepEqual(readRestAlerts(JSON.stringify({ sound: false, middle: true, middleAt })), { ...defaultRestAlerts, sound: false, middle: true, middleAt })
  }
})

test('rest alert visuals use the current time, do not overlap and exclude unselected areas', () => {
  for (const threshold of [3, 5, 10]) {
    for (const [top, bottom] of [[true, true], [true, false], [false, true], [false, false]]) {
      const alerts = { ...defaultRestAlerts, threshold, top, bottom }
      assert.deepEqual(restAlertVisual(alerts, threshold), { dim: false, top, bottom })
      for (const seconds of [threshold + 1, 0]) assert.deepEqual(restAlertVisual(alerts, seconds), { dim: false, top: false, bottom: false })
    }
  }
  const dim = { ...defaultRestAlerts, visual: 'dim' }
  assert.equal(REST_PREVIEW_SECONDS, 12)
  assert.deepEqual(restAlertVisual(dim, 12), { dim: true, top: false, bottom: false })
  for (const seconds of [0, 13, 38]) assert.deepEqual(restAlertVisual(dim, seconds), { dim: false, top: false, bottom: false })
  assert.deepEqual(restAlertVisual({ ...dim, visual: 'off' }, 5), { dim: false, top: false, bottom: false })
})
