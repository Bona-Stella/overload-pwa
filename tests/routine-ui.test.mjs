import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

test('routine editor confirms conflicting weekdays, persists tags and catalog identity, and retries only the failed schedule', { timeout: 60000 }, async () => {
  const directory = resolve('logs/routine-ui'), profile = resolve(directory, 'profile-' + crypto.randomUUID())
  await mkdir(profile, { recursive: true })
  const server = await createServer({ configFile: false, envDir: false, cacheDir: resolve(directory,'vite-cache'), plugins: [{ name: 'routine-component-only', enforce: 'pre',
    configureServer(vite) { vite.middlewares.use('/boundary', async (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml('/boundary', '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/routine-ui.jsx"></script></body></html>')) }) },
  }, react()], server: { host: '127.0.0.1', port: 0, watch: { ignored: ['**/logs/**'] } }, clearScreen: false })
  let browser, ws, next = 0
  const pending = new Map()
  const wait = async fn => { const until = Date.now() + 12000; while (Date.now() < until) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 30)) } throw Error('Component DOM transition timeout') }
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? 'Component error'); return r.result.value }
  try {
    await server.listen()
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`
    browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
    const port = await wait(async () => { try { return Number((await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { return false } })
    const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page')
    ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
    ws.onmessage = e => { const m = JSON.parse(e.data), p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result) } }
    ws.onclose = () => { for (const p of pending.values()) p.reject(Error('Browser closed')); pending.clear() }
    await send('Page.enable'); await send('Page.navigate', { url: origin + '/boundary' })

    await wait(()=>evaluate('!!window.ui'),'fixture loaded')
    const click=async text=>{await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled).click()`);await new Promise(r=>setTimeout(r,80))}
    const input=async(selector,value)=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}))})()`);await new Promise(r=>setTimeout(r,80))}

    await click('월')
    await click('+ 웨이트 종목 추가');await input('[role="combobox"]','bench');await evaluate(`document.querySelector('[role="option"]').click()`);await new Promise(r=>setTimeout(r,80));assert.equal(await evaluate(`document.querySelectorAll('[aria-label^="웨이트 "]').length`),3)
    await input('[aria-label="웨이트 3"] input[inputmode="decimal"]','2.500001');await click('+2.5');assert.equal(await evaluate(`document.querySelector('[aria-label="웨이트 3"] input[inputmode="decimal"]').value`),'5.000001')
    await evaluate(`document.querySelector('[aria-label="웨이트 3"] button').click()`);await new Promise(r=>setTimeout(r,80))
    await evaluate(`document.querySelector('summary').click()`);await click('PUSH가슴·어깨·삼두 중심의 밀기 운동')
    await evaluate(`[...document.querySelector('[aria-label="웨이트 2"]').querySelectorAll('button')].find(b=>b.textContent.includes('위로')).click()`);await new Promise(r=>setTimeout(r,80))
    await click('유산소 추가');await click('달리기');await input('[aria-label="유산소 1"] select','ca000000-0000-4000-8000-000000000001')
    await evaluate(`(()=>{const e=[...document.querySelectorAll('[aria-label="유산소 1"] label')].find(l=>l.textContent.includes('목표 시간')).querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'2.5');e.dispatchEvent(new Event('input',{bubbles:true}))})()`);await new Promise(r=>setTimeout(r,80))
    await click('루틴 저장');assert.equal(await evaluate('window.ui.saved.length'),0);assert.match(await evaluate('document.querySelector("dialog").textContent'),/기존 PUSH/)
    await click('취소');await click('루틴 저장');await click('교체 확인');assert.equal(await evaluate('window.ui.saved.length'),1)
    assert.equal(await evaluate('window.ui.saved[0].cardioPlacements[0].plan.targetSeconds'),150)
    assert.equal(await evaluate('window.ui.saved[0].cardioPlacements[0].plan.activityId'),'ca000000-0000-4000-8000-000000000001')
    assert.equal(await evaluate('window.ui.saved[0].weightPlacements[0].id'),await evaluate('window.ui.secondId'))
    assert.equal(await evaluate('window.ui.saved[0].tag'),'PUSH');assert.equal(await evaluate('window.ui.closed'),0)
    await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true})
    assert.equal(await evaluate('document.documentElement.scrollWidth<=393'),true)
    await writeFile(resolve(directory,'editor-393.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'))
    await send('Emulation.setDeviceMetricsOverride',{width:320,height:852,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth<=320'),true)
    await writeFile(resolve(directory,'editor-320.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'))
    await evaluate('window.ui.failSchedule=false');await click('일정 반영 다시 확인');assert.equal(await evaluate('window.ui.saved.length'),1);assert.equal(await evaluate('window.ui.scheduleCalls'),2);assert.equal(await evaluate('window.ui.closed'),1)
    await evaluate('window.ui.showSchedule()');await wait(()=>evaluate('document.body.textContent.includes("현재 일정 · 월")'))
    await evaluate('window.ui.externalSchedule()');await wait(()=>evaluate('document.body.textContent.includes("현재 일정 · 화")'))
    await click('주간 일정 편집');await input('[aria-label="수요일 루틴"]','90000000-0000-4000-8000-000000000001')
    await evaluate('window.ui.showSchedule(2)');await new Promise(r=>setTimeout(r,100))
    assert.equal(await evaluate(`document.querySelector('select[aria-label="수요일 루틴"]').value`),'90000000-0000-4000-8000-000000000001')
    await evaluate('window.ui.activeError=true');await click('일정 저장')
    assert.match(await evaluate('document.querySelector("[role=alert]").textContent'),/진행 중인 운동.*입력은 유지/)
    assert.equal(await evaluate(`document.querySelector('select[aria-label="수요일 루틴"]').value`),'90000000-0000-4000-8000-000000000001')
    await evaluate('window.ui.activeError=false;window.ui.blockSchedule=true');await click('일정 저장');await wait(()=>evaluate('typeof window.ui.resumeSchedule==="function"'))
    await evaluate('window.ui.hideSchedule()');await new Promise(r=>setTimeout(r,80));await evaluate('window.ui.resumeSchedule()');await new Promise(r=>setTimeout(r,80))
    assert.equal(await evaluate('window.ui.panelSaved'),0,'an unmounted account screen must ignore a late schedule response')


  } finally {
    if (ws?.readyState === 1) { try { await send('Browser.close') } catch { /* closed */ } }
    if (browser?.exitCode === null) await new Promise(r => browser.once('exit', r))
    ws?.close(); await server.close()
    const own = relative(directory, profile)
    assert(!isAbsolute(own) && /^profile-[a-f0-9-]+$/.test(own))
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
