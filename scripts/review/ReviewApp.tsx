import { useEffect, useState } from 'react'
import { AuthProvider } from '../../src/features/auth/AuthProvider.tsx'
import { AuthApp } from '../../src/features/auth/AuthApp.tsx'
import { useAuth } from '../../src/features/auth/context.ts'
import { authIssue, returnFlow } from '../../src/features/auth/controller.ts'
import { AuthApi, AuthError } from '../../src/features/auth/api.ts'
import { HomeReviewContext, ReviewExerciseMediaContext } from '../../src/app/review-context.ts'
import styles from './ReviewLogin.module.css'

function ReviewLogin() {
  const { state, controller } = useAuth()
  const [busy, setBusy] = useState(false), [issue, setIssue] = useState('')
  const [blockedUntil, setBlockedUntil] = useState(0)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (state.status !== 'anonymous' || !blockedUntil) return
    const timer = setInterval(() => {
      const now = Date.now()
      setNow(now)
      if (now >= blockedUntil) setBlockedUntil(0)
    }, 1000)
    return () => clearInterval(timer)
  }, [state.status, blockedUntil])
  useEffect(() => {
    if (state.status !== 'anonymous') return
    const abort = new AbortController()
    void fetch('/__review/config', { cache: 'no-store', signal: abort.signal }).then(async response => {
      if (!response.ok) return
      const config = await response.json()
      if (!abort.signal.aborted && !config.immediateOtp && Number.isInteger(config.retryAfter) && config.retryAfter > 0) setBlockedUntil(Date.now() + config.retryAfter * 1000)
    }).catch(() => { /* Explicit login displays connection errors. */ })
    return () => abort.abort()
  }, [state.status])
  const remaining = Math.max(0, Math.ceil((blockedUntil - now) / 1000))
  if (state.status !== 'anonymous') return null
  const login = async () => {
    if (busy || state.pending !== null || remaining > 0) return
    setBusy(true); setIssue('')
    let immediateOtp = false
    try {
      const config = await fetch('/__review/config', { cache: 'no-store' })
      if (!config.ok) throw Error('Review unavailable')
      const settings = await config.json()
      const { email, retryAfter } = settings
      immediateOtp = settings.immediateOtp === true
      if (!immediateOtp && Number.isInteger(retryAfter) && retryAfter > 0) { setBlockedUntil(Date.now() + retryAfter * 1000); return }
      const api = new AuthApi((input, init) => {
        if (!immediateOtp || input !== '/api/v1/auth/email-otp/request') return fetch(input, init)
        const headers = new Headers(init?.headers)
        headers.set('X-Overload-Review-Otp', '1')
        return fetch(input, { ...init, headers })
      })
      if (!await api.session()) {
        const challengeId = await api.requestOtp(email)
        const delivery = await fetch('/__review/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId }), cache: 'no-store' })
        if (!delivery.ok) throw Error('Review delivery unavailable')
        const { code } = await delivery.json()
        await api.verifyOtp(email, challengeId, code)
      }
      await controller.restore()
    } catch (error) {
      if (!immediateOtp && error instanceof AuthError && error.retryAfter > 0) setBlockedUntil(Date.now() + error.retryAfter * 1000)
      setIssue(error instanceof AuthError ? authIssue(error).message : '검토 연결을 확인한 뒤 다시 시도하세요.')
    }
    finally { setBusy(false) }
  }
  return <aside className={styles.login} aria-label="검토용 로그인"><span>전용 검토 DB · 실제 OTP 인증</span><button type="button" disabled={busy || state.pending !== null || remaining > 0} onClick={() => void login()}>{busy ? '검토 계정 확인 중…' : remaining > 0 ? `${remaining}초 후 검토 로그인` : '검토 계정으로 로그인'}</button>{issue && !state.issue && <p role="alert">{issue}</p>}<small>인증코드 입력은 자동입니다. Safari와 홈 화면 앱은 각각 로그인해야 할 수 있습니다.</small>{typeof window !== 'undefined' && !window.isSecureContext && <small>현재 LAN HTTP 검토 환경입니다. 설치형 PWA의 Service Worker·보안 쿠키 검증은 신뢰된 HTTPS에서 별도로 진행합니다.</small>}</aside>
}
export default function ReviewApp() {
  return <HomeReviewContext value={import.meta.env.MODE !== 'ui-review'}><ReviewExerciseMediaContext value={approvedMedia}>
    <AuthProvider flow={returnFlow(window.location.pathname)}><ReviewLogin /><AuthApp /></AuthProvider>
  </ReviewExerciseMediaContext></HomeReviewContext>
}

const approvedMedia = import.meta.env.VITE_APPROVED_HIGH_ROW_GIF === 'true' ? {
  '2d04629b-b651-811b-8e66-3d56102988a8': '/media/exercises/v1/nZZZy9m.gif',
} : undefined
