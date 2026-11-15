import { displayDecimal, sumDecimals } from '../src/features/statistics/display-decimal.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { session, scope, OTHER, routine } from './fixtures/workout-online-data.mjs'
import { partialAchievement } from '../src/features/statistics/display-achievement.ts'
import { dayStatus } from '../src/features/home/model.ts'
import { plannedAnalysis, actualAnalysis } from '../src/features/statistics/muscle-analysis.ts'
import { recordRows, recordWeek } from '../src/features/history/record-feed.ts'
import { suggestedApproval, approvalStep, adjustApproval, changedOriginalCombination } from '../src/features/workout-online/approval-weight.ts'
import { updatedWeights } from '../src/features/workout-online/routine-weights.ts'

registerHooks({load(url,context,next){
  if(url.endsWith('.css'))return{format:'module',source:'export default new Proxy({}, {get:(_,key)=>String(key)})',shortCircuit:true}
  if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText}
  return next(url,context)
}})
const { MuscleAnalysisView }=await import('../src/features/statistics/MuscleAnalysis.tsx')
const { WeightReview }=await import('../src/features/workout-flow/WeightReview.tsx')
const { StatisticsView }=await import('../src/features/statistics/StatisticsPanel.tsx')
const html=(component,props)=>renderToStaticMarkup(React.createElement(component,props))

function partialSession(counts,performed,cardio=[]){
  const s=session({status:'FINISHED'})
  s.initialPlan.weightExercises=counts.map((setCount,i)=>({...s.initialPlan.weightExercises[0],sessionExerciseId:'slot-'+i,setCount}))
  s.initialPlan.cardioActivities=cardio.map((plan,i)=>({sessionActivityId:'cardio-'+i,plan}))
  s.snapshot.state.appliedPlan.weightExercises=structuredClone(s.initialPlan.weightExercises)
  s.snapshot.state.sessionExercises=s.initialPlan.weightExercises.map(p=>({id:p.sessionExerciseId,kind:'WEIGHT',standardExerciseId:p.standardExerciseId}))
  s.snapshot.state.performedSets=performed.flatMap((count,i)=>Array.from({length:count},(_,n)=>({sessionExerciseId:'slot-'+i,ordinal:n+1})))
  s.snapshot.state.cardioResults=[]
  return s
}
test('UI partial requires both exact-half set ratio and recognized-exercise ratio, with per-slot caps',()=>{
  assert.equal(partialAchievement(partialSession([3,3,3,3],[3,3,0,0])),'met')
  assert.equal(partialAchievement(partialSession([3,3,3,3],[2,2,0,0])),'below')
  assert.equal(partialAchievement(partialSession([1,2,3],[1,2,0])),'met')
  assert.equal(partialAchievement(partialSession([1,2,3],[1,1,0])),'below')
  assert.equal(partialAchievement(partialSession([1,10,10],[100,0,0])),'below')
  const changed=partialSession([3],[3]);changed.snapshot.state.appliedPlan.weightExercises=[]
  assert.equal(partialAchievement(changed),'unknown')
})
test('cardio evaluates only present targets, uses AND, and mixed denominator includes both types',()=>{
  const goal={targetSeconds:1800,targetDistanceKm:'5'}
  const s=partialSession([],[],[goal])
  const actual={sessionActivityId:'cardio-0',status:'COMPLETED',result:{activeMs:900000,distanceKm:'2.5'}}
  s.snapshot.state.cardioResults=[actual]
  assert.equal(partialAchievement(s),'met')
  actual.result.distanceKm='2';assert.equal(partialAchievement(s),'below')
  actual.result.distanceKm=null;assert.equal(partialAchievement(s),'unknown')
  s.initialPlan.cardioActivities[0].plan.targetDistanceKm=null;assert.equal(partialAchievement(s),'met')
  s.initialPlan.cardioActivities[0].plan={targetSeconds:0,targetDistanceKm:'5'};actual.result.distanceKm='2.5';assert.equal(partialAchievement(s),'met')
  const mixed=partialSession([3,3],[3,0],[goal,goal]);mixed.snapshot.state.cardioResults=[actual]
  assert.equal(partialAchievement(mixed),'met')
  mixed.snapshot.state.cardioResults=[];assert.equal(partialAchievement(mixed),'below')
})
test('home and records use one display classifier without treating official fractional effectiveDay as UI partial',()=>{
  const day={status:'PLANNED',effectiveDay:'0.5',reviewStatus:'PERFORMED',selectedSessionId:OTHER}
  const before=structuredClone(day)
  assert.equal(dayStatus(day,'2026-11-13','2026-11-14').kind,'unknown')
  assert.equal(dayStatus(day,'2026-11-13','2026-11-14','met').mark,'△')
  assert.equal(dayStatus(day,'2026-11-13','2026-11-14','below').mark,'×')
  assert.equal(dayStatus({...day,effectiveDay:'1'},'2026-11-13','2026-11-14','below').mark,'✓')
  assert.equal(dayStatus(day,'2026-11-16','2026-11-14','below').mark,'월')
  assert.deepEqual(day,before)
})
test('repeating plan counts each assigned day and keeps direct splits independent of muscle contributions and missing PPL',()=>{
  const definition={id:routine.weightPlacements[0].standardExerciseId,frontBackSplit:'FRONT',pplSplit:null,
    primaryMuscles:[{id:'primary',name:'가슴',groupCode:'CHEST'}],secondaryMuscles:[{id:'secondary',name:'삼두근',groupCode:'ARMS'}]}
  const preset={assignments:[{dayOfWeek:1,routineId:routine.id},{dayOfWeek:3,routineId:routine.id}]}
  const data=plannedAnalysis(preset,new Map([[routine.id,routine]]),[definition])
  assert.equal(data.total,'6');assert.equal(data.frontBack[0].planned,'6');assert.equal(data.ppl[0].planned,null)
  assert.equal(data.muscles.find(m=>m.id==='primary').planned,'6')
  assert.equal(data.muscles.find(m=>m.id==='secondary').planned,'3')
  assert(data.groups.every(g=>g.planned===null),'muscle.groupCode never becomes an exercise classification')
})
test('plan toggle defaults OFF, guide points down, bar clamps without losing numeric value, unknown is not zero',()=>{
  const row=(id,planned)=>({id,name:id,group:'CHEST',actual:null,planned,volume:null,minimum:4,maximum:12})
  const data={total:'20',frontBack:[row('positive','20'),row('zero','0'),row('unknown',null)],ppl:[],groups:[],muscles:[],issues:[]}
  const result=html(MuscleAnalysisView,{data,plan:true})
  assert.match(result,/role="switch".*aria-checked="false"/)
  assert.match(result,/20 \/ 12세트/);assert.match(result,/data-chart-kind="horizontal"/);assert.match(result,/▼/)
  assert.match(result,/▼ 권장 시작점 4세트/);assert.match(result,/>unknown</);assert.doesNotMatch(result,/>zero</)
})
test('actual muscle contribution preserves half sets and never weights volume or fabricates missing plans',()=>{
  const w={plannedSets:'9',completedSets:'3',volumeLoadKg:'100.25'}
  const result=actualAnalysis({summary:{completedSets:'3'},muscles:[{id:'m',name:'근육',groupCode:'CHEST',role:'PRIMARY',weights:w,contributionSets:'3.0'},{id:'m',name:'근육',groupCode:'CHEST',role:'SECONDARY',weights:w,contributionSets:'1.5'}]})
  assert.equal(result.muscles[0].actual,'4.5');assert.equal(result.muscles[0].volume,'100.25');assert.equal(result.muscles[0].planned,null)
})
test('week captions show actual Monday-Sunday ranges across month and year boundaries',()=>{
  assert.deepEqual(recordWeek('2026-11-01'),{key:'2026-10-26',title:'10월 4주차',range:'10/26~11/1',start:'2026-10-26',end:'2026-11-01'})
  assert.equal(recordWeek('2027-01-01').range,'12/28~1/3')
  assert.equal(recordWeek('2026-11-15').title,'11월 2주차')
})
test('month feed filters only selected workout dates, global routine query ignores month, duplicates remain separate',()=>{
  const rows=[{id:'a',routineName:'푸시',workoutDate:'2026-11-01',endedAt:'2026-11-02T01:00:00Z',closedAt:'2026-11-02T01:00:00Z',deletedAt:null},
    {id:'b',routineName:'푸시',workoutDate:'2026-11-01',endedAt:'2026-11-01T23:00:00Z',closedAt:'2026-11-01T23:00:00Z',deletedAt:null},
    {id:'c',routineName:'푸시',workoutDate:'2026-10-31',endedAt:'2026-11-01T01:00:00Z',closedAt:'2026-11-01T01:00:00Z',deletedAt:null}]
  assert.deepEqual(recordRows(rows,'2026-11-01','2026-12-01').map(r=>r.id),['a','b'])
  assert.deepEqual(recordRows(rows,'2026-11-01','2026-12-01','푸시').map(r=>r.id),['a','b','c'])
})
test('approval recommendation and manual step differ by load type and remain exact decimals',()=>{
  assert.equal(suggestedApproval('95','increase','PLATE'),'100');assert.equal(suggestedApproval('1','decrease','STACK'),'0')
  assert.equal(suggestedApproval('20','increase','DUMBBELL'),'22');assert.equal(approvalStep('PLATE'),'2.5');assert.equal(approvalStep(null),'1')
  assert.equal(adjustApproval('99999999999990.5',1,'2.5'),'99999999999993')
  assert.throws(()=>adjustApproval('9007199254740993.5',1,'2.5'),/허용 중량/)
})
test('approval UI presents drafts and disabled server action, without invoking any write',()=>{
  const weights=[{id:'w',name:'벤치',loadType:'PLATE',results:[],review:{direction:'increase',referenceKg:'95',planned:3,completed:3,incomplete:false,sets:[]}}]
  const result=html(WeightReview,{weights})
  assert.match(result,/95kg →.*100kg/);assert.match(result,/<button disabled=""[^>]*>전체 승인</)
  assert.match(result,/공식 승인 중량은 저장되지 않습니다/)
})
test('changed combination is excluded in the display while same-combination extra exercise preserves original eligibility',()=>{
  const s=partialSession([3],[3]),before=structuredClone(s)
  assert.equal(changedOriginalCombination(s.initialPlan,s.snapshot.state),false)
  s.snapshot.state.appliedPlan.weightExercises.push({...s.snapshot.state.appliedPlan.weightExercises[0],sessionExerciseId:'added'})
  assert.equal(changedOriginalCombination(s.initialPlan,s.snapshot.state),false)
  s.snapshot.state.appliedPlan.weightExercises[0].manufacturerId=OTHER
  assert.equal(changedOriginalCombination(s.initialPlan,s.snapshot.state),true)
  assert.deepEqual(s.initialPlan,before.initialPlan)
})
test('record main is exactly four analysis entries without a separate history analysis card',()=>{
  const result=html(StatisticsView,{data:{...scope,fromDate:'2026-11-09',toDateExclusive:'2026-11-16',summary:{completedSets:'0',volumeLoadKg:'0'},cardioActiveMs:'0',plannedWorkoutDays:null,routineAchievementPercent:null,days:[],muscles:[],exercises:[]},planning:{effectiveWorkoutDays:null},screen:'summary',onScreen(){},onOpen(){},onHistory(){}})
  for(const title of ['운동 현황','성장 추적','주간 근육 계획','주간 근육 통계'])assert.match(result,new RegExp(title))
  assert.equal((result.match(/<button/g)||[]).length,4);assert.doesNotMatch(result,/근육별 통계 분석|운동 이력 전체 보기/)
})
test('new equipment combination is serialized as a separate placement, never an approval on the old placement',()=>{
  const draft={...routine.weightPlacements[0],id:OTHER,approvedWeightKg:null,setCount:'3',minReps:'6',maxReps:'10',initialWeightKg:'40',approve:false,nextWeightKg:''}
  const result=updatedWeights([draft])
  assert.equal(result[0].mode,'NEW');assert.equal(result[0].id,OTHER)
})

test('display rounding preserves large decimal strings and exact chart totals',()=>{
 assert.equal(displayDecimal('66.666667'),'66.67')
 assert.equal(displayDecimal('56.25'),'56.25')
 assert.equal(displayDecimal('999999999999999999.999999'),'1,000,000,000,000,000,000')
 assert.equal(sumDecimals(['999999999999999999.5','0.5']),'1000000000000000000')
 assert.equal(sumDecimals(['1.5','2','0.25']),'3.75')
})
