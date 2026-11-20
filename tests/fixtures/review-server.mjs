import react from '@vitejs/plugin-react'
import { createServer } from 'vite'

export function reviewFixtureEntry(entry = '/tests/fixtures/review/main.tsx') {
  return {
    name: 'overload-review-fixture-entry',
    transformIndexHtml: { order: 'pre', handler: html => html.replace('/src/main.tsx', entry) },
  }
}

export function createReviewFixtureServer() {
  return createServer({
    configFile: false,
    envDir: false,
    cacheDir: 'node_modules/.vite-test-review',
    plugins: [react(), reviewFixtureEntry(), {
      name: 'overload-review-fixture-isolation',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const path = new URL(req.url ?? '/', 'http://localhost').pathname
          if (/^\/(api|oauth2|__review)(\/|$)/.test(path)) { res.writeHead(404).end(); return }
          next()
        })
      },
    }],
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'recharts', 'react-is'] },
    server: { host: '127.0.0.1', port: 0, hmr: false, ws: false, watch: { ignored: ['**/logs/**'] } },
  })
}
