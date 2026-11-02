import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { createHash, webcrypto } from 'node:crypto'
import { OfflineAccess, OFFLINE_FENCE, offlinePermit } from '../src/features/workout-local/offline-access.ts'
import { AuthController } from '../src/features/auth/controller.ts'
import { AuthError } from '../src/features/auth/api.ts'
import { session, scope, USER, OTHER, DEVICE, SESSION } from './fixtures/workout-online-data.mjs'
import { createLocalWorkout } from '../src/features/workout-local/model.ts'
import { acquireEditor } from '../src/features/workout-local/lock.ts'
const key={...scope,editorDeviceId:DEVICE,sessionId:SESSION,writerEpoch:'0'}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
function permission(){
  let value=null,permit=null,blocked=false
  const storage={getItem:()=>value,setItem:(_key,next)=>{if(blocked)throw Error('storage blocked');value=next}}
  const port={clearOfflinePermit:async()=>{permit=null},saveOfflinePermit:async(next,allowed)=>{assert.ok(allowed());permit=structuredClone(next)},offlineSource:async()=>permit?{permit,workout:createLocalWorkout(session(),{restLowSeconds:180,restMediumSeconds:120,restHighSeconds:90}),server:session()}:null}
  const access=new OfflineAccess(port,storage)
  return{access,storage,port,block:()=>{blocked=true}}
}
test('cold resume is an exact last-verified account/generation permission, never an auth session',async()=>{
  const f=permission();assert.equal(await f.access.source(),null)
  await f.access.identity(USER);f.access.scope(scope);await f.access.grant(key,()=>true)
  const source=await f.access.source();assert.ok(source);assert.ok(offlinePermit(source.permit));assert.equal(source.permit.sessionId,SESSION)
  assert.equal(Object.keys(source.permit).length,7)
  assert.equal(new OfflineAccess(f.port,f.storage).matches(source.permit),true)
  assert.deepEqual(JSON.parse(f.storage.getItem(OFFLINE_FENCE)),{nonce:source.permit.nonce,...scope,allowed:true})
  f.access.scope({...scope,dataGeneration:'9007199254740994'});assert.equal(await f.access.source(),null)
})
test('account change, explicit logout, and absent/corrupt fences never expose the old workout',async()=>{
  const f=permission();await f.access.identity(USER);f.access.scope(scope);await f.access.grant(key,()=>true)
  await f.access.identity(OTHER);assert.equal(await f.access.source(),null)
  await f.access.identity(USER);f.access.scope(scope);await f.access.grant(key,()=>true)
  await f.access.deny();assert.equal(await f.access.source(),null)
  f.storage.setItem(OFFLINE_FENCE,'{}');assert.equal(await f.access.source(),null)
})
test('a grant committed across logout cannot reopen the synchronous revocation fence',async()=>{
  const f=permission();await f.access.identity(USER);f.access.scope(scope)
  const gate=deferred(),original=f.port.saveOfflinePermit
  f.port.saveOfflinePermit=async(p,allowed)=>{await original(p,allowed);await gate.promise}
  const granting=f.access.grant(key,()=>true);await Promise.resolve();await f.access.deny();gate.resolve();await granting
  assert.equal(await f.access.source(),null)
})
test('permit write failure or revoked live authorization never enables cold access',async()=>{
  const f=permission();await f.access.identity(USER);f.access.scope(scope)
  await f.access.grant(key,()=>false);assert.equal(await f.access.source(),null)
  f.port.saveOfflinePermit=async()=>{throw Error('IDB aborted')}
  await assert.rejects(f.access.grant(key,()=>true));assert.equal(await f.access.source(),null)
})
test('concurrent permit commits cannot leave the IDB pointer paired with a different fence nonce',async()=>{
  const f=permission();await f.access.identity(USER);f.access.scope(scope)
  const commits=[];let persisted=null
  f.port.saveOfflinePermit=async(next,allowed)=>{
    assert.ok(allowed())
    // Model IDB's last guard passing before its asynchronous commit notification.
    const commit=deferred();commits.push(commit);await commit.promise;persisted=structuredClone(next)
  }
  f.port.offlineSource=async()=>persisted?{permit:persisted,server:session(),workout:createLocalWorkout(session(),{restLowSeconds:180,restMediumSeconds:120,restHighSeconds:90})}:null
  const first=f.access.grant(key,()=>true),second=f.access.grant(key,()=>true)
  for(let i=0;i<4;i++)await Promise.resolve()
  commits[0].resolve();await first
  for(let i=0;i<4;i++)await Promise.resolve()
  commits[1].resolve();await second
  const source=await f.access.source();assert.ok(source)
  assert.equal(JSON.parse(f.storage.getItem(OFFLINE_FENCE)).nonce,persisted.nonce)
})
test('a queued permission refresh rechecks authorization after logout instead of reopening local access',async()=>{
  const f=permission();await f.access.identity(USER);f.access.scope(scope)
  const commit=deferred();let authorized=true,writes=0
  f.port.saveOfflinePermit=async()=>{writes++;await commit.promise}
  const first=f.access.grant(key,()=>authorized),second=f.access.grant(key,()=>authorized)
  for(let i=0;i<4;i++)await Promise.resolve()
  authorized=false;await f.access.deny();commit.resolve();await Promise.all([first,second])
  assert.equal(writes,1);assert.equal(JSON.parse(f.storage.getItem(OFFLINE_FENCE)).allowed,false)
})
test('refreshing an admitted workout survives a crash that retains the previous durable localStorage fence',async()=>{
  const f=permission();await f.access.identity(USER);f.access.scope(scope);await f.access.grant(key,()=>true)
  const durable=f.storage.getItem(OFFLINE_FENCE)
  await f.access.grant(key,()=>true)
  // Chromium may retain the earlier fence when a newly buffered localStorage write is lost.
  f.storage.setItem(OFFLINE_FENCE,durable)
  assert.ok(await new OfflineAccess(f.port,f.storage).source())
  await f.access.deny();assert.equal(await f.access.source(),null)
})
test('either durable logout barrier suffices; failure of BOTH is reported rather than logout success',async()=>{
  const f=permission();f.port.clearOfflinePermit=async()=>{throw Error('IDB unavailable')};await f.access.deny()
  f.block();await assert.rejects(f.access.deny(),/차단/)
})
function auth(api,boundary){return new AuthController({refreshCsrf:async()=>{},...api},()=>0,()=>{},()=>{},boundary)}
test('network/timeout cold restart remains unavailable and offers only local consent; 503 is not offline auth',async()=>{
  for(const error of [new AuthError('NETWORK'),new AuthError('TIMEOUT'),new AuthError('UNAVAILABLE',503)]){
    const calls=[],c=auth({session:async()=>{throw error}},{identity:async id=>calls.push(id),deny:async()=>calls.push('deny')})
    await c.start();assert.equal(c.getSnapshot().status,'unavailable');assert.equal(c.getSnapshot().offlineNetworkFailure,error.status!==503);assert.deepEqual(calls,[]);assert.equal(c.getSnapshot().userId,null)
  }
})
test('definitive anonymous session followed by CSRF network loss never permits offline cold resume',async()=>{
  const calls=[],c=auth({session:async()=>null,refreshCsrf:async()=>{throw new AuthError('NETWORK')}},{identity:async id=>calls.push(id),deny:async()=>{}})
  await c.start();assert.deepEqual(calls,[null]);assert.equal(c.getSnapshot().offlineNetworkFailure,false)
})
test('logout revokes local access BEFORE a failing network request; no fake logout ACK',async()=>{
  const calls=[],c=auth({session:async()=>({userId:USER}),logout:async()=>{calls.push('logout');throw new AuthError('NETWORK')}},{identity:async()=>{},deny:async()=>{calls.push('deny')}})
  await c.start();await c.logout();assert.deepEqual(calls,['deny','logout']);assert.equal(c.getSnapshot().status,'unavailable');assert.equal(c.getSnapshot().offlineNetworkFailure,false)
})
test('warm transport loss suspends authenticated sending and requires a fresh session before resume',async()=>{
  let count=0
  const c=auth({session:async()=>{count++;return{userId:USER}},workoutRequest:async()=>{throw new AuthError('NETWORK')}},{identity:async()=>{},deny:async()=>{}})
  await c.start();await assert.rejects(c.workoutRequest(USER,'/api/v1/exercises','GET',undefined,new AbortController().signal))
  assert.equal(c.getSnapshot().status,'unavailable');assert.equal(c.getSnapshot().localWorkoutUserId,USER)
  await c.restore();assert.equal(count,2);assert.equal(c.getSnapshot().status,'authenticated')
})
test('401 revokes durable cold permission while existing in-memory workout policy stays explicit',async()=>{
  const calls=[],c=auth({session:async()=>({userId:USER}),workoutRequest:async()=>{throw new AuthError('AUTHENTICATION_REQUIRED',401)}},{identity:async()=>{},deny:async()=>{calls.push('deny')}})
  await c.start();await assert.rejects(c.workoutRequest(USER,'/api/v1/exercises','GET',undefined,new AbortController().signal))
  assert.deepEqual(calls,['deny']);assert.equal(c.getSnapshot().offlineNetworkFailure,false)
})
test('a concurrent stale GET cancelled after transport loss cannot revoke the offline permission',async()=>{
  const calls=[],gate=deferred(),c=auth({session:async()=>({userId:USER}),workoutRequest:async()=>{await gate.promise;return{status:200,data:{}}}},{identity:async()=>{},deny:async()=>{calls.push('deny')}})
  await c.start();const request=c.workoutRequest(USER,'/api/v1/exercises','GET',undefined,new AbortController().signal)
  c.networkUnavailable();gate.resolve();await assert.rejects(request,error=>error.code==='NETWORK')
  assert.deepEqual(calls,[]);assert.equal(c.getSnapshot().offlineNetworkFailure,true)
})
test('a reconnect check retains local consent eligibility while pending, then a definitive refusal clears it',async()=>{
  let read=async()=>{throw new AuthError('NETWORK')}
  const c=auth({session:()=>read()},{identity:async()=>{},deny:async()=>{}});await c.start()
  const gate=deferred();read=()=>gate.promise;const restoring=c.restore()
  assert.equal(c.getSnapshot().offlineNetworkFailure,true);assert.equal(c.getSnapshot().pending,'restore')
  gate.resolve(null);await restoring;assert.equal(c.getSnapshot().offlineNetworkFailure,false);assert.equal(c.getSnapshot().status,'anonymous')
})
test('an old in-flight request completed during reauthentication cannot invalidate the verified new context',async()=>{
  const calls=[],gate=deferred(),c=auth({session:async()=>({userId:USER}),workoutRequest:async()=>gate.promise},{identity:async()=>{},deny:async()=>{calls.push('deny')}})
  await c.start();const request=c.workoutRequest(USER,'/api/v1/exercises','GET',undefined,new AbortController().signal)
  await c.restore();gate.resolve({status:200,data:{}})
  await assert.rejects(request,{code:'REQUEST_SUPERSEDED'});assert.deepEqual(calls,[]);assert.equal(c.getSnapshot().status,'authenticated')
})
test('editor release can await the browser lock request completion before a new epoch mounts',async()=>{
  let held=false
  const locks={request:async(_name,_options,fn)=>{held=true;await fn({});held=false}}
  const lease=await acquireEditor(key,locks);assert.ok(held);await lease.release();assert.equal(held,false);assert.equal(lease.held(),false)
})

const template=readFileSync(new URL('../src/pwa/worker.js',import.meta.url),'utf8')
function worker({version=3,wrongBytes=false}={}){
  const events={},writes=[],deletes=[],net=[]
  const bytes='public immutable build bytes',digest=createHash('sha256').update(bytes).digest('hex')
  const config={id:'test',assets:[{path:'/index.html',sha256:digest},{path:'/assets/app.js',sha256:digest}]}
  const store=new Map(),db={version,close(){}}
  const idb={open(name,...args){assert.equal(name,'overload.workout.v1');assert.equal(args.length,0);const req={result:db,transaction:{abort(){queueMicrotask(()=>req.onerror())}}};queueMicrotask(()=>{if(version===0)req.onupgradeneeded();else req.onsuccess()});return req}}
  const cache={put:async(path,response)=>{writes.push(path);store.set(path,response)},match:async path=>store.get(path)}
  const self={location:{origin:'https://example.test'},clients:{matchAll:async()=>[]},addEventListener:(type,fn)=>events[type]=fn}
  runInNewContext(template.replace('__SHELL_CONFIG__',JSON.stringify(config)),{self,indexedDB:idb,URL,Uint8Array,crypto:webcrypto,caches:{open:async()=>cache,keys:async()=>['overload-static-shell-v1-old','other-app-cache'],delete:async name=>deletes.push(name)},fetch:async(path,options)=>{net.push({path,options});return new Response(wrongBytes?'personal or wrong deploy':bytes)}})
  const install=()=>{let pending;events.install({waitUntil:p=>pending=p});return pending}
  const fetchPath=(path,{mode='cors',method='GET'}={})=>{let result;events.fetch({request:{url:new URL(path,self.location.origin).href,mode,method},respondWith:p=>result=p});return result}
  return{events,install,fetchPath,writes,deletes,net,config}
}
test('worker precaches only digest-verified public assets with credentials omitted',async()=>{
  const w=worker();await w.install();assert.deepEqual(w.writes,['/index.html','/assets/app.js']);assert.equal(w.net[0].options.credentials,'omit');assert.equal(w.net[0].options.redirect,'error')
  for(const path of ['/api/v1/auth/session','/api/v1/workout-sessions','/oauth2/authorization/google','/auth/complete','https://accounts.google.com/','/?code=secret'])assert.equal(w.fetchPath(path,{mode:'navigate'}),undefined,path)
  assert.ok(w.fetchPath('/',{mode:'navigate'}));assert.ok(w.fetchPath('/account',{mode:'navigate'}));assert.equal(w.fetchPath('/assets/app.js',{method:'POST'}),undefined)
})
test('wrong deployment/personalized bytes abort install BEFORE any cache write',async()=>{
  const w=worker({wrongBytes:true});await assert.rejects(w.install(),/differs/);assert.deepEqual(w.writes,[])
})
test('worker aborts absent DB creation, accepts v3 and rejects newer workout schema without writes',async()=>{
  await worker({version:0}).install();await worker({version:2}).install();await worker({version:3}).install();const w=worker({version:4});await assert.rejects(w.install(),/Newer workout storage/);assert.deepEqual(w.writes,[])
})
test('worker never claims clients, forces update, or writes workout records',()=>{
  assert.doesNotMatch(template,/self\.skipWaiting\(|clients\.claim\(|objectStore\(|\.put\(.*workout|sync['"]/)
})
