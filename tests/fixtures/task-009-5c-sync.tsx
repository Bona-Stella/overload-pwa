import { StrictMode, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthApi } from '/src/features/auth/api.ts'
import { AuthController } from '/src/features/auth/controller.ts'
import { AuthContext } from '/src/features/auth/context.ts'
import { AuthApp } from '/src/features/auth/AuthApp.tsx'
import { WorkoutApi } from '/src/features/workout-online/api.ts'
import { startBody, WorkoutOnlineController } from '/src/features/workout-online/controller.ts'
import { WorkoutStore } from '/src/features/workout-online/storage.ts'
import { LocalWorkoutController } from '/src/features/workout-local/controller.ts'
import { acquireEditor } from '/src/features/workout-local/lock.ts'
import * as m from '/src/features/workout-local/model.ts'
import { sealSnapshot } from '/src/features/workout-local/sync-state.ts'
import '/src/index.css'

const out=document.querySelector('#result'),signal=new AbortController().signal
const check=(condition,label)=>{if(!condition)throw Error(label)}
const wait=async(fn,label)=>{const end=Date.now()+18000;while(Date.now()<end){const v=await fn();if(v)return v;await new Promise(r=>setTimeout(r,25))}throw Error('Timeout '+label)}
const json=async(path,body)=>{const r=await fetch(path,{credentials:'include',cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('Fixture HTTP '+r.status+' '+path);return r.json()}
const fault=body=>json('/__fixture/fault',body)
const buttons=()=>[...document.querySelectorAll('button')]
const click=async text=>{const b=await wait(()=>buttons().find(x=>x.textContent.trim()===text&&!x.disabled),text);b.click();await new Promise(r=>setTimeout(r,35))}
const input=async(label,value)=>{const e=await wait(()=>document.querySelector('input[aria-label="'+label+'"]')??[...document.querySelectorAll('label')].find(x=>x.textContent.trim().startsWith(label))?.querySelector('input'),label);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,value);e.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,35))}
const auth=new AuthController(new AuthApi()),api=new WorkoutApi(auth),store=new WorkoutStore()
let proof=JSON.parse(sessionStorage.getItem('phase5c')??'null'), c
const persist=()=>sessionStorage.setItem('phase5c',JSON.stringify(proof))
async function pointer(value){
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('overload.test.5c.pointer',1);r.onupgradeneeded=()=>r.result.createObjectStore('pointer');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})
  try{return await new Promise((resolve,reject)=>{const tx=db.transaction(['pointer'],value?'readwrite':'readonly',value?{durability:'strict'}:{}),store=tx.objectStore('pointer'),r=value?store.put(value,'current'):store.get('current');let result;r.onsuccess=()=>{result=r.result};tx.oncomplete=()=>resolve(value??result??null);tx.onabort=()=>reject(tx.error)})}finally{db.close()}
}
const checkpoint=async()=>{
  persist()
  // Test resumption metadata only. Product workload is persisted independently by WorkoutStore.
  await pointer(proof)
  await json('/__fixture/checkpoint',{runId:new URL(location.href).searchParams.get('runId'),phase:proof.phase})
  out.textContent='CHECKPOINT '+proof.phase
}
const passed=text=>{proof.passed.push(text);persist();out.textContent='RUNNING\n'+proof.passed.join('\n')}
const keyOf=s=>({userId:s.userId,dataGeneration:s.dataGeneration,sessionId:s.id,editorDeviceId:s.editorDeviceId,writerEpoch:s.writerEpoch})
const settle=async()=>{await c.settled();await c.syncSettled()}
const read=()=>store.readLocal(proof.key)
const editor=async server=>{
  c=new LocalWorkoutController(store,()=>auth.getSnapshot().userId===server.userId||auth.getSnapshot().localWorkoutUserId===server.userId,undefined,{api,online:()=>auth.getSnapshot().status==='authenticated'&&auth.getSnapshot().pending===null})
  await c.open(server,proof.settings);await settle();check(c.getSnapshot().writable,'editor lease');return c
}
const record=(w,n)=>{m.editDraft(w,proof.exerciseId,n,{weight:'60.000000',reps:'8'});m.completeSet(w,proof.exerciseId,n,Date.now())}
window.confirm=()=>true
export function TestApp(){const state=useSyncExternalStore(auth.subscribe,auth.getSnapshot,auth.getSnapshot);return <AuthContext value={{state,controller:auth}}><AuthApp/></AuthContext>}

async function run(){try{
  if(new URL(location.href).searchParams.has('probe')){
    const p=JSON.parse(sessionStorage.getItem('phase5c')),copies=await store.copies(p.key),server=copies.filter(x=>x.sessionId===p.key.sessionId).sort((a,b)=>BigInt(a.server.version)>BigInt(b.server.version)?-1:1)[0].server
    const probe=new LocalWorkoutController(store,()=>true,undefined,{api,online:()=>true});await probe.open(server,p.settings)
    opener.postMessage({phase5c:'probe',readonly:!probe.getSnapshot().writable},location.origin);probe.stop();await store.close()
  }else{
    await json('/__fixture/trace',{stage:'module',runId:new URL(location.href).searchParams.get('runId')})
    proof=await pointer()??proof
    await json('/__fixture/trace',{stage:'auth-start',phase:proof?.phase,status:auth.getSnapshot().status})
    await auth.start()
    if(proof&&auth.getSnapshot().status==='anonymous'){
      const delay=Math.max(0,proof.issuedAt+60500-Date.now());if(delay)await new Promise(r=>setTimeout(r,delay))
      await auth.requestOtp(proof.email);check(auth.getSnapshot().challenge,'explicit reauthentication after process restart');await auth.verifyOtp((await json('/__fixture/otp')).code);proof.issuedAt=Date.now()
    }
    await json('/__fixture/trace',{stage:'auth-ready',status:auth.getSnapshot().status})
    if(!proof){
      const email='snapshot-'+crypto.randomUUID()+'@example.test';await auth.requestOtp(email);const code=(await json('/__fixture/otp')).code;await auth.verifyOtp(code);check(auth.getSnapshot().status==='authenticated','test login')
      const owner=auth.getSnapshot().userId,data=await api.bootstrap(owner,signal),device=await store.deviceId(),routineId=crypto.randomUUID()
      await api.settings(data.scope,{dataGeneration:data.scope.dataGeneration,restLowSeconds:1,restMediumSeconds:1,restHighSeconds:1},signal)
      const r=await api.createRoutine(data.scope,{id:routineId,dataGeneration:data.scope.dataGeneration,name:'5C 실제 동기화',weightPlacements:[{id:crypto.randomUUID(),exerciseDefinitionId:data.exercises[0].id,setCount:3,minReps:6,maxReps:10,initialWeightKg:'60'}],cardioPlacements:[]},signal)
      const body=startBody(data.scope,r.id,device,crypto.randomUUID(),new Date(),Intl.DateTimeFormat().resolvedOptions().timeZone),attempt=await store.prepareStart(data.scope,body),server=await api.start(data.scope,attempt.request,signal)
      await store.saveSession(data.scope,server,body.id)
      proof={email,issuedAt:Date.now(),key:keyOf(server),exerciseId:server.initialPlan.weightExercises[0].sessionExerciseId,routineId:r.id,placementId:r.weightPlacements[0].id,settings:{restLowSeconds:1,restMediumSeconds:1,restHighSeconds:1},passed:[],phase:'sealed'}
      const lease=await acquireEditor(proof.key);check(lease,'initial lock');let w=await store.openLocal(server,proof.settings,()=>lease.held())
      let next=m.applyLocalChange(w,x=>record(x,1));await store.saveLocal(next,w.editVersion,()=>lease.held());w=next
      next=m.applyLocalChange(w,sealSnapshot);await store.saveSyncLocal(next,w.editVersion,()=>lease.held());proof.frozen=next.pendingSnapshot.requestJson;persist()
      check((await api.detail(proof.key,server.id,signal)).snapshot.state.performedSets.length===0,'not dispatched before sealing reload')
      passed('실제 IDB: 수행 저장·고정 요청 저장 후 전송 전 페이지 종료, 원문·UUID·초안 보존')
      await checkpoint()
    }else if(proof.phase==='sealed'){
      const server=await api.detail(proof.key,proof.key.sessionId,signal);await store.saveSession(proof.key,server);await editor(server)
      let w=await read();check(w.syncState==='CLEAN'&&w.serverRevision==='1'&&w.drafts[proof.exerciseId+':1'].weight==='60.000000','sealed resume')
      check((await json('/__fixture/summary')).snapshots.includes(proof.frozen),'exact frozen first request')
      passed('새로고침 후 동일 고정 본문 V13 PUT·실제 PostgreSQL 수행 저장·ACK 로컬 커밋')
      await fault({drops:2,delay:500});await c.change(x=>record(x,2));await wait(async()=>!!(await read()).pendingSnapshot,'inflight snapshot')
      w=await read();proof.lostBody=w.pendingSnapshot.requestJson;proof.cancelledId=w.snapshot.performedSets.find(x=>x.ordinal===2).id
      await c.change(x=>m.undoSet(x,proof.cancelledId));await c.change(x=>record(x,3));await settle()
      w=await read();check(w.pendingSnapshot.requestJson===proof.lostBody&&w.presence[proof.cancelledId]==='UNKNOWN','frozen request retained after lost ACK')
      const history=(await json('/__fixture/summary')).snapshots;check(history.slice(-2).every(x=>x===proof.lostBody),'bounded identical replay')
      passed('전송 중 UNKNOWN 수행 취소·추가 완료, ACK 두 번 유실: 조회 후 동일 본문 1회 재시도·원본 고정')
      proof.phase='lost';await checkpoint()
    }else if(proof.phase==='lost'){
      const before=await read();check(before.pendingSnapshot.requestJson===proof.lostBody,'lost request survived renderer reload')
      const server=await api.detail(proof.key,proof.key.sessionId,signal);await store.saveSession(proof.key,server);await editor(server)
      const w=await read(),remote=await api.detail(proof.key,proof.key.sessionId,signal)
      check(w.syncState==='CLEAN'&&remote.snapshot.state.deletedPerformedSetIds.includes(proof.cancelledId),'unknown deletion confirmed')
      check(remote.snapshot.state.performedSets.map(x=>x.ordinal).join()==='1,3','coalesced final facts')
      check(w.confirmedDeletedSetIds.includes(proof.cancelledId)&&w.cancelled.sets.some(x=>x.id===proof.cancelledId),'tombstone original retained')
      passed('ACK 유실 후 실제 새로고침: 기존 고정 요청 재확인 → 최신 전체 snapshot 1회 → UNKNOWN 삭제 확인')
      const put=IDBObjectStore.prototype.put
      IDBObjectStore.prototype.put=function(...args){const r=put.apply(this,args);const value=args[0];if(this.name==='localWorkouts'&&value?.lastAck&&value.pendingSnapshot===null&&value.lastAck.acceptedLocalRevision!==w.lastAck.acceptedLocalRevision)this.transaction.abort();return r}
      try{await c.change(x=>record(x,4));await settle()}finally{IDBObjectStore.prototype.put=put}
      const failed=await read();check(failed.pendingSnapshot&&failed.serverRevision===w.serverRevision,'ACK store failure retained fixed request');proof.ackBody=failed.pendingSnapshot.requestJson
      passed('서버 커밋 후 ACK 저장 transaction.abort: 고정 요청·UNKNOWN 유지, 성공 표시 미확정')
      proof.phase='ack';await checkpoint()
    }else if(proof.phase==='ack'){
      const server=await api.detail(proof.key,proof.key.sessionId,signal);await store.saveSession(proof.key,server);await editor(server)
      let w=await read();check(w.syncState==='CLEAN'&&!w.pendingSnapshot,'ACK storage restart confirmation')
      check((await json('/__fixture/summary')).snapshots.includes(proof.ackBody),'same ACK recovery request')
      passed('ACK 저장 전 앱 종료 후 복원: 동일 요청 duplicate ACK·최신 로컬 수행 보존')
      const count=(await json('/__fixture/summary')).snapshots.length
      c.draft(proof.exerciseId,9,{weight:'0000.',reps:''});await c.settled();await c.change(x=>{x.rest=null;x.currentExerciseId=proof.exerciseId});await settle()
      check((await json('/__fixture/summary')).snapshots.length===count,'draft-only has no snapshot')
      passed('초안·이동·휴식 조절·조회는 snapshot 송신 0건')
      const popup=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('probe tab timeout')),10000);const handler=e=>{if(e.origin===location.origin&&e.data?.phase5c==='probe'){clearTimeout(timeout);window.removeEventListener('message',handler);resolve(e.data)}};window.addEventListener('message',handler)})
      const other=window.open(location.pathname+'?probe=1','5c-probe');check((await popup).readonly,'second tab must be readonly');other.close()
      check((await json('/__fixture/summary')).snapshots.length===count,'second tab must not upload');passed('같은 브라우저 두 탭 경쟁: 두 번째 제품 controller 읽기 전용·추가 전송 없음')
      // Change the real source routine externally, then retain both explicit approval intents.
      let routine=await api.routine(proof.key,proof.routineId,signal)
      await api.updateRoutine(proof.key,routine.id,{dataGeneration:proof.key.dataGeneration,expectedVersion:routine.version,name:'외부 수정된 루틴',weightPlacements:routine.weightPlacements.map(x=>({mode:'EXISTING',id:x.id,setCount:x.setCount,minReps:x.minReps,maxReps:x.maxReps})),cardioPlacements:[],weightApprovals:[]},signal)
      c.stop();const offline=new LocalWorkoutController(store,()=>true,undefined,{api,online:()=>false});await offline.open(await api.detail(proof.key,proof.key.sessionId,signal),proof.settings)
      await offline.change(x=>m.changeWeight(x,proof.exerciseId,'62.5',true,Date.now()));await offline.change(x=>m.changeWeight(x,proof.exerciseId,'65',true,Date.now()));await offline.change(x=>{m.editDraft(x,proof.exerciseId,5,{weight:'65',reps:'8'});m.completeSet(x,proof.exerciseId,5,Date.now())});offline.stop()
      await editor(await api.detail(proof.key,proof.key.sessionId,signal));w=await read();check(w.approvalResults.filter(r=>r.status==='PENDING').length===2,'real approval chain pending');check(w.snapshot.performedSets.some(r=>r.ordinal===5),'performance retained despite pending')
      proof.originalContext=(await api.detail(proof.key,proof.key.sessionId,signal)).snapshot.recordedContexts;passed('실제 외부 routine version 충돌: 승인 2개 UUID·sequence·체인 보존, PENDING이어도 수행 저장')
      c.stop();const root=createRoot(document.querySelector('#root'));root.render(<StrictMode><TestApp/></StrictMode>)
      await click('현재 루틴 중량 유지');await wait(async()=>!(await read()).approvalResults.some(r=>r.status==='PENDING'),'KEEP_CURRENT confirmed')
      check(JSON.stringify((await api.detail(proof.key,proof.key.sessionId,signal)).snapshot.recordedContexts)===JSON.stringify(proof.originalContext),'KEEP does not rewrite contexts')
      passed('제품 KEEP_CURRENT 명시 선택: NOT_APPLIED 확인·과거 수행 문맥 불변')
      await click('작업 중량 변경');await input('변경 중량 kg','67.5');document.querySelector('dialog[open] input[type="radio"]:last-of-type')?.click()
      const radios=[...document.querySelectorAll('dialog[open] input[type="radio"]')];radios.at(-1).click();await click('명시 승인 요청을 이 기기에 저장')
      await wait(async()=>(await read()).approvalResults.some(r=>r.status==='PENDING'),'next pending approval')
      await input('지금 다시 승인할 중량 kg','70.000000');await fault({resolutionDrops:1});await click('이 중량으로 지금 재승인')
      await wait(async()=>{const x=await read();return x.approvalResults.some(r=>r.status==='APPLIED')&&!x.pendingResolution&&x.syncState==='CLEAN'},'REAPPROVE confirmed after lost response')
      routine=await api.routine(proof.key,proof.routineId,signal);check(routine.weightPlacements[0].approvedWeightKg==='70','current approved weight 70')
      check(JSON.stringify((await api.detail(proof.key,proof.key.sessionId,signal)).snapshot.recordedContexts)===JSON.stringify(proof.originalContext),'REAPPROVE contexts immutable')
      passed('제품 REAPPROVE·응답 유실: 새 UUID 승인 사실 조회로 확정·루틴 70kg·과거 문맥 소급 변경 없음')
      check(!/writerEpoch|localRevision|revision|hash/.test(document.querySelector('.local-workout').textContent),'no internal protocol terms in UI')
      for(let n=3;n<7;n++)await click('＋ 본세트 추가')
      await wait(async()=>(await read()).syncState==='CLEAN','plan synced')
      await fault({drops:2,delay:900});await input('6세트 이번 반복 횟수','8');if(buttons().some(b=>b.textContent.trim()==='휴식 종료'))await click('휴식 종료')
      document.querySelector('button[aria-label="6세트 완료"]').click();await wait(async()=>!!(await read()).pendingSnapshot,'pending before takeover')
      if(buttons().some(b=>b.textContent.trim()==='휴식 종료'))await click('휴식 종료');await input('7세트 이번 반복 횟수','9');await wait(()=>!document.querySelector('button[aria-label="7세트 완료"]').disabled,'next completion enabled');document.querySelector('button[aria-label="7세트 완료"]').click()
      await wait(async()=>(await read()).snapshot.performedSets.some(r=>r.ordinal===7),'untransmitted extra record')
      const current=await api.detail(proof.key,proof.key.sessionId,signal);await api.takeover(proof.key,current.id,{dataGeneration:proof.key.dataGeneration,editorDeviceId:crypto.randomUUID(),expectedWriterEpoch:current.writerEpoch},signal)
      await wait(()=>buttons().some(b=>b.textContent==='이 기기로 편집 가져오기'),'foreign writer UI');const old=await read();check(old.snapshot.performedSets.some(r=>r.ordinal===7),'old epoch original')
      passed('다른 기기 takeover 확인: 구 sender 차단·전송 중 원문 및 미전송 수행 보존')
      await fault({takeoverDrops:1});await click('이 기기로 편집 가져오기');await wait(()=>!buttons().find(b=>b.textContent==='이 기기로 편집 가져오기')?.disabled,'lost takeover released UI');await click('이 기기로 편집 가져오기')
      await wait(()=>!!document.querySelector('.local-workout'),'explicit takeover editor');const owned=await api.detail(proof.key,proof.key.sessionId,signal)
      check(owned.writerEpoch==='2','takeover idempotence epoch');const nextKey=keyOf(owned);await wait(async()=>!!(await store.readLocal(nextKey)),'new epoch local document')
      check(!(await store.readLocal(nextKey)).snapshot.performedSets.some(r=>r.ordinal===7),'never copy old unsent into new epoch');check((await read()).snapshot.performedSets.some(r=>r.ordinal===7),'old epoch preserved')
      const takes=(await json('/__fixture/summary')).takeovers;check(takes.at(-1)===takes.at(-2),'fixed takeover request survives response loss')
      passed('제품 명시 takeover·응답 유실 재확인: 새 epoch 별도 사본·구 미전송 자동 복사 없음')
      await json('/__fixture/expire',{sessionId:owned.id});await input('7세트 이번 반복 횟수','10');await wait(()=>!document.querySelector('button[aria-label="7세트 완료"]').disabled,'before expired upload');document.querySelector('button[aria-label="7세트 완료"]').click()
      await wait(()=>document.body.textContent.includes('서버 자동 종료'),'AUTO_CLOSED UI');check((await api.detail(proof.key,owned.id,signal)).status==='AUTO_CLOSED','server decides expiry')
      check((await store.readLocal(nextKey)).snapshot.performedSets.some(r=>r.ordinal===7),'expired local original');passed('실제 25시간 만료: Backend AUTO_CLOSED 판단·늦은 업로드 차단·미전송 원본 보존')
      root.unmount()
      // Fresh active session: isolate auth/generation checks from the closed-session rule.
      const authBody=startBody(proof.key,proof.routineId,proof.key.editorDeviceId,crypto.randomUUID(),new Date(),Intl.DateTimeFormat().resolvedOptions().timeZone)
      const authServer=await api.start(proof.key,authBody,signal),authKey=keyOf(authServer),authE=authServer.initialPlan.weightExercises[0].sessionExerciseId
      await store.saveSession(authKey,authServer)
      const newEditor=async()=>{c=new LocalWorkoutController(store,()=>auth.getSnapshot().userId===authKey.userId||auth.getSnapshot().localWorkoutUserId===authKey.userId,undefined,{api,online:()=>auth.getSnapshot().status==='authenticated'&&auth.getSnapshot().pending===null});await c.open(await api.detail(authKey,authKey.sessionId,signal),proof.settings);await settle()}
      await newEditor();await c.change(x=>{m.editDraft(x,authE,1,{weight:'70.000000',reps:'8'});m.completeSet(x,authE,1,Date.now())});await settle()
      const beforeMismatch=await store.readLocal(authKey);await fault({mismatch:true});await c.retrySync()
      check(!c.getSnapshot().writable&&(await store.readLocal(authKey)).editVersion===beforeMismatch.editVersion,'generation mismatch preserves isolated copy');c.stop()
      passed('실제 HTTP 세대 불일치 응답 주입: 표시/쓰기 중단·기존 세대 원본 미변경')
      await newEditor();await json('/__fixture/revoke',{userId:authKey.userId})
      await c.change(x=>{m.editDraft(x,authE,2,{weight:'70',reps:'9'});m.completeSet(x,authE,2,Date.now())});await settle()
      check(auth.getSnapshot().localWorkoutUserId===authKey.userId&&auth.getSnapshot().status==='unavailable','real expiry local capability')
      const frozenAuth=(await store.readLocal(authKey)).pendingSnapshot.requestJson
      await c.change(x=>{m.editDraft(x,authE,3,{weight:'70',reps:'10'});m.completeSet(x,authE,3,Date.now())});await settle()
      check((await store.readLocal(authKey)).pendingSnapshot.requestJson===frozenAuth,'auth expiry pending body immutable')
      passed('실제 401: 서버 전송 중단·이미 열린 같은 계정의 로컬 추가 완료와 고정 요청 보존')
      await auth.restore();const cooldown=Math.max(0,proof.issuedAt+60500-Date.now());if(cooldown)await new Promise(r=>setTimeout(r,cooldown))
      await auth.requestOtp(proof.email);check(auth.getSnapshot().challenge,'reauth challenge');await auth.verifyOtp((await json('/__fixture/otp')).code);check(auth.getSnapshot().status==='authenticated','same account reauth')
      await c.retrySync();check((await store.readLocal(authKey)).syncState==='CLEAN'&&(await store.readLocal(authKey)).snapshot.performedSets.length===3,'reauth preserves later local input');c.stop()
      passed('같은 계정 재인증: 기존 고정 요청 확인 후 최신 수행 전송·추가 기록 보존')
      const authRoot=createRoot(document.querySelector('#root'));authRoot.render(<StrictMode><TestApp/></StrictMode>)
      await wait(()=>!!document.querySelector('.local-workout'),'new session product UI');await wait(async()=>(await store.readLocal(authKey)).syncState==='CLEAN','new UI ready')
      await fault({drops:2,delay:800});await click('＋ 본세트 추가');await input('4세트 이번 반복 횟수','0007');await click('로그아웃');await click('로그아웃 확인')
      await wait(()=>auth.getSnapshot().status==='anonymous','logout confirmed');check(!document.querySelector('.local-workout'),'logout hides workout')
      const afterLogout=await store.readLocal(authKey);check(afterLogout.pendingSnapshot&&afterLogout.drafts[authE+':4'].reps==='0007','logout pending body and input retained')
      const second=new AuthController(new AuthApi());await second.start();await second.requestOtp('snapshot-other-'+crypto.randomUUID()+'@example.test');await second.verifyOtp((await json('/__fixture/otp')).code)
      check(second.getSnapshot().status==='authenticated'&&second.getSnapshot().userId!==authKey.userId,'second test principal')
      const apiB=new WorkoutApi(second),dataB=await apiB.bootstrap(second.getSnapshot().userId,signal)
      check((await store.copies(dataB.scope)).length===0&&await store.readLocal({...authKey,...dataB.scope})===null,'account storage isolation')
      await auth.restore();await wait(()=>document.body.textContent.includes('아직 루틴이 없습니다'),'other account empty UI');check(!document.querySelector('.local-workout'),'account switch hides original')
      check((await store.readLocal(authKey)).pendingSnapshot.requestJson===afterLogout.pendingSnapshot.requestJson,'late account response cannot replace original frozen body')
      passed('제품 로그아웃·계정 B 전환: 전송 중 원문/직전 초안 보존·이전 계정 미노출·늦은 응답 차단');authRoot.unmount()
      const forbidden=(await json('/__fixture/summary')).requests.filter(r=>/\/(finish|records|recoveries)$/.test(r.path));check(forbidden.length===0,'no 5D API calls')
      proof.phase='done';persist();out.textContent='PASS '+proof.passed.length+'\n'+proof.passed.join('\n')+'\nSYNC_BROWSER_SUITE_PASS';await store.close()
    }
  }
}catch(error){out.textContent='FAIL '+error.stack+'\n'+(proof?.passed??[]).join('\n');c?.stop();await store.close()}}
async function runEdge(){let disconnect;try{
  await auth.start();await auth.requestOtp('snapshot-edge-'+crypto.randomUUID()+'@example.test');await auth.verifyOtp((await json('/__fixture/otp')).code)
  check(auth.getSnapshot().status==='authenticated','edge login')
  const data=await api.bootstrap(auth.getSnapshot().userId,signal),device=await store.deviceId(),settings={restLowSeconds:1,restMediumSeconds:1,restHighSeconds:1}
  const routine=await api.createRoutine(data.scope,{id:crypto.randomUUID(),dataGeneration:data.scope.dataGeneration,name:'5C 유산소 인수 경계',weightPlacements:[{id:crypto.randomUUID(),exerciseDefinitionId:data.exercises[0].id,setCount:1,minReps:6,maxReps:10,initialWeightKg:'60'}],cardioPlacements:[{id:crypto.randomUUID(),plan:{kind:'OUTDOOR',name:'야외',targetSeconds:60,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null}}]},signal)
  const server=await api.start(data.scope,startBody(data.scope,routine.id,device,crypto.randomUUID(),new Date(),Intl.DateTimeFormat().resolvedOptions().timeZone),signal),key=keyOf(server),id=server.initialPlan.cardioActivities[0].sessionActivityId
  await store.saveSession(key,server);c=new LocalWorkoutController(store,()=>auth.getSnapshot().status==='authenticated',undefined,{api,online:()=>true});await c.open(server,settings);await settle()
  const count=(await json('/__fixture/summary')).snapshots.length
  await c.change(w=>m.timerAction(w,id,'start',Date.now()));c.cardioDraft(id,{distance:'0001.250000',bpm:'120'});await settle();await new Promise(r=>setTimeout(r,100))
  check((await json('/__fixture/summary')).snapshots.length===count,'timer/draft never uploads')
  await c.change(w=>m.completeCardio(w,id,Date.now()));await settle();let local=await store.readLocal(key);const first=local.snapshot.cardioResults[0]
  check(local.syncState==='CLEAN'&&local.timers[id].distance==='0001.250000','cardio durable source/ACK')
  check((await api.detail(key,key.sessionId,signal)).snapshot.state.cardioResults[0].result.distanceKm==='1.25','real V13 cardio decimal')
  await c.change(w=>m.undoCardio(w,first.id));await settle();check((await store.readLocal(key)).confirmedDeletedCardioIds.includes(first.id),'real confirmed cardio delete')
  await c.change(w=>m.completeCardio(w,id,Date.now()));await settle();local=await store.readLocal(key)
  check(local.snapshot.cardioResults[0].id!==first.id&&local.cancelled.cardio[0].id===first.id,'cardio re-completion new UUID/original')
  out.textContent='RUNNING 실제 유산소 전송·삭제·재완료 통과'
  let current=await api.detail(key,key.sessionId,signal);const syncedAt=current.lastWorkoutSyncedAt
  await api.takeover(key,key.sessionId,{dataGeneration:key.dataGeneration,editorDeviceId:crypto.randomUUID(),expectedWriterEpoch:current.writerEpoch},signal)
  await c.retrySync();check(!c.getSnapshot().writable,'foreign writer blocked');c.stop()
  const online=new WorkoutOnlineController(api,store);disconnect=online.connect(auth);await wait(()=>online.getSnapshot().status==='ready'&&!online.getSnapshot().busy,'online foreign writer')
  const offset=(await json('/__fixture/summary')).takeovers.length;await fault({takeoverDrops:1});await online.takeover()
  check(online.getSnapshot().detail.writerEpoch==='1','lost takeover response remains unconfirmed')
  current=await api.detail(key,key.sessionId,signal);check(current.writerEpoch==='2'&&current.editorDeviceId===device,'lost takeover committed')
  await api.takeover(key,key.sessionId,{dataGeneration:key.dataGeneration,editorDeviceId:crypto.randomUUID(),expectedWriterEpoch:'2'},signal)
  await online.takeover();check(online.getSnapshot().detail.writerEpoch==='3','old fixed takeover rejected then observed epoch3')
  let sent=(await json('/__fixture/summary')).takeovers.slice(offset);check(sent[0]===sent[2]&&sent.length===3,'same lost request retried, no automatic rebasing')
  await online.takeover();current=online.getSnapshot().detail;sent=(await json('/__fixture/summary')).takeovers.slice(offset)
  check(current.writerEpoch==='4'&&current.editorDeviceId===device&&JSON.parse(sent[3]).expectedWriterEpoch==='3','new explicit selection takes current epoch')
  check(current.lastWorkoutSyncedAt===syncedAt,'takeover never extends workout sync clock')
  const newLocal=await store.openLocal(current,settings,()=>true);check(newLocal.writerEpoch==='4'&&newLocal.localRevision==='0','new epoch separate local document')
  check((await store.readLocal(key)).writerEpoch==='0'&&(await store.readLocal(key)).cancelled.cardio[0].id===first.id,'old epoch preserved')
  out.textContent='PASS 2\n실제 V13 유산소 완료·서버 확인 취소·새 UUID 재완료·decimal 원문 보존\n인수 응답 유실 후 제3기기 재인수: 고정 요청 재확인·명시 재선택·구 epoch 보존·동기화 시각 불변\nSYNC_BROWSER_SUITE_PASS'
}catch(error){out.textContent='FAIL '+error.stack}finally{c?.stop();disconnect?.();await store.close()}}
if(new URL(location.href).searchParams.has('edge'))await runEdge()
else if(new URL(location.href).searchParams.has('probe'))await run()
else await navigator.locks.request('overload.test.5c.harness',{ifAvailable:true},async lock=>{
  // Edge can restore the crashed tab and also open its startup URL. Only one test coordinator runs.
  if(!lock){out.textContent='다른 테스트 탭이 재시작을 확인 중입니다.';return}
  await run();if(out.textContent.startsWith('CHECKPOINT'))await new Promise(()=>{})
})
