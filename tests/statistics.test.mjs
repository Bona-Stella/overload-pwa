import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StatisticsApi, overview, periodFor, weightStats } from '../src/features/statistics/api.ts'
import { WeeklyScheduleApi, weeklySchedule } from '../src/features/statistics/weekly-schedule.ts'
import { scope, OTHER, routine } from './fixtures/workout-online-data.mjs'

registerHooks({load(url,context,next){
  if(url.endsWith('.css'))return{format:'module',source:'export default ""',shortCircuit:true}
  if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText}
  return next(url,context)
}})
const {StatisticsView,WeightChart}=await import('../src/features/statistics/StatisticsPanel.tsx')
const {ScheduleEditor}=await import('../src/features/statistics/WeeklySchedulePanel.tsx')
const weights={plannedSets:'4',completedSets:'3',reps:'28',volumeLoadKg:'2140',setsWithoutVolume:'0'}
const period={fromDate:'2026-10-26',toDateExclusive:'2026-11-02'}
const fixture=()=>({...scope,...period,planCoverage:'PARTIAL_SCHEDULE_HISTORY',plannedWorkoutDays:null,routineAchievementPercent:null,
  summary:{...weights},cardioActiveMs:'1800000',unmappedCompletedSets:'0',days:[{date:'2026-11-01',weights:{...weights},cardioActiveMs:'1800000'}],
  exercises:[{standardExerciseId:OTHER,name:'스쿼트',weights:{...weights}}],muscles:[{id:OTHER,name:'대퇴사두근',groupCode:'LEGS',role:'PRIMARY',weights:{...weights}},
    {id:scope.userId,name:'보조근',groupCode:'LEGS',role:'SECONDARY',weights:{...weights}}],groups:[{groupCode:'LEGS',role:'PRIMARY',weights:{...weights}}],
  cardio:[{kind:'TREADMILL',name:'달리기',activeMs:'1800000',distanceKm:'3.8',recordsWithoutDistance:'0'}],recentSessions:[]})

test('overview uses authenticated GET with no write body and preserves the original abort signal',async()=>{
  let request
  const api=new StatisticsApi({workoutRequest:async(...args)=>{request=args;return{status:200,data:planned()}}})
  const signal=new AbortController().signal,result=await api.overview(scope,period,signal)
  assert.equal(result.statistics.summary.volumeLoadKg,'2140');assert.equal(request[0],scope.userId)
  assert.equal(request[1],'/api/v1/statistics/overview?fromDate=2026-10-26&toDateExclusive=2026-11-02')
  assert.equal(request[2],'GET');assert.equal(request[3],undefined);assert.equal(request[4],signal)
})
test('overview rejects other owners, generations and mismatched date ranges before rendering',async()=>{
  for(const [patch,code] of [[{userId:OTHER},'OWNER_MISMATCH'],[{dataGeneration:'9'},'DATA_GENERATION_MISMATCH'],[{fromDate:'2026-10-27'},'RESPONSE_INVALID'],[{toDateExclusive:'2026-11-03'},'RESPONSE_INVALID']]){
    const api=new StatisticsApi({workoutRequest:async()=>({status:200,data:{...planned(),statistics:{...planned().statistics,...patch}}})})
    await assert.rejects(api.overview(scope,period,new AbortController().signal),error=>error.code===code)
  }
})
test('overview retains exact aggregate decimals and valid nulls while rejecting malformed facts',()=>{
  const data=planned();data.statistics.summary.volumeLoadKg='9007199254740993.500001';assert.equal(overview(data),true)
  for(const patch of [{volumeLoadKg:2140},{volumeLoadKg:'2e3'},{volumeLoadKg:'1.0000001'},{completedSets:'3',setsWithoutVolume:'4'}]){
    assert.equal(weightStats({...weights,...patch}),false)
    assert.equal(overview({...data,statistics:{...data.statistics,summary:{...weights,...patch}}}),false)
  }
  assert.equal(overview({...data,statistics:{...data.statistics,fromDate:'2026-02-30'}}),false)
  const unknown=partial()
  unknown.statistics.summary.volumeLoadKg=null;unknown.statistics.summary.setsWithoutVolume='3'
  unknown.statistics.cardio[0].distanceKm=null
  Object.assign(unknown.cardioByKind[0],{distanceKm:null,manualDistanceKm:null,manualRecords:'0',recordsWithoutDistance:'1'})
  assert.equal(overview(unknown),true)
  assert.equal(overview({...unknown,statistics:{...unknown.statistics,plannedWorkoutDays:4,routineAchievementPercent:'75'}}),false)
})

test('overview forwards cancellation to an in-flight transport request',async()=>{
  const controller=new AbortController(),failure=new DOMException('Cancelled','AbortError')
  const api=new StatisticsApi({workoutRequest:(_owner,_path,_method,_body,signal)=>new Promise((_resolve,reject)=>{
    signal.addEventListener('abort',()=>reject(signal.reason),{once:true})
  })})
  const pending=api.overview(scope,period,controller.signal)
  controller.abort(failure)
  await assert.rejects(pending,error=>error===failure)
})

test('week periods are Monday to Sunday and month periods keep true calendar length',()=>{
  assert.deepEqual(periodFor(new Date(2026,10,1,23,30),'week',0),period)
  assert.deepEqual(periodFor(new Date(2026,10,1),'week',1),{fromDate:'2026-11-02',toDateExclusive:'2026-11-09'})
  assert.deepEqual(periodFor(new Date(2026,0,31),'month',1),{fromDate:'2026-02-01',toDateExclusive:'2026-03-01'})
  assert.deepEqual(periodFor(new Date(2024,1,29),'month',0),{fromDate:'2024-02-01',toDateExclusive:'2024-03-01'})
})
test('summary distinguishes confirmed server records from unsent local facts and does not invent a weekly achievement',()=>{
  const html=renderToStaticMarkup(React.createElement(StatisticsView,{data:partial().statistics,planning:partial(),screen:'summary',onScreen(){},onOpen(){},onHistory(){}}))
  assert.match(html,/완료 웨이트 세트/);assert.match(html,/30분/);assert.match(html,/미전송 기록은 포함되지 않습니다/)
  assert.match(html,/아직 확인할 수 없습니다/);assert.doesNotMatch(html,/75%|100%/)
  assert.match(html,/운동 이력 전체 보기/);assert.match(html,/운동 현황/)
})
test('muscle detail keeps secondary contribution separate and shows partial schedule-history coverage',()=>{
  const html=renderToStaticMarkup(React.createElement(StatisticsView,{data:partial().statistics,planning:partial(),screen:'muscles',onScreen(){},onOpen(){},onHistory(){}}))
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
const planned=()=>({statistics:{...fixture(),planCoverage:'FULL_SCHEDULE_HISTORY',plannedWorkoutDays:4,routineAchievementPercent:'56.25'},effectiveWorkoutDays:'2.25',unknownPlanDays:0,unverifiableDays:0,plannedDays:[],cardioByKind:[{kind:'TREADMILL',activeMs:'1800000',distanceKm:'3.8',manualDistanceKm:'3.8',calculatedDistanceKm:null,unknownSourceDistanceKm:null,manualRecords:'1',calculatedRecords:'0',unknownSourceRecords:'0',recordsWithoutDistance:'0'}]})
const partial=()=>({...planned(),statistics:fixture(),effectiveWorkoutDays:null,unknownPlanDays:7})
const weekly=()=>({...scope,version:'0',timeZone:'Asia/Seoul',appliedAt:null,assignments:[]})
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
  assert.deepEqual(request[3],{contractVersion:'immediate-v1',dataGeneration:scope.dataGeneration,expectedVersion:'0',timeZone:'Asia/Seoul',assignments:draft})
  assert.deepEqual(draft,[{dayOfWeek:1,routineId:OTHER}])
  assert.equal(weeklySchedule({...state,version:'1',appliedAt:'2026-11-02T00:00:00Z',assignments:[{dayOfWeek:8,routineId:OTHER}]}),false)
})
test('schedule editor has seven routine or rest choices and makes immediate first registration explicit',()=>{
  const html=renderToStaticMarkup(React.createElement(ScheduleEditor,{state:weekly(),routines:[{id:OTHER,name:'routine',version:'0'}],busy:false,onSave(){},onCancel(){}}))
  assert.equal((html.match(/<select/g)||[]).length,7);assert.match(html,/저장 즉시 적용/);assert.match(html,/일정 저장/)
})

test('existing schedule editor applies immediately without reservation controls',()=>{
  const state={...weekly(),version:'1',appliedAt:'2026-11-06T00:00:00Z'}
  const html=renderToStaticMarkup(React.createElement(ScheduleEditor,{state,routines:[],busy:false,onSave(){},onCancel(){}}))
  assert.match(html,/저장 즉시 적용/);assert.doesNotMatch(html,/예약|다음 월요일/)
})

test('first registration week renders two out of three without inventing plans before registration',()=>{
  const data=planned();data.statistics.plannedWorkoutDays=3;data.statistics.routineAchievementPercent='66.666667';data.effectiveWorkoutDays='2'
  data.plannedDays=[{date:'2026-11-09',status:'BEFORE_REGISTRATION',scheduleVersion:null,plan:null,plannedExercises:null,completedExercises:null,effectiveDay:null,selectedSessionId:null,reviewStatus:null,reviewRevision:null}]
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

test('overview exercise names are escaped when rendered in the current statistics view',()=>{
  const data=planned();data.statistics.exercises[0].name='<img src=x onerror=alert(1)>'
  assert.equal(overview(data),true)
  const html=renderToStaticMarkup(React.createElement(StatisticsView,{data:data.statistics,planning:data,screen:'activity',onScreen(){},onOpen(){},onHistory(){}}))
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/)
  assert.doesNotMatch(html,/<img|<script/)
})


test('overview rejects missing or malformed required cardio totals instead of accepting old responses',async()=>{
  const absent=planned();delete absent.cardioByKind
  for(const data of [absent,...[null,{},[{}]].map(cardioByKind=>({...planned(),cardioByKind}))]){
    assert.equal(overview(data),false)
    const api=new StatisticsApi({workoutRequest:async()=>({status:200,data})})
    await assert.rejects(api.overview(scope,period,new AbortController().signal),error=>error.code==='RESPONSE_INVALID')
  }
  const empty={...planned(),cardioByKind:[]}
  assert.equal(overview(empty),true)
  const api=new StatisticsApi({workoutRequest:async()=>({status:200,data:empty})})
  assert.deepEqual(await api.overview(scope,period,new AbortController().signal),empty)
})

test('activity uses cardioByKind for both content and empty state without legacy cardio fallback',()=>{
  const data=planned();data.statistics.cardio[0].name='LEGACY_CARDIO_SENTINEL'
  const render=()=>renderToStaticMarkup(React.createElement(StatisticsView,{data:data.statistics,planning:data,screen:'activity',onScreen(){},onOpen(){},onHistory(){}}))
  data.cardioByKind=[]
  assert.match(render(),/유산소 기록이 없습니다/);assert.doesNotMatch(render(),/LEGACY_CARDIO_SENTINEL/)
  data.cardioByKind=planned().cardioByKind;data.statistics.cardio=[]
  const html=render()
  assert.match(html,/러닝머신 · 30분 · 3.8 km/);assert.match(html,/직접 입력 3.8 km/)
  assert.doesNotMatch(html,/유산소 기록이 없습니다|LEGACY_CARDIO_SENTINEL/)
})

test('overview requires planning fields while preserving null evidence and unknown cardio measurements',()=>{
  for(const key of ['plannedDays','effectiveWorkoutDays','unknownPlanDays','unverifiableDays']){
    const data=planned();delete data[key];assert.equal(overview(data),false)
  }
  const data=partial();data.cardioByKind=[{...planned().cardioByKind[0],distanceKm:null,manualDistanceKm:null,manualRecords:'0',recordsWithoutDistance:'1'}]
  data.plannedDays=[{date:period.fromDate,status:'UNKNOWN',scheduleVersion:null,plan:null,plannedExercises:null,completedExercises:null,effectiveDay:null,selectedSessionId:null,reviewStatus:null,reviewRevision:null}]
  assert.equal(overview(data),true)
  const activity=renderToStaticMarkup(React.createElement(StatisticsView,{data:data.statistics,planning:data,screen:'activity',onScreen(){},onOpen(){},onHistory(){}}))
  assert.match(activity,/러닝머신 · 30분/);assert.match(activity,/거리 미입력 기록 포함/);assert.doesNotMatch(activity,/ km/)
  const summary=renderToStaticMarkup(React.createElement(StatisticsView,{data:data.statistics,planning:data,screen:'summary',onScreen(){},onOpen(){},onHistory(){}}))
  assert.match(summary,/과거 계획 확인 불가/);assert.doesNotMatch(summary,/0%|100%|null종목|undefined/)
  const unverifiable=planned();unverifiable.unverifiableDays=1;unverifiable.effectiveWorkoutDays=null;unverifiable.statistics.routineAchievementPercent=null
  assert.equal(overview(unverifiable),true)
  const html=renderToStaticMarkup(React.createElement(StatisticsView,{data:unverifiable.statistics,planning:unverifiable,screen:'summary',onScreen(){},onOpen(){},onHistory(){}}))
  assert.match(html,/확인 중/);assert.match(html,/유산소 목표 달성 확인 필요/)
})

function cardioTimeData(activeMs, plans = [{ date: period.fromDate, targets: [{ kind: 'TREADMILL', seconds: 1800 }] }], range = period) {
  const data = planned()
  const kind = plans[0]?.targets[0]?.kind ?? 'TREADMILL'
  Object.assign(data.statistics, range, { cardioActiveMs: activeMs, cardio: activeMs === '0' ? [] : [{ kind, name: kind, activeMs, distanceKm: null, recordsWithoutDistance: '1' }], plannedWorkoutDays: plans.length, routineAchievementPercent: null })
  data.effectiveWorkoutDays = '0'
  data.cardioByKind = activeMs === '0' ? [] : [{ kind, activeMs, distanceKm: null, manualDistanceKm: null, calculatedDistanceKm: null, unknownSourceDistanceKm: null,
    manualRecords: '0', calculatedRecords: '0', unknownSourceRecords: '0', recordsWithoutDistance: '1' }]
  data.plannedDays = []
  for (let at = Date.parse(range.fromDate); at < Date.parse(range.toDateExclusive); at += 86400000) {
    const date = new Date(at).toISOString().slice(0, 10), entry = plans.find(p => p.date === date)
    data.plannedDays.push({ date, status: entry ? 'PLANNED' : 'REST', scheduleVersion: '1',
      plan: entry ? { ...scope, id: OTHER, version: '1', name: '당시 유산소 계획', weightPlacements: [],
        cardioPlacements: entry.targets.map((target, index) => ({ id: index === 0 ? scope.userId : OTHER, deletedAt: null,
          plan: { kind: target.kind, name: target.kind, targetSeconds: target.seconds, targetDistanceKm: null, intensity: null, inclinePercent: null, resistance: null },
        })),
      } : null, plannedExercises: entry?.targets.length ?? 0, completedExercises: 0, effectiveDay: '0', selectedSessionId: null, reviewStatus: null, reviewRevision: null,
    })
  }
  return data
}
function renderCardioTime(data) {
  assert.equal(overview(data), true)
  return renderToStaticMarkup(React.createElement(StatisticsView, { data: data.statistics, planning: data, screen: 'activity', onScreen() {}, onOpen() {}, onHistory() {} }))
}

for (const [label, activeMs, text] of [['longer', '2400000', '40분'], ['shorter', '1200000', '20분'], ['equal', '1800000', '30분']]) {
  test(`cardio detail shows actual / planned period time when actual is ${label} without inventing achievement metrics`, () => {
    const html = renderCardioTime(cardioTimeData(activeMs))
    assert.ok(html.includes(`실제 누적 ${text} / 계획 30분`))
    assert.match(html, /계획 외 유산소도 포함/)
    assert.doesNotMatch(html, /NaN|Infinity|유산소 달성률/)
  })
}

test('cardio period comparison sums each dated plan once across kinds while preserving kind-specific distances and sources', () => {
  const data = cardioTimeData('5400000', [
    { date: period.fromDate, targets: [{ kind: 'TREADMILL', seconds: 1200 }, { kind: 'BIKE', seconds: 1800 }] },
    { date: '2026-10-30', targets: [{ kind: 'TREADMILL', seconds: 600 }] },
  ])
  data.cardioByKind = [
    { ...planned().cardioByKind[0], activeMs: '1800000' },
    { kind: 'BIKE', activeMs: '3600000', distanceKm: '20', manualDistanceKm: null, calculatedDistanceKm: '20', unknownSourceDistanceKm: null, manualRecords: '0', calculatedRecords: '1', unknownSourceRecords: '0', recordsWithoutDistance: '0' },
  ]
  const html = renderCardioTime(data)
  assert.match(html, /실제 누적 90분 \/ 계획 60분/)
  for (const text of ['러닝머신 · 30분 · 3.8 km', '자전거 · 60분 · 20 km', '직접 입력 3.8 km', '계산 거리 20 km']) assert.ok(html.includes(text))
  assert.doesNotMatch(html, /23.8 km|총 거리/)
})

test('known absence of cardio plans is distinct from unknown historical planning and never becomes a zero denominator', () => {
  const none = cardioTimeData('900000', [])
  let html = renderCardioTime(none)
  assert.match(html, /실제 누적 15분 · 계획 없음/); assert.doesNotMatch(html, /계획 0분|NaN|Infinity/)
  // A known weight-only plan also has no cardio goal.
  const weightOnly = cardioTimeData('900000')
  weightOnly.plannedDays[0].plan.cardioPlacements = []
  weightOnly.plannedDays[0].plan.weightPlacements = routine.weightPlacements
  html = renderCardioTime(weightOnly); assert.match(html, /계획 없음/)
  const unknown = cardioTimeData('900000')
  Object.assign(unknown.statistics, { planCoverage: 'PARTIAL_SCHEDULE_HISTORY', plannedWorkoutDays: null, routineAchievementPercent: null })
  unknown.unknownPlanDays = 1; unknown.effectiveWorkoutDays = null
  Object.assign(unknown.plannedDays[1], { status: 'UNKNOWN', plan: null, plannedExercises: null, completedExercises: null, effectiveDay: null })
  html = renderCardioTime(unknown)
  assert.match(html, /실제 누적 15분 · 계획 시간 확인 불가/); assert.doesNotMatch(html, /계획 없음|계획 0분|\/ 계획 30분/)
})

test('first-registration exclusions and unverifiable intensity do not erase known time goals', () => {
  const data = cardioTimeData('1800000', [{ date: '2026-10-29', targets: [{ kind: 'TREADMILL', seconds: 1800 }] }])
  for (const day of data.plannedDays.slice(0, 3)) Object.assign(day, { status: 'BEFORE_REGISTRATION', scheduleVersion: null, plannedExercises: null, completedExercises: null, effectiveDay: null })
  Object.assign(data.plannedDays[3], { status: 'UNVERIFIABLE', completedExercises: null, effectiveDay: null })
  data.plannedDays[3].plan.cardioPlacements[0].plan.intensity = { mode: 'SPEED', value: '8' }
  data.unverifiableDays = 1; data.effectiveWorkoutDays = null
  assert.match(renderCardioTime(data), /실제 누적 30분 \/ 계획 30분/)
})

test('an explicit zero cumulative actual time and empty performed arrays retain known goals', () => {
  const data = cardioTimeData('0')
  assert.deepEqual(data.cardioByKind, []); assert.deepEqual(data.statistics.cardio, [])
  const html = renderCardioTime(data)
  assert.match(html, /실제 누적 0분 \/ 계획 30분/); assert.match(html, /유산소 기록이 없습니다/)
})

test('cardio comparison preserves milliseconds and large counter precision instead of rounding positive goals to zero minutes', () => {
  const plans = [{ date: period.fromDate, targets: [{ kind: 'OTHER', seconds: 1 }] }]
  assert.match(renderCardioTime(cardioTimeData('1', plans)), /실제 누적 0.001초 \/ 계획 1초/)
  assert.match(renderCardioTime(cardioTimeData('1', plans)), /기타 · 0.001초/)
  assert.match(renderCardioTime(cardioTimeData('59999', plans)), /실제 누적 59.999초 \/ 계획 1초/)
  assert.match(renderCardioTime(cardioTimeData('60001', plans)), /실제 누적 1분 0.001초 \/ 계획 1초/)
  assert.match(renderCardioTime(cardioTimeData('9007199254740993', plans)), /실제 누적 150119987579분 0.993초 \/ 계획 1초/)
})

test('missing or null actual time and unsupported zero/missing/null plan targets are rejected by the unchanged API validator', async () => {
  const invalid = []
  for (const value of [null, undefined]) {
    const data = cardioTimeData('0'); data.statistics.cardioActiveMs = value; invalid.push(data)
  }
  for (const value of [0, null, undefined]) {
    const data = cardioTimeData('0'); data.plannedDays[0].plan.cardioPlacements[0].plan.targetSeconds = value; invalid.push(data)
  }
  for (const data of invalid) {
    const api = new StatisticsApi({ workoutRequest: async () => ({ status: 200, data }) })
    await assert.rejects(api.overview(scope, period, new AbortController().signal), { code: 'RESPONSE_INVALID' })
  }
})

test('cardio comparison uses only the selected week/month overview returned through the current API query', async () => {
  const ranges = [periodFor(new Date(2026, 10, 3), 'week', -1), periodFor(new Date(2026, 10, 3), 'month', -1)]
  for (const [index, range] of ranges.entries()) {
    const expectedMinutes = (index + 1) * 20
    const data = cardioTimeData(String(expectedMinutes * 60000), [{ date: range.fromDate, targets: [{ kind: 'BIKE', seconds: (index + 1) * 600 }] }], range)
    const api = new StatisticsApi({ workoutRequest: async (userId, path, method, body) => {
      assert.equal(userId, scope.userId); assert.equal(method, 'GET'); assert.equal(body, undefined)
      assert.equal(path, '/api/v1/statistics/overview?' + new URLSearchParams(range))
      return { status: 200, data }
    } })
    const result = await api.overview(scope, range, new AbortController().signal)
    assert.ok(renderCardioTime(result).includes(`실제 누적 ${expectedMinutes}분 / 계획 ${(index + 1) * 10}분`))
  }
})

test('immediate schedule save sends its contract marker and confirms the authoritative state by GET',async()=>{
  const state=weekly(),saved={...state,version:'1',appliedAt:'2026-11-06T00:00:00Z',assignments:[{dayOfWeek:1,routineId:OTHER}]},calls=[];
  const api=new WeeklyScheduleApi({workoutRequest:async(...args)=>{calls.push(args);return{status:200,data:saved}}});
  assert.deepEqual(await api.save(scope,state,saved.assignments,new AbortController().signal),saved);
  assert.deepEqual(calls.map(c=>c[2]),['PUT','GET']);assert.equal(calls[0][3].contractVersion,'immediate-v1');
  assert.equal(weeklySchedule({...state,appliedAt:undefined,current:null,pending:null}),false);
});
