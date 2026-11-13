import assert from 'node:assert/strict'
import { test } from 'node:test'
import { flowWeights, flowCardio, inputDraft, isWeightDone, plannedOrdinals } from '../src/features/workout-local/flow-data.ts'
import { createLocalWorkout, addWeight, applyLocalChange, editDraft, completeSet, undoSet, addCardio, timerAction } from '../src/features/workout-local/model.ts'
import { summaryData, setVolume } from '../src/features/workout-online/summary-data.ts'
import { localWorkout } from '../src/features/workout-local/validation.ts'
import { session, bootstrap, SESSION_EXERCISE as E, EXERCISE, OTHER } from './fixtures/workout-online-data.mjs'
const local=()=>createLocalWorkout(session(),bootstrap.settings)
const state=w=>({workout:w,drafts:{},cardioDrafts:{},memos:{},writable:true})
const at=Date.parse(session().startedAt)+1000
test('applied order and stable exercise IDs survive mapping, completion and navigation',()=>{
  let w=local();addWeight(w,EXERCISE,'추가',()=>OTHER)
  w.snapshot.appliedPlan.weightExercises.reverse();w.currentExerciseId=E
  editDraft(w,E,1,{reps:'8'});completeSet(w,E,1,at)
  assert.deepEqual(flowWeights(state(w)).map(e=>e.id),[OTHER,E])
  assert.equal(w.currentExerciseId,E);assert.equal(flowWeights(state(w))[1].sets[0].result.reps,8)
  assert.equal(isWeightDone(flowWeights(state(w))[1]),false)
})
test('recent real records match equipment and preserve explicitly empty or pending input',()=>{
  const w=local(), previous=session({status:'FINISHED',endedAt:new Date(at).toISOString()})
  previous.snapshot.state.performedSets=[{id:OTHER,sessionExerciseId:E,ordinal:1,weightKg:'60',reps:9,completedAt:new Date(at).toISOString(),weightContext:{kind:'TODAY_ONLY',requestId:null},manufacturerId:null,loadType:null}]
  assert.equal(inputDraft(w,E,1,[previous]).reps,'9')
  editDraft(w,E,1,{reps:''});assert.equal(inputDraft(w,E,1,[previous]).reps,'')
  const view=flowWeights({...state(w),drafts:{[E+':1']:{weight:'62.',reps:'0011'}}},[previous])[0]
  assert.equal(view.sets[0].draft.reps,'0011');assert.equal(view.sets[0].previous.reps,'9')
  previous.snapshot.state.performedSets[0].loadType='BODYWEIGHT'
  assert.equal(flowWeights(state(w),[previous])[0].sets[0].previous,undefined)
})
test('sparse exclusions never renumber completed ordinals and huge counts stay bounded',()=>{
  const w=local();w.excludedSetOrdinals={[E]:[2]};w.snapshot.appliedPlan.weightExercises[0].setCount=2
  editDraft(w,E,3,{reps:'8'});completeSet(w,E,3,at)
  assert.deepEqual(plannedOrdinals(w,E),[1,3])
  w.snapshot.appliedPlan.weightExercises[0].setCount=2147483647
  const view=flowWeights(state(w))[0];assert.equal(view.plannedCount,2147483647)
  assert.equal(view.sets.length,21);assert.equal(isWeightDone(view),false);assert.ok(localWorkout(w))
})
test('acknowledged snapshots and local memo do not invent a server memo contract',()=>{
  const w=local();w.equipmentMemos[E]='기기 내 메모'
  assert.equal(flowWeights(state(w))[0].memo,'기기 내 메모')
  assert.equal(flowWeights({...state(w),memos:{[E]:'아직 저장하지 못한 입력'}})[0].memo,'아직 저장하지 못한 입력')
  const next=applyLocalChange(w,x=>{x.equipmentMemos[E]='최신 메모';x.currentExerciseId=E})
  assert.equal(next.localRevision,w.localRevision);assert.deepEqual(next.snapshot,w.snapshot)
})
test('confirmed undo exposes original draft and a new completion uses a new UUID',()=>{
  const w=local();editDraft(w,E,1,{weight:'62.500000',reps:'0009'});completeSet(w,E,1,at,()=>OTHER)
  w.presence[OTHER]='SERVER_CONFIRMED';undoSet(w,OTHER)
  const row=flowWeights(state(w))[0].sets[0]
  assert.equal(row.result,undefined);assert.equal(row.draft.reps,'0009');assert.deepEqual(w.snapshot.deletedPerformedSetIds,[OTHER])
})
test('bodyweight volume uses explicit extra only and never loses decimal precision',()=>{
  const w=local();editDraft(w,E,1,{weight:'99999999999999.999999',reps:'2147483647'});completeSet(w,E,1,at)
  const set=w.snapshot.performedSets[0]
  assert.equal(setVolume(set),'214748364699999999997852.516353')
  set.loadType='BODYWEIGHT';assert.equal(setVolume(set),null)
  set.bodyweightLoad={additionalWeightKg:'0'};assert.equal(setVolume(set),'0')
  set.bodyweightLoad={additionalWeightKg:'0.000001'};assert.equal(setVolume(set),'2147.483647')
})
test('server summary uses current evaluation, actual end and preserves skipped cardio as unperformed',()=>{
  const w=local();addCardio(w,{kind:'OUTDOOR',name:'걷기',targetSeconds:60,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null},()=>OTHER)
  const server=session({status:'AUTO_CLOSED',closedAt:new Date(at).toISOString()});server.snapshot.state=w.snapshot
  server.snapshot.state.cardioResults=[{id:crypto.randomUUID(),sessionActivityId:OTHER,status:'SKIPPED',startedAt:null,occurredAt:new Date(at).toISOString(),result:null}]
  const mapped=summaryData(server,{currentAssessment:{state:'EXCLUDED',evaluation:null}})
  assert.equal(mapped.elapsed,undefined);assert.equal(mapped.whole,false);assert.equal(mapped.cardio[0].phase,'skipped')
  assert.equal(mapped.cardio[0].result,undefined);assert.equal(flowCardio(state(w),at)[0].phase,'skipped')
})

test('cardio START newer than the render clock cannot crash the approved UI',()=>{
  const w=local();addCardio(w,{kind:'OUTDOOR',name:'걷기',targetSeconds:60,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null},()=>OTHER)
  timerAction(w,OTHER,'start',at)
  assert.equal(flowCardio(state(w),at-200)[0].activeMs,0)
  assert.equal(flowCardio(state(w),at+1000)[0].activeMs,1000)
  assert.throws(()=>timerAction(w,OTHER,'pause',at-1))
  assert.equal(w.timers[OTHER].runningSince,new Date(at).toISOString())
})
