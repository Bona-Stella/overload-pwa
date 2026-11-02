import { StrictMode, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthApi } from '/src/features/auth/api.ts'
import { AuthController } from '/src/features/auth/controller.ts'
import { AuthContext } from '/src/features/auth/context.ts'
import { AuthApp } from '/src/features/auth/AuthApp.tsx'
import { WorkoutApi } from '/src/features/workout-online/api.ts'
import { startBody } from '/src/features/workout-online/controller.ts'
import { WorkoutStore } from '/src/features/workout-online/storage.ts'
import { ClosedWorkoutController } from '/src/features/workout-online/closed-controller.ts'
import { LocalWorkoutController } from '/src/features/workout-local/controller.ts'
import * as m from '/src/features/workout-local/model.ts'
import { sealFinish } from '/src/features/workout-local/sync-state.ts'
import '/src/index.css'

const out=document.querySelector('#result'),signal=new AbortController().signal,runId=new URL(location.href).searchParams.get('runId')
const consoleError=console.error.bind(console);console.error=(...args)=>{consoleError(...args);if(args.some(a=>typeof a==='string'&&a.includes('same key')))out.textContent='FAIL duplicate React child keys'}
const check=(ok,label)=>{if(!ok)throw Error(label)}
const wait=async(fn,label)=>{const until=Date.now()+20000;while(Date.now()<until){const result=await fn();if(result)return result;await new Promise(r=>setTimeout(r,30))}throw Error('Timeout '+label)}
const json=async(path,body)=>{const r=await fetch(path,{credentials:'include',cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('Fixture '+r.status);return r.json()}
const fault=b=>json('/__fixture/fault',b),buttons=()=>[...document.querySelectorAll('button')]
const click=async text=>{const b=await wait(()=>buttons().find(b=>b.textContent.trim()===text&&!b.disabled),text);b.click();await new Promise(r=>setTimeout(r,40))}
const input=async(label,value)=>{const e=await wait(()=>[...document.querySelectorAll('label')].find(x=>x.textContent.trim().startsWith(label))?.querySelector('input'),label);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,30))}
const closeDialog=()=>document.querySelector('dialog[open] button[aria-label="닫기"]').click()
const auth=new AuthController(new AuthApi()),api=new WorkoutApi(auth),store=new WorkoutStore(),policy={restLowSeconds:1,restMediumSeconds:1,restHighSeconds:1}
let proof,c,closed,root,online=true
const key=s=>({userId:s.userId,dataGeneration:s.dataGeneration,sessionId:s.id,editorDeviceId:s.editorDeviceId,writerEpoch:s.writerEpoch})
const authorized=()=>auth.getSnapshot().status==='authenticated'&&auth.getSnapshot().pending===null&&auth.getSnapshot().userId===proof.scope.userId
async function pointer(value){const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('overload.test.5d.pointer',1);r.onupgradeneeded=()=>r.result.createObjectStore('pointer');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});try{return await new Promise((resolve,reject)=>{const tx=db.transaction('pointer',value?'readwrite':'readonly',value?{durability:'strict'}:{}),r=value?tx.objectStore('pointer').put(value,'current'):tx.objectStore('pointer').get('current');let result;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(value??result??null);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
const passed=text=>{proof.passed.push(text);out.textContent='RUNNING\n'+proof.passed.join('\n')}
const checkpoint=async phase=>{proof.phase=phase;await pointer(proof);await json('/__fixture/checkpoint',{runId,phase});out.textContent='CHECKPOINT '+phase}
const settle=async()=>{await c.settled();await c.syncSettled()}
const start=async routineId=>{const device=await store.deviceId(),s=await api.start(proof.scope,startBody(proof.scope,routineId,device,crypto.randomUUID(),new Date(),Intl.DateTimeFormat().resolvedOptions().timeZone),signal);await store.saveSession(proof.scope,s);return s}
const editor=async server=>{c=new LocalWorkoutController(store,authorized,undefined,{api,online:()=>online&&authorized()});await c.open(server,policy);await settle();check(c.getSnapshot().writable,'local editor');return c}
const complete=(w,id,n,weight='60.000000')=>{m.editDraft(w,id,n,{weight,reps:'8'});m.completeSet(w,id,n,Date.now())}
const closedEditor=async id=>{closed=new ClosedWorkoutController(api,store,proof.scope,id,authorized);await closed.open();check(closed.getSnapshot().writable,'closed editor');return closed}
export function TestApp(){const state=useSyncExternalStore(auth.subscribe,auth.getSnapshot,auth.getSnapshot);return <AuthContext value={{state,controller:auth}}><AuthApp/></AuthContext>}
const mount=()=>{root=createRoot(document.querySelector('#root'));root.render(<StrictMode><TestApp/></StrictMode>)}
window.confirm=()=>true

async function run(){try{
  proof=await pointer();await auth.start()
  if(!proof){
    const email='finish-'+crypto.randomUUID()+'@example.test';await auth.requestOtp(email);await auth.verifyOtp((await json('/__fixture/otp')).code);check(auth.getSnapshot().status==='authenticated','login')
    const data=await api.bootstrap(auth.getSnapshot().userId,signal)
    const routine=await api.createRoutine(data.scope,{id:crypto.randomUUID(),dataGeneration:data.scope.dataGeneration,name:'5D 실제 종료',weightPlacements:[{manufacturerId:null,loadType:null,id:crypto.randomUUID(),standardExerciseId:data.exercises[0].id,setCount:2,minReps:6,maxReps:10,initialWeightKg:'60'}],cardioPlacements:[{id:crypto.randomUUID(),plan:{kind:'OUTDOOR',name:'야외',targetSeconds:60,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null}}]},signal)
    proof={email,issuedAt:Date.now(),scope:data.scope,routineId:routine.id,passed:[]}
    const server=await start(routine.id);proof.key=key(server);proof.exercise=server.initialPlan.weightExercises[0].sessionExerciseId;proof.cardio=server.initialPlan.cardioActivities[0].sessionActivityId
    await editor(server);await fault({drops:2,delay:900});await c.change(w=>complete(w,proof.exercise,1));await wait(async()=>!!(await store.readLocal(proof.key)).pendingSnapshot,'snapshot started')
    online=false;await c.change(w=>complete(w,proof.exercise,2));await c.change(w=>m.timerAction(w,proof.cardio,'start',Date.now()));c.cardioDraft(proof.cardio,{distance:'0001.250000',bpm:'120'});await c.settled();await new Promise(r=>setTimeout(r,100));await c.change(w=>m.completeCardio(w,proof.cardio,Date.now()))
    const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){const r=put.apply(this,args);if(this.name==='localWorkouts'&&args[0]?.finish)this.transaction.abort();return r}
    try{check(!await c.finish(Date.now()),'failed finish intent not committed')}finally{IDBObjectStore.prototype.put=put}
    check(!(await store.readLocal(proof.key)).finish,'no false intent after abort');await c.finish(Date.now());await settle()
    const local=await store.readLocal(proof.key);proof.endedAt=local.finish.endedAt;proof.firstSnapshot=local.pendingSnapshot.requestJson
    check(!local.finish.request&&local.snapshot.performedSets.length===2&&local.timers[proof.cardio].distance==='0001.250000','offline source persisted')
    passed('실제 IDB 종료 의도 저장 실패는 미확정·재선택 성공 후 endedAt/최종 수행/초안 보존, 진행 중 Snapshot 유지')
    await checkpoint('intent')
  }else{
    if(auth.getSnapshot().status==='anonymous'){
      const cooldown=Math.max(0,proof.issuedAt+60500-Date.now());if(cooldown)await new Promise(r=>setTimeout(r,cooldown))
      await auth.requestOtp(proof.email);await auth.verifyOtp((await json('/__fixture/otp')).code);proof.issuedAt=Date.now()
    }
    check(authorized(),'same owner reauth')
    if(proof.phase==='intent'){
      await fault({finishDrops:2});const server=await api.detail(proof.scope,proof.key.sessionId,signal);await store.saveSession(proof.scope,server);await editor(server)
      const local=await store.readLocal(proof.key),remote=await api.detail(proof.scope,proof.key.sessionId,signal),history=await json('/__fixture/summary')
      check(remote.status==='FINISHED'&&remote.snapshot.state.performedSets.length===2&&remote.snapshot.state.cardioResults.length===1,'atomic final finish facts')
      check(!local.pendingSnapshot&&local.finish.request&& !local.finish.ack&&local.finish.endedAt===proof.endedAt,'finish frozen without ACK')
      const writes=history.requests.filter(r=>r.path.startsWith('/api/v1/workout-sessions/'+proof.key.sessionId+'/')&&r.method!=='GET')
      check(history.snapshots.at(-1)===proof.firstSnapshot&&history.finishes.slice(-2).every(body=>body===local.finish.requestJson)
        &&writes.findIndex(r=>r.path.endsWith('/finish'))>writes.map(r=>r.path.endsWith('/snapshot')).lastIndexOf(true),'snapshot confirmation precedes identical FINISH')
      proof.finishBody=local.finish.requestJson;proof.firstAssessment=JSON.stringify(remote.completionAssessment)
      passed('새 프로세스: 선행 고정 Snapshot 동일 확인 → 최종 Snapshot+FINISH 원자 저장, FINISH ACK 두 번 유실·동일 본문 유지')
      await checkpoint('finish')
    }else if(proof.phase==='finish'){
      await closedEditor(proof.key.sessionId);await closed.confirmFinish(await store.readLocal(proof.key));const local=await store.readLocal(proof.key)
      check(local.finish.ack&&local.finish.requestJson===proof.finishBody&&local.finish.endedAt===proof.endedAt,'cold duplicate FINISH ACK: '+closed.getSnapshot().issue)
      check((await json('/__fixture/summary')).finishes.at(-1)===proof.finishBody,'duplicate FINISH exact body');closed.stop()
      passed('FINISHED 조회 후 별도 편집 잠금: 최초 endedAt/본문으로 duplicate FINISH ACK 로컬 저장·최초 평가 유지')
      mount();await wait(()=>document.querySelector('.closed-workout')?.textContent.includes('완료 수행'),'closed product UI');await wait(()=>buttons().some(b=>b.textContent==='세트 정정·삭제'&&!b.disabled),'closed writable')
      await fault({closedDrops:1});buttons().find(b=>b.textContent==='세트 정정·삭제').click();await input('실제 반복 횟수','3');await click('정정 내용 서버 저장')
      await wait(async()=>{const v=await store.closedWrite(proof.scope,proof.key.sessionId);return v?.status==='CONFIRMED'},'correction lost response confirmed')
      let remote=await api.detail(proof.scope,proof.key.sessionId,signal);check(remote.snapshot.state.performedSets[0].reps===3,'real reps correction');check(JSON.stringify(remote.completionAssessment)===proof.firstAssessment,'first assessment immutable')
      const view=await api.assessment(proof.scope,proof.key.sessionId,signal);check(JSON.stringify(view.currentAssessment.evaluation)!==proof.firstAssessment,'current assessment recalculated')
      passed('제품 종료 세트 정정·응답 유실: 이력 확인 후 확정, 최초 평가 불변·현재 평가 재계산')
      await click('유산소 정정·삭제');await input('실제 거리 km','2.500000');await input('평균 심박수 BPM','130');await click('정정 내용 서버 저장');await wait(()=>!document.querySelector('dialog[open]'),'cardio dialog closed')
      remote=await api.detail(proof.scope,proof.key.sessionId,signal);check(remote.snapshot.state.cardioResults[0].result.distanceKm==='2.5'&&remote.snapshot.state.cardioResults[0].result.timerMs===local.snapshot.cardioResults[0].result.timerMs,'cardio correction preserves timer')
      passed('제품 유산소 허용 수치 정정·원본 timerMs/시각 보존')
      buttons().find(b=>b.textContent==='세트 정정·삭제').click();await input('실제 반복 횟수','7')
      remote=await api.detail(proof.scope,proof.key.sessionId,signal);const first=remote.snapshot.state.performedSets[0]
      await api.records(proof.scope,remote.id,{dataGeneration:proof.scope.dataGeneration,expectedVersion:remote.version,setCorrections:[{id:first.id,weightKg:first.weightKg,reps:6}],cardioCorrections:[],deletedPerformedSetIds:[],deletedCardioResultIds:[]},signal)
      const offset=(await json('/__fixture/summary')).closedWrites.length;await click('정정 내용 서버 저장');await wait(async()=>(await store.closedWrite(proof.scope,proof.key.sessionId))?.status==='PENDING','stale expectedVersion retained');await wait(()=>!buttons().find(b=>b.textContent==='정정 내용 서버 저장').disabled,'conflict settled')
      check((await json('/__fixture/summary')).closedWrites.length===offset+1,'no auto version retry');closeDialog();await click('현재 기록 검토 완료')
      buttons().find(b=>b.textContent==='세트 정정·삭제').click();await input('실제 반복 횟수','7');await click('정정 내용 서버 저장');await wait(()=>!document.querySelector('dialog[open]'),'new explicit correction')
      check((await api.detail(proof.scope,proof.key.sessionId,signal)).snapshot.state.performedSets[0].reps===7,'explicit fresh version')
      passed('실제 409 경합: 원래 expectedVersion/입력 보존·자동 재적용 0건, 최신 기록 검토 후 새 명시 정정')
      buttons().find(b=>b.textContent==='세트 정정·삭제').click();await click('이 수행 논리 삭제');await wait(()=>!document.querySelector('dialog[open]'),'record delete');await click('이 기기의 누락 완료 수행 비교·복구')
      check(document.querySelector('dialog[open]').textContent.includes('삭제되거나 이 기기에서 취소된 기록'),'deleted candidate cannot resurrect');closeDialog()
      check(JSON.stringify((await api.detail(proof.scope,proof.key.sessionId,signal)).completionAssessment)===proof.firstAssessment,'first still immutable after delete')
      await click('운동 전체 논리 삭제');await click('운동 전체 삭제 확인');await wait(()=>document.querySelector('.closed-workout').textContent.includes('삭제된 운동'),'session deleted');root.unmount();root=null
      passed('제품 개별·전체 논리 삭제·변경 이력, tombstone 복구 차단·최초 평가 보존')
      const next=await start(proof.routineId);proof.autoKey=key(next);proof.autoExercise=next.initialPlan.weightExercises[0].sessionExerciseId;await editor(next)
      await c.change(w=>complete(w,proof.autoExercise,1));await settle();online=false
      await c.change(w=>complete(w,proof.autoExercise,2));await c.change(w=>m.changeWeight(w,proof.autoExercise,'65',true,Date.now()));await c.change(w=>complete(w,proof.autoExercise,3,'65'));await c.finish(Date.now());await settle()
      proof.autoOriginal=JSON.stringify(await store.readLocal(proof.autoKey))
      await api.takeover(proof.scope,next.id,{dataGeneration:proof.scope.dataGeneration,editorDeviceId:crypto.randomUUID(),expectedWriterEpoch:'0'},signal);await json('/__fixture/expire',{sessionId:next.id})
      const auto=await api.detail(proof.scope,next.id,signal);check(auto.status==='AUTO_CLOSED'&&auto.endedAt===null&&auto.completionAssessment===null,'real auto closure')
      online=true;await c.retrySync();check(!c.getSnapshot().writable&&JSON.stringify(await store.readLocal(proof.autoKey))===proof.autoOriginal,'old epoch raw preserved');c.stop();await store.saveSession(proof.scope,auto)
      passed('오프라인 종료 후 다른 기기 인수·25시간 AUTO_CLOSED: 자동 FINISH 차단·구 사본과 실제 endedAt 원본 보존')
      mount();await wait(()=>document.querySelector('.closed-workout')?.textContent.includes('서버 자동 종료'),'auto product UI');await wait(()=>buttons().some(b=>b.textContent==='이 기기의 누락 완료 수행 비교·복구'&&!b.disabled),'auto writable');await click('이 기기의 누락 완료 수행 비교·복구')
      const choices=[...document.querySelectorAll('dialog[open] input[type="checkbox"]')];check(choices.length===3&&choices[0].disabled&&!choices[1].disabled&&!choices[2].disabled,'classification original source');choices[1].click();choices[2].click()
      const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){const r=put.apply(this,args),v=args[0];if(this.name==='meta'&&args[1]?.[0]==='closedWrite'&&(v?.ack||v?.status==='CONFIRMED'))this.transaction.abort();return r}
      await fault({closedDrops:1});try{await click('선택한 완료 수행 복구 확인');await wait(async()=>(await api.detail(proof.scope,next.id,signal)).snapshot.state.performedSets.length===3,'real recovery committed');await wait(()=>!buttons().find(b=>b.textContent==='선택한 완료 수행 복구 확인').disabled,'recovery local save failed')}finally{IDBObjectStore.prototype.put=put}
      const pending=await store.closedWrite(proof.scope,next.id);check(pending.status==='PENDING'&&pending.body.origin.writerEpoch==='0'&&pending.body.performedSets.length===2,'original recovery request survives ACK store abort')
      proof.recoveryBody=pending.requestJson;passed('제품 구 사본 선택 복구: 원래 UUID/origin 유지·승인 문맥 확인 불가 안내, 응답 유실+ACK 저장 실패에도 원문 보존')
      await checkpoint('recovery')
    }else if(proof.phase==='recovery'){
      const count=(await json('/__fixture/summary')).closedWrites.length;await closedEditor(proof.autoKey.sessionId)
      const state=closed.getSnapshot();check(state.pending.status==='CONFIRMED'&&state.pending.requestJson===proof.recoveryBody,'recovery result on restart');check((await json('/__fixture/summary')).closedWrites.length===count,'no recovery write replay needed')
      check(state.server.status==='AUTO_CLOSED'&&state.server.endedAt===null&&state.server.completionAssessment===null,'auto state unchanged');check(state.server.snapshot.recordedContexts.some(r=>r.approvalStateAtRecording==='UNVERIFIED'),'server unverifiable context')
      check(state.changes.events.filter(e=>e.changeKind==='RECOVERED').every(e=>e.changeContext.origin.writerEpoch==='0'),'original epoch audit');check(JSON.stringify(await store.readLocal(proof.autoKey))===proof.autoOriginal,'source never overwritten')
      passed('복구 앱 강제 종료 후 상세·RECOVERED 이력으로 결과 확인·재전송 0건, AUTO_CLOSED/최초 평가 null·원본 불변')
      const probe=new ClosedWorkoutController(api,store,proof.scope,proof.autoKey.sessionId,authorized);await probe.open();check(!probe.getSnapshot().writable,'same browser second closed editor readonly');probe.stop();closed.stop()
      passed('종료 후 수정·복구도 동일 브라우저 Web Locks 경쟁에서 두 번째 편집 차단')
      const data=await api.bootstrap(proof.scope.userId,signal)
      const r=await api.createRoutine(proof.scope,{id:crypto.randomUUID(),dataGeneration:proof.scope.dataGeneration,name:'종료 후 승인',weightPlacements:data.exercises.slice(0,2).map(e=>({manufacturerId:null,loadType:null,id:crypto.randomUUID(),standardExerciseId:e.id,setCount:1,minReps:6,maxReps:10,initialWeightKg:'60'})),cardioPlacements:[]},signal)
      const next=await start(r.id);await api.updateRoutine(proof.scope,r.id,{dataGeneration:proof.scope.dataGeneration,expectedVersion:r.version,name:'외부 수정',weightPlacements:r.weightPlacements.map(p=>({mode:'EXISTING',manufacturerId:null,loadType:null,id:p.id,setCount:1,minReps:6,maxReps:10})),cardioPlacements:[],weightApprovals:[]},signal)
      online=false;await editor(next);for(const e of next.initialPlan.weightExercises){await c.change(w=>m.changeWeight(w,e.sessionExerciseId,'65',true,Date.now()));await c.change(w=>complete(w,e.sessionExerciseId,1,'65'))}await c.finish(Date.now());online=true;await c.retrySync();check((await store.readLocal(key(next))).finish.ack,'PENDING does not prevent finish');c.stop()
      await closedEditor(next.id);const contexts=JSON.stringify(closed.getSnapshot().server.snapshot.recordedContexts),first=JSON.stringify(closed.getSnapshot().server.completionAssessment)
      check(closed.getSnapshot().server.snapshot.approvalResults.filter(r=>r.status==='PENDING').length===2,'two closed pending')
      await fault({closedDrops:1});check(await closed.resolve(next.initialPlan.weightExercises[0].sessionExerciseId,'KEEP_CURRENT',''),'closed KEEP loss confirmed');check(await closed.resolve(next.initialPlan.weightExercises[1].sessionExerciseId,'REAPPROVE','72.500000'),'closed REAPPROVE')
      check(JSON.stringify(closed.getSnapshot().server.snapshot.recordedContexts)===contexts&&JSON.stringify(closed.getSnapshot().server.completionAssessment)===first,'closed approval never rewrites recording')
      passed('실제 FINISH PENDING 허용·종료 후 KEEP_CURRENT/REAPPROVE·해결 응답 유실 확인·과거 문맥/최초 평가 불변')
      const page=await api.closed(proof.scope,null,signal);check(page.sessions.some(s=>s.id===proof.key.sessionId&&s.deletedAt)&&page.sessions.some(s=>s.status==='AUTO_CLOSED'),'actual closed listing metadata')
      passed('최소 목록 API: 본인 종료/자동 종료/삭제 메타 조회·다른 기기에서도 이력 진입 가능')
      await fault({closedDelay:700});const srv=closed.getSnapshot().server,record=srv.snapshot.state.performedSets[0]
      const sending=closed.edit({dataGeneration:proof.scope.dataGeneration,expectedVersion:srv.version,setCorrections:[{id:record.id,weightKg:record.weightKg,reps:9}],cardioCorrections:[],deletedPerformedSetIds:[],deletedCardioResultIds:[]})
      await wait(async()=>(await store.closedWrite(proof.scope,next.id))?.status==='PENDING','late response pending');await auth.logout();await sending
      check((await store.closedWrite(proof.scope,next.id)).status==='PENDING','logout preserves pending original');closed.stop();mount();await wait(()=>auth.getSnapshot().status==='anonymous','logout');check(!document.querySelector('.closed-workout'),'logout hides closed data')
      const other=new AuthController(new AuthApi());await other.start();await other.requestOtp('finish-other-'+crypto.randomUUID()+'@example.test');await other.verifyOtp((await json('/__fixture/otp')).code);const otherApi=new WorkoutApi(other),otherData=await otherApi.bootstrap(other.getSnapshot().userId,signal)
      check((await store.localCopies(otherData.scope,next.id)).length===0&&(await otherApi.closed(otherData.scope,null,signal)).sessions.length===0,'different owner no local/server records');await auth.restore();await wait(()=>document.body.textContent.includes('아직 루틴이 없습니다'),'account B UI');check(!document.querySelector('.closed-workout'),'other account no closed data')
      passed('종료 후 요청 전송 중 실제 로그아웃·계정 B 전환: 늦은 응답 차단·미확인 요청/원본 보존·계정 격리')
      root.unmount();root=null;await store.close();out.textContent='PASS '+proof.passed.length+'\n'+proof.passed.join('\n')+'\nFINISH_BROWSER_SUITE_PASS'
    }
  }
}catch(error){out.textContent='FAIL '+error.stack+'\n'+(proof?.passed??[]).join('\n');c?.stop();closed?.stop();root?.unmount();await store.close()}}
async function runExtra(){try{
  await auth.start();await auth.requestOtp('finish-boundary-'+crypto.randomUUID()+'@example.test');check(auth.getSnapshot().challenge?.id,'OTP issuance: '+auth.getSnapshot().issue?.code);await auth.verifyOtp((await json('/__fixture/otp')).code);check(auth.getSnapshot().status==='authenticated','extra login')
  const data=await api.bootstrap(auth.getSnapshot().userId,signal);proof={scope:data.scope,passed:[]}
  const r=await api.createRoutine(data.scope,{id:crypto.randomUUID(),dataGeneration:data.scope.dataGeneration,name:'종료 사본 경계',weightPlacements:[{manufacturerId:null,loadType:null,id:crypto.randomUUID(),standardExerciseId:data.exercises[0].id,setCount:1,minReps:6,maxReps:10,initialWeightKg:'60'}],cardioPlacements:[]},signal),server=await start(r.id),originalKey=key(server)
  online=false;await editor(server);await c.change(w=>complete(w,server.initialPlan.weightExercises[0].sessionExerciseId,1));await c.finish(Date.now())
  const original=await store.readLocal(originalKey),fixed=m.applyLocalChange(original,sealFinish);await store.saveSyncLocal(fixed,original.editVersion,()=>c.getSnapshot().writable);c.stop()
  const next=await api.takeover(proof.scope,server.id,{dataGeneration:proof.scope.dataGeneration,editorDeviceId:crypto.randomUUID(),expectedWriterEpoch:'0'},signal)
  await store.saveSession(proof.scope,next);online=true;await editor(next);await c.finish(Date.now());await settle();check((await api.detail(proof.scope,next.id,signal)).status==='FINISHED','empty takeover finish');c.stop()
  await closedEditor(server.id);const count=(await json('/__fixture/summary')).finishes.length;await closed.confirmFinish(fixed)
  check((await json('/__fixture/summary')).finishes.length===count&&closed.getSnapshot().issue.includes('다른 편집 사본'),'foreign fixed FINISH cannot submit current writer request')
  check(JSON.stringify(await store.readLocal(originalKey))===JSON.stringify(fixed),'foreign finish original preserved');closed.stop()
  passed('실제 빈 인수 사본 종료 성공·다른 기기 FINISHED 이후 구 사본 FINISH 차단·현재 요청으로 대체하지 않음·원문 불변')
  mount();await wait(()=>document.querySelector('.closed-workout')?.textContent.includes('완료 수행'),'closed boundary UI');await wait(()=>buttons().some(b=>b.textContent==='종료 기록 다시 확인'&&!b.disabled),'closed boundary ready')
  const first=JSON.stringify((await api.detail(proof.scope,server.id,signal)).completionAssessment)
  await click('이 기기의 누락 완료 수행 비교·복구');const select=document.querySelector('dialog[open] select'),source=[...select.options].find(o=>o.textContent.includes('완료 웨이트 1개'))
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,source.value);select.dispatchEvent(new Event('change',{bubbles:true}))
  await wait(()=>document.querySelector('dialog[open]').textContent.includes('원본 1세트 · 60 kg × 8회'),'explicit original performance preview');check(!/epoch|revision|hash/.test(document.querySelector('dialog[open]').textContent),'no protocol terms in recovery UI')
  document.querySelector('dialog[open] input[type="checkbox"]:not(:disabled)').click();await click('선택한 완료 수행 복구 확인');await wait(()=>!document.querySelector('dialog[open]'),'FINISHED recovery dialog closed')
  const current=await api.assessment(proof.scope,server.id,signal);check(JSON.stringify(current.completionAssessment)===first&&!JSON.parse(first).exercises[0].eligible&&current.currentAssessment.evaluation.exercises[0].eligible&&current.currentAssessment.evaluation.exercises[0].repsSum==='8','original assessment immutable; current assessment now eligible with actual eight reps')
  await fault({mismatch:true});await click('종료 기록 다시 확인');await wait(()=>!document.querySelector('.closed-workout'),'generation mismatch removes closed UI')
  check(JSON.stringify(await store.readLocal(originalKey))===JSON.stringify(fixed),'generation mismatch preserves old raw copy');passed('제품 FINISHED 선택 복구로 현재 평가 자격/반복 합계 갱신·최초 평가 불변, 세대 불일치 시 상세/평가 숨김·원본 보존')
  root.unmount();root=null;await store.close();out.textContent='PASS '+proof.passed.length+'\n'+proof.passed.join('\n')+'\nFINISH_BROWSER_SUITE_PASS'
}catch(error){out.textContent='FAIL '+error.stack;c?.stop();closed?.stop();root?.unmount();await store.close()}}
await navigator.locks.request('overload.test.5d.harness',{ifAvailable:true},async lock=>{if(!lock){out.textContent='다른 테스트 탭이 재시작을 확인 중입니다.';return}if(new URL(location.href).searchParams.has('edge'))await runExtra();else await run();if(out.textContent.startsWith('CHECKPOINT'))await new Promise(()=>{})})
