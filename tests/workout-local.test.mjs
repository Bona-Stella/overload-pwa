import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import * as m from '../src/features/workout-local/model.ts'
import { localWorkout } from '../src/features/workout-local/validation.ts'
import { LocalWorkoutController } from '../src/features/workout-local/controller.ts'
import { acquireEditor, editorLockName } from '../src/features/workout-local/lock.ts'
import { LocalStoreError, LocalWriteBlocked } from '../src/features/workout-online/storage.ts'
import { AuthController } from '../src/features/auth/controller.ts'
import { AuthError } from '../src/features/auth/api.ts'
import { session, bootstrap, SESSION_EXERCISE as E, EXERCISE, OTHER, USER } from './fixtures/workout-online-data.mjs'

const at=Date.parse('2026-10-31T12:10:00.000Z'), policy=bootstrap.settings
const local=()=>m.createLocalWorkout(session(),policy)
const change=(w,fn)=>m.applyLocalChange(w,fn)
const id=()=>crypto.randomUUID()
const set=(w,n=1,reps='8',weight='62.500000')=>change(w,x=>{m.editDraft(x,E,n,{weight,reps});m.completeSet(x,E,n,at+n)})
const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const settle=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r))}

test('initial plan and server copy stay unchanged while applied plan and exact text are independent',()=>{
  const server=session(), original=structuredClone(server), w=m.createLocalWorkout(server,policy)
  const next=change(w,x=>{m.updateTargets(x,E,4,8,12);m.editDraft(x,E,1,{weight:'00062.500000',reps:'0009'})})
  assert.deepEqual(server,original);assert.deepEqual(next.initialPlan,w.initialPlan)
  assert.equal(next.snapshot.appliedPlan.weightExercises[0].setCount,4);assert.equal(next.drafts[E+':1'].weight,'00062.500000')
  assert.equal(next.localRevision,'1');assert.equal(next.editVersion,'1');assert.ok(localWorkout(next))
})
test('draft, navigation, timer ticks and rest adjustments do not advance snapshot revision',()=>{
  let w=change(local(),x=>m.editDraft(x,E,1,{weight:'',reps:''}))
  w=change(w,x=>{x.currentExerciseId=E;x.rest=null})
  assert.equal(w.localRevision,'0');assert.equal(w.editVersion,'2');assert.equal(w.snapshot.performedSets.length,0)
  for(let i=0;i<100;i++)m.restRemaining(w,at+i)
  assert.equal(w.editVersion,'2');assert.equal(w.syncState,'CLEAN')
})
test('completion preserves precision, original input and real facts without assuming weight approval',()=>{
  const w=set(local(),1,'0008','99999999999999.999998'), p=w.snapshot.performedSets[0]
  assert.equal(p.weightKg,'99999999999999.999998');assert.equal(p.reps,8);assert.equal(p.completedAt,new Date(at+1).toISOString())
  assert.deepEqual(p.weightContext,{kind:'TODAY_ONLY',requestId:null});assert.equal(w.drafts[E+':1'].reps,'0008')
  assert.equal(w.presence[p.id],'LOCAL_ONLY');assert.equal(w.localRevision,'1');assert.equal(w.syncState,'UNSENT')
})
test('initial approved zero is distinct from blank or a changed working weight',()=>{
  const server=session();server.initialPlan.weightExercises[0].approvedWeightKg='0'
  const w=set(m.createLocalWorkout(server,policy),1,'1','0')
  assert.equal(w.snapshot.performedSets[0].weightContext.kind,'INITIAL_APPROVED')
  assert.throws(()=>set(local(),1,'1',''));assert.throws(()=>set(local(),1,'0','0'));assert.throws(()=>set(local(),1,'1','1e2'))
})
test('cancel local-only completion keeps its tombstone facts and re-completion always gets a fresh UUID',()=>{
  let w=set(local()), first=w.snapshot.performedSets[0]
  w=change(w,x=>m.undoSet(x,first.id));assert.deepEqual(w.cancelled.sets,[first]);assert.deepEqual(w.snapshot.deletedPerformedSetIds,[])
  assert.equal(w.snapshot.performedSets.length,0);assert.equal(w.localRevision,'2')
  assert.throws(()=>change(w,x=>m.completeSet(x,E,1,at+2,()=>first.id)),/UUID/)
  w=change(w,x=>m.completeSet(x,E,1,at+3));assert.notEqual(w.snapshot.performedSets[0].id,first.id);assert.equal(w.localRevision,'3')
})
test('confirmed and unknown delivery cancellations cannot be treated as never sent',()=>{
  for(const presence of ['SERVER_CONFIRMED','UNKNOWN',undefined]){
    let w=set(local());const record=w.snapshot.performedSets[0];w.presence[record.id]=presence
    if(presence===undefined)delete w.presence[record.id]
    w=change(w,x=>m.undoSet(x,record.id));assert.ok(w.snapshot.deletedPerformedSetIds.includes(record.id));assert.deepEqual(w.cancelled.sets[0],record)
    assert.equal(w.syncState,presence==='SERVER_CONFIRMED'?'UNSENT':'UNKNOWN')
  }
})
test('consecutive completed sets have independent UUIDs, ordinals and monotonic long revisions',()=>{
  let w=local();w.localRevision='9007199254740993'
  for(let n=1;n<=6;n++)w=set(w,n)
  assert.equal(w.localRevision,'9007199254740999');assert.equal(new Set(w.snapshot.performedSets.map(x=>x.id)).size,6)
  assert.deepEqual(w.snapshot.performedSets.map(x=>x.ordinal),[1,2,3,4,5,6]);assert.throws(()=>m.increment('9223372036854775807'))
})
test('rest uses Task 008 upper-repetition bands and absolute deadlines',()=>{
  for(const [max,seconds] of [[1,180],[8,180],[9,180],[10,180],[11,120],[12,120],[13,90]]){
    let w=change(local(),x=>m.updateTargets(x,E,3,1,max));w=set(w)
    assert.equal(w.rest.seconds,seconds);assert.equal(m.restRemaining(w,at+1001),seconds-1);assert.equal(m.restRemaining(w,at+seconds*1000+1),0)
  }
})
test('explicit approval intent chains preserve UUID, sequence, prior weight and immutable completed context',()=>{
  let w=change(local(),x=>m.changeWeight(x,E,'65.000000',true,at)), first=w.snapshot.approvalRequests[0]
  w=set(w,1,'8','65.000000');const firstContext=structuredClone(w.snapshot.performedSets[0].weightContext)
  w=change(w,x=>m.changeWeight(x,E,'67.5',true,at+2));const second=w.snapshot.approvalRequests[1]
  assert.equal(second.previousRequestId,first.id);assert.equal(second.sequence,'2');assert.equal(second.previousApprovedWeightKg,'65')
  assert.equal(second.expectedRoutineVersion,first.expectedRoutineVersion);assert.deepEqual(w.snapshot.performedSets[0].weightContext,firstContext)
  assert.equal(firstContext.kind,'APPROVAL_REQUEST');assert.equal(w.approvalResults.length,0);assert.equal(w.initialPlan.weightExercises[0].approvedWeightKg,'99999999999999.999999')
})
test('today-only weight and direct per-set change cannot implicitly request approval',()=>{
  let w=change(local(),x=>m.changeWeight(x,E,'65',false,at));w=set(w,1,'8','65')
  assert.equal(w.snapshot.approvalRequests.length,0);assert.equal(w.snapshot.performedSets[0].weightContext.kind,'TODAY_ONLY')
})
test('new session exercises have no routine approval source; removal protects results and initial plan',()=>{
  let w=change(local(),x=>m.addWeight(x,EXERCISE,'동일 이름')), added=w.currentExerciseId
  assert.notEqual(added,E);assert.throws(()=>change(w,x=>m.changeWeight(x,added,'65',true,at)),/원래 루틴/)
  w=set(w);assert.throws(()=>change(w,x=>m.removeExercise(x,E)),/먼저/)
  const initial=structuredClone(w.initialPlan);w=change(w,x=>m.removeExercise(x,added));assert.deepEqual(w.initialPlan,initial)
  assert.throws(()=>change(w,x=>m.removeExercise(x,E)),/먼저/)
})
function cardio(w=local()) {return change(w,x=>m.addCardio(x,{kind:'TREADMILL',name:'러닝',targetSeconds:600,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null}))}
test('cardio timer anchors and original segments survive cloning, refresh and pause/resume without revision ticks',()=>{
  let w=cardio(), c=w.currentExerciseId, revision=w.localRevision
  w=change(w,x=>m.timerAction(x,c,'start',at));w=structuredClone(w)
  assert.equal(m.elapsed(w.timers[c],at+2300),2300);assert.equal(w.localRevision,revision)
  w=change(w,x=>m.timerAction(x,c,'pause',at+3000));assert.equal(m.elapsed(w.timers[c],at+20000),3000)
  w=change(w,x=>m.timerAction(x,c,'start',at+21000));w=change(w,x=>m.timerAction(x,c,'pause',at+24000))
  assert.equal(w.timers[c].accumulatedMs,6000);assert.equal(w.timers[c].segments.length,2);assert.equal(w.localRevision,revision)
  w=change(w,x=>{x.timers[c].distance='0001.250000';x.timers[c].bpm='120';m.completeCardio(x,c,at+25000)})
  const r=w.snapshot.cardioResults[0];assert.equal(r.result.timerMs,6000);assert.equal(r.result.activeMs,6000);assert.equal(r.result.distanceKm,'1.25');assert.equal(r.startedAt,new Date(at).toISOString())
  assert.equal(w.timers[c].distance,'0001.250000');assert.equal(w.localRevision,String(BigInt(revision)+1n))
})
test('cardio manual correction keeps original timer, cancellation and re-completion get a new UUID',()=>{
  let w=cardio(), c=w.currentExerciseId
  w=change(w,x=>m.timerAction(x,c,'start',at));w=change(w,x=>{x.timers[c].correctedSeconds='2';m.completeCardio(x,c,at+5000)})
  const first=w.snapshot.cardioResults[0];assert.equal(first.result.timerMs,5000);assert.equal(first.result.activeMs,2000);assert.equal(first.result.corrected,true)
  w=change(w,x=>m.undoCardio(x,first.id));w=change(w,x=>m.completeCardio(x,c,at+6000))
  assert.notEqual(w.snapshot.cardioResults[0].id,first.id);assert.deepEqual(w.cancelled.cardio,[first]);assert.deepEqual(w.snapshot.deletedCardioResultIds,[])
})
test('unfinished cardio is never automatically SKIPPED; invalid measurements and clock reversal preserve originals',()=>{
  let w=cardio(), c=w.currentExerciseId;w=change(w,x=>m.timerAction(x,c,'start',at))
  const before=structuredClone(w)
  for(const patch of [{distance:'0.000001'},{distance:'1000.000001'},{bpm:'301'},{correctedSeconds:'86401'}]){
    assert.throws(()=>change(w,x=>{Object.assign(x.timers[c],patch);m.completeCardio(x,c,at+1000)}));assert.deepEqual(w,before)
  }
  assert.throws(()=>change(w,x=>m.timerAction(x,c,'pause',at-1)));assert.equal(w.snapshot.cardioResults.length,0)
  w=change(w,x=>m.timerAction(x,c,'pause',at+1000));assert.throws(()=>change(w,x=>m.timerAction(x,c,'start',at+500)))
})
test('navigation prioritizes original unfinished exercises without reordering any stored plan',()=>{
  let w=change(local(),x=>m.addWeight(x,EXERCISE,'추가')), added=w.currentExerciseId
  const order=structuredClone(w.snapshot.appliedPlan), revision=w.localRevision
  assert.equal(m.exerciseList(w)[0].id,E);w=change(w,x=>{x.currentExerciseId=E})
  assert.deepEqual(w.snapshot.appliedPlan,order);assert.equal(w.localRevision,revision);assert.equal(w.snapshot.appliedPlan.weightExercises[1].sessionExerciseId,added)
})

async function editor(options={}) {
  let stored=local(), fail=false, gateWrite=null, allowed=true, held=true
  const store={readLocal:async()=>structuredClone(stored),openLocal:async()=>structuredClone(stored),saveLocal:async(next,expected,guard)=>{
    if(gateWrite)await gateWrite.promise
    if(fail)throw new LocalStoreError()
    if(!guard()||!allowed||expected!==stored.editVersion)throw new LocalWriteBlocked()
    stored=structuredClone(next)
  },...options.store}
  const c=new LocalWorkoutController(store,()=>allowed,options.acquire??(async()=>({held:()=>held,release:()=>{held=false}})))
  await c.open(session(),policy)
  return {c,store,stored:()=>stored,fail:v=>fail=v,gate:g=>gateWrite=g,allow:v=>allowed=v}
}
test('completion success waits for durable commit: no optimistic completion, rest or revision',async()=>{
  const e=await editor(), disk=gate();e.gate(disk)
  const saving=e.c.change(x=>{m.editDraft(x,E,1,{reps:'8',weight:'0'});m.completeSet(x,E,1,at)})
  await settle();assert.equal(e.c.getSnapshot().workout.snapshot.performedSets.length,0);assert.equal(e.c.getSnapshot().workout.localRevision,'0');assert.equal(e.c.getSnapshot().workout.rest,null)
  disk.resolve();assert.equal(await saving,true);assert.equal(e.c.getSnapshot().workout.snapshot.performedSets.length,1);assert.equal(e.stored().localRevision,'1');e.c.stop()
})
test('IndexedDB failure leaves completion, rest and revision unconfirmed while retaining input draft',async()=>{
  const e=await editor();e.c.draft(E,1,{weight:'00062.500000',reps:'9'});await e.c.settled();e.fail(true)
  assert.equal(await e.c.complete(x=>m.completeSet(x,E,1,at)),false)
  assert.equal(e.c.getSnapshot().workout.snapshot.performedSets.length,0);assert.equal(e.stored().localRevision,'0');assert.equal(e.stored().drafts[E+':1'].weight,'00062.500000');assert.equal(e.c.getSnapshot().workout.rest,null);e.c.stop()
})
test('failed unsaved draft cannot complete older values; retry preserves multiple slot inputs',async()=>{
  const e=await editor();e.fail(true);e.c.draft(E,1,{weight:'65.',reps:'9'});await e.c.settled()
  e.fail(false);e.c.draft(E,2,{weight:'60',reps:'10'});await e.c.settled();assert.equal(e.c.getSnapshot().unsavedDrafts,true)
  await e.c.retryDrafts();assert.equal(e.c.getSnapshot().unsavedDrafts,false);assert.equal(e.stored().drafts[E+':1'].weight,'65.')
  e.fail(true);e.c.draft(E,1,{weight:'67.5',reps:'11'});await e.c.settled();assert.equal(await e.c.complete(x=>m.completeSet(x,E,1,at)),false)
  assert.equal(e.stored().snapshot.performedSets.length,0);e.fail(false);assert.equal(await e.c.complete(x=>m.completeSet(x,E,1,at)),true)
  assert.equal(e.stored().snapshot.performedSets[0].weightKg,'67.5');e.c.stop()
})
test('cardio drafts survive failed saves and navigation, and exit waits for all queued input',async()=>{
  const w=cardio(), c=w.currentExerciseId
  const e=await editor({store:{openLocal:async()=>structuredClone(w)}})
  // Seed the test store with the same checkpoint before testing write failures.
  let stored=structuredClone(w), failed=true, disk=gate()
  e.store.saveLocal=async(next,expected,guard)=>{if(disk)await disk.promise;if(failed)throw new LocalStoreError();assert.equal(expected,stored.editVersion);assert.ok(guard());stored=structuredClone(next)}
  e.c.cardioDraft(c,{distance:'0001.250000',bpm:'120'});await settle()
  let exited=false;const flushing=e.c.flushDrafts().then(value=>{exited=true;return value})
  await settle();assert.equal(exited,false);disk.resolve();assert.equal(await flushing,false)
  assert.equal(e.c.getSnapshot().cardioDrafts[c].distance,'0001.250000');assert.equal(e.c.getSnapshot().unsavedDrafts,true)
  disk=null;failed=false;assert.equal(await e.c.flushDrafts(),true);assert.equal(stored.timers[c].distance,'0001.250000');assert.equal(stored.timers[c].bpm,'120');assert.equal(e.c.getSnapshot().unsavedDrafts,false);e.c.stop()
})
test('queued completions serialize against the last commit with strictly increasing revision',async()=>{
  const e=await editor();const results=await Promise.all([1,2,3,4].map(n=>e.c.change(x=>{m.editDraft(x,E,n,{weight:'0',reps:String(n)});m.completeSet(x,E,n,at+n)})))
  assert.deepEqual(results,[true,true,true,true]);assert.equal(e.stored().localRevision,'4');assert.equal(e.stored().snapshot.performedSets.length,4);e.c.stop()
})
test('logout/auth boundary during a pending write stops commit success and keeps the existing owner data',async()=>{
  const e=await editor(), disk=gate();e.gate(disk);const saving=e.c.change(x=>{m.editDraft(x,E,1,{weight:'0',reps:'8'});m.completeSet(x,E,1,at)})
  await settle();e.allow(false);disk.resolve();assert.equal(await saving,false);assert.equal(e.stored().snapshot.performedSets.length,0);assert.equal(e.c.getSnapshot().writable,false);e.c.stop()
})
test('unsupported locks and a second tab both remain read only without optimistic fallback',async()=>{
  assert.equal(await acquireEditor(local(),null),null)
  for(const acquire of [async()=>null,async()=>({held:()=>false,release(){}})]){
    const e=await editor({acquire});assert.equal(e.c.getSnapshot().writable,false);assert.equal(await e.c.change(x=>m.updateTargets(x,E,4,6,10)),false);assert.equal(e.stored().localRevision,'0');e.c.stop()
  }
  assert.equal(editorLockName(local()),editorLockName({...local(),writerEpoch:'9',editorDeviceId:OTHER}))
  assert.notEqual(editorLockName(local()),editorLockName({...local(),dataGeneration:'1'}));assert.notEqual(editorLockName(local()),editorLockName({...local(),userId:OTHER}))
})
test('StrictMode setup-cleanup-setup cannot revive an obsolete acquisition or lose the active lease',async()=>{
  let stored=local(), held=false
  const acquire=async()=>{assert.equal(held,false);held=true;return{held:()=>held,release(){held=false}}}
  const c=new LocalWorkoutController({readLocal:async()=>stored,openLocal:async()=>stored,saveLocal:async v=>{stored=v}},()=>true,acquire)
  const first=c.open(session(),policy);c.stop();const second=c.open(session(),policy);await Promise.all([first,second]);assert.equal(c.getSnapshot().writable,true);c.stop();assert.equal(held,false)
})
test('workout expiry is an in-memory local capability; explicit logout and account change revoke it',async()=>{
  let owner=USER, expired=false
  const api={session:async()=>owner?{userId:owner}:null,refreshCsrf:async()=>{},workoutRequest:async()=>{if(expired)throw new AuthError('AUTHENTICATION_REQUIRED',401);return{status:200,data:{}}},logout:async()=>{owner=null}}
  const auth=new AuthController(api,()=>at,()=>{});await auth.start();expired=true
  await assert.rejects(()=>auth.workoutRequest(USER,'/api/v1/workout-sessions/active','GET',undefined,new AbortController().signal))
  assert.equal(auth.getSnapshot().localWorkoutUserId,USER);assert.equal(auth.getSnapshot().status,'unavailable')
  owner=OTHER;await auth.restore();assert.equal(auth.getSnapshot().localWorkoutUserId,null);assert.equal(auth.getSnapshot().userId,OTHER)
  owner=USER;await auth.restore();await auth.logout();assert.equal(auth.getSnapshot().localWorkoutUserId,null)
  await auth.restore();assert.equal(auth.getSnapshot().localWorkoutUserId,null)
})
test('cross-tab logout revokes access immediately; a later null session does not grant local access',async()=>{
  let owner=USER
  const auth=new AuthController({session:async()=>owner?{userId:owner}:null,refreshCsrf:async()=>{}},()=>at,()=>{})
  await auth.start();auth.invalidateLocalWorkoutAccess();assert.equal(auth.getSnapshot().userId,null);assert.equal(auth.getSnapshot().localWorkoutUserId,null)
  owner=null;await auth.restore();assert.equal(auth.getSnapshot().localWorkoutUserId,null)
})
test('OTP reauthentication clears expired local access for both the same account and a different account',async()=>{
  for(const nextOwner of [USER,OTHER]){
    let owner=USER
    const api={session:async()=>owner?{userId:owner}:null,refreshCsrf:async()=>{},workoutRequest:async()=>{throw new AuthError('AUTHENTICATION_REQUIRED',401)},requestOtp:async()=>OTHER,verifyOtp:async()=>{owner=nextOwner}}
    const auth=new AuthController(api,()=>at,()=>{});await auth.start();await assert.rejects(()=>auth.workoutRequest(USER,'/api/v1/workout-sessions/active','GET',undefined,new AbortController().signal))
    owner=null;await auth.restore();assert.equal(auth.getSnapshot().localWorkoutUserId,USER)
    await auth.requestOtp('fixture@example.test');await auth.verifyOtp('123456')
    assert.equal(auth.getSnapshot().status,'authenticated');assert.equal(auth.getSnapshot().userId,nextOwner);assert.equal(auth.getSnapshot().localWorkoutUserId,null)
  }
})
test('operational local editor imports neither demo model/storage nor a snapshot sender',()=>{
  for(const name of ['model.ts','controller.ts','LocalWorkoutScreen.tsx','types.ts','validation.ts','lock.ts']){
    const source=readFileSync(new URL('../src/features/workout-local/'+name,import.meta.url),'utf8')
    assert.doesNotMatch(source,/workout\/(?:model|storage|useWorkout|cardio)|overload\.core\.v1|localStorage\s*[.[]|(?:api|transport)\.snapshot\(|\.finish\(|\bfetch\(/)
  }
})
