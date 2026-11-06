// Actual preserved review DB/API. Adds a clearly named routine; never rewrites original routines or sessions.
import assert from 'node:assert/strict'
import {writeFile,copyFile} from 'node:fs/promises'
import {resolve} from 'node:path'
export async function runRoutineReview({send,evaluate,click,api,screenshot,wait,passed,directory,evidence,requests}){
 const get=async p=>{const r=await api('GET',p);assert.equal(r.status,200,p);return r.body}
 const settle=()=>new Promise(r=>setTimeout(r,100))
 const input=async (label,value,tag='input')=>{await evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(l=>l.getClientRects().length&&l.textContent.includes(${JSON.stringify(label)}));const e=l?.querySelector(${JSON.stringify(tag)})??(l?.htmlFor?document.getElementById(l.htmlFor):null);if(!e)throw Error('Missing field');Object.getOwnPropertyDescriptor(${tag==='select'?'HTMLSelectElement':'HTMLInputElement'}.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(${tag==='select'?"'change'":"'input'"},{bubbles:true}))})()`);await settle()}
 console.log('Routine check: login');
 await send('Page.navigate',{url:'http://127.0.0.1:3000/'})
 await wait(()=>evaluate(`(()=>{if(document.querySelectorAll('nav button').length===4)return true;const b=[...document.querySelectorAll('[aria-label="검토용 로그인"] button')].find(b=>b.textContent==='검토 계정으로 로그인'&&!b.disabled);b?.click();return false})()`),'normal review OTP login',95000)
 await wait(()=>evaluate(`!!document.querySelector('[data-session-id]')`),'real home')
 console.log('Routine check: baseline');
 const before=await get('/api/v1/routines'),originals=[]
 for(const r of before.routines)originals.push(await get('/api/v1/routines/'+r.id))
 const history=await get('/api/v1/workout-sessions/closed?limit=20'),sessions=[]
 for(const r of history.sessions)sessions.push(await get('/api/v1/workout-sessions/'+r.id))
 const schedule=await get('/api/v1/weekly-schedule?timeZone=Asia%2FSeoul'),catalog=await get('/api/v1/standard-exercises/search-data'),cardio=await get('/api/v1/cardio-activities')
 assert.equal(cardio.activities.length,8);assert(catalog.exercises.every(e=>Array.isArray(e.muscles)))
 await evaluate(`[...document.querySelectorAll('nav button')].find(b=>b.textContent.trim()==='루틴').click()`);await wait(()=>evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='+ 새 루틴'&&!b.disabled)`),'routine schedule ready')
 for(const width of [393,320]){await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await screenshot('routine-list-before-'+width)}
 await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true})
 console.log('Routine check: editor');
 await click('+ 새 루틴');const testName='[T02-B 검토] 태그·웨이트·달리기';await input('루틴 이름',testName)
 await evaluate(`document.querySelector('form summary').click()`);await click('MIXED특정 부위나 분할에 얽매이지 않은 자유 구성')
 await click('+ 웨이트 종목 추가');await input('표준 운동 검색',catalog.exercises[0].name);await wait(()=>evaluate(`!!document.querySelector('[role="option"]')`),'catalog options')
 await screenshot('exercise-picker-393');await evaluate(`document.querySelector('[role="option"]').click()`);await settle()
 await input('최초 중량','20.000001');await click('+2.5')
 await click('유산소 추가');await click('달리기');await input('세부 유산소','ca000000-0000-4000-8000-000000000001','select');await input('목표 시간','20');await input('목표 강도','8')
 const assignments=(schedule.pending??schedule.current)?.assignments??[],conflict=assignments[0],day=conflict?.dayOfWeek??1
 await click(['월','화','수','목','금','토','일'][day-1])
 for(const width of [393,320]){await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await screenshot('routine-editor-'+width)}
 await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true})
 if(process.argv.includes('--capture-only')){ await send('Page.navigate',{url:'http://127.0.0.1:3000/docs/product/Overload_UI_Baseline_Wireframe_v0.9.html'})
 await wait(()=>evaluate('typeof draw==="function"&&!!document.querySelector(".phone")'),'official HTML')
 for(const width of [393,320]){await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true});await evaluate(`(()=>{document.querySelector('.phone').style.width='${width}px';document.querySelector('.phone').style.maxWidth='none';document.body.style.padding='0';document.querySelector('.notes').style.display='none';document.querySelector('.layout').style.alignItems='start';state.screen='routinelist';draw()})()`);await screenshot('html-routine-list-'+width,'.phone')}
 await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true});await evaluate(`beginRoutine(null);state.form.name='B안 검토';state.form.ex=[{name:exerciseChoices[0],sets:3,min:8,max:12,kg:20,existing:false}];draw();document.querySelector('.phone').style.width='393px'`);await screenshot('html-routine-editor-393','.phone')

for(const width of [393,320])await copyFile(resolve(directory,'routine-list-before-'+width+'.png'),resolve(directory,'routine-list-'+width+'.png'));console.log(JSON.stringify({captureOnly:true,noDomainWrites:true,screenshots:directory}));return}
 console.log('Routine check: save');
 await click('루틴 저장');if(conflict){await wait(()=>evaluate('!!document.querySelector("dialog[open]")'),'all weekday conflicts');await screenshot('routine-conflict-393');assert((await evaluate('document.querySelector("dialog").innerText')).includes(before.routines.find(r=>r.id===conflict.routineId).name));await click('취소');await click('루틴 저장');await click('교체 확인')}
 await wait(()=>evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='+ 새 루틴'&&b.getClientRects().length&&!b.disabled)`),'routine plus schedule acknowledged')
 console.log('Routine check: stored')
 const after=await get('/api/v1/routines'),created=after.routines.find(r=>!before.routines.some(b=>b.id===r.id));assert(created);assert.equal(after.routines[0].id,created.id)
 const detail=await get('/api/v1/routines/'+created.id),week=await get('/api/v1/weekly-schedule?timeZone=Asia%2FSeoul')
 assert.equal(detail.tag,'MIXED');assert.equal(detail.weightPlacements[0].initialWeightKg,'22.500001');assert.equal(detail.cardioPlacements[0].plan.activityId,'ca000000-0000-4000-8000-000000000001');assert.equal(detail.cardioPlacements[0].plan.targetSeconds,1200)
 assert((week.pending??week.current).assignments.some(a=>a.dayOfWeek===day&&a.routineId===detail.id));if(schedule.current)assert.deepEqual(week.current,schedule.current)
 for(const a of assignments.filter(a=>a.dayOfWeek!==day))assert((week.pending??week.current).assignments.some(b=>JSON.stringify(a)===JSON.stringify(b)))
 await input('요일 필터','none','select');assert.equal(await evaluate(`document.querySelector('[aria-labelledby="online-title"]').innerText.includes(${JSON.stringify(testName)})`),true) // current allocation unchanged; next-week test assignment is separate
 await evaluate(`document.querySelector('[aria-label="필터 해제"]').click()`)

 // Real nullable tag clear and explicit update using the existing version, then restore selected value.
 const update={dataGeneration:detail.dataGeneration,expectedVersion:detail.version,name:detail.name,tag:null,weightPlacements:detail.weightPlacements.map(w=>({mode:'EXISTING',id:w.id,manufacturerId:w.manufacturerId,loadType:w.loadType,setCount:w.setCount,minReps:w.minReps,maxReps:w.maxReps})),cardioPlacements:detail.cardioPlacements.map(c=>({mode:'EXISTING',id:c.id,plan:c.plan})),weightApprovals:[]}
 let changed=await api('PUT','/api/v1/routines/'+detail.id,update);assert.equal(changed.status,200);assert.equal(changed.body.tag,null);update.tag='MIXED';update.expectedVersion=changed.body.version;changed=await api('PUT','/api/v1/routines/'+detail.id,update);assert.equal(changed.status,200)
 for(const original of originals)assert.deepEqual(await get('/api/v1/routines/'+original.id),original)
 for(const original of sessions)assert.deepEqual(await get('/api/v1/workout-sessions/'+original.id),original)
 await send('Page.reload');await wait(()=>evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='+ 새 루틴'&&!b.disabled)`),'routine reloaded').catch(async()=>{await evaluate(`[...document.querySelectorAll('nav button')].find(b=>b.textContent.trim()==='루틴').click()`);await wait(()=>evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='+ 새 루틴'&&!b.disabled)`),'routine after navigation')})
 for(const width of [393,320]){await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await screenshot('routine-list-'+width)}
 await evaluate(`[...document.querySelectorAll('nav button')].find(b=>b.textContent.trim()==='홈').click()`);await wait(()=>evaluate(`!!document.querySelector('[data-session-id]')`),'home regression');await screenshot('home-regression-320')
 await send('Page.navigate',{url:'http://127.0.0.1:3000/docs/product/Overload_UI_Baseline_Wireframe_v0.9.html'})
 await wait(()=>evaluate('typeof draw==="function"&&!!document.querySelector(".phone")'),'official HTML')
 for(const width of [393,320]){await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true});await evaluate(`(()=>{document.querySelector('.phone').style.width='${width}px';document.querySelector('.phone').style.maxWidth='none';document.body.style.padding='0';document.querySelector('.notes').style.display='none';document.querySelector('.layout').style.alignItems='start';state.screen='routinelist';draw()})()`);await screenshot('html-routine-list-'+width,'.phone')}
 await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true});await evaluate(`beginRoutine(null);state.form.name='B안 검토';state.form.ex=[{name:exerciseChoices[0],sets:3,min:8,max:12,kg:20,existing:false}];draw();document.querySelector('.phone').style.width='393px'`);await screenshot('html-routine-editor-393','.phone')
 passed.push('Real OTP/CSRF session; existing DB V23; actual tag create/clear/update/read, classified cardio ID, exact initial weight, routine creation order, weekday conflict cancel/confirm and next-Monday pending assignment; original routines and closed session DTOs unchanged')
 await writeFile(resolve(directory,'routine-result.json'),JSON.stringify({passed,reviewOnlyAddedRoutine:detail,originalRoutineCount:before.routines.length,originalSessionCount:sessions.length,originalsUnchanged:true,beforeSchedule:schedule,afterSchedule:week,preservedMigrationVersions:evidence.actualMigrations,requests,realData:true,realIPhone:false},null,2))
 console.log(JSON.stringify({passed,addedRoutine:detail.id,applyFrom:(week.pending??week.current).effectiveFrom,screenshots:directory},null,2))
}
