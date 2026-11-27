import React, { useEffect, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { AppShell } from '../../src/app/AppShell.tsx'
import { LocalWorkoutScreen } from '../../src/features/workout-local/LocalWorkoutScreen.tsx'
import { LocalWorkoutController } from '../../src/features/workout-local/controller.ts'
import { ClosedWorkoutController } from '../../src/features/workout-online/closed-controller.ts'
import { ClosedWorkoutView } from '../../src/features/workout-online/ClosedWorkout.tsx'
import { addCardio, createLocalWorkout, completeCardio, completeSet, completeWarmup, editDraft, applyLocalChange, reviewCardio, startExercise, timerAction, updateTargets } from '../../src/features/workout-local/model.ts'
import { intendFinish, rejectSnapshot, sealFinish, sealSnapshot } from '../../src/features/workout-local/sync-state.ts'
import { acquireEditor, editorLockName } from '../../src/features/workout-local/lock.ts'
import { acquireReviewEditor } from '../../src/features/workout-local/review-lock.ts'
import { LocalWriteBlocked, WorkoutStore } from '../../src/features/workout-online/storage.ts'
import { session, bootstrap, OTHER } from './workout-online-data.mjs'
import '../../src/index.css'
import '../../src/App.css'
import '../../src/features/workout-online/online.css'

const { settings, exercises } = bootstrap
const initial = session()
const phase = new URLSearchParams(location.search).get('access')
const revokedFinish = phase === 'finish-revoked'
const rejectedSnapshot = phase === 'finish-rejected'
const footerFinish = phase.startsWith('footer-')
const footerCompletion = phase.startsWith('complete-')
const recoveringFinish = footerFinish || footerCompletion || revokedFinish || rejectedSnapshot || phase === 'finish-lock' || phase === 'closed-finish'
if (phase === 'complete-weight') initial.initialPlan.weightExercises[0].setCount = 1
let workoutConnection, editorConnection
const storage = revokedFinish ? {
  open(name, version) {
    const request = indexedDB.open(name, version)
    request.addEventListener('success', () => {
      if (name.startsWith('overload-review-lock:')) editorConnection = request.result
      else workoutConnection = request.result
    })
    return request
  },
  deleteDatabase: name => indexedDB.deleteDatabase(name),
} : indexedDB
const store = new WorkoutStore(storage, crypto.randomUUID.bind(crypto), 'overload-access-test-' + phase)
const key = { ...initial, sessionId: initial.id }
const at = Date.parse(initial.startedAt) + 1000
const complete = (w, now) => {
  const id = w.currentExerciseId
  editDraft(w, id, 1, { weight: '20', reps: '8' })
  completeSet(w, id, 1, now)
}
const completed = applyLocalChange(createLocalWorkout(initial, settings), w => complete(w, at))
const latest = phase === 'conflict' ? session({ version: '2', writerEpoch: '1', editorDeviceId: OTHER })
  : session({ version: '1', localRevision: completed.localRevision, snapshot: { ...initial.snapshot, state: completed.snapshot } })

if (!sessionStorage.getItem(phase)) {
  await store.saveSession(initial, initial)
  if (phase !== 'retry') {
    const lease = await acquireEditor(key)
    if (!lease) throw Error('Could not acquire fixture lock')
    const seed = new LocalWorkoutController(store, () => true, async () => lease)
    await seed.open(initial, settings)
    await seed.observeWeightVisibility(true, at - 1)
    await seed.change(w => {
      if (revokedFinish || rejectedSnapshot || footerFinish || footerCompletion) {
        completeWarmup(w, at - 1)
        updateTargets(w, w.currentExerciseId, 1, 6, 10)
      }
      if (phase === 'complete-weight') {
        startExercise(w, w.currentExerciseId, at)
        editDraft(w, w.currentExerciseId, 1, { weight: '20', reps: '8' })
      } else complete(w, at)
      if (phase === 'footer-cardio' || phase === 'complete-cardio') {
        addCardio(w, { kind: 'TREADMILL', name: '실내 러닝', targetSeconds: 600, targetDistanceKm: null, intensity: null, inclinePercent: null, resistance: null })
        timerAction(w, w.currentExerciseId, 'start', at + 1000)
        reviewCardio(w, w.currentExerciseId, at + 3000, false)
        if (footerFinish) completeCardio(w, w.currentExerciseId, at + 4000)
      }
    })
    if (rejectedSnapshot) {
      const original = await store.readLocal(key)
      const rejected = applyLocalChange(original, w => { sealSnapshot(w); rejectSnapshot(w) })
      await store.saveSyncLocal(rejected, original.editVersion, lease.held)
      await store.saveLocal(applyLocalChange(rejected, w => intendFinish(w, Date.now())), rejected.editVersion, lease.held)
    } else if (!footerFinish && !footerCompletion) {
      await seed.finish(Date.now())
      const original = await store.readLocal(key)
      await store.saveSyncLocal(applyLocalChange(original, sealFinish), original.editVersion, lease.held)
    }
    seed.stop()
    await lease.release()
  }
  if (phase === 'retry' || phase === 'conflict') await store.saveSession(initial, latest)
  sessionStorage.setItem(phase, '1')
}

const original = await store.readLocal(key)
let remote = initial
const completionAssessment = { schemaVersion: 2, ruleVersion: 'task009-completion-v1', sessionVersion: '1',
  assessedAt: new Date(at).toISOString(), overallWeightPlanComplete: false, exercises: [] }
const finishedSession = (request, version = '1') => ({ ...initial, status: 'FINISHED', localRevision: request.localRevision, version,
  endedAt: request.endedAt, closedAt: request.endedAt, lastSnapshotSavedAt: request.endedAt,
  completionAssessment: { ...completionAssessment, sessionVersion: version }, snapshot: { ...initial.snapshot, state: request.snapshot } })
if (phase === 'closed-finish') {
  remote = finishedSession(original.finish.request)
  await store.saveSession(initial, remote)
}
const fixture = window.workoutAccess = { original, read: () => store.readLocal(key), reads: 0,
  finish: phase === 'finish', phase, requests: [], rejectFinish: revokedFinish || rejectedSnapshot }
if (footerCompletion) {
  const saveLocal = store.saveLocal.bind(store)
  const countResults = w => w.snapshot.performedSets.length + w.snapshot.cardioResults.length
  fixture.completionWrites = 0
  store.saveLocal = async (workout, ...args) => {
    if (countResults(workout) > countResults(original)) {
      fixture.completionWrites++
      await new Promise((resolve, reject) => {
        fixture.commitCompletion = resolve
        fixture.failCompletion = () => reject(new Error('Fixture write failure'))
      })
    }
    return saveLocal(workout, ...args)
  }
}
const reply = () => ({ userId: remote.userId, dataGeneration: remote.dataGeneration, sessionId: remote.id, version: remote.version })
const api = {
  detail: async () => remote,
  assessment: async () => ({ ...reply(), completionAssessment: remote.completionAssessment, currentAssessment: { state: 'EXCLUDED', reasonCodes: [], evaluation: null } }),
  changes: async () => ({ ...reply(), events: [] }),
  progressAssessment: async () => ({ ...reply(), status: 'ACTIVE', writerEpoch: remote.writerEpoch, localRevision: remote.localRevision,
    kind: 'PROVISIONAL', reasonCodes: [], evaluation: null }),
  snapshot: async (_scope, _id, request) => {
    if (fixture.holdSnapshot) await new Promise((resolve, reject) => {
      fixture.releaseSnapshot = resolve
      fixture.failSnapshot = () => reject({ status: 503 })
    })
    if (fixture.rejectSnapshotReplay) throw { status: 503 }
    const at = new Date().toISOString()
    remote = { ...remote, version: String(BigInt(remote.version) + 1n), localRevision: request.localRevision,
      snapshot: { ...remote.snapshot, state: request.snapshot } }
    return { ...reply(), writerEpoch: request.writerEpoch, acceptedLocalRevision: request.localRevision,
      lastWorkoutSyncedAt: at, snapshotSavedAt: at, duplicate: false, approvalResults: [] }
  },
  finish: async (_scope, _id, request) => {
    fixture.requests.push(JSON.stringify(request))
    if (fixture.rejectFinish) throw { status: 422, code: 'CLOCK_CONTEXT_INVALID' }
    await new Promise((resolve, reject) => {
      fixture.completeRequest = resolve
      if (footerFinish) fixture.failRequest = () => reject({ status: 422, code: 'CLOCK_CONTEXT_INVALID' })
    })
    const duplicate = remote.status === 'FINISHED'
    remote = finishedSession(request, duplicate ? remote.version : String(BigInt(remote.version) + 1n))
    if (fixture.dropFinishResponse) throw new TypeError('Response lost after saving')
    return { ...reply(), status: remote.status, writerEpoch: remote.writerEpoch, acceptedLocalRevision: remote.localRevision,
      currentVersion: remote.version, deletedAt: null, snapshotSavedAt: remote.closedAt, lastWorkoutSyncedAt: remote.closedAt,
      endedAt: remote.endedAt, closedAt: remote.closedAt, completionAssessment: remote.completionAssessment, approvalResults: [], duplicate }
  },
}
const acquire = key => acquireReviewEditor(storage, editorLockName(key))
if (revokedFinish) {
  fixture.revoke = () => {
    for (const db of [workoutConnection, editorConnection]) {
      db.close()
      db.dispatchEvent(new Event('close'))
    }
  }
}
const controller = new LocalWorkoutController(store, () => true, revokedFinish ? acquire : undefined, recoveringFinish ? {
  api, online: () => navigator.onLine, onServer: server => {
    if (server.status !== 'FINISHED') return
    if (footerFinish) fixture.beginSummary = fixture.prepareSummary
    else fixture.showSummary?.()
  },
} : undefined)
fixture.state = controller.getSnapshot
if (phase === 'finish-lock' || phase === 'closed-finish') {
  const lease = await acquireEditor(key)
  if (!lease) throw Error('Could not hold the previous screen lock')
  fixture.release = lease.release
}
const closed = new ClosedWorkoutController(api, store, initial, initial.id, () => true, undefined, revokedFinish ? acquire : undefined)
fixture.closed = closed.getSnapshot
fixture.rejectOrdinaryWrite = async () => {
  const previous = await store.readLocal(key)
  const next = applyLocalChange(previous, w => { w.weightClock.observedAt = new Date().toISOString() }, true)
  try { await store.saveLocal(next, previous.editVersion, () => true) }
  catch (error) { if (error instanceof LocalWriteBlocked) return true; throw error }
  return false
}

function Summary({ onBack }) {
  const state = useSyncExternalStore(closed.subscribe, closed.getSnapshot)
  useEffect(() => {
    void closed.open()
    return () => closed.stop()
  }, [])
  return <ClosedWorkoutView state={state} controller={closed} summary onBack={onBack} />
}

function AccessFixture() {
  const [entered, setEntered] = useState(true)
  const [summary, setSummary] = useState(phase === 'closed-finish')
  const [preparingSummary, setPreparingSummary] = useState(false)
  fixture.showSummary = () => setSummary(true)
  fixture.prepareSummary = () => setPreparingSummary(true)
  return <AppShell authenticated focused={entered} tab="home" onNavigate={() => {}}>
    {entered ? summary ? <Summary onBack={() => setEntered(false)} /> : <LocalWorkoutScreen server={initial} policy={settings} definitions={exercises} authorized={() => true} authenticated={recoveringFinish}
      assessmentApi={footerCompletion ? api : undefined}
      editor={controller} preparingSummary={preparingSummary} onHome={() => setEntered(false)} recheckBeforeOpen={async () => {
        fixture.reads++
        if (phase === 'retry' && fixture.reads === 1) return new Promise(resolve => { fixture.failRead = () => resolve(null) })
        return recoveringFinish ? remote : latest
      }} /> : <button onClick={() => setEntered(true)}>운동 이어가기</button>}
  </AppShell>
}
createRoot(document.getElementById('root')).render(<AccessFixture />)
