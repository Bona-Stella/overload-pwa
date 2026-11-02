import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as model from '../src/features/workout-local/model.ts'
import * as sync from '../src/features/workout-local/sync-state.ts'
import { localWorkout } from '../src/features/workout-local/validation.ts'
import { snapshot } from '../src/features/workout-online/validation.ts'
import { sameRecord, recoveryRows, closedWriteFact } from '../src/features/workout-online/closed-model.ts'
import { additionalLoadInput, bodyweightLoadLabel } from '../src/features/workout-online/bodyweight-load.ts'
import { session, bootstrap, SESSION_EXERCISE as E, scope } from './fixtures/workout-online-data.mjs'

const at=Date.parse('2026-10-31T12:10:00Z')
const local=()=>{const s=session();s.initialPlan.weightExercises[0].loadType='BODYWEIGHT';s.snapshot.state.appliedPlan.weightExercises[0].loadType='BODYWEIGHT';return model.createLocalWorkout(s,bootstrap.settings)}
const complete=(w,additionalWeight)=>model.applyLocalChange(w,x=>{model.editDraft(x,E,1,{weight:'80',reps:'8',...(additionalWeight!==undefined?{additionalWeight}:{})});model.completeSet(x,E,1,at)})

test('ordinary and legacy BODYWEIGHT values never initialize additional load or invent body mass',()=>{
  const w=complete(local()), p=w.snapshot.performedSets[0]
  assert.equal(p.weightKg,'80');assert.equal(p.bodyweightLoad,undefined);assert.ok(localWorkout(w))
  assert.match(bodyweightLoadLabel(p),/근거 없음/);assert.doesNotMatch(JSON.stringify(p),/additionalWeight|bodyMass/)
  const s=session();s.snapshot.state=w.snapshot;s.snapshot.recordedContexts=[]
  const reopened=model.createLocalWorkout(s,bootstrap.settings);assert.equal(model.draftFor(reopened,E,2).additionalWeight,undefined)
})
test('explicit extra keeps decimal precision and approval context independent of recorded weight',()=>{
  const base=local(), initial=structuredClone(base.initialPlan), w=complete(base,'00010.000001'), p=w.snapshot.performedSets[0]
  assert.deepEqual(p.bodyweightLoad,{additionalWeightKg:'10.000001'});assert.equal(p.weightKg,'80');assert.equal(p.reps,8)
  assert.deepEqual(w.initialPlan,initial);assert.deepEqual(w.snapshot.approvalRequests,[]);assert.equal(p.weightContext.kind,'TODAY_ONLY')
  assert.equal(w.drafts[E+':1'].additionalWeight,'00010.000001');assert.ok(localWorkout(w));assert.match(bodyweightLoadLabel(p),/10\.000001 kg/)
  assert.equal(complete(base,'0').snapshot.performedSets[0].bodyweightLoad.additionalWeightKg,'0')
  for(const value of ['-1','1e2','100000000000000','0.0000001'])assert.throws(()=>complete(base,value))
})
test('undo and re-completion retain explicit input and original UUID evidence without overwriting cancelled facts',()=>{
  let w=complete(local(),'12.500000'), original=structuredClone(w.snapshot.performedSets[0])
  w=model.applyLocalChange(w,x=>model.undoSet(x,original.id));assert.deepEqual(w.cancelled.sets,[original]);assert.equal(w.drafts[E+':1'].additionalWeight,'12.500000')
  w=model.applyLocalChange(w,x=>model.completeSet(x,E,1,at+1));assert.notEqual(w.snapshot.performedSets[0].id,original.id);assert.deepEqual(w.snapshot.performedSets[0].bodyweightLoad,original.bodyweightLoad)
  assert.deepEqual(w.cancelled.sets,[original]);assert.ok(localWorkout(w))
})
test('old schema2 and fixed requests remain byte-identical while optional extra survives snapshot and finish sealing',()=>{
  for(const extra of [undefined,'10']){
    let w=complete(local(),extra);w=model.applyLocalChange(w,sync.sealSnapshot);const frozen=w.pendingSnapshot.requestJson
    assert.ok(localWorkout(w));assert.equal(frozen,JSON.stringify(w.pendingSnapshot.request));assert.equal(frozen.includes('bodyweightLoad'),extra!==undefined)
    const roundTrip=JSON.parse(JSON.stringify(w));assert.ok(localWorkout(roundTrip));assert.equal(roundTrip.pendingSnapshot.requestJson,frozen)
    w=model.applyLocalChange(w,x=>sync.intendFinish(x,at+1));assert.deepEqual(w.finish.snapshot.performedSets[0].bodyweightLoad,w.snapshot.performedSets[0].bodyweightLoad)
  }
})
test('guards reject malformed or non-bodyweight evidence without changing valid legacy documents',()=>{
  const valid=complete(local(),'10');assert.ok(snapshot(valid.snapshot))
  for(const extra of [null,{},[],{additionalWeightKg:10},{additionalWeightKg:'-1'},{additionalWeightKg:'10',bodyMass:'80'}]){
    const bad=structuredClone(valid);bad.snapshot.performedSets[0].bodyweightLoad=extra;assert.equal(localWorkout(bad),false)
  }
  for(const load of [null,'PLATE','STACK','DUMBBELL']){const bad=structuredClone(valid);bad.snapshot.performedSets[0].loadType=load;assert.equal(snapshot(bad.snapshot),false)}
  const clear=structuredClone(valid);clear.snapshot.performedSets[0].bodyweightLoad={additionalWeightKg:null};assert.ok(localWorkout(clear))
})
test('recovery detects added, changed and omitted extra evidence and preserves deleted records',()=>{
  const w=complete(local(),'10'), record=w.snapshot.performedSets[0], server=session({status:'FINISHED',endedAt:new Date(at+1).toISOString()});server.snapshot.state=structuredClone(w.snapshot)
  const changes={events:[]};assert.equal(recoveryRows(w,server,changes)[0].state,'PRESENT')
  server.snapshot.state.performedSets[0].bodyweightLoad.additionalWeightKg='11';assert.equal(sameRecord(record,server.snapshot.state.performedSets[0]),false);assert.equal(recoveryRows(w,server,changes)[0].state,'VALUE_CONFLICT')
  delete server.snapshot.state.performedSets[0].bodyweightLoad;assert.equal(recoveryRows(w,server,changes)[0].state,'VALUE_CONFLICT')
  server.snapshot.state.performedSets=[];assert.equal(recoveryRows(w,server,changes)[0].state,'CANDIDATE')
  server.snapshot.state.deletedPerformedSetIds=[record.id];assert.equal(recoveryRows(w,server,changes)[0].state,'DELETED')
})
test('explicit correction and clear are preserved and a lost ACK is verified from structured audit evidence',()=>{
  assert.deepEqual(additionalLoadInput('10.000000'),{additionalWeightKg:'10'});assert.deepEqual(additionalLoadInput(''),{additionalWeightKg:null})
  for(const additionalWeightKg of ['10',null]){
    const w=complete(local(),'5'), p=w.snapshot.performedSets[0], correction={id:p.id,weightKg:'80',reps:8,bodyweightLoad:{additionalWeightKg}}
    const body={dataGeneration:scope.dataGeneration,expectedVersion:'2',setCorrections:[correction],cardioCorrections:[],deletedPerformedSetIds:[],deletedCardioResultIds:[]}
    const write={...scope,sessionId:w.sessionId,kind:'records',body,requestJson:JSON.stringify(body),status:'PENDING'}
    const event={recordKind:'SET',recordId:p.id,changeKind:'CORRECTED',after:{...p,...structuredClone(correction)},changeContext:{sessionVersion:'3'}}
    assert.equal(closedWriteFact(write,session(),{events:[event]}),true)
    event.after.bodyweightLoad={additionalWeightKg:'99'};assert.equal(closedWriteFact(write,session(),{events:[event]}),false)
    assert.equal(write.requestJson,JSON.stringify(body))
  }
})
