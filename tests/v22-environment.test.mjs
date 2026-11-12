import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { validateV22Ready, verifyV22Ownership, withV22Connection } from './fixtures/v22-environment.mjs'
const run = '11111111-1111-4111-8111-111111111111', now = Date.parse('2026-11-04T00:00:00Z')
const ready = () => ({ runId: run, containerRunId: run, backendOrigin: 'http://127.0.0.1:49152', backendPid: 123, containerId: 'a'.repeat(64), database: 'overload_v22_isolated', databasePort: 49153,
  instanceId: '33333333-3333-4333-8333-333333333333', browserControlOrigin: 'http://127.0.0.1:49154',
  jdbcUrl: 'jdbc:postgresql://127.0.0.1:49153/overload_v22_isolated', startedAt: '2026-11-03T23:59:00Z', readyAt: '2026-11-03T23:59:30Z',
  initialUsers: 0, preparedUsers: 1, accountFlow: 'EMAIL_OTP', migrations: 35, migrationVersions: Array.from({ length: 35 }, (_, i) => String(i + 1)),
  freshDatabase: true, loopbackDatabase: true, tmpfsOnly: true, schemaValidated: true, noDeveloperEnv: true, springSessionTables: true, fakeEmailSender: true, externalAuthDisabled: true, httpSmokePassed: true })

test('ongoing approved catalog can reconnect without resetting its DB; default fixture age and identity checks remain strict', () => {
  const value = { ...ready(), startedAt: '2026-11-03T22:00:00Z', readyAt: '2026-11-03T22:00:30Z' }
  assert.throws(() => validateV22Ready(value, run, now))
  assert.throws(() => validateV22Ready(value, run, now, { existingApprovedCatalog: true }))
  value.approvedCatalogReview = { approvedExercises: 31, gifAccessGranted: true }
  assert.equal(validateV22Ready(value, run, now, { existingApprovedCatalog: true }), value)
  for (const patch of [{ containerRunId: 'other' }, { freshDatabase: false }, { migrations: 34 }, { databasePort: 5432 }, { readyAt: '2026-11-05T00:00:00Z' }]) {
    assert.throws(() => validateV22Ready({ ...value, ...patch }, run, now, { existingApprovedCatalog: true }))
  }
})
test('V22 harness accepts current, complete evidence bound to this explicit run', () => {
  const value = ready(); assert.equal(validateV22Ready(value, run, now), value)
})
test('V22 harness rejects old migration-only guards, stale runs and unverified isolation', () => {
  for (const patch of [{ migrations: 8 }, { migrations: 17 }, { migrations: 32 }, { migrationVersions: ['22'] }, { runId: '22222222-2222-4222-8222-222222222222' },
    { initialUsers: 1 }, { preparedUsers: 0 }, { accountFlow: 'DIRECT_SEED' }, { startedAt: '2026-11-03T20:00:00Z' }, { readyAt: '2026-11-04T01:00:00Z' },
    { database: 'overload_dev' }, { databasePort: 5433 }, { jdbcUrl: 'jdbc:postgresql://127.0.0.1:5433/overload_dev' }, { containerId: 'old' }, { containerRunId: 'old' }, { backendPid: 0 },
    { instanceId: undefined }, { browserControlOrigin: undefined }, { browserControlOrigin: 'https://example.invalid' },
    ...['freshDatabase', 'loopbackDatabase', 'tmpfsOnly', 'schemaValidated', 'noDeveloperEnv', 'springSessionTables', 'fakeEmailSender', 'externalAuthDisabled', 'httpSmokePassed'].map(key => ({ [key]: false })),
  ]) assert.throws(() => validateV22Ready({ ...ready(), ...patch }, run, now))
})

test('live ownership rejects PID and port reuse, other runs, and a missing control channel', async t => {
  const evidence = { ...ready(), backendPid: process.pid }
  const headers = () => ({ 'X-V22-Run': evidence.runId, 'X-V22-Instance': evidence.instanceId,
    'X-V22-Pid': String(process.pid), 'X-V22-Backend': evidence.backendOrigin })
  let backendHeaders = headers, controlHeaders = headers, requests = 0, closeAfterProof = false
  async function listen(handler, port = 0) {
    const server = createServer(handler)
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve) })
    t.after(() => { server.close(); server.closeAllConnections() })
    return server
  }
  const backend = await listen((req, res) => {
    if (req.url !== '/__v22_identity') { requests++; res.end(); return }
    res.writeHead(204, { ...backendHeaders(), ...(closeAfterProof ? { Connection: 'close' } : {}) }).end()
  })
  const control = await listen((_req, res) => res.writeHead(204, controlHeaders()).end())
  const port = backend.address().port
  evidence.backendOrigin = 'http://127.0.0.1:' + port
  evidence.browserControlOrigin = 'http://127.0.0.1:' + control.address().port
  await verifyV22Ownership(evidence)
  await withV22Connection(evidence, 'backend', async send => { (await send('/api/example')).resume() })
  assert.equal(requests, 1)
  controlHeaders = () => ({ ...headers(), 'X-V22-Run': crypto.randomUUID() })
  await assert.rejects(verifyV22Ownership(evidence), /identity mismatch/)
  controlHeaders = headers
  backendHeaders = () => ({ ...headers(), 'X-V22-Instance': crypto.randomUUID() })
  await assert.rejects(withV22Connection(evidence, 'backend', send => send('/api/example')), /identity mismatch/)
  backendHeaders = headers
  closeAfterProof = true
  await assert.rejects(withV22Connection(evidence, 'backend', send => send('/api/example')), /closed|socket hang up/)
  assert.equal(requests, 1)

  await new Promise(resolve => backend.close(resolve))
  await assert.rejects(verifyV22Ownership(evidence), /ECONNREFUSED/)
  const replacement = await listen((req, res) => {
    if (req.url !== '/__v22_identity') requests++
    res.end('unrelated')
  }, port)
  await assert.rejects(withV22Connection(evidence, 'backend', send => send('/api/example')), /identity mismatch/)
  assert.equal(requests, 1)
  assert.equal(replacement.listening, true)
  const root = await mkdtemp(join(tmpdir(), 'overload-v22-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const cwd = join(root, 'frontend')
  const directory = join(root, 'overload-server', 'build', 'verification-v22', run)
  await Promise.all([mkdir(cwd), mkdir(directory, { recursive: true })])
  await writeFile(join(directory, 'ready.json'), JSON.stringify({ ...evidence,
    startedAt: new Date().toISOString(), readyAt: new Date().toISOString() }))
  const smoke = fileURLToPath(new URL('./fixtures/v22-smoke.mjs', import.meta.url))
  await assert.rejects(promisify(execFile)(process.execPath, [smoke, run], { cwd, timeout: 10000 }),
    error => error.code === 1 && error.stderr.includes('V22 live service identity mismatch'))
  assert.equal(requests, 1)
  assert.equal(replacement.listening, true)
  await new Promise(resolve => control.close(resolve))
  await assert.rejects(verifyV22Ownership(evidence))
})
test('V22 harness rejects non-loopback, credentialed and altered origins before proxy startup', () => {
  for (const origin of ['http://localhost:8080', 'https://example.invalid', 'not-an-origin', 'http://127.0.0.1:0', 'http://127.0.0.1:5433', 'http://127.0.0.1:49152/api', 'http://user@127.0.0.1:49152', 'http://127.0.0.1:49152?other=1', 'http://127.0.0.1:49152#old']) {
    assert.throws(() => validateV22Ready({ ...ready(), backendOrigin: origin }, run, now))
  }
})
