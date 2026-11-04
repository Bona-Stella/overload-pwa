import { readFile, access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Agent, request } from 'node:http'

export const isRunId = value => typeof value === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value)
function loopbackOrigin(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' && url.hostname === '127.0.0.1' && Number(url.port) > 0
      && !['5432', '5433'].includes(url.port) && url.origin === value
  } catch { return false }
}

export function validateV22Ready(value, expectedRunId, now = Date.now()) {
  const reject = () => { throw new Error('Fresh V22 isolated backend evidence required') }
  if (!isRunId(expectedRunId) || !value || value.runId !== expectedRunId) reject()
  if (!isRunId(value.instanceId) || !loopbackOrigin(value.backendOrigin) || !loopbackOrigin(value.browserControlOrigin)
    || value.backendOrigin === value.browserControlOrigin) reject()
  if (!/^[a-f0-9]{64}$/.test(value.containerId) || value.containerRunId !== expectedRunId || !Number.isSafeInteger(value.backendPid) || value.backendPid <= 0) reject()
  if (value.database !== 'overload_v22_isolated' || !Number.isInteger(value.databasePort) || value.databasePort < 1 || value.databasePort > 65535 || [5432, 5433].includes(value.databasePort)) reject()
  if (value.jdbcUrl !== `jdbc:postgresql://127.0.0.1:${value.databasePort}/${value.database}`) reject()
  const started = Date.parse(value.startedAt), ready = Date.parse(value.readyAt)
  if (!Number.isFinite(started) || !Number.isFinite(ready) || started > ready || ready > now || now - started > 30 * 60000) reject()
  if (value.initialUsers !== 0 || value.preparedUsers !== 1 || value.accountFlow !== 'EMAIL_OTP' || value.migrations !== 22
    || JSON.stringify(value.migrationVersions) !== JSON.stringify(Array.from({ length: 22 }, (_, i) => String(i + 1)))) reject()
  for (const field of ['freshDatabase', 'loopbackDatabase', 'tmpfsOnly', 'schemaValidated', 'noDeveloperEnv', 'springSessionTables', 'fakeEmailSender', 'externalAuthDisabled', 'httpSmokePassed']) {
    if (value[field] !== true) reject()
  }
  return value
}

// The application request must use the very socket that answered the probe.
// An agent may otherwise reconnect transparently after the verified process exits.
export async function withV22Connection(evidence, channel, use = async () => {}) {
  const origin = channel === 'control' ? evidence.browserControlOrigin : evidence.backendOrigin
  if (!loopbackOrigin(origin)) throw Error('V22 loopback origin required')
  const agent = new Agent({ keepAlive: true, maxSockets: 1 })
  const connect = agent.createConnection.bind(agent)
  let opened = false
  agent.createConnection = (options, callback) => {
    if (opened) { callback(Error('V22 verified connection closed')); return }
    opened = true
    return connect(options, callback)
  }
  const send = (path, options = {}, body) => new Promise((resolve, reject) => {
    const req = request(origin + path, { ...options, agent, signal: AbortSignal.timeout(15000) }, resolve)
    req.once('error', reject)
    req.end(body)
  })
  try {
    const proof = await send('/__v22_identity', { method: 'POST' })
    proof.resume()
    const headers = proof.headers
    if (proof.statusCode !== 204 || headers['x-v22-run'] !== evidence.runId
      || headers['x-v22-instance'] !== evidence.instanceId || headers['x-v22-pid'] !== String(evidence.backendPid)
      || headers['x-v22-backend'] !== evidence.backendOrigin) throw Error('V22 live service identity mismatch')
    await new Promise((resolve, reject) => { proof.once('end', resolve); proof.once('error', reject) })
    return await use(send)
  } finally { agent.destroy() }
}

export async function verifyV22Ownership(value) {
  await Promise.all([withV22Connection(value, 'backend'), withV22Connection(value, 'control')])
}

export async function readV22Ready(runId, frontendRoot = '.') {
  if (!isRunId(runId)) throw new Error('Supply a verification run UUID')
  const directory = resolve(frontendRoot, '../overload-server/build/verification-v22', runId)
  try { await access(resolve(directory, 'result.json')); throw new Error('Backend already stopped') }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  const value = validateV22Ready(JSON.parse(await readFile(resolve(directory, 'ready.json'), 'utf8')), runId)
  await verifyV22Ownership(value)
  return value
}
