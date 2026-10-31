import type { LocalKey } from './types.ts'

export type EditorLease = { held: () => boolean; release: () => void }
export type LockSource = Pick<LockManager, 'request'> | null | undefined
export function editorLockName(key: LocalKey) { return `overload.workout.editor:${key.userId}:${key.dataGeneration}:${key.sessionId}` }
/** No timeout, localStorage lease, or steal fallback: unsupported browsers stay read-only. */
export function acquireEditor(key: LocalKey, locks: LockSource = globalThis.navigator?.locks): Promise<EditorLease | null> {
  if (!locks) return Promise.resolve(null)
  return new Promise(resolve => {
    let answered = false
    void locks.request(editorLockName(key), { mode: 'exclusive', ifAvailable: true }, async lock => {
      if (!lock) { answered = true; resolve(null); return }
      let held = true, release!: () => void
      const lifetime = new Promise<void>(done => { release = () => { held = false; done() } })
      answered = true; resolve({ held: () => held, release }); await lifetime
    }).catch(() => { if (!answered) resolve(null) })
  })
}
