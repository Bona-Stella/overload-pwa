import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clearClosedRecords, readClosedRecord } from '../src/features/workout-online/closed-record-read.ts'
import { loadWorkoutHistory } from '../src/features/workout-online/workout-history.ts'
import { scope, session } from './fixtures/workout-online-data.mjs'

const gate = () => Promise.withResolvers()
const record = (id, version = '1') => session({ id, version, status: 'FINISHED' })

test('newest repetition history is published while the older list is still in flight', async () => {
  const latest = record('latest'), unrelated = record('unrelated'), older = record('older')
  const cursor = { beforeId: 'latest', beforeClosedAt: '2026-11-01T00:00:00Z' }
  const secondPage = gate(), otherDetail = gate(), firstPublication = gate(), calls = []
  const api = {
    async closed(_, key) { calls.push(['list', key]); return key ? secondPage.promise : { sessions: [latest, unrelated], next: cursor } },
    async detail(_, id) { calls.push(['detail', id]); return id === latest.id ? latest : id === unrelated.id ? otherDetail.promise : older },
  }
  const signal = new AbortController().signal
  const history = loadWorkoutHistory(api, scope, signal, firstPublication.resolve)
  assert.deepEqual(await firstPublication.promise, [latest])
  assert.deepEqual(calls, [['list', null], ['list', cursor], ['detail', 'latest'], ['detail', 'unrelated']])
  otherDetail.resolve(unrelated)
  secondPage.resolve({ sessions: [older], next: null })
  assert.deepEqual(await history, [latest, unrelated, older])
  assert.deepEqual(await readClosedRecord(api, scope, latest, signal), latest)
  assert.equal(calls.filter(([kind]) => kind === 'detail').length, 3)
})

test('overlapping readers share only the same valid version and cancel independently', async () => {
  const detail = gate(), latest = record('same')
  let calls = 0
  const api = { detail: async () => { calls++; return detail.promise } }
  const cancel = new AbortController(), keep = new AbortController()
  const first = readClosedRecord(api, scope, latest, cancel.signal)
  const second = readClosedRecord(api, scope, latest, keep.signal)
  cancel.abort()
  await assert.rejects(first, { name: 'AbortError' })
  detail.resolve(latest)
  assert.equal(await second, latest)
  assert.equal(calls, 1)
  assert.equal(await readClosedRecord(api, scope, { ...latest, version: '2' }, keep.signal), null)
  clearClosedRecords(api)
  assert.equal(await readClosedRecord(api, scope, latest, keep.signal), latest)
  assert.equal(calls, 3)
})

test('a failed newer detail does not publish an older record as the previous set', async () => {
  const latest = record('latest'), older = record('older')
  const api = {
    async closed() { return { sessions: [latest, older], next: null } },
    async detail(_, id) { if (id === latest.id) throw Error('detail unavailable'); return older },
  }
  const published = []
  await assert.rejects(loadWorkoutHistory(api, scope, new AbortController().signal, rows => published.push(rows)), /detail unavailable/)
  assert.deepEqual(published, [])
})
