import { useState } from 'react'
import type { AuthController, AuthState } from './controller.ts'

type Props = { state: AuthState; controller: AuthController; now: number; onLegal: (name: string) => void }
export function LoginScreens({ state, controller, now, onLegal }: Props) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const busy = state.pending !== null
  const challenge = state.challenge
  const clock = Math.max(now, state.updatedAt ?? now)
  const resend = Math.max(0, Math.ceil((state.resendAt - clock) / 1000))
  const verifyWait = Math.max(0, Math.ceil(((state.verifyAt ?? 0) - clock) / 1000))
  const remaining = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - clock) / 1000)) : 0
  if (challenge) return <section className="card stack" aria-busy={busy}>
    <button className="quiet auth-back" disabled={busy} onClick={() => { setCode(''); controller.cancelOtp() }}>‹ 이메일 주소 변경</button>
    <p className="eyebrow">CHECK YOUR EMAIL</p><h1>6자리 코드를<br />입력해 주세요</h1>
    <p className="muted auth-address">{challenge.email}</p>
    <p role="status">{state.pending === 'request' ? '인증코드를 보내는 중…' : state.notice || '메일함과 발송 결과를 확인해 주세요.'}</p>
    <form className="stack" onSubmit={event => { event.preventDefault(); const value = code; setCode(''); void controller.verifyOtp(value) }}>
      <label htmlFor="auth-code">인증코드<input id="auth-code" className="auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} enterKeyHint="done" value={code} disabled={busy || !challenge.id || remaining === 0 || verifyWait > 0} aria-describedby="auth-code-hint auth-feedback" onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
      <div id="auth-code-hint" className="auth-code-caption"><span>{!challenge.id ? '발송 완료 후 5분간 유효' : remaining > 0 ? `유효시간 ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : '코드 만료'}</span><span>최대 5회 입력</span></div>
      <button type="submit" className="primary full" disabled={busy || !challenge.id || code.length !== 6 || remaining === 0 || verifyWait > 0}>{state.pending === 'verify' ? '로그인 확인 중…' : verifyWait > 0 ? `${verifyWait}초 후 코드 확인` : '코드 확인'}</button>
      <button type="button" className="outline" disabled={busy || resend > 0} onClick={() => { setCode(''); void controller.requestOtp(challenge.email) }}>{resend > 0 ? `${resend}초 후 재발송` : '인증코드 재발송'}</button>
    </form>
    <p className="muted small">새 코드를 요청하면 이전 코드는 사용할 수 없습니다. 유효시간과 재요청 제한은 서버 확인이 기준입니다.</p>
  </section>
  return <div className="auth-entry stack" aria-busy={busy}>
    <p className="auth-wordmark">OVERLOAD<span> / </span></p>
    <div className="auth-entry-heading"><p className="eyebrow">YOUR PROGRESS, TOGETHER</p><h1>꾸준히 쌓은 나의 기록,<br />어디서든 이어서<span className="brand-dot">.</span></h1><p className="muted">하나의 계정으로 시작하는 나만의 운동.</p></div>
    <button className="auth-google full" disabled={busy} onClick={() => { setCode(''); controller.googleLogin() }}><span aria-hidden="true">G</span>{state.pending === 'google' ? 'Google로 이동 중…' : 'Google로 계속하기'}</button>
    <div className="auth-divider">또는 이메일로</div>
    <form className="stack" onSubmit={event => { event.preventDefault(); setCode(''); void controller.requestOtp(email) }}>
      <label htmlFor="auth-email">이메일 주소<input id="auth-email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} enterKeyHint="go" placeholder="you@example.com" required maxLength={254} value={email} disabled={busy} aria-describedby="auth-feedback" onChange={event => setEmail(event.target.value)} /></label>
      <button className="primary full" type="submit" disabled={busy || resend > 0}>{resend > 0 ? `${resend}초 후 요청 가능` : '이메일로 계속하기'}</button>
    </form>
    <p className="muted small">처음이라면 인증 후 가입으로, 기존 회원이라면 로그인으로 이어집니다. 비밀번호는 필요하지 않아요.</p>
    <div className="row"><button className="quiet" onClick={() => onLegal('이용약관')}>이용약관</button><button className="quiet" onClick={() => onLegal('개인정보 처리방침')}>개인정보 처리방침</button></div>
  </div>
}
