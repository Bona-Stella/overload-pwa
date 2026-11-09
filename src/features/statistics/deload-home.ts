import type { WorkoutTransport } from '../workout-online/api.ts'
import { WorkoutApiError } from '../workout-online/api.ts'
import type { Scope } from '../workout-online/types.ts'
import * as v from '../workout-online/validation.ts'

type Fraction = { numerator: string; denominator: string }
export type HomeAnalysis = { enabled: boolean; calculationStatus: string; confirmedWeeks: Fraction | null; recommendationThreshold: Fraction }
export type HomeProtection = 'ACTIVE' | 'COMPLETED' | null

const fraction = (x: unknown): x is Fraction => v.object(x) && typeof x.numerator === 'string' && /^\d+$/.test(x.numerator) &&
  typeof x.denominator === 'string' && /^[1-9]\d*$/.test(x.denominator)
async function read(transport: WorkoutTransport, scope: Scope, path: string, signal: AbortSignal) {
  const { status, data } = await transport.workoutRequest(scope.userId, path, 'GET', undefined, signal)
  if (status !== 200 || !v.object(data) || !v.uuid(data.userId) || !v.counter(data.dataGeneration)) throw new WorkoutApiError('RESPONSE_INVALID', status)
  if (data.userId !== scope.userId) throw new WorkoutApiError('OWNER_MISMATCH')
  if (data.dataGeneration !== scope.dataGeneration) throw new WorkoutApiError('DATA_GENERATION_MISMATCH', 409)
  return data
}
export async function readHomeProtection(transport: WorkoutTransport, scope: Scope, signal: AbortSignal): Promise<HomeProtection> {
  const { period } = await read(transport, scope, '/api/v1/deload-periods/current', signal)
  if (period === null) return null
  if (!v.object(period) || (period.status !== 'ACTIVE' && period.status !== 'COMPLETED')) throw new WorkoutApiError('RESPONSE_INVALID')
  return period.status
}
export async function readHomeAnalysis(transport: WorkoutTransport, scope: Scope, signal: AbortSignal): Promise<HomeAnalysis> {
  const value = await read(transport, scope, '/api/v1/deload-analysis', signal)
  if (typeof value.enabled !== 'boolean' || typeof value.calculationStatus !== 'string' ||
    (value.confirmedWeeks !== null && !fraction(value.confirmedWeeks)) || !fraction(value.recommendationThreshold) ||
    BigInt(value.recommendationThreshold.numerator) === 0n) throw new WorkoutApiError('RESPONSE_INVALID')
  return { enabled: value.enabled, calculationStatus: value.calculationStatus, confirmedWeeks: value.confirmedWeeks, recommendationThreshold: value.recommendationThreshold }
}
