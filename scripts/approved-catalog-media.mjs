import { createHash } from 'node:crypto'
import { allowedAddress } from './home-review-access.mjs'

export const highRowGifPath = '/media/exercises/v1/nZZZy9m.gif'
const highRowGifSha256 = 'c132e833915b249752879c31018474402ac3da7eb1388d1fd98c56669bad9e6c'

export function approvedCatalogMedia(port, origins, lan) {
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535) throw Error('A local GIF proxy port is required')
  const target = `http://127.0.0.1:${port}${highRowGifPath}`
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
    const origin = 'http://' + req.headers.host
    if (!origins.includes(origin) || !allowedAddress(req.socket.remoteAddress, lan)
      || (req.headers.origin && req.headers.origin !== origin)
      || (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site']))) {
      res.writeHead(403).end(); return
    }
    if (req.url !== highRowGifPath) { res.writeHead(404).end(); return }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return }

    // Nginx forwards the real account cookie to the existing Spring GIF authorization endpoint.
    const cookie = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('SESSION='))
    if (!cookie) { res.writeHead(401).end(); return }
    const upstream = await fetch(target, { method: req.method, headers: { Cookie: cookie }, redirect: 'manual', signal: AbortSignal.timeout(5000) })
    if (upstream.status !== 200 || upstream.headers.get('content-type') !== 'image/gif'
      || !upstream.headers.get('cache-control')?.split(',').some(value => value.trim().toLowerCase() === 'no-store')) {
      await upstream.body?.cancel()
      res.writeHead([401, 403, 404, 405].includes(upstream.status) ? upstream.status : 502).end()
      return
    }
    const length = Number(upstream.headers.get('content-length'))
    if (length !== 126978) { await upstream.body?.cancel(); res.writeHead(502).end(); return }
    const bytes = req.method === 'GET' ? Buffer.from(await upstream.arrayBuffer()) : undefined
    if (bytes && (bytes.length !== length || createHash('sha256').update(bytes).digest('hex') !== highRowGifSha256)) {
      res.writeHead(502).end(); return
    }
    res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': length }).end(bytes)
  }
}
