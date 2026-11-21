import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useScreenHistory, useNavigationGuard, navigateBack, navigateTabRoot, navigateToCurrentTabRoot } from '../../app/navigation.ts'
import { Dialog } from '../../components/Dialog'
import { useAuth } from './context.ts'
import { LoadingSkeleton } from '../../components/LoadingSkeleton.tsx'
import { LoginScreens } from './LoginScreens'
import { AccountSettings } from './AccountSettings'
import { WorkoutWorkspace } from '../workout-online/WorkoutWorkspace'
import { HomeStartup } from '../home/HomePanel.tsx'
import type { ExitGuardRegistration } from '../workout-local/types.ts'
import { OfflineResume } from '../workout-local/OfflineResume.tsx'
import { SettingsMain } from '../settings/SettingsMain.tsx'
import { RestAlertSettings } from '../settings/RestAlertSettings.tsx'
import { useRestAlertPreferences } from '../workout-flow/useRestAlertPreferences.ts'
import { AppShell } from '../../app/AppShell.tsx'
import { useStartupReveal } from '../../app/useStartupReveal.ts'
import type { AppTab } from '../../app/types.ts'
import type { AuthController } from './controller.ts'
import '../../App.css'
import './auth.css'

export function AuthApp() {
  const { state, controller } = useAuth()
  const [clock, setClock] = useState(() => Date.now())
  const now = Math.max(clock, state.updatedAt)
  const [dialog, setDialog] = useState<string | null>(null)
  const [localExitIssue, setLocalExitIssue] = useState(false)
  const [selection, setSelection] = useScreenHistory<{ userId: string; tab: AppTab; settingsView?: 'main' | 'rest' | 'catalog' | 'alerts' } | null>('app:' + state.userId, null)
  const [restAlerts, saveRestAlerts] = useRestAlertPreferences(state.status === 'authenticated' ? state.userId : null)
  const [focused, setFocused] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [settingsAccount, setSettingsAccount] = useState<{ userId: string; data: Awaited<ReturnType<AuthController['readSettingsAccount']>> | null; failed?: boolean } | null>(null)
  if (settingsAccount && (state.status !== 'authenticated' || state.userId !== settingsAccount.userId || state.pending === 'logout')) setSettingsAccount(null)
  const [settingsAccountRetry, setSettingsAccountRetry] = useState(0)
  const navigationPending = useRef(false)
  const localExitGuard = useRef<(() => Promise<boolean>) | null>(null)
  const restExitGuard = useRef<(() => boolean) | null>(null)
  const settingsTrigger = useRef<HTMLButtonElement | null>(null)
  const settingsScroll = useRef(0)
  const registerExitGuard = useCallback<ExitGuardRegistration>(guard => { localExitGuard.current = guard }, [])
  const registerRestExit = useCallback((guard: (() => boolean) | null) => { restExitGuard.current = guard }, [])
  const tab = state.accountOpen ? 'settings' : selection?.userId === state.userId ? selection!.tab : 'home'
  const checkingHome = state.status === 'checking' && tab === 'home' && typeof window !== 'undefined' && window.location.pathname === '/' &&
    !Object.entries(window.history.state?.overloadNavigation?.values ?? {}).some(([key, value]) =>
      key.startsWith('app:') && value && typeof value === 'object' && 'tab' in value && value.tab !== 'home')
  const navigateFromTabs = (next: AppTab) => {
    if (next !== tab) { void navigate(next); return }
    navigateToCurrentTabRoot(() => {
      if (next !== 'home' || selection) void navigate(next, true)
    })
  }
  const navigate = useCallback(async (next: AppTab, replace = false, children: Record<string, unknown> = {}) => {
    if (next === tab && !replace) return false
    const before = controller.getSnapshot(), guard = localExitGuard.current, origin = window.history.state?.overloadNavigation
    if (navigationPending.current || before.status !== 'authenticated' || before.pending !== null || !before.userId || restExitGuard.current?.() === false) return false
    navigationPending.current = true
    if (guard) setNavigating(true)
    try {
      const saved = guard ? await guard() : true
      setLocalExitIssue(!saved)
      const latest = controller.getSnapshot()
      if (!saved || latest.status !== 'authenticated' || latest.pending !== null || latest.userId !== before.userId || localExitGuard.current !== guard || window.history.state?.overloadNavigation !== origin) return false
      if (latest.accountOpen) controller.closeAccount(false)
      navigateTabRoot('app:' + before.userId, { userId: before.userId, tab: next }, children, latest.accountOpen ? '/' : undefined, replace)
      window.scrollTo(0, 0)
      return true
    } finally { navigationPending.current = false; if (guard) setNavigating(false) }
  }, [controller, tab])
  useNavigationGuard(useCallback(async () => {
    const before = controller.getSnapshot(), guard = localExitGuard.current
    if (before.pending !== null || navigationPending.current || restExitGuard.current?.() === false) return false
    const saved = await (guard?.() ?? Promise.resolve(true))
    setLocalExitIssue(!saved)
    return saved && controller.getSnapshot().userId === before.userId && localExitGuard.current === guard
  }, [controller]))
  const flushLocal = async () => { const saved = await (localExitGuard.current?.() ?? Promise.resolve(true)); setLocalExitIssue(!saved); return saved }
  const showAuthTimer = !!state.challenge || state.accountOpen
  useEffect(() => {
    if (!showAuthTimer) return
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [showAuthTimer])
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
  useStartupReveal(state.status !== 'checking' && (!authenticated || tab !== 'home' || state.accountOpen))
  const settingsVisible = authenticated && tab === 'settings' && !state.accountOpen
  const catalogOpen = settingsVisible && selection?.settingsView === 'catalog' && !focused
  const restAlertsOpen = settingsVisible && selection?.settingsView === 'alerts' && !focused
  const restOpen = tab === 'settings' && !state.accountOpen && (authenticated || state.offlineNetworkFailure) && selection?.settingsView === 'rest' && !focused
  const settingsMain = settingsVisible && !catalogOpen && !restOpen && !restAlertsOpen && !focused
  const settingsUser = settingsMain && !busy ? state.userId : null
  useEffect(() => {
    if (!settingsUser) return
    const abort = new AbortController()
    void controller.readSettingsAccount(settingsUser, abort.signal).then(data => {
      if (!abort.signal.aborted) setSettingsAccount({ userId: settingsUser, data })
    }).catch(error => {
      if (abort.signal.aborted) return
      const denied = ['AUTHENTICATION_REQUIRED', 'SESSION_CHANGED'].includes(error?.code) || error?.status === 401 || error?.status === 403
      setSettingsAccount(previous => ({ userId: settingsUser, data: !denied && previous?.userId === settingsUser ? previous.data : null, failed: true }))
    })
    return () => abort.abort()
  }, [controller, settingsUser, settingsAccountRetry])
  const settingsSummary = settingsAccount?.userId === state.userId ? settingsAccount : null
  useLayoutEffect(() => {
    if (settingsMain && settingsTrigger.current?.isConnected) {
      settingsTrigger.current.focus({ preventScroll: true }); window.scrollTo(0, settingsScroll.current)
    }
  }, [settingsMain])
  const rememberSettings = (button: HTMLButtonElement) => { settingsTrigger.current = button; settingsScroll.current = window.scrollY }
  const settingsBack = (canLeave?: () => boolean) => navigateBack(() => {
    if (!canLeave || canLeave()) setSelection(current => current && { ...current, settingsView: 'main' }, true)
  })
  const accountBack = () => navigateBack(() => {
    controller.closeAccount(false)
    navigateTabRoot('app:' + state.userId, { userId: state.userId, tab: 'settings' }, {}, '/', true)
  })
  return <AppShell authenticated={authenticated} tab={tab} onNavigate={navigateFromTabs} focused={focused && !state.accountOpen} busy={busy || navigating}>
    <div id="auth-feedback" aria-live="polite">
      {state.issue && <div className="notice error" role="alert">{state.issue.message}</div>}
      {state.notice && !state.challenge && <p className="notice" role="status">{state.notice}</p>}
    </div>
    {state.status === 'checking' ? checkingHome
      ? <HomeStartup label="로그인 상태를 확인하고 있어요." /> : <LoadingSkeleton layout="auth" label="로그인 상태를 확인하고 있어요." />
      : state.status === 'unavailable' ? <section className="card stack"><p className="eyebrow">CONNECTION</p><h1>연결을 확인해 주세요</h1><p className="muted">현재 로그인 상태를 확인하지 못했습니다. 연결 문제만으로 로그아웃 처리하지 않습니다.</p><button className="primary full" disabled={busy} onClick={async () => { if (await flushLocal()) void controller.restore() }}>{busy ? '확인 중…' : '로그인 상태 다시 확인'}</button></section>
      : authenticated ? state.accountOpen ? <AccountSettings key={state.userId + ':' + (state.account?.challenge?.id ?? 'none')} state={state} controller={controller} now={now} onBack={accountBack} /> : null
      : <LoginScreens state={state} controller={controller} now={now} onLegal={setDialog} />}
    {authenticated && tab === 'settings' && <SettingsMain userId={state.userId} hidden={!settingsMain} busy={busy} account={settingsSummary?.data ?? undefined} accountLoading={!settingsSummary}
      onRetryAccount={settingsSummary?.failed ? () => setSettingsAccountRetry(value => value + 1) : undefined}
      onAccount={async event => { rememberSettings(event.currentTarget); if (await flushLocal()) void controller.openAccount() }}
      onRest={event => { rememberSettings(event.currentTarget); setSelection(current => current && { ...current, settingsView: 'rest' }) }}
      onRestAlerts={event => { rememberSettings(event.currentTarget); setSelection(current => current && { ...current, settingsView: 'alerts' }) }}
      onCatalog={event => { rememberSettings(event.currentTarget); setSelection(current => current && { ...current, settingsView: 'catalog' }) }}
      onLogout={() => setDialog('logout')} />}
    {restAlertsOpen && <RestAlertSettings alerts={restAlerts} onChange={saveRestAlerts} onBack={settingsBack} />}
    <WorkoutWorkspace onExitGuard={registerExitGuard} tab={tab} onNavigate={navigate} onFocusChange={setFocused}
      catalogOpen={catalogOpen} restOpen={restOpen} onSettingsBack={settingsBack} onRestExitGuard={registerRestExit} />
    {state.status === 'unavailable' && state.offlineNetworkFailure && !state.localWorkoutUserId && <OfflineResume onExitGuard={registerExitGuard} />}
    {localExitIssue && <p className="notice error" role="alert">입력 초안을 이 기기에 저장하지 못해 화면을 유지했습니다. 로컬 저장 오류를 해결한 뒤 다시 시도해 주세요.</p>}
    {dialog && <Dialog title={dialog === 'logout' ? '로그아웃할까요?' : dialog} onClose={() => { if (!busy) setDialog(null) }}>
      {dialog === 'logout' ? <div className="stack"><p>이 브라우저의 로그인을 종료합니다. 서버 미전송 수행·입력 초안·타이머·로컬 사본·미확인 시작 요청은 보존하며, 재인증 전에는 표시하지 않습니다. 기존 데모 기록은 실제 계정과 연결되지 않습니다.</p>{localExitIssue && <p className="notice error" role="alert">초안을 저장하지 못했습니다. 로그아웃을 보류했습니다.</p>}<button className="primary" disabled={busy} onClick={async () => { if (await flushLocal()) { setDialog(null); void controller.logout() } }}>로그아웃 확인</button><button className="quiet" onClick={() => setDialog(null)}>취소</button></div>
        : <div className="stack"><p>서비스 이용 문서를 준비하고 있습니다. 정식 서비스 전에 안내할 예정입니다.</p><button data-close-text className="outline" onClick={() => setDialog(null)}>닫기</button></div>}
    </Dialog>}
  </AppShell>
}
