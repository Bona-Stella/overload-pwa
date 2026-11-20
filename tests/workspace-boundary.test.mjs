import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

test('real React reconciliation removes statistics across workout, account, generation and late-response boundaries', { timeout: 60000 }, async () => {
  const directory = resolve('logs/workspace-boundary'), profile = resolve(directory, 'profile-' + crypto.randomUUID())
  await mkdir(profile, { recursive: true })
  const stub = `import {createElement, useState} from 'react';
    import {WorkoutSummary} from '/src/features/workout-flow/WorkoutSummary.tsx';
    import {SavedWeightReview} from '/src/features/workout-online/SavedWeightReview.tsx';
    import {summaryData} from '/src/features/workout-online/summary-data.ts';
    const reviewApi = {weightReview: (...args) => window.boundaryWeightReview(...args)};
    export class WorkoutApi {cardioActivities=async()=>[];closed=async()=>({sessions:[]});};
    export class WorkoutOnlineController { getSnapshot=()=>window.boundaryState; subscribe=()=>()=>{}; connect=()=>()=>{}; invalidateScope=()=>{}; }
    export class StatisticsApi { overview=(scope,period,signal)=>window.boundaryOverview(scope,period,signal); }
    export function useTrainingSchedule(){return {loading:false,canWrite:false,refresh:()=>{}}};
    export const PresetAssignmentEditor=()=>null,LocalWorkoutScreen=()=>null,WorkoutHistory=()=>null;
    export function ClosedWorkout({session, summary, onBack, takeInitialScroll}) {
      const [loaded, setLoaded] = useState(false);
      const [reviewAttempt, setReviewAttempt] = useState(0);
      return createElement('section', {'data-boundary-summary': String(summary), style: {minHeight: '200vh'}}, loaded
        ? createElement(WorkoutSummary, {...summaryData(session, null), manufacturers: [], detail: !summary, onBack, takeInitialScroll,
          reviewContent: createElement('div', {'data-boundary-review': true}, createElement(SavedWeightReview, {
            key: reviewAttempt, api: reviewApi, session, readOnly: !summary, disabled: false, authorized: () => true}))},
          createElement('button', {id: 'test-reopen-weight-review', onClick: () => setReviewAttempt(n => n + 1)}, '검토 다시 열기'))
        : createElement('button', {id: 'test-load-finished-record', onClick: () => setLoaded(true)}, '종료 기록 로드'));
    }
    export const offlineAccess={scope:async()=>{},source:async()=>null};`
  const replaced = new Set(['./api.ts', './controller.ts', '../statistics/api.ts', './useTrainingSchedule.ts', '../statistics/WeeklySchedulePanel.tsx', '../workout-local/LocalWorkoutScreen.tsx', './ClosedWorkout.tsx', '../workout-local/offline.ts'])
  const server = await createServer({ configFile: false, envDir: false, cacheDir: resolve(directory,'vite-cache'), plugins: [{ name: 'workspace-component-only', enforce: 'pre',
    resolveId(id, importer) { if (importer?.endsWith('/WorkoutWorkspace.tsx') && replaced.has(id)) return '\0workspace-boundary-stub' },
    load(id) { if (id === '\0workspace-boundary-stub') return stub },
    configureServer(vite) { vite.middlewares.use('/boundary', async (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml('/boundary', '<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="/tests/fixtures/workspace-boundary.jsx"></script></body></html>')) }) },
  }, react()], server: { host: '127.0.0.1', port: 0, watch: { ignored: ['**/logs/**'] } }, clearScreen: false })
  let browser, ws, next = 0
  const pending = new Map()
  const wait = async fn => { const until = Date.now() + 12000; while (Date.now() < until) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 30)) } throw Error('Component DOM transition timeout') }
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? 'Component error'); return r.result.value }
  const count = () => evaluate('document.querySelectorAll(".statistics").length')
  const activity = async () => {
    await evaluate("[...document.querySelectorAll('[aria-label=\"운동 분석 메뉴\"] button')].find(b=>b.getAttribute('aria-label')==='운동 현황')?.click()")
  }
  const render = async (owner = 'A', generation = '0', active = false) => { await evaluate(`window.renderBoundary(${JSON.stringify(owner)},${JSON.stringify(generation)},${active})`); await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'); await activity() }
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
    await wait(() => evaluate(`typeof window.renderBoundary==="function"&&!!document.querySelector('[aria-label="운동 분석 메뉴"]')`))
    await activity()
    await wait(() => evaluate('document.querySelector(".statistics")?.innerText.includes("7세트")'))
    for (let i = 0; i < 3; i++) {
      await render('A', '0', true); assert.equal(await count(), 0, 'ACTIVE must remove the statistics DOM')
      await render(); await wait(() => evaluate('document.querySelector(".statistics")?.innerText.includes("7세트")'))
      assert.equal(await count(), 1, 'FINISH must mount exactly one statistics panel')
    }
    await render('logout'); assert.equal(await count(), 0, 'logout must remove every old statistics node')
    await render('B'); await wait(() => evaluate('document.querySelector(".statistics")?.innerText.includes("0세트")'))
    assert.equal(await count(), 1); assert.equal(await evaluate('document.body.innerText.includes("7세트")'), false)
    await render(); await wait(() => evaluate('document.querySelector(".statistics")?.innerText.includes("7세트")'))
    await evaluate('window.holdBoundaryRequest=true'); await render('A', '0', true); await render()
    await wait(() => evaluate('window.boundaryRequests.at(-1).held===true'))
    await render('B'); await evaluate('window.releaseBoundaryResponses()'); await wait(() => evaluate('document.querySelector(".statistics")?.innerText.includes("0세트")'))
    assert.equal(await evaluate('window.boundaryRequests.findLast(r=>r.held).signal.aborted'), true)
    assert.equal(await evaluate('document.body.innerText.includes("7세트")'), false)
    await render('A', '1'); await wait(() => evaluate('document.querySelector(".statistics")?.innerText.includes("0세트")'))
    assert.equal(await count(), 1); await render('expired'); assert.equal(await count(), 0)
    await send('Page.reload'); await wait(() => evaluate('document.querySelector(".statistics")?.innerText.includes("7세트")')); assert.equal(await count(), 1)
    await evaluate("window.renderBoundary('A','0',true,true)")
    await wait(() => evaluate('!!document.querySelector("#test-open-workout")'))
    await evaluate('document.querySelector("#test-open-workout").click()')
    await wait(() => evaluate("document.body.innerText.includes('세션 상태·편집 기기 확인')"))
    await evaluate("window.renderBoundary('A','0','finished',true)")
    await wait(() => evaluate('!!document.querySelector("[data-boundary-summary=true]")'))
    const finishedEntry = await evaluate('history.state.overloadNavigation')
    assert.equal(finishedEntry.values['boundary-tab'], 'history')
    assert.equal(Object.keys(finishedEntry.values).some(key => key.startsWith('workout-view:')), false)
    await evaluate('document.scrollingElement.scrollTo({top: 300, behavior: "instant"})')
    assert.equal(await evaluate('document.scrollingElement.scrollTop'), 300)
    await evaluate('document.querySelector("#test-load-finished-record").click()')
    await wait(() => evaluate('document.querySelector("[data-boundary-summary=true] h1")?.textContent === "운동 기록 요약" && document.scrollingElement.scrollTop === 0'))
    assert.equal(await evaluate('document.scrollingElement.scrollTop'), 0, 'the summary resets the inherited scroll after asynchronous record loading')
    const review = '[data-boundary-review]'
    const reviewText = () => evaluate(`document.querySelector('${review}').textContent`)
    const finishReview = async scenario => {
      await wait(() => evaluate('typeof window.finishBoundaryWeightReview === "function"'))
      await evaluate(`window.finishBoundaryWeightReview(${JSON.stringify(scenario)})`)
    }
    await wait(async () => (await reviewText()).includes('당시 중량 검토 확인 중'))
    await finishReview('error')
    await wait(() => evaluate(`!!document.querySelector('${review} [role="alert"]')`))
    assert.match(await reviewText(), /조회하지 못했습니다.*다시 조회/)
    await evaluate(`document.querySelector('${review} button').click()`)
    await finishReview('empty')
    await wait(async () => (await reviewText()) === '')
    for (const scenario of ['maintain', 'unavailable', 'blocked', 'candidate']) {
      await evaluate('document.querySelector("#test-reopen-weight-review").click()')
      await wait(async () => (await reviewText()).includes('당시 중량 검토 확인 중'))
      await finishReview(scenario)
      if (scenario === 'candidate') await wait(async () => /중량 검토.*벤치프레스.*25kg → 30kg/.test(await reviewText()))
      else await wait(async () => (await reviewText()) === '')
    }
    assert.equal(await evaluate("[...document.querySelectorAll('[data-boundary-summary] button')].some(button => button.textContent.trim() === '운동 기록 상세')"), false)
    await evaluate('document.querySelector("[data-boundary-summary] button").click()')
    await wait(() => evaluate('!document.querySelector("[data-boundary-summary]")&&!!document.querySelector("[aria-label=홈]")'))
    assert.equal(await evaluate('document.body.innerText.includes("운동 이어가기")'), false)
    await evaluate('history.forward()')
    await wait(() => evaluate('!!document.querySelector("[data-boundary-summary=true]")'))
  } catch(error){if(ws?.readyState===1){try{console.error('Boundary DOM:',await evaluate('document.body.innerText'));console.error('Boundary requests:',await evaluate('window.boundaryRequests'))}catch{}}throw error} finally {
    if (ws?.readyState === 1) { try { await send('Browser.close') } catch { /* closed */ } }
    if (browser?.exitCode === null) await new Promise(r => browser.once('exit', r))
    ws?.close(); await server.close()
    const own = relative(directory, profile)
    assert(!isAbsolute(own) && /^profile-[a-f0-9-]+$/.test(own))
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
