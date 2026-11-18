import { Dialog } from '../../components/Dialog'
import { Button, Card } from '../../components/ui.tsx'
import { AccountIcon, AccountItem, AccountNote, AccountStatus } from './AccountDetailUi.tsx'
import type { AuthController, AuthState } from './controller.ts'
import styles from './AccountSettings.module.css'

export function IdentityManagement({ state, controller }: { state: AuthState; controller?: AuthController }) {
  const { account } = state, busy = state.pending !== null
  const verified = account.contact?.status === 'VERIFIED'
  const locked = busy || !verified || !controller || !account.identities.length
  const selection = account.unlink
  return <Card className={styles.card}><h2>로그인 수단</h2>
    {account.identities.length === 0 && <p className="notice error">연결된 로그인 수단을 확인할 수 없습니다. 다시 조회해 주세요.</p>}
    {(['email', 'google'] as const).map(provider => {
      const identities = account.identities.filter(value => value.provider === provider)
      const email = provider === 'email', name = email ? '이메일' : 'Google'
      const status = identities.length > 1 ? `${identities.length}개 연결됨` : identities.length === 1 ? '연결됨' : account.identities.length ? '미연결' : '확인 불가'
      const unlink = identities.length === 1 && <Button className={styles.action}
        disabled={locked || account.identities.length <= 1}
        onClick={() => controller?.selectUnlink(identities[0])}>{email ? '연결 해제' : 'Google 계정 연결 해제'}</Button>
      const emailAction = email && <Button className={styles.action} data-connect={!identities.length || undefined}
        aria-label={identities.length ? '대표 이메일 로그인 연결 확인' : undefined}
        disabled={locked} onClick={() => void controller?.linkEmail()}>{identities.length ? '연결 확인' : '이메일 로그인 연결'}</Button>
      return <div className={styles.provider} key={provider}>
        <AccountItem icon={provider} title={name + ' 로그인'}
          description={email ? '6자리 이메일 인증 코드' : 'Google 계정으로 인증'}
          status={<AccountStatus positive={identities.length > 0}>{status}</AccountStatus>} />
        {email ? identities.length === 1 ? <div className={styles.actions}>{emailAction}{unlink}</div> : emailAction
          : <>{unlink}{account.linkForm && controller ? <form action="/oauth2/link/google" method="post" className="stack" onSubmit={event => { if (!controller.beginLinkNavigation()) event.preventDefault() }}>
            <input type="hidden" name="_csrf" value={account.linkForm.csrf} />
            <p className="muted small">현재 Overload 계정에 추가할 Google 계정을 직접 선택합니다. 다른 계정 소유 신원은 가져오지 않습니다. 이메일 증명이 필요하면 먼저 아래에서 재인증해 주세요.</p>
            <button type="submit" className="primary full" disabled={busy}>Google에서 연결 계속</button>
            <button type="button" className="quiet" disabled={busy} onClick={() => controller.cancelIdentityChange()}>Google 연결 준비 취소</button>
          </form> : <Button variant={identities.length ? 'quiet' : 'secondary'} className={styles.action}
            data-connect={!identities.length || undefined} disabled={locked}
            onClick={() => void controller?.prepareGoogleLink()}><AccountIcon name="link" />{identities.length ? 'Google 로그인 추가 연결' : 'Google 계정 연결'}</Button>}</>}
        {identities.length > 1 && <p className="muted small">여러 {name} 신원의 개별 계정을 구별할 수 없어 해제를 제공하지 않습니다. 계정 이름이나 주소를 추측하지 않습니다.</p>}
      </div>
    })}
    {!verified && <p className="notice">대표 이메일을 먼저 등록해 주세요. 등록 후에도 연결은 직접 선택해야 합니다.</p>}
    <AccountNote>로그인 수단은 최소 1개 이상 유지해야 합니다. 실제 가용성은 서버가 판단합니다.</AccountNote>
    <AccountNote>대표 재인증 이메일과 로그인 수단은 별도입니다. 연결·해제에는 최근 10분 이내의 이메일 OTP 확인이 필요하며 서버가 최종 검사합니다. 서로 다른 계정을 자동으로 합치지 않습니다.</AccountNote>
    {state.issue?.code === 'EMAIL_OWNERSHIP_PROOF_REQUIRED' && <a className="auth-proof-link" href="#account-email-proof">아래 대표 이메일 재인증으로 이동</a>}
    {selection && controller && <Dialog title={`${selection.identity.provider === 'email' ? '이메일' : 'Google'} 로그인 수단을 해제할까요?`} onClose={() => controller.cancelIdentityChange()}>
      <div className="stack">
        <p>대상: 현재 계정에 연결된 {selection.identity.provider === 'email' ? '이메일' : 'Google'} 로그인 수단 1개</p>
        <p>해제한 {selection.identity.provider === 'email' ? '이메일 주소로' : 'Google 계정으로'} 다시 로그인하면 새 계정이 생성될 수 있으며 기존 Overload 계정의 기록에 접근할 수 없습니다.</p>
        <p>대표 재인증 이메일과 운동 기록은 유지됩니다. 이미 다른 기기에서 로그인한 세션은 즉시 모두 로그아웃되지 않습니다.</p>
        <p>마지막으로 사용할 수 있는 로그인 수단의 제거는 서버가 거절합니다. 해제할 수단과 남는 로그인 방법을 확인해 주세요.</p>
        <button className="primary full" disabled={busy} onClick={() => void controller.confirmUnlink()}>로그인 수단 해제 최종 확인</button>
        <button className="outline full" disabled={busy} onClick={() => controller.cancelIdentityChange()}>해제 취소</button>
      </div>
    </Dialog>}
  </Card>
}
