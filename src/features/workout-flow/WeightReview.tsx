import { useRef, useState } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import { Dialog } from '../../components/Dialog.tsx'
import { NumberWheel } from '../../components/NumberWheel.tsx'
import { decimalDraft } from '../workout-online/validation.ts'
import { adjustApproval, approvalStep, suggestedApproval } from '../workout-online/approval-weight.ts'
import type { WeightSummary } from './WorkoutSummary.tsx'
import styles from './WorkoutFlow.module.css'

export function WeightReview({ weights, preview = false, readOnly = false, onApprove, approvedIds = [], disabled = false }: { weights: WeightSummary[]; preview?: boolean; readOnly?: boolean; onApprove?:(choices:{id:string;nextKg:string}[])=>Promise<boolean>;approvedIds?:string[];disabled?:boolean }) {
  const reviews = weights.filter(w => w.review)
  const [editing, setEditing] = useState(false), [selected, setSelected] = useState(() => reviews.map(w => w.id))
  const [drafts, setDrafts] = useState<Record<string,string>>(() => readOnly?{}:Object.fromEntries(reviews.map(w => [w.id, w.review!.recommendedKg??suggestedApproval(w.review!.referenceKg, w.review!.direction, w.loadType ?? null)])))
  const [modal, setModal] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false), [approved, setApproved] = useState<string[]>([])
  const submitting=useRef(false),[saving,setSaving]=useState(false),[confirmationIssue,setConfirmationIssue]=useState('')
  const pendingReviews = reviews.filter(w => readOnly||!approved.includes(w.id)&&!approvedIds.includes(w.id))
  const targets = selected.filter(id => pendingReviews.some(w=>w.id===id))
  const current = reviews.find(w => w.id === modal)
  if (!pendingReviews.length) return null
  return <Card className={styles.reviewCard} aria-label={readOnly?"당시 중량 검토":"중량 검토 카드"}>
    <div className="section-heading approval-toolbar"><h2>{readOnly?'당시 중량 검토':'중량 검토'}</h2>{!readOnly&&<div className="row">{!editing&&<Button className={styles.approveButton} disabled={disabled||saving||!onApprove&&!preview||!targets.length} title={preview?'서버에 저장하지 않는 합성 승인 시연':undefined} onClick={()=>{setConfirmationIssue('');setConfirming(true)}}>{targets.length===pendingReviews.length?'전체 승인':'선택 승인'}</Button>}<Button className={styles.reviewButton} disabled={disabled||saving} onClick={()=>setEditing(!editing)}>{editing?'수정 완료':'수정'}</Button></div>}</div>
    {readOnly&&<p className="muted small">운동 종료 당시 저장된 판정 · 현재 승인 중량과 정정 후 평가는 별개입니다.</p>}
    {!readOnly&&!preview&&!onApprove && <p className="muted small" role="status">선택·무게 수정은 승인 초안입니다. 현재는 검토만 가능하며 공식 승인 중량은 저장되지 않습니다.</p>}{!readOnly&&preview&&!onApprove&&<p className="muted small">합성 승인 시연 · 서버에는 저장하지 않습니다. 실제 계정 승인과 별개입니다.</p>}
    {pendingReviews.map(weight => {
      const review = weight.review!
      return <section className={styles.recordItem + " approval-review-row"} key={weight.id} data-weight-review={review.direction}>
        {editing&&!readOnly?<div className="approval-edit-row"><label className="review-select"><input type="checkbox" aria-label={weight.name+' 승인 선택'} disabled={disabled} checked={selected.includes(weight.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,weight.id]:ids.filter(id=>id!==weight.id))} /></label><h3 title={weight.name}>{weight.name}</h3><strong className="approval-values">{review.referenceKg}kg → {drafts[weight.id]}kg</strong><Button className={styles.reviewButton} disabled={disabled} onClick={()=>setModal(weight.id)}>무게 수정</Button></div>
          :<div className={styles.weightReviewHead}><h3 title={weight.name}>{weight.name}</h3><span>{readOnly?<>기준 {review.referenceKg}kg{review.recommendedKg!==undefined&&<> → {review.approval?.nextWeightKg??review.previewApproval?.nextWeightKg??review.recommendedKg}kg</>}</>:<>{review.referenceKg}kg → <b>{drafts[weight.id]}kg</b></>} <b data-direction={review.direction} aria-label={review.direction==='increase'?'증량 검토':'감량 검토'}>{review.direction==='increase'?'↑':'↓'}</b></span></div>}
        {readOnly&&review.recommendedKg!==undefined&&<p className="muted small">{review.approval?'승인 완료':review.previewApproval?'시연 승인 완료 · DB 미저장':preview?'미승인 · 합성 표본':'미승인'}{review.approval&&<>{review.approval.nextWeightKg!==review.recommendedKg&&<> · 당시 권고 {review.recommendedKg}kg</>} · {new Date(review.approval.occurredAt).toLocaleString('ko-KR')}</>}</p>}
        <div className={styles.reviewValues}><span data-incomplete={review.incomplete || undefined}>{review.completed}/{review.planned}세트</span><span>{review.sets.length ? review.sets.map((set,i) => <span key={set.id}>{i > 0 && ' / '}<span data-direction={set.contributes ? review.direction : undefined}>{set.reps}회</span></span>) : '완료한 세트 없음'}</span></div>
      </section>
    })}
    {confirming && (onApprove||preview) && <Dialog title={preview?'합성 승인 시연':'중량 승인'} onClose={()=>{if(!submitting.current)setConfirming(false)}}><p>{onApprove&&!preview?<>선택한 {targets.length}종목의 중량을 현재 루틴에 저장합니다.</>:<>선택한 {targets.length}종목의 승인 화면을 시연합니다. 서버·DB에는 저장하지 않습니다.</>}</p>{confirmationIssue&&<p role="alert">{confirmationIssue}</p>}<div className="row"><Button disabled={saving} onClick={()=>setConfirming(false)}>취소</Button><Button variant="primary" disabled={disabled||saving||!targets.length} onClick={async()=>{
      if(submitting.current)return
      submitting.current=true;setSaving(true);setConfirmationIssue('')
      try{if(!onApprove||await onApprove(targets.map(id=>({id,nextKg:drafts[id]})))){setApproved(ids=>[...ids,...targets]);setConfirming(false)}else setConfirmationIssue('승인 저장을 확인하지 못했습니다. 최신 이력을 확인한 뒤 다시 시도해 주세요.')}
      catch{setConfirmationIssue('승인 저장을 확인하지 못했습니다. 연결 상태와 최신 이력을 확인해 주세요.')}
      finally{submitting.current=false;setSaving(false)}
    }}>{saving?'저장 확인 중…':preview?'시연 확인':'승인 확인'}</Button></div></Dialog>}
    {current && <ApprovalWeightDialog weight={current} value={drafts[current.id]} onClose={() => setModal(null)} onConfirm={value => { setDrafts({ ...drafts, [current.id]:value }); setModal(null) }} />}
  </Card>
}

function ApprovalWeightDialog({ weight, value, onConfirm, onClose }: { weight: WeightSummary; value: string; onConfirm: (value: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(value), [issue, setIssue] = useState('')
  const step = approvalStep(weight.loadType ?? null)
  return <Dialog title="승인 예정 중량" onClose={onClose}><div className="stack"><p className="approval-draft-value">현재 승인 중량 {weight.review!.referenceKg}kg → <strong data-approval-direction={compareWeight(draft,weight.review!.referenceKg)}>{draft||'—'}kg</strong></p>
    <NumberWheel label="승인 예정 중량" value={draft} onChange={setDraft} unit="kg" start="0" stepLabel={step} adjust={(s,d) => { try { const next = decimalDraft(adjustApproval(s,d,step)); return next === s ? null : next } catch { return null } }} validate={decimalDraft} />
    {issue && <p role="alert">{issue}</p>}<div className={styles.actions}><Button onClick={onClose}>취소</Button><Button variant="primary" onClick={() => { try { onConfirm(decimalDraft(draft)) } catch { setIssue('0 이상의 중량을 입력해 주세요.') } }}>확인</Button></div></div></Dialog>
}

function compareWeight(a:string,b:string){try{const scale=(v:string)=>{const [x,y='']=decimalDraft(v).split('.');return BigInt(x)*1000000n+BigInt(y.padEnd(6,'0'))};return scale(a)>scale(b)?'increase':scale(a)<scale(b)?'decrease':'same'}catch{return 'same'}}
