import assert from 'node:assert/strict'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { sessionAchievement } from '../../src/features/home/achievement.ts'
import { addDays, weekDates } from '../../src/features/home/model.ts'

export async function runHomeDesign(d) {
  const { send, evaluate, click, api, screenshot, wait, passed, directory, evidence, requests } = d
  const login = async () => {
    await wait(() => evaluate(`!!document.querySelector('[aria-label="검토용 로그인"] button') || document.querySelectorAll('nav button').length===4 || !!document.querySelector('.local-workout')`), 'review login helper or existing session')
    await wait(() => evaluate(`(()=>{if(document.querySelectorAll('nav button').length===4)return true;const b=[...document.querySelectorAll('[aria-label="검토용 로그인"] button')].find(b=>b.textContent==='검토 계정으로 로그인'&&!b.disabled);b?.click();return false})()`), 'real OTP one-button login with server cooldown', 95000)
    if (await evaluate(`!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='‹ 홈으로 · 운동은 계속 보존')`)) await click('‹ 홈으로 · 운동은 계속 보존')
    await wait(() => evaluate(`!!document.querySelector('[aria-label="오늘의 루틴"]') && document.querySelectorAll('[aria-label="최근 운동"] button[title]').length===3`), 'real home loaded')
  }
  const geometry = mapping => evaluate(`(()=>{const out={};for(const [key,selector]of Object.entries(${JSON.stringify(mapping)})){const e=document.querySelector(selector),r=e.getBoundingClientRect(),s=getComputedStyle(e);out[key]={x:r.x,y:r.y+scrollY,width:r.width,height:r.height,font:s.fontSize}}return out})()`)
  await send('Page.navigate', { url: 'http://127.0.0.1:3000/' }); await login()
  passed.push('One-button login uses actual OTP verification, session cookie and CSRF through the isolated Backend')
  const activeBefore = (await api('GET','/api/v1/workout-sessions/active')).body.session
  const routines = (await api('GET','/api/v1/routines')).body
  assert.equal(await evaluate(`document.querySelector('[aria-label="홈"]').innerText.includes('오늘도, 한 걸음 더.')`), false)
  assert.equal(await evaluate(`document.querySelectorAll('[data-review-sample="deload-header"]').length`), 1)
  assert.equal(await evaluate(`document.querySelector('[data-review-sample] button')===null`), true)
  const selectors = { header: '[aria-label="홈"] header', today: '[aria-label="오늘의 루틴"]', start: '[aria-label="홈"] button.primary', chooser: '[aria-label="홈"] summary', week: '[aria-label="이번 주 일정"]', recent: '[aria-label="최근 운동"]', tabs: 'nav' }
  const actual = await geometry(selectors)
  assert.equal(actual.header.height,36); assert.equal(actual.chooser.height,56); assert(actual.week.height<270)
  assert.equal(await evaluate('document.documentElement.scrollWidth<=393'),true)
  const cards = await evaluate(`[...document.querySelectorAll('[aria-label="최근 운동"] button[title]')].map(e=>({label:e.getAttribute('aria-label'),height:e.getBoundingClientRect().height}))`)
  assert.equal(cards.length,3); cards.forEach(c=>assert(c.height<=46))
  const recentIds = []
  const dates = weekDates(await evaluate(`document.querySelector('[aria-label="홈"] time').dateTime`))
  const overviewPath = '/api/v1/statistics/overview?fromDate=' + dates[0] + '&toDateExclusive=' + addDays(dates[6],1)
  const recentOverview = (await api('GET',overviewPath)).body
  const displayed = await evaluate(`[...document.querySelectorAll('[data-session-id]')].map(e=>({id:e.dataset.sessionId,state:e.querySelector('[data-state]').dataset.state}))`)
  for (const item of recentOverview.statistics.recentSessions) recentIds.push(item.id)
  for (const item of displayed) {
    const detail=(await api('GET','/api/v1/workout-sessions/'+item.id)).body
    assert.equal(item.state,sessionAchievement(detail).state)
  }
  await screenshot('react-home-393'); await screenshot('react-today-393','[aria-label="오늘의 루틴"]'); await screenshot('react-week-393','[aria-label="이번 주 일정"]')
  passed.push('Real InitialPlan achievement counts, compact single-line records, 36px header, 56px chooser and compact week verified at 393px')
  await send('Page.navigate',{url:'http://127.0.0.1:3000/__review/wireframe'})
  await wait(()=>evaluate(`!!document.querySelector('.v9-home-head')`),'official wireframe')
  await evaluate(`(()=>{const s=document.createElement('style');s.textContent='.head,.notes,.footer,.topnote{display:none!important}body{padding:0}.layout{display:block;margin:0;width:393px}.phone{width:393px;max-width:none;border:0;border-radius:0;box-shadow:none}';document.head.append(s)})()`)
  const reference=await geometry({header:'.v9-home-head',today:'.v9-featured-card',start:'.v9-external-cta .btn',chooser:'.v9-external-switch .v9-routine-select',week:'#viewer>.wire:not(.v9-featured-card)',tabs:'.nav'})
  await screenshot('official-wireframe-393')
  await writeFile(resolve(directory,'layout-comparison.json'),JSON.stringify({referenceFile:'docs/product/Overload_UI_Baseline_Wireframe_v0.9.html',viewportWidth:393,normalization:'Only external presentation chrome hidden; phone width set to 393. Inner HTML/style unchanged.',actual,reference,recordCards:cards,notes:['Onyx palette from Visual Theme Spec replaces neutral wireframe colors.','Real mixed routine has a longer title and different rows than HTML PUSH sample.','Actual future schedule reservation and management action add a compact footer.','Recent 3 real records use the user-approved compact cards with InitialPlan achievement counts.','Real app tabs are fixed; wireframe tabs are in document flow.']},null,2))
  passed.push('Official HTML and React captured at identical 393px content width, with measured layout comparison')
  await send('Page.navigate',{url:'http://127.0.0.1:3000/'})
  await wait(()=>evaluate(`!!document.querySelector('[aria-label="오늘의 루틴"]')`),'persisted authenticated session')
  await evaluate(`document.querySelector('[aria-label="홈"] details').open=true`); await screenshot('react-chooser-393')
  const scheduleBefore=(await api('GET','/api/v1/weekly-schedule?timeZone=Asia%2FSeoul')).body
  if (!activeBefore) {
    await evaluate(`(()=>{const b=[...document.querySelectorAll('[aria-label="홈"] details button[aria-pressed]')].find(b=>b.getAttribute('aria-pressed')==='false'&&!b.disabled);b.click()})()`)
    assert.deepEqual((await api('GET','/api/v1/weekly-schedule?timeZone=Asia%2FSeoul')).body,scheduleBefore)
  }
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true}); assert.equal(await evaluate('document.documentElement.scrollWidth<=320'),true); await screenshot('react-home-320')
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false}); await screenshot('react-home-desktop')
  await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true})
  if (!activeBefore) {
    await click('운동 시작'); await wait(()=>evaluate(`!!document.querySelector('.local-workout')`),'actual START editor')
    const active=(await api('GET','/api/v1/workout-sessions/active')).body.session
    assert(routines.routines.some(r=>r.id===active.initialPlan.routineId))
    assert.equal(JSON.stringify(active).includes('5.2/8주'),false)
    await screenshot('real-start-entry')
    const finished=await api('POST',`/api/v1/workout-sessions/${active.id}/finish`,{dataGeneration:active.dataGeneration,editorDeviceId:active.editorDeviceId,writerEpoch:active.writerEpoch,localRevision:(BigInt(active.localRevision)+1n).toString(),snapshot:active.snapshot.state,endedAt:new Date().toISOString()});assert.equal(finished.status,200)
    const final=(await api('GET','/api/v1/workout-sessions/'+active.id)).body
    assert.equal((await api('DELETE','/api/v1/workout-sessions/'+active.id,{dataGeneration:final.dataGeneration,expectedVersion:final.version})).status,200)
    passed.push('Today-only selection leaves schedule unchanged; actual START uses normal plan; test-created session finished/logically deleted through actual APIs')
  }
  const after=(await api('GET',overviewPath)).body
  assert.deepEqual(after.statistics.summary,recentOverview.statistics.summary);assert.deepEqual(after.statistics.recentSessions.map(s=>s.id),recentIds)
  const persistedSample = await evaluate(`(async()=>{const names=await indexedDB.databases();for(const info of names){const db=await new Promise((r,j)=>{const q=indexedDB.open(info.name);q.onsuccess=()=>r(q.result);q.onerror=j});try{for(const name of db.objectStoreNames){const rows=await new Promise((r,j)=>{const q=db.transaction(name).objectStore(name).getAll();q.onsuccess=()=>r(q.result);q.onerror=j});if(JSON.stringify(rows).includes('5.2/8주'))return true}}finally{db.close()}}return false})()`)
  assert.equal(persistedSample,false); assert.equal(requests.some(r=>/deload/i.test(r.path)),false)
  const bundles=await Promise.all((await readdir('dist/assets')).filter(p=>p.endsWith('.js')).map(p=>readFile('dist/assets/'+p,'utf8')))
  assert.equal(bundles.some(s=>s.includes('5.2/8주')||s.includes('검토 계정으로 로그인')||s.includes('/__review/otp')),false)
  passed.push('Sample absent from production JS, IndexedDB and actual session; original statistics/recent records unchanged')
  const info=await(await fetch('http://127.0.0.1:3000/__home_review')).json(), lanOrigin=info.origins.find(s=>s.includes('192.')||s.includes('10.'))
  assert(lanOrigin)
  await send('Page.navigate',{url:lanOrigin+'/'})
  await wait(()=>evaluate(`document.querySelectorAll('nav button').length===4 || !!document.querySelector('[aria-label="검토용 로그인"] button')`),'LAN session check')
  if (await evaluate(`document.querySelectorAll('nav button').length===4`)) { assert.equal((await api('POST','/api/v1/auth/logout')).status,204); await send('Page.reload') }
  await login()
  const session=await api('GET','/api/v1/auth/session'); assert.equal(session.status,200)
  const lanRoutines=await api('GET','/api/v1/routines'); assert.equal(lanRoutines.status,200); assert.deepEqual(lanRoutines.body.routines,routines.routines)
  assert.equal((await api('POST','/api/v1/auth/email-otp/request',{email:'other@example.test'})).status,403)
  const unknown=await api('POST','/__review/otp',{challengeId:'00000000-0000-4000-8000-000000000000'});assert.equal(unknown.status,403)
  const capabilities=await evaluate('({secureContext:isSecureContext,randomUUID:typeof crypto.randomUUID,webLocks:!!navigator.locks,serviceWorker:!!navigator.serviceWorker})')
  assert.equal(await evaluate(`[...document.querySelectorAll('[aria-label="홈"] button')].find(b=>b.textContent.trim()==='운동 시작').disabled`),true)
  await screenshot('lan-home-393')
  await send('Page.reload'); await wait(()=>evaluate(`!!document.querySelector('[aria-label="오늘의 루틴"]')`),'LAN session persists after reload')
  passed.push('LAN IP real OTP/session cookie, CSRF-protected requests and real API verified; reload keeps login; other accounts/unknown delivery denied')
  await writeFile(resolve(directory,'design-result.json'),JSON.stringify({runId:evidence.runId,passed,lanOrigin,capabilities,requests,realIPhone:false,preservedOriginalSamples:true},null,2))
  console.log(JSON.stringify({passed,lanOrigin,capabilities,screenshots:directory},null,2))
}
