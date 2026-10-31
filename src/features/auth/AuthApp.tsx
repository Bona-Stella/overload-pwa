import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { useAuth } from './context.ts'
import { LoginScreens } from './LoginScreens'
import { AccountSettings } from './AccountSettings'
import { WorkoutOverview } from '../workout-read/WorkoutOverview'
import { WorkoutWorkspace } from '../workout-online/WorkoutWorkspace'
import type { ExitGuardRegistration } from '../workout-local/types.ts'
import '../../App.css'
import './auth.css'

export function AuthApp() {
  const { state, controller } = useAuth()
  const [now, setNow] = useState(() => Date.now())
  const [dialog, setDialog] = useState<string | null>(null)
  const [localExitIssue, setLocalExitIssue] = useState(false)
  const localExitGuard = useRef<(() => Promise<boolean>) | null>(null)
  const registerExitGuard = useCallback<ExitGuardRegistration>(guard => { localExitGuard.current = guard }, [])
  const flushLocal = async () => { const saved = await (localExitGuard.current?.() ?? Promise.resolve(true)); setLocalExitIssue(!saved); return saved }
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const busy = state.pending !== null
  return <div className="app-shell auth-app"><main className="page">
    <div id="auth-feedback" aria-live="polite">
      {state.issue && <div className="notice error" role="alert">{state.issue.message}</div>}
      {state.notice && !state.challenge && <p className="notice" role="status">{state.notice}</p>}
    </div>
    {state.status === 'checking' ? <section className="card stack" role="status"><p className="eyebrow">WELCOME BACK</p><h1>로그인 상태를<br />확인하고 있어요<span className="brand-dot">.</span></h1><p className="muted">잠시만 기다려 주세요.</p></section>
      : state.status === 'unavailable' ? <section className="card stack"><p className="eyebrow">CONNECTION</p><h1>연결을 확인해 주세요</h1><p className="muted">현재 로그인 상태를 확인하지 못했습니다. 연결 문제만으로 로그아웃 처리하지 않습니다.</p><button className="primary full" disabled={busy} onClick={() => void controller.restore()}>{busy ? '확인 중…' : '로그인 상태 다시 확인'}</button></section>
      : state.status === 'authenticated' ? <>{state.accountOpen ? <AccountSettings key={state.userId + ':' + (state.account?.challenge?.id ?? 'none')} state={state} controller={controller} now={now} /> : <section className="stack"><p className="auth-wordmark">OVERLOAD<span> / </span></p><p className="eyebrow">READY FOR YOUR NEXT SET</p><h1>다시 만나 반가워요<span className="brand-dot">.</span></h1><p className="notice" role="status">로그인되었습니다.</p></section>}<button className="outline full" disabled={busy} onClick={() => setDialog('logout')}>{state.pending === 'logout' ? '로그아웃 확인 중…' : '로그아웃'}</button></>
      : <LoginScreens state={state} controller={controller} now={now} onLegal={setDialog} />}
    <WorkoutWorkspace onExitGuard={registerExitGuard} />
    {localExitIssue && <p className="notice error" role="alert">입력 초안을 이 기기에 저장하지 못해 화면을 유지했습니다. 로컬 저장 오류를 해결한 뒤 다시 시도해 주세요.</p>}
    {state.status === 'authenticated' && !state.accountOpen && <section className="stack"><WorkoutOverview /><p className="muted small">이 기기의 기존 데모 기록은 계정 데이터가 아니며 서버로 전송되지 않습니다.</p><button className="primary full" disabled={busy} onClick={async () => { if (await flushLocal()) void controller.openAccount() }}>계정 설정</button></section>}
    {dialog && <Dialog title={dialog === 'logout' ? '로그아웃할까요?' : dialog} onClose={() => { if (!busy) setDialog(null) }}>
      {dialog === 'logout' ? <div className="stack"><p>이 브라우저의 로그인을 종료합니다. 서버 미전송 수행·입력 초안·타이머·로컬 사본·미확인 시작 요청은 보존하며, 재인증 전에는 표시하지 않습니다. 기존 데모 기록은 실제 계정과 연결되지 않습니다.</p>{localExitIssue && <p className="notice error" role="alert">초안을 저장하지 못했습니다. 로그아웃을 보류했습니다.</p>}<button className="primary" disabled={busy} onClick={async () => { if (await flushLocal()) { setDialog(null); void controller.logout() } }}>로그아웃 확인</button><button className="quiet" onClick={() => setDialog(null)}>취소</button></div>
        : <div className="stack"><p>서비스 이용 문서를 준비하고 있습니다. 정식 서비스 전에 안내할 예정입니다.</p><button className="outline" onClick={() => setDialog(null)}>닫기</button></div>}
    </Dialog>}
  </main></div>
}
