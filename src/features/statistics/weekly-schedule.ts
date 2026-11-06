import type { Scope } from '../workout-online/types.ts'
import type { WorkoutTransport } from '../workout-online/api.ts'
import { WorkoutApiError } from '../workout-online/api.ts'
import * as v from '../workout-online/validation.ts'
import { date } from './api.ts'

export type Assignment = { dayOfWeek: number; routineId: string }
export type ScheduleVersion = { version: string; effectiveFrom: string; timeZone: string; recordedAt: string; appliedAt: string | null; assignments: Assignment[] }
export type WeeklySchedule = Scope & { version: string; timeZone: string; appliedAt: string | null; assignments: Assignment[] }
export type SchedulePage = Scope & { history: ScheduleVersion[]; nextBeforeVersion: string | null }
const assignments = (x: unknown): x is Assignment[] => v.array(x, a => v.object(a) && Number.isInteger(a.dayOfWeek) && Number(a.dayOfWeek) >= 1 && Number(a.dayOfWeek) <= 7 && v.uuid(a.routineId))
  && x.length <= 7 && new Set(x.map(a => (a as Assignment).dayOfWeek)).size === x.length
const version = (x: unknown): x is ScheduleVersion => v.object(x) && v.counter(x.version) && date(x.effectiveFrom) && v.name(x.timeZone) && v.instant(x.recordedAt) && v.nullable(x.appliedAt, v.instant) && assignments(x.assignments)
export const weeklySchedule = (x: unknown): x is WeeklySchedule => v.object(x) && v.uuid(x.userId) && v.counter(x.dataGeneration) && v.counter(x.version) && v.name(x.timeZone)
  && assignments(x.assignments) && (x.version === '0' ? x.appliedAt === null && x.assignments.length === 0 : v.instant(x.appliedAt))
export class WeeklyScheduleApi {
  private readonly transport: WorkoutTransport
  constructor(transport: WorkoutTransport) { this.transport = transport }
  private checked(scope: Scope, status: number, data: unknown) {
    if (status !== 200 || !weeklySchedule(data)) throw new WorkoutApiError('RESPONSE_INVALID', status)
    if (data.userId !== scope.userId) throw new WorkoutApiError('OWNER_MISMATCH')
    if (data.dataGeneration !== scope.dataGeneration) throw new WorkoutApiError('DATA_GENERATION_MISMATCH', 409)
    return data
  }
  async read(scope: Scope, timeZone: string, signal: AbortSignal) {
    const result = await this.transport.workoutRequest(scope.userId, '/api/v1/weekly-schedule?' + new URLSearchParams({ timeZone }), 'GET', undefined, signal)
    return this.checked(scope, result.status, result.data)
  }
  async save(scope: Scope, state: WeeklySchedule, values: Assignment[], signal: AbortSignal) {
    if (!v.counter(state.version) || !assignments(values) || state.userId !== scope.userId || state.dataGeneration !== scope.dataGeneration) throw new WorkoutApiError('INVALID_REQUEST', 400)
    const result = await this.transport.workoutRequest(scope.userId, '/api/v1/weekly-schedule', 'PUT', { contractVersion: 'immediate-v1', dataGeneration: scope.dataGeneration, expectedVersion: state.version, timeZone: state.timeZone, assignments: values }, signal)
    const saved = this.checked(scope, result.status, result.data)
    const desired = values.map(a => ({ dayOfWeek: a.dayOfWeek, routineId: a.routineId })).sort((a,b) => a.dayOfWeek-b.dayOfWeek)
    const unchanged = state.version !== '0' && JSON.stringify(state.assignments) === JSON.stringify(desired)
    if (saved.version !== (unchanged ? state.version : (BigInt(state.version)+1n).toString()) || JSON.stringify(saved.assignments) !== JSON.stringify(desired)) throw new WorkoutApiError('RESPONSE_INVALID', result.status)
    const latest = await this.read(scope, saved.timeZone, signal)
    if (latest.version !== saved.version || latest.appliedAt !== saved.appliedAt || latest.timeZone !== saved.timeZone || JSON.stringify(latest.assignments) !== JSON.stringify(saved.assignments)) throw new WorkoutApiError('SCHEDULE_VERSION_CONFLICT', 409)
    return latest
  }
  async history(scope: Scope, beforeVersion: string, signal: AbortSignal): Promise<SchedulePage> {
    if (!v.counter(beforeVersion) || beforeVersion === '0') throw new WorkoutApiError('INVALID_REQUEST', 400)
    const result = await this.transport.workoutRequest(scope.userId, '/api/v1/weekly-schedule/history?' + new URLSearchParams({ beforeVersion }), 'GET', undefined, signal)
    const x = result.data
    if (result.status !== 200 || !v.object(x) || !v.uuid(x.userId) || !v.counter(x.dataGeneration) || !v.array(x.history, version) || !v.nullable(x.nextBeforeVersion, v.counter)) throw new WorkoutApiError('RESPONSE_INVALID', result.status)
    if (x.userId !== scope.userId) throw new WorkoutApiError('OWNER_MISMATCH')
    if (x.dataGeneration !== scope.dataGeneration) throw new WorkoutApiError('DATA_GENERATION_MISMATCH', 409)
    return x as SchedulePage
  }
}

export function scheduleIssue(error: unknown) {
  const code = error instanceof Error && 'code' in error ? error.code : null
  if (code === 'ACTIVE_SESSION_EXISTS') return '진행 중인 운동을 종료하고 저장 상태를 확인한 뒤 루틴과 일정을 변경해 주세요. 입력은 유지됩니다.'
  if (code === 'SCHEDULE_VERSION_CONFLICT' || code === 'SCHEDULE_TIME_ZONE_CONFLICT') return '일정이 다른 화면에서 변경되었습니다. 입력은 유지됩니다. 닫은 뒤 최신 일정을 확인해 주세요.'
  return error instanceof Error ? error.message : '일정을 저장하지 못했습니다. 입력은 유지됩니다.'
}
