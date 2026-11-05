import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { loadRecent } from '../../src/features/home/recent.ts'
import { hasActualPerformance, sessionAchievement } from '../../src/features/home/achievement.ts'

export async function runHomeDetails(d){
  const {send,evaluate,click,api,screenshot,wait,passed,directory,evidence}=d
  await send('Page.navigate',{url:'http://127.0.0.1:3000/'})
  await wait(()=>evaluate(`!!document.querySelector('[aria-label="검토용 로그인"] button')||document.querySelectorAll('nav button').length===4||!!document.querySelector('.local-workout')`),'account screen')
  if(await evaluate(`!!document.querySelector('.local-workout')`))await click('‹ 홈으로 · 운동은 계속 보존')
  await wait(()=>evaluate(`(()=>{if(document.querySelectorAll('nav button').length===4)return true;const b=[...document.querySelectorAll('[aria-label="검토용 로그인"] button')].find(b=>b.textContent==='검토 계정으로 로그인'&&!b.disabled);b?.click();return false})()`),'actual review login',95000)
  const ready=()=>wait(()=>evaluate(`!!document.querySelector('[aria-label="오늘의 루틴"]')&&document.querySelectorAll('[data-session-id]').length===3`),'three performed recent records')
  const reload=async()=>{await evaluate(`document.documentElement.dataset.detailsTest='old'`);await send('Page.reload');await wait(()=>evaluate(`document.documentElement.dataset.detailsTest!=='old'&&!!document.querySelector('[aria-label="오늘의 루틴"]')&&document.querySelectorAll('[data-session-id]').length===3`),'new document and fresh home data')}
  await ready()
  const list=(await api('GET','/api/v1/routines')).body,scope={userId:list.userId,dataGeneration:list.dataGeneration}
  const scheduleBefore=(await api('GET','/api/v1/weekly-schedule?timeZone=Asia%2FSeoul')).body
  const routines=[];for(const row of list.routines)routines.push((await api('GET','/api/v1/routines/'+row.id)).body)
  const selected=routines.find(r=>r.weightPlacements.length&&r.cardioPlacements.length)||routines[0]
  const choose=async()=>{
    await evaluate(`document.querySelector('[aria-label="홈"] details').open=true`)
    await evaluate(`(()=>{const b=[...document.querySelectorAll('[aria-label="홈"] details button[aria-pressed]')].find(b=>b.querySelector('strong').title===${JSON.stringify(selected.name)});b.click()})()`)
    await wait(()=>evaluate(`document.querySelector('[aria-label="오늘의 루틴"] h2').textContent===${JSON.stringify(selected.name)}&&!document.querySelector('[aria-label="홈"] details').open`),'selection applied and chooser collapsed')
  }
  const existing=(await api('GET','/api/v1/workout-sessions/active')).body.session
  if(!existing)await choose()
  assert.deepEqual((await api('GET','/api/v1/weekly-schedule?timeZone=Asia%2FSeoul')).body,scheduleBefore)
  const header=await evaluate(`(()=>{const h=document.querySelector('[aria-label="홈"] header'),m=h.querySelector('[aria-label="디로딩"]'),b=h.firstElementChild,k=document.querySelector('[aria-label="오늘의 루틴"]>div'),n=document.querySelector('[aria-label="오늘의 루틴"] li>span'),p=document.querySelector('[aria-label="오늘의 루틴"] li>strong');return {brand:b.textContent,font:getComputedStyle(b).fontSize,moon:getComputedStyle(m).maskImage,color:getComputedStyle(m).backgroundColor,size:m.getBoundingClientRect().width,headerDate:!!h.querySelector('time'),kicker:k.textContent,nameFont:n&&getComputedStyle(n).fontSize,planFont:p&&getComputedStyle(p).fontSize}})()`)
  assert.equal(header.brand,'OVERLOAD');assert.equal(header.font,'18px');assert.equal(header.color,'rgb(108, 147, 198)');assert.equal(header.size,24);assert.equal(header.headerDate,false);assert.match(header.kicker,/TODAY'S ROUTINE/);if(!existing){assert.equal(header.nameFont,'14px');assert.equal(header.planFont,'12px')}
  assert.equal(await evaluate(`document.querySelector('[aria-label="홈"] header').innerText.includes('시안')`),false)
  const rawSvg=await readFile('docs/product/assets/deload-icons/thick_white_crescent_moon.svg','utf8'),png=await readFile('docs/product/assets/deload-icons/thick_white_crescent_moon.png')
  assert.equal(createHash('sha256').update(rawSvg).digest('hex'),'043694e57681bb08c38e0effd537d2e040e017193d52cf3ad95f7664dbbf0698')
  assert.equal(createHash('sha256').update(png).digest('hex'),'c716e5909ee150fe0e6733213d20ec433f15a8efaa12c1f41c61cd6d955d020a')
  const observed=[]
  const adapter={closed:async(_s,c)=>{const r=await api('GET','/api/v1/workout-sessions/closed?'+new URLSearchParams({limit:'20',...(c||{})}));assert.equal(r.status,200);return r.body},detail:async(_s,id)=>{const r=await api('GET','/api/v1/workout-sessions/'+id);assert.equal(r.status,200);observed.push(r.body);return r.body}}
  const recent=await loadRecent(adapter,scope,new AbortController().signal)
  const displayed=await evaluate(`[...document.querySelectorAll('[data-session-id]')].map(e=>({id:e.dataset.sessionId,title:e.title,state:e.querySelector('[data-state]').dataset.state,height:e.getBoundingClientRect().height}))`)
  assert.deepEqual(displayed.map(r=>r.id),recent.rows.map(r=>r.id));displayed.forEach(r=>{assert(r.height<=46);assert.equal(r.state,sessionAchievement(recent.details.get(r.id)).state)})
  const excluded=observed.filter(s=>!hasActualPerformance(s)).map(s=>s.id);for(const id of excluded)assert(!displayed.some(r=>r.id===id))
  assert.equal(await evaluate('document.documentElement.scrollWidth<=393'),true)
  await screenshot('home-on-393');await screenshot('header-on-393','[aria-label="홈"] header');await screenshot('recent-achievements-393','[aria-label="최근 운동"]')
  await send('Page.navigate',{url:'http://127.0.0.1:3000/?analysis=off'});await ready();if(!existing)await choose()
  const off=await evaluate(`(()=>{const h=document.querySelector('[aria-label="홈"] header'),m=h.querySelector('[aria-label="디로딩"]');return {brand:h.firstElementChild.textContent,week:!!h.querySelector('b'),right:h.getBoundingClientRect().right-m.getBoundingClientRect().right,color:getComputedStyle(m).backgroundColor,mask:getComputedStyle(m).maskImage}})()`)
  assert.equal(off.brand,'OVERLOAD');assert.equal(off.week,false);assert(Math.abs(off.right)<1);assert.equal(off.mask,header.moon);assert.equal(off.color,header.color)
  await screenshot('home-off-393');await screenshot('header-off-393','[aria-label="홈"] header')
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth<=320'),true);await screenshot('home-320')
  await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true})
  await send('Page.navigate',{url:'http://127.0.0.1:3000/__review/wireframe'});await wait(()=>evaluate(`!!document.querySelector('.v12-brand')`),'updated official HTML')
  await evaluate(`(()=>{const s=document.createElement('style');s.textContent='.head,.notes,.footer,.topnote{display:none!important}body{padding:0}.layout{display:block;margin:0;width:393px}.phone{width:393px;max-width:none;border:0;border-radius:0;box-shadow:none}';document.head.append(s)})()`);await screenshot('official-home-on-393')
  await evaluate(`state.deloadAnalysisOn=false;draw()`);await screenshot('official-home-off-393')
  passed.push('Real home: official unmodified moon hashes, ON/OFF, larger typography, actual date, auto-collapse, 393/320 overflow and actual filtered achievements verified')
  passed.push('Official home HTML ON/OFF captured at the same 393px width; other screen flows retained')
  await send('Page.navigate',{url:'http://127.0.0.1:3000/'});await ready();if(!existing)await choose()
  if(!existing){
    let testId=null
    try{
      await click('운동 시작');await wait(()=>evaluate(`!!document.querySelector('.local-workout')`),'actual START')
      const active=(await api('GET','/api/v1/workout-sessions/active')).body.session;testId=active.id
      const time=new Date().toISOString(),make=(plan,ordinal)=>({id:randomUUID(),sessionExerciseId:plan.sessionExerciseId,ordinal,weightKg:plan.approvedWeightKg,reps:plan.minReps,completedAt:time,weightContext:{kind:'INITIAL_APPROVED',requestId:null},manufacturerId:plan.manufacturerId,loadType:plan.loadType})
      const first=make(active.initialPlan.weightExercises[0],1),pending=active.initialPlan.weightExercises[1]?Array.from({length:active.initialPlan.weightExercises[1].setCount},(_,i)=>make(active.initialPlan.weightExercises[1],i+1)):[]
      const snapshot={...active.snapshot.state,performedSets:[first]},revision=(BigInt(active.localRevision)+1n).toString()
      assert.equal((await api('POST',`/api/v1/workout-sessions/${testId}/finish`,{dataGeneration:scope.dataGeneration,editorDeviceId:active.editorDeviceId,writerEpoch:active.writerEpoch,localRevision:revision,snapshot,endedAt:new Date().toISOString()})).status,200)
      const firstClosed=(await api('GET','/api/v1/workout-sessions/'+testId)).body
      await reload();assert.equal(await evaluate(`document.querySelector('[data-session-id="${testId}"] [data-state]').dataset.state`),'incomplete');await screenshot('actual-api-partial-393')
      assert.equal((await api('PATCH',`/api/v1/workout-sessions/${testId}/records`,{dataGeneration:scope.dataGeneration,expectedVersion:firstClosed.version,setCorrections:[],cardioCorrections:[],deletedPerformedSetIds:[first.id],deletedCardioResultIds:[]})).status,200)
      await reload();assert.equal(await evaluate(`!!document.querySelector('[data-session-id="${testId}"]')`),false)
      const corrected=(await api('GET','/api/v1/workout-sessions/'+testId)).body
      if(pending.length){assert.equal((await api('POST',`/api/v1/workout-sessions/${testId}/recoveries`,{dataGeneration:scope.dataGeneration,expectedVersion:corrected.version,confirm:true,origin:{editorDeviceId:active.editorDeviceId,writerEpoch:active.writerEpoch,localRevision:revision},performedSets:pending,cardioResults:[]})).status,200)
        await reload();assert.equal(await evaluate(`!!document.querySelector('[data-session-id="${testId}"]')`),true)
        const restored=(await api('GET','/api/v1/workout-sessions/'+testId)).body;assert.deepEqual(restored.initialPlan,firstClosed.initialPlan);assert.deepEqual(restored.completionAssessment,firstClosed.completionAssessment);assert.equal(sessionAchievement(restored).weight.completed,1);await screenshot('actual-api-recovery-393')}
      passed.push('Actual START/FINISH partial record remains; record deletion filters it; explicit recovery updates counts without changing InitialPlan/first assessment')
    }finally{
      if(testId){const item=(await api('GET','/api/v1/workout-sessions/'+testId)).body;if(item.status!=='ACTIVE'&&!item.deletedAt)assert.equal((await api('DELETE','/api/v1/workout-sessions/'+testId,{dataGeneration:scope.dataGeneration,expectedVersion:item.version})).status,200)}
    }
  }
  const fixture=await createServer({configFile:false,envDir:false,plugins:[react(),{name:'home-cases',configureServer(v){v.middlewares.use('/cases',async(_q,r)=>{r.setHeader('Content-Type','text/html');r.end(await v.transformIndexHtml('/cases','<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/tests/fixtures/home-cases.jsx"></script></html>'))})}}],server:{host:'127.0.0.1',port:0,watch:{ignored:['**/logs/**']}}})
  try{await fixture.listen();await send('Page.navigate',{url:`http://127.0.0.1:${fixture.httpServer.address().port}/cases`});await wait(()=>evaluate(`document.querySelectorAll('[data-case]').length===4`),'component fixtures');assert.equal(await evaluate(`document.querySelector('[data-case="혼합 부분"] [data-state]').dataset.state`),'incomplete');assert.equal(await evaluate(`document.querySelector('[data-case="유산소 완료"] [data-state]').dataset.state`),'complete');assert.equal(await evaluate(`document.querySelector('[data-case="근거 미확인"] [data-state]').dataset.state`),'unknown');await screenshot('component-fixtures-393')}
  finally{await fixture.close()}
  passed.push('Separate component-only fixtures cover weight-only, cardio-only, mixed partial and unknown without fake production data')
  await writeFile(resolve(directory,'details-result.json'),JSON.stringify({runId:evidence.runId,passed,header,off,displayed,excluded,originalMoonPreserved:true,realIPhone:false},null,2));console.log(JSON.stringify({passed,screenshots:directory},null,2))
}
