import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StatisticsApi, statistics, periodFor, weightStats } from '../src/features/statistics/api.ts'
import { scope, OTHER } from './fixtures/workout-online-data.mjs'

registerHooks({load(url,context,next){
  if(url.endsWith('.css'))return{format:'module',source:'export default ""',shortCircuit:true}
  if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText}
  return next(url,context)
}})
const {StatisticsView,WeightChart}=await import('../src/features/statistics/StatisticsPanel.tsx')
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
  assert.match(html,/3세트 · 30회/);assert.match(html,/시작 계획 없음/);assert.doesNotMatch(html,/>총중량<|0 kg/)
})
