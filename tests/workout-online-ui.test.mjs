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
const {RoutineCards}=await import('../src/features/workout-online/RoutineCards.tsx')
const {LocalWorkoutView}=await import('../src/features/workout-local/LocalWorkoutScreen.tsx')
const {ClosedWorkoutView}=await import('../src/features/workout-online/ClosedWorkout.tsx')
const {summaryData}=await import('../src/features/workout-online/summary-data.ts')
const {createLocalWorkout,applyLocalChange,editDraft,completeSet}=await import('../src/features/workout-local/model.ts')
const render=(type,props)=>renderToStaticMarkup(React.createElement(type,props))
const state={...scope,scope,userId:scope.userId,data:bootstrap,selected:null,active:null,detail:null,deviceId:DEVICE,attempt:null,status:'ready',busy:false,localReady:true,copySaved:false,issue:null,notice:''}
const editorState=workout=>({workout:{...workout,warmupCompleted:true},memos:{},writable:true,loading:false,pending:0,issue:null,drafts:{},cardioDrafts:{},unsavedDrafts:false})
test('AUTO_CLOSED UI keeps actual end absent, distinguishes assessments and hides protocol counters',()=>{
  const server=session({status:'AUTO_CLOSED',closedAt:'2026-11-01T01:00:00.000Z'})
  const html=render(ClosedWorkoutView,{state:{server,assessment:{completionAssessment:null,currentAssessment:{state:'EXCLUDED',reasonCodes:['AUTO_CLOSED'],evaluation:null}},changes:{events:[]},copies:[],pending:null,busy:false,writable:false,issue:null,notice:''},controller:{}})
  assert.match(html,/실제 종료 시각 없음/);assert.match(html,/기록이 자동 마감/);assert.match(html,/평가 변경 이력/);assert.match(html,/읽기 전용/);assert.doesNotMatch(html,/epoch|revision|hash/)
})
test('deleted closed-session UI blocks corrections, recovery and deletion controls while retaining its history',()=>{
  const server=session({status:'AUTO_CLOSED',closedAt:'2026-11-01T01:00:00.000Z',deletedAt:'2026-11-01T01:01:00.000Z'})
  const html=render(ClosedWorkoutView,{state:{server,assessment:null,changes:{events:[]},copies:[],pending:null,busy:false,writable:true,issue:null,notice:''},controller:{}})
  assert.match(html,/삭제된 운동/);assert.match(html,/평가 변경 이력/);assert.doesNotMatch(html,/선택한 완료 수행 복구 확인|운동 전체 논리 삭제|세트 정정·삭제/)
})
test('closed history shows preserved before/after values without exposing request protocol fields',()=>{
  const server=session({status:'AUTO_CLOSED',closedAt:'2026-11-01T01:00:00.000Z'}),event={id:OTHER,recordKind:'SET',changeKind:'CORRECTED',recordedAt:server.closedAt,before:{ordinal:1,weightKg:'60',reps:8},after:{ordinal:1,weightKg:'62.5',reps:9},changeContext:{sessionVersion:'2'}}
  const html=render(ClosedWorkoutView,{state:{server,assessment:null,changes:{events:[event]},copies:[],pending:null,busy:false,writable:true,issue:null,notice:''},controller:{}})
  assert.match(html,/평가 변경 이력/);assert.doesNotMatch(html,/변경 전|변경 후/);assert.doesNotMatch(html,/sessionVersion|epoch|revision|hash/)
})
test('a preserved explicit cardio skip may be deleted without inventing completed measurements',()=>{
  const server=session({status:'AUTO_CLOSED',closedAt:'2026-11-01T01:00:00.000Z'});server.snapshot.state.cardioResults=[{id:OTHER,sessionActivityId:DEVICE,status:'SKIPPED',startedAt:null,occurredAt:server.closedAt,result:null}]
  const html=render(ClosedWorkoutView,{state:{server,assessment:null,changes:{events:[]},copies:[],pending:null,busy:false,writable:true,issue:null,notice:''},controller:{}})
  assert.match(html,/미시작|건너뜀/);assert.match(html,/기록 정정/);assert.doesNotMatch(html,/유산소 정정·삭제|거리 0 km|심박수 0/)
})

test('real workout view reuses approved layout with exact weight and truthful local status',()=>{
  const w=createLocalWorkout(session(),bootstrap.settings),html=render(LocalWorkoutView,{state:editorState(w),controller:{},definitions:bootstrap.exercises})
  assert.match(html,/99999999999999.999999/);assert.match(html,/data-workout-frame/);assert.match(html,/1세트 이번 반복 횟수/);assert.match(html,/기구 세팅 메모/);assert.match(html,/운동 종료/)
  assert.doesNotMatch(html,/목표 달성|증량 가능|합성 데이터|서버 저장 완료/)
})
test('real completed set is shown only from persisted facts, and read-only tabs disable edits',()=>{
  const w=applyLocalChange(createLocalWorkout(session(),bootstrap.settings),x=>{editDraft(x,x.currentExerciseId,1,{weight:'0.000001',reps:'8'});completeSet(x,x.currentExerciseId,1,Date.parse(x.startedAt)+1000)})
  const html=render(LocalWorkoutView,{state:{...editorState(w),writable:false},controller:{},definitions:[]})
  assert.match(html,/<fieldset disabled=""/);assert.doesNotMatch(html,/revision|epoch|hash/);assert.match(html,/8회/);assert.match(html,/aria-label="1세트 완료 취소"/)
})

test('BODYWEIGHT recording offers an empty optional extra field without copying the existing weight',()=>{
  const w=createLocalWorkout(session(),bootstrap.settings);w.snapshot.appliedPlan.weightExercises[0].loadType='BODYWEIGHT'
  const html=render(LocalWorkoutView,{state:editorState(w),controller:{},definitions:[]})
  assert.match(html,/role="group" aria-label="1세트 추가 중량 kg"/);assert.match(html,/체중은 포함하지 않습니다/)
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
  assert.match(html,/추가 10kg × 8회/);assert.match(html,/80kg/)
  assert.doesNotMatch(html,/명시적 추가 중량 80 kg|체중 80/)
})
test('INTEGER-sized planned count renders a bounded pending window rather than allocating planned slots',()=>{
  const w=createLocalWorkout(session(),bootstrap.settings);w.snapshot.appliedPlan.weightExercises[0].setCount=2147483647
  const html=render(LocalWorkoutView,{state:editorState(w),controller:{},definitions:[]})
  assert.equal((html.match(/role="group" aria-label="\d+세트 이번 반복 횟수"/g)??[]).length,20);assert.match(html,/2147483647세트/)
})
test('failed local write is never labeled as successful local saving',()=>{
  const html=render(LocalWorkoutView,{state:{...editorState(createLocalWorkout(session(),bootstrap.settings)),issue:'저장 실패'},controller:{},definitions:[]})
  assert.match(html,/최근 변경 미확정/);assert.doesNotMatch(html,/이 기기에 저장됨/)
})
test('new account shows empty routines without demo seeds or workout input controls',()=>{
  const html=render(WorkspaceView,{state:{...state,data:{...bootstrap,routines:[]}},controller:{},enabled:true,
    training:{schedule:{version:'0',activeId:OTHER,autoEnabled:false,presets:[{id:OTHER,name:'01 주간 일정',version:'0',included:false,assignments:[]}]},
      protection:null,loading:false,busy:false,canWrite:true}})
  assert.match(html,/아직 루틴이 없습니다/);assert.match(html,/새 루틴/)
  assert.doesNotMatch(html,/PUSH|PULL|LEGS|세트 완료|운동 종료<|타이머 시작/)
})
test('compact routine cards show only active exercise summaries and keep detail separate from the action menu',()=>{
  const detail={...routine,weightPlacements:[...routine.weightPlacements,{...routine.weightPlacements[0],id:OTHER,exerciseName:'제거된 종목',deletedAt:'2026-11-06T00:00:00Z'},{...routine.weightPlacements[0],id:DEVICE,exerciseName:'추가 종목'}]}
  const html=render(RoutineCards,{summaries:bootstrap.routines,details:new Map([[routine.id,detail]]),busy:false,onSelect(){},onNew(){},onEdit(){},onDelete(){}})
  assert.match(html,/벤치프레스 외 1/);assert.doesNotMatch(html,/제거된 종목|추가 종목/)
  assert.match(html,/ROUTINE 01/);assert.match(html,/CARDIO/);assert.match(html,/없음/)
  assert.match(html,/aria-label="실제 계정 루틴 Ω 상세"/);assert.match(html,/aria-label="실제 계정 루틴 Ω 메뉴"/)
  assert.match(html,/>수정<\/button>/);assert.match(html,/>삭제<\/button>/)
})

test('routine weekly tiles distinguish unregistered, explicit rest and an unavailable assigned routine',()=>{
  const props={summaries:[],details:new Map(),busy:false,onSelect(){},onNew(){}}
  const week={...scope,version:'0',timeZone:'Asia/Seoul',appliedAt:null,assignments:[]}
  const unregistered=render(RoutineCards,{...props,week})
  assert.match(unregistered,/미등록/);assert.doesNotMatch(unregistered,/휴식/)
  const rest=render(RoutineCards,{...props,week:{...week,version:'1',appliedAt:'2026-11-06T00:00:00Z'}})
  assert.match(rest,/휴식/);assert.doesNotMatch(rest,/미등록/)
  const unavailable=render(RoutineCards,{...props,week:{...week,version:'1',assignments:[{dayOfWeek:1,routineId:OTHER}]}})
  assert.match(unavailable,/월요일 · 루틴 확인 필요/)
})

test('routine detail reuses the read-only form with exact values and no editing or save actions',()=>{
  const html=render(RoutineForm,{routine,generation:scope.dataGeneration,exercises:bootstrap.exercises,busy:false,readOnly:true,controller:{},onClose(){}})
  assert.match(html,/99999999999999.999999/);assert.match(html,/루틴 상세/);assert.match(html,/<fieldset disabled=""/)
  assert.doesNotMatch(html,/루틴 저장|배치 제거|제거한 배치|웨이트 종목 추가|유산소 추가|새 중량 승인|↑ 위로|↓ 아래로|>변경</)
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
  assert.doesNotMatch(html,/structureModified|자동 증량|새 승인 중량 \(kg\)/)
})
test('server strings are escaped, and the local-save warning never claims workout recording is ready',()=>{
  const value=session();value.initialPlan.routineName='<img src=x onerror=alert(1)>'
  const html=render(SessionView,{session:value,deviceId:DEVICE,saved:false,busy:false,onRefresh(){}})
  assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img/);assert.match(html,/수행 입력을 시작할 수 없습니다/)
})

test('standard routine UI shows catalog search and optional equipment without personal creation',()=>{
  const html=render(RoutineForm,{routine:null,generation:scope.dataGeneration,exercises:[],manufacturers:[],busy:false,controller:{},onClose(){}})
  assert.match(html,/aria-expanded="false"/);assert.match(html,/웨이트 종목 추가/);assert.doesNotMatch(html,/role="combobox"/)
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

test('normal saved status reserves no notice while failures, offline and unsaved inputs stay visible',()=>{
  const w=createLocalWorkout(session(),bootstrap.settings)
  const view=patch=>render(LocalWorkoutView,{state:{...editorState(w),...patch},controller:{},definitions:[]})
  assert.doesNotMatch(view({syncStatus:'SAVED',syncIssue:null}),/서버에 저장됨|<aside/)
  assert.match(view({syncStatus:'WAITING',syncIssue:'연결 복구 후 재시도'}),/연결 복구 후 재시도/)
  assert.match(view({syncStatus:'CHECK',syncIssue:'서버 저장 실패'}),/서버 저장 실패/)
  assert.match(view({unsavedDrafts:true}),/입력 보존 확인 필요/)
})
test('saved provisional recommendations distinguish increase, decrease and no advice without changing approval',()=>{
  let w=createLocalWorkout(session(),bootstrap.settings)
  for(let n=1;n<=3;n++)w=applyLocalChange(w,x=>{editDraft(x,x.currentExerciseId,n,{weight:x.initialPlan.weightExercises[0].approvedWeightKg,reps:'10'});completeSet(x,x.currentExerciseId,n,Date.parse(x.startedAt)+n*1000)})
  w.rest=null
  const result={eligible:true,sessionExerciseId:w.currentExerciseId,comparisonContext:{approvedWeightKg:w.initialPlan.weightExercises[0].approvedWeightKg}}
  const view=advice=>render(LocalWorkoutView,{state:editorState(w),controller:{},definitions:[],progressAssessment:{evaluation:{exercises:[{...result,advice}]}}})
  assert.match(view('INCREASE'),/증량 가능/);assert.match(view('DECREASE'),/감량 검토/)
  assert.doesNotMatch(view('MAINTAIN'),/증량 가능|감량 검토/)
  w.weights[w.currentExerciseId].context={kind:'TODAY_ONLY',requestId:null}
  assert.doesNotMatch(view('INCREASE'),/증량 가능/)
})


function reviewedSession(advice='INCREASE', reps=[12,12,13],planned=3,min=8,max=12) {
  const server=session({status:'FINISHED',endedAt:'2026-10-31T12:30:00Z',closedAt:'2026-10-31T12:30:01Z'})
  const e=server.initialPlan.weightExercises[0];e.approvedWeightKg='40';e.setCount=planned
  server.snapshot.state.appliedPlan.weightExercises[0].setCount=planned
  server.snapshot.state.performedSets=reps.map((reps,i)=>({id:crypto.randomUUID(),sessionExerciseId:e.sessionExerciseId,ordinal:i+1,weightKg:'45',reps,completedAt:server.startedAt,manufacturerId:null,loadType:null,weightContext:{kind:'INITIAL_APPROVED',requestId:null}}))
  const evaluation={schemaVersion:2,ruleVersion:'task009-completion-v1',sessionVersion:server.version,overallWeightPlanComplete:reps.length>=planned,assessedAt:server.closedAt,exercises:[]}
  const review={sessionExerciseId:e.sessionExerciseId,advice,reasonCodes:[],referenceWeightKg:advice==='UNAVAILABLE'?null:'45',plannedSetCount:planned,completedSetCount:reps.length,minReps:min,maxReps:max,incomplete:reps.length<planned,
    sets:server.snapshot.state.performedSets.map(s=>({performedSetId:s.id,ordinal:s.ordinal,reps:s.reps,contributes:advice==='INCREASE'||advice==='DECREASE'&&s.reps<min}))}
  return{server,assessment:{...scope,sessionId:server.id,version:server.version,currentAssessment:{state:'EVALUATED',evaluation,reasonCodes:[]},completionAssessment:evaluation,
    weightReview:{schemaVersion:1,ruleVersion:'workout-weight-review-v1',sessionVersion:server.version,assessedAt:server.closedAt,exercises:[review]}}}
}
const closedState=pair=>({...pair,changes:{events:[]},copies:[],pending:null,busy:false,writable:true,issue:null,notice:''})
const endView=pair=>render(ClosedWorkoutView,{state:closedState(pair),controller:{},summary:true,onBack(){}})
test('summary restores WEIGHT and CARDIO below the weight review, removes only the redundant heading and keeps actual values',()=>{
  const pair=reviewedSession(),before=structuredClone(pair.server),html=endView(pair)
  assert.match(html,/운동 기록 요약/);assert.match(html,/토요일/);assert.match(html,/전체 루틴 완료/)
  assert.match(html,/3\/3세트/);assert.match(html,/기존 45kg/);assert.match(html,/기준 40kg · 6–10회 × 3세트/)
  assert.match(html,/45kg × 12회/);assert.match(html,/1,665kg/)
  assert.doesNotMatch(html,/운동 수행<|이번 수행|유지 검토|기록 정정·복구 및 서버 평가 상세|운동 기록 메뉴/)
  assert(html.indexOf('이번 운동의 중량 검토')<html.indexOf('WEIGHT'))
  assert.deepEqual(pair.server,before)
})
test('repetition contribution colors follow server review and missing planned sets create no fabricated repetitions',()=>{
  for(const [advice,reps,planned,marked,incomplete] of [
    ['INCREASE',[12,12,13],3,3,false],
    ['DECREASE',[12,12,7],3,1,false],
    ['DECREASE',[8,7,7],3,2,false],
    ['DECREASE',[10,10,9],4,0,true],
    ['DECREASE',[10,7,9],4,1,true],
  ]){
    const html=endView(reviewedSession(advice,reps,planned))
    assert.match(html,new RegExp(reps.length+'/'+planned+'세트'))
    assert.equal((html.match(/data-direction="(?:increase|decrease)"/g)??[]).length,marked+1)
    assert.equal(html.includes('data-incomplete="true"'),incomplete)
    assert.match(html,new RegExp('aria-label="'+(advice==='INCREASE'?'증량 검토':'감량 검토')+'"'))
    assert.doesNotMatch(html,/이번 수행|· 3세트|· 4세트|유지 검토/)
  }
})
test('maintain, unavailable, missing, stale and mismatched review have distinct empty/error states',()=>{
  assert.match(endView(reviewedSession('MAINTAIN',[13,12,11])),/이번 운동은 중량 변경 검토 대상이 없습니다/)
  assert.match(endView(reviewedSession('UNAVAILABLE')),/수행·승인 정보가 부족/)
  const pair=reviewedSession()
  for(const assessment of [null,{...pair.assessment,version:'1'},{...pair.assessment,sessionId:OTHER}]){
    const html=endView({...pair,assessment});assert.match(html,/중량 검토 결과를 확인하지 못했습니다/);assert.doesNotMatch(html,/중량 변경 검토 대상이 없습니다/)
  }
  pair.assessment.weightReview.exercises[0].sets[0].performedSetId=OTHER
  assert.match(endView(pair),/중량 검토에 해당하는 수행 기록을 확인하지 못했습니다/)
})
test('history detail preserves original reference and actual equipment while exposing lightweight management menu',()=>{
  const html=render(ClosedWorkoutView,{state:closedState(reviewedSession()),controller:{},onBack(){}})
  assert.match(html,/운동 기록 상세/);assert.match(html,/웨이트 수행/);assert.match(html,/45kg × 12회/)
  assert.match(html,/aria-label="운동 기록 메뉴"/);assert.match(html,/기록 정정|누락 수행 복구|기록 전체 삭제|평가 변경 이력/)
  assert.doesNotMatch(html,/기록 정정·복구 및 서버 평가 상세|명시 종료|서버 종료 확정/)
})
test('summary maps independent server recommendation and recorded reference without changing official eligibility',()=>{
  const pair=reviewedSession('DECREASE',[10,10,9],4)
  const mapped=summaryData(pair.server,pair.assessment)
  assert.equal(mapped.weights[0].review.direction,'decrease');assert.equal(mapped.weights[0].review.referenceKg,'45')
  assert.equal(mapped.weights[0].referenceKg,'40');assert.equal(mapped.weights[0].results[0].result.kg,'45')
  assert.equal(mapped.reviewState,'ready')
  pair.server.version='1';assert.equal(summaryData(pair.server,pair.assessment).reviewState,'unavailable')
})
