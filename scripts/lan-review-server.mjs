import { networkInterfaces } from 'node:os'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { build, preview } from 'vite'
import { reviewFixtureEntry } from '../tests/fixtures/review-server.mjs'
import { allowedAddress } from './home-review-access.mjs'

const ip = process.env.OVERLOAD_REVIEW_LAN_IP
const lan = ip && Object.values(networkInterfaces()).flat().find(item => item?.family === 'IPv4' && item.address === ip)
if (ip && (!lan || !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip))) {
  throw Error('Select a private IPv4 address on this computer for LAN review')
}
const outDir = resolve('.cache/lan-review-4173')
const options = { configFile: false, envDir: false, build: { outDir, emptyOutDir: false } }
await build({
  ...options,
  plugins: [react(), reviewFixtureEntry('/tests/fixtures/review/lan-entry.tsx')],
})
const server = await preview({
  ...options,
  preview: { host: lan ? '0.0.0.0' : '127.0.0.1', port: 4173, strictPort: true, cors: false },
  plugins: [{
    name: 'overload-lan-review-only',
    configurePreviewServer(app) {
      app.middlewares.use((request, response, next) => {
        if (!allowedAddress(request.socket.remoteAddress, lan)) return response.writeHead(403).end()
        const path = new URL(request.url ?? '/', 'http://localhost').pathname
        if (!['GET', 'HEAD'].includes(request.method) ||
          !(/^\/(assets|icons)\/[\w.-]+$/.test(path) || ['/', '/index.html', '/favicon.svg'].includes(path))) {
          return response.writeHead(404).end()
        }
        response.setHeader('Cache-Control', 'no-store')
        next()
      })
    },
  }],
})
server.printUrls()
