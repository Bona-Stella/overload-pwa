import type { WorkoutApi } from '../workout-online/api.ts'
import type { Routine, RoutineList, Scope, Session } from '../workout-online/types.ts'
import type { StatisticsApi, Overview } from '../statistics/api.ts'
import type { Assignment, LiveSchedule } from '../statistics/weekly-schedule.ts'
import { addDays, dateInZone, weekDates } from './model.ts'
import { loadRecent } from './recent.ts'
import type { RecentRow } from './recent.ts'

export type HomeData = { summaries: RoutineList['routines']; schedule: { version: string; assignments: Assignment[] }; overview: Overview; routines: Map<string, Routine>; unavailable: string[]; recent: Map<string, Session>; recentRows: RecentRow[]; recentLimited: boolean; recentFailed: boolean }
/** Successful detail reads only, scoped by the owning HomePanel and routine version. */
export async function loadHome(scope: Scope, api: WorkoutApi, schedule: LiveSchedule,
  statistics: StatisticsApi, cache: Map<string, Routine>, now: Date, timeZone: string, signal: AbortSignal): Promise<HomeData> {
  const list = await api.routines(scope, signal)
  const active = schedule.presets.find(p => p.id === schedule.activeId)!
  const summaries = list.routines
  const days = weekDates(dateInZone(now, schedule.timeZone ?? timeZone))
  const overview = await statistics.overview(scope, { fromDate: days[0], toDateExclusive: addDays(days[6], 1) }, signal)
  const routines = new Map<string, Routine>(), unavailable: string[] = []
  // Bound parallel routine reads for accounts with many saved routines.
  let index = 0
  await Promise.all(Array.from({ length: Math.min(4, summaries.length) }, async () => {
    while (index < summaries.length && !signal.aborted) {
      const summary = summaries[index++], key = summary.id + ':' + summary.version
      try {
        const value = cache.get(key) ?? await api.routine(scope, summary.id, signal)
        if (!signal.aborted) { cache.set(key, value); routines.set(summary.id, value) }
      } catch (error) {
        if (boundaryError(error) || signal.aborted) throw error
        unavailable.push(summary.id)
      }
    }
  }))
  const recent = await loadRecent(api, scope, signal)
  return { summaries, schedule: { version: schedule.appliedVersion ?? '0', assignments: active.assignments }, overview, routines, unavailable, recent: recent.details, recentRows: recent.rows, recentLimited: recent.limited, recentFailed: recent.failed }
}
export function boundaryError(error: unknown) {
  return error instanceof Error && 'code' in error && ['OWNER_MISMATCH', 'DATA_GENERATION_MISMATCH', 'AUTHENTICATION_REQUIRED'].includes(String(error.code))
}
