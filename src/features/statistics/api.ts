import type { WorkoutTransport } from '../workout-online/api.ts'
import { WorkoutApiError } from '../workout-online/api.ts'
import type { Scope } from '../workout-online/types.ts'
import * as v from '../workout-online/validation.ts'
import { GrowthApi } from './growth.ts'

export type WeightStats = { plannedSets: string; completedSets: string; reps: string; volumeLoadKg: string | null; setsWithoutVolume: string }
export type Statistics = Scope & { fromDate: string; toDateExclusive: string; planCoverage: 'STARTED_SESSIONS_ONLY' | 'FULL_SCHEDULE_HISTORY' | 'PARTIAL_SCHEDULE_HISTORY'; plannedWorkoutDays: number | null; routineAchievementPercent: string | null;
  summary: WeightStats; cardioActiveMs: string; unmappedCompletedSets: string;
  days: { date: string; weights: WeightStats; cardioActiveMs: string }[];
  exercises: { standardExerciseId: string; name: string; weights: WeightStats }[];
  muscles: { id: string; name: string; groupCode: string; role: 'PRIMARY' | 'SECONDARY'; weights: WeightStats }[];
  groups: { groupCode: string; role: 'PRIMARY' | 'SECONDARY'; weights: WeightStats }[];
  cardio: { kind: string; name: string; activeMs: string; distanceKm: string | null; recordsWithoutDistance: string }[];
  recentSessions: { id: string; routineName: string; workoutDate: string; startedAt: string; status: 'FINISHED' | 'AUTO_CLOSED' }[] }
export type Period = { fromDate: string; toDateExclusive: string }
export type PlannedDay = { date: string; status: 'UNKNOWN' | 'BEFORE_REGISTRATION' | 'REST' | 'PLANNED' | 'UNVERIFIABLE'; scheduleVersion: string | null;
  plan: import('../workout-online/types.ts').Routine | null; plannedExercises: number | null; completedExercises: number | null; effectiveDay: string | null; selectedSessionId: string | null }
export type Overview = { statistics: Statistics; effectiveWorkoutDays: string | null; unknownPlanDays: number; unverifiableDays: number; plannedDays: PlannedDay[] }
const nonnegative = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 2147483647
const fraction = (x: unknown, maximum: number): x is string => typeof x === 'string' && /^(0|[1-9][0-9]*)(\.[0-9]{0,11}[1-9])?$/.test(x) && Number(x) <= maximum
export const date = (x: unknown): x is string => typeof x === 'string' && /^(?!0000)\d{4}-\d{2}-\d{2}$/.test(x)
  && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x
const decimal = (x: unknown): x is string => typeof x === 'string' && /^(0|[1-9][0-9]*)(\.[0-9]{0,5}[1-9])?$/.test(x)
export const weightStats = (x: unknown): x is WeightStats => v.object(x) && v.counter(x.plannedSets) && v.counter(x.completedSets) && v.counter(x.reps)
  && v.nullable(x.volumeLoadKg, decimal) && v.counter(x.setsWithoutVolume) && BigInt(x.setsWithoutVolume) <= BigInt(x.completedSets)
const group = (x: unknown) => typeof x === 'string' && ['CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'LEGS', 'CORE'].includes(x)
const role = (x: unknown) => x === 'PRIMARY' || x === 'SECONDARY'
function facts(x: unknown): x is Statistics {
  return v.object(x) && v.uuid(x.userId) && v.counter(x.dataGeneration) && date(x.fromDate) && date(x.toDateExclusive)
    && weightStats(x.summary) && v.counter(x.cardioActiveMs) && v.counter(x.unmappedCompletedSets)
    && v.array(x.days, d => v.object(d) && date(d.date) && weightStats(d.weights) && v.counter(d.cardioActiveMs))
    && v.array(x.exercises, e => v.object(e) && v.uuid(e.standardExerciseId) && v.name(e.name) && weightStats(e.weights))
    && v.array(x.muscles, m => v.object(m) && v.uuid(m.id) && v.name(m.name) && group(m.groupCode) && role(m.role) && weightStats(m.weights))
    && v.array(x.groups, g => v.object(g) && group(g.groupCode) && role(g.role) && weightStats(g.weights))
    && v.array(x.cardio, c => v.object(c) && v.name(c.kind) && v.name(c.name) && v.counter(c.activeMs) && v.nullable(c.distanceKm, decimal) && v.counter(c.recordsWithoutDistance))
    && v.array(x.recentSessions, s => v.object(s) && v.uuid(s.id) && v.name(s.routineName) && date(s.workoutDate) && v.instant(s.startedAt) && ['FINISHED', 'AUTO_CLOSED'].includes(String(s.status)))
}
export function statistics(x: unknown): x is Statistics {
  return facts(x) && x.planCoverage === 'STARTED_SESSIONS_ONLY' && x.plannedWorkoutDays === null && x.routineAchievementPercent === null
}
export function overview(x: unknown): x is Overview {
  return v.object(x) && facts(x.statistics) && ['FULL_SCHEDULE_HISTORY', 'PARTIAL_SCHEDULE_HISTORY'].includes(x.statistics.planCoverage)
    && v.nullable(x.statistics.plannedWorkoutDays, n => nonnegative(n) && n <= 366)
    && v.nullable(x.statistics.routineAchievementPercent, n => fraction(n, 100))
    && v.nullable(x.effectiveWorkoutDays, n => fraction(n, 366)) && nonnegative(x.unknownPlanDays) && x.unknownPlanDays <= 366
    && nonnegative(x.unverifiableDays) && x.unverifiableDays <= 366
    && (x.unknownPlanDays === 0 ? x.statistics.planCoverage === 'FULL_SCHEDULE_HISTORY' : x.statistics.planCoverage === 'PARTIAL_SCHEDULE_HISTORY' && x.statistics.plannedWorkoutDays === null && x.statistics.routineAchievementPercent === null && x.effectiveWorkoutDays === null)
    && (x.unverifiableDays === 0 || x.statistics.routineAchievementPercent === null && x.effectiveWorkoutDays === null)
    && v.array(x.plannedDays, d => v.object(d) && date(d.date) && ['UNKNOWN', 'BEFORE_REGISTRATION', 'REST', 'PLANNED', 'UNVERIFIABLE'].includes(String(d.status)) && v.nullable(d.scheduleVersion, v.counter)
      && v.nullable(d.plan, v.routine) && v.nullable(d.plannedExercises, nonnegative) && v.nullable(d.completedExercises, nonnegative) && v.nullable(d.effectiveDay, n => fraction(n, 1)) && v.nullable(d.selectedSessionId, v.uuid))
}
export class StatisticsApi {
  private readonly transport: WorkoutTransport
  readonly growth: GrowthApi
  constructor(transport: WorkoutTransport) { this.transport = transport; this.growth = new GrowthApi(transport) }
  async read(scope: Scope, period: Period, signal: AbortSignal): Promise<Statistics> {
    if (!v.uuid(scope.userId) || !v.counter(scope.dataGeneration) || !date(period.fromDate) || !date(period.toDateExclusive)) throw new WorkoutApiError('INVALID_REQUEST', 400)
    const result = await this.transport.workoutRequest(scope.userId, '/api/v1/statistics?' + new URLSearchParams(period), 'GET', undefined, signal)
    if (result.status !== 200 || !statistics(result.data)) throw new WorkoutApiError('RESPONSE_INVALID', result.status)
    if (result.data.userId !== scope.userId) throw new WorkoutApiError('OWNER_MISMATCH')
    if (result.data.dataGeneration !== scope.dataGeneration) throw new WorkoutApiError('DATA_GENERATION_MISMATCH', 409)
    if (result.data.fromDate !== period.fromDate || result.data.toDateExclusive !== period.toDateExclusive) throw new WorkoutApiError('RESPONSE_INVALID')
    return result.data
  }
  async overview(scope: Scope, period: Period, signal: AbortSignal): Promise<Overview> {
    if (!v.uuid(scope.userId) || !v.counter(scope.dataGeneration) || !date(period.fromDate) || !date(period.toDateExclusive)) throw new WorkoutApiError('INVALID_REQUEST', 400)
    const result = await this.transport.workoutRequest(scope.userId, '/api/v1/statistics/overview?' + new URLSearchParams(period), 'GET', undefined, signal)
    if (result.status !== 200 || !overview(result.data)) throw new WorkoutApiError('RESPONSE_INVALID', result.status)
    const data = result.data.statistics
    if (data.userId !== scope.userId) throw new WorkoutApiError('OWNER_MISMATCH')
    if (data.dataGeneration !== scope.dataGeneration) throw new WorkoutApiError('DATA_GENERATION_MISMATCH', 409)
    if (data.fromDate !== period.fromDate || data.toDateExclusive !== period.toDateExclusive) throw new WorkoutApiError('RESPONSE_INVALID')
    return result.data
  }
}

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export function periodFor(now: Date, mode: 'week' | 'month', offset: number): Period {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (mode === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7 + offset * 7)
  else { start.setDate(1); start.setMonth(start.getMonth() + offset) }
  const end = new Date(start)
  if (mode === 'week') end.setDate(end.getDate() + 7); else end.setMonth(end.getMonth() + 1)
  return { fromDate: localDate(start), toDateExclusive: localDate(end) }
}
