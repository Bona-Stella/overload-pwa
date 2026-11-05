import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { useAuth } from './context.ts'
import { LoginScreens } from './LoginScreens'
import { AccountSettings } from './AccountSettings'
import { WorkoutWorkspace } from '../workout-online/WorkoutWorkspace'
import type { ExitGuardRegistration } from '../workout-local/types.ts'
import { OfflineResume } from '../workout-local/OfflineResume.tsx'
import { PwaStatus } from '../../pwa/PwaStatus.tsx'
import { AppShell } from '../../app/AppShell.tsx'
import type { AppTab } from '../../app/types.ts'
import { Button, Card, SectionHeading } from '../../components/ui.tsx'
import '../../App.css'
import './auth.css'

export function AuthApp() {
  const { state, controller } = useAuth()
  const [now, setNow] = useState(() => Date.now())
  const [dialog, setDialog] = useState<string | null>(null)
  const [localExitIssue, setLocalExitIssue] = useState(false)
  const [selection, setSelection] = useState<{ userId: string; tab: AppTab } | null>(null)
  const [focused, setFocused] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const navigationPending = useRef(false)
  const localExitGuard = useRef<(() => Promise<boolean>) | null>(null)
  const registerExitGuard = useCallback<ExitGuardRegistration>(guard => { localExitGuard.current = guard }, [])
  const navigate = useCallback(async (next: AppTab) => {
    const before = controller.getSnapshot(), guard = localExitGuard.current
    if (navigationPending.current || before.status !== 'authenticated' || before.pending !== null || !before.userId) return false
    navigationPending.current = true; setNavigating(true)
    try {
      const saved = await (guard?.() ?? Promise.resolve(true))
      setLocalExitIssue(!saved)
      const latest = controller.getSnapshot()
      if (!saved || latest.status !== 'authenticated' || latest.pending !== null || latest.userId !== before.userId || localExitGuard.current !== guard) return false
      if (latest.accountOpen) controller.closeAccount()
      setSelection({ userId: before.userId, tab: next })
      window.scrollTo(0, 0)
      return true
    } finally { navigationPending.current = false; setNavigating(false) }
  }, [controller])
  const flushLocal = async () => { const saved = await (localExitGuard.current?.() ?? Promise.resolve(true)); setLocalExitIssue(!saved); return saved }
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    let checking = false
    const reconnect = async () => {
      const a = controller.getSnapshot()
      if (checking || a.pending !== null || a.status !== 'unavailable' || !a.offlineNetworkFailure || !navigator.onLine) return
      checking = true
      try { if (await (localExitGuard.current?.() ?? Promise.resolve(true))) await controller.restore() }
      finally { checking = false }
    }
    const visible = () => { if (document.visibilityState === 'visible') void reconnect() }
    const offline = () => controller.networkUnavailable()
    window.addEventListener('online', reconnect); window.addEventListener('offline', offline); document.addEventListener('visibilitychange', visible)
    return () => { window.removeEventListener('online', reconnect); window.removeEventListener('offline', offline); document.removeEventListener('visibilitychange', visible) }
  }, [controller])
  const busy = state.pending !== null
  const authenticated = state.status === 'authenticated'
  const tab = state.accountOpen ? 'settings' : selection?.userId === state.userId ? selection!.tab : 'home'
  return <AppShell authenticated={authenticated} tab={tab} onNavigate={next => void navigate(next)} focused={focused && !state.accountOpen} busy={busy || navigating}>
    <div id="auth-feedback" aria-live="polite">
      {state.issue && <div className="notice error" role="alert">{state.issue.message}</div>}
      {state.notice && !state.challenge && <p className="notice" role="status">{state.notice}</p>}
    </div>
    {state.status === 'checking' ? <section className="card stack" role="status"><p className="eyebrow">WELCOME BACK</p><h1>로그인 상태를<br />확인하고 있어요<span className="brand-dot">.</span></h1><p className="muted">잠시만 기다려 주세요.</p></section>
      : state.status === 'unavailable' ? <section className="card stack"><p className="eyebrow">CONNECTION</p><h1>연결을 확인해 주세요</h1><p className="muted">현재 로그인 상태를 확인하지 못했습니다. 연결 문제만으로 로그아웃 처리하지 않습니다.</p><button className="primary full" disabled={busy} onClick={async () => { if (await flushLocal()) void controller.restore() }}>{busy ? '확인 중…' : '로그인 상태 다시 확인'}</button></section>
      : authenticated ? state.accountOpen ? <AccountSettings key={state.userId + ':' + (state.account?.challenge?.id ?? 'none')} state={state} controller={controller} now={now} /> : null
      : <LoginScreens state={state} controller={controller} now={now} onLegal={setDialog} />}
    {authenticated && tab === 'settings' && !state.accountOpen && <section className="stack" aria-label="설정">
      <SectionHeading title="설정" eyebrow="PREFERENCES" />
      <Card><h2>계정</h2><p className="muted small">로그인 수단과 대표 재인증 이메일을 관리합니다.</p><Button disabled={busy} onClick={async () => { if (await flushLocal()) void controller.openAccount() }}>계정 설정</Button></Card>
    </section>}
    <WorkoutWorkspace onExitGuard={registerExitGuard} tab={tab} onNavigate={navigate} onFocusChange={setFocused} />
    {state.status === 'unavailable' && state.offlineNetworkFailure && !state.localWorkoutUserId && <OfflineResume onExitGuard={registerExitGuard} />}
    {localExitIssue && <p className="notice error" role="alert">입력 초안을 이 기기에 저장하지 못해 화면을 유지했습니다. 로컬 저장 오류를 해결한 뒤 다시 시도해 주세요.</p>}
    {authenticated && tab === 'settings' && !state.accountOpen && <section className="stack" aria-label="데이터 및 앱">
      <h2>데이터 및 앱</h2><PwaStatus />
      <p className="muted small">이 기기의 기존 데모 기록은 계정 데이터가 아니며 서버로 전송되지 않습니다.</p>
      <Button variant="danger" disabled={busy} onClick={() => setDialog('logout')}>{state.pending === 'logout' ? '로그아웃 확인 중…' : '로그아웃'}</Button>
    </section>}
    {dialog && <Dialog title={dialog === 'logout' ? '로그아웃할까요?' : dialog} onClose={() => { if (!busy) setDialog(null) }}>
      {dialog === 'logout' ? <div className="stack"><p>이 브라우저의 로그인을 종료합니다. 서버 미전송 수행·입력 초안·타이머·로컬 사본·미확인 시작 요청은 보존하며, 재인증 전에는 표시하지 않습니다. 기존 데모 기록은 실제 계정과 연결되지 않습니다.</p>{localExitIssue && <p className="notice error" role="alert">초안을 저장하지 못했습니다. 로그아웃을 보류했습니다.</p>}<button className="primary" disabled={busy} onClick={async () => { if (await flushLocal()) { setDialog(null); void controller.logout() } }}>로그아웃 확인</button><button className="quiet" onClick={() => setDialog(null)}>취소</button></div>
        : <div className="stack"><p>서비스 이용 문서를 준비하고 있습니다. 정식 서비스 전에 안내할 예정입니다.</p><button className="outline" onClick={() => setDialog(null)}>닫기</button></div>}
    </Dialog>}
  </AppShell>
}
