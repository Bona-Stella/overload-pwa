// Loopback-only browser fixture. No Google/Resend/DB connections and no production imports.
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export function createAuthServer(frontend = 'http://localhost:3057') {
  const sessions = new Map(), challenges = new Map(), pendingGoogle = new Map(), events = []
  let mode = 'normal', sendCount = 0
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const path = url.pathname
    const send = (status, data, extra = {}) => { events.push({ method: req.method, path, status }); res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra }); res.end(data === undefined ? '' : JSON.stringify(data)) }
    let body = {}
    if (req.method === 'POST') { let raw = ''; for await (const part of req) raw += part; try { body = JSON.parse(raw || '{}') } catch { return send(400, { code: 'INVALID_REQUEST' }) } }
    if (path === '/__test__/scenario' && req.method === 'POST') { mode = body.mode ?? 'normal'; return send(200, { configured: true }) }
    if (path === '/__test__/stats') return send(200, { mode, sendCount, events: [...events] })
    const sid = /(?:^|;\s*)SESSION=([^;]+)/.exec(req.headers.cookie ?? '')?.[1]
    let session = sessions.get(sid)
    const cookie = id => ({ 'Set-Cookie': `SESSION=${id}; Path=/; HttpOnly; SameSite=Lax` })
    const establish = userId => { if (sid) sessions.delete(sid); const id = randomUUID(); sessions.set(id, { csrf: randomUUID(), userId }); return cookie(id) }
    if (path === '/api/v1/auth/session' && req.method === 'GET') {
      if (mode === 'session-down') return send(503, { code: 'TEST_UNAVAILABLE' })
      return session?.userId ? send(200, { userId: session.userId }) : send(401, { code: 'AUTHENTICATION_REQUIRED' })
    }
    if (path === '/api/v1/auth/csrf' && req.method === 'GET') {
      let headers = {}
      if (!session) { const id = randomUUID(); session = { csrf: randomUUID(), userId: null }; sessions.set(id, session); headers = cookie(id) }
      return send(200, { headerName: 'X-CSRF-TOKEN', token: session.csrf }, headers)
    }
    if (path === '/oauth2/authorization/google') {
      if (mode === 'google-failed') return send(302, undefined, { Location: frontend + '/auth/failed' })
      const flow = randomUUID(); pendingGoogle.set(flow, sid)
      return send(302, undefined, { Location: `http://localhost:${server.address().port}/login/oauth2/code/google?fixture=${flow}` })
    }
    if (path === '/login/oauth2/code/google') {
      const flow = url.searchParams.get('fixture'), expected = pendingGoogle.get(flow)
      pendingGoogle.delete(flow)
      const matched = Boolean(expected && expected === sid && session)
      events.push({ callbackCookieMatched: matched })
      return matched ? send(302, undefined, { ...establish('30000000-1111-4222-8333-000000000003'), Location: frontend + '/auth/complete' })
        : send(302, undefined, { Location: frontend + '/auth/failed' })
    }
    if (req.method !== 'POST') return send(404, { code: 'NOT_FOUND' })
    if (!session || req.headers['x-csrf-token'] !== session.csrf || mode === 'csrf-invalid') return send(403, { code: 'CSRF_INVALID' })
    if (path === '/api/v1/auth/logout') { sessions.delete(sid); return send(204, undefined, { 'Set-Cookie': 'SESSION=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax' }) }
    if (path === '/api/v1/auth/email-otp/request') {
      if (mode === 'request-down') return send(503, { code: 'OTP_UNAVAILABLE' })
      if (mode === 'rate-limited') return send(429, { code: 'OTP_RATE_LIMITED' }, { 'Retry-After': '120' })
      const id = randomUUID(); challenges.set(id, { sid, email: body.email }); sendCount++
      return send(202, { status: 'ACCEPTED', challengeId: id })
    }
    if (path === '/api/v1/auth/email-otp/verify') {
      const challenge = challenges.get(body.challengeId)
      if (!challenge || challenge.sid !== sid || challenge.email !== body.email || body.code !== '246810' || mode === 'otp-invalid') return send(401, { code: 'OTP_INVALID' })
      challenges.delete(body.challengeId)
      return send(204, undefined, establish('10000000-1111-4222-8333-000000000001'))
    }
    return send(404, { code: 'NOT_FOUND' })
  })
  return server
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createAuthServer(process.env.OVERLOAD_TEST_FRONTEND)
  server.listen(Number(process.env.OVERLOAD_TEST_PORT ?? 0), '127.0.0.1', () => console.log(JSON.stringify({ port: server.address().port, pid: process.pid })))
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)))
}
