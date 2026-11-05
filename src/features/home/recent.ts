import type { WorkoutApi } from '../workout-online/api.ts'
import type { ClosedPage, Scope, Session } from '../workout-online/types.ts'
import { hasActualPerformance } from './achievement.ts'

export type RecentRow = ClosedPage['sessions'][number]
export const RECENT_PAGE_LIMIT = 3
export async function loadRecent(api: WorkoutApi, scope: Scope, signal: AbortSignal) {
  const rows: RecentRow[] = [], details = new Map<string, Session>(), seen = new Set<string>()
  let cursor: ClosedPage['next'] = null, limited = false, failed = false
  for (let page = 0; page < RECENT_PAGE_LIMIT && !signal.aborted; page++) {
    const result = await api.closed(scope, cursor, signal)
    const candidates = result.sessions.filter(r => !r.deletedAt && !seen.has(r.id))
    for (let i = 0; i < candidates.length && rows.length < 3; i += 4) {
      const batch = await Promise.all(candidates.slice(i,i+4).map(async row => {
        seen.add(row.id)
        try { return { row, detail: await api.detail(scope,row.id,signal) } }
        catch (error) {
          if (signal.aborted || error instanceof Error && 'code' in error && ['OWNER_MISMATCH','DATA_GENERATION_MISMATCH','AUTHENTICATION_REQUIRED'].includes(String(error.code))) throw error
          failed = true; return { row, detail: null }
        }
      }))
      for (const { row, detail } of batch) {
        if (rows.length === 3) break
        if (!detail) { rows.push(row); continue } // Unknown is not evidence of no performance.
        if (detail.status === 'ACTIVE' || detail.deletedAt || !hasActualPerformance(detail)) continue
        rows.push(row); details.set(row.id,detail)
      }
    }
    if (rows.length === 3 || !result.next) break
    if (cursor && JSON.stringify(cursor) === JSON.stringify(result.next)) { limited = true; break }
    cursor = result.next
    if (page === RECENT_PAGE_LIMIT - 1) limited = true
  }
  return { rows, details, limited, failed }
}
