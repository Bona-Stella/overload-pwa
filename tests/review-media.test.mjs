import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer, request as httpRequest } from 'node:http'
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { reviewMedia } from '../scripts/review-media.ts'

test('review GIF requires a same-origin keyed session and expires without exposing arbitrary files', async () => {
  const root = resolve('logs/review-media-test')
  await mkdir(root, { recursive: true })
  const directory = await mkdtemp(resolve(root, 'owned-'))
  const file = resolve(directory, 'nZZZy9m.gif')
  const bytes = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  await writeFile(file, bytes)
  const key = 'a'.repeat(64), origins = []
  let clock = 0
  const handler = reviewMedia({ file, accessKey: key, origins, now: () => clock })
  const server = createServer((req, res) => {
    void handler(req, res, () => res.writeHead(404).end()).catch(error => {
      res.writeHead(500).end()
      assert.fail(error)
    })
  })
  try {
    await new Promise(done => server.listen(0, '127.0.0.1', done))
    const origin = 'http://127.0.0.1:' + server.address().port
    origins.push(origin)
    const request = (path, options) => fetch(origin + '/__review-media/' + path, options)
    const mediaPath = 'v1/nZZZy9m.gif'
    assert.throws(() => reviewMedia({ file: resolve(directory, 'nZZZy9m.png'), origins }), /local high-row GIF/)
    const login = body => request('session', { method: 'POST', headers: { Origin: origin }, body })
    for (const path of ['/logs/media-session.local.json', '/logs/MEDIA-SESSION.LOCAL.JSON', '/logs/media-session.local.json?raw', '/logs/catalog-lan-review/high-row-square-393.png', '/@fs/C:/private/LOGS/capture.png', '/%6cogs/capture.png', '/@fs/private/nZZZy9m.gif', '/@fs/private/NZZZY9M.PNG', '/@fs/private/n%5AZZy9m.gif', '/logs/nZZZy9m.frame-00.bgra']) {
      assert.equal((await fetch(origin + path)).status, 403)
    }
    assert.equal((await request(mediaPath)).status, 401)
    assert.equal((await request('session')).status, 401)
    assert.equal((await login('b'.repeat(64))).status, 401)
    assert.equal((await login(key + 'x')).status, 413)
    assert.equal((await request('session', { method: 'POST', body: key })).status, 403)
    assert.equal((await request('session', { method: 'POST', headers: { Origin: 'http://other.example' }, body: key })).status, 403)
    const foreignHostStatus = await new Promise((resolveStatus, reject) => {
      const req = httpRequest(origin + '/__review-media/session', { headers: { Host: 'other.example' } }, res => {
        res.resume()
        resolveStatus(res.statusCode)
      })
      req.on('error', reject)
      req.end()
    })
    assert.equal(foreignHostStatus, 403)
    const granted = await login(key)
    assert.equal(granted.status, 204)
    const cookie = granted.headers.get('set-cookie')
    assert.match(cookie, /HttpOnly; SameSite=Strict; Path=\/__review-media\//)
    assert.doesNotMatch(cookie, new RegExp(key))
    const headers = { Cookie: cookie.split(';')[0] }
    const media = await request(mediaPath, { headers })
    assert.equal(media.status, 200)
    assert.equal(media.headers.get('cache-control'), 'no-store')
    assert.equal(media.headers.get('content-type'), 'image/gif')
    assert.equal(media.headers.get('cross-origin-resource-policy'), 'same-origin')
    assert.deepEqual(Buffer.from(await media.arrayBuffer()), bytes)
    assert.equal((await request(mediaPath, { method: 'HEAD', headers })).status, 200)
    assert.equal((await request('v1/another.gif', { headers })).status, 404)
    assert.equal((await request('v1/nZZZy9m.png', { headers })).status, 404)
    assert.equal((await request(mediaPath, { method: 'POST', headers })).status, 405)
    assert.equal((await request(mediaPath, { headers: { Cookie: 'overload_review_media=forged' } })).status, 401)
    await rm(file)
    assert.equal((await request(mediaPath, { headers })).status, 404)
    clock = 8 * 60 * 60 * 1000 + 1
    assert.equal((await request('session', { headers })).status, 401)
    assert.equal((await request(mediaPath, { headers })).status, 401)
  } finally {
    await new Promise(done => { server.close(done); server.closeAllConnections() })
    assert.equal(dirname(directory), root)
    assert.match(basename(directory), /^owned-/)
    await rm(directory, { recursive: true, force: true })
  }
})
