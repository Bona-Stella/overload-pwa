import { KgWheel } from '../workout-flow/WeightFocus.tsx'
import { useContext, useEffect, useRef, useState } from 'react'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { EditorViewportOccluded } from '../../components/useEditorKeyboard.ts'
import { editorViewport } from '../../components/editorViewport.ts'
import { Button, Card } from '../../components/ui.tsx'
import { NumberWheel } from '../../components/NumberWheel.tsx'
import numeric from '../../components/NumberWheel.module.css'
import ui from '../../components/ui.module.css'
import { boundaryError } from '../home/load.ts'
import { newId } from '../../id.ts'
import { TagPicker } from './TagPicker.tsx'
import { cardioDescription, exerciseDescription } from './catalog-label.ts'
import { CardioPlanFields } from './CardioPlanFields.tsx'
import { ExerciseEditHeading } from './ExerciseEditHeading.tsx'
import { CardioSearch } from './CardioSearch.tsx'
import { cardioPlan, draftCardio, emptyCardio, selectCardio } from './cardio-draft.ts'
import type { CardioDraft as PlanDraft } from './cardio-draft.ts'
import type { RoutineTag } from '../home/tags.ts'
import styles from './Routine.module.css'
import editStyles from './RoutineEdit.module.css'
import type { CardioActivity, CreateRoutine, Manufacturer, Session, StandardExercise, Routine, UpdateRoutine } from './types.ts'
import { count, countDraft, decimalDraft, name as validName } from './validation.ts'
import type { WorkoutOnlineController } from './controller.ts'
import { ExerciseSearch } from './ExerciseSearch.tsx'
import { EquipmentFields } from './EquipmentFields.tsx'
import { CombinationMemo } from './CombinationMemo.tsx'
import { navigateBack, useNavigationGuard } from '../../app/navigation.ts'
import { useConfirmation } from '../../components/useConfirmation.tsx'
import { Toast } from '../../components/common-ui/Toast.tsx'
import { useSuccessToast } from '../../components/common-ui/useSuccessToast.ts'

import { newWeights, updatedWeights } from './routine-weights.ts'
import { latestActualWeight } from './workout-history.ts'
import type { WeightDraft } from './routine-weights.ts'

type Targets = Pick<WeightDraft, 'setCount' | 'minReps' | 'maxReps'>

export function RoutineTargetFields({ value, initial, onChange }: { value: Targets; initial?: (keyof Targets)[]; onChange: (changes: Partial<Targets>) => void }) {
  return <div className={styles.targets}>
    {([['setCount', '본세트', '세트'], ['minReps', '최소 반복', '회'], ['maxReps', '최대 반복', '회']] as const).map(([key, label, unit]) =>
      <div className={numeric.field} key={key}><span>{label}</span><NumberWheel label={label} value={value[key]} unit={unit} start="1" hideSteps
        valueState={initial?.includes(key) ? 'initial' : 'confirmed'}
        adjust={(current, direction) => { const next = Number(current) + direction; return count(next) ? String(next) : null }}
        validate={next => String(countDraft(next))} onChange={next => onChange({ [key]: next })} /></div>)}
  </div>
}
type CardioDraft = PlanDraft & {id:string;existing:boolean;restore?:boolean}

function ExerciseActions({ index, count, onMove, onRemove }: {
  index: number; count: number; onMove: (delta: number) => void; onRemove: () => void
}) {
  return <div className={editStyles.exerciseActions}>
    <button type="button" disabled={index === 0} onClick={() => onMove(-1)}>↑ 위로</button>
    <button type="button" disabled={index === count - 1} onClick={() => onMove(1)}>↓ 아래로</button>
    <button type="button" className={`danger ${editStyles.cardAction}`} onClick={onRemove}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 7h14m-9 0V4h4v3m-7 0 1 13h8l1-13m-6 3v7m3-7v7" /></svg>
      삭제
    </button>
  </div>
}

function EmptyExerciseList({ weight = false }: { weight?: boolean }) {
  return <Card className={editStyles.emptyList}>
    <svg width="28" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {weight ? <path d="M2 9v6m4-9v12m12-12v12m4-9v6M2 12h20" /> : <><ellipse cx="6.5" cy="9" rx="3.2" ry="5.7" transform="rotate(12 6.5 9)" /><ellipse cx="17.5" cy="13" rx="3.2" ry="5.7" transform="rotate(12 17.5 13)" /></>}
    </svg>
    <p>등록된 {weight ? '웨이트' : '유산소'} 운동이 없어요</p>
  </Card>
}

export function RoutineForm({ routine, generation, exercises, manufacturers = [], busy, controller, onClose, activities = [], onSaved, managementBlocked = false, navigationKey, backLabel = '루틴 목록으로', history = [], historyStatus = 'ready' }: {
  history?: Session[]; historyStatus?: 'pending' | 'ready' | 'failed'
  activities?:CardioActivity[]; onSaved?:(id: string, name: string)=>void; managementBlocked?:boolean; routine: Routine | null; generation: string; exercises: StandardExercise[]; manufacturers?: Manufacturer[]; busy: boolean; controller: Pick<WorkoutOnlineController, 'saveRoutine' | 'removedRoutine' | 'invalidateScope'> & Partial<Pick<WorkoutOnlineController, 'getSnapshot'>>; onClose: () => void; navigationKey?: string; backLabel?: string
}) {
  const editing = routine !== null
  const [id] = useState(() => routine?.id ?? newId())
  const [tag, setTag] = useState<RoutineTag | ''>(routine?.tag??'')
  const [picker, setPicker] = useState<string | null>(null)
  const [cardioPicker, setCardioPicker] = useState<string | null>(null)
  const [addedCardId, setAddedCardId] = useState<string | null>(null)
  const form = useRef<HTMLFormElement>(null)
  const keyboardOccludesPage = useContext(EditorViewportOccluded)
  const addedCard = useRef<HTMLElement>(null)
  const searchRegion = useRef<HTMLElement>(null)
  const cardioSearchRegion = useRef<HTMLElement>(null)
  const pickerFrame = useRef(0)
  useEffect(() => () => cancelAnimationFrame(pickerFrame.current), [])
  const showPicker = (target: string) => {
    setPicker(target)
    cancelAnimationFrame(pickerFrame.current)
    pickerFrame.current = requestAnimationFrame(() => {
      const region = searchRegion.current
      if (!region || region.contains(document.activeElement)) return
      if (!keyboardOccludesPage && editorViewport().occlusion <= 2) region.scrollIntoView({ block:'nearest', inline:'nearest' })
      // On touch, the user's tap starts native keyboard positioning on the search field.
      if (!matchMedia('(pointer: coarse)').matches) region.querySelector('input')?.focus({ preventScroll:true })
    })
  }
  useEffect(() => {
    const editor = form.current
    const card = addedCard.current
    const header = editor?.querySelector(':scope > header')
    const scroll = document.scrollingElement
    if (keyboardOccludesPage || !addedCardId || !editor || !card || !header || !scroll) return

    const frame = requestAnimationFrame(() => {
      const headerInset = Number.parseFloat(getComputedStyle(header).top) || 0
      const top = Math.max(0, scroll.scrollTop + card.getBoundingClientRect().top - headerInset - header.getBoundingClientRect().height - 8)
      // The last CARDIO card may need extra room to reach the header.
      const missing = Math.ceil(top + scroll.clientHeight - scroll.scrollHeight)
      if (missing > 0) {
        const clearance = Number.parseFloat(editor.style.getPropertyValue('--added-card-clearance')) || 0
        editor.style.setProperty('--added-card-clearance', `${clearance + missing}px`)
      }
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      scroll.scrollTo({ top, behavior: reducedMotion ? 'instant' : 'smooth' })
      setAddedCardId(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [addedCardId, keyboardOccludesPage])
  const [saveAttempt, setSaveAttempt] = useState<'submit' | 'retry' | null>(null)
  const saving = saveAttempt !== null
  const guard = useRef(false), abort = useRef(new AbortController())
  useEffect(() => { abort.current = new AbortController(); return () => abort.current.abort() }, [])
  const locked=busy||saving
  const move = <T,>(values: T[], index: number, delta: number) => { const next = [...values], target = index + delta; if(target<0 || target>=next.length)return values; [next[index],next[target]]=[next[target],next[index]];return next }
  const [name, setName] = useState(routine?.name ?? '')
  const [weights, setWeights] = useState<WeightDraft[]>(() => routine?.weightPlacements.map(p => ({ id: p.id, standardExerciseId: p.standardExerciseId, exerciseName: p.exerciseName, manufacturerId: p.manufacturerId, loadType: p.loadType,
    setCount: String(p.setCount), minReps: String(p.minReps), maxReps: String(p.maxReps), initialWeightKg: p.initialWeightKg, approvedWeightKg: p.approvedWeightKg, approve: false, nextWeightKg: p.approvedWeightKg })) ?? [])
  const [cardio, setCardio] = useState<CardioDraft[]>(() => routine?.cardioPlacements.map(p => ({id:p.id,existing:true,...draftCardio(p.plan)})) ?? [])
  const [removed, setRemoved] = useState<Routine | null>(null)
  const feedback = useSuccessToast(`routine:${generation}:${id}`)
  const [submitted, setSubmitted] = useState<CreateRoutine | UpdateRoutine | null>(null)
  const chosenCardio = cardio.filter(c => c.existing || c.standardExerciseId)
  const draft = JSON.stringify({ name, weights, cardio: chosenCardio, tag })
  const [initialDraft] = useState(draft)
  const saved = useRef(false)
  const [confirm, confirmation] = useConfirmation()
  const canLeave = (duringTraversal = false) => saved.current || !guard.current && !busy && (draft === initialDraft || confirm({
    title: '루틴 변경을 버릴까요?', description: <p>{routine ? '이미 저장한 루틴은 유지돼요.' : '작성한 내용은 저장되지 않아요.'}</p>,
    confirmLabel: '버리기', destructive: true, duringTraversal,
  }))
  useNavigationGuard(() => canLeave(true), navigationKey)
  const close = () => {
    const fallback = async () => { if (await canLeave()) onClose() }
    if (navigationKey) navigateBack(fallback)
    else fallback()
  }
  const changeWeight = (id: string, patch: Partial<WeightDraft>) => setWeights(values => values.map(value => value.id === id ? { ...value, ...patch } : value))
  function initialWeight(weight: WeightDraft) {
    const recent = latestActualWeight(history, weight.standardExerciseId, weight)
    return { value: recent ?? '0', available: typeof recent === 'string' || recent === undefined && historyStatus === 'ready' }
  }
  const changeCardio = (id: string, patch: Partial<CardioDraft>) => setCardio(values => values.map(value => value.id === id ? { ...value, ...patch } : value))
  function openCardioPicker(id: string | null) {
    if (cardioPicker && cardioPicker !== id) {
      setCardio(values => values.filter(c => c.id !== cardioPicker || c.existing || c.standardExerciseId))
    }
    setCardioPicker(id)
  }
  function chooseCardio(current: CardioDraft, next: PlanDraft) {
    if (current.standardExerciseId !== next.standardExerciseId || current.activityId !== next.activityId) {
      changeCardio(current.id, { ...next, id: current.existing ? newId() : current.id, existing: false, restore: false })
      if (!current.existing && !current.standardExerciseId) setAddedCardId(current.id)
    }
    setCardioPicker(null)
  }
  function addCardio() {
    const id = newId()
    setCardio(values => [...values, { id, existing: false, ...emptyCardio() }])
    openCardioPicker(id)
    if (!keyboardOccludesPage) requestAnimationFrame(() => cardioSearchRegion.current?.scrollIntoView({ block: 'nearest' }))
  }
  function lookupRemoved() {
    if (!routine) return
    void controller.removedRoutine(routine.id).then(value => {
      if (!value) { feedback.show('복원할 종목을 불러오지 못했어요.', 'error'); return }
      if (value.version !== routine.version) feedback.show('루틴이 변경됐어요. 최신 루틴을 확인해 주세요.', 'warning')
      else setRemoved(value)
    })
  }
  async function save() {
    if(locked||managementBlocked||guard.current)return
    guard.current = true
    let validating = submitted === null
    let confirmed = false
    const persist = async (body: CreateRoutine | UpdateRoutine) => {
      setSaveAttempt(submitted ? 'retry' : 'submit')
      setSubmitted(body)
      validating = false
      feedback.clear()
      confirmed = await controller.saveRoutine(body, routine?.id, !!submitted)
      if (!confirmed && !abort.current.signal.aborted) {
        const outcome = controller.getSnapshot?.()
        if (outcome?.routineSaveRejected) {
          setSubmitted(null)
          feedback.show(outcome.issue ?? '루틴을 저장하지 못했어요.', 'error')
        } else feedback.show('루틴 저장 결과를 확인하지 못했어요.', 'warning')
      }
    }
    try {
      let body = submitted
      if (!body) {
        if (!validName(name) || weights.length + cardio.length === 0) throw new Error('루틴 이름과 한 개 이상의 운동을 입력해 주세요.')
        const resolvedWeights = weights.map(weight => {
          if (weight.approvedWeightKg !== null || weight.initialWeightKg) return weight
          const initial = initialWeight(weight)
          if (!initial.available) throw Error(`${weight.exerciseName}의 이전 중량을 확인하지 못했어요. 설정 중량을 입력해 주세요.`)
          return { ...weight, initialWeightKg: initial.value }
        })
        const weightPlacements = newWeights(resolvedWeights)
        if (cardio.some(c => !c.existing && !c.standardExerciseId)) throw new Error('추가할 유산소 종목을 카탈로그에서 선택해 주세요.')
        const cardioPlacements = cardio.map(c => ({ id: c.id, plan: cardioPlan(c) }))
        body = routine ? { dataGeneration: generation, expectedVersion: routine.version, name, tag:tag||null,
          weightPlacements: updatedWeights(resolvedWeights),
          cardioPlacements: cardioPlacements.map(c => ({ ...c, mode: cardio.find(x => x.id === c.id)!.restore ? 'RESTORE' as const : cardio.find(x => x.id === c.id)!.existing ? 'EXISTING' as const : 'NEW' as const })),
          weightApprovals: weights.filter(w => w.approve && w.approvedWeightKg !== null).map(w => ({ placementId: w.id, nextApprovedWeightKg: decimalDraft(w.nextWeightKg), occurredAt: new Date().toISOString() })) }
          : { id, dataGeneration: generation, name, tag:tag||null, weightPlacements, cardioPlacements }
        if ('weightApprovals' in body && body.weightApprovals.length) {
          const changes = body.weightApprovals.map(approval => {
            const weight = weights.find(w => w.id === approval.placementId)
            return `${weight?.exerciseName ?? '웨이트 종목'} · ${approval.nextApprovedWeightKg} kg`
          })
          const request = body
          await confirm({ title: '새 중량을 승인할까요?',
            description: <><p>루틴 변경사항도 함께 저장돼요.</p><ul>{changes.map((change, index) => <li key={request.weightApprovals[index].placementId}>{change}</li>)}</ul></>,
            confirmLabel: '승인하고 저장', onConfirm: () => persist(request),
          })
        } else {
          await persist(body)
        }
      } else await persist(body)
      if (confirmed && !abort.current.signal.aborted) {
        saved.current = true
        onSaved?.(id, body.name.trim())
        if (navigationKey) navigateBack(onClose)
        else onClose()
      }
    } catch (error) {
      if (boundaryError(error)) controller.invalidateScope(error)
      if (!abort.current.signal.aborted) feedback.show(validating && error instanceof Error ? error.message : '루틴을 저장하지 못했어요.', validating ? 'warning' : 'error')
    }
    finally{guard.current=false;if(!abort.current.signal.aborted && !saved.current)setSaveAttempt(null)}
  }
  const saveLabel = saveAttempt === 'retry' || !saving && submitted ? '저장 결과 확인' : editing ? '변경 사항 저장' : '루틴 생성'
  const title = editing ? '루틴 편집' : '루틴 생성'
  const cardClass = `stack ${editStyles.exercise}`
  return <form ref={form} className={`${styles.editor} stack online-routine ${editStyles.form}${editing ? '' : ' ' + editStyles.create}`} data-keyboard-editor data-picking={picker !== null} aria-label={title} noValidate onSubmit={event => { event.preventDefault(); void save() }}>
    <RecordSubpageHeader title={title} onBack={close} backLabel={backLabel} backDisabled={locked} />
    <fieldset disabled={locked || managementBlocked || submitted !== null} className="stack online-fieldset">
      <h2 className={editStyles.group}>기본 정보</h2>
      <section className={styles.formbox}>
        <label className={styles.identityField}>루틴 이름<input className={ui.input} placeholder="나의 루틴" value={name} onChange={e => setName(e.target.value)} /></label>
        <TagPicker value={tag} onChange={setTag} />
      </section>
      <h3 className={editStyles.group}>WEIGHT <small>총 {weights.length}종목</small></h3>
      {!editing && !weights.length && <EmptyExerciseList weight />}
      {weights.map((w, index) => {
        const definition = exercises.find(e => e.id === w.standardExerciseId)
        const description = definition ? exerciseDescription(definition) : '부위·근육 미분류'
        const step = w.loadType === 'PLATE' || w.loadType === 'STACK' ? 2.5 : 1
        const unconfirmed = w.approvedWeightKg === null && !w.initialWeightKg
        const settingWeight = w.approvedWeightKg === null ? w.initialWeightKg || initialWeight(w).value : w.nextWeightKg
        return <Card className={cardClass} key={w.id} aria-label={`웨이트 ${index + 1}`} ref={addedCardId === w.id ? addedCard : undefined}>
          <ExerciseEditHeading index={index} name={w.exerciseName} description={description} picking={picker === w.id} onChange={() => showPicker(w.id)} />
          <EquipmentFields value={w} manufacturers={manufacturers} onChange={value => {
            if (value.manufacturerId === w.manufacturerId && value.loadType === w.loadType) return
            changeWeight(w.id, { ...value, ...(w.approvedWeightKg !== null ? { id:newId(), approvedWeightKg:null, initialWeightKg:'', approve:false, nextWeightKg:'', restore:false } : {}) })
          }} />
          <RoutineTargetFields value={w} initial={w.initialTargets}
            onChange={changes => changeWeight(w.id, { ...changes, initialTargets: w.initialTargets?.filter(key => !(key in changes)) })} />
          <div className={editStyles.weight}>
            <div><span>설정 중량</span><small>{step}kg 단위</small></div>
            <KgWheel label="설정 중량" step={step} compact required value={settingWeight} valueState={unconfirmed ? 'initial' : 'confirmed'} onChange={value => {
              if (w.approvedWeightKg === null) changeWeight(w.id, { initialWeightKg: value })
              else {
                const approve = value !== decimalDraft(w.approvedWeightKg)
                changeWeight(w.id, { nextWeightKg: approve ? value : w.approvedWeightKg, approve })
              }
            }} />
          </div>
          <CombinationMemo exerciseId={w.standardExerciseId} equipment={w} draftNotice="미저장 · 새로고침하면 메모가 사라집니다." />
          <ExerciseActions index={index} count={weights.length} onMove={delta => setWeights(v => move(v, index, delta))} onRemove={() => {
            setWeights(values => values.filter(x => x.id !== w.id))
            if (picker === w.id) setPicker(null)
          }} />
        </Card>
      })}
      <button data-close-text={editing && picker !== null || undefined} type="button" className="outline" aria-expanded={editing ? picker !== null : picker === 'add'} onClick={()=>{ if (!editing || picker === null) showPicker('add'); else setPicker(null) }}>{editing && picker !== null ? '종목 선택 닫기' : '+ 웨이트 종목 추가'}</button>
      {picker !== null && <section ref={searchRegion} data-edit-picker className={`${styles.formbox} ${styles.searchRegion} stack`} aria-label={picker === 'add' ? '웨이트 종목 추가 선택' : '웨이트 종목 변경 선택'}><ExerciseSearch key={picker} exercises={exercises} defaultOpen onCancel={() => setPicker(null)} onSelect={exercise => {
        const fresh: WeightDraft = { id: newId(), standardExerciseId: exercise.id, exerciseName: exercise.name, manufacturerId: null, loadType: null,
          setCount: '3', minReps: '6', maxReps: '10', initialTargets: ['setCount', 'minReps', 'maxReps'],
          initialWeightKg: '', approvedWeightKg: null, approve: false, nextWeightKg: '' }
        // A different exercise is a NEW placement; never retarget an immutable existing placement/approval.
        setWeights(values => picker === 'add' ? [...values, fresh] : values.map(w => w.id !== picker || w.standardExerciseId === exercise.id ? w
          : { ...fresh, setCount: w.setCount, minReps: w.minReps, maxReps: w.maxReps, initialTargets: w.initialTargets }))
        if (picker === 'add') setAddedCardId(fresh.id)
        setPicker(null)
      }} />{!editing && <button type="button" className="outline" data-close-text onClick={() => setPicker(null)}>종목 선택 닫기</button>}</section>}
      <h3 className={editStyles.group}>CARDIO <small>총 {chosenCardio.length}종목</small></h3>
      {!editing && !chosenCardio.length && <EmptyExerciseList />}
      {cardio.map((c, index) => {
        const picking = cardioPicker === c.id
        const selectionOnly = !c.existing && !c.standardExerciseId
        const search = <CardioSearch activities={activities} onCancel={() => openCardioPicker(null)}
          onSelect={activity => chooseCardio(c, selectCardio(c, activity))} />
        if (selectionOnly) return <section key={c.id} ref={cardioSearchRegion} data-edit-picker className={styles.formbox} aria-label="유산소 종목 추가 선택">
          {search}
          <button type="button" className="outline" data-close-text onClick={() => openCardioPicker(null)}>유산소 종목 선택 닫기</button>
        </section>
        return <Card className={cardClass} key={c.id} aria-label={`유산소 ${index + 1}`}
          data-edit-picker={picking || undefined} ref={addedCardId === c.id ? addedCard : picking ? cardioSearchRegion : undefined}>
          <ExerciseEditHeading index={index} name={c.name || '유산소 종목 선택'} description={editing ? undefined : cardioDescription(c, activities)}
            picking={picking} onChange={() => openCardioPicker(picking ? null : c.id)} />
          {picking ? search : <CardioPlanFields value={c} onChange={v => changeCardio(c.id, v)} />}
          <ExerciseActions index={index} count={chosenCardio.length} onMove={delta => setCardio(v => move(v, index, delta))} onRemove={() => {
            setCardio(values => values.filter(x => x.id !== c.id))
            if (picking) setCardioPicker(null)
          }} />
        </Card>
      })}
      <button type="button" className="outline action-pill" onClick={addCardio}>+ 유산소 종목 추가</button>
      {editing && <details className={editStyles.restore}>
        <summary>제거한 종목 복원</summary>
        <div className="stack">
          <Button onClick={lookupRemoved}>복원 후보 조회</Button>
          {removed?.weightPlacements.filter(p => !weights.some(w => w.id === p.id)).map(p => <Button key={p.id} onClick={() => setWeights(values => [...values, { ...p, restore: true, setCount: String(p.setCount), minReps: String(p.minReps), maxReps: String(p.maxReps), approve: false, nextWeightKg: p.approvedWeightKg }])}>{p.exerciseName} 배치 복원</Button>)}
          {removed?.cardioPlacements.filter(p => !cardio.some(c => c.id === p.id)).map(p => <Button key={p.id} onClick={() => setCardio(values => [...values, {id:p.id,existing:true,restore:true,...draftCardio(p.plan)}])}>{p.plan.name} 배치 복원</Button>)}
        </div>
      </details>}
    </fieldset>
    <footer className={editStyles.footer}>
      <Button disabled={locked && !saving} pending={saving} onClick={close}>취소</Button>
      <Button type="submit" variant="primary" className="full" disabled={!saving && (locked || managementBlocked)} loading={saving}>{saveLabel}</Button>
    </footer>
    {confirmation}
    <Toast toast={feedback.toast} onDismiss={feedback.dismiss} bottomClearance="calc(var(--save-height) + 2 * var(--save-padding))" />
  </form>
}
