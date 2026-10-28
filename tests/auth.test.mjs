import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AuthApi, AuthError } from '../src/features/auth/api.ts'
import { AuthController, returnFlow } from '../src/features/auth/controller.ts'

const USER = '10000000-1111-4222-8333-000000000001'
const CHALLENGE = '20000000-1111-4222-8333-000000000002'
const EMAIL = 'athlete@example.test'
const csrf = { headerName: 'X-CSRF-TOKEN', token: 'test-csrf-only' }
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } })
const gate = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
function fake() {
  const calls = []
  let session = null
  let now = 1_800_000_000_000
  const api = {
    session: async () => { calls.push('session'); return session },
    refreshCsrf: async () => { calls.push('csrf') },
    requestOtp: async email => { calls.push(['request', email]); return CHALLENGE },
    verifyOtp: async (...args) => { calls.push(['verify', ...args]); session = { userId: USER } },
    logout: async () => { calls.push('logout'); session = null },
  }
  const navigations = []
  const controller = new AuthController(api, () => now, path => navigations.push(path))
  return { api, calls, controller, navigations, setSession: value => { session = value }, advance: ms => { now += ms } }
}

test('session 401 is anonymous with credentialed uncached fetch, not a fabricated local login', async () => {
  let options
  const api = new AuthApi(async (path, init) => { assert.equal(path, '/api/v1/auth/session'); options = init; return json({ code: 'AUTHENTICATION_REQUIRED' }, 401) })
  assert.equal(await api.session(), null)
  assert.equal(options.credentials, 'include'); assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'error')
})
test('default browser fetch is called without binding AuthApi as its native receiver', async t => {
  t.mock.method(globalThis, 'fetch', function () { assert.ok(!(this instanceof AuthApi)); return Promise.resolve(json({ userId: USER })) })
  assert.equal((await new AuthApi().session()).userId, USER)
})
test('session validates UUID and distinguishes network/server/protocol errors from anonymous', async () => {
  for (const response of [json({ userId: 'untrusted' }), json({ code: 'UNAVAILABLE' }, 503), new Response('broken')]) {
    await assert.rejects(new AuthApi(async () => response).session(), AuthError)
  }
  await assert.rejects(new AuthApi(async () => { throw Error('private transport detail') }).session(), e => e.code === 'NETWORK' && !e.message.includes('private'))
  assert.deepEqual(await new AuthApi(async () => json({ userId: USER })).session(), { userId: USER })
})
test('OTP calls use the server header name and clear old CSRF on 204 session rotation', async () => {
  let generation = 0
  const requests = []
  const api = new AuthApi(async (path, init) => {
    requests.push([path, init])
    if (path.endsWith('/csrf')) return json({ headerName: 'X-TEST-CSRF', token: `csrf-${++generation}` })
    assert.equal(init.headers['X-TEST-CSRF'], `csrf-${generation}`)
    if (path.endsWith('/request')) return json({ status: 'ACCEPTED', challengeId: CHALLENGE }, 202)
    return new Response(null, { status: 204 })
  })
  assert.equal(await api.requestOtp(EMAIL), CHALLENGE)
  await api.verifyOtp(EMAIL, CHALLENGE, '123456')
  await api.logout()
  assert.equal(generation, 2)
  assert.deepEqual(JSON.parse(requests.find(([p]) => p.endsWith('/verify'))[1].body), { email: EMAIL, challengeId: CHALLENGE, code: '123456' })
})
test('403 CSRF_INVALID never retries a write and the next explicit call fetches a new token', async () => {
  const paths = []
  const api = new AuthApi(async path => { paths.push(path); return path.endsWith('/csrf') ? json(csrf) : json({ code: 'CSRF_INVALID' }, 403) })
  await assert.rejects(api.requestOtp(EMAIL), e => e.code === 'CSRF_INVALID')
  assert.equal(paths.filter(p => p.endsWith('/request')).length, 1)
  await assert.rejects(api.requestOtp(EMAIL), AuthError)
  assert.equal(paths.filter(p => p.endsWith('/csrf')).length, 2)
})
test('429 carries Retry-After and OTP_INVALID is not mistaken for a session endpoint 401', async () => {
  const api = new AuthApi(async path => path.endsWith('/csrf') ? json(csrf) : json({ code: 'OTP_RATE_LIMITED' }, 429, { 'Retry-After': '120' }))
  await assert.rejects(api.requestOtp(EMAIL), e => e.retryAfter === 120 && e.status === 429)
  const invalid = new AuthApi(async path => path.endsWith('/csrf') ? json(csrf) : json({ code: 'OTP_INVALID' }, 401))
  await assert.rejects(invalid.verifyOtp(EMAIL, CHALLENGE, '654321'), e => e.code === 'OTP_INVALID')
})
test('unexpected status/schema/header name are rejected instead of claiming delivery', async () => {
  const invalidHeader = new AuthApi(async () => json({ headerName: 'Cookie', token: 'fake' }))
  await assert.rejects(invalidHeader.requestOtp(EMAIL), e => e.code === 'RESPONSE_INVALID')
  for (const reply of [{ status: 'PENDING', challengeId: CHALLENGE }, { status: 'ACCEPTED', challengeId: 'not-a-uuid' }]) {
    const api = new AuthApi(async path => path.endsWith('/csrf') ? json(csrf) : json(reply, 202))
    await assert.rejects(api.requestOtp(EMAIL), e => e.code === 'RESPONSE_INVALID')
  }
})
const aborted = signal => new Promise((_, reject) => signal.addEventListener('abort', () => reject(Error('aborted')), { once: true }))
test('timeouts include stalled headers and bodies, with no retry', async () => {
  for (const mode of ['headers', 'body']) {
    let count = 0
    const api = new AuthApi(async (_, { signal }) => { count++; return mode === 'headers' ? aborted(signal) : { status: 200, ok: true, json: () => aborted(signal) } }, 10)
    await assert.rejects(api.session(), e => e.code === 'TIMEOUT')
    assert.equal(count, 1)
  }
})
test('initial restoration is deduplicated under StrictMode and refresh uses the server session', async () => {
  const f = fake(); await Promise.all([f.controller.start(), f.controller.start()])
  assert.equal(f.controller.getSnapshot().status, 'anonymous'); assert.deepEqual(f.calls, ['session', 'csrf'])
  const next = fake(); next.setSession({ userId: USER }); await next.controller.start()
  assert.equal(next.controller.getSnapshot().userId, USER)
})
test('network failure retains known identity and has an explicit recovery state', async () => {
  const f = fake(); f.setSession({ userId: USER }); await f.controller.start()
  const read = f.api.session; f.api.session = async () => { throw new AuthError('NETWORK') }
  await f.controller.restore(); assert.equal(f.controller.getSnapshot().status, 'unavailable'); assert.equal(f.controller.getSnapshot().userId, USER)
  f.api.session = read; await f.controller.restore(); assert.equal(f.controller.getSnapshot().status, 'authenticated')
})
test('rapid duplicate send clicks produce one request and no timer-based resend', async () => {
  const f = fake(); await f.controller.start(); const wait = gate(); let sends = 0
  f.api.requestOtp = async () => { sends++; await wait.promise; return CHALLENGE }
  const first = f.controller.requestOtp(EMAIL); await f.controller.requestOtp(EMAIL)
  assert.equal(sends, 1); wait.resolve(); await first
  assert.equal(f.controller.getSnapshot().challenge.id, CHALLENGE)
  f.advance(600_000); assert.equal(sends, 1)
})
test('ambiguous send failure blocks immediate retry, clears stale challenge and never auto sends', async () => {
  const f = fake(); await f.controller.start(); let sends = 0
  f.api.requestOtp = async () => { sends++; throw new AuthError('NETWORK') }
  await f.controller.requestOtp(EMAIL); await f.controller.requestOtp(EMAIL)
  assert.equal(sends, 1); assert.equal(f.controller.getSnapshot().challenge.id, null)
  f.controller.cancelOtp(); await f.controller.requestOtp('other@example.test'); assert.equal(sends, 1)
})
test('rate limits remain across cancel/address changes and honor the server retry window', async () => {
  const f = fake(); await f.controller.start(); let sends = 0
  f.api.requestOtp = async () => { sends++; throw new AuthError('OTP_RATE_LIMITED', 429, 120) }
  await f.controller.requestOtp(EMAIL); f.advance(60_001); f.controller.cancelOtp(); await f.controller.requestOtp(EMAIL); assert.equal(sends, 1)
  f.advance(60_000); await f.controller.requestOtp(EMAIL); assert.equal(sends, 2)
})
test('normalizes address, handles wrong OTP without logout, and blocks locally expired codes', async () => {
  const f = fake(); await f.controller.start(); await f.controller.requestOtp(' ATHLETE@EXAMPLE.TEST ')
  assert.equal(f.controller.getSnapshot().challenge.email, EMAIL)
  f.api.verifyOtp = async () => { throw new AuthError('OTP_INVALID', 401) }
  await f.controller.verifyOtp('000000'); assert.equal(f.controller.getSnapshot().status, 'anonymous'); assert.equal(f.controller.getSnapshot().issue.code, 'OTP_INVALID')
  f.advance(300_000); await f.controller.verifyOtp('000000'); assert.equal(f.controller.getSnapshot().issue.code, 'CODE_EXPIRED')
})
test('successful verification confirms session and refreshes CSRF, clearing OTP challenge', async () => {
  const f = fake(); await f.controller.start(); await f.controller.requestOtp(EMAIL); await f.controller.verifyOtp('123456')
  assert.equal(f.controller.getSnapshot().status, 'authenticated'); assert.equal(f.controller.getSnapshot().userId, USER); assert.equal(f.controller.getSnapshot().challenge, null)
  assert.deepEqual(f.calls.slice(-2), ['session', 'csrf'])
})
test('consumed OTP is not verified again when session restoration fails, retry is read-only', async () => {
  const f = fake(); await f.controller.start(); await f.controller.requestOtp(EMAIL)
  let verifies = 0; f.api.verifyOtp = async () => { verifies++ }; f.api.session = async () => { throw new AuthError('NETWORK') }
  await f.controller.verifyOtp('123456'); assert.equal(f.controller.getSnapshot().status, 'unavailable'); assert.equal(f.controller.getSnapshot().challenge, null)
  f.api.session = async () => ({ userId: USER }); await f.controller.restore()
  assert.equal(verifies, 1); assert.equal(f.controller.getSnapshot().status, 'authenticated')
})
test('verification 429 blocks both verification and resend until Retry-After', async () => {
  const f = fake(); await f.controller.start(); await f.controller.requestOtp(EMAIL); let verifies = 0
  f.api.verifyOtp = async () => { verifies++; throw new AuthError('OTP_RATE_LIMITED', 429, 120) }
  await f.controller.verifyOtp('123456'); await f.controller.verifyOtp('123456'); assert.equal(verifies, 1)
  f.advance(60_001); await f.controller.verifyOtp('123456'); assert.equal(verifies, 1)
  f.advance(60_000); await f.controller.verifyOtp('123456'); assert.equal(verifies, 2)
})
test('ambiguous verification results require read-only session recovery, never another OTP submission', async () => {
  for (const error of [new AuthError('NETWORK'), new AuthError('TIMEOUT'), new AuthError('OTP_UNAVAILABLE', 503)]) {
    const f = fake(); await f.controller.start(); await f.controller.requestOtp(EMAIL); let verifies = 0
    f.api.verifyOtp = async () => { verifies++; throw error }; await f.controller.verifyOtp('123456')
    assert.equal(f.controller.getSnapshot().status, 'unavailable'); assert.equal(f.controller.getSnapshot().challenge, null)
    await f.controller.verifyOtp('123456'); assert.equal(verifies, 1)
    f.setSession({ userId: USER }); await f.controller.restore(); assert.equal(f.controller.getSnapshot().userId, USER)
  }
})
test('successful logout requires server 401 and refreshes CSRF after clearing account state', async () => {
  const f = fake(); f.setSession({ userId: USER }); await f.controller.start(); await f.controller.logout()
  assert.equal(f.controller.getSnapshot().status, 'anonymous'); assert.equal(f.controller.getSnapshot().userId, null)
  assert.deepEqual(f.calls.slice(-3), ['logout', 'session', 'csrf']); assert.equal(f.controller.getSnapshot().notice, '로그아웃했습니다.')
})
test('unconfirmed or failed logout never pretends to be signed out', async () => {
  for (const mode of ['stillAuthenticated', 'network', 'csrf']) {
    const f = fake(); f.setSession({ userId: USER }); await f.controller.start()
    f.api.logout = async () => { if (mode !== 'stillAuthenticated') throw new AuthError(mode === 'csrf' ? 'CSRF_INVALID' : 'NETWORK', mode === 'csrf' ? 403 : 0) }
    await f.controller.logout(); assert.equal(f.controller.getSnapshot().status, 'unavailable'); assert.equal(f.controller.getSnapshot().userId, USER)
  }
})
test('Google uses fixed top-level navigation and no OAuth fetch', async () => {
  const f = fake(); await f.controller.start(); const before = f.calls.length
  f.controller.googleLogin(); f.controller.googleLogin(); assert.deepEqual(f.navigations, ['/oauth2/authorization/google']); assert.equal(f.calls.length, before)
  await f.controller.resume(); assert.equal(f.controller.getSnapshot().status, 'anonymous')
})
test('callback path cannot authenticate by itself and failures are explicit', async () => {
  assert.equal(returnFlow('/auth/complete'), 'complete'); assert.equal(returnFlow('/auth/failed'), 'failed'); assert.equal(returnFlow('/external'), 'none')
  const f = fake(); await f.controller.start('complete'); assert.equal(f.controller.getSnapshot().status, 'anonymous'); assert.equal(f.controller.getSnapshot().issue.code, 'GOOGLE_NOT_CONFIRMED')
  const failure = fake(); await failure.controller.start('failed'); assert.equal(failure.controller.getSnapshot().issue.code, 'GOOGLE_FAILED'); assert.equal(failure.controller.getSnapshot().status, 'anonymous')
  const success = fake(); success.setSession({ userId: USER }); await success.controller.start('complete'); assert.equal(success.controller.getSnapshot().userId, USER)
})
test('auth never reads or writes browser storage and subscriptions detach', async () => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('Auth must not touch demo/auth storage') } })
  try {
    const f = fake(); let updates = 0; const stop = f.controller.subscribe(() => updates++)
    await f.controller.start(); assert.ok(updates > 0); stop(); const count = updates
    await f.controller.requestOtp(EMAIL); await f.controller.verifyOtp('123456'); await f.controller.logout(); assert.equal(updates, count)
  } finally { if (prior) Object.defineProperty(globalThis, 'localStorage', prior); else delete globalThis.localStorage }
})
