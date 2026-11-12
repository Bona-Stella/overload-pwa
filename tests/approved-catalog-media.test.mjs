import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { approvedCatalogMedia, highRowGifPath } from '../scripts/approved-catalog-media.mjs'

test('review media only forwards the exact high-row request and real session cookie to the protected upstream', async t => {
  const observed = []
  const upstream = createServer((req, res) => {
    observed.push({ path: req.url, method: req.method, cookie: req.headers.cookie })
    res.writeHead(403, { 'Cache-Control': 'no-store' }).end()
  })
  await new Promise(done => upstream.listen(0, '127.0.0.1', done))
  const origins = []
  const media = approvedCatalogMedia(String(upstream.address().port), origins)
  const proxy = createServer((req, res) => { void media(req, res) })
  await new Promise(done => proxy.listen(0, '127.0.0.1', done))
  const origin = 'http://127.0.0.1:' + proxy.address().port
  origins.push(origin)
  t.after(() => { proxy.close(); proxy.closeAllConnections(); upstream.close(); upstream.closeAllConnections() })
  const headers = { Cookie: 'other=secret; SESSION=fixture; XSRF-TOKEN=fixture' }
  for (const [path, options, status] of [
    [highRowGifPath, {}, 401],
    [highRowGifPath + '?v=1', { headers }, 404],
    ['/media/exercises/v1/Other01.gif', { headers }, 404],
    [highRowGifPath, { method: 'POST', headers }, 405],
    [highRowGifPath, { headers: { ...headers, Origin: 'http://foreign.invalid' } }, 403],
    [highRowGifPath, { headers: { ...headers, 'Sec-Fetch-Site': 'cross-site' } }, 403],
  ]) {
    const response = await fetch(origin + path, options)
    assert.equal(response.status, status)
    assert.equal(response.headers.get('cache-control'), 'no-store')
  }
  assert.deepEqual(observed, [])
  const response = await fetch(origin + highRowGifPath, { headers })
  assert.equal(response.status, 403)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(observed, [{ path: highRowGifPath, method: 'GET', cookie: 'SESSION=fixture' }])
})
