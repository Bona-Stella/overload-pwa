import type { LocalKey } from './types.ts'
import { acquireReviewEditor } from './review-lock.ts'

export type EditorLease = { held: () => boolean; release: () => void | Promise<void> }
export type LockSource = Pick<LockManager, 'request'> | null | undefined
export function usesReviewEditorLock() {
  const origin = import.meta.env?.VITE_HTTP_WORKOUT_REVIEW_ORIGIN
  return !!origin && globalThis.location?.origin === origin && globalThis.isSecureContext === false &&
    typeof globalThis.navigator?.locks?.request !== 'function' && typeof globalThis.indexedDB?.open === 'function'
}
export function supportsWorkoutEditing() {
  return (typeof globalThis.navigator?.locks?.request === 'function' || usesReviewEditorLock()) &&
    (typeof globalThis.crypto?.randomUUID === 'function' || typeof globalThis.crypto?.getRandomValues === 'function')
}
export function editorLockName(key: LocalKey) { return `overload.workout.editor:${key.userId}:${key.dataGeneration}:${key.sessionId}` }
export function acquireEditor(key: LocalKey, locks: LockSource = globalThis.navigator?.locks): Promise<EditorLease | null> {
  if (typeof locks?.request !== 'function') return locks !== null && usesReviewEditorLock()
    ? acquireReviewEditor(globalThis.indexedDB, editorLockName(key)) : Promise.resolve(null)
  return new Promise(resolve => {
    let answered = false
    const released: Promise<void> = locks.request(editorLockName(key), { mode: 'exclusive', ifAvailable: true }, async lock => {
      if (!lock) { answered = true; resolve(null); return }
      let held = true, release!: () => void
      const lifetime = new Promise<void>(done => { release = () => { held = false; done() } })
      answered = true; resolve({ held: () => held, release: () => { release(); return released } }); await lifetime
    }).catch(() => { if (!answered) resolve(null) })
  })
}
