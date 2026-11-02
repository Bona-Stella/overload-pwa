import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { GrowthApi, growthPoint } from '../src/features/statistics/growth.ts'
import { scope, OTHER } from './fixtures/workout-online-data.mjs'
registerHooks({load(url,context,next){
  if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText}
  return next(url,context)
}})
const {GrowthGraph,GrowthPanel}=await import('../src/features/statistics/GrowthPanel.tsx')
const ID='11111111-1111-4111-8111-111111111111',SECOND='22222222-2222-4222-8222-222222222222'
const selected={routineId:OTHER,placementId:ID,routineName:'deleted routine',deleted:true,lastApprovalAt:'2026-11-01T00:00:00Z'}
const envelope=()=>({...scope,period:'3',range:{fromDate:'2026-08-02',toDateExclusive:'2026-11-03',timeZone:'UTC'}})
const point=(id=ID)=>({id,previousWeightKg:'80',approvedWeightKg:'82.5',occurredAt:'2026-11-01T00:00:00Z',recordedAt:'2026-11-01T00:00:01Z',source:'ROUTINE_EDITOR',sessionId:null,connectFromPrevious:false,previousPointId:null})
test('growth search uses authenticated GET, chosen period, literal query and original abort signal',async()=>{
  let request;const data={...envelope(),query:'old %',offset:0,exercises:[{standardExerciseId:OTHER,name:'old exercise',lastPerformedAt:null,lastApprovalAt:'2026-11-01T00:00:00Z'}],nextOffset:null}
  const api=new GrowthApi({workoutRequest:async(...args)=>{request=args;return{status:200,data}}}),signal=new AbortController().signal
  assert.deepEqual(await api.search(scope,'3','UTC','old %',0,signal),data)
  assert.equal(request[0],scope.userId);assert.equal(request[2],'GET');assert.equal(request[3],undefined);assert.equal(request[4],signal)
  assert.match(request[1],/period=3&timeZone=UTC&q=old\+%25&offset=0/)
})
test('growth options and history reject mismatched owners generations standard exercises and placements',async()=>{
  const data={...envelope(),standardExerciseId:OTHER,name:'lift',placements:[selected]}
  for(const [patch,code] of [[{userId:ID},'OWNER_MISMATCH'],[{dataGeneration:'9'},'DATA_GENERATION_MISMATCH'],[{standardExerciseId:ID},'RESPONSE_INVALID']]){
    const api=new GrowthApi({workoutRequest:async()=>({status:200,data:{...data,...patch}})})
    await assert.rejects(api.options(scope,OTHER,'3','UTC',new AbortController().signal),error=>error.code===code)
  }
  const history={...envelope(),standardExerciseId:OTHER,placement:selected,offset:0,points:[point()],nextOffset:null}
  const api=new GrowthApi({workoutRequest:async()=>({status:200,data:{...history,placement:{...selected,routineId:ID}}})})
  await assert.rejects(api.history(scope,OTHER,selected,'3','UTC',0,new AbortController().signal),error=>error.code==='RESPONSE_INVALID')
})
test('growth keeps exact decimal values and rejects invented sources unsafe numbers and unknown provenance',()=>{
  assert.equal(growthPoint({...point(),approvedWeightKg:'99999999999999.999999'}),true)
  for(const patch of [{approvedWeightKg:82.5},{approvedWeightKg:'8e2'},{source:'DELOAD'},{source:'WORKOUT'},{previousPointId:'unknown'},{approvedWeightKg:'-1'},{connectFromPrevious:true}])assert.equal(growthPoint({...point(),...patch}),false)
})
test('growth chart connects only the actual adjacent predecessor and never supplies an initial baseline',()=>{
  const a=point(),b={...point(SECOND),previousWeightKg:'82.5',approvedWeightKg:'85',occurredAt:'2026-11-02T00:00:00Z',recordedAt:'2026-11-02T00:00:01Z',connectFromPrevious:true,previousPointId:ID}
  const render=points=>renderToStaticMarkup(React.createElement(GrowthGraph,{points,zone:'UTC'}))
  assert.equal((render([b,a]).match(/data-growth-segment/g)||[]).length,1)
  assert.equal((render([a,{...b,previousPointId:OTHER}]).match(/data-growth-segment/g)||[]).length,0)
  assert.equal((render([a,{...b,connectFromPrevious:false}]).match(/data-growth-segment/g)||[]).length,0)
  assert.equal((render([a]).match(/<circle/g)||[]).length,1)
  assert.match(render([]),/승인 중량 변경 기록이 없습니다/)
})
test('large decimal and zero approved weights render without floating point loss',()=>{
  const html=renderToStaticMarkup(React.createElement(GrowthGraph,{points:[{...point(),approvedWeightKg:'99999999999999.999999'},{...point(SECOND),occurredAt:'2026-11-02T00:00:00Z',approvedWeightKg:'0'}],zone:'UTC'}))
  assert.match(html,/99999999999999\.999999/);assert.match(html,/0 kg/);assert.doesNotMatch(html,/NaN|Infinity/)
})
test('growth screen exposes all four periods and historical search without claiming workout load is approval',()=>{
  const html=renderToStaticMarkup(React.createElement(GrowthPanel,{api:new GrowthApi({workoutRequest:async()=>{throw Error('SSR must not fetch')}}),scope,refreshKey:'test',onInvalid(){},onOpen(){}}))
  for(const value of ['1개월','3개월','6개월','전체','과거 운동 검색'])assert.ok(html.includes(value))
  assert.match(html,/실제 수행 중량과 구분/);assert.match(html,/미전송 기록은 포함되지 않습니다/)
})
test('growth rejects a nonadvancing page instead of silently looping or mixing an unexpected page',async()=>{
  const data={...envelope(),standardExerciseId:OTHER,placement:selected,offset:0,points:[point()],nextOffset:0}
  const api=new GrowthApi({workoutRequest:async()=>({status:200,data})})
  await assert.rejects(api.history(scope,OTHER,selected,'3','UTC',0,new AbortController().signal),error=>error.code==='RESPONSE_INVALID')
})
