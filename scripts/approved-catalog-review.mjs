// Local-only frontend for the opt-in approved catalog fixture.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { isRunId, validateV22Ready, verifyV22Ownership } from '../tests/fixtures/v22-environment.mjs'
import { reviewAccess } from './home-review-access.mjs'

const runId = process.argv[2]
if (!isRunId(runId)) throw Error('Supply the approved catalog review UUID')
const backend = resolve('../overload-server')
const directory = resolve(backend, 'build/verification-v22', runId)
const ready = JSON.parse(await readFile(resolve(directory, 'ready.json'), 'utf8'))
validateV22Ready(ready, runId)
if (ready.approvedCatalogReview?.approvedExercises !== 31 || !ready.approvedCatalogReview.gifAccessGranted) {
  throw Error('Expected the isolated approved catalog fixture')
}
await verifyV22Ownership(ready)
const settings = JSON.parse(await readFile(resolve(backend, 'docs/dev-data/overload-31-catalog/routine-plans.local.json'), 'utf8'))
const origin = 'http://127.0.0.1:4180'
const access = reviewAccess({ ...ready, reviewEmail: settings.targetAccount }, [origin], null)
const server = await createServer({
  configFile: false,
  envDir: false,
  cacheDir: resolve('.cache/approved-catalog-review', runId),
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
  define: { 'import.meta.env.VITE_HOME_REVIEW': JSON.stringify('true') },
  plugins: [react(), {
    name: 'approved-catalog-review',
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        if (req.method === 'GET' && req.url === '/__approved_catalog_review' && req.headers.host === '127.0.0.1:4180') {
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
  server: { host: '127.0.0.1', port: 4180, strictPort: true, warmup: { clientFiles: ['./src/main.tsx', './src/review/ReviewApp.tsx'] } },
})
await server.listen()
const lease = setInterval(() => { void verifyV22Ownership(ready).catch(stop) }, 3000)
async function stop() {
  clearInterval(lease)
  await server.close()
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
