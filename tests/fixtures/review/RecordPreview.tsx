import { useMemo, useState } from 'react'
import type { ReviewRecord } from './workout-model.ts'
import { StatisticsPanel } from '../../../src/features/statistics/StatisticsPanel.tsx'
import { StatisticsApi } from '../../../src/features/statistics/api.ts'
import type { PlannedDay } from '../../../src/features/statistics/api.ts'
import { WorkoutApi } from '../../../src/features/workout-online/api.ts'
import type { WorkoutTransport } from '../../../src/features/workout-online/api.ts'
import type { Routine, Session } from '../../../src/features/workout-online/types.ts'
import type { PresetSchedule } from '../../../src/features/workout-online/preset-schedule.ts'
import { WorkoutSummary } from '../../../src/features/workout-flow/WorkoutSummary.tsx'
import { summaryData } from '../../../src/features/workout-online/summary-data.ts'
import { manufacturers, scope, reviewToday } from './routine-samples.ts'
import { RecordDisplayContext } from '../../../src/features/statistics/RecordDisplayContext.ts'
import { recordPreviewData, reviewRecordSession } from './record-data.ts'
import { activitySample } from './activity-sample.ts'

export function RecordPreview({ routines, schedule, sessions, days, records = [], selected, onOpen, onBack, backLabel, initialPreset, enabled = true }: { routines: Routine[]; schedule: PresetSchedule; sessions: Session[]; days: PlannedDay[]; records?: ReviewRecord[]; selected?: string; onOpen: (id: string) => void; onBack: () => void; backLabel?: string; initialPreset?: string; enabled?: boolean }) {
 const [fault,setFault]=useState(() => new URLSearchParams(location.search).get('record-loading') === '1' ? 'loading' : 'normal')
 const fixture=useMemo(()=>recordPreviewData(routines,schedule,sessions,days,fault==='empty',records.map(reviewRecordSession)),[routines,schedule,sessions,days,fault,records])
 const preview=useMemo(()=>fault==='normal'&&new URLSearchParams(window.location.search).get('activity-demo')==='states'
  ? {...fixture,activity:activitySample(fixture,routines)} : fixture,[fixture,routines,fault])
 const {statistics,workout}=useMemo(()=>{
  const transport:WorkoutTransport={workoutRequest:async(_user,path,method,_body,signal)=>{
   await new Promise<void>((resolve,reject)=>{const timer=setTimeout(resolve,fault==='loading'?4000:30);signal?.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'))},{once:true})})
   if(fault==='error')throw Error('Synthetic read error')
   if(method!=='GET')throw Error('Review transport is read-only')
   const url=new URL(path,'http://review.invalid')
   let data:unknown
   if(url.pathname==='/api/v1/statistics/overview')data=fixture.overview({fromDate:url.searchParams.get('fromDate')!,toDateExclusive:url.searchParams.get('toDateExclusive')!})
   else if(url.pathname.endsWith('/closed'))data={...scope,next:null,sessions:fixture.sessions.map(s=>({id:s.id,routineName:s.initialPlan.routineName,status:s.status,version:s.version,workoutDate:s.workoutDate,startedAt:s.startedAt,endedAt:s.endedAt,closedAt:s.closedAt,deletedAt:s.deletedAt}))}
   else data=routines.find(r=>r.id===url.pathname.split('/').at(-1))
   return {status:data?200:404,data,contentType:'application/json',requestId:null}
  }}
  return {statistics:new StatisticsApi(transport),workout:new WorkoutApi(transport)}
 },[fixture,routines,fault])
 const record=fixture.sessions.find(s=>s.id===selected) ?? fixture.evidence.find(s=>s.id===selected)
 return <RecordDisplayContext value={preview}>{record?<WorkoutSummary {...summaryData(record,null,fixture.definitions)} detail dataNote="UI 검토 · 합성 수행 기록. 실제 저장·정정·승인 요청 없음." manufacturers={manufacturers} onBack={onBack} backLabel={backLabel} />:<>
  <details className="record-preview-controls"><summary>합성 데이터 시연 설정</summary><label>기록 조회 시연<select value={fault} onChange={e=>setFault(e.target.value)}><option value="normal">정상</option><option value="empty">빈 기록</option><option value="loading">느린 조회</option><option value="error">조회 오류</option></select></label></details>
  <StatisticsPanel enabled={enabled} initialPreset={initialPreset} api={statistics} workoutApi={workout} scope={scope} schedule={{...schedule,timeZone:'Asia/Seoul',appliedVersion:'1',appliedAt:reviewToday+'T00:00:00Z',nextRotationAt:null,renameSupported:true}} definitions={fixture.definitions} refreshKey={fault} onOpen={onOpen} onInvalid={()=>{}} />
 </>}</RecordDisplayContext>
}
