import * as v from '../workout-online/validation.ts'
import type { LocalWorkout } from './types.ts'
const dictionary = (value: unknown, guard: (x: unknown) => boolean) => v.object(value) && Object.values(value).every(guard)
const ms = (x: unknown) => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0
export function localWorkout(value: unknown): value is LocalWorkout {
  return v.object(value) && value.schemaVersion === 1 && v.uuid(value.userId) && v.counter(value.dataGeneration) && v.uuid(value.sessionId)
    && v.uuid(value.editorDeviceId) && v.counter(value.writerEpoch) && v.instant(value.startedAt) && v.initialPlan(value.initialPlan) && v.snapshot(value.snapshot)
    && v.counter(value.editVersion) && v.counter(value.localRevision) && v.counter(value.serverRevision) && v.counter(value.serverVersion)
    && ['CLEAN', 'UNSENT', 'UNKNOWN'].includes(String(value.syncState)) && dictionary(value.presence, x => ['LOCAL_ONLY', 'SERVER_CONFIRMED', 'UNKNOWN'].includes(String(x)))
    && dictionary(value.drafts, x => v.object(x) && v.text(x.weight) && v.text(x.reps))
    && dictionary(value.weights, x => v.object(x) && v.text(x.value) && v.object(x.context) && (x.context.kind === 'APPROVAL_REQUEST' ? v.uuid(x.context.requestId) : ['INITIAL_APPROVED', 'TODAY_ONLY'].includes(String(x.context.kind)) && x.context.requestId === null))
    && dictionary(value.timers, x => v.object(x) && v.nullable(x.startedAt, v.instant) && v.nullable(x.runningSince, v.instant) && ms(x.accumulatedMs)
      && v.array(x.segments, s => v.object(s) && v.instant(s.startedAt) && v.instant(s.stoppedAt)) && v.text(x.distance) && v.text(x.bpm) && v.nullable(x.correctedSeconds, v.text) && typeof x.reviewing === 'boolean')
    && v.object(value.cancelled) && v.array(value.cancelled.sets, x => v.snapshot({ ...value.snapshot as object, performedSets: [x] }))
    && v.array(value.cancelled.cardio, x => v.snapshot({ ...value.snapshot as object, cardioResults: [x] }))
    && v.text(value.currentExerciseId) && dictionary(value.exerciseNames, v.text) && v.approvalResults(value.approvalResults)
    && v.array(value.recordedContexts, x => v.object(x) && v.uuid(x.setId) && v.text(x.approvalStateAtRecording) && v.nullable(x.approvedWeightKgAtRecording, v.decimal))
    && v.object(value.restPolicy) && v.count(value.restPolicy.restLowSeconds) && v.count(value.restPolicy.restMediumSeconds) && v.count(value.restPolicy.restHighSeconds)
    && v.nullable(value.rest, x => v.object(x) && v.instant(x.startedAt) && v.instant(x.endsAt) && v.count(x.seconds) && v.uuid(x.sessionExerciseId) && v.count(x.ordinal))
}
