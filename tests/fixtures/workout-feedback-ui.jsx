// Component-only deterministic regression fixture. No API, IndexedDB or real account.
import React,{useState,useSyncExternalStore} from 'react'
import {createRoot} from 'react-dom/client'
import {LocalWorkoutController} from '../../src/features/workout-local/controller.ts'
import {createLocalWorkout,editDraft} from '../../src/features/workout-local/model.ts'
import {WorkoutFrame,WeightRecommendation} from '../../src/features/workout-flow/WorkoutFrame.tsx'
import {Button} from '../../src/components/ui.tsx'
import {ClosedWorkoutView} from '../../src/features/workout-online/ClosedWorkout.tsx'
import {LocalWorkoutView} from '../../src/features/workout-local/LocalWorkoutFlow.tsx'
import {useProgressAssessment} from '../../src/features/workout-local/useProgressAssessment.ts'
import {AppShell} from '../../src/app/AppShell.tsx'
import {session,bootstrap} from './workout-online-data.mjs'
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
window.feedbackAudio={starts:0,stops:0}
window.AudioContext=class{
 state='running';currentTime=0;destination={}
 createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}}
 createOscillator(){return{frequency:{value:0},connect(g){return g},disconnect(){},start(){window.feedbackAudio.starts++},stop(at){if(at===undefined)window.feedbackAudio.stops++}}}
 async close(){} async resume(){}
}
window.feedback={
 c,ready:false,
 rest:seconds=>c.change(w=>{const now=Date.now();w.rest={sessionExerciseId:w.currentExerciseId,ordinal:1,startedAt:new Date(now).toISOString(),endsAt:new Date(now+seconds*1000).toISOString(),seconds:180}}),
 hold(){gate=new Promise(r=>release=r)},release(){gate=null;release?.()},
 title:name=>c.change(w=>{w.exerciseNames[w.currentExerciseId]=name}),
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
const recordState={server:recordServer,assessment:{userId:recordServer.userId,dataGeneration:recordServer.dataGeneration,sessionId:recordServer.id,version:'0',completionAssessment:null,currentAssessment:{state:'EVALUATED',evaluation:null},weightReview:{schemaVersion:1,ruleVersion:'workout-weight-review-v1',sessionVersion:'0',assessedAt:recordServer.closedAt,exercises:reviewExercises}},changes:{events:[]},copies:[],pending:null,busy:false,writable:true,issue:null,notice:''}
await c.open(session(),bootstrap.settings)
function Fixture(){const state=useSyncExternalStore(c.subscribe,c.getSnapshot),[advice,setAdvice]=useState(null),[record,setRecord]=useState(null);window.feedback.advice=setAdvice;window.feedback.record=setRecord;return <AppShell authenticated focused tab="home" onNavigate={()=>{}}>{record ? <ClosedWorkoutView key={record} state={recordState} controller={{}} summary={record==='summary'} onBack={()=>setRecord(null)}/> : advice ? <WorkoutFrame routine="안내 높이 검증" elapsed={0} deload={false} position={1} count={2} onHome={()=>{}} onEnd={()=>{}} actions={<><WeightRecommendation direction={advice.direction} kg={advice.kg}/><Button variant="primary">다음 종목으로</Button></>}><p>두 줄 안내와 다음 종목 버튼</p></WorkoutFrame> : <LocalWorkoutView state={state} controller={c} definitions={bootstrap.exercises}/>} </AppShell>}
createRoot(document.getElementById('root')).render(<Fixture/>)
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
