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
import type { RestAlerts } from '../features/workout-flow/types.ts'
import flowStyles from '../features/workout-flow/WorkoutFlow.module.css'
import { reviewRest } from './workout-model.ts'

type View = 'account' | 'rest' | 'catalog' | 'alerts'
const reviewNote = 'UI 검토용 예시 데이터입니다.'

export function SettingsReview({ alerts, onAlerts }: { alerts?: RestAlerts; onAlerts?: (value: RestAlerts) => void }) {
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
    } else if (view === 'account' || view === 'rest' || view === 'alerts') {
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
      onRestAlerts={alerts && onAlerts ? event => open('alerts', event.currentTarget) : undefined}
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
      <RestTimeCard settings={reviewRest} review />
    </section>}
    {view === 'alerts' && alerts && onAlerts && <section className={styles.page}>
      <header className={styles.detailHeader}>
        <Button variant="quiet" onClick={back}>‹ 설정으로</Button>
        <h1 ref={heading} tabIndex={-1}>휴식 타이머 알림</h1>
      </header>
      <Card>
        <label className={flowStyles.checkbox}><input type="checkbox" checked={alerts.flash} onChange={event => onAlerts({ ...alerts, flash: event.target.checked })} />화면 깜빡임</label>
        <label>시작 시점<select value={alerts.threshold} disabled={!alerts.flash} onChange={event => onAlerts({ ...alerts, threshold: event.target.value === '10' ? 10 : 5 })}>
          <option value="5">5초 전</option><option value="10">10초 전</option>
        </select></label>
        <label className={flowStyles.checkbox}><input type="checkbox" checked={alerts.sound} onChange={event => onAlerts({ ...alerts, sound: event.target.checked })} />효과음</label>
        <p className="muted small">효과음은 마지막 5초에 재생됩니다. 설정은 현재 검토 탭에 적용됩니다.</p>
      </Card>
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
