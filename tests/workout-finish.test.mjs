import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LocalWorkoutController } from '../src/features/workout-local/controller.ts'
import { ClosedWorkoutController } from '../src/features/workout-online/closed-controller.ts'
import { LocalStoreError } from '../src/features/workout-online/storage.ts'
import { AuthApi, AuthError } from '../src/features/auth/api.ts'
import * as m from '../src/features/workout-local/model.ts'
import * as s from '../src/features/workout-local/sync-state.ts'
import { localWorkout } from '../src/features/workout-local/validation.ts'
import { closedWriteFact, recoveryRows } from '../src/features/workout-online/closed-model.ts'
import { session, scope, bootstrap, SESSION_EXERCISE as E, OTHER, DEVICE, routine } from './fixtures/workout-online-data.mjs'

const at=Date.parse('2026-11-01T01:00:00Z'),clone=structuredClone
const assessment=version=>({schemaVersion:2,ruleVersion:'task009-completion-v1',sessionVersion:version,assessedAt:new Date(at).toISOString(),overallWeightPlanComplete:false,exercises:[]})
const complete=(w,n)=>{m.editDraft(w,E,n,{weight:'60.000000',reps:'8'});m.completeSet(w,E,n,at+n)}
const local=()=>m.createLocalWorkout(session(),bootstrap.settings)
const change=m.applyLocalChange
const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const tick=async()=>{for(let n=0;n<12;n++)await new Promise(r=>setImmediate(r))}
test('auth transport permits only the bounded closed-list GET query and retains cookie protections',async()=>{
  const calls=[],api=new AuthApi(async(path,init)=>{calls.push({path,init});return new Response('{}',{headers:{'Content-Type':'application/json'}})}),signal=new AbortController().signal
  await api.workoutRequest('/api/v1/workout-sessions/closed?limit=20','GET',undefined,signal)
  await api.workoutRequest('/api/v1/workout-sessions/closed?limit=1&beforeClosedAt=2026-11-01T01%3A00%3A00.123456Z&beforeId='+OTHER,'GET',undefined,signal)
  assert.equal(calls.length,2);assert.equal(calls[0].init.credentials,'include');assert.equal(calls[0].init.cache,'no-store')
  for(const query of ['limit=51','limit=01','limit=2&limit=3','userId='+OTHER,'beforeId='+OTHER,'limit=1#fragment'])await assert.rejects(()=>api.workoutRequest('/api/v1/workout-sessions/closed?'+query,'GET',undefined,signal),{code:'INVALID_REQUEST'})
  await assert.rejects(()=>api.workoutRequest('/api/v1/workout-sessions/closed?limit=20','POST',{},signal),{code:'INVALID_REQUEST'})
  await assert.rejects(()=>api.workoutRequest('/api/v1/routines?limit=20','GET',undefined,signal),{code:'INVALID_REQUEST'});assert.equal(calls.length,2)
})
function finishAck(w,version='1'){return{...scope,sessionId:w.sessionId,status:'FINISHED',writerEpoch:w.writerEpoch,acceptedLocalRevision:w.finish.request.localRevision,version,currentVersion:version,deletedAt:null,snapshotSavedAt:new Date(at).toISOString(),lastWorkoutSyncedAt:new Date(at).toISOString(),endedAt:w.finish.endedAt,closedAt:new Date(at+50).toISOString(),completionAssessment:assessment(version),approvalResults:[],duplicate:false}}
async function editor(options={}){
  let stored=options.stored??local(),server=options.server??session(),online=true,authorized=true,held=true,fail=()=>false,fixedFinish
  const calls=[],seen=[],store={openLocal:async()=>clone(stored),readLocal:async()=>clone(stored),saveSession:async(_scope,value)=>{seen.push(clone(value))},saveLocal:async(value,expected,guard)=>{if(!guard()||fail(value,stored))throw new LocalStoreError();assert.equal(expected,stored.editVersion);stored=clone(value)}}
  store.saveSyncLocal=store.saveLocal
  const ack=(body,duplicate)=>({...scope,sessionId:server.id,writerEpoch:server.writerEpoch,acceptedLocalRevision:body.localRevision,version:server.version,snapshotSavedAt:new Date(at).toISOString(),lastWorkoutSyncedAt:new Date(at).toISOString(),duplicate,approvalResults:server.snapshot.approvalResults})
  const api={detail:async()=>clone(server),routine:async()=>clone(routine),resolve:async(_scope,_id,request)=>{
    calls.push({kind:'resolve',body:clone(request)});if(options.resolutionGate)await options.resolutionGate.promise
    server.version=String(BigInt(server.version)+1n);server.snapshot.approvalResults.forEach(r=>{r.status='NOT_APPLIED';r.reason='KEPT_CURRENT';r.resolvedAt=new Date(at).toISOString();r.resolvedByRequestId=null});return{}
  },snapshot:async(_scope,_id,body)=>{
    calls.push({kind:'snapshot',body:clone(body)});if(options.snapshotGate)await options.snapshotGate.promise
    if(options.beforeSnapshot)await options.beforeSnapshot(body)
    server={...server,localRevision:body.localRevision,version:String(BigInt(server.version)+1n),snapshot:{...server.snapshot,state:clone(body.snapshot)}};return ack(body,false)
  },finish:async(_scope,_id,body)=>{
    calls.push({kind:'finish',body:clone(body)});if(options.beforeFinish)await options.beforeFinish(body)
    const duplicate=server.status==='FINISHED'
    if(duplicate)assert.equal(JSON.stringify(body),fixedFinish??stored.finish.requestJson)
    else{fixedFinish=JSON.stringify(body);server={...server,status:'FINISHED',localRevision:body.localRevision,version:String(BigInt(server.version)+1n),endedAt:body.endedAt,closedAt:new Date(at+50).toISOString(),lastSnapshotSavedAt:new Date(at).toISOString(),completionAssessment:assessment(String(BigInt(server.version)+1n)),snapshot:{...server.snapshot,state:clone(body.snapshot)}}}
    const value={...ack(body,duplicate),status:'FINISHED',currentVersion:server.version,deletedAt:server.deletedAt,endedAt:server.endedAt,closedAt:server.closedAt,completionAssessment:server.completionAssessment}
    if(options.afterFinish)await options.afterFinish(value);return value
  }}
  const c=new LocalWorkoutController(store,()=>authorized,async()=>({held:()=>held,release(){held=false;return options.releaseGate?.promise}}),{api,online:()=>online,onServer:value=>{
    if(value.status==='FINISHED'){assert.ok(stored.finish.ack,'publish only after durable ACK');options.onFinished?.(value)}
  }})
  await c.open(server,bootstrap.settings);await c.syncSettled()
  return{c,api,calls,seen,read:()=>clone(stored),remote:()=>clone(server),fail:fn=>fail=fn,online:v=>online=v,authorize:v=>authorized=v,setServer:v=>server=v}
}
test('finish intent freezes original time/state and advances revision once for the terminal change',()=>{
  let w=change(local(),x=>complete(x,1));const before=clone(w)
  w=change(w,x=>s.intendFinish(x,at+10));w=change(w,x=>s.intendFinish(x,at+30))
  assert.equal(w.finish.endedAt,new Date(at+10).toISOString());assert.equal(w.localRevision,String(BigInt(before.localRevision)+1n));assert.deepEqual(w.finish.snapshot,before.snapshot);assert.deepEqual(w.snapshot.cardioResults,[])
  assert.equal(localWorkout(w),true);assert.throws(()=>s.intendFinish(local(),Date.parse(session().startedAt)-1))
})
test('FINISH refuses unresolved snapshot/resolution and UNKNOWN without its original request',()=>{
  let w=change(local(),x=>complete(x,1));w=change(w,s.sealSnapshot);w=change(w,x=>s.intendFinish(x,at+10));assert.throws(()=>s.sealFinish(w))
  w.pendingSnapshot=null;assert.throws(()=>s.sealFinish(w));w.presence[w.snapshot.performedSets[0].id]='LOCAL_ONLY'
  w.pendingResolution={request:{},requestJson:'{}'};assert.throws(()=>s.sealFinish(w))
})
test('FINISH request/ACK bind original epoch, revision and time; duplicate ACK may carry a later current version',()=>{
  let w=change(local(),x=>{complete(x,1);s.intendFinish(x,at+10)});w=change(w,s.sealFinish)
  assert.deepEqual(Object.keys(w.finish.request).sort(),['dataGeneration','editorDeviceId','writerEpoch','localRevision','snapshot','endedAt'].sort());assert.equal(localWorkout(w),true)
  assert.throws(()=>s.acceptFinish(clone(w),{...finishAck(w),endedAt:new Date(at+20).toISOString()}))
  assert.throws(()=>s.acceptFinish(clone(w),{...finishAck(w),writerEpoch:'9'}))
  w=change(w,x=>s.acceptFinish(x,{...finishAck(w),currentVersion:'9',duplicate:true}));assert.equal(w.serverVersion,'9');assert.equal(w.finish.ack.version,'1');assert.equal(w.finish.ack.currentVersion,'9')
})
test('restored FINISH ACK cannot cross an account, generation or epoch',()=>{
  let w=change(local(),x=>{complete(x,1);s.intendFinish(x,at+20)});w=change(w,s.sealFinish);w=change(w,x=>s.acceptFinish(x,finishAck(x)))
  assert.equal(localWorkout(w),true)
  for(const [field,value] of [['userId',OTHER],['dataGeneration','0'],['writerEpoch','8']]){const bad=clone(w);bad.finish.ack[field]=value;assert.equal(localWorkout(bad),false)}
})
test('in-flight snapshot is confirmed before FINISH; newer complete state goes in FINISH atomically',async()=>{
  const hold=gate(),e=await editor({snapshotGate:hold});await e.c.change(w=>complete(w,1));await tick()
  await e.c.change(w=>complete(w,2));await e.c.finish(at+20);const ended=e.read().finish.endedAt
  assert.deepEqual(e.calls.map(c=>c.kind),['snapshot']);hold.resolve();await e.c.syncSettled()
  assert.deepEqual(e.calls.map(c=>c.kind),['snapshot','finish']);assert.equal(e.calls[1].body.snapshot.performedSets.length,2);assert.equal(e.calls[1].body.localRevision,'3');assert.equal(e.read().finish.endedAt,ended);assert.ok(e.read().finish.ack);e.c.stop()
})
test('empty START and zero-revision takeover can finish with a single new terminal revision',async()=>{
  for(const server of [session(),session({writerEpoch:'1',version:'1',editorDeviceId:OTHER})]){
    const e=await editor({server,stored:m.createLocalWorkout(server,bootstrap.settings)});await e.c.finish(at+20);await e.c.syncSettled()
    assert.equal(e.calls.length,1);assert.equal(e.calls[0].body.localRevision,'1');assert.equal(e.calls[0].body.snapshot.performedSets.length,0);assert.ok(e.read().finish.ack);e.c.stop()
  }
})
test('offline finish persists once, locks later edits and resumes with original time/body',async()=>{
  const e=await editor();e.online(false);await e.c.change(w=>complete(w,1));await e.c.finish(at+20)
  assert.equal(e.calls.length,0);assert.equal(await e.c.change(w=>complete(w,2)),false);e.c.draft(E,2,{weight:'70',reps:'9'});assert.equal(e.c.getSnapshot().unsavedDrafts,false)
  e.online(true);await e.c.retrySync();assert.equal(e.calls.length,1);assert.equal(e.calls[0].kind,'finish');assert.equal(e.calls[0].body.endedAt,new Date(at+20).toISOString());e.c.stop()
})
test('the saved FINISH is published only after the editor lock has been released',async()=>{
  const releaseGate=gate(),published=[]
  const e=await editor({releaseGate,onFinished:value=>published.push(value)})
  await e.c.finish(at+20)
  await tick()
  assert.ok(e.read().finish.ack)
  assert.equal(e.c.getSnapshot().syncStatus,'SENDING')
  assert.equal(e.c.getSnapshot().writable,false)
  assert.deepEqual(published,[])
  releaseGate.resolve()
  await e.c.syncSettled()
  assert.equal(e.c.getSnapshot().syncStatus,'SAVED')
  assert.equal(published.length,1)
  e.c.stop()
})
test('stale detail after a FINISH ACK keeps recovery available without sending FINISH twice',async t=>{
  const published=[]
  const e=await editor({onFinished:value=>published.push(value)})
  t.after(()=>e.c.stop())
  e.api.detail=async()=>session()
  await e.c.finish(at+20)
  await e.c.syncSettled()
  assert.ok(e.read().finish.ack)
  assert.equal(e.c.getSnapshot().syncStatus,'READ')
  assert.equal(e.c.getSnapshot().writable,true)
  assert.deepEqual(published,[])
  e.api.detail=async()=>e.remote()
  await e.c.retrySync()
  assert.equal(e.c.getSnapshot().syncStatus,'SAVED')
  assert.equal(published.length,1)
  assert.equal(e.calls.length,1)
})
test('losing the connection during final lock release preserves the ACK and offers recovery',async t=>{
  const releaseGate=gate(),published=[]
  const e=await editor({releaseGate,onFinished:value=>published.push(value)})
  t.after(()=>e.c.stop())
  await e.c.finish(at+20)
  await tick()
  assert.ok(e.read().finish.ack)
  e.online(false)
  releaseGate.resolve()
  await e.c.syncSettled()
  assert.equal(e.c.getSnapshot().syncStatus,'WAITING')
  assert.deepEqual(published,[])
  assert.equal(e.calls.length,1)
})
test('ending at the weight/cardio choice keeps the plan and records only completed weight',async()=>{
  const e=await editor()
  e.online(false)
  assert.equal(await e.c.change(w=>{
    m.addCardio(w,{kind:'TREADMILL',name:'러닝',targetSeconds:600,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null})
    w.currentExerciseId=E
    m.updateTargets(w,E,1,8,10)
    complete(w,1)
    m.advanceAfterCompletion(w,E)
  }),true)
  assert.equal(e.read().currentExerciseId,E)
  assert.equal(await e.c.finish(at+20),true)
  e.online(true);await e.c.retrySync()
  const [finish]=e.calls
  assert.equal(finish.kind,'finish')
  assert.equal(finish.body.snapshot.performedSets.length,1)
  assert.equal(finish.body.snapshot.appliedPlan.cardioActivities.length,1)
  assert.deepEqual(finish.body.snapshot.cardioResults,[])
  assert.equal(e.remote().status,'FINISHED')
  assert.equal(e.read().finish.ack.status,'FINISHED')
  e.c.stop()
})
test('a durable unresolved approval resolution is confirmed before freezing FINISH',async()=>{
  let w=change(local(),x=>m.changeWeight(x,E,'65',true,at));w.serverRevision=w.localRevision;w.syncState='CLEAN';w.serverVersion='1'
  const approval=w.snapshot.approvalRequests[0],result={id:approval.id,sessionExerciseId:E,sequence:'1',status:'PENDING',reason:'ROUTINE_CHANGED',approvalEventId:null,routineVersionBefore:null,routineVersionAfter:null,resolvedAt:null,resolvedByRequestId:null}
  w.approvalResults=[result];const server=session({localRevision:w.localRevision,version:'1',snapshot:{state:clone(w.snapshot),approvalResults:[clone(result)],recordedContexts:[]}})
  const request=s.makeResolution(w,server,E,[approval.id],'KEEP_CURRENT','',null,at+10);w.pendingResolution={request,requestJson:JSON.stringify(request),workingBefore:clone(w.weights[E])};w=change(w,x=>s.intendFinish(x,at+20))
  const hold=gate();let e;const opening=editor({stored:w,server,resolutionGate:hold});await tick();hold.resolve();e=await opening
  assert.deepEqual(e.calls.map(c=>c.kind),['resolve','finish']);assert.ok(e.read().finish.ack);assert.equal(e.read().pendingResolution,null);e.c.stop()
})
test('FINISH ACK loss is confirmed by detail with no duplicate POST',async()=>{
  let lost=true;const e=await editor({afterFinish:async()=>{if(lost){lost=false;throw new AuthError('NETWORK')}}});e.online(false);await e.c.change(w=>complete(w,1));await e.c.finish(at+20);e.online(true);await e.c.retrySync()
  assert.deepEqual(e.calls.map(c=>c.kind),['finish']);assert.ok(e.read().finish.ack);e.c.stop()
})
test('a suspended snapshot is reconciled automatically when finish is requested',async t=>{
  let errors=2
  const e=await editor({beforeSnapshot:()=>{if(errors-- > 0)throw new TypeError('Lost response')}})
  t.after(()=>e.c.stop())
  await e.c.change(w=>complete(w,1));await e.c.syncSettled()
  assert.equal(e.c.getSnapshot().syncStatus,'WAITING')
  await e.c.finish(at+20);await e.c.syncSettled()
  assert.deepEqual(e.calls.map(call=>call.kind),['snapshot','snapshot','snapshot','finish'])
  assert.equal(new Set(e.calls.slice(0,3).map(call=>JSON.stringify(call.body))).size,1)
  assert.equal(e.read().finish.ack.status,'FINISHED')
  assert.equal(e.read().snapshot.performedSets.length,1)
})
test('a failed detail after a successful FINISH is retried once without another POST',async t=>{
  const published=[],e=await editor({onFinished:server=>published.push(server)})
  t.after(()=>e.c.stop())
  let reads=0
  e.api.detail=async()=>{if(++reads===1)throw new TypeError('Lost detail');return e.remote()}
  await e.c.finish(at+20);await e.c.syncSettled()
  assert.equal(reads,2);assert.equal(e.calls.length,1);assert.equal(published.length,1)
})
test('snapshot response recovery does not spend the FINISH confirmation attempt',async t=>{
  const snapshotGate=gate()
  let snapshots=0
  const e=await editor({snapshotGate,beforeSnapshot:()=>{if(++snapshots===1)throw new AuthError('NETWORK')},
    afterFinish:()=>{throw new AuthError('NETWORK')}})
  t.after(()=>e.c.stop())
  await e.c.change(w=>complete(w,1));await tick()
  assert.equal(await e.c.finish(at+20),true)
  snapshotGate.resolve()
  await e.c.syncSettled()
  assert.deepEqual(e.calls.map(call=>call.kind),['snapshot','snapshot','finish'])
  assert.equal(e.read().finish.ack.status,'FINISHED')
})
test('a failed FINISH is replayed once only after the server confirms ACTIVE',async t=>{
  let tries=0,reads=0
  const e=await editor({beforeFinish:()=>{if(++tries<=2)throw new TypeError('Before commit')}})
  t.after(()=>e.c.stop())
  e.api.detail=async()=>{reads++;return e.remote()}
  await e.c.finish(at+20);await e.c.syncSettled()
  assert.equal(reads,2);assert.equal(e.calls.length,2)
  assert.equal(e.c.getSnapshot().syncStatus,'WAITING')
  assert.equal(JSON.stringify(e.calls[1].body),e.read().finish.requestJson)
  await e.c.retrySync()
  assert.ok(e.read().finish.ack);assert.equal(e.calls.length,3)
})
function finishAfterRejectedSnapshot(){
  let stored=change(local(),w=>{
    complete(w,1)
    w.snapshot.weightTiming={schemaVersion:1,complete:true,
      intervals:[{startedAt:new Date(at-1499).toISOString(),endedAt:w.snapshot.performedSets[0].completedAt}],
    }
  })
  stored=change(stored,s.sealSnapshot)
  stored=change(stored,s.rejectSnapshot)
  return change(stored,w=>s.intendFinish(w,at+20))
}
test('a rejected older snapshot cannot strand a restored FINISH on the same server revision',async()=>{
  const stored=finishAfterRejectedSnapshot()
  const e=await editor({stored})
  try {
    assert.deepEqual(e.calls.map(call=>call.kind),['finish'])
    assert.equal(e.calls[0].body.endedAt,stored.finish.endedAt)
    assert.equal(e.calls[0].body.localRevision,stored.localRevision)
    assert.deepEqual(e.calls[0].body.snapshot,stored.finish.snapshot)
    assert.ok(e.read().finish.ack)
    assert.equal(e.read().pendingSnapshot,null)
    assert.deepEqual(e.read().snapshot.performedSets,stored.snapshot.performedSets)
  } finally { e.c.stop() }
})
test('an explicit finish proceeds if a snapshot was rejected just before or during the request',async()=>{
  for(const rejectDuringFinish of [false,true]){
    const snapshotGate=rejectDuringFinish?gate():undefined
    const e=await editor({snapshotGate,beforeSnapshot:()=>{throw{status:422,code:'CLOCK_CONTEXT_INVALID'}}})
    try {
      await e.c.change(w=>complete(w,1))
      if (!snapshotGate) await e.c.syncSettled()
      assert.equal(await e.c.finish(at+20),true)
      snapshotGate?.resolve()
      await e.c.syncSettled()
      assert.deepEqual(e.calls.map(call=>call.kind),['snapshot','finish'])
      assert.equal(e.read().finish.ack.status,'FINISHED')
      assert.equal(e.read().snapshot.performedSets.length,1)
    } finally { snapshotGate?.resolve();e.c.stop() }
  }
})
test('a newer server revision blocks FINISH after snapshot rejection',async()=>{
  const unsealed=finishAfterRejectedSnapshot()
  for (const stored of [unsealed,change(unsealed,s.sealFinish)]) {
    const server=session({localRevision:stored.pendingSnapshot.request.localRevision,version:'1'})
    const e=await editor({stored,server})
    try {
      assert.deepEqual(e.calls,[])
      assert.equal(e.c.getSnapshot().syncStatus,'CHECK')
      assert.deepEqual(e.read().finish,stored.finish)
      assert.deepEqual(e.read().pendingSnapshot,stored.pendingSnapshot)
    } finally { e.c.stop() }
  }
})
test('a FINISH clock rejection preserves measured intervals, set time and the exact request for recheck',async()=>{
  const stored=finishAfterRejectedSnapshot()
  let refuse=true
  const e=await editor({stored,beforeFinish:()=>{if(refuse)throw{status:422,code:'CLOCK_CONTEXT_INVALID'}}})
  try {
    assert.equal(e.remote().status,'ACTIVE')
    assert.match(e.c.getSnapshot().syncIssue,/기기 날짜/)
    assert.equal(e.calls.length,1)
    assert.deepEqual(e.read().pendingSnapshot,stored.pendingSnapshot)
    assert.equal(e.read().finish.ack,undefined)
    assert.deepEqual(e.calls[0].body.snapshot.weightTiming,stored.snapshot.weightTiming)
    assert.equal(e.calls[0].body.endedAt,stored.finish.endedAt)
    const fixed=e.read().finish.requestJson
    refuse=false
    await e.c.retrySync()
    assert.equal(e.calls.length,2)
    assert.deepEqual(e.calls[0].body,e.calls[1].body)
    assert.equal(e.read().finish.requestJson,fixed)
    assert.ok(e.read().finish.ack)
    assert.deepEqual(e.read().snapshot.performedSets,stored.snapshot.performedSets)
    assert.deepEqual(e.read().snapshot.weightTiming,stored.snapshot.weightTiming)
  } finally { e.c.stop() }
})
test('fixed FINISH storage failure prevents HTTP; ACK storage failure retains the same fixed original',async()=>{
  const e=await editor();e.online(false);await e.c.change(w=>complete(w,1));await e.c.finish(at+20)
  e.fail((next,old)=>!!next.finish?.request&&!old.finish?.request);e.online(true);await e.c.retrySync();assert.equal(e.calls.length,0);assert.ok(e.read().finish)
  e.fail((next,old)=>!!next.finish?.ack&&!old.finish?.ack);await e.c.retrySync();assert.equal(e.calls.length,1);const fixed=e.read().finish.requestJson;assert.equal(e.read().finish.ack,undefined)
  e.fail(()=>false);await e.c.retrySync();assert.equal(e.read().finish.requestJson,fixed);assert.ok(e.read().finish.ack);e.c.stop()
})
test('restart with server FINISHED confirms the durable original FINISH instead of creating a new end time',async()=>{
  let stored=change(local(),w=>{complete(w,1);s.intendFinish(w,at+20)});stored=change(stored,s.sealFinish)
  const server=session({status:'FINISHED',version:'1',localRevision:stored.localRevision,endedAt:stored.finish.endedAt,closedAt:new Date(at+50).toISOString(),
    lastSnapshotSavedAt:new Date(at).toISOString(),completionAssessment:assessment('1'),snapshot:{state:clone(stored.snapshot),approvalResults:[],recordedContexts:[]}})
  const e=await editor({stored,server});assert.equal(e.calls.length,0);assert.equal(e.read().finish.requestJson,stored.finish.requestJson);assert.ok(e.read().finish.ack);e.c.stop()
  const altered=clone(server);altered.snapshot.state.performedSets[0].reps++
  const conflict=await editor({stored,server:altered})
  assert.equal(conflict.calls.length,0);assert.equal(conflict.c.getSnapshot().syncStatus,'CHECK')
  assert.deepEqual(conflict.read().finish,stored.finish);conflict.c.stop()
})
test('AUTO_CLOSED, deleted and foreign epoch stop automatic FINISH and preserve the intent',async()=>{
  for(const patch of [{status:'AUTO_CLOSED',closedAt:new Date(at+30).toISOString()},{deletedAt:new Date(at+30).toISOString()},{writerEpoch:'1',editorDeviceId:OTHER}]){
    const e=await editor();e.online(false);await e.c.change(w=>complete(w,1));await e.c.finish(at+20);const before=e.read()
    e.setServer(session(patch));e.online(true);await e.c.retrySync();assert.equal(e.calls.length,0);assert.equal(e.c.getSnapshot().writable,false);assert.deepEqual(e.read(),before);e.c.stop()
  }
})
test('logout during FINISH blocks a late ACK while keeping original request and performance',async()=>{
  const hold=gate(),e=await editor({afterFinish:()=>hold.promise});e.online(false);await e.c.change(w=>complete(w,1));await e.c.finish(at+20);e.online(true);const send=e.c.retrySync();await tick();e.authorize(false);hold.resolve();await send
  assert.ok(e.read().finish.request);assert.equal(e.read().finish.ack,undefined);assert.equal(e.read().snapshot.performedSets.length,1);e.c.stop()
})
test('recovery comparison separates present, UUID mismatch, deletion, slot conflict and unverifiable context',()=>{
  const original=change(local(),w=>{for(let n=1;n<=6;n++)complete(w,n)})
  const server=session({status:'AUTO_CLOSED',closedAt:new Date(at).toISOString()});server.snapshot.state.performedSets=[clone(original.snapshot.performedSets[0]),{...clone(original.snapshot.performedSets[1]),reps:9},{...clone(original.snapshot.performedSets[3]),id:OTHER}]
  server.snapshot.state.deletedPerformedSetIds=[original.snapshot.performedSets[2].id];original.snapshot.performedSets[4].weightContext={kind:'APPROVAL_REQUEST',requestId:crypto.randomUUID()}
  const rows=recoveryRows(original,server,{events:[]});assert.deepEqual(rows.map(r=>r.state),['PRESENT','VALUE_CONFLICT','DELETED','SLOT_CONFLICT','UNVERIFIED','CANDIDATE']);assert.deepEqual(rows.filter(r=>r.selectable).map(r=>r.record.ordinal),[5,6])
  server.deletedAt=new Date(at).toISOString();assert.ok(recoveryRows(original,server,{events:[]}).every(r=>!r.selectable))
})
test('recovered UNVERIFIED values compare with preserved claim; original UUID/context is never rewritten',()=>{
  const w=change(local(),x=>complete(x,1)),record=w.snapshot.performedSets[0];record.weightContext={kind:'APPROVAL_REQUEST',requestId:OTHER}
  const server=session({status:'AUTO_CLOSED',closedAt:new Date(at).toISOString()}),after={...clone(record),weightContext:{kind:'UNVERIFIED',requestId:null}}
  server.snapshot.state.performedSets=[after];const changes={events:[{recordId:record.id,recordKind:'SET',changeKind:'RECOVERED',after,changeContext:{sessionVersion:'1',claimedWeightContext:clone(record.weightContext)}}]}
  assert.equal(recoveryRows(w,server,changes)[0].state,'PRESENT')
  const write={...scope,sessionId:server.id,kind:'recovery',body:{expectedVersion:'0',performedSets:[record],cardioResults:[]}}
  assert.equal(closedWriteFact(write,server,changes),true);assert.equal(record.weightContext.kind,'APPROVAL_REQUEST')
})

async function closed(options={}){
  let server=options.server??session({status:'FINISHED',version:'1',endedAt:new Date(at+20).toISOString(),closedAt:new Date(at+50).toISOString(),completionAssessment:assessment('1')}),events=[],pending=null,held=true,authorized=true,fail=()=>false
  const calls=[],store={deviceId:async()=>DEVICE,localCopies:async()=>[],saveSession:async()=>{},closedWrite:async()=>clone(pending),saveClosedWrite:async(next,previous,guard)=>{assert.deepEqual(previous,pending);if(!guard()||fail(next,pending))throw new LocalStoreError();pending=clone(next)}}
  const changes=()=>({...scope,sessionId:server.id,version:server.version,events:clone(events)})
  const api={detail:async()=>clone(server),assessment:async()=>({...scope,sessionId:server.id,status:server.status,version:server.version,completionAssessment:server.completionAssessment,currentAssessment:{state:'EVALUATED',reasonCodes:[],advice:null,evaluation:server.completionAssessment}}),changes:async()=>changes(),records:async(_scope,_id,body)=>{
    calls.push(clone(body));if(options.sendGate)await options.sendGate.promise
    if(body.expectedVersion!==server.version)throw{status:409,code:'SESSION_VERSION_CONFLICT'}
    server.version=String(BigInt(server.version)+1n)
    for(const c of body.setCorrections){events.push({id:crypto.randomUUID(),recordId:c.id,recordKind:'SET',changeKind:'CORRECTED',before:null,after:clone(c),changeContext:{sessionVersion:server.version},recordedAt:new Date(at).toISOString()})}
    for(const {id,measurement,...values} of body.cardioCorrections){
      const result={timerMs:60000,...values,measurement:measurement&&{distanceSource:measurement.distanceSource,actualSpeedKmh:measurement.actualSpeedKmh}}
      events.push({id:crypto.randomUUID(),recordId:id,recordKind:'CARDIO',changeKind:'CORRECTED',before:null,after:{id,result},changeContext:{sessionVersion:server.version},recordedAt:new Date(at).toISOString()})
    }
    const ack={...scope,sessionId:server.id,status:server.status,version:server.version,changed:true,changeEventIds:events.map(e=>e.id),recoveredIds:[],alreadyPresentIds:[],deletedAt:null}
    if(options.lose)throw Error('lost response');return ack
  }}
  const c=new ClosedWorkoutController(api,store,scope,server.id,()=>authorized,undefined,options.acquire??(async()=>options.readonly?null:{held:()=>held,release(){held=false}}));await c.open()
  const body=()=>({dataGeneration:scope.dataGeneration,expectedVersion:server.version,setCorrections:[{id:OTHER,weightKg:'62.5',reps:9}],cardioCorrections:[],deletedPerformedSetIds:[],deletedCardioResultIds:[]})
  return{c,api,calls,body,read:()=>clone(pending),remote:()=>clone(server),setVersion:v=>server.version=v,authorize:v=>authorized=v,fail:fn=>fail=fn}
}
test('closed corrections persist exact request before HTTP and confirm response loss by matching history',async()=>{
  const e=await closed({lose:true});assert.equal(await e.c.edit(e.body()),true);assert.equal(e.calls.length,1);assert.equal(e.read().status,'CONFIRMED');assert.equal(e.read().requestJson,JSON.stringify(e.calls[0]));e.c.stop()
})
test('a lost cardio correction response is confirmed by the nested server result and measurement',async()=>{
  const e=await closed({lose:true})
  const body={...e.body(),setCorrections:[],cardioCorrections:[{id:OTHER,activeMs:30000,corrected:true,distanceKm:'0.1',averageBpm:92,measurement:{actualSpeedKmh:null,distanceSource:'MANUAL'}}]}
  assert.equal(await e.c.edit(body),true)
  assert.equal(e.read().status,'CONFIRMED');assert.equal(e.calls.length,1);e.c.stop()
})
test('a different cardio measurement in the matching event is not accepted as confirmation',()=>{
  const correction={id:OTHER,activeMs:30000,corrected:true,distanceKm:'0.1',averageBpm:92,measurement:{actualSpeedKmh:null,distanceSource:'MANUAL'}}
  const {id, ...result}=correction
  const write={kind:'records',body:{expectedVersion:'1',setCorrections:[],cardioCorrections:[correction],deletedPerformedSetIds:[],deletedCardioResultIds:[]}}
  const changes={events:[{recordId:id,recordKind:'CARDIO',changeKind:'CORRECTED',changeContext:{sessionVersion:'2'},after:{id,result:{...result,measurement:{actualSpeedKmh:'12',distanceSource:'CALCULATED'}}}}]}
  assert.equal(closedWriteFact(write,session({version:'2'}),changes),false)
})
test('checking a missing correction response reads history before any repeat write',async()=>{
  const e=await closed({lose:true}), detail=e.api.detail
  e.api.detail=async()=>{throw Error('read unavailable after write')}
  assert.equal(await e.c.edit(e.body()),false);assert.equal(e.read().status,'PENDING')
  await e.c.retry();assert.equal(e.read().status,'PENDING');assert.equal(e.calls.length,1)
  e.api.detail=detail
  await e.c.retry();assert.equal(e.read().status,'CONFIRMED');assert.equal(e.calls.length,1);e.c.stop()
})
test('closed version conflict keeps original expectedVersion and requires explicit latest-record review',async()=>{
  const e=await closed(),body=e.body();e.setVersion('2');assert.equal(await e.c.edit(body),false);assert.equal(e.read().status,'PENDING');assert.equal(e.calls[0].expectedVersion,'1')
  await e.c.retry();assert.equal(e.calls.length,1);assert.equal(await e.c.edit(e.body()),false)
  await e.c.reviewed();assert.equal(await e.c.edit(e.body()),true);assert.deepEqual(e.calls.map(c=>c.expectedVersion),['1','2']);e.c.stop()
})
test('closed reapproval can prepare a durable request on LAN HTTP without crypto.randomUUID', async () => {
  const browserMethod = Object.getOwnPropertyDescriptor(crypto, 'randomUUID')
  const e = await closed()
  let sent
  e.api.routine = async () => clone(routine)
  e.api.resolveClosed = async (_scope, _id, body) => {
    sent = body
    throw { status: 409, code: 'RESOLUTION_CONFLICT' }
  }
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined })
  try {
    assert.equal(await e.c.resolve(E, 'REAPPROVE', '52.123456'), false)
    assert.match(sent.newApprovalRequest.id, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/)
    assert.equal(sent.expectedVersion, '1')
    assert.equal(sent.newApprovalRequest.expectedRoutineVersion, routine.version)
    assert.equal(sent.newApprovalRequest.nextApprovedWeightKg, '52.123456')
    assert.deepEqual(JSON.parse(e.read().requestJson), sent)
  } finally {
    if (browserMethod) Object.defineProperty(crypto, 'randomUUID', browserMethod)
    else delete crypto.randomUUID
    e.c.stop()
  }
})
test('a pending correction blocks a repeated submit or different deletion, and navigation ignores the late response',async()=>{
  const hold=gate(),e=await closed({sendGate:hold}),body=e.body()
  const pending=e.c.edit(body)
  await tick()
  assert.equal(await e.c.edit(body),false)
  assert.equal(await e.c.edit({...body,setCorrections:[],deletedPerformedSetIds:[OTHER]}),false)
  assert.equal(await e.c.delete(body.expectedVersion),false)
  assert.equal(e.calls.length,1)
  e.c.stop();hold.resolve()
  assert.equal(await pending,false)
  assert.equal(e.read().status,'PENDING');assert.equal(e.read().ack,undefined)
})
test('closed local-save failure never dispatches; ACK/result-save failure retains request for later history check',async()=>{
  const e=await closed();e.fail(()=>true);assert.equal(await e.c.edit(e.body()),false);assert.equal(e.calls.length,0)
  e.fail(next=>!!next.ack||next.status==='CONFIRMED');assert.equal(await e.c.edit(e.body()),false);assert.equal(e.read().status,'PENDING');const original=e.read().requestJson
  e.fail(()=>false);await e.c.refresh();assert.equal(e.read().status,'CONFIRMED');assert.equal(e.read().requestJson,original);assert.equal(e.calls.length,1);e.c.stop()
})
test('closed mutations respect Web Locks and logout protects late responses',async()=>{
  const readonly=await closed({readonly:true});assert.equal(await readonly.c.edit(readonly.body()),false);assert.equal(readonly.calls.length,0);readonly.c.stop()
  const hold=gate(),e=await closed({sendGate:hold});const send=e.c.edit(e.body());await tick();e.authorize(false);hold.resolve();assert.equal(await send,false);assert.equal(e.read().status,'PENDING');e.c.stop()
})
test('closed result can restore editing after the previous view releases the session lock',async()=>{
  let available=false
  const e=await closed({acquire:async()=>available?{held:()=>true,release(){}}:null})
  assert.equal(e.c.getSnapshot().writable,false)
  available=true
  await e.c.refresh()
  assert.equal(e.c.getSnapshot().writable,true)
  assert.equal(e.c.getSnapshot().issue,null)
  e.c.stop()
})
test('confirm FINISH reports a held lock and does not send or change the frozen original',async()=>{
  const e=await closed({readonly:true})
  const original=change(change(local(),x=>{complete(x,1);s.intendFinish(x,at+20)}),s.sealFinish)
  const before=clone(original)
  await e.c.confirmFinish(original)
  assert.match(e.c.getSnapshot().issue,/다른 탭.*다시 확인/)
  assert.equal(e.c.getSnapshot().busy,false)
  assert.deepEqual(e.calls,[])
  assert.deepEqual(original,before)
  e.c.stop()
})
test('closed generation changes stop editing and keep the durable prior request intact',async()=>{
  const e=await closed();const before=e.read();e.api.detail=async()=>{throw{status:409,code:'DATA_GENERATION_MISMATCH'}}
  await e.c.refresh();assert.equal(e.c.getSnapshot().writable,false);assert.equal(e.c.getSnapshot().server,null);assert.deepEqual(e.read(),before);assert.equal(await e.c.edit(e.body()),false);assert.equal(e.calls.length,0);e.c.stop()
})
test('confirming an old epoch cannot send the current epoch finish instead of its selected original',async()=>{
  const e=await closed();let w=change(local(),x=>{complete(x,1);s.intendFinish(x,at+20)});w.writerEpoch='1';w=change(w,s.sealFinish)
  await e.c.confirmFinish(w);assert.match(e.c.getSnapshot().issue,/다른 편집 사본/);assert.equal(e.calls.length,0);assert.equal(w.finish.ack,undefined);e.c.stop()
})
