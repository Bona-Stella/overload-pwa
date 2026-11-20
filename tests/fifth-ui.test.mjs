import {addDays} from '../src/features/home/model.ts'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import {durationLabel,durationParts,durationSeconds} from '../src/components/duration.ts'
import {formatDuration} from '../src/features/workout/model.ts'
import {completionDate,recentRecordRows} from '../src/features/history/record-feed.ts'
import {recordPreviewData,reviewRecordSession} from './fixtures/review/record-data.ts'
import {completedReview,workoutSample} from './fixtures/review/workout-samples.ts'
import {reviewToday} from './fixtures/review/routine-samples.ts'

test('time displays round once and normalize minute/hour boundaries without decimal seconds',()=>{
 for(const [ms,label,clock] of [[400,'0초','00:00:00'],[600,'1초','00:00:01'],[60600,'1분 1초','00:01:01'],[59999,'1분','00:01:00'],[3599600,'1시간','01:00:00'],[6600598,'1시간 50분 1초','01:50:01']]){
  assert.equal(durationLabel(ms),label);assert.equal(formatDuration(ms),clock)
 }
 assert.equal(durationLabel('9007199254740993'),'2501999792시간 59분 1초')
})
test('duration parts have no leading zeros and keep raw precision until an explicit edit',()=>{
 assert.deepEqual(durationParts('0'),{hours:'0',minutes:'0',seconds:'0'})
 assert.deepEqual(durationParts('3601'),{hours:'1',minutes:'0',seconds:'1'})
 for(const s of ['0.001','59.999','1230.125','86400'])assert.equal(durationSeconds(durationParts(s)),s)
})
const row=(id,endedAt,workoutDate='2026-11-01')=>({id,workoutDate,endedAt,closedAt:endedAt,status:'FINISHED',deletedAt:null})
test('recent seven days use both inclusive local completion boundaries, not START date or seven records',()=>{
 const inside=Array.from({length:8},(_,i)=>row(String(i),'2026-11-'+String(9+i%7).padStart(2,'0')+'T03:00:00Z'))
 const outside=row('old','2026-11-08T14:59:59.999Z'),first=row('first','2026-11-08T15:00:00Z'),last=row('last','2026-11-15T14:59:59.999Z'),future=row('future','2026-11-15T15:00:00Z')
 const rows=recentRecordRows([...inside,outside,first,last,future],'2026-11-15','Asia/Seoul')
 assert.equal(rows.length,10);assert(rows.some(r=>r.id==='first'));assert(rows.some(r=>r.id==='last'));assert(!rows.some(r=>['old','future'].includes(r.id)))
 assert.equal(rows[0].id,'last');assert.equal(completionDate(first,'Asia/Seoul'),'2026-11-09')
})
test('completion filtering respects the schedule zone and ignores logical deletion',()=>{
 const r=row('night','2026-11-08T23:30:00Z'),deleted={...r,id:'deleted',deletedAt:'2026-11-09T00:00:00Z'}
 assert.equal(completionDate(r,'Asia/Seoul'),'2026-11-09');assert.equal(completionDate(r,'America/Los_Angeles'),'2026-11-08')
 assert.deepEqual(recentRecordRows([r,deleted],'2026-11-15','Asia/Seoul').map(r=>r.id),['night'])
 assert.deepEqual(recentRecordRows([r],'2026-11-15','America/Los_Angeles'),[])
})
test('a newly completed preview exercise without catalog classification cannot crash group or muscle searches',()=>{
 const data=workoutSample('workout-complete'),record=reviewRecordSession(completedReview(data))
 const preview=recordPreviewData(data.routines,data.schedule,data.sessions,[],false,[record])
 const range={fromDate:reviewToday,toDateExclusive:addDays(reviewToday,1)}
 for(const filter of ['','group:CHEST','group:LEGS',...preview.definitions.flatMap(e=>e.muscles??[]).map(m=>'muscle:'+m.id)]){
  const values=preview.trend(range,filter,'sets');assert(values.every(Number.isFinite))
 }
})
