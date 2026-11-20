import type { WorkoutApi } from '../workout-online/api.ts'
import type { Routine, RoutineList, Scope, Session } from '../workout-online/types.ts'
import type { StatisticsApi, Overview } from '../statistics/api.ts'
import type { Assignment, LiveSchedule } from '../statistics/weekly-schedule.ts'
import { addDays, dateInZone, weekDates } from './model.ts'
import type { RecentRow } from './recent.ts'

export type HomeRecent = { recent: Map<string, Session>; recentRows: RecentRow[]; recentLimited: boolean; recentFailed: boolean }
export type HomePlan = { summaries: RoutineList['routines']; schedule: { version: string; assignments: Assignment[] }; overview: Overview; routines: Map<string, Routine>; unavailable: string[]; evidence: Map<string, Session> }
export type HomeData = Omit<HomePlan, 'evidence'> & HomeRecent
/** Successful detail reads only, scoped by the owning HomePanel and routine version. */
export async function loadHome(scope: Scope, api: WorkoutApi, summaries: RoutineList['routines'], schedule: LiveSchedule,
  statistics: StatisticsApi, cache: Map<string, Routine>, now: Date, timeZone: string, signal: AbortSignal): Promise<HomePlan> {
  const active = schedule.presets.find(p => p.id === schedule.activeId)!
  const days = weekDates(dateInZone(now, schedule.timeZone ?? timeZone))
  const routines = new Map<string, Routine>(), unavailable: string[] = []
  // Bound parallel routine reads for accounts with many saved routines.
  let index = 0
  const evidence = new Map<string, Session>()
  const overviewRead = statistics.overview(scope, { fromDate: days[0], toDateExclusive: addDays(days[6], 1) }, signal).then(async overview => {
    const ids = new Set(overview.plannedDays.filter(day => day.effectiveDay === '0' && day.selectedSessionId).map(day => day.selectedSessionId!))
    await Promise.all([...ids].map(async id => {
      try { evidence.set(id, await api.detail(scope, id, signal)) }
      catch (error) { if (boundaryError(error) || signal.aborted) throw error }
    }))
    return overview
  })
  const [overview] = await Promise.all([overviewRead,
    ...Array.from({ length: Math.min(4, summaries.length) }, async () => {
    while (index < summaries.length && !signal.aborted) {
      const summary = summaries[index++], key = summary.id + ':' + summary.version
      try {
        const value = cache.get(key) ?? await api.routine(scope, summary.id, signal)
        if (!signal.aborted) {
          if (value.version === summary.version) cache.set(key, value)
          routines.set(summary.id, value)
        }
      } catch (error) {
        if (boundaryError(error) || signal.aborted) throw error
        unavailable.push(summary.id)
      }
    }
  })])
  return { summaries, schedule: { version: schedule.appliedVersion ?? '0', assignments: active.assignments }, overview, routines, unavailable, evidence }
}
export function boundaryError(error: unknown) {
  return error instanceof Error && 'code' in error && ['OWNER_MISMATCH', 'DATA_GENERATION_MISMATCH', 'AUTHENTICATION_REQUIRED', 'SESSION_CHANGED'].includes(String(error.code))
}

export function readAccessDenied(error: unknown) {
  return !!error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)
}
