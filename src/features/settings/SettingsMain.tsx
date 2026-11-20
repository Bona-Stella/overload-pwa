import { useId } from 'react'
import type { MouseEventHandler, ReactNode } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import { SkeletonSlot } from '../../components/common-ui/ContentFeedback.tsx'
import { PwaStatus } from '../../pwa/PwaStatus.tsx'
import styles from './SettingsMain.module.css'

type Click = MouseEventHandler<HTMLButtonElement>
type LoginMethod = 'email' | 'google'
type AccountSummary = { email?: string; loginMethod?: LoginMethod; loginMethods?: LoginMethod[]; deviceCount?: number }

export function SettingsMain({ hidden = false, busy = false, review = false, account, accountLoading = false, onRetryAccount, onAccount, onRest, onRestAlerts, onCatalog, onLogout }: {
  hidden?: boolean; busy?: boolean; review?: boolean; account?: AccountSummary; accountLoading?: boolean; onRetryAccount?: () => void
  onAccount: Click; onRest: Click; onRestAlerts?: Click; onCatalog: Click; onLogout: () => void
}) {
  const email = account?.email?.trim() ?? ''
  const [initial] = email
  const emailId = useId()
  const methods = account?.loginMethods ?? (account?.loginMethod ? [account.loginMethod] : [])
  const loginMethod = methods.map(method => method === 'google' ? 'Google SSO' : '이메일').join(' · ') || '확인 불가'
  const devices = account?.deviceCount === undefined ? '조회 미지원' : account.deviceCount + '대'
  return <section aria-label="설정" className={styles.page} hidden={hidden}>
    <Card className={styles.account} aria-busy={accountLoading}>
      <button type="button" className={styles.accountLink} onClick={onAccount} disabled={busy} aria-label="내 계정" aria-describedby={emailId}>
        <span className={styles.avatar} aria-hidden="true">{initial?.toUpperCase() ?? '—'}</span>
        <span className={styles.text}>
          <strong>내 계정</strong>
          <small id={emailId} title={email || undefined}><SkeletonSlot loading={accountLoading}>{email || '이메일 확인 불가'}</SkeletonSlot></small>
        </span>
        <SettingsIcon name="forward" />
      </button>
      <dl className={styles.accountStats}>
        <div><dt>로그인 방식</dt><dd><SettingsIcon name="shield" /><SkeletonSlot loading={accountLoading}>{loginMethod}</SkeletonSlot></dd></div>
        <div><dt>로그인된 기기</dt><dd><SettingsIcon name="devices" />{devices}</dd></div>
      </dl>
      {onRetryAccount && <div role="status">계정 정보를 확인하지 못했습니다. <Button variant="quiet" onClick={onRetryAccount}>다시 조회</Button></div>}
    </Card>
    <Card className={styles.rows} aria-label="운동 설정">
      <SettingsRow icon="timer" title="세트 사이 휴식" description="반복 상한별 3개 구간 · 휴식 시간 설정" onClick={onRest} busy={busy} />
      <SettingsRow icon="bell" title="휴식 타이머 알림" description="화면 깜빡임 · 효과음" onClick={onRestAlerts} busy={busy} />
      <SettingsRow icon="weight" title="운동 종목 보기" description="관리자 표준 운동 DB · 조회 전용" onClick={onCatalog} busy={busy} />
      <SettingsRow icon="sliders" title="디로딩 설정" description="추천 분석 설정 · 적용률 안내" />
    </Card>
    <Card className={styles.rows} aria-label="데이터 및 앱">
      <SettingsRow icon="database" title="운동 데이터 상태" description="서버 저장 · 이 기기의 미전송 기록" />
      <SettingsRow icon="download" title="운동 데이터 내보내기" description="운동 기록 JSON 다운로드" />
    </Card>
    <PwaStatus review={review} className={styles.install} summary={<>
      <RowContent icon="phone" title="앱 설치 · 오프라인 준비" description="홈 화면 설치 및 오프라인 사용 안내" />
      <SettingsIcon name="down" />
    </>} />
    <Card className={styles.rows} aria-label="계정 및 데이터 삭제">
      <SettingsRow icon="reset" title="전체 운동 데이터 초기화" description="가입 초기 운동 상태로 복원" danger />
      <SettingsRow icon="withdraw" title="회원 탈퇴" description="계정과 운동 데이터 삭제" danger />
    </Card>
    <Button className={styles.logout} disabled={busy} onClick={onLogout}><SettingsIcon name="logout" />로그아웃</Button>
  </section>
}

function SettingsRow({ icon, title, description, onClick, busy = false, danger = false }: {
  icon: IconName; title: string; description: string; onClick?: Click; busy?: boolean; danger?: boolean
}) {
  const titleId = useId(), descriptionId = useId()
  return <button type="button" className={styles.row} aria-labelledby={titleId} aria-describedby={descriptionId}
    data-unavailable={!onClick || undefined} data-danger={danger || undefined} onClick={onClick} disabled={busy || !onClick}>
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

const icons = {
  forward: 'm9 6 6 6-6 6',
  down: 'm6 9 6 6 6-6',
  shield: 'M12 22s7-3 7-9V6l-7-3-7 3v7c0 6 7 9 7 9Zm-3-10 2 2 4-4',
  devices: 'M10 17H3V5h14v3M7 21h3m3-3h6m-6-7h8v10h-8z',
  timer: 'M9 2h6m-3 8v4m8-10-2 2M20 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  bell: 'M10 21h4M6 9a6 6 0 0 1 12 0v4l2 4H4l2-4V9ZM2 9a10 10 0 0 1 3-6m17 6a10 10 0 0 0-3-6',
  weight: 'M2 10v4m3-7v10m3-12v14m0-7h8m0-7v14m3-12v10m3-7v4',
  sliders: 'M4 6h7m4 0h5m-9-2v4m-7 4h3m4 0h9m-9-2v4m-7 4h11m4 0h1m-5-2v4',
  database: 'M5 6c0-2 3-3 7-3s7 1 7 3-3 3-7 3-7-1-7-3Zm0 0v12c0 2 3 3 7 3s7-1 7-3V6M5 12c0 2 3 3 7 3s7-1 7-3',
  download: 'M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4',
  phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm4 16h.01',
  reset: 'M4 11a8 8 0 1 1 2 7M4 5v6h6',
  withdraw: 'M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-2a4 4 0 0 1 4-4h6m4 1 4 4m0-4-4 4',
  logout: 'M10 17v3H4V4h6v3m-2 5h12m-4-4 4 4-4 4',
}
type IconName = keyof typeof icons

function SettingsIcon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={icons[name]} />
  </svg>
}
