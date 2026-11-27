import { readWithDeadline } from '../../app/read-deadline.ts'
import type { WorkoutApi } from './api.ts'
import { readClosedRecord } from './closed-record-read.ts'
import type { ClosedPage, Scope, Session } from './types.ts'

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
