export type HealthResponse = { status: 'UP' }

export async function getHealth(signal: AbortSignal): Promise<HealthResponse> {
  const controller = new AbortController()
  const cancelRequest = () => controller.abort()
  signal.addEventListener('abort', cancelRequest, { once: true })
  if (signal.aborted) controller.abort()
  const timeout = setTimeout(cancelRequest, 5000)

  try {
    let response: Response
    try {
      response = await fetch('/api/v1/health', {
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
    } catch (error) {
      if (signal.aborted) throw error
      if (controller.signal.aborted) {
        throw new Error('서버가 5초 안에 응답하지 않았습니다. 다시 확인해 주세요.', { cause: error })
      }
      throw new Error('서버에 연결할 수 없습니다. 서버 실행 상태와 네트워크를 확인한 뒤 다시 시도해 주세요.', { cause: error })
    }

    if (!response.ok) {
      throw new Error(`서버가 정상 응답을 보내지 않았습니다 (HTTP ${response.status}). 서버 실행 상태를 확인한 뒤 다시 시도해 주세요.`)
    }

    let data: unknown
    try {
      data = await response.json()
    } catch (error) {
      if (signal.aborted) throw error
      if (controller.signal.aborted) {
        throw new Error('서버가 5초 안에 응답하지 않았습니다. 다시 확인해 주세요.', { cause: error })
      }
      throw new Error('서버 응답을 읽을 수 없습니다. 다시 확인해 주세요.', { cause: error })
    }

    if (typeof data !== 'object' || data === null || !('status' in data) || data.status !== 'UP') {
      throw new Error('서버 상태를 확인할 수 없는 응답입니다. 다시 확인해 주세요.')
    }

    return { status: data.status }
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', cancelRequest)
  }
}
