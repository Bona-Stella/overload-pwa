import { CombinationMemo } from '../../../src/features/workout-online/CombinationMemo.tsx'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Card, StatusNotice } from '../../../src/components/ui.tsx'
import { cardioPlanLabel } from '../../../src/features/home/model.ts'
import { exerciseDescription } from '../../../src/features/workout-online/catalog-label.ts'
import { equipmentLabel } from '../../../src/features/workout-online/equipment.ts'
import type { Session, StandardExercise } from '../../../src/features/workout-online/types.ts'
import { WorkoutFrame, ExerciseNavigation, RestActions, Warmup, WeightRecommendation } from '../../../src/features/workout-flow/WorkoutFrame.tsx'
import type { ExerciseScrollPosition } from '../../../src/features/workout-flow/WorkoutFrame.tsx'
import { WeightFocus, EquipmentEditor } from '../../../src/features/workout-flow/WeightFocus.tsx'
import { ConfirmWorkoutAction, ExerciseList, SessionCardioPlan, SessionExerciseSearch, WeightChange } from '../../../src/features/workout-flow/WorkoutDialogs.tsx'
import { CardioFocus } from '../../../src/features/workout-flow/CardioFocus.tsx'
import { estimatedCardioDistance } from '../../../src/features/workout-online/cardio-measurement.ts'
import { cardioPhaseLabel } from '../../../src/features/workout-flow/types.ts'
import { restAlertVisual } from '../../../src/features/workout-flow/rest-alerts.ts'
import type { RestAlerts } from '../../../src/features/workout-flow/rest-alerts.ts'
import { useRestTimerAudio } from '../../../src/features/workout-flow/useRestAudio.ts'
import flow from '../../../src/features/workout-flow/WorkoutFlow.module.css'
import { activities, manufacturers, recoveryOriginal } from './routine-samples.ts'
import { exerciseEquipment, sessionActivities, sessionExercises } from './workout-samples.ts'
import { useReviewClock } from './useReviewClock.ts'
import type { useRestAudio } from './useRestAudio.ts'
import {
  addSet, cancelSet, cardioElapsed, changeWeight, doneCount, finishSet, makeCardio,
  newReviewWeight, nextPending, previousSets, recordCardio, restRemaining, reviewClock, reviewIncreaseReminder, sessionAdvice, weightDone,
} from './workout-model.ts'
import type { ReviewCardio, ReviewRecord, ReviewSession, ReviewWeight } from './workout-model.ts'

type Modal = 'weight' | 'list' | 'add' | 'replace' | 'cardio' | 'end' | 'remove' | 'undo-cardio' | { undo: number }

export function WorkoutReview({ session, onChange, onHome, onEnd, history, alerts, shortRest, audio, records = [], hiddenRecommendations, onDismissRecommendation, estimate = false }: {
  session: ReviewSession; onChange: (session: ReviewSession) => void; onHome: () => void
  estimate?: boolean
  onEnd: (endedAt: number) => void; history: Session[]; records?: ReviewRecord[]; hiddenRecommendations:ReadonlySet<string>; onDismissRecommendation:(key:string)=>void; alerts: RestAlerts; shortRest: boolean; audio: ReturnType<typeof useRestAudio>
}) {
  const [modal, setModal] = useState<Modal | null>(null)
  const [editing, setEditing] = useState(false)
  const [issue, setIssue] = useState('')
  const [now, setNow] = useReviewClock()
  const clockRef = useRef<HTMLDivElement>(null)
  const workingRef = useRef<HTMLElement>(null)
  const [completedScroll, setCompletedScroll] = useState(0)
  const [exerciseScroll, setExerciseScroll] = useState<ExerciseScrollPosition | null>(null)
  useLayoutEffect(() => {
    if (!completedScroll) return
    const frame = requestAnimationFrame(() => {
      if (!workingRef.current || !clockRef.current) return
      const headerHeight = clockRef.current.getBoundingClientRect().height
      const top = window.scrollY + workingRef.current.getBoundingClientRect().top - headerHeight - 8
      window.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [completedScroll])
  const issueRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (issue) issueRef.current?.scrollIntoView({ block: 'nearest' })
  }, [issue])

  const { weights, cardio, currentId, warmup } = session
  const exercises = [...weights, ...cardio]
  const items = exercises.map(exercise => ({ id: exercise.id, name: 'plan' in exercise ? exercise.plan.name : exercise.name, cardio: 'plan' in exercise }))
  const index = items.findIndex(item => item.id === currentId)
  const weight = weights.find(w => w.id === currentId)
  const activity = cardio.find(c => c.id === currentId)
  const remaining = warmup ? 0 : restRemaining(weight, now)
  const next = nextPending(session)
  const allDone = !next
  const weightsDone = weights.every(weightDone)
  const currentDone = !!weight && weightDone(weight)
  const nextSet = weight?.sets.find(s => !s.result)
  const rest = weight?.rest
  const restStarted = weight?.sets.find(set => set.id === rest?.slot)?.result?.at
  useRestTimerAudio(audio, {
    id: rest && weight ? `${weight.id}:${rest.slot}:${restStarted}` : null, ends: rest?.ends, remaining, now,
    countdown: alerts.sound, middleAt: alerts.middle ? rest?.middleAt : undefined,
  })
  const visual = restAlertVisual(alerts, remaining)

  const updateWeight = (updated: ReviewWeight) => onChange({
    ...session, weights: weights.map(w => w.id === updated.id ? updated : w),
    transition: session.transition?.exerciseId === updated.id && !weightDone(updated) ? undefined : session.transition,
  })
  const updateCardio = (updated: ReviewCardio) => onChange({ ...session, cardio: cardio.map(c => c.id === updated.id ? updated : c) })
  const close = () => setModal(null)
  const go = (id: string) => {
    if (id !== currentId) {
      setExerciseScroll({ exerciseId: id, top: window.scrollY })
      setEditing(false)
      setIssue('')
      onChange({ ...session, currentId: id })
    }
    close()
    return id !== currentId
  }
  const finish = () => onEnd(reviewClock())
  const requestEnd = () => allDone || session.deload ? finish() : setModal('end')
  const complete = (id: number) => {
    if (!weight) return
    const set = weight.sets.find(s => s.id === id)
    if (!set) return
    const at = reviewClock()
    if (restRemaining(weight, at)) return
    try {
      const updated = finishSet(session, weight, set, at, shortRest || alerts.testMode, alerts.middleAt)
      audio.unlock()
      onChange(updated); setNow(at); setIssue('')
      setCompletedScroll(value => value + 1)
    } catch (error) {
      setIssue((error instanceof Error ? error.message : '입력값을 확인해 주세요.') + ' 중량과 반복 횟수를 확인해 주세요.')
    }
  }
  const undoSet = (id: number) => {
    if (weight) updateWeight(cancelSet(weight, id))
    close()
  }
  const addExercise = (exercise: StandardExercise) => {
    const replace = modal === 'replace'
    if (replace && (!weight || doneCount(weight))) return
    const equipment = exerciseEquipment(exercise)
    const addition = newReviewWeight(exercise, previousSets(history, exercise.id, equipment), equipment)
    onChange({ ...session, currentId: addition.id,
      weights: replace ? weights.map(w => w.id === currentId ? addition : w) : [...weights, addition] })
    setIssue(''); close(); window.scrollTo(0, 0)
  }
  const remove = () => {
    if (items.length < 2 || weight && doneCount(weight) || activity && (activity.phase === 'running' || activity.result)) return
    const nextWeights = weights.filter(w => w.id !== currentId)
    const nextCardio = cardio.filter(c => c.id !== currentId)
    const fallback = items[index - 1] ?? items[index + 1]
    onChange({ ...session, weights: nextWeights, cardio: nextCardio, currentId: fallback.id })
    setEditing(false); setIssue(''); close(); window.scrollTo(0, 0)
  }
  const addActivity = (plan: ReviewCardio['plan']) => {
    const added = makeCardio(plan)
    onChange({ ...session, cardio: [...cardio, added] })
    close()
  }
  const cardioPhase = (phase: 'running' | 'paused' | 'review') => {
    if (!activity) return
    const at = reviewClock()
    if (phase === 'running' && cardio.some(c => c.id !== activity.id && c.phase === 'running')) {
      setIssue('측정 중인 다른 유산소를 먼저 일시정지하거나 완료해 주세요.')
      return
    }
    const accumulated = cardioElapsed(activity, at)
    const activeMs = activity.draft.correctedSeconds === null ? accumulated : Number(activity.draft.correctedSeconds) * 1000
    const patch = phase === 'review' ? estimatedCardioDistance(activity.draft, activity.plan.targetDistanceKm, activeMs, estimate) : {}
    updateCardio({ ...activity, phase, accumulated, runningSince: phase === 'running' ? at : null, draft: { ...activity.draft, ...patch } })
    setIssue(''); setNow(at)
  }
  const completeCardio = () => {
    if (!activity || activity.phase !== 'review') return
    try {
      updateCardio({ ...activity, phase: 'completed', result: recordCardio(activity) })
      setIssue(''); window.scrollTo(0, 0)
    } catch (error) { setIssue(error instanceof Error ? error.message : '실제 활동 값을 확인해 주세요.') }
  }

  const issueView = issue ? <div ref={issueRef}><StatusNotice error>{issue}</StatusNotice></div> : null
  const finalActions = <>
    {weightsDone && <Button onClick={() => setModal('cardio')}>+ 유산소 추가</Button>}
    {next ? <><Button variant="primary" onClick={() => go(next)}>다음 종목으로</Button>
      {weightsDone && <Button variant="quiet" onClick={finish}>남은 유산소 건너뛰고 종료</Button>}</>
      : <Button variant="primary" onClick={finish}>운동 종료 및 요약</Button>}
  </>
  const advice = weight && currentDone ? sessionAdvice(session, weight) : undefined
  const prior = weight ? reviewIncreaseReminder(session, weight, records) : null
  const direction = advice?.advice === 'increase' || advice?.advice === 'decrease' ? advice.advice : prior ? 'increase' : null
  const notice = weight && direction && !hiddenRecommendations.has(session.id+':'+weight.id) ? <WeightRecommendation direction={direction} kg={advice?.kg ?? prior?.kg} loadType={weight.loadType} source={advice?.advice==='increase'||advice?.advice==='decrease'?'current':'benchmark'} onDismiss={() => onDismissRecommendation(session.id+':'+weight.id)}/> : null
  let actions: ReactNode
  if (warmup) {
    actions = <Button variant="primary" onClick={() => { onChange({ ...session, warmup: false }); window.scrollTo(0, 0) }}>준비운동 완료</Button>
  } else if (weight && editing) {
    actions = <Button className={flow.editClose} onClick={() => setEditing(false)}>편집 닫기</Button>
  } else if (weight && remaining > 0) {
    actions = <RestActions remaining={remaining} flash={visual.bottom}
      onEnd={() => {
        const at = reviewClock()
        audio.stop()
        updateWeight({ ...weight, rest: undefined })
        setNow(at)
      }}
      onExtend={() => {
        if (weight.rest && weight.rest.ends > reviewClock()) updateWeight({ ...weight, rest: { ...weight.rest, ends: weight.rest.ends + 30000 } })
      }} />
  } else if (weight && nextSet) {
    actions = <Button variant="primary" onClick={() => complete(nextSet.id)}>{nextSet.id}세트 완료</Button>
  } else if (weight) {
    actions = <>
      {weightsDone ? finalActions : <Button variant="primary" onClick={() => next && go(next)}>다음 종목으로</Button>}</>
  } else if (activity?.phase === 'ready') {
    actions = <Button variant="primary" onClick={() => cardioPhase('running')}>유산소 시작</Button>
  } else if (activity?.phase === 'review') {
    actions = <Button variant="primary" onClick={completeCardio}>유산소 기록 확정</Button>
  } else if (activity?.phase === 'completed') {
    actions = finalActions
  } else {
    const running = activity?.phase === 'running'
    actions = <div className={flow.actions}>
      <Button onClick={() => cardioPhase(running ? 'paused' : 'running')}>{running ? '일시정지' : '재개'}</Button>
      <Button variant="primary" onClick={() => cardioPhase('review')}>유산소 완료</Button>
    </div>
  }
  const transition = !allDone && !warmup && !remaining && weight ? session.transition : undefined
  const timerHeading = activity ? '유산소 시간' : remaining ? '남은 휴식' : transition ? '이전 종목 완료' : '휴식 시간'
  const timerLabel = activity ? cardioPhaseLabel[activity.phase] : warmup ? '준비 중' : allDone ? '모든 종목 완료'
    : transition ? '완료' : '휴식 없음'
  const timer = activity ? activity.result?.activeMs ?? cardioElapsed(activity, now)
    : remaining ? remaining * 1000 : undefined

  if (weight && !warmup && !editing && notice) actions = <>{notice}{actions}</>
  const renderExercise = (at: number, preview = false) => {
    const exercise = exercises[at]
    if (!exercise) return null
    const weight = 'sets' in exercise ? exercise : undefined
    const activity = 'plan' in exercise ? exercise : undefined
    const navigation = <ExerciseNavigation previous={items[at - 1]} next={items[at + 1]} onList={() => setModal('list')} onGo={go} preview={preview} />
    const source = session.initialPlan.weightExercises.find(p => p.sessionExerciseId === exercise.id)
    const original = weight && session.deload ? recoveryOriginal.weightPlacements.find(p => p.id === source?.sourcePlacementId) : undefined
    return <>
      {allDone && <StatusNotice>모든 종목을 완료했습니다. 기록을 확인하고 운동을 종료할 수 있습니다.</StatusNotice>}
      {weight && <WeightFocus preview={preview} weight={weight} position={at + 1}
        memoContent={<CombinationMemo preview={preview} exerciseId={weight.standardId} equipment={weight} initialText={weight.memo} />} workingRef={preview ? undefined : workingRef} onAddSet={() => updateWeight(addSet(weight))}
        description={exerciseDescription(sessionExercises.find(e => e.id === weight.standardId) ?? { id: weight.standardId, name: weight.name, aliases: [] })}
        manufacturers={manufacturers} progressNote={original ? `디로딩 목표 ${source?.approvedWeightKg}kg · 원본 목표 ${original.approvedWeightKg}kg × ${original.setCount}세트` : undefined}
        issue={preview ? null : issueView} resting={restRemaining(weight, now) > 0} editing={!preview && editing}
        onList={() => setModal('list')} onEnd={requestEnd}
        onWeight={() => setModal('weight')} onEdit={() => setEditing(value => !value)} onComplete={complete} onUndo={undo => setModal({ undo })}
        onDraft={(id, draft) => { updateWeight({ ...weight, sets: weight.sets.map(s => s.id === id && !s.result ? { ...s, draft: { ...s.draft, ...draft } } : s) }); setIssue('') }}
        onExcludeSet={id => updateWeight({ ...weight, sets: weight.sets.filter(s => s.id !== id) })}
        onMemo={memo => updateWeight({ ...weight, memo })}
        editTools={<>
          <EquipmentEditor key={weight.id} equipment={weight} manufacturers={manufacturers} onApply={equipment => updateWeight({ ...weight, ...equipment })} />
          <Card>
            <p className="muted small">변경은 이번 운동에만 적용됩니다. 교체하거나 제외하려면 완료 세트를 먼저 취소해 주세요.</p>
            <Button onClick={() => setModal('add')}>+ 다음 종목 추가</Button>
            <Button onClick={() => setModal('cardio')}>+ 유산소 추가</Button>
            <Button disabled={doneCount(weight) > 0} onClick={() => setModal('replace')}>현재 종목 교체</Button>
            <Button variant="danger" disabled={doneCount(weight) > 0 || items.length < 2} onClick={() => setModal('remove')}>현재 종목 제외</Button>
          </Card>
        </>} />}
      {activity && <CardioFocus preview={preview} estimate={estimate} cardio={activity} activeMs={cardioElapsed(activity, now)}
        navigation={navigation} issue={preview ? null : issueView} editing={!preview && editing} onEdit={() => setEditing(value => !value)}
        onDraft={draft => { updateCardio({ ...activity, draft: { ...activity.draft, ...draft } }); setIssue('') }}
        editTools={<Card>
          <p className="muted small">이번 운동에만 적용됩니다. 제외하려면 진행 중인 측정을 멈추고, 완료한 기록은 먼저 취소해 주세요.</p>
          <Button onClick={() => setModal('add')}>+ 종목 추가</Button>
          <Button onClick={() => setModal('cardio')}>+ 유산소 추가</Button>
          <Button variant="danger" disabled={!!activity.result || activity.phase === 'running' || items.length < 2} onClick={() => setModal('remove')}>현재 종목 제외</Button>
        </Card>} onCancelReview={() => cardioPhase('paused')} onUndo={() => setModal('undo-cardio')} />}
      {!preview && activity && activity.phase !== 'review' && issueView}
    </>
  }
  return <>
    <WorkoutFrame routine={session.initialPlan.routineName} deload={session.deload} exerciseScroll={exerciseScroll}
      clockRef={clockRef}
      navigation={weight && !warmup ? { previous: items[index - 1], next: items[index + 1], onGo: go } : undefined}
      swipe={!warmup && index >= 0 ? { currentId, previous: items[index - 1], next: items[index + 1],
        renderPreview: next => renderExercise(exercises.findIndex(exercise => exercise.id === next), true),
        disabled: !!modal || editing || visual.dim, onGo: go } : undefined}
      cardioFocus={!!activity && !warmup}
      reviewNote={<aside className="muted small" aria-label="검토용 세션">UI 검토 · 합성 데이터{shortRest ? ' · 휴식 12초 시연' : ''}</aside>}
      elapsed={Math.max(0, now - session.startedAt)} position={warmup ? 0 : index + 1} count={items.length}
      timerHeading={timerHeading} timerLabel={timerLabel} timer={timer}
      flash={visual.top} dim={visual.dim && !editing && !modal ? remaining : undefined} actions={actions} onHome={onHome} onEnd={requestEnd}>
      {warmup ? <Warmup next={weight ? { name: weight.name,
        target: `${weight.working || '중량 미지정'}${weight.working ? 'kg' : ''} · ${weight.min}–${weight.max}회 × ${weight.sets.length}세트`,
        equipment: equipmentLabel(weight, manufacturers) }
        : { name: activity!.plan.name, target: '목표 ' + cardioPlanLabel(activity!.plan) }} /> : renderExercise(index)}
    </WorkoutFrame>
    {modal === 'weight' && weight && <WeightChange weight={weight} progressionAllowed={!session.deload && weight.approved !== null}
      onSave={(value, mode) => {
        const historyAtWeight = previousSets(history, weight.standardId, weight, value)
        updateWeight(changeWeight(weight, value, mode, historyAtWeight)); setIssue(''); close()
      }} onClose={close} />}
    {modal === 'list' && <ExerciseList
      weights={weights.map(w => ({ ...w, status: `${doneCount(w)}/${w.sets.length}세트 완료` }))}
      cardio={cardio.map(c => ({ id: c.id, name: c.plan.name, status: c.phase === 'completed' ? '완료' : '미완료' }))}
      current={currentId} onClose={close} onSelect={go} onApply={order => {
        onChange({ ...session,
          weights: order.weights.map(id => weights.find(w => w.id === id)!),
          cardio: order.cardio.map(id => cardio.find(c => c.id === id)!),
        })
        close()
      }} />}
    {(modal === 'add' || modal === 'replace') && <SessionExerciseSearch replace={modal === 'replace'} exercises={sessionExercises} onSelect={addExercise} onClose={close} />}
    {modal === 'cardio' && <SessionCardioPlan activities={[...activities, ...sessionActivities]} index={cardio.length} onSave={addActivity} onClose={close} />}
    {modal && typeof modal === 'object' && <ConfirmWorkoutAction title="세트 완료를 취소할까요?" action="완료 취소 확인"
      message="이 세트가 미완료 상태로 돌아갑니다. 입력을 수정한 뒤 다시 완료할 수 있습니다." onClose={close} onConfirm={() => undoSet(modal.undo)} />}
    {modal === 'remove' && <ConfirmWorkoutAction title="현재 종목을 제외할까요?" action="종목 제외"
      message="이번 운동의 적용 계획에서 제외합니다. 원래 루틴과 시작 당시 계획은 유지됩니다." onClose={close} onConfirm={remove} />}
    {modal === 'end' && <ConfirmWorkoutAction title="운동을 종료할까요?" action="운동 종료 및 요약"
      message="미완료 종목이 있습니다. 지금까지 완료한 수행만 요약에 표시됩니다." onClose={close} onConfirm={finish} />}
    {modal === 'undo-cardio' && activity && <ConfirmWorkoutAction title="유산소 완료를 취소할까요?" action="유산소 완료 취소 확인"
      message="활동 시간과 입력값을 유지한 채 일시정지 상태로 돌아갑니다." onClose={close}
      onConfirm={() => { updateCardio({ ...activity, phase: 'paused', result: undefined }); close() }} />}
  </>
}
