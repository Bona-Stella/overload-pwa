export type ServerSession = { userId: string }
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
}
