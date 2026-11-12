import { withV22Connection } from '../tests/fixtures/v22-environment.mjs'

const ipv4 = value => value.split('.').reduce((out, part) => (out << 8) | Number(part), 0) >>> 0
export function allowedAddress(address, lan) {
  const value = address?.replace(/^::ffff:/, '')
  return value === '127.0.0.1' || value === '::1' || !!lan && /^\d+\.\d+\.\d+\.\d+$/.test(value ?? '') && (ipv4(value) & ipv4(lan.netmask)) === (ipv4(lan.address) & ipv4(lan.netmask))
}
export function reviewAccountRequest(path, method, body, email) {
  if (method !== 'POST' || !['/api/v1/auth/email-otp/request', '/api/v1/auth/email-otp/verify'].includes(path)) return true
  try { return JSON.parse(body.toString()).email === email } catch { return false }
}
export function reviewAccess(evidence, origins, lan) {
  const issued = new Set()
  const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)) }
  return async (req, res, next) => {
    const origin = 'http://' + req.headers.host
    if (!origins.includes(origin) || !allowedAddress(req.socket.remoteAddress, lan)) { json(res, 403, { code: 'REVIEW_LOCAL_NETWORK_ONLY' }); return }
    const path = new URL(req.url, origin).pathname
    if (path === '/__review/config') { json(res, 200, { email: evidence.reviewEmail }); return }
    if (path !== '/__review/otp' && !/^\/(api|oauth2)(\/|$)/.test(path)) { next(); return }
    const chunks = []; let size = 0
    for await (const chunk of req) { size += chunk.length; if (size > 2097152) { json(res, 413, { code: 'REVIEW_REQUEST_TOO_LARGE' }); return } chunks.push(chunk) }
    if (req.aborted) return
    const body = Buffer.concat(chunks)
    if (path === '/__review/otp') {
      if (req.method !== 'POST' || req.headers.origin !== origin || !req.headers['content-type']?.startsWith('application/json')) { json(res, 403, { code: 'REVIEW_DELIVERY_DENIED' }); return }
      let id
      try { id = JSON.parse(body.toString()).challengeId } catch { json(res, 400, { code: 'INVALID_REQUEST' }); return }
      if (!issued.has(id)) { json(res, 403, { code: 'REVIEW_DELIVERY_DENIED' }); return }
      await withV22Connection(evidence, 'backend'); await withV22Connection(evidence, 'control')
      if ([30, 31].includes(evidence.migrations) || evidence.approvedCatalogReview?.approvedExercises === 31) {
        const delivery = await withV22Connection(evidence, 'control', async send => {
          const response = await send('/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, JSON.stringify({ issuanceId: id }))
          const bytes = Buffer.concat(await Array.fromAsync(response))
          return response.statusCode === 200 ? JSON.parse(bytes.toString()) : null
        })
        if (!delivery || !/^\d{6}$/.test(delivery.code)) { json(res, 404, { code: 'REVIEW_CODE_UNAVAILABLE' }); return }
        issued.delete(id); json(res, 200, { code: delivery.code }); return
      }
      const inbox = await fetch(evidence.inboxOrigin + '/inbox', { method: 'POST', headers: { 'X-Review-Run': evidence.runId }, signal: AbortSignal.timeout(5000) })
      if (!inbox.ok) throw Error('Review delivery unavailable')
      const message = (await inbox.json()).messages.find(m => m.challengeId === id)
      if (!message) { json(res, 404, { code: 'REVIEW_CODE_UNAVAILABLE' }); return }
      issued.delete(id); json(res, 200, { code: message.code }); return
    }
    if (req.headers.origin && req.headers.origin !== origin || !reviewAccountRequest(path, req.method, body, evidence.reviewEmail)) { json(res, 403, { code: 'REVIEW_ACCOUNT_ONLY' }); return }
    await withV22Connection(evidence, 'control')
    await withV22Connection(evidence, 'backend', async send => {
      const upstream = await send(req.url, { method: req.method, headers: { ...req.headers, connection: 'keep-alive' } }, body)
      const bytes = Buffer.concat(await Array.fromAsync(upstream))
      if (path === '/api/v1/auth/email-otp/request' && upstream.statusCode === 202) {
        const value = JSON.parse(bytes.toString())
        if (typeof value.challengeId === 'string') { issued.clear(); issued.add(value.challengeId) }
      }
      if (!res.destroyed) { res.writeHead(upstream.statusCode, upstream.headers); res.end(bytes) }
    })
  }
}
