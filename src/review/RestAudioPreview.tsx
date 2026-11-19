import { useEffect, useState, useSyncExternalStore } from 'react'
import { AppShell } from '../app/AppShell.tsx'
import { Button } from '../components/ui.tsx'
import { LocalWorkoutController } from '../features/workout-local/controller.ts'
import { LocalWorkoutView } from '../features/workout-local/LocalWorkoutFlow.tsx'
import { createLocalWorkout, editDraft } from '../features/workout-local/model.ts'
import { newId } from '../id.ts'
import { exercises, reviewSample, reviewToday } from './routine-samples.ts'
import '../features/workout-online/online.css'

const restSeconds = 10
const policy = { restLowSeconds: restSeconds, restMediumSeconds: restSeconds, restHighSeconds: restSeconds }

function createReviewWorkout() {
  const sample = reviewSample('normal').sessions[0]
  const startedAt = new Date().toISOString()
  const state = { ...sample.snapshot.state, sessionExercises: sample.snapshot.state.sessionExercises.filter(item => item.kind === 'WEIGHT'),
    appliedPlan: { ...sample.snapshot.state.appliedPlan, cardioActivities: [] } }
  const server = { ...sample, id: newId(), userId: newId(), status: 'ACTIVE' as const, version: '0', localRevision: '0',
    startedAt, workoutDate: reviewToday, endedAt: null, closedAt: null, lastWorkoutSyncedAt: startedAt, lastSnapshotSavedAt: null,
    initialPlan: { ...sample.initialPlan, cardioActivities: [] }, snapshot: { ...sample.snapshot, state } }
  let stored = createLocalWorkout(server, policy)
  const exercise = server.initialPlan.weightExercises[0]
  for (let ordinal = 1; ordinal <= exercise.setCount; ordinal++) {
    editDraft(stored, exercise.sessionExerciseId, ordinal, { weight: exercise.approvedWeightKg ?? '0', reps: String(exercise.minReps) })
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

function ReviewWorkout({ reset }: { reset: () => void }) {
  const [{ controller, server }] = useState(createReviewWorkout)
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  useEffect(() => {
    void controller.open(server, policy)
    return () => controller.stop()
  }, [controller, server])
  if (state.loading) return <p role="status">운동 검토 준비 중…</p>
  return <><aside className="demo-banner"><strong>개발 전용 · 세트 사이 휴식 10초 고정</strong>
    <Button onClick={reset}>10초 검토 다시 시작</Button><RestAudioTrace />
  </aside>
    {state.workout?.finish ? <p role="status">검토 운동을 종료했습니다.</p> :
      state.workout ? <LocalWorkoutView state={state} controller={controller} definitions={exercises} createSetId={newId} onHome={reset} /> :
        <p role="alert">{state.issue ?? '검토 운동을 열지 못했습니다.'}</p>}
  </>
}

export default function RestAudioPreview() {
  const [attempt, setAttempt] = useState(0)
  return <AppShell authenticated focused tab="home" onNavigate={() => {}}>
    <ReviewWorkout key={attempt} reset={() => setAttempt(value => value + 1)} />
  </AppShell>
}
