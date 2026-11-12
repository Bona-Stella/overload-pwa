import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer, request } from 'node:http'
import { allowedAddress, reviewAccountRequest, reviewAccess } from '../scripts/home-review-access.mjs'

test('review access accepts only loopback and the explicitly selected private subnet', () => {
  const lan = { address: '192.168.0.3', netmask: '255.255.255.0' }
  for (const address of ['127.0.0.1','::1','::ffff:192.168.0.20']) assert.equal(allowedAddress(address, lan), true)
  for (const address of ['192.168.1.1','8.8.8.8','10.0.0.1','2001:db8::1']) assert.equal(allowedAddress(address, lan), false)
  assert.equal(allowedAddress('192.168.0.3', null), false)
})
test('review login restricts both request and verification to the prepared account', () => {
  for (const path of ['/api/v1/auth/email-otp/request','/api/v1/auth/email-otp/verify']) {
    assert.equal(reviewAccountRequest(path, 'POST', Buffer.from('{"email":"review@example.test"}'), 'review@example.test'), true)
    assert.equal(reviewAccountRequest(path, 'POST', Buffer.from('{"email":"other@example.test"}'), 'review@example.test'), false)
    assert.equal(reviewAccountRequest(path, 'POST', Buffer.from('not JSON'), 'review@example.test'), false)
  }
})
test('delivery rejects cross-origin, unknown challenges and other account requests before any backend call', async t => {
  let origin
  const evidence = { reviewEmail: 'review@example.test' }
  const server = createServer((req,res) => { void reviewAccess(evidence, [origin], null)(req,res,()=>res.writeHead(404).end()).catch(()=>res.writeHead(500).end()) })
  await new Promise(r=>server.listen(0,'127.0.0.1',r)); t.after(()=>{server.close();server.closeAllConnections()})
  origin = 'http://127.0.0.1:' + server.address().port
  const config = await fetch(origin+'/__review/config'); assert.equal(config.status,200); assert.deepEqual(await config.json(),{email:evidence.reviewEmail,retryAfter:0,lastLoginResponse:null}); assert.equal(config.headers.get('set-cookie'),null)
  const post = (path, source, body) => fetch(origin+path,{method:'POST',headers:{'Origin':source,'Content-Type':'application/json'},body:JSON.stringify(body)})
  assert.equal((await post('/__review/otp','http://foreign.invalid',{challengeId:'x'})).status,403)
  assert.equal((await post('/__review/otp',origin,{challengeId:'x'})).status,403)
  assert.equal((await post('/api/v1/auth/email-otp/request',origin,{email:'other@example.test'})).status,403)
  const denied = await new Promise((resolve,reject)=>{const req=request(origin+'/__review/config',{headers:{Host:'foreign.invalid'}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject);req.end()}); assert.equal(denied,403)
})

test('review clients share the Backend Retry-After without repeating OTP requests or blocking verification', async t => {
  const evidence = { reviewEmail: 'review@example.test', runId: 'unit-run', instanceId: 'unit-instance', backendPid: 123 }
  let requests = 0, verifications = 0
  const upstream = createServer(async (req, res) => {
    for await (const _chunk of req) { /* Drain the request. */ }
    if (req.url === '/__v22_identity') {
      res.writeHead(204, { 'X-V22-Run': evidence.runId, 'X-V22-Instance': evidence.instanceId, 'X-V22-Pid': '123', 'X-V22-Backend': evidence.backendOrigin }).end(); return
    }
    if (req.url.endsWith('/request')) {
      requests++; res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '120' }).end('{"code":"OTP_RATE_LIMITED"}'); return
    }
    verifications++; res.writeHead(401, { 'Content-Type': 'application/json' }).end('{"code":"OTP_INVALID"}')
  })
  await new Promise(done => upstream.listen(0, '127.0.0.1', done))
  evidence.backendOrigin = evidence.browserControlOrigin = 'http://127.0.0.1:' + upstream.address().port
  let origin
  const origins = [origin]
  // Use a single handler instance so different browser sessions share the request wait.
  const handler = reviewAccess(evidence, origins, null)
  const server = createServer((req, res) => { void handler(req, res, () => res.writeHead(404).end()).catch(() => res.writeHead(500).end()) })
  await new Promise(done => server.listen(0, '127.0.0.1', done))
  origins[0] = origin = 'http://127.0.0.1:' + server.address().port
  t.after(() => { server.close(); server.closeAllConnections(); upstream.close(); upstream.closeAllConnections() })
  const post = (path, cookie) => fetch(origin + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'User-Agent': 'iPhone Safari', Cookie: cookie }, body: JSON.stringify({ email: evidence.reviewEmail }) })
  const first = await post('/api/v1/auth/email-otp/request', 'SESSION=first')
  assert.equal(first.status, 429); assert.equal(first.headers.get('retry-after'), '120')
  const second = await post('/api/v1/auth/email-otp/request', 'SESSION=second')
  assert.equal(second.status, 429); assert.equal(requests, 1)
  assert.ok(Number(second.headers.get('retry-after')) <= 120)
  const config = await fetch(origin + '/__review/config').then(r => r.json())
  assert.ok(config.retryAfter > 0)
  assert.deepEqual(Object.keys(config.lastLoginResponse).sort(), ['at', 'client', 'code', 'retryAfter', 'stage', 'status'])
  assert.equal(config.lastLoginResponse.client, 'iOS')
  assert.equal(config.lastLoginResponse.stage, 'request')
  assert.equal(config.lastLoginResponse.code, 'OTP_RATE_LIMITED')
  assert.equal((await post('/api/v1/auth/email-otp/verify', 'SESSION=second')).status, 401)
  assert.equal(verifications, 1)
})
