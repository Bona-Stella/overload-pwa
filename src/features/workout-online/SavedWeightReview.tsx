import {useEffect,useRef,useState} from 'react'
import {Button,Card} from '../../components/ui.tsx'
import {WeightReview} from '../workout-flow/WeightReview.tsx'
import type {WeightSummary} from '../workout-flow/WorkoutSummary.tsx'
import type {WorkoutApi} from './api.ts'
import type {Session} from './types.ts'
import type {SavedReview,ReviewApproval} from './saved-weight-review.ts'
import {newId} from '../../id.ts'

export function SavedWeightReview({api,session,readOnly,disabled,onChanged,authorized}:{api:WorkoutApi;session:Session;readOnly:boolean;disabled:boolean;onChanged:()=>Promise<void>;authorized:()=>boolean}){
 const [view,setView]=useState<SavedReview|null>(null),[issue,setIssue]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0)
 const access=useRef(authorized)
 useEffect(()=>{access.current=authorized},[authorized])
 const flight=useRef<AbortController|null>(null),mounted=useRef(false)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;flight.current?.abort()}},[])
 useEffect(()=>{const abort=new AbortController();flight.current=abort;void api.weightReview({userId:session.userId,dataGeneration:session.dataGeneration},session.id,abort.signal).then(v=>{if(!abort.signal.aborted&&mounted.current&&access.current()){setView(v);setIssue('')}}).catch(()=>{if(!abort.signal.aborted&&mounted.current&&access.current())setIssue('당시 중량 검토와 승인 이력을 조회하지 못했습니다.')});return()=>abort.abort()},[api,session.id,session.userId,session.dataGeneration,session.version,reload])
 const current=view?.sessionId===session.id&&view.userId===session.userId&&view.dataGeneration===session.dataGeneration?view:null
 const frozen=current?.frozen
 if(!frozen)return issue?<Card><p role="alert">{issue}</p><Button onClick={()=>setReload(n=>n+1)}>다시 조회</Button></Card>:current?<Card><p className="muted small">이 기록에는 저장된 종료 당시 중량 권고가 없습니다. 현재 수행값으로 과거 권고를 만들지 않습니다.</p></Card>:<p role="status">당시 중량 검토 확인 중…</p>
 const approvals=current.approvals.filter(a=>a.source==='WORKOUT_REVIEW')
 const weights:WeightSummary[]=frozen.exercises.flatMap(item=>{
  const g=item.guidance
  if(item.recommendedWeightKg===null||g.referenceWeightKg===null||(g.advice!=='INCREASE'&&g.advice!=='DECREASE'))return []
  return [{id:item.sessionExerciseId,name:item.name,loadType:item.loadType as WeightSummary['loadType'],results:[],review:{direction:g.advice==='INCREASE'?'increase':'decrease',referenceKg:g.referenceWeightKg,recommendedKg:item.recommendedWeightKg,planned:g.plannedSetCount,completed:g.completedSetCount,incomplete:g.incomplete,sets:g.sets.map(s=>({id:s.performedSetId,reps:s.reps,contributes:s.contributes})),approval:approvals.find(a=>a.sessionExerciseId===item.sessionExerciseId)}}]
 })
 const blocked=weights.some(w=>{if(approvals.some(a=>a.sessionExerciseId===w.id))return false;const c=current.current.find(c=>c.sessionExerciseId===w.id);return !c?.available||c.approvedWeightKg!==w.review!.referenceKg})
 async function approve(choices:{id:string;nextKg:string}[]){
  if(readOnly||busy||disabled||!mounted.current||!access.current()||!current?.routineVersion)return false
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
 return <>{issue&&<p role="alert">{issue}</p>}{!readOnly&&blocked&&<p className="notice">현재 루틴 또는 승인 중량이 달라졌습니다. 과거 권고를 그대로 승인할 수 없습니다.</p>}
  <WeightReview key={session.id+':'+frozen.sessionVersion} weights={readOnly?weights:weights.filter(w=>approvals.some(a=>a.sessionExerciseId===w.id)||current.current.some(c=>c.sessionExerciseId===w.id&&c.available&&c.approvedWeightKg===w.review!.referenceKg))} readOnly={readOnly} approvedIds={approvals.map(a=>a.sessionExerciseId)} disabled={disabled||busy} onApprove={readOnly?undefined:approve}/>
  {readOnly&&frozen.exercises.some(i=>i.recommendedWeightKg===null)&&<Card><h2>당시 중량 판정</h2>{frozen.exercises.filter(i=>i.recommendedWeightKg===null).map(i=><p key={i.sessionExerciseId}>{i.name} · {i.guidance.advice==='MAINTAIN'?'유지':'판정 근거 부족'}{i.guidance.referenceWeightKg!==null&&' · 기준 '+i.guidance.referenceWeightKg+'kg'}</p>)}</Card>}
  {readOnly&&current.approvals.filter(a=>a.source!=='WORKOUT_REVIEW').map(a=><p className="muted small" key={a.id}>{frozen.exercises.find(i=>i.sessionExerciseId===a.sessionExerciseId)?.name??'운동'} · {a.source==='WORKOUT'?'운동 중 승인':'종료 후 PENDING 해결'} · {a.previousWeightKg}kg → {a.nextWeightKg}kg · {new Date(a.occurredAt).toLocaleString('ko-KR')}</p>)}
 </>
}
