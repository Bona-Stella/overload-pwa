import type { WorkoutApi } from './api.ts'
import type { ClosedPage, Scope, Session } from './types.ts'

type Flight = { controller: AbortController; result: Promise<Session | null>; readers: number }
type RecordRow = Pick<ClosedPage['sessions'][number], 'id' | 'version' | 'status'>
type Cache = { records: Map<string, Session>; flights: Map<string, Flight> }
const caches = new WeakMap<WorkoutApi, Cache>()

const recordKey = (scope: Scope, row: RecordRow) => JSON.stringify([scope.userId, scope.dataGeneration, row.id, row.version, row.status])
function cacheFor(api: WorkoutApi) {
  const existing = caches.get(api)
  if (existing) return existing
  const cache: Cache = { records: new Map(), flights: new Map() }
  caches.set(api, cache)
  return cache
}

export function rememberClosedRecord(api: WorkoutApi, scope: Scope, row: RecordRow, session: Session) {
  if (session.id !== row.id || session.userId !== scope.userId || session.dataGeneration !== scope.dataGeneration ||
    session.version !== row.version || session.status !== row.status || session.deletedAt) return false
  const { records } = cacheFor(api)
  records.set(recordKey(scope, row), session)
  if (records.size > 160) records.delete(records.keys().next().value!)
  return true
}

/** The caller's fresh list must identify the exact owner, generation and version. */
export async function readClosedRecord(api: WorkoutApi, scope: Scope, row: RecordRow, signal: AbortSignal) {
  signal.throwIfAborted()
  const key = recordKey(scope, row)
  const cache = cacheFor(api)
  const cached = cache.records.get(key)
  if (cached) return cached
  let flight = cache.flights.get(key)
  if (!flight) {
    const controller = new AbortController()
    const result = api.detail(scope, row.id, controller.signal).then(session => {
      controller.signal.throwIfAborted()
      return rememberClosedRecord(api, scope, row, session) ? session : null
    }).finally(() => {
      if (cache.flights.get(key)?.controller === controller) cache.flights.delete(key)
    })
    flight = { controller, result, readers: 0 }
    cache.flights.set(key, flight)
  }
  const current = flight
  current.readers++
  let stop = () => {}
  try {
    return await Promise.race([current.result, new Promise<never>((_, reject) => {
      stop = () => reject(signal.reason)
      signal.addEventListener('abort', stop, { once: true })
    })])
  } finally {
    signal.removeEventListener('abort', stop)
    if (--current.readers === 0 && cache.flights.get(key) === current) {
      cache.flights.delete(key)
      current.controller.abort()
    }
  }
}

export function clearClosedRecords(api: WorkoutApi) {
  const cache = caches.get(api)
  if (!cache) return
  for (const flight of cache.flights.values()) flight.controller.abort()
  cache.flights.clear()
  cache.records.clear()
}
