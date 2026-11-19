import {test} from 'node:test'
import assert from 'node:assert/strict'
import {session} from './fixtures/workout-online-data.mjs'
import {createLocalWorkout, startExercise, exerciseRest} from '../src/features/workout-local/model.ts'
import {weightVisibility,settleWeightClock,resumeWeightClock,recoverWeightClock,measuredWeightMs,observedWeightMs} from '../src/features/workout-local/weight-timing.ts'
import {weightTiming} from '../src/features/workout-online/validation.ts'
import {homeRecordTime} from '../src/components/record-time.ts'
const at=Date.parse('2026-10-31T12:00:00Z')
const make=()=>createLocalWorkout(session(),{restLowSeconds:180,restMediumSeconds:120,restHighSeconds:90})
const change=(w,t,fn)=>{settleWeightClock(w,at+t);fn();resumeWeightClock(w,at+t)}
test('measures only active weight screen; excludes warmup, rest, cardio, hidden time and completed slots',()=>{
 const w=make();weightVisibility(w,true,at);resumeWeightClock(w,at)
 change(w,5000,()=>{w.warmupCompleted=true})
 assert.equal(observedWeightMs(w, at + 10000), 0)
 change(w,10000,()=>startExercise(w, w.currentExerciseId, at + 10000))
 change(w,20000,()=>{w.rests[w.currentExerciseId]={startedAt:new Date(at+20000).toISOString(),endsAt:new Date(at+50000).toISOString(),seconds:30,sessionExerciseId:w.currentExerciseId,ordinal:1}})
 change(w,40000,()=>{exerciseRest(w).endsAt=new Date(at+55000).toISOString()})
 assert.equal(observedWeightMs(w, at + 54000), 10000)
 assert.equal(observedWeightMs(w, at + 60000), 15000)
 change(w,65000,()=>{w.currentExerciseId='cardio'})
 change(w,80000,()=>{w.currentExerciseId=w.initialPlan.weightExercises[0].sessionExerciseId})
 change(w,90000,()=>weightVisibility(w,false,at+90000))
 change(w,120000,()=>weightVisibility(w,true,at+120000))
 change(w,125000,()=>{w.finish={endedAt:new Date(at+125000).toISOString(),snapshot:structuredClone(w.snapshot)}})
 assert.equal(measuredWeightMs(w),35000)
 assert(weightTiming(w.snapshot.weightTiming))
 assert.equal(w.weightClock.runningSince,null)
})
test('missing and interrupted coverage remain unknown; backward device time cannot silently change it',()=>{
 const w=make();assert.equal(measuredWeightMs(w),null)
 weightVisibility(w,true,at);w.warmupCompleted=true;startExercise(w,w.currentExerciseId,at);resumeWeightClock(w,at)
 settleWeightClock(w,at+10000);resumeWeightClock(w,at+10000)
 assert.throws(()=>settleWeightClock(w,at+9999))
 recoverWeightClock(w,at+60000);assert.equal(measuredWeightMs(w),null);assert.equal(w.snapshot.weightTiming.complete,false)
 assert.equal(weightTiming({schemaVersion:1,complete:true,intervals:[{startedAt:new Date(at).toISOString(),endedAt:new Date(at).toISOString()}]}),false)
})
test('home timestamp is compact but still comes from the stored instant and timezone',()=>{
 assert.equal(homeRecordTime('2026-11-09T09:32:00Z','Asia/Seoul','2026-11-09'),'11.09 월 18시')
 assert.equal(homeRecordTime(null,'Asia/Seoul','2026-11-09'),'2026-11-09 · 시각 미확인')
})

test('taking over a server measurement without its local clock leaves missing coverage unknown',()=>{
 const w=make();w.serverRevision='2';w.snapshot.weightTiming={schemaVersion:1,complete:true,intervals:[]}
 weightVisibility(w,true,at);assert.equal(w.snapshot.weightTiming.complete,false);assert.equal(measuredWeightMs(w),null)
})
