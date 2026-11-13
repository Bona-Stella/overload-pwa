import type { AuthController } from '../auth/controller.ts'
import type { ProgressAssessment, CardioActivity, CatalogExercise, StandardExerciseDetail, WorkoutSettingsResponse, StandardExercise, Manufacturer, Scope, Start, RoutineList, Routine, CreateRoutine, UpdateRoutine, Session, SnapshotRequest, SnapshotAck, FinishRequest, FinishAck,
  ActiveResolution, ClosedResolution, ResolutionAck, ClosedResolutionAck, RecordEdit, Recovery, RecordAck, AssessmentView, ChangeEvents, ClosedPage, ClosedCursor } from './types.ts'
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
  async bootstrap(userId: string, signal: AbortSignal): Promise<{ scope: Scope; exercises: StandardExercise[]; manufacturers: Manufacturer[]; settings: WorkoutSettingsResponse; routines: RoutineList['routines'] }> {
    const result = await this.transport.workoutRequest(userId, '/api/v1/routines', 'GET', undefined, signal)
    if (!v.routineList(result.data)) throw new WorkoutApiError('RESPONSE_INVALID')
    const scope = { userId, dataGeneration: result.data.dataGeneration }
    envelope(result.data, scope)
    const [catalog, manufacturers, settings] = await Promise.all([
      this.catalog(userId, signal),
      this.manufacturers(userId, signal),
      this.call<WorkoutSettingsResponse>(scope, '/api/v1/workout-settings', 'GET', undefined, signal, x => v.object(x) && v.count(x.restLowSeconds) && v.count(x.restMediumSeconds) && v.count(x.restHighSeconds)),
    ])
    return { scope, exercises: catalog, manufacturers, settings, routines: result.data.routines }
  }
  async catalog(userId: string, signal: AbortSignal): Promise<StandardExercise[]> {
    const result = await this.transport.workoutRequest(userId, '/api/v1/standard-exercises/search-data', 'GET', undefined, signal)
    const data = result.data
    if (result.status !== 200 || !v.object(data) || data.schemaVersion !== 1 || !v.array(data.exercises, e => v.object(e) && v.uuid(e.id) && v.name(e.name) && v.array(e.aliases, v.name) && (e.muscles===undefined || v.array(e.muscles,m=>v.object(m)&&v.uuid(m.id)&&v.name(m.groupCode)&&v.name(m.name)&&['PRIMARY','SECONDARY'].includes(String(m.role)))))) throw new WorkoutApiError('RESPONSE_INVALID')
    return data.exercises as StandardExercise[]
  }
  async publicCatalog(userId: string, signal: AbortSignal): Promise<CatalogExercise[]> {
    const { status, data } = await this.transport.workoutRequest(userId, '/api/v1/standard-exercises/catalog', 'GET', undefined, signal)
    if (status !== 200 || !v.object(data) || !v.array(data.exercises, e => v.object(e) && v.uuid(e.id) && v.name(e.name)
      && v.array(e.aliases, v.name) && v.array(e.muscles, m => v.object(m) && v.uuid(m.id) && v.name(m.groupCode) && v.name(m.name)
        && ['PRIMARY', 'SECONDARY'].includes(String(m.role)))
      && ['WEIGHT', 'CARDIO', 'STATIC_HOLD', 'STRETCH', 'OTHER'].includes(String(e.exerciseType))
      && ['SETS_REPS', 'CARDIO', 'HOLD_DURATION', 'UNSPECIFIED'].includes(String(e.recordMethod))
      && v.nullable(e.instructionsKo, v.name) && v.nullable(e.equipmentDescription, v.name))) throw new WorkoutApiError('RESPONSE_INVALID')
    return data.exercises as CatalogExercise[]
  }
  async exerciseDetail(userId: string, exerciseId: string, signal: AbortSignal): Promise<StandardExerciseDetail> {
    const { status, data } = await this.transport.workoutRequest(userId, idPath('/api/v1/standard-exercises', exerciseId), 'GET', undefined, signal)
    const muscle = (m: unknown) => v.object(m) && v.uuid(m.id) && v.name(m.groupCode) && v.name(m.name)
    if (status !== 200 || !v.object(data) || data.id !== exerciseId || !v.name(data.name) || !v.array(data.aliases, v.name)
      || !['WEIGHT', 'CARDIO', 'STATIC_HOLD', 'STRETCH', 'OTHER'].includes(String(data.exerciseType))
      || !['SETS_REPS', 'CARDIO', 'HOLD_DURATION', 'UNSPECIFIED'].includes(String(data.recordMethod))
      || !v.nullable(data.equipmentDescription, v.name) || !v.nullable(data.jointType, x => ['COMPOUND', 'ISOLATION', 'OTHER'].includes(String(x)))
      || !v.array(data.primaryMuscles, m => muscle(m) && v.object(m) && v.count(m.primaryOrder))
      || !v.array(data.secondaryMuscles, muscle)
      || !v.nullable(data.pplSplit, x => ['PUSH', 'PULL', 'LEGS'].includes(String(x)))
      || !v.nullable(data.frontBackSplit, x => ['FRONT', 'BACK'].includes(String(x)))
      || !v.array(data.instructionSteps, v.name) || typeof data.selectableForRoutine !== 'boolean') throw new WorkoutApiError('RESPONSE_INVALID', status)
    const detail = data as StandardExerciseDetail
    if (!v.unique(detail.primaryMuscles) || !v.unique(detail.secondaryMuscles)
      || new Set(detail.primaryMuscles.map(m => m.primaryOrder)).size !== detail.primaryMuscles.length) throw new WorkoutApiError('RESPONSE_INVALID', status)
    return detail
  }
  async cardioActivities(userId: string, signal: AbortSignal): Promise<CardioActivity[]> {
    const { status, data } = await this.transport.workoutRequest(userId, '/api/v1/standard-exercises/cardio-choices', 'GET', undefined, signal)
    if (status !== 200 || !v.object(data) || !v.array(data.activities, a => v.object(a) && v.uuid(a.id) && v.uuid(a.activityId)
      && v.array(a.aliases, v.name) && ['RUNNING', 'WALKING', 'CYCLING'].includes(String(a.category)) && v.name(a.name)
      && ['TREADMILL', 'BIKE', 'OUTDOOR', 'STAIRS', 'OTHER'].includes(String(a.kind)))) throw new WorkoutApiError('RESPONSE_INVALID')
    return data.activities as CardioActivity[]
  }
  async manufacturers(userId: string, signal: AbortSignal): Promise<Manufacturer[]> {
    const result = await this.transport.workoutRequest(userId, '/api/v1/manufacturers', 'GET', undefined, signal)
    const data = result.data
    if (result.status !== 200 || !v.object(data) || !v.array(data.manufacturers, e => v.object(e) && v.uuid(e.id) && v.name(e.name)) || !v.unique(data.manufacturers as Manufacturer[])) throw new WorkoutApiError('RESPONSE_INVALID')
    return data.manufacturers as Manufacturer[]
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
  settings(scope: Scope, body: { dataGeneration: string; restLowSeconds: number; restMediumSeconds: number; restHighSeconds: number }, signal: AbortSignal) {
    return this.call<WorkoutSettingsResponse>(scope, '/api/v1/workout-settings', 'PATCH', body, signal, x => v.object(x) && v.count(x.restLowSeconds) && v.count(x.restMediumSeconds) && v.count(x.restHighSeconds))
  }
  start(scope: Scope, request: Start, signal: AbortSignal) { return this.call<Session>(scope, root, 'POST', request, signal, v.session, request.id, [200, 201]) }
  active(scope: Scope, signal: AbortSignal) { return this.call<Scope & { session: Session | null }>(scope, root + '/active', 'GET', undefined, signal,
    x => v.object(x) && (x.session === null || v.session(x.session) && envelope(x.session, scope))) }
  detail(scope: Scope, id: string, signal: AbortSignal) { return this.call<Session>(scope, idPath(root, id), 'GET', undefined, signal, v.session, id) }
  closed(scope: Scope, cursor: ClosedCursor | null, signal: AbortSignal) {
    const query = new URLSearchParams({ limit: '20', ...(cursor ?? {}) })
    return this.call<ClosedPage>(scope, root + '/closed?' + query, 'GET', undefined, signal, x => v.object(x)
      && v.array(x.sessions, s => v.object(s) && v.uuid(s.id) && v.text(s.routineName) && ['FINISHED', 'AUTO_CLOSED'].includes(String(s.status)) && v.counter(s.version)
        && v.text(s.workoutDate) && v.instant(s.startedAt) && v.nullable(s.endedAt, v.instant) && v.instant(s.closedAt) && v.nullable(s.deletedAt, v.instant))
      && v.nullable(x.next, n => v.object(n) && v.instant(n.beforeClosedAt) && v.uuid(n.beforeId)))
  }
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
  progressAssessment(scope: Scope, id: string, signal: AbortSignal) {
    return this.call<ProgressAssessment>(scope, idPath(root, id) + '/progress-assessment', 'GET', undefined, signal,
      x => v.object(x) && v.uuid(x.sessionId) && x.status === 'ACTIVE' && x.kind === 'PROVISIONAL'
        && v.counter(x.version) && v.counter(x.writerEpoch) && v.counter(x.localRevision) && v.array(x.reasonCodes, v.text)
        && (x.evaluation === null || v.assessment(x.evaluation) && x.evaluation.sessionVersion === x.version), id)
  }
  assessment(scope: Scope, id: string, signal: AbortSignal) { return this.call<AssessmentView>(scope, idPath(root, id) + '/assessment', 'GET', undefined, signal,
    x => v.object(x) && v.uuid(x.sessionId) && v.status(x.status) && v.counter(x.version) && v.nullable(x.completionAssessment, v.assessment) && v.object(x.currentAssessment)
      && ['EVALUATED', 'EXCLUDED'].includes(String(x.currentAssessment.state)) && v.array(x.currentAssessment.reasonCodes, v.text)
      && (x.currentAssessment.advice === null || x.currentAssessment.advice === 'UNAVAILABLE') && v.nullable(x.currentAssessment.evaluation, v.assessment)
      && (x.weightReview === null || v.weightReview(x.weightReview) && x.weightReview.sessionVersion === x.version), id) }
  changes(scope: Scope, id: string, signal: AbortSignal) { return this.call<ChangeEvents>(scope, idPath(root, id) + '/record-change-events', 'GET', undefined, signal,
    x => v.object(x) && v.uuid(x.sessionId) && v.counter(x.version) && v.array(x.events, e => v.object(e) && v.uuid(e.id) && v.uuid(e.recordId)
      && ['SET', 'CARDIO', 'SESSION'].includes(String(e.recordKind)) && ['CORRECTED', 'DELETED', 'RECOVERED'].includes(String(e.changeKind))
      && v.nullable(e.before, v.object) && v.nullable(e.after, v.object) && v.nullable(e.changeContext, v.object) && v.instant(e.recordedAt)), id) }
}
