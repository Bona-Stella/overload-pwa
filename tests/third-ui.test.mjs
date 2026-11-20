import assert from 'node:assert/strict'
import { test } from 'node:test'
import { durationParts, durationSeconds } from '../src/components/duration.ts'
import { referenceIncrease } from '../src/features/workout-online/reference-reminder.ts'
import { reviewIncreaseReminder, startReview, sessionAdvice } from './fixtures/review/workout-model.ts'
import { routine, session, scope, SESSION_EXERCISE, OTHER } from './fixtures/workout-online-data.mjs'

test('duration wheels round-trip milliseconds, zero, minutes, hours and the existing 24-hour limit',()=>{
  for(const value of ['0','0.001','59.999','1230','1230.125','3600','86399.999','86400'])assert.equal(durationSeconds(durationParts(value)),value)
  assert.deepEqual(durationParts('1230'),{hours:'0',minutes:'20',seconds:'30'})
  for(const parts of [{hours:'0',minutes:'60',seconds:'0'},{hours:'0',minutes:'0',seconds:'60'},{hours:'24',minutes:'0',seconds:'0.001'},{hours:'1.5',minutes:'0',seconds:'0'}])assert.throws(()=>durationSeconds(parts))
})

function reference(reps=[10,10,10],id=OTHER,endedAt='2026-11-01T10:00:00Z') {
  const s=session({id,status:'FINISHED',endedAt,version:'2'})
  s.snapshot.state.performedSets=reps.map((reps,i)=>({id:id.slice(0,-1)+(i+3),sessionExerciseId:SESSION_EXERCISE,ordinal:i+1,reps,weightKg:routine.weightPlacements[0].approvedWeightKg,manufacturerId:null,loadType:null,completedAt:endedAt,weightContext:{kind:'INITIAL_APPROVED'}}))
  const e={sessionExerciseId:SESSION_EXERCISE,eligible:true,reasonCodes:[],comparisonContext:{routineId:routine.id,sourcePlacementId:routine.weightPlacements[0].id,standardExerciseId:routine.weightPlacements[0].standardExerciseId,plannedSetCount:3,minReps:6,maxReps:10,approvedWeightKg:routine.weightPlacements[0].approvedWeightKg,unit:'KG'},evaluatedPerformedSetIds:s.snapshot.state.performedSets.map(f=>f.id),evaluatedReps:reps,repsSum:String(reps.reduce((a,b)=>a+b,0)),benchmarkEvidence:null,advice:reps.every(r=>r>=10)?'INCREASE':'MAINTAIN',adviceReason:'test'}
  return {session:s,assessment:{...scope,sessionId:s.id,status:s.status,version:s.version,currentAssessment:{state:'EVALUATED',reasonCodes:[],advice:null,evaluation:{sessionVersion:s.version,overallWeightPlanComplete:true,exercises:[e]}}}}
}
const current=()=>{const s=session({startedAt:'2026-11-02T10:00:00Z'});return {...s,snapshot:s.snapshot.state}}
const reminder=(records,now=current(),r=routine)=>referenceIncrease(now,SESSION_EXERCISE,r.weightPlacements[0].approvedWeightKg,r,records)

test('reference reappears before the next session records any set, and is read-only',()=>{
  const records=[reference()],now=current(),before=structuredClone({now,records,routine})
  assert.equal(reminder(records,now).sessionId,OTHER)
  assert.deepEqual({now,records,routine},before)
  assert.equal(now.snapshot.performedSets.length,0)
})

test('reference chooses one highest comparable session and never merges set maxima or filters to qualifying sessions first',()=>{
  assert.equal(reminder([reference([10,10,10]),reference([20,9,9],'a0000000-1111-4222-8333-000000000002')]),null)
  assert.equal(reminder([reference([12,9,9]),reference([9,12,9],'a0000000-1111-4222-8333-000000000002')]),null)
  assert.equal(reminder([reference([10,10,10]),reference([11,11,11],'a0000000-1111-4222-8333-000000000002')]).sum,33n)
})

test('equal references use real nanosecond end time and UUID in the existing order',()=>{
  const a=reference([10,10,10],OTHER,'2026-11-01T10:00:00.000000001Z'),b=reference([10,10,10],'a0000000-1111-4222-8333-000000000002','2026-11-01T10:00:00.000000002Z')
  assert.equal(reminder([a,b]).sessionId,b.session.id)
  b.session.endedAt=a.session.endedAt
  assert.equal(reminder([b,a]).sessionId,a.session.id)
})

test('changed current approval, plan, placement, equipment and generation cannot revive a stale reminder',()=>{
  const changed=structuredClone(routine);changed.weightPlacements[0].approvedWeightKg='25'
  assert.equal(reminder([reference()],current(),changed),null)
  for(const mutate of [s=>s.initialPlan.weightExercises[0].sourcePlacementId=OTHER,s=>s.snapshot.appliedPlan.weightExercises[0].setCount=2,s=>s.snapshot.appliedPlan.weightExercises[0].loadType='PLATE',s=>s.dataGeneration='1']){
    const now=current();mutate(now);assert.equal(reminder([reference()],now),null)
  }
})

test('deleted, auto-closed, future, incomplete, stale evaluation and mismatched performed evidence remain excluded',()=>{
  for(const mutate of [r=>r.session.deletedAt=r.session.endedAt,r=>r.session.status='AUTO_CLOSED',r=>r.session.endedAt='2026-11-03T10:00:00Z',r=>r.assessment.currentAssessment.evaluation.overallWeightPlanComplete=false,r=>r.assessment.version='1',r=>r.assessment.currentAssessment.evaluation.exercises[0].eligible=false,r=>r.session.snapshot.state.performedSets[0].reps=9]){
    const record=reference();mutate(record);assert.equal(reminder([record]),null)
  }
})

test('review-only reminder uses the same routine placement and does not change its session assessment or approval',()=>{
  const r=structuredClone(routine);r.weightPlacements[0].approvedWeightKg='25'
  const old=startReview(r,false,1,[]);old.warmup=false
  old.weights[0].sets.forEach(s=>s.result={kg:'25',reps:10,mode:'approved',manufacturerId:null,loadType:null})
  const next=startReview(r,false,3,[]),records=[{session:old,endedAt:2}],before=structuredClone({next,records})
  assert.equal(reviewIncreaseReminder(next,next.weights[0],records).kg,'25')
  assert.equal(sessionAdvice(old,old.weights[0],true).advice,'increase')
  assert.deepEqual({next,records},before)
  next.weights[0].approved='30';assert.equal(reviewIncreaseReminder(next,next.weights[0],records),null)
})
