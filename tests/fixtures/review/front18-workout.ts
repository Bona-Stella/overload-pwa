import { LocalWorkoutController } from '../../../src/features/workout-local/controller.ts'
import { changeWeight, completeCardio, completeSet, completeWarmup, createLocalWorkout, draftFor, editDraft, emptyTimer, startExercise } from '../../../src/features/workout-local/model.ts'
import type { LocalWorkout } from '../../../src/features/workout-local/types.ts'
import { LocalStoreError } from '../../../src/features/workout-online/storage.ts'
import type { ProgressAssessment, Session, SnapshotRequest } from '../../../src/features/workout-online/types.ts'
import { newId } from '../../../src/id.ts'
import { reviewSample } from './routine-samples.ts'
import { reviewRest } from './workout-model.ts'

export type WorkoutExample = 'reps' | 'weight' | 'reps-range' | 'weight-range' | 'extra' | 'time' | 'time-range'
  | 'distance' | 'speed' | 'speed-only' | 'estimated-speed' | 'derived-distance' | 'motion' | 'bpm'
  | 'undo' | 'cardio-undo' | 'done' | 'assessment' | 'future-finish' | 'warmup' | 'read-only' | 'offline' | 'offline-error' | 'offline-empty' | 'open-error' | 'approval'

export function createWorkoutExample(example: WorkoutExample) {
  const sample = reviewSample('normal').sessions[0]
  const now = Date.now()
  const startedAt = new Date(now - 120_000).toISOString()
  const cardio = ['time', 'time-range', 'distance', 'speed', 'speed-only', 'estimated-speed', 'derived-distance', 'motion', 'bpm', 'cardio-undo'].includes(example)
  const first = { ...sample.initialPlan.weightExercises[0], setCount: 3, minReps: 7, maxReps: 9,
    ...(example === 'extra' ? { loadType: 'BODYWEIGHT' as const } : {}) }
  const second = { ...first, exerciseName: '덤벨 프레스', sessionExerciseId: newId(), sourcePlacementId: newId() }
  const activity = structuredClone(sample.initialPlan.cardioActivities[0])
  if (example === 'motion') {
    Object.assign(activity.plan, { kind: 'OTHER', name: '기타 유산소', targetDistanceKm: null, intensity: null, inclinePercent: null })
  }
  const done = ['done', 'assessment', 'future-finish'].includes(example)
  const weightExercises = cardio ? [] : done ? [{ ...first, setCount: 1 }] : [first, second]
  const cardioActivities = cardio ? [activity] : []
  let remote: Session = { ...sample, id: newId(), status: 'ACTIVE', version: '0', localRevision: '0', startedAt,
    endedAt: null, closedAt: null, lastSnapshotSavedAt: null, lastWorkoutSyncedAt: startedAt,
    initialPlan: { ...sample.initialPlan, weightExercises, cardioActivities },
    snapshot: { ...sample.snapshot, state: { ...sample.snapshot.state, appliedPlan: { schemaVersion: 2, weightExercises, cardioActivities },
      sessionExercises: [...weightExercises.map(item => ({ id: item.sessionExerciseId, kind: 'WEIGHT' as const, standardExerciseId: item.standardExerciseId })),
        ...cardioActivities.map(item => ({ id: item.sessionActivityId, kind: 'CARDIO' as const, standardExerciseId: null }))] } },
  }
  const initial = remote
  let local = createLocalWorkout(initial, reviewRest)
  const id = local.currentExerciseId
  if (example !== 'warmup') { completeWarmup(local, now - 90_000); startExercise(local, id, now - 80_000) }
  if (cardio) {
    local.timers[id] = { ...emptyTimer(), startedAt: new Date(now - 80_000).toISOString(),
      accumulatedMs: example === 'time' ? 0 : 5100, reviewing: true,
      ...(example === 'time-range' ? { correctedSeconds: '0' } : {}),
      ...(example === 'distance' ? { distance: '0.0001' } : {}),
      ...(example === 'speed' ? { speed: '-1' } : {}),
      ...(example === 'speed-only' ? { speed: '10', speedSource: 'manual' as const } : {}),
      ...(example === 'estimated-speed' ? { distance: '1', distanceSource: 'estimated' as const, speed: '10', speedSource: 'manual' as const } : {}),
      ...(example === 'derived-distance' ? { distance: '1', distanceSource: 'derived' as const, speed: '10' } : {}),
      ...(example === 'motion' ? { distance: '1' } : {}),
      ...(example === 'bpm' ? { bpm: '301' } : {}),
    }
    if (example === 'cardio-undo') completeCardio(local, id, now, newId)
  } else {
    editDraft(local, id, 1, { weight: example === 'weight' ? '' : example === 'weight-range' ? '-1' : done ? first.approvedWeightKg! : '30',
      reps: example === 'reps-range' ? '0' : done ? '9' : ['reps', 'warmup', 'read-only', 'offline', 'open-error'].includes(example) ? '' : '8',
      ...(example === 'extra' ? { additionalWeight: '-1' } : {}) })
    if (example === 'undo' || done) {
      completeSet(local, id, 1, example === 'future-finish' ? now + 60_000 : now - 60_000, newId)
      if (local.rests) delete local.rests[id]
    }
    if (example === 'approval') {
      changeWeight(local, id, '32.5', true, now, newId)
      const request = local.snapshot.approvalRequests[0]
      local.approvalResults = [{ id: request.id, sessionExerciseId: id, status: 'PENDING', reason: 'ROUTINE_CHANGED' } as LocalWorkout['approvalResults'][number]]
      remote = { ...remote, snapshot: { ...remote.snapshot, state: structuredClone(local.snapshot), approvalResults: structuredClone(local.approvalResults) } }
    }
  }
  let offline = example === 'offline', readFailed = false, failedWrite = false, openFailure = example === 'open-error'
  let snapshotFault: 'none' | 'reject' | 'once' = 'none'
  let finishFault: 'none' | 'lost' | 'reject' = 'none'
  let release: (() => void) | undefined, hold: Promise<void> | undefined
  let deliveryRelease: (() => void) | undefined, deliveryHold: Promise<void> | undefined
  let summaryFault = false, assessmentFault = example === 'assessment'
  const acknowledged = (request: SnapshotRequest) => {
    const at = new Date().toISOString(), version = String(BigInt(remote.version) + 1n)
    remote = { ...remote, version, localRevision: request.localRevision, lastSnapshotSavedAt: at, lastWorkoutSyncedAt: at,
      snapshot: { ...remote.snapshot, state: structuredClone(request.snapshot) } }
    return { userId: remote.userId, dataGeneration: remote.dataGeneration, sessionId: remote.id, writerEpoch: remote.writerEpoch,
      acceptedLocalRevision: request.localRevision, version, snapshotSavedAt: at, lastWorkoutSyncedAt: at, approvalResults: [], duplicate: false }
  }
  const saveLocal = async (next: LocalWorkout, version: string, allowed: () => boolean) => {
    if (hold) await hold
    if (!allowed() || version !== local.editVersion) throw new LocalStoreError()
    if (failedWrite) { failedWrite = false; throw new LocalStoreError() }
    local = structuredClone(next)
  }
  const unavailable = () => { throw new TypeError('Preview transport unavailable') }
  const controller = new LocalWorkoutController({
    openLocal: async () => { if (openFailure) { openFailure = false; throw new LocalStoreError() } return structuredClone(local) },
    readLocal: async () => structuredClone(local), saveLocal, saveSyncLocal: saveLocal, saveSession: async () => {},
  }, () => true, async () => {
    if (example === 'read-only') return null
    let held = true
    return { held: () => held, release: () => { held = false } }
  }, { online: () => !offline, api: {
    detail: async () => { if (readFailed) unavailable(); return structuredClone(remote) },
    routine: async () => structuredClone(reviewSample('normal').routines[0]),
    resolve: async () => { throw { status: 409, code: 'ROUTINE_VERSION_CONFLICT' } },
    snapshot: async (_scope, _id, request) => {
      if (deliveryHold) await deliveryHold
      if (snapshotFault === 'reject') throw { status: 422 }
      if (snapshotFault === 'once') { snapshotFault = 'none'; unavailable() }
      return acknowledged(request)
    },
    finish: async (_scope, _id, request) => {
      if (deliveryHold) await deliveryHold
      if (finishFault === 'lost') unavailable()
      if (finishFault === 'reject') throw { status: 422, code: 'CLOCK_CONTEXT_INVALID' }
      const ack = acknowledged(request)
      const completionAssessment = { schemaVersion: 2 as const, ruleVersion: 'task009-completion-v1' as const,
        sessionVersion: ack.version, assessedAt: ack.snapshotSavedAt, overallWeightPlanComplete: null, exercises: [] }
      remote = { ...remote, status: 'FINISHED', endedAt: request.endedAt, closedAt: ack.snapshotSavedAt, completionAssessment }
      return { ...ack, status: 'FINISHED', currentVersion: ack.version, deletedAt: null, endedAt: request.endedAt,
        closedAt: ack.snapshotSavedAt, completionAssessment }
    },
  } })
  const draft = () => controller.draft(id, 1, { ...draftFor(local, id, 1), weight: '31' })
  const sync = () => controller.change(workout => { workout.snapshot.appliedPlan.weightExercises[0].setCount++ })
  return { controller, initial, id, remote: () => remote, draft, sync, get summaryFault() { return summaryFault },
    assessmentApi: example === 'assessment' ? { progressAssessment: async (): Promise<ProgressAssessment> => {
      await new Promise(resolve => setTimeout(resolve, 620))
      if (assessmentFault) { assessmentFault = false; unavailable() }
      const { userId, dataGeneration, writerEpoch, localRevision, version } = remote
      return { userId, dataGeneration, writerEpoch, localRevision, version, sessionId: remote.id,
        status: 'ACTIVE', kind: 'PROVISIONAL', reasonCodes: [], evaluation: null }
    } } : undefined,
    failWrite: () => { failedWrite = true },
    holdWrite: () => { if (!hold) hold = new Promise(resolve => { release = resolve }) },
    releaseWrite: () => { hold = undefined; release?.(); release = undefined },
    holdDelivery: () => { if (!deliveryHold) deliveryHold = new Promise(resolve => { deliveryRelease = resolve }) },
    releaseDelivery: () => { deliveryHold = undefined; deliveryRelease?.(); deliveryRelease = undefined },
    setOffline: (value: boolean) => { offline = value },
    setReadFailed: (value: boolean) => { readFailed = value },
    setSnapshotFault: (value: typeof snapshotFault) => { snapshotFault = value },
    setFinishFault: (value: typeof finishFault) => { finishFault = value },
    failSummary: () => { summaryFault = true },
    changeWriter: () => { remote = { ...remote, writerEpoch: '2', editorDeviceId: newId() } },
  }
}
