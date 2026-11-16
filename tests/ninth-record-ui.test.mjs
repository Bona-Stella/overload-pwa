import assert from 'node:assert/strict'
import {test} from 'node:test'
import {registerHooks} from 'node:module'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import ts from 'typescript'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {session,SESSION_EXERCISE as E,OTHER} from './fixtures/workout-online-data.mjs'
import {recordSummary,recordDuration,recordKg} from '../src/features/workout-online/record-summary.ts'
import {achievementReasons,sessionDisplayStatus} from '../src/features/statistics/display-achievement.ts'
import {summaryData} from '../src/features/workout-online/summary-data.ts'
import {recordRange} from '../src/components/record-time.ts'
registerHooks({load(url,context,next){
 if(url.endsWith('.css'))return {format:'module',source:'export default new Proxy({}, {get:(_,key)=>String(key)})',shortCircuit:true}
 if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText}
 return next(url,context)
}})
const {SessionRecordCard}=await import('../src/features/history/RecordFeed.tsx')
const {WorkoutSummary}=await import('../src/features/workout-flow/WorkoutSummary.tsx')
const {WeightReview}=await import('../src/features/workout-flow/WeightReview.tsx')
const {SearchList}=await import('../src/components/SearchList.tsx')
const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props))
export function mixedRecord(){
 const s=session({status:'FINISHED',endedAt:'2026-10-31T13:10:00Z',closedAt:'2026-10-31T13:10:00Z'})
 const goal={kind:'OUTDOOR',name:'야외 러닝',targetSeconds:1200,targetDistanceKm:'2.5',intensity:null,inclinePercent:null,resistance:null}
 s.initialPlan.cardioActivities=[{sessionActivityId:OTHER,sourcePlacementId:OTHER,plan:goal}]
 s.snapshot.state.appliedPlan.cardioActivities=[{sessionActivityId:OTHER,plan:goal}]
 s.snapshot.state.sessionExercises.push({id:OTHER,kind:'CARDIO',standardExerciseId:null})
 s.snapshot.state.performedSets=Array.from({length:3},(_,i)=>({id:'set'+i,sessionExerciseId:E,ordinal:i+1,weightKg:'25',reps:10,completedAt:'2026-10-31T12:30:00Z',manufacturerId:null,loadType:null,weightContext:{kind:'INITIAL_APPROVED',requestId:null}}))
 s.snapshot.state.weightTiming={schemaVersion:1,complete:true,intervals:[{startedAt:'2026-10-31T12:00:00Z',endedAt:'2026-10-31T12:40:00Z'}]}
 s.snapshot.state.cardioResults=[{id:'cardio',sessionActivityId:OTHER,status:'COMPLETED',startedAt:'2026-10-31T12:50:00Z',occurredAt:s.endedAt,result:{timerMs:1200000,activeMs:1200000,corrected:false,distanceKm:'2.5',averageBpm:null}}]
 return s
}
test('recent cards show three compact rows while history retains detailed totals',()=>{
 const s=mixedRecord(),f=recordSummary(s),before=structuredClone(s)
 assert.deepEqual([f.totalMs,f.weightMs,f.cardioMs,f.inactiveMs],[4200000,2400000,1200000,600000])
 assert.deepEqual([f.completedSets,f.plannedSets,f.volumeKg,f.distanceKm],[3,3,'750','2.5'])
 assert.equal(f.status.kind,'complete');assert.deepEqual(achievementReasons(s),{})
 const row={...s,routineName:s.initialPlan.routineName},props={row,session:s,onOpen:()=>{}}
 const recent=render(SessionRecordCard,{...props,recent:true}),history=render(SessionRecordCard,props)
 assert.match(recent,/10.31 · 토 · 21:00/);assert.match(recent,/총 1시간 10분/)
 assert.match(history,/2026-10-31 · 토요일 · 21:00/)
 assert.match(recent,/웨이트 1종목 · 유산소 1종목/);assert.match(recent,/전체 완료/)
 assert.doesNotMatch(recent,/00:40|00:20|총 3세트|2.5km|750kg|총중량/)
 assert.match(history,/1:10:00/);assert.match(history,/40:00/);assert.match(history,/20:00/)
 assert.doesNotMatch(history,/전체 완료|부분 완료/);assert.deepEqual(s,before)
})
test('unknown coverage and inconsistent durations cannot manufacture nonperformance time',()=>{
 const s=mixedRecord();delete s.snapshot.state.weightTiming
 assert.equal(recordSummary(s).inactiveMs,null);assert.equal(recordSummary(s).weightMs,null)
 s.snapshot.state.weightTiming={schemaVersion:1,complete:true,intervals:[{startedAt:s.startedAt,endedAt:'2026-10-31T12:55:00Z'}]}
 assert.equal(recordSummary(s).inactiveMs,null);assert.match(recordSummary(s).timingIssue,/초과/)
 assert.equal(recordDuration(-1),'미확인');assert.equal(recordDuration(14999,'minute'),'00:00')
 assert.equal(recordDuration(3599999,'minute'),'00:59');assert.equal(recordDuration(3600000,'minute'),'01:00')
 assert.equal(recordKg('99999999999999.999999'),'99,999,999,999,999.999999kg')
})
test('reasons explain the existing judgment and only highlight contributors to that threshold',()=>{
 const s=mixedRecord();s.snapshot.state.cardioResults[0].result.distanceKm='1.5'
 assert.equal(sessionDisplayStatus(s).kind,'partial');assert.deepEqual(achievementReasons(s),{[OTHER]:['거리 목표 미달']})
 s.snapshot.state.performedSets=[]
 assert.equal(sessionDisplayStatus(s).kind,'missed');assert.deepEqual(achievementReasons(s),{[E]:['계획 세트 미수행']})
 s.snapshot.state.cardioResults[0].result.distanceKm=null
 assert.equal(sessionDisplayStatus(s).kind,'unknown');assert.deepEqual(achievementReasons(s),{})
})
test('recent cards retain existing completion counts and unknown judgments without detail metrics',()=>{
 const s=mixedRecord();s.initialPlan.weightExercises=[];s.snapshot.state.performedSets=[];s.snapshot.state.sessionExercises=s.snapshot.state.sessionExercises.filter(e=>e.kind==='CARDIO')
 let html=render(SessionRecordCard,{row:{...s,routineName:'러닝'},session:s,recent:true,onOpen:()=>{}})
 assert.match(html,/유산소 1종목/);assert.match(html,/전체 완료/);assert.doesNotMatch(html,/웨이트|총중량|세트|2.5km/)
 s.snapshot.state.cardioResults[0].result.distanceKm=null
 html=render(SessionRecordCard,{row:{...s,routineName:'러닝'},session:s,recent:true,onOpen:()=>{}})
 assert.match(html,/달성 확인 불가/);assert.match(html,/일부 확인 불가/);assert.doesNotMatch(html,/2.5km|기준 미달/)
 const partial=mixedRecord();partial.snapshot.state.cardioResults[0].result.distanceKm='1.5'
 html=render(SessionRecordCard,{row:{...partial,routineName:'혼합'},session:partial,recent:true,onOpen:()=>{}})
 assert.match(html,/부분 완료/);assert.equal(recordSummary(partial).status.kind,'partial')
 partial.snapshot.state.performedSets=[]
 html=render(SessionRecordCard,{row:{...partial,routineName:'혼합'},session:partial,recent:true,onOpen:()=>{}})
 assert.match(html,/기준 미달/);assert.equal(recordSummary(partial).status.kind,'missed')
 const unknown={...partial,endedAt:null}
 html=render(SessionRecordCard,{row:{...unknown,routineName:'미확인'},session:unknown,recent:true,onOpen:()=>{}})
 assert.match(html,/총 미확인/)
})

test('recent Korean duration labels preserve minute truncation and unknown measurements',()=>{
 for(const [milliseconds,label] of [[2520000,'42분'],[3600000,'1시간'],[4200000,'1시간 10분'],[8100000,'2시간 15분'],[3599999,'59분'],[59999,'0분'],[null,'미확인']]){
  const s=mixedRecord()
  s.endedAt=milliseconds===null?null:new Date(Date.parse(s.startedAt)+milliseconds).toISOString()
  const before=structuredClone(s),html=render(SessionRecordCard,{row:{...s,routineName:s.initialPlan.routineName},session:s,recent:true,onOpen:()=>{}})
  assert.ok(html.includes('총 '+label),label)
  assert.deepEqual(s,before)
 }
})
test('detail uses three columns, actual six values and frozen approvals without repeated timestamps or controls',()=>{
 const s=mixedRecord(),data=summaryData(s,null),html=render(WorkoutSummary,{...data,detail:true,manufacturers:[],onBack:()=>{}})
 assert.match(html,/운동 기록 요약/);assert.match(html,/비수행 시간/);assert.match(html,/10:00/);assert.match(html,/총 3\/3세트 · 총 750kg/)
 assert.equal(recordRange(s.startedAt,s.endedAt,s.startedTimeZone,s.workoutDate),'10/31 · 토 · 21:00–22:10')
 const review={direction:'increase',referenceKg:'25',recommendedKg:'30',planned:1,completed:1,incomplete:false,sets:[{id:'set',reps:23,contributes:true}],approval:{nextWeightKg:'27.5',previousWeightKg:'25',occurredAt:'2026-11-15T10:33:49Z',source:'WORKOUT_REVIEW'}}
 const approved=render(WeightReview,{weights:[{id:E,name:'운동',results:[],review}],readOnly:true})
 assert.match(approved,/27.5/);assert.match(approved,/승인 완료/);assert.doesNotMatch(approved,/11:33|2026|당시 권고|<button|checkbox/)
 const pending=render(WeightReview,{weights:[{id:E,name:'운동',results:[],review:{...review,approval:undefined}}],readOnly:true})
 assert.match(pending,/30kg/);assert.match(pending,/미승인/)
})
test('only the catalog opts into initially open results and tags',()=>{
 const props={query:'',onQuery:()=>{},options:[],onSelect:()=>{},onClear:()=>{},tags:{label:'운동 부위',selected:'ALL',options:[{id:'ALL',name:'전체'}],onSelect:()=>{}}}
 assert.doesNotMatch(render(SearchList,props),/운동 부위 필터/)
 assert.match(render(SearchList,{...props,defaultOpen:true}),/운동 부위 필터/)
})
