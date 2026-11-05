import type { Session, Scope } from '../workout-online/types.ts'
import { newId } from '../../id.ts'
import { counter, instant, object, uuid } from '../workout-online/validation.ts'
import type { LocalKey, LocalWorkout } from './types.ts'

// A local UI permission, NOT an authenticated session, credential, or encryption key.
export const OFFLINE_FENCE = 'overload.offline.access.v1'
export type OfflinePermit = LocalKey & { nonce: string; confirmedAt: string }
export type OfflineSource = { permit: OfflinePermit; workout: LocalWorkout; server: Session }
type Fence = { nonce: string; userId: string | null; dataGeneration: string | null; allowed: boolean }
type Port = { offlineSource: () => Promise<OfflineSource | null>; saveOfflinePermit: (permit: OfflinePermit, allowed: () => boolean) => Promise<void>; clearOfflinePermit: () => Promise<void> }
export type AuthBoundary = { identity: (userId: string | null) => Promise<void>; deny: () => Promise<void> }
export function offlinePermit(value: unknown): value is OfflinePermit {
  return object(value) && uuid(value.userId) && counter(value.dataGeneration) && uuid(value.sessionId) && uuid(value.editorDeviceId)
    && counter(value.writerEpoch) && uuid(value.nonce) && instant(value.confirmedAt)
}
export class OfflineAccess implements AuthBoundary {
  private readonly store: Port
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'>
  private readonly random: () => string
  private granting: Promise<void> = Promise.resolve()
  constructor(store: Port, storage: Pick<Storage, 'getItem' | 'setItem'> = { getItem: key => globalThis.localStorage.getItem(key), setItem: (key, value) => globalThis.localStorage.setItem(key, value) }, random: () => string = newId) {
    this.store = store; this.storage = storage; this.random = random
  }
  private raw() { try { return this.storage.getItem(OFFLINE_FENCE) } catch { return null } }
  private fence(): Fence | null {
    try {
      const value: unknown = JSON.parse(this.raw() ?? 'null')
      return object(value) && uuid(value.nonce) && (value.userId === null || uuid(value.userId))
        && (value.dataGeneration === null || counter(value.dataGeneration)) && typeof value.allowed === 'boolean' ? value as Fence : null
    } catch { return null }
  }
  private write(value: Fence) { this.storage.setItem(OFFLINE_FENCE, JSON.stringify(value)) }
  async deny() {
    // The synchronous fence closes the logout/crash and stale in-flight grant windows.
    let fenced = false
    try { this.write({ nonce: this.random(), userId: null, dataGeneration: null, allowed: false }); fenced = true } catch { /* try the independent IDB barrier */ }
    try { await this.store.clearOfflinePermit() } catch { if (!fenced) throw new Error('로컬 접근 차단을 저장하지 못했습니다. 저장소 설정을 확인해 주세요.') }
  }
  async identity(userId: string | null) {
    if (!userId || this.fence()?.userId !== userId) {
      await this.deny()
      if (userId) this.write({ nonce: this.random(), userId, dataGeneration: null, allowed: false })
    }
  }
  scope(scope: Scope) {
    const current = this.fence()
    if (current?.userId === scope.userId && current.dataGeneration === scope.dataGeneration) return
    this.write({ nonce: this.random(), ...scope, allowed: false })
  }
  matches(permit: OfflinePermit) {
    const f = this.fence()
    return !!f?.allowed && f.nonce === permit.nonce && f.userId === permit.userId && f.dataGeneration === permit.dataGeneration
  }
  grant(key: LocalKey, authorized: () => boolean): Promise<void> {
    // IDB commits after its final guard. Publish the paired fence before another grant starts.
    const next = this.granting.then(() => this.grantCurrent(key, authorized))
    this.granting = next.catch(() => {})
    return next
  }
  private async grantCurrent(key: LocalKey, authorized: () => boolean) {
    if (!authorized()) return
    const baseline = this.raw(), fence = this.fence()
    if (!fence || fence.userId !== key.userId || fence.dataGeneration !== key.dataGeneration) return
    const { userId, dataGeneration, sessionId, editorDeviceId, writerEpoch } = key
    // Reuse this scope's revocation token: refreshing an admitted workout must not rotate
    // an already durable fence while IDB commits independently of localStorage flushing.
    const permit = { userId, dataGeneration, sessionId, editorDeviceId, writerEpoch, nonce: fence.nonce, confirmedAt: new Date().toISOString() }
    const allowed = () => authorized() && this.raw() === baseline
    await this.store.saveOfflinePermit(permit, allowed)
    if (!allowed()) return
    if (!fence.allowed) this.write({ nonce: permit.nonce, userId: key.userId, dataGeneration: key.dataGeneration, allowed: true })
  }
  async source() {
    const value = await this.store.offlineSource()
    return value && this.matches(value.permit) ? value : null
  }
}
