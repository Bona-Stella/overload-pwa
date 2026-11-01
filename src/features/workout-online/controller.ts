import type { AuthController, AuthState } from '../auth/controller.ts'
import { WorkoutApi } from './api.ts'
import { WorkoutStore, LocalStoreError } from './storage.ts'
import type { StartAttempt, SessionCopy } from './storage.ts'
import type { Scope, Session, Routine, RoutineList, CreateRoutine, UpdateRoutine } from './types.ts'
import { acquireEditor } from '../workout-local/lock.ts'

type Bootstrap = Awaited<ReturnType<WorkoutApi['bootstrap']>>
type AuthSource = Pick<AuthController, 'getSnapshot' | 'subscribe'>
type Store = Pick<WorkoutStore, 'deviceId' | 'attempt' | 'prepareStart' | 'saveSession' | 'copies'> & Partial<Pick<WorkoutStore, 'prepareTakeover' | 'rejectTakeover'>>
export type OnlineState = { userId: string | null; scope: Scope | null; data: Bootstrap | null; selected: Routine | null;
  active: Session | null; detail: Session | null; deviceId: string | null; attempt: StartAttempt | null;
  status: 'idle' | 'loading' | 'ready'; busy: boolean; localReady: boolean; copySaved: boolean; issue: string | null; notice: string }
const empty = (): OnlineState => ({ userId: null, scope: null, data: null, selected: null, active: null, detail: null, deviceId: null, attempt: null,
  status: 'idle', busy: false, localReady: false, copySaved: false, issue: null, notice: '' })
const eligible = (state: AuthState) => state.status === 'authenticated' && state.pending === null ? state.userId : null
export function onlineIssue(error: unknown): string {
  if (error instanceof LocalStoreError) return error.message
  const e = error as { code?: string; status?: number }
  if (e?.code === 'DATA_GENERATION_MISMATCH') return '운동 데이터가 변경되었습니다. 이전 화면은 적용하지 않았습니다. 로그인 상태와 운동 정보를 다시 확인해 주세요.'
  if (e?.status === 401 || e?.code === 'SESSION_CHANGED' || e?.code === 'OWNER_MISMATCH') return '계정 상태가 변경되었습니다. 로그인 상태를 다시 확인해 주세요.'
  if (e?.code === 'CSRF_INVALID') return '보안 확인이 만료되었습니다. 요청을 자동 반복하지 않았습니다. 다시 확인해 주세요.'
  if (e?.code === 'ACTIVE_SESSION_EXISTS') return '이미 진행 중인 운동이 있습니다. 현재 운동을 다시 조회해 주세요.'
  if (e?.code === 'ROUTINE_VERSION_CONFLICT') return '다른 곳에서 루틴이 수정되었습니다. 입력을 확인한 뒤 최신 루틴을 다시 조회해 주세요.'
  if (e?.code === 'CLOCK_CONTEXT_INVALID') return '기기의 날짜·시간·시간대를 확인해 주세요. 실제 운동 시각은 자동 보정하지 않습니다.'
  if (e?.code === 'RESPONSE_INVALID') return '서버 응답을 확인하지 못했습니다. 새 운동을 만들지 말고 기존 요청 결과를 다시 확인해 주세요.'
  if (e?.status === 409) return '다른 변경과 충돌했습니다. 현재 서버 상태를 다시 확인해 주세요.'
  if (e?.status === 400 || e?.status === 422) return '입력 내용과 허용 범위를 확인해 주세요.'
  return '연결 또는 요청 결과를 확인하지 못했습니다. 입력을 유지하고 다시 확인해 주세요.'
}
export function startBody(scope: Scope, routineId: string, deviceId: string, id: string, now: Date, zone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find(x => x.type === type)!.value
  return { id, dataGeneration: scope.dataGeneration, routineId, editorDeviceId: deviceId, startedAt: now.toISOString(),
    workoutDate: `${part('year')}-${part('month')}-${part('day')}`, startedTimeZone: zone }
}

/** Account-bound online management and explicit editor takeover. */
export class WorkoutOnlineController {
  private state = empty()
  private listeners = new Set<() => void>()
  private readonly api: WorkoutApi
  private readonly store: Store
  private auth: AuthSource | null = null
  private owner: string | null = null
  private sequence = 0
  private abort: AbortController | null = null
  private needsRevalidation = false
  constructor(api: WorkoutApi, store: Store = new WorkoutStore()) { this.api = api; this.store = store }
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener) }
  private set(patch: Partial<OnlineState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()) }
  private cancel() { this.sequence++; this.abort?.abort(); this.abort = null }
  connect(auth: AuthSource) {
    this.auth = auth
    const update = () => {
      const authState = auth.getSnapshot()
      // Keep only this already admitted workout when authentication expires in memory.
      if (authState.localWorkoutUserId === this.owner && this.owner && this.state.detail?.status === 'ACTIVE') {
        this.cancel(); this.needsRevalidation = true; this.set({ busy: false, status: 'ready' }); return
      }
      const owner = authState.status === 'authenticated' && (authState.pending === null || authState.userId === this.owner && authState.pending !== 'logout') ? authState.userId : null
      if (this.owner === owner) {
        if (this.needsRevalidation && eligible(authState)) { this.needsRevalidation = false; void this.refresh() }
        return
      }
      this.needsRevalidation = false
      this.cancel(); this.owner = owner; this.state = empty(); this.set({ userId: owner })
      if (owner) void this.refresh()
    }
    const unsubscribe = auth.subscribe(update); update()
    return () => { unsubscribe(); this.cancel(); this.auth = null; this.owner = null; this.state = empty(); this.set({}) }
  }
  private context() {
    const userId = this.owner
    if (!userId || !this.auth || eligible(this.auth.getSnapshot()) !== userId || this.state.busy) return null
    this.cancel(); const sequence = this.sequence, abort = new AbortController(); this.abort = abort
    return { userId, signal: abort.signal, current: () => this.sequence === sequence && !abort.signal.aborted && this.owner === userId && !!this.auth && eligible(this.auth.getSnapshot()) === userId }
  }
  private failure(error: unknown) {
    const code = (error as { code?: string })?.code
    if (['DATA_GENERATION_MISMATCH', 'OWNER_MISMATCH', 'SESSION_CHANGED'].includes(code ?? '')) {
      this.set({ ...empty(), userId: this.owner, issue: onlineIssue(error), status: 'ready' }); return
    }
    this.set({ issue: onlineIssue(error) })
  }
  refresh = async () => {
    const context = this.context(); if (!context) return
    this.set({ ...(this.state.detail?.status === 'ACTIVE' ? {} : empty()), userId: context.userId, status: 'loading', busy: true, issue: null })
    try {
      const data = await this.api.bootstrap(context.userId, context.signal)
      const active = (await this.api.active(data.scope, context.signal)).session
      if (!context.current()) return
      this.set({ scope: data.scope, data, active, detail: active })
      let deviceId: string | null = null, attempt: StartAttempt | null = null, copies: SessionCopy[] = []
      try {
        deviceId = await this.store.deviceId()
        attempt = await this.store.attempt(data.scope)
        copies = await this.store.copies(data.scope)
        if (!context.current()) return
        this.set({ deviceId, attempt, localReady: true })
        if (active) {
          await this.store.saveSession(data.scope, active)
          if (context.current()) this.set({ copySaved: true })
        } else if (copies.length) {
          const latest = copies.sort((a, b) => b.server.startedAt.localeCompare(a.server.startedAt))[0]
          const detail = await this.api.detail(data.scope, latest.sessionId, context.signal)
          if (!context.current()) return
          await this.store.saveSession(data.scope, detail)
          if (context.current()) this.set({ detail, copySaved: true })
        }
      } catch (error) {
        if (!(error instanceof LocalStoreError)) throw error
        if (context.current()) this.set({ deviceId, attempt, localReady: false, copySaved: false, issue: onlineIssue(error) })
      }
    } catch (error) { if (context.current()) this.failure(error) }
    finally { if (context.current()) this.set({ status: 'ready', busy: false }) }
  }
  select = async (id: string) => {
    const scope = this.state.scope, context = this.context(); if (!scope || !context) return
    this.set({ busy: true, selected: null, issue: null, notice: '' })
    try { const value = await this.api.routine(scope, id, context.signal); if (context.current()) this.set({ selected: value }) }
    catch (error) { if (context.current()) this.failure(error) }
    finally { if (context.current()) this.set({ busy: false }) }
  }
  showDetail = async (id: string) => {
    const scope = this.state.scope, context = this.context(); if (!scope || !context) return
    this.set({ busy: true, issue: null })
    try {
      const detail = await this.api.detail(scope, id, context.signal)
      if (!context.current()) return
      this.set({ detail, active: detail.status === 'ACTIVE' ? detail : this.state.active?.id === detail.id ? null : this.state.active })
      await this.store.saveSession(scope, detail)
      if (context.current()) this.set({ copySaved: true })
    } catch (error) { if (context.current()) this.failure(error) }
    finally { if (context.current()) this.set({ busy: false }) }
  }
  observeSession = (detail: Session) => {
    const current = this.state.detail
    if (!current || !this.owner || detail.userId !== this.owner || detail.dataGeneration !== this.state.scope?.dataGeneration || detail.id !== current.id
      || BigInt(detail.version) < BigInt(current.version)) return
    this.set({ detail, active: detail.status === 'ACTIVE' ? detail : this.state.active?.id === detail.id ? null : this.state.active })
  }
  invalidateScope = (error: unknown) => this.failure(error)
  takeover = async () => {
    const { scope, detail, deviceId } = this.state, context = this.context()
    if (!context || !scope || !detail || !deviceId || detail.status !== 'ACTIVE' || !this.store.prepareTakeover) return
    this.set({ busy: true, issue: null })
    let lease: Awaited<ReturnType<typeof acquireEditor>> = null
    let fixed: Awaited<ReturnType<WorkoutStore['prepareTakeover']>> | null = null
    try {
      lease = await acquireEditor({ ...scope, sessionId: detail.id, editorDeviceId: deviceId, writerEpoch: detail.writerEpoch })
      if (!lease || !context.current()) { if (context.current()) this.set({ issue: '다른 탭이 운동을 편집 중이거나 편집 잠금을 지원하지 않습니다.' }); return }
      fixed = await this.store.prepareTakeover(scope, detail.id, deviceId, detail.writerEpoch)
      if (!context.current()) return
      const server = await this.api.takeover(scope, detail.id, fixed.request, context.signal)
      if (!context.current()) return
      await this.store.saveSession(scope, server)
      if (context.current()) this.set({ detail: server, active: server.status === 'ACTIVE' ? server : null, copySaved: true, notice: '서버에 저장된 기록으로 이 기기의 편집을 시작합니다. 이전 기기의 미전송 원본은 자동으로 합치지 않았습니다.' })
    } catch (error) {
      if (context.current() && ['EDITOR_OWNERSHIP_LOST', 'SESSION_AUTO_CLOSED', 'SESSION_NOT_ACTIVE'].includes((error as { code?: string }).code ?? '')) {
        try {
          const server = await this.api.detail(scope, detail.id, context.signal)
          if (!context.current()) return
          await this.store.saveSession(scope, server)
          if (fixed && this.store.rejectTakeover) await this.store.rejectTakeover(scope, detail.id, deviceId, fixed.requestJson, server)
          if (context.current()) { this.observeSession(server); this.set({ issue: '편집 기기 또는 운동 상태가 다시 바뀌었습니다. 현재 기록을 확인하고 다시 선택해 주세요.' }) }
        } catch (failure) { if (context.current()) this.failure(failure) }
      } else if (context.current()) this.failure(error)
    }
    finally { lease?.release(); if (context.current()) this.set({ busy: false }) }
  }
  start = async () => {
    const { scope, selected, deviceId, attempt, localReady, active } = this.state
    const context = this.context(); if (!scope || !deviceId || !localReady || !context || (!attempt && (!selected || active))) return
    this.set({ busy: true, issue: null, notice: '', copySaved: false })
    try {
      const pending = attempt ?? await this.store.prepareStart(scope, startBody(scope, selected!.id, deviceId, crypto.randomUUID(), new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone))
      if (!context.current()) return
      this.set({ attempt: pending })
      const detail = await this.api.start(scope, pending.request, context.signal)
      if (!context.current()) return
      // The attempt remains durable until the server copy commits in the same local transaction.
      await this.store.saveSession(scope, detail, pending.request.id)
      if (!context.current()) return
      this.set({ detail, active: detail.status === 'ACTIVE' ? detail : null, attempt: null, copySaved: true, notice: '운동 시작 결과와 계획을 이 기기에 저장했습니다. 수행 완료 후 서버 저장 상태를 확인해 주세요.' })
    } catch (error) { if (context.current()) this.failure(error) }
    finally { if (context.current()) this.set({ busy: false }) }
  }
  saveRoutine = async (body: CreateRoutine | UpdateRoutine, id?: string) => {
    const scope = this.state.scope, context = this.context(); if (!scope || !context) return false
    this.set({ busy: true, issue: null, notice: '' })
    try {
      let value: Routine
      if (id) value = await this.api.updateRoutine(scope, id, body as UpdateRoutine, context.signal)
      else {
        const creation = body as CreateRoutine
        // A prior creation may have committed without its response. Re-read its fixed UUID first.
        try {
          value = await this.api.routine(scope, creation.id, context.signal)
          if (context.current()) this.set({ notice: '같은 요청의 기존 루틴을 조회했습니다. 현재 서버 내용을 확인해 주세요.' })
        } catch (error) {
          if ((error as { status?: number }).status !== 404) throw error
          value = await this.api.createRoutine(scope, creation, context.signal)
        }
      }
      const list: RoutineList = await this.api.routines(scope, context.signal)
      if (!context.current()) return false
      this.set({ selected: value, data: this.state.data ? { ...this.state.data, routines: list.routines } : null, notice: this.state.notice || '루틴을 서버에 저장했습니다.' })
      return true
    } catch (error) { if (context.current()) this.failure(error); return false }
    finally { if (context.current()) this.set({ busy: false }) }
  }
  createExercise = async (id: string, name: string) => {
    const scope = this.state.scope, context = this.context(); if (!scope || !context) return null
    this.set({ busy: true, issue: null })
    try {
      const value = await this.api.createExercise(scope, { id, dataGeneration: scope.dataGeneration, name }, context.signal)
      if (!context.current()) return null
      if (this.state.data) this.set({ data: { ...this.state.data, exercises: [...this.state.data.exercises.filter(x => x.id !== id), { id: value.id, name: value.name }] } })
      return value.id
    } catch (error) { if (context.current()) this.failure(error); return null }
    finally { if (context.current()) this.set({ busy: false }) }
  }
}
