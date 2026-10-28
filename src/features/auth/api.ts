export type ServerSession = { userId: string }
export type Identity = { id: string; provider: 'email' | 'google' }
export type Contact = { status: 'VERIFIED'; maskedEmail: string } | { status: 'REQUIRED'; candidate?: { id: string; maskedEmail: string } }
export type ContactForm = { identityId: string; csrf: string }
type Csrf = { headerName: string; token: string }
export class AuthError extends Error {
  readonly status: number
  readonly code: string
  readonly retryAfter: number
  constructor(code: string, status = 0, retryAfter = 0) {
    super('인증 요청을 완료하지 못했습니다.')
    this.name = 'AuthError'; this.code = code; this.status = status; this.retryAfter = retryAfter
  }
}
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)

export class AuthApi {
  private csrf: Csrf | null = null
  private readonly fetcher: typeof fetch
  private readonly timeoutMs: number
  constructor(fetcher: typeof fetch = (input, init) => fetch(input, init), timeoutMs = 10_000) { this.fetcher = fetcher; this.timeoutMs = timeoutMs }
  clearCsrf() { this.csrf = null }
  private async call(path: string, method = 'GET', body?: unknown, csrf?: Csrf) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetcher(path, { method, credentials: 'include', cache: 'no-store', redirect: 'error', signal: controller.signal,
        headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(csrf ? { [csrf.headerName]: csrf.token } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
      if (response.status === 401) this.clearCsrf()
      let data: unknown = null
      if (response.status !== 204) {
        try { data = await response.json() } catch { throw new AuthError(controller.signal.aborted ? 'TIMEOUT' : 'RESPONSE_INVALID', response.status) }
      }
      if (!response.ok) {
        const code = object(data) && typeof data.code === 'string' && /^[A-Z_]{1,80}$/.test(data.code) ? data.code : 'REQUEST_FAILED'
        const header = response.headers.get('Retry-After') ?? ''
        const retryAfter = /^\d+$/.test(header) ? Math.min(86400, Number(header)) : 0
        if (code === 'CSRF_INVALID' || response.status === 401) this.clearCsrf()
        throw new AuthError(code, response.status, retryAfter)
      }
      return { status: response.status, data }
    } catch (error) {
      if (error instanceof AuthError) throw error
      throw new AuthError(controller.signal.aborted ? 'TIMEOUT' : 'NETWORK')
    } finally { clearTimeout(timeout) }
  }
  async refreshCsrf() {
    this.clearCsrf()
    const { status, data } = await this.call('/api/v1/auth/csrf')
    if (status !== 200 || !object(data) || typeof data.token !== 'string' || !data.token || data.token.length > 4096
      || typeof data.headerName !== 'string' || !/^X-[A-Za-z0-9-]{1,60}$/.test(data.headerName)) throw new AuthError('RESPONSE_INVALID')
    this.csrf = { token: data.token, headerName: data.headerName }
  }
  private async post(path: string, body: unknown) {
    if (!this.csrf) await this.refreshCsrf()
    const csrf = this.csrf
    if (!csrf) throw new AuthError('RESPONSE_INVALID')
    return this.call(path, 'POST', body, csrf)
  }
  async session(): Promise<ServerSession | null> {
    try {
      const { status, data } = await this.call('/api/v1/auth/session')
      if (status !== 200 || !object(data) || !uuid(data.userId)) throw new AuthError('RESPONSE_INVALID')
      return { userId: data.userId }
    } catch (error) {
      if (error instanceof AuthError && error.status === 401) return null
      throw error
    }
  }
  async requestOtp(email: string) {
    const { status, data } = await this.post('/api/v1/auth/email-otp/request', { email })
    if (status !== 202 || !object(data) || data.status !== 'ACCEPTED' || !uuid(data.challengeId)) throw new AuthError('RESPONSE_INVALID')
    return data.challengeId
  }
  async verifyOtp(email: string, challengeId: string, code: string) {
    const { status } = await this.post('/api/v1/auth/email-otp/verify', { email, challengeId, code })
    if (status !== 204) throw new AuthError('RESPONSE_INVALID')
    this.clearCsrf()
  }
  async logout() {
    const { status } = await this.post('/api/v1/auth/logout', {})
    if (status !== 204) throw new AuthError('RESPONSE_INVALID')
    this.clearCsrf()
  }
  async identities(): Promise<Identity[]> {
    const { status, data } = await this.call('/api/v1/auth/identities')
    if (status !== 200 || !object(data) || !Array.isArray(data.identities) || data.identities.length > 20) throw new AuthError('RESPONSE_INVALID')
    const identities = data.identities.map(value => {
      if (!object(value) || !uuid(value.id) || (value.provider !== 'email' && value.provider !== 'google')) throw new AuthError('RESPONSE_INVALID')
      return { id: value.id, provider: value.provider } as Identity
    })
    if (new Set(identities.map(value => value.id)).size !== identities.length) throw new AuthError('RESPONSE_INVALID')
    return identities
  }
  async contact(): Promise<Contact> {
    const { status, data } = await this.call('/api/v1/auth/reauth/email/contact')
    // The current server returns first-character + ***@*** only. Never accept a raw address as a display label.
    const masked = (v: unknown): v is string => typeof v === 'string' && /^[^\s@<>]\*{3}@\*{3}$/.test(v)
    if (status !== 200 || !object(data)) throw new AuthError('RESPONSE_INVALID')
    if (data.status === 'VERIFIED' && masked(data.maskedEmail)) return { status: 'VERIFIED', maskedEmail: data.maskedEmail }
    if (data.status === 'REQUIRED') {
      if (data.candidate === undefined) return { status: 'REQUIRED' }
      if (object(data.candidate) && uuid(data.candidate.id) && masked(data.candidate.maskedEmail)) return { status: 'REQUIRED', candidate: { id: data.candidate.id, maskedEmail: data.candidate.maskedEmail } }
    }
    throw new AuthError('RESPONSE_INVALID')
  }
  async requestEmailProof(candidateId?: string) {
    if (candidateId !== undefined && !uuid(candidateId)) throw new AuthError('INVALID_REQUEST', 400)
    const { status, data } = await this.post(candidateId ? '/api/v1/auth/reauth/email/registration/request' : '/api/v1/auth/reauth/email/request', candidateId ? { candidateId } : {})
    if (status !== 202 || !object(data) || data.status !== 'ACCEPTED' || !uuid(data.challengeId)) throw new AuthError('RESPONSE_INVALID')
    return data.challengeId
  }
  async verifyEmailProof(challengeId: string, code: string, candidateId?: string) {
    if (!uuid(challengeId) || !/^\d{6}$/.test(code) || (candidateId !== undefined && !uuid(candidateId))) throw new AuthError('INVALID_REQUEST', 400)
    const { status } = await this.post(candidateId ? '/api/v1/auth/reauth/email/registration/verify' : '/api/v1/auth/reauth/email/verify',
      { challengeId, code, ...(candidateId ? { candidateId } : {}) })
    if (status !== 204) throw new AuthError('RESPONSE_INVALID')
    this.clearCsrf()
  }
  async cancelRegistration() {
    const { status } = await this.post('/api/v1/auth/reauth/email/registration/cancel', {})
    if (status !== 204) throw new AuthError('RESPONSE_INVALID')
  }
  async contactForm(identityId: string): Promise<ContactForm> {
    if (!uuid(identityId)) throw new AuthError('INVALID_REQUEST', 400)
    await this.refreshCsrf()
    if (!this.csrf) throw new AuthError('RESPONSE_INVALID')
    return { identityId, csrf: this.csrf.token }
  }
}
