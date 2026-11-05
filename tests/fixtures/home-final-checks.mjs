// Explicit --add-running opts into adding ONE retained synthetic review workout through real APIs.
// An additional temporary partial workout is removed through its own logical-delete API only.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { sessionAchievement } from '../../src/features/home/achievement.ts'
import { dateInZone } from '../../src/features/home/model.ts'

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
export async function runHomeFinal(d){
  const {send,evaluate,click,api,screenshot,wait,passed,directory,evidence}=d
  assert.equal(evidence.database,'overload_v22_isolated')
  assert(![5432,5433].includes(evidence.databasePort))
  const label=execFileSync('docker',['container','inspect',evidence.containerId,'--format','{{index .Config.Labels "com.overload.verification.run"}}'],{windowsHide:true,encoding:'utf8'}).trim()
  assert.equal(label,evidence.runId)
  const checked=async(method,path,body,status=200)=>{const r=await api(method,path,body);assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(r.body)}`);return r.body}
  await send('Page.navigate',{url:'http://127.0.0.1:3000/'})
  await wait(()=>evaluate(`(()=>{if(document.querySelectorAll('nav button').length===4)return true;const b=[...document.querySelectorAll('[aria-label="검토용 로그인"] button')].find(b=>b.textContent==='검토 계정으로 로그인'&&!b.disabled);b?.click();return false})()`),'normal review OTP login',95000)
  const ready=()=>wait(()=>evaluate(`!!document.querySelector('[aria-label="오늘의 루틴"]')&&document.querySelectorAll('[data-session-id]').length===3`),'fresh home with three records')
  const reload=async()=>{await evaluate(`document.documentElement.dataset.finalTest='old'`);await send('Page.reload');await wait(()=>evaluate(`document.documentElement.dataset.finalTest!=='old'&&!!document.querySelector('[aria-label="오늘의 루틴"]')&&document.querySelectorAll('[data-session-id]').length===3`),'new document and home data')}
  await ready()
  assert.equal((await checked('GET','/api/v1/workout-sessions/active')).session,null,'Never replace an existing active workout')
  const list=await checked('GET','/api/v1/routines'),scope={userId:list.userId,dataGeneration:list.dataGeneration}
  const routineDetails=[];for(const r of list.routines)routineDetails.push(await checked('GET','/api/v1/routines/'+r.id))
  const mixed=routineDetails.find(r=>r.weightPlacements.some(w=>!w.deletedAt)&&r.cardioPlacements.some(c=>!c.deletedAt&&c.plan.kind==='TREADMILL'))
  assert(mixed,'Existing mixed treadmill routine required; never create or edit routines')
  const schedulePath='/api/v1/weekly-schedule?timeZone=Asia%2FSeoul',schedule=await checked('GET',schedulePath)
  const original=[];let cursor=null
  for(let page=0;page<3;page++){
    const closed=await checked('GET','/api/v1/workout-sessions/closed?'+new URLSearchParams({limit:'20',...(cursor||{})}))
    for(const row of closed.sessions)original.push({id:row.id,hash:hash(await checked('GET','/api/v1/workout-sessions/'+row.id))})
    cursor=closed.next;if(!cursor)break
  }
  assert.equal(cursor,null,'Baseline must fit the bounded preservation audit')
  const pointer=resolve(directory,'running-record.json')
  const create=async(partial=false)=>{
    const id=randomUUID(),editorDeviceId=randomUUID(),now=Date.now(),start=now-30*60000
    const startBody={id,dataGeneration:scope.dataGeneration,routineId:mixed.id,editorDeviceId,startedAt:new Date(start).toISOString(),workoutDate:dateInZone(new Date(start),'Asia/Seoul'),startedTimeZone:'Asia/Seoul'}
    const active=await checked('POST','/api/v1/workout-sessions',startBody,201)
    const sets=[]
    for(const [index,p]of active.initialPlan.weightExercises.entries())for(let ordinal=1;ordinal<=p.setCount;ordinal++){
      if(partial&&sets.length)break
      sets.push({id:randomUUID(),sessionExerciseId:p.sessionExerciseId,ordinal,weightKg:p.approvedWeightKg,reps:p.minReps,completedAt:new Date(start+60000+index*60000+ordinal*1000).toISOString(),weightContext:{kind:'INITIAL_APPROVED',requestId:null},manufacturerId:p.manufacturerId,loadType:p.loadType})
    }
    const cardio=[]
    if(!partial)for(const p of active.initialPlan.cardioActivities){
      // Explicit synthetic actual measurements for review, never a product default from target speed.
      assert.equal(p.plan.kind,'TREADMILL');assert.equal(p.plan.targetSeconds,1200)
      assert.deepEqual(p.plan.intensity,{mode:'SPEED',value:'8'});assert.equal(p.plan.inclinePercent,null);assert.equal(p.plan.resistance,null)
      cardio.push({id:randomUUID(),sessionActivityId:p.sessionActivityId,status:'COMPLETED',startedAt:new Date(now-1200000).toISOString(),occurredAt:new Date(now).toISOString(),result:{timerMs:1200000,activeMs:1200000,corrected:false,distanceKm:'2.666667',averageBpm:null,measurement:{actualSpeedKmh:'8',distanceSource:'CALCULATED'}}})
    }
    const finishBody={dataGeneration:scope.dataGeneration,editorDeviceId,writerEpoch:active.writerEpoch,localRevision:(BigInt(active.localRevision)+1n).toString(),snapshot:{...active.snapshot.state,performedSets:sets,cardioResults:cardio},endedAt:new Date(now+1).toISOString()}
    if(!partial)await writeFile(pointer,JSON.stringify({runId:evidence.runId,sessionId:id,purpose:'User-requested synthetic mixed running review record; retain in this isolated DB',startBody,finishBody},null,2))
    await checked('POST',`/api/v1/workout-sessions/${id}/finish`,finishBody)
    return checked('GET','/api/v1/workout-sessions/'+id)
  }
  let saved=null
  try{saved=JSON.parse(await readFile(pointer,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
  let running
  if(saved){assert.equal(saved.runId,evidence.runId);running=await checked('GET','/api/v1/workout-sessions/'+saved.sessionId)}
  else{assert(process.argv.includes('--add-running'),'Explicit --add-running required for retained review data');running=await create()}
  assert.equal(running.status,'FINISHED');assert.equal(running.deletedAt,null)
  const achievement=sessionAchievement(running)
  assert.equal(achievement.state,'complete');assert.deepEqual(achievement.weight,{planned:2,completed:2,unknown:0});assert.deepEqual(achievement.cardio,{planned:1,completed:1,unknown:0})
  const card=()=>evaluate(`(()=>{const e=document.querySelector('[data-session-id="${running.id}"]');return e&&{label:e.getAttribute('aria-label'),state:e.querySelector('[data-state]').dataset.state,height:e.getBoundingClientRect().height}})()`)
  await reload();assert.equal((await card()).state,'complete')
  const header=await evaluate(`(()=>{const h=document.querySelector('[aria-label="홈"] header'),b=h.firstElementChild,m=h.querySelector('[aria-label="디로딩"]'),s=getComputedStyle(b);return {font:s.fontSize,weight:s.fontWeight,spacing:s.letterSpacing,width:b.getBoundingClientRect().width,moonWidth:m.getBoundingClientRect().width,moonColor:getComputedStyle(m).backgroundColor}})()`)
  assert.equal(header.font,'18px');assert.equal(header.weight,'700');assert.equal(header.spacing,'1.08px');assert.equal(header.moonWidth,24);assert.equal(header.moonColor,'rgb(108, 147, 198)')
  for(const width of [393,320]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true)
    assert.equal(await evaluate(`(()=>{const e=document.querySelector('[data-session-id="${running.id}"]');return e.scrollWidth<=e.clientWidth})()`),true)
    await screenshot('home-running-'+width);await screenshot('recent-running-'+width,'[aria-label="최근 운동"]')
  }
  await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true})
  await screenshot('header-on-393','[aria-label="홈"] header')
  // Same actual rows: capture the previous outline treatment temporarily; no state/API/storage write.
  await evaluate(`window.beforeIcon=[...document.querySelectorAll('[data-session-id] svg')].map(e=>e.outerHTML);document.querySelectorAll('[data-session-id] svg').forEach(e=>{e.setAttribute('fill','none');e.setAttribute('stroke-width','2');const p=e.querySelectorAll('path')[1];p.setAttribute('d','m2.5 21.5 1.4-1.4m16.2-16.2 1.4-1.4'+p.getAttribute('d'))})`)
  await screenshot('icon-before-393','[aria-label="최근 운동"]')
  await evaluate(`document.querySelectorAll('[data-session-id] svg').forEach((e,i)=>e.outerHTML=window.beforeIcon[i])`)
  await screenshot('icon-after-393','[aria-label="최근 운동"]')
  let partial
  try{
    partial=await create(true);assert.equal(sessionAchievement(partial).state,'incomplete');await reload()
    for(const width of [393,320]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true)
      const states=await evaluate(`[...document.querySelectorAll('[data-session-id]')].map(e=>({id:e.dataset.sessionId,state:e.querySelector('[data-state]').dataset.state}))`)
      assert(states.some(r=>r.id===running.id&&r.state==='complete'));assert(states.some(r=>r.id===partial.id&&r.state==='incomplete'))
      await screenshot('recent-three-cases-'+width,'[aria-label="최근 운동"]')
    }
  }finally{if(partial)await checked('DELETE','/api/v1/workout-sessions/'+partial.id,{dataGeneration:scope.dataGeneration,expectedVersion:partial.version})}
  await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true})
  await send('Page.navigate',{url:'http://127.0.0.1:3000/?analysis=off'});await ready()
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[aria-label="홈"] header').firstElementChild).fontWeight`),'700')
  assert.equal(await evaluate(`!!document.querySelector('[data-review-sample] b')`),false)
  await screenshot('header-off-393','[aria-label="홈"] header')
  await send('Page.navigate',{url:'http://127.0.0.1:3000/__review/wireframe'});await wait(()=>evaluate(`!!document.querySelector('.v12-brand')`),'official HTML')
  await evaluate(`state.homeTags=['PUSH','PULL',null,'PUSH','PULL','LEGS',null];draw()`)
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.v9-week-trunc')].map(e=>e.textContent)`),['PUSH','PULL','휴식','PUSH','PULL','LEGS','휴식'])
  await screenshot('html-tags-fixture-393','.v9-week')
  assert.deepEqual(await checked('GET','/api/v1/routines'),list)
  for(const r of routineDetails)assert.deepEqual(await checked('GET','/api/v1/routines/'+r.id),r)
  assert.deepEqual(await checked('GET',schedulePath),schedule)
  for(const record of original)assert.equal(hash(await checked('GET','/api/v1/workout-sessions/'+record.id)),record.hash,'Existing session unchanged '+record.id)
  assert.equal((await checked('GET','/api/v1/workout-sessions/active')).session,null)
  passed.push('Retained real API mixed running session: frozen plan 2 weight + 1 treadmill, current actual 2/2 + 1/1, complete')
  passed.push('18px/700/0.06em brand ON/OFF, 18px simplified icon, 393/320 no overflow and three actual record cases')
  passed.push('Existing routines, current/pending schedule and all baseline sessions unchanged; no active session; temporary partial removed only')
  passed.push('Official HTML tag sample uses only explicit agreed tags; real routines remain untagged')
  await writeFile(resolve(directory,'final-result.json'),JSON.stringify({runId:evidence.runId,passed,header,retainedSessionId:running.id,routineName:running.initialPlan.routineName,achievement,plan:running.initialPlan,cardio:running.snapshot.state.cardioResults,preservedSessionIds:original.map(r=>r.id),temporaryPartialSessionId:partial?.id,temporaryPartialLogicallyDeleted:true,realIPhone:false},null,2))
  console.log(JSON.stringify({passed,retainedSessionId:running.id,achievement,screenshots:directory},null,2))
}
