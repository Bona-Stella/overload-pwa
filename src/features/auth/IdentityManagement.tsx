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
            <p className="muted small">추가할 Google 계정을 선택해 주세요.</p>
            <Button type="submit" variant="primary" className="full" disabled={busy}>Google에서 연결 계속</Button>
            <Button type="button" variant="quiet" disabled={busy} onClick={() => controller.cancelIdentityChange()}>Google 연결 준비 취소</Button>
          </form> : <Button variant={identities.length ? 'quiet' : 'secondary'} className={styles.action}
            data-connect={!identities.length || undefined} disabled={locked}
            onClick={() => void controller?.prepareGoogleLink()}><AccountIcon name="link" />{identities.length ? 'Google 로그인 추가 연결' : 'Google 계정 연결'}</Button>}</>}
        {identities.length > 1 && <p className="muted small">연결된 {name} 계정이 여러 개라 이 화면에서 개별 연결을 해제할 수 없어요.</p>}
      </div>
    })}
    {!verified && <p className="notice">로그인 수단을 변경하려면 대표 이메일을 먼저 등록해 주세요.</p>}
    <AccountNote>연결하거나 해제하려면 10분 이내에 이메일로 재인증해야 해요. 로그인 수단은 하나 이상 남겨 주세요.</AccountNote>
    {state.issue?.code === 'EMAIL_OWNERSHIP_PROOF_REQUIRED' && <a className="auth-proof-link" href="#account-email-proof">아래 대표 이메일 재인증으로 이동</a>}
    {selection && controller && <Dialog tone="warning" title={`${selection.identity.provider === 'email' ? '이메일' : 'Google'} 로그인 수단을 해제할까요?`} onClose={() => controller.cancelIdentityChange()}>
      <div className="stack">
        <p>이 수단으로 다시 로그인하면 새 계정이 생성될 수 있어요.<br />새 계정에서는 기존 운동 기록을 볼 수 없어요.</p>
        <p>대표 재인증 이메일과 운동 기록은 유지돼요.<br />다른 기기는 모두 즉시 로그아웃되지는 않아요.</p>
        <p>로그인 수단은 하나 이상 남아 있어야 해요.</p>
        <Button variant="warning" className="full" disabled={busy} onClick={() => void controller.confirmUnlink()}>연결 해제</Button>
        <Button variant="neutral" className="full" disabled={busy} onClick={() => controller.cancelIdentityChange()}>취소</Button>
      </div>
    </Dialog>}
  </Card>
}
