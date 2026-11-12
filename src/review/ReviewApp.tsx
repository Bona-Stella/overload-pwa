import { useEffect, useState } from 'react'
import { AuthProvider } from '../features/auth/AuthProvider.tsx'
import { AuthApp } from '../features/auth/AuthApp.tsx'
import { useAuth } from '../features/auth/context.ts'
import { returnFlow } from '../features/auth/controller.ts'
import { HomeReviewContext, ReviewExerciseMediaContext } from './context.ts'
import styles from './Review.module.css'

function ReviewLogin() {
  const { state, controller } = useAuth()
  const [busy, setBusy] = useState(false), [issue, setIssue] = useState(false)
  const [blockedUntil, setBlockedUntil] = useState(0)
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    if (state.status !== 'anonymous') return
    const abort = new AbortController()
    void fetch('/__review/config', { cache: 'no-store', signal: abort.signal }).then(async response => {
      if (!response.ok) return
      const config = await response.json()
      if (!abort.signal.aborted && Number.isInteger(config.retryAfter) && config.retryAfter > 0) setBlockedUntil(Date.now() + config.retryAfter * 1000)
    }).catch(() => { /* Explicit login displays connection errors. */ })
    return () => abort.abort()
  }, [state.status])
  const remaining = Math.max(0, Math.ceil((Math.max(state.resendAt, blockedUntil) - now) / 1000))
  if (state.status !== 'anonymous') return null
  const login = async () => {
    if (busy || state.pending !== null || remaining > 0) return
    setBusy(true); setIssue(false)
    try {
      const config = await fetch('/__review/config', { cache: 'no-store' })
      if (!config.ok) throw Error('Review unavailable')
      const { email, retryAfter } = await config.json()
      if (Number.isInteger(retryAfter) && retryAfter > 0) { setBlockedUntil(Date.now() + retryAfter * 1000); return }
      await controller.restore()
      if (controller.getSnapshot().status === 'authenticated') return
      if (controller.getSnapshot().status !== 'anonymous') throw Error('Session unavailable')
      await controller.requestOtp(email)
      const challenge = controller.getSnapshot().challenge
      if (!challenge?.id || challenge.email !== email) return
      const delivery = await fetch('/__review/otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId: challenge.id }), cache: 'no-store' })
      if (!delivery.ok) throw Error('Review delivery unavailable')
      const { code } = await delivery.json()
      await controller.verifyOtp(code)
    } catch { setIssue(true) }
    finally { setBusy(false) }
  }
  return <aside className={styles.login} aria-label="검토용 로그인"><span>전용 검토 DB · 실제 OTP 인증</span><button type="button" disabled={busy || state.pending !== null || remaining > 0} onClick={() => void login()}>{busy ? '검토 계정 확인 중…' : remaining > 0 ? `${remaining}초 후 검토 로그인` : '검토 계정으로 로그인'}</button>{issue && !state.issue && <p role="alert">검토 연결을 확인한 뒤 다시 시도하세요.</p>}<small>메일 전달만 자동화합니다. 별도 코드 입력이 필요 없습니다. Safari와 홈 화면 앱은 각각 로그인해야 할 수 있습니다.</small>{remaining > 0 && <small>계정의 OTP 요청 제한 시간입니다. 창을 바꾸거나 반복 클릭해도 서버의 제한은 해제되지 않습니다.</small>}{typeof window !== 'undefined' && !window.isSecureContext && <small>현재 LAN HTTP 검토 환경입니다. 설치형 PWA의 Service Worker·보안 쿠키 검증은 신뢰된 HTTPS에서 별도로 진행합니다.</small>}</aside>
}
export default function ReviewApp() {
  return <HomeReviewContext value={true}><ReviewExerciseMediaContext value={approvedMedia}>
    <AuthProvider flow={returnFlow(window.location.pathname)}><ReviewLogin /><AuthApp /></AuthProvider>
  </ReviewExerciseMediaContext></HomeReviewContext>
}

const approvedMedia = import.meta.env.VITE_APPROVED_HIGH_ROW_GIF === 'true' ? {
  '2d04629b-b651-811b-8e66-3d56102988a8': '/media/exercises/v1/nZZZy9m.gif',
} : undefined
