import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LocalWorkoutController } from '../src/features/workout-local/controller.ts'
import { LocalStoreError } from '../src/features/workout-online/storage.ts'
import * as m from '../src/features/workout-local/model.ts'
import * as sync from '../src/features/workout-local/sync-state.ts'
import * as v from '../src/features/workout-online/validation.ts'
import { localWorkout } from '../src/features/workout-local/validation.ts'
import { session, scope, bootstrap, SESSION_EXERCISE as E, OTHER, routine } from './fixtures/workout-online-data.mjs'
const time=Date.parse('2026-11-01T00:00:00Z')
const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const tick=async()=>{for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r))}
const complete=(w,n=1)=>{m.editDraft(w,E,n,{weight:'62.500000',reps:'8'});m.completeSet(w,E,n,time+n)}
const local=()=>m.createLocalWorkout(session(),bootstrap.settings)
const change=(w,fn)=>m.applyLocalChange(w,fn)
const ack=(w,version='1')=>({...scope,sessionId:w.sessionId,writerEpoch:w.writerEpoch,acceptedLocalRevision:w.pendingSnapshot.request.localRevision,version,snapshotSavedAt:new Date(time).toISOString(),lastWorkoutSyncedAt:new Date(time).toISOString(),duplicate:false,approvalResults:[]})

async function setup(options={}){
  let stored=options.stored??local(), server=options.server??session(), payload=null, authorized=true, online=true, held=true, fail=()=>false
  const writes=[], gets=[], statuses=[]
  const store={openLocal:async()=>structuredClone(stored),readLocal:async()=>structuredClone(stored),saveSession:async()=>{},saveLocal:async(value,expected,guard)=>{
    if(!guard())throw new LocalStoreError();assert.equal(expected,stored.editVersion);if(fail(value,stored))throw new LocalStoreError();stored=structuredClone(value)
  }};store.saveSyncLocal=store.saveLocal
  const api={detail:async()=>{gets.push(server.localRevision);return structuredClone(server)},routine:async()=>structuredClone(routine),resolve:async()=>{throw Error('unexpected resolution')},snapshot:async(_scope,id,body)=>{
    writes.push(JSON.stringify(body));if(options.beforeSend)await options.beforeSend(body)
    assert.equal(id,stored.sessionId);assert.ok(v.snapshot(body.snapshot));assert.equal(body.dataGeneration,scope.dataGeneration)
    if(server.editorDeviceId!==body.editorDeviceId||server.writerEpoch!==body.writerEpoch)throw{status:409,code:'EDITOR_OWNERSHIP_LOST'}
    if(server.status!=='ACTIVE')throw{status:409,code:'SESSION_AUTO_CLOSED'}
    const duplicate=body.localRevision===server.localRevision
    if(duplicate){assert.equal(JSON.stringify(body),payload)}else{
      assert.ok(BigInt(body.localRevision)>BigInt(server.localRevision));payload=JSON.stringify(body)
      server={...server,localRevision:body.localRevision,version:String(BigInt(server.version)+1n),lastSnapshotSavedAt:new Date(time).toISOString(),snapshot:{...server.snapshot,state:structuredClone(body.snapshot)}}
    }
    const value={...scope,sessionId:id,writerEpoch:server.writerEpoch,acceptedLocalRevision:server.localRevision,version:server.version,snapshotSavedAt:server.lastSnapshotSavedAt,lastWorkoutSyncedAt:server.lastWorkoutSyncedAt,duplicate,approvalResults:server.snapshot.approvalResults}
    if(options.afterSend)await options.afterSend(value)
    return value
  },...options.api}
  const c=new LocalWorkoutController(store,()=>authorized,async()=>({held:()=>held,release(){held=false}}),{api,online:()=>online})
  await c.open(server,bootstrap.settings);await c.syncSettled()
  return{c,store,api,writes,gets,statuses,read:()=>structuredClone(stored),remote:()=>structuredClone(server),setServer:value=>server=value,fail:fn=>fail=fn,authorize:value=>authorized=value,online:value=>online=value}
}
test('frozen snapshot is exact V13, excludes input/timers, and sealing never changes revision',()=>{
  let w=change(local(),x=>complete(x));const revision=w.localRevision
  w=change(w,sync.sealSnapshot);assert.equal(w.localRevision,revision);assert.equal(w.pendingSnapshot.requestJson,JSON.stringify(w.pendingSnapshot.request))
  assert.deepEqual(Object.keys(w.pendingSnapshot.request).sort(),['dataGeneration','editorDeviceId','writerEpoch','localRevision','snapshot'].sort())
  assert.ok(v.snapshot(w.pendingSnapshot.request.snapshot));assert.equal(w.presence[w.snapshot.performedSets[0].id],'UNKNOWN')
  assert.equal(w.pendingSnapshot.request.snapshot.performedSets[0].weightKg,'62.5');assert.doesNotMatch(w.pendingSnapshot.requestJson,/drafts|timers|restPolicy|userId/)
})

test('v2 documents stay compatible, but a frozen request cannot escape its generation, device or epoch',()=>{
  const old=local();assert.equal(localWorkout(old),true)
  let w=change(old,x=>complete(x));w=change(w,sync.sealSnapshot);assert.equal(localWorkout(w),true)
  for(const [key,value] of [['dataGeneration','0'],['editorDeviceId',OTHER],['writerEpoch','1']]){
    const bad=structuredClone(w);bad.pendingSnapshot.request[key]=value;bad.pendingSnapshot.requestJson=JSON.stringify(bad.pendingSnapshot.request)
    assert.equal(localWorkout(bad),false)
  }
})
test('ACK only confirms sealed records; a completion and deletion made during send remain dirty',()=>{
  let w=change(local(),x=>complete(x));w=change(w,sync.sealSnapshot);const first=w.snapshot.performedSets[0].id, response=ack(w)
  const frozen=w.pendingSnapshot.requestJson
  w=change(w,x=>{m.undoSet(x,first);complete(x,2)})
  assert.equal(w.pendingSnapshot.requestJson,frozen);assert.equal(w.cancelled.sets[0].id,first);assert.ok(w.snapshot.deletedPerformedSetIds.includes(first))
  w=change(w,x=>sync.acceptSnapshot(x,response));assert.equal(w.snapshot.performedSets[0].ordinal,2);assert.equal(w.serverRevision,'1');assert.equal(w.localRevision,'2')
  assert.equal(w.presence[first],'SERVER_CONFIRMED');assert.equal(w.syncState,'UNSENT');assert.equal(w.confirmedDeletedSetIds.length,0)
  w=change(w,sync.sealSnapshot);const response2=ack(w,'2');assert.deepEqual(w.pendingSnapshot.request.snapshot.deletedPerformedSetIds,[first])
  w=change(w,x=>sync.acceptSnapshot(x,response2));assert.equal(w.syncState,'CLEAN');assert.deepEqual(w.confirmedDeletedSetIds,[first]);assert.equal(w.cancelled.sets.length,1)
})
test('low GET never classifies unknown delivery as local-only or deletes frozen request',()=>{
  let w=change(local(),x=>complete(x));w=change(w,sync.sealSnapshot);const frozen=w.pendingSnapshot.requestJson
  w=change(w,x=>sync.observeServer(x,session()));assert.equal(w.pendingSnapshot.requestJson,frozen);assert.ok(Object.values(w.presence).includes('UNKNOWN'))
  assert.throws(()=>change(w,sync.sealSnapshot));assert.throws(()=>change(w,x=>sync.acceptSnapshot(x,{...ack(w),acceptedLocalRevision:'2'})))
})
test('authoritative validation rejection can distinguish never-applied local records without losing their cancelled originals',()=>{
  let w=change(local(),x=>complete(x));w=change(w,sync.sealSnapshot);const id=w.snapshot.performedSets[0].id
  w=change(w,x=>m.undoSet(x,id));w=change(w,sync.rejectSnapshot)
  assert.equal(w.presence[id],'LOCAL_ONLY');assert.deepEqual(w.snapshot.deletedPerformedSetIds,[]);assert.equal(w.cancelled.sets[0].id,id);assert.ok(w.pendingSnapshot.rejected)
})
test('completion auto-sends only after durable local write and leaves original decimal draft intact',async()=>{
  const e=await setup();await e.c.change(w=>complete(w));await e.c.syncSettled()
  assert.equal(e.writes.length,1);assert.equal(e.remote().snapshot.state.performedSets.length,1);assert.equal(e.read().syncState,'CLEAN');assert.equal(e.read().drafts[E+':1'].weight,'62.500000')
  assert.equal(e.read().serverRevision,'1');assert.equal(e.read().localRevision,'1');e.c.stop()
})
test('draft edits, navigation and rest display never send snapshots',async()=>{
  const e=await setup();e.c.draft(E,1,{weight:'00062.',reps:''});await e.c.settled();await e.c.change(w=>{w.currentExerciseId=E;w.rest=null});await tick()
  assert.equal(e.writes.length,0);assert.equal(e.read().localRevision,'0');e.c.stop()
})
test('additional completions and cancellation are coalesced behind an immutable in-flight snapshot',async()=>{
  const disk=gate();let first=true
  const e=await setup({beforeSend:async()=>{if(first){first=false;await disk.promise}}})
  await e.c.change(w=>complete(w));await tick();const frozen=e.read().pendingSnapshot.requestJson, id=e.read().snapshot.performedSets[0].id
  await e.c.change(w=>complete(w,2));await e.c.change(w=>m.undoSet(w,id));await e.c.change(w=>complete(w,3))
  assert.equal(e.writes.length,1);assert.equal(e.read().pendingSnapshot.requestJson,frozen)
  disk.resolve();await e.c.syncSettled();assert.equal(e.writes.length,2)
  const latest=JSON.parse(e.writes[1]);assert.equal(latest.localRevision,'4');assert.deepEqual(latest.snapshot.performedSets.map(r=>r.ordinal),[2,3]);assert.deepEqual(latest.snapshot.deletedPerformedSetIds,[id])
  assert.equal(e.read().syncState,'CLEAN');e.c.stop()
})
test('lost ACK reconciles by detail and identical replay without new revision or UUID',async()=>{
  let lose=true;const e=await setup({afterSend:async()=>{if(lose){lose=false;throw Error('lost after commit')}}})
  await e.c.change(w=>complete(w));await e.c.syncSettled();assert.equal(e.writes.length,2);assert.equal(e.writes[0],e.writes[1]);assert.equal(e.remote().snapshot.state.performedSets.length,1);assert.equal(e.read().localRevision,'1');assert.equal(e.read().syncState,'CLEAN');e.c.stop()
})
test('unconfirmed low revision is retried verbatim once per trigger, never an automatic loop',async()=>{
  let count=0;const e=await setup({api:{snapshot:async()=>{count++;throw Error('offline')}}})
  await e.c.change(w=>complete(w));await e.c.syncSettled();const frozen=e.read().pendingSnapshot.requestJson;assert.equal(count,2)
  await e.c.change(w=>complete(w,2));await tick();assert.equal(count,2);assert.equal(e.read().pendingSnapshot.requestJson,frozen)
  await e.c.retrySync();assert.equal(count,4);assert.equal(e.read().pendingSnapshot.requestJson,frozen);e.c.stop()
})
test('failure saving fixed payload prevents HTTP dispatch; the completed local fact survives',async()=>{
  const e=await setup();e.fail((next,previous)=>!!next.pendingSnapshot&&!previous.pendingSnapshot)
  await e.c.change(w=>complete(w));await e.c.syncSettled();assert.equal(e.writes.length,0);assert.equal(e.read().snapshot.performedSets.length,1);assert.equal(e.read().pendingSnapshot,undefined)
  e.fail(()=>false);await e.c.retrySync();assert.equal(e.writes.length,1);assert.equal(e.read().syncState,'CLEAN');e.c.stop()
})
test('ACK storage failure retains exact frozen request and confirms by duplicate retry later',async()=>{
  const e=await setup();e.fail((next,previous)=>previous.pendingSnapshot&&!next.pendingSnapshot)
  await e.c.change(w=>complete(w));await e.c.syncSettled();const original=e.read().pendingSnapshot.requestJson;assert.equal(e.remote().localRevision,'1');assert.equal(e.read().serverRevision,'0')
  e.fail(()=>false);await e.c.retrySync();assert.equal(e.writes.at(-1),original);assert.equal(e.read().pendingSnapshot,null);assert.equal(e.read().syncState,'CLEAN');e.c.stop()
})
test('restart after sealing but before dispatch resumes frozen body; newer local inputs survive',async()=>{
  let stored=change(local(),x=>complete(x));stored=change(stored,sync.sealSnapshot);const original=stored.pendingSnapshot.requestJson;stored=change(stored,x=>complete(x,2))
  const e=await setup({stored});assert.equal(e.writes[0],original);assert.equal(e.writes.length,2);assert.deepEqual(e.remote().snapshot.state.performedSets.map(r=>r.ordinal),[1,2]);e.c.stop()
})
test('unexpected server revision blocks replacement instead of silently rebaselining local state',async()=>{
  const server=session({localRevision:'9',version:'9'}), stored=change(local(),x=>complete(x)), e=await setup({server,stored})
  assert.equal(e.writes.length,0);assert.equal(e.read().localRevision,'1');assert.equal(e.c.getSnapshot().syncStatus,'CHECK');e.c.stop()
})
test('foreign takeover and AUTO_CLOSED stop writes and retain the old local original',async()=>{
  for(const patch of [{writerEpoch:'1',editorDeviceId:OTHER,version:'2'},{status:'AUTO_CLOSED',closedAt:new Date(time).toISOString(),version:'2'}]){
    const e=await setup();e.online(false);await e.c.change(w=>complete(w));const before=e.read()
    e.setServer(session(patch));e.online(true);await e.c.retrySync();assert.equal(e.writes.length,0);assert.equal(e.c.getSnapshot().writable,false);assert.deepEqual(e.read().snapshot,before.snapshot);assert.equal(e.read().writerEpoch,'0');e.c.stop()
  }
})
test('logout while waiting for server response prevents late ACK from touching another account',async()=>{
  const response=gate();const e=await setup({afterSend:async()=>response.promise});await e.c.change(w=>complete(w));await tick();const frozen=e.read().pendingSnapshot.requestJson
  e.authorize(false);e.online(false);e.c.stop();response.resolve();await tick();assert.equal(e.read().pendingSnapshot.requestJson,frozen);assert.equal(e.read().serverRevision,'0')
})
test('approval chain, PENDING facts and a reapproval preserve old recording context',()=>{
  let w=change(local(),x=>{m.changeWeight(x,E,'65',true,time);complete(x)});w=change(w,x=>m.changeWeight(x,E,'67.5',true,time+10));const original=structuredClone(w.snapshot.performedSets[0].weightContext)
  const server=session({localRevision:w.localRevision,version:'2',snapshot:{state:structuredClone(w.snapshot),approvalResults:w.snapshot.approvalRequests.map(r=>({id:r.id,sessionExerciseId:E,sequence:r.sequence,status:'PENDING',reason:'ROUTINE_CHANGED',approvalEventId:null,routineVersionBefore:null,routineVersionAfter:null,resolvedAt:null,resolvedByRequestId:null})),recordedContexts:[]}})
  w.serverRevision=w.localRevision;w.serverVersion='2';w.syncState='CLEAN';const ids=server.snapshot.approvalResults.map(r=>r.id)
  const request=sync.makeResolution(w,server,E,ids,'REAPPROVE','70.000000',{version:'5',approvedWeight:'60'},time+20)
  w.pendingResolution={request,requestJson:JSON.stringify(request),workingBefore:structuredClone(w.weights[E])}
  const resolved=structuredClone(server);resolved.version='3';resolved.snapshot.approvalResults.forEach(r=>{r.status='NOT_APPLIED';r.reason='REAPPROVED';r.resolvedAt=new Date(time+21).toISOString();r.resolvedByRequestId=request.newApprovalRequest.id})
  resolved.snapshot.state.approvalRequests.push({...request.newApprovalRequest,sessionExerciseId:E,previousRequestId:null,occurredAt:request.occurredAt})
  assert.equal(sync.resolutionFact(request,resolved),true);w=change(w,x=>sync.acceptResolution(x,resolved));assert.deepEqual(w.snapshot.performedSets[0].weightContext,original)
  assert.equal(w.weights[E].value,'70');assert.equal(w.weights[E].context.requestId,request.newApprovalRequest.id);assert.equal(w.snapshot.approvalRequests.length,3)
})
test('KEEP_CURRENT uses every pending ID and missing sources cannot be reapproved',()=>{
  const w=local(), server=session();server.snapshot.approvalResults=[{id:OTHER,sessionExerciseId:E,sequence:'1',status:'PENDING',reason:'SOURCE_REMOVED',approvalEventId:null,routineVersionBefore:null,routineVersionAfter:null,resolvedAt:null,resolvedByRequestId:null}]
  const keep=sync.makeResolution(w,server,E,[OTHER],'KEEP_CURRENT','',null,time);assert.equal(keep.newApprovalRequest,null)
  assert.throws(()=>sync.makeResolution(w,server,E,[],'KEEP_CURRENT','',null,time));assert.throws(()=>sync.makeResolution(w,server,E,[OTHER],'REAPPROVE','70',null,time))
})
function pendingCase(){
  const w=change(local(),x=>m.changeWeight(x,E,'65',true,time));w.serverRevision=w.localRevision;w.serverVersion='4';w.syncState='CLEAN'
  const r=w.snapshot.approvalRequests[0],result={id:r.id,sessionExerciseId:E,sequence:r.sequence,status:'PENDING',reason:'ROUTINE_CHANGED',approvalEventId:null,routineVersionBefore:null,routineVersionAfter:null,resolvedAt:null,resolvedByRequestId:null}
  w.approvalResults=[result]
  return{stored:w,server:session({localRevision:w.localRevision,version:'4',snapshot:{state:structuredClone(w.snapshot),approvalResults:[structuredClone(result)],recordedContexts:[]}}),ids:[r.id]}
}
function keepResult(server,request){
  const next=structuredClone(server);next.version=String(BigInt(next.version)+1n)
  next.snapshot.approvalResults.forEach(r=>{r.status='NOT_APPLIED';r.reason='KEPT_CURRENT';r.resolvedAt=new Date(time).toISOString()})
  return {...next,snapshot:{...next.snapshot,approvalResults:next.snapshot.approvalResults.filter(r=>request.pendingRequestIds.includes(r.id))}}
}
test('resolution intent is durable before HTTP and response loss is confirmed by server facts without repeating it',async()=>{
  const seed=pendingCase(),e=await setup(seed);let sent=0
  e.api.resolve=async(_scope,_id,request)=>{
    sent++;assert.equal(e.read().pendingResolution.requestJson,JSON.stringify(request));e.setServer(keepResult(e.remote(),request));throw Error('lost resolution ACK')
  }
  assert.equal(await e.c.resolveApproval(E,seed.ids,'KEEP_CURRENT',''),true);await e.c.syncSettled()
  assert.equal(sent,1);assert.equal(e.read().pendingResolution,null);assert.equal(e.read().approvalResults[0].status,'NOT_APPLIED');assert.equal(e.read().snapshot.approvalRequests[0].id,seed.ids[0]);e.c.stop()
})
test('resolution ACK storage failure resumes by GET without issuing a new resolution UUID or request',async()=>{
  const seed=pendingCase(),e=await setup(seed);let sent=0
  e.api.resolve=async(_scope,_id,request)=>{sent++;e.setServer(keepResult(e.remote(),request));return{}}
  e.fail((next,previous)=>previous.pendingResolution&&!next.pendingResolution)
  assert.equal(await e.c.resolveApproval(E,seed.ids,'KEEP_CURRENT',''),false)
  const fixed=e.read().pendingResolution.requestJson;e.fail(()=>false);await e.c.retrySync()
  assert.equal(sent,1);assert.ok(fixed);assert.equal(e.read().pendingResolution,null);e.c.stop()
})
test('rejected resolution is not silently rebased; a later explicit user decision uses the new expected version',async()=>{
  const seed=pendingCase(),e=await setup(seed),versions=[];let reject=true
  e.api.resolve=async(_scope,_id,request)=>{
    versions.push(request.expectedSessionVersion)
    if(reject){const s=e.remote();s.version='5';e.setServer(s);throw{status:409,code:'RESOLUTION_CONFLICT'}}
    e.setServer(keepResult(e.remote(),request));return{}
  }
  assert.equal(await e.c.resolveApproval(E,seed.ids,'KEEP_CURRENT',''),false);assert.ok(e.read().pendingResolution.rejected)
  await e.c.retrySync();assert.deepEqual(versions,['4']);reject=false
  assert.equal(await e.c.resolveApproval(E,seed.ids,'KEEP_CURRENT',''),true);assert.deepEqual(versions,['4','5']);e.c.stop()
})
test('concurrent retry triggers share one network slot',async()=>{
  const gateSend=gate();let sending=false
  const e=await setup({beforeSend:async()=>{assert.equal(sending,false);sending=true;await gateSend.promise;sending=false}})
  await e.c.change(w=>complete(w));await tick();const retries=Promise.all([e.c.retrySync(),e.c.retrySync(),e.c.retrySync()])
  gateSend.resolve();await retries;assert.equal(e.writes.length,1);assert.equal(e.read().syncState,'CLEAN');e.c.stop()
})

test('two simultaneous approval choices cannot prepare or send two resolutions',async()=>{
  const seed=pendingCase(),e=await setup(seed),hold=gate();let sent=0
  e.api.resolve=async(_scope,_id,request)=>{sent++;await hold.promise;e.setServer(keepResult(e.remote(),request));return{}}
  const first=e.c.resolveApproval(E,seed.ids,'KEEP_CURRENT','');await tick()
  assert.equal(await e.c.resolveApproval(E,seed.ids,'KEEP_CURRENT',''),false);assert.equal(sent,1)
  const before=e.read();assert.equal(await e.c.change(w=>m.changeWeight(w,E,'72.5',true,time+30)),false)
  assert.deepEqual(e.read(),before);assert.equal(await e.c.change(w=>m.changeWeight(w,E,'72.5',false,time+31)),true)
  hold.resolve();assert.equal(await first,true);assert.equal(sent,1);e.c.stop()
})

test('cardio confirmation, tombstone and re-completion preserve decimal source and use distinct UUIDs',async()=>{
  const e=await setup();await e.c.change(w=>m.addCardio(w,{kind:'OUTDOOR',name:'야외',targetSeconds:60,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null}));await e.c.syncSettled()
  const id=e.read().currentExerciseId,count=e.writes.length
  await e.c.change(w=>m.timerAction(w,id,'start',time));e.c.cardioDraft(id,{distance:'0001.250000',bpm:'120'});await e.c.settled();await e.c.syncSettled();assert.equal(e.writes.length,count)
  await e.c.change(w=>m.completeCardio(w,id,time+1000));await e.c.syncSettled();const first=e.read().snapshot.cardioResults[0]
  assert.equal(e.remote().snapshot.state.cardioResults[0].result.distanceKm,'1.25');assert.equal(e.read().timers[id].distance,'0001.250000')
  await e.c.change(w=>m.undoCardio(w,first.id));await e.c.syncSettled()
  assert.deepEqual(e.remote().snapshot.state.deletedCardioResultIds,[first.id]);assert.deepEqual(e.read().confirmedDeletedCardioIds,[first.id])
  await e.c.change(w=>m.completeCardio(w,id,time+2000));await e.c.syncSettled()
  assert.notEqual(e.read().snapshot.cardioResults[0].id,first.id);assert.deepEqual(e.read().cancelled.cardio,[first]);e.c.stop()
})
test('a data-generation mismatch stops the sender and preserves fixed local data',async()=>{
  const e=await setup();e.online(false);await e.c.change(w=>complete(w));const before=e.read()
  e.api.detail=async()=>{throw{status:409,code:'DATA_GENERATION_MISMATCH'}};e.online(true);await e.c.retrySync()
  assert.equal(e.c.getSnapshot().writable,false);assert.equal(e.writes.length,0);assert.deepEqual(e.read(),before);e.c.stop()
})

test('generation changes during approval preparation also stop writes without saving or sending a resolution',async()=>{
  const seed=pendingCase(),e=await setup(seed),before=e.read();let reads=0,sent=0
  e.api.detail=async()=>{if(++reads===2)throw{status:409,code:'DATA_GENERATION_MISMATCH'};return e.remote()}
  e.api.resolve=async()=>{sent++;return{}}
  assert.equal(await e.c.resolveApproval(E,seed.ids,'KEEP_CURRENT',''),false)
  assert.equal(e.c.getSnapshot().writable,false);assert.equal(sent,0);assert.equal(e.read().pendingResolution,undefined)
  assert.deepEqual(e.read().snapshot,before.snapshot);e.c.stop()
})
