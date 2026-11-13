import { Children, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Card, StatusNotice } from '../../components/ui.tsx'
import { WorkoutFrame, Warmup, RestActions, ExerciseNavigation, WeightRecommendation } from '../workout-flow/WorkoutFrame.tsx'
import { WeightFocus, EquipmentEditor } from '../workout-flow/WeightFocus.tsx'
import { CardioFocus } from '../workout-flow/CardioFocus.tsx'
import { ExerciseList, WeightChange, ConfirmWorkoutAction, SessionExerciseSearch, AddCardio } from '../workout-flow/WorkoutDialogs.tsx'
import { exerciseDescription } from '../workout-online/catalog-label.ts'
import { equipmentLabel } from '../workout-online/equipment.ts'
import type { CardioActivity, Manufacturer, ProgressAssessment, Session, StandardExercise } from '../workout-online/types.ts'
import { decimalDraft } from '../workout-online/validation.ts'
import type { EditorState, LocalWorkoutController } from './controller.ts'
import type { LocalWorkout } from './types.ts'
import { slotKey } from './types.ts'
import * as model from './model.ts'
import { flowCardio, flowWeights, inputDraft, isWeightDone } from './flow-data.ts'
import { SYNC_LABEL } from './sync.ts'
import { useRestAudio } from '../workout-flow/useRestAudio.ts'
import styles from '../workout-flow/WorkoutFlow.module.css'

type Modal = 'list' | 'weight' | 'end' | 'add' | 'replace' | 'cardio' | 'remove' | 'undo-cardio' | { undo: number }
const restKey = (rest: LocalWorkout['rest'] | undefined) => rest ? [rest.sessionExerciseId, rest.ordinal, rest.startedAt].join(':') : null
export function LocalWorkoutView({ state, controller, definitions, manufacturers = [], activities = [], history = [], visible = true, onHome = () => {}, notices, progressAssessment }: {
  state: EditorState; controller: LocalWorkoutController; definitions: StandardExercise[]; manufacturers?: Manufacturer[]
  activities?: CardioActivity[]; history?: Session[]; visible?: boolean; onHome?: () => void; notices?: ReactNode
  progressAssessment?: ProgressAssessment
}) {
  const [now, setNow] = useState(Date.now), [modal, setModal] = useState<Modal | null>(null), [editing, setEditing] = useState(false)
  const [completedScroll, setCompletedScroll] = useState(0)
  const [endingRest, setEndingRest] = useState<string | null>(null)
  const manualRest = useRef<string | null>(null)
  const action = useRef(false), clock = useRef<HTMLDivElement>(null), working = useRef<HTMLElement>(null)
  const { play, silence, unlock } = useRestAudio(true)
  const currentRest = restKey(state.workout?.rest)
  const restEnd = state.workout?.rest?.endsAt
  const restRemaining = state.workout && currentRest !== endingRest ? model.restRemaining(state.workout, now) : 0
  useEffect(() => {
    if (visible && restEnd && currentRest !== manualRest.current) play(Date.parse(restEnd), restRemaining)
  }, [visible, currentRest, restEnd, restRemaining, play])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(timer) }, [])
  useLayoutEffect(() => {
    if (!completedScroll || !visible) return
    const frame = requestAnimationFrame(() => {
      if (!working.current || !clock.current) return
      window.scrollTo({ top: window.scrollY + working.current.getBoundingClientRect().top - clock.current.getBoundingClientRect().height - 8,
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [completedScroll, visible])
  const workout = state.workout
  if (!workout) return null
  const weights = flowWeights(state, history, definitions), cardio = flowCardio(state, now)
  const items = [...weights, ...cardio.map(c => ({ id: c.id, name: c.plan.name }))]
  const id = workout.currentExerciseId, index = items.findIndex(e => e.id === id)
  const weight = weights.find(w => w.id === id), activity = cardio.find(c => c.id === id)
  const warmup = workout.warmupCompleted === false && weights.length > 0
  const remaining = restRemaining
  const blocked = !state.writable || !!workout.finish
  const completeWeight = !!weight && isWeightDone(weight)
  const allWeights = weights.every(isWeightDone)
  const allDone = allWeights && cardio.every(c => c.phase === 'completed' || c.phase === 'skipped')
  const nextSet = weight?.sets.find(s => !s.result)
  const pending = items.slice(index + 1).concat(items.slice(0, index + 1)).find(item => {
    const w = weights.find(e => e.id === item.id), c = cardio.find(e => e.id === item.id)
    return w ? !isWeightDone(w) : c?.phase !== 'completed' && c?.phase !== 'skipped'
  })
  const act = async (transform: (w: LocalWorkout) => void, close = false) => {
    if (action.current || blocked) return false
    action.current = true
    try { const saved = await controller.complete(transform); if (saved && close) setModal(null); return saved }
    finally { action.current = false }
  }
  const endRest = () => {
    if (blocked) return
    const rest = controller.getSnapshot().workout?.rest, key = restKey(rest)
    if (!rest || !key || manualRest.current === key) return
    manualRest.current = key
    silence(Date.parse(rest.endsAt))
    setEndingRest(key)
    // Serialize behind an in-flight extension instead of dropping the manual end.
    void controller.complete(w => { if (restKey(w.rest) === key) w.rest = null }).then(saved => {
      if (!saved) { manualRest.current = null; setEndingRest(null) }
    })
  }
  const go = (next: string) => { void act(w => { w.currentExerciseId = next }).then(saved => { if (saved) { setModal(null); setEditing(false); window.scrollTo(0, 0) } }) }
  const end = async () => {
    if (action.current || blocked) return
    action.current = true
    try { if (await controller.finish(Date.now())) setModal(null) } finally { action.current = false }
  }
  const requestEnd = () => { if (allDone) void end(); else setModal('end') }
  const complete = (ordinal: number) => {
    if (!weight || remaining > 0) return
    unlock()
    void act(w => {
      if (w.snapshot.performedSets.some(s => s.sessionExerciseId === id && s.ordinal === ordinal)) return
      model.editDraft(w, id, ordinal, inputDraft(w, id, ordinal, history))
      model.completeSet(w, id, ordinal, Date.now())
    }).then(saved => { if (saved) setCompletedScroll(v => v + 1) })
  }
  const addSet = () => void act(w => {
    const plan = w.snapshot.appliedPlan.weightExercises.find(p => p.sessionExerciseId === id)!
    model.updateTargets(w, id, plan.setCount + 1, plan.minReps, plan.maxReps)
  })
  const navigation = <ExerciseNavigation previous={items[index - 1]} next={items[index + 1]} onList={() => setModal('list')} onGo={go} />
  const finalActions = <>{allWeights && <Button onClick={() => setModal('cardio')}>+ 유산소 추가</Button>}
    {pending ? <><Button variant="primary" onClick={() => go(pending.id)}>다음 종목으로</Button>
      {allWeights && <Button variant="quiet" onClick={() => void end()}>남은 유산소 건너뛰고 종료</Button>}</>
      : <Button variant="primary" onClick={() => void end()}>운동 종료 및 요약</Button>}</>
  const candidate = progressAssessment?.evaluation?.exercises.find(e => e.sessionExerciseId === id)
  const advice = weight && completeWeight && weight.mode !== 'today' && candidate?.eligible && candidate.comparisonContext
    && decimalDraft(weight.working) === candidate.comparisonContext.approvedWeightKg ? candidate : null
  const recommendation = advice && (advice.advice === 'INCREASE' || advice.advice === 'DECREASE')
    ? <WeightRecommendation provisional direction={advice.advice === 'INCREASE' ? 'increase' : 'decrease'} kg={advice.comparisonContext!.approvedWeightKg} /> : null
  let actions: ReactNode
  if (blocked) actions = <Button onClick={() => void controller.retrySync()}>서버 저장 상태 다시 확인</Button>
  else if (warmup) actions = <Button variant="primary" onClick={() => void act(w => { w.warmupCompleted = true }).then(saved => { if (saved) window.scrollTo(0, 0) })}>준비운동 완료</Button>
  else if (weight && editing) actions = <Button variant="primary" onClick={() => setEditing(false)}>편집 닫기</Button>
  else if (weight && remaining > 0) actions = <RestActions remaining={remaining}
    onEnd={endRest}
    onExtend={() => void act(w => { if (w.rest) w.rest.endsAt = new Date(Date.parse(w.rest.endsAt) + 30000).toISOString() })} />
  else if (weight && nextSet) actions = <Button variant="primary" onClick={() => complete(nextSet.id)}>{nextSet.id}세트 완료</Button>
  else if (weight) actions = <>{recommendation}{finalActions}</>
  else if (activity?.phase === 'ready') actions = <Button variant="primary" onClick={() => void act(w => model.timerAction(w, id, 'start', Date.now()))}>유산소 시작</Button>
  else if (activity?.phase === 'review') actions = <Button variant="primary" onClick={() => void act(w => model.completeCardio(w, id, Date.now())).then(saved => { if (saved) window.scrollTo(0, 0) })}>유산소 기록 확정</Button>
  else if (activity?.phase === 'completed' || activity?.phase === 'skipped') actions = finalActions
  else actions = <div className={styles.actions}>
    <Button onClick={() => void act(w => model.timerAction(w, id, activity?.phase === 'running' ? 'pause' : 'start', Date.now()))}>{activity?.phase === 'running' ? '일시정지' : '재개'}</Button>
    <Button variant="primary" onClick={() => void act(w => model.reviewCardio(w, id, Date.now()))}>유산소 완료</Button>
  </div>
  const lastCompleted = Math.max(0, ...workout.snapshot.performedSets.map(s => Date.parse(s.completedAt)))
  const timerHeading = activity ? '유산소 시간' : remaining ? '남은 휴식' : completeWeight && !allDone ? '이전 종목 완료' : '휴식 시간'
  const timerLabel = activity ? activity.phase === 'ready' ? '준비 중' : activity.phase === 'skipped' ? '건너뜀' : '완료'
    : warmup ? '준비 중' : allDone ? '모든 종목 완료' : completeWeight ? '완료' : '휴식 없음'
  const timer = activity ? activity.activeMs : remaining ? remaining * 1000 : completeWeight && !allDone && lastCompleted ? now - lastCompleted : undefined
  const issue = state.issue ? <StatusNotice error>{state.issue}</StatusNotice> : null
  const syncNotice = state.syncStatus && ['WAITING', 'APPROVAL', 'CHECK', 'OTHER'].includes(state.syncStatus) ? SYNC_LABEL[state.syncStatus] : null
  const statusNote = state.issue || state.unsavedDrafts || state.syncIssue || syncNotice || Children.count(notices) > 0
    ? <aside className="muted small" role="status">{state.issue ? '최근 변경 미확정' : state.unsavedDrafts ? '입력 보존 확인 필요' : syncNotice}
      {state.syncIssue && <p>{state.syncIssue}</p>}{notices}{issue}</aside> : undefined
  return <>
    <WorkoutFrame hidden={!visible} routine={workout.initialPlan.routineName} deload={false}
      elapsed={Math.max(0, now - Date.parse(workout.startedAt))} position={warmup ? 0 : index + 1} count={items.length}
      flash={remaining > 0 && remaining <= 5}
      timerHeading={timerHeading} timerLabel={timerLabel} timer={timer} clockRef={clock}
      navigation={weight && !warmup ? { previous: items[index - 1], next: items[index + 1], onGo: go } : undefined}
      onHome={onHome} onEnd={requestEnd} actions={actions}
      reviewNote={statusNote}>
      <fieldset disabled={blocked} className={styles.controls}>
        {warmup ? <Warmup next={weight ? { name: weight.name, target: `${weight.working || '중량 미지정'}kg · ${weight.min}–${weight.max}회 × ${weight.plannedCount ?? weight.sets.length}세트`,
          equipment: equipmentLabel(weight, manufacturers) } : { name: activity!.plan.name, target: '목표 ' + activity!.plan.targetSeconds + '초' }} /> : <>
          {allDone && <StatusNotice>모든 종목을 완료했습니다. 기록을 확인하고 운동을 종료할 수 있습니다.</StatusNotice>}
          {weight && <WeightFocus additionalInput weight={weight} position={index + 1} workingRef={working} manufacturers={manufacturers}
            description={exerciseDescription(definitions.find(d => d.id === weight.standardId) ?? { id: weight.standardId, name: weight.name, aliases: [] })}
            issue={issue} resting={remaining > 0} editing={editing}
            memoNote={state.memos?.[id] !== undefined ? '메모 입력 보존 중 · 이 기기에만 보관됩니다.' : '메모는 이 기기에만 보관됩니다.'}
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
          {activity && <CardioFocus cardio={activity} activeMs={activity.activeMs} navigation={navigation} issue={issue} editing={editing}
            weightProgress={`웨이트 ${weights.reduce((n, w) => n + w.sets.filter(s => s.result).length, 0)}/${weights.reduce((n, w) => n + (w.plannedCount ?? w.sets.length), 0)}세트`}
            cardioProgress={`유산소 완료 ${cardio.filter(c => c.phase === 'completed' || c.phase === 'skipped').length}/${cardio.length}종목`}
            onEdit={() => setEditing(v => !v)} onUndo={() => setModal('undo-cardio')}
            onDraft={patch => controller.cardioDraft(id, patch)}
            onCancelReview={() => void act(w => { if (w.timers[id]) w.timers[id].reviewing = false })}
            editTools={<Card><p className="muted small">이번 운동에만 적용됩니다. 제외하려면 진행 중인 측정을 멈추고, 완료한 기록은 먼저 취소해 주세요.</p>
              <Button onClick={() => setModal('add')}>+ 종목 추가</Button><Button onClick={() => setModal('cardio')}>+ 유산소 추가</Button>
              <Button variant="danger" disabled={!!workout.snapshot.cardioResults.find(c => c.sessionActivityId === id) || activity.phase === 'running' || items.length < 2} onClick={() => setModal('remove')}>현재 종목 제외</Button></Card>} />}
        </>}
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
        model.addWeight(w, exercise.id, exercise.name)
        if (modal === 'replace') {
          const added = w.currentExerciseId
          model.removeExercise(w, id)
          const plan = w.snapshot.appliedPlan.weightExercises
          const addition = plan.splice(plan.findIndex(e => e.sessionExerciseId === added), 1)[0]
          plan.splice(index, 0, addition); w.currentExerciseId = added
        } else if (index >= 0) {
          const plan = w.snapshot.appliedPlan.weightExercises
          const addition = plan.pop()!
          plan.splice(index + 1, 0, addition)
        }
      }, true)} />}
    {modal === 'cardio' && <AddCardio saveIssue={issue} activities={activities} onClose={() => setModal(null)} onSave={plan => void act(w => model.addCardio(w, plan), true)} />}
    {modal === 'remove' && <ConfirmWorkoutAction saveIssue={issue} title="현재 종목 제외" message="완료 기록은 먼저 취소해야 합니다. 원래 계획은 보존됩니다." action="종목 제외"
      onClose={() => setModal(null)} onConfirm={() => void act(w => model.removeExercise(w, id), true)} />}
    {typeof modal === 'object' && modal && <ConfirmWorkoutAction saveIssue={issue} title="완료를 취소할까요?" message="완료 기록을 취소하고 입력값을 복원합니다." action="완료 취소 확인"
      onClose={() => setModal(null)} onConfirm={() => void act(w => {
        const record = w.snapshot.performedSets.find(s => s.sessionExerciseId === id && s.ordinal === modal.undo)
        if (record) model.undoSet(w, record.id)
      }, true)} />}
    {modal === 'undo-cardio' && <ConfirmWorkoutAction saveIssue={issue} title="유산소 완료 취소" message="완료 기록을 취소하고 일시정지 상태로 돌아갑니다." action="유산소 완료 취소 확인"
      onClose={() => setModal(null)} onConfirm={() => void act(w => {
        const record = w.snapshot.cardioResults.find(c => c.sessionActivityId === id)
        if (record) model.undoCardio(w, record.id)
        if (w.timers[id]) w.timers[id].reviewing = false
      }, true)} />}
    {modal === 'end' && <ConfirmWorkoutAction saveIssue={issue} title="운동을 종료할까요?" message="완료한 수행과 실제 종료 시각을 보존한 뒤 서버 종료 결과를 확인합니다. 미완료 수행은 자동 완료하지 않습니다."
      action="운동 종료 및 요약" onClose={() => setModal(null)} onConfirm={() => void end()} />}
  </>
}
