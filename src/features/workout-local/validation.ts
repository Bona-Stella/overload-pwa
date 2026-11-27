import * as v from '../workout-online/validation.ts'
import type { LocalWorkout } from './types.ts'
import { isRestMiddleSeconds, REST_TEST_MIDDLE_SECONDS } from '../workout-flow/rest-alerts.ts'
const dictionary = (value: unknown, guard: (x: unknown) => boolean) => v.object(value) && Object.values(value).every(guard)
const ms = (x: unknown) => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0
function frozen(value: unknown, kind: 'snapshot' | 'resolution', owner: Record<string, unknown>) {
  if (value === undefined || value === null) return true
  if (!v.object(value) || !v.object(value.request) || typeof value.requestJson !== 'string' || value.requestJson !== JSON.stringify(value.request)
    || value.rejected !== undefined && typeof value.rejected !== 'boolean') return false
  const r = value.request
  if (r.dataGeneration !== owner.dataGeneration || r.editorDeviceId !== owner.editorDeviceId || r.writerEpoch !== owner.writerEpoch) return false
  return kind === 'snapshot' ? v.counter(r.localRevision) && v.snapshot(r.snapshot) && v.array(value.localOnlyIds, v.uuid)
    : v.counter(r.expectedSessionVersion) && v.counter(r.expectedLocalRevision) && v.uuid(r.sessionExerciseId) && v.array(r.pendingRequestIds, v.uuid) && v.instant(r.occurredAt)
      && (r.decision === 'KEEP_CURRENT' ? r.newApprovalRequest === null : r.decision === 'REAPPROVE' && v.object(r.newApprovalRequest) && v.uuid(r.newApprovalRequest.id)
        && v.counter(r.newApprovalRequest.sequence) && v.counter(r.newApprovalRequest.expectedRoutineVersion) && v.decimal(r.newApprovalRequest.previousApprovedWeightKg) && v.decimal(r.newApprovalRequest.nextApprovedWeightKg))
}
function finish(value: unknown, owner: Record<string, unknown>) {
  if (value === undefined) return true
  if (!v.object(value) || !v.instant(value.endedAt) || !v.snapshot(value.snapshot)) return false
  const r = value.request, a = value.ack
  if (r === undefined) return value.requestJson === undefined && a === undefined
  if (!v.object(r) || r.dataGeneration !== owner.dataGeneration || r.editorDeviceId !== owner.editorDeviceId || r.writerEpoch !== owner.writerEpoch
    || r.endedAt !== value.endedAt || !v.counter(r.localRevision) || !v.snapshot(r.snapshot) || value.requestJson !== JSON.stringify(r)) return false
  return a === undefined || v.object(a) && a.userId === owner.userId && a.dataGeneration === owner.dataGeneration && a.sessionId === owner.sessionId
    && a.writerEpoch === owner.writerEpoch && a.acceptedLocalRevision === r.localRevision && a.status === 'FINISHED'
    && v.instant(a.endedAt) && Date.parse(a.endedAt) === Date.parse(value.endedAt) && v.instant(a.closedAt) && v.instant(a.snapshotSavedAt) && v.instant(a.lastWorkoutSyncedAt)
    && v.counter(a.version) && v.counter(a.currentVersion) && BigInt(a.currentVersion) >= BigInt(a.version) && typeof a.duplicate === 'boolean'
    && v.nullable(a.deletedAt, v.instant) && v.approvalResults(a.approvalResults) && v.assessment(a.completionAssessment)
}
function replacementSlots(value: unknown, plan: unknown, snapshot: unknown) {
  if (value === undefined) return true
  if (!v.object(value) || !v.initialPlan(plan) || !v.snapshot(snapshot)) return false
  return Object.entries(value).every(([target, source]) => v.uuid(target) && v.uuid(source)
    && plan.weightExercises.some(p => p.sessionExerciseId === source)
    && snapshot.sessionExercises.some(e => e.id === target && e.kind === 'WEIGHT'))
}
export function localWorkout(value: unknown): value is LocalWorkout {
  return v.object(value) && value.schemaVersion === 2 && v.uuid(value.userId) && v.counter(value.dataGeneration) && v.uuid(value.sessionId)
    && v.uuid(value.editorDeviceId) && v.counter(value.writerEpoch) && v.instant(value.startedAt) && v.initialPlan(value.initialPlan) && v.snapshot(value.snapshot)
    && (value.weightClock===undefined||v.object(value.weightClock)&&typeof value.weightClock.visible==='boolean'&&v.nullable(value.weightClock.runningSince,v.instant)&&v.instant(value.weightClock.observedAt))
    && v.counter(value.editVersion) && v.counter(value.localRevision) && v.counter(value.serverRevision) && v.counter(value.serverVersion)
    && frozen(value.pendingSnapshot, 'snapshot', value) && frozen(value.pendingResolution, 'resolution', value)
    && finish(value.finish, value)
    && (value.confirmedDeletedSetIds === undefined || v.array(value.confirmedDeletedSetIds, v.uuid)) && (value.confirmedDeletedCardioIds === undefined || v.array(value.confirmedDeletedCardioIds, v.uuid))
    && ['CLEAN', 'UNSENT', 'UNKNOWN'].includes(String(value.syncState)) && dictionary(value.presence, x => ['LOCAL_ONLY', 'SERVER_CONFIRMED', 'UNKNOWN'].includes(String(x)))
    && dictionary(value.drafts, x => v.object(x) && [x.weight, x.reps, x.additionalWeight].every(field => field === undefined || v.text(field)))
    && dictionary(value.weights, x => v.object(x) && v.text(x.value) && (x.initial === undefined || x.initial === true) && v.object(x.context) && (x.context.kind === 'APPROVAL_REQUEST' ? v.uuid(x.context.requestId) : ['INITIAL_APPROVED', 'TODAY_ONLY'].includes(String(x.context.kind)) && x.context.requestId === null))
    && dictionary(value.timers, x => v.object(x) && v.nullable(x.startedAt, v.instant) && v.nullable(x.runningSince, v.instant) && ms(x.accumulatedMs)
      && v.array(x.segments, s => v.object(s) && v.instant(s.startedAt) && v.instant(s.stoppedAt)) && v.text(x.distance) && (x.speed === undefined || v.text(x.speed))
      && (x.distanceSource === undefined || x.distanceSource === 'estimated' || x.distanceSource === 'derived' || x.distanceSource === 'manual')
      && (x.speedSource === undefined || x.speedSource === 'manual') && v.text(x.bpm) && (x.bpmConfirmed === undefined || x.bpmConfirmed === true)
      && v.nullable(x.correctedSeconds, v.text) && typeof x.reviewing === 'boolean')
    && v.object(value.cancelled) && v.array(value.cancelled.sets, x => v.snapshot({ ...value.snapshot as object, performedSets: [x] }))
    && v.array(value.cancelled.cardio, x => v.snapshot({ ...value.snapshot as object, cardioResults: [x] }))
    && v.text(value.currentExerciseId) && dictionary(value.exerciseNames, v.text) && v.approvalResults(value.approvalResults)
    && (value.warmupCompleted === undefined || typeof value.warmupCompleted === 'boolean')
    && (value.warmupCompletedAt === undefined || v.instant(value.warmupCompletedAt))
    && (value.startedWeights === undefined || dictionary(value.startedWeights, v.instant))
    && (value.preparationFrom === undefined || dictionary(value.preparationFrom, v.uuid))
    && (value.equipmentMemos === undefined || dictionary(value.equipmentMemos, v.text))
    && replacementSlots(value.replacementSlots, value.initialPlan, value.snapshot)
    && (value.originalCombinationChanged === undefined || typeof value.originalCombinationChanged === 'boolean')
    && (value.excludedSetOrdinals === undefined || dictionary(value.excludedSetOrdinals, x => v.array(x, v.count) && new Set(x as number[]).size === (x as number[]).length))
    && v.array(value.recordedContexts, x => v.object(x) && v.uuid(x.setId) && v.text(x.approvalStateAtRecording) && v.nullable(x.approvedWeightKgAtRecording, v.decimal))
    && v.object(value.restPolicy) && v.count(value.restPolicy.restLowSeconds) && v.count(value.restPolicy.restMediumSeconds) && v.count(value.restPolicy.restHighSeconds)
    && (value.rests === undefined || dictionary(value.rests, exerciseRest))
    && (value.rest === undefined || v.nullable(value.rest, exerciseRest))
}
const exerciseRest = (x: unknown) => v.object(x) && v.instant(x.startedAt) && v.instant(x.endsAt) && v.count(x.seconds) && v.uuid(x.sessionExerciseId) && v.count(x.ordinal)
  && (x.middleAt === undefined || x.middleAt === REST_TEST_MIDDLE_SECONDS || isRestMiddleSeconds(x.middleAt))
