import assert from 'node:assert/strict'
import { test } from 'node:test'
import { acquireReviewEditor } from '../src/features/workout-local/review-lock.ts'

test('a blocked contender never opens a lock database when the delayed deletion completes', async () => {
  const deletion = {}
  let opens = 0
  const result = acquireReviewEditor({ deleteDatabase: () => deletion, open: () => { opens++ } }, 'workout')
  deletion.onblocked()
  assert.equal(await result, null)
  deletion.onsuccess()
  assert.equal(opens, 0)
})

test('only the contender that creates the empty database can hold the editor lock', async () => {
  let closed = 0
  const database = { close: () => { closed++ } }
  const deletion = {}, opening = { result: database }
  const storage = { deleteDatabase: () => deletion, open: () => opening }
  const contender = acquireReviewEditor(storage, 'workout')
  deletion.onsuccess()
  opening.onsuccess()
  assert.equal(await contender, null)
  assert.equal(closed, 1)

  const owner = acquireReviewEditor(storage, 'workout')
  deletion.onsuccess()
  opening.onupgradeneeded()
  opening.onsuccess()
  const lease = await owner
  assert.equal(lease.held(), true)
  lease.release()
  assert.equal(lease.held(), false)
  assert.equal(closed, 2)
})

test('a browser-closed lock connection immediately disables editing when notified', async () => {
  const database = { close() {} }
  const deletion = {}, opening = { result: database }
  const result = acquireReviewEditor({ deleteDatabase: () => deletion, open: () => opening }, 'workout')
  deletion.onsuccess()
  opening.onupgradeneeded()
  opening.onsuccess()
  const lease = await result
  database.onclose()
  assert.equal(lease.held(), false)
})
