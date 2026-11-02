import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { productionServer } from './pwa-production-server.mjs'
const boundaryOnly=process.argv.includes('--boundaries'),directory=resolve('logs/task-009-5e')
const suppliedProfile=process.argv.find(a=>a.startsWith('--profile='))?.slice(10)
const profile=suppliedProfile?resolve(suppliedProfile):resolve(directory,'profile-'+crypto.randomUUID())
if(!profile.startsWith(directory+'\\profile-'))throw Error('Use a dedicated 5E browser profile only')
await mkdir(profile,{recursive:true})
const server=await productionServer(),passed=[],pids=[]
let browser,cdp,hostUp=false,errors=''
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const wait=async(fn,label,ms=20000)=>{const until=Date.now()+ms;let last;while(Date.now()<until){try{const result=await fn();if(result)return result}catch(error){last=error}await sleep(80)}throw Error('Timeout '+label+(last?' '+last.message:''))}
class Cdp{
  constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();ws.onclose=()=>{for(const p of this.pending.values())p.reject(Error('CDP disconnected'));this.pending.clear()};ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);this.pending.delete(m.id);if(!p)return;if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result)}if(m.method==='Page.javascriptDialogOpening')void this.send('Page.handleJavaScriptDialog',{accept:true})}}
  static async open(url){const ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});return new Cdp(ws)}
  send(method,params={}){return new Promise((resolve,reject)=>{if(this.ws.readyState!==1){reject(Error('CDP closed'));return}const id=++this.id,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('CDP timeout '+method))},20000);this.pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});this.ws.send(JSON.stringify({id,method,params}))})}
  async eval(expression){const r=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value}
}
let launch=0
async function start(){
  await unlink(resolve(profile,'DevToolsActivePort')).catch(error=>{if(error.code!=='ENOENT')throw error})
  browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--remote-debugging-port=0','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-popup-blocking','--window-size=430,932','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','pipe','pipe']})
  pids.push(browser.pid);launch++;console.log('EDGE_PID',browser.pid,'launch',launch,'profile',profile);browser.stderr.on('data',c=>errors+=c);browser.stdout.on('data',()=>{})
  const port=await wait(async()=>{const lines=(await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n');return Number(lines[0])},'DevTools port')
  const target=await wait(async()=>{const list=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();return list.find(x=>x.type==='page')},'page target')
  console.log('CDP_TARGET',port,target.id)
  cdp=await Cdp.open(target.webSocketDebuggerUrl);await cdp.send('Page.enable');await cdp.send('Runtime.enable')
  await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.boundaryTrace=[];const setting=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='overload.offline.access.v1')window.boundaryTrace.push({value,stack:new Error('fence write').stack});return setting.call(this,key,value)};const deleting=IDBObjectStore.prototype.delete;IDBObjectStore.prototype.delete=function(key){if(this.name==='meta'&&key==='offlineResume')window.boundaryTrace.push(new Error('offline permit revoked').stack);return deleting.call(this,key)}`})
  await cdp.send('Page.navigate',{url:server.origin})
}
async function stop(force=false){
  if(!browser)return
  if(force){const child=spawn('taskkill',['/PID',String(browser.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});await new Promise(done=>child.once('exit',done))}
  else{try{await cdp.send('Browser.close')}catch{/* process closed */}await Promise.race([new Promise(done=>browser.once('exit',done)),sleep(5000)])}
  cdp?.ws.close();browser=null;await sleep(350)
}
const text=()=>cdp.eval('document.body.innerText')
const click=async label=>{await wait(()=>cdp.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled);if(!b)return false;b.click();return true})()`),label);await sleep(100)}
const input=async(selector,value)=>{await cdp.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('missing input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);await sleep(100)}
const dbRead=`async()=>{const db=await new Promise((r,j)=>{const q=indexedDB.open('overload.workout.v1');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});try{return await new Promise((r,j)=>{const tx=db.transaction(['meta','localWorkouts','sessionCopies'],'readonly');const a=tx.objectStore('localWorkouts').getAll(),b=tx.objectStore('meta').get('offlineResume'),c=tx.objectStore('sessionCopies').getAll();tx.oncomplete=()=>r({workouts:a.result,permit:b.result,copies:c.result,version:db.version});tx.onabort=()=>j(tx.error)})}finally{db.close()}}`
const saved=()=>cdp.eval('('+dbRead+')()')
const api=async(path,method='GET',body)=>cdp.eval(`(async()=>{const headers={'Content-Type':'application/json'};if(${JSON.stringify(method)}!=='GET'){const c=await(await fetch('/api/v1/auth/csrf',{cache:'no-store'})).json();headers[c.headerName]=c.token}const r=await fetch(${JSON.stringify(path)},{method:${JSON.stringify(method)},credentials:'include',cache:'no-store',headers,...(${JSON.stringify(body)}===undefined?{}:{body:JSON.stringify(${JSON.stringify(body)})})});if(!r.ok)throw Error('API '+r.status+' '+await r.text());return r.status===204?null:r.json()})()`)
const sql=async statement=>{const p=spawn('docker',['exec',server.isolated.containerId,'psql','-U','overload_test','-d','overload_browser_isolated','-X','-v','ON_ERROR_STOP=1','-c',statement],{windowsHide:true,stdio:['ignore','pipe','pipe']});let error='';p.stderr.on('data',c=>error+=c);p.stdout.on('data',()=>{});const code=await new Promise((r,j)=>{p.once('exit',r);p.once('error',j)});if(code!==0)throw Error('Disposable fixture SQL failed '+error)}
const identifier=value=>{assert.match(value,/^[a-f0-9-]{36}$/);return value}
const pass=label=>{passed.push(label);console.log('PASS',label)}
try{
  await server.start();hostUp=true;await start()
  if(boundaryOnly){
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
    await wait(async()=>{const t=await text();return t.includes('이메일로 계속하기')||t.includes('로그인되었습니다.')},'boundary auth restored')
    if((await text()).includes('로그인되었습니다.')){await click('로그아웃');await click('로그아웃 확인')}
    await wait(async()=>(await text()).includes('이메일로 계속하기'),'logged-out boundary profile')
    const previous=(await saved()).workouts,previousBytes=JSON.stringify(previous),oldOwners=new Set(previous.map(w=>w.userId))
    await input('input[type="email"]','pwa-boundary-'+crypto.randomUUID()+'@example.test');await click('이메일로 계속하기')
    const otp=await wait(async()=>JSON.parse(await readFile(resolve('../overload-server/build/task-008-1c/otp.json'),'utf8')).code,'new account OTP')
    await input('input[autocomplete="one-time-code"]',otp);await click('코드 확인');await wait(async()=>(await text()).includes('로그인되었습니다.'),'new owner')
    const owner=(await api('/api/v1/auth/session')).userId
    assert.ok(!oldOwners.has(owner));assert.ok(!(await text()).includes('5E 오프라인 운동'));assert.equal(JSON.stringify((await saved()).workouts),previousBytes)
    pass('real OTP account switch never exposes or retags the previous account workout sources')
    const data=await api('/api/v1/standard-exercises/search-data'),generation=(await api('/api/v1/routines')).dataGeneration
    const routine=await api('/api/v1/routines','POST',{id:crypto.randomUUID(),dataGeneration:generation,name:'5E 경계 운동',weightPlacements:[{manufacturerId:null,loadType:null,id:crypto.randomUUID(),standardExerciseId:data.exercises[0].id,setCount:2,minReps:6,maxReps:10,initialWeightKg:'0'}],cardioPlacements:[]})
    await click('다시 조회');await click(routine.name);await click('온라인으로 운동 시작')
    const local=await wait(async()=>{const v=await saved();return v.permit?.userId===owner&&v.workouts.find(w=>w.userId===owner)},'new owner permitted workout')
    await wait(()=>cdp.eval("JSON.parse(localStorage.getItem('overload.offline.access.v1')).allowed"),'new owner fence committed')
    assert.ok(await cdp.eval('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    const manifest=await cdp.send('Page.getAppManifest');assert.equal(manifest.errors.length,0)
    const installation=await cdp.send('Page.getInstallabilityErrors');assert.deepEqual(installation.installabilityErrors,[])
    const shot=await cdp.send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(directory,'mobile-workout.png'),Buffer.from(shot.data,'base64'))
    pass('390px mobile viewport has no horizontal overflow; Chromium manifest/installability diagnostics pass')
    // Contract fault injection only: a read-only new namespace response, NOT a DB generation mutation.
    server.fault.generation=(BigInt(generation)+1n).toString();await click('다시 조회')
    await wait(()=>cdp.eval(`(()=>{const f=JSON.parse(localStorage.getItem('overload.offline.access.v1'));return !f.allowed&&(f.userId===null||f.dataGeneration===${JSON.stringify(server.fault.generation)})})()`),'new generation fence')
    assert.ok(!(await text()).includes('5E 경계 운동'));assert.equal((await saved()).workouts.find(w=>w.sessionId===local.sessionId).dataGeneration,generation)
    await server.stop();hostUp=false;await stop();await start();await wait(async()=>(await text()).includes('연결을 확인해 주세요'),'generation isolated cold start',25000)
    assert.ok(!(await text()).includes('이 기기의 운동 이어가기'));pass('new generation read contract isolates prior IDB source and blocks cold resume without retagging')
    server.fault.generation=null;await server.start();hostUp=true;await click('로그인 상태 다시 확인')
    await wait(async()=>{const v=await saved(),f=await cdp.eval("JSON.parse(localStorage.getItem('overload.offline.access.v1'))");return v.permit?.userId===owner&&f.allowed},'normal verified namespace restored')
    const id=crypto.randomUUID();await writeFile(resolve('../overload-server/build/task-008-1c/command.json'),JSON.stringify({id,action:'revoke-session',userId:owner}))
    await wait(async()=>{const r=JSON.parse(await readFile(resolve('../overload-server/build/task-008-1c/result.json'),'utf8'));return r.id===id&&r.ok},'real session revocation')
    await click('세션 상세 다시 확인')
    await wait(async()=>!(await saved()).permit,'401 durable revoke')
    await server.stop();hostUp=false;await stop();await start();await wait(async()=>(await text()).includes('연결을 확인해 주세요'),'401 then cold offline',25000)
    assert.ok(!(await text()).includes('이 기기의 운동 이어가기'));assert.ok(!(await text()).includes(routine.name))
    assert.equal(JSON.stringify((await saved()).workouts.filter(w=>oldOwners.has(w.userId))),previousBytes)
    pass('real backend 401 is distinct from an outage and revokes cold access; all owner originals survive')
    console.log('PWA_BOUNDARY_BROWSER_SUITE_PASS')
  }else{
  await wait(async()=>(await text()).includes('이메일로 계속하기'),'anonymous page')
  await input('input[type="email"]','pwa-'+crypto.randomUUID()+'@example.test');await click('이메일로 계속하기')
  const otp=await wait(async()=>{try{return JSON.parse(await readFile(resolve('../overload-server/build/task-008-1c/otp.json'),'utf8')).code}catch{return null}},'OTP')
  await input('input[autocomplete="one-time-code"]',otp);await click('코드 확인')
  await wait(async()=>(await text()).includes('로그인되었습니다.'),'real login')
  const routines=await api('/api/v1/routines'),exercises=await api('/api/v1/standard-exercises/search-data'),generation=routines.dataGeneration
  await api('/api/v1/workout-settings','PATCH',{dataGeneration:generation,restLowSeconds:10,restMediumSeconds:10,restHighSeconds:10})
  const routine=await api('/api/v1/routines','POST',{id:crypto.randomUUID(),dataGeneration:generation,name:'5E 오프라인 운동',weightPlacements:[{manufacturerId:null,loadType:null,id:crypto.randomUUID(),standardExerciseId:exercises.exercises[0].id,setCount:3,minReps:6,maxReps:10,initialWeightKg:'60'}],cardioPlacements:[{id:crypto.randomUUID(),plan:{kind:'OUTDOOR',name:'야외 걷기',targetSeconds:60,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null}}]})
  await click('다시 조회');await click(routine.name);await click('온라인으로 운동 시작')
  const permissionReady=async()=>{const v=await saved();assert.equal(v.version,3);const f=JSON.parse(await cdp.eval("localStorage.getItem('overload.offline.access.v1')")??'null');return v.permit&&f?.allowed&&v.permit.nonce===f.nonce&&v.workouts.length===1}
  await wait(permissionReady,'committed workout and offline permission')
  await wait(()=>cdp.eval('navigator.serviceWorker.ready.then(()=>true)'),'installed shell')
  const previousPage=await cdp.eval('performance.timeOrigin');await cdp.send('Page.reload');await wait(async()=>(await cdp.eval('performance.timeOrigin'))!==previousPage,'new document');await wait(()=>cdp.eval('!!navigator.serviceWorker.controller'),'controlled production page');await wait(permissionReady,'reload offline permission');await wait(()=>cdp.eval(`!!document.querySelector('input[aria-label="1세트 중량 kg"]')`),'workout')
  const cache=await cdp.eval('(async()=>{const keys=await caches.keys();return Promise.all(keys.map(async key=>({key,paths:(await(await caches.open(key)).keys()).map(r=>new URL(r.url).pathname)})))})()')
  assert.ok(cache.length);assert.ok(cache.every(c=>c.paths.every(p=>!p.startsWith('/api')&&!p.includes('auth'))));pass('production manifest, controlled shell, static-only Cache Storage')
  await input('input[aria-label="1세트 중량 kg"]','62.500000');await input('input[aria-label="1세트 이번 반복 횟수"]','8')
  // Browsers may retry idempotent PUT before surfacing a closed socket; suppress all ACKs in this phase.
  server.fault.dropSnapshot=100
  await cdp.eval(`document.querySelector('button[aria-label="1세트 완료"]').click()`)
  await wait(async()=>{const v=await saved();return v.workouts[0].pendingSnapshot&&v.workouts[0].snapshot.performedSets.length===1},'frozen uncertain snapshot')
  await input('input[aria-label="2세트 중량 kg"]','61.250000');await input('input[aria-label="2세트 이번 반복 횟수"]','9')
  const before=(await saved()).workouts[0],frozen=before.pendingSnapshot.requestJson
  await writeFile(resolve(directory,'before-offline.json'),JSON.stringify({db:await saved(),fence:await cdp.eval("localStorage.getItem('overload.offline.access.v1')"),trace:await cdp.eval('window.boundaryTrace')},null,2))
  await server.stop();hostUp=false;await stop();await start()
  await wait(async()=>(await text()).includes('이 기기의 운동 이어가기'),'offline cold consent',25000)
  assert.ok(!(await text()).includes('5E 오프라인 운동'));await click('이 기기의 운동 이어가기')
  await wait(()=>cdp.eval(`document.querySelector('input[aria-label="2세트 중량 kg"]')?.value==='61.250000'`),'restored draft')
  assert.equal((await saved()).workouts[0].pendingSnapshot.requestJson,frozen);assert.ok(!(await text()).includes('로그인되었습니다.'));pass('full offline process restart requires consent and restores exact drafts/pending snapshot')
  if((await text()).includes('휴식 종료'))await click('휴식 종료')
  await cdp.eval(`document.querySelector('button[aria-label="2세트 완료"]').click()`)
  await wait(async()=>(await saved()).workouts[0].snapshot.performedSets.length===2,'offline atomic completion')
  if((await text()).includes('휴식 종료'))await click('휴식 종료')
  await input('input[aria-label="3세트 이번 반복 횟수"]','8')
  await cdp.eval(`window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='localWorkouts')throw new DOMException('test-only abort','QuotaExceededError');return window.originalPut.apply(this,args)};document.querySelector('button[aria-label="3세트 완료"]').click()`)
  await wait(async()=>(await text()).includes('이 기기에 저장하지 못했습니다.'),'IDB failed transaction feedback')
  assert.equal((await saved()).workouts[0].snapshot.performedSets.length,2)
  assert.ok(await cdp.eval(`!!document.querySelector('button[aria-label="3세트 완료"]')`))
  await cdp.eval('IDBObjectStore.prototype.put=window.originalPut');pass('real IndexedDB write failure never confirms completion or changes committed snapshot')
  await click('종목 목록');await click('야외 걷기 · 유산소');await click('유산소 시작')
  await wait(async()=>Object.values((await saved()).workouts[0].timers).some(t=>t.runningSince),'persisted cardio anchor')
  const timed=(await saved()).workouts[0]
  await stop(true);await start();await wait(async()=>(await text()).includes('이 기기의 운동 이어가기'),'second cold consent',25000);await click('이 기기의 운동 이어가기')
  await wait(async()=>(await text()).includes('측정 중'),'timer resumed')
  assert.deepEqual((await saved()).workouts[0].timers,timed.timers);pass('offline input survives forced process exit; cardio/rest anchors and original fixed request preserved')
  const first=cdp,target=await cdp.send('Target.createTarget',{url:'about:blank'})
  const {targetInfo}=await cdp.send('Target.getTargetInfo',{targetId:target.targetId})
  const port=Number((await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0])
  const secondInfo=await wait(async()=>(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.id===targetInfo.targetId),'second tab')
  cdp=await Cdp.open(secondInfo.webSocketDebuggerUrl);await cdp.send('Page.enable');await cdp.send('Page.navigate',{url:server.origin})
  await wait(async()=>(await text()).includes('이 기기의 운동 이어가기'),'second tab consent',25000);await click('이 기기의 운동 이어가기')
  await wait(async()=>(await text()).includes('이 탭은 읽기 전용입니다.'),'exclusive browser editor lock')
  assert.equal(await cdp.eval('[...document.querySelectorAll(".local-workout input")].every(i=>i.disabled)'),true)
  await cdp.send('Page.close');cdp.ws.close();cdp=first;pass('two real offline tabs share an exclusive Web Lock; second editor is read-only')
  await click('운동 종료');await click('이 시각으로 운동 종료 확인')
  const finished=await wait(async()=>{const w=(await saved()).workouts[0];return w.finish?w:null},'offline finish intent')
  assert.ok(!finished.finish.ack);assert.equal(finished.pendingSnapshot.requestJson,frozen)
  await stop(true);await start();await wait(async()=>(await text()).includes('이 기기의 운동 이어가기'),'finish cold consent',25000);await click('이 기기의 운동 이어가기')
  await wait(async()=>(await text()).includes('서버 종료는 아직 확인하지 못했습니다.'),'unconfirmed finish UI')
  assert.equal((await saved()).workouts[0].finish.endedAt,finished.finish.endedAt);pass('offline FINISH retains one original endedAt and final state across crash without claiming FINISHED')
  const requestIndex=server.requests.length
  server.fault.dropSnapshot=0
  await server.start();hostUp=true;await click('로그인 상태 다시 확인')
  await wait(async()=>{const s=await api('/api/v1/workout-sessions/'+finished.sessionId);return s.status==='FINISHED'},'validated reconnect FINISH',25000)
  const after=server.requests.slice(requestIndex),firstWrite=after.findIndex(r=>r.method!=='GET'&&r.path.includes('workout-sessions'))
  assert.ok(firstWrite>0);assert.ok(after.slice(0,firstWrite).some(r=>r.path==='/api/v1/auth/session'));assert.ok(after.slice(0,firstWrite).some(r=>r.path.endsWith('/active')))
  assert.equal(after.find(r=>r.path.endsWith('/snapshot'))?.body,frozen)
  assert.equal((await api('/api/v1/workout-sessions/'+finished.sessionId)).endedAt,finished.finish.endedAt)
  pass('reconnection validates authentication/scope/session/writer before exact pending request and FINISH')
  // Real service worker update while documents are open: no controller replacement or source mutation.
  const original=JSON.stringify((await saved()).workouts),controllerUrl=await cdp.eval('navigator.serviceWorker.controller.scriptURL')
  server.fault.variant=1;await cdp.eval('navigator.serviceWorker.getRegistration().then(r=>r.update())')
  await wait(()=>cdp.eval('navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)'),'waiting update')
  assert.equal(await cdp.eval('navigator.serviceWorker.controller.scriptURL'),controllerUrl);assert.equal(JSON.stringify((await saved()).workouts),original)
  pass('updated worker waits with open windows; workout/FINISH source unchanged')
  await click(routine.name);await click('온라인으로 운동 시작')
  const auto=await wait(async()=>{const w=(await saved()).workouts.find(w=>w.sessionId!==finished.sessionId);return w&&w},'second workout')
  await input('input[aria-label="1세트 이번 반복 횟수"]','8')
  await server.stop();hostUp=false
  await cdp.eval(`document.querySelector('button[aria-label="1세트 완료"]').click()`)
  await wait(async()=>(await saved()).workouts.find(w=>w.sessionId===auto.sessionId).snapshot.performedSets.length===1,'AUTO_CLOSED local source')
  await click('운동 종료');await click('이 시각으로 운동 종료 확인')
  await sql("UPDATE workout_sessions SET last_workout_synced_at=clock_timestamp()-interval '25 hours' WHERE id='"+identifier(auto.sessionId)+"'::uuid AND status='ACTIVE'")
  const autoIndex=server.requests.length
  await server.start();hostUp=true;await click('로그인 상태 다시 확인')
  await wait(async()=>(await text()).includes('서버 자동 종료'),'AUTO_CLOSED reconnect')
  assert.ok(!server.requests.slice(autoIndex).some(r=>r.method!=='GET'&&r.path.includes('/workout-sessions/')))
  assert.ok((await saved()).workouts.find(w=>w.sessionId===auto.sessionId).finish.endedAt)
  pass('real 25-hour AUTO_CLOSED stops automatic snapshot/FINISH; offline intent and recovery source survive')
  await click(routine.name);await click('온라인으로 운동 시작')
  const foreign=await wait(async()=>{const v=await saved();return v.workouts.find(w=>![finished.sessionId,auto.sessionId].includes(w.sessionId))},'third workout')
  await input('input[aria-label="1세트 이번 반복 횟수"]','8');await server.stop();hostUp=false
  await cdp.eval(`document.querySelector('button[aria-label="1세트 완료"]').click()`)
  await wait(async()=>(await saved()).workouts.find(w=>w.sessionId===foreign.sessionId).snapshot.performedSets.length===1,'foreign epoch local source')
  await wait(async()=>(await text()).includes('연결을 확인해 주세요'),'transport suspended')
  await server.start();hostUp=true
  await api('/api/v1/workout-sessions/'+foreign.sessionId+'/takeover','POST',{dataGeneration:generation,expectedWriterEpoch:foreign.writerEpoch,editorDeviceId:crypto.randomUUID()})
  const foreignIndex=server.requests.length
  await click('로그인 상태 다시 확인');await wait(async()=>(await text()).includes('다른 기기에서 편집 중입니다.'),'foreign writer reconnect')
  assert.ok(!server.requests.slice(foreignIndex).some(r=>r.method!=='GET'&&r.path.includes('/workout-sessions/')))
  assert.equal((await saved()).workouts.filter(w=>w.sessionId===foreign.sessionId).length,1)
  pass('different real server epoch stops old writer and preserves its untransmitted source without copying')
  await click('이 기기로 편집 가져오기')
  await wait(async()=>(await saved()).workouts.filter(w=>w.sessionId===foreign.sessionId).length===2,'explicit takeover separate copy')
  assert.equal((await saved()).workouts.find(w=>w.sessionId===foreign.sessionId&&w.writerEpoch!=='0').snapshot.performedSets.length,0)
  pass('explicit takeover creates a separate new writer copy without auto-merging old records')
  await click('로그아웃');await click('로그아웃 확인');await wait(async()=>(await text()).includes('이메일로 계속하기'),'logout')
  assert.equal((await saved()).permit,undefined)
  await server.stop();hostUp=false;await stop();await start();await wait(async()=>(await text()).includes('연결을 확인해 주세요'),'logged-out offline app',25000)
  assert.ok(!(await text()).includes('이 기기의 운동 이어가기'));assert.ok(!(await text()).includes('5E 오프라인 운동'));assert.equal((await saved()).workouts.length,4)
  pass('explicit logout blocks cold offline data access while preserving original records')
  console.log('PWA_BROWSER_SUITE_PASS')
  }
}catch(error){
  console.error(error.stack);try{await writeFile(resolve(directory,'failure-page.txt'),await text());await writeFile(resolve(directory,'failure-db.json'),JSON.stringify(await saved(),null,2));await writeFile(resolve(directory,'failure-trace.json'),JSON.stringify({trace:await cdp.eval('window.boundaryTrace'),fence:await cdp.eval("localStorage.getItem('overload.offline.access.v1')")},null,2))}catch{/* crashed page */}process.exitCode=1
}finally{
  await stop();if(hostUp)await server.stop()
  await writeFile(resolve(directory,boundaryOnly?'boundary-browser-result.json':'browser-result.json'),JSON.stringify({passed,pids,profile,launches:launch,requests:server.requests,backend:server.isolated,success:!process.exitCode},null,2));await writeFile(resolve(directory,boundaryOnly?'boundary-browser-stderr.log':'browser-stderr.log'),errors)
}
