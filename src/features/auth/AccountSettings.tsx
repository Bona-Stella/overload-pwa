import { useState } from 'react'
import type { Ref } from 'react'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { Button, Card } from '../../components/ui.tsx'
import { AccountIcon, AccountItem, AccountNote, AccountStatus } from './AccountDetailUi.tsx'
import type { AuthController, AuthState } from './controller.ts'
import { IdentityManagement } from './IdentityManagement'
import styles from './AccountSettings.module.css'

export function AccountSettings({ state, controller, now, headingRef, onBack }: {
  state: AuthState; controller?: AuthController; now: number; headingRef?: Ref<HTMLHeadingElement>; onBack?: () => void
}) {
  const [code, setCode] = useState('')
  const account = state.account, busy = state.pending !== null
  const locked = busy || !controller
  const contact = account.contact, challenge = account.challenge
  const clock = Math.max(now, state.updatedAt)
  const wait = Math.max(0, Math.ceil((account.resendAt - clock) / 1000))
  const verifyWait = Math.max(0, Math.ceil((account.verifyAt - clock) / 1000))
  const remaining = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - clock) / 1000)) : 0
  const clear = () => setCode('')
  const verified = contact?.status === 'VERIFIED'
  const recent = account.confirmedAt !== null && clock - account.confirmedAt <= 600_000
  return <section className={styles.page} aria-label="계정 설정" aria-busy={busy}>
    <RecordSubpageHeader title="계정 설정" backLabel="설정으로" backDisabled={busy} headingRef={headingRef}
      onBack={() => { clear(); if (controller) controller.closeAccount(); else onBack?.() }} />
    {!account.loaded ? <Card className={styles.card} role="status"><p>{busy ? '계정 정보를 확인하고 있어요.' : '계정 정보를 불러오지 못했습니다.'}</p></Card> : <>
      <IdentityManagement state={state} controller={controller} />
      <Card className={styles.card} id="account-email-proof">
        <div className={styles.heading}><h2>대표 재인증 이메일</h2>
          <AccountStatus positive={verified}>{verified ? '등록됨' : contact ? '미등록' : '확인 불가'}</AccountStatus>
        </div>
        {verified ? <>
          <AccountItem icon="email" title={contact.maskedEmail} description="계정 재인증에 사용하는 이메일" />
          <div className={styles.divider}><Button className={styles.action} disabled={locked || wait > 0} onClick={() => { clear(); void controller?.requestEmailProof() }}><AccountIcon name="email" />{state.pending === 'proof-request' ? '인증코드를 보내는 중…' : wait > 0 ? `${wait}초 후 요청 가능` : '이메일로 재인증'}</Button></div>
          <AccountNote>이메일 등록과 최근 재인증 완료 여부는 별개예요.</AccountNote></>
          : contact ? <><p className="notice">대표 이메일 등록 필요 · REQUIRED</p><p className="muted small">재인증에 사용할 이메일을 실제 OTP로 확인해야 합니다. 주소를 직접 입력하거나 변경할 수 없습니다.</p>
            {contact.status === 'REQUIRED' && contact.candidate ? <><AccountItem icon="email" title={contact.candidate.maskedEmail} description="확인된 등록 후보" />
              <p className="muted small">아직 등록되지 않았습니다. 이 후보로 메일을 요청하고 OTP를 검증해야 등록됩니다.</p>
              <button className="primary full" disabled={locked || wait > 0} onClick={() => { clear(); void controller?.requestEmailProof() }}>{state.pending === 'proof-request' ? '인증코드를 보내는 중…' : wait > 0 ? `${wait}초 후 요청 가능` : '후보 이메일로 등록 코드 요청'}</button></>
              : account.identities.filter(value => value.provider === 'google').length > 1 ? <p className="muted small">Google 신원이 여러 개여서 등록 확인 대상을 안전하게 구별할 수 없습니다. 개별 신원 확인 기능이 필요합니다.</p>
              : account.identities.some(value => value.provider === 'google') ? <>
                <p className="muted small">현재 계정에 연결된 Google 계정으로 이메일을 확인합니다. Google 비밀번호 재인증을 강제하는 절차가 아니며, 이메일 OTP 검증은 별도로 필요합니다.</p>
                {account.form && controller ? <form action="/oauth2/contact/google" method="post" className="stack" onSubmit={event => { clear(); if (!controller.beginContactNavigation()) event.preventDefault() }}>
                  <input type="hidden" name="identityId" value={account.form.identityId} />
                  <input type="hidden" name="_csrf" value={account.form.csrf} />
                  <p className="muted small">연결된 Google 계정을 선택해 주세요. 다음 단계에서 직접 OTP 발송을 요청합니다.</p>
                  <button type="submit" className="primary full" disabled={busy}>Google에서 이메일 확인 계속</button>
                </form> : <button className="primary full" disabled={locked} onClick={() => { clear(); void controller?.prepareGoogleContact() }}>Google로 등록 이메일 확인</button>}
              </> : account.identities.some(value => value.provider === 'email') ? <p className="muted small">이메일 OTP로 다시 로그인해 소유권을 확인하면 서버가 검증된 EMAIL 주소를 최초 등록에 사용할 수 있습니다. 기존 계정에서 로그아웃한 뒤 같은 이메일로 로그인해 주세요. 별도 주소 등록 API는 제공하지 않습니다.</p>
                : <p className="muted small">로그인 수단을 확인할 수 없어 등록을 시작할 수 없습니다. 계정 정보를 다시 조회해 주세요.</p>}
            {(account.form || (contact.status === 'REQUIRED' && contact.candidate)) && <button className="outline full" disabled={locked} onClick={() => { clear(); void controller?.cancelRegistration() }}>대표 이메일 등록 취소</button>}
          </> : <AccountNote>대표 이메일 정보를 확인할 수 없습니다. 계정 정보를 새로 확인해 주세요.</AccountNote>}
        {challenge && controller && <form className={`stack ${styles.divider}`} onSubmit={event => { event.preventDefault(); const value = code; clear(); void controller.verifyEmailProof(value) }}>
          <h2>{challenge.candidateId ? '대표 이메일 등록 코드' : '이메일 재인증 코드'}</h2>
          <label htmlFor="account-code">6자리 인증코드<input id="account-code" className="auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} disabled={busy || !remaining || verifyWait > 0} aria-describedby="account-code-hint auth-feedback" onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
          <p className="muted small" id="account-code-hint">{remaining ? `유효시간 ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : '코드 만료'} · 최대 5회 오답 · 재발송 최소 60초. 제한과 권한은 서버가 판단합니다.</p>
          <button type="submit" className="primary full" disabled={busy || code.length !== 6 || !remaining || verifyWait > 0}>{state.pending === 'proof-verify' ? '코드를 확인하는 중…' : verifyWait > 0 ? `${verifyWait}초 후 코드 확인` : '코드 확인'}</button>
          <button data-close-text type="button" className="quiet" disabled={busy} onClick={() => { clear(); controller.clearAccountCode() }}>코드 입력 닫기</button>
        </form>}
      </Card>
      <Card className={styles.card}>
        <div className={styles.heading}><h2>최근 이메일 재인증</h2>
          <AccountStatus positive={recent}>{recent ? '이 화면에서 확인됨' : '서버 이력 확인 불가'}</AccountStatus>
        </div>
        <AccountItem icon="shield"
          title={recent ? '이 화면에서 OTP 검증을 완료했습니다.' : '이 화면에서 확인된 최근 재인증 없음'}
          description={recent ? '민감 작업의 10분 유효 여부는 서버에서 다시 확인합니다.' : '최근 이메일 OTP 검증은 이 화면에서 확인되지 않았습니다.'} />
        <div className={styles.divider}><AccountNote>이메일 등록이나 Google 로그인만으로 재인증이 완료된 것으로 판단하지 않아요.</AccountNote></div>
      </Card>
      <Card className={`${styles.card} ${styles.devices}`}>
        <AccountItem icon="devices" title="로그인된 기기 관리" description="접속 상태 확인 · 원격 로그아웃"
          status={<AccountStatus>미구현</AccountStatus>} />
      </Card>
    </>}
    <Button className={styles.refresh} disabled={locked} onClick={() => { clear(); void controller?.openAccount() }}>
      <AccountIcon name="refresh" />계정 정보 새로 확인
    </Button>
  </section>
}
