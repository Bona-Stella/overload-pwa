import assert from 'node:assert/strict'
import { test } from 'node:test'
import { adjustWeightDraft, formatWeightDelta } from '../src/features/workout/weight.ts'

test('weight buttons adjust the valid draft by 2.5 without rounding to multiples or floating noise', () => {
  let value = '60'
  value = adjustWeightDraft(value, 1)
  assert.equal(value, '62.5')
  value = adjustWeightDraft(value, 1)
  assert.equal(value, '65')
  assert.equal(adjustWeightDraft(value, -1), '62.5')
  assert.equal(adjustWeightDraft('61.3', 1), '63.8')
  assert.equal(adjustWeightDraft('61.3', -1), '58.8')
  assert.equal(adjustWeightDraft('0.0000001', 1), '2.5000001')
  assert.equal(adjustWeightDraft('1e-7', 1), '2.5000001')
  assert.equal(adjustWeightDraft('2.5', -1), '0')
  assert.equal(adjustWeightDraft('0', 1), '2.5')
})

test('invalid or negative drafts never acquire an automatic default; decrease cannot pass below zero', () => {
  for (const value of ['', ' ', '.', 'abc', 'Infinity', '-1']) {
    assert.equal(adjustWeightDraft(value, 1), null)
    assert.equal(adjustWeightDraft(value, -1), null)
  }
  assert.equal(adjustWeightDraft('0', -1), null)
  assert.equal(adjustWeightDraft('1', -1), null)
  assert.equal(adjustWeightDraft(String(Number.MAX_VALUE), 1), null)
})

test('event deltas format exact decimal differences and keep increase/decrease signs distinct', () => {
  assert.equal(formatWeightDelta(60, 62.5), '+2.5')
  assert.equal(formatWeightDelta(62.5, 57.5), '−5')
  assert.equal(formatWeightDelta(61.3, 63.8), '+2.5')
  assert.equal(formatWeightDelta(0.1, 0.3), '+0.2')
  assert.equal(formatWeightDelta(60, 60), '0')
})
