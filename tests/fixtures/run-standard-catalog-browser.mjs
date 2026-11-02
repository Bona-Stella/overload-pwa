import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const integration=process.argv.includes('--integration')
const directory=resolve(integration?'logs/standard-catalog-v17':'logs/standard-catalog'),profile=resolve(directory,'profile-'+crypto.randomUUID()),passed=[]
await mkdir(profile,{recursive:true})
let isolated
if(integration){
  isolated=JSON.parse(await readFile(resolve('../overload-server/build/task-008-1c/ready.json'),'utf8'))
  if(new URL(isolated.backendOrigin).hostname!=='127.0.0.1'||isolated.migrations!==17||isolated.initialUsers!==0||! /^[a-f0-9]{64}$/.test(isolated.containerId))throw Error('Disposable V17 backend required')
}
const server=await createServer({envDir:false,cacheDir:resolve(directory,'vite-cache'),plugins:integration?[{name:'catalog-otp-fixture',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
  if(req.url!=='/__fixture/otp'){next();return}
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(await readFile(resolve('../overload-server/build/task-008-1c/otp.json'),'utf8'))
})}}]:[],server:{host:'127.0.0.1',port:3079,strictPort:true,watch:{ignored:['**/logs/**']},...(integration?{proxy:{'/api':{target:isolated.backendOrigin}}}:{})}})
let browser,cdp,errors=''
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const wait=async(fn,label)=>{const until=Date.now()+30000;let last;while(Date.now()<until){try{const v=await fn();if(v)return v}catch(e){last=e}await sleep(60)}throw Error('Timeout '+label+' '+(last?.message??''))}
class Cdp {
  constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();ws.onmessage=e=>{const m=JSON.parse(e.data),p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)};ws.onclose=()=>{for(const p of this.pending.values())p.reject(Error('Browser closed'));this.pending.clear()}}
  send(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}))})}
  async eval(expression){const r=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value}
}
const input=async(selector,value)=>{await cdp.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.focus()})()`);await sleep(80)}
const click=async text=>{await cdp.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled);if(!b)throw Error('missing '+${JSON.stringify(text)});b.click()})()`);await sleep(100)}
const key=async key=>{await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key});await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key});await sleep(80)}
try {
  await server.listen()
  browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless','--remote-debugging-port=0','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--window-size=430,932','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','pipe','pipe']})
  console.log('ISOLATED_CATALOG_EDGE_PID',browser.pid);browser.stderr.on('data',c=>errors+=c);browser.stdout.on('data',()=>{})
  const port=await wait(async()=>Number((await readFile(resolve(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]),'CDP port')
  const target=await wait(async()=>(await(await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(t=>t.type==='page'),'target')
  const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});cdp=new Cdp(ws)
  await cdp.send('Page.enable');await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true})
  await cdp.send('Page.navigate',{url:'http://127.0.0.1:3079/tests/fixtures/'+(integration?'standard-catalog-v17':'standard-catalog')+'.html'})
  if(integration){
    const result=await wait(async()=>{const r=await cdp.eval('window.catalogV17Result');if(r?.status==='FAIL')throw Error(r.error);return r?.status==='PASS'?r:null},'real V17 integration')
    passed.push(...result.passed);console.log('STANDARD_CATALOG_V17_BROWSER_PASS',passed.length)
  }else{
  await wait(async()=>{const r=await cdp.eval('window.catalogResult');if(r?.status==='FAIL')throw Error(r.error);return r?.status==='UI_READY'},'database suite and UI')
  passed.push(...await cdp.eval('window.catalogResult.passed'))
  await input('input[role="combobox"]','ＢＥＮＣＨ　 PRESS');assert.equal(await cdp.eval('document.querySelectorAll("[role=option]").length'),1)
  await key('Enter');assert.equal(await cdp.eval('document.querySelector("#selected").textContent'),'40000000-1111-4222-8333-000000000001');passed.push('브라우저 NFKC/별칭 검색·Enter 선택')
  await input('input[role="combobox"]','공통 별칭');assert.equal(await cdp.eval('document.querySelectorAll("[role=option]").length'),2)
  await key('ArrowDown');await key('Enter');assert.equal(await cdp.eval('document.querySelector("#selected").textContent'),'40000000-1111-4222-8333-000000000002');passed.push('같은 별칭의 별도 UUID·방향키 선택')
  await cdp.eval('document.querySelector("#selected").textContent=""')
  await input('input[role="combobox"]','벤치')
  await cdp.eval(`(()=>{const e=document.querySelector('input[role="combobox"]');e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'벤치'}));e.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',keyCode:229,isComposing:true,bubbles:true}));e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'벤치'}))})()`)
  assert.equal(await cdp.eval('document.querySelector("#selected").textContent'),'');assert.equal(await cdp.eval('document.querySelector("input[role=combobox]").value'),'벤치');passed.push('한글 IME 조합 Enter가 종목 선택·폼 제출을 하지 않음 (합성 조합 이벤트)')
  const point=await cdp.eval('(()=>{const e=document.querySelector("[role=option]");e.scrollIntoView();const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()')
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await wait(()=>cdp.eval('document.querySelector("#selected").textContent'), 'touch selection');passed.push('모바일 390px 실제 touch 이벤트 선택·빈 카탈로그/제조사 안내')
  assert.match(await cdp.eval('document.body.innerText'),/등록된 표준 운동이 없습니다/)
  assert.equal(await cdp.eval('document.documentElement.scrollWidth<=document.documentElement.clientWidth'),true)
  await cdp.eval(`(()=>{const e=document.querySelector('select');e.value='';e.dispatchEvent(new Event('change',{bubbles:true}))})()`)
  await click('제거한 배치 조회');await click('벤치프레스 배치 복원')
  await cdp.eval(`(()=>{const selects=document.querySelectorAll('.online-routine select');const e=selects[1];e.value='STACK';e.dispatchEvent(new Event('change',{bubbles:true}))})()`)
  await sleep(100)
  await click('루틴 저장');const body=await cdp.eval('window.savedRoutine')
  assert.equal(body.weightPlacements[0].id,routinePlacement());assert.equal(body.weightPlacements[0].manufacturerId,null);assert.equal(body.weightPlacements[0].loadType,'STACK');assert.equal(body.weightPlacements[1].mode,'RESTORE');assert.equal(body.weightPlacements[1].manufacturerId,null);assert.equal(body.weightPlacements[1].loadType,null);assert.deepEqual(body.weightApprovals,[])
  passed.push('실제 RoutineForm 장비 변경·제거 배치 복원: 배치·승인 유지·필수 nullable 직렬화')
  const shot=await cdp.send('Page.captureScreenshot',{format:'png'});await writeFile(resolve(directory,'mobile.png'),Buffer.from(shot.data,'base64'))
  console.log('STANDARD_CATALOG_BROWSER_PASS',passed.length)
  }
} catch(error) {
  console.error(error.stack);process.exitCode=1
  try{await writeFile(resolve(directory,'failure.json'),JSON.stringify({result:await cdp.eval(integration?'window.catalogV17Result':'window.catalogResult'),text:await cdp.eval('document.body.innerText')},null,2))}catch{/* browser launch failed */}
} finally {
  if(browser){try{await cdp?.send('Browser.close')}catch{/* already exited */}await sleep(200);if(browser.exitCode===null){const cleanup=spawn('taskkill',['/PID',String(browser.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});await new Promise(r=>cleanup.once('exit',r))}}
  cdp?.ws.close();await server.close();await writeFile(resolve(directory,'result.json'),JSON.stringify({success:!process.exitCode,passed,pid:browser?.pid,profile},null,2));await writeFile(resolve(directory,'stderr.log'),errors)
}
function routinePlacement(){return '50000000-1111-4222-8333-000000000001'}
