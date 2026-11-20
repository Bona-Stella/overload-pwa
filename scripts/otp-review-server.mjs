import { networkInterfaces } from 'node:os'
import { createServer } from 'vite'
import { reviewFixtureEntry } from '../tests/fixtures/review-server.mjs'
import { readV22Ready } from '../tests/fixtures/v22-environment.mjs'
import { reviewAccess } from './home-review-access.mjs'

const [runId, reviewEmail] = process.argv.slice(2)
if (!/^[a-z0-9][a-z0-9._+-]*@example\.(invalid|test)$/.test(reviewEmail ?? '')) {
  throw new Error('Supply the dedicated test email address')
}
if (process.env.OVERLOAD_DEV_API_TARGET) throw new Error('OTP review selects its backend from the isolated run only')

const evidence = await readV22Ready(runId, '.', { existingOtpReview: true })
const lanIp = process.env.OVERLOAD_REVIEW_LAN_IP
const lan = Object.values(networkInterfaces()).flat().find(item => item?.family === 'IPv4' && item.address === lanIp)
const origins = ['http://127.0.0.1:4173', 'http://localhost:4173', ...(lan ? [`http://${lan.address}:4173`] : [])]
const access = reviewAccess({ ...evidence, reviewEmail }, origins, lan)

const server = await createServer({
  mode: 'ui-review',
  plugins: [{
    ...reviewFixtureEntry('/scripts/review/account-entry.tsx'),
    enforce: 'pre',
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        void access(req, res, next).catch(() => {
          if (!res.destroyed && !res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
            .end('{"code":"REVIEW_BACKEND_UNAVAILABLE"}')
        })
      })
    },
  }],
})
await server.listen()
server.printUrls()
