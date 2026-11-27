import { referenceIncrease } from '../workout-online/reference-reminder.ts'
import type { ReferenceRecord } from '../workout-online/reference-reminder.ts'
import type { Routine } from '../workout-online/types.ts'
import { CombinationMemo } from '../workout-online/CombinationMemo.tsx'
import { changedOriginalCombination } from '../workout-online/approval-weight.ts'
import { localStoreErrorMessage } from '../workout-online/storage.ts'
import { Children, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { Button, Card, StatusNotice } from '../../components/ui.tsx'
import { Dialog } from '../../components/Dialog.tsx'
import { ActionDialog } from '../../components/common-ui/ActionDialog.tsx'
import { draftSaveFailure } from '../../components/common-ui/message-copy.ts'
import { createRepeatPointerGuard } from '../../components/repeatPointerGuard.ts'
import { WorkoutFrame, Warmup, RestActions, ExerciseNavigation, WeightRecommendation } from '../workout-flow/WorkoutFrame.tsx'
import type { ExerciseScrollPosition } from '../workout-flow/WorkoutFrame.tsx'
import { WeightFocus, EquipmentEditor } from '../workout-flow/WeightFocus.tsx'
import { Toast } from '../../components/common-ui/Toast.tsx'
import { useSuccessToast } from '../../components/common-ui/useSuccessToast.ts'
import { CardioFocus } from '../workout-flow/CardioFocus.tsx'
import { formatDuration } from '../workout/model.ts'
import { ExerciseList, WeightChange, ConfirmWorkoutAction, SessionExerciseSearch, SessionCardioPlan } from '../workout-flow/WorkoutDialogs.tsx'
import { exerciseDescription } from '../workout-online/catalog-label.ts'
import { equipmentLabel } from '../workout-online/equipment.ts'
import type { CardioActivity, Manufacturer, ProgressAssessment, Session, StandardExercise } from '../workout-online/types.ts'
import { decimalDraft } from '../workout-online/validation.ts'
import type { EditorState, LocalWorkoutController } from './controller.ts'
import type { LocalWorkout } from './types.ts'
import { slotKey } from './types.ts'
import * as model from './model.ts'
import { flowCardio, flowWeights, inputDraft, isWeightDone, previousCardioResult } from './flow-data.ts'
import { observedWeightMs } from './weight-timing.ts'
import { workoutSaveStatus } from './save-status.ts'
import { WorkoutActionError } from './action-error.ts'
import type { WorkoutActionFailure } from './action-error.ts'
import { cardioCompletionInput, setCompletionInput } from './completion-input.ts'
import { useRestAudio, useRestTimerAudio } from '../workout-flow/useRestAudio.ts'
import { useRestAlertPreferences } from '../workout-flow/useRestAlertPreferences.ts'
import { useCardioEstimate } from '../settings/useCardioEstimate.ts'
import { defaultRestAlerts, restAlertVisual } from '../workout-flow/rest-alerts.ts'
import styles from '../workout-flow/WorkoutFlow.module.css'

type Modal = 'list' | 'weight' | 'end' | 'add' | 'replace' | 'cardio' | 'edit-cardio' | 'remove' | 'undo-cardio' | { undo: number }
const restKey = (rest: LocalWorkout['rest']) => rest ? [rest.sessionExerciseId, rest.ordinal, rest.startedAt].join(':') : null
const REST_TRANSITION_GUARD_MS = 275
const FINAL_SET_REVIEW_WINDOW_MS = 750
export function LocalWorkoutView({ state, controller, definitions, manufacturers = [], activities = [], history = [], historyPending, historyFailed, visible = true, onHome = () => {}, backLabel, notices, progressAssessment, progressAssessmentPending = false, referenceRecords = [], referenceRoutine = null, createSetId, preparingSummary = false, confirmingFinish = false, navigationIssue, recheckIssue, localOnly = false, onReconnect, onRecheckSession, onReopenLocal, retryFinish, reopeningLocal = false }: {
  state: EditorState; controller: LocalWorkoutController; definitions: StandardExercise[]; manufacturers?: Manufacturer[]
  activities?: CardioActivity[]; history?: Session[] | null; historyPending?: boolean; historyFailed?: boolean; visible?: boolean; onHome?: () => void; backLabel?: string; notices?: ReactNode
  progressAssessment?: ProgressAssessment; progressAssessmentPending?: boolean; referenceRecords?:ReferenceRecord[]; referenceRoutine?:Routine|null
  createSetId?: () => string; preparingSummary?: boolean; confirmingFinish?: boolean; navigationIssue?: string; recheckIssue?: string
  localOnly?: boolean; onReconnect?: () => void; onRecheckSession?: () => void; onReopenLocal?: () => void; reopeningLocal?: boolean
  retryFinish?: () => Promise<string | undefined>
}) {
  const [now, setNow] = useState(Date.now), [modal, setModal] = useState<Modal | null>(null), [editing, setEditing] = useState(false)
  const [saveDetailsOpen, setSaveDetailsOpen] = useState(false)
  if (!visible && saveDetailsOpen) setSaveDetailsOpen(false)
  const [modalFailure, setModalFailure] = useState<{ target: Modal; message: string } | null>(null)
  if (modalFailure && modalFailure.target !== modal) setModalFailure(null)
  const [hiddenRecommendations,setHiddenRecommendations]=useState<Set<string>>(()=>new Set())
  const [completedScroll, setCompletedScroll] = useState<{ exerciseId: string; top: number } | null>(null)
  const [exerciseScroll, setExerciseScroll] = useState<ExerciseScrollPosition | null>(null)
  const [memoOpen, setMemoOpen] = useState<Record<string, boolean>>({})
  const [restChange, setRestChange] = useState<{ key: string; kind: 'manual' | 'undo' } | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [finishDialogDismissed, setFinishDialogDismissed] = useState(false)
  const [retryingFinish, setRetryingFinish] = useState(false)
  const [retryDescription, setRetryDescription] = useState<string>()
  const [finishRetryIssue, setFinishRetryIssue] = useState<string>()
  const [finishAssessment, setFinishAssessment] = useState<ProgressAssessment>()
  const finishInFlight = finishing || preparingSummary || confirmingFinish || retryingFinish
  const [completion, setCompletion] = useState<{ exerciseId: string; ordinal?: number; saving: boolean } | null>(null)
  const [footerRepeatGuard] = useState(createRepeatPointerGuard)
  const [guardedSet, setGuardedSet] = useState<string | null>(null)
  const previousRest = useRef<{ nextSet: string | null; active: boolean } | null>(null)
  const completionGuard = useRef<string | null>(null)
  const guardTimer = useRef<number | undefined>(undefined)
  const manualEndPending = useRef(false)
  const action = useRef(false), clock = useRef<HTMLDivElement>(null), working = useRef<HTMLElement>(null)
  const [alerts] = useRestAlertPreferences(state.workout?.userId ?? null)
  const [estimateCardio] = useCardioEstimate(state.workout?.userId ?? null)
  const audio = useRestAudio(alerts.sound || alerts.middle, alerts.volume)
  const { stop, unlock } = audio
  const workout = state.workout
  const feedback = useSuccessToast(workout && visible ? workout.sessionId + ':' + workout.currentExerciseId : null)
  const showFeedback = feedback.show
  useEffect(() => {
    if (visible && navigationIssue && state.unsavedDrafts) showFeedback(navigationIssue, 'error')
  }, [visible, navigationIssue, state.unsavedDrafts, showFeedback])
  useEffect(() => {
    if (visible && recheckIssue) showFeedback(recheckIssue, 'error')
  }, [visible, recheckIssue, showFeedback])
  const weights = useMemo(() => state.workout ? flowWeights(state, history, definitions, historyPending) : [],
    [state, history, definitions, historyPending])
  const cardioPlans = workout?.snapshot.appliedPlan.cardioActivities
  const cardioHistory = useMemo(() => new Map(cardioPlans?.map(activity =>
    [activity.sessionActivityId, previousCardioResult(history, activity.plan)])), [history, cardioPlans])
  const weight = weights.find(weight => weight.id === workout?.currentExerciseId)
  const nextSet = weight?.sets.find(set => !set.result)
  const completeWeight = !!weight && isWeightDone(weight)
  const changedCombination = !!workout && (workout.originalCombinationChanged === true || changedOriginalCombination(workout.initialPlan, workout.snapshot))
  const prior = workout && weight && !changedCombination
    ? referenceIncrease({ ...workout, id: workout.sessionId }, weight.id, weight.approved, referenceRoutine, referenceRecords) : null
  const activeCompletion = completion?.exerciseId === weight?.id ? completion : null
  const awaitingReview = !!activeCompletion && !!workout && !!weight && completeWeight && visible && !editing && !finishInFlight
    && state.writable && !workout.finish && !state.syncIssue && state.syncStatus !== 'WAITING'
    && progressAssessmentPending && weight.mode !== 'today' && !changedCombination && !prior
    && !hiddenRecommendations.has(workout.sessionId + ':' + weight.id)
  const completionOrdinal = nextSet?.id ?? (awaitingReview ? activeCompletion?.ordinal : undefined)
  if (completion && !completion.saving && !awaitingReview) setCompletion(null)
  if (completedScroll && (!visible || completedScroll.exerciseId !== workout?.currentExerciseId)) setCompletedScroll(null)
  useEffect(() => {
    if (!awaitingReview) return
    // Optional advice cannot keep the next action waiting on a slow connection.
    const timeout = window.setTimeout(() => setCompletion(null), FINAL_SET_REVIEW_WINDOW_MS)
    return () => window.clearTimeout(timeout)
  }, [awaitingReview])
  const timingReady = !!workout && state.writable && !workout.finish
  const rest = workout ? model.exerciseRest(workout, workout.currentExerciseId) : undefined
  const endingRest = restChange?.kind === 'manual'
  const changingCurrentRest = !!rest && restKey(rest) === restChange?.key
  const remaining = workout && rest && (!changingCurrentRest || endingRest)
    ? model.restRemaining(workout, Math.max(now, Date.parse(rest.startedAt)), workout.currentExerciseId) : 0
  const showingRest = remaining > 0 || endingRest && changingCurrentRest
  const nextSetScope = workout && nextSet ? `${workout.userId}:${workout.dataGeneration}:${workout.sessionId}:${workout.currentExerciseId}:${nextSet.id}` : null
  const restScope = timingReady && visible && !editing && restChange?.kind !== 'undo' ? nextSetScope : null
  const restProtected = nextSetScope !== null && guardedSet === nextSetScope
  useLayoutEffect(() => {
    const previous = previousRest.current
    previousRest.current = { nextSet: restScope, active: showingRest }
    if (!restScope || previous?.nextSet !== restScope || !previous.active || showingRest) return

    // Start at the committed transition, including expiry observed by the timer.
    const until = performance.now() + REST_TRANSITION_GUARD_MS
    completionGuard.current = restScope
    setGuardedSet(restScope)
    window.clearTimeout(guardTimer.current)
    const release = () => {
      const left = until - performance.now()
      if (left > 0) { guardTimer.current = window.setTimeout(release, Math.ceil(left)); return }
      completionGuard.current = null
      setGuardedSet(null)
    }
    guardTimer.current = window.setTimeout(release, REST_TRANSITION_GUARD_MS)
  }, [restScope, showingRest])
  useEffect(() => () => window.clearTimeout(guardTimer.current), [])
  useEffect(() => {
    if (!timingReady) return
    const observe = () => { void controller.observeWeightVisibility(visible && document.visibilityState === 'visible') }
    observe()
    document.addEventListener('visibilitychange', observe)
    return () => document.removeEventListener('visibilitychange', observe)
  }, [controller, timingReady, visible])
  const rests = workout?.rests ? Object.values(workout.rests) : workout?.rest ? [workout.rest] : []
  const audioRests = rests.filter(rest => restKey(rest) !== restChange?.key)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const audioRest = audioRests.find(rest => Date.parse(rest.endsAt) > now)
  const restStarted = audioRest ? Date.parse(audioRest.startedAt) : undefined
  const restEnd = audioRest ? Date.parse(audioRest.endsAt) : undefined
  const restNow = Math.max(now, restStarted ?? now)
  const alertsActive = visible && state.writable && !workout?.finish && !finishing
  useRestTimerAudio(audio, {
    id: alertsActive ? restKey(audioRest) : null, ends: restEnd, now: restNow,
    remaining: restEnd === undefined ? 0 : Math.max(0, Math.ceil((restEnd - restNow) / 1000)),
    countdown: alerts.sound, middleAt: alerts.middle ? audioRest?.middleAt ?? defaultRestAlerts.middleAt : undefined,
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
    if (!completedScroll || completedScroll.exerciseId !== workout?.currentExerciseId || !visible || awaitingReview) return
    const frame = requestAnimationFrame(() => {
      if (working.current && clock.current && Math.abs(window.scrollY - completedScroll.top) <= 1) {
        window.scrollTo({ top: window.scrollY + working.current.getBoundingClientRect().top - clock.current.getBoundingClientRect().height - 8,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
      }
      setCompletedScroll(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [awaitingReview, completedScroll, visible, workout?.currentExerciseId])
  if (!workout) return null
  const cardio = flowCardio(state, now)
  const exercises = [...weights, ...cardio]
  const items = exercises.map(exercise => ({ id: exercise.id, name: 'plan' in exercise ? exercise.plan.name : exercise.name, cardio: 'plan' in exercise }))
  const id = workout.currentExerciseId, index = items.findIndex(e => e.id === id)
  const activity = cardio.find(c => c.id === id)
  const savingCompletion = completion?.exerciseId === id && completion.saving
  const warmup = workout.warmupCompleted === false && weights.length > 0
  const blocked = !state.writable || !!workout.finish || finishInFlight
  const visual = restAlertVisual(alerts, alertsActive && weight && !warmup ? remaining : 0)
  const preparingWeight = !!weight && !completeWeight && !model.weightStarted(workout, id)
  const preparing = !warmup && (preparingWeight || activity?.phase === 'ready')
  const allWeights = weights.every(isWeightDone)
  const allDone = allWeights && cardio.every(c => c.phase === 'completed' || c.phase === 'skipped')
  const pending = items.slice(index + 1).concat(items.slice(0, index + 1)).find(item => {
    const w = weights.find(e => e.id === item.id), c = cardio.find(e => e.id === item.id)
    return w ? !isWeightDone(w) : c?.phase !== 'completed' && c?.phase !== 'skipped'
  })
  const showFailure = (failure: WorkoutActionFailure, inDialog = false) => {
    if (inDialog && modal) setModalFailure({ target: modal, message: failure.message })
    else feedback.show(failure.message, 'error')
  }
  const validate = (check: () => void) => {
    try { check(); return true }
    catch (error) {
      feedback.show(error instanceof WorkoutActionError ? error.message : '입력값을 확인해 주세요.', 'warning')
      return false
    }
  }
  const act = async (transform: (w: LocalWorkout, now: number) => void, close = false) => {
    if (action.current || blocked) return false
    action.current = true
    try {
      const saved = await controller.complete(transform, failure => showFailure(failure, close))
      if (close && saved) setModal(null)
      return saved
    }
    finally { action.current = false }
  }
  const endRest = () => {
    if (blocked) return
    const current = controller.getSnapshot().workout
    const rest = current ? model.exerciseRest(current, id) : undefined, key = restKey(rest)
    if (!rest || !key || manualEndPending.current) return
    manualEndPending.current = true
    if (key === restKey(audioRest)) stop()
    const change = { key, kind: 'manual' as const }
    setRestChange(change)
    // Serialize behind an in-flight extension instead of dropping the manual end.
    void controller.complete(w => { if (restKey(model.exerciseRest(w, id)) === key) delete model.migrateRest(w)[id] }, showFailure).finally(() => {
      manualEndPending.current = false
      setRestChange(current => current === change ? null : current)
    })
  }
  const go = async (next: string) => {
    if (action.current || blocked) return false
    const scrollPosition = next === id ? null : { exerciseId: next, top: window.scrollY }
    if (scrollPosition) setExerciseScroll(scrollPosition)
    const saved = await act(w => { w.currentExerciseId = next }, modal === 'list')
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
    setFinishAssessment(progressAssessment)
    setFinishing(true)
    try {
      if (await controller.finish(Date.now(), failure => showFailure(failure, modal === 'end'))) {
        await controller.syncSettled()
        setModal(null)
      }
    }
    finally { action.current = false; setFinishing(false) }
  }
  const undoSet = async (ordinal: number) => {
    if (manualEndPending.current || action.current || blocked) return
    const key = rest?.ordinal === ordinal ? restKey(rest) : null
    const change = key ? { key, kind: 'undo' as const } : null
    if (change) {
      if (key === restKey(audioRest)) stop()
      setRestChange(change)
    }
    try {
      await act(w => {
        const record = w.snapshot.performedSets.find(s => s.sessionExerciseId === id && s.ordinal === ordinal)
        if (record) model.undoSet(w, record.id)
      }, true)
    } finally {
      if (change) setRestChange(current => current === change ? null : current)
    }
  }
  const requestEnd = () => { if (blocked) return; if (allDone) void end(); else setModal('end') }
  const completeExercise = async (transform: (w: LocalWorkout, now: number) => void, ordinal?: number) => {
    const request = { exerciseId: id, ordinal, saving: true }
    setCompletion(request)
    try {
      const saved = await act((w, at) => {
        if (w.currentExerciseId !== id) throw new WorkoutActionError('현재 종목을 다시 확인해 주세요.')
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
    } finally {
      setCompletion(current => current === request ? { ...request, saving: false } : current)
    }
  }
  const complete = (ordinal: number, event?: MouseEvent<HTMLButtonElement>) => {
    if (!weight || preparingWeight || warmup || remaining > 0 || manualEndPending.current || action.current || blocked) return
    if (nextSetScope && completionGuard.current === nextSetScope) return
    const current = controller.getSnapshot()
    if (!current.workout || current.workout.currentExerciseId !== id) return
    if (weight.workingInitial && !weight.workingFromHistory && (historyFailed || weight.workingAmbiguous)) {
      feedback.show('이전 중량을 확인하지 못했어요. 진행 중량을 확인해 주세요.', 'warning')
      return
    }
    const draft = inputDraft(current.workout, id, ordinal, history, current.drafts[slotKey(id, ordinal)])
    if (!validate(() => setCompletionInput(draft, weight.loadType))) return
    feedback.clearError()
    if (event && weight.sets.filter(set => !set.result).length === 1) footerRepeatGuard.arm(event)
    void unlock()
    void completeExercise((w, at) => {
      if (!model.weightStarted(w, id) || model.restRemaining(w, at, id) > 0) throw new WorkoutActionError('운동을 시작하고 휴식을 마친 뒤 완료해 주세요.')
      model.editDraft(w, id, ordinal, { ...draft, ...w.drafts[slotKey(id, ordinal)] })
      model.completeSet(w, id, ordinal, at, createSetId, alerts)
    }, ordinal).then(saved => {
      if (saved && controller.getSnapshot().workout?.currentExerciseId === id) setCompletedScroll({ exerciseId: id, top: window.scrollY })
    })
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
  const finishRecovery = !!workout.finish && !finishInFlight
  const keepFinalActions = (finishRecovery || finishInFlight) && (!pending || allWeights) && !warmup && !editing &&
    (completeWeight || activity?.phase === 'completed' || activity?.phase === 'skipped')
  const recoverFinish = async () => {
    if (action.current || finishInFlight) return
    if (localOnly) { onReconnect?.(); return }
    action.current = true
    setRetryingFinish(true)
    setRetryDescription(finishDescription)
    try {
      if (retryFinish) setFinishRetryIssue(await retryFinish())
      else if (state.writable) await controller.retrySync()
      else (onReopenLocal ?? onRecheckSession)?.()
    } finally { action.current = false; setRetryingFinish(false) }
  }
  const finishIssue = finishRetryIssue ?? state.issue ?? state.syncIssue ?? recheckIssue
  const finishConflict = state.syncStatus === 'OTHER' || state.syncStatus === 'CHECK' || !!state.issue || !!workout.pendingSnapshot?.rejected
  const finishDescription = finishConflict && finishIssue ? finishIssue
    : localOnly ? '운동 기록은 보존되어 있습니다. 같은 계정의 로그인 상태를 확인해 주세요.'
      : '운동 기록은 보존되어 있습니다. 다시 시도해 주세요.'
  // Completion controls and final controls must not share a button's visual state.
  const finishAction = <Button key={id + ':finish'} variant={pending ? 'quiet' : 'primary'} data-click-action={id + ':finish'} pending={finishInFlight}
    loading={finishInFlight && modal !== 'end'} loadingLabel="운동 종료 중"
    onClick={finishRecovery ? () => setFinishDialogDismissed(false) : () => void end()}>
    {pending ? '남은 유산소 건너뛰고 종료' : '운동 종료 및 요약'}
  </Button>
  const finalActions = <>{allWeights && <Button key={id + ':add-cardio'} data-click-action={id + ':add-cardio'} disabled={finishRecovery} onClick={() => setModal('cardio')}>+ 유산소 추가</Button>}
    {pending && <Button key={id + ':next'} variant="primary" data-click-action={id + ':next'} disabled={finishRecovery} onClick={() => void go(pending.id)}>다음 종목으로</Button>}
    {(!pending || allWeights) && finishAction}</>
  const candidate = (finishInFlight || keepFinalActions ? finishAssessment : progressAssessment)?.evaluation?.exercises.find(e => e.sessionExerciseId === id)
  const advice = weight && completeWeight && weight.mode !== 'today' && candidate?.eligible && candidate.comparisonContext
    && decimalDraft(weight.working) === candidate.comparisonContext.approvedWeightKg ? candidate : null
  const direction=advice?.advice==='INCREASE'?'increase':advice?.advice==='DECREASE'?'decrease':prior?'increase':null
  const referenceKg=advice?.comparisonContext?.approvedWeightKg??prior?.kg
  const recommendation=weight&&!changedCombination&&direction&&!hiddenRecommendations.has(workout.sessionId+':'+id)?<WeightRecommendation provisional={!prior} source={advice?.advice==='INCREASE'||advice?.advice==='DECREASE'?'current':'benchmark'} direction={direction} kg={referenceKg} loadType={weight.loadType} onDismiss={()=>setHiddenRecommendations(ids=>new Set(ids).add(workout.sessionId+':'+id))}/>:null

  let actions: ReactNode
  if (keepFinalActions) actions = finalActions
  else if (finishRecovery) actions = finishAction
  else if (blocked && !finishInFlight) {
    const recheck = localOnly ? onReconnect : onReopenLocal ?? onRecheckSession
    actions = recheck && <Button loading={reopeningLocal} onClick={recheck}>{localOnly ? '같은 계정 인증 다시 확인' : '서버 저장 상태 다시 확인'}</Button>
  }
  else if (warmup) actions = <Button variant="primary" data-click-action="warmup" onClick={() => {
    void unlock()
    void act(model.completeWarmup).then(saved => { if (saved) window.scrollTo(0, 0) })
  }}>준비운동 완료</Button>
  else if (weight && editing) actions = <Button className={styles.editClose} onClick={() => { feedback.clear(); setEditing(false) }}>편집 닫기</Button>
  else if (preparing) actions = <Button variant="primary" data-click-action={id + ':start'} onClick={startExercise}>운동 시작하기</Button>
  else if (weight && showingRest) actions = <RestActions remaining={remaining} flash={visual.bottom} disabled={endingRest}
    onEnd={endRest}
    onExtend={() => { if (!manualEndPending.current) void act(w => { const current = model.exerciseRest(w, id); if (current) current.endsAt = new Date(Date.parse(current.endsAt) + 30000).toISOString() }) }} />
  else if (weight && completionOrdinal !== undefined) {
    const ordinal = completionOrdinal
    const saving = activeCompletion?.ordinal === ordinal && activeCompletion.saving
    actions = <Button className={restProtected || endingRest ? styles.restProtected : undefined}
      variant="primary" data-click-action={id + ':complete:' + ordinal} pending={restProtected || endingRest || awaitingReview || saving}
      aria-busy={awaitingReview || saving || undefined} onClick={event => complete(ordinal, event)}>{ordinal}세트 완료</Button>
  }
  else if (weight) actions = finalActions
  else if (activity?.phase === 'review') actions = <Button variant="primary" data-click-action={id + ':confirm-cardio'}
    pending={savingCompletion} aria-busy={savingCompletion || undefined} onClick={event => {
    if (action.current || blocked) return
    if (!validate(() => cardioCompletionInput(activity.draft, activity.plan.kind, activity.activeMs))) return
    feedback.clearError()
    footerRepeatGuard.arm(event)
    void completeExercise((w, at) => model.completeCardio(w, id, at, createSetId)).then(saved => {
      if (saved && controller.getSnapshot().workout?.currentExerciseId === id) window.scrollTo(0, 0)
    })
  }}>유산소 기록 확정</Button>
  else if (activity?.phase === 'completed' || activity?.phase === 'skipped') actions = finalActions
  else actions = <div className={styles.actions}>
    <Button onClick={() => void act(w => model.timerAction(w, id, activity?.phase === 'running' ? 'pause' : 'start', Date.now()))}>{activity?.phase === 'running' ? '일시정지' : '재개'}</Button>
    <Button variant="primary" data-click-action={id + ':review-cardio'} onClick={event => {
      if (action.current || blocked) return
      footerRepeatGuard.arm(event)
      void act((w, at) => model.reviewCardio(w, id, at, estimateCardio))
    }}>유산소 완료</Button>
  </div>
  const footerRecommendation = !warmup && !editing && (!blocked || finishInFlight || keepFinalActions) && recommendation
  const preparedFrom = preparing ? model.exercisePreparationStartedAt(workout, id) : undefined
  const performingWeight = !!weight && !warmup && !preparingWeight && !completeWeight
  const weightTimingLabel = workout.snapshot.weightTiming?.complete === false ? 'WEIGHT 수행 · 일부' : 'WEIGHT 수행'
  const timerHeading = preparing ? '종목 준비' : remaining > 0 ? '휴식 시간'
    : performingWeight ? weightTimingLabel : activity ? '유산소 시간' : '운동 상태'
  const timerLabel = warmup || preparing ? '준비 중' : allDone ? '모든 종목 완료' : activity?.phase === 'skipped' ? '건너뜀' : '완료'
  const timer = preparedFrom ? Math.max(0, now - Date.parse(preparedFrom)) : remaining > 0 ? remaining * 1000
    : performingWeight ? observedWeightMs(workout, now) : activity && !preparing && !allDone && activity.phase !== 'skipped' ? activity.activeMs : undefined
  const issue = modal && modal === modalFailure?.target ? <StatusNotice error>{modalFailure.message}</StatusNotice> : null
  const dataStatus = workoutSaveStatus(state, finishInFlight)
  const draftsNeedRetry = state.writable && state.unsavedDrafts
  const localIssue = (state.unsavedDrafts ? navigationIssue : undefined) ?? recheckIssue ?? state.issue
  const rejected = workout.pendingSnapshot?.rejected || workout.pendingResolution?.rejected
  const showSyncDetails = dataStatus === 'waiting' || !!state.syncIssue || state.syncStatus === 'CHECK' || state.syncStatus === 'OTHER' || !!rejected
  const canReview = !!onRecheckSession && !localOnly && (!state.writable || state.syncStatus === 'OTHER') && !workout.finish
  const canRetrySync = showSyncDetails && state.writable && !localOnly
  const hasSaveDetails = !!localIssue || dataStatus === 'failed' || showSyncDetails || Children.count(notices) > 0
  const hasApprovalForm = workout.approvalResults.some(result => result.status === 'PENDING') || !!workout.pendingResolution
  const draftRecovery = draftsNeedRetry && !hasApprovalForm
  const detailsLocalIssue = draftRecovery && localIssue === localStoreErrorMessage ? '저장소 설정과 여유 공간을 확인해 주세요.' : localIssue
  const detailsTone = hasApprovalForm ? undefined
    : draftRecovery || dataStatus === 'failed' ? 'critical'
      : state.syncIssue ? 'error' : dataStatus === 'waiting' ? 'warning' : 'info'
  const isRecovery = detailsTone === 'critical' || detailsTone === 'error'
  const sessionRecovery = isRecovery && !draftsNeedRetry && !canRetrySync
  const renderExercise = (at: number, preview = false) => {
    const exercise = exercises[at]
    if (!exercise) return null
    const weight = 'sets' in exercise ? exercise : undefined
    const activity = 'plan' in exercise ? exercise : undefined
    const navigation = <ExerciseNavigation previous={items[at - 1]} next={items[at + 1]} onList={() => setModal('list')} onGo={go} preview={preview} />
    const id = exercise.id
    const started = model.weightStarted(workout, id)
    const resting = model.restRemaining(workout, now, id) > 0
    const open = memoOpen[id] ?? !started
    return <>
      {allDone && <StatusNotice>모든 종목을 완료했습니다. 기록을 확인하고 운동을 종료할 수 있습니다.</StatusNotice>}
      {weight && <WeightFocus preview={preview} additionalInput weight={weight} position={at + 1} workingRef={preview ? undefined : working} manufacturers={manufacturers}
        description={exerciseDescription(definitions.find(d => d.id === weight.standardId) ?? { id: weight.standardId, name: weight.name, aliases: [] })}
        preparing={!started && !resting && !isWeightDone(weight)}
        resting={!started || resting || id === workout.currentExerciseId && endingRest}
        completionProtected={id === workout.currentExerciseId && restProtected} editing={!preview && editing}
        memoOpen={open} onMemoToggle={() => setMemoOpen(value => ({ ...value, [id]: !open }))}
        memoContent={<CombinationMemo preview={preview} hiddenLabel exerciseId={weight.standardId} equipment={weight} initialText={weight.memo} />}
        progressNote={workout.replacementSlots?.[id] ? '대체 수행 ' + weight.sets.filter(s => s.result).length + '/' + weight.sets.length + '세트 · 원계획 슬롯 완료 인정은 서버 확인이 필요합니다.' : changedCombination ? '오늘만 조합 변경 · 공식 중량 검토 제외' : undefined}
        approvalNote={workout.approvalResults.some(r => r.sessionExerciseId === id && r.status === 'PENDING') ? '승인 확인 필요' : '승인 요청 상태 확인'}
        onDraft={(ordinal, draft) => {
          feedback.clearError()
          const current = controller.getSnapshot().workout
          if (!current) return
          controller.draft(id, ordinal, { ...(draft.reps !== undefined ? { reps: draft.reps } : {}),
            ...(draft.kg !== undefined ? { weight: draft.kg } : {}), ...(draft.additional !== undefined ? { additionalWeight: draft.additional } : {}) })
        }}
        onComplete={complete} onUndo={ordinal => setModal({ undo: ordinal })} onAddSet={addSet}
        onExcludeSet={ordinal => void act(w => {
          if (w.snapshot.performedSets.some(s => s.sessionExerciseId === id && s.ordinal === ordinal)) throw new WorkoutActionError('완료 기록을 먼저 취소해 주세요.')
          const plan = w.snapshot.appliedPlan.weightExercises.find(p => p.sessionExerciseId === id)!
          model.updateTargets(w, id, plan.setCount - 1, plan.minReps, plan.maxReps)
          w.excludedSetOrdinals = { ...w.excludedSetOrdinals, [id]: [...(w.excludedSetOrdinals?.[id] ?? []), ordinal] }
        })}
        onWeight={() => setModal('weight')} onEdit={() => setEditing(true)} onMemo={value => controller.memo(id, value)}
        onList={() => setModal('list')} onEnd={requestEnd}
        editTools={<><EquipmentEditor key={id} equipment={weight} manufacturers={manufacturers} onApply={async value => {
          feedback.clear()
          const saved = await act(w => model.changeEquipment(w, id, value))
          if (saved) feedback.show('이후 세트에 적용했습니다.')
          return saved
        }} />
          <Card><p className="muted small">변경은 이번 운동에만 적용됩니다. 완료 세트를 취소한 뒤 교체하거나 제외할 수 있습니다.</p>
            <Button onClick={() => setModal('add')}>+ 다음 종목 추가</Button><Button onClick={() => setModal('cardio')}>+ 유산소 추가</Button>
            <Button disabled={weight.sets.some(s => !!s.result)} onClick={() => setModal('replace')}>현재 종목 교체</Button>
            <Button variant="danger" disabled={weight.sets.some(s => !!s.result) || items.length < 2} onClick={() => setModal('remove')}>현재 종목 제외</Button>
          </Card></>} />}
      {activity && <CardioFocus preview={preview} cardio={{ ...activity, previous: cardioHistory.get(activity.id) }} activeMs={activity.activeMs} estimate={estimateCardio} navigation={navigation} editing={!preview && editing}
        onEdit={() => setEditing(v => !v)} onUndo={() => setModal('undo-cardio')}
        onDraft={patch => { feedback.clearError(); controller.cardioDraft(id, patch) }}
        onCancelReview={() => void act(w => { if (w.timers[id]) w.timers[id].reviewing = false })}
        editTools={<Card><p className="muted small">이번 운동에만 적용됩니다. 제외하려면 진행 중인 측정을 멈추고, 완료한 기록은 먼저 취소해 주세요.</p>
          <Button onClick={() => setModal('add')}>+ 종목 추가</Button><Button onClick={() => setModal('cardio')}>+ 유산소 추가</Button>
          <Button disabled={activity.phase === 'completed' || activity.phase === 'skipped'} onClick={() => setModal('edit-cardio')}>유산소 계획 편집</Button>
          <Button variant="danger" disabled={!!workout.snapshot.cardioResults.find(c => c.sessionActivityId === id) || activity.phase === 'running' || items.length < 2} onClick={() => setModal('remove')}>현재 종목 제외</Button></Card>} />}
    </>
  }
  return <>
    <WorkoutFrame hidden={!visible} routine={workout.initialPlan.routineName} deload={false} exerciseScroll={exerciseScroll}
      feedback={<Toast toast={feedback.toast} onDismiss={feedback.dismiss} passThrough
        bottomClearance="max(0px, calc(var(--workout-footer-height, 0px) - env(safe-area-inset-bottom)))" />}
      elapsed={Math.max(0, (workout.finish ? Date.parse(workout.finish.endedAt) : now) - Date.parse(workout.startedAt))} position={warmup ? 0 : index + 1} count={items.length}
      flash={visual.top} dim={visual.dim && !editing && !blocked && !modal ? remaining : undefined}
      timerHeading={timerHeading} timerLabel={timerLabel} timer={timer} clockRef={clock}
      navigation={weight && !warmup ? { previous: items[index - 1], next: items[index + 1], onGo: go } : undefined}
      swipe={!warmup && index >= 0 ? { currentId: id, previous: items[index - 1], next: items[index + 1],
        renderPreview: next => renderExercise(exercises.findIndex(exercise => exercise.id === next), true),
        disabled: !visible || blocked || !!modal || editing, canMove: () => !action.current, onGo: go } : undefined}
      cardioFocus={!!activity && !warmup}
      onHome={onHome} backLabel={backLabel} onEnd={requestEnd}
      actions={actions || footerRecommendation ? <>{footerRecommendation}{actions}</> : undefined}
      actionsBlocked={finishInFlight} footerGuard={footerRepeatGuard}
      onRestInteraction={alertsActive && audioRest ? unlock : undefined}
      dataStatus={dataStatus} syncing={state.syncStatus === 'SENDING'} onDataStatusDetails={workout.finish
        ? finishRecovery ? () => setFinishDialogDismissed(false) : undefined
        : hasSaveDetails ? () => setSaveDetailsOpen(true) : undefined}>
      <fieldset inert={finishInFlight} disabled={blocked && !finishInFlight} className={styles.controls}>
        {warmup ? <Warmup next={weight ? { name: weight.name, target: `${weight.working || '중량 미지정'}kg · ${weight.min}–${weight.max}회 × ${weight.plannedCount ?? weight.sets.length}세트`,
          equipment: equipmentLabel(weight, manufacturers) } : { name: activity!.plan.name, target: '목표 ' + formatDuration(activity!.plan.targetSeconds * 1000) }} /> : renderExercise(index)}
      </fieldset>
    </WorkoutFrame>
    <ActionDialog kind="confirm" tone="critical"
      open={visible && !preparingSummary && !finishDialogDismissed && (finishRecovery || retryingFinish)}
      title="운동 종료를 확인하지 못했습니다"
      description={<p>{retryingFinish && retryDescription ? retryDescription : finishDescription}</p>}
      confirmLabel="다시 시도" pending={retryingFinish}
      onConfirm={() => void recoverFinish()} onDismiss={() => setFinishDialogDismissed(true)} />
    {saveDetailsOpen && !workout.finish && <Dialog title={draftRecovery ? draftSaveFailure.title : '데이터 저장 상태'}
      tone={detailsTone} onClose={() => setSaveDetailsOpen(false)}>
      <div className="stack">
        {draftRecovery && <p>{draftSaveFailure.retained}<br />{draftSaveFailure.next}</p>}
        {detailsLocalIssue && <StatusNotice error>{detailsLocalIssue}</StatusNotice>}
        {!draftRecovery && state.unsavedDrafts && <p>{draftSaveFailure.retained}</p>}
        {draftRecovery ? <div className="row">
          <Button variant="neutral" onClick={() => setSaveDetailsOpen(false)}>닫기</Button>
          <Button variant="recovery" loading={state.pending > 0} onClick={() => void controller.retryDrafts()}>{draftSaveFailure.retry}</Button>
        </div> : draftsNeedRetry && <Button variant="primary" loading={state.pending > 0} onClick={() => void controller.retryDrafts()}>입력 다시 저장</Button>}
        {state.syncIssue ? <StatusNotice error>{state.syncStatus === 'READ'
          ? <>운동 정보를 다시 확인하지 못했어요.<br />저장된 기록은 유지돼요.</>
          : state.syncStatus === 'WAITING' ? <>연결 또는 서버 저장 결과를 확인하지 못했어요.<br />이 기기의 원래 기록은 유지돼요.</>
            : state.syncIssue}</StatusNotice>
          : dataStatus === 'waiting' ? <p>기록은 이 기기에 저장됐어요.<br />서버 전송이 남아 있어요.</p>
            : state.syncStatus === 'OTHER' ? <p>다른 기기의 편집 권한을 확인해 주세요.<br />이 기기의 기록은 유지돼요.</p>
              : (rejected || state.syncStatus === 'CHECK') && <p>서버에 저장된 기록을 확인해 주세요.</p>}
        {canRetrySync && <Button variant={draftsNeedRetry ? 'secondary' : isRecovery ? 'recovery' : 'primary'} pending={state.syncStatus === 'SENDING' || reopeningLocal}
          onClick={() => void controller.retrySync()}>
          {state.syncStatus === 'READ' ? '운동 정보 다시 조회' : '저장 결과 확인'}
        </Button>}
        {canReview && <Button variant={sessionRecovery ? 'recovery' : 'secondary'} onClick={onRecheckSession}>세션 상세 다시 확인</Button>}
        {onReopenLocal && <Button variant={sessionRecovery && !canReview ? 'recovery' : 'secondary'} loading={reopeningLocal} onClick={onReopenLocal}>로컬 운동 다시 확인</Button>}
        {localOnly && onReconnect && <Button variant={sessionRecovery && !canReview && !onReopenLocal ? 'recovery' : 'secondary'} onClick={onReconnect}>같은 계정 인증 다시 확인</Button>}
        {notices}
        {!hasSaveDetails && <p>필요한 저장을 완료했습니다.</p>}
      </div>
    </Dialog>}
    {modal === 'list' && <ExerciseList saveIssue={issue} current={id} weights={weights.map(w => ({ id: w.id, name: w.name, status: `${w.sets.filter(s => s.result).length}/${w.plannedCount ?? w.sets.length}세트 완료` }))}
      cardio={cardio.map(c => ({ id: c.id, name: c.plan.name, status: c.phase === 'completed' ? '완료' : c.phase === 'skipped' ? '건너뜀' : '진행/준비' }))}
      onClose={() => setModal(null)} onSelect={go} onApply={order => void act(w => {
        const plan = w.snapshot.appliedPlan
        plan.weightExercises = order.weights.map(next => plan.weightExercises.find(e => e.sessionExerciseId === next)!)
        plan.cardioActivities = order.cardio.map(next => plan.cardioActivities.find(e => e.sessionActivityId === next)!)
      }, true)} />}
    {modal === 'weight' && weight && <WeightChange saveIssue={issue} weight={weight} progressionAllowed={workout.initialPlan.weightExercises.some(p => p.sessionExerciseId === id)}
      progressionNote="승인 요청을 서버에 저장하며, 적용 여부를 별도로 확인합니다." onClose={() => setModal(null)}
      onSave={async (value, mode) => {
        feedback.clear()
        const saved = await act(w => model.changeWeight(w, id, value, mode === 'progression', Date.now()), true)
        if (saved && mode === 'today') feedback.show('이후 세트에 적용했습니다.')
      }} />}
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
    {modal === 'remove' && <ConfirmWorkoutAction tone="destructive" saveIssue={issue} title="현재 종목을 제외할까요?"
      message={<>이번 운동에서만 제외돼요.<br />루틴과 시작 당시 계획은 유지돼요.</>} action="종목 제외"
      onClose={() => setModal(null)} onConfirm={() => void act(w => model.removeExercise(w, id), true)} />}
    {typeof modal === 'object' && modal && <ConfirmWorkoutAction saveIssue={issue} title="세트 완료를 취소할까요?" message="세트가 미완료로 돌아가고 입력값은 복원돼요." action="완료 취소 확인"
      onClose={() => setModal(null)} onConfirm={() => void undoSet(modal.undo)} />}
    {modal === 'undo-cardio' && <ConfirmWorkoutAction saveIssue={issue} title="유산소 완료를 취소할까요?" message="타이머가 일시정지 상태로 돌아가요." action="유산소 완료 취소 확인"
      onClose={() => setModal(null)} onConfirm={() => void act(w => {
        const record = w.snapshot.cardioResults.find(c => c.sessionActivityId === id)
        if (record) model.undoCardio(w, record.id)
        if (w.timers[id]) w.timers[id].reviewing = false
      }, true)} />}
    {modal === 'end' && <ConfirmWorkoutAction tone="warning" saveIssue={issue} title="운동을 종료할까요?"
      message={<>미완료 종목이 있어요.<br />완료한 기록만 요약에 표시돼요.</>}
      action="운동 종료" pending={finishing} onClose={() => { if (!finishing) setModal(null) }} onConfirm={() => void end()} />}
  </>
}
