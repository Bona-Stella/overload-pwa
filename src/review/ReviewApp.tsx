import { useEffect, useState } from 'react'
import { AuthProvider } from '../features/auth/AuthProvider.tsx'
import { AuthApp } from '../features/auth/AuthApp.tsx'
import { useAuth } from '../features/auth/context.ts'
import { returnFlow } from '../features/auth/controller.ts'
import { HomeReviewContext } from './context.ts'
import styles from './Review.module.css'

function ReviewLogin() {
  const { state, controller } = useAuth()
  const [busy, setBusy] = useState(false), [issue, setIssue] = useState(false)
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const remaining = Math.max(0, Math.ceil((state.resendAt - now) / 1000))
  if (state.status !== 'anonymous') return null
  const login = async () => {
    if (busy || state.pending !== null) return
    setBusy(true); setIssue(false)
    try {
      const config = await fetch('/__review/config', { cache: 'no-store' })
      if (!config.ok) throw Error('Review unavailable')
      const { email } = await config.json()
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
  return <aside className={styles.login} aria-label="검토용 로그인"><span>전용 검토 DB · 실제 OTP 인증</span><button type="button" disabled={busy || state.pending !== null || remaining > 0} onClick={() => void login()}>{busy ? '검토 계정 확인 중…' : remaining > 0 ? `${remaining}초 후 검토 로그인` : '검토 계정으로 로그인'}</button>{issue && <p role="alert">검토 연결을 확인한 뒤 다시 시도하세요.</p>}<small>메일 전달만 자동화합니다. 별도 코드 입력이 필요 없습니다.</small></aside>
}
export default function ReviewApp() {
  return <HomeReviewContext value={true}><AuthProvider flow={returnFlow(window.location.pathname)}><ReviewLogin /><AuthApp /></AuthProvider></HomeReviewContext>
}
