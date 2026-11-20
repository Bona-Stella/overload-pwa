import {addDays} from '../src/features/home/model.ts'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {captureReview,startReview} from './fixtures/review/workout-model.ts'
import {reviewRecordSession,recordPreviewData} from './fixtures/review/record-data.ts'
import {recordRows} from '../src/features/history/record-feed.ts'
import {historicalReviews} from '../src/features/workout-online/summary-data.ts'
import {reviewSample,reviewToday} from './fixtures/review/routine-samples.ts'
import {session,SESSION_EXERCISE} from './fixtures/workout-online-data.mjs'

function finished(){
 const data=reviewSample('normal'),s=startReview(data.routines[0],false,Date.parse(reviewToday+'T10:00:00Z'),[])
 for(const w of s.weights)for(const row of w.sets)row.result={kg:w.approved,reps:w.max,mode:'approved',at:s.startedAt+60000,manufacturerId:w.manufacturerId,loadType:w.loadType,additionalKg:null}
 return {data,s}
}
test('new preview records use the same fact-backed session card inputs, without mutating the captured record',()=>{
 const {s}=finished(),record=captureReview(s,s.startedAt+60000,reviewToday),original=structuredClone(record),mapped=reviewRecordSession(record)
 assert.equal(mapped.id,record.session.id);assert.equal(mapped.workoutDate,reviewToday);assert.equal(mapped.status,'FINISHED')
 assert.equal(mapped.snapshot.state.performedSets.length,s.weights.reduce((n,w)=>n+w.sets.length,0))
 assert.equal(mapped.snapshot.state.performedSets[0].weightKg,s.weights[0].approved)
 assert.equal(mapped.completionAssessment,null,'synthetic display mapping never invents an official API assessment')
 assert.deepEqual(record,original)
})
test('recent records filter seven dates, keep multiple sessions and deduplicate an existing session id',()=>{
 const {s,data}=finished(),base=captureReview(s,s.startedAt+60000,reviewToday),today=reviewRecordSession(base)
 const within=structuredClone(today);within.id='90000000-1111-4222-8333-000000000001';within.workoutDate=addDays(reviewToday,-6)
 const outside=structuredClone(today);outside.id='90000000-1111-4222-8333-000000000002';outside.workoutDate=addDays(reviewToday,-7)
 const future=structuredClone(today);future.id='90000000-1111-4222-8333-000000000003';future.workoutDate=addDays(reviewToday,1)
 const preview=recordPreviewData(data.routines,data.schedule,data.sessions,[],false,[today,within,outside,future,today])
 assert.equal(preview.sessions.filter(s=>s.id===today.id).length,1)
 const rows=recordRows(preview.sessions.map(s=>({...s,routineName:s.initialPlan.routineName})), addDays(reviewToday,-6),addDays(reviewToday,1))
 assert(rows.some(r=>r.id===today.id));assert(rows.some(r=>r.id===within.id));assert(!rows.some(r=>r.id===outside.id||r.id===future.id))
 assert(rows.every(r=>r.workoutDate>=addDays(reviewToday,-6)&&r.workoutDate<addDays(reviewToday,1)))
 assert.equal(new Set(rows.map(r=>r.id)).size,rows.length)
})
test('historical advice comes only from the frozen FINISH assessment, independently of corrected actual values',()=>{
 const server=session({status:'FINISHED'}),p=server.initialPlan.weightExercises[0]
 const e={sessionExerciseId:SESSION_EXERCISE,eligible:true,advice:'INCREASE',comparisonContext:{routineId:server.initialPlan.routineId,sourcePlacementId:p.sourcePlacementId,standardExerciseId:p.standardExerciseId,approvedWeightKg:'25',plannedSetCount:3,minReps:6,maxReps:10},evaluatedReps:[10,11,12],evaluatedPerformedSetIds:['a','b','c']}
 assert.deepEqual(historicalReviews(server),[])
 server.completionAssessment={overallWeightPlanComplete:true,exercises:[e]}
 const before=structuredClone(server),old=historicalReviews(server)
 assert.equal(old[0].review.referenceKg,'25');assert.deepEqual(old[0].review.sets.map(s=>s.reps),[10,11,12]);assert.deepEqual(server,before)
 server.snapshot.state.performedSets=[{id:'a',sessionExerciseId:SESSION_EXERCISE,weightKg:'100',reps:1}]
 assert.deepEqual(historicalReviews(server),old)
 server.completionAssessment=null;assert.deepEqual(historicalReviews(server),[])
})
test('missing, excluded, unrelated or auto-closed historical evidence cannot create an old judgment',()=>{
 const server=session({status:'FINISHED'}),p=server.initialPlan.weightExercises[0]
 const e={sessionExerciseId:SESSION_EXERCISE,eligible:true,advice:'DECREASE',comparisonContext:{routineId:server.initialPlan.routineId,sourcePlacementId:p.sourcePlacementId,standardExerciseId:p.standardExerciseId,approvedWeightKg:'25',plannedSetCount:3,minReps:6,maxReps:10},evaluatedReps:[5,6,7],evaluatedPerformedSetIds:['a','b','c']}
 server.completionAssessment={overallWeightPlanComplete:true,exercises:[e]}
 assert.equal(historicalReviews(server)[0].review.direction,'decrease')
 for(const mutate of [s=>s.status='AUTO_CLOSED',s=>s.completionAssessment.exercises[0].eligible=false,s=>s.completionAssessment.overallWeightPlanComplete=false,s=>s.completionAssessment.exercises[0].comparisonContext.sourcePlacementId='another',s=>s.completionAssessment.exercises[0].evaluatedReps=[]]){const copy=structuredClone(server);mutate(copy);assert.deepEqual(historicalReviews(copy),[])}
})
test('demo finish captures its judgment once and historical display cannot follow later mutable input',()=>{
 const {s}=finished(),record=captureReview(s,s.startedAt+60000,reviewToday),old=structuredClone(record.judgments)
 assert(old.length>0);s.weights[0].sets[0].result.reps=1;s.weights[0].approved='100'
 assert.deepEqual(record.judgments,old);assert.notEqual(record.session.weights[0].approved,'100')
})
