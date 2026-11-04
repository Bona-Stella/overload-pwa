import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer, request } from 'node:http'
import { createHash } from 'node:crypto'
import { pwaWriteProxy } from './fixtures/v22-pwa-proxy.mjs'
test('fault proxy distinguishes pre-send failure from a fully received upstream ACK and preserves exact bytes', async () => {
  let commits = 0
  const evidence = { runId: crypto.randomUUID(), instanceId: crypto.randomUUID(), backendPid: process.pid }
  let instance = evidence.instanceId
  const proof = res => res.writeHead(204, { 'X-V22-Run': evidence.runId, 'X-V22-Instance': instance,
    'X-V22-Pid': String(evidence.backendPid), 'X-V22-Backend': evidence.backendOrigin }).end()
  const control = createServer((_req, res) => proof(res))
  await new Promise(r => control.listen(0, '127.0.0.1', r))
  evidence.browserControlOrigin = `http://127.0.0.1:${control.address().port}`
  const upstream = createServer(async (req, res) => { if (req.url === '/__v22_identity') { proof(res); return } const body = []; for await (const chunk of req) body.push(chunk); commits++; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ duplicate: commits > 1, acceptedLocalRevision: '9', version: '1' })) })
  await new Promise(r => upstream.listen(0, '127.0.0.1', r))
  evidence.backendOrigin = `http://127.0.0.1:${upstream.address().port}`
  const proxy = pwaWriteProxy(evidence)
  const host = createServer((req, res) => void proxy.middleware(req, res, () => { res.writeHead(404); res.end() }))
  await new Promise(r => host.listen(0, '127.0.0.1', r))
  const body = '{ "localRevision":"9", "snapshot":{} }'
  const send = () => new Promise((resolve, reject) => { const req = request({ hostname: '127.0.0.1', port: host.address().port, path: '/api/v1/workout-sessions/11111111-1111-4111-8111-111111111111/snapshot', method: 'PUT', agent: false }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)) }); req.on('error', reject); req.end(body) })
  try {
    proxy.fault.beforeSnapshot = true; await assert.rejects(send(), { code: 'ECONNRESET' }); assert.equal(commits, 0)
    assert.equal(proxy.records.at(-1).failure, 'BEFORE_UPSTREAM')
    proxy.fault.beforeSnapshot = false; proxy.fault.dropSnapshot = true; await assert.rejects(send(), { code: 'ECONNRESET' }); assert.equal(commits, 1)
    assert.equal(proxy.records.at(-1).failure, 'AFTER_BACKEND_200'); assert.equal(proxy.records.at(-1).ack.duplicate, false)
    proxy.fault.dropSnapshot = false; assert.equal(await send(), 200); assert.equal(proxy.records.at(-1).ack.duplicate, true)
    assert(proxy.records.every(r => r.requestSha256 === createHash('sha256').update(body).digest('hex')))
    instance = crypto.randomUUID()
    await assert.rejects(send(), { code: 'ECONNRESET' }); assert.equal(commits, 2)
    assert.throws(() => proxy.assertConnected(), /verification/)
    assert.equal(upstream.listening && control.listening, true)
  } finally { await new Promise(r => host.close(r)); await new Promise(r => upstream.close(r)); await new Promise(r => control.close(r)) }
})
test('fault proxy refuses non-loopback and credentialed targets', () => {
  for (const origin of ['https://example.invalid', 'http://localhost:8080', 'http://user@127.0.0.1:8080', 'http://127.0.0.1:8080/other']) assert.throws(() => pwaWriteProxy({ backendOrigin: origin }))
})
