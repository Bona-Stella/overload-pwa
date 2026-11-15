import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {launchV22Browser,waitFor} from './v22-browser.mjs'

const d=await launchV22Browser(process.argv[2],'.',{shortProfile:true,frontendPort:4174,existingApprovedCatalog:true}),report={flows:[]}
const visible=selector=>d.evaluate('!!document.querySelector('+JSON.stringify(selector)+')')
const clickLabel=label=>d.evaluate('(()=>{const b=[...document.querySelectorAll("button")].find(b=>b.getClientRects().length&&b.getAttribute("aria-label")==='+JSON.stringify(label)+');if(!b)throw Error("missing labelled button");b.click()})()')
const api=async(method,path,body)=>{const r=await d.api(method,path,body);assert([200,201,204].includes(r.status),path+' '+r.status+' '+JSON.stringify(r.body));return r.body}
const shot=async name=>{await d.send('Emulation.setDeviceMetricsOverride',{width:375,height:844,deviceScaleFactor:1,mobile:true});await writeFile(resolve(d.directory,name+'.png'),Buffer.from((await d.send('Page.captureScreenshot',{format:'png'})).data,'base64'))}
try{
 await waitFor(()=>visible('#auth-email'),'login')
 const email=process.argv.includes('--review-account')?JSON.parse(await readFile('../overload-server/docs/dev-data/overload-31-catalog/routine-plans.local.json','utf8')).targetAccount:'seventh-'+crypto.randomUUID()+'@example.invalid'
 await d.input('#auth-email',email);await d.click('이메일로 계속하기')
 await waitFor(()=>d.requests.some(r=>r.path==='/api/v1/auth/email-otp/request'&&r.status===202),'OTP request')
 const challenge=await d.responseForLast('/api/v1/auth/email-otp/request'),message=await d.control('otp',{issuanceId:challenge.challengeId})
 await d.input('#auth-code',message.code);await d.click('코드 확인');await waitFor(()=>visible('nav[aria-label="기본 탐색"]'),'authenticated shell')
 const catalog=await api('GET','/api/v1/standard-exercises/search-data'),owner=await api('GET','/api/v1/routines')
 const choices=catalog.exercises.slice(0,2);assert.equal(choices.length,2)
 for(const [index,reps,mode] of [[0,[10,5],'all'],[1,[5,10],'partial'],[2,[10,5],'none']]){
  const routine=await api('POST','/api/v1/routines',{id:crypto.randomUUID(),dataGeneration:owner.dataGeneration,name:'7차 승인 영속 검증 '+index,weightPlacements:choices.map((e,i)=>({id:crypto.randomUUID(),standardExerciseId:e.id,manufacturerId:null,loadType:i?'DUMBBELL':'PLATE',setCount:1,minReps:6,maxReps:10,initialWeightKg:i?'30':'25'})),cardioPlacements:[]})
  const schedule=await api('GET','/api/v1/weekly-schedule'),preset=schedule.presets.find(p=>p.id===schedule.activePresetId)
  const weekday=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',weekday:'short'}).format(new Date()))+1
  await api('PUT','/api/v1/weekly-schedule/presets/'+preset.id+'/assignments',{dataGeneration:owner.dataGeneration,expectedStateVersion:schedule.stateVersion,expectedPresetVersion:preset.presetVersion,timeZone:'Asia/Seoul',assignments:[{dayOfWeek:weekday,routineId:routine.id}]})
  await d.send('Page.reload');await waitFor(()=>visible('section[aria-label="홈"]'),'home')
  await waitFor(()=>visible('section[aria-label="홈"] details summary'),'routine chooser ready');await d.evaluate('document.querySelector("section[aria-label=홈] details summary").click()');if(await visible('section[aria-label="홈"] details [aria-label="루틴 일정 필터"]'))await d.click('전체','section[aria-label="홈"] details')
  await waitFor(()=>d.evaluate('(()=>{const b=[...document.querySelectorAll("section[aria-label=홈] button")].find(b=>b.querySelector("strong")?.textContent==='+JSON.stringify(routine.name)+');if(!b||b.disabled)return false;b.click();return true})()'),'choose routine')
  await d.click('운동 시작');await waitFor(()=>visible('[data-workout-frame]'),'workout frame');await d.click('준비운동 완료')
  const session=(await api('GET','/api/v1/workout-sessions/active')).session;assert(session)
  for(let i=0;i<2;i++){
   await waitFor(()=>visible('button[aria-label="1세트 이번 반복 횟수"]'),'reps wheel')
   await clickLabel('1세트 이번 반복 횟수');await d.click('직접 입력');await d.input('dialog[open] input',String(reps[i]));await d.click('확인','dialog[open]')
   await d.click('1세트 완료');if(i===0)await d.click('다음 종목으로')
  }
  await d.click('운동 종료 및 요약');await waitFor(()=>visible('[aria-label="중량 검토 카드"]'),'persisted finish guidance')
  const path='/api/v1/workout-sessions/'+session.id,unapproved=await api('GET',path+'/weight-review');assert.equal(unapproved.approvals.length,0);assert.equal(unapproved.frozen.exercises.length,2)
  const expected=mode==='all'?2:mode==='partial'?1:0
  if(mode!=='none'){
   if(mode==='all'){
    await d.click('전체 승인');await d.click('취소','dialog[open]')
    assert.equal((await api('GET',path+'/weight-review')).approvals.length,0)
    await d.click('수정','[aria-label="중량 검토 카드"]');await waitFor(()=>d.evaluate('document.querySelectorAll(".approval-edit-row input").length===2'),'approval checkboxes')
    await d.evaluate('document.querySelectorAll(".approval-edit-row input").forEach(e=>e.click())');await d.click('수정 완료')
    assert(await d.evaluate('[...document.querySelectorAll(".approval-toolbar button")].some(b=>b.textContent==="선택 승인"&&b.disabled)'))
    await d.click('수정','[aria-label="중량 검토 카드"]');await d.evaluate('document.querySelectorAll(".approval-edit-row input").forEach(e=>e.click())');await d.click('수정 완료')
    d.proxy.fault.beforeReview=true
    await d.click('전체 승인');await d.click('승인 확인','dialog[open]')
    await waitFor(()=>d.evaluate('document.querySelector("dialog[open] [role=alert]")?.textContent.includes("승인 저장을 확인하지 못했습니다")'),'failed save is visible inside confirmation')
    assert.equal((await api('GET',path+'/weight-review')).approvals.length,0)
    assert(await visible('[aria-label="중량 검토 카드"]'));d.proxy.fault.beforeReview=false
    await d.click('승인 확인','dialog[open]')
   }else{
    await d.click('수정','[aria-label="중량 검토 카드"]');await waitFor(()=>d.evaluate('document.querySelectorAll(".approval-edit-row input").length===2'),'approval selection rows')
    await d.evaluate('document.querySelectorAll(".approval-edit-row input")[1].click()');await d.click('수정 완료');await d.click('선택 승인');await d.click('승인 확인','dialog[open]')
   }
   await waitFor(async()=>{const v=await api('GET',path+'/weight-review');return v.approvals.length===expected},'committed approval')
   await waitFor(()=>d.evaluate('!document.querySelector("dialog[open]")'),'confirmation closes after real save')
  }
  const saved=await api('GET',path+'/weight-review');assert.equal(saved.approvals.length,expected)
  if(expected){
   const duplicate={dataGeneration:owner.dataGeneration,expectedVersion:unapproved.version,expectedRoutineVersion:unapproved.routineVersion,confirm:true,approvals:unapproved.frozen.exercises.flatMap(item=>{const a=saved.approvals.find(a=>a.sessionExerciseId===item.sessionExerciseId);return a?[{id:a.id,sessionExerciseId:a.sessionExerciseId,previousWeightKg:a.previousWeightKg,nextWeightKg:a.nextWeightKg}]:[]})}
   assert.deepEqual((await api('POST',path+'/weight-review-approvals',duplicate)).approvals,saved.approvals)
  }
  if(mode==='all')assert.equal(await visible('[aria-label="중량 검토 카드"]'),false)
  if(mode==='partial')assert.equal(await d.evaluate('document.querySelectorAll("[aria-label=\\"중량 검토 카드\\"] [data-weight-review]").length'),1)
  await d.click('홈으로 돌아가기');await d.click('기록','nav')
  await waitFor(()=>visible('.recent-records .session-record-card[data-session-id="'+session.id+'"]'),'recent persisted card')
  await d.evaluate('document.querySelector('+JSON.stringify('.recent-records .session-record-card[data-session-id="'+session.id+'"]')+').click()')
  await waitFor(()=>visible('[aria-label="당시 중량 검토"]'),'past frozen review')
  const check=async()=>d.evaluate('(()=>{const c=document.querySelector("[aria-label=\\\"당시 중량 검토\\\"]");return{text:c.textContent,buttons:c.querySelectorAll("button,input").length,rows:[...c.querySelectorAll("[data-weight-review]")].map(r=>r.textContent)}})()')
  let history=await check();assert.equal(history.buttons,0);assert(history.rows[0].includes(expected?'승인 완료':'미승인'));assert(history.rows[1].includes(expected===2?'승인 완료':'미승인'))
  for(const width of [320,375,390,430]){await d.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await d.evaluate('document.documentElement.scrollWidth>innerWidth'),false)}
  await shot('seventh-saved-review-'+index)
  await d.send('Page.reload');await waitFor(()=>visible('[aria-label="당시 중량 검토"]'),'history survives reload');history=await check();assert(history.rows[0].includes(expected?'승인 완료':'미승인'));assert(history.rows[1].includes(expected===2?'승인 완료':'미승인'))
  const latest=await api('GET','/api/v1/routines/'+routine.id)
  await api('PUT','/api/v1/routines/'+routine.id,{dataGeneration:owner.dataGeneration,expectedVersion:latest.version,name:latest.name,weightPlacements:latest.weightPlacements.map(p=>({mode:'EXISTING',id:p.id,manufacturerId:p.manufacturerId,loadType:p.loadType,setCount:p.setCount,minReps:p.minReps,maxReps:p.maxReps})),cardioPlacements:[],weightApprovals:[{placementId:latest.weightPlacements[1].id,nextApprovedWeightKg:'35',occurredAt:new Date().toISOString()}]})
  const after=await api('GET',path+'/weight-review');assert.deepEqual(after.approvals,saved.approvals);assert.deepEqual(after.frozen,unapproved.frozen)
  report.flows.push({sessionId:session.id,reps,approvedCount:after.approvals.length,frozenSurvivesReload:true,routineEditorDoesNotRelabel:true,actualEventIds:after.approvals.map(a=>a.eventId),routineId:routine.id,mode,nextRoutineWeights:latest.weightPlacements.map(p=>p.approvedWeightKg)})
  await d.click('‹ 기록으로');await waitFor(()=>visible('nav[aria-label="기본 탐색"]'),'navigation after detail back');await d.click('홈','nav')
 }

 await d.click('기록','nav');await waitFor(()=>visible('.recent-records .session-record-card'),'real record cache populated')
 await d.evaluate('window.__seventhLoading=[];window.__seventhObserver=new MutationObserver(()=>{if(document.querySelector(".recent-records")&&!document.querySelector(".recent-records").closest("[hidden]")&&document.querySelector(".recent-records").innerText.includes("운동 기록을 불러오는 중입니다"))window.__seventhLoading.push("loading")});window.__seventhObserver.observe(document.body,{subtree:true,childList:true,characterData:true})')
 for(let i=0;i<6;i++){await d.click('홈','nav');await d.click('기록','nav');assert(await visible('.recent-records .session-record-card'))}
 assert.deepEqual(await d.evaluate('window.__seventhObserver.disconnect();window.__seventhLoading'),[])
 report.rapidReentryWithoutLoader=true
 await d.click('운동 현황 ›');await d.input('.record-search input',choices[0].name)
 await waitFor(()=>visible('.record-search li button[aria-label]'),'real exercise detail link')
 await d.evaluate('document.querySelector(".record-search li button[aria-label]").click()')
 await waitFor(()=>visible('.catalog-detail-page'),'existing full catalog detail')
 await waitFor(()=>d.requests.some(r=>r.path==='/api/v1/standard-exercises/'+choices[0].id&&r.status===200),'real existing detail API')
 assert((await d.text('.catalog-detail-page')).includes(choices[0].name))
 await clickLabel('운동 목록으로 돌아가기');await waitFor(()=>visible('.record-search'),'back to original search');report.existingExerciseDetailApi=true

 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date()),monday=new Date(today+'T00:00:00Z');monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7)
 const end=new Date(monday);end.setUTCDate(end.getUTCDate()+7)
 const overview=await api('GET','/api/v1/statistics/overview?fromDate='+monday.toISOString().slice(0,10)+'&toDateExclusive='+end.toISOString().slice(0,10))
 assert.equal(overview.statistics.planCoverage,'FULL_SCHEDULE_HISTORY')
 const sums=new Map();for(const m of overview.statistics.muscles){const s=sums.get(m.groupCode)??[0,0];s[0]+=Number(m.contributionSets);s[1]+=Number(m.weights.plannedSets)*(m.role==='PRIMARY'?1:.5);sums.set(m.groupCode,s)}
 await d.click('기록','nav');await d.click('주간 근육 통계 ›');await d.click('근육별')
 await waitFor(()=>visible('.analysis-subtotal'),'real historic plan muscle subtotal')
 const headers=await d.evaluate('[...document.querySelectorAll(".analysis-group")].map(e=>e.textContent.replace(/\\s/g,""))'),labels={CHEST:'가슴',BACK:'등',SHOULDERS:'어깨',ARMS:'팔',LEGS:'하체',CORE:'코어'}
 for(const [group,[actual,planned]] of sums)assert(headers.some(h=>h.includes(labels[group]+'합계'+actual+'/'+(planned||'—')+'세트')))
 for(const width of [320,375,390,430]){await d.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await d.evaluate('document.documentElement.scrollWidth>innerWidth'),false)}
 report.historicMuscleSubtotals=Object.fromEntries(sums)
 await shot('seventh-real-muscle-subtotals')

 const previous=report.flows[0],routineNow=await api('GET','/api/v1/routines/'+previous.routineId),now=new Date().toISOString(),device=crypto.randomUUID()
 const next=await api('POST','/api/v1/workout-sessions',{id:crypto.randomUUID(),dataGeneration:owner.dataGeneration,routineId:routineNow.id,editorDeviceId:device,startedAt:now,workoutDate:today,startedTimeZone:'Asia/Seoul'})
 assert.deepEqual(next.initialPlan.weightExercises.map(e=>e.approvedWeightKg),routineNow.weightPlacements.map(p=>p.approvedWeightKg))
 await api('POST','/api/v1/workout-sessions/'+next.id+'/finish',{dataGeneration:owner.dataGeneration,editorDeviceId:device,writerEpoch:next.writerEpoch,localRevision:'1',snapshot:next.snapshot.state,endedAt:new Date().toISOString()})
 report.nextWorkoutUsesOfficialApprovals=true
 await writeFile(resolve(d.directory,'seventh-live-api.json'),JSON.stringify(report,null,2));console.log('PASS all/partial/none approvals, cancel/zero/failure/duplicate, home/history/reload, next workout official weights')
}catch(e){console.log(await d.evaluate('document.querySelector("main")?.innerText'));throw e}finally{await d.close()}
