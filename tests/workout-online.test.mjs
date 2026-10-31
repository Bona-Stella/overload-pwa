import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AuthApi } from '../src/features/auth/api.ts'
import { AuthController } from '../src/features/auth/controller.ts'
import { WorkoutApi } from '../src/features/workout-online/api.ts'
import { WorkoutOnlineController, startBody } from '../src/features/workout-online/controller.ts'
import { LocalStoreError } from '../src/features/workout-online/storage.ts'
import * as validate from '../src/features/workout-online/validation.ts'
import { USER, OTHER, DEVICE, ROUTINE, scope, start, session, routine, bootstrap } from './fixtures/workout-online-data.mjs'

const gate=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
const settle=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r))}
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})
function setup(options={}) {
  let authState={status:'authenticated',userId:USER,pending:null},listeners=new Set(),attempt=null,copies=[],starts=[],failSave=false,failPrepare=false
  const auth={getSnapshot:()=>authState,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)}}
  const change=patch=>{authState={...authState,...patch};for(const fn of listeners)fn()}
  const api={bootstrap:async userId=>({...structuredClone(bootstrap),scope:{...scope,userId}}),active:async()=>({...scope,session:null}),routine:async()=>structuredClone(routine),detail:async()=>session(),
    start:async(_scope,body)=>{starts.push(structuredClone(body));return session({id:body.id,startedAt:body.startedAt,workoutDate:body.workoutDate,startedTimeZone:body.startedTimeZone,editorDeviceId:body.editorDeviceId})},...options}
  const store={deviceId:async()=>DEVICE,attempt:async()=>attempt,copies:async()=>structuredClone(copies),prepareStart:async(s,body)=>{
    if(failPrepare)throw new LocalStoreError();attempt??={...s,request:structuredClone(body),requestJson:JSON.stringify(body)};return structuredClone(attempt)},saveSession:async(s,value,id)=>{
      if(failSave)throw new LocalStoreError();copies=[{...s,sessionId:value.id,editorDeviceId:value.editorDeviceId,writerEpoch:value.writerEpoch,server:structuredClone(value)}];if(attempt?.request.id===id)attempt=null}}
  const controller=new WorkoutOnlineController(api,store),disconnect=controller.connect(auth)
  return {controller,disconnect,change,store,api,starts,getAttempt:()=>attempt,getCopies:()=>copies,setFailSave:v=>{failSave=v},setFailPrepare:v=>{failPrepare=v}}
}
test('START dates retain the actual instant and IANA local date across midnight',()=>{
  const body=startBody(scope,ROUTINE,DEVICE,start.id,new Date('2026-10-31T23:59:00.001Z'),'Asia/Seoul')
  assert.equal(body.workoutDate,'2026-11-01');assert.equal(body.startedAt,'2026-10-31T23:59:00.001Z')
})
test('decimal drafts preserve full backend precision and reject rounding, exponent, negatives and overflow',()=>{
  assert.equal(validate.decimalDraft('00062.500000'),'62.5');assert.equal(validate.decimalDraft('99999999999999.999999'),'99999999999999.999999')
  for(const value of ['1e2','-0','NaN','0.0000001','100000000000000'])assert.throws(()=>validate.decimalDraft(value))
  assert.equal(validate.countDraft('2147483647'),2147483647);assert.throws(()=>validate.countDraft('2147483648'))
})
test('V15 session reader preserves counters, decimals, microseconds and UNVERIFIED without conversion',()=>{
  const value=session();assert.ok(validate.session(value));assert.equal(value.lastWorkoutSyncedAt,'2026-10-31T12:00:00.123456Z')
  value.snapshot.state.performedSets.push({id:OTHER,sessionExerciseId:value.initialPlan.weightExercises[0].sessionExerciseId,ordinal:4,weightKg:'0.000001',reps:1,completedAt:start.startedAt,weightContext:{kind:'UNVERIFIED',requestId:null}})
  assert.ok(validate.session(value));value.initialPlan.weightExercises[0].approvedWeightKg=62.5;assert.equal(validate.session(value),false)
})
test('auth transport uses existing cookies/CSRF and does not replay failed writes',async()=>{
  const calls=[];const api=new AuthApi(async(path,init)=>{calls.push({path,init});return path.endsWith('/csrf')?json({token:'fixture',headerName:'X-CSRF-TOKEN'}):json({code:'CSRF_INVALID'},403)})
  await api.refreshCsrf()
  await assert.rejects(()=>api.workoutRequest('/api/v1/routines','POST',{name:'a'},new AbortController().signal),{code:'CSRF_INVALID'})
  assert.equal(calls.length,2);assert.equal(calls[1].init.credentials,'include');assert.equal(calls[1].init.cache,'no-store');assert.equal(calls[1].init.headers['X-CSRF-TOKEN'],'fixture')
  await assert.rejects(()=>api.workoutRequest('/api/v1/routines','POST',{},new AbortController().signal),{code:'CSRF_INVALID'});assert.equal(calls.length,2)
})
test('authenticated write guard blocks changed cookie account before dispatch',async()=>{
  let owner=USER,writes=0;const api={session:async()=>({userId:owner}),refreshCsrf:async()=>{},workoutRequest:async()=>{writes++;return{status:200,data:{}}}}
  const auth=new AuthController(api,()=>0,()=>{});await auth.start();owner=OTHER
  await assert.rejects(()=>auth.workoutRequest(USER,'/api/v1/routines','POST',{},new AbortController().signal),{code:'SESSION_CHANGED'})
  assert.equal(writes,0);assert.equal(auth.getSnapshot().status,'unavailable')
})
test('API rejects wrong outer/nested owner, generation, IDs, nullable omissions and lossy counters',async()=>{
  let data=session();const api=new WorkoutApi({workoutRequest:async()=>({status:200,data})}),signal=new AbortController().signal
  assert.equal((await api.detail(scope,start.id,signal)).version,'0')
  for(const patch of [{userId:OTHER},{dataGeneration:'0'},{id:OTHER},{version:9007199254740993},{endedAt:undefined}]){
    data=session(patch);await assert.rejects(()=>api.detail(scope,start.id,signal))
  }
  data={...scope,session:session({userId:OTHER})};await assert.rejects(()=>api.active(scope,signal),{code:'OWNER_MISMATCH'})
})
test('START is dispatched only after durable attempt, and duplicate clicks do not start twice',async()=>{
  const s=setup();await settle();await s.controller.select(ROUTINE)
  const disk=gate(),prepare=s.store.prepareStart;s.store.prepareStart=async(...args)=>{await disk.promise;return prepare(...args)}
  const first=s.controller.start();await settle();assert.equal(s.starts.length,0)
  await s.controller.start();disk.resolve();await first
  assert.equal(s.starts.length,1);assert.equal(s.getAttempt(),null);assert.equal(s.getCopies().length,1);assert.equal(s.controller.getSnapshot().copySaved,true);s.disconnect()
})
test('lost START ACK and reload reuse the exact stored UUID, time, date, zone and body',async()=>{
  const s=setup();await settle();await s.controller.select(ROUTINE)
  const startCall=s.api.start;let lost=true;s.api.start=async(...args)=>{const response=await startCall(...args);if(lost){lost=false;throw Error('lost after commit')}return response}
  await s.controller.start();const original=structuredClone(s.getAttempt());assert.ok(original);assert.equal(s.controller.getSnapshot().copySaved,false)
  s.disconnect();const fresh=new WorkoutOnlineController(s.api,s.store),stop=fresh.connect({getSnapshot:()=>({status:'authenticated',userId:USER,pending:null}),subscribe:()=>()=>{}})
  await settle();await fresh.start();assert.equal(s.starts.length,2);assert.deepEqual(s.starts[0],s.starts[1]);assert.equal(JSON.stringify(s.starts[1]),original.requestJson);assert.equal(s.getAttempt(),null);stop()
})
test('attempt save failure prevents HTTP; post-START copy failure retains the fixed attempt and blocks ready state',async()=>{
  const s=setup();await settle();await s.controller.select(ROUTINE);s.setFailPrepare(true);await s.controller.start();assert.equal(s.starts.length,0)
  s.setFailPrepare(false);s.setFailSave(true);await s.controller.start();assert.equal(s.starts.length,1);assert.ok(s.getAttempt());assert.equal(s.controller.getSnapshot().copySaved,false)
  s.setFailSave(false);await s.controller.start();assert.deepEqual(s.starts[0],s.starts[1]);assert.equal(s.controller.getSnapshot().copySaved,true);s.disconnect()
})
test('logout/account transition hides immediately and prevents a late START from applying to another account',async()=>{
  const delayed=gate(),s=setup({start:async()=>delayed.promise});await settle();await s.controller.select(ROUTINE)
  const writing=s.controller.start();await settle();s.change({pending:'logout'});assert.equal(s.controller.getSnapshot().detail,null)
  delayed.resolve(session());await writing;assert.equal(s.getCopies().length,0);assert.ok(s.getAttempt())
  s.change({userId:OTHER,pending:null});await settle();assert.equal(s.controller.getSnapshot().userId,OTHER);assert.equal(s.controller.getSnapshot().detail,null);s.disconnect()
})
test('generation mismatch clears selected routine, active state and local access',async()=>{
  const s=setup();await settle();await s.controller.select(ROUTINE)
  s.api.active=async()=>{throw {code:'DATA_GENERATION_MISMATCH',status:409}}
  await s.controller.refresh();const state=s.controller.getSnapshot();assert.equal(state.scope,null);assert.equal(state.data,null);assert.equal(state.selected,null);assert.equal(state.detail,null);s.disconnect()
})
test('refresh rechecks server before showing a local copy, and never renders stored data when server is unavailable',async()=>{
  const s=setup();await settle();await s.controller.select(ROUTINE);await s.controller.start();assert.equal(s.getCopies().length,1)
  s.api.active=async()=>{throw Error('offline')};await s.controller.refresh();assert.equal(s.controller.getSnapshot().detail,null);assert.equal(s.getCopies().length,1);s.disconnect()
})
test('logout during durable START preparation stops dispatch and preserves the original local attempt',async()=>{
  const s=setup();await settle();await s.controller.select(ROUTINE)
  const disk=gate(),prepare=s.store.prepareStart;s.store.prepareStart=async(...args)=>{await disk.promise;return prepare(...args)}
  const writing=s.controller.start();s.change({pending:'logout'});disk.resolve();await writing
  assert.equal(s.starts.length,0);assert.ok(s.getAttempt());assert.equal(s.controller.getSnapshot().detail,null);s.disconnect()
})
test('a routine POST response loss is reconciled by the same UUID GET without creating again',async()=>{
  const s=setup();await settle();let created=false,posts=0
  s.api.routine=async()=>{if(!created)throw{status:404};return structuredClone(routine)}
  s.api.createRoutine=async()=>{posts++;created=true;throw Error('committed response lost')}
  s.api.routines=async()=>({...scope,routines:bootstrap.routines})
  const body={id:ROUTINE,dataGeneration:scope.dataGeneration,name:routine.name,weightPlacements:[],cardioPlacements:[]}
  assert.equal(await s.controller.saveRoutine(body),false);assert.equal(await s.controller.saveRoutine(body),true)
  assert.equal(posts,1);assert.equal(s.controller.getSnapshot().selected.id,ROUTINE);s.disconnect()
})
test('a stale routine PUT is not silently rebased and sends only the submitted expected version',async()=>{
  const s=setup();await settle();const bodies=[]
  s.api.updateRoutine=async(_scope,_id,body)=>{bodies.push(structuredClone(body));throw{status:409,code:'ROUTINE_VERSION_CONFLICT'}}
  const body={dataGeneration:scope.dataGeneration,expectedVersion:'9007199254740994',name:'수정',weightPlacements:[],cardioPlacements:[],weightApprovals:[]}
  assert.equal(await s.controller.saveRoutine(body,ROUTINE),false);assert.equal(bodies.length,1);assert.deepEqual(bodies[0],body);assert.match(s.controller.getSnapshot().issue,/최신 루틴/);s.disconnect()
})
test('a generation change in a detail recheck clears all old screen state',async()=>{
  const s=setup();await settle();await s.controller.select(ROUTINE);await s.controller.start()
  s.api.detail=async()=>{throw{status:409,code:'DATA_GENERATION_MISMATCH'}}
  await s.controller.showDetail(s.starts[0].id);const state=s.controller.getSnapshot()
  assert.equal(state.scope,null);assert.equal(state.selected,null);assert.equal(state.detail,null);assert.equal(state.localReady,false);s.disconnect()
})
test('API rejects an unexpected successful HTTP status instead of accepting a plausible DTO',async()=>{
  const api=new WorkoutApi({workoutRequest:async()=>({status:202,data:session()})})
  await assert.rejects(()=>api.start(scope,start,new AbortController().signal),{code:'RESPONSE_INVALID',status:202})
})
