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
const {createLocalWorkout,applyLocalChange,editDraft,completeSet}=await import('../src/features/workout-local/model.ts')
const render=(type,props)=>renderToStaticMarkup(React.createElement(type,props))
const state={...scope,scope,userId:scope.userId,data:bootstrap,selected:null,active:null,detail:null,deviceId:DEVICE,attempt:null,status:'ready',busy:false,localReady:true,copySaved:false,issue:null,notice:''}
const editorState=workout=>({workout,writable:true,loading:false,pending:0,issue:null,drafts:{},cardioDrafts:{},unsavedDrafts:false})

test('real workout view uses original plan, decimal text and local-only labels without a demo assessment or FINISH action',()=>{
  const w=createLocalWorkout(session(),bootstrap.settings),html=render(LocalWorkoutView,{state:editorState(w),controller:{},definitions:bootstrap.exercises})
  assert.match(html,/99999999999999.999999/);assert.match(html,/1세트 중량 kg/);assert.match(html,/1세트 이번 반복 횟수/);assert.match(html,/시작 당시 불변 계획/)
  assert.doesNotMatch(html,/목표 달성|증량 가능|운동 종료 및 요약|서버 저장 완료/)
})
test('real completed set is shown only from persisted facts, and read-only tabs disable edits',()=>{
  const w=applyLocalChange(createLocalWorkout(session(),bootstrap.settings),x=>{editDraft(x,x.currentExerciseId,1,{weight:'0.000001',reps:'8'});completeSet(x,x.currentExerciseId,1,Date.parse(x.startedAt)+1000)})
  const html=render(LocalWorkoutView,{state:{...editorState(w),writable:false},controller:{},definitions:[]})
  assert.match(html,/읽기 전용/);assert.match(html,/서버 미전송 변경 있음/);assert.match(html,/0.000001/);assert.match(html,/disabled="" aria-label="1세트 완료 취소"/)
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
  assert.match(html,/다른 기기가 편집권/);assert.doesNotMatch(html,/<input|권한 가져오기<|세트 완료/)
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
