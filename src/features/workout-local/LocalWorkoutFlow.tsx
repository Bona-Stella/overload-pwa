import { referenceIncrease } from '../workout-online/reference-reminder.ts'
import type { ReferenceRecord } from '../workout-online/reference-reminder.ts'
import type { Routine } from '../workout-online/types.ts'
import { CombinationMemo } from '../workout-online/CombinationMemo.tsx'
import { changedOriginalCombination } from '../workout-online/approval-weight.ts'
import { Children, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Card, StatusNotice } from '../../components/ui.tsx'
import { WorkoutFrame, Warmup, RestActions, ExerciseNavigation, WeightRecommendation } from '../workout-flow/WorkoutFrame.tsx'
import type { ExerciseScrollPosition } from '../workout-flow/WorkoutFrame.tsx'
import { WeightFocus, EquipmentEditor } from '../workout-flow/WeightFocus.tsx'
import { CardioFocus } from '../workout-flow/CardioFocus.tsx'
import { ExerciseList, WeightChange, ConfirmWorkoutAction, SessionExerciseSearch, SessionCardioPlan } from '../workout-flow/WorkoutDialogs.tsx'
import { exerciseDescription } from '../workout-online/catalog-label.ts'
import { equipmentLabel } from '../workout-online/equipment.ts'
import type { CardioActivity, Manufacturer, ProgressAssessment, Session, StandardExercise } from '../workout-online/types.ts'
import { decimalDraft } from '../workout-online/validation.ts'
import type { EditorState, LocalWorkoutController } from './controller.ts'
import type { LocalWorkout } from './types.ts'
import { slotKey } from './types.ts'
import * as model from './model.ts'
import { flowCardio, flowWeights, inputDraft, isWeightDone } from './flow-data.ts'
import { observedWeightMs } from './weight-timing.ts'
import { SYNC_LABEL } from './sync.ts'
import { useRestAudio, useRestTimerAudio } from '../workout-flow/useRestAudio.ts'
import { useRestAlertPreferences } from '../workout-flow/useRestAlertPreferences.ts'
import { useCardioEstimate } from '../settings/useCardioEstimate.ts'
import { restAlertVisual } from '../workout-flow/rest-alerts.ts'
import styles from '../workout-flow/WorkoutFlow.module.css'

type Modal = 'list' | 'weight' | 'end' | 'add' | 'replace' | 'cardio' | 'edit-cardio' | 'remove' | 'undo-cardio' | { undo: number }
const restKey = (rest: LocalWorkout['rest']) => rest ? [rest.sessionExerciseId, rest.ordinal, rest.startedAt].join(':') : null
export function LocalWorkoutView({ state, controller, definitions, manufacturers = [], activities = [], history = [], visible = true, onHome = () => {}, backLabel, notices, progressAssessment, referenceRecords = [], referenceRoutine = null, createSetId }: {
  state: EditorState; controller: LocalWorkoutController; definitions: StandardExercise[]; manufacturers?: Manufacturer[]
  activities?: CardioActivity[]; history?: Session[]; visible?: boolean; onHome?: () => void; backLabel?: string; notices?: ReactNode
  progressAssessment?: ProgressAssessment; referenceRecords?:ReferenceRecord[]; referenceRoutine?:Routine|null
  createSetId?: () => string
}) {
  const [now, setNow] = useState(Date.now), [modal, setModal] = useState<Modal | null>(null), [editing, setEditing] = useState(false)
  const [hiddenRecommendations,setHiddenRecommendations]=useState<Set<string>>(()=>new Set())
  const [completedScroll, setCompletedScroll] = useState(0)
  const [exerciseScroll, setExerciseScroll] = useState<ExerciseScrollPosition | null>(null)
  const [memoOpen, setMemoOpen] = useState<Record<string, boolean>>({})
  const [endingRest, setEndingRest] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [completingSet, setCompletingSet] = useState<number | null>(null)
  const manualRest = useRef<string | null>(null)
  const action = useRef(false), clock = useRef<HTMLDivElement>(null), working = useRef<HTMLElement>(null)
  const [alerts] = useRestAlertPreferences(state.workout?.userId ?? null)
  const [estimateCardio] = useCardioEstimate(state.workout?.userId ?? null)
  const audio = useRestAudio(alerts.sound || alerts.middle, alerts.volume)
  const { stop, unlock } = audio
  const workout = state.workout
  const timingReady = !!workout && state.writable && !workout.finish
  useEffect(() => {
    if (!timingReady) return
    const observe = () => { void controller.observeWeightVisibility(visible && document.visibilityState === 'visible') }
    observe()
    document.addEventListener('visibilitychange', observe)
    return () => document.removeEventListener('visibilitychange', observe)
  }, [controller, timingReady, visible])
  const rests = workout?.rests ? Object.values(workout.rests) : workout?.rest ? [workout.rest] : []
  const audioRests = rests.filter(rest => restKey(rest) !== endingRest)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const audioRest = audioRests.find(rest => Date.parse(rest.endsAt) > now)
  const restStarted = audioRest ? Date.parse(audioRest.startedAt) : undefined
  const restEnd = audioRest ? Date.parse(audioRest.endsAt) : undefined
  const restNow = Math.max(now, restStarted ?? now)
  const alertsActive = visible && state.writable && !workout?.finish && !finishing
  useRestTimerAudio(audio, {
    id: alertsActive ? restKey(audioRest) : null, ends: restEnd, now: restNow,
    remaining: restEnd === undefined ? 0 : Math.max(0, Math.ceil((restEnd - restNow) / 1000)),
    countdown: alerts.sound, middleEnabled: alerts.middle,
    userId: workout?.userId, workoutId: workout ? `${workout.dataGeneration}:${workout.sessionId}` : undefined,
  })
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const timer = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('pageshow', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [visible])
  useLayoutEffect(() => {
    if (!completedScroll || !visible) return
    const frame = requestAnimationFrame(() => {
      if (!working.current || !clock.current) return
      window.scrollTo({ top: window.scrollY + working.current.getBoundingClientRect().top - clock.current.getBoundingClientRect().height - 8,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [completedScroll, visible])
  if (!workout) return null
  const weights = flowWeights(state, history, definitions), cardio = flowCardio(state, now)
  const exercises = [...weights, ...cardio]
  const items = exercises.map(exercise => ({ id: exercise.id, name: 'plan' in exercise ? exercise.plan.name : exercise.name, cardio: 'plan' in exercise }))
  const id = workout.currentExerciseId, index = items.findIndex(e => e.id === id)
  const weight = weights.find(w => w.id === id), activity = cardio.find(c => c.id === id)
  const warmup = workout.warmupCompleted === false && weights.length > 0
  const rest = model.exerciseRest(workout, id)
  const remaining = rest && restKey(rest) !== endingRest ? model.restRemaining(workout, Math.max(now, Date.parse(rest.startedAt)), id) : 0
  const blocked = !state.writable || !!workout.finish
  const visual = restAlertVisual(alerts, alertsActive && weight && !warmup ? remaining : 0)
  const completeWeight = !!weight && isWeightDone(weight)
  const preparingWeight = !!weight && !completeWeight && !model.weightStarted(workout, id)
  const preparing = !warmup && (preparingWeight || activity?.phase === 'ready')
  const allWeights = weights.every(isWeightDone)
  const allDone = allWeights && cardio.every(c => c.phase === 'completed' || c.phase === 'skipped')
  const nextSet = weight?.sets.find(s => !s.result)
  const pending = items.slice(index + 1).concat(items.slice(0, index + 1)).find(item => {
    const w = weights.find(e => e.id === item.id), c = cardio.find(e => e.id === item.id)
    return w ? !isWeightDone(w) : c?.phase !== 'completed' && c?.phase !== 'skipped'
  })
  const act = async (transform: (w: LocalWorkout, now: number) => void, close = false) => {
    if (action.current || blocked) return false
    action.current = true
    try { const saved = await controller.complete(transform); if (saved && close) setModal(null); return saved }
    finally { action.current = false }
  }
  const endRest = () => {
    if (blocked) return
    const current = controller.getSnapshot().workout
    const rest = current ? model.exerciseRest(current, id) : undefined, key = restKey(rest)
    if (!rest || !key || manualRest.current === key) return
    manualRest.current = key
    if (key === restKey(audioRest)) stop()
    setEndingRest(key)
    // Serialize behind an in-flight extension instead of dropping the manual end.
    void controller.complete(w => { if (restKey(model.exerciseRest(w, id)) === key) delete model.migrateRest(w)[id] }).then(() => {
      manualRest.current = null
      setEndingRest(current => current === key ? null : current)
    })
  }
  const go = async (next: string) => {
    if (action.current || blocked) return false
    const scrollPosition = next === id ? null : { exerciseId: next, top: window.scrollY }
    if (scrollPosition) setExerciseScroll(scrollPosition)
    const saved = await act(w => { w.currentExerciseId = next })
    if (saved) {
      setModal(null)
      setEditing(false)
    } else if (scrollPosition) {
      setExerciseScroll(position => position === scrollPosition ? null : position)
    }
    return saved
  }
  const end = async () => {
    if (action.current || blocked) return
    action.current = true
    stop()
    setFinishing(true)
    try { if (await controller.finish(Date.now())) setModal(null) }
    finally { action.current = false; setFinishing(false) }
  }
  const undoSet = async (ordinal: number) => {
    if (action.current || blocked) return
    const key = rest?.ordinal === ordinal ? restKey(rest) : null
    if (key) {
      if (key === restKey(audioRest)) stop()
      setEndingRest(key)
    }
    try {
      await act(w => {
        const record = w.snapshot.performedSets.find(s => s.sessionExerciseId === id && s.ordinal === ordinal)
        if (record) model.undoSet(w, record.id)
      }, true)
    } finally {
      if (key) setEndingRest(current => current === key ? null : current)
    }
  }
  const requestEnd = () => { if (allDone) void end(); else setModal('end') }
  const completeExercise = async (transform: (w: LocalWorkout, now: number) => void) => {
    const saved = await act((w, at) => {
      if (w.currentExerciseId !== id) throw new Error('현재 종목을 다시 확인해 주세요.')
      transform(w, at)
      model.advanceAfterCompletion(w, id)
    })
    const next = controller.getSnapshot().workout
    if (saved && next && next.currentExerciseId !== id) {
      const destination = next.currentExerciseId
      if (next.snapshot.appliedPlan.weightExercises.some(e => e.sessionExerciseId === destination) && !model.weightStarted(next, destination)) {
        setMemoOpen(value => ({ ...value, [destination]: true }))
      }
      setEditing(false)
      window.scrollTo(0, 0)
    }
    return saved
  }
  const complete = (ordinal: number) => {
    if (!weight || preparingWeight || warmup || remaining > 0 || action.current || blocked) return
    void unlock()
    setCompletingSet(ordinal)
    void completeExercise((w, at) => {
      if (!model.weightStarted(w, id) || model.restRemaining(w, at, id) > 0) throw new Error('운동을 시작하고 휴식을 마친 뒤 완료해 주세요.')
      model.editDraft(w, id, ordinal, inputDraft(w, id, ordinal, history))
      model.completeSet(w, id, ordinal, at, createSetId, alerts.testMode)
    }).then(saved => { if (saved && controller.getSnapshot().workout?.currentExerciseId === id) setCompletedScroll(v => v + 1) })
      .finally(() => setCompletingSet(null))
  }
  const startExercise = () => {
    void unlock()
    void act((w, at) => model.startExercise(w, id, at)).then(saved => {
      if (saved && weight) setMemoOpen(value => ({ ...value, [id]: false }))
    })
  }
  const addSet = () => void act(w => {
    const plan = w.snapshot.appliedPlan.weightExercises.find(p => p.sessionExerciseId === id)!
    model.updateTargets(w, id, plan.setCount + 1, plan.minReps, plan.maxReps)
  })
  const finalActions = <>{allWeights && <Button onClick={() => setModal('cardio')}>+ 유산소 추가</Button>}
    {pending ? <><Button variant="primary" onClick={() => go(pending.id)}>다음 종목으로</Button>
      {allWeights && <Button variant="quiet" loading={finishing && modal !== 'end'} onClick={() => void end()}>남은 유산소 건너뛰고 종료</Button>}</>
      : <Button variant="primary" loading={finishing && modal !== 'end'} onClick={() => void end()}>운동 종료 및 요약</Button>}</>
  const candidate = progressAssessment?.evaluation?.exercises.find(e => e.sessionExerciseId === id)
  const advice = weight && completeWeight && weight.mode !== 'today' && candidate?.eligible && candidate.comparisonContext
    && decimalDraft(weight.working) === candidate.comparisonContext.approvedWeightKg ? candidate : null
  const changedCombination = workout.originalCombinationChanged === true || changedOriginalCombination(workout.initialPlan, workout.snapshot)
  const prior=weight&&!changedCombination?referenceIncrease({...workout,id:workout.sessionId},id,weight.approved,referenceRoutine,referenceRecords):null
  const direction=advice?.advice==='INCREASE'?'increase':advice?.advice==='DECREASE'?'decrease':prior?'increase':null
  const referenceKg=advice?.comparisonContext?.approvedWeightKg??prior?.kg
  const recommendation=weight&&!changedCombination&&direction&&!hiddenRecommendations.has(workout.sessionId+':'+id)?<WeightRecommendation provisional={!prior} source={advice?.advice==='INCREASE'||advice?.advice==='DECREASE'?'current':'benchmark'} direction={direction} kg={referenceKg} loadType={weight.loadType} onDismiss={()=>setHiddenRecommendations(ids=>new Set(ids).add(workout.sessionId+':'+id))}/>:null

  let actions: ReactNode
  if (blocked) actions = <Button onClick={() => void controller.retrySync()}>서버 저장 상태 다시 확인</Button>
  else if (warmup) actions = <Button variant="primary" data-click-action="warmup" onClick={() => {
    void unlock()
    void act(model.completeWarmup).then(saved => { if (saved) window.scrollTo(0, 0) })
  }}>준비운동 완료</Button>
  else if (weight && editing) actions = <Button className={styles.editClose} onClick={() => setEditing(false)}>편집 닫기</Button>
  else if (preparing) actions = <Button variant="primary" data-click-action={id + ':start'} onClick={startExercise}>운동 시작하기</Button>
  else if (weight && remaining > 0) actions = <RestActions remaining={remaining} flash={visual.bottom}
    onEnd={endRest}
    onExtend={() => { void act(w => { const current = model.exerciseRest(w, id); if (current) current.endsAt = new Date(Date.parse(current.endsAt) + 30000).toISOString() }) }} />
  else if (weight && nextSet) actions = <Button variant="primary" data-click-action={id + ':complete:' + nextSet.id} loading={completingSet === nextSet.id} onClick={() => complete(nextSet.id)}>{nextSet.id}세트 완료</Button>
  else if (weight) actions = finalActions
  else if (activity?.phase === 'review') actions = <Button variant="primary" onClick={() => void completeExercise((w, at) => model.completeCardio(w, id, at, createSetId)).then(saved => { if (saved && controller.getSnapshot().workout?.currentExerciseId === id) window.scrollTo(0, 0) })}>유산소 기록 확정</Button>
  else if (activity?.phase === 'completed' || activity?.phase === 'skipped') actions = finalActions
  else actions = <div className={styles.actions}>
    <Button onClick={() => void act(w => model.timerAction(w, id, activity?.phase === 'running' ? 'pause' : 'start', Date.now()))}>{activity?.phase === 'running' ? '일시정지' : '재개'}</Button>
    <Button variant="primary" onClick={() => void act((w, at) => model.reviewCardio(w, id, at, estimateCardio))}>유산소 완료</Button>
  </div>
  if(weight&&!warmup&&!editing&&!blocked&&recommendation)actions=<>{recommendation}{actions}</>
  const preparedFrom = preparing ? model.exercisePreparationStartedAt(workout, id) : undefined
  const performingWeight = !!weight && !warmup && !preparingWeight && !completeWeight
  const weightTimingLabel = workout.snapshot.weightTiming?.complete === false ? 'WEIGHT 수행 · 일부' : 'WEIGHT 수행'
  const timerHeading = preparing ? '종목 준비' : remaining > 0 ? '휴식 시간'
    : performingWeight ? weightTimingLabel : activity ? '유산소 시간' : '운동 상태'
  const timerLabel = warmup || preparing ? '준비 중' : allDone ? '모든 종목 완료' : activity?.phase === 'skipped' ? '건너뜀' : '완료'
  const timer = preparedFrom ? Math.max(0, now - Date.parse(preparedFrom)) : remaining > 0 ? remaining * 1000
    : performingWeight ? observedWeightMs(workout, now) : activity && !preparing && !allDone && activity.phase !== 'skipped' ? activity.activeMs : undefined
  const issue = state.issue ? <StatusNotice error>{state.issue}</StatusNotice> : null
  const syncNotice = state.syncStatus && ['WAITING', 'APPROVAL', 'CHECK', 'OTHER'].includes(state.syncStatus) ? SYNC_LABEL[state.syncStatus] : null
  const statusNote = state.issue || state.unsavedDrafts || state.syncIssue || syncNotice || Children.count(notices) > 0
    ? <aside className="muted small" role="status">{state.issue ? '최근 변경 미확정' : state.unsavedDrafts ? '입력 보존 확인 필요' : syncNotice}
      {state.syncIssue && <p>{state.syncIssue}</p>}{notices}{issue}</aside> : undefined
  const renderExercise = (at: number, preview = false) => {
    const exercise = exercises[at]
    if (!exercise) return null
    const weight = 'sets' in exercise ? exercise : undefined
    const activity = 'plan' in exercise ? exercise : undefined
    const navigation = <ExerciseNavigation previous={items[at - 1]} next={items[at + 1]} onList={() => setModal('list')} onGo={go} preview={preview} />
    const id = exercise.id
    const started = model.weightStarted(workout, id)
    const open = memoOpen[id] ?? !started
    return <>
      {allDone && <StatusNotice>모든 종목을 완료했습니다. 기록을 확인하고 운동을 종료할 수 있습니다.</StatusNotice>}
      {weight && <WeightFocus preview={preview} additionalInput weight={weight} position={at + 1} workingRef={preview ? undefined : working} manufacturers={manufacturers}
        description={exerciseDescription(definitions.find(d => d.id === weight.standardId) ?? { id: weight.standardId, name: weight.name, aliases: [] })}
        issue={preview ? null : issue} resting={!started || model.restRemaining(workout, now, id) > 0} editing={!preview && editing}
        memoOpen={open} onMemoToggle={() => setMemoOpen(value => ({ ...value, [id]: !open }))}
        memoContent={<CombinationMemo preview={preview} hiddenLabel exerciseId={weight.standardId} equipment={weight} initialText={weight.memo} />}
        progressNote={workout.replacementSlots?.[id] ? '대체 수행 ' + weight.sets.filter(s => s.result).length + '/' + weight.sets.length + '세트 · 원계획 슬롯 완료 인정은 서버 확인이 필요합니다.' : changedCombination ? '오늘만 조합 변경 · 공식 중량 검토 제외' : undefined}
        approvalNote={workout.approvalResults.some(r => r.sessionExerciseId === id && r.status === 'PENDING') ? '승인 확인 필요' : '승인 요청 상태 확인'}
        onDraft={(ordinal, draft) => {
          const current = controller.getSnapshot().workout
          if (!current) return
          const value = controller.getSnapshot().drafts[slotKey(id, ordinal)] ?? inputDraft(current, id, ordinal, history)
          controller.draft(id, ordinal, { ...value, ...(draft.reps !== undefined ? { reps: draft.reps } : {}),
            ...(draft.kg !== undefined ? { weight: draft.kg } : {}), ...(draft.additional !== undefined ? { additionalWeight: draft.additional } : {}) })
        }}
        onComplete={complete} onUndo={ordinal => setModal({ undo: ordinal })} onAddSet={addSet}
        onExcludeSet={ordinal => void act(w => {
          if (w.snapshot.performedSets.some(s => s.sessionExerciseId === id && s.ordinal === ordinal)) throw new Error('완료 기록을 먼저 취소해 주세요.')
          const plan = w.snapshot.appliedPlan.weightExercises.find(p => p.sessionExerciseId === id)!
          model.updateTargets(w, id, plan.setCount - 1, plan.minReps, plan.maxReps)
          w.excludedSetOrdinals = { ...w.excludedSetOrdinals, [id]: [...(w.excludedSetOrdinals?.[id] ?? []), ordinal] }
        })}
        onWeight={() => setModal('weight')} onEdit={() => setEditing(true)} onMemo={value => controller.memo(id, value)}
        onList={() => setModal('list')} onEnd={requestEnd}
        editTools={<><EquipmentEditor key={id} equipment={weight} manufacturers={manufacturers} onApply={value => act(w => model.changeEquipment(w, id, value))} />
          <Card><p className="muted small">변경은 이번 운동에만 적용됩니다. 완료 세트를 취소한 뒤 교체하거나 제외할 수 있습니다.</p>
            <Button onClick={() => setModal('add')}>+ 다음 종목 추가</Button><Button onClick={() => setModal('cardio')}>+ 유산소 추가</Button>
            <Button disabled={weight.sets.some(s => !!s.result)} onClick={() => setModal('replace')}>현재 종목 교체</Button>
            <Button variant="danger" disabled={weight.sets.some(s => !!s.result) || items.length < 2} onClick={() => setModal('remove')}>현재 종목 제외</Button>
          </Card></>} />}
      {activity && <CardioFocus preview={preview} cardio={activity} activeMs={activity.activeMs} estimate={estimateCardio} navigation={navigation} issue={preview ? null : issue} editing={!preview && editing}
        onEdit={() => setEditing(v => !v)} onUndo={() => setModal('undo-cardio')}
        onDraft={patch => controller.cardioDraft(id, patch)}
        onCancelReview={() => void act(w => { if (w.timers[id]) w.timers[id].reviewing = false })}
        editTools={<Card><p className="muted small">이번 운동에만 적용됩니다. 제외하려면 진행 중인 측정을 멈추고, 완료한 기록은 먼저 취소해 주세요.</p>
          <Button onClick={() => setModal('add')}>+ 종목 추가</Button><Button onClick={() => setModal('cardio')}>+ 유산소 추가</Button>
          <Button disabled={activity.phase === 'completed' || activity.phase === 'skipped'} onClick={() => setModal('edit-cardio')}>유산소 계획 편집</Button>
          <Button variant="danger" disabled={!!workout.snapshot.cardioResults.find(c => c.sessionActivityId === id) || activity.phase === 'running' || items.length < 2} onClick={() => setModal('remove')}>현재 종목 제외</Button></Card>} />}
    </>
  }
  return <>
    <WorkoutFrame hidden={!visible} routine={workout.initialPlan.routineName} deload={false} exerciseScroll={exerciseScroll}
      elapsed={Math.max(0, now - Date.parse(workout.startedAt))} position={warmup ? 0 : index + 1} count={items.length}
      flash={visual.top} dim={visual.dim && !editing && !blocked && !modal ? remaining : undefined}
      timerHeading={timerHeading} timerLabel={timerLabel} timer={timer} clockRef={clock}
      navigation={weight && !warmup ? { previous: items[index - 1], next: items[index + 1], onGo: go } : undefined}
      swipe={!warmup && index >= 0 ? { currentId: id, previous: items[index - 1], next: items[index + 1],
        renderPreview: next => renderExercise(exercises.findIndex(exercise => exercise.id === next), true),
        disabled: !visible || blocked || !!modal || editing, canMove: () => !action.current, onGo: go } : undefined}
      cardioFocus={!!activity && !warmup}
      onHome={onHome} backLabel={backLabel} onEnd={requestEnd} actions={actions} onRestInteraction={alertsActive && audioRest ? unlock : undefined}
      reviewNote={statusNote}>
      <fieldset disabled={blocked} className={styles.controls}>
        {warmup ? <Warmup next={weight ? { name: weight.name, target: `${weight.working || '중량 미지정'}kg · ${weight.min}–${weight.max}회 × ${weight.plannedCount ?? weight.sets.length}세트`,
          equipment: equipmentLabel(weight, manufacturers) } : { name: activity!.plan.name, target: '목표 ' + activity!.plan.targetSeconds + '초' }} /> : renderExercise(index)}
      </fieldset>
    </WorkoutFrame>
    {modal === 'list' && <ExerciseList saveIssue={issue} current={id} weights={weights.map(w => ({ id: w.id, name: w.name, status: `${w.sets.filter(s => s.result).length}/${w.plannedCount ?? w.sets.length}세트 완료` }))}
      cardio={cardio.map(c => ({ id: c.id, name: c.plan.name, status: c.phase === 'completed' ? '완료' : c.phase === 'skipped' ? '건너뜀' : '진행/준비' }))}
      onClose={() => setModal(null)} onSelect={go} onApply={order => void act(w => {
        const plan = w.snapshot.appliedPlan
        plan.weightExercises = order.weights.map(next => plan.weightExercises.find(e => e.sessionExerciseId === next)!)
        plan.cardioActivities = order.cardio.map(next => plan.cardioActivities.find(e => e.sessionActivityId === next)!)
      }, true)} />}
    {modal === 'weight' && weight && <WeightChange saveIssue={issue} weight={weight} progressionAllowed={workout.initialPlan.weightExercises.some(p => p.sessionExerciseId === id)}
      progressionNote="승인 요청을 서버에 저장하며, 적용 여부를 별도로 확인합니다." onClose={() => setModal(null)}
      onSave={(value, mode) => void act(w => model.changeWeight(w, id, value, mode === 'progression', Date.now()), true)} />}
    {(modal === 'add' || modal === 'replace') && <SessionExerciseSearch saveIssue={issue} replace={modal === 'replace'} exercises={definitions}
      onClose={() => setModal(null)} onSelect={exercise => void act(w => {
        const index = w.snapshot.appliedPlan.weightExercises.findIndex(e => e.sessionExerciseId === id)
        if (modal === 'replace') model.replaceWeight(w, id, exercise.id, exercise.name)
        else {
          model.addWeight(w, exercise.id, exercise.name)
          if (index >= 0) {
            const plan = w.snapshot.appliedPlan.weightExercises
            const addition = plan.pop()!
            plan.splice(index + 1, 0, addition)
          }
        }
      }, true)} />}
    {modal === 'cardio' && <SessionCardioPlan saveIssue={issue} activities={activities} index={cardio.length} onClose={() => setModal(null)} onSave={plan => void act(w => model.addCardio(w, plan), true)} />}
    {modal === 'edit-cardio' && activity && <SessionCardioPlan saveIssue={issue} activities={activities} index={index - weights.length} plan={activity.plan}
      canReplace={activity.phase === 'ready' && !workout.timers[id]?.startedAt} onClose={() => setModal(null)} onSave={plan => void act(w => {
        if (plan.standardExerciseId !== activity.plan.standardExerciseId || plan.activityId !== activity.plan.activityId) model.replaceCardio(w, id, plan, createSetId)
        else model.updateCardioPlan(w, id, plan, estimateCardio)
      }, true)} />}
    {modal === 'remove' && <ConfirmWorkoutAction saveIssue={issue} title="현재 종목 제외" message="완료 기록은 먼저 취소해야 합니다. 원래 계획은 보존됩니다." action="종목 제외"
      onClose={() => setModal(null)} onConfirm={() => void act(w => model.removeExercise(w, id), true)} />}
    {typeof modal === 'object' && modal && <ConfirmWorkoutAction saveIssue={issue} title="완료를 취소할까요?" message="완료 기록을 취소하고 입력값을 복원합니다." action="완료 취소 확인"
      onClose={() => setModal(null)} onConfirm={() => void undoSet(modal.undo)} />}
    {modal === 'undo-cardio' && <ConfirmWorkoutAction saveIssue={issue} title="유산소 완료 취소" message="완료 기록을 취소하고 일시정지 상태로 돌아갑니다." action="유산소 완료 취소 확인"
      onClose={() => setModal(null)} onConfirm={() => void act(w => {
        const record = w.snapshot.cardioResults.find(c => c.sessionActivityId === id)
        if (record) model.undoCardio(w, record.id)
        if (w.timers[id]) w.timers[id].reviewing = false
      }, true)} />}
    {modal === 'end' && <ConfirmWorkoutAction saveIssue={issue} title="운동을 종료할까요?" message="완료한 수행과 실제 종료 시각을 보존한 뒤 서버 종료 결과를 확인합니다. 미완료 수행은 자동 완료하지 않습니다."
      action="운동 종료 및 요약" loading={finishing} onClose={() => setModal(null)} onConfirm={() => void end()} />}
  </>
}
