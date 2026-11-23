import {useEffect,useLayoutEffect,useRef,useState} from 'react'
import {Button,Card} from '../../components/ui.tsx'
import {ReviewWeightChange,WeightApprovalStatus,WeightReview} from '../workout-flow/WeightReview.tsx'
import {WeightApprovalHistory} from '../workout-flow/WorkoutSummary.tsx'
import type {WeightSummary} from '../workout-flow/WorkoutSummary.tsx'
import type {WorkoutApi} from './api.ts'
import type {Scope,Session} from './types.ts'
import type {SavedReview,ReviewApproval} from './saved-weight-review.ts'
import {newId} from '../../id.ts'
import styles from '../workout-flow/WorkoutFlow.module.css'

const historyCheckIssue = '서버가 승인 요청을 수락했습니다. 승인 이력을 다시 조회해 주세요.'
function confirmsApproval(view: SavedReview, expected: ReviewApproval['approvals']) {
 return expected.every(request => view.approvals.some(event => event.id === request.id
  && event.sessionExerciseId === request.sessionExerciseId && event.previousWeightKg === request.previousWeightKg
  && event.nextWeightKg === request.nextWeightKg && event.source === 'WORKOUT_REVIEW'))
}

export function SavedWeightReview({api,session,readOnly,disabled,onChanged,onRoutineApproved,authorized,preview=false,onReadSettled}:{api:Pick<WorkoutApi,'weightReview'|'approveReview'>;session:Session;readOnly:boolean;disabled:boolean;onChanged:()=>Promise<void>;onRoutineApproved?:(scope:Scope,routineId:string,version:string)=>void;authorized:()=>boolean;preview?:boolean;onReadSettled?:(version:string)=>void}){
 const [view,setView]=useState<SavedReview|null>(null),[issue,setIssue]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0)
 const [readVersion,setReadVersion]=useState<string|null>(null)
 const access=useRef(authorized)
 useEffect(()=>{access.current=authorized},[authorized])
 const flight=useRef<AbortController|null>(null),mounted=useRef(false)
 const awaitingHistory=useRef<{requests:ReviewApproval['approvals'];acknowledged:boolean}|null>(null)
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;flight.current?.abort()}},[])
 useEffect(() => {
  const abort = new AbortController()
  flight.current?.abort()
  flight.current = abort
  const authorizedRead = () => !abort.signal.aborted && mounted.current && access.current()
  void api.weightReview({userId:session.userId,dataGeneration:session.dataGeneration},session.id,abort.signal).then(saved => {
   if (!authorizedRead()) return
   setReadVersion(session.version)
   const expected = awaitingHistory.current
   const confirmed = expected && confirmsApproval(saved, expected.requests)
   if (expected?.acknowledged && !confirmed) { setIssue(historyCheckIssue); return }
   awaitingHistory.current = null
   setView(saved)
   setIssue('')
   if (confirmed && saved.routineVersion !== null) onRoutineApproved?.(saved, session.initialPlan.routineId, saved.routineVersion)
   if (confirmed || (!readOnly && saved.version !== session.version)) void onChanged()
  }).catch(() => {
   if (authorizedRead()) {
    setReadVersion(session.version)
    setIssue(awaitingHistory.current?.acknowledged ? historyCheckIssue : '당시 중량 검토와 승인 이력을 조회하지 못했습니다.')
   }
  })
  return () => abort.abort()
 }, [api,session.id,session.userId,session.dataGeneration,session.version,session.initialPlan.routineId,reload,onChanged,onRoutineApproved,readOnly])
 const current=view?.sessionId===session.id&&view.userId===session.userId&&view.dataGeneration===session.dataGeneration?view:null
 useLayoutEffect(()=>{if(readVersion===session.version)onReadSettled?.(readVersion)},[readVersion,session.version,onReadSettled])
 const frozen=current?.frozen
 const retryNotice=issue?<Card><p role="alert">{issue}</p><Button onClick={()=>setReload(n=>n+1)}>다시 조회</Button></Card>:null
 if(!current)return retryNotice??<div role="status" className="sr-only">당시 중량 검토 확인 중…</div>
 const approvals=current.approvals.filter(a=>a.source==='WORKOUT_REVIEW')
 const weights:WeightSummary[]=(frozen?.exercises??[]).flatMap(item=>{
  const g=item.guidance
  if(item.recommendedWeightKg===null||g.referenceWeightKg===null||(g.advice!=='INCREASE'&&g.advice!=='DECREASE'))return []
  return [{id:item.sessionExerciseId,name:item.name,loadType:item.loadType as WeightSummary['loadType'],results:[],review:{direction:g.advice==='INCREASE'?'increase':'decrease',referenceKg:g.referenceWeightKg,recommendedKg:item.recommendedWeightKg,planned:g.plannedSetCount,completed:g.completedSetCount,incomplete:g.incomplete,sets:g.sets.map(s=>({id:s.performedSetId,reps:s.reps,contributes:s.contributes})),approval:approvals.find(a=>a.sessionExerciseId===item.sessionExerciseId)}}]
 })
 const historyWeights=readOnly?weights:weights.filter(w=>w.review?.approval)
 const otherApprovals=current.approvals.filter(a=>a.source!=='WORKOUT_REVIEW'||!historyWeights.some(w=>w.id===a.sessionExerciseId))
 const history=(historyWeights.length>0||otherApprovals.length>0)?<WeightApprovalHistory>
    {readOnly&&issue&&<p role="alert">{issue}</p>}
    <WeightReview weights={historyWeights} readOnly preview={preview}/>
    {otherApprovals.map(a=>{
      const name=frozen?.exercises.find(i=>i.sessionExerciseId===a.sessionExerciseId)?.name
        ??session.initialPlan.weightExercises.find(i=>i.sessionExerciseId===a.sessionExerciseId)?.exerciseName??'운동'
      const source=a.source==='WORKOUT'?'운동 중 승인':a.source==='WORKOUT_REVIEW'?'종료 후 승인':'종료 후 PENDING 해결'
      return <section className={styles.reviewEvent} key={a.id}>
        <div className={styles.weightReviewHead}><h3>{name}</h3><ReviewWeightChange previous={a.previousWeightKg} next={a.nextWeightKg} confirmed/></div>
        <div className={styles.reviewHistoryValues}><span className="muted">{source}</span><WeightApprovalStatus previous={a.previousWeightKg} next={a.nextWeightKg}/></div>
      </section>
    })}
  </WeightApprovalHistory>:null
 if(readOnly)return history??retryNotice
 if(!frozen)return <>{retryNotice}{history}</>
 const unapproved=weights.filter(w=>!approvals.some(a=>a.sessionExerciseId===w.id))
 const reviewable=unapproved.filter(w=>current.current.some(c=>c.sessionExerciseId===w.id&&c.available&&c.approvedWeightKg===w.review!.referenceKg))
 const blocked=reviewable.length>0&&reviewable.length<unapproved.length
 const latest=current.version===session.version
 async function approve(choices:{id:string;nextKg:string}[]){
  if(busy||disabled||issue||awaitingHistory.current||!latest||!mounted.current||!access.current()||!current?.routineVersion)return false
  const abort=new AbortController();flight.current?.abort();flight.current=abort;setBusy(true);setIssue('')
  const body:ReviewApproval={dataGeneration:session.dataGeneration,expectedVersion:current.version,expectedRoutineVersion:current.routineVersion,confirm:true,approvals:choices.map(c=>({id:newId(),sessionExerciseId:c.id,previousWeightKg:current.current.find(v=>v.sessionExerciseId===c.id)!.approvedWeightKg!,nextWeightKg:c.nextKg}))}
  const submitted={requests:body.approvals,acknowledged:false}
  awaitingHistory.current=submitted
  try{
   await api.approveReview(session,session.id,body,abort.signal)
   if(!mounted.current||!access.current()||abort.signal.aborted)return false
   submitted.acknowledged=true
   const saved=await api.weightReview(session,session.id,abort.signal)
   if(!mounted.current||!access.current()||abort.signal.aborted)return false
   if(!confirmsApproval(saved,body.approvals))throw Error('unconfirmed')
   awaitingHistory.current=null
   if(saved.routineVersion!==null)onRoutineApproved?.(saved,session.initialPlan.routineId,saved.routineVersion)
   setView(saved);await onChanged();return true
  }catch{
   if(mounted.current&&access.current()&&!abort.signal.aborted){setIssue(submitted.acknowledged ? historyCheckIssue : '승인 저장 결과를 확인해야 합니다. 최신 이력을 다시 조회해 주세요. 자동으로 재전송하지 않습니다.');setReload(n=>n+1)}
   return false
  }finally{if(mounted.current)setBusy(false)}
 }
 return <>{retryNotice}{blocked&&<p className="notice">현재 루틴 또는 승인 중량이 달라졌습니다. 과거 권고를 그대로 승인할 수 없습니다.</p>}
  <WeightReview key={session.id+':'+frozen.sessionVersion} weights={reviewable} preview={preview} disabled={disabled||busy||!!issue||!latest} onApprove={approve} approvalIssue={issue}/>
  {history}
 </>
}
