import { randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { basename, isAbsolute } from 'node:path'

const prefix = '/__review-media/'
const cookieName = 'overload_review_media'
const lifetimeSeconds = 8 * 60 * 60

/** This handler is mounted only by the private-network ui-review Vite server. */
export function reviewMedia({ file, accessKey, origins, now = Date.now }: {
  file?: string; accessKey?: string; origins: string[]; now?: () => number
}) {
  if (file && (!isAbsolute(file) || basename(file) !== 'nZZZy9m.gif')) throw Error('Select the local high-row GIF')
  if (accessKey && !/^[a-f0-9]{64}$/.test(accessKey)) throw Error('Review media requires a 32-byte access key')
  const sessions = new Map<string, { address: string | undefined; expires: number }>()
  const authorized = (req: IncomingMessage) => {
    const token = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(cookieName + '='))?.slice(cookieName.length + 1)
    const session = token ? sessions.get(token) : undefined
    return !!session && session.address === req.socket.remoteAddress && session.expires > now()
  }
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    let path: string
    try { path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname) }
    catch { res.writeHead(400).end(); return }
    const filePath = path.toLowerCase().replaceAll('\\', '/')
    if (/(^|\/)logs(\/|$)/.test(filePath) || filePath.includes('media-session.local.json') || filePath.includes('nzzzy9m') && !path.startsWith(prefix)) {
      res.setHeader('Cache-Control', 'no-store')
      res.writeHead(403).end()
      return
    }
    if (!path.startsWith(prefix)) { next(); return }
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    const origin = 'http://' + req.headers.host
    if (!origins.includes(origin) || req.headers.origin && req.headers.origin !== origin) { res.writeHead(403).end(); return }
    if (!file || !accessKey) { res.writeHead(404).end(); return }
    if (path === prefix + 'session') {
      if (req.method === 'GET') { res.writeHead(authorized(req) ? 204 : 401).end(); return }
      if (req.method !== 'POST') { res.writeHead(405).end(); return }
      if (req.headers.origin !== origin) { res.writeHead(403).end(); return }
      const chunks: Buffer[] = []
      let size = 0
      for await (const chunk of req) {
        const bytes = Buffer.from(chunk)
        size += bytes.length
        if (size > 64) { res.writeHead(413).end(); return }
        chunks.push(bytes)
      }
      const candidate = Buffer.concat(chunks)
      if (candidate.length !== 64 || !timingSafeEqual(candidate, Buffer.from(accessKey))) { res.writeHead(401).end(); return }
      for (const [token, session] of sessions) if (session.expires <= now()) sessions.delete(token)
      const token = randomBytes(32).toString('hex')
      sessions.set(token, { address: req.socket.remoteAddress, expires: now() + lifetimeSeconds * 1000 })
      // The existing LAN review origin uses HTTP. This cookie is scoped to review media.
      res.setHeader('Set-Cookie', cookieName + '=' + token + '; HttpOnly; SameSite=Strict; Path=' + prefix + '; Max-Age=' + lifetimeSeconds)
      res.writeHead(204).end()
      return
    }
    if (path !== prefix + 'v1/' + basename(file)) { res.writeHead(404).end(); return }
    if (!['GET', 'HEAD'].includes(req.method ?? '')) { res.writeHead(405).end(); return }
    if (!authorized(req)) { res.writeHead(401).end(); return }
    try {
      const bytes = await readFile(file)
      if (!['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString())) { res.writeHead(404).end(); return }
      res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': bytes.length })
      res.end(req.method === 'HEAD' ? undefined : bytes)
    } catch {
      res.writeHead(404).end()
    }
  }
}
