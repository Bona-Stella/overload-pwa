import type { WorkoutApi } from '../workout-online/api.ts'
import type { Routine, RoutineList, Scope, Session } from '../workout-online/types.ts'
import type { StatisticsApi, Overview } from '../statistics/api.ts'
import type { Assignment, LiveSchedule } from '../statistics/weekly-schedule.ts'
import { addDays, dateInZone, dayOfWeek, weekDates } from './model.ts'
import type { RecentRow } from './recent.ts'

export type HomeRecent = { recent: Map<string, Session>; recentRows: RecentRow[]; recentLimited: boolean; recentFailed: boolean }
export type HomePlan = { summaries: RoutineList['routines']; schedule: { version: string; assignments: Assignment[] }; routines: Map<string, Routine>; unavailable: string[] }
export type HomeWeek = { overview: Overview; evidence: Map<string, Session> }
export type HomeData = HomePlan & Pick<HomeWeek, 'overview'> & HomeRecent
/** Successful detail reads only, scoped by the owning HomePanel and routine version. */
export function loadHome(scope: Scope, api: WorkoutApi, summaries: RoutineList['routines'], schedule: LiveSchedule,
  statistics: StatisticsApi, cache: Map<string, Routine>, now: Date, timeZone: string, signal: AbortSignal) {
  const active = schedule.presets.find(p => p.id === schedule.activeId)!
  const today = dateInZone(now, schedule.timeZone ?? timeZone)
  const days = weekDates(today)
  const assignment = active.assignments.find(a => a.dayOfWeek === dayOfWeek(today))
  const assigned = summaries.find(summary => summary.id === assignment?.routineId)
  const remaining = summaries.filter(summary => summary !== assigned)
  const planSchedule = { version: schedule.appliedVersion ?? '0', assignments: active.assignments }
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
    return { overview, evidence }
  })
  async function readRoutine(summary: RoutineList['routines'][number]) {
    const key = summary.id + ':' + summary.version
    try {
      const value = cache.get(key) ?? await api.routine(scope, summary.id, signal)
      if (!signal.aborted) {
        if (value.version === summary.version) cache.set(key, value)
        routines.set(summary.id, value)
        return value
      }
    } catch (error) {
      if (boundaryError(error) || signal.aborted) throw error
      unavailable.push(summary.id)
    }
  }
  async function readRemaining() {
    while (index < remaining.length && !signal.aborted) await readRoutine(remaining[index++])
  }
  const assignedRead = assigned ? readRoutine(assigned) : Promise.resolve(undefined)
  // Give the assigned routine the first of the four read slots.
  const plan = Promise.all([assignedRead.then(readRemaining), ...Array.from({ length: Math.min(3, remaining.length) }, readRemaining)])
    .then((): HomePlan => ({ summaries, schedule: planSchedule, routines, unavailable }))
  const todayPlan = assignedRead.then((detail): HomePlan => ({ summaries, schedule: planSchedule,
    routines: detail ? new Map([[detail.id, detail]]) : new Map(), unavailable: !detail && assigned ? [assigned.id] : [] }))
  return { todayPlan, plan, week: overviewRead }
}
export function boundaryError(error: unknown) {
  return error instanceof Error && 'code' in error && ['OWNER_MISMATCH', 'DATA_GENERATION_MISMATCH', 'AUTHENTICATION_REQUIRED', 'SESSION_CHANGED'].includes(String(error.code))
}

export function readAccessDenied(error: unknown) {
  return !!error && typeof error === 'object' && 'status' in error && (error.status === 401 || error.status === 403)
}
