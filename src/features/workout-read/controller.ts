import type { AuthController, AuthState } from '../auth/controller.ts'
import { WorkoutReadApi, WorkoutReadError } from './api.ts'
import type { WorkoutSnapshot } from './api.ts'

export type WorkoutReadIssue = { code: string; status: number; requestId: string | null; message: string }
export type WorkoutReadState =
  | { status: 'idle' | 'loading'; userId: string | null; data: null; issue: null }
  | { status: 'ready'; userId: string; data: WorkoutSnapshot; issue: null }
  | { status: 'error' | 'sync-check'; userId: string; data: null; issue: WorkoutReadIssue }
type AuthSource = Pick<AuthController, 'getSnapshot' | 'subscribe' | 'restore'>

export function workoutReadIssue(error: unknown): WorkoutReadIssue {
  const e = error instanceof WorkoutReadError ? error : new WorkoutReadError('REQUEST_FAILED')
  let message = '운동 정보를 불러오지 못했습니다. 잠시 후 다시 조회해 주세요.'
  if (e.status === 401) message = '로그인 상태를 확인한 뒤 운동 정보를 다시 조회해 주세요.'
  else if (e.status === 403) message = '운동 정보에 접근할 권한이 없습니다. 접근 권한을 확인해 주세요.'
  else if (e.status === 400) message = '앱과 서버의 조회 요청 규약을 확인해야 합니다. 계속되면 문의해 주세요.'
  else if (e.status === 503) message = '운동 정보 서비스를 일시적으로 이용할 수 없습니다. 잠시 후 다시 조회해 주세요.'
  else if (e.status === 500 && e.code === 'WORKOUT_SETTINGS_MISSING') message = '저장된 휴식 설정을 찾지 못했습니다. 서버 설정 확인이 필요합니다.'
  else if (e.status >= 500) message = '서버에서 운동 정보를 조회하지 못했습니다. 잠시 후 다시 조회해 주세요.'
  else if (e.code === 'OWNER_MISMATCH') message = '현재 계정과 조회된 계정이 일치하지 않아 표시하지 않았습니다. 로그인 상태를 확인해 주세요.'
  else if (e.code === 'GENERATION_MISMATCH') message = '운동 정보의 데이터 세대가 일치하지 않습니다. 동기화 상태를 확인한 뒤 다시 조회해 주세요.'
  else if (e.code === 'RESPONSE_INVALID') message = '서버 응답 형식을 확인하지 못해 운동 정보를 표시하지 않았습니다.'
  else if (e.code === 'NETWORK' || e.code === 'TIMEOUT') message = '서버에 연결하지 못했습니다. 연결을 확인한 뒤 다시 조회해 주세요.'
  return { code: e.code, status: e.status, requestId: e.requestId, message }
}

const eligible = (state: AuthState) => state.status === 'authenticated' && state.pending === null ? state.userId : null

/** One in-memory read view, bound to the existing authentication store. No browser persistence. */
export class WorkoutReadController {
  private state: WorkoutReadState = { status: 'idle', userId: null, data: null, issue: null }
  private listeners = new Set<() => void>()
  private auth: AuthSource | null = null
  private owner: string | null = null
  private epoch = 0
  private abort: AbortController | null = null
  private sessionHold: { userId: string; issue: WorkoutReadIssue } | null = null
  private readonly api: Pick<WorkoutReadApi, 'exercises' | 'settings'>
  constructor(api: Pick<WorkoutReadApi, 'exercises' | 'settings'> = new WorkoutReadApi()) { this.api = api }
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private set(state: WorkoutReadState) { this.state = state; this.listeners.forEach(listener => listener()) }
  private cancel() { this.epoch++; this.abort?.abort(); this.abort = null }

  connect(auth: AuthSource) {
    this.auth = auth
    const update = () => {
      const state = auth.getSnapshot(), owner = eligible(state)
      if (this.sessionHold && (state.userId !== this.sessionHold.userId || state.status === 'anonymous' || state.pending === 'logout')) this.sessionHold = null
      if (owner === this.owner) return
      this.cancel(); this.owner = owner
      if (!owner) { this.set({ status: 'idle', userId: null, data: null, issue: null }); return }
      if (this.sessionHold?.userId === owner) { this.set({ status: 'error', userId: owner, data: null, issue: this.sessionHold.issue }); return }
      void this.refresh()
    }
    const unsubscribe = auth.subscribe(update)
    update()
    return () => { unsubscribe(); this.cancel(); this.owner = null; this.auth = null; this.sessionHold = null; this.set({ status: 'idle', userId: null, data: null, issue: null }) }
  }

  refresh = async () => {
    const userId = this.owner, auth = this.auth
    if (!userId || !auth || eligible(auth.getSnapshot()) !== userId) return
    this.cancel(); this.sessionHold = null
    const epoch = this.epoch, abort = new AbortController()
    this.abort = abort
    this.set({ status: 'loading', userId, data: null, issue: null })
    const current = () => this.epoch === epoch && !abort.signal.aborted && this.auth === auth && this.owner === userId && eligible(auth.getSnapshot()) === userId
    try {
      // Two paired reads at most: no timers, backoff loop or partial mixed-generation view.
      for (let attempt = 0; attempt < 2; attempt++) {
        const results = await Promise.allSettled([this.api.exercises(userId, abort.signal), this.api.settings(userId, abort.signal)] as const)
        if (!current()) return
        const failed = results.filter(result => result.status === 'rejected')
        if (failed.length) throw (failed.find(result => result.reason instanceof WorkoutReadError && result.reason.status === 401) ?? failed[0]).reason
        const [exercises, settings] = results
        if (exercises.status !== 'fulfilled' || settings.status !== 'fulfilled') return
        if (exercises.value.dataGeneration !== settings.value.dataGeneration) {
          if (attempt === 0) continue
          this.set({ status: 'sync-check', userId, data: null, issue: workoutReadIssue(new WorkoutReadError('GENERATION_MISMATCH')) }); return
        }
        this.set({ status: 'ready', userId, data: { ...exercises.value, settings: settings.value }, issue: null }); return
      }
    } catch (error) {
      if (!current()) return
      const issue = workoutReadIssue(error)
      this.set({ status: 'error', userId, data: null, issue })
      if (issue.status === 401) {
        // Restore once, and hold this view on the same user until an explicit retry. Prevent a 401 loop.
        this.sessionHold = { userId, issue }
        await auth.restore()
      }
    } finally { if (this.epoch === epoch) this.abort = null }
  }
}
