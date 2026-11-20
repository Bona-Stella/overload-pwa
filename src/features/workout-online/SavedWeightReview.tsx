import {useEffect,useRef,useState} from 'react'
import {Button,Card} from '../../components/ui.tsx'
import {WeightReview} from '../workout-flow/WeightReview.tsx'
import {WeightApprovalHistory} from '../workout-flow/WorkoutSummary.tsx'
import type {WeightSummary} from '../workout-flow/WorkoutSummary.tsx'
import type {WorkoutApi} from './api.ts'
import type {Session} from './types.ts'
import type {SavedReview,ReviewApproval} from './saved-weight-review.ts'
import {newId} from '../../id.ts'

export function SavedWeightReview({api,session,readOnly,disabled,onChanged,authorized,preview=false}:{api:Pick<WorkoutApi,'weightReview'|'approveReview'>;session:Session;readOnly:boolean;disabled:boolean;onChanged:()=>Promise<void>;authorized:()=>boolean;preview?:boolean}){
 const [view,setView]=useState<SavedReview|null>(null),[issue,setIssue]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0)
 const access=useRef(authorized)
 useEffect(()=>{access.current=authorized},[authorized])
 const flight=useRef<AbortController|null>(null),mounted=useRef(false)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;flight.current?.abort()}},[])
 useEffect(()=>{const abort=new AbortController();flight.current=abort;void api.weightReview({userId:session.userId,dataGeneration:session.dataGeneration},session.id,abort.signal).then(v=>{if(!abort.signal.aborted&&mounted.current&&access.current()){setView(v);setIssue('')}}).catch(()=>{if(!abort.signal.aborted&&mounted.current&&access.current())setIssue('당시 중량 검토와 승인 이력을 조회하지 못했습니다.')});return()=>abort.abort()},[api,session.id,session.userId,session.dataGeneration,session.version,reload])
 const current=view?.sessionId===session.id&&view.userId===session.userId&&view.dataGeneration===session.dataGeneration?view:null
 const frozen=current?.frozen
 const retryNotice=issue?<Card><p role="alert">{issue}</p><Button onClick={()=>setReload(n=>n+1)}>다시 조회</Button></Card>:null
 if(!current)return retryNotice??<div role="status" className="sr-only">당시 중량 검토 확인 중…</div>
 const approvals=current.approvals.filter(a=>a.source==='WORKOUT_REVIEW')
 const weights:WeightSummary[]=(frozen?.exercises??[]).flatMap(item=>{
  const g=item.guidance
  if(item.recommendedWeightKg===null||g.referenceWeightKg===null||(g.advice!=='INCREASE'&&g.advice!=='DECREASE'))return []
  return [{id:item.sessionExerciseId,name:item.name,loadType:item.loadType as WeightSummary['loadType'],results:[],review:{direction:g.advice==='INCREASE'?'increase':'decrease',referenceKg:g.referenceWeightKg,recommendedKg:item.recommendedWeightKg,planned:g.plannedSetCount,completed:g.completedSetCount,incomplete:g.incomplete,sets:g.sets.map(s=>({id:s.performedSetId,reps:s.reps,contributes:s.contributes})),approval:approvals.find(a=>a.sessionExerciseId===item.sessionExerciseId)}}]
 })
 if(readOnly){
  const otherApprovals=current.approvals.filter(a=>a.source!=='WORKOUT_REVIEW'||!weights.some(w=>w.id===a.sessionExerciseId))
  if(!weights.length&&!otherApprovals.length)return retryNotice
  return <WeightApprovalHistory>
    {issue&&<p role="alert">{issue}</p>}
    <WeightReview weights={weights} readOnly preview={preview}/>
    {otherApprovals.map(a=>{
      const name=frozen?.exercises.find(i=>i.sessionExerciseId===a.sessionExerciseId)?.name
        ??session.initialPlan.weightExercises.find(i=>i.sessionExerciseId===a.sessionExerciseId)?.exerciseName??'운동'
      const source=a.source==='WORKOUT'?'운동 중 승인':a.source==='WORKOUT_REVIEW'?'종료 후 승인':'종료 후 PENDING 해결'
      return <p className="muted small" key={a.id}>{name} · {source} · {a.previousWeightKg}kg → {a.nextWeightKg}kg</p>
    })}
  </WeightApprovalHistory>
 }
 if(!frozen)return retryNotice
 const unapproved=weights.filter(w=>!approvals.some(a=>a.sessionExerciseId===w.id))
 const reviewable=unapproved.filter(w=>current.current.some(c=>c.sessionExerciseId===w.id&&c.available&&c.approvedWeightKg===w.review!.referenceKg))
 const blocked=reviewable.length>0&&reviewable.length<unapproved.length
 const latest=current.version===session.version
 async function approve(choices:{id:string;nextKg:string}[]){
  if(busy||disabled||!latest||!mounted.current||!access.current()||!current?.routineVersion)return false
  const abort=new AbortController();flight.current?.abort();flight.current=abort;setBusy(true);setIssue('')
  const body:ReviewApproval={dataGeneration:session.dataGeneration,expectedVersion:current.version,expectedRoutineVersion:current.routineVersion,confirm:true,approvals:choices.map(c=>({id:newId(),sessionExerciseId:c.id,previousWeightKg:current.current.find(v=>v.sessionExerciseId===c.id)!.approvedWeightKg!,nextWeightKg:c.nextKg}))}
  try{
   await api.approveReview(session,session.id,body,abort.signal)
   const saved=await api.weightReview(session,session.id,abort.signal)
   if(!mounted.current||!access.current()||abort.signal.aborted)return false
   if(!body.approvals.every(c=>saved.approvals.some(a=>a.id===c.id&&a.sessionExerciseId===c.sessionExerciseId&&a.nextWeightKg===c.nextWeightKg&&a.source==='WORKOUT_REVIEW')))throw Error('unconfirmed')
   setView(saved);await onChanged();return true
  }catch{
   if(mounted.current&&access.current()&&!abort.signal.aborted){setIssue('승인 저장 결과를 확인해야 합니다. 최신 이력을 다시 조회해 주세요. 자동으로 재전송하지 않습니다.');setReload(n=>n+1)}
   return false
  }finally{if(mounted.current&&!abort.signal.aborted)setBusy(false)}
 }
 return <>{issue&&<p role="alert">{issue}</p>}{blocked&&<p className="notice">현재 루틴 또는 승인 중량이 달라졌습니다. 과거 권고를 그대로 승인할 수 없습니다.</p>}
  <WeightReview key={session.id+':'+frozen.sessionVersion} weights={reviewable} preview={preview} approvedIds={approvals.map(a=>a.sessionExerciseId)} disabled={disabled||busy||!latest} onApprove={approve}/>
 </>
}
