// Loopback-only browser fixture. No Google/Resend/DB connections and no production imports.
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export function createAuthServer(frontend = 'http://localhost:3057') {
  const sessions = new Map(), challenges = new Map(), pendingGoogle = new Map(), pendingContact = new Map(), accounts = new Map(), events = []
  let mode = 'normal', sendCount = 0
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const path = url.pathname
    const send = (status, data, extra = {}) => { events.push({ method: req.method, path, status }); res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra }); res.end(data === undefined ? '' : JSON.stringify(data)) }
    let body = {}
    if (req.method === 'POST') { let raw = ''; for await (const part of req) raw += part; try { body = req.headers['content-type']?.startsWith('application/x-www-form-urlencoded') ? Object.fromEntries(new URLSearchParams(raw)) : JSON.parse(raw || '{}') } catch { return send(400, { code: 'INVALID_REQUEST' }) } }
    if (path === '/__test__/scenario' && req.method === 'POST') { mode = body.mode ?? 'normal'; return send(200, { configured: true }) }
    if (path === '/__test__/stats') return send(200, { mode, sendCount, events: [...events] })
    const sid = /(?:^|;\s*)SESSION=([^;]+)/.exec(req.headers.cookie ?? '')?.[1]
    let session = sessions.get(sid)
    const account = () => {
      if(!accounts.has(session.userId))accounts.set(session.userId, {identities: session.userId.startsWith('3') ? [{id:'31000000-1111-4222-8333-000000000003',provider:'google'}] : [{id:'11000000-1111-4222-8333-000000000001',provider:'email'}],contact:session.userId.startsWith('3')?{status:'REQUIRED'}:{status:'VERIFIED',maskedEmail:'a***@***'}})
      const value=accounts.get(session.userId)
      if(mode==='mixed')value.identities=[{id:'11000000-1111-4222-8333-000000000001',provider:'email'},{id:'31000000-1111-4222-8333-000000000003',provider:'google'}]
      if(mode==='empty-identities')value.identities=[]
      return value
    }
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
    if(['/api/v1/auth/identities','/api/v1/auth/reauth/email/contact'].includes(path)&&req.method==='GET'){
      if(!session?.userId)return send(401,{code:'AUTHENTICATION_REQUIRED'})
      if(mode==='account-down')return send(503,{code:'OTP_UNAVAILABLE'})
      return send(200,path.endsWith('/identities')?{identities:account().identities}:account().contact)
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
    if(path==='/login/oauth2/code/google-contact'&&req.method==='GET'){
      const flow=url.searchParams.get('fixture'),expected=pendingContact.get(flow);pendingContact.delete(flow)
      const matched=Boolean(expected&&expected===sid&&session?.userId&&mode!=='contact-failed')
      events.push({contactCallbackCookieMatched:matched})
      if(matched)account().contact={status:'REQUIRED',candidate:{id:randomUUID(),maskedEmail:'g***@***'}}
      return send(302,undefined,{Location:frontend+(matched?'/account/contact/complete':'/account/contact/failed')})
    }
    if (req.method !== 'POST') return send(404, { code: 'NOT_FOUND' })
    if (!session || (req.headers['x-csrf-token']??body._csrf) !== session.csrf || mode === 'csrf-invalid') return send(403, { code: 'CSRF_INVALID' })
    if(path==='/oauth2/contact/google'){
      if(!session.userId)return send(401,{code:'AUTHENTICATION_REQUIRED'})
      if(Object.keys(body).some(k=>!['identityId','_csrf'].includes(k))||!account().identities.some(v=>v.id===body.identityId&&v.provider==='google'))return send(400,{code:'INVALID_REQUEST'})
      const flow=randomUUID();pendingContact.set(flow,sid)
      return send(302,undefined,{Location:`http://localhost:${server.address().port}/login/oauth2/code/google-contact?fixture=${flow}`})
    }
    const reauth='/api/v1/auth/reauth/email/'
    if(path.startsWith(reauth)){
      if(!session.userId)return send(401,{code:'AUTHENTICATION_REQUIRED'})
      if(path===reauth+'registration/cancel'){if(account().contact.status!=='VERIFIED')account().contact={status:'REQUIRED'};return send(204)}
      const enrollment=path.includes('/registration/'),candidate=account().contact.candidate
      if(path.endsWith('/request')){
        if(mode==='request-down')return send(503,{code:'OTP_UNAVAILABLE'})
        if(mode==='rate-limited')return send(429,{code:'OTP_RATE_LIMITED'},{'Retry-After':'120'})
        if(Object.keys(body).some(k=>k!=='candidateId'))return send(400,{code:'INVALID_REQUEST'})
        if(enrollment?(!candidate||candidate.id!==body.candidateId):account().contact.status!=='VERIFIED')return send(409,{code:'REAUTH_EMAIL_REQUIRED'})
        const id=randomUUID();challenges.set(id,{sid,userId:session.userId,enrollment,candidateId:body.candidateId});sendCount++
        return send(202,{status:'ACCEPTED',challengeId:id})
      }
      if(path.endsWith('/verify')){
        if(mode==='verify-down')return send(503,{code:'OTP_UNAVAILABLE'})
        if(mode==='verify-limited')return send(429,{code:'OTP_RATE_LIMITED'},{'Retry-After':'120'})
        const challenge=challenges.get(body.challengeId)
        if(!challenge||challenge.sid!==sid||challenge.userId!==session.userId||challenge.enrollment!==enrollment||challenge.candidateId!==body.candidateId||body.code!=='246810'||mode==='otp-invalid')return send(401,{code:'OTP_INVALID'})
        challenges.delete(body.challengeId);account().contact={status:'VERIFIED',maskedEmail:enrollment?'g***@***':account().contact.maskedEmail}
        return send(204,undefined,establish(session.userId))
      }
    }
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
