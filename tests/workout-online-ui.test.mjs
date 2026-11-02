import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { scope, DEVICE, OTHER, bootstrap, routine, session, start } from './fixtures/workout-online-data.mjs'
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier,context) } catch(error) {
      if(!specifier.startsWith('.'))throw error
      for(const extension of ['.ts','.tsx']){try{return nextResolve(specifier+extension,context)}catch{/* current TSX resolution */}}
      throw error
    }
  },
  load(url,context,nextLoad){
    if(url.endsWith('.css'))return{format:'module',source:'export default ""',shortCircuit:true}
    if(url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText}
    return nextLoad(url,context)
  }
})
const {WorkspaceView,SessionView}=await import('../src/features/workout-online/WorkoutWorkspace.tsx')
const {RoutineForm}=await import('../src/features/workout-online/RoutineForm.tsx')
const {LocalWorkoutView}=await import('../src/features/workout-local/LocalWorkoutScreen.tsx')
const {ClosedWorkoutView}=await import('../src/features/workout-online/ClosedWorkout.tsx')
const {createLocalWorkout,applyLocalChange,editDraft,completeSet}=await import('../src/features/workout-local/model.ts')
const render=(type,props)=>renderToStaticMarkup(React.createElement(type,props))
const state={...scope,scope,userId:scope.userId,data:bootstrap,selected:null,active:null,detail:null,deviceId:DEVICE,attempt:null,status:'ready',busy:false,localReady:true,copySaved:false,issue:null,notice:''}
const editorState=workout=>({workout,writable:true,loading:false,pending:0,issue:null,drafts:{},cardioDrafts:{},unsavedDrafts:false})
test('AUTO_CLOSED UI keeps actual end absent, distinguishes assessments and hides protocol counters',()=>{
  const server=session({status:'AUTO_CLOSED',closedAt:'2026-11-01T01:00:00.000Z'})
  const html=render(ClosedWorkoutView,{state:{server,assessment:{completionAssessment:null,currentAssessment:{state:'EXCLUDED',reasonCodes:['AUTO_CLOSED'],evaluation:null}},changes:{events:[]},copies:[],pending:null,busy:false,writable:false,issue:null,notice:''},controller:{}})
  assert.match(html,/실제 운동 종료 없음/);assert.match(html,/최초 종료 평가/);assert.match(html,/현재 기록 기준 평가/);assert.match(html,/현재 평가 자격 없음/);assert.match(html,/읽기 전용/);assert.doesNotMatch(html,/epoch|revision|hash/)
})
test('deleted closed-session UI blocks corrections, recovery and deletion controls while retaining its history',()=>{
  const server=session({status:'AUTO_CLOSED',closedAt:'2026-11-01T01:00:00.000Z',deletedAt:'2026-11-01T01:01:00.000Z'})
  const html=render(ClosedWorkoutView,{state:{server,assessment:null,changes:{events:[]},copies:[],pending:null,busy:false,writable:true,issue:null,notice:''},controller:{}})
  assert.match(html,/삭제된 운동/);assert.match(html,/기록 변경 이력/);assert.doesNotMatch(html,/선택한 완료 수행 복구 확인|운동 전체 논리 삭제|세트 정정·삭제/)
})
test('closed history shows preserved before/after values without exposing request protocol fields',()=>{
  const server=session({status:'AUTO_CLOSED',closedAt:'2026-11-01T01:00:00.000Z'}),event={id:OTHER,recordKind:'SET',changeKind:'CORRECTED',recordedAt:server.closedAt,before:{ordinal:1,weightKg:'60',reps:8},after:{ordinal:1,weightKg:'62.5',reps:9},changeContext:{sessionVersion:'2'}}
  const html=render(ClosedWorkoutView,{state:{server,assessment:null,changes:{events:[event]},copies:[],pending:null,busy:false,writable:true,issue:null,notice:''},controller:{}})
  assert.match(html,/변경 전 1세트 · 60 kg × 8회/);assert.match(html,/변경 후 1세트 · 62.5 kg × 9회/);assert.doesNotMatch(html,/sessionVersion|epoch|revision|hash/)
})
test('a preserved explicit cardio skip may be deleted without inventing completed measurements',()=>{
  const server=session({status:'AUTO_CLOSED',closedAt:'2026-11-01T01:00:00.000Z'});server.snapshot.state.cardioResults=[{id:OTHER,sessionActivityId:DEVICE,status:'SKIPPED',startedAt:null,occurredAt:server.closedAt,result:null}]
  const html=render(ClosedWorkoutView,{state:{server,assessment:null,changes:{events:[]},copies:[],pending:null,busy:false,writable:true,issue:null,notice:''},controller:{}})
  assert.match(html,/명시 건너뜀/);assert.match(html,/건너뜀 기록 삭제/);assert.doesNotMatch(html,/유산소 정정·삭제|거리 0 km|심박수 0/)
})

test('real workout view uses original plan, decimal text and local-only labels without a demo assessment or FINISH action',()=>{
  const w=createLocalWorkout(session(),bootstrap.settings),html=render(LocalWorkoutView,{state:editorState(w),controller:{},definitions:bootstrap.exercises})
  assert.match(html,/99999999999999.999999/);assert.match(html,/1세트 중량 kg/);assert.match(html,/1세트 이번 반복 횟수/);assert.match(html,/시작 당시 불변 계획/)
  assert.doesNotMatch(html,/목표 달성|증량 가능|운동 종료 및 요약|서버 저장 완료/)
})
test('real completed set is shown only from persisted facts, and read-only tabs disable edits',()=>{
  const w=applyLocalChange(createLocalWorkout(session(),bootstrap.settings),x=>{editDraft(x,x.currentExerciseId,1,{weight:'0.000001',reps:'8'});completeSet(x,x.currentExerciseId,1,Date.parse(x.startedAt)+1000)})
  const html=render(LocalWorkoutView,{state:{...editorState(w),writable:false},controller:{},definitions:[]})
  assert.match(html,/읽기 전용/);assert.doesNotMatch(html,/revision|epoch|hash/);assert.match(html,/0.000001/);assert.match(html,/disabled="" aria-label="1세트 완료 취소"/)
})

test('BODYWEIGHT recording offers an empty optional extra field without copying the existing weight',()=>{
  const w=createLocalWorkout(session(),bootstrap.settings);w.snapshot.appliedPlan.weightExercises[0].loadType='BODYWEIGHT'
  const html=render(LocalWorkoutView,{state:editorState(w),controller:{},definitions:[]})
  assert.match(html,/aria-label="1세트 추가 중량 kg"[^>]*value=""/);assert.match(html,/체중은 포함하지 않습니다/)
  const ordinary=createLocalWorkout(session(),bootstrap.settings)
  assert.doesNotMatch(render(LocalWorkoutView,{state:editorState(ordinary),controller:{},definitions:[]}),/세트 추가 중량 kg/)
})

test('BODYWEIGHT history distinguishes explicit extra from unknown legacy weight in records and correction audit',()=>{
  const server=session({status:'FINISHED',closedAt:'2026-11-01T01:00:00Z'}),id=server.initialPlan.weightExercises[0].sessionExerciseId
  const record={id:OTHER,sessionExerciseId:id,ordinal:1,weightKg:'80',reps:8,completedAt:server.startedAt,weightContext:{kind:'TODAY_ONLY',requestId:null},manufacturerId:null,loadType:'BODYWEIGHT',bodyweightLoad:{additionalWeightKg:'10'}}
  server.snapshot.state.performedSets=[record]
  const before={...record};delete before.bodyweightLoad
  const event={id:DEVICE,recordKind:'SET',recordId:OTHER,changeKind:'CORRECTED',recordedAt:server.closedAt,before,after:record,changeContext:{sessionVersion:'2'}}
  const html=render(ClosedWorkoutView,{state:{server,assessment:null,changes:{events:[event]},copies:[],pending:null,busy:false,writable:true,issue:null,notice:''},controller:{}})
  assert.match(html,/명시적 추가 중량 10 kg/);assert.match(html,/추가 중량 근거 없음 · 세트·반복만 집계/)
  assert.doesNotMatch(html,/명시적 추가 중량 80 kg|체중 80/)
})
test('INTEGER-sized planned count renders a bounded pending window rather than allocating planned slots',()=>{
  const w=createLocalWorkout(session(),bootstrap.settings);w.snapshot.appliedPlan.weightExercises[0].setCount=2147483647
  const html=render(LocalWorkoutView,{state:editorState(w),controller:{},definitions:[]})
  assert.equal((html.match(/aria-label="\d+세트 중량 kg"/g)??[]).length,20);assert.match(html,/2147483647세트/)
})
test('failed local write is never labeled as successful local saving',()=>{
  const html=render(LocalWorkoutView,{state:{...editorState(createLocalWorkout(session(),bootstrap.settings)),issue:'저장 실패'},controller:{},definitions:[]})
  assert.match(html,/최근 변경 미확정/);assert.doesNotMatch(html,/이 기기에 저장됨/)
})
test('new account shows empty routines without demo seeds or workout input controls',()=>{
  const html=render(WorkspaceView,{state:{...state,data:{...bootstrap,routines:[]}},controller:{}})
  assert.match(html,/아직 루틴이 없습니다/);assert.match(html,/새 루틴 만들기/)
  assert.doesNotMatch(html,/PUSH|PULL|LEGS|세트 완료|운동 종료<|타이머 시작/)
})
test('selected server routine preserves exact decimals and START is blocked without durable storage or while another active session exists',()=>{
  for(const patch of [{localReady:false},{active:session()},{attempt:{...scope,request:start,requestJson:JSON.stringify(start)}}]){
    const html=render(WorkspaceView,{state:{...state,selected:routine,...patch},controller:{}})
    assert.match(html,/99999999999999.999999/);assert.match(html,/<button[^>]*disabled=""[^>]*>온라인으로 운동 시작/)
  }
})
test('other editor is read only; AUTO_CLOSED does not claim a user finish or offer recovery yet',()=>{
  const html=render(SessionView,{session:session({editorDeviceId:OTHER}),deviceId:DEVICE,saved:true,busy:false,onRefresh(){}})
  assert.match(html,/다른 기기에서 편집 중/);assert.doesNotMatch(html,/<input|세트 완료/)
  const auto=render(SessionView,{session:session({status:'AUTO_CLOSED',closedAt:'2026-11-01T12:00:00Z'}),deviceId:DEVICE,saved:true,busy:false,onRefresh(){}})
  assert.match(auto,/서버 자동 종료/);assert.doesNotMatch(auto,/<input|복구 확인<|완료한 운동입니다/)
})
test('routine form keeps original weight separate and requires explicit approval; schedule and evaluation algorithms are absent',()=>{
  const html=render(RoutineForm,{routine,generation:scope.dataGeneration,exercises:bootstrap.exercises,busy:false,controller:{},onClose(){}})
  assert.match(html,/최초 0 kg/);assert.match(html,/현재 승인 99999999999999.999999 kg/);assert.match(html,/루틴 저장으로 새 중량 승인/)
  assert.doesNotMatch(html,/운동 요일|structureModified|자동 증량|새 승인 중량 \(kg\)/)
})
test('server strings are escaped, and the local-save warning never claims workout recording is ready',()=>{
  const value=session();value.initialPlan.routineName='<img src=x onerror=alert(1)>'
  const html=render(SessionView,{session:value,deviceId:DEVICE,saved:false,busy:false,onRefresh(){}})
  assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img/);assert.match(html,/수행 입력을 시작할 수 없습니다/)
})

test('standard routine UI shows catalog search and optional equipment without personal creation',()=>{
  const html=render(RoutineForm,{routine:null,generation:scope.dataGeneration,exercises:[],manufacturers:[],busy:false,controller:{},onClose(){}})
  assert.match(html,/role="combobox"/);assert.match(html,/등록된 표준 운동이 없습니다/)
  assert.doesNotMatch(html,/내 종목 생성|목록에 없는 내 종목|내 운동 종목/)
  const edit=render(RoutineForm,{routine,generation:scope.dataGeneration,exercises:bootstrap.exercises,manufacturers:[],busy:false,controller:{},onClose(){}})
  assert.match(edit,/제조사 · 선택/);assert.match(edit,/부하 방식 · 선택/);assert.match(edit,/제거한 배치 조회/)
})

test('closed completed sets display the recorded manufacturer rather than the current plan equipment',()=>{
  const server=session({status:'AUTO_CLOSED',closedAt:'2026-11-01T01:00:00.000Z'})
  server.snapshot.state.performedSets=[{id:OTHER,sessionExerciseId:server.initialPlan.weightExercises[0].sessionExerciseId,ordinal:1,weightKg:'60',reps:8,completedAt:server.startedAt,weightContext:{kind:'INITIAL_APPROVED',requestId:null},manufacturerId:DEVICE,loadType:'PLATE'}]
  const html=render(ClosedWorkoutView,{state:{server,assessment:null,changes:{events:[]},copies:[],pending:null,busy:false,writable:true,issue:null,notice:''},controller:{},manufacturers:[{id:DEVICE,name:'파나타'}]})
  assert.match(html,/파나타 · 원판식/)
})
