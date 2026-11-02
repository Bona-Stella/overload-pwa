import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StatisticsApi, statistics, overview, periodFor, weightStats } from '../src/features/statistics/api.ts'
import { WeeklyScheduleApi, weeklySchedule } from '../src/features/statistics/weekly-schedule.ts'
import { scope, OTHER } from './fixtures/workout-online-data.mjs'

registerHooks({load(url,context,next){
  if(url.endsWith('.css'))return{format:'module',source:'export default ""',shortCircuit:true}
  if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText}
  return next(url,context)
}})
const {StatisticsView,WeightChart}=await import('../src/features/statistics/StatisticsPanel.tsx')
const {ScheduleEditor}=await import('../src/features/statistics/WeeklySchedulePanel.tsx')
const weights={plannedSets:'4',completedSets:'3',reps:'28',volumeLoadKg:'2140',setsWithoutVolume:'0'}
const period={fromDate:'2026-10-26',toDateExclusive:'2026-11-02'}
const fixture=()=>({...scope,...period,planCoverage:'STARTED_SESSIONS_ONLY',plannedWorkoutDays:null,routineAchievementPercent:null,
  summary:{...weights},cardioActiveMs:'1800000',unmappedCompletedSets:'0',days:[{date:'2026-11-01',weights:{...weights},cardioActiveMs:'1800000'}],
  exercises:[{standardExerciseId:OTHER,name:'스쿼트',weights:{...weights}}],muscles:[{id:OTHER,name:'대퇴사두근',groupCode:'LEGS',role:'PRIMARY',weights:{...weights}},
    {id:scope.userId,name:'보조근',groupCode:'LEGS',role:'SECONDARY',weights:{...weights}}],groups:[{groupCode:'LEGS',role:'PRIMARY',weights:{...weights}}],
  cardio:[{kind:'TREADMILL',name:'달리기',activeMs:'1800000',distanceKm:'3.8',recordsWithoutDistance:'0'}],recentSessions:[]})

test('statistics uses authenticated GET with no write body and preserves the original abort signal',async()=>{
  let request
  const api=new StatisticsApi({workoutRequest:async(...args)=>{request=args;return{status:200,data:fixture()}}})
  const signal=new AbortController().signal,result=await api.read(scope,period,signal)
  assert.equal(result.summary.volumeLoadKg,'2140');assert.equal(request[0],scope.userId)
  assert.equal(request[1],'/api/v1/statistics?fromDate=2026-10-26&toDateExclusive=2026-11-02')
  assert.equal(request[2],'GET');assert.equal(request[3],undefined);assert.equal(request[4],signal)
})
test('statistics rejects other owners, generations and mismatched date ranges before rendering',async()=>{
  for(const [patch,code] of [[{userId:OTHER},'OWNER_MISMATCH'],[{dataGeneration:'9'},'DATA_GENERATION_MISMATCH'],[{fromDate:'2026-10-27'},'RESPONSE_INVALID']]){
    const api=new StatisticsApi({workoutRequest:async()=>({status:200,data:{...fixture(),...patch}})})
    await assert.rejects(api.read(scope,period,new AbortController().signal),error=>error.code===code)
  }
})
test('aggregate decimals retain values above Number precision and malformed or inferred denominators are rejected',()=>{
  const data=fixture();data.summary.volumeLoadKg='9007199254740993.500001';assert.equal(statistics(data),true)
  for(const patch of [{volumeLoadKg:2140},{volumeLoadKg:'2e3'},{volumeLoadKg:'1.0000001'},{completedSets:'3',setsWithoutVolume:'4'}])assert.equal(weightStats({...weights,...patch}),false)
  assert.equal(statistics({...data,plannedWorkoutDays:4,routineAchievementPercent:'75'}),false)
  assert.equal(statistics({...data,fromDate:'2026-02-30'}),false)
})
test('week periods are Monday to Sunday and month periods keep true calendar length',()=>{
  assert.deepEqual(periodFor(new Date(2026,10,1,23,30),'week',0),period)
  assert.deepEqual(periodFor(new Date(2026,10,1),'week',1),{fromDate:'2026-11-02',toDateExclusive:'2026-11-09'})
  assert.deepEqual(periodFor(new Date(2026,0,31),'month',1),{fromDate:'2026-02-01',toDateExclusive:'2026-03-01'})
  assert.deepEqual(periodFor(new Date(2024,1,29),'month',0),{fromDate:'2024-02-01',toDateExclusive:'2024-03-01'})
})
test('summary distinguishes confirmed server records from unsent local facts and does not invent a weekly achievement',()=>{
  const html=renderToStaticMarkup(React.createElement(StatisticsView,{data:fixture(),screen:'summary',onScreen(){},onOpen(){},onHistory(){}}))
  assert.match(html,/완료 웨이트 세트/);assert.match(html,/30분/);assert.match(html,/미전송 기록은 포함되지 않습니다/)
  assert.match(html,/아직 확인할 수 없습니다/);assert.doesNotMatch(html,/75%|100%/)
  assert.match(html,/운동 이력 전체 보기/);assert.match(html,/운동 현황/)
})
test('muscle detail keeps secondary contribution separate and shows limited initial-plan coverage',()=>{
  const html=renderToStaticMarkup(React.createElement(StatisticsView,{data:fixture(),screen:'muscles',onScreen(){},onOpen(){},onHistory(){}}))
  assert.match(html,/주동근 세트/);assert.match(html,/보조근 참여 · 주동근과 별도/)
  assert.match(html,/전체 주간 계획과는 다를 수 있습니다/);assert.doesNotMatch(html,/0\.5세트/)
})
test('bodyweight-only and no-plan rows retain sets and repetitions without a total-weight toggle',()=>{
  const html=renderToStaticMarkup(React.createElement(WeightChart,{rows:[{key:'body',name:'푸시업',weights:{plannedSets:'0',completedSets:'3',reps:'30',volumeLoadKg:null,setsWithoutVolume:'3'}}]}))
  assert.match(html,/3세트 · 30회/);assert.match(html,/확인된 계획 없음/);assert.doesNotMatch(html,/>총중량<|0 kg/)
})
test('explicit bodyweight load enables total-weight view while unknown sets retain their exclusion note',()=>{
  const html=renderToStaticMarkup(React.createElement(WeightChart,{rows:[{key:'body',name:'중량 푸시업',weights:{plannedSets:'0',completedSets:'2',reps:'18',volumeLoadKg:'80',setsWithoutVolume:'1'}}]}))
  assert.match(html,/>총중량</);assert.match(html,/2세트 · 18회/);assert.match(html,/추가 중량 근거가 없는 맨몸 세트는 총중량에서 제외/)
})
const planned=()=>({statistics:{...fixture(),planCoverage:'FULL_SCHEDULE_HISTORY',plannedWorkoutDays:4,routineAchievementPercent:'56.25'},effectiveWorkoutDays:'2.25',unknownPlanDays:0,unverifiableDays:0,plannedDays:[]})
const weekly=()=>({...scope,version:'0',timeZone:'Asia/Seoul',nextEffectiveFrom:'2026-11-09',current:null,pending:null,history:[]})
test('overview accepts verified weekly rate and rejects fabricated denominators for unknown history',async()=>{
  const data=planned();assert.equal(overview(data),true)
  assert.equal(overview({...data,unknownPlanDays:1}),false)
  assert.equal(overview({...data,unverifiableDays:1}),false)
  assert.equal(overview({...data,statistics:{...data.statistics,routineAchievementPercent:'101'}}),false)
  const unknown={...data,unknownPlanDays:7,effectiveWorkoutDays:null,statistics:{...data.statistics,planCoverage:'PARTIAL_SCHEDULE_HISTORY',plannedWorkoutDays:null,routineAchievementPercent:null}}
  assert.equal(overview(unknown),true)
  let request
  const api=new StatisticsApi({workoutRequest:async(...args)=>{request=args;return{status:200,data}}})
  assert.deepEqual(await api.overview(scope,period,new AbortController().signal),data)
  assert.match(request[1],/^\/api\/v1\/statistics\/overview\?/)
})
test('weekly summary displays 2.25 out of 4 and 56.25 percent without adding extra workouts',()=>{
  const data=planned(),html=renderToStaticMarkup(React.createElement(StatisticsView,{data:data.statistics,planning:data,screen:'summary',onScreen(){},onOpen(){},onHistory(){}}))
  assert.match(html,/2\.25 \/ 4일/);assert.match(html,/56\.25%/);assert.doesNotMatch(html,/아직 확인할 수 없습니다/)
})
test('schedule reads and versioned online writes preserve scope and never mutate retained draft after failure',async()=>{
  const state=weekly(),draft=[Object.freeze({dayOfWeek:1,routineId:OTHER})];Object.freeze(draft)
  let request
  const api=new WeeklyScheduleApi({workoutRequest:async(...args)=>{request=args;if(args[2]==='PUT')throw Object.assign(new Error('conflict'),{code:'SCHEDULE_VERSION_CONFLICT'});return{status:200,data:state}}})
  assert.deepEqual(await api.read(scope,'Asia/Seoul',new AbortController().signal),state)
  assert.equal(request[2],'GET');assert.equal(request[3],undefined)
  await assert.rejects(api.save(scope,state,draft,new AbortController().signal),error=>error.code==='SCHEDULE_VERSION_CONFLICT')
  assert.deepEqual(request[3],{dataGeneration:scope.dataGeneration,expectedVersion:'0',timeZone:'Asia/Seoul',assignments:draft})
  assert.deepEqual(draft,[{dayOfWeek:1,routineId:OTHER}])
  assert.equal(weeklySchedule({...state,history:[{version:'1',effectiveFrom:'2026-11-09',timeZone:'Asia/Seoul',recordedAt:'2026-11-02T00:00:00Z',assignments:[{dayOfWeek:8,routineId:OTHER}]}]}),false)
})
test('schedule editor has seven routine or rest choices and makes immediate first registration explicit',()=>{
  const html=renderToStaticMarkup(React.createElement(ScheduleEditor,{state:weekly(),routines:[{id:OTHER,name:'routine',version:'0'}],busy:false,onSave(){},onCancel(){}}))
  assert.equal((html.match(/<select/g)||[]).length,7);assert.match(html,/2026-11-09부터 즉시 적용/);assert.match(html,/등록 전 날짜는 첫 주 달성률에서 제외/);assert.match(html,/일정 예약 저장/)
})

test('existing schedule editor retains next-Monday application instead of immediate registration',()=>{
  const state={...weekly(),version:'1',nextEffectiveFrom:'2026-11-16'}
  const html=renderToStaticMarkup(React.createElement(ScheduleEditor,{state,routines:[],busy:false,onSave(){},onCancel(){}}))
  assert.match(html,/2026-11-16부터 적용/);assert.doesNotMatch(html,/즉시 적용/)
})

test('first registration week renders two out of three without inventing plans before registration',()=>{
  const data=planned();data.statistics.plannedWorkoutDays=3;data.statistics.routineAchievementPercent='66.666667';data.effectiveWorkoutDays='2'
  data.plannedDays=[{date:'2026-11-09',status:'BEFORE_REGISTRATION',scheduleVersion:null,plan:null,plannedExercises:null,completedExercises:null,effectiveDay:null,selectedSessionId:null}]
  assert.equal(overview(data),true)
  const html=renderToStaticMarkup(React.createElement(StatisticsView,{data:data.statistics,planning:data,screen:'summary',onScreen(){},onOpen(){},onHistory(){}}))
  assert.match(html,/2 \/ 3일/);assert.match(html,/66\.666667%/);assert.match(html,/최초 등록 전 · 달성률 제외/);assert.doesNotMatch(html,/과거 계획 확인 불가|undefined|null종목/)
})
test('cardio totals keep different kinds separate and label manual calculated and unknown legacy distances',()=>{
  const data=planned();data.cardioByKind=[{kind:'TREADMILL',activeMs:'1800000',distanceKm:'4',manualDistanceKm:null,calculatedDistanceKm:'4',unknownSourceDistanceKm:null,manualRecords:'0',calculatedRecords:'1',unknownSourceRecords:'0',recordsWithoutDistance:'0'},
    {kind:'BIKE',activeMs:'3600000',distanceKm:'20',manualDistanceKm:'18',calculatedDistanceKm:null,unknownSourceDistanceKm:'2',manualRecords:'1',calculatedRecords:'0',unknownSourceRecords:'1',recordsWithoutDistance:'0'}]
  assert.equal(overview(data),true)
  const html=renderToStaticMarkup(React.createElement(StatisticsView,{data:data.statistics,planning:data,screen:'activity',onScreen(){},onOpen(){},onHistory(){}}))
  for(const text of ['러닝머신','자전거','계산 거리 4 km','직접 입력 18 km','출처 미확인 2 km'])assert.ok(html.includes(text))
  assert.doesNotMatch(html,/24 km|총 거리/)
})
