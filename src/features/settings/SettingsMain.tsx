import { Icon } from '../../components/icons/Icon.tsx'
import { feedbackIcons } from '../../components/icons/feedback.tsx'
import { settingsIcons } from '../../components/icons/settings.tsx'
import { useId } from 'react'
import type { MouseEventHandler, ReactNode } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import { RefreshButton } from '../../components/common-ui/RefreshButton.tsx'
import { useReadErrorToast } from '../../components/common-ui/useReadErrorToast.ts'
import { ContentError } from '../../components/common-ui/ContentFeedback.tsx'
import { Toast } from '../../components/common-ui/Toast.tsx'
import { useSuccessToast } from '../../components/common-ui/useSuccessToast.ts'
import { PwaStatus } from '../../pwa/PwaStatus.tsx'
import { useCardioEstimate } from './useCardioEstimate.ts'
import styles from './SettingsMain.module.css'

type Click = MouseEventHandler<HTMLButtonElement>
type LoginMethod = 'email' | 'google'
type AccountSummary = { email?: string; loginMethod?: LoginMethod; loginMethods?: LoginMethod[]; deviceCount?: number }

export function SettingsMain({ hidden = false, busy = false, review = false, account, accountLoading = false, accountIssue, onRetryAccount, onAccount, onRest, onRestAlerts, onCatalog, onReload, reloadPending = false, onLogout, userId, reviewEstimate }: {
  hidden?: boolean; busy?: boolean; review?: boolean; account?: AccountSummary; accountLoading?: boolean; accountIssue?: string; onRetryAccount?: () => void
  onAccount: Click; onRest: Click; onRestAlerts?: Click; onCatalog: Click; onReload?: Click; reloadPending?: boolean; onLogout: () => void
  userId?: string | null
  reviewEstimate?: { value: boolean; onChange: (value: boolean) => void }
}) {
  const email = account?.email?.trim() ?? ''
  const [initial] = email
  const emailId = useId()
  const [storedEstimate, saveEstimate] = useCardioEstimate(userId ?? null)
  const accountFeedback = useReadErrorToast(account && !hidden && !accountLoading ? accountIssue : null)
  const accountRetry = onRetryAccount && <RefreshButton loading={accountLoading} failure={!account ? accountIssue : null} onRefresh={onRetryAccount} />
  const estimate = reviewEstimate?.value ?? storedEstimate
  const feedback = useSuccessToast(hidden ? null : 'settings:' + (userId ?? 'review'))
  const methods = account?.loginMethods ?? (account?.loginMethod ? [account.loginMethod] : [])
  const loginMethod = methods.map(method => method === 'google' ? 'Google' : '이메일').join(' · ') || '확인 불가'
  const devices = account?.deviceCount === undefined ? '조회 미지원' : account.deviceCount + '대'
  return <section aria-label="설정" className={styles.page} hidden={hidden} data-tab-overview>
    <Card hero aria-busy={accountLoading}>
      <button type="button" className={styles.accountLink} onClick={onAccount} disabled={busy} aria-label="내 계정" aria-describedby={emailId}>
        <span className={styles.avatar} aria-hidden="true">{initial?.toUpperCase()}</span>
        <span className={styles.text}>
          <strong>내 계정</strong>
          <small id={emailId} title={email || undefined}>{account && (email || '이메일 확인 불가')}</small>
        </span>
        <SettingsIcon name="forward" />
      </button>
      <dl className={styles.accountStats}>
        <div><dt>로그인 방식</dt><dd><SettingsIcon name="shield" />{account && loginMethod}</dd></div>
        <div><dt>로그인된 기기</dt><dd><SettingsIcon name="devices" />{account && devices}</dd></div>
      </dl>
      {onRetryAccount && (account ? accountRetry : <ContentError embedded title="계정 정보를 불러오지 못했어요." action={accountRetry} />)}
    </Card>
    <Card className={styles.rows} aria-label="운동 설정">
      <SettingsRow icon="timer" title="세트 사이 휴식" description="반복 상한별 3개 구간 · 휴식 시간 설정" onClick={onRest} busy={busy} />
      <SettingsRow icon="bell" title="휴식 타이머 알림" description="화면 깜빡임 · 효과음" onClick={onRestAlerts} busy={busy} />
      {(userId || reviewEstimate) && <button type="button" className={styles.row} role="switch" aria-checked={estimate} aria-label="유산소 거리 자동 추정"
        disabled={busy} onClick={() => {
          if (reviewEstimate) reviewEstimate.onChange(!estimate)
          else if (saveEstimate(!estimate)) feedback.clear()
          else feedback.show('자동 추정 설정을 저장하지 못했어요.', 'error')
        }}>
        <RowContent icon="sliders" title="유산소 거리 자동 추정" description="완료 확인에 목표 거리 표시 · 이 기기" />
        <span className={styles.estimateStatus} aria-hidden="true">{estimate ? '켜짐' : '꺼짐'}</span>
      </button>}
      <SettingsRow icon="weight" title="운동 종목 보기" description="운동 이름과 별칭으로 검색" onClick={onCatalog} busy={busy} />
      <SettingsRow icon="sliders" title="디로딩 설정" description="추천 분석 설정 · 적용률 안내" />
    </Card>
    <div className={styles.dataCards}>
      <Card className={styles.rows} aria-label="데이터 및 앱">
        <SettingsRow icon="database" title="운동 데이터 상태" description="서버 저장 · 이 기기의 미전송 기록" />
        <SettingsRow icon="download" title="운동 데이터 내보내기" description="운동 기록 다운로드" />
        {onReload && <SettingsRow icon="refresh" title="앱 새로고침" description="현재 페이지 다시 열기" onClick={onReload} busy={busy} pending={reloadPending} />}
      </Card>
      <PwaStatus review={review} className={styles.install} summary={<>
        <RowContent icon="phone" title="앱 설치 · 오프라인 준비" description="홈 화면 설치 및 오프라인 사용 안내" />
        <SettingsIcon name="down" />
      </>} />
    </div>
    <Card className={styles.rows} aria-label="계정 및 데이터 삭제">
      <SettingsRow icon="reset" title="전체 운동 데이터 초기화" description="가입 초기 운동 상태로 복원" danger />
      <SettingsRow icon="withdraw" title="회원 탈퇴" description="계정과 운동 데이터 삭제" danger />
    </Card>
    <Button className={styles.logout} disabled={busy} onClick={onLogout}><SettingsIcon name="logout" />로그아웃</Button>
    <Toast toast={feedback.toast ?? accountFeedback.toast} onDismiss={feedback.toast ? feedback.dismiss : accountFeedback.dismiss} bottomClearance="var(--tabs-height, 56px)" />
  </section>
}

function SettingsRow({ icon, title, description, onClick, busy = false, pending = false, danger = false }: {
  icon: IconName; title: string; description: string; onClick?: Click; busy?: boolean; pending?: boolean; danger?: boolean
}) {
  const titleId = useId(), descriptionId = useId()
  return <button type="button" className={styles.row} aria-labelledby={titleId} aria-describedby={descriptionId}
    data-unavailable={!onClick || undefined} data-danger={danger || undefined} onClick={onClick} disabled={busy || pending || !onClick} data-button-pending={pending || undefined}>
    <RowContent icon={icon} title={title} description={description} titleId={titleId} descriptionId={descriptionId}
      status={!onClick && <span className="sr-only"> · 미구현</span>} />
    {onClick ? <SettingsIcon name="forward" /> : <span className={styles.status} aria-hidden="true">미구현</span>}
  </button>
}

function RowContent({ icon, title, description, titleId, descriptionId, status }: {
  icon: IconName; title: string; description: string; titleId?: string; descriptionId?: string; status?: ReactNode
}) {
  return <>
    <span className={styles.iconBox}><SettingsIcon name={icon} /></span>
    <span className={styles.text}><strong id={titleId}>{title}</strong><small id={descriptionId}>{description}{status}</small></span>
  </>
}

type IconName = keyof typeof settingsIcons | 'refresh'

function SettingsIcon({ name }: { name: IconName }) {
  return <Icon icon={name === 'refresh' ? feedbackIcons.syncing : settingsIcons[name]} />
}
