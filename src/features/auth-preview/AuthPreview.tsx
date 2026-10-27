import { useEffect, useReducer, useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { AuthScreens } from './AuthScreens'
import { AccountScreens, DeletionScope } from './AccountScreens'
import type { PreviewDialog } from './AccountScreens'
import { createPreview, previewReducer, SCENARIOS, visibleAccount } from './model'
import type { Scenario } from './model'
import '../../App.css'
import './auth-preview.css'

const AUTH_SCREENS = ['entry', 'code', 'google', 'signup', 'reauth']
const TABS = [['home', '홈', '⌂'], ['routines', '루틴', '▤'], ['history', '기록', '◷'], ['settings', '설정', '⚙']] as const

export default function AuthPreview() {
  const [state, dispatch] = useReducer(previewReducer, undefined, createPreview)
  const [now, setNow] = useState(() => Date.now())
  const [dialog, setDialog] = useState<PreviewDialog>(null)
  const [scenario, setScenario] = useState<Scenario>('entry')
  const [panelOpen, setPanelOpen] = useState(false)
  const account = visibleAccount(state)
  useEffect(() => {
    if (state.codeStatus !== 'sending') return
    const timer = window.setTimeout(() => { const time = Date.now(); setNow(time); dispatch({ type: 'sent', now: time }) }, 450)
    return () => window.clearTimeout(timer)
  }, [state.codeStatus])
  useEffect(() => {
    if (state.screen !== 'code') return
    const refresh = () => setNow(Date.now())
    const timer = window.setInterval(refresh, 1000)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('pageshow', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [state.screen])
  const props = { state, dispatch, now }
  const tabsVisible = account && !AUTH_SCREENS.includes(state.screen) && !['workout', 'confirm', 'done', 'logout', 'conflict'].includes(state.screen)
  function chooseScenario(value: Scenario) {
    setScenario(value); setDialog(null); const time = Date.now(); setNow(time)
    dispatch({ type: 'scenario', scenario: value, now: time })
  }
  return <div className="app-shell auth-preview">
    <aside className="preview-banner" aria-label="개발용 인증 프리뷰"><span><strong>UX PREVIEW</strong> · 가상 계정 · 메모리 전용</span><a href="/">기존 앱 ↗</a></aside>
    <main className="page" id="preview-main">
      <p className="preview-footnote preview-disclaimer">실제 인증·메일 전송·서버 저장·삭제 없음.<br />새로고침하면 목업 상태만 초기화됩니다.</p>
      {state.message && state.screen !== 'conflict' && <div className="notice" role="status">{state.message}</div>}
      {(state.auth === 'expired' || state.auth === 'refreshFailed') && state.screen !== 'workout' && <div className="notice warning"><strong>{state.auth === 'refreshFailed' ? '세션 갱신 실패' : '인증 만료'}</strong><p>가상 기록은 유지됩니다. 같은 계정으로 재인증해 주세요.</p></div>}
      {AUTH_SCREENS.includes(state.screen) ? <AuthScreens {...props} onLegal={setDialog} /> : <AccountScreens {...props} onDialog={setDialog} />}
      <details className="preview-dev-panel" open={panelOpen} onToggle={e => setPanelOpen(e.currentTarget.open)}>
        <summary>개발 전용 · 시나리오 패널</summary>
        <div className="stack"><p>아래 조작은 제품 UI가 아닙니다. 시나리오 선택은 모든 가상 데이터를 기본 예시로 되돌립니다. 기존 앱 데이터는 읽거나 쓰지 않습니다.</p>
          <label>상황 바로 재현<select value={scenario} onChange={e => chooseScenario(e.target.value as Scenario)}>{SCENARIOS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button className="outline" onClick={() => chooseScenario(scenario)}>선택한 시나리오 다시 시작</button>
          {!account && <label>다음 로그인에 사용할 가상 계정<select value={state.identity} onChange={e => dispatch({ type: 'identity', owner: e.target.value as 'a' | 'b' | 'new' })}><option value="a">계정 A (기존 계정)</option><option value="b">계정 B (다른 계정)</option><option value="new">신규 계정</option></select></label>}
          {state.screen === 'code' && <><button className="outline" onClick={() => dispatch({ type: 'codeTime' })}>재발송 30초 경과 시연</button><button className="outline" onClick={() => dispatch({ type: 'codeTime', expired: true })}>코드 5분 만료 시연</button></>}
          {account && <button className="outline" onClick={() => dispatch({ type: 'expire' })}>현재 화면에서 인증 만료 시연</button>}
          {state.sync === 'offline' && <button className="outline" onClick={() => dispatch({ type: 'networkRestored' })}>가상 인터넷 연결 복원</button>}
          <p className="preview-state">화면: {state.screen} · 인증: {state.auth}<br />계정: {state.owner ?? '없음'} · 동기화: {state.sync}</p>
          <p>검토 기준값: 짧은 세션 30분 / 마지막 실제 사용 후 자동 로그인 30일 / 최초 인증 후 재인증 상한 90일 / 민감 작업 10분 이내 재인증. 실제 세션 타이머·토큰 갱신은 없습니다.</p>
        </div>
      </details>
    </main>
    {tabsVisible && <nav className="tab-bar" aria-label="프리뷰 기본 탐색">{TABS.map(([screen, label, icon]) => <button key={screen} aria-current={state.screen === screen ? 'page' : undefined} onClick={() => dispatch({ type: 'navigate', screen })}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav>}
    {dialog && <Dialog title={dialog === 'export' ? '가상 운동 데이터 내보내기' : dialog === 'terms' ? '이용약관 예시' : dialog === 'privacy' ? '개인정보 처리방침 예시' : dialog === 'reset' ? '운동 데이터 전체 초기화 안내' : '회원 탈퇴 안내'} onClose={() => setDialog(null)}>
      <div className="stack">{dialog === 'export' ? <><p>현재 가상 계정의 예시 JSON입니다. 실제 앱 기록은 포함하지 않습니다. 텍스트를 길게 눌러 복사할 수 있습니다.</p><pre className="preview-export" tabIndex={0}>{JSON.stringify({ mock: true, account: state.owner, routines: account?.routines ?? 0, history: account?.history ?? [], unsynced: account?.pending ?? 0 }, null, 2)}</pre></>
        : dialog === 'terms' || dialog === 'privacy' ? <><p>UX 검토용 문서 위치 예시입니다. 실제 법률 문서가 아니며 서비스 운영용 약관·개인정보 처리방침은 별도로 작성해야 합니다.</p><p className="muted">Google 또는 이메일 인증으로 가입하고, 선택 닉네임만 설정하는 흐름입니다. 이 목업은 입력을 서버로 보내거나 브라우저 저장소에 저장하지 않습니다.</p></>
        : <><p>{dialog === 'reset' ? '계정과 로그인 수단을 유지하고 운동 데이터만 초기화하는 흐름입니다. 새 프로그램을 시작하려면 이력을 유지하는 “새 루틴으로 시작하기”도 이용할 수 있습니다.' : '회원 탈퇴는 계정과 연결된 로그인 수단까지 삭제하는 별도의 흐름입니다. 미동기화 로컬 기록도 탈퇴 대상이며 다른 계정으로 전송하지 않습니다.'}</p><DeletionScope withdraw={dialog === 'withdraw'} /><button className="outline" onClick={() => setDialog('export')}>삭제 전 가상 데이터 내보내기</button><p className="muted small">이후 본인 재인증과 최종 확인을 진행합니다. 실제 데이터 삭제는 하지 않습니다.</p><button className="primary" onClick={() => { dispatch({ type: 'sensitive', intent: dialog === 'reset' ? 'reset' : 'withdraw' }); setDialog(null) }}>본인 재인증으로 계속</button></>}
        <button className="quiet" onClick={() => setDialog(null)}>닫기</button>
      </div>
    </Dialog>}
  </div>
}
