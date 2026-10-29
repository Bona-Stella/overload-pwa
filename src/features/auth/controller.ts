import { AuthApi, AuthError } from './api.ts'
import { emptyAccount } from './account.ts'
import type { AccountState } from './account.ts'
import type { Identity } from './api.ts'

export type AuthIssue = { code: string; message: string }
export type AuthState = {
  status: 'checking' | 'anonymous' | 'authenticated' | 'unavailable'
  userId: string | null
  pending: null | 'request' | 'verify' | 'logout' | 'google' | 'restore' | 'account' | 'proof-request' | 'proof-verify' | 'contact' | 'contact-navigation' | 'cancel-registration' | 'identity-change' | 'link' | 'link-navigation'
  challenge: null | { id: string | null; email: string; expiresAt: number }
  resendAt: number
  verifyAt: number
  issue: AuthIssue | null
  notice: string
  updatedAt: number
  accountOpen: boolean
  account: AccountState
}
export type ReturnFlow = 'none' | 'complete' | 'failed' | 'account' | 'contact-complete' | 'contact-failed' | 'link-complete' | 'link-failed'
export const returnFlow = (path: string): ReturnFlow => path === '/auth/complete' ? 'complete' : path === '/auth/failed' ? 'failed'
  : path === '/account/contact/complete' ? 'contact-complete' : path === '/account/contact/failed' ? 'contact-failed'
  : path === '/account/link/complete' ? 'link-complete' : path === '/account/link/failed' ? 'link-failed' : path === '/account' ? 'account' : 'none'
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
  else if (e.code === 'GOOGLE_CONTACT_FAILED') message = 'Google 이메일 확인을 완료하지 못했습니다. 연결된 Google 계정과 동의 여부를 확인해 주세요.'
  else if (e.code === 'CONTACT_NOT_CONFIRMED') message = '유효한 이메일 후보를 확인하지 못했습니다. Google 이메일 확인부터 다시 진행해 주세요.'
  else if (e.code === 'EMAIL_OWNERSHIP_PROOF_REQUIRED') message = '최근 10분 이내의 이메일 소유 확인이 필요합니다. 대표 이메일로 재인증한 뒤 원하는 연결·해제를 다시 선택해 주세요.'
  else if (e.code === 'IDENTITY_ALREADY_OWNED') message = '이 로그인 수단은 이미 다른 계정에 연결되어 있습니다. 계정은 자동으로 합쳐지지 않습니다.'
  else if (e.code === 'LAST_LOGIN_IDENTITY') message = '마지막으로 사용할 수 있는 로그인 수단은 해제할 수 없습니다. 다른 로그인 수단을 먼저 연결해 주세요.'
  else if (e.code === 'IDENTITY_NOT_FOUND') message = '해제 대상을 찾을 수 없습니다. 계정 정보를 다시 확인해 주세요.'
  else if (e.code === 'IDENTITY_AMBIGUOUS') message = '같은 종류의 로그인 수단이 여러 개여서 해제 대상을 안전하게 구분할 수 없습니다. 개별 신원 확인 기능이 필요합니다.'
  else if (e.code === 'IDENTITY_CHANGE_SUPERSEDED') message = '다른 로그인 수단 변경으로 이 요청이 만료됐습니다. 현재 상태를 확인한 뒤 직접 다시 시작해 주세요.'
  else if (e.code === 'GOOGLE_LINK_FAILED') message = 'Google 연결을 완료했는지 확인할 수 없습니다. 취소·충돌·요청 또는 이메일 증명 만료 등이 원인일 수 있습니다. 현재 연결 상태를 확인하고 필요하면 이메일 재인증 후 직접 다시 시작해 주세요.'
  else if (e.code === 'GOOGLE_LINK_NOT_CONFIRMED') message = '서버에서 Google 로그인 연결을 확인하지 못했습니다. 복귀 주소만으로 성공 처리하지 않습니다.'
  else if (e.code === 'REAUTH_EMAIL_REQUIRED') message = '대표 재인증 이메일을 먼저 등록해 주세요.'
  else if (e.code === 'REAUTH_EMAIL_ALREADY_VERIFIED') message = '대표 이메일이 이미 등록됐습니다. 계정 정보를 다시 확인해 주세요.'
  else if (e.code === 'AUTHENTICATION_REQUIRED') message = '로그인이 만료되거나 세션이 변경됐습니다. 다시 로그인해 주세요.'
  else if (e.code === 'SESSION_CHANGED') message = '계정 상태가 변경됐습니다. 인증 상태를 다시 확인해 주세요. 이전 요청은 반복하지 않습니다.'
  return { code: e.code, message }
}

export class AuthController {
  private state: AuthState = { status: 'checking', userId: null, pending: null, challenge: null, resendAt: 0, verifyAt: 0, issue: null, notice: '', updatedAt: 0, accountOpen: false, account: emptyAccount() }
  private listeners = new Set<() => void>()
  private running = false
  private started = false
  private readonly api: AuthApi
  private readonly now: () => number
  private readonly navigate: (path: string) => void
  private readonly route: (path: string) => void
  private generation = 0
  private resumePending = false
  private resumeFlow: ReturnFlow = 'none'
  constructor(api = new AuthApi(), now = () => Date.now(), navigate = (path: string) => window.location.assign(path), route = (path: string) => window.history.pushState(null, '', path)) { this.api = api; this.now = now; this.navigate = navigate; this.route = route }
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private set(patch: Partial<AuthState>) { this.state = { ...this.state, ...patch, updatedAt: this.now() }; this.listeners.forEach(listener => listener()) }
  start(flow: ReturnFlow = 'none') {
    if (this.started) return
    this.started = true
    return this.restore(flow)
  }
  resume(flow: ReturnFlow = 'none') {
    this.generation++
    this.set({ account: emptyAccount(), challenge: null, notice: '', issue: null })
    this.api.clearCsrf?.()
    if (['google', 'contact-navigation', 'link-navigation'].includes(this.state.pending ?? '')) { this.running = false; this.set({ pending: null }) }
    if (this.running) { this.resumePending = true; this.resumeFlow = flow; return }
    return this.restore(flow)
  }
  private async loadSession(flow: ReturnFlow = 'none', notice = '') {
    const session = await this.api.session()
    await this.api.refreshCsrf()
    const issue = flow === 'failed' ? authIssue(new AuthError('GOOGLE_FAILED'))
      : flow === 'link-failed' ? authIssue(new AuthError('GOOGLE_LINK_FAILED'))
      : flow === 'link-complete' && !session ? authIssue(new AuthError('AUTHENTICATION_REQUIRED', 401))
      : flow === 'complete' && !session ? authIssue(new AuthError('GOOGLE_NOT_CONFIRMED')) : null
    this.set({ status: session ? 'authenticated' : 'anonymous', userId: session?.userId ?? null, challenge: null, account: emptyAccount(), accountOpen: Boolean(session && ['account', 'contact-complete', 'contact-failed', 'link-complete', 'link-failed'].includes(flow)), issue, notice })
  }
  async restore(flow: ReturnFlow = this.state.accountOpen ? 'account' : 'none') {
    if (this.running) return
    this.running = true; this.set({ pending: 'restore', issue: null })
    this.generation++; this.set({ account: emptyAccount() })
    try {
      await this.loadSession(flow)
      if (this.state.accountOpen && this.state.userId) {
        await this.readAccount(this.state.userId, this.generation)
        if (flow === 'contact-failed') this.set({ issue: authIssue(new AuthError('GOOGLE_CONTACT_FAILED')) })
        if (flow === 'contact-complete' && this.state.account.contact?.status === 'REQUIRED' && !this.state.account.contact.candidate) this.set({ issue: authIssue(new AuthError('CONTACT_NOT_CONFIRMED')) })
        if (flow === 'link-failed') this.set({ issue: authIssue(new AuthError('GOOGLE_LINK_FAILED')) })
        if (flow === 'link-complete') {
          if (!this.state.account.identities.some(identity => identity.provider === 'google')) this.set({ issue: authIssue(new AuthError('GOOGLE_LINK_NOT_CONFIRMED')) })
          else this.set({ notice: '서버에서 현재 Google 로그인 수단 연결 상태를 다시 확인했습니다.' })
        }
      }
    }
    catch (error) {
      if (error instanceof AuthError && error.status === 401 && error.code !== 'OTP_INVALID') this.accountFailure(error)
      else this.set({ status: 'unavailable', issue: authIssue(error), challenge: null, account: emptyAccount() })
    }
    finally { await this.finish() }
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
    } finally { await this.finish() }
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
    } finally { await this.finish() }
  }
  cancelOtp() {
    if (!this.running) this.set({ challenge: null, issue: null, notice: '' })
  }
  async logout() {
    if (this.running || this.state.status !== 'authenticated') return
    this.running = true; this.generation++; this.set({ pending: 'logout', issue: null, account: emptyAccount(), accountOpen: false })
    try {
      await this.api.logout()
      if (await this.api.session()) throw new AuthError('RESPONSE_INVALID')
      this.set({ userId: null, challenge: null })
      await this.api.refreshCsrf()
      this.set({ status: 'anonymous', issue: null, notice: '로그아웃했습니다.' })
    } catch (error) {
      this.set({ status: 'unavailable', issue: authIssue(error), challenge: null })
    } finally { await this.finish() }
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

  private accountPatch(patch: Partial<AccountState>) { this.set({ account: { ...this.state.account, ...patch } }) }
  private async finish() {
    this.running = false; this.set({ pending: null })
    if (this.resumePending) { this.resumePending = false; await this.restore(this.resumeFlow) }
  }
  private async owner(expected: string, generation: number) {
    const session = await this.api.session()
    if (generation !== this.generation) throw new AuthError('SESSION_CHANGED', 409)
    if (!session) throw new AuthError('AUTHENTICATION_REQUIRED', 401)
    if (session.userId !== expected) throw new AuthError('SESSION_CHANGED', 409)
  }
  private async readAccount(expected: string, generation: number) {
    await this.owner(expected, generation)
    const [identities, contact] = await Promise.all([this.api.identities(), this.api.contact()])
    await this.owner(expected, generation)
    this.accountPatch({ identities, contact, loaded: true, form: null, linkForm: null, unlink: null })
  }
  private async prepareWrite(expected: string, generation: number) {
    await this.owner(expected, generation)
    await this.api.refreshCsrf()
    await this.owner(expected, generation)
  }
  private accountFailure(error: unknown) {
    const e = error instanceof AuthError ? error : new AuthError('REQUEST_FAILED')
    if (e.code === 'SESSION_CHANGED') this.set({ status: 'unavailable', account: emptyAccount(), challenge: null })
    else if (e.status === 401 && e.code !== 'OTP_INVALID') this.set({ status: 'anonymous', userId: null, account: emptyAccount(), accountOpen: false })
    this.set({ issue: authIssue(e.status === 401 && e.code !== 'OTP_INVALID' ? new AuthError('AUTHENTICATION_REQUIRED', 401) : error) })
  }
  async openAccount() {
    if (this.running || this.state.status !== 'authenticated' || !this.state.userId) return
    const entering = !this.state.accountOpen
    this.running = true
    const expected = this.state.userId, generation = ++this.generation
    this.set({ accountOpen: true, account: { ...emptyAccount(), resendAt: this.state.account.resendAt }, issue: null, notice: '', pending: 'account' })
    if (entering) this.route('/account')
    try { await this.readAccount(expected, generation) }
    catch (error) { this.accountFailure(error) }
    finally { await this.finish() }
  }
  closeAccount() {
    if (this.running) return
    this.generation++; this.set({ accountOpen: false, account: { ...emptyAccount(), resendAt: this.state.account.resendAt }, issue: null, notice: '' }); this.route('/')
  }
  async prepareGoogleContact() {
    const account = this.state.account
    if (this.running || this.state.status !== 'authenticated' || !this.state.userId || !account.loaded || account.contact?.status !== 'REQUIRED') return
    const google = account.identities.filter(value => value.provider === 'google')
    const identity = google.length === 1 ? google[0] : undefined
    if (!identity) return
    this.running = true; this.set({ pending: 'contact', issue: null, notice: '' }); this.accountPatch({ challenge: null, form: null, confirmedAt: null, linkForm: null, unlink: null })
    const expected = this.state.userId, generation = this.generation
    try {
      await this.owner(expected, generation)
      const form = await this.api.contactForm(identity.id)
      await this.owner(expected, generation)
      this.accountPatch({ form })
    } catch (error) { this.accountFailure(error) }
    finally { await this.finish() }
  }
  beginContactNavigation() {
    if (this.running || this.state.status !== 'authenticated' || !this.state.account.form) return false
    this.running = true; this.set({ pending: 'contact-navigation' }); return true
  }
  async requestEmailProof() {
    const account = this.state.account
    if (this.running || this.state.status !== 'authenticated' || !this.state.userId || !account.loaded || !account.contact || this.now() < account.resendAt) return
    const candidateId = account.contact.status === 'REQUIRED' ? account.contact.candidate?.id : undefined
    if (account.contact.status === 'REQUIRED' && !candidateId) return
    const expected = this.state.userId, generation = this.generation, started = this.now()
    this.running = true; this.set({ pending: 'proof-request', issue: null, notice: '' })
    this.accountPatch({ challenge: null, form: null, confirmedAt: null, linkForm: null, unlink: null, resendAt: started + 60_000 })
    try {
      await this.prepareWrite(expected, generation)
      // Re-read the server-owned recipient/candidate. No address or login identity is sent in the OTP body.
      const contact = await this.api.contact()
      if (candidateId ? contact.status !== 'REQUIRED' || contact.candidate?.id !== candidateId : contact.status !== 'VERIFIED') throw new AuthError('CONTACT_NOT_CONFIRMED', 409)
      await this.owner(expected, generation)
      const id = await this.api.requestEmailProof(candidateId)
      await this.owner(expected, generation)
      this.accountPatch({ contact, challenge: { id, ...(candidateId ? { candidateId } : {}), expiresAt: started + 300_000 }, resendAt: this.now() + 60_000 })
      this.set({ notice: '인증코드를 보냈습니다. 메일함을 확인해 주세요.' })
    } catch (error) {
      this.accountPatch({ challenge: null, resendAt: Math.max(this.state.account.resendAt, this.now() + Math.max(60, error instanceof AuthError ? error.retryAfter : 0) * 1000) })
      this.accountFailure(error)
    } finally { await this.finish() }
  }
  async verifyEmailProof(code: string) {
    const account = this.state.account, challenge = account.challenge
    if (this.running || this.state.status !== 'authenticated' || !this.state.userId || !challenge || this.now() < account.verifyAt || !/^\d{6}$/.test(code)) return
    if (this.now() >= challenge.expiresAt) { this.set({ issue: authIssue(new AuthError('CODE_EXPIRED')) }); return }
    const expected = this.state.userId, generation = this.generation
    let consumed = false
    this.running = true; this.set({ pending: 'proof-verify', issue: null, notice: '' })
    try {
      await this.prepareWrite(expected, generation)
      await this.api.verifyEmailProof(challenge.id, code, challenge.candidateId)
      consumed = true; this.accountPatch({ challenge: null, form: null })
      await this.owner(expected, generation)
      await this.api.refreshCsrf()
      await this.readAccount(expected, generation)
      if (this.state.account.contact?.status !== 'VERIFIED') throw new AuthError('RESPONSE_INVALID')
      this.accountPatch({ confirmedAt: this.now() })
      this.set({ notice: challenge.candidateId ? '대표 이메일을 등록하고 이메일 재인증을 완료했습니다.' : '이메일 재인증을 완료했습니다.' })
    } catch (error) {
      const e = error instanceof AuthError ? error : new AuthError('REQUEST_FAILED')
      if (e.status === 429) this.accountPatch({ verifyAt: this.now() + Math.max(60, e.retryAfter) * 1000, resendAt: Math.max(this.state.account.resendAt, this.now() + Math.max(60, e.retryAfter) * 1000) })
      const uncertain = consumed || ['NETWORK', 'TIMEOUT', 'RESPONSE_INVALID'].includes(e.code) || e.status >= 500
      if (uncertain) { this.set({ status: 'unavailable', account: emptyAccount() }); this.api.clearCsrf() }
      this.accountFailure(error)
    } finally { await this.finish() }
  }
  clearAccountCode() {
    if (!this.running) { this.accountPatch({ challenge: null }); this.set({ issue: null, notice: '' }) }
  }
  async cancelRegistration() {
    if (this.running || this.state.status !== 'authenticated' || !this.state.userId || this.state.account.contact?.status !== 'REQUIRED') return
    const expected = this.state.userId, generation = this.generation
    this.running = true; this.set({ pending: 'cancel-registration', issue: null, notice: '' }); this.accountPatch({ challenge: null, form: null })
    try { await this.prepareWrite(expected, generation); await this.api.cancelRegistration(); await this.readAccount(expected, generation); this.set({ notice: '대표 이메일 등록을 취소했습니다.' }) }
    catch (error) { this.accountFailure(error) }
    finally { await this.finish() }
  }

  selectUnlink(identity: Identity) {
    if (this.running || this.state.status !== 'authenticated' || !this.state.userId || !this.state.account.loaded) return
    const matches = this.state.account.identities.filter(value => value.provider === identity.provider)
    if (matches.length !== 1 || matches[0].id !== identity.id) { this.set({ issue: authIssue(new AuthError('IDENTITY_AMBIGUOUS')) }); return }
    this.accountPatch({ unlink: { userId: this.state.userId, identity: { ...matches[0] } }, linkForm: null, form: null })
    this.set({ issue: null, notice: '' })
  }
  cancelIdentityChange() {
    if (!this.running) { this.accountPatch({ unlink: null, linkForm: null }); this.set({ issue: null, notice: '' }) }
  }
  async linkEmail() { await this.changeIdentity() }
  async confirmUnlink() {
    const selected = this.state.account.unlink
    if (!selected) return
    if (selected.userId !== this.state.userId) { this.accountPatch({ unlink: null }); this.accountFailure(new AuthError('SESSION_CHANGED', 409)); return }
    await this.changeIdentity(selected.identity)
  }
  private async changeIdentity(target?: Identity) {
    if (this.running || this.state.status !== 'authenticated' || !this.state.userId || !this.state.account.loaded) return
    const expected = this.state.userId, generation = this.generation
    this.running = true; this.set({ pending: 'identity-change', issue: null, notice: '' })
    this.accountPatch({ unlink: null, linkForm: null, form: null, challenge: null })
    let sent = false
    try {
      await this.readAccount(expected, generation)
      if (this.state.account.contact?.status !== 'VERIFIED') throw new AuthError('REAUTH_EMAIL_REQUIRED', 409)
      if (target) {
        const matches = this.state.account.identities.filter(value => value.provider === target.provider)
        if (!matches.some(value => value.id === target.id)) throw new AuthError('IDENTITY_NOT_FOUND', 404)
        if (matches.length !== 1) throw new AuthError('IDENTITY_AMBIGUOUS')
      }
      await this.prepareWrite(expected, generation)
      sent = true
      const result = target ? await this.api.unlinkIdentity(target) : await this.api.linkEmail()
      await this.readAccount(expected, generation)
      if (target ? this.state.account.identities.some(value => value.id === target.id)
        : !result || !this.state.account.identities.some(value => value.id === result.identity.id && value.provider === 'email')) throw new AuthError('RESPONSE_INVALID')
      this.set({ notice: target ? '로그인 수단을 해제했습니다. 대표 재인증 이메일은 유지됩니다.' : result?.status === 'ALREADY_LINKED' ? '이미 같은 계정에 연결된 이메일 로그인입니다.' : '대표 이메일의 로그인 수단을 연결했습니다.' })
    } catch (error) {
      const e = error instanceof AuthError ? error : new AuthError('REQUEST_FAILED')
      const uncertain = sent && (['NETWORK', 'TIMEOUT', 'RESPONSE_INVALID'].includes(e.code) || e.status >= 500)
      this.accountPatch({ unlink: null, linkForm: null, ...(e.code === 'EMAIL_OWNERSHIP_PROOF_REQUIRED' ? { confirmedAt: null } : {}) })
      if (sent) {
        // Read only: a failed/uncertain mutation is never retried, including after CSRF refresh.
        try { await this.readAccount(expected, generation) }
        catch (readError) { this.accountPatch({ loaded: false, identities: [], contact: null }); this.accountFailure(readError); return }
      }
      this.accountFailure(e)
      if (!target && e.code === 'IDENTITY_ALREADY_OWNED') this.set({ issue: { code: e.code, message: '이 이메일 로그인은 이미 다른 계정에 연결되어 있습니다. 계정은 자동으로 합쳐지지 않습니다.' } })
      if (uncertain) this.set({ notice: '요청 결과가 불확실해 현재 서버 상태만 다시 조회했습니다. 성공을 단정하거나 자동 재실행하지 않습니다.' })
    } finally { await this.finish() }
  }
  async prepareGoogleLink() {
    if (this.running || this.state.status !== 'authenticated' || !this.state.userId || !this.state.account.loaded) return
    const expected = this.state.userId, generation = this.generation
    this.running = true; this.set({ pending: 'link', issue: null, notice: '' }); this.accountPatch({ unlink: null, form: null, linkForm: null, challenge: null })
    try {
      await this.readAccount(expected, generation)
      if (this.state.account.contact?.status !== 'VERIFIED') throw new AuthError('REAUTH_EMAIL_REQUIRED', 409)
      const linkForm = await this.api.googleLinkForm()
      await this.owner(expected, generation)
      this.accountPatch({ linkForm })
    } catch (error) { this.accountFailure(error) }
    finally { await this.finish() }
  }
  beginLinkNavigation() {
    if (this.running || this.state.status !== 'authenticated' || !this.state.account.linkForm) return false
    this.running = true; this.set({ pending: 'link-navigation', issue: null, notice: '' }); return true
  }
}
