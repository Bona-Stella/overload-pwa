import { useLayoutEffect, useRef, useState } from 'react'
import { Dialog } from '../components/Dialog.tsx'
import { Button, Card } from '../components/ui.tsx'
import { AccountSettingsPage } from '../features/auth/AccountSettings.tsx'
import { RestTimeCard } from '../features/settings/RestTimeCard.tsx'
import { CatalogView } from '../features/workout-online/PublicCatalog.tsx'
import { SettingsMain } from '../features/settings/SettingsMain.tsx'
import { catalogInstructionNotes, catalogSamples } from './catalog-samples.ts'
import styles from './SettingsReview.module.css'
import { useReviewMedia } from './useReviewMedia.ts'

type View = 'account' | 'rest' | 'catalog'
const restExample = { restLowSeconds: 180, restMediumSeconds: 120, restHighSeconds: 90 }
const reviewNote = 'UI 검토용 예시 데이터입니다.'

export function SettingsReview() {
  const mediaSources = useReviewMedia()
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
    <SettingsMain hidden={view !== null} review
      onAccount={event => open('account', event.currentTarget)} onRest={event => open('rest', event.currentTarget)}
      onCatalog={event => open('catalog', event.currentTarget)} onLogout={() => setLogoutOpen(true)} />
    {view === 'catalog' && <CatalogView items={catalogSamples} reviewNote={reviewNote} instructionNotes={catalogInstructionNotes} mediaSources={mediaSources} onBack={back} />}
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
