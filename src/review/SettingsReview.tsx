import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { MouseEventHandler, ReactNode } from 'react'
import { Dialog } from '../components/Dialog.tsx'
import { Button, Card, SectionHeading } from '../components/ui.tsx'
import { AccountSettingsPage } from '../features/auth/AccountSettings.tsx'
import { RestTimeCard } from '../features/settings/RestTimeCard.tsx'
import { CatalogView } from '../features/workout-online/PublicCatalog.tsx'
import { PwaStatus } from '../pwa/PwaStatus.tsx'
import { catalogSamples } from './catalog-samples.ts'
import styles from './SettingsReview.module.css'

type View = 'account' | 'rest' | 'catalog'
const restExample = { restLowSeconds: 180, restMediumSeconds: 120, restHighSeconds: 90 }
const reviewNote = 'UI 검토용 예시 데이터입니다.'

export function SettingsReview() {
  const [view, setView] = useState<View | null>(null)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const menuScroll = useRef(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const back = () => setView(null)

  useLayoutEffect(() => {
    if (!view && trigger.current) {
      trigger.current.focus({ preventScroll: true })
      window.scrollTo(0, menuScroll.current)
    } else if (view === 'account' || view === 'rest') {
      heading.current?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
    }
  }, [view])

  const open = (next: View, button: HTMLButtonElement) => {
    trigger.current = button
    menuScroll.current = window.scrollY
    setView(next)
  }

  return <>
    <section aria-label="설정" className={styles.page} hidden={view !== null}>
      <SectionHeading title="설정" eyebrow="UI 검토 · 합성 데이터" />
      <SettingsGroup title="계정 정보">
        <SettingsRow title="로그인된 계정" description="로그인 수단 · 대표 재인증 이메일"
          onClick={event => open('account', event.currentTarget)} />
      </SettingsGroup>
      <SettingsGroup title="운동 설정">
        <SettingsRow title="세트 사이 휴식" description="반복 상한별 3개 구간 · 조회 전용"
          onClick={event => open('rest', event.currentTarget)} />
        <SettingsRow title="휴식 타이머 알림" description="화면 깜빡임 · 효과음" />
        <SettingsRow title="운동 종목 보기" description="관리자 표준 운동 DB · 조회 전용"
          onClick={event => open('catalog', event.currentTarget)} />
        <SettingsRow title="디로딩 설정" description="추천 분석 설정 · 적용률 안내" />
      </SettingsGroup>
      <SettingsGroup title="데이터 및 앱" extra={<PwaStatus review />}>
        <SettingsRow title="운동 데이터 상태" description="서버 저장 · 이 기기의 미전송 기록" />
        <SettingsRow title="운동 데이터 내보내기" description="운동 기록 JSON 다운로드" />
      </SettingsGroup>
      <SettingsGroup title="계정 및 데이터 삭제">
        <SettingsRow title="전체 운동 데이터 초기화" description="가입 초기 운동 상태로 복원" />
        <SettingsRow title="회원 탈퇴" description="계정과 운동 데이터 삭제" />
      </SettingsGroup>
      <Button variant="danger" className={styles.logout} onClick={() => setLogoutOpen(true)}>로그아웃</Button>
    </section>
    {view === 'catalog' && <CatalogView items={catalogSamples} reviewNote={reviewNote} onBack={back} />}
    {view === 'account' && <div className={styles.account}>
      <AccountSettingsPage headingRef={heading} onBack={back}>
        <p className="muted small">{reviewNote} 인증과 계정 변경은 실제 앱에서 진행합니다.</p>
        <Card><h2>로그인 수단</h2><p>이메일 로그인 · 연결됨</p><p>Google 로그인 · 연결 안 됨</p></Card>
        <Card><h2>대표 재인증 이메일</h2><p>등록 완료 · r***@example.test</p></Card>
        <Card><h2>최근 이메일 재인증</h2><p className="muted">확인된 최근 재인증 없음</p></Card>
      </AccountSettingsPage>
    </div>}
    {view === 'rest' && <section className={styles.page}>
      <header className={styles.detailHeader}>
        <Button variant="quiet" onClick={back}>‹ 설정으로</Button>
        <h1 ref={heading} tabIndex={-1}>세트 사이 휴식</h1>
      </header>
      <RestTimeCard settings={restExample} review />
    </section>}
    {logoutOpen && <Dialog title="로그아웃할까요?" onClose={() => setLogoutOpen(false)}>
      <div className="stack">
        <p>검토용 화면입니다. 실제 로그아웃은 로그인한 앱에서 진행합니다.</p>
        <Button variant="danger" disabled>로그아웃 확인</Button>
        <Button variant="quiet" onClick={() => setLogoutOpen(false)}>취소</Button>
      </div>
    </Dialog>}
  </>
}

function SettingsGroup({ title, children, extra }: { title: string; children: ReactNode; extra?: ReactNode }) {
  const id = useId()
  return <section className={styles.group} aria-labelledby={id}>
    <h2 id={id}>{title}</h2>
    <Card className={styles.rows}>{children}</Card>
    {extra}
  </section>
}

function SettingsRow({ title, description, onClick }: {
  title: string; description: string; onClick?: MouseEventHandler<HTMLButtonElement>
}) {
  const titleId = useId()
  const descriptionId = useId()
  return <button type="button" className={styles.row} aria-labelledby={titleId} aria-describedby={descriptionId}
    onClick={onClick} disabled={!onClick}>
    <span className={styles.text}>
      <strong id={titleId}>{title}</strong>
      <small id={descriptionId}>{description}{!onClick && <span className="sr-only"> · 미구현</span>}</small>
    </span>
    {onClick ? <span className={styles.arrow} aria-hidden="true">›</span>
      : <span className={styles.status} aria-hidden="true">미구현</span>}
  </button>
}
