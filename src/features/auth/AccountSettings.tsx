import { useState } from 'react'
import type { AuthController, AuthState } from './controller.ts'
import { IdentityManagement } from './IdentityManagement'

export function AccountSettings({ state, controller, now }: { state: AuthState; controller: AuthController; now: number }) {
  const [code, setCode] = useState('')
  const account = state.account, busy = state.pending !== null
  const contact = account.contact, challenge = account.challenge
  const clock = Math.max(now, state.updatedAt)
  const wait = Math.max(0, Math.ceil((account.resendAt - clock) / 1000))
  const verifyWait = Math.max(0, Math.ceil((account.verifyAt - clock) / 1000))
  const remaining = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - clock) / 1000)) : 0
  const clear = () => setCode('')
  return <section className="stack auth-account">
    <button className="quiet auth-back" disabled={busy} onClick={() => { clear(); controller.closeAccount() }}>‹ 로그인된 화면으로</button>
    <p className="eyebrow">YOUR ACCOUNT</p><h1>계정 설정<span className="brand-dot">.</span></h1>
    <p className="muted">로그인되어 있습니다. 로그인 수단과 재인증 이메일을 확인하세요.</p>
    {!account.loaded ? <section className="card stack" role="status"><p>{busy ? '계정 정보를 확인하고 있어요.' : '계정 정보를 불러오지 못했습니다.'}</p>
      <button className="outline full" disabled={busy} onClick={() => { clear(); void controller.openAccount() }}>계정 정보 다시 확인</button></section> : <>
      <IdentityManagement state={state} controller={controller} />
      <section className="card stack" id="account-email-proof"><h2>대표 재인증 이메일</h2>
        {contact?.status === 'VERIFIED' ? <><div className="auth-status"><strong>등록 완료 · VERIFIED</strong><span>{contact.maskedEmail}</span></div>
          <p className="muted small">대표 이메일은 로그인 수단과 별도입니다. 등록 완료가 최근 이메일 재인증 완료를 뜻하지는 않습니다.</p>
          <button className="primary full" disabled={busy || wait > 0} onClick={() => { clear(); void controller.requestEmailProof() }}>{state.pending === 'proof-request' ? '인증코드를 보내는 중…' : wait > 0 ? `${wait}초 후 요청 가능` : '이메일로 재인증'}</button></>
          : <><p className="notice">대표 이메일 등록 필요 · REQUIRED</p><p className="muted small">재인증에 사용할 이메일을 실제 OTP로 확인해야 합니다. 주소를 직접 입력하거나 변경할 수 없습니다.</p>
            {contact?.status === 'REQUIRED' && contact.candidate ? <><div className="auth-status"><strong>확인된 등록 후보</strong><span>{contact.candidate.maskedEmail}</span></div>
              <p className="muted small">아직 등록되지 않았습니다. 이 후보로 메일을 요청하고 OTP를 검증해야 등록됩니다.</p>
              <button className="primary full" disabled={busy || wait > 0} onClick={() => { clear(); void controller.requestEmailProof() }}>{state.pending === 'proof-request' ? '인증코드를 보내는 중…' : wait > 0 ? `${wait}초 후 요청 가능` : '후보 이메일로 등록 코드 요청'}</button></>
              : account.identities.filter(value => value.provider === 'google').length > 1 ? <p className="muted small">Google 신원이 여러 개여서 등록 확인 대상을 안전하게 구별할 수 없습니다. 개별 신원 확인 기능이 필요합니다.</p>
              : account.identities.some(value => value.provider === 'google') ? <>
                <p className="muted small">현재 계정에 연결된 Google 계정으로 이메일을 확인합니다. Google 비밀번호 재인증을 강제하는 절차가 아니며, 이메일 OTP 검증은 별도로 필요합니다.</p>
                {account.form ? <form action="/oauth2/contact/google" method="post" className="stack" onSubmit={event => { clear(); if (!controller.beginContactNavigation()) event.preventDefault() }}>
                  <input type="hidden" name="identityId" value={account.form.identityId} />
                  <input type="hidden" name="_csrf" value={account.form.csrf} />
                  <p className="muted small">연결된 Google 계정을 선택해 주세요. 다음 단계에서 직접 OTP 발송을 요청합니다.</p>
                  <button type="submit" className="primary full" disabled={busy}>Google에서 이메일 확인 계속</button>
                </form> : <button className="primary full" disabled={busy} onClick={() => { clear(); void controller.prepareGoogleContact() }}>Google로 등록 이메일 확인</button>}
              </> : account.identities.some(value => value.provider === 'email') ? <p className="muted small">이메일 OTP로 다시 로그인해 소유권을 확인하면 서버가 검증된 EMAIL 주소를 최초 등록에 사용할 수 있습니다. 기존 계정에서 로그아웃한 뒤 같은 이메일로 로그인해 주세요. 별도 주소 등록 API는 제공하지 않습니다.</p>
                : <p className="muted small">로그인 수단을 확인할 수 없어 등록을 시작할 수 없습니다. 계정 정보를 다시 조회해 주세요.</p>}
            {(account.form || (contact?.status === 'REQUIRED' && contact.candidate)) && <button className="outline full" disabled={busy} onClick={() => { clear(); void controller.cancelRegistration() }}>대표 이메일 등록 취소</button>}
          </>}
        {challenge && <form className="stack" onSubmit={event => { event.preventDefault(); const value = code; clear(); void controller.verifyEmailProof(value) }}>
          <h2>{challenge.candidateId ? '대표 이메일 등록 코드' : '이메일 재인증 코드'}</h2>
          <label htmlFor="account-code">6자리 인증코드<input id="account-code" className="auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} disabled={busy || !remaining || verifyWait > 0} aria-describedby="account-code-hint auth-feedback" onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
          <p className="muted small" id="account-code-hint">{remaining ? `유효시간 ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : '코드 만료'} · 최대 5회 오답 · 재발송 최소 60초. 제한과 권한은 서버가 판단합니다.</p>
          <button type="submit" className="primary full" disabled={busy || code.length !== 6 || !remaining || verifyWait > 0}>{state.pending === 'proof-verify' ? '코드를 확인하는 중…' : verifyWait > 0 ? `${verifyWait}초 후 코드 확인` : '코드 확인'}</button>
          <button type="button" className="quiet" disabled={busy} onClick={() => { clear(); controller.clearAccountCode() }}>코드 입력 닫기</button>
        </form>}
      </section>
      <section className="card stack"><h2>최근 이메일 재인증</h2>
        {account.confirmedAt !== null && clock - account.confirmedAt <= 600_000 ? <p className="notice">이 화면에서 OTP 검증을 완료했습니다. 민감 작업의 10분 유효 여부는 서버에서 다시 확인합니다.</p>
          : <p className="muted small">최근 이메일 OTP 검증은 이 화면에서 확인되지 않았습니다. Google 로그인 또는 대표 이메일 등록 상태만으로 이메일 소유권 검증을 완료했다고 표시하지 않습니다.</p>}
      </section>
      <button className="outline full" disabled={busy} onClick={() => { clear(); void controller.openAccount() }}>계정 정보 새로 확인</button>
    </>}
  </section>
}
