// Opt-in real API review for a verified disposable schedule fixture. The Mock server is separate.
import { readFile } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { createServer } from 'vite'
import { reviewAccess } from './home-review-access.mjs'
import { verifyV22Ownership } from '../tests/fixtures/v22-environment.mjs'

const [runId, lanAddress, accountLabel = 'review'] = process.argv.slice(2)
if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(runId ?? '')) throw Error('Explicit fixture UUID required')
if (!/^[a-z0-9]{1,16}$/.test(accountLabel)) throw Error('Invalid isolated review account label')
const file = resolve('../overload-server/build/verification-v22', runId, 'ready.json')
const evidence = JSON.parse(await readFile(file, 'utf8'))
const version = evidence.migrations
if (evidence.runId !== runId || evidence.database !== 'overload_v22_isolated' || !evidence.freshDatabase ||
  !evidence.loopbackDatabase || !evidence.httpSmokePassed || ![30, 31].includes(version) ||
  JSON.stringify(evidence.migrationVersions) !== JSON.stringify(Array.from({ length: version }, (_, i) => String(i + 1)))) {
  throw Error('Verified fresh schedule fixture required')
}
await verifyV22Ownership(evidence)
evidence.reviewEmail = `home-v${version}-${runId.slice(0, 8)}-${accountLabel}@example.test`
const lan = lanAddress && Object.values(networkInterfaces()).flat().find(item => item.family === 'IPv4' && item.address === lanAddress)
if (lanAddress && (!lan || !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(lanAddress))) throw Error('Select a private LAN address')
const port = version === 31 ? 4175 : 4174
const origins = ['http://localhost:' + port, 'http://127.0.0.1:' + port, ...(lan ? ['http://' + lan.address + ':' + port] : [])]
const access = reviewAccess(evidence, origins, lan)
const server = await createServer({
  configFile: false, envDir: false, cacheDir: 'node_modules/.vite-v' + version + '-review',
  define: { 'import.meta.env.VITE_HOME_REVIEW': JSON.stringify('true') },
  plugins: [react(), {
    name: 'weekly-schedule-review-access',
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        if (/^\/(oauth2|api\/v1\/auth\/google)(\/|\?|$)/.test(req.url ?? '')) { res.writeHead(404).end(); return }
        void access(req, res, next).catch(() => {
          if (!res.destroyed && !res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
            res.end(JSON.stringify({ code: 'REVIEW_BACKEND_UNAVAILABLE' }))
          }
        })
      })
    },
  }],
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
  server: { host: lan ? '0.0.0.0' : '127.0.0.1', port, strictPort: true, watch: { ignored: ['**/logs/**'] } },
})
await server.listen()
server.printUrls()
const lease = setInterval(() => { void verifyV22Ownership(evidence).catch(stop) }, 5000)
async function stop() { clearInterval(lease); await server.close() }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
