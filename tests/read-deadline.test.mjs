import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFailure, readWithDeadline, ReadTimeout } from '../src/app/read-deadline.ts'

test('a timed-out read aborts its transport and a late result cannot replace the next read', async () => {
  const parent = new AbortController()
  let deliver, previousSignal
  const prior = readWithDeadline(parent.signal, signal => {
    previousSignal = signal
    return new Promise(resolve => { deliver = resolve })
  }, 10)
  await assert.rejects(prior, ReadTimeout)
  assert.equal(previousSignal.aborted, true)
  assert.equal(parent.signal.aborted, false)
  const seen = []
  prior.then(value => seen.push(value), () => {})
  seen.push(await readWithDeadline(parent.signal, async () => 'new record'))
  deliver('old record')
  await Promise.resolve()
  assert.deepEqual(seen, ['new record'])
})

test('leaving the owner scope aborts the underlying read and preserves distinct permission copy', async () => {
  const parent = new AbortController()
  let child
  const pending = readWithDeadline(parent.signal, signal => {
    child = signal
    return new Promise(() => {})
  })
  parent.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(child.aborted, true)
  assert.equal(readFailure({ status: 403, code: 'NETWORK' }, '조회 실패'), '이 정보를 볼 권한이 없어요.')
})
