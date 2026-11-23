import { useEffect, useRef, useState } from 'react'
import { useNavigationGuard } from '../../app/navigation.ts'
import { Button, Card } from '../../components/ui.tsx'
import { CircleCheck } from '../../components/common-ui/CircleCheck.tsx'
import { Dialog } from '../../components/Dialog.tsx'
import { createRepeatPointerGuard } from '../../components/repeatPointerGuard.ts'
import type { RepeatPointerGuard } from '../../components/repeatPointerGuard.ts'
import { NumberWheel } from '../../components/NumberWheel.tsx'
import { decimalDraft } from '../workout-online/validation.ts'
import { adjustApproval, approvalStep, suggestedApproval } from '../workout-online/approval-weight.ts'
import type { WeightSummary } from './WorkoutSummary.tsx'
import styles from './WorkoutFlow.module.css'
import detailStyles from './WorkoutRecordDetail.module.css'

type WeightChange = { previous: string; next: string }

export function ReviewWeightChange({ previous, next, confirmed = false }: { previous: string; next?: string; confirmed?: boolean }) {
  const direction = next === undefined ? 'same' : compareWeight(next, previous)
  const directionLabel = (direction === 'increase' ? '증량' : '감량') + (confirmed ? '' : ' 검토')
  return <span className={`${styles.reviewChange} approval-values`}>
    <span>{previous}kg</span>
    {next !== undefined && <>{' '}<span>→</span>{' '}
      <span className={styles.reviewResult} data-approval-direction={direction}>
        <strong>{next}kg</strong>
        {direction !== 'same' && <>{' '}<b role="img" aria-label={directionLabel}>{direction === 'increase' ? '↑' : '↓'}</b></>}
      </span>
    </>}
  </span>
}

export function WeightApprovalStatus({ previous, next }: WeightChange) {
  const direction = compareWeight(next, previous)
  return <span className={styles.reviewApprovalState} data-approval-direction={direction}>
    {direction === 'increase' ? '증량 완료' : direction === 'decrease' ? '감량 완료' : '변경 없음'}
  </span>
}

export function WeightReview({ weights, preview = false, readOnly = false, onApprove, disabled = false, approvalIssue }: { weights: WeightSummary[]; preview?: boolean; readOnly?: boolean; onApprove?:(choices:{id:string;nextKg:string}[])=>Promise<boolean>;disabled?:boolean;approvalIssue?:string }) {
  const [excluded, setExcluded] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Record<string,string>>({})
  const [modal, setModal] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string[]>([]), [approved, setApproved] = useState<string[]>([])
  const [closePointerGuard] = useState(createRepeatPointerGuard)
  const submitting=useRef(false),[saving,setSaving]=useState(false),[confirmationIssue,setConfirmationIssue]=useState('')
  const pendingReviews = weights.filter(w => w.review && (readOnly || !approved.includes(w.id)))
  const targets = pendingReviews.filter(w => !excluded.includes(w.id))
  const confirmedTargets = targets.filter(w => confirming.includes(w.id))
  const current = pendingReviews.find(w => w.id === modal)
  const approvalLabel = targets.length === pendingReviews.length ? '전체 승인' : '선택 승인'
  const defaultWeight = (weight: WeightSummary) => weight.review!.recommendedKg ?? suggestedApproval(weight.review!.referenceKg, weight.review!.direction, weight.loadType ?? null)
  const nextWeight = (weight: WeightSummary) => drafts[weight.id] ?? defaultWeight(weight)
  const hasDraft = !!onApprove && !readOnly && !preview && pendingReviews.some(w => drafts[w.id] !== undefined && drafts[w.id] !== defaultWeight(w))
  useNavigationGuard(() => !hasDraft || window.confirm('승인하지 않은 중량 변경을 버리고 나갈까요?'))
  useEffect(() => {
    if (!hasDraft) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [hasDraft])
  if (!pendingReviews.length) return null
  return <Card className={readOnly ? styles.reviewCard : `${styles.reviewCard} ${detailStyles.pendingReview}`} aria-label={readOnly?"당시 중량 검토":"중량 검토 카드"}>
    <div className="section-heading approval-toolbar">
      <h2 className={detailStyles.reviewTitle}>{readOnly?'당시 중량 검토':'중량 변경 검토 사항'}</h2>
      {!readOnly && <Button className={styles.approveButton} disabled={!targets.length||!onApprove&&!preview||disabled&&!saving} pending={saving}
        title={preview?'서버에 저장하지 않는 합성 승인 시연':undefined}
        onClick={event => { closePointerGuard.arm(event); setConfirmationIssue(''); setConfirming(targets.map(w => w.id)) }}>
        {approvalLabel}
      </Button>}
    </div>
    {readOnly&&<p className="muted small">운동 종료 당시 저장된 판정 · 현재 승인 중량과 정정 후 평가는 별개입니다.</p>}
    {!readOnly&&!preview&&!onApprove && <p className="muted small" role="status">선택·무게 수정은 승인 초안입니다. 현재는 검토만 가능하며 공식 승인 중량은 저장되지 않습니다.</p>}{!readOnly&&preview&&!onApprove&&<p className="muted small">합성 승인 시연 · 서버에는 저장하지 않습니다. 실제 계정 승인과 별개입니다.</p>}
    {pendingReviews.map(weight => {
      const review = weight.review!
      const previous = (readOnly ? review.approval?.previousWeightKg : undefined) ?? review.referenceKg
      const next = readOnly ? review.approval?.nextWeightKg ?? review.previewApproval?.nextWeightKg ?? review.recommendedKg : nextWeight(weight)
      const change = <ReviewWeightChange previous={previous} next={next} confirmed={readOnly && !!review.approval} />
      const sets = <span data-incomplete={!readOnly && review.incomplete || undefined}>{review.completed}/{review.planned}세트</span>
      const reps = review.sets.length ? review.sets.map((set,i) => <span key={set.id}>{i > 0 && ' / '}<span data-direction={set.contributes ? review.direction : undefined}>{set.reps}회</span></span>) : '완료한 세트 없음'
      return <section className={styles.recordItem + " approval-review-row"} key={weight.id} data-weight-review={review.direction}>
        {readOnly ? <>
          <div className={styles.weightReviewHead}><h3>{weight.name}</h3>{change}</div>
          <div className={styles.reviewHistoryValues}>
            {sets}<span className={styles.reviewHistoryReps}>{reps}</span>
            {review.approval
              ? <WeightApprovalStatus previous={review.approval.previousWeightKg} next={review.approval.nextWeightKg} />
              : <span className={styles.reviewApprovalState} title={review.previewApproval ? '합성 승인 시연 · 서버·DB 미저장' : undefined}>
                {review.previewApproval ? '시연 승인 · DB 미저장' : preview ? '미승인 · 합성 표본' : '미승인'}
              </span>}
          </div>
        </> : <div className={`${styles.approvalRow} approval-item`}>
          <CircleCheck label={weight.name + ' 승인 선택'} disabled={disabled||saving} checked={!excluded.includes(weight.id)}
            onCheckedChange={checked => setExcluded(ids => checked ? ids.filter(id => id !== weight.id) : [...ids, weight.id])} />
          <h3 title={weight.name}>{weight.name}</h3>
          <Button className={styles.reviewButton} disabled={disabled&&!saving} pending={saving} onClick={event => { closePointerGuard.arm(event); setModal(weight.id) }}>무게 수정</Button>
          <div className={styles.reviewValues}>{change}<div className={styles.reviewEvidence}>{sets}{' · '}{reps}</div></div>
        </div>}
      </section>
    })}
    {confirmedTargets.length > 0 && (onApprove||preview) && <Dialog title={preview?'합성 승인 시연':'중량 승인'} closePointerGuard={closePointerGuard} dismissBlocked={saving} onClose={()=>{if(!submitting.current)setConfirming([])}}><p>{onApprove&&!preview?<>선택한 {confirmedTargets.length}종목의 중량을 현재 루틴에 저장합니다.</>:<>선택한 {confirmedTargets.length}종목의 승인 화면을 시연합니다. 서버·DB에는 저장하지 않습니다.</>}</p>{(approvalIssue||confirmationIssue)&&<p role="alert">{approvalIssue||confirmationIssue}</p>}<div className="row"><Button pending={saving} onClick={()=>setConfirming([])}>취소</Button><Button variant="primary" disabled={disabled&&!saving} loading={saving} onClick={async()=>{
      if(submitting.current)return
      submitting.current=true;setSaving(true);setConfirmationIssue('')
      try {
        if (!onApprove || await onApprove(confirmedTargets.map(w => ({ id:w.id, nextKg:nextWeight(w) })))) {
          if (preview) setApproved(ids => [...ids,...confirmedTargets.map(w => w.id)])
          setConfirming([])
        } else setConfirmationIssue('승인 저장을 확인하지 못했습니다. 최신 이력을 확인한 뒤 다시 시도해 주세요.')
      }
      catch{setConfirmationIssue('승인 저장을 확인하지 못했습니다. 연결 상태와 최신 이력을 확인해 주세요.')}
      finally{submitting.current=false;setSaving(false)}
    }}>{preview?'시연 확인':'승인 확인'}</Button></div></Dialog>}
    {current && <ApprovalWeightDialog weight={current} value={nextWeight(current)} closePointerGuard={closePointerGuard}
      onClose={() => setModal(null)} onConfirm={value => { setDrafts(values => ({ ...values, [current.id]:value })); setModal(null) }} />}
  </Card>
}

function ApprovalWeightDialog({ weight, value, onConfirm, onClose, closePointerGuard }: { weight: WeightSummary; value: string; onConfirm: (value: string) => void; onClose: () => void; closePointerGuard: RepeatPointerGuard }) {
  const [draft, setDraft] = useState(value), [issue, setIssue] = useState('')
  const step = approvalStep(weight.loadType ?? null)
  return <Dialog title="승인 예정 중량" onClose={onClose} closePointerGuard={closePointerGuard}><div className="stack"><p className="approval-draft-value">현재 승인 중량 {weight.review!.referenceKg}kg → <strong data-approval-direction={compareWeight(draft,weight.review!.referenceKg)}>{draft||'—'}kg</strong></p>
    <NumberWheel label="승인 예정 중량" value={draft} onChange={setDraft} unit="kg" start="0" stepLabel={step} adjust={(s,d) => { try { const next = decimalDraft(adjustApproval(s,d,step)); return next === s ? null : next } catch { return null } }} validate={decimalDraft} />
    {issue && <p role="alert">{issue}</p>}<div className={styles.actions}><Button onClick={onClose}>취소</Button><Button variant="primary" onClick={() => { try { onConfirm(decimalDraft(draft)) } catch { setIssue('0 이상의 중량을 입력해 주세요.') } }}>확인</Button></div></div></Dialog>
}

function compareWeight(a:string,b:string){try{const scale=(v:string)=>{const [x,y='']=decimalDraft(v).split('.');return BigInt(x)*1000000n+BigInt(y.padEnd(6,'0'))};return scale(a)>scale(b)?'increase':scale(a)<scale(b)?'decrease':'same'}catch{return 'same'}}
