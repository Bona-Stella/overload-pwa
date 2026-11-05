// Component-only contract examples. No account, API, IndexedDB, or fabricated production response.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppShell } from '../../src/app/AppShell.tsx'
import { RecentWorkout } from '../../src/features/home/RecentWorkout.tsx'
import { session } from './workout-online-data.mjs'
import styles from '../../src/features/home/Home.module.css'
import '../../src/index.css'
import '../../src/App.css'

const goal={kind:'TREADMILL',name:'러닝',targetSeconds:600,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null}
function example(id, weights, done, cardio, cardioDone, unknown=false){
  const s=session({id,status:'FINISHED'})
  s.initialPlan.weightExercises=Array.from({length:weights},(_,i)=>({...s.initialPlan.weightExercises[0],sessionExerciseId:'w'+i,setCount:1}))
  s.initialPlan.cardioActivities=Array.from({length:cardio},(_,i)=>({sessionActivityId:'c'+i,sourcePlacementId:'p'+i,plan:{...goal,intensity:unknown?{mode:'SPEED',value:'8'}:null}}))
  s.snapshot.state.performedSets=Array.from({length:done},(_,i)=>({id:'s'+i,sessionExerciseId:'w'+i}))
  s.snapshot.state.cardioResults=Array.from({length:cardioDone},(_,i)=>({id:'r'+i,sessionActivityId:'c'+i,status:'COMPLETED',result:{activeMs:600000,distanceKm:null}}))
  return {row:{id,routineName:id,workoutDate:'2026-11-06',status:'FINISHED'},detail:s}
}
const cases=[example('웨이트 완료',3,3,0,0),example('혼합 부분',3,2,1,1),example('유산소 완료',0,0,1,1),example('근거 미확인',3,3,1,1,true)]
createRoot(document.getElementById('root')).render(<AppShell authenticated tab="home" onNavigate={()=>{}}><p>컴포넌트 계약 검증용 fixture · 실제 계정 기록 아님</p><section className={styles.home}>{cases.map(c=><div data-case={c.row.id} key={c.row.id}><RecentWorkout {...c} onOpen={()=>{}}/></div>)}</section></AppShell>)
