// Opt-in local fault injection. Responses always originate at the verified real Backend.
import { createHash } from 'node:crypto'
import { withV22Connection } from './v22-environment.mjs'
export function pwaWriteProxy(evidence) {
  const origin = evidence.backendOrigin
  const target = new URL(origin)
  if (target.protocol !== 'http:' || target.hostname !== '127.0.0.1' || !target.port || target.username || target.password || target.pathname !== '/' || target.search || target.hash) throw Error('Verified loopback origin required')
  const fault = { beforeSnapshot: false, dropSnapshot: false, dropFinish: false }, records = []
  let failed = false
  async function middleware(req, res, next) {
    const url = new URL(req.url, origin), path = url.pathname
    if (url.origin !== target.origin || !/^\/(api|oauth2)(\/|$)/.test(path)) { next(); return }
    if (failed) { res.destroy(); return }
    const snapshot = req.method === 'PUT' && /^\/api\/v1\/workout-sessions\/[a-f0-9-]+\/snapshot$/.test(path)
    const finish = req.method === 'POST' && /^\/api\/v1\/workout-sessions\/[a-f0-9-]+\/finish$/.test(path)
    const chunks = []; for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks)
    let revision
    try { revision = JSON.parse(body.toString()).localRevision } catch { /* The real Backend validates the input. */ }
    const row = { method: req.method, path, revision, requestSha256: createHash('sha256').update(body).digest('hex'), bytes: body.length, forwarded: false }
    if (snapshot || finish) records.push(row)
    if (snapshot && fault.beforeSnapshot) { row.failure = 'BEFORE_UPSTREAM'; res.destroy(); return }
    try {
      await withV22Connection(evidence, 'control')
      await withV22Connection(evidence, 'backend', async send => {
        row.forwarded = true
        const response = await send(path + url.search, { method: req.method, headers: { ...req.headers, connection: 'keep-alive' } }, body)
        const output = []
        for await (const chunk of response) output.push(chunk)
        const bytes = Buffer.concat(output); row.status = response.statusCode
        if (response.statusCode === 200) {
          let ack
          try { ack = JSON.parse(bytes.toString()) } catch { /* Do not hide invalid Backend responses. */ }
          if (ack?.acceptedLocalRevision === revision && typeof ack?.duplicate === 'boolean') {
            row.ack = { duplicate: ack.duplicate, revision: ack.acceptedLocalRevision, version: ack.version, currentVersion: ack.currentVersion }
            if (snapshot && fault.dropSnapshot || finish && fault.dropFinish) { row.failure = 'AFTER_BACKEND_200'; res.destroy(); return }
          }
        }
        res.writeHead(response.statusCode, response.headers); res.end(bytes)
      })
    } catch {
      failed = true
      row.failure = 'UPSTREAM_OWNERSHIP_OR_CONNECTION'
      res.destroy()
    }
  }
  const plugin = { name: 'isolated-v22-proxy', configurePreviewServer(vite) {
    vite.middlewares.use((req, res, next) => { void middleware(req, res, next).catch(() => { failed = true; res.destroy() }) })
  } }
  return { fault, records, middleware, plugin, assertConnected() { if (failed) throw Error('V22 upstream verification or connection failed') } }
}
