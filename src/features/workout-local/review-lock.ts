import type { EditorLease } from './lock.ts'

const ACQUISITION_TIMEOUT_MS = 2000

/** Hold an open connection to an empty, disposable lock database. Workout data lives elsewhere. */
export function acquireReviewEditor(storage: IDBFactory, lockName: string): Promise<EditorLease | null> {
  const name = `overload-review-lock:${lockName}`
  return new Promise(resolve => {
    let settled = false
    const complete = (lease: EditorLease | null) => {
      settled = true
      clearTimeout(timeout)
      resolve(lease)
    }
    const unavailable = () => { if (!settled) complete(null) }
    const timeout = setTimeout(unavailable, ACQUISITION_TIMEOUT_MS)

    const open = () => {
      if (settled) return
      let request: IDBOpenDBRequest
      try { request = storage.open(name, 1) } catch { unavailable(); return }
      let created = false
      request.onupgradeneeded = () => {
        if (settled) request.transaction?.abort()
        else created = true
      }
      request.onblocked = request.onerror = unavailable
      request.onsuccess = () => {
        const db = request.result
        // Between deletion and opening, another contender may already have created the database.
        if (settled || !created) { db.close(); unavailable(); return }
        let held = true
        db.onclose = () => { held = false }
        complete({ held: () => held, release: () => { held = false; db.close() } })
      }
    }

    // IndexedDB cannot delete this empty database while the editor's connection is open.
    let deletion: IDBOpenDBRequest
    try { deletion = storage.deleteDatabase(name) } catch { unavailable(); return }
    deletion.onblocked = deletion.onerror = unavailable
    deletion.onsuccess = open
  })
}
