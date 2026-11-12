// Local-only frontend for the opt-in approved catalog fixture.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { networkInterfaces } from 'node:os'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { isRunId, validateV22Ready, verifyV22Ownership } from '../tests/fixtures/v22-environment.mjs'
import { allowedAddress, reviewAccess } from './home-review-access.mjs'
import { approvedCatalogMedia, highRowGifPath } from './approved-catalog-media.mjs'

const runId = process.argv[2]
if (!isRunId(runId)) throw Error('Supply the approved catalog review UUID')
const backend = resolve('../overload-server')
const directory = resolve(backend, 'build/verification-v22', runId)
const ready = JSON.parse(await readFile(resolve(directory, 'ready.json'), 'utf8'))
// Human review outlives the automatic fixture's 30-minute startup window.
// Live Backend/control identities are still checked before serving and every 3 seconds.
validateV22Ready(ready, runId, Date.now(), { existingApprovedCatalog: true })
if (ready.approvedCatalogReview?.approvedExercises !== 31 || !ready.approvedCatalogReview.gifAccessGranted) {
  throw Error('Expected the isolated approved catalog fixture')
}
await verifyV22Ownership(ready)
const settings = JSON.parse(await readFile(resolve(backend, 'docs/dev-data/overload-31-catalog/routine-plans.local.json'), 'utf8'))
const lanAddress = process.argv[3]
const lan = lanAddress && Object.values(networkInterfaces()).flat().find(item => item.family === 'IPv4' && item.address === lanAddress)
if (lanAddress && (!lan || !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(lanAddress))) throw Error('Select a private LAN address')
const origins = ['http://127.0.0.1:4180', ...(lan ? ['http://' + lan.address + ':4180'] : [])]
const access = reviewAccess({ ...ready, reviewEmail: settings.targetAccount }, origins, lan)
const mediaPort = process.argv[4]
const media = mediaPort ? approvedCatalogMedia(mediaPort, origins, lan) : null
const server = await createServer({
  configFile: false,
  envDir: false,
  cacheDir: resolve('.cache/approved-catalog-review', runId),
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
  define: { 'import.meta.env.VITE_HOME_REVIEW': JSON.stringify('true'), 'import.meta.env.VITE_APPROVED_HIGH_ROW_GIF': JSON.stringify(media ? 'true' : 'false') },
  plugins: [react(), {
    name: 'approved-catalog-review',
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        if (media && req.url === highRowGifPath) {
          void media(req, res).catch(() => { if (!res.destroyed && !res.headersSent) res.writeHead(502, { 'Cache-Control': 'no-store' }).end() })
          return
        }
        let path
        try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).toLowerCase().replaceAll('\\', '/') }
        catch { res.writeHead(400).end(); return }
        if (/(^|\/)logs(\/|$)/.test(path) || path.includes('nzzzy9m') || path.includes('.local.json') || /^\/(internal|media|__review-media|oauth2)(\/|$)/.test(path)) {
          res.writeHead(404, { 'Cache-Control': 'no-store' }).end(); return
        }
        if (req.method === 'GET' && req.url === '/__approved_catalog_review' && req.headers.host === '127.0.0.1:4180' && allowedAddress(req.socket.remoteAddress, null)) {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
          res.end(JSON.stringify({ runId, pid: process.pid }))
          return
        }
        void access(req, res, next).catch(() => {
          if (!res.destroyed && !res.headersSent) res.writeHead(502, { 'Cache-Control': 'no-store' }).end()
        })
      })
    },
  }],
  server: { host: lan ? '0.0.0.0' : '127.0.0.1', port: 4180, strictPort: true, watch: { ignored: ['**/logs/**'] }, warmup: { clientFiles: ['./src/main.tsx', './src/review/ReviewApp.tsx'] } },
})
await server.listen()
const lease = setInterval(() => { void verifyV22Ownership(ready).catch(stop) }, 3000)
async function stop() {
  clearInterval(lease)
  await server.close()
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
