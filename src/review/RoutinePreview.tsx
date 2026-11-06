import { useState } from 'react'
import { RoutineForm } from '../features/workout-online/RoutineForm.tsx'
import { RoutineCards } from '../features/workout-online/RoutineCards.tsx'
import type { Routine, StandardExercise } from '../features/workout-online/types.ts'
import type { WorkoutOnlineController } from '../features/workout-online/controller.ts'
import { AppShell } from '../app/AppShell.tsx'
import '../features/workout-online/online.css'

const exercises:StandardExercise[]=[{id:'10000000-0000-4000-8000-000000000001',name:'벤치 프레스',aliases:['bench press']},{id:'10000000-0000-4000-8000-000000000002',name:'바벨 스쿼트',aliases:['squat']}]
const routine:Routine={userId:'10000000-0000-4000-8000-000000000003',dataGeneration:'0',id:'10000000-0000-4000-8000-000000000004',version:'0',name:'UI 검토용 혼합 루틴',weightPlacements:exercises.map((e,i)=>({id:'10000000-0000-4000-8000-00000000000'+(i+5),standardExerciseId:e.id,exerciseName:e.name,manufacturerId:null,loadType:null,setCount:3,minReps:8,maxReps:12,initialWeightKg:'20',approvedWeightKg:'20',deletedAt:null})),cardioPlacements:[{id:'10000000-0000-4000-8000-000000000008',deletedAt:null,plan:{kind:'TREADMILL',name:'러닝머신',targetSeconds:1200,targetDistanceKm:null,intensity:{mode:'SPEED',value:'8'},inclinePercent:null,resistance:null}}]}
const scope={userId:routine.userId,dataGeneration:routine.dataGeneration}
const week={...scope,version:'0',timeZone:'Asia/Seoul',appliedAt:null,assignments:[]}
const activities=[{id:'ca000000-0000-4000-8000-000000000001',category:'RUNNING' as const,name:'러닝머신',kind:'TREADMILL' as const}]
export default function RoutinePreview(){
  const [empty,setEmpty]=useState(false)
  const [screen,setScreen]=useState<'list'|'new'|'edit'|'detail'>('list'),[notice,setNotice]=useState('')
  const controller={saveRoutine:async()=>{setNotice('개발용 UI 검토 · 서버에 저장하지 않았습니다.');return false},removedRoutine:async()=>null} as unknown as WorkoutOnlineController
  return <AppShell authenticated tab="routines" focused={screen==='new'||screen==='edit'} onNavigate={()=>setScreen('list')}><button type="button" onClick={()=>{setScreen('list');setEmpty(v=>!v)}}>{empty?'샘플 목록 보기':'빈 목록 보기'}</button><p role="status">T02-B 개발 전용 합성 데이터 · 실제 계정/API/DB와 연결하지 않음</p>{notice&&<p role="alert">{notice}</p>}{screen==='list'?<RoutineCards week={week} summaries={empty?[]:[routine]} details={new Map([[routine.id,routine]])} busy={false} onNew={()=>setScreen('new')} onSelect={()=>setScreen('detail')} onEdit={()=>setScreen('edit')} onDelete={()=>setNotice('개발용 UI 검토 · 실제 삭제 요청을 보내지 않았습니다.')}/>:screen==='detail'?<section className="card stack"><h2>{routine.name}</h2>{routine.weightPlacements.map(w=><p key={w.id}>{w.exerciseName} · {w.setCount}세트 · {w.minReps}~{w.maxReps}회</p>)}<button onClick={()=>setScreen('edit')}>이 루틴 편집</button><button onClick={()=>setScreen('list')}>루틴 목록으로</button></section>:<RoutineForm key={screen} routine={screen==='edit'?routine:null} scope={scope} scheduleState={week} weekly={{read:async()=>week} as never} activities={activities} generation="0" exercises={exercises} busy={false} controller={controller} onClose={()=>{setScreen('list');setNotice('')}}/>}</AppShell>
}
