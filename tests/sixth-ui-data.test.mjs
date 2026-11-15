import assert from 'node:assert/strict'
import {test} from 'node:test'
import {recordTime} from '../src/components/record-time.ts'
import {durationMinutesLabel,durationLabel} from '../src/components/duration.ts'
import {actualAnalysis,muscleSubtotal} from '../src/features/statistics/muscle-analysis.ts'
import {savedReview} from '../src/features/workout-online/saved-weight-review.ts'
import {SESSION,SESSION_EXERCISE,PLACEMENT,EXERCISE,OTHER,scope} from './fixtures/workout-online-data.mjs'
test('cards and detail use the real start instant with local date, weekday and minute',()=>{
 assert.equal(recordTime('2026-11-15T05:32:48Z','Asia/Seoul','2026-11-15'),'2026-11-15 · 일요일 · 14:32')
 assert.equal(recordTime('2026-11-14T23:32:48Z','Asia/Seoul','2026-11-14'),'2026-11-15 · 일요일 · 08:32')
 assert.equal(recordTime(null,'Asia/Seoul','2026-11-15'),'2026-11-15 · 시각 미확인')
})
test('weekly summary removes seconds without changing detailed duration or raw measurement',()=>{
 assert.equal(durationMinutesLabel(52340320),'14시간 32분')
 assert.equal(durationMinutesLabel('1920320'),'32분')
 assert.equal(durationMinutesLabel('59999'),'1분')
 assert.equal(durationMinutesLabel('0'),'0분')
 assert.equal(durationLabel('1920320'),'32분')
 assert.equal(durationLabel('1920499'),'32분')
 assert.equal(durationLabel('1920500'),'32분 1초')
})
const row=(actual,planned,planState)=>({id:'x',name:'근육',group:'BACK',actual,planned,planState,volume:'999'})
test('detailed muscle subtotal independently sums exact fractional actual and historic plan contributions',()=>{
 assert.equal(muscleSubtotal([row('6','6'),row('3','3')]),'9 / 9세트')
 assert.equal(muscleSubtotal([row('0.5','1.5'),row('2.5','0.5')]),'3 / 2세트')
 assert.equal(muscleSubtotal([row('0',null,'none')]),'0 / —세트')
 assert.equal(muscleSubtotal([row('0','0')]),'0 / 0세트')
 assert.equal(muscleSubtotal([row('1',null,'none'),row('1','2')]),'2 / 2세트')
 assert.equal(muscleSubtotal([row(null,'2'),row('1',null,'unknown')]),'확인 불가 / 확인 불가세트')
})
const review=()=>({...scope,sessionId:SESSION,version:'2',routineVersion:'1',frozen:null,current:[],approvals:[]})
test('saved approval response requires actual event identity, weights, times and allowed source',()=>{
 assert(savedReview(review()))
 const r=review();r.approvals=[{id:OTHER,eventId:EXERCISE,sessionExerciseId:SESSION_EXERCISE,sourcePlacementId:PLACEMENT,previousWeightKg:'25',nextWeightKg:'30',occurredAt:'2026-11-15T05:32:00Z',recordedAt:'2026-11-15T05:32:01Z',source:'WORKOUT_REVIEW'}]
 assert(savedReview(r))
 for(const field of ['eventId','occurredAt','previousWeightKg']){const broken=structuredClone(r);delete broken.approvals[0][field];assert.equal(savedReview(broken),false,field)}
 const broken=structuredClone(r);broken.approvals[0].source='ROUTINE_EDIT';assert.equal(savedReview(broken),false)
})

test('full historical plan applies each muscle role coefficient independently; incomplete coverage stays unknown',()=>{
 const weight={plannedSets:'3',completedSets:'2',reps:'20',volumeLoadKg:'500',setsWithoutVolume:'0'}
 const source={planCoverage:'FULL_SCHEDULE_HISTORY',summary:{completedSets:'2'},muscles:[{id:OTHER,name:'주동근',groupCode:'BACK',role:'PRIMARY',weights:weight,contributionSets:'2.0'},{id:OTHER,name:'주동근',groupCode:'BACK',role:'SECONDARY',weights:{...weight,plannedSets:'1',volumeLoadKg:'250'},contributionSets:'1.0'}]}
 const data=actualAnalysis(source)
 assert.equal(data.muscles[0].actual,'3');assert.equal(data.muscles[0].planned,'3.5');assert.equal(data.muscles[0].volume,'500')
 assert.equal(muscleSubtotal(data.muscles),'3 / 3.5세트')
 assert(data.groups.every(g=>g.actual===null&&g.planned===null))
 const unknown=actualAnalysis({...source,planCoverage:'PARTIAL_SCHEDULE_HISTORY'}).muscles[0]
 assert.equal(unknown.planned,null);assert.equal(unknown.planState,'unknown')
 const noPlan=actualAnalysis({...source,muscles:[{...source.muscles[0],weights:{...weight,plannedSets:'0'}}]}).muscles[0]
 assert.equal(noPlan.planned,null);assert.equal(noPlan.planState,'none')
})
