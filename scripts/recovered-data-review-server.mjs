import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { isIPv4 } from 'node:net'
import { resolve } from 'node:path'
import { build, preview } from 'vite'
import react from '@vitejs/plugin-react'
import { reviewFixtureEntry } from '../tests/fixtures/review-server.mjs'
import { verifyV22Ownership } from '../tests/fixtures/v22-environment.mjs'
import { reviewAccess } from './home-review-access.mjs'
import { restoredReviewOtp } from './restored-review-otp.mjs'
import { approvedCatalogMedia, highRowGifPath } from './approved-catalog-media.mjs'

const port = Number(process.argv[2])
const action = process.argv[3]
assert([4173, 4174].includes(port))
assert([undefined, 'build-only', 'serve-built'].includes(action))
assert(!process.env.OVERLOAD_DEV_API_TARGET)
const marker = port === 4174 ? 'validation-current.json' : 'recovery-current.json'
const state = JSON.parse(await readFile(resolve('logs/workout-api-review', marker), 'utf8'))
assert.match(state.runId, /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/)
const directory = resolve('.local-backups/workout-api-review', state.runId)
assert.equal(resolve(state.directory), directory)
const evidence = JSON.parse(await readFile(resolve(directory, 'backend.json'), 'utf8'))
assert.equal(evidence.runId, state.runId)
assert.equal(evidence.sourceRun, state.sourceRun)
assert.deepEqual(evidence.actualMigrations, Array.from({ length: 37 }, (_, i) => String(i + 1)))
await verifyV22Ownership(evidence)

const lanIp = process.env.OVERLOAD_REVIEW_LAN_IP
assert(lanIp && isIPv4(lanIp) && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(lanIp))
// Build-only can refresh an existing gateway while its configured Wi-Fi address is offline.
const lan = Object.values(networkInterfaces()).flat().find(item => item?.family === 'IPv4' && item.address === lanIp && !item.internal)
assert(action === 'build-only' || lan)
const origins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`, `http://${lanIp}:${port}`]
const outDir = resolve(directory, 'frontend')

if (action !== 'serve-built') await build({
  envDir: false,
  mode: 'ui-review',
  define: {
    'import.meta.env.VITE_APPROVED_HIGH_ROW_GIF': JSON.stringify(port === 4173 ? 'true' : 'false'),
    'import.meta.env.VITE_HTTP_WORKOUT_REVIEW_ORIGIN': JSON.stringify(origins[2]),
  },
  build: { outDir, emptyOutDir: false },
  plugins: [reviewFixtureEntry('/scripts/review/account-entry.tsx')],
})

if (action !== 'serve-built') await build({
  configFile: false,
  envDir: false,
  root: resolve('scripts/review'),
  publicDir: false,
  define: { 'import.meta.env.VITE_HTTP_WORKOUT_REVIEW_ORIGIN': JSON.stringify(origins[2]) },
  plugins: [react()],
  build: {
    outDir,
    emptyOutDir: false,
    assetsDir: 'review-assets',
    rolldownOptions: { input: resolve('scripts/review/common-ui-preview.html') },
  },
})

if (action !== 'build-only') {
  const access = reviewAccess(evidence, origins, lan, await restoredReviewOtp(evidence))
  const media = approvedCatalogMedia('4181', origins, lan)
  const server = await preview({
    envDir: false,
    mode: 'ui-review',
    build: { outDir },
    preview: { host: '0.0.0.0', port, strictPort: true, proxy: {} },
    plugins: [{
      name: 'overload-recovered-data-review',
      configurePreviewServer(vite) {
        vite.middlewares.use((req, res, next) => {
          const handle = req.url === highRowGifPath ? media(req, res) : access(req, res, next)
          void handle.catch(() => {
            if (!res.destroyed && !res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
              .end('{"code":"REVIEW_BACKEND_UNAVAILABLE"}')
          })
        })
      },
    }],
  })
  server.printUrls()
}
