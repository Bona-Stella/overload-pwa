import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { boundaryError } from '../home/load.ts'
import { newId } from '../../id.ts'
import { TagPicker } from './TagPicker.tsx'
import { exerciseDescription } from './catalog-label.ts'
import { CardioPlanFields } from './CardioPlanFields.tsx'
import { cardioPlan, draftCardio, emptyCardio, adjust } from './cardio-draft.ts'
import type { CardioDraft as PlanDraft } from './cardio-draft.ts'
import { scheduleIssue } from '../statistics/weekly-schedule.ts'
import type { RoutineTag } from '../home/tags.ts'
import styles from './Routine.module.css'
import type { CardioActivity, CreateRoutine, Manufacturer, StandardExercise, Routine, UpdateRoutine } from './types.ts'
import { decimalDraft, name as validName } from './validation.ts'
import type { WorkoutOnlineController } from './controller.ts'
import { ExerciseSearch } from './ExerciseSearch.tsx'
import { EquipmentFields } from './EquipmentFields.tsx'

import { newWeights, updatedWeights } from './routine-weights.ts'
import type { WeightDraft } from './routine-weights.ts'
type CardioDraft = PlanDraft & {id:string;existing:boolean;restore?:boolean}
export function RoutineForm({ routine, generation, exercises, manufacturers = [], busy, controller, onClose, assignments, saveDescription, activities = [], onSaved, readOnly = false, onEdit, onDelete, managementBlocked = false }: {
  assignments?: ReactNode; saveDescription?: string; activities?:CardioActivity[]; onSaved?:(id: string, name: string)=>void; readOnly?:boolean; onEdit?:()=>void; onDelete?:()=>void; managementBlocked?:boolean; routine: Routine | null; generation: string; exercises: StandardExercise[]; manufacturers?: Manufacturer[]; busy: boolean; controller: Pick<WorkoutOnlineController, 'saveRoutine' | 'removedRoutine' | 'invalidateScope'>; onClose: () => void
}) {
  const [id] = useState(() => routine?.id ?? newId())
  const [tag, setTag] = useState<RoutineTag | ''>(routine?.tag??'')
  const [picker, setPicker] = useState<string | null>(null)
  const searchRegion = useRef<HTMLElement>(null)
  const showPicker = (target: string) => {
    setPicker(target)
    requestAnimationFrame(() => {
      searchRegion.current?.scrollIntoView({ block:'start', inline:'nearest' })
      searchRegion.current?.querySelector('input')?.focus({ preventScroll:true })
    })
  }
  useEffect(() => {
    if (picker === null) return
    const revealFocusedSearch = () => {
      if (searchRegion.current?.contains(document.activeElement)) searchRegion.current.scrollIntoView({block:'start',inline:'nearest'})
    }
    window.visualViewport?.addEventListener('resize', revealFocusedSearch)
    window.addEventListener('resize', revealFocusedSearch)
    return () => { window.visualViewport?.removeEventListener('resize', revealFocusedSearch); window.removeEventListener('resize', revealFocusedSearch) }
  }, [picker])
  const [saving, setSaving] = useState(false)
  const guard = useRef(false), abort = useRef(new AbortController())
  useEffect(() => { abort.current = new AbortController(); return () => abort.current.abort() }, [])
  const locked=busy||saving
  const move = <T,>(values: T[], index: number, delta: number) => { const next = [...values], target = index + delta; if(target<0 || target>=next.length)return values; [next[index],next[target]]=[next[target],next[index]];return next }
  const [name, setName] = useState(routine?.name ?? '')
  const [weights, setWeights] = useState<WeightDraft[]>(() => routine?.weightPlacements.map(p => ({ id: p.id, standardExerciseId: p.standardExerciseId, exerciseName: p.exerciseName, manufacturerId: p.manufacturerId, loadType: p.loadType,
    setCount: String(p.setCount), minReps: String(p.minReps), maxReps: String(p.maxReps), initialWeightKg: p.initialWeightKg, approvedWeightKg: p.approvedWeightKg, approve: false, nextWeightKg: p.approvedWeightKg })) ?? [])
  const [cardio, setCardio] = useState<CardioDraft[]>(() => routine?.cardioPlacements.map(p => ({id:p.id,existing:true,...draftCardio(p.plan)})) ?? [])
  const [removed, setRemoved] = useState<Routine | null>(null)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState<CreateRoutine | UpdateRoutine | null>(null)
  const [initialDraft] = useState(()=>JSON.stringify({name,weights,cardio,tag}))
  const close = () => { if(readOnly || JSON.stringify({name,weights,cardio,tag})===initialDraft || window.confirm('작성 중인 변경을 버리고 닫을까요?')) onClose() }
  const changeWeight = (id: string, patch: Partial<WeightDraft>) => setWeights(values => values.map(value => value.id === id ? { ...value, ...patch } : value))
  const changeCardio = (id: string, patch: Partial<CardioDraft>) => setCardio(values => values.map(value => value.id === id ? { ...value, ...patch } : value))
  async function save() {
    if(readOnly||locked||managementBlocked||guard.current)return
    guard.current=true;setSaving(true)
    try {
      let body = submitted
      if (!body) {
        if (!validName(name) || weights.length + cardio.length === 0) throw new Error('루틴 이름과 한 개 이상의 운동을 입력해 주세요.')
        const weightPlacements = newWeights(weights)
        const cardioPlacements = cardio.map(c => ({ id: c.id, plan: cardioPlan(c) }))
        body = routine ? { dataGeneration: generation, expectedVersion: routine.version, name, tag:tag||null,
          weightPlacements: updatedWeights(weights),
          cardioPlacements: cardioPlacements.map(c => ({ ...c, mode: cardio.find(x => x.id === c.id)!.restore ? 'RESTORE' as const : cardio.find(x => x.id === c.id)!.existing ? 'EXISTING' as const : 'NEW' as const })),
          weightApprovals: weights.filter(w => w.approve && w.approvedWeightKg !== null).map(w => ({ placementId: w.id, nextApprovedWeightKg: decimalDraft(w.nextWeightKg), occurredAt: new Date().toISOString() })) }
          : { id, dataGeneration: generation, name, tag:tag||null, weightPlacements, cardioPlacements }
        setSubmitted(body)
      }
      setError('')
      if (await controller.saveRoutine(body, routine?.id) && !abort.current.signal.aborted) {
        onSaved?.(id, body.name.trim())
        onClose()
      }
    } catch (error) { if(boundaryError(error))controller.invalidateScope(error);if(!abort.current.signal.aborted)setError(scheduleIssue(error)) }
    finally{guard.current=false;if(!abort.current.signal.aborted)setSaving(false)}
  }
  return <form className={`${styles.editor} stack online-routine`} data-readonly={readOnly} data-picking={picker !== null} aria-label={readOnly ? '루틴 상세' : routine ? '루틴 편집' : '새 루틴'} noValidate onSubmit={event => { event.preventDefault(); void save() }}>
    <div className="section-heading"><h2>{readOnly ? '루틴 상세' : routine ? '루틴 편집' : '새 루틴'}</h2><div className={styles.detailActions}>{readOnly && onEdit && <button type="button" className="quiet" disabled={busy || managementBlocked} onClick={onEdit}>편집</button>}{readOnly && onDelete && <button type="button" className="quiet danger" disabled={busy || managementBlocked} onClick={onDelete}>삭제</button>}<button type="button" className="quiet" disabled={locked && !readOnly} onClick={close}>닫기</button></div></div>
    <p className="muted small">{readOnly ? '저장된 루틴 계획입니다. 이 화면에서는 변경하지 않습니다.' : saveDescription ?? '온라인에서 저장합니다. 기존 배치의 승인 중량은 아래에서 명시적으로 선택한 경우에만 변경됩니다. 진행 중인 운동의 시작 계획은 유지됩니다.'}</p>
    <fieldset disabled={readOnly || locked || managementBlocked || submitted !== null} className="stack online-fieldset">
      {!readOnly && routine && <button type="button" className="outline" onClick={() => void controller.removedRoutine().then(value => { if (value) { if (value.version !== routine.version) setError('루틴이 변경되었습니다. 닫은 뒤 최신 루틴을 다시 조회해 주세요.'); else setRemoved(value) } })}>제거한 배치 조회</button>}
      {removed?.weightPlacements.filter(p => !weights.some(w => w.id === p.id)).map(p => <button type="button" className="outline" key={p.id} onClick={() => setWeights(values => [...values, { ...p, restore: true, standardExerciseId: p.standardExerciseId, setCount: String(p.setCount), minReps: String(p.minReps), maxReps: String(p.maxReps), approve: false, nextWeightKg: p.approvedWeightKg }])}>{p.exerciseName} 배치 복원</button>)}
      {removed?.cardioPlacements.filter(p => !cardio.some(c => c.id === p.id)).map(p => <button type="button" className="outline" key={p.id} onClick={() => setCardio(values => [...values, {id:p.id,existing:true,restore:true,...draftCardio(p.plan)}])}>{p.plan.name} 배치 복원</button>)}
      <section className={styles.formbox}><label className={styles.identityField}>루틴 이름<input placeholder="나의 루틴" value={name} onChange={e => setName(e.target.value)} /></label>
      <TagPicker value={tag} onChange={setTag} readOnly={readOnly}/></section>
      <h3 className={styles.group}>WEIGHT <small>웨이트 운동 · {weights.length}종목</small></h3>
      {!weights.length && <p className="muted small">등록된 웨이트 종목 없음</p>}

      {weights.map((w, index) => <section className="card stack" key={w.id} aria-label={`웨이트 ${index + 1}`}>
        <div className="section-heading"><h3>{index + 1}. {w.exerciseName}</h3>{!readOnly && <button type="button" className="quiet" onClick={() => showPicker(w.id)}>변경</button>}</div>
        <small className="muted">{exercises.find(e=>e.id===w.standardExerciseId)?exerciseDescription(exercises.find(e=>e.id===w.standardExerciseId)!):'부위·근육 미분류'}</small>
        <div className={styles.targets}>{([['setCount', '세트 수'], ['minReps', '최소 반복'], ['maxReps', '최대 반복']] as const).map(([key, label]) => <label key={key}>{label}<input inputMode="numeric" value={w[key]} onChange={e => changeWeight(w.id, { [key]: e.target.value })} /></label>)}</div>
        {w.approvedWeightKg === null ? <div className={styles.weightAdjust}><button type="button" onClick={()=>{try{const next=adjust(w.initialWeightKg,-1);changeWeight(w.id,{initialWeightKg:next})}catch(e){setError((e as Error).message)}}}>−2.5</button><label>최초 중량 (kg)<input inputMode="decimal" value={w.initialWeightKg} onChange={e=>changeWeight(w.id,{initialWeightKg:e.target.value})}/></label><button type="button" onClick={()=>{try{changeWeight(w.id,{initialWeightKg:adjust(w.initialWeightKg,1)})}catch(e){setError((e as Error).message)}}}>+2.5</button></div>
          : <><p>최초 {w.initialWeightKg} kg · 현재 승인 {w.approvedWeightKg} kg</p>{!readOnly && <label className="online-check"><input type="checkbox" checked={w.approve} onChange={e => changeWeight(w.id, { approve: e.target.checked })} />루틴 저장으로 새 중량 승인</label>}
            {w.approve && <label>새 승인 중량 (kg)<input inputMode="decimal" value={w.nextWeightKg} onChange={e => changeWeight(w.id, { nextWeightKg: e.target.value })} /></label>}</>}
        <EquipmentFields value={w} manufacturers={manufacturers} onChange={value=>changeWeight(w.id,value)}/>{!readOnly && <div className={styles.exerciseActions}><button type="button" disabled={index===0} onClick={()=>setWeights(v=>move(v,index,-1))}>↑ 위로</button><button type="button" disabled={index===weights.length-1} onClick={()=>setWeights(v=>move(v,index,1))}>↓ 아래로</button><button type="button" className="danger" onClick={() => setWeights(values => values.filter(x => x.id !== w.id))}>제거</button></div>}
      </section>)}
      {!readOnly && <button type="button" className="outline" aria-expanded={picker !== null} onClick={()=>{ if(picker === null) showPicker('add'); else setPicker(null) }}>{picker !== null?'종목 선택 닫기':'+ 웨이트 종목 추가'}</button>}
      {!readOnly && picker !== null && <section ref={searchRegion} className={`${styles.formbox} ${styles.searchRegion} stack`} aria-label={picker === 'add' ? '웨이트 종목 추가 선택' : '웨이트 종목 변경 선택'}><ExerciseSearch key={picker} exercises={exercises} onCancel={() => setPicker(null)} onSelect={exercise => {
        const fresh: WeightDraft = { id: newId(), standardExerciseId: exercise.id, exerciseName: exercise.name, manufacturerId: null, loadType: null, setCount: '3', minReps: '6', maxReps: '10', initialWeightKg: '', approvedWeightKg: null, approve: false, nextWeightKg: '' }
        // A different exercise is a NEW placement; never retarget an immutable existing placement/approval.
        setWeights(values => picker === 'add' ? [...values, fresh] : values.map(w => w.id !== picker || w.standardExerciseId === exercise.id ? w : { ...fresh, setCount:w.setCount, minReps:w.minReps, maxReps:w.maxReps }))
        setPicker(null)
      }} /></section>}
      <h3 className={styles.group}>CARDIO <small>유산소 운동 · {cardio.length}종목</small></h3>
      {!cardio.length && <p className="muted small">등록된 유산소 계획 없음</p>}
      {cardio.map((c, index) => <section className="card stack" key={c.id} aria-label={`유산소 ${index + 1}`}>
        <div className="section-heading"><h3>유산소 {index + 1}</h3></div>
        <CardioPlanFields value={c} onChange={v=>changeCardio(c.id,v)} activities={activities} readOnly={readOnly}/>
        {!readOnly && <div className={styles.exerciseActions}><button type="button" disabled={index===0} onClick={()=>setCardio(v=>move(v,index,-1))}>↑ 위로</button><button type="button" disabled={index===cardio.length-1} onClick={()=>setCardio(v=>move(v,index,1))}>↓ 아래로</button><button type="button" className="danger" onClick={() => setCardio(values => values.filter(x => x.id !== c.id))}>제거</button></div>}
      </section>)}
      {!readOnly && <button type="button" className="outline" onClick={() => setCardio(values => [...values, {id:newId(),existing:false,...emptyCardio()}])}>유산소 추가</button>}
    </fieldset>
    {readOnly && assignments}
    {error && <p className="notice error" role="alert">{error}</p>}
    {submitted && <p className="muted small">제출 내용을 고정했습니다. 응답이 확인되지 않았다면 같은 내용으로 확인하거나, 닫은 뒤 서버의 최신 루틴을 조회해 주세요.</p>}
    {!readOnly && <button className="primary full" disabled={locked || managementBlocked}>{locked ? '서버 확인 중…' : submitted ? '고정된 저장 요청 다시 확인' : '루틴 저장'}</button>}
  </form>
}
