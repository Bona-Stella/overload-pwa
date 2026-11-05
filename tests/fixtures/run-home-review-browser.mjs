// Real API browser checks. --design uses the opt-in Vite review app; no response fixture for its data.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
import { verifyV22Ownership, withV22Connection } from './v22-environment.mjs'
import { runHomeDesign } from './home-design-checks.mjs'
import { runHomeDetails } from './home-details-checks.mjs'
import { runHomeFinal } from './home-final-checks.mjs'
import { runHomePolish } from './home-polish-checks.mjs'
const polish = process.argv.includes('--polish')
const final = process.argv.includes('--final')
const details = process.argv.includes('--details')
const design = process.argv.includes('--design') || details || final || polish
const { runId } = JSON.parse(await readFile('logs/home-review/current.json', 'utf8'))
const evidence = JSON.parse(await readFile(resolve('../overload-server/build/verification-v22', runId, 'home-review.json'), 'utf8'))
await verifyV22Ownership(evidence)
assert.equal((await (await fetch('http://127.0.0.1:3000/__home_review')).json()).runId, runId)
const directory = resolve('logs/home-review', runId, ...(design ? [polish ? 'home-polish-20261106' : final ? 'home-final-20261106' : details ? 'home-details-20261106' : 'design-review'] : []))
await mkdir(directory, { recursive: true })
const resumePath = resolve(directory, 'test-profile.json')
let profileName = 'profile-' + crypto.randomUUID()
if (design) { try { const saved=JSON.parse(await readFile(resumePath,'utf8')); if (/^profile-[a-f0-9-]+$/.test(saved.name)) profileName=saved.name } catch { /* new isolated test profile */ } }
const profile = resolve(directory, profileName)
if (design) await writeFile(resumePath, JSON.stringify({name:profileName}))
await mkdir(profile, { recursive: true })
let browser, ws, next = 0, fault = null
const pending = new Map(), requests = [], requestMethods = new Map(), responseIds = new Map(), paused = [], passed = [], errors = []
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function wait(fn, label, timeout = 20000) { const until = Date.now() + timeout; while (Date.now() < until) { const value = await fn(); if (value) return value; await sleep(80) } throw Error('Timeout: ' + label) }
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? 'Browser evaluation failed'); return r.result.value }
const click = text => wait(() => evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled&&b.getClientRects().length);if(!b)return false;b.click();return true})()`), 'button ' + text)
async function input(selector, value) { await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`); await sleep(100) }
async function api(method, path, body) {
  return evaluate(`(async()=>{const h={'Accept':'application/json'};if(${JSON.stringify(method)}!=='GET'){const c=await(await fetch('/api/v1/auth/csrf',{cache:'no-store'})).json();h[c.headerName]=c.token}const b=${JSON.stringify(body ?? null)};if(b!==null)h['Content-Type']='application/json';const r=await fetch(${JSON.stringify(path)},{method:${JSON.stringify(method)},headers:h,body:b===null?undefined:JSON.stringify(b),cache:'no-store'});const t=await r.text();return {status:r.status,body:t?JSON.parse(t):null}})()`)
}
async function screenshot(name, selector) {
  const viewport = await evaluate('({width:innerWidth,height:innerHeight})')
  if (selector) await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'})`)
  else {
    await evaluate('window.scrollTo(0,0)')
    await send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: (await send('Page.getLayoutMetrics')).cssContentSize.height, deviceScaleFactor: 1, mobile: viewport.width < 600 })
  }
  await sleep(100)
  const clip = selector ? await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,scale:1}})()`)
    : { x: 0, y: 0, width: await evaluate('innerWidth'), height: (await send('Page.getLayoutMetrics')).cssContentSize.height, scale: 1 }
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip })
  await writeFile(resolve(directory, name + '.png'), Buffer.from(shot.data, 'base64'))
  if (!selector) await send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1, mobile: viewport.width < 600 })
}
async function login(email) {
  await wait(() => evaluate('!!document.querySelector("#auth-email")'), 'login')
  await input('#auth-email', email); await click('이메일로 계속하기')
  await wait(() => evaluate(`(()=>{if(document.querySelector('#auth-code:not(:disabled)'))return true;const resend=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='인증코드 재발송'&&!b.disabled);resend?.click();return false})()`), 'OTP delivery (including real resend cooldown)', 90000)
  const id = responseIds.get('/api/v1/auth/email-otp/request')
  const issued = JSON.parse((await send('Network.getResponseBody', { requestId: id })).body)
  const message = email === evidence.reviewEmail ? await (async () => {
    const inbox = await (await fetch(evidence.inboxOrigin + '/inbox', { method: 'POST', headers: { 'X-Review-Run': runId } })).json()
    assert.equal(inbox.messages.length, 1); assert.equal(inbox.messages[0].challengeId, issued.challengeId)
    return inbox.messages[0]
  })() : await withV22Connection(evidence, 'control', async request => {
    const r = await request('/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, JSON.stringify({ issuanceId: issued.challengeId }))
    assert.equal(r.statusCode, 200)
    return JSON.parse(Buffer.concat(await Array.fromAsync(r)).toString())
  })
  await input('#auth-code', message.code); await click('코드 확인')
  await wait(() => evaluate('document.querySelectorAll("nav button").length===4 && !!document.querySelector("[aria-label=홈]")'), 'authenticated shell')
}
try {
  await rm(resolve(profile, 'DevToolsActivePort'), { force: true })
  browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--no-first-run','--no-default-browser-check','--disable-background-networking','--user-data-dir=' + profile,'about:blank'], { windowsHide: true, stdio: 'ignore' })
  const port = await wait(async () => { try { return Number((await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { return false } }, 'Chrome')
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page')
  ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r,j) => { ws.onopen = r; ws.onerror = j })
  ws.onmessage = event => {
    const m = JSON.parse(event.data), p = pending.get(m.id)
    if (p) { pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); return }
    if (m.method === 'Network.requestWillBeSent') requestMethods.set(m.params.requestId,m.params.request.method)
    if (m.method === 'Network.responseReceived') { const u = new URL(m.params.response.url); if (u.pathname.startsWith('/api/')) { responseIds.set(u.pathname, m.params.requestId); requests.push({ path: u.pathname, method: requestMethods.get(m.params.requestId), status: m.params.response.status }) } }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? 'Browser runtime exception')
    if (m.method === 'Fetch.requestPaused') {
      if (fault === 'hold') paused.push(m.params.requestId)
      else if (fault === 'error') void send('Fetch.fulfillRequest', { requestId: m.params.requestId, responseCode: 503, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify({ code: 'VERIFICATION_FAULT' })).toString('base64') })
      else void send('Fetch.continueRequest', { requestId: m.params.requestId })
    }
  }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Seoul' })
  await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true })
  if (design) {
    await (polish ? runHomePolish : final ? runHomeFinal : details ? runHomeDetails : runHomeDesign)({ send, evaluate, click, api, screenshot, wait, passed, directory, evidence, requests })
  } else {
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/' })
  await login(evidence.reviewEmail)
  await wait(() => evaluate(`!!document.querySelector('[aria-label="이번 주 일정"]') && document.querySelectorAll('[aria-label="최근 운동"] button').length===4`), 'real populated home')
  const homeText = await evaluate('document.querySelector("[aria-label=홈]").innerText')
  assert.match(homeText, /WEIGHT/); assert.match(homeText, /CARDIO/); assert.match(homeText, /종료 당시 최초 계획/)
  assert.equal(await evaluate('document.documentElement.scrollWidth<=393'), true)
  assert.equal(await evaluate(`document.querySelector('[aria-label="오늘의 루틴"]').contains([...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='운동 시작'))`), false)
  await screenshot('home-full-393'); await screenshot('today-routine-393', '[aria-label="오늘의 루틴"]'); await screenshot('weekly-393', '[aria-label="이번 주 일정"]')
  passed.push('Real OTP login; three routines and three real completed records; mobile home without horizontal overflow; CTA outside hero')
  await evaluate(`document.querySelectorAll('[aria-label="최근 운동"] button')[1].click()`)
  await wait(() => evaluate(`!!document.querySelector('.closed-workout') && document.querySelector('.closed-workout').getClientRects().length>0`), 'existing record detail')
  await click('홈')
  passed.push('Home recent record opens the existing real record detail in the history tab')
  const scheduleBefore = (await api('GET', '/api/v1/weekly-schedule?timeZone=Asia%2FSeoul')).body
  await evaluate('document.querySelector("[aria-label=홈] details").open=true')
  await wait(() => evaluate('document.querySelector("[aria-label=홈] details button")?.getClientRects().length'), 'routine chooser')
  await screenshot('routine-chooser-393')
  const chosenName = await evaluate('(()=>{const b=[...document.querySelectorAll("[aria-label=홈] details button")].find(b=>b.getAttribute("aria-pressed")==="false"&&!b.disabled);window.homeChosenName=b.querySelector("strong").textContent;b.click();return window.homeChosenName})()')
  await wait(() => evaluate(`document.querySelector('[aria-label="오늘의 루틴"] h2').textContent===${JSON.stringify(chosenName)}`), 'today-only selection')
  assert.deepEqual((await api('GET', '/api/v1/weekly-schedule?timeZone=Asia%2FSeoul')).body, scheduleBefore)
  await screenshot('before-start-393'); passed.push('Today-only routine changes the real plan while current and pending schedule versions remain byte-equivalent')
  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 740, deviceScaleFactor: 1, mobile: true })
  assert.equal(await evaluate('document.documentElement.scrollWidth<=320'), true); await screenshot('home-small-320')
  await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true })
  await click('기록'); await wait(() => evaluate('document.body.innerText.includes("운동 기록·분석")'), 'record tab')
  await click('홈')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  assert.equal(await evaluate('document.documentElement.scrollWidth<=1440'), true); await screenshot('home-desktop-1440')
  await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true })
  await click('운동 시작')
  await wait(() => evaluate('!!document.querySelector(".local-workout") && document.querySelectorAll("nav").length===0'), 'real START and existing editor')
  const active = (await api('GET', '/api/v1/workout-sessions/active')).body.session
  assert.equal(active.initialPlan.routineName, chosenName)
  await screenshot('workout-entry-393'); passed.push('Real START creates the selected routine snapshot, durable local editor and focused workout')
  // Clean this test-created session through production FINISH + logical delete, never SQL.
  const finished = await api('POST', `/api/v1/workout-sessions/${active.id}/finish`, { dataGeneration: active.dataGeneration, editorDeviceId: active.editorDeviceId, writerEpoch: active.writerEpoch, localRevision: (BigInt(active.localRevision) + 1n).toString(), snapshot: active.snapshot.state, endedAt: new Date().toISOString() })
  assert.equal(finished.status, 200)
  const final = (await api('GET', `/api/v1/workout-sessions/${active.id}`)).body
  assert.equal((await api('DELETE', `/api/v1/workout-sessions/${active.id}`, { dataGeneration: final.dataGeneration, expectedVersion: final.version })).status, 200)
  assert.equal((await api('GET', '/api/v1/workout-sessions/active')).body.session, null)
  await send('Page.reload'); await wait(() => evaluate(`document.querySelectorAll('nav button').length===4 && !!document.querySelector('[aria-label="오늘의 루틴"]')`), 'loaded home after cleanup')
  // Controlled browser-only faults exercise UI feedback; these screenshots are explicitly labelled.
  fault = 'hold'; await send('Fetch.enable', { patterns: [{ urlPattern: '*api/v1/weekly-schedule*', requestStage: 'Request' }] })
  await click('새로고침'); await wait(() => evaluate('document.querySelector("[aria-label=홈]").innerText.includes("불러오고 있습니다")'), 'loading feedback')
  await screenshot('loading-injected-393')
  fault = null; for (const requestId of paused.splice(0)) await send('Fetch.continueRequest', { requestId }); await send('Fetch.disable')
  await wait(() => evaluate(`!!document.querySelector('[aria-label="오늘의 루틴"]')`), 'loading recovery')
  fault = 'error'; await send('Fetch.enable', { patterns: [{ urlPattern: '*api/v1/weekly-schedule*', requestStage: 'Request' }] })
  await click('새로고침'); await wait(() => evaluate('document.querySelector("[aria-label=홈]").innerText.includes("홈 정보를 불러오지 못")'), 'error feedback')
  await screenshot('error-injected-393'); fault = null; await send('Fetch.disable'); await click('홈 다시 불러오기')
  await wait(() => evaluate(`!!document.querySelector('[aria-label="오늘의 루틴"]')`), 'error recovery')
  passed.push('Controlled delayed/503 schedule response shows loading/error with explicit retry and recovers to real data')
  await api('POST', '/api/v1/auth/logout')
  await send('Network.clearBrowserCookies'); await send('Page.reload')
  await login(`v22-${runId}@example.invalid`)
  await wait(() => evaluate('document.querySelector("[aria-label=홈]")?.innerText.includes("표시할 운동 기록이 없습니다")'), 'real empty account')
  await screenshot('empty-real-account-393')
  assert.equal(await evaluate('[...document.querySelectorAll("[aria-label=홈] button")].find(b=>b.textContent.trim()==="운동 시작").disabled'), true)
  passed.push('Existing isolated empty account uses real OTP/API and shows no fabricated plan/history; START disabled')
  assert.deepEqual(errors, [])
  await verifyV22Ownership(evidence)
  await writeFile(resolve(directory, 'browser-result.json'), JSON.stringify({ runId, passed, requests, realData: true, faultScreenshots: ['loading-injected-393','error-injected-393'], reviewAccountActiveSessionAfterTest: null, browser: 'headless Chrome', realIPhone: false }, null, 2))
  console.log(JSON.stringify({ passed, screenshots: directory }, null, 2))
  }
} catch (error) {
  await writeFile(resolve(directory, 'failure-requests.json'), JSON.stringify({ requests, errors }, null, 2))
  if (ws?.readyState === 1) { try { await screenshot('failure'); await writeFile(resolve(directory, 'failure.txt'), await evaluate('document.body.innerText')) } catch { /* retain original error */ } }
  console.error(error); process.exitCode = 1
} finally {
  if (ws?.readyState === 1) { try { await send('Browser.close') } catch { /* browser closed */ } ws.close() }
  if (browser?.exitCode === null && browser?.signalCode === null) { browser.kill(); await new Promise(r => browser.once('exit', r)) }
  const own = relative(directory, profile)
  assert(!isAbsolute(own) && /^profile-[a-f0-9-]+$/.test(own))
  if (!design || process.exitCode !== 1) { await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); if (design) await rm(resumePath,{force:true}) }
}
