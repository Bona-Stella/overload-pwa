import { useEffect, useState, useSyncExternalStore } from 'react'
import { AppShell } from '../app/AppShell.tsx'
import { Button } from '../components/ui.tsx'
import { LocalWorkoutController } from '../features/workout-local/controller.ts'
import { LocalWorkoutView } from '../features/workout-local/LocalWorkoutFlow.tsx'
import { createLocalWorkout, editDraft } from '../features/workout-local/model.ts'
import { CombinationMemoProvider } from '../features/workout-online/CombinationMemo.tsx'
import { newId } from '../id.ts'
import { activities, exercises, reviewSample, reviewToday } from './routine-samples.ts'
import '../features/workout-online/online.css'

const restSeconds = 10
const policy = { restLowSeconds: restSeconds, restMediumSeconds: restSeconds, restHighSeconds: restSeconds }

function createReviewWorkout(swipe: boolean, matrix: boolean) {
  const sample = reviewSample('normal').sessions[0]
  const startedAt = new Date().toISOString()
  const first = { ...sample.initialPlan.weightExercises[0], ...(matrix ? { setCount: 10 } : {}) }
  const second = { ...first, sessionExerciseId: newId(), sourcePlacementId: newId(),
    standardExerciseId: exercises[1].id, exerciseName: exercises[1].name, initialWeightKg: '30', approvedWeightKg: '30',
    ...(matrix ? { setCount: 7 } : {}) }
  const weightExercises = swipe ? [first, second] : [first]
  const cardioActivities = swipe ? [...sample.initialPlan.cardioActivities] : []
  if (swipe && matrix) {
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
      editDraft(stored, exercise.sessionExerciseId, ordinal, { weight: exercise.approvedWeightKg ?? '0', reps: String(exercise.minReps) })
    }
  }
  const controller = new LocalWorkoutController({
    openLocal: async () => structuredClone(stored),
    readLocal: async () => structuredClone(stored),
    saveLocal: async (next, version, allowed) => {
      if (!allowed() || version !== stored.editVersion) throw new Error('검토 세션이 변경됐습니다.')
      stored = structuredClone(next)
    },
  }, () => true, async () => {
    let held = true
    return { held: () => held, release: () => { held = false } }
  })
  return { server, controller }
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

function ReviewWorkout({ reset, swipe, matrix }: { reset: () => void; swipe: boolean; matrix: boolean }) {
  const [{ controller, server }] = useState(() => createReviewWorkout(swipe, matrix))
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => {
    void controller.open(server, policy)
    return () => controller.stop()
  }, [controller, server])
  if (state.loading) return <p role="status">운동 검토 준비 중…</p>
  return <><aside className="demo-banner"><strong>{swipe ? '개발 전용 · 운동 종목 스와이프 검토' : '개발 전용 · 세트 사이 휴식 10초 고정'}</strong>
    <Button onClick={reset}>10초 검토 다시 시작</Button><RestAudioTrace />
  </aside>
    {state.workout?.finish ? <p role="status">검토 운동을 종료했습니다.</p> :
      state.workout ? <LocalWorkoutView state={state} controller={controller} definitions={exercises} createSetId={newId} onHome={reset} /> :
        <p role="alert">{state.issue ?? '검토 운동을 열지 못했습니다.'}</p>}
  </>
}

export default function RestAudioPreview() {
  const [attempt, setAttempt] = useState(0)
  const query = new URLSearchParams(location.search)
  const swipe = query.get('swipe') === '1'
  return <AppShell authenticated focused tab="home" onNavigate={() => {}}>
    <CombinationMemoProvider key={attempt}><ReviewWorkout reset={() => setAttempt(value => value + 1)} swipe={swipe} matrix={swipe && query.get('matrix') === '1'} /></CombinationMemoProvider>
  </AppShell>
}
