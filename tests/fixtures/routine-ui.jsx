// Component test only: no server data, API requests, auth or persistent storage.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { RoutineForm } from '../../src/features/workout-online/RoutineForm.tsx'
import { routine, bootstrap } from './workout-online-data.mjs'
import '../../src/index.css'
import '../../src/App.css'
import '../../src/features/workout-online/online.css'
import { AppShell } from '../../src/app/AppShell.tsx'
const edited=structuredClone(routine)
edited.weightPlacements.push({...edited.weightPlacements[0],id:'20000000-0000-4000-8000-000000000001',exerciseName:'스쿼트'})
window.ui={saved:[],closed:0,scheduleCalls:0,routineId:edited.id,secondId:edited.weightPlacements[1].id}
window.confirm=()=>true
const activities=[{id:'ca000000-0000-4000-8000-000000000001',category:'RUNNING',name:'러닝머신',kind:'TREADMILL'}]
const exercises=[{...bootstrap.exercises[0],muscles:[{role:'PRIMARY',groupCode:'CHEST',name:'대흉근'}]},{id:'40000000-1111-4222-8333-000000000002',name:'바벨 스쿼트',aliases:['Squat'],muscles:[{role:'PRIMARY',groupCode:'LEGS',name:'대퇴사두근'}]}]
export const root=createRoot(document.getElementById('root'))
root.render(<AppShell authenticated focused tab="routines" onNavigate={()=>{}}><RoutineForm routine={edited} activities={activities} generation="0" exercises={exercises} busy={false} controller={{saveRoutine:async body=>{window.ui.saved.push(body);return true},invalidateScope:()=>{},removedRoutine:async()=>null}} onClose={()=>window.ui.closed++}/></AppShell>)
