import type { AuthController } from '../auth/controller.ts'
import type { ExerciseResponse, WorkoutSettingsResponse } from '../workout-read/api.ts'
import type { Scope, Start, RoutineList, Routine, CreateRoutine, UpdateRoutine, Session, SnapshotRequest, SnapshotAck, FinishRequest, FinishAck,
  ActiveResolution, ClosedResolution, ResolutionAck, ClosedResolutionAck, RecordEdit, Recovery, RecordAck, AssessmentView, ChangeEvents } from './types.ts'
import * as v from './validation.ts'

export class WorkoutApiError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, status = 0) { super('운동 요청을 완료하지 못했습니다.'); this.code = code; this.status = status }
}
export type WorkoutTransport = Pick<AuthController, 'workoutRequest'>
const root = '/api/v1/workout-sessions'
const idPath = (root: string, id: string) => { if (!v.uuid(id)) throw new WorkoutApiError('INVALID_REQUEST', 400); return root + '/' + id }
const envelope = (value: unknown, scope: Scope): value is Record<string, unknown> & Scope => {
  if (!v.object(value) || !v.uuid(value.userId) || !v.counter(value.dataGeneration)) throw new WorkoutApiError('RESPONSE_INVALID')
  if (value.userId !== scope.userId) throw new WorkoutApiError('OWNER_MISMATCH')
  if (value.dataGeneration !== scope.dataGeneration) throw new WorkoutApiError('DATA_GENERATION_MISMATCH', 409)
  return true
}
const ack = (x: unknown) => v.object(x) && v.uuid(x.sessionId) && v.counter(x.writerEpoch) && v.counter(x.acceptedLocalRevision) && v.counter(x.version)
  && v.instant(x.snapshotSavedAt) && v.instant(x.lastWorkoutSyncedAt) && typeof x.duplicate === 'boolean' && v.approvalResults(x.approvalResults)
const recordAck = (x: unknown) => v.object(x) && v.uuid(x.sessionId) && v.status(x.status) && v.counter(x.version) && typeof x.changed === 'boolean'
  && v.array(x.changeEventIds, v.uuid) && v.array(x.recoveredIds, v.uuid) && v.array(x.alreadyPresentIds, v.uuid) && v.nullable(x.deletedAt, v.instant)

/** Explicit endpoint calls only. No request replay, queue, merge, or evaluation logic. */
export class WorkoutApi {
  private readonly transport: WorkoutTransport
  constructor(transport: WorkoutTransport) { this.transport = transport }
  private async call<T>(scope: Scope, path: string, method: string, body: unknown, signal: AbortSignal, guard: (value: unknown) => boolean, id?: string, statuses = [200]): Promise<T> {
    if (!v.uuid(scope.userId) || !v.counter(scope.dataGeneration)) throw new WorkoutApiError('INVALID_SCOPE')
    if (v.object(body) && body.dataGeneration !== scope.dataGeneration) throw new WorkoutApiError('DATA_GENERATION_MISMATCH', 409)
    const result = await this.transport.workoutRequest(scope.userId, path, method, body, signal)
    if (!statuses.includes(result.status)) throw new WorkoutApiError('RESPONSE_INVALID', result.status)
    if (!envelope(result.data, scope) || !guard(result.data)) throw new WorkoutApiError('RESPONSE_INVALID', result.status)
    if (id && result.data.id !== id && result.data.sessionId !== id) throw new WorkoutApiError('RESPONSE_INVALID', result.status)
    return result.data as T
  }
  async bootstrap(userId: string, signal: AbortSignal): Promise<{ scope: Scope; exercises: ExerciseResponse['exercises']; settings: WorkoutSettingsResponse; routines: RoutineList['routines'] }> {
    const result = await this.transport.workoutRequest(userId, '/api/v1/routines', 'GET', undefined, signal)
    if (!v.routineList(result.data)) throw new WorkoutApiError('RESPONSE_INVALID')
    const scope = { userId, dataGeneration: result.data.dataGeneration }
    envelope(result.data, scope)
    const [exercises, settings] = await Promise.all([
      this.call<ExerciseResponse>(scope, '/api/v1/exercises', 'GET', undefined, signal, x => v.object(x) && v.array(x.exercises, e => v.object(e) && v.uuid(e.id) && v.name(e.name)) && v.unique(x.exercises as ExerciseResponse['exercises'])),
      this.call<WorkoutSettingsResponse>(scope, '/api/v1/workout-settings', 'GET', undefined, signal, x => v.object(x) && v.count(x.restLowSeconds) && v.count(x.restMediumSeconds) && v.count(x.restHighSeconds)),
    ])
    return { scope, exercises: exercises.exercises, settings, routines: result.data.routines }
  }
  routines(scope: Scope, signal: AbortSignal) { return this.call<RoutineList>(scope, '/api/v1/routines', 'GET', undefined, signal, v.routineList) }
  routine(scope: Scope, id: string, signal: AbortSignal) { return this.call<Routine>(scope, idPath('/api/v1/routines', id), 'GET', undefined, signal, v.routine, id) }
  createRoutine(scope: Scope, body: CreateRoutine, signal: AbortSignal) { return this.call<Routine>(scope, '/api/v1/routines', 'POST', body, signal, v.routine, body.id, [201]) }
  updateRoutine(scope: Scope, id: string, body: UpdateRoutine, signal: AbortSignal) { return this.call<Routine>(scope, idPath('/api/v1/routines', id), 'PUT', body, signal, v.routine, id) }
  removedPlacements(scope: Scope, id: string, signal: AbortSignal) { return this.call<Routine>(scope, idPath('/api/v1/routines', id) + '/removed-placements', 'GET', undefined, signal, v.routine, id) }
  async deleteRoutine(scope: Scope, id: string, expectedVersion: string, signal: AbortSignal) {
    const result = await this.transport.workoutRequest(scope.userId, idPath('/api/v1/routines', id), 'DELETE', { dataGeneration: scope.dataGeneration, expectedVersion }, signal)
    if (result.status !== 204) throw new WorkoutApiError('RESPONSE_INVALID', result.status)
  }
  createExercise(scope: Scope, body: { id: string; dataGeneration: string; name: string }, signal: AbortSignal) {
    return this.call<Scope & { id: string; name: string }>(scope, '/api/v1/exercises', 'POST', body, signal, x => v.object(x) && v.uuid(x.id) && v.name(x.name), body.id, [200, 201])
  }
  renameExercise(scope: Scope, id: string, name: string, signal: AbortSignal) {
    return this.call<Scope & { id: string; name: string }>(scope, idPath('/api/v1/exercises', id), 'PATCH', { dataGeneration: scope.dataGeneration, name }, signal, x => v.object(x) && v.uuid(x.id) && v.name(x.name), id)
  }
  settings(scope: Scope, body: { dataGeneration: string; restLowSeconds: number; restMediumSeconds: number; restHighSeconds: number }, signal: AbortSignal) {
    return this.call<WorkoutSettingsResponse>(scope, '/api/v1/workout-settings', 'PATCH', body, signal, x => v.object(x) && v.count(x.restLowSeconds) && v.count(x.restMediumSeconds) && v.count(x.restHighSeconds))
  }
  start(scope: Scope, request: Start, signal: AbortSignal) { return this.call<Session>(scope, root, 'POST', request, signal, v.session, request.id, [200, 201]) }
  active(scope: Scope, signal: AbortSignal) { return this.call<Scope & { session: Session | null }>(scope, root + '/active', 'GET', undefined, signal,
    x => v.object(x) && (x.session === null || v.session(x.session) && envelope(x.session, scope))) }
  detail(scope: Scope, id: string, signal: AbortSignal) { return this.call<Session>(scope, idPath(root, id), 'GET', undefined, signal, v.session, id) }
  // Later phases may call these typed contracts; 5A mounts no corresponding write controls.
  takeover(scope: Scope, id: string, body: { dataGeneration: string; editorDeviceId: string; expectedWriterEpoch: string }, signal: AbortSignal) { return this.call<Session>(scope, idPath(root, id) + '/takeover', 'POST', body, signal, v.session, id) }
  snapshot(scope: Scope, id: string, body: SnapshotRequest, signal: AbortSignal) { return this.call<SnapshotAck>(scope, idPath(root, id) + '/snapshot', 'PUT', body, signal, ack, id) }
  finish(scope: Scope, id: string, body: FinishRequest, signal: AbortSignal) { return this.call<FinishAck>(scope, idPath(root, id) + '/finish', 'POST', body, signal,
    x => ack(x) && v.object(x) && x.status === 'FINISHED' && v.counter(x.currentVersion) && v.nullable(x.deletedAt, v.instant) && v.instant(x.endedAt) && v.instant(x.closedAt) && v.assessment(x.completionAssessment), id) }
  resolve(scope: Scope, id: string, body: ActiveResolution, signal: AbortSignal) { return this.call<ResolutionAck>(scope, idPath(root, id) + '/approval-resolutions', 'POST', body, signal,
    x => v.object(x) && v.uuid(x.sessionId) && v.counter(x.version) && v.counter(x.writerEpoch) && v.counter(x.localRevision) && v.instant(x.lastWorkoutSyncedAt) && v.approvalResults(x.approvalResults), id) }
  resolveClosed(scope: Scope, id: string, body: ClosedResolution, signal: AbortSignal) { return this.call<ClosedResolutionAck>(scope, idPath(root, id) + '/closed-approval-resolutions', 'POST', body, signal,
    x => v.object(x) && v.uuid(x.sessionId) && v.status(x.status) && v.counter(x.version) && typeof x.changed === 'boolean' && v.approvalResults(x.approvalResults), id) }
  records(scope: Scope, id: string, body: RecordEdit, signal: AbortSignal) { return this.call<RecordAck>(scope, idPath(root, id) + '/records', 'PATCH', body, signal, recordAck, id) }
  recover(scope: Scope, id: string, body: Recovery, signal: AbortSignal) { return this.call<RecordAck>(scope, idPath(root, id) + '/recoveries', 'POST', body, signal, recordAck, id) }
  deleteSession(scope: Scope, id: string, expectedVersion: string, signal: AbortSignal) { return this.call<RecordAck>(scope, idPath(root, id), 'DELETE', { dataGeneration: scope.dataGeneration, expectedVersion }, signal, recordAck, id) }
  assessment(scope: Scope, id: string, signal: AbortSignal) { return this.call<AssessmentView>(scope, idPath(root, id) + '/assessment', 'GET', undefined, signal,
    x => v.object(x) && v.uuid(x.sessionId) && v.status(x.status) && v.counter(x.version) && v.nullable(x.completionAssessment, v.assessment) && v.object(x.currentAssessment)
      && ['EVALUATED', 'EXCLUDED'].includes(String(x.currentAssessment.state)) && v.array(x.currentAssessment.reasonCodes, v.text)
      && (x.currentAssessment.advice === null || x.currentAssessment.advice === 'UNAVAILABLE') && v.nullable(x.currentAssessment.evaluation, v.assessment), id) }
  changes(scope: Scope, id: string, signal: AbortSignal) { return this.call<ChangeEvents>(scope, idPath(root, id) + '/record-change-events', 'GET', undefined, signal,
    x => v.object(x) && v.uuid(x.sessionId) && v.counter(x.version) && v.array(x.events, e => v.object(e) && v.uuid(e.id) && v.uuid(e.recordId)
      && ['SET', 'CARDIO', 'SESSION'].includes(String(e.recordKind)) && ['CORRECTED', 'DELETED', 'RECOVERED'].includes(String(e.changeKind))
      && v.nullable(e.before, v.object) && v.nullable(e.after, v.object) && v.nullable(e.changeContext, v.object) && v.instant(e.recordedAt)), id) }
}
