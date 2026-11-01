import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LocalWorkoutController } from '../src/features/workout-local/controller.ts'
import { ClosedWorkoutController } from '../src/features/workout-online/closed-controller.ts'
import { LocalStoreError } from '../src/features/workout-online/storage.ts'
import { AuthApi } from '../src/features/auth/api.ts'
import * as m from '../src/features/workout-local/model.ts'
import * as s from '../src/features/workout-local/sync-state.ts'
import { localWorkout } from '../src/features/workout-local/validation.ts'
import { closedWriteFact, recoveryRows } from '../src/features/workout-online/closed-model.ts'
import { session, scope, bootstrap, SESSION_EXERCISE as E, OTHER, DEVICE, routine } from './fixtures/workout-online-data.mjs'

const at=Date.parse('2026-11-01T01:00:00Z'),clone=structuredClone
const assessment=version=>({schemaVersion:1,ruleVersion:'task009-completion-v1',sessionVersion:version,assessedAt:new Date(at).toISOString(),overallWeightPlanComplete:false,exercises:[]})
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
    server={...server,localRevision:body.localRevision,version:String(BigInt(server.version)+1n),snapshot:{...server.snapshot,state:clone(body.snapshot)}};return ack(body,false)
  },finish:async(_scope,_id,body)=>{
    calls.push({kind:'finish',body:clone(body)});if(options.beforeFinish)await options.beforeFinish(body)
    const duplicate=server.status==='FINISHED'
    if(duplicate)assert.equal(JSON.stringify(body),fixedFinish??stored.finish.requestJson)
    else{fixedFinish=JSON.stringify(body);server={...server,status:'FINISHED',localRevision:body.localRevision,version:String(BigInt(server.version)+1n),endedAt:body.endedAt,closedAt:new Date(at+50).toISOString(),completionAssessment:assessment(String(BigInt(server.version)+1n)),snapshot:{...server.snapshot,state:clone(body.snapshot)}}}
    const value={...ack(body,duplicate),status:'FINISHED',currentVersion:server.version,deletedAt:server.deletedAt,endedAt:server.endedAt,closedAt:server.closedAt,completionAssessment:server.completionAssessment}
    if(options.afterFinish)await options.afterFinish(value);return value
  }}
  const c=new LocalWorkoutController(store,()=>authorized,async()=>({held:()=>held,release(){held=false}}),{api,online:()=>online,onServer:value=>{if(value.status==='FINISHED')assert.ok(stored.finish.ack,'publish only after durable ACK')}})
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
test('a durable unresolved approval resolution is confirmed before freezing FINISH',async()=>{
  let w=change(local(),x=>m.changeWeight(x,E,'65',true,at));w.serverRevision=w.localRevision;w.syncState='CLEAN';w.serverVersion='1'
  const approval=w.snapshot.approvalRequests[0],result={id:approval.id,sessionExerciseId:E,sequence:'1',status:'PENDING',reason:'ROUTINE_CHANGED',approvalEventId:null,routineVersionBefore:null,routineVersionAfter:null,resolvedAt:null,resolvedByRequestId:null}
  w.approvalResults=[result];const server=session({localRevision:w.localRevision,version:'1',snapshot:{state:clone(w.snapshot),approvalResults:[clone(result)],recordedContexts:[]}})
  const request=s.makeResolution(w,server,E,[approval.id],'KEEP_CURRENT','',null,at+10);w.pendingResolution={request,requestJson:JSON.stringify(request),workingBefore:clone(w.weights[E])};w=change(w,x=>s.intendFinish(x,at+20))
  const hold=gate();let e;const opening=editor({stored:w,server,resolutionGate:hold});await tick();hold.resolve();e=await opening
  assert.deepEqual(e.calls.map(c=>c.kind),['resolve','finish']);assert.ok(e.read().finish.ack);assert.equal(e.read().pendingResolution,null);e.c.stop()
})
test('FINISH ACK loss uses identical body, bounded replay, and no intermediate snapshot',async()=>{
  let lost=true;const e=await editor({afterFinish:async()=>{if(lost){lost=false;throw Error('lost ACK')}}});e.online(false);await e.c.change(w=>complete(w,1));await e.c.finish(at+20);e.online(true);await e.c.retrySync()
  assert.deepEqual(e.calls.map(c=>c.kind),['finish','finish']);assert.deepEqual(e.calls[0].body,e.calls[1].body);assert.ok(e.read().finish.ack);e.c.stop()
})
test('fixed FINISH storage failure prevents HTTP; ACK storage failure retains the same fixed original',async()=>{
  const e=await editor();e.online(false);await e.c.change(w=>complete(w,1));await e.c.finish(at+20)
  e.fail((next,old)=>!!next.finish?.request&&!old.finish?.request);e.online(true);await e.c.retrySync();assert.equal(e.calls.length,0);assert.ok(e.read().finish)
  e.fail((next,old)=>!!next.finish?.ack&&!old.finish?.ack);await e.c.retrySync();assert.equal(e.calls.length,1);const fixed=e.read().finish.requestJson;assert.equal(e.read().finish.ack,undefined)
  e.fail(()=>false);await e.c.retrySync();assert.equal(e.read().finish.requestJson,fixed);assert.ok(e.read().finish.ack);e.c.stop()
})
test('restart with server FINISHED confirms the durable original FINISH instead of creating a new end time',async()=>{
  let stored=change(local(),w=>{complete(w,1);s.intendFinish(w,at+20)});stored=change(stored,s.sealFinish)
  const server=session({status:'FINISHED',version:'1',localRevision:stored.localRevision,endedAt:stored.finish.endedAt,closedAt:new Date(at+50).toISOString(),completionAssessment:assessment('1'),snapshot:{state:clone(stored.snapshot),approvalResults:[],recordedContexts:[]}})
  const e=await editor({stored,server});assert.equal(e.calls.length,1);assert.equal(JSON.stringify(e.calls[0].body),stored.finish.requestJson);assert.ok(e.read().finish.ack);e.c.stop()
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
    const ack={...scope,sessionId:server.id,status:server.status,version:server.version,changed:true,changeEventIds:events.map(e=>e.id),recoveredIds:[],alreadyPresentIds:[],deletedAt:null}
    if(options.lose)throw Error('lost response');return ack
  }}
  const c=new ClosedWorkoutController(api,store,scope,server.id,()=>authorized,undefined,async()=>options.readonly?null:{held:()=>held,release(){held=false}});await c.open()
  const body=()=>({dataGeneration:scope.dataGeneration,expectedVersion:server.version,setCorrections:[{id:OTHER,weightKg:'62.5',reps:9}],cardioCorrections:[],deletedPerformedSetIds:[],deletedCardioResultIds:[]})
  return{c,api,calls,body,read:()=>clone(pending),remote:()=>clone(server),setVersion:v=>server.version=v,authorize:v=>authorized=v,fail:fn=>fail=fn}
}
test('closed corrections persist exact request before HTTP and confirm response loss by matching history',async()=>{
  const e=await closed({lose:true});assert.equal(await e.c.edit(e.body()),true);assert.equal(e.calls.length,1);assert.equal(e.read().status,'CONFIRMED');assert.equal(e.read().requestJson,JSON.stringify(e.calls[0]));e.c.stop()
})
test('closed version conflict keeps original expectedVersion and requires explicit latest-record review',async()=>{
  const e=await closed(),body=e.body();e.setVersion('2');assert.equal(await e.c.edit(body),false);assert.equal(e.read().status,'PENDING');assert.equal(e.calls[0].expectedVersion,'1')
  await e.c.refresh();assert.equal(e.calls.length,1);assert.equal(await e.c.edit(e.body()),false)
  await e.c.reviewed();assert.equal(await e.c.edit(e.body()),true);assert.deepEqual(e.calls.map(c=>c.expectedVersion),['1','2']);e.c.stop()
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
test('closed generation changes stop editing and keep the durable prior request intact',async()=>{
  const e=await closed();const before=e.read();e.api.detail=async()=>{throw{status:409,code:'DATA_GENERATION_MISMATCH'}}
  await e.c.refresh();assert.equal(e.c.getSnapshot().writable,false);assert.equal(e.c.getSnapshot().server,null);assert.deepEqual(e.read(),before);assert.equal(await e.c.edit(e.body()),false);assert.equal(e.calls.length,0);e.c.stop()
})
test('confirming an old epoch cannot send the current epoch finish instead of its selected original',async()=>{
  const e=await closed();let w=change(local(),x=>{complete(x,1);s.intendFinish(x,at+20)});w.writerEpoch='1';w=change(w,s.sealFinish)
  await e.c.confirmFinish(w);assert.match(e.c.getSnapshot().issue,/다른 편집 사본/);assert.equal(e.calls.length,0);assert.equal(w.finish.ack,undefined);e.c.stop()
})
