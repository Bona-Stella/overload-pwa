import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AppShell } from '../../src/app/AppShell.tsx'
import { CardioFocus } from '../../src/features/workout-flow/CardioFocus.tsx'
import { SessionCardioPlan, SessionExerciseSearch } from '../../src/features/workout-flow/WorkoutDialogs.tsx'
import { ClosedWorkoutView } from '../../src/features/workout-online/ClosedWorkout.tsx'
import { cardioMeasurementDraft } from '../../src/features/workout-online/cardio-measurement.ts'
import { bootstrap, session } from './workout-online-data.mjs'
import '../../src/index.css'
import '../../src/App.css'
import '../../src/features/workout-online/online.css'

const activity = { id: crypto.randomUUID(), activityId: crypto.randomUUID(), name: '실내 러닝', kind: 'TREADMILL', category: 'RUNNING', aliases: [] }
const plan = { ...activity, standardExerciseId: activity.id, targetSeconds: 1200, targetDistanceKm: '3.234567', intensity: null, inclinePercent: null, resistance: null }
const id = crypto.randomUUID()
const result = { activeMs: 1230125, timerMs: 1200000, corrected: true, distanceKm: '3.234567', averageBpm: 142,
  measurement: { actualSpeedKmh: '6.123456', distanceSource: 'MANUAL' } }
const server = session({ status: 'FINISHED', endedAt: '2026-10-31T12:21:00Z', closedAt: '2026-10-31T12:21:00Z' })
server.snapshot.state.appliedPlan.cardioActivities.push({ sessionActivityId: id, plan })
server.snapshot.state.cardioResults.push({ id: crypto.randomUUID(), sessionActivityId: id, status: 'COMPLETED',
  occurredAt: server.endedAt, startedAt: server.startedAt, result })
const state = { server, assessment: null, changes: null, copies: [], pending: null, busy: false, writable: true, issue: null, notice: '' }
const controller = { edit: async body => { window.cardioSurface.correction = body.cardioCorrections[0]; return true } }
const catalog = [...bootstrap.exercises, ...Array.from({ length: 16 }, (_, i) => ({ ...bootstrap.exercises[0], id: crypto.randomUUID(), name: '테스트 웨이트 ' + (i + 1) }))]

function Fixture() {
  const [view, setView] = useState('review')
  const [modal, setModal] = useState(null)
  const [draft, setDraft] = useState({ ...cardioMeasurementDraft(result), distanceSource: 'stored', correctedSeconds: null, bpm: '' })
  window.cardioSurface ??= {}
  Object.assign(window.cardioSurface, { setView, setModal, draft })
  return <AppShell authenticated focused tab="home" onNavigate={() => {}}>
    {(view === 'review' || view === 'completed') && <CardioFocus activeMs={result.timerMs} navigation={null} editing={false}
      editTools={null} onEdit={() => {}} onCancelReview={() => {}} onUndo={() => setView('review')}
      onDraft={patch => setDraft(value => ({ ...value, ...patch }))}
      cardio={{ id, plan, phase: view, draft, ...(view === 'completed' ? { result } : {}) }} />}
    {view !== 'review' && view !== 'completed' && <ClosedWorkoutView state={state} controller={controller} summary={view === 'summary'} />}
    {(modal === 'add' || modal === 'replace') && <SessionExerciseSearch replace={modal === 'replace'} exercises={catalog}
      onClose={() => setModal(null)} onSelect={exercise => { window.cardioSurface.selected = exercise.name; setModal(null) }} />}
    {(modal === 'cardio-add' || modal === 'cardio-edit') && <SessionCardioPlan
      activities={[activity]} index={1} plan={modal === 'cardio-edit' ? plan : undefined}
      onClose={() => setModal(null)} onSave={value => { window.cardioSurface.plan = value; setModal(null) }} />}
  </AppShell>
}
createRoot(document.getElementById('root')).render(<Fixture />)
