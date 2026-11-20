import react from '@vitejs/plugin-react'
import { BlockList } from 'node:net'
import { networkInterfaces } from 'node:os'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import { appShell } from './scripts/pwa-build.ts'

function reviewAccess(lanIp: string | undefined, hasBackend: boolean): Plugin {
  const addresses = new BlockList()
  addresses.addSubnet('127.0.0.0', 8, 'ipv4')
  if (lanIp) {
    const lan = Object.values(networkInterfaces()).flat().find(item => item?.family === 'IPv4' && item.address === lanIp)
    if (!lan?.cidr || !/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(lanIp)) throw new Error('Select a private local IPv4 address for UI review')
    addresses.addSubnet(lanIp, Number(lan.cidr.split('/')[1]), 'ipv4')
  }
  return {
    name: 'overload-review-access',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const address = req.socket.remoteAddress?.replace(/^::ffff:/, '')
        if (!address || !addresses.check(address, 'ipv4')) { res.writeHead(403).end(); return }
        const path = new URL(req.url ?? '/', 'http://localhost').pathname
        if (/^\/(tests|__review|routine-preview|rest-audio-preview|common-ui-preview|auth-preview|ui-foundation|demo)(\/|$)/.test(path)) {
          res.writeHead(404).end(); return
        }
        if (!hasBackend && /^\/(api|oauth2)(\/|$)/.test(path)) {
          res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end('{"code":"REVIEW_API_UNAVAILABLE"}')
          return
        }
        next()
      })
    },
  }
}

export default defineConfig(({ command, mode, isPreview }) => {
  const review = command === 'serve' && mode === 'ui-review' && !isPreview
  const lanIp = review ? process.env.OVERLOAD_REVIEW_LAN_IP : undefined
  // The LAN review app only connects to a backend selected explicitly by its operator.
  const target = process.env.OVERLOAD_DEV_API_TARGET
    ?? (review ? undefined : loadEnv(mode, process.cwd(), 'OVERLOAD_').OVERLOAD_DEV_API_TARGET ?? 'http://127.0.0.1:8080')
  if (target && !/^http:\/\/(127\.0\.0\.1|localhost):\d{1,5}$/.test(target)) throw new Error('Development proxy requires an explicit loopback HTTP target')
  const proxy = target ? {
    '/api': { target },
    '/oauth2/authorization/google': { target },
    '/oauth2/contact/google': { target },
    '/oauth2/link/google': { target },
  } : undefined
  return {
    plugins: [react(), appShell(), ...(review ? [reviewAccess(lanIp, !!target)] : [])],
    ...(review ? { cacheDir: 'node_modules/.vite-ui-review' } : {}),
    server: {
      host: review ? (lanIp ? '0.0.0.0' : '127.0.0.1') : true,
      port: review ? 4173 : 3000,
      strictPort: true,
      proxy,
      // The review client must not reload when a development socket reconnects.
      ...(review ? {
        hmr: false,
        ws: false,
        fs: {
          deny: [
            // Preserve Vite's default deny patterns for the LAN review server.
            '.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**',
            '**/tests/**', '**/logs/**', '**/.local-backups/**',
          ],
        },
        watch: { ignored: ['**/logs/**'] },
      } : {}),
    },
  }
})
