import { readWithDeadline } from '../../app/read-deadline.ts'
import { WorkoutApi } from './api.ts'
import { onlineIssue } from './controller.ts'
import { WorkoutStore, LocalStoreError } from './storage.ts'
import type { AssessmentView, ChangeEvents, ClosedResolution, RecordEdit, Recovery, Scope, Session } from './types.ts'
import type { LocalWorkout } from '../workout-local/types.ts'
import { acquireEditor } from '../workout-local/lock.ts'
import type { EditorLease } from '../workout-local/lock.ts'
import { LocalWorkoutController } from '../workout-local/controller.ts'
import { closedWriteFact, recoveryRows } from './closed-model.ts'
import type { ClosedWrite } from './closed-model.ts'
import { decimalDraft } from './validation.ts'
import { increment } from '../workout-local/model.ts'
import { newId } from '../../id.ts'

type Store = Pick<WorkoutStore, 'localCopies' | 'closedWrite' | 'saveClosedWrite' | 'saveSession' | 'deviceId' | 'openLocal' | 'readLocal' | 'saveLocal' | 'saveSyncLocal'>
type Api = Pick<WorkoutApi, 'detail' | 'assessment' | 'changes' | 'records' | 'recover' | 'deleteSession' | 'resolveClosed' | 'routine' | 'finish' | 'snapshot' | 'resolve'>
export type ClosedState = { server: Session | null; assessment: AssessmentView | null; changes: ChangeEvents | null; copies: LocalWorkout[]; pending: ClosedWrite | null;
  busy: boolean; writable: boolean; issue: string | null; notice: string; noticeTone?: 'info' | 'success' }
export type ClosedDisplay = Pick<ClosedState, 'server' | 'assessment' | 'changes'>
const lockedIssue = '다른 탭에서 운동을 열고 있거나 이 환경에서 편집 잠금을 사용할 수 없습니다. 다른 탭을 닫은 뒤 다시 확인해 주세요.'
/** One online closed-session edit at a time, with one durable result-check slot. No automatic write replay. */
export class ClosedWorkoutController {
  private state: ClosedState = { server: null, assessment: null, changes: null, copies: [], pending: null, busy: true, writable: false, issue: null, notice: '' }
  private listeners = new Set<() => void>()
  private lease: EditorLease | null = null
  private abort = new AbortController()
  private stopped = false
  private api: Api
  private store: Store
  private scope: Scope
  private id: string
  private authorized: () => boolean
  private observe?: (server: Session) => void
  private acquire: typeof acquireEditor
  private invalid?: (error: unknown) => void
  constructor(api: Api, store: Store, scope: Scope, id: string, authorized: () => boolean, observe?: (server: Session) => void, acquire = acquireEditor, invalid?: (error: unknown) => void, cached?: ClosedDisplay) {
    this.api = api; this.store = store; this.scope = scope; this.id = id; this.authorized = authorized; this.observe = observe
    this.acquire = acquire
    this.invalid = invalid
    if (cached?.server?.id === id && cached.server.userId === scope.userId && cached.server.dataGeneration === scope.dataGeneration) {
      this.state = { ...this.state, ...cached }
    }
  }
  getSnapshot = () => this.state
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  private current = () => !this.stopped && this.authorized() && !this.abort.signal.aborted
  private canWrite = () => this.current() && !!this.lease?.held()
  private set(patch: Partial<ClosedState>) { if (!this.current()) return; this.state = { ...this.state, ...patch }; this.listeners.forEach(f => f()) }
  private failure(error: unknown) {
    const { code, status } = (error ?? {}) as { code?: string; status?: number }
    if (['DATA_GENERATION_MISMATCH','OWNER_MISMATCH','SESSION_CHANGED','AUTHENTICATION_REQUIRED'].includes(code ?? '') || status === 401 || status === 403 || status === 404) {
      this.lease?.release(); this.set({ writable: false, server: null, assessment: null, changes: null, copies: [], pending: null }); this.invalid?.(error)
    }
    this.set({ issue: error instanceof Error && (error instanceof LocalStoreError || error.name === 'ClosedConflict') ? error.message : onlineIssue(error) })
  }
  private conflict(message: string): never { const error = new Error(message); error.name = 'ClosedConflict'; throw error }
  private async ensureLease() {
    if (this.canWrite()) return true
    if (!this.current()) return false
    const device = await this.store.deviceId()
    if (!this.current()) return false
    const lease = await this.acquire({ ...this.scope, sessionId: this.id, editorDeviceId: device, writerEpoch: '0' })
    if (!this.current()) { await lease?.release(); return false }
    this.lease = lease
    const writable = this.canWrite()
    this.set({ writable, issue: writable ? null : lockedIssue })
    return writable
  }
  async open(initial?: Session) {
    try {
      await this.ensureLease()
      if (!this.current()) return
      await this.read(initial)
    } catch (error) { this.failure(error) } finally { this.set({ busy: false }) }
  }
  private async read(initial?: Session) {
    const [{ server, assessment, changes }, copies, pending] = await Promise.all([
      readWithDeadline(this.abort.signal, async signal => {
        const [candidate, assessment, changes] = await Promise.all([
          initial ?? this.api.detail(this.scope, this.id, signal), this.api.assessment(this.scope, this.id, signal), this.api.changes(this.scope, this.id, signal),
        ])
        signal.throwIfAborted()
        const server = initial && (candidate.version !== assessment.version || candidate.version !== changes.version)
          ? await this.api.detail(this.scope, this.id, signal) : candidate
        return { server, assessment, changes }
      }), this.store.localCopies(this.scope, this.id), this.store.closedWrite(this.scope, this.id),
    ])
    if (!this.current()) return
    if (server.status === 'ACTIVE' || server.version !== assessment.version || server.version !== changes.version) this.conflict('조회 중 기록이 바뀌었습니다. 최신 기록을 다시 확인해 주세요.')
    await this.store.saveSession(this.scope, server)
    if (!this.current()) return
    this.set({ server, assessment, changes, copies, pending }); this.observe?.(server)
    if (pending?.status === 'PENDING' && this.canWrite() && (pending.ack || closedWriteFact(pending, server, changes))) {
      const confirmed: ClosedWrite = { ...pending, status: 'CONFIRMED' }
      await this.store.saveClosedWrite(confirmed, pending, this.canWrite)
      this.set({ pending: confirmed, notice: '저장 결과를 확인했어요.', noticeTone: 'info' })
    }
  }
  refresh = async () => {
    if (!this.current() || this.state.busy) return
    this.set({ busy: true, issue: null })
    try { await this.ensureLease(); if (this.current()) await this.read() }
    catch (error) { this.failure(error) } finally { this.set({ busy: false }) }
  }
  private async dispatch(write: ClosedWrite) {
    switch (write.kind) {
      case 'records': return this.api.records(this.scope, this.id, write.body, this.abort.signal)
      case 'recovery': return this.api.recover(this.scope, this.id, write.body, this.abort.signal)
      case 'delete': return this.api.deleteSession(this.scope, this.id, write.body.expectedVersion, this.abort.signal)
      case 'approval': return this.api.resolveClosed(this.scope, this.id, write.body, this.abort.signal)
    }
  }
  private async send(write: ClosedWrite) {
    let error: unknown
    try {
      const ack = await this.dispatch(write)
      if (!this.canWrite()) return false
      const saved: ClosedWrite = { ...write, ack }
      await this.store.saveClosedWrite(saved, write, this.canWrite); this.set({ pending: saved })
    } catch (failure) { error = failure }
    if (!this.current()) return false
    await this.read() // Verify current state/history after every response, including a missing response.
    if (this.state.pending?.status !== 'CONFIRMED') this.conflict((error as { status?: number })?.status === 409
      ? '기록이 변경됐어요. 최신 기록을 확인해 주세요.'
      : '변경 결과를 확인하지 못했어요.')
    this.set({ notice: write.kind === 'delete' ? '운동 기록을 삭제했어요.' : write.kind === 'recovery' ? '운동 기록을 복구했어요.' : '운동 기록을 저장했어요.', noticeTone: 'success' }); return true
  }
  private async submit(input: { kind: 'records'; body: RecordEdit } | { kind: 'recovery'; body: Recovery } | { kind: 'delete'; body: { dataGeneration: string; expectedVersion: string } } | { kind: 'approval'; body: ClosedResolution }) {
    if (!this.canWrite() || this.state.busy || this.state.server?.deletedAt || !this.state.server) return false
    if (this.state.pending?.status === 'PENDING') { this.set({ issue: '먼저 이전 변경의 저장 결과를 확인해 주세요.' }); return false }
    this.set({ busy: true, issue: null, notice: '' })
    try {
      if (input.body.expectedVersion !== this.state.server.version) this.conflict('화면의 기록이 바뀌었습니다. 다시 확인해 주세요.')
      const write: ClosedWrite = { ...this.scope, sessionId: this.id, ...input, requestJson: JSON.stringify(input.body), status: 'PENDING' }
      await this.store.saveClosedWrite(write, this.state.pending, this.canWrite)
      if (!this.canWrite()) return false
      this.set({ pending: write }); return await this.send(write)
    } catch (error) { this.failure(error); return false } finally { this.set({ busy: false }) }
  }
  edit = (body: RecordEdit) => this.submit({ kind: 'records', body })
  recover = (local: LocalWorkout, ids: string[], expectedVersion = this.state.server!.version) => {
    if (!this.state.server || !this.state.changes || local.userId !== this.scope.userId || local.dataGeneration !== this.scope.dataGeneration || local.sessionId !== this.id
      || !ids.length || new Set(ids).size !== ids.length || ids.some(id => !recoveryRows(local, this.state.server!, this.state.changes!).some(r => r.record.id === id && r.selectable))) {
      this.set({ issue: '복구할 원본과 서버 기록을 다시 확인해 주세요. 충돌·삭제 항목은 자동 복구하지 않습니다.' }); return Promise.resolve(false)
    }
    const performedSets = local.snapshot.performedSets.filter(r => ids.includes(r.id)), cardioResults = local.snapshot.cardioResults.filter((r): r is Extract<typeof r, { status: 'COMPLETED' }> => ids.includes(r.id) && r.status === 'COMPLETED')
    return this.submit({ kind: 'recovery', body: { dataGeneration: this.scope.dataGeneration, expectedVersion, confirm: true,
      origin: { editorDeviceId: local.editorDeviceId, writerEpoch: local.writerEpoch, localRevision: local.localRevision }, performedSets, cardioResults } })
  }
  delete = (expectedVersion = this.state.server!.version) => this.submit({ kind: 'delete', body: { dataGeneration: this.scope.dataGeneration, expectedVersion } })
  resolve = async (exerciseId: string, decision: 'KEEP_CURRENT' | 'REAPPROVE', weight: string, expectedVersion = this.state.server!.version) => {
    if (this.state.busy || !this.canWrite() || !this.state.server) return false
    const server = this.state.server
    try {
      if (server.version !== expectedVersion) this.conflict('화면의 기록이 바뀌었습니다. 최신 기록을 확인하고 다시 선택해 주세요.')
      const pendingRequestIds = server.snapshot.approvalResults.filter(r => r.sessionExerciseId === exerciseId && r.status === 'PENDING').map(r => r.id)
      const common = { dataGeneration: this.scope.dataGeneration, expectedVersion: server.version, sessionExerciseId: exerciseId, pendingRequestIds, occurredAt: new Date().toISOString() }
      if (decision === 'KEEP_CURRENT') return this.submit({ kind: 'approval', body: { ...common, decision, newApprovalRequest: null } })
      const r = await this.api.routine(this.scope, server.initialPlan.routineId, this.abort.signal)
      if (!this.canWrite()) return false
      const placement = r.weightPlacements.find(p => p.id === server.initialPlan.weightExercises.find(e => e.sessionExerciseId === exerciseId)?.sourcePlacementId && !p.deletedAt)
      if (!placement) this.conflict('원래 루틴 배치를 확인할 수 없습니다. 현재 중량 유지를 선택해 주세요.')
      const sequence = server.snapshot.state.approvalRequests.filter(r => r.sessionExerciseId === exerciseId).reduce((n, r) => BigInt(n) > BigInt(r.sequence) ? n : r.sequence, '0')
      return this.submit({ kind: 'approval', body: { ...common, decision, newApprovalRequest: { id: newId(), sequence: increment(sequence), expectedRoutineVersion: r.version, previousApprovedWeightKg: placement.approvedWeightKg, nextApprovedWeightKg: decimalDraft(weight) } } })
    } catch (error) { this.failure(error); return false }
  }
  retry = async () => {
    if (this.state.pending?.status !== 'PENDING' || !this.canWrite() || this.state.busy) return
    this.set({ busy: true, issue: null })
    try {
      await this.read()
      const pending = this.state.pending
      if (!this.canWrite() || pending?.status !== 'PENDING') return
      const server = this.state.server
      if (!server || server.deletedAt || server.version !== pending.body.expectedVersion) {
        this.conflict('기록이 바뀌었습니다. 최신 기록과 변경 이력을 확인한 뒤 다시 선택해 주세요.')
      }
      await this.send(pending)
    } catch (error) { this.failure(error) } finally { this.set({ busy: false }) }
  }
  reviewed = async () => {
    const pending = this.state.pending
    if (!pending || pending.status !== 'PENDING' || !this.canWrite() || this.state.busy) return
    const next: ClosedWrite = { ...pending, status: 'REVIEWED' }
    try { await this.store.saveClosedWrite(next, pending, this.canWrite); this.set({ pending: next, issue: null, notice: '현재 기록을 확인했어요.', noticeTone: 'info' }) } catch (error) { this.failure(error) }
  }
  confirmFinish = async (local: LocalWorkout) => {
    const server = this.state.server
    if (!this.current() || this.state.busy || !local.finish?.request || local.finish.ack || server?.deletedAt || server?.status !== 'FINISHED') return
    if (local.userId !== this.scope.userId || local.dataGeneration !== this.scope.dataGeneration || local.sessionId !== this.id
      || local.writerEpoch !== server.writerEpoch || local.editorDeviceId !== server.editorDeviceId) {
      this.set({ issue: '다른 편집 사본의 종료 요청은 자동 적용하지 않습니다. 원본을 보존하고 누락 수행 비교에서 확인해 주세요.' }); return
    }
    this.set({ busy: true, issue: null })
    try {
      if (!await this.ensureLease()) return
      const original = await this.store.readLocal(local)
      if (!this.canWrite()) return
      if (!original?.finish?.request || original.finish.requestJson !== local.finish.requestJson) {
        this.conflict('이 기기의 종료 요청이 변경되었습니다. 현재 기록을 다시 확인해 주세요.')
      }
      if (!original.finish.ack) {
        // The original FINISH sender uses the lock already held by this screen.
        const c = new LocalWorkoutController(this.store, this.current, async () => ({ held: this.canWrite, release() {} }), { api: this.api, online: this.current })
        try {
          await c.open(server, original.restPolicy)
          await c.syncSettled()
          const result = c.getSnapshot()
          if (!result.workout?.finish?.ack) this.conflict(result.syncIssue ?? '원래 종료 요청과 서버 종료가 일치하는지 확인하지 못했습니다. 원본을 유지합니다.')
        } finally { c.stop() }
      }
      if (this.current()) { await this.read(); this.set({ notice: '운동 종료 결과를 확인했어요.', noticeTone: 'info' }) }
    } catch (error) { this.failure(error) } finally { this.set({ busy: false }) }
  }
  stop() { this.stopped = true; this.abort.abort(); this.lease?.release() }
}
