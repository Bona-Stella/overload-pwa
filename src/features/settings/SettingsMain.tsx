import { useId } from 'react'
import type { MouseEventHandler, ReactNode } from 'react'
import { Button, Card, SectionHeading } from '../../components/ui.tsx'
import { PwaStatus } from '../../pwa/PwaStatus.tsx'
import styles from './SettingsMain.module.css'

export function SettingsMain({ hidden = false, busy = false, review = false, onAccount, onRest, onRestAlerts, onCatalog, onLogout }: {
  hidden?: boolean; busy?: boolean; review?: boolean;
  onAccount: MouseEventHandler<HTMLButtonElement>; onRest: MouseEventHandler<HTMLButtonElement>;
  onRestAlerts?: MouseEventHandler<HTMLButtonElement>;
  onCatalog: MouseEventHandler<HTMLButtonElement>; onLogout: () => void;
}) {
  return <section aria-label="설정" className={styles.page} hidden={hidden}>
    <SectionHeading title="설정" eyebrow={review ? 'UI 검토 · 합성 데이터' : 'PREFERENCES'} />
    <SettingsGroup title="계정 정보">
      <SettingsRow title="로그인된 계정" description="로그인 수단 · 대표 재인증 이메일" onClick={onAccount} busy={busy} />
    </SettingsGroup>
    <SettingsGroup title="운동 설정">
      <SettingsRow title="세트 사이 휴식" description="반복 상한별 3개 구간 · 조회 전용" onClick={onRest} busy={busy} />
      <SettingsRow title="휴식 타이머 알림" description="화면 깜빡임 · 효과음" onClick={onRestAlerts} busy={busy} />
      <SettingsRow title="운동 종목 보기" description="관리자 표준 운동 DB · 조회 전용" onClick={onCatalog} busy={busy} />
      <SettingsRow title="디로딩 설정" description="추천 분석 설정 · 적용률 안내" />
    </SettingsGroup>
    <SettingsGroup title="데이터 및 앱" extra={<PwaStatus review={review} />}>
      <SettingsRow title="운동 데이터 상태" description="서버 저장 · 이 기기의 미전송 기록" />
      <SettingsRow title="운동 데이터 내보내기" description="운동 기록 JSON 다운로드" />
    </SettingsGroup>
    <SettingsGroup title="계정 및 데이터 삭제">
      <SettingsRow title="전체 운동 데이터 초기화" description="가입 초기 운동 상태로 복원" />
      <SettingsRow title="회원 탈퇴" description="계정과 운동 데이터 삭제" />
    </SettingsGroup>
    <Button variant="danger" className={styles.logout} disabled={busy} onClick={onLogout}>로그아웃</Button>
  </section>
}

function SettingsGroup({ title, children, extra }: { title: string; children: ReactNode; extra?: ReactNode }) {
  const id = useId()
  return <section className={styles.group} aria-labelledby={id}>
    <h2 id={id}>{title}</h2><Card className={styles.rows}>{children}</Card>{extra}
  </section>
}

function SettingsRow({ title, description, onClick, busy = false }: {
  title: string; description: string; onClick?: MouseEventHandler<HTMLButtonElement>; busy?: boolean
}) {
  const titleId = useId(), descriptionId = useId()
  return <button type="button" className={styles.row} aria-labelledby={titleId} aria-describedby={descriptionId} onClick={onClick} disabled={busy || !onClick}>
    <span className={styles.text}><strong id={titleId}>{title}</strong>
      <small id={descriptionId}>{description}{!onClick && <span className="sr-only"> · 미구현</span>}</small></span>
    {onClick ? <span className={styles.arrow} aria-hidden="true">›</span> : <span className={styles.status} aria-hidden="true">미구현</span>}
  </button>
}
