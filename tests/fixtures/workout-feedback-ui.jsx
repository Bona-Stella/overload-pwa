import {GrowthPanel} from '../../src/features/statistics/GrowthPanel.tsx'
import {RecordChart} from '../../src/features/statistics/RecordChart.tsx'
import '../../src/features/statistics/statistics.css'
// Component-only deterministic regression fixture. No API, IndexedDB or real account.
import React,{useCallback,useState,useSyncExternalStore} from 'react'
import {createRoot} from 'react-dom/client'
import {LocalWorkoutController} from '../../src/features/workout-local/controller.ts'
import {changeEquipment,changeWeight,createLocalWorkout,editDraft,exerciseRest} from '../../src/features/workout-local/model.ts'
import {WorkoutFrame,WeightRecommendation} from '../../src/features/workout-flow/WorkoutFrame.tsx'
import {Button} from '../../src/components/ui.tsx'
import {ClosedWorkoutView} from '../../src/features/workout-online/ClosedWorkout.tsx'
import {SavedWeightReview} from '../../src/features/workout-online/SavedWeightReview.tsx'
import {LocalWorkoutView} from '../../src/features/workout-local/LocalWorkoutFlow.tsx'
import {RestAlertSettings} from '../../src/features/settings/RestAlertSettings.tsx'
import {useRestAlertPreferences} from '../../src/features/workout-flow/useRestAlertPreferences.ts'
import {useProgressAssessment} from '../../src/features/workout-local/useProgressAssessment.ts'
import {AppShell} from '../../src/app/AppShell.tsx'
import {LoginScreens} from '../../src/features/auth/LoginScreens.tsx'
import {session,bootstrap,USER,OTHER} from './workout-online-data.mjs'
import '../../src/index.css'
import '../../src/App.css'
import '../../src/features/workout-online/online.css'
let stored=createLocalWorkout(session(),bootstrap.settings),gate=null,release=null
stored.warmupCompleted=true
editDraft(stored,stored.currentExerciseId,1,{reps:'8'})
const c=new LocalWorkoutController({readLocal:async()=>structuredClone(stored),openLocal:async()=>structuredClone(stored),saveLocal:async(next,expected,guard)=>{
 if(gate)await gate
 if(!guard()||expected!==stored.editVersion)throw Error('Fixture write conflict')
 stored=structuredClone(next)
}},()=>true,async()=>({held:()=>true,release(){}}))
window.feedbackAudio={starts:0,stops:0,resumes:0}
window.AudioContext=class{
 state='running';currentTime=0;destination={}
 constructor(){window.feedbackAudio.context=this}
 createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
 createOscillator(){return{frequency:{value:0},connect(g){return g},disconnect(){},start(){window.feedbackAudio.starts++},stop(at){if(at===undefined)window.feedbackAudio.stops++}}}
 async close(){} async resume(){window.feedbackAudio.resumes++;this.state='running'}
}
window.feedback={
 c,ready:false,
 currentRest:()=>exerciseRest(c.getSnapshot().workout)??null,
 rest:(seconds,middleAt)=>c.change((w,now)=>{w.rests[w.currentExerciseId]={sessionExerciseId:w.currentExerciseId,ordinal:1,startedAt:new Date(now).toISOString(),endsAt:new Date(now+seconds*1000).toISOString(),seconds,middleAt}}),
 hold(){gate=new Promise(r=>release=r)},release(){gate=null;release?.()},
 title:name=>c.change(w=>{w.exerciseNames[w.currentExerciseId]=name}),
 plateSetup:(loadType,value)=>c.change((w,now)=>{
   const id=w.currentExerciseId
   changeEquipment(w,id,{manufacturerId:null,loadType})
   if(value===null)delete w.weights[id]
   else changeWeight(w,id,value,false,now)
 }),
 stored:()=>stored
}
const recordServer=session({status:'FINISHED',endedAt:'2026-10-31T12:30:00Z',closedAt:'2026-10-31T12:30:01Z'})
recordServer.initialPlan.weightExercises=[]
recordServer.snapshot.state.appliedPlan.weightExercises=[]
recordServer.snapshot.state.sessionExercises=[]
const reviewExercises=[]
for(const [i,name]of ['슈퍼 버티컬 체스트 프레스','케이블 오버헤드 트라이셉스 익스텐션','머신 숄더 프레스'].entries()){
 const id=crypto.randomUUID(),ref=['45','30','40'][i],reps=[[12,12,13],[12,12,7],[10,10,9]][i],planned=i===2?4:3
 recordServer.initialPlan.weightExercises.push({sessionExerciseId:id,sourcePlacementId:crypto.randomUUID(),standardExerciseId:bootstrap.exercises[0].id,exerciseName:name,setCount:planned,minReps:8,maxReps:12,initialWeightKg:ref,approvedWeightKg:ref,manufacturerId:null,loadType:'PLATE'})
 recordServer.snapshot.state.appliedPlan.weightExercises.push({sessionExerciseId:id,setCount:planned,minReps:8,maxReps:12,manufacturerId:null,loadType:'PLATE'})
 recordServer.snapshot.state.sessionExercises.push({id,kind:'WEIGHT',standardExerciseId:bootstrap.exercises[0].id})
 const sets=reps.map((reps,n)=>({id:crypto.randomUUID(),sessionExerciseId:id,ordinal:n+1,weightKg:ref,reps,completedAt:recordServer.startedAt,weightContext:{kind:'INITIAL_APPROVED',requestId:null},manufacturerId:null,loadType:n===2?'STACK':'PLATE'}))
 recordServer.snapshot.state.performedSets.push(...sets)
 reviewExercises.push({sessionExerciseId:id,advice:i===0?'INCREASE':'DECREASE',reasonCodes:[],referenceWeightKg:ref,plannedSetCount:planned,completedSetCount:3,minReps:8,maxReps:12,incomplete:i===2,sets:sets.map(s=>({performedSetId:s.id,ordinal:s.ordinal,reps:s.reps,contributes:i===0||s.reps<8}))})
}
const cardioId=crypto.randomUUID(),cardioPlan={kind:'TREADMILL',name:'시간 정정 러닝',targetSeconds:1200,targetDistanceKm:'2',targetSpeedKmh:null}
recordServer.initialPlan.cardioActivities=[{sourcePlacementId:crypto.randomUUID(),sessionActivityId:cardioId,plan:cardioPlan}]
recordServer.snapshot.state.appliedPlan.cardioActivities=[{sessionActivityId:cardioId,plan:cardioPlan}]
recordServer.snapshot.state.cardioResults=[{id:crypto.randomUUID(),sessionActivityId:cardioId,status:'COMPLETED',occurredAt:recordServer.endedAt,startedAt:recordServer.startedAt,result:{activeMs:1230125,timerMs:1200000,corrected:true,distanceKm:'2.05',averageBpm:120,measurement:{actualSpeedKmh:null,distanceSource:'MANUAL'}}}]
window.feedback.corrections=[]
const recordController={edit:async body=>{window.feedback.corrections.push(body);return true}}
const recordState={server:recordServer,assessment:{userId:recordServer.userId,dataGeneration:recordServer.dataGeneration,sessionId:recordServer.id,version:'0',completionAssessment:null,currentAssessment:{state:'EVALUATED',evaluation:null},weightReview:{schemaVersion:1,ruleVersion:'workout-weight-review-v1',sessionVersion:'0',assessedAt:recordServer.closedAt,exercises:reviewExercises}},changes:{events:[]},copies:[],pending:null,busy:false,writable:true,issue:null,notice:''}
await c.open(session(),bootstrap.settings)
const frozenRecordState=structuredClone(recordState),frozenServer=frozenRecordState.server,first=frozenServer.initialPlan.weightExercises[0]
frozenServer.initialPlan.weightExercises=[first]
frozenServer.snapshot.state.appliedPlan.weightExercises=frozenServer.snapshot.state.appliedPlan.weightExercises.slice(0,1)
frozenServer.snapshot.state.performedSets=frozenServer.snapshot.state.performedSets.filter(s=>s.sessionExerciseId===first.sessionExerciseId).map(s=>({...s,loadType:'PLATE'}))
const frozenSets=structuredClone(frozenServer.snapshot.state.performedSets)
frozenServer.completionAssessment={schemaVersion:2,ruleVersion:'task009-completion-v1',sessionVersion:'0',assessedAt:frozenServer.closedAt,overallWeightPlanComplete:true,exercises:[{sessionExerciseId:first.sessionExerciseId,eligible:true,reasonCodes:[],comparisonContext:{routineId:frozenServer.initialPlan.routineId,sourcePlacementId:first.sourcePlacementId,standardExerciseId:first.standardExerciseId,approvedWeightKg:first.approvedWeightKg,plannedSetCount:3,minReps:first.minReps,maxReps:first.maxReps,unit:'KG'},evaluatedPerformedSetIds:frozenSets.map(s=>s.id),evaluatedReps:frozenSets.map(s=>s.reps),repsSum:'37',benchmarkEvidence:null,advice:'INCREASE',adviceReason:'ALL_AT_OR_ABOVE_MAX_REPS'}]}
frozenServer.snapshot.state.performedSets[0].reps=5
const savedReviewItem = {
 sessionExerciseId:first.sessionExerciseId, sourcePlacementId:first.sourcePlacementId, name:first.exerciseName,
 loadType:first.loadType, recommendedWeightKg:'50', guidance:reviewExercises[0],
}
const savedReviewNegative = ['MAINTAIN','UNAVAILABLE'].map(advice=>({
 ...savedReviewItem, name:'표시하면 안 되는 '+advice, sessionExerciseId:crypto.randomUUID(), recommendedWeightKg:null,
 guidance:{...savedReviewItem.guidance,advice},
}))
function SavedReviewFixture({ mode }) {
 const [api]=useState(()=>{
  let attempts=0
  return {weightReview:async()=>{
   if(mode==='failure'&&attempts++===0)throw Error('Read failed')
   const exercises=mode==='candidate'?[savedReviewItem,...savedReviewNegative]:savedReviewNegative
   return {userId:frozenServer.userId,dataGeneration:frozenServer.dataGeneration,sessionId:frozenServer.id,
    version:frozenServer.version,current:[],frozen:mode==='legacy-event'?null:{sessionVersion:'0',exercises},
    approvals:mode==='legacy-event'?[{id:'saved-approval',sessionExerciseId:first.sessionExerciseId,source:'WORKOUT',previousWeightKg:'45',nextWeightKg:'50'}]:[],
   }
  }}
 })
 return <ClosedWorkoutView state={frozenRecordState} controller={recordController}
  reviewContent={<SavedWeightReview api={api} session={frozenServer} readOnly disabled authorized={()=>true} onChanged={async()=>{}}/>}/>
}
function ApprovalSummaryFixture({ empty }) {
 const [fixture]=useState(()=>{
  const controls={posts:0,reads:0,confirmedRoutineVersions:[],holdPost:false,rejectPost:false,failAfterPost:false,failReads:false,losePostResponse:false}
  window.feedback.approvalNetwork=controls
  const exercises=empty?[]:recordServer.initialPlan.weightExercises.map((plan,index)=>({
   sessionExerciseId:plan.sessionExerciseId,sourcePlacementId:plan.sourcePlacementId,name:plan.exerciseName,
   recommendedWeightKg:['50','25','35'][index],loadType:plan.loadType,guidance:reviewExercises[index],
  }))
  let version='0', approvals=[]
  const view=()=>({
   userId:recordServer.userId,dataGeneration:recordServer.dataGeneration,sessionId:recordServer.id,version,routineVersion:version,
   frozen:{sessionVersion:'0',exercises},approvals,
   current:exercises.map(item=>({sessionExerciseId:item.sessionExerciseId,available:true,
    approvedWeightKg:approvals.find(event=>event.sessionExerciseId===item.sessionExerciseId)?.nextWeightKg??item.guidance.referenceWeightKg})),
  })
  return {version:()=>version,api:{
   weightReview:async()=>{controls.reads++;if(controls.failReads)throw Error('Read failed');return view()},
   approveReview:async(_scope,_id,body)=>{
    controls.posts++
    if(controls.holdPost) await new Promise(resolve=>{controls.resumePost=resolve})
    if(controls.rejectPost)throw Error('SESSION_VERSION_CONFLICT')
    if(body.expectedVersion!==version||body.expectedRoutineVersion!==version)throw Error('Stale version')
    version=String(Number(version)+1)
    approvals=[...approvals,...body.approvals.map(event=>({...event,source:'WORKOUT_REVIEW'}))]
    if(controls.failAfterPost)controls.failReads=true
    if(controls.losePostResponse)throw Error('Committed response lost')
    return view()
   },
  }}
 })
 const [version,setVersion]=useState('0')
 const refresh=useCallback(async()=>setVersion(fixture.version()),[fixture])
 const onRoutineApproved=useCallback((_scope,id,version)=>{
  if(id===recordServer.initialPlan.routineId)window.feedback.approvalNetwork.confirmedRoutineVersions.push(version)
 },[])
 const server={...recordServer,version}
 return <ClosedWorkoutView state={{...recordState,server}} controller={recordController} summary
  reviewContent={<SavedWeightReview api={fixture.api} session={server} readOnly={false} disabled={false} authorized={()=>true} onChanged={refresh} onRoutineApproved={onRoutineApproved}/>}/>
}
const growthApi={
 search:async()=>({exercises:[{standardExerciseId:bootstrap.exercises[0].id,name:'승인 이력 검증을 위한 매우 긴 운동명',lastPerformedAt:recordServer.endedAt,lastApprovalAt:recordServer.endedAt}],nextOffset:null}),
 options:async()=>({placements:[{placementId:'placement',routineId:'routine',routineName:'검토 루틴',deleted:false}]}),
 history:async()=>({points:[{id:'second',previousWeightKg:'55.000001',approvedWeightKg:'52.500001',occurredAt:'2026-11-11T10:00:00Z',recordedAt:'2026-11-11T10:00:01Z',source:'ROUTINE_EDITOR',sessionId:null,connectFromPrevious:true,previousPointId:'first'},{id:'first',previousWeightKg:'50.000001',approvedWeightKg:'55.000001',occurredAt:'2026-11-01T10:00:00Z',recordedAt:'2026-11-01T10:00:01Z',source:'ROUTINE_EDITOR',sessionId:null,connectFromPrevious:false,previousPointId:null}],nextOffset:null})
}
function Preferences({ owner, onBack }) {
 const [alerts, save] = useRestAlertPreferences(owner)
 return <RestAlertSettings alerts={alerts} onChange={save} onBack={onBack}/>
}
function Fixture(){const state=useSyncExternalStore(c.subscribe,c.getSnapshot),[advice,setAdvice]=useState(null),[record,setRecord]=useState(null);window.feedback.advice=setAdvice;window.feedback.record=setRecord;return <AppShell authenticated focused tab="home" onNavigate={()=>{}}>{record?.startsWith('alerts')?<Preferences owner={record==='alerts' ? USER : OTHER} onBack={()=>setRecord(null)}/>:record==='growth'?<GrowthPanel api={growthApi} scope={recordServer} onInvalid={e=>{throw e}} onOpen={()=>{}} refreshKey="fixture"/>:record==='chart'?<RecordChart data={[{id:'zero',label:'실제 0',value:'0'},{id:'missing',label:'미확인',value:null},{id:'value',label:'정확한 수치',value:'52.500001'}]} label="수치 검증" unit="kg"/>:record?.startsWith('saved-review:') ? <SavedReviewFixture key={record} mode={record.split(':')[1]}/> : record?.startsWith('approval-summary:') ? <ApprovalSummaryFixture key={record} empty={record==='approval-summary:empty'}/> : record ? <ClosedWorkoutView key={record} state={record==='frozen'?frozenRecordState:recordState} controller={recordController} summary={record==='summary'} onBack={()=>setRecord(null)}/> : advice ? <WorkoutFrame routine="안내 높이 검증" elapsed={0} deload={false} position={1} count={2} onHome={()=>{}} onEnd={()=>{}} actions={<><WeightRecommendation direction={advice.direction} kg={advice.kg}/><Button variant="primary">다음 종목으로</Button></>}><p>두 줄 안내와 다음 종목 버튼</p></WorkoutFrame> : <LocalWorkoutView state={state} controller={c} definitions={bootstrap.exercises}/>} </AppShell>}
const authInput = new URLSearchParams(location.search).get('input')
const now = Date.now()
const challenge = authInput === 'otp' ? { id:'fixture', email:'sample@example.invalid', expiresAt:now+300000 } : null
const root = createRoot(document.getElementById('root'))
if(authInput) void import('../../src/features/auth/auth.css').then(()=>root.render(<AppShell authenticated={false} tab="home" onNavigate={()=>{}}>
  <LoginScreens state={{pending:null,challenge,resendAt:0,verifyAt:0,notice:'',updatedAt:now}} controller={{}} now={now} onLegal={()=>{}} />
</AppShell>))
else root.render(<Fixture/>)
window.feedback.ready=true

const queries=[]
const api={progressAssessment:(_scope,id,signal)=>new Promise(resolve=>queries.push({id,signal,resolve}))}
function Probe(){
 const [w,set]=useState(null),progress=useProgressAssessment(w,api)
 window.progressProbe={
  queries,
  revision(revision,clean=true){
   const w=createLocalWorkout(session(),bootstrap.settings)
   w.initialPlan.weightExercises[0].setCount=1
   w.snapshot.performedSets=[{sessionExerciseId:w.currentExerciseId}]
   w.localRevision=revision;w.serverRevision=revision;w.serverVersion=revision;w.syncState=clean?'CLEAN':'UNSENT'
   set(w)
  },
  answer(index,advice){const q=queries[index];q.resolve({writerEpoch:'0',localRevision:String(index+1),version:String(index+1),evaluation:{exercises:[{advice}]}})}
 }
 return <output id="progress-probe">{progress.value?.evaluation?.exercises[0]?.advice??'NONE'}</output>
}
createRoot(document.body.appendChild(document.createElement('div'))).render(<Probe/>)
