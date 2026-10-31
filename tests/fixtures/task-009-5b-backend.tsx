// Disposable fake-email authentication against real production Backend beans and isolated PostgreSQL.
import { StrictMode, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthApi } from '/src/features/auth/api.ts'
import { AuthController } from '/src/features/auth/controller.ts'
import { AuthContext } from '/src/features/auth/context.ts'
import { AuthApp } from '/src/features/auth/AuthApp.tsx'
import { WorkoutApi } from '/src/features/workout-online/api.ts'
import { WorkoutOnlineController } from '/src/features/workout-online/controller.ts'
import { WorkoutStore } from '/src/features/workout-online/storage.ts'
import '/src/index.css'

const result=document.querySelector('#result'), passed=[]
const check=(value,label)=>{if(!value)throw Error(label)}
const wait=async(fn,label)=>{const end=Date.now()+15000;while(Date.now()<end){const value=fn();if(value)return value;await new Promise(r=>setTimeout(r,20))}throw Error('Timeout '+label)}
const buttons=()=>[...document.querySelectorAll('button')]
const button=text=>buttons().find(b=>b.textContent.trim()===text)
const click=async text=>{const b=await wait(()=>{const v=button(text);return v&&!v.disabled?v:null},text);b.click();await new Promise(r=>setTimeout(r,30))}
const input=async(label,value)=>{const node=await wait(()=>document.querySelector('input[aria-label="'+label+'"]'),label);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,30))}
const json=async(path,init)=>{const r=await fetch(path,{credentials:'include',cache:'no-store',...init});if(!r.ok)throw Error('HTTP '+r.status+' '+path);return r.json()}
const auth=new AuthController(new AuthApi()), api=new WorkoutApi(auth), store=new WorkoutStore(), signal=new AbortController().signal
const login=async email=>{
  await auth.restore()
  const delay=auth.getSnapshot().resendAt-Date.now();if(delay>0)await new Promise(r=>setTimeout(r,delay+100))
  await auth.requestOtp(email);const code=(await json('/__fixture/otp')).code;await auth.verifyOtp(code);check(auth.getSnapshot().status==='authenticated','login fixture')
}
const read=async key=>store.readLocal(key)
const waitLocal=async(key,predicate)=>{const end=Date.now()+10000;while(Date.now()<end){const value=await read(key);if(value&&predicate(value))return value;await new Promise(r=>setTimeout(r,25))}throw Error('Timeout local state')}
window.confirm=()=>true
export function TestApp(){const state=useSyncExternalStore(auth.subscribe,auth.getSnapshot,auth.getSnapshot);return <AuthContext value={{state,controller:auth}}><AuthApp/></AuthContext>}
try{
  const email='phase5b-'+crypto.randomUUID()+'@example.test';await login(email)
  const owner=auth.getSnapshot().userId, data=await api.bootstrap(owner,signal), generation=data.scope.dataGeneration
  await api.settings(data.scope,{dataGeneration:generation,restLowSeconds:2,restMediumSeconds:3,restHighSeconds:4},signal)
  const routineId=crypto.randomUUID(), definition=data.exercises[0]
  const weights=['첫 운동','둘째 운동'].map(()=>({id:crypto.randomUUID(),exerciseDefinitionId:definition.id,setCount:3,minReps:6,maxReps:10,initialWeightKg:'60'}))
  await api.createRoutine(data.scope,{id:routineId,dataGeneration:generation,name:'5B 실제 루틴',weightPlacements:weights,cardioPlacements:[{id:crypto.randomUUID(),plan:{kind:'OUTDOOR',name:'5B 실제 유산소',targetSeconds:600,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null}}]},signal)
  const online=new WorkoutOnlineController(api,store), disconnect=online.connect(auth);await wait(()=>online.getSnapshot().status==='ready','online bootstrap');await online.select(routineId);await online.start()
  const server=online.getSnapshot().detail;check(server,'5A START');disconnect()
  const key={userId:owner,dataGeneration:generation,sessionId:server.id,editorDeviceId:server.editorDeviceId,writerEpoch:server.writerEpoch}, E=server.initialPlan.weightExercises[0].sessionExerciseId
  const root=createRoot(document.querySelector('#root'));root.render(<StrictMode><TestApp/></StrictMode>)
  await wait(()=>document.querySelector('button[aria-label="1세트 완료"]')&&!document.querySelector('button[aria-label="1세트 완료"]').disabled,'real editor writable')
  passed.push('실제 쿠키·CSRF·5A START → 불변 InitialPlan 기반 제품 운동 UI·StrictMode 편집 잠금')
  await input('1세트 중량 kg','00062.500000');await input('1세트 이번 반복 횟수','8');await click('완료')
  let w=await waitLocal(key,x=>x.snapshot.performedSets.length===1);const firstId=w.snapshot.performedSets[0].id
  check(w.snapshot.performedSets[0].weightKg==='62.5'&&w.snapshot.performedSets[0].weightContext.kind==='TODAY_ONLY','exact today-only input')
  passed.push('실제 세트 입력·완료: decimal 원문·실제 수행·로컬 revision 1, 서버 승인 자동 적용 없음')
  await input('2세트 중량 kg','65.000000');await input('2세트 이번 반복 횟수','9');await waitLocal(key,x=>x.drafts[E+':2']?.reps==='9')
  const originalPut=IDBObjectStore.prototype.put
  IDBObjectStore.prototype.put=function(...args){const r=originalPut.apply(this,args);if(this.name==='localWorkouts')this.transaction.abort();return r}
  try{await wait(()=>!document.querySelector('button[aria-label="2세트 완료"]').disabled,'rest ends');document.querySelector('button[aria-label="2세트 완료"]').click();await wait(()=>document.querySelector('.local-workout [role="alert"]'),'local failure alert')}
  finally{IDBObjectStore.prototype.put=originalPut}
  w=await read(key);check(w.snapshot.performedSets.length===1&&w.localRevision==='1','failed completion not confirmed')
  passed.push('제품 버튼 완료 트랜잭션 abort: 경고 표시·완료 미확정·이전 초안 보존')
  document.querySelector('button[aria-label="1세트 완료 취소"]').click();w=await waitLocal(key,x=>x.snapshot.performedSets.length===0)
  await wait(()=>!document.querySelector('button[aria-label="1세트 완료"]').disabled,'undo committed');document.querySelector('button[aria-label="1세트 완료"]').click();w=await waitLocal(key,x=>x.snapshot.performedSets.length===1)
  check(w.snapshot.performedSets[0].id!==firstId&&w.cancelled.sets[0].id===firstId,'fresh UUID')
  passed.push('실제 완료 취소·재완료: 새 수행 UUID·취소 원문 보존')
  await click('종목 목록');const list=document.querySelector('dialog[open]');const targets=[...list.querySelectorAll('button')].filter(b=>b.textContent.includes('웨이트'));targets.at(-1).click()
  await waitLocal(key,x=>x.currentExerciseId!==E);await click('종목 목록');[...document.querySelector('dialog[open]').querySelectorAll('button')].find(b=>b.textContent.includes('웨이트')).click()
  await waitLocal(key,x=>x.currentExerciseId===E);check(document.querySelector('input[aria-label="2세트 중량 kg"]').value==='65.000000','draft navigation')
  passed.push('실제 종목 이동 후 중량·반복 입력 초안 유지, 계획 배열 미변경')
  await click('종목 목록');[...document.querySelector('dialog[open]').querySelectorAll('button')].find(b=>b.textContent.includes('5B 실제 유산소')).click()
  await click('유산소 시작');await waitLocal(key,x=>!!x.timers[x.currentExerciseId]?.runningSince);await new Promise(r=>setTimeout(r,150))
  await click('일시정지');await click('재개');await new Promise(r=>setTimeout(r,100));await click('유산소 완료 기록 확인');await click('유산소 기록 완료')
  w=await waitLocal(key,x=>x.snapshot.cardioResults.length===1);check(w.snapshot.cardioResults[0].result.timerMs>0&&w.timers[w.currentExerciseId].segments.length===2,'timer original')
  passed.push('실제 유산소 시작·정지·재개·확인·완료, 원본 구간과 누적 시간 보존')
  await json('/__fixture/revoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:owner})});await click('세션 상세 다시 확인')
  await wait(()=>auth.getSnapshot().localWorkoutUserId===owner,'expiry protection');await wait(()=>document.querySelector('.local-workout'),'local UI after expiry')
  await click('종목 목록');[...document.querySelector('dialog[open]').querySelectorAll('button')].find(b=>b.textContent.includes('웨이트')).click();await waitLocal(key,x=>x.currentExerciseId===E)
  await wait(()=>!document.querySelector('button[aria-label="2세트 완료"]').disabled,'expiry editor');document.querySelector('button[aria-label="2세트 완료"]').click();w=await waitLocal(key,x=>x.snapshot.performedSets.length===2)
  passed.push('실제 서버 세션 폐기·401 후 이미 열린 같은 계정 운동의 로컬 기록 계속')
  await login(email)
  await wait(()=>document.querySelector('input[aria-label="3세트 이번 반복 횟수"]'),'reauth editor')
  await input('3세트 이번 반복 횟수','0007');await click('로그아웃');await click('로그아웃 확인')
  await wait(()=>auth.getSnapshot().status==='anonymous','logout completes');await wait(()=>!document.querySelector('.local-workout'),'logout hides');check((await read(key)).snapshot.performedSets.length===2&&(await read(key)).drafts[E+':3']?.reps==='0007','logout preserves input')
  await login('phase5b-other-'+crypto.randomUUID()+'@example.test');await wait(()=>document.querySelector('.workout-online'),'other owner bootstrap');check(!document.querySelector('.local-workout'),'other account hidden')
  passed.push('진행 운동 로그아웃 즉시 비노출·IDB 보존, 계정 B에 계정 A 운동 미노출')
  await auth.logout();await login(email);await wait(()=>document.querySelector('.local-workout'),'same account restore');await waitLocal(key,x=>x.snapshot.performedSets.length===2)
  const remote=await api.detail(data.scope,server.id,signal);check(remote.snapshot.state.performedSets.length===0&&remote.snapshot.state.cardioResults.length===0&&remote.localRevision==='0','no sync')
  const before=await read(key)
  await api.takeover(data.scope,server.id,{dataGeneration:generation,editorDeviceId:crypto.randomUUID(),expectedWriterEpoch:remote.writerEpoch},signal)
  await click('세션 상세 다시 확인');await wait(()=>!document.querySelector('.local-workout'),'takeover stops editor');check((await read(key)).editVersion===before.editVersion,'old epoch preserved')
  passed.push('서버 writerEpoch 변경 확인 후 제품 편집 중단·구 epoch 로컬 원본 유지')
  const summary=await json('/__fixture/summary');check(!summary.workoutWrites.some(x=>/\/(snapshot|finish|approval-resolutions|records|recoveries)$/.test(x.path)),'forbidden synchronization')
  passed.push('서버 수행 0·localRevision 0 유지, snapshot·FINISH·승인 해결 전송 0건')
  root.unmount();await store.close()
  result.textContent='PASS '+passed.length+'\n'+passed.join('\n')+'\nBACKEND_BROWSER_SUITE_PASS'
}catch(error){result.textContent='FAIL '+error.stack;await store.close()}
