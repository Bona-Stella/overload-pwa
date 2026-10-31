import type { CardioPlan, CompletionAssessment, InitialPlan, Routine, RoutineList, Session, Snapshot, ApprovalResult } from './types.ts'

export const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
export const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(v)
export const counter = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9][0-9]{0,18})$/.test(v) && (v.length < 19 || v <= '9223372036854775807')
export const decimal = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9][0-9]{0,13})(\.[0-9]{0,5}[1-9])?$/.test(v)
export const count = (v: unknown): v is number => Number.isInteger(v) && typeof v === 'number' && v >= 1 && v <= 2147483647
export const instant = (v: unknown): v is string => typeof v === 'string' && /^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$/.test(v) && Number.isFinite(Date.parse(v))
export const nullable = (v: unknown, guard: (v: unknown) => boolean) => v === null || guard(v)
export const array = (v: unknown, guard: (v: unknown) => boolean): v is unknown[] => Array.isArray(v) && v.every(guard)
export const text = (v: unknown): v is string => typeof v === 'string'
export const name = (v: unknown): v is string => text(v) && v.trim().length > 0 && !v.includes('\0') && !/[\uD800-\uDFFF]/u.test(v)
export const status = (v: unknown) => v === 'ACTIVE' || v === 'FINISHED' || v === 'AUTO_CLOSED'
export const targets = (v: Record<string, unknown>) => count(v.setCount) && count(v.minReps) && count(v.maxReps) && v.minReps <= v.maxReps
export const unique = (values: { id: string }[]) => new Set(values.map(v => v.id)).size === values.length
export function cardioPlan(v: unknown): v is CardioPlan {
  return object(v) && ['TREADMILL', 'BIKE', 'OUTDOOR', 'STAIRS', 'OTHER'].includes(String(v.kind)) && name(v.name) && count(v.targetSeconds) && v.targetSeconds <= 86400
    && nullable(v.targetDistanceKm, decimal) && nullable(v.inclinePercent, decimal) && nullable(v.resistance, decimal)
    && nullable(v.intensity, x => object(x) && ['SPEED', 'PACE'].includes(String(x.mode)) && decimal(x.value))
}
export function routineList(v: unknown): v is RoutineList {
  return object(v) && uuid(v.userId) && counter(v.dataGeneration) && array(v.routines, x => object(x) && uuid(x.id) && name(x.name) && counter(x.version))
    && unique(v.routines as RoutineList['routines'])
}
export function routine(v: unknown): v is Routine {
  return object(v) && uuid(v.userId) && counter(v.dataGeneration) && uuid(v.id) && counter(v.version) && name(v.name)
    && array(v.weightPlacements, x => object(x) && uuid(x.id) && uuid(x.exerciseDefinitionId) && name(x.exerciseName) && targets(x)
      && decimal(x.initialWeightKg) && decimal(x.approvedWeightKg) && nullable(x.deletedAt, instant))
    && array(v.cardioPlacements, x => object(x) && uuid(x.id) && cardioPlan(x.plan) && nullable(x.deletedAt, instant))
    && unique([...(v.weightPlacements as Routine['weightPlacements']), ...(v.cardioPlacements as Routine['cardioPlacements'])])
}
export function initialPlan(v: unknown): v is InitialPlan {
  return object(v) && v.schemaVersion === 1 && uuid(v.routineId) && name(v.routineName) && counter(v.routineVersion)
    && array(v.weightExercises, x => object(x) && uuid(x.sessionExerciseId) && uuid(x.sourcePlacementId) && uuid(x.exerciseDefinitionId) && name(x.exerciseName)
      && targets(x) && decimal(x.initialWeightKg) && decimal(x.approvedWeightKg))
    && array(v.cardioActivities, x => object(x) && uuid(x.sessionActivityId) && uuid(x.sourcePlacementId) && cardioPlan(x.plan))
}
export function approvalResults(v: unknown): v is ApprovalResult[] {
  return array(v, x => object(x) && uuid(x.id) && uuid(x.sessionExerciseId) && counter(x.sequence) && ['APPLIED', 'PENDING', 'NOT_APPLIED'].includes(String(x.status))
    && nullable(x.reason, text) && nullable(x.approvalEventId, uuid) && nullable(x.routineVersionBefore, counter) && nullable(x.routineVersionAfter, counter)
    && nullable(x.resolvedAt, instant) && nullable(x.resolvedByRequestId, uuid))
}
function weightContext(v: unknown) {
  return object(v) && (v.kind === 'APPROVAL_REQUEST' ? uuid(v.requestId) : ['INITIAL_APPROVED', 'TODAY_ONLY', 'UNVERIFIED'].includes(String(v.kind)) && v.requestId === null)
}
export function snapshot(v: unknown): v is Snapshot {
  return object(v) && array(v.sessionExercises, x => object(x) && uuid(x.id) && (x.kind === 'WEIGHT' ? uuid(x.exerciseDefinitionId) : x.kind === 'CARDIO' && x.exerciseDefinitionId === null))
    && object(v.appliedPlan) && v.appliedPlan.schemaVersion === 1
    && array(v.appliedPlan.weightExercises, x => object(x) && uuid(x.sessionExerciseId) && targets(x))
    && array(v.appliedPlan.cardioActivities, x => object(x) && uuid(x.sessionActivityId) && cardioPlan(x.plan))
    && array(v.performedSets, x => object(x) && uuid(x.id) && uuid(x.sessionExerciseId) && count(x.ordinal) && decimal(x.weightKg) && count(x.reps) && instant(x.completedAt) && weightContext(x.weightContext))
    && array(v.cardioResults, x => object(x) && uuid(x.id) && uuid(x.sessionActivityId) && instant(x.occurredAt)
      && (x.status === 'SKIPPED' ? nullable(x.startedAt, instant) && x.result === null : x.status === 'COMPLETED' && instant(x.startedAt) && object(x.result)
        && Number.isSafeInteger(x.result.timerMs) && (x.result.timerMs as number) >= 0 && count(x.result.activeMs) && x.result.activeMs <= 86400000
        && typeof x.result.corrected === 'boolean' && nullable(x.result.distanceKm, decimal) && nullable(x.result.averageBpm, count)))
    && array(v.deletedPerformedSetIds, uuid) && array(v.deletedCardioResultIds, uuid)
    && array(v.approvalRequests, x => object(x) && uuid(x.id) && uuid(x.sessionExerciseId) && counter(x.sequence) && nullable(x.previousRequestId, uuid)
      && counter(x.expectedRoutineVersion) && decimal(x.previousApprovedWeightKg) && decimal(x.nextApprovedWeightKg) && instant(x.occurredAt))
}
export function assessment(v: unknown): v is CompletionAssessment {
  return object(v) && v.schemaVersion === 1 && v.ruleVersion === 'task009-completion-v1' && counter(v.sessionVersion) && instant(v.assessedAt)
    && (v.overallWeightPlanComplete === null || typeof v.overallWeightPlanComplete === 'boolean')
    && array(v.exercises, x => object(x) && uuid(x.sessionExerciseId) && typeof x.eligible === 'boolean' && array(x.reasonCodes, text)
      && nullable(x.comparisonContext, c => object(c) && uuid(c.routineId) && uuid(c.sourcePlacementId) && uuid(c.exerciseDefinitionId)
        && count(c.plannedSetCount) && count(c.minReps) && count(c.maxReps) && decimal(c.approvedWeightKg) && c.unit === 'KG')
      && array(x.evaluatedPerformedSetIds, uuid) && array(x.evaluatedReps, count) && counter(x.repsSum)
      && ['INCREASE', 'DECREASE', 'MAINTAIN', 'UNAVAILABLE'].includes(String(x.advice)) && text(x.adviceReason)
      && nullable(x.benchmarkEvidence, b => object(b) && uuid(b.sessionId) && counter(b.sessionVersion) && instant(b.endedAt)
        && array(b.performedSetIds, uuid) && array(b.reps, count) && counter(b.repsSum) && text(b.ruleVersion)))
}
export function session(v: unknown): v is Session {
  return object(v) && uuid(v.userId) && counter(v.dataGeneration) && uuid(v.id) && status(v.status) && counter(v.version)
    && instant(v.startedAt) && text(v.workoutDate) && /^\d{4}-\d{2}-\d{2}$/.test(v.workoutDate) && text(v.startedTimeZone)
    && uuid(v.editorDeviceId) && counter(v.writerEpoch) && counter(v.localRevision) && instant(v.lastWorkoutSyncedAt)
    && initialPlan(v.initialPlan) && nullable(v.lastSnapshotSavedAt, instant) && object(v.snapshot) && snapshot(v.snapshot.state)
    && approvalResults(v.snapshot.approvalResults) && array(v.snapshot.recordedContexts, x => object(x) && uuid(x.setId) && text(x.approvalStateAtRecording) && nullable(x.approvedWeightKgAtRecording, decimal))
    && nullable(v.endedAt, instant) && nullable(v.closedAt, instant) && nullable(v.deletedAt, instant) && nullable(v.completionAssessment, assessment)
}
/** Normalize user drafts without rounding or binary floating-point conversion. */
export function decimalDraft(value: string): string {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{0,6})?$/.test(trimmed)) throw new Error('소수점 여섯 자리 이내의 0 이상 값을 입력해 주세요.')
  const [whole, fraction = ''] = trimmed.split('.')
  const result = (whole.replace(/^0+(?=\d)/, '') || '0') + (fraction.replace(/0+$/, '') ? '.' + fraction.replace(/0+$/, '') : '')
  if (!decimal(result)) throw new Error('허용 중량 범위를 확인해 주세요.')
  return result
}
export function countDraft(value: string): number {
  if (!/^\d+$/.test(value.trim())) throw new Error('양의 정수를 입력해 주세요.')
  const result = Number(value.trim())
  if (!count(result)) throw new Error('1~2147483647 범위의 정수를 입력해 주세요.')
  return result
}
