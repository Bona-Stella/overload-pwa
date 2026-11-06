// Opt-in LAN design review. No production config, environment files or personal DB.
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { networkInterfaces } from 'node:os'
import { verifyV22Ownership } from '../tests/fixtures/v22-environment.mjs'
import { reviewAccess } from './home-review-access.mjs'

const runId = process.argv[2]
if (!/^[0-9a-f-]{36}$/.test(runId ?? '')) throw Error('Explicit review UUID required')
const directory = resolve('../overload-server/build/verification-v22', runId)
const evidence = JSON.parse(await readFile(resolve(directory, 'home-review.json'), 'utf8'))
if (evidence.runId !== runId || evidence.database !== 'overload_v22_isolated' || !(evidence.freshDatabase || evidence.storageMode === 'persistent-restored') || evidence.freshDatabase && evidence.activeSessions !== 0
  || JSON.stringify(evidence.actualMigrations) !== JSON.stringify(Array.from({ length: 24 }, (_, i) => String(i + 1)))) throw Error('Prepared V24 isolated review DB required')
await verifyV22Ownership(evidence)
const lanAddress = process.argv[3]
const lan = Object.values(networkInterfaces()).flat().find(n => n.family === 'IPv4' && !n.internal && n.address === lanAddress)
if (lanAddress && (!lan || !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(lanAddress))) throw Error('Explicit private LAN interface required')
const origins = ['http://127.0.0.1:3000', 'http://localhost:3000', ...(lan ? ['http://' + lan.address + ':3000'] : [])]
const access = reviewAccess(evidence, origins, lan)
const server = await createServer({ configFile: false, envDir: false, define: { 'import.meta.env.VITE_HOME_REVIEW': JSON.stringify('true') }, plugins: [react(), { name: 'home-review-identity', configureServer(vite) {
  vite.middlewares.use((req, res, next) => {
    if (req.url === '/__review/shutdown') {
      if (req.method !== 'POST' || req.headers.origin || !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress) || req.headers['x-review-run'] !== runId) { res.writeHead(403).end(); return }
      res.writeHead(204).end(); setTimeout(() => { void stop() }, 100); return
    }
    void access(req, res, next).catch(() => {
      if (!res.destroyed && !res.headersSent) { res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ code: 'REVIEW_BACKEND_UNAVAILABLE' })) }
    })
  })
  vite.middlewares.use('/__review/wireframe', (_req, res) => {
    void readFile('docs/product/Overload_UI_Baseline_Wireframe_v0.9.html','utf8').then(html => { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html.replace('<head>','<head><base href="/docs/product/">')) })
  })
  vite.middlewares.use('/__home_review', (_req, res) => {
    res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify({ runId, pid: process.pid, backendOrigin: evidence.backendOrigin, origins, mode: 'development-design-review' }))
  })
} }], server: { host: lan ? '0.0.0.0' : '127.0.0.1', port: 3000, strictPort: true, allowedHosts: ['localhost', ...(lan ? [lan.address] : [])], watch: { ignored: ['**/logs/**'] } } })
await server.listen()
await writeFile(resolve(directory, 'frontend.json'), JSON.stringify({ runId, pid: process.pid, origins }))
console.log('HOME_REVIEW_FRONTEND ' + origins.join(' '))
const stop = async () => { clearInterval(lease); await server.close(); process.exit(0) }
const lease = setInterval(() => { void verifyV22Ownership(evidence).catch(stop) }, 5000)
process.on('SIGINT', stop); process.on('SIGTERM', stop)
