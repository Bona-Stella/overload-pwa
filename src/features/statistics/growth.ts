import type { Scope } from '../workout-online/types.ts'
import type { WorkoutTransport } from '../workout-online/api.ts'
import { WorkoutApiError } from '../workout-online/api.ts'
import * as v from '../workout-online/validation.ts'

export type GrowthPeriod = '1' | '3' | '6' | 'all'
export type GrowthExercise = { standardExerciseId: string; name: string; lastPerformedAt: string | null; lastApprovalAt: string | null }
export type GrowthPlacement = { routineId: string; placementId: string; routineName: string; deleted: boolean; lastApprovalAt: string }
export type GrowthPoint = { id: string; previousWeightKg: string; approvedWeightKg: string; occurredAt: string; recordedAt: string; source: 'ROUTINE_EDITOR' | 'WORKOUT'; sessionId: string | null; connectFromPrevious: boolean; previousPointId: string | null }
type Envelope = Scope & { period: GrowthPeriod; range: { fromDate: string | null; toDateExclusive: string; timeZone: string } }
export type GrowthSearch = Envelope & { query: string; offset: number; exercises: GrowthExercise[]; nextOffset: number | null }
export type GrowthOptions = Envelope & { standardExerciseId: string; name: string; placements: GrowthPlacement[] }
export type GrowthHistory = Envelope & { standardExerciseId: string; placement: GrowthPlacement; offset: number; points: GrowthPoint[]; nextOffset: number | null }
const date = (x: unknown): x is string => typeof x === 'string' && /^(?!0000)\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0, 10) === x
const integer = (x: unknown): x is number => Number.isInteger(x) && Number(x) >= 0 && Number(x) <= 2147483647
const kg = (x: unknown): x is string => typeof x === 'string' && /^(0|[1-9][0-9]{0,13})(\.[0-9]{0,5}[1-9])?$/.test(x)
const placement = (x: unknown): x is GrowthPlacement => v.object(x) && v.uuid(x.routineId) && v.uuid(x.placementId) && v.name(x.routineName) && typeof x.deleted === 'boolean' && v.instant(x.lastApprovalAt)
export const growthPoint = (x: unknown): x is GrowthPoint => v.object(x) && v.uuid(x.id) && kg(x.previousWeightKg) && kg(x.approvedWeightKg) && v.instant(x.occurredAt) && v.instant(x.recordedAt)
  && ['ROUTINE_EDITOR', 'WORKOUT'].includes(String(x.source)) && (x.source === 'WORKOUT' ? v.uuid(x.sessionId) : x.sessionId === null) && typeof x.connectFromPrevious === 'boolean' && v.nullable(x.previousPointId, v.uuid)
  && (!x.connectFromPrevious || v.uuid(x.previousPointId)) && x.previousWeightKg !== x.approvedWeightKg
export class GrowthApi {
  private readonly transport: WorkoutTransport
  constructor(transport: WorkoutTransport) { this.transport = transport }
  private async read(scope: Scope, path: string, period: GrowthPeriod, zone: string, signal: AbortSignal, extra: Record<string, string> = {}) {
    const result = await this.transport.workoutRequest(scope.userId, '/api/v1/statistics/growth/exercises' + path + '?' + new URLSearchParams({ period, timeZone: zone, ...extra }), 'GET', undefined, signal)
    const x = result.data
    if (result.status !== 200 || !v.object(x) || !v.uuid(x.userId) || !v.counter(x.dataGeneration) || x.period !== period || !v.object(x.range) || !v.nullable(x.range.fromDate, date) || !date(x.range.toDateExclusive) || x.range.timeZone !== zone) throw new WorkoutApiError('RESPONSE_INVALID', result.status)
    if (x.userId !== scope.userId) throw new WorkoutApiError('OWNER_MISMATCH')
    if (x.dataGeneration !== scope.dataGeneration) throw new WorkoutApiError('DATA_GENERATION_MISMATCH', 409)
    return x
  }
  async search(scope: Scope, period: GrowthPeriod, zone: string, query: string, offset: number, signal: AbortSignal): Promise<GrowthSearch> {
    const x = await this.read(scope, '', period, zone, signal, { q: query, offset: String(offset) })
    if (x.query !== query || x.offset !== offset || !v.nullable(x.nextOffset, integer) || x.nextOffset !== null && x.nextOffset !== offset + 50 || !v.array(x.exercises, e => v.object(e) && v.uuid(e.standardExerciseId) && v.name(e.name) && v.nullable(e.lastPerformedAt, v.instant) && v.nullable(e.lastApprovalAt, v.instant)) || x.exercises.length > 50) throw new WorkoutApiError('RESPONSE_INVALID')
    return x as GrowthSearch
  }
  async options(scope: Scope, id: string, period: GrowthPeriod, zone: string, signal: AbortSignal): Promise<GrowthOptions> {
    if (!v.uuid(id)) throw new WorkoutApiError('INVALID_REQUEST', 400)
    const x = await this.read(scope, '/' + id, period, zone, signal)
    if (x.standardExerciseId !== id || !v.name(x.name) || !v.array(x.placements, placement)) throw new WorkoutApiError('RESPONSE_INVALID')
    return x as GrowthOptions
  }
  async history(scope: Scope, id: string, selected: GrowthPlacement, period: GrowthPeriod, zone: string, offset: number, signal: AbortSignal): Promise<GrowthHistory> {
    if (!v.uuid(id) || !placement(selected)) throw new WorkoutApiError('INVALID_REQUEST', 400)
    const x = await this.read(scope, '/' + id + '/placements/' + selected.placementId, period, zone, signal, { offset: String(offset) })
    if (x.standardExerciseId !== id || !placement(x.placement) || x.placement.placementId !== selected.placementId || x.placement.routineId !== selected.routineId || x.offset !== offset || !v.nullable(x.nextOffset, integer) || x.nextOffset !== null && x.nextOffset !== offset + 100 || !v.array(x.points, growthPoint) || x.points.length > 100) throw new WorkoutApiError('RESPONSE_INVALID')
    return x as GrowthHistory
  }
}
