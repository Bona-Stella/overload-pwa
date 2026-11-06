import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer as httpServer } from 'node:http'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, relative, isAbsolute, extname } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

// Dedicated ports/profile, no developer env, proxy, real Backend, or personal DB.
const directory = resolve('logs/ui-v09-t01'), profile = resolve(directory, 'profile-' + crypto.randomUUID())
await mkdir(profile, { recursive: true })
const passed = [], errors = []
const wait = async (fn, label) => {
  const until = Date.now() + 15000
  while (Date.now() < until) { const result = await fn(); if (result) return result; await new Promise(r => setTimeout(r, 40)) }
  throw Error('Timeout: ' + label)
}
class Cdp {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map()
    ws.onmessage = event => { const message = JSON.parse(event.data), pending = this.pending.get(message.id); if (pending) { this.pending.delete(message.id); message.error ? pending.reject(Error(message.error.message)) : pending.resolve(message.result) } }
    ws.onclose = () => { for (const pending of this.pending.values()) pending.reject(Error('Browser closed')); this.pending.clear() }
  }
  static async open(url) { const ws = new WebSocket(url); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j }); return new Cdp(ws) }
  send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++this.id; this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async eval(expression) { const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? 'Browser evaluation failed'); return result.result.value }
}
const dev = await createServer({ configFile: false, envDir: false, plugins: [react(), { name: 't01-account-fixture', configureServer(vite) {
  vite.middlewares.use('/t01', async (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml('/t01', '<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/t01-app.jsx"></script></body></html>')) })
} }], server: { host: '127.0.0.1', port: 0, watch: { ignored: ['**/logs/**'] } } })
const production = httpServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname
    if (path.startsWith('/api/')) { res.writeHead(path.endsWith('/csrf') ? 200 : 401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(path.endsWith('/csrf') ? { headerName: 'X-CSRF-TOKEN', token: 'fixture' } : { code: 'AUTHENTICATION_REQUIRED' })); return }
    if (!['/', '/index.html', '/sw.js', '/manifest.webmanifest', '/favicon.svg'].includes(path) && !/^\/(assets|icons)\/[\w.-]+$/.test(path)) { res.writeHead(404).end(); return }
    const file = path === '/' ? '/index.html' : path, bytes = await readFile(resolve('dist', '.' + file))
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }[extname(file)]
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(bytes)
  } catch { res.writeHead(404).end() }
})
let browser, cdp, browserExit
try {
  await dev.listen(); await new Promise(r => production.listen(0, '127.0.0.1', r))
  const origin = `http://127.0.0.1:${dev.httpServer.address().port}`
  browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
  browserExit = new Promise(r => browser.once('exit', r))
  const port = await wait(async () => { try { return Number((await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { return false } }, 'Chrome start')
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page')
  cdp = await Cdp.open(target.webSocketDebuggerUrl)
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true })
  const evaluate = expression => cdp.eval(expression)
  const click = async text => {
    await wait(() => evaluate(`Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim()===${JSON.stringify(text)} && !b.disabled && b.getClientRects().length)`), 'button ' + text)
    await evaluate(`(() => { const button=Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim()===${JSON.stringify(text)} && !b.disabled && b.getClientRects().length); button.focus(); button.click(); })()`)
    await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
  }
  const input = async (label, value) => {
    await evaluate(`(() => { const e = document.querySelector('input[aria-label=${JSON.stringify(label)}]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)}); e.dispatchEvent(new Event('input',{bubbles:true})); })()`)
  }
  const screenshot = async name => { const data = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(resolve(directory, name + '.png'), Buffer.from(data.data, 'base64')) }
  await cdp.send('Page.navigate', { url: origin + '/t01' })
  await wait(() => evaluate('!!window.t01 && document.body.innerText.includes("Google로 계속하기")'), 'login screen')
  assert.equal(await evaluate('document.querySelectorAll("nav").length'), 0)
  assert.equal(await evaluate('document.body.innerText.includes("앱 설치·오프라인 준비")'), false)
  await screenshot('login-393'); passed.push('Anonymous login retains its controls; no account tabs or install panel')
  await evaluate('window.t01.login()')
  await wait(() => evaluate('document.querySelectorAll("nav button").length===4 && document.body.innerText.includes("첫 루틴을 준비해 보세요")'), 'authenticated home')
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".app-shell")).backgroundColor'), 'rgb(17, 18, 22)')
  await screenshot('home-393')
  await click('기록'); await wait(() => evaluate('document.body.innerText.includes("통계·추적")'), 'statistics under records')
  await click('설정'); await wait(() => evaluate('document.body.innerText.includes("세트 사이 휴식") && document.body.innerText.includes("앱 설치·오프라인 준비")'), 'settings')
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('section[aria-label="데이터 및 앱"] button')).at(-1).textContent.trim()`), '로그아웃')
  await screenshot('settings-393')
  await click('계정 설정'); await wait(() => evaluate('document.body.innerText.includes("대표 재인증 이메일")'), 'account settings')
  await click('‹ 설정으로'); await wait(() => evaluate('document.body.innerText.includes("데이터 및 앱")'), 'settings return')
  await click('루틴'); await wait(() => evaluate('document.body.innerText.includes("실제 계정 루틴 Ω")'), 'routines')
  await click('+ 새 루틴'); await wait(() => evaluate('document.querySelectorAll("nav").length===0'), 'routine edit hides tabs')
  await click('닫기'); await wait(() => evaluate('document.querySelectorAll("nav button").length===4'), 'routine editor close')
  passed.push('Four tabs expose existing routine, statistics, account and PWA features; routine editing hides tabs')
  await evaluate('window.t01.activate()'); await click('다시 조회')
  const repsSelector = JSON.stringify('input[aria-label="2세트 이번 반복 횟수"]')
  await wait(() => evaluate(`!!document.querySelector(${repsSelector}) && !document.querySelector(${repsSelector}).disabled && !document.querySelector('nav')`), 'real local editor')
  await evaluate(`(async()=>{window.savedInput=document.querySelector(${repsSelector}); window.savedWorkout=await window.t01.read()})()`)
  await evaluate('window.t01.failLocal(true)'); await input('2세트 이번 반복 횟수', '11')
  await wait(() => evaluate('document.body.innerText.includes("저장하지 못")'), 'local write failure')
  await click('‹ 홈으로 · 운동은 계속 보존')
  assert.equal(await evaluate('document.querySelectorAll("nav").length'), 0)
  assert.equal(await evaluate('window.savedInput.value'), '11')
  passed.push('Failed IndexedDB draft save blocks leaving the focused workout and preserves visible input')
  await evaluate('window.t01.failLocal(false)'); await click('‹ 홈으로 · 운동은 계속 보존')
  await wait(() => evaluate('document.querySelectorAll("nav button").length===4'), 'saved return home')
  await click('기록'); await click('설정'); await click('홈'); await click('운동 이어가기')
  await wait(() => evaluate('!document.querySelector("nav")'), 'resumed focus')
  assert.equal(await evaluate(`window.savedInput===document.querySelector(${repsSelector})`), true)
  const preserved = await evaluate('(() => window.t01.read().then(w=>({draft:w.drafts[Object.keys(w.drafts).find(k=>k.endsWith(":2"))].reps, sameRest:JSON.stringify(w.rest)===JSON.stringify(window.savedWorkout.rest), samePending:w.pendingSnapshot.requestJson===window.savedWorkout.pendingSnapshot.requestJson, sameStart:w.startedAt===window.savedWorkout.startedAt, sameEpoch:w.writerEpoch===window.savedWorkout.writerEpoch})))()')
  assert.deepEqual(preserved, { draft: '11', sameRest: true, samePending: true, sameStart: true, sameEpoch: true })
  await screenshot('workout-393'); passed.push('Tab navigation keeps the same editor DOM, exact draft, start, rest deadline, epoch and frozen snapshot bytes')
  await evaluate('window.t01.allowSnapshot()'); await click('서버 저장 상태 다시 확인')
  await wait(() => evaluate('window.t01.read().then(w=>!w.pendingSnapshot && w.serverRevision===w.localRevision)'), 'snapshot retry ACK')
  passed.push('Existing sync retry accepts ACK after a simulated server failure without replacing workout facts')
  await click('‹ 홈으로 · 운동은 계속 보존'); await click('설정'); await click('로그아웃')
  await wait(() => evaluate('document.querySelector("dialog[open]")?.innerText.includes("미전송 수행·입력 초안·타이머")'), 'logout safety dialog')
  await screenshot('logout-393'); await click('취소')
  await evaluate('window.t01.changeGeneration()'); await click('루틴'); await click('다시 조회')
  await wait(() => evaluate('document.querySelectorAll(".local-workout").length===0 && document.querySelectorAll("nav button").length===4'), 'generation boundary after API revalidation')
  assert.equal(await evaluate('window.t01.read().then(w=>w.snapshot.performedSets.length)'), 1)
  await evaluate('window.t01.switchAccount()'); await wait(() => evaluate('document.querySelectorAll(".local-workout").length===0 && document.querySelectorAll("nav button").length===4'), 'account boundary')
  assert.equal(await evaluate('document.body.innerText.includes("실제 계정 루틴 Ω")'), false)
  passed.push('Logout keeps the safety confirmation; generation/account changes remove old UI while preserving its IndexedDB original')
  await cdp.send('Page.navigate', { url: origin + '/ui-foundation' })
  await wait(() => evaluate('document.body.innerText.includes("공식 운동 아이콘")'), 'foundation preview')
  await input('검증 중량', '62.500000'); await input('1세트 이번 반복 횟수', '12')
  const weightSelector = JSON.stringify('input[aria-label="검증 중량"]')
  await evaluate(`void(window.previewInput=document.querySelector(${weightSelector}))`)
  const elapsed = await wait(() => evaluate('parseInt(document.querySelector("output").textContent)>=1 && parseInt(document.querySelector("output").textContent)'), 'preview timer tick')
  await click('디로딩 색상 검증'); await click('기록')
  assert.equal(await evaluate(`window.previewInput===document.querySelector(${weightSelector}) && window.previewInput.value==='62.500000'`), true)
  assert.ok(await evaluate('parseInt(document.querySelector("output").textContent)') >= elapsed)
  assert.equal(await evaluate(`document.querySelector('input[aria-label="1세트 이번 반복 횟수"]').value`), '12')
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".app-shell")).getPropertyValue("--accent").trim()'), '#78B89A')
  assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("img")).map(i=>[i.getBoundingClientRect().width,i.getBoundingClientRect().height,i.naturalWidth])'), Array(6).fill([32, 32, 128]))
  await screenshot('mint-preview-393'); await click('일반 테마'); await screenshot('blue-preview-393')
  await click('?'); assert.equal(await evaluate('document.querySelector("[role=note]")!==null'), true)
  await evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))')
  assert.equal(await evaluate('document.querySelector("[role=note]")===null'), true)
  await click('공통 대화상자'); await click('닫기')
  assert.equal(await evaluate('document.activeElement.textContent.trim()'), '공통 대화상자')
  assert.equal(await evaluate('document.documentElement.scrollWidth<=393'), true)
  passed.push('Both themes preserve input identity; all six original icons render 32px; help and Dialog restore keyboard behavior')
  const manifest = JSON.parse(await readFile('docs/product/assets/exercise-icons/manifest.json', 'utf8'))
  const sw = await readFile('dist/sw.js', 'utf8'), config = JSON.parse(sw.match(/const shell = (\{[^\n]+\})/)[1])
  const icons = manifest.icons.map(icon => ({ icon, asset: config.assets.find(asset => asset.path.startsWith('/assets/' + icon.file.slice(0, -4) + '-')) }))
  for (const { icon, asset } of icons) { assert.ok(asset); assert.equal(createHash('sha256').update(await readFile(resolve('dist', '.' + asset.path))).digest('hex'), icon.sha256) }
  assert.equal(config.assets.some(asset=>asset.path.includes('FoundationPreview')), false)
  const productionOrigin = `http://127.0.0.1:${production.address().port}`
  await cdp.send('Page.navigate', { url: productionOrigin + '/' })
  await wait(() => evaluate('navigator.serviceWorker.getRegistration().then(r=>!!r?.active)'), 'production worker activation')
  await cdp.send('Page.reload')
  await wait(() => evaluate('!!navigator.serviceWorker.controller'), 'controlled production page')
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  const cached = await evaluate(`Promise.all(${JSON.stringify(icons.map(x => x.asset.path))}.map(async path=>{const r=await fetch(path);const data=await r.arrayBuffer();return {ok:r.ok,sha:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('')}}))`)
  cached.forEach((value, index) => { assert.ok(value.ok); assert.equal(value.sha, icons[index].icon.sha256) })
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  passed.push('Production bundle and active service worker serve all six byte-identical PNGs with the network offline')
  await writeFile(resolve(directory, 'browser-result.json'), JSON.stringify({ passed, browser: 'isolated headless Chrome', viewport: '393x852 CSS px', backend: 'simulated HTTP responses; no real DB', realIPhone: false }, null, 2))
  console.log(JSON.stringify({ passed, screenshots: directory }, null, 2))
} catch (error) {
  errors.push(String(error)); console.error(error)
  if (cdp) { try { const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }); await writeFile(resolve(directory, 'failure.png'), Buffer.from(shot.data, 'base64')); await writeFile(resolve(directory, 'failure.txt'), await cdp.eval('document.body.innerText')) } catch { /* preserve original failure */ } }
  process.exitCode = 1
} finally {
  if (cdp) { try { await cdp.send('Browser.close') } catch { /* browser already closed */ } cdp.ws.close() }
  if (browser && browser.exitCode === null) await browserExit
  await dev.close(); await new Promise(r => { production.close(r); production.closeAllConnections() })
  const owned = relative(directory, profile)
  assert(!isAbsolute(owned) && /^profile-[a-f0-9-]+$/.test(owned))
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  if (errors.length) await writeFile(resolve(directory, 'errors.json'), JSON.stringify(errors))
}
