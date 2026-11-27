import { readWithDeadline } from '../../app/read-deadline.ts'
import type { WorkoutApi } from './api.ts'
import { readClosedRecord } from './closed-record-read.ts'
import type { ClosedPage, Equipment, PerformedSet, Scope, Session } from './types.ts'
import { count, decimal } from './validation.ts'

function matchingWeightSets(session: Session, standardId: string, equipment: Equipment) {
  if (session.status !== 'FINISHED' || session.deletedAt) return []
  const ids = new Set(session.snapshot.state.sessionExercises.filter(e => e.kind === 'WEIGHT' && e.standardExerciseId === standardId).map(e => e.id))
  return session.snapshot.state.performedSets.filter(set => ids.has(set.sessionExerciseId) &&
    set.manufacturerId === equipment.manufacturerId && set.loadType === equipment.loadType &&
    count(set.reps) && decimal(set.weightKg))
}

// Use the first matching workout even when it cannot supply every set ordinal.
export function previousWeightSets(history: readonly Session[], standardId: string, equipment: Equipment, placementId?: string, requirePlacement = false): PerformedSet[] {
  for (const session of history) {
    const matching = matchingWeightSets(session, standardId, equipment)
    if (!matching.length) continue
    const matchingIds = new Set(matching.map(set => set.sessionExerciseId))
    for (const plan of session.initialPlan.weightExercises) {
      if (plan.standardExerciseId === standardId && plan.manufacturerId === equipment.manufacturerId && plan.loadType === equipment.loadType) matchingIds.add(plan.sessionExerciseId)
    }
    if (!requirePlacement && matchingIds.size === 1) return matching
    const linked = session.initialPlan.weightExercises.filter(plan => plan.sourcePlacementId === placementId)
    return placementId && linked.length === 1 ? matching.filter(set => set.sessionExerciseId === linked[0].sessionExerciseId) : []
  }
  return []
}

export function latestActualWeight(history: readonly Session[], standardId: string, equipment: Equipment) {
  for (const session of history) {
    const matching = matchingWeightSets(session, standardId, equipment)
    if (!matching.length) continue
    // Prefer the final completed fact. An ambiguous tie supplies no automatic value.
    const time = (timestamp: string) => timestamp.slice(0, 19) + (timestamp.split('.')[1]?.slice(0, -1) ?? '').padEnd(6, '0')
    const latest = matching.reduce((last, next) => time(next.completedAt) > time(last.completedAt) ? next : last)
    return matching.some(set => time(set.completedAt) === time(latest.completedAt) && set.weightKg !== latest.weightKg) ? null : latest.weightKg
  }
  return undefined
}

export async function loadWorkoutHistory(api: WorkoutApi, scope: Scope, signal: AbortSignal, publish: (sessions: Session[]) => void) {
  const sessions: Session[] = []
  const visited = new Set<string>()
  const page = (cursor: ClosedPage['next']) => readWithDeadline(signal, nextSignal => api.closed(scope, cursor, nextSignal))
    .then(value => ({ value } as const), error => ({ error } as const))
  let next = page(null)
  for (;;) {
    const result = await next
    if ('error' in result) throw result.error
    signal.throwIfAborted()
    const cursor = result.value.next
    const cursorKey = JSON.stringify(cursor)
    if (cursor && visited.has(cursorKey)) throw new Error('Repeated history cursor')
    visited.add(cursorKey)
    // Start the next list request while reading this page, but publish in list order.
    if (cursor) next = page(cursor)
    const rows = result.value.sessions.filter(row => !row.deletedAt && row.status === 'FINISHED')
    for (let at = 0; at < rows.length && !signal.aborted; at += 4) {
      const batch = rows.slice(at, at + 4).map(row =>
        readWithDeadline(signal, detailSignal => readClosedRecord(api, scope, row, detailSignal))
          .then(value => ({ value } as const), error => ({ error } as const)))
      for (const detail of batch) {
        const result = await detail
        signal.throwIfAborted()
        if ('error' in result) throw result.error
        if (!result.value) throw new Error('Workout record changed during history read')
        sessions.push(result.value)
        publish([...sessions])
      }
    }
    if (!cursor) return sessions
  }
}
