// Opt-in production browser checks against the existing, ownership-verified disposable Backend.
// No synthetic API responses, personal database, or mock review route.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { launchV22Browser, waitFor } from './v22-browser.mjs'
const runId=process.argv[2]
const d=await launchV22Browser(runId,'.',{shortProfile:true})
const root='[data-workout-frame]:not([hidden])', dialog='dialog[open]:not(:has(dialog[open]))'
const note=name=>{d.notes.push({name,result:'PASS'});console.log('PASS '+name)}
const has=selector=>d.evaluate(`!!document.querySelector(${JSON.stringify(selector)})`)
const visible=text=>d.evaluate(`[...document.querySelectorAll('body *')].some(e=>e.children.length===0&&e.getClientRects().length&&e.textContent.includes(${JSON.stringify(text)}))`)
const clickAria=async(label,scope=root)=>waitFor(()=>d.evaluate(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(scope+' button[aria-label]')})].find(e=>e.getAttribute('aria-label')===${JSON.stringify(label)}&&!e.disabled&&e.getClientRects().length);if(!e)return false;e.click();return true})()`),'aria button '+label)
async function wheel(label,value){
  await clickAria(label)
  await d.click('직접 입력',dialog)
  await d.input(dialog+' input',value)
  await d.click('확인',dialog)
  await waitFor(async()=>!await has(dialog),'wheel closed')
}
const dbRead=`(async()=>{const db=await new Promise((r,j)=>{const q=indexedDB.open('overload.workout.v1');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});try{return await new Promise((r,j)=>{const t=db.transaction(['localWorkouts'],'readonly'),q=t.objectStore('localWorkouts').getAll();t.oncomplete=()=>r(q.result);t.onabort=()=>j(t.error)})}finally{db.close()}})()`
const local=async id=>(await d.evaluate(dbRead)).find(w=>w.sessionId===id)
const detail=async id=>{const r=await d.api('GET','/api/v1/workout-sessions/'+id);assert.equal(r.status,200);return r.body}
async function saved(id){await waitFor(async()=>{const w=await local(id);return w&&w.syncState==='CLEAN'&&!w.pendingSnapshot},'server snapshot ACK')}
async function reload(){await d.evaluate('window.apiReloadMarker=true');await d.send('Page.reload',{ignoreCache:true});await waitFor(()=>d.evaluate(`window.apiReloadMarker!==true&&!!document.querySelector('${root}')`),'restored approved workout in new document')}
async function memo(value){await d.evaluate(`(()=>{const e=document.querySelector('${root} textarea');e.focus();Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`)}
async function list(){await d.click('종목 보기/변경',root);await waitFor(()=>has(dialog),'exercise list')}
async function select(id){await list();await d.evaluate(`document.querySelector('[data-workout-row="${id}"] button[aria-current], [data-workout-row="${id}"] button[aria-label]').click()`);await waitFor(async()=>!await has(dialog),'selected exercise')}
try{
  await waitFor(()=>has('#auth-email'),'login UI')
  await d.input('#auth-email','workout-flow-'+crypto.randomUUID()+'@example.invalid')
  await d.click('이메일로 계속하기')
  await waitFor(()=>d.requests.some(r=>r.path.endsWith('/email-otp/request')&&r.status===202),'OTP issuance')
  const challenge=await d.responseForLast('/api/v1/auth/email-otp/request')
  const message=await d.control('otp',{issuanceId:challenge.challengeId})
  await d.input('#auth-code',message.code);await d.click('코드 확인')
  await waitFor(()=>has('.workout-online'),'authenticated shell')
  await d.evaluate("window.apiFlowErrors=[];addEventListener('error',e=>window.apiFlowErrors.push(e.error?.stack??e.message));addEventListener('unhandledrejection',e=>window.apiFlowErrors.push(String(e.reason?.stack??e.reason)))")
  const routines=(await d.api('GET','/api/v1/routines')).body
  const choices=(await d.api('GET','/api/v1/standard-exercises/cardio-choices')).body.activities
  const choice=choices.find(c=>c.kind==='OUTDOOR')??choices[0]
  const routine=await d.api('POST','/api/v1/routines',{id:crypto.randomUUID(),name:'실제 API 운동 검증',dataGeneration:routines.dataGeneration,
    weightPlacements:[{id:crypto.randomUUID(),standardExerciseId:d.evidence.catalog.weightExerciseId,manufacturerId:null,loadType:null,setCount:2,minReps:6,maxReps:10,initialWeightKg:'20'},
      {id:crypto.randomUUID(),standardExerciseId:d.evidence.catalog.bodyweightExerciseId,manufacturerId:null,loadType:'BODYWEIGHT',setCount:1,minReps:6,maxReps:10,initialWeightKg:'0'}],
    cardioPlacements:[{id:crypto.randomUUID(),plan:{kind:choice.kind,name:choice.name,standardExerciseId:choice.id,activityId:choice.activityId,targetSeconds:60,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null}}]})
  assert.equal(routine.status,201,JSON.stringify(routine.body))
  await d.click('루틴','nav');if(await visible('루틴 상세'))await d.click('닫기','.workout-online');await d.click('다시 조회','.workout-online')
  await clickAria(routine.body.name+' 상세','.workout-online')
  await d.click('온라인으로 운동 시작','.workout-online')
  await waitFor(()=>has(root),'approved workout frame')
  await d.click('준비운동 완료',root)
  await waitFor(()=>has(root+' textarea'),'weight focus')
  const server=(await d.api('GET','/api/v1/workout-sessions/active')).body.session,id=server.id
  const [first,second]=server.initialPlan.weightExercises.map(e=>e.sessionExerciseId)
  const cardio=server.initialPlan.cardioActivities[0].sessionActivityId
  note('authenticated real routine START renders approved workout UI')
  // Current position/order comes from stable IDs, even when the same standard exercise occurs twice.
  await list()
  await d.evaluate(`document.querySelector('[data-workout-row="${first}"] button[aria-describedby]').focus()`)
  await d.send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown'})
  await d.send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown'})
  await d.click('변경하기',dialog);await saved(id)
  assert.deepEqual((await detail(id)).snapshot.state.appliedPlan.weightExercises.map(e=>e.sessionExerciseId),[second,first])
  assert.equal((await local(id)).currentExerciseId,first)
  note('exercise reorder saves AppliedPlan without switching the current exercise')
  await d.click('중량 변경',root);await clickAria('변경 중량',dialog);await d.click('직접 입력',dialog);await d.input(dialog+' input','22.500000');await d.click('확인',dialog)
  await d.click('확인',dialog)
  await wheel('1세트 이번 반복 횟수','8')
  d.proxy.fault.beforeSnapshot=true
  await clickAria('1세트 완료')
  await waitFor(()=>visible('서버 저장 다시 확인'),'failed snapshot notice')
  assert.equal((await detail(id)).snapshot.state.performedSets.length,0)
  assert.equal((await local(id)).snapshot.performedSets[0].weightKg,'22.5')
  d.proxy.fault.beforeSnapshot=false
  if(await visible('같은 계정 인증 다시 확인')) await d.click('같은 계정 인증 다시 확인'); else await d.click('서버 저장 다시 확인',root)
  await saved(id)
  let actual=(await detail(id)).snapshot.state.performedSets
  assert.equal(actual[0].weightKg,'22.5');assert.equal(actual[0].reps,8)
  note('failed real snapshot preserves completed input and explicit retry saves exact kg/reps')
  await clickAria('1세트 완료 취소');await d.click('완료 취소 확인',dialog);await saved(id)
  assert.equal((await detail(id)).snapshot.state.performedSets.length,0)
  await d.click('중량 변경',root)
  await d.evaluate(`document.querySelector('${dialog} input[type="radio"]:not(:checked)').click()`)
  await d.click('확인',dialog);await saved(id)
  const approved=(await d.api('GET','/api/v1/routines/'+routine.body.id)).body
  assert.equal(approved.weightPlacements.find(p=>p.id===server.initialPlan.weightExercises[0].sourcePlacementId).approvedWeightKg,'22.5')
  assert((await detail(id)).snapshot.approvalResults.some(r=>r.status==='APPLIED'))
  note('explicit progression request is server-applied and updates the real routine approval')
  await wheel('1세트 이번 반복 횟수','9');await clickAria('1세트 완료');await saved(id)
  const newId=(await detail(id)).snapshot.state.performedSets[0].id
  assert.notEqual(newId,actual[0].id)
  await d.click('휴식 종료',root)
  await d.click('세트 기록 / 임시 편집',root);await d.click('2세트 제외',root);await d.click('+ 세트 추가',root);await d.click('편집 닫기',root)
  await wheel('3세트 이번 반복 횟수','7');await clickAria('3세트 완료');await saved(id)
  assert.deepEqual((await detail(id)).snapshot.state.performedSets.map(s=>s.ordinal).sort((a,b)=>a-b),[1,3])
  const progress=(await d.api('GET','/api/v1/workout-sessions/'+id+'/progress-assessment')).body
  assert.equal(progress.kind,'PROVISIONAL')
  assert.equal(progress.evaluation.overallWeightPlanComplete,false)
  assert.equal(progress.evaluation.exercises.find(e=>e.sessionExerciseId===first).advice,'MAINTAIN')
  assert.equal(await visible('서버에 저장됨'),false)
  note('set undo/edit/delete/add preserve stable ordinals; actual provisional response excludes whole-plan gating')
  const text='의자 높이 3 / 손잡이 2 · '+('긴 메모 '.repeat(30))
  await memo(text)
  await waitFor(()=>d.evaluate(`document.querySelector('${root} footer').hidden`),'memo hides footer')
  for(const width of [320,393,1280]){
    await d.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600})
    assert.equal(await d.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true)
  }
  await d.evaluate(`document.querySelector('${root} textarea').blur()`)
  await waitFor(async()=>!(await d.evaluate(`document.querySelector('${root} footer').hidden`)),'footer restored')
  await waitFor(async()=>(await local(id)).equipmentMemos[first]===text,'memo committed locally')
  await reload()
  assert.equal(await d.evaluate(`document.querySelector('${root} textarea').value`),text)
  assert.equal((await local(id)).currentExerciseId,first)
  assert.equal('equipmentMemos' in (await detail(id)).snapshot.state,false)
  note('memo local-only boundary, footer behavior, 320/393/PC widths and reload preservation')
  await select(second)
  await wheel('1세트 이번 반복 횟수','6');await wheel('1세트 추가 중량 kg','2.5');await clickAria('1세트 완료');await saved(id)
  actual=(await detail(id)).snapshot.state.performedSets.find(s=>s.sessionExerciseId===second)
  assert.equal(actual.bodyweightLoad.additionalWeightKg,'2.5');assert.equal(actual.weightKg,'0')
  note('BODYWEIGHT explicit extra stays separate from approved weight')
  await select(first);assert.equal(await d.evaluate(`document.querySelector('${root} textarea').value`),text)
  await select(cardio)
  await d.click('유산소 시작',root);await new Promise(r=>setTimeout(r,1100));await d.click('일시정지',root)
  const paused=(await local(id)).timers[cardio].accumulatedMs
  await reload();assert.equal((await local(id)).timers[cardio].accumulatedMs,paused)
  await d.click('유산소 완료',root)
  await d.labelInput('실제 거리','0.125',root);await d.labelInput('평균 심박수','120',root)
  await d.click('유산소 기록 확정',root);await saved(id)
  actual=(await detail(id)).snapshot.state.cardioResults[0]
  assert.equal(actual.status,'COMPLETED');assert.equal(actual.result.distanceKm,'0.125');assert.equal(actual.result.averageBpm,120)
  note('cardio pause/reload/confirmation stores actual measurements')
  d.proxy.fault.dropFinish=true
  await d.click('운동 종료 및 요약',root)
  await waitFor(()=>d.proxy.records.some(r=>r.path.endsWith('/finish')&&r.failure==='AFTER_BACKEND_200'),'real finish response discarded after commit')
  await waitFor(()=>visible('서버 저장 상태 다시 확인'),'finish response loss')
  const closing=await local(id), ended=closing.finish.endedAt
  assert.equal((await detail(id)).status,'FINISHED')
  assert.equal(await visible('운동 기록 요약'),false)
  d.proxy.fault.dropFinish=false
  if(await visible('같은 계정 인증 다시 확인')) await d.click('같은 계정 인증 다시 확인'); else await d.click('서버 저장 상태 다시 확인',root)
  await waitFor(()=>visible('운동 기록 요약'),'confirmed server summary')
  const finished=await detail(id)
  assert.equal(finished.endedAt,ended);assert.equal(finished.snapshot.state.performedSets.length,3)
  const sends=d.proxy.records.filter(r=>r.path.endsWith('/finish'))
  assert(sends.length>=2);assert.equal(new Set(sends.map(r=>r.requestSha256)).size,1)
  assert(sends.some(r=>r.ack?.duplicate))
  assert.equal(await visible('합성 데이터'),false)
  note('FINISH response loss replays identical request, confirms one session and shows real summary')
  assert.equal(await visible('운동 수행'),false)
  assert.equal(await visible('기록 정정·복구 및 서버 평가 상세'),false)
  await d.click('기록으로 돌아가기')
  await waitFor(()=>has('[aria-label="종료 운동 이력"]'),'record history')
  await d.evaluate(`[...document.querySelectorAll('[aria-label="종료 운동 이력"] button')].find(e=>e.textContent.startsWith(${JSON.stringify(routine.body.name)})).click()`)
  await waitFor(()=>visible('운동 기록 상세'),'history detail')
  assert.equal(await visible('운동 수행'),false)
  assert.equal(await has('[aria-label="웨이트 수행"]'),true)
  await d.evaluate(`document.querySelector('summary[aria-label="운동 기록 메뉴"]').click()`)
  await d.click('기록 정정')
  await waitFor(()=>has('.closed-workout'),'existing correction view')
  await d.evaluate("window.confirm=()=>true")
  assert.match(await d.text('.closed-workout'),/추가 2.5kg × 6회/)
  assert.doesNotMatch(await d.text('.closed-workout'),/0kg × 6회/)
  const correction=finished.snapshot.state.performedSets.find(s=>s.id===newId)
  await clickAria(server.initialPlan.weightExercises.find(e=>e.sessionExerciseId===first).exerciseName+' '+correction.ordinal+'세트 정정','.closed-workout')
  await d.labelInput('실제 중량 kg','-1',dialog);await d.click('변경 저장',dialog)
  assert.equal(await has(dialog),true);assert.equal(await d.evaluate(`document.querySelector('${dialog} input').value`),'-1')
  assert.equal(await has(dialog+' [role="alert"]'),true)
  await writeFile(resolve(d.directory,'integrated-correction-error.png'),Buffer.from((await d.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'))
  await d.labelInput('실제 중량 kg','23.75',dialog);await d.labelInput('실제 반복 횟수','10',dialog)
  assert.equal(await has(dialog+' [role="alert"]'),false,'correcting input removes stale validation feedback')
  await writeFile(resolve(d.directory,'integrated-correction.png'),Buffer.from((await d.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'))
  await d.click('변경 저장',dialog)
  await waitFor(async()=>{const s=await detail(id);return s.snapshot.state.performedSets.some(r=>r.id===newId&&r.weightKg==='23.75'&&r.reps===10)},'closed correction saved')
  await d.click('‹ 운동 기록 상세')
  await waitFor(()=>visible('23.75kg × 10회'),'updated real detail')
  assert.deepEqual((await detail(id)).completionAssessment,finished.completionAssessment)
  note('closed correction updates real summary while preserving immutable completion assessment')
  await d.click('기록으로 돌아가기')
  await waitFor(()=>visible('운동 기록·분석'),'return to real history')
  await d.send('Page.reload',{ignoreCache:true})
  await waitFor(()=>has('nav button'),'shell refresh');await d.click('기록','nav');await waitFor(async()=>await has('.statistics')||await visible('운동 기록 상세'),'restored history or record');if(await visible('운동 기록 상세')) await d.click('기록으로 돌아가기');await waitFor(()=>has('.statistics'),'history refresh')
  assert.equal((await detail(id)).status,'FINISHED')
  note('closed record survives refresh without duplicate session creation')

  // Complete and incomplete guidance are read from the same authenticated assessment response.
  const reviewRoutine=await d.api('POST','/api/v1/routines',{id:crypto.randomUUID(),name:'중량 검토 통합 검증',dataGeneration:routines.dataGeneration,
    weightPlacements:[3,3,4].map(setCount=>({id:crypto.randomUUID(),standardExerciseId:d.evidence.catalog.weightExerciseId,manufacturerId:null,loadType:null,setCount,minReps:8,maxReps:12,initialWeightKg:'45'})),cardioPlacements:[]})
  assert.equal(reviewRoutine.status,201)
  await d.click('루틴','nav');if(await visible('루틴 상세'))await d.click('닫기','.workout-online');await d.click('다시 조회','.workout-online')
  await clickAria(reviewRoutine.body.name+' 상세','.workout-online');await d.click('온라인으로 운동 시작','.workout-online')
  await waitFor(()=>has(root),'review workout START');await d.click('준비운동 완료',root)
  const reviewSession=(await d.api('GET','/api/v1/workout-sessions/active')).body.session,rid=reviewSession.id
  for(let i=0;i<3;i++){
    if(i)await select(reviewSession.initialPlan.weightExercises[i].sessionExerciseId)
    const repetitions=[[12,12,13],[12,12,7],[10,10,9]][i]
    for(let n=1;n<=3;n++){await wheel(n+'세트 이번 반복 횟수',String(repetitions[n-1]));await clickAria(n+'세트 완료');await saved(rid);if(await visible('휴식 종료'))await d.click('휴식 종료',root)}
  }
  await d.click('운동 종료',root);await d.click('운동 종료 및 요약',dialog)
  await waitFor(()=>visible('운동 기록 요약'),'partial workout summary')
  const reviewed=(await d.api('GET','/api/v1/workout-sessions/'+rid+'/assessment')).body
  assert.deepEqual(reviewed.weightReview.exercises.map(e=>e.advice),['INCREASE','DECREASE','DECREASE'])
  assert.deepEqual(reviewed.weightReview.exercises.map(e=>e.sets.map(s=>s.contributes)),[[true,true,true],[false,false,true],[false,false,false]])
  assert(reviewed.currentAssessment.evaluation.exercises.every(e=>!e.eligible))
  const originalAssessment=(await detail(rid)).completionAssessment
  assert.equal(await has('[aria-label="웨이트 수행"]'),true)
  const order=await d.evaluate(`(()=>{const a=[...document.querySelectorAll('article')].find(a=>a.querySelector('h1')?.textContent==='운동 기록 요약');return a.innerText})()`)
  assert(order.indexOf('이번 운동의 중량 검토')<order.indexOf('WEIGHT'))
  assert.doesNotMatch(order,/이번 수행|유지 검토|운동 수행/)
  for(const width of [320,393,1280]){
    await d.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600})
    const layout=await d.evaluate(`(()=>{const rows=[...document.querySelectorAll('[data-weight-review]')];return{overflow:document.documentElement.scrollWidth>innerWidth,counts:rows.map(r=>r.querySelector('[data-incomplete]')?.textContent??null),highlighted:rows.map(r=>r.querySelectorAll('[data-direction]').length),nowrap:[...document.querySelectorAll('[class*="recordHead"]')].every(r=>getComputedStyle(r.lastElementChild).whiteSpace==='nowrap'&&getComputedStyle(r.firstElementChild).fontSize===getComputedStyle(r.lastElementChild).fontSize)}})()`)
    assert.equal(layout.overflow,false);assert.deepEqual(layout.counts,[null,null,'3/4세트']);assert.deepEqual(layout.highlighted,[4,2,1]);assert.equal(layout.nowrap,true)
    await writeFile(resolve(d.directory,'integrated-summary-'+width+'.png'),Buffer.from((await d.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'))
  }
  assert.deepEqual((await detail(rid)).completionAssessment,originalAssessment)
  note('independent complete/partial weight guidance, contribution colors, baseline and one-line record totals at 320/393/PC')
  await d.click('기록으로 돌아가기');await waitFor(()=>has('[aria-label="종료 운동 이력"]'),'review history')
  await d.evaluate(`[...document.querySelectorAll('[aria-label="종료 운동 이력"] button')].find(b=>b.textContent.startsWith(${JSON.stringify(reviewRoutine.body.name)})).click()`)
  await waitFor(()=>visible('운동 기록 상세'),'review record detail')
  await d.evaluate(`document.querySelector('summary[aria-label="운동 기록 메뉴"]').click()`)
  const menu=await d.evaluate(`(()=>{const m=document.querySelector('summary[aria-label="운동 기록 메뉴"]').parentElement;return[...m.querySelectorAll('button')].map(b=>({border:getComputedStyle(b).borderTopWidth,height:b.getBoundingClientRect().height,background:getComputedStyle(b).backgroundColor}))})()`)
  assert(menu.every(m=>m.height>=44&&m.background==='rgba(0, 0, 0, 0)'))
  await d.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});assert.equal(await d.evaluate(`document.querySelector('summary[aria-label="운동 기록 메뉴"]').parentElement.open`),false)
  await d.evaluate(`document.querySelector('summary[aria-label="운동 기록 메뉴"]').click();document.querySelector('h1').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`)
  assert.equal(await d.evaluate(`document.querySelector('summary[aria-label="운동 기록 메뉴"]').parentElement.open`),false)
  await d.evaluate(`document.querySelector('summary[aria-label="운동 기록 메뉴"]').click()`)
  await d.click('평가 변경 이력');await waitFor(()=>visible('운동 종료 당시'),'evaluation history view')
  assert.equal(await visible('현재 기록 기준'),true)
  note('lightweight accessible management menu closes on outside touch/Escape and opens separate readable assessment history')
  await d.click('‹ 운동 기록 상세');await d.click('기록으로 돌아가기')

  // Produce a genuine locally completed record missing from a separately confirmed server finish.
  const recoveryRoutine=await d.api('POST','/api/v1/routines',{id:crypto.randomUUID(),name:'누락 수행 복구 통합 검증',dataGeneration:routines.dataGeneration,
    weightPlacements:[{id:crypto.randomUUID(),standardExerciseId:d.evidence.catalog.weightExerciseId,manufacturerId:null,loadType:null,setCount:1,minReps:6,maxReps:10,initialWeightKg:'20'}],cardioPlacements:[]})
  await d.click('루틴','nav');if(await visible('루틴 상세'))await d.click('닫기','.workout-online');await d.click('다시 조회','.workout-online');await clickAria(recoveryRoutine.body.name+' 상세','.workout-online');await d.click('온라인으로 운동 시작','.workout-online')
  await waitFor(()=>has(root),'recovery workout START');await d.click('준비운동 완료',root)
  const recoverySession=(await d.api('GET','/api/v1/workout-sessions/active')).body.session,cid=recoverySession.id
  d.proxy.fault.beforeSnapshot=true
  await wheel('1세트 이번 반복 횟수','8');await clickAria('1세트 완료');await waitFor(()=>visible('서버 저장 다시 확인'),'actual completed record retained during network failure')
  const copy=await local(cid),missing=copy.snapshot.performedSets[0],confirmed=await detail(cid)
  assert.equal(confirmed.snapshot.state.performedSets.length,0)
  const closedElsewhere=await d.api('POST','/api/v1/workout-sessions/'+cid+'/finish',{dataGeneration:routines.dataGeneration,editorDeviceId:recoverySession.editorDeviceId,writerEpoch:recoverySession.writerEpoch,localRevision:'1',snapshot:confirmed.snapshot.state,endedAt:new Date().toISOString()})
  assert.equal(closedElsewhere.status,200)
  d.proxy.fault.beforeSnapshot=false
  await d.send('Page.reload',{ignoreCache:true});await waitFor(()=>has('nav button'),'recovery shell restored');await d.click('기록','nav')
  await waitFor(async()=>await visible('운동 기록 상세')||await has('[aria-label="종료 운동 이력"]'),'closed recovery target')
  if(!await visible('운동 기록 상세')){
    await d.evaluate(`[...document.querySelectorAll('[aria-label="종료 운동 이력"] button')].find(b=>b.textContent.startsWith(${JSON.stringify(recoveryRoutine.body.name)})).click()`)
    await waitFor(()=>visible('운동 기록 상세'),'recovery detail')
  }
  await d.evaluate(`window.confirm=()=>true;document.querySelector('summary[aria-label="운동 기록 메뉴"]').click()`);await d.click('누락 수행 복구')
  await waitFor(()=>has(dialog+' input[type="checkbox"]:not(:disabled)'),'genuine missing record selectable')
  await writeFile(resolve(d.directory,'integrated-recovery.png'),Buffer.from((await d.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'))
  await d.evaluate(`document.querySelector('${dialog} input[type="checkbox"]:not(:disabled)').click()`)
  await d.click('선택한 수행 복구',dialog);await waitFor(async()=>!await has(dialog),'recovery saved')
  const restored=await detail(cid);assert.equal(restored.snapshot.state.performedSets.length,1)
  assert.equal(restored.snapshot.state.performedSets[0].id,missing.id);assert.equal(restored.snapshot.state.performedSets[0].reps,8);assert.equal(restored.snapshot.state.performedSets[0].weightKg,'20')
  await d.evaluate(`document.querySelector('summary[aria-label="운동 기록 메뉴"]').click()`);await d.click('누락 수행 복구')
  assert.equal(await d.evaluate(`document.querySelectorAll('${dialog} input[type="checkbox"]:not(:disabled)').length`),0)
  await d.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'})
  note('real missing local completion recovers through redesigned UI with original UUID/value and cannot be recovered twice')
  await writeFile(resolve(d.directory,'workout-flow-api-result.json'),JSON.stringify({runId,passed:d.notes,requests:d.requests,writeEvidence:d.proxy.records},null,2))
}catch(error){
  await writeFile(resolve(d.directory,'workout-flow-api-failure.txt'),String(error.stack)+'\n'+await d.text()+'\n'+await d.evaluate('JSON.stringify(window.apiFlowErrors)'))
  throw error
}finally{await d.close()}
