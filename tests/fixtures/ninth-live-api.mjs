import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {launchV22Browser,waitFor} from './v22-browser.mjs'
const d=await launchV22Browser(process.argv[2],'.',{shortProfile:true,frontendPort:4174,existingApprovedCatalog:true,confirmDialogs:true}),report={records:[]}
const visible=selector=>d.evaluate('!!document.querySelector('+JSON.stringify(selector)+')')
const api=async(method,path,body)=>{const r=await d.api(method,path,body);assert([200,201,204].includes(r.status),path+' '+r.status+' '+JSON.stringify(r.body));return r.body}
const watchdog=setTimeout(()=>{void d.send('Browser.close').catch(()=>{})},120000)
const shot=async name=>writeFile(resolve(d.directory,name+'.png'),Buffer.from((await d.send('Page.captureScreenshot',{format:'png'})).data,'base64'))
try{
 await waitFor(()=>visible('#auth-email'),'login')
 await d.input('#auth-email','ninth-'+crypto.randomUUID()+'@example.invalid');await d.click('이메일로 계속하기')
 await waitFor(()=>d.requests.some(r=>r.path==='/api/v1/auth/email-otp/request'&&r.status===202),'OTP request')
 const challenge=await d.responseForLast('/api/v1/auth/email-otp/request'),message=await d.control('otp',{issuanceId:challenge.challengeId})
 await d.input('#auth-code',message.code);await d.click('코드 확인');await waitFor(()=>visible('nav[aria-label="기본 탐색"]'),'authenticated shell')
 const catalog=await api('GET','/api/v1/standard-exercises/search-data'),owner=await api('GET','/api/v1/routines'),cardioCatalog=await api('GET','/api/v1/standard-exercises/cardio-choices')
 const activity=cardioCatalog.activities.find(a=>a.kind==='OUTDOOR')??cardioCatalog.activities[0];assert(activity)
 for(const mode of ['mixed','weight','cardio']){
  const routine=await api('POST','/api/v1/routines',{id:crypto.randomUUID(),dataGeneration:owner.dataGeneration,name:'9차 기록 검증 '+mode,weightPlacements:mode==='cardio'?[]:[{id:crypto.randomUUID(),standardExerciseId:catalog.exercises[0].id,manufacturerId:null,loadType:'PLATE',setCount:1,minReps:6,maxReps:10,initialWeightKg:'25'}],cardioPlacements:mode==='weight'?[]:[{id:crypto.randomUUID(),plan:{activityId:activity.activityId,standardExerciseId:activity.id,kind:activity.kind,name:activity.name,targetSeconds:1200,targetDistanceKm:'2.5',intensity:null,inclinePercent:null,resistance:null}}]})
  const end=Date.now()-1000,start=end-4200000,iso=n=>new Date(n).toISOString(),date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date(start)),device=crypto.randomUUID()
  const s=await api('POST','/api/v1/workout-sessions',{id:crypto.randomUUID(),dataGeneration:owner.dataGeneration,routineId:routine.id,editorDeviceId:device,startedAt:iso(start),workoutDate:date,startedTimeZone:'Asia/Seoul'})
  const state=s.snapshot.state
  if(mode!=='cardio'){
   state.performedSets=[{id:crypto.randomUUID(),sessionExerciseId:s.initialPlan.weightExercises[0].sessionExerciseId,ordinal:1,weightKg:'25',reps:10,completedAt:iso(start+2400000),manufacturerId:null,loadType:'PLATE',weightContext:{kind:'INITIAL_APPROVED',requestId:null}}]
   state.weightTiming={schemaVersion:1,complete:true,intervals:[{startedAt:iso(start),endedAt:iso(start+2400000)}]}
  }
  if(mode!=='weight')state.cardioResults=[{id:crypto.randomUUID(),sessionActivityId:s.initialPlan.cardioActivities[0].sessionActivityId,status:'COMPLETED',startedAt:iso(start+3000000),occurredAt:iso(end),result:{timerMs:1200000,activeMs:1200000,corrected:false,distanceKm:mode==='mixed'?'1.5':'2.5',averageBpm:null,measurement:{actualSpeedKmh:null,distanceSource:'MANUAL'}}}]
  await api('POST','/api/v1/workout-sessions/'+s.id+'/finish',{dataGeneration:owner.dataGeneration,editorDeviceId:device,writerEpoch:s.writerEpoch,localRevision:'1',snapshot:state,endedAt:iso(end)})
  if(mode==='mixed'){
   const review=await api('GET','/api/v1/workout-sessions/'+s.id+'/weight-review'),item=review.frozen.exercises[0]
   assert.equal(item.recommendedWeightKg,'30')
   await api('POST','/api/v1/workout-sessions/'+s.id+'/weight-review-approvals',{dataGeneration:owner.dataGeneration,expectedVersion:review.version,expectedRoutineVersion:review.routineVersion,confirm:true,approvals:[{id:crypto.randomUUID(),sessionExerciseId:item.sessionExerciseId,previousWeightKg:'25',nextWeightKg:'27.5'}]})
  }
  const saved=await api('GET','/api/v1/workout-sessions/'+s.id)
  report.records.push({id:s.id,mode,version:saved.version,initialPlan:saved.initialPlan,snapshot:saved.snapshot.state,startedAt:saved.startedAt,endedAt:saved.endedAt})
 }
 console.log('STEP saved three records and manual approval')
 await d.send('Page.reload');await waitFor(()=>visible('nav[aria-label="기본 탐색"]'),'reloaded shell');await d.click('기록','nav')
 const mixed=report.records.find(r=>r.mode==='mixed'),selector=id=>'.session-record-card[data-session-id="'+id+'"]'
 await waitFor(()=>d.evaluate('document.querySelector('+JSON.stringify(selector(mixed.id))+')?.dataset.sessionVersion!==undefined'),'recent persisted details')
 const recent=await d.evaluate('[...document.querySelectorAll(".session-record-card")].map(e=>({id:e.dataset.sessionId,text:e.textContent,version:e.dataset.sessionVersion}))')
 const mixedRecent=recent.find(r=>r.id===mixed.id);assert.match(mixedRecent.text,/01:10.*00:40.*00:20/);assert.match(mixedRecent.text,/250kg/);assert.match(mixedRecent.text,/1.5km/)
 const cardio=recent.find(r=>r.id===report.records.find(r=>r.mode==='cardio').id);assert.doesNotMatch(cardio.text,/웨이트|세트|총중량/);assert.match(cardio.text,/2.5km/)
 const weight=recent.find(r=>r.id===report.records.find(r=>r.mode==='weight').id);assert.doesNotMatch(weight.text,/유산소|거리|km/)
 for(const width of [320,375,390,430]){await d.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await d.evaluate('document.documentElement.scrollWidth>innerWidth'),false)}
 await shot('ninth-real-recent')
 await d.click('전체 보기 ›');await waitFor(()=>visible('#workout-history-title'),'full history')
 await waitFor(()=>d.evaluate('document.querySelector('+JSON.stringify(selector(mixed.id))+')?.dataset.sessionVersion==='+JSON.stringify(mixedRecent.version)),'full same version')
 assert.match(await d.text(selector(mixed.id)),/1:10:00.*250kg.*40:00.*20:00/s)
 await d.evaluate('document.querySelector('+JSON.stringify(selector(mixed.id))+').click()');await waitFor(()=>visible('[aria-label="당시 중량 검토"]'),'saved approval detail')
 let history=await d.text('[aria-label="당시 중량 검토"]');assert.match(history,/25kg.*27.5kg/s);assert.match(history,/승인 완료/);assert.doesNotMatch(history,/2026|当時|당시 권고|오후|오전/)
 const columns=await d.evaluate('[...document.querySelector("[aria-label=\\"운동 기록 요약\\"]").querySelectorAll("strong")].map(e=>e.textContent)')
 assert.deepEqual(columns,['1:10:00','10:00','40:00','1/1','20:00','0/1'])
 assert.match(await d.text('article:has([aria-label="운동 기록 요약"])'),/△ 거리 목표 미달/)
 for(const width of [320,375,390,430]){await d.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await d.evaluate('document.documentElement.scrollWidth>innerWidth'),false)}
 await shot('ninth-real-detail')
 console.log('STEP compared recent/history/detail at all widths')
 await d.evaluate('document.querySelector("summary[aria-label=\\"운동 기록 메뉴\\"]").click()');await d.click('기록 정정')
 await waitFor(()=>visible('[aria-label$="1세트 정정"]'),'set correction');await d.evaluate('document.querySelector("[aria-label$=\\"1세트 정정\\"]").click()')
 await waitFor(()=>visible('dialog[open]'),'correction dialog');await d.input('dialog[open] input[inputmode="numeric"]','12');await d.click('변경 저장','dialog[open]');await waitFor(()=>d.evaluate('!document.querySelector("dialog[open]")'),'correction saved')
 console.log('STEP corrected actual repetitions')
 await d.click('‹ 운동 기록 상세');await d.click('‹ 기록으로');await waitFor(()=>visible('nav[aria-label="기본 탐색"]'),'record parent');await d.click('기록','nav')
 await waitFor(()=>d.evaluate('document.querySelector('+JSON.stringify(selector(mixed.id))+')?.textContent.includes("300kg")'),'same-ID correction refresh in recent')
 const corrected=await api('GET','/api/v1/workout-sessions/'+mixed.id),reviewAfter=await api('GET','/api/v1/workout-sessions/'+mixed.id+'/weight-review')
 assert.equal(corrected.snapshot.state.performedSets[0].reps,12);assert.equal(reviewAfter.approvals[0].nextWeightKg,'27.5');assert.equal(reviewAfter.frozen.exercises[0].guidance.sets[0].reps,10)
 assert.deepEqual(corrected.snapshot.state.weightTiming,mixed.snapshot.weightTiming)
 await d.click('전체 보기 ›');await waitFor(()=>d.evaluate('document.querySelector('+JSON.stringify(selector(mixed.id))+')?.textContent.includes("300kg")'),'same corrected full history')
 await d.send('Page.reload');await waitFor(()=>d.evaluate('document.querySelector('+JSON.stringify(selector(mixed.id))+')?.textContent.includes("300kg")'),'reload retains correction')
 report.sameSessionRecentAndHistory=true;report.correctionRefreshSameId=true;report.reloadRetainsCorrection=true;report.approvalAndMeasuredIntervalsPreserved=true;report.sixFacts=columns
 await writeFile(resolve(d.directory,'ninth-live-api.json'),JSON.stringify(report,null,2));console.log('PASS real records, six facts, conditional types, manual approval, same-ID correction refresh, history/reload consistency and preserved timing')
}catch(e){console.log(await Promise.race([d.evaluate('document.querySelector("main")?.innerText'),new Promise(r=>setTimeout(()=>r('Test browser unavailable'),1000))]));throw e}finally{clearTimeout(watchdog);await d.close()}
