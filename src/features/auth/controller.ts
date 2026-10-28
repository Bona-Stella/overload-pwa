import { AuthApi, AuthError } from './api.ts'

export type AuthIssue = { code: string; message: string }
export type AuthState = {
  status: 'checking' | 'anonymous' | 'authenticated' | 'unavailable'
  userId: string | null
  pending: null | 'request' | 'verify' | 'logout' | 'google' | 'restore'
  challenge: null | { id: string | null; email: string; expiresAt: number }
  resendAt: number
  verifyAt: number
  issue: AuthIssue | null
  notice: string
  updatedAt: number
}
export type ReturnFlow = 'none' | 'complete' | 'failed'
export const returnFlow = (path: string): ReturnFlow => path === '/auth/complete' ? 'complete' : path === '/auth/failed' ? 'failed' : 'none'
export function authIssue(error: unknown): AuthIssue {
  const e = error instanceof AuthError ? error : new AuthError('REQUEST_FAILED')
  let message = '요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  if (e.code === 'NETWORK' || e.code === 'TIMEOUT') message = '서버에 연결하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.'
  else if (e.code === 'CSRF_INVALID') message = '보안 확인이 만료됐습니다. 다시 눌러 새 보안 정보로 요청해 주세요. 이전 요청은 자동 재실행하지 않습니다.'
  else if (e.code === 'OTP_INVALID') message = '코드가 맞지 않거나 만료됐습니다. 받은 메일과 유효시간을 확인해 주세요.'
  else if (e.status === 429) message = '요청 또는 입력 제한에 도달했습니다. 안내된 시간이 지난 뒤 다시 시도해 주세요.'
  else if (e.status === 503) message = '인증 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.'
  else if (e.status === 400) message = '이메일 주소와 입력 내용을 확인해 주세요.'
  else if (e.code === 'RESPONSE_INVALID') message = '서버 응답을 확인할 수 없습니다. 인증 상태를 다시 확인해 주세요.'
  else if (e.code === 'CODE_EXPIRED') message = '코드가 만료됐습니다. 재발송 가능 시간을 확인해 새 코드를 요청해 주세요.'
  else if (e.code === 'GOOGLE_FAILED') message = 'Google 로그인을 완료하지 못했습니다. 다시 시도해 주세요.'
  else if (e.code === 'GOOGLE_NOT_CONFIRMED') message = 'Google 로그인 결과를 확인할 수 없습니다. 로그인 상태를 다시 확인해 주세요.'
  return { code: e.code, message }
}

export class AuthController {
  private state: AuthState = { status: 'checking', userId: null, pending: null, challenge: null, resendAt: 0, verifyAt: 0, issue: null, notice: '', updatedAt: 0 }
  private listeners = new Set<() => void>()
  private running = false
  private started = false
  private readonly api: AuthApi
  private readonly now: () => number
  private readonly navigate: (path: string) => void
  constructor(api = new AuthApi(), now = () => Date.now(), navigate = (path: string) => window.location.assign(path)) { this.api = api; this.now = now; this.navigate = navigate }
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private set(patch: Partial<AuthState>) { this.state = { ...this.state, ...patch, updatedAt: this.now() }; this.listeners.forEach(listener => listener()) }
  start(flow: ReturnFlow = 'none') {
    if (this.started) return
    this.started = true
    return this.restore(flow)
  }
  resume() {
    if (this.state.pending === 'google') { this.running = false; this.set({ pending: null }) }
    return this.restore()
  }
  private async loadSession(flow: ReturnFlow = 'none', notice = '') {
    const session = await this.api.session()
    await this.api.refreshCsrf()
    const issue = flow === 'failed' ? authIssue(new AuthError('GOOGLE_FAILED'))
      : flow === 'complete' && !session ? authIssue(new AuthError('GOOGLE_NOT_CONFIRMED')) : null
    this.set({ status: session ? 'authenticated' : 'anonymous', userId: session?.userId ?? null, challenge: null, issue, notice })
  }
  async restore(flow: ReturnFlow = 'none') {
    if (this.running) return
    this.running = true; this.set({ pending: 'restore', issue: null })
    try { await this.loadSession(flow) }
    catch (error) { this.set({ status: 'unavailable', issue: authIssue(error), challenge: null }) }
    finally { this.running = false; this.set({ pending: null }) }
  }
  async requestOtp(email: string) {
    if (this.running || this.state.status !== 'anonymous' || this.now() < this.state.resendAt) return
    const address = email.trim().toLowerCase()
    if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      this.set({ issue: { code: 'EMAIL_INVALID', message: '올바른 이메일 주소를 입력해 주세요.' } }); return
    }
    this.running = true
    const issuedAt = this.now()
    this.set({ pending: 'request', issue: null, notice: '', challenge: { id: null, email: address, expiresAt: issuedAt + 300_000 }, resendAt: issuedAt + 60_000 })
    try {
      const id = await this.api.requestOtp(address)
      this.set({ challenge: { id, email: address, expiresAt: issuedAt + 300_000 }, resendAt: this.now() + 60_000, notice: '인증코드를 보냈습니다. 메일함을 확인해 주세요.' })
    } catch (error) {
      const retry = error instanceof AuthError ? error.retryAfter : 0
      const uncertain = error instanceof AuthError && (['NETWORK', 'TIMEOUT', 'RESPONSE_INVALID'].includes(error.code) || error.status === 503)
      this.set({ issue: authIssue(error), notice: uncertain ? '메일 요청 결과를 확인하지 못했습니다. 메일함을 확인하고 기다려 주세요. 자동으로 재발송하지 않습니다.' : '발송 요청이 완료되지 않았습니다.', resendAt: Math.max(this.state.resendAt, this.now() + Math.max(60, retry) * 1000) })
      if (error instanceof AuthError && error.code === 'LOGOUT_REQUIRED') await this.recoverSession()
    } finally { this.running = false; this.set({ pending: null }) }
  }
  async verifyOtp(code: string) {
    const challenge = this.state.challenge
    if (this.running || this.state.status !== 'anonymous' || !challenge?.id || this.now() < this.state.verifyAt || !/^\d{6}$/.test(code)) return
    if (this.now() >= challenge.expiresAt) { this.set({ issue: authIssue(new AuthError('CODE_EXPIRED')) }); return }
    this.running = true; this.set({ pending: 'verify', issue: null, notice: '' })
    try {
      await this.api.verifyOtp(challenge.email, challenge.id, code)
      // A consumed OTP is never retried if session restoration or CSRF retrieval fails.
      this.set({ challenge: null })
      const session = await this.api.session()
      if (!session) throw new AuthError('RESPONSE_INVALID')
      await this.api.refreshCsrf()
      this.set({ status: 'authenticated', userId: session.userId, challenge: null, issue: null })
    } catch (error) {
      const limited = error instanceof AuthError && error.status === 429
      const wait = limited ? Math.max(60, error.retryAfter) * 1000 : 0
      this.set({ issue: authIssue(error), resendAt: Math.max(this.state.resendAt, this.now() + wait), verifyAt: limited ? this.now() + wait : this.state.verifyAt })
      const uncertain = error instanceof AuthError && (['NETWORK', 'TIMEOUT', 'RESPONSE_INVALID'].includes(error.code) || error.status >= 500)
      if (!this.state.challenge || uncertain) this.set({ status: 'unavailable', challenge: null })
    } finally { this.running = false; this.set({ pending: null }) }
  }
  cancelOtp() {
    if (!this.running) this.set({ challenge: null, issue: null, notice: '' })
  }
  async logout() {
    if (this.running || this.state.status !== 'authenticated') return
    this.running = true; this.set({ pending: 'logout', issue: null })
    try {
      await this.api.logout()
      if (await this.api.session()) throw new AuthError('RESPONSE_INVALID')
      this.set({ userId: null, challenge: null })
      await this.api.refreshCsrf()
      this.set({ status: 'anonymous', issue: null, notice: '로그아웃했습니다.' })
    } catch (error) {
      this.set({ status: 'unavailable', issue: authIssue(error), challenge: null })
    } finally { this.running = false; this.set({ pending: null }) }
  }
  private async recoverSession() {
    try { await this.loadSession() } catch (error) { this.set({ status: 'unavailable', issue: authIssue(error) }) }
  }
  googleLogin() {
    if (this.running || this.state.status !== 'anonymous') return
    this.running = true; this.set({ pending: 'google', challenge: null, issue: null })
    // Fixed path, top-level navigation; no email, state, code, token or returnUrl parameters.
    this.navigate('/oauth2/authorization/google')
  }
}
