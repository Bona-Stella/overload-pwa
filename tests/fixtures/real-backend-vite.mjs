// Opt-in browser verification proxy. Every /api response comes from the actual Spring Boot process.
import { readFile, mkdir, appendFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const directory = resolve('logs/task-008-1c')
await mkdir(directory, { recursive: true })
const ready = JSON.parse(await readFile(resolve('../overload-server/build/task-008-1c/ready.json'), 'utf8'))
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(ready.backendOrigin) || ready.initialUsers !== 0 || ready.migrations !== 8) throw Error('Expected isolated, migrated test backend')
process.env.OVERLOAD_DEV_API_TARGET = ready.backendOrigin
const audit = resolve(directory, 'http.jsonl')
await writeFile(audit, '')
const hash = value => createHash('sha256').update(value).digest('hex')
let sequence = 0, pendingAudit = Promise.resolve()
const guard = `(() => {
  const counter = document.createElement('meta'); counter.name = 'overload-test-demo-access-count'; counter.content = '0'; document.head.append(counter);
  for (const method of ['getItem', 'setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[method];
    Storage.prototype[method] = function (...args) {
      if (method === 'clear' || args[0] === 'overload.core.v1') {
        counter.content = String(Number(counter.content) + 1); throw new Error('Demo storage access blocked in isolated verification');
      }
      return original.apply(this, args);
    };
  }
})();`
const server = await createServer({
  envDir: false,
  plugins: [{ name: 'isolated-demo-storage-guard', transformIndexHtml: { order: 'pre', handler: () => [{ tag: 'script', children: guard, injectTo: 'head-prepend' }] } }],
  server: {
    host: '127.0.0.1', port: 3072, strictPort: true,
    proxy: { '/api': { target: ready.backendOrigin, configure(proxy) {
      proxy.on('proxyRes', (response, request) => {
        const path = (request.url ?? '').split('?')[0]
        const cookie = /(?:^|;\s*)SESSION=([^;]+)/.exec(request.headers.cookie ?? '')?.[1]
        const setCookies = (response.headers['set-cookie'] ?? []).map(value => {
          const [first, ...attributes] = value.split(';').map(part => part.trim())
          const valuePart = first.slice(first.indexOf('=') + 1)
          return { name: first.split('=')[0], cookieSha256: valuePart ? hash(valuePart) : null, attributes }
        })
        const event = { sequence: ++sequence, method: request.method, path, status: response.statusCode, sentSessionCookie: Boolean(cookie), cookieSha256: cookie ? hash(cookie) : null,
          requestId: response.headers['x-request-id'] ?? null, cacheControl: response.headers['cache-control'] ?? null,
          contentType: response.headers['content-type'] ?? null, nosniff: response.headers['x-content-type-options'] ?? null, frameOptions: response.headers['x-frame-options'] ?? null, setCookies }
        const collect = ['/api/v1/exercises', '/api/v1/workout-settings', '/api/v1/auth/session'].includes(path)
        const chunks = []
        if (collect) response.on('data', chunk => chunks.push(chunk))
        response.on('end', () => {
          if (collect) { try { event.body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { event.body = null } }
          pendingAudit = pendingAudit.then(() => appendFile(audit, JSON.stringify(event) + '\n'))
        })
      })
    } } },
  },
})
await server.listen()
await writeFile(resolve(directory, 'ready.json'), JSON.stringify({ frontendOrigin: 'http://127.0.0.1:3072', backendOrigin: ready.backendOrigin, pid: process.pid }))
console.log(JSON.stringify({ frontendOrigin: 'http://127.0.0.1:3072', backendOrigin: ready.backendOrigin, pid: process.pid }))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void server.close().then(() => pendingAudit).then(() => process.exit(0)) })
