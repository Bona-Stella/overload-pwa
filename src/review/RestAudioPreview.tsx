import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { AppShell } from '../app/AppShell.tsx'
import { navigateBack, useScreenHistory } from '../app/navigation.ts'
import { Button } from '../components/ui.tsx'
import { LocalWorkoutController } from '../features/workout-local/controller.ts'
import { LocalWorkoutView } from '../features/workout-local/LocalWorkoutFlow.tsx'
import { createLocalWorkout, editDraft } from '../features/workout-local/model.ts'
import { CombinationMemoProvider } from '../features/workout-online/CombinationMemo.tsx'
import { HomeView } from '../features/home/HomePanel.tsx'
import { activeWorkoutProgress } from '../features/home/active-workout.ts'
import { dayOfWeek } from '../features/home/model.ts'
import { WorkoutSummary } from '../features/workout-flow/WorkoutSummary.tsx'
import { SavedWeightReview } from '../features/workout-online/SavedWeightReview.tsx'
import { summaryData } from '../features/workout-online/summary-data.ts'
import type { Session, SnapshotRequest } from '../features/workout-online/types.ts'
import type { SyncOptions } from '../features/workout-local/sync.ts'
import { newId } from '../id.ts'
import { activities, exercises, reviewHome, reviewSample, reviewToday } from './routine-samples.ts'
import { processWeightReview } from './process-weight-review.ts'
import '../features/workout-online/online.css'

const restSeconds = 10
const policy = { restLowSeconds: restSeconds, restMediumSeconds: restSeconds, restHighSeconds: restSeconds }

type ProcessPlan = 'mixed' | 'weight' | 'cardio'
function createReviewWorkout(swipe: boolean, matrix: boolean, process?: ProcessPlan, withRecommendation = false) {
  const sample = reviewSample('normal').sessions[0]
  const startedAt = new Date().toISOString()
  const first = { ...sample.initialPlan.weightExercises[0], ...(matrix ? { setCount: 10 } : {}) }
  const second = { ...first, sessionExerciseId: newId(), sourcePlacementId: newId(),
    standardExerciseId: exercises[1].id, exerciseName: exercises[1].name, initialWeightKg: '30', approvedWeightKg: '30',
    ...(matrix ? { setCount: 7 } : process ? { setCount: 1 } : {}) }
  const weightExercises = process === 'cardio' ? [] : swipe ? [first, second] : [first]
  const cardioActivities = swipe && process !== 'weight' ? [...sample.initialPlan.cardioActivities] : []
  if (swipe && matrix || process === 'cardio') {
    const bike = activities[1]
    cardioActivities.push({ sessionActivityId: newId(), sourcePlacementId: newId(),
      plan: { ...cardioActivities[0].plan, activityId: bike.activityId, standardExerciseId: bike.id, kind: bike.kind, name: bike.name } })
  }
  const state = { ...sample.snapshot.state,
    sessionExercises: [
      ...weightExercises.map(exercise => ({ id: exercise.sessionExerciseId, kind: 'WEIGHT' as const, standardExerciseId: exercise.standardExerciseId })),
      ...cardioActivities.map(exercise => ({ id: exercise.sessionActivityId, kind: 'CARDIO' as const, standardExerciseId: null })),
    ],
    appliedPlan: { schemaVersion: 2 as const, weightExercises, cardioActivities } }
  const server = { ...sample, id: newId(), userId: newId(), status: 'ACTIVE' as const, version: '0', localRevision: '0',
    startedAt, workoutDate: reviewToday, endedAt: null, closedAt: null, lastWorkoutSyncedAt: startedAt, lastSnapshotSavedAt: null,
    initialPlan: { ...sample.initialPlan, weightExercises, cardioActivities }, snapshot: { ...sample.snapshot, state } }
  let stored = createLocalWorkout(server, policy)
  for (const exercise of weightExercises) {
    for (let ordinal = 1; ordinal <= exercise.setCount; ordinal++) {
      editDraft(stored, exercise.sessionExerciseId, ordinal, { weight: exercise.approvedWeightKg ?? '0',
        reps: String(withRecommendation && exercise === first ? exercise.maxReps : exercise.minReps) })
    }
  }
  let remote: Session = server, finished: Session | null = null
  let weightReview: ReturnType<typeof processWeightReview> | undefined
  const saveLocal = async (next: typeof stored, version: string, allowed: () => boolean) => {
    if (!allowed() || version !== stored.editVersion) throw new Error('검토 세션이 변경됐습니다.')
    stored = structuredClone(next)
  }
  const saveSnapshot = (request: SnapshotRequest) => {
    const now = new Date(Date.now()).toISOString()
    const version = String(BigInt(remote.version) + 1n)
    remote = { ...remote, localRevision: request.localRevision, version, lastSnapshotSavedAt: now, lastWorkoutSyncedAt: now,
      snapshot: { ...remote.snapshot, state: structuredClone(request.snapshot) } }
    return { userId: remote.userId, dataGeneration: remote.dataGeneration, sessionId: remote.id, writerEpoch: remote.writerEpoch,
      acceptedLocalRevision: request.localRevision, version, snapshotSavedAt: now, lastWorkoutSyncedAt: now, approvalResults: [], duplicate: false }
  }
  const sync: SyncOptions | undefined = process ? { online: () => true, api: {
    detail: async () => structuredClone(remote),
    snapshot: async (_scope, _id, request) => saveSnapshot(request),
    finish: async (_scope, _id, request) => {
      const ack = saveSnapshot(request)
      const completionAssessment = { schemaVersion: 2 as const, ruleVersion: 'task009-completion-v1' as const,
        sessionVersion: ack.version, assessedAt: ack.snapshotSavedAt, overallWeightPlanComplete: null, exercises: [] }
      remote = { ...remote, status: 'FINISHED', endedAt: request.endedAt, closedAt: ack.snapshotSavedAt, completionAssessment }
      return { ...ack, status: 'FINISHED', currentVersion: ack.version, deletedAt: null, endedAt: request.endedAt,
        closedAt: ack.snapshotSavedAt, completionAssessment }
    },
    routine: async () => { throw new Error('이 검토 화면은 승인 변경을 지원하지 않습니다.') },
    resolve: async () => { throw new Error('이 검토 화면은 승인 변경을 지원하지 않습니다.') },
  } } : undefined
  const controller = new LocalWorkoutController({
    openLocal: async () => structuredClone(stored),
    readLocal: async () => structuredClone(stored),
    saveLocal, saveSyncLocal: saveLocal,
    saveSession: async (_scope, session) => {
      if (session.status !== 'FINISHED') return
      finished = session
      weightReview ??= processWeightReview(session, withRecommendation)
    },
  }, () => true, async () => {
    let held = true
    return { held: () => held, release: () => { held = false } }
  }, sync)
  return { server, controller, finished: () => finished, weightReview: () => weightReview }
}

type Trace = { event: string; seconds?: number; state?: string; audioTime?: number; hidden: boolean }

function RestAudioTrace() {
  const [entries, setEntries] = useState<Trace[]>([])
  useEffect(() => {
    const record = (event: Event) => {
      const entry = (event as CustomEvent<Trace>).detail
      setEntries(previous => [...previous.slice(-79), entry])
    }
    window.addEventListener('overload:rest-audio-check', record)
    return () => window.removeEventListener('overload:rest-audio-check', record)
  }, [])
  return <details><summary>효과음 진단</summary><ol aria-label="효과음 진단">
    {entries.map((entry, index) => <li key={index} data-audio-event={entry.event} data-audio-seconds={entry.seconds} data-audio-state={entry.state}>
      {[entry.event, entry.seconds === undefined ? null : entry.seconds + '초', entry.state,
        entry.audioTime?.toFixed(2), entry.hidden ? '백그라운드' : null].filter(value => value != null).join(' · ')}
    </li>)}
  </ol></details>
}

type ReviewEditor = ReturnType<typeof createReviewWorkout>
function useReviewEditor({ controller, server }: ReviewEditor) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => {
    void controller.open(server, policy)
    return () => controller.stop()
  }, [controller, server])
  return state
}
function ReviewWorkout({ reset, swipe, matrix }: { reset: () => void; swipe: boolean; matrix: boolean }) {
  const [editor] = useState(() => createReviewWorkout(swipe, matrix))
  const { controller } = editor
  const state = useReviewEditor(editor)
  if (state.loading) return <p role="status">운동 검토 준비 중…</p>
  return <><aside className="demo-banner"><strong>{swipe ? '개발 전용 · 운동 종목 스와이프 검토' : '개발 전용 · 세트 사이 휴식 10초 고정'}</strong>
    <Button onClick={reset}>10초 검토 다시 시작</Button><RestAudioTrace />
  </aside>
    {state.workout?.finish ? <p role="status">검토 운동을 종료했습니다.</p> :
      state.workout ? <LocalWorkoutView state={state} controller={controller} definitions={exercises} createSetId={newId} onHome={reset} /> :
        <p role="alert">{state.issue ?? '검토 운동을 열지 못했습니다.'}</p>}
  </>
}

function processHomeData(plan: ProcessPlan) {
  const sample = reviewSample('normal'), routine = sample.routines[0]
  sample.schedule.presets[0].assignments = [{ dayOfWeek: dayOfWeek(reviewToday), routineId: routine.id }]
  if (plan === 'cardio') {
    routine.weightPlacements = []
    const bike = activities[1]
    const treadmill = routine.cardioPlacements[0]
    routine.cardioPlacements.push({ ...treadmill, id: bike.id, plan: { ...treadmill.plan,
      activityId: bike.activityId, standardExerciseId: bike.id, kind: bike.kind, name: bike.name } })
  } else {
    routine.weightPlacements.push({ ...routine.weightPlacements[0], id: exercises[1].id, standardExerciseId: exercises[1].id,
      exerciseName: exercises[1].name, initialWeightKg: '30', approvedWeightKg: '30', setCount: 1 })
    if (plan === 'weight') routine.cardioPlacements = []
  }
  return reviewHome(sample)
}
function ProcessHome({ data, onStart, editor, local, onResume }: {
  data: ReturnType<typeof processHomeData>
  onStart: () => void; editor?: ReviewEditor; local?: ReturnType<LocalWorkoutController['getSnapshot']>['workout']; onResume?: () => void
}) {
  const server = editor?.server ?? null
  return <HomeView data={data} today={reviewToday} active={server} progress={server ? activeWorkoutProgress(server, local ?? null, exercises) : undefined}
    localReady canStart attempt={false} busy={false} issue={null} onStart={async () => onStart()} onResume={onResume ?? (() => {})}
    onRetry={() => {}} onNavigate={() => {}} onOpen={() => {}} onRefresh={() => {}} />
}
type ProcessScreen = 'home' | 'workout' | 'summary'
function ProcessSession({ editor, data, reset, screen, setScreen }: {
  editor: ReviewEditor; data: ReturnType<typeof processHomeData>; reset: () => void
  screen: ProcessScreen; setScreen: (next: ProcessScreen, replace?: boolean) => void
}) {
  const state = useReviewEditor(editor)
  const pendingSummary = useRef(true)
  const takeInitialScroll = useCallback(() => {
    const pending = pendingSummary.current
    pendingSummary.current = false
    return pending
  }, [])
  const resume = () => {
    setScreen('workout')
    window.scrollTo(0, 0)
  }
  const finished = editor.finished()
  const weightReview = editor.weightReview()
  useEffect(() => {
    if (finished && screen === 'workout') setScreen('summary', true)
  }, [finished, screen, setScreen])
  const focused = screen === 'workout' && !finished
  const back = () => navigateBack(() => setScreen('home', true))
  return <AppShell authenticated focused={screen !== 'home'} tab="home" onNavigate={() => {}}>
    {screen === 'home' && <ProcessHome data={data} onStart={reset} editor={finished ? undefined : editor} local={state.workout} onResume={resume} />}
    {finished && weightReview && screen === 'summary' && <WorkoutSummary {...summaryData(finished, null, exercises)}
      takeInitialScroll={takeInitialScroll} manufacturers={[]} onBack={back}
      reviewContent={<SavedWeightReview api={weightReview} session={finished} readOnly={false} disabled={false} preview
        authorized={() => true} onChanged={async () => {}} />}
      dataNote="검토용 세션의 저장 결과입니다. 운영 계정 기록과 서버 중량 평가는 사용하지 않습니다." />}
    {!finished && (state.workout ? <LocalWorkoutView state={state} controller={editor.controller} definitions={exercises}
      visible={focused} createSetId={newId} onHome={back} /> : <p role="status">{state.issue ?? '운동 검토 준비 중…'}</p>)}
  </AppShell>
}
function WorkoutProcessPreview({ plan, withRecommendation }: { plan: ProcessPlan; withRecommendation: boolean }) {
  const [editor, setEditor] = useState<ReviewEditor | null>(null)
  const [data] = useState(() => processHomeData(plan))
  const [screen, setScreen] = useScreenHistory<ProcessScreen>('review-workout-process', 'home')
  const start = () => {
    if (screen !== 'home') setScreen('home', true)
    const next = createReviewWorkout(true, false, plan, withRecommendation)
    setScreen('workout')
    setEditor(next)
    window.scrollTo(0, 0)
  }
  return <CombinationMemoProvider key={editor?.server.id ?? 'start'}>
    {editor ? <ProcessSession key={editor.server.id} editor={editor} data={data} reset={start} screen={screen} setScreen={setScreen} /> : <AppShell authenticated tab="home" onNavigate={() => {}}>
      <ProcessHome data={data} onStart={start} />
    </AppShell>}
  </CombinationMemoProvider>
}

export default function RestAudioPreview() {
  const [attempt, setAttempt] = useState(0)
  const query = new URLSearchParams(location.search)
  const plan = query.get('plan')
  if (query.get('process') === '1') return <WorkoutProcessPreview plan={plan === 'weight' || plan === 'cardio' ? plan : 'mixed'} withRecommendation={query.get('review') === '1'} />
  const swipe = query.get('swipe') === '1'
  return <AppShell authenticated focused tab="home" onNavigate={() => {}}>
    <CombinationMemoProvider key={attempt}><ReviewWorkout reset={() => setAttempt(value => value + 1)} swipe={swipe} matrix={swipe && query.get('matrix') === '1'} /></CombinationMemoProvider>
  </AppShell>
}
