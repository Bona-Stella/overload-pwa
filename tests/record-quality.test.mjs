import {verifyNinthUi} from './fixtures/ninth-ui-checks.mjs'
import {verifyEighthUi} from './fixtures/eighth-ui-checks.mjs'
import {verifySeventhUi} from './fixtures/seventh-ui-checks.mjs'
import {verifySixthUi} from './fixtures/sixth-ui-checks.mjs'
import {verifyFifthUi} from './fixtures/fifth-ui-checks.mjs'
import {verifyFourthUi} from './fixtures/fourth-ui-checks.mjs'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createReviewFixtureServer } from './fixtures/review-server.mjs'

test('record wireframe quality: navigation, complete isolated preview, responsive screenshot pairs', {timeout:180000}, async()=>{
 const root=resolve('logs/record-quality');await mkdir(root,{recursive:true})
 const profile=await mkdtemp(resolve(root,'browser-'))
 const vite=await createReviewFixtureServer()
 let acceptDialogs=false,dialogCount=0
 let browser,socket,serial=0;const pending=new Map(),errors=[],api=[],report={navigation:[],interactions:[],screens:[]}
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert.ok(!r.exceptionDetails,r.exceptionDetails?.exception?.description);return r.result.value}
 const wait=async(fn,label)=>{const end=Date.now()+15000;while(Date.now()<end){const r=await fn();if(r)return r;await delay(40)}assert.fail('Timed out: '+label)}
 const click=async(text,selector='button')=>wait(()=>evaluate('(()=>{const e=[...document.querySelectorAll('+JSON.stringify(selector)+')].find(e=>e.getClientRects().length&&!e.disabled&&(e.textContent.trim()==='+JSON.stringify(text)+'||e.getAttribute("aria-label")==='+JSON.stringify(text.replace(/ ›$/,''))+'));if(!e)return false;e.click();return true})()'),text)
 const set=async(selector,value)=>{
  if(selector==='.record-search select'&&!await evaluate('!!document.querySelector(".record-search select")')){
   const trigger='.record-search button[aria-haspopup="listbox"]'
   if(!await evaluate(`!!document.querySelector(${JSON.stringify(trigger)})`))await evaluate('document.querySelector(".record-search input").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))')
   await evaluate(`document.querySelector(${JSON.stringify(trigger)}).click()`)
   const option=`.record-search [role="option"][data-value="${value}"]`
   await wait(()=>evaluate(`!!document.querySelector(${JSON.stringify(option)})`),'scope option '+value)
   await evaluate(`document.querySelector(${JSON.stringify(option)}).click()`)
   return
  }
  await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(!e)throw Error("missing field");Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),"value").set.call(e,'+JSON.stringify(value)+');e.dispatchEvent(new Event(e.tagName==="SELECT"?"change":"input",{bubbles:true}))})()')
 }
 const body=()=>evaluate('document.body.innerText')
 const tab=async name=>{
  const navigation='nav[aria-label="기본 탐색"]'
  if(await evaluate(`document.querySelector('${navigation}')?.dataset.collapsed === 'true'`)){
   await click('하단 메뉴 펼치기',navigation+' button:not([inert])')
  }
  await click(name,navigation+' button:not([inert])')
 }
 const title=async name=>wait(()=>evaluate('[...document.querySelectorAll("h1,h2")].some(e=>e.getClientRects().length&&e.textContent==='+JSON.stringify(name)+')'),name)
 const width=async (w,side)=>{await send('Emulation.setDeviceMetricsOverride',{width:w,height:844,deviceScaleFactor:1,mobile:true});if(side!=='html'){await wait(()=>evaluate('innerWidth==='+w),'viewport width');assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'horizontal overflow')}}
 const capture=async(name,side,w)=>{
  await width(w,side)
  if(side==='react'){
    assert.deepEqual(await evaluate('[...document.querySelectorAll("main button")].filter(e=>{const r=e.getBoundingClientRect();return !["운동 부위 필터","근육 분류 필터"].includes(e.closest("[role=group]")?.getAttribute("aria-label"))&&r.width>0&&(r.left<-.5||r.right>innerWidth+.5)}).map(e=>e.textContent)'),[],'button bounds at '+w+' '+name)
  }
  await evaluate('window.scrollTo(0,0)')
  const shotHeight=await evaluate((name.startsWith('fifth-search')||name==='fifth-growth-selection')?'innerHeight':'document.querySelector("dialog[open]")?innerHeight:Math.min(5500,document.documentElement.scrollHeight)')
  const shot=await send('Page.captureScreenshot',{format:'jpeg',quality:85,captureBeyondViewport:true,clip:{x:0,y:0,width:w,height:shotHeight,scale:1}})
  await writeFile(resolve(root,name+'-'+side+'-'+w+'.jpg'),Buffer.from(shot.data,'base64'))
  const cards=await evaluate('[...document.querySelectorAll(".record-screen .app-card,#viewer .wire,.muscle-analysis .app-card")].filter(e=>e.getClientRects().length).map(e=>({text:e.textContent.slice(0,45),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))')
  report.screens.push({name,side,width:w,cards,overflow:await evaluate('document.documentElement.scrollWidth>screen.width')})
 }
 let visit = 0
 const go = async path => {
  const url = new URL(path, origin)
  if (url.pathname === '/routine-preview') url.searchParams.set('testVisit', String(++visit))
  await send('Page.navigate', { url: url.href })
  await wait(() => evaluate(`location.href === ${JSON.stringify(url.href)} && document.readyState === "complete"`), 'page load')
 }
 let origin
 try{
  await vite.listen();origin='http://127.0.0.1:'+vite.httpServer.address().port
  browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--no-first-run','--disable-background-networking','--no-proxy-server','--disable-extensions','--no-default-browser-check','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'})
  const port=await wait(async()=>{try{return Number((await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0])}catch{return false}},'Chrome')
  const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl)
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject})
  socket.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}if(m.method==='Page.javascriptDialogOpening'){dialogCount++;void send('Page.handleJavaScriptDialog',{accept:acceptDialogs})}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Network.requestWillBeSent'&&new URL(m.params.request.url).pathname.startsWith('/api/'))api.push(m.params.request.url)}
  socket.onclose=()=>{for(const p of pending.values())p.reject(Error('Chrome closed'));pending.clear()}
  await send('Page.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:`{const BaseDate=Date,offset=Date.parse('2026-11-11T03:00:00Z')-BaseDate.now();window.Date=class extends BaseDate{constructor(...args){super(...(args.length?args:[BaseDate.now()+offset]))}static now(){return BaseDate.now()+offset}}}`});await send('Runtime.enable');await send('Network.enable')
  await go('/routine-preview?tab=home')
  const homeCard = '[aria-label="홈"] [data-session-id]'
  await wait(() => evaluate(`document.querySelector('[aria-label="홈"] header img[alt="OVERLOAD"]')?.naturalWidth > 0`), 'home wordmark')
  for (const w of [320, 375, 393, 430, 1280]) {
   await width(w)
   assert.ok(await evaluate(`(() => {
    const logo = document.querySelector('[aria-label="홈"] header img[alt="OVERLOAD"]')
    const logoBox = logo.getBoundingClientRect(), statusBox = logo.nextElementSibling.getBoundingClientRect()
    const card = document.querySelector(${JSON.stringify(homeCard)})
    return logoBox.left >= 0 && logoBox.right < statusBox.left && statusBox.right <= innerWidth
      && Math.abs(logoBox.height - logoBox.width * logo.naturalHeight / logo.naturalWidth) < 1
      && getComputedStyle(card).borderRadius === '5px'
   })()`), 'home logo and recent card at ' + w)
  }
  await send('Emulation.setDeviceMetricsOverride', {width:393,height:600,deviceScaleFactor:1,mobile:true})
  const recent = await evaluate(`(() => {
   const card = document.querySelector(${JSON.stringify(homeCard)}), name = card.querySelector('strong').textContent
   card.scrollIntoView({block:'center'})
   const box = card.getBoundingClientRect()
   return {id:card.dataset.sessionId,name,scroll:scrollY,x:box.left+12,y:box.top+box.height/2}
  })()`)
  assert.ok(recent.scroll > 0)
  await send('Input.dispatchMouseEvent', {type:'mousePressed',x:recent.x,y:recent.y,button:'left',clickCount:1})
  await send('Input.dispatchMouseEvent', {type:'mouseReleased',x:recent.x,y:recent.y,button:'left',clickCount:1})
  await title('운동 기록 상세')
  assert.equal(await evaluate('history.state.overloadNavigation.values["review-record"].id'), recent.id)
  await title(recent.name)
  assert.equal(await evaluate('document.querySelector("dialog[open]") === null'), true)
  await click('홈으로')
  const restoredHome = () => wait(() => evaluate(`document.querySelector(${JSON.stringify(homeCard)})?.getClientRects().length && Math.abs(scrollY - ${recent.scroll}) <= 1`), 'home scroll restored')
  await restoredHome()
  await evaluate('history.forward()'); await title('운동 기록 상세')
  await evaluate('history.back()'); await restoredHome()
  await evaluate('history.forward()'); await title('운동 기록 상세')
  const verifyRecordReturnButton = async label => {
   for (const w of [320, 393]) {
    await send('Emulation.setDeviceMetricsOverride', {width:w,height:600,deviceScaleFactor:1,mobile:true})
    assert.ok(await evaluate(`(() => {
     const button = [...document.querySelectorAll('article > button')].find(e => e.textContent === ${JSON.stringify(label)} && e.getClientRects().length)
     if (!button) return false
     const box = button.getBoundingClientRect(), article = button.parentElement.getBoundingClientRect()
     return getComputedStyle(button).borderRadius === '5px' && box.height >= 44
       && Math.abs(box.left - article.left) < 1 && Math.abs(box.right - article.right) < 1
       && box.left >= 0 && box.right <= innerWidth
    })()`), label + ' at ' + w)
   }
  }
  await verifyRecordReturnButton('홈으로 돌아가기')
  await click('홈으로 돌아가기'); await restoredHome()
  await click('전체 보기 ›', '[aria-label="최근 운동"] button')
  await title('전체 운동 이력')
  report.navigation.push('home recent card/session detail/top and bottom return/browser back and forward/home scroll/all history')
  await go('/routine-preview?tab=history');await title('이번 주 요약')
  await click('운동 현황 ›');await title('운동 현황');await tab('홈');await tab('기록');await title('이번 주 요약');report.navigation.push('records/activity/home/records/root')
  await click('주간 근육 계획 ›');await title('주간 근육 계획');await tab('루틴');await tab('기록');await title('이번 주 요약');report.navigation.push('records/plan/routines/records/root')
  await click('전체 보기 ›');await title('전체 운동 이력');await click((await evaluate('document.querySelector(".session-record-card").textContent.trim()')),'.session-record-card');await title('운동 기록 상세');assert.doesNotMatch(await body(),/중량 검토/);await click('기록으로');await title('전체 운동 이력');report.navigation.push('history/detail/back/history')
  await evaluate('history.forward()'); await title('운동 기록 상세')
  await verifyRecordReturnButton('기록으로 돌아가기')
  await click('기록으로 돌아가기'); await title('전체 운동 이력')
  await tab('기록');await click('운동 현황 ›');await title('운동 현황');await click('기록으로');await title('이번 주 요약');report.navigation.push('activity/back/root')
  await send('Runtime.evaluate',{expression:'history.forward()'});await title('운동 현황')
  const activityEntry = await evaluate('history.state.overloadNavigation.index')
  const historyLength = await evaluate('history.length')
  await tab('기록');await title('이번 주 요약')
  assert.equal(await evaluate('history.state.overloadNavigation.index'), activityEntry - 1)
  assert.equal(await evaluate('history.length'), historyLength)
  await evaluate('history.forward()');await title('운동 현황');await tab('기록');await title('이번 주 요약')
  report.navigation.push('browser forward and same tab root without duplicate history')
  const captures=[]
  async function reactCapture(name){for(const w of [320,375,390,430])await capture(name,'react',w);captures.push(name)}
  await reactCapture('records-main')
  await click('운동 현황 ›');await title('운동 현황');await reactCapture('activity')
  for(const scope of ['all','exercise','group','muscle']){
   await set('.record-search select',scope);await evaluate('document.querySelector(".record-search input").focus()');await set('.record-search input',scope==='all'?'프레스':'')
   await wait(()=>evaluate('document.querySelectorAll(".record-search li button").length>0'),'search candidates '+scope)
   await reactCapture('search-'+scope)
   await evaluate('document.querySelector(".record-search li button").click()');await wait(()=>evaluate('!!document.querySelector(".record-chart[data-chart-kind=bar]")'),'selected graph '+scope)
   assert.doesNotMatch(await body(),/이 항목의 날짜별 운동량은 준비 중/)
   const selectedText=await evaluate('document.querySelector(".record-pair").textContent')
   await evaluate('document.querySelector(".record-search input").click();document.querySelector(".record-search input").focus()')
   await wait(()=>evaluate('document.querySelectorAll(".record-search li button").length>0'),'reopened candidates')
   await evaluate('document.querySelector(".record-search input").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))')
   assert.equal(await evaluate('document.querySelectorAll(".record-search li").length'),0)
   assert.equal(await evaluate('document.querySelector(".record-pair").textContent'),selectedText,'closing search keeps the applied graph filter')
   await evaluate('document.querySelector(".record-search input").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));document.querySelector(".search-disclosure").click()')
  }
  await click('총중량');await click('월간');await wait(()=>evaluate('document.querySelectorAll(".record-chart[data-chart-kind=bar] .recharts-bar-rectangle").length<=5'),'monthly chart')
  await evaluate('document.querySelector('+JSON.stringify('button[aria-label="달력 열기"]')+').click()')
  await wait(()=>evaluate('!!document.querySelector(".record-calendar-grid")'),'calendar')
  await evaluate('document.querySelector(".record-calendar-grid button").click()');assert.equal(await evaluate('!!document.querySelector(".record-calendar-grid")'),false)
  report.interactions.push('all four search scopes; select/clear; metric/month/calendar')
  await tab('기록');await click('주간 근육 계획 ›');await title('주간 근육 계획');await reactCapture('plan-groups')
  await click('근육별');await reactCapture('plan-muscles')
  const subtotals=await evaluate('[...document.querySelectorAll(".analysis-group")].map(h=>({label:h.querySelector(".analysis-subtotal").textContent,sum:[...h.parentElement.querySelectorAll(".analysis-row > div:first-child > span")].reduce((n,e)=>n+Number(e.textContent.split(" / ")[0].replace("세트","")),0)}))')
  assert.ok(subtotals.length>0);for(const row of subtotals)assert.equal(row.label,'합계 '+row.sum+'세트')
  await click('분류별');assert.equal(await evaluate('document.querySelectorAll(".analysis-subtotal").length'),3);await click('근육별')
  assert.equal(await evaluate('document.querySelector("[role=switch]").getAttribute("aria-checked")'),'false')
  await evaluate('document.querySelector("[role=switch]").click()');await wait(()=>evaluate('document.querySelector("[role=switch]").getAttribute("aria-checked")==="true"'),'show zero on')
  await click('분류별');await set('.muscle-analysis select',await evaluate('document.querySelector(".muscle-analysis select").options[1].value'))
  assert.equal(await evaluate('document.querySelector("[role=switch]").getAttribute("aria-checked")'),'true')
  await click('근육별');assert.ok(await evaluate('document.querySelectorAll(".record-gauge-guide").length>0'))
  report.interactions.push('plan preset, tabs, zero toggle preserved, downward guide markers')
  await tab('기록');await click('주간 근육 통계 ›');await title('주간 근육 통계');await reactCapture('stats-groups');await click('근육별');await reactCapture('stats-muscles');await click('총중량')
  await tab('기록');await click('성장 추적 ›');await title('성장 추적');await reactCapture('growth');await click('1개월');assert.ok(await evaluate('!!document.querySelector(".growth-graph circle")'));await click('6개월');await evaluate('document.querySelector(".record-search input").focus()');await set('.record-search input','랫');await wait(()=>evaluate('document.querySelectorAll(".record-search li button").length>0'),'growth candidates');await evaluate('document.querySelector(".record-search li button").click()');assert.match(await body(),/승인 중량 변경 기록이 없습니다/);report.interactions.push('weekly actuals sets/volume; growth period, search, empty approval history')
  await tab('기록');await click('운동 현황 ›');await title('운동 현황')
  await click('주간');await evaluate('document.querySelector('+JSON.stringify('button[aria-label="달력 열기"]')+').click()');await evaluate('document.querySelector('+JSON.stringify('button[aria-label="2026-11-11"]')+').click()')
  await wait(()=>evaluate('document.querySelectorAll(".record-day strong").length===7'),'activity day evidence')
  await wait(()=>evaluate('!!document.querySelector(".record-statistics-body")'),'current weekly achievement loaded')
  const activityMarks=await evaluate('[...document.querySelectorAll(".record-day strong")].map(e=>e.textContent)')
  await tab('홈')
  assert.deepEqual(await evaluate('[...document.querySelectorAll("strong[data-status]")].map(e=>/^[월화수목금토일]$/.test(e.textContent)?"·":e.textContent)'),activityMarks)
  report.interactions.push('home and activity share identical date status glyphs')
  await tab('기록');await click('전체 보기 ›');await title('전체 운동 이력');await reactCapture('history')
  await evaluate('document.querySelector('+JSON.stringify('button[aria-label="이전 기간"]')+').click()');await wait(()=>evaluate('document.querySelector(".record-period-row b").textContent.includes("2026/10")'),'October')
  await set('.record-search select','exercise');await set('.record-search input','벤치');await wait(()=>evaluate('document.querySelectorAll(".session-record-card").length>0'),'past exercise results')
  await evaluate('document.querySelector(".record-search input").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}));document.querySelector(".search-disclosure").click()');assert.match(await evaluate('document.querySelector(".record-period-row b").textContent'),/2026\/10/);assert.ok(await evaluate('[...document.querySelectorAll(".session-record-card")].every(e=>e.querySelector("time").textContent.startsWith("10."))'));report.interactions.push('history routine/exercise all-past search; clear restores month; occupied week headers')
  await tab('홈');await reactCapture('home-week')
  await tab('루틴');await click('+ 새 루틴');await set('form[aria-label="루틴 생성"] input[placeholder="나의 루틴"]','초안 이탈 보호')
  const promptsBefore=dialogCount
  await send('Runtime.evaluate',{expression:'history.back()'})
  await wait(()=>dialogCount>promptsBefore,'draft exit prompt')
  assert.equal(await evaluate('document.querySelector(\'form[aria-label="루틴 생성"] input[placeholder="나의 루틴"]\').value'),'초안 이탈 보호')
  await delay(100);acceptDialogs=true
  await send('Runtime.evaluate',{expression:'history.back()'})
  await wait(()=>evaluate('!document.querySelector(\'form[aria-label="루틴 생성"]\')'),'accepted back to routine root')
  await send('Runtime.evaluate',{expression:'history.forward()'})
  await wait(()=>evaluate('!!document.querySelector(\'form[aria-label="루틴 생성"]\')'),'forward restores editor')
  assert.equal(await evaluate('document.querySelector(\'form[aria-label="루틴 생성"] input[placeholder="나의 루틴"]\').value'),'')
  await click('취소')
  report.interactions.push('browser back with dirty draft: cancel preserves; accept returns parent; forward reopens clean editor')

  assert.deepEqual(api,[]);assert.equal(await evaluate('indexedDB.databases().then(x=>x.length)'),0);assert.deepEqual(errors,[])

  await go('/routine-preview?tab=history&review=approval');await title('운동 기록 요약')
  await reactCapture('approval-normal');assert.ok(await evaluate('[...document.querySelectorAll("button")].some(e=>e.textContent==="전체 승인"&&!e.disabled)'))
  await click('수정');await reactCapture('approval-edit')
  for(const w of [320,375,390,430]){
   await width(w,'react')
   const layout=await evaluate('(()=>{const h=document.querySelector(".approval-toolbar"),title=h.querySelector("h2").getBoundingClientRect(),buttons=[...h.querySelectorAll("button")].map(e=>e.getBoundingClientRect());return{aligned:buttons.every(r=>r.top<=title.top&&r.bottom>=title.bottom),rows:[...document.querySelectorAll(".approval-edit-row")].every(e=>{const n=e.querySelector("h3"),b=e.lastElementChild;return getComputedStyle(n).textOverflow==="ellipsis"&&getComputedStyle(n).whiteSpace==="nowrap"&&n.getBoundingClientRect().right<=e.querySelector(".approval-values").getBoundingClientRect().left&&b.getBoundingClientRect().right<=e.getBoundingClientRect().right+.5})}})()')
   assert.deepEqual(layout,{aligned:true,rows:true},'approval layout '+w)
  }
  await evaluate('document.querySelector("input[type=checkbox]").click()');assert.doesNotMatch(await body(),/전체 승인|선택 승인/)
  const before=await evaluate('document.querySelector(".approval-values").textContent')
  await click('무게 수정');await wait(()=>evaluate('!!document.querySelector("dialog[open]")'),'weight modal')
  await click('+2.5');await click('취소');assert.equal(await evaluate('document.querySelector(".approval-values").textContent'),before)
  await click('무게 수정');await click('+2.5');await click('확인');await click('수정 완료');await click('선택 승인');await click('취소');await click('선택 승인');assert.match(await body(),/서버·DB에는 저장하지 않습니다/);await click('시연 확인');assert.doesNotMatch(await body(),/실제 승인/)
  await click('수정');await evaluate('[...document.querySelectorAll("input[type=checkbox]")].filter(e=>e.checked).forEach(e=>e.click())')
  await click('수정 완료');assert.ok(await evaluate('[...document.querySelectorAll("button")].some(e=>/선택 승인/.test(e.textContent)&&e.disabled)'))
  await evaluate('window.__beforeSeventhReload=true');await send('Page.reload');await wait(()=>evaluate('!window.__beforeSeventhReload'),'new document');await title('운동 기록 요약');assert.ok(await evaluate('[...document.querySelectorAll(".approval-toolbar button")].some(e=>e.textContent==="전체 승인"&&!e.disabled)'));assert.equal(await evaluate('!!document.querySelector(\'[aria-label="중량 검토 카드"]\')'),true);assert.match(await body(),/WEIGHT/)
  assert.equal(await evaluate('document.querySelectorAll("[data-weight-review]").length'),3)
  assert.deepEqual(api,[]);assert.equal(await evaluate('indexedDB.databases().then(x=>x.length)'),0)
  report.interactions.push('full approval simulation, reload reset, no writes')
  report.interactions.push('finish-only weight review; selected/zero approval; weight modal cancel/confirm; memory-only approval')
  await verifyFourthUi({go,title,click,set,evaluate,send,wait,width,capture,tab,body,report})
  await verifyFifthUi({go,title,click,set,evaluate,send,wait,width,capture,tab,body,report})
  await verifySixthUi({go,title,click,set,evaluate,send,wait,width,capture,tab,body,report})
  await verifySeventhUi({go,title,click,set,evaluate,send,wait,width,capture,tab,body,report})
  await verifyEighthUi({go,title,click,set,evaluate,send,wait,width,capture,tab,body,report})
  await verifyNinthUi({go,title,click,set,evaluate,send,wait,width,capture,tab,body,report})
  // The reference authoring shell is removed only inside this isolated test page.
  // The original HTML, its phone contents, styles and data remain unchanged on disk.
  await go('/docs/product/Overload_UI_Baseline_Wireframe_v0.9.html')
  await evaluate('(()=>{const style=document.createElement("style");style.textContent="body{padding:0}.head,.footer,#notes,.topnote{display:none!important}.layout{display:block!important}.phone{width:100%!important;max-width:none!important;border:0;border-radius:0;box-shadow:none}.scroll{padding:20px 21px 8px}";document.head.append(style)})()')
  const reference=async(screen)=>{await set('#screen',screen);await delay(50)}
  await reference('recorddash');for(const w of [320,375,390,430])await capture('records-main','html',w)
  await reference('activity');for(const w of [320,375,390,430])await capture('activity','html',w)
  for(const scope of ['all','exercise','group','muscle']){
   await evaluate(`document.querySelector('#recordTabScope').click();document.querySelector('[data-act="recordtab-scope-${scope}"]').click()`)
   await set('#recordTabSearch',scope==='all'?'프레스':'');for(const w of [320,375,390,430])await capture('search-'+scope,'html',w)
  }
  await reference('plananalysis');await set('#analysisPreset',await evaluate('document.querySelector("#analysisPreset").options[1].value'));for(const w of [320,375,390,430])await capture('plan-groups','html',w)
  await click('근육별');for(const w of [320,375,390,430])await capture('plan-muscles','html',w)
  await reference('muscles');for(const w of [320,375,390,430])await capture('stats-groups','html',w)
  await click('근육별');for(const w of [320,375,390,430])await capture('stats-muscles','html',w)
  await reference('growth');for(const w of [320,375,390,430])await capture('growth','html',w)
  await reference('history');for(const w of [320,375,390,430])await capture('history','html',w)
  await reference('home');for(const w of [320,375,390,430])await capture('home-week','html',w)
  await reference('result')
  await evaluate('document.querySelector("#notes [data-act=review-sample-eligible]").click()')
  await title('운동 기록 상세')
  await title('중량 변경 승인 이력')
  const historyRows=await evaluate('document.querySelectorAll("#viewer [data-wd-review]").length')
  assert.ok(historyRows>0,'the approval sample populates the record detail')
  assert.equal(await evaluate('!!document.querySelector("#viewer [data-act=review-edit], #viewer [data-review-check]")'),false,'historical approvals are read-only')
  await reference('result')
  await title('운동 기록 요약')
  const editButton='#viewer button[data-act="review-edit"]'
  assert.equal(await evaluate('document.querySelectorAll("#viewer [data-wd-review]").length'),historyRows)
  for(const w of [320,375,390,430])await capture('approval-normal','html',w)
  await click('수정',editButton)
  await wait(()=>evaluate('document.querySelector("#viewer [data-act=review-edit]")?.textContent.trim()==="수정 완료"'),'summary approval edit mode')
  assert.equal(await evaluate('document.querySelectorAll("#viewer input[data-review-check]:checked").length'),historyRows)
  assert.equal(await evaluate('document.querySelectorAll("#viewer button[data-act^=review-weight-]:not(:disabled)").length'),historyRows)
  for(const w of [320,375,390,430])await capture('approval-edit','html',w)
  report.apiRequests=api;report.errors=errors;await writeFile(resolve(root,'verification.json'),JSON.stringify(report,null,2))
 }catch(error){if(socket?.readyState===1)console.error((await body()).slice(0,1800));throw error}
 finally{
  if(socket?.readyState===1){try{await send('Browser.close')}catch{/* exited */}}
  if(browser?.exitCode===null)browser.kill()
  if(browser)await wait(()=>browser.exitCode!==null||browser.signalCode!==null,'browser exit')
  await vite.close();assert.equal(dirname(profile),root);await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100})
 }
})
