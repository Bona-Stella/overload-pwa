import { useEffect, useState } from 'react'
import { getHealth } from './api'
import type { HealthResponse } from './api'

type ConnectionState =
  | { status: 'loading' }
  | { status: 'success'; health: HealthResponse }
  | { status: 'error'; message: string }

function HealthPanel() {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    getHealth(controller.signal)
      .then((health) => {
        if (!controller.signal.aborted) {
          setConnection({ status: 'success', health })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setConnection({
            status: 'error',
            message: error instanceof Error ? error.message : '연결 확인에 실패했습니다. 다시 시도해 주세요.',
          })
        }
      })

    return () => controller.abort()
  }, [attempt])

  function retryConnection() {
    setConnection({ status: 'loading' })
    setAttempt((current) => current + 1)
  }

  const isLoading = connection.status === 'loading'

  return (
    <section className="health-page card">
      <header className="page-header">
        <h2>서버 연결 상태</h2>
        <p>진단 전용입니다. Mock 운동 기록에는 서버가 필요하지 않습니다.</p>
      </header>

      <section className="health-card" aria-labelledby="connection-heading">
        <div
          className={`connection-status ${connection.status}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-busy={isLoading}
        >
          <span className="status-dot" aria-hidden="true" />
          <h2 id="connection-heading">
            {isLoading && '서버 연결 확인 중'}
            {connection.status === 'success' && '서버 연결 성공'}
            {connection.status === 'error' && '서버 연결 실패'}
          </h2>
          <p>
            {isLoading && '서버의 응답을 기다리고 있습니다.'}
            {connection.status === 'success' && <>서버가 정상적으로 응답했습니다. 상태: <strong>{connection.health.status}</strong></>}
            {connection.status === 'error' && connection.message}
          </p>
        </div>

        <button type="button" onClick={retryConnection} disabled={isLoading}>
          {isLoading ? '확인 중…' : '다시 확인'}
        </button>
      </section>

      <p className="health-note">HTTP 연결 상태만 확인하며, 데이터베이스와 외부 서비스 상태는 포함하지 않습니다.</p>
    </section>
  )
}

export default HealthPanel
