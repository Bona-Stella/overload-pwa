// Personal dev DB integration explicitly authorized by the phase-4 request.
// Uses real OTP delivery, production security and a fresh dedicated browser profile.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import { resolve, basename, sep } from 'node:path'
import { devCatalogServer } from './dev-catalog-v17-server.mjs'

const directory=resolve('logs/catalog-phase4'),resumeRecovery=process.argv.includes('--recovery'),resumeClosed=process.argv.includes('--closed')||resumeRecovery,resume=process.argv.includes('--resume')||resumeClosed,previous=resume?JSON.parse(await readFile(resolve(directory,'result.json'),'utf8')):null
const profile=resolve(previous?.profile??resolve(directory,'profile-'+crypto.randomUUID())),passed=previous?.passed??[],pids=[]
if(!profile.startsWith(directory+sep)||!/^profile-[a-f0-9-]{36}$/.test(basename(profile)))throw Error('Use this task’s dedicated test profile only')
await mkdir(profile,{recursive:true})
const settings=JSON.parse(await readFile(resolve(directory,'settings.json'),'utf8')),host=await devCatalogServer()
assert.match(settings.email,/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
let browser,cdp,hostUp=false,errors='',lastOtp=0
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const status=async phase=>{await writeFile(resolve(directory,'state.json'),JSON.stringify({phase,passed,pids,profile}));console.log('PHASE',phase)}
const wait=async(fn,label,ms=30000)=>{const until=Date.now()+ms;let last;while(Date.now()<until){try{const v=await fn();if(v)return v}catch(e){last=e}await sleep(70)}throw Error('Timeout '+label+' '+(last?.message??''))}
const pass=label=>{passed.push(label);console.log('PASS',label)}
class Cdp{
  constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)}if(m.method==='Page.javascriptDialogOpening')void this.send('Page.handleJavaScriptDialog',{accept:true})};ws.onclose=()=>{for(const p of this.pending.values())p.reject(Error('CDP closed'));this.pending.clear()}}
  send(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('CDP timeout '+method))},20000);this.pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});this.ws.send(JSON.stringify({id,method,params}))})}
  async eval(expression){const r=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value}
}
async function connect(url){const ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});const c=new Cdp(ws);await c.send('Page.enable');return c}
async function start(path='/'){
  await unlink(resolve(profile,'DevToolsActivePort')).catch(e=>{if(e.code!=='ENOENT')throw e})
  browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--remote-debugging-port=0','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-popup-blocking','--window-size=430,932','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','pipe','pipe']})
  pids.push(browser.pid);console.log('DEV_V17_EDGE_PID',browser.pid);browser.stderr.on('data',c=>errors+=c);browser.stdout.on('data',()=>{})
  const page=await wait(async()=>{const port=Number((await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);return (await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page')},'page')
  cdp=await connect(page.webSocketDebuggerUrl);await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await cdp.send('Page.navigate',{url:host.origin+path})
}
async function stop(force=false){if(!browser)return;if(force){const p=spawn('taskkill',['/PID',String(browser.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});await new Promise(r=>p.once('exit',r))}else{try{await cdp.send('Browser.close')}catch{/* exited */}await sleep(300);if(browser.exitCode===null){const p=spawn('taskkill',['/PID',String(browser.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});await new Promise(r=>p.once('exit',r))}}cdp?.ws.close();browser=null;await sleep(600)}
const text=()=>cdp.eval('document.body.innerText')
const click=async(label,root='document')=>{await wait(()=>cdp.eval(`(()=>{const root=${root},b=[...root.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled);if(!b)return false;b.click();return true})()`),label);await sleep(90)}
const input=async(selector,value)=>{await cdp.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);await sleep(70)}
const labelInput=async(label,value,root='.online-routine')=>{const selector=await cdp.eval(`(()=>{const root=document.querySelector(${JSON.stringify(root)}),e=[...root.querySelectorAll('label')].find(e=>e.textContent.trim().startsWith(${JSON.stringify(label)}))?.querySelector('input');if(!e)throw Error('Missing label');e.dataset.testInput='current';return '[data-test-input="current"]'})()`);await input(selector,value);await cdp.eval('delete document.querySelector("[data-test-input=current]").dataset.testInput')}
const select=async(label,value,root)=>{await cdp.eval(`(()=>{const root=document.querySelector(${JSON.stringify(root)}),e=[...root.querySelectorAll('label')].find(e=>e.textContent.trim().startsWith(${JSON.stringify(label)}))?.querySelector('select');if(!e)throw Error('Missing select');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}))})()`);await sleep(70)}
const apiRaw=async(path,method='GET',body,page=cdp)=>page.eval(`(async()=>{const headers={'Content-Type':'application/json'};if(${JSON.stringify(method)}!=='GET'){const csrf=await(await fetch('/api/v1/auth/csrf',{credentials:'include',cache:'no-store'})).json();headers[csrf.headerName]=csrf.token}const r=await fetch(${JSON.stringify(path)},{method:${JSON.stringify(method)},credentials:'include',cache:'no-store',headers,...(${JSON.stringify(body)}===undefined?{}:{body:JSON.stringify(${JSON.stringify(body)})})});return{status:r.status,data:r.status===204?null:await r.json()}})()`)
const api=async(...args)=>{const r=await apiRaw(...args);if(r.status<200||r.status>=300)throw Error('API '+r.status+' '+r.data?.code);return r.data}
const dbRead=`async()=>{const db=await new Promise((r,j)=>{const q=indexedDB.open('overload.workout.v1');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});try{return await new Promise((r,j)=>{const tx=db.transaction(['meta','localWorkouts','sessionCopies'],'readonly'),w=tx.objectStore('localWorkouts').getAll(),p=tx.objectStore('meta').get('offlineResume');tx.oncomplete=()=>r({version:db.version,workouts:w.result,permit:p.result});tx.onabort=()=>j(tx.error)})}finally{db.close()}}`
const saved=()=>cdp.eval('('+dbRead+')()')
const local=async id=>(await saved()).workouts.find(w=>w.sessionId===id)
async function login(){
  await wait(async()=>{const t=await text();return t.includes('이메일로 계속하기')||t.includes('로그인되었습니다.')},'login screen')
  if((await text()).includes('로그인되었습니다.'))return
  const cooldown=lastOtp+60500-Date.now();if(cooldown>0)await sleep(cooldown)
  await input('input[type=email]',settings.email);await click('이메일로 계속하기');lastOtp=Date.now()
  await wait(()=>cdp.eval('!!document.querySelector("input[autocomplete=one-time-code]")'),'OTP challenge')
  await status('WAITING_FOR_OTP')
  const code=await wait(async()=>{try{const r=JSON.parse(await readFile(resolve(directory,'otp.json'),'utf8'));if(!/^\d{6}$/.test(r.code))return null;await unlink(resolve(directory,'otp.json'));return r.code}catch{return null}},'user OTP',240000)
  await input('input[autocomplete=one-time-code]',code);await click('코드 확인');await wait(async()=>(await text()).includes('로그인되었습니다.'),'real OTP verification');await status('AUTHENTICATED')
}
async function search(query){await input('.online-routine input[role=combobox]',query);await cdp.eval("document.querySelector('.online-routine input[role=combobox]').focus()");await sleep(90)}
const weightSection=n=>`.online-routine section[aria-label="웨이트 ${n}"]`
async function complete(id,n,reps='8'){
  await input(`.local-workout input[aria-label="${n}세트 이번 반복 횟수"]`,reps)
  await wait(()=>cdp.eval(`(()=>{const b=document.querySelector('.local-workout button[aria-label="${n}세트 완료"]');if(!b||b.disabled)return false;b.click();return true})()`),'complete '+n)
  await wait(async()=>!!(await local(id))?.snapshot.performedSets.find(s=>s.ordinal===n),'durable set '+n)
}
async function highRow(){await click('종목 목록');await click('하이로우 · 웨이트')}
async function recordDialog(ordinal){await cdp.eval(`(()=>{const b=[...document.querySelectorAll('.closed-workout button')].find(b=>b.textContent==='세트 정정·삭제'&&b.parentElement.querySelector('p')?.textContent.includes(' · ${ordinal}세트 · '));if(!b)throw Error('Missing closed set');b.click()})()`);await sleep(90)}
try{
  await host.start();hostUp=true;await start('/favicon.svg')
  if(resume){
    const waiting=await cdp.eval(`(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();if(r.installing)await new Promise(done=>{const w=r.installing;const check=()=>{if(['installed','activated','redundant'].includes(w.state))done()};w.addEventListener('statechange',check);check()});return !!r.waiting})()`)
    if(waiting){await stop();await start('/')}else await cdp.send('Page.navigate',{url:host.origin})
  }
  let context
  if(!resume){
  await cdp.eval(`(async()=>{const db=await new Promise((r,j)=>{const q=indexedDB.open('overload.workout.v1',2);q.onupgradeneeded=()=>{const d=q.result;d.createObjectStore('meta');d.createObjectStore('startAttempts',{keyPath:['userId','dataGeneration']});d.createObjectStore('sessionCopies',{keyPath:['userId','dataGeneration','sessionId','editorDeviceId','writerEpoch']}).createIndex('scope',['userId','dataGeneration']);d.createObjectStore('localWorkouts',{keyPath:['userId','dataGeneration','sessionId','editorDeviceId','writerEpoch']})};q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});await new Promise((r,j)=>{const tx=db.transaction(['meta','localWorkouts'],'readwrite');tx.objectStore('meta').put({legacy:true},'offlineResume');tx.objectStore('localWorkouts').put({userId:crypto.randomUUID(),dataGeneration:'0',sessionId:crypto.randomUUID(),editorDeviceId:crypto.randomUUID(),writerEpoch:'0',schemaVersion:1});tx.oncomplete=r;tx.onabort=()=>j(tx.error)});db.close();localStorage.setItem('another-app-marker','keep');const c=await caches.open('another-app-cache');await c.put('/sentinel',new Response('keep'));const other=await new Promise(r=>{const q=indexedDB.open('another-app-db',1);q.onupgradeneeded=()=>q.result.createObjectStore('private');q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=other.transaction('private','readwrite');tx.objectStore('private').put('keep','marker');tx.oncomplete=r});other.close()})()`)
  await cdp.send('Page.navigate',{url:host.origin});await wait(async()=>{const t=await text();return t.includes('이메일로 계속하기')},'anonymous product app')
  const upgraded=await saved();assert.equal(upgraded.version,3);assert.equal(upgraded.workouts.length,0);assert.equal(upgraded.permit,undefined)
  pass('실제 dist 부팅: DB2 테스트 문서 일회 폐기·DB3·이전 오프라인 허용 해제')
  assert.equal((await apiRaw('/api/v1/health')).status,200);assert.equal((await apiRaw('/api/v1/standard-exercises/search-data')).status,401)
  await cdp.eval('navigator.serviceWorker.ready.then(()=>true)')
  if(!await cdp.eval('!!navigator.serviceWorker.controller')){const old=await cdp.eval('performance.timeOrigin');await cdp.send('Page.reload');await wait(async()=>(await cdp.eval('performance.timeOrigin'))!==old,'initial normal reload');await wait(()=>cdp.eval('!!navigator.serviceWorker.controller'),'controlled first document')}
  await login()
  const owner=await api('/api/v1/auth/session'),routines=await api('/api/v1/routines'),generation=routines.dataGeneration
  const catalog=await api('/api/v1/standard-exercises/search-data'),manufacturers=await api('/api/v1/manufacturers'),defaults=await api('/api/v1/workout-settings')
  assert.equal(catalog.exercises.length,5);assert.equal(manufacturers.manufacturers.length,2);assert.equal(defaults.dataGeneration,generation)
  assert.deepEqual([defaults.restLowSeconds,defaults.restMediumSeconds,defaults.restHighSeconds],[180,120,90])
  for(const [method,path,body]of [['POST','/api/v1/exercises',{id:crypto.randomUUID(),dataGeneration:generation,name:'차단 확인'}],['PATCH','/api/v1/exercises/'+crypto.randomUUID(),{dataGeneration:generation,name:'차단 확인'}]]){const r=await apiRaw(path,method,body);assert.equal(r.status,403);assert.equal(r.data.code,'ACCESS_DENIED')}
  pass('실제 OTP/쿠키/CSRF·세대·기본 휴식·표준5/제조사2 조회·개인 POST/PATCH403')
  await api('/api/v1/workout-settings','PATCH',{dataGeneration:generation,restLowSeconds:1,restMediumSeconds:1,restHighSeconds:1});await click('다시 조회')
  await click('새 루틴 만들기');await labelInput('루틴 이름','개발 V17 실제 앱 검증')
  const searches=()=>host.requests.filter(r=>r.path==='/api/v1/standard-exercises/search-data').length,beforeSearch=searches()
  for(const query of ['하','하이','High Row','하이 로우']){await search(query);assert.equal(await cdp.eval('document.querySelectorAll(".online-routine [role=option]").length'),1)}
  assert.equal(searches(),beforeSearch);await click('하이로우')
  const panata=manufacturers.manufacturers.find(m=>m.name==='파나타').id,hammer=manufacturers.manufacturers.find(m=>m.name==='해머스트렝스').id
  await select('제조사',panata,weightSection(1));await select('부하 방식','PLATE',weightSection(1));await labelInput('최초 중량','60',weightSection(1))
  await search('불스스');await click('불가리안 스플릿 스쿼트');await labelInput('세트 수','1',weightSection(2));await labelInput('최초 중량','0',weightSection(2));await select('부하 방식','BODYWEIGHT',weightSection(2));await click('루틴 저장')
  await wait(async()=>!(await cdp.eval('!!document.querySelector(".online-routine")')),'routine saved')
  const list=await api('/api/v1/routines');let routine=await api('/api/v1/routines/'+list.routines.find(r=>r.name==='개발 V17 실제 앱 검증').id)
  const placement=routine.weightPlacements.find(p=>p.exerciseName==='하이로우').id,routineId=routine.id
  await click('이 루틴 편집');await select('제조사',hammer,weightSection(1));await click('루틴 저장');await wait(async()=>!await cdp.eval('!!document.querySelector(".online-routine")'),'equipment saved')
  routine=await api('/api/v1/routines/'+routineId);assert.equal(routine.weightPlacements[0].id,placement);assert.equal(routine.weightPlacements[0].approvedWeightKg,'60')
  await click('이 루틴 편집');await cdp.eval(`document.querySelector(${JSON.stringify(weightSection(1))}+' input[type=checkbox]').click()`);await labelInput('새 승인 중량','62.5',weightSection(1));await click('루틴 저장');await wait(async()=>!await cdp.eval('!!document.querySelector(".online-routine")'),'weight approved')
  routine=await api('/api/v1/routines/'+routineId);assert.equal(routine.weightPlacements[0].initialWeightKg,'60');assert.equal(routine.weightPlacements[0].approvedWeightKg,'62.5')
  await click('이 루틴 편집');await click('배치 제거',`document.querySelector(${JSON.stringify(weightSection(1))})`);await click('루틴 저장');await wait(async()=>!await cdp.eval('!!document.querySelector(".online-routine")'),'removed')
  await click('이 루틴 편집');await click('제거한 배치 조회');await click('하이로우 배치 복원');await select('제조사',panata,weightSection(2));await click('루틴 저장');await wait(async()=>!await cdp.eval('!!document.querySelector(".online-routine")'),'restored')
  routine=await api('/api/v1/routines/'+routineId);assert.equal(routine.weightPlacements.find(p=>p.id===placement).approvedWeightKg,'62.5')
  pass('실제 루틴 UI: 이름/별칭·요청 없는 검색·두 표준 추가·장비 편집·명시 승인·삭제/RESTORE·배치/중량 유지')
  await click('온라인으로 운동 시작');await wait(()=>cdp.eval('!!document.querySelector(".local-workout input")'),'local workout')
  let server=(await api('/api/v1/workout-sessions/active')).session;const firstSession=server.id,exercise=server.initialPlan.weightExercises.find(e=>e.sourcePlacementId===placement).sessionExerciseId,initial=JSON.stringify(server.initialPlan),routineBefore=JSON.stringify(routine)
  assert.equal(server.initialPlan.schemaVersion,2);assert.equal(server.initialPlan.weightExercises.find(e=>e.sessionExerciseId===exercise).manufacturerId,panata)
  await highRow();await complete(firstSession,1);await wait(async()=>(await api('/api/v1/workout-sessions/'+firstSession)).snapshot.state.performedSets.length===1,'server set1');await complete(firstSession,2)
  await wait(async()=>!(await local(firstSession)).pendingSnapshot,'second ACK')
  await click('현재 운동에만 계획 변경');await select('제조사',hammer,'section[aria-label="현재 적용 계획 편집"]');await select('부하 방식','STACK','section[aria-label="현재 적용 계획 편집"]');await click('현재 장비 적용')
  await wait(async()=>{const w=await local(firstSession);return !w.pendingSnapshot&&w.snapshot.appliedPlan.weightExercises.find(e=>e.sessionExerciseId===exercise).manufacturerId===hammer},'equipment ACK')
  host.fault.snapshotAck=true;await complete(firstSession,3)
  await wait(async()=>{const w=await local(firstSession),s=await api('/api/v1/workout-sessions/'+firstSession);return w.pendingSnapshot&&s.snapshot.state.performedSets.filter(s=>s.sessionExerciseId===exercise).length===3},'server committed ACK hidden')
  let w=await local(firstSession);const frozen=w.pendingSnapshot.requestJson
  await wait(async()=>(await text()).includes('연결 또는 서버 저장 결과를 확인하지 못했습니다.'),'bounded lost ACK failure')
  host.fault.snapshotAck=false;const duplicate=await api('/api/v1/workout-sessions/'+firstSession+'/snapshot','PUT',JSON.parse(frozen));assert.equal(duplicate.duplicate,true)
  assert.equal((await local(firstSession)).pendingSnapshot.requestJson,frozen)
  assert.equal(JSON.stringify(await api('/api/v1/routines/'+routineId)),routineBefore)
  server=await api('/api/v1/workout-sessions/'+firstSession);assert.deepEqual(server.snapshot.state.performedSets.filter(s=>s.sessionExerciseId===exercise).sort((a,b)=>a.ordinal-b.ordinal).map(s=>[s.manufacturerId,s.loadType]),[[panata,'PLATE'],[panata,'PLATE'],[hammer,'STACK']])
  assert.ok(server.snapshot.state.performedSets.every(s=>s.weightContext.kind==='INITIAL_APPROVED'));assert.equal(JSON.stringify(server.initialPlan),initial)
  pass('실제 START 장비 복사·Panata2/Hammer1 완료 원본·루틴/승인 불변·서버 커밋 뒤 ACK 유실·동일 snapshot duplicate')
  context={owner,generation,panata,hammer,routineId,placement,firstSession,exercise,initial,routineBefore,frozen,server}
  }else if(resumeClosed){
    await login();const owner=await api('/api/v1/auth/session'),routines=await api('/api/v1/routines'),generation=routines.dataGeneration,manufacturers=await api('/api/v1/manufacturers')
    const routineId=routines.routines.find(r=>r.name==='개발 V17 실제 앱 검증').id,routine=await api('/api/v1/routines/'+routineId),placement=routine.weightPlacements.find(p=>p.exerciseName==='하이로우').id
    const first=(await saved()).workouts.find(w=>w.finish?.ack),firstSession=first.sessionId,server=await api('/api/v1/workout-sessions/'+firstSession),exercise=server.initialPlan.weightExercises.find(e=>e.sourcePlacementId===placement).sessionExerciseId
    const panata=manufacturers.manufacturers.find(m=>m.name==='파나타').id,hammer=manufacturers.manufacturers.find(m=>m.name==='해머스트렝스').id
    context={owner,generation,panata,hammer,routineId,placement,firstSession,exercise,server}
    await status('RESUMED_CLOSED_RECORD')
  }else{
    await login();const owner=await api('/api/v1/auth/session'),routines=await api('/api/v1/routines'),generation=routines.dataGeneration,manufacturers=await api('/api/v1/manufacturers')
    const routineId=routines.routines.find(r=>r.name==='개발 V17 실제 앱 검증').id,routine=await api('/api/v1/routines/'+routineId),placement=routine.weightPlacements.find(p=>p.exerciseName==='하이로우').id
    const server=(await api('/api/v1/workout-sessions/active')).session,firstSession=server.id,exercise=server.initialPlan.weightExercises.find(e=>e.sourcePlacementId===placement).sessionExerciseId,panata=manufacturers.manufacturers.find(m=>m.name==='파나타').id,hammer=manufacturers.manufacturers.find(m=>m.name==='해머스트렝스').id
    await wait(()=>cdp.eval('!!document.querySelector(".local-workout input")'),'resumed local editor');await highRow();await wait(async()=>!(await local(firstSession)).pendingSnapshot,'original pending request confirmed on resume')
    host.fault.snapshotAck=true;await click('＋ 본세트 추가');await wait(async()=>!!(await local(firstSession)).pendingSnapshot,'resumed frozen request');const frozen=(await local(firstSession)).pendingSnapshot.requestJson
    await wait(async()=>(await text()).includes('연결 또는 서버 저장 결과를 확인하지 못했습니다.'),'resumed ACK loss')
    host.fault.snapshotAck=false;assert.equal((await api('/api/v1/workout-sessions/'+firstSession+'/snapshot','PUT',JSON.parse(frozen))).duplicate,true)
    context={owner,generation,panata,hammer,routineId,placement,firstSession,exercise,initial:JSON.stringify(server.initialPlan),routineBefore:JSON.stringify(routine),frozen,server}
    await status('RESUMED_WITH_ORIGINAL_DATA')
  }
  const {owner,generation,panata,hammer,routineId,placement,firstSession,exercise,frozen}=context;let server=context.server
  let recoveryContext
  if(!resumeRecovery){
  const offlineOrdinal=Math.max(...(await local(firstSession)).snapshot.performedSets.filter(s=>s.sessionExerciseId===exercise).map(s=>s.ordinal))+(resumeClosed?0:1)
  let finishJson=(await local(firstSession)).finish?.requestJson
  if(!resumeClosed){
  await wait(()=>cdp.eval('navigator.serviceWorker.controller!==null'),'controlled shell')
  host.fault.variant=1;await cdp.eval('navigator.serviceWorker.getRegistration().then(r=>r.update())');await wait(()=>cdp.eval('navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)'),'waiting worker')
  await host.stop();hostUp=false;await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await cdp.eval("window.dispatchEvent(new Event('offline'))")
  if((await local(firstSession)).snapshot.appliedPlan.weightExercises.find(e=>e.sessionExerciseId===exercise).setCount<offlineOrdinal)await click('＋ 본세트 추가');await complete(firstSession,offlineOrdinal,'9');const offline=await local(firstSession);assert.equal(offline.pendingSnapshot.requestJson,frozen)
  const beforeCrash=await saved(),fenceBefore=await cdp.eval("JSON.parse(localStorage.getItem('overload.offline.access.v1'))");assert.equal(beforeCrash.permit.nonce,fenceBefore.nonce);await writeFile(resolve(directory,'before-crash-permission.json'),JSON.stringify({permit:beforeCrash.permit,fence:fenceBefore},null,2))
  await stop(true);await start();await wait(async()=>(await text()).includes('이 기기의 운동 이어가기'),'cold offline consent');await click('이 기기의 운동 이어가기');await wait(()=>cdp.eval('!!document.querySelector(".local-workout input")'),'offline editor')
  assert.deepEqual((await local(firstSession)).snapshot,offline.snapshot);assert.equal((await local(firstSession)).pendingSnapshot.requestJson,frozen);assert.equal((await saved()).version,3)
  const writeIndex=host.requests.length;await host.start();hostUp=true;await click('로그인 상태 다시 확인');await wait(async()=>{const t=await text();return t.includes('로그인되었습니다.')||t.includes('이메일로 계속하기')},'reconnect auth');if((await text()).includes('이메일로 계속하기'))await login()
  await wait(async()=>{const w=await local(firstSession);return !w.pendingSnapshot&&w.syncState==='CLEAN'&&(await api('/api/v1/workout-sessions/'+firstSession)).snapshot.state.performedSets.length===offlineOrdinal},'reconnect final snapshot')
  assert.equal(host.requests.slice(writeIndex).find(r=>r.path.endsWith('/snapshot'))?.body,frozen)
  assert.ok((await cdp.eval('caches.keys()')).some(k=>k.includes('devtest1')))
  const shot=await cdp.send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(directory,'actual-workout.png'),Buffer.from(shot.data,'base64'))
  pass('실제 서버 중지·오프라인 추가 완료·강제 종료/cold 재실행·DB3 원본 유지·waiting 적용·재인증 뒤 고정 원문 우선 재송신')
  host.fault.finishAck=true;await click('운동 종료');await click('이 시각으로 운동 종료 확인')
  await wait(async()=>{const x=await local(firstSession),s=await api('/api/v1/workout-sessions/'+firstSession);return x.finish?.request&&!x.finish.ack&&s.status==='FINISHED'},'FINISH committed without ACK')
  finishJson=(await local(firstSession)).finish.requestJson;await wait(async()=>(await text()).includes('연결 또는 서버 저장 결과를 확인하지 못했습니다.'),'bounded FINISH ACK loss');host.fault.finishAck=false;await click('서버 저장 상태 다시 확인')
  }
  await wait(()=>cdp.eval('!!document.querySelector(".closed-workout")'),'closed UI');assert.equal((await local(firstSession)).finish.requestJson,finishJson);assert.ok((await local(firstSession)).finish.ack)
  server=await api('/api/v1/workout-sessions/'+firstSession);const firstAssessment=JSON.stringify(server.completionAssessment),record1=server.snapshot.state.performedSets.find(s=>s.ordinal===1)
  await recordDialog(1);await labelInput('실제 중량','63','dialog[open]');await labelInput('실제 반복','9','dialog[open]');await click('정정 내용 서버 저장')
  await wait(async()=>{const s=await api('/api/v1/workout-sessions/'+firstSession);return s.snapshot.state.performedSets.find(x=>x.id===record1.id).weightKg==='63'},'corrected set')
  await wait(()=>cdp.eval('!document.querySelector("dialog[open]")'),'correction closed');await recordDialog(offlineOrdinal);await click('이 수행 논리 삭제');await wait(()=>cdp.eval('!document.querySelector("dialog[open]")'),'deleted set')
  server=await api('/api/v1/workout-sessions/'+firstSession);assert.equal(server.snapshot.state.performedSets.find(s=>s.id===record1.id).manufacturerId,panata);assert.equal(JSON.stringify(server.completionAssessment),firstAssessment)
  const events=await api('/api/v1/workout-sessions/'+firstSession+'/record-change-events');assert.ok(events.events.some(e=>e.changeKind==='DELETED'&&e.before?.ordinal===offlineOrdinal&&e.before.manufacturerId===hammer))
  await click('이 기기의 누락 완료 수행 비교·복구');await wait(()=>cdp.eval('!!document.querySelector("dialog[open]")'),'recovery view');assert.match(await cdp.eval('document.querySelector("dialog[open]").innerText'),/삭제되거나 이 기기에서 취소된 기록/);await cdp.eval('document.querySelector("dialog[open] button[aria-label=닫기]").click()')
  pass('실제 FINISH ACK 유실 재확인·종료 UI·중량/반복 정정·세트 삭제·삭제 원본 장비 감사·tombstone 복구 차단·최초 평가 유지')
  await click('개발 V17 실제 앱 검증');await click('온라인으로 운동 시작');await wait(async()=>{const active=(await api('/api/v1/workout-sessions/active')).session;return active&&active.id!==firstSession},'second session')
  const second=(await api('/api/v1/workout-sessions/active')).session,secondId=second.id;await wait(()=>cdp.eval('!!document.querySelector(".local-workout input")'),'second editor');await highRow()
  await cdp.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await cdp.eval("window.dispatchEvent(new Event('offline'))")
  await click('현재 운동에만 계획 변경');await select('제조사','','section[aria-label="현재 적용 계획 편집"]');await select('부하 방식','STACK','section[aria-label="현재 적용 계획 편집"]');await click('현재 장비 적용')
  await complete(secondId,1);await complete(secondId,2);await complete(secondId,3);const source=await local(secondId)
  const target=await cdp.send('Target.createTarget',{url:host.origin+'/favicon.svg'}),port=Number((await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0])
  const info=await wait(async()=>(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.id===target.targetId),'second target'),other=await connect(info.webSocketDebuggerUrl)
  const takeover=await api('/api/v1/workout-sessions/'+secondId+'/takeover','POST',{dataGeneration:generation,expectedWriterEpoch:second.writerEpoch,editorDeviceId:crypto.randomUUID()},other)
  await api('/api/v1/workout-sessions/'+secondId+'/finish','POST',{dataGeneration:generation,editorDeviceId:takeover.editorDeviceId,writerEpoch:takeover.writerEpoch,localRevision:'1',snapshot:takeover.snapshot.state,endedAt:new Date().toISOString()},other)
  await other.send('Page.close');other.ws.close();await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await cdp.eval("(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='로그인 상태 다시 확인'&&!b.disabled);b?.click()})()")
  await wait(()=>cdp.eval('!!document.querySelector(".closed-workout")'),'foreign closure protected');const sealed=JSON.stringify((await api('/api/v1/workout-sessions/'+secondId)).completionAssessment)
  recoveryContext={secondId,source,sealed}
  }else{
    const source=(await saved()).workouts.find(w=>w.sessionId!==firstSession&&w.snapshot.performedSets.length===3),secondId=source.sessionId,current=await api('/api/v1/workout-sessions/'+secondId)
    assert.equal(current.status,'FINISHED');await wait(()=>cdp.eval('!!document.querySelector(".closed-workout")'),'recovery closed UI')
    recoveryContext={secondId,source,sealed:JSON.stringify(current.completionAssessment)}
    await status('RESUMED_EXPLICIT_RECOVERY')
  }
  const {secondId,source,sealed}=recoveryContext
  const existing=await api('/api/v1/workout-sessions/'+secondId),alreadyRecovered=existing.snapshot.state.performedSets.length>0
  await click('이 기기의 누락 완료 수행 비교·복구')
  if(!alreadyRecovered){
    await wait(()=>cdp.eval('document.querySelectorAll("dialog[open] input[type=checkbox]:not(:disabled)").length===3'),'three recovery candidates')
    for(let n=0;n<3;n++){await cdp.eval('(()=>{const inputs=[...document.querySelectorAll("dialog[open] input[type=checkbox]:not(:disabled)")];inputs.find(e=>!e.checked)?.click()})()');await sleep(70)}
    await click('선택한 완료 수행 복구 확인');await wait(()=>cdp.eval('!document.querySelector("dialog[open]")'),'explicit recovery')
  }else{
    await wait(async()=>(await cdp.eval('document.querySelector("dialog[open]").innerText')).includes('이미 서버에 저장됨'),'already-present recovery facts')
    assert.equal(await cdp.eval('document.querySelectorAll("dialog[open] input[type=checkbox]:not(:disabled)").length'),0)
    await cdp.eval('document.querySelector("dialog[open] button[aria-label=닫기]").click()')
    assert.equal(host.requests.filter(r=>r.method==='POST'&&r.path.endsWith('/recoveries')).length,0)
  }
  const recovered=await api('/api/v1/workout-sessions/'+secondId)
  assert.deepEqual(recovered.snapshot.state.performedSets.map(s=>s.id).sort(),source.snapshot.performedSets.map(s=>s.id).sort())
  for(const original of source.snapshot.performedSets){const current=recovered.snapshot.state.performedSets.find(s=>s.id===original.id);assert.deepEqual([current.manufacturerId,current.loadType,current.weightKg,current.reps,current.ordinal,Date.parse(current.completedAt)],[original.manufacturerId,original.loadType,original.weightKg,original.reps,original.ordinal,Date.parse(original.completedAt)])}
  assert.equal(JSON.stringify(recovered.completionAssessment),sealed)
  const audit=await api('/api/v1/workout-sessions/'+secondId+'/record-change-events');assert.equal(audit.events.filter(e=>e.changeKind==='RECOVERED').length,3)
  const assessment=await api('/api/v1/workout-sessions/'+secondId+'/assessment');assert.equal(assessment.completionAssessment.schemaVersion,2);assert.ok(assessment.completionAssessment.exercises.every(e=>e.evaluatedPerformedSetIds.length===0));assert.equal(assessment.currentAssessment.evaluation.exercises.reduce((n,e)=>n+e.evaluatedPerformedSetIds.length,0),3)
  pass('실제 다른 writer 종료 후 구 원본 명시 복구3세트·UUID/당시 장비(미지정 포함) 보존·이미 저장된 사실 재복구0건·최초/현재 평가 분리')
  assert.equal(await cdp.eval("localStorage.getItem('another-app-marker')"),'keep');assert.equal(await cdp.eval("caches.open('another-app-cache').then(c=>c.match('/sentinel')).then(r=>r.text())"),'keep')
  assert.equal(await cdp.eval(`new Promise(r=>{const q=indexedDB.open('another-app-db');q.onsuccess=()=>{const db=q.result,tx=db.transaction('private'),v=tx.objectStore('private').get('marker');v.onsuccess=()=>{db.close();r(v.result)}}})`),'keep')
  const all=await saved();assert.equal(all.version,3);assert.ok(all.workouts.every(w=>w.schemaVersion===2));assert.equal(await cdp.eval('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),true)
  const manifest=await cdp.send('Page.getAppManifest');assert.equal(manifest.errors.length,0)
  await writeFile(resolve(directory,'domain-results.json'),JSON.stringify({userId:owner.userId,generation,routineId,placement,firstSession,secondSession:secondId,firstFinal:server,secondFinal:recovered,localOrigins:all.workouts.map(w=>({sessionId:w.sessionId,writerEpoch:w.writerEpoch,localRevision:w.localRevision,sets:w.snapshot.performedSets}))},null,2))
  pass('다른 앱 IndexedDB/localStorage/Cache 불변·신규 schema2·DB3 재실행 유지·모바일 overflow/Manifest 정상')
  await api('/api/v1/workout-settings','PATCH',{dataGeneration:generation,restLowSeconds:180,restMediumSeconds:120,restHighSeconds:90})
  await click('로그아웃');await click('로그아웃 확인');await wait(async()=>(await text()).includes('이메일로 계속하기'),'real logout')
  assert.equal((await apiRaw('/api/v1/auth/session')).status,401);assert.equal((await saved()).permit,undefined);assert.equal((await saved()).workouts.length,all.workouts.length)
  pass('실제 로그아웃401·오프라인 접근 해제·원본 유지·테스트 계정 휴식 기본값 복구')
  await status('PASS');console.log('DEV_CATALOG_V17_BROWSER_PASS',passed.length)
}catch(error){console.error(error.stack);process.exitCode=1;try{await writeFile(resolve(directory,'failure-page.txt'),await text());await status('FAIL')}catch{/* launch failed */}}
finally{await stop();if(hostUp)await host.stop();await unlink(resolve(directory,'otp.json')).catch(()=>{});await writeFile(resolve(directory,'result.json'),JSON.stringify({success:!process.exitCode,passed,pids,profile,requests:host.requests},null,2));await writeFile(resolve(directory,'stderr.log'),errors)}
