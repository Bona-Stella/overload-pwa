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
  const config = await fetch(origin+'/__review/config'); assert.equal(config.status,200); assert.deepEqual(await config.json(),{email:evidence.reviewEmail}); assert.equal(config.headers.get('set-cookie'),null)
  const post = (path, source, body) => fetch(origin+path,{method:'POST',headers:{'Origin':source,'Content-Type':'application/json'},body:JSON.stringify(body)})
  assert.equal((await post('/__review/otp','http://foreign.invalid',{challengeId:'x'})).status,403)
  assert.equal((await post('/__review/otp',origin,{challengeId:'x'})).status,403)
  assert.equal((await post('/api/v1/auth/email-otp/request',origin,{email:'other@example.test'})).status,403)
  const denied = await new Promise((resolve,reject)=>{const req=request(origin+'/__review/config',{headers:{Host:'foreign.invalid'}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject);req.end()}); assert.equal(denied,403)
})
