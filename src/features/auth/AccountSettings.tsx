import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ComponentType, ReactNode, Ref } from 'react'
import { navigateBack, useScreenHistory } from '../../app/navigation.ts'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { LoadingSkeleton } from '../../components/LoadingSkeleton.tsx'
import { Button, Card } from '../../components/ui.tsx'
import { Toast } from '../../components/common-ui/Toast.tsx'
import { RefreshButton } from '../../components/common-ui/RefreshButton.tsx'
import { ContentError } from '../../components/common-ui/ContentFeedback.tsx'
import { useReadErrorToast } from '../../components/common-ui/useReadErrorToast.ts'
import { AccountIcon, AccountItem, AccountNote, AccountStatus } from './AccountDetailUi.tsx'
import type { AuthController, AuthState } from './controller.ts'
import { IdentityManagement } from './IdentityManagement'
import { LoggedInDevices } from './LoggedInDevices.tsx'
import type { DevicesNavigation } from './LoggedInDevices.tsx'
import styles from './AccountSettings.module.css'

export function AccountSettings({ state, controller, now, headingRef, onBack, DevicesPage = LoggedInDevices, children }: {
  state: AuthState; controller?: AuthController; now: number; headingRef?: Ref<HTMLHeadingElement>; onBack?: () => void
  DevicesPage?: ComponentType<DevicesNavigation>; children?: ReactNode
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
  const [devicesOpen, setDevicesOpen] = useScreenHistory('account-devices:' + (state.userId ?? 'review'), false)
  const success = state.accountSuccess
  const issueTone = state.issue?.code === 'EMAIL_LINK_STATUS_UNCONFIRMED' ? 'warning' : state.issue?.tone ?? 'error'
  const feedback = useReadErrorToast(account.loaded && !busy && !challenge && !devicesOpen ? state.issue?.message : null, issueTone)
  useEffect(() => {
    if (devicesOpen && success) controller?.dismissAccountSuccess(success.id)
  }, [controller, devicesOpen, success])
  const devicesHeading = useRef<HTMLHeadingElement>(null)
  const devicesLink = useRef<HTMLButtonElement>(null)
  const devicesScroll = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (devicesOpen) {
      devicesHeading.current?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
    } else if (devicesScroll.current !== null) {
      devicesLink.current?.focus({ preventScroll: true })
      window.scrollTo(0, devicesScroll.current)
    }
  }, [devicesOpen])
  if (devicesOpen) return <DevicesPage headingRef={devicesHeading} onBack={() => navigateBack(() => setDevicesOpen(false, true))} />
  const refresh = <RefreshButton className={styles.refresh} disabled={locked} loading={state.pending === 'account'}
    failure={!account.loaded ? state.issue?.message : null} onRefresh={() => { clear(); void controller?.openAccount() }} />
  return <><section className={styles.page} aria-label="계정 설정" aria-busy={busy}>
    <RecordSubpageHeader title="계정 설정" backLabel="설정으로" backDisabled={busy} headingRef={headingRef}
      onBack={() => { clear(); if (onBack) onBack(); else controller?.closeAccount() }} />
    {!account.loaded ? busy && !state.issue ? <LoadingSkeleton layout="settings" label="계정 정보를 확인하고 있어요." /> : <ContentError
      title={state.issue?.code === 'EMAIL_LINK_STATUS_UNCONFIRMED' ? '이메일 연결 상태를 불러오지 못했어요.' : '계정 정보를 불러오지 못했어요.'} action={refresh} /> : <>
      <IdentityManagement state={state} controller={controller} />
      <Card className={styles.card} id="account-email-proof">
        <div className={styles.heading}><h2>대표 재인증 이메일</h2>
          <AccountStatus positive={verified}>{verified ? '등록됨' : contact ? '미등록' : '확인 불가'}</AccountStatus>
        </div>
        {verified ? <>
          <AccountItem icon="email" title={contact.maskedEmail} description="계정 재인증에 사용하는 이메일" />
          <div className={styles.divider}><Button className={styles.action} disabled={locked || wait > 0} onClick={() => { clear(); void controller?.requestEmailProof() }}><AccountIcon name="email" />{state.pending === 'proof-request' ? '인증코드를 보내는 중…' : wait > 0 ? `${wait}초 후 요청 가능` : '이메일로 재인증'}</Button></div>
          </>
          : contact ? <><p className="notice">대표 이메일 등록 필요</p><p className="muted small">재인증에 사용할 이메일을 확인해 주세요.</p>
            {contact.status === 'REQUIRED' && contact.candidate ? <><AccountItem icon="email" title={contact.candidate.maskedEmail} description="등록할 이메일" />
              <p className="muted small">이 이메일로 받은 인증코드를 입력하면 등록돼요.</p>
              <button className="primary full" disabled={locked || wait > 0} onClick={() => { clear(); void controller?.requestEmailProof() }}>{state.pending === 'proof-request' ? '인증코드를 보내는 중…' : wait > 0 ? `${wait}초 후 요청 가능` : '후보 이메일로 등록 코드 요청'}</button></>
              : account.identities.filter(value => value.provider === 'google').length > 1 ? <p className="muted small">연결된 Google 계정이 여러 개라 지금은 등록할 이메일을 확인할 수 없어요.</p>
              : account.identities.some(value => value.provider === 'google') ? <>
                <p className="muted small">연결된 Google 계정에서 이메일을 확인한 뒤 인증코드를 받아요.</p>
                {account.form && controller ? <form action="/oauth2/contact/google" method="post" className="stack" onSubmit={event => { clear(); if (!controller.beginContactNavigation()) event.preventDefault() }}>
                  <input type="hidden" name="identityId" value={account.form.identityId} />
                  <input type="hidden" name="_csrf" value={account.form.csrf} />
                  <p className="muted small">연결된 Google 계정을 선택해 주세요.</p>
                  <button type="submit" className="primary full" disabled={busy}>Google에서 이메일 확인 계속</button>
                </form> : <button className="primary full" disabled={locked} onClick={() => { clear(); void controller?.prepareGoogleContact() }}>Google로 등록 이메일 확인</button>}
              </> : account.identities.some(value => value.provider === 'email') ? <p className="muted small">로그아웃한 뒤 같은 이메일로 다시 로그인해 주세요.</p>
                : <p className="muted small">로그인 수단을 확인할 수 없어 등록을 시작할 수 없습니다. 계정 정보를 다시 조회해 주세요.</p>}
            {(account.form || (contact.status === 'REQUIRED' && contact.candidate)) && <button className="outline full action-pill" disabled={locked} onClick={() => { clear(); void controller?.cancelRegistration() }}>대표 이메일 등록 취소</button>}
          </> : <AccountNote>대표 이메일 정보를 확인할 수 없습니다. 계정 정보를 새로 확인해 주세요.</AccountNote>}
        {challenge && controller && <form className={`stack ${styles.divider}`} onSubmit={event => { event.preventDefault(); const value = code; clear(); void controller.verifyEmailProof(value) }}>
          <h2>{challenge.candidateId ? '대표 이메일 등록 코드' : '이메일 재인증 코드'}</h2>
          <label htmlFor="account-code">6자리 인증코드<input id="account-code" className="auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} disabled={busy || !remaining || verifyWait > 0} aria-describedby="account-code-hint auth-feedback" onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
          <p className="muted small" id="account-code-hint">{remaining ? `남은 시간 ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : '코드가 만료됐어요'} · 최대 5회 입력 · 60초 후 재요청</p>
          {state.issue && <p className="notice error" id="auth-feedback" role="alert">{state.issue.message}</p>}
          {!state.issue && state.notice && <p className="muted small" id="auth-feedback" role="status">{state.notice}</p>}
          <button type="submit" className="primary full" disabled={busy || code.length !== 6 || !remaining || verifyWait > 0}>{state.pending === 'proof-verify' ? '코드를 확인하는 중…' : verifyWait > 0 ? `${verifyWait}초 후 코드 확인` : '코드 확인'}</button>
          <button data-close-text type="button" className="quiet" disabled={busy} onClick={() => { clear(); controller.clearAccountCode() }}>코드 입력 닫기</button>
        </form>}
      </Card>
      <Card className={styles.card}>
        <div className={styles.heading}><h2>최근 이메일 재인증</h2>
          <AccountStatus positive={recent}>{recent ? '최근 확인됨' : '확인 필요'}</AccountStatus>
        </div>
        <AccountItem icon="shield"
          title={recent ? '이메일 재인증을 완료했어요.' : '이 화면에서 확인한 재인증 기록이 없어요.'}
          description={recent ? '재인증은 최대 10분 동안 유효해요.' : '중요한 계정 변경 전에 재인증이 필요할 수 있어요.'} />
      </Card>
      <Card className={`${styles.card} ${styles.devices}`}>
        <button type="button" className={`quiet ${styles.deviceLink}`} ref={devicesLink} disabled={busy}
          aria-label="로그인된 기기 관리" onClick={() => {
            devicesScroll.current = window.scrollY
            setDevicesOpen(true)
          }}>
          <AccountItem icon="devices" title="로그인된 기기 관리" description="접속 상태 확인 · 원격 로그아웃"
            status={<AccountStatus><AccountIcon name="forward" /></AccountStatus>} />
        </button>
      </Card>
    </>}
    {account.loaded && refresh}
  </section>{controller && <Toast toast={feedback.toast ?? (success ? { ...success, tone: success.tone ?? 'success' } : null)}
    onDismiss={feedback.toast ? feedback.dismiss : controller.dismissAccountSuccess} bottomClearance="var(--tabs-height, 56px)" />}{children}</>
}
