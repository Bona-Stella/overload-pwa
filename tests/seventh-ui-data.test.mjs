import {test} from 'node:test'
import assert from 'node:assert/strict'
import {sessionAchievement} from '../src/features/home/achievement.ts'
import {recordTime,compactRecordTime} from '../src/components/record-time.ts'
import {session,SESSION_EXERCISE,OTHER} from './fixtures/workout-online-data.mjs'
test('recent records count completed initial-plan exercises independently and exclude added exercises',()=>{
 const s=session(),p=s.initialPlan.weightExercises[0]
 s.initialPlan.weightExercises.push({...p,sessionExerciseId:OTHER})
 s.snapshot.state.performedSets=[...Array.from({length:3},(_,i)=>({sessionExerciseId:SESSION_EXERCISE,ordinal:i+1})),...Array.from({length:8},(_,i)=>({sessionExerciseId:'added',ordinal:i+1}))]
 const plan={kind:'TREADMILL',name:'러닝',targetSeconds:600,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null}
 s.initialPlan.cardioActivities=[{sessionActivityId:'a',plan},{sessionActivityId:'b',plan}]
 s.snapshot.state.cardioResults=[{sessionActivityId:'a',status:'COMPLETED',result:{activeMs:600000,distanceKm:null}},{sessionActivityId:'added',status:'COMPLETED',result:{activeMs:900000,distanceKm:null}}]
 assert.deepEqual(sessionAchievement(s),{weight:{planned:2,completed:1,unknown:0},cardio:{planned:2,completed:1,unknown:0},state:'incomplete'})
 s.snapshot.state.performedSets.push({sessionExerciseId:OTHER,ordinal:1})
 assert.equal(sessionAchievement(s).weight.completed,1)
})
test('detail compacts the real record timestamp without inventing missing times',()=>{
 const full=recordTime('2026-11-15T10:00:00Z','Asia/Seoul','2026-11-15')
 assert.equal(full,'2026-11-15 · 일요일 · 19:00')
 assert.equal(compactRecordTime(full),'11/15 · 일 · 19:00')
 assert.equal(compactRecordTime(recordTime(null,'Asia/Seoul','2026-11-15')),'2026-11-15 · 시각 미확인')
})
