// Minimal HTTP/proxy preparation only: no browser scenarios, real email or external OAuth.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { preview } from 'vite'
import { readV22Ready, verifyV22Ownership, withV22Connection } from './v22-environment.mjs'
import { pwaWriteProxy } from './v22-pwa-proxy.mjs'

const runId = process.argv[2], evidence = await readV22Ready(runId)
const directory = resolve('logs/verification-v22', runId)
await mkdir(resolve('logs/verification-v22'), { recursive: true }); await mkdir(directory)
const proxy = pwaWriteProxy(evidence)
let server, stopped = false, passed = false
const checks = []
try {
  await verifyV22Ownership(evidence)
  server = await preview({ configFile: false, envDir: false, plugins: [proxy.plugin], preview: { host: '127.0.0.1', port: 3000, strictPort: true }, clearScreen: false })
  const origin = 'http://127.0.0.1:3000'
  async function get(path, status, options = {}) {
    const response = await fetch(origin + path, { redirect: 'error', signal: AbortSignal.timeout(10000), ...options })
    assert.equal(response.status, status, path)
    checks.push({ method: options.method ?? 'GET', path, status })
    return response
  }
  await withV22Connection(evidence, 'backend', async send => {
    const direct = await send('/api/v1/health')
    assert.equal(direct.statusCode, 200)
    for await (const chunk of direct) assert.ok(chunk.length)
  })
  const health = await get('/api/v1/health', 200); await health.text()
  const csrfResponse = await get('/api/v1/auth/csrf', 200)
  const csrf = await csrfResponse.json()
  assert.equal(typeof csrf.headerName, 'string'); assert.ok(typeof csrf.token === 'string' && csrf.token.length > 0)
  const setCookie = csrfResponse.headers.getSetCookie().find(value => value.startsWith('SESSION='))
  assert.ok(setCookie && /HttpOnly/i.test(setCookie) && /SameSite=Lax/i.test(setCookie))
  const cookie = setCookie.split(';')[0]
  const anonymous = await get('/api/v1/auth/session', 401, { headers: { Cookie: cookie } })
  assert.equal((await anonymous.json()).code, 'AUTHENTICATION_REQUIRED')
  const deniedWrite = await get('/api/v1/weekly-schedule', 401, { method: 'PUT', headers: { Cookie: cookie, [csrf.headerName]: csrf.token, 'Content-Type': 'application/json' }, body: '{}' })
  assert.equal((await deniedWrite.json()).code, 'AUTHENTICATION_REQUIRED')
  const index = await get('/', 200); assert.ok((await index.text()).includes('/assets/'))
  const manifest = await get('/manifest.webmanifest', 200); assert.equal((await manifest.json()).scope, '/')
  const worker = await get('/sw.js', 200); const workerText = await worker.text()
  assert.ok(workerText.includes('overload-static-shell-v1-') && !workerText.includes('__SHELL_CONFIG__'))
  proxy.assertConnected()
  await verifyV22Ownership(evidence)
  passed = true
} finally {
  if (server) {
    await new Promise((resolve, reject) => { server.httpServer.close(error => error ? reject(error) : resolve()); server.httpServer.closeAllConnections() })
    stopped = true
  }
  // No credentials, cookies, OTP, response bodies or keys are written to evidence.
  await writeFile(resolve(directory, 'smoke.json'), JSON.stringify({ runId, backendOrigin: evidence.backendOrigin, frontendOrigin: 'http://127.0.0.1:3000', pid: process.pid, checks, passed, previewStopped: stopped }), { flag: 'wx' })
}
console.log(JSON.stringify({ runId, passed, previewStopped: stopped, requests: checks.length }))
