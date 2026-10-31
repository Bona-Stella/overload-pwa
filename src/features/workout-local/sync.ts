import type { WorkoutApi } from '../workout-online/api.ts'
import type { ActiveResolution, Session, SnapshotRequest } from '../workout-online/types.ts'
import type { LocalWorkout } from './types.ts'
import { LocalStoreError } from '../workout-online/storage.ts'
import * as state from './sync-state.ts'

export type SyncStatus = 'LOCAL' | 'SENDING' | 'SAVED' | 'WAITING' | 'APPROVAL' | 'CHECK' | 'OTHER'
export const SYNC_LABEL: Record<SyncStatus, string> = { LOCAL: '이 기기에 저장됨', SENDING: '서버 전송 중', SAVED: '서버에 저장됨', WAITING: '연결되면 전송', APPROVAL: '승인 확인 필요', CHECK: '서버 상태 확인 필요', OTHER: '다른 기기에서 편집 중' }
export type SyncApi = Pick<WorkoutApi, 'detail' | 'snapshot' | 'resolve' | 'routine'>
export type SyncOptions = { api: SyncApi; online: () => boolean; onServer?: (server: Session) => void; onInvalid?: (error: unknown) => void }
type Access = { read: () => LocalWorkout | null; allowed: () => boolean; mutate: (fn: (w: LocalWorkout) => void) => Promise<boolean>;
  saveServer: (server: Session) => Promise<unknown>; status: (value: SyncStatus, issue?: string) => void; block: () => void }
/** One session/epoch sender. The durable frozen document is authoritative; there is no command queue. */
export class WorkoutSynchronizer {
  private readonly options: SyncOptions
  private readonly access: Access
  private running: Promise<void> | null = null
  private suspended = false
  private stopped = false
  private resolving = false
  private abort = new AbortController()
  constructor(options: SyncOptions, access: Access) { this.options = options; this.access = access }
  private current() { return !this.stopped && this.access.allowed() && this.options.online() && !this.abort.signal.aborted }
  private document() { const w = this.access.read(); if (!w || !this.current()) throw new state.SyncStateConflict(); return w }
  private async mutate(fn: (w: LocalWorkout) => void) {
    if (!this.current() || !await this.access.mutate(fn)) throw new LocalStoreError()
    if (!this.current()) throw new state.SyncStateConflict()
  }
  private async detail() {
    const w = this.document(), server = await this.options.api.detail(w, w.sessionId, this.abort.signal)
    if (!this.current()) throw new state.SyncStateConflict()
    await this.access.saveServer(server)
    if (!this.current()) throw new state.SyncStateConflict()
    this.options.onServer?.(server)
    try { state.assertWriter(w, server) } catch (error) { this.access.block(); throw error }
    return server
  }
  private display() {
    const w = this.access.read()
    this.access.status(w?.approvalResults.some(r => r.status === 'PENDING') ? 'APPROVAL' : w?.syncState === 'CLEAN' ? 'SAVED' : 'LOCAL')
  }
  request = () => {
    if (!this.current()) { if (!this.stopped) this.access.status('WAITING'); return }
    if (!this.suspended && !this.running) void this.launch(false)
  }
  retry = async () => {
    await this.running
    if (this.running) return this.running
    if (!this.current()) { if (!this.stopped) this.access.status('WAITING'); return }
    this.suspended = false
    return this.launch(true)
  }
  private launch(check: boolean): Promise<void> {
    if (this.running) return this.running
    const work = this.pump(check).catch(error => this.failure(error)).finally(() => { if (this.running === work) this.running = null })
    this.running = work; return work
  }
  private failure(error: unknown) {
    if (this.stopped) return
    this.suspended = true
    const code = (error as { code?: string })?.code
    if (['DATA_GENERATION_MISMATCH', 'OWNER_MISMATCH', 'SESSION_CHANGED'].includes(code ?? '')) { this.access.block(); this.options.onInvalid?.(error) }
    const conflict = error instanceof state.SyncStateConflict
    const http = (error as { status?: number })?.status ?? 0, rejected = http >= 400 && http < 500 && http !== 401 && http !== 403
    const message = conflict ? error.message : error instanceof LocalStoreError ? error.message : rejected ? code === 'CLOCK_CONTEXT_INVALID' ? '운동 시각에 모순이 있습니다. 기기 날짜·시간과 입력을 확인해 주세요. 원본은 보존했습니다.' : '서버가 요청을 적용하지 못했습니다. 입력과 현재 서버 상태를 확인해 주세요. 원본은 보존했습니다.' : '연결 또는 서버 저장 결과를 확인하지 못했습니다. 원래 기록을 보존했습니다.'
    this.access.status(conflict ? message.startsWith('다른 기기') ? 'OTHER' : 'CHECK' : error instanceof LocalStoreError || rejected ? 'CHECK' : 'WAITING', message)
  }
  private async sendSnapshot() {
    const w = this.document(), pending = w.pendingSnapshot
    if (!pending || pending.rejected) return
    const request = JSON.parse(pending.requestJson) as SnapshotRequest
    const send = () => this.options.api.snapshot(w, w.sessionId, request, this.abort.signal)
    try {
      let ack
      try { ack = await send() }
      catch (error) {
        const code = (error as { status?: number }).status ?? 0
        if (code >= 400 && code < 500) throw error
        // Exactly one reconciliation + identical replay per trigger; no timer/backoff loop.
        const server = await this.detail(); state.assertWriter(this.document(), server)
        if (BigInt(server.localRevision) > BigInt(request.localRevision)) throw new state.SyncStateConflict()
        ack = await send()
      }
      await this.mutate(next => state.acceptSnapshot(next, ack))
    } catch (error) {
      const code = (error as { status?: number }).status
      if (code === 400 || code === 404 || code === 422) await this.mutate(state.rejectSnapshot)
      if (code === 409) { const server = await this.detail(); state.assertWriter(this.document(), server) }
      throw error
    }
  }
  private async sendResolution(server?: Session) {
    const w = this.document(), pending = w.pendingResolution
    if (!pending || pending.rejected) return
    const request = JSON.parse(pending.requestJson) as ActiveResolution
    const initial = server ?? await this.detail()
    if (state.resolutionFact(request, initial)) { await this.mutate(next => state.acceptResolution(next, initial)); return }
    let error: unknown
    try { await this.options.api.resolve(w, w.sessionId, request, this.abort.signal) } catch (failure) { error = failure }
    const confirmed = await this.detail()
    if (state.resolutionFact(request, confirmed)) { await this.mutate(next => state.acceptResolution(next, confirmed)); return }
    const status = (error as { status?: number })?.status
    if (status && status >= 400 && status < 500 && status !== 401 && status !== 403) {
      await this.mutate(next => { if (next.pendingResolution) next.pendingResolution.rejected = true })
      throw new state.SyncStateConflict('루틴 또는 승인 상태가 바뀌어 적용하지 않았습니다. 현재 값을 확인하고 다시 명시적으로 선택해 주세요.')
    }
    throw error ?? new state.SyncStateConflict()
  }
  private async pump(check: boolean) {
    let server: Session | undefined
    if (check) { server = await this.detail(); await this.mutate(w => state.observeServer(w, server!)) }
    while (this.current()) {
      let w = this.document()
      if (w.pendingResolution && !w.pendingResolution.rejected) {
        this.access.status('SENDING'); await this.sendResolution(server); server = undefined; continue
      }
      if (w.pendingSnapshot?.rejected && w.localRevision === w.pendingSnapshot.request.localRevision) throw new state.SyncStateConflict('서버가 입력을 거절했습니다. 입력을 수정한 뒤 다시 확인해 주세요.')
      if (!w.pendingSnapshot || w.pendingSnapshot.rejected) {
        if (w.localRevision === w.serverRevision) { this.display(); return }
        await this.mutate(state.sealSnapshot); w = this.document()
      }
      if (!w.pendingSnapshot) { this.display(); return }
      this.access.status('SENDING'); await this.sendSnapshot()
      // Fetch recording/approval facts. ACK has already committed locally if this read fails.
      server = await this.detail(); await this.mutate(next => state.observeServer(next, server!))
    }
  }
  resolve = async (exerciseId: string, pendingIds: string[], decision: 'KEEP_CURRENT' | 'REAPPROVE', nextWeight: string) => {
    if (this.resolving) return false
    this.resolving = true
    try { return await this.resolveChoice(exerciseId, pendingIds, decision, nextWeight) } finally { this.resolving = false }
  }
  private async resolveChoice(exerciseId: string, pendingIds: string[], decision: 'KEEP_CURRENT' | 'REAPPROVE', nextWeight: string) {
    await this.retry()
    if (!this.current() || this.suspended) return false
    const work = async () => {
      const w = this.document(), server = await this.detail()
      let routine: { version: string; approvedWeight: string } | null = null
      if (decision === 'REAPPROVE') {
        const original = w.initialPlan.weightExercises.find(x => x.sessionExerciseId === exerciseId)
        try {
          const r = await this.options.api.routine(w, w.initialPlan.routineId, this.abort.signal)
          const placement = r.weightPlacements.find(x => x.id === original?.sourcePlacementId && !x.deletedAt)
          if (placement) routine = { version: r.version, approvedWeight: placement.approvedWeightKg }
        } catch (error) { if ((error as { status?: number }).status !== 404) throw error }
      }
      await this.mutate(next => {
        // Validate against the document in the serialized transaction, including edits queued during GET.
        const request = state.makeResolution(next, server, exerciseId, pendingIds, decision, nextWeight, routine, Date.now())
        next.pendingResolution = { request, requestJson: JSON.stringify(request), workingBefore: structuredClone(next.weights[exerciseId]) }
      })
      this.access.status('SENDING'); await this.sendResolution(server)
    }
    // Reserve the same network slot used by snapshots while the user's choice is prepared.
    if (this.running) return false
    const action = work().catch(error => this.failure(error))
    this.running = action; await action; if (this.running === action) this.running = null
    if (!this.suspended) this.request()
    return !this.suspended
  }
  stop() { this.stopped = true; this.abort.abort() }
  async settled() { await this.running }
}
