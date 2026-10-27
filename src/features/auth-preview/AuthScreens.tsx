import type { Dispatch } from 'react'
import { TEST_CODE, visibleAccount } from './model'
import type { PreviewAction, PreviewState } from './model'

export type PreviewProps = { state: PreviewState; dispatch: Dispatch<PreviewAction>; now: number }
type Props = PreviewProps & { onLegal: (kind: 'terms' | 'privacy') => void }

export function AuthScreens({ state: s, dispatch, now, onLegal }: Props) {
  const account = visibleAccount(s)
  const remaining = Math.max(0, Math.ceil((s.expiresAt - now) / 1000))
  const resend = Math.max(0, Math.ceil((s.resendAt - now) / 1000))
  const back = () => dispatch({ type: 'navigate', screen: account ? 'settings' : 'entry' })
  if (s.screen === 'google') return <section className="card stack">
    <p className="eyebrow">SIMULATED PROVIDER</p><h1>Google 인증 시연</h1>
    <p>실제 Google 창은 열리지 않습니다. 아래에서 가상 인증 결과를 선택해 주세요.</p>
    <p className="muted small">{s.context === 'reauth' ? `현재 계정 ${account?.email}의 본인 확인` : s.context === 'linkGoogle' ? '현재 Overload 계정에 새 Google 수단 연결' : `개발 패널에서 선택한 가상 계정 ${s.identity.toUpperCase()}로 진행`}</p>
    <button className="primary" onClick={() => dispatch({ type: 'googleResult', result: 'success' })}>가상 Google 인증 성공</button>
    <button className="outline" onClick={() => dispatch({ type: 'googleResult', result: 'cancel' })}>Google 로그인 취소 시연</button>
    <button className="outline" onClick={() => dispatch({ type: 'googleResult', result: 'failed' })}>Google 인증 실패 시연</button>
  </section>
  if (s.screen === 'reauth') return <section className="card stack">
    <p className="eyebrow">CONFIRM IT’S YOU</p><h1>본인 확인이 필요해요</h1>
    <p>민감한 계정 작업은 최근 10분 이내의 재인증이 필요합니다. 이 프리뷰에서는 매번 본인 확인을 시연합니다.</p>
    <p className="muted">현재 가상 계정 · {account?.email}</p>
    <p className="small muted">이전 기록은 같은 계정으로만 동기화할 수 있습니다. 다른 계정 인증으로 현재 계정을 바꾸지 않습니다.</p>
    {account?.emailLinked && <button className="primary" onClick={() => dispatch({ type: 'send', context: 'reauth', now })}>이메일 코드로 재인증</button>}
    {account?.googleLinked && <button className="outline" onClick={() => dispatch({ type: 'google', context: 'reauth' })}>Google로 재인증</button>}
    <button className="quiet" onClick={back}>취소하고 돌아가기</button>
  </section>
  if (s.screen === 'signup') return <section className="card stack">
    <p className="eyebrow">ONE MORE STEP</p><h1>반가워요.<br />함께 기록해요<span className="brand-dot">.</span></h1>
    <p>이메일 인증을 마쳤거나 Google 인증에 성공한 신규 회원의 가입 단계입니다.</p>
    <label>닉네임 (선택)<input autoComplete="nickname" maxLength={30} placeholder="비워두어도 괜찮아요" value={s.nickname} onChange={e => dispatch({ type: 'field', field: 'nickname', value: e.target.value })} /></label>
    <p className="muted small">키·몸무게·성별은 수집하지 않습니다.</p>
    <div className="row"><button className="quiet" onClick={() => onLegal('terms')}>이용약관 예시</button><button className="quiet" onClick={() => onLegal('privacy')}>개인정보 처리방침 예시</button></div>
    <label className="preview-check"><input type="checkbox" checked={s.accepted} onChange={e => dispatch({ type: 'accept', value: e.target.checked })} />약관과 개인정보 처리방침 예시 확인 및 동의 (가상)</label>
    <button className="primary full" disabled={!s.accepted} onClick={() => dispatch({ type: 'signup' })}>가상 가입 완료</button>
    <p className="muted small">실제 계정이나 법적 동의 기록은 생성하지 않습니다.</p>
    <button className="quiet" onClick={back}>처음으로</button>
  </section>
  if (s.screen === 'code') return <section className="card stack">
    <button className="quiet preview-back" onClick={() => dispatch({ type: 'navigate', screen: s.context === 'reauth' ? 'reauth' : account ? 'settings' : 'entry' })}>‹ {s.context === 'signin' ? '이메일 주소 변경' : '이전 단계'}</button>
    <p className="eyebrow">CHECK YOUR EMAIL · MOCK</p><h1>6자리 코드를<br />입력해 주세요</h1>
    <p className="muted">{s.email}</p>
    <p role="status">{s.codeStatus === 'sending' ? '인증코드 전송 중 · 가상 전송입니다…' : s.codeStatus === 'idle' ? '새로 연결할 이메일로 인증코드를 요청해 주세요.' : '가상 인증코드 전송 완료 · 실제 이메일은 발송되지 않았습니다.'}</p>
    {s.context === 'linkEmail' && s.codeStatus === 'idle' && <label>연결할 이메일<input type="email" inputMode="email" autoComplete="email" value={s.email} onChange={e => dispatch({ type: 'field', field: 'email', value: e.target.value })} /></label>}
    {s.codeStatus === 'idle' ? <button className="primary" onClick={() => dispatch({ type: 'send', now })}>가상 인증코드 전송</button> : <form className="stack" onSubmit={e => { e.preventDefault(); dispatch({ type: 'verify', now }) }}>
      <label htmlFor="preview-code">인증코드<input id="preview-code" className="preview-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} enterKeyHint="done" value={s.code} aria-describedby="code-hint" disabled={s.codeStatus === 'sending'} onChange={e => dispatch({ type: 'field', field: 'code', value: e.target.value })} /></label>
      <div id="code-hint" className="preview-code-caption"><span>{s.codeStatus === 'sending' ? '전송 완료 후 5분간 유효' : remaining > 0 ? `유효시간 ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : '코드 만료'}</span><span>시도 {s.attempts}/5</span></div>
      <button type="submit" className="primary full" disabled={s.code.length !== 6 || s.codeStatus !== 'sent' || s.attempts >= 5 || remaining === 0}>코드 확인</button>
      <button type="button" className="outline" disabled={resend > 0 || s.sends >= 3 || s.codeStatus === 'sending'} onClick={() => dispatch({ type: 'send', now })}>{s.sends >= 3 ? '재발송 횟수 제한' : resend > 0 ? `${resend}초 후 재발송` : '인증코드 재발송'}</button>
      {(s.attempts >= 5 || s.sends >= 3) && <p className="warning notice">제한에 도달했습니다. 새 코드 요청 또는 개발 패널의 시나리오 재시작을 이용해 주세요.</p>}
    </form>}
    <p className="preview-test-code">프리뷰 전용 코드 <strong>{TEST_CODE}</strong> · 복사·붙여넣기 가능</p>
  </section>
  return <div className="preview-entry stack">
    <p className="preview-wordmark">OVERLOAD<span> / </span></p>
    <div className="preview-entry-heading"><p className="eyebrow">YOUR PROGRESS, TOGETHER</p><h1>꾸준히 쌓은 나의 기록,<br />어디서든 이어서<span className="brand-dot">.</span></h1><p className="muted">하나의 계정으로 시작하는 나만의 운동.</p></div>
    <button className="preview-google full" onClick={() => dispatch({ type: 'google', context: 'signin' })}><span aria-hidden="true">G</span> Google로 계속하기</button>
    <div className="preview-divider">또는 이메일로</div>
    <form className="stack" noValidate onSubmit={e => { e.preventDefault(); dispatch({ type: 'send', context: 'signin', now }) }}>
      <label htmlFor="preview-email">이메일 주소<input id="preview-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} enterKeyHint="go" placeholder="you@example.com" value={s.email} onChange={e => dispatch({ type: 'field', field: 'email', value: e.target.value })} /></label>
      <button className="primary full" type="submit">이메일로 계속하기</button>
    </form>
    <p className="muted small">처음이라면 인증 후 가입으로, 기존 회원이라면 로그인으로 이어집니다. 비밀번호는 필요하지 않아요.</p>
    <div className="row"><button className="quiet" onClick={() => onLegal('terms')}>이용약관</button><button className="quiet" onClick={() => onLegal('privacy')}>개인정보 처리방침</button></div>
    <p className="preview-footnote">지금은 가상 계정 {s.identity.toUpperCase()} 시연 중입니다.<br />화면 아래 개발 패널에서 신규·기존 계정을 선택하세요.</p>
  </div>
}
