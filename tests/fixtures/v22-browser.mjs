// Uses the existing Node/CDP approach against real production bytes and a verified disposable backend.
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
import { preview } from 'vite'
import { readV22Ready, verifyV22Ownership, withV22Connection } from './v22-environment.mjs'
import { pwaWriteProxy } from './v22-pwa-proxy.mjs'
const sleep = ms => new Promise(r => setTimeout(r, ms))
export async function waitFor(fn, label, timeout = 20000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) { const result = await fn(); if (result) return result; await sleep(100) }
  throw new Error('Timeout: ' + label)
}
export async function launchV22Browser(runId, frontendRoot = '.', options = {}) {
  const evidence = await readV22Ready(runId, frontendRoot), directory = resolve(frontendRoot, 'logs/verification-v22', runId)
  const proxy = pwaWriteProxy(evidence)
  await mkdir(directory, { recursive: true })
  // Cache Storage adds deeply nested paths on Windows; keep the PWA test profile root short.
  const profileRoot = options.shortProfile ? resolve(frontendRoot, 'logs/pwa-profiles') : directory
  await mkdir(profileRoot, { recursive: true })
  const profile = resolve(profileRoot, 'browser-profile-' + (options.shortProfile ? crypto.randomUUID().slice(0, 8) : crypto.randomUUID()))
  await mkdir(profile)
  let server, browser, ws, devtoolsPort, targetId, offline = false, next = 0
  const browserPids = [], workerErrors = []
  const pending = new Map(), requests = [], rows = new Map(), notes = []
  const driver = {
    evidence, proxy, profile, directory, requests, notes, browserPids, workerErrors,
    send(method, params = {}) { return new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) }) },
    async evaluate(expression) { const r = await driver.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? 'Browser evaluation failed'); return r.result.value },
    async text(selector = 'body') { return driver.evaluate(`document.querySelector(${JSON.stringify(selector)})?.innerText`) },
    async responseForLast(path) { const entry = [...rows].reverse().find(([, r]) => r.path === path && r.status); if (!entry) throw Error('Response not observed'); const r = await driver.send('Network.getResponseBody', { requestId: entry[0] }); return JSON.parse(r.body) },
    async click(text, scope = 'body') { await waitFor(() => driver.evaluate(`(()=>{const e=[...document.querySelector(${JSON.stringify(scope)})?.querySelectorAll('button')??[]].find(e=>e.textContent.trim()===${JSON.stringify(text)}&&!e.disabled);if(!e)return false;e.click();return true})()`), 'enabled button'); await sleep(120) },
    async input(selector, value) { await driver.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)throw Error('Input unavailable');const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));e.focus()})()`); await sleep(80) },
    async labelInput(label, value, scope = 'body') { await driver.evaluate(`(()=>{document.querySelector('[data-v22-input]')?.removeAttribute('data-v22-input');const l=[...document.querySelectorAll(${JSON.stringify(scope + ' label')})].find(e=>e.textContent.trim().startsWith(${JSON.stringify(label)}));if(!l)throw Error('Label missing');l.querySelector('input,select').setAttribute('data-v22-input','yes')})()`); await driver.input('[data-v22-input]', value) },
    async api(method, path, body, csrf = true) { return driver.evaluate(`(async()=>{const h={'Accept':'application/json'};${csrf && method !== 'GET' ? "const c=await(await fetch('/api/v1/auth/csrf',{cache:'no-store'})).json();h[c.headerName]=c.token;" : ''}const b=${JSON.stringify(body ?? null)};if(b!==null)h['Content-Type']='application/json';const r=await fetch(${JSON.stringify(path)},{method:${JSON.stringify(method)},headers:h,body:b===null?undefined:JSON.stringify(b),cache:'no-store'});const t=await r.text();return {status:r.status,body:t?JSON.parse(t):null}})()`) },
    async control(action, body) {
      await withV22Connection(evidence, 'backend')
      return withV22Connection(evidence, 'control', async send => {
        const response = await send('/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, JSON.stringify(body))
        if (response.statusCode !== 200) throw Error('Fixture command failed')
        return JSON.parse(await Array.fromAsync(response).then(chunks => Buffer.concat(chunks).toString()))
      })
    },
    async setOffline(value) {
      offline = value
      if (!offline) await startPreview()
      await network()
      if (offline) await stopPreview()
    },
    async restartBrowser() { await stopBrowser(); await startBrowser() },
    async openSecondTab() {
      const previous = targetId, target = await driver.send('Target.createTarget', { url: 'about:blank' })
      await attach(target.targetId); await network(); await driver.send('Page.navigate', { url: 'http://127.0.0.1:3000/' })
      return previous
    },
    async closeTabAndSelect(previous) { try { await driver.send('Target.closeTarget', { targetId }) } catch { /* target detached */ } await attach(previous); await network() },
    async close() {
      try { await stopBrowser() } finally { await stopPreview() }
      const ownProfile = relative(profileRoot, profile)
      if (isAbsolute(ownProfile) || ownProfile.startsWith('..') || !/^browser-profile-[a-f0-9-]+$/.test(ownProfile)) throw Error('Profile cleanup boundary mismatch')
      await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
      await writeFile(resolve(directory, 'browser-result-' + ownProfile + '.json'), JSON.stringify({ runId, backendOrigin: evidence.backendOrigin, frontendOrigin: 'http://127.0.0.1:3000', browserPid: browserPids.at(-1), browserPids, previewPid: process.pid, profile, notes, requests, workerErrors, stopped: true, profileRemoved: true }, null, 2))
      proxy.assertConnected()
      await verifyV22Ownership(evidence)
    },
  }
  async function startPreview() {
    if (server) return
    await verifyV22Ownership(evidence)
    server = await preview({ root: frontendRoot, configFile: false, envDir: false, plugins: [proxy.plugin], preview: { host: '127.0.0.1', port: 3000, strictPort: true }, clearScreen: false })
  }
  async function stopPreview() {
    if (!server) return
    const http = server.httpServer; server = undefined
    await new Promise((resolve, reject) => { http.close(e => e ? reject(e) : resolve()); http.closeAllConnections() })
  }
  const network = () => driver.send('Network.emulateNetworkConditions', { offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  async function attach(id) {
    if (ws?.readyState === 1) await new Promise(r => { ws.addEventListener('close', r, { once: true }); ws.close() })
    const target = await waitFor(async () => (await (await fetch(`http://127.0.0.1:${devtoolsPort}/json/list`)).json()).find(t => t.type === 'page' && (!id || t.id === id)), 'page target')
    targetId = target.id
    ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
    ws.onmessage = event => {
      const m = JSON.parse(event.data), p = pending.get(m.id)
      if (p) { pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); return }
      if (m.method === 'Network.requestWillBeSent') { const u = new URL(m.params.request.url); if (u.origin === 'http://127.0.0.1:3000' && u.pathname.startsWith('/api/')) { const row = { method: m.params.request.method, path: u.pathname, query: u.search }; requests.push(row); rows.set(m.params.requestId, row) } }
      if (m.method === 'Network.responseReceived') { const row = rows.get(m.params.requestId); if (row) row.status = m.params.response.status }
      if (m.method === 'Network.loadingFailed') { const row = rows.get(m.params.requestId); if (row) row.canceled = m.params.canceled === true }
      if (m.method === 'ServiceWorker.workerErrorReported') workerErrors.push(m.params.errorMessage.errorMessage)
    }
    ws.onclose = () => { for (const p of pending.values()) p.reject(Error('Browser closed')); pending.clear() }
    await driver.send('Page.enable'); await driver.send('Network.enable')
    if (options.workerDiagnostics) await driver.send('ServiceWorker.enable')
  }
  async function startBrowser() {
    await rm(resolve(profile, 'DevToolsActivePort'), { force: true })
    browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--window-size=1280,1000', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
    browserPids.push(browser.pid)
    devtoolsPort = await waitFor(async () => { try { return Number((await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { return false } }, 'CDP readiness')
    await attach(); if (offline) await network()
    await driver.send('Page.navigate', { url: 'http://127.0.0.1:3000/' })
  }
  async function stopBrowser() {
    if (ws?.readyState === 1) { try { await driver.send('Browser.close') } catch { /* exited */ } }
    if (browser?.exitCode === null) {
      await sleep(500)
      if (browser.exitCode === null && browser.signalCode === null) browser.kill()
      await waitFor(() => browser.exitCode !== null || browser.signalCode !== null, 'browser exit', 5000)
    }
    ws?.close(); ws = undefined; browser = undefined
  }
  try {
    await startPreview(); await startBrowser()
    return driver
  } catch (error) { await driver.close(); throw error }
}
