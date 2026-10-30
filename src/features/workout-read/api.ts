export type Exercise = { id: string; name: string }
export type ExerciseResponse = { userId: string; dataGeneration: string; exercises: Exercise[] }
export type WorkoutSettingsResponse = { userId: string; dataGeneration: string; restLowSeconds: number; restMediumSeconds: number; restHighSeconds: number }
export type WorkoutSnapshot = ExerciseResponse & { settings: WorkoutSettingsResponse }

export class WorkoutReadError extends Error {
  readonly code: string
  readonly status: number
  readonly requestId: string | null
  constructor(code: string, status = 0, requestId: string | null = null) {
    super('운동 정보를 불러오지 못했습니다.')
    this.name = 'WorkoutReadError'; this.code = code; this.status = status; this.requestId = requestId
  }
}

const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)
const generation = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9][0-9]{0,18})$/.test(value)
  && (value.length < 19 || value <= '9223372036854775807')
const seconds = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 2147483647

/** Read-only transport: no demo model, persistent cache, CSRF write or authentication mutation. */
export class WorkoutReadApi {
  private readonly fetcher: typeof fetch
  private readonly timeoutMs: number
  constructor(fetcher: typeof fetch = (input, init) => fetch(input, init), timeoutMs = 10_000) { this.fetcher = fetcher; this.timeoutMs = timeoutMs }

  private async get(path: string, parent: AbortSignal) {
    const abort = new AbortController()
    const cancel = () => abort.abort()
    parent.addEventListener('abort', cancel, { once: true })
    if (parent.aborted) cancel()
    const timer = setTimeout(cancel, this.timeoutMs)
    let status = 0, requestId: string | null = null
    try {
      const response = await this.fetcher(path, { method: 'GET', credentials: 'include', cache: 'no-store', redirect: 'error', signal: abort.signal, headers: { Accept: 'application/json' } })
      status = response.status
      const header = response.headers.get('X-Request-ID')
      requestId = uuid(header) ? header : null
      let data: unknown = null
      // An invalid error body must not erase its HTTP status (including a session-filter failure).
      try { data = await response.json() } catch { if (response.ok) throw new WorkoutReadError('RESPONSE_INVALID', status, requestId) }
      if (!response.ok) {
        const code = object(data) && typeof data.code === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(data.code) ? data.code : 'REQUEST_FAILED'
        throw new WorkoutReadError(code, status, requestId)
      }
      if (status !== 200 || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('Content-Type') ?? '')) throw new WorkoutReadError('RESPONSE_INVALID', status, requestId)
      return { data, requestId }
    } catch (error) {
      if (error instanceof WorkoutReadError) throw error
      throw new WorkoutReadError(parent.aborted ? 'CANCELLED' : abort.signal.aborted ? 'TIMEOUT' : 'NETWORK', status, requestId)
    } finally { clearTimeout(timer); parent.removeEventListener('abort', cancel) }
  }

  private envelope(data: unknown, userId: string, requestId: string | null): asserts data is Record<string, unknown> & { userId: string; dataGeneration: string } {
    if (!object(data) || !uuid(data.userId) || !generation(data.dataGeneration)) throw new WorkoutReadError('RESPONSE_INVALID', 200, requestId)
    if (data.userId !== userId) throw new WorkoutReadError('OWNER_MISMATCH', 200, requestId)
  }

  async exercises(userId: string, signal: AbortSignal): Promise<ExerciseResponse> {
    const { data, requestId } = await this.get('/api/v1/exercises', signal)
    this.envelope(data, userId, requestId)
    if (!Array.isArray(data.exercises)) throw new WorkoutReadError('RESPONSE_INVALID', 200, requestId)
    const exercises = data.exercises.map(value => {
      if (!object(value) || !uuid(value.id) || typeof value.name !== 'string' || !value.name.trim()) throw new WorkoutReadError('RESPONSE_INVALID', 200, requestId)
      return { id: value.id, name: value.name }
    })
    if (new Set(exercises.map(value => value.id.toLowerCase())).size !== exercises.length) throw new WorkoutReadError('RESPONSE_INVALID', 200, requestId)
    return { userId: data.userId, dataGeneration: data.dataGeneration, exercises }
  }

  async settings(userId: string, signal: AbortSignal): Promise<WorkoutSettingsResponse> {
    const { data, requestId } = await this.get('/api/v1/workout-settings', signal)
    this.envelope(data, userId, requestId)
    if (!seconds(data.restLowSeconds) || !seconds(data.restMediumSeconds) || !seconds(data.restHighSeconds)) throw new WorkoutReadError('RESPONSE_INVALID', 200, requestId)
    return { userId: data.userId, dataGeneration: data.dataGeneration, restLowSeconds: data.restLowSeconds, restMediumSeconds: data.restMediumSeconds, restHighSeconds: data.restHighSeconds }
  }
}
