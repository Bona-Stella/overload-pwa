// Component test only: no server data, API requests, auth or persistent storage.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { RoutineForm } from '../../src/features/workout-online/RoutineForm.tsx'
import { WeeklySchedulePanel } from '../../src/features/statistics/WeeklySchedulePanel.tsx'
import { routine, bootstrap } from './workout-online-data.mjs'
import '../../src/index.css'
import '../../src/App.css'
import '../../src/features/workout-online/online.css'
import { AppShell } from '../../src/app/AppShell.tsx'
const edited=structuredClone(routine)
edited.weightPlacements.push({...edited.weightPlacements[0],id:'20000000-0000-4000-8000-000000000001',exerciseName:'스쿼트'})
window.ui={saved:[],closed:0,scheduleCalls:0,failSchedule:true,routineId:edited.id,secondId:edited.weightPlacements[1].id}
window.confirm=()=>true
const scope={userId:edited.userId,dataGeneration:'0'},other='90000000-0000-4000-8000-000000000001'
let week={...scope,version:'1',timeZone:'Asia/Seoul',appliedAt:'2026-11-02T00:00:00Z',assignments:[{dayOfWeek:1,routineId:other}]}
const weekly={read:async()=>{window.ui.readWeekVersion=week.version;return week},save:async(_scope,_base,assignments)=>{window.ui.scheduleCalls++;if(window.ui.blockSchedule)await new Promise(resolve=>{window.ui.resumeSchedule=resolve});if(window.ui.activeError)throw Object.assign(Error('ACTIVE_SESSION_EXISTS'),{code:'ACTIVE_SESSION_EXISTS'});if(window.ui.failSchedule)throw Error('일정 테스트 실패');week={...week,version:(BigInt(week.version)+1n).toString(),appliedAt:'2026-11-06T00:00:00Z',assignments};return week}}
const activities=[{id:'ca000000-0000-4000-8000-000000000001',category:'RUNNING',name:'러닝머신',kind:'TREADMILL'}]
const exercises=[{...bootstrap.exercises[0],muscles:[{role:'PRIMARY',groupCode:'CHEST',name:'대흉근'}]},{id:'40000000-1111-4222-8333-000000000002',name:'바벨 스쿼트',aliases:['Squat'],muscles:[{role:'PRIMARY',groupCode:'LEGS',name:'대퇴사두근'}]}]
export const root=createRoot(document.getElementById('root'))
root.render(<AppShell authenticated focused tab="routines" onNavigate={()=>{}}><RoutineForm routine={edited} scope={scope} scheduleState={week} weekly={weekly} activities={activities} generation="0" exercises={exercises} busy={false} controller={{saveRoutine:async body=>{window.ui.saved.push(body);return true},getSnapshot:()=>({data:{routines:[{id:other,name:'기존 PUSH'}]}}),invalidateScope:()=>{},removedRoutine:async()=>null}} onClose={()=>window.ui.closed++}/></AppShell>)
window.ui.panelSaved=0
window.ui.showSchedule=(refresh=0)=>root.render(<WeeklySchedulePanel api={weekly} scope={scope} refreshKey={String(refresh)} routines={[edited,{id:other,name:'기존 PUSH'}]} onSaved={()=>window.ui.panelSaved++} onInvalid={()=>{}}/>)
window.ui.hideSchedule=()=>root.render(<div>다른 계정 화면</div>)
window.ui.externalSchedule=()=>{week={...week,version:'3',assignments:[{dayOfWeek:2,routineId:edited.id}]};window.ui.showSchedule(1)}
