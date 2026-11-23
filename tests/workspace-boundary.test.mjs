import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

test('real React reconciliation respects workout, settings, account, generation and late-response boundaries', { timeout: 60000 }, async () => {
  const directory = resolve('logs/workspace-boundary'), profile = resolve(directory, 'profile-' + crypto.randomUUID())
  await mkdir(profile, { recursive: true })
  const stub = `import {createElement, useEffect, useState} from 'react';
    import {WorkoutSummary} from '/src/features/workout-flow/WorkoutSummary.tsx';
    import {SavedWeightReview} from '/src/features/workout-online/SavedWeightReview.tsx';
    import {summaryData} from '/src/features/workout-online/summary-data.ts';
    const reviewApi = {weightReview: (...args) => window.boundaryWeightReview(...args)};
    export class WorkoutApi {
      cardioActivities=async()=>[];closed=async scope=>({...scope,sessions:window.recordScenario?[window.recordScenario]:[],next:null});detail=async()=>window.recordScenario;
      routine=(...args)=>window.graphBoundary.routine(...args);exerciseDetail=(...args)=>window.graphBoundary.exerciseDetail(...args);
      publicCatalog=async()=>[];
    };
    export class WorkoutOnlineController {
      getSnapshot=()=>window.boundaryState;
      subscribe=listener=>{ const scenario=window.startScenario; scenario?.listeners.add(listener); return ()=>scenario?.listeners.delete(listener); };
      connect=()=>()=>{}; invalidateScope=()=>{}; select=async()=>{};
      start=()=>new Promise(resolve=>{
        const scenario=window.startScenario;
        scenario.posts++;
        scenario.commit=()=>{
          window.boundaryState={...window.boundaryState,active:scenario.session,detail:scenario.session,copySaved:true};
          scenario.listeners.forEach(fn=>fn()); resolve();
        };
      });
    }
    export class StatisticsApi {
      overview=(scope,period,signal)=>window.boundaryOverview(scope,period,signal);
      get growth(){return window.graphBoundary?.growth}
    }
    export function useTrainingSchedule(){return {loading:false,canWrite:!!window.startScenario,schedule:window.graphBoundary?.schedule,refresh:()=>{}}};
    export const PresetAssignmentEditor=()=>null,WorkoutHistory=()=>null;
    export const HomeStartup=()=>createElement('section',{'aria-label':'홈'});
    export const HomePanel=({active,onStart,onOpen,action})=>createElement('section',{'aria-label':'홈'},window.startScenario &&
      createElement('button',{disabled:!!action,onClick:()=>onStart(window.startScenario.routine)},active?'운동 이어가기':'운동 시작'),
      window.recordScenario && createElement('div',{style:{minHeight:'200vh'}},
        createElement('button',{id:'test-home-record',onClick:()=>onOpen(window.recordScenario.id)},'최근 운동')));
    export function LocalWorkoutScreen({server,onOpened,visible}) {
      const [opened,setOpened]=useState(!window.startScenario);
      useEffect(()=>{ if(window.startScenario) window.startScenario.open=()=>{
        setOpened(true);
        onOpened?.(server);
      }; },[server,onOpened]);
      return createElement('section',{hidden:!visible,'data-boundary-editor':true,style:{minHeight:'200vh'}},opened?createElement('button',null,'준비운동 완료'):
        createElement('div',{'data-loading-skeleton':'workout'}));
    }
    export function ClosedWorkout({session = window.recordScenario, summary, onBack, onSettled}) {
      const [loaded, setLoaded] = useState(false);
      const [reviewAttempt, setReviewAttempt] = useState(0);
      return createElement('section', {'data-boundary-summary': String(summary), style: {minHeight: '200vh'}}, loaded
        ? createElement(WorkoutSummary, {...summaryData(session ?? window.recordScenario, null), manufacturers: [], detail: !summary, onBack,
          reviewContent: createElement('div', {'data-boundary-review': true}, createElement(SavedWeightReview, {
            key: reviewAttempt, api: reviewApi, session: session ?? window.recordScenario, readOnly: !summary, disabled: false, authorized: () => true, onReadSettled: onSettled}))},
          createElement('button', {id: 'test-reopen-weight-review', onClick: () => setReviewAttempt(n => n + 1)}, '검토 다시 열기'))
        : createElement('button', {id: 'test-load-finished-record', onClick: () => setLoaded(true)}, '종료 기록 로드'));
    }
    export const offlineAccess={scope:async()=>{},source:async()=>null};`
  const replaced = new Set(['./api.ts', './controller.ts', '../statistics/api.ts', './useTrainingSchedule.ts', '../statistics/WeeklySchedulePanel.tsx', '../workout-local/LocalWorkoutScreen.tsx', './ClosedWorkout.tsx', '../workout-local/offline.ts', '../home/HomePanel.tsx'])
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
    await evaluate(`window.loadedRecordCard=document.querySelector('.record-statistics-body');window.renderBoundary('A','0',false,false,'home')`)
    await wait(() => evaluate("!!document.querySelector('[aria-label=홈]')"))
    await evaluate(`window.renderBoundary('A','0',false,false,'history',true);new Promise(requestAnimationFrame)`)
    assert.equal(await evaluate("document.querySelector('.record-statistics-body') === window.loadedRecordCard && document.body.innerText.includes('이번 주 요약')"), true,
      'returning to Records during a same-account refresh keeps the existing cards mounted and visible')
    await evaluate(`window.renderBoundary('A','0');new Promise(requestAnimationFrame)`)
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
    await wait(() => evaluate("!!document.querySelector('[data-boundary-editor]')?.getClientRects().length"))
    await evaluate('window.scrollTo(0,180)')
    await evaluate(`window.finishFrames=[];window.watchFinish=true;requestAnimationFrame(function sample(){
      if(!window.watchFinish)return;
      window.finishFrames.push({home:!!document.querySelector('[aria-label="홈"]')?.getClientRects().length,
        tabs:!!document.querySelector('nav[aria-label="기본 탐색"]'),skeleton:!!document.querySelector('[data-loading-skeleton="detail"]'),
        editor:!!document.querySelector('[data-boundary-editor]')?.getClientRects().length,scroll:window.scrollY});
      requestAnimationFrame(sample);
    })`)
    await evaluate("window.renderBoundary('A','0','finished',true)")
    await wait(() => evaluate('!!document.querySelector("[data-boundary-summary=true]")'))
    assert.equal(await evaluate('document.querySelector("[data-boundary-summary=true]").closest("[hidden]") !== null'), true)
    assert.equal(await evaluate('document.querySelector("[aria-label=홈]").closest("[hidden]") !== null'), true)
    await wait(() => evaluate('!!document.querySelector(".statistics")'))
    assert.equal(await evaluate('window.scrollY'), 180, 'the hidden records panel must not reset the visible workout scroll')
    await evaluate('document.querySelector("#test-load-finished-record").click()')
    const review = '[data-boundary-review]'
    const reviewText = () => evaluate(`document.querySelector('${review}').textContent`)
    const finishReview = async scenario => {
      await wait(() => evaluate('typeof window.finishBoundaryWeightReview === "function"'))
      await evaluate(`window.finishBoundaryWeightReview(${JSON.stringify(scenario)})`)
    }
    await wait(async () => (await reviewText()).includes('당시 중량 검토 확인 중'))
    assert.equal(await evaluate("document.querySelector('[data-boundary-review]').closest('[hidden]') !== null"), true,
      'core content must stay hidden until the review read settles')
    await wait(() => evaluate('window.finishFrames.some(frame => frame.editor)'))
    await finishReview('error')
    await wait(() => evaluate('history.state.overloadNavigation.values["boundary-tab"] === "history"'))
    const finishedEntry = await evaluate('history.state.overloadNavigation')
    assert.equal(finishedEntry.values['boundary-tab'], 'history')
    assert.equal(Object.keys(finishedEntry.values).some(key => key.startsWith('workout-view:')), false)
    await wait(() => evaluate('document.querySelector("[data-boundary-summary=true] h1")?.textContent === "운동 기록 요약" && document.scrollingElement.scrollTop === 0'))
    const finishFrames = await evaluate('window.watchFinish=false;window.finishFrames')
    assert.deepEqual(finishFrames.filter(frame => frame.home || frame.tabs || frame.skeleton || (frame.editor && frame.scroll !== 180)), [])
    assert.equal(await evaluate('document.scrollingElement.scrollTop'), 0, 'the summary resets the inherited scroll after asynchronous record loading')
    await wait(() => evaluate(`!!document.querySelector('${review} [role="alert"]')`))
    assert.match(await reviewText(), /조회하지 못했습니다.*다시 조회/)
    await evaluate(`document.querySelector('${review} button').click()`)
    await finishReview('empty')
    await wait(async () => (await reviewText()) === '')
    for (const scenario of ['maintain', 'unavailable', 'blocked', 'candidate']) {
      await evaluate('document.querySelector("#test-reopen-weight-review").click()')
      await wait(async () => (await reviewText()).includes('당시 중량 검토 확인 중'))
      await finishReview(scenario)
      if (scenario === 'candidate') await wait(async () => /중량 변경 검토 사항.*벤치프레스.*25kg → 30kg/.test(await reviewText()))
      else await wait(async () => (await reviewText()) === '')
    }
    assert.equal(await evaluate("[...document.querySelectorAll('[data-boundary-summary] button')].some(button => button.textContent.trim() === '운동 기록 상세')"), false)
    await evaluate('document.querySelector("[data-boundary-summary] button").click()')
    await wait(() => evaluate('!document.querySelector("[data-boundary-summary]")&&!!document.querySelector("[aria-label=홈]")'))
    assert.equal(await evaluate('document.body.innerText.includes("운동 이어가기")'), false)
    await evaluate('history.forward()')
    await wait(() => evaluate('!!document.querySelector("[data-boundary-summary=true]")'))
    await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 540, deviceScaleFactor: 1, mobile: false })
    for (const [tab, card] of [['home', '#test-home-record'], ['history', '.session-record-card']]) {
      await evaluate(`window.openRecordBoundary(${JSON.stringify(tab)})`)
      await wait(() => evaluate(`!!document.querySelector('${card}')?.getClientRects().length`))
      const sourceScroll = await evaluate(`(()=>{const card = document.querySelector('${card}'); window.scrollTo(0,180); const before=scrollY; card.click(); return before})()`)
      assert.ok(sourceScroll >= 100, 'the source view must be scrollable')
      await wait(() => evaluate('!!document.querySelector("#test-load-finished-record")'))
      await evaluate('document.querySelector("#test-load-finished-record").click()')
      await wait(async () => (await reviewText()).includes('당시 중량 검토 확인 중'))
      const visible = selector => evaluate(`!!document.querySelector('${selector}')?.getClientRects().length`)
      assert.equal(await visible(card), true)
      assert.equal(await evaluate('scrollY'), sourceScroll, 'scroll is preserved while waiting for review')
      assert.equal(await visible('[data-boundary-summary=false]'), false)
      await finishReview('candidate')
      await wait(() => visible('[data-boundary-summary=false]'))
      assert.equal(await evaluate('scrollY'), 0)
      assert.match(await reviewText(), /중량 변경 승인 이력/)
      await evaluate('history.back()')
      await wait(() => visible(card))
      assert.equal(await evaluate('scrollY'), sourceScroll, 'Back restores the originating scroll position')
    }
    await evaluate('window.openGraphBoundary()')
    const graphMenu = '[aria-label="운동 분석 메뉴"]'
    const plan = '[aria-label="계획 세트 분포"]'
    const plot = '.growth-graph .recharts-surface'
    const visible = selector => evaluate(`!!document.querySelector(${JSON.stringify(selector)})?.getClientRects().length`)
    const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
    await wait(() => visible(graphMenu))
    await click(graphMenu+' button[aria-label="주간 근육 계획"]')
    await wait(() => evaluate('typeof window.releasePlan === "function"'))
    assert.equal(await visible(graphMenu), true)
    assert.equal(await visible(plan), false)
    await evaluate('window.releasePlan()')
    await wait(() => visible(plan+' .analysis-row'))
    await evaluate('history.back()')
    await wait(() => visible(graphMenu))
    await click(graphMenu+' button[aria-label="주간 근육 계획"]')
    await wait(() => visible(plan+' .analysis-row'))
    assert.equal(await evaluate('window.graphBoundary.routineReads'), 1, 'reentering uses the confirmed preset for this revision')
    await evaluate(`(()=>{const preset=document.querySelector('[aria-label="주간 근육 계획"] select');preset.selectedIndex=1;preset.dispatchEvent(new Event('change',{bubbles:true}))})()`)
    await wait(() => evaluate('document.querySelector("[aria-label=\\"주간 계획 요약\\"] strong")?.textContent==="0세트"'))
    assert.equal(await evaluate('window.graphBoundary.routineReads'), 1, 'an empty preset has no routines to fetch')
    await evaluate('history.back()')
    await wait(() => visible(graphMenu))
    await click(graphMenu+' button[aria-label="성장 추적"]')
    await wait(() => visible('.growth-screen [aria-label="검색 목록 열기"]'))
    await click('.growth-screen [aria-label="검색 목록 열기"]')
    await wait(() => visible('.growth-screen ul[aria-label="검색 결과"] li button'))
    await click('.growth-screen ul[aria-label="검색 결과"] li button')
    await wait(() => evaluate('typeof window.releaseGrowth === "function"'))
    assert.equal(await visible(plot), false, 'the first chart waits for its approved history')
    await evaluate('window.releaseGrowth()')
    await wait(() => visible(plot))
    await evaluate(`window.previousPlot=document.querySelector('${plot}');[...document.querySelectorAll('[aria-label="성장 추적 기간"] button')].find(b=>b.textContent==='전체').click()`)
    await wait(() => evaluate('typeof window.releaseGrowth === "function"'))
    assert.equal(await evaluate(`document.querySelector('${plot}')===window.previousPlot && document.querySelector('.growth-latest').textContent==='25kg'`), true)
    await evaluate('window.releaseGrowth(true)')
    await wait(() => visible('.growth-screen [role="alert"]'))
    await evaluate("[...document.querySelectorAll('.growth-screen button')].find(b=>b.textContent==='다시 조회').click()")
    await wait(() => evaluate('typeof window.releaseGrowth === "function"'))
    await evaluate('window.releaseGrowth()')
    await wait(() => evaluate(`document.querySelector('${plot}')===window.previousPlot && document.querySelector('.growth-latest').textContent==='30kg'`))
    await evaluate('window.graphBoundary=null')
    await send('Emulation.clearDeviceMetricsOverride')
    await evaluate("window.renderBoundary('A','0',false,false,'settings')")
    const restPage = 'section[aria-label="세트 사이 휴식"]'
    const openSettings = title => evaluate(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent===${JSON.stringify(title)}).click()`)
    const catalogVisible = () => evaluate(`Array.from(document.querySelectorAll('h1')).some(heading=>heading.textContent==='운동 종목 보기' && heading.getClientRects().length)`)
    await wait(() => evaluate(`document.body.innerText.includes('카탈로그 화면 열기')`))
    await openSettings('카탈로그 화면 열기')
    await wait(catalogVisible)
    for (let visit = 0; visit < 3; visit++) {
      await evaluate('history.back()')
      await wait(async () => !(await catalogVisible()))
      await openSettings('휴식 화면 열기')
      await wait(() => evaluate(`!!document.querySelector('${restPage}')`))
      await evaluate(`window.restPage=document.querySelector('${restPage}');window.restPage.querySelector('form button').click()`)
      await wait(() => evaluate('typeof window.settingsExitGuard === "function"'))
      await evaluate('history.back()')
      await wait(() => evaluate(`!history.state.overloadNavigation.values['boundary-settings']`))
      await evaluate('new Promise(requestAnimationFrame)')
      assert.equal(await evaluate('window.restPage.isConnected'), false, 'leaving Rest Settings must disconnect its DOM even when the catalog is retained')
      assert.equal(await evaluate('window.settingsExitGuard'), null, 'an unmounted Rest Settings page must release its edit guard')
      await openSettings('카탈로그 화면 열기')
      await wait(catalogVisible)
      assert.equal(await evaluate(`document.querySelectorAll('${restPage}').length`), 0)
    }
    await evaluate('window.startBoundary()')
    await wait(() => evaluate('document.body.innerText.includes("운동 시작")'))
    await evaluate(`window.startFrames=[];window.watchStart=true;requestAnimationFrame(function sample(){
      if(!window.watchStart)return;
      window.startFrames.push({home:!!document.querySelector('[aria-label="홈"]')?.getClientRects().length,
        tabs:!!document.querySelector('nav[aria-label="기본 탐색"]'),
        resume:document.body.innerText.includes('운동 이어가기'),warmup:document.body.innerText.includes('준비운동 완료'),
        skeleton:!!document.querySelector('[data-loading-skeleton="workout"]')?.getClientRects().length});
      requestAnimationFrame(sample);
    });const button=document.querySelector('[aria-label="홈"] button');button.click();button.click()`)
    await wait(() => evaluate('typeof window.startScenario.commit === "function"'))
    await evaluate('window.startScenario.commit()')
    await wait(() => evaluate('typeof window.startScenario.open === "function"'))
    await evaluate('new Promise(resolve=>setTimeout(resolve,350))')
    assert.equal(await evaluate('document.body.innerText.includes("운동 시작") && !!document.querySelector("nav")'),true)
    await evaluate('window.startScenario.open()')
    await wait(() => evaluate('document.body.innerText.includes("준비운동 완료")'))
    await evaluate('new Promise(requestAnimationFrame)')
    assert.equal(await evaluate('window.watchStart=false;window.startFrames.some(f=>f.home)&&window.startFrames.some(f=>f.warmup)&&window.startFrames.every(f=>!f.resume&&!f.skeleton&&(!f.warmup||!f.home&&!f.tabs))&&window.startScenario.posts===1'),true)
  } catch(error){if(ws?.readyState===1){try{console.error('Boundary DOM:',await evaluate('document.body.innerText'));console.error('Boundary requests:',await evaluate('window.boundaryRequests'))}catch{}}throw error} finally {
    if (ws?.readyState === 1) { try { await send('Browser.close') } catch { /* closed */ } }
    if (browser?.exitCode === null) await new Promise(r => browser.once('exit', r))
    ws?.close(); await server.close()
    const own = relative(directory, profile)
    assert(!isAbsolute(own) && /^profile-[a-f0-9-]+$/.test(own))
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
