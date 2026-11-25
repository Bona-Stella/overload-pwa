const readDeadlineMs = 30_000

export class ReadTimeout extends Error {
  readonly code = 'TIMEOUT'
}

/** A deadline for one read operation, including any sequential requests it needs. */
export async function readWithDeadline<T>(parent: AbortSignal, read: (signal: AbortSignal) => Promise<T>, timeoutMs = readDeadlineMs): Promise<T> {
  parent.throwIfAborted()
  const child = new AbortController()
  const cancel = () => child.abort(parent.reason)
  parent.addEventListener('abort', cancel, { once: true })
  const timer = setTimeout(() => child.abort(new ReadTimeout()), timeoutMs)
  try {
    const cancelled = new Promise<never>((_, reject) => {
      child.signal.addEventListener('abort', () => reject(child.signal.reason), { once: true })
    })
    return await Promise.race([read(child.signal), cancelled])
  } finally {
    clearTimeout(timer)
    parent.removeEventListener('abort', cancel)
    child.abort()
  }
}

export function readFailure(error: unknown, fallback: string) {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }
  if (status === 403) return '이 정보를 볼 권한이 없어요.'
  if (code === 'TIMEOUT' || code === 'NETWORK' || error instanceof TypeError) return '연결할 수 없어요. 다시 시도해 주세요.'
  return fallback
}
