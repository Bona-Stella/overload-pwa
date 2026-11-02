import type { Scope } from '../workout-online/types.ts'
import type { WorkoutTransport } from '../workout-online/api.ts'
import { WorkoutApiError } from '../workout-online/api.ts'
import * as v from '../workout-online/validation.ts'
import { date } from './api.ts'

export type Assignment = { dayOfWeek: number; routineId: string }
export type ScheduleVersion = { version: string; effectiveFrom: string; timeZone: string; recordedAt: string; assignments: Assignment[] }
export type WeeklySchedule = Scope & { version: string; timeZone: string; nextEffectiveFrom: string; current: ScheduleVersion | null; pending: ScheduleVersion | null; history: ScheduleVersion[] }
export type SchedulePage = Scope & { history: ScheduleVersion[]; nextBeforeVersion: string | null }
const assignments = (x: unknown): x is Assignment[] => v.array(x, a => v.object(a) && Number.isInteger(a.dayOfWeek) && Number(a.dayOfWeek) >= 1 && Number(a.dayOfWeek) <= 7 && v.uuid(a.routineId))
  && x.length <= 7 && new Set(x.map(a => (a as Assignment).dayOfWeek)).size === x.length
const version = (x: unknown): x is ScheduleVersion => v.object(x) && v.counter(x.version) && date(x.effectiveFrom) && v.name(x.timeZone) && v.instant(x.recordedAt) && assignments(x.assignments)
export const weeklySchedule = (x: unknown): x is WeeklySchedule => v.object(x) && v.uuid(x.userId) && v.counter(x.dataGeneration) && v.counter(x.version) && v.name(x.timeZone)
  && date(x.nextEffectiveFrom) && v.nullable(x.current, version) && v.nullable(x.pending, version) && v.array(x.history, version)
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
    const result = await this.transport.workoutRequest(scope.userId, '/api/v1/weekly-schedule', 'PUT', { dataGeneration: scope.dataGeneration, expectedVersion: state.version, timeZone: state.timeZone, assignments: values }, signal)
    return this.checked(scope, result.status, result.data)
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
