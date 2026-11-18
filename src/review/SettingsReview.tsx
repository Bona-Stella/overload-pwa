import { useLayoutEffect, useRef, useState } from 'react'
import { Dialog } from '../components/Dialog.tsx'
import { Button, Card } from '../components/ui.tsx'
import { AccountSettings } from '../features/auth/AccountSettings.tsx'
import { emptyAccount } from '../features/auth/account.ts'
import type { AuthState } from '../features/auth/controller.ts'
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
const accountProviders = { email: ['email'], both: ['email', 'google'], google: ['google'] } as const

function accountExample(example: keyof typeof accountProviders): AuthState {
  return {
    status: 'authenticated', userId: null, pending: null, challenge: null, resendAt: 0, verifyAt: 0,
    issue: null, notice: '', updatedAt: 0, accountOpen: true,
    account: {
      ...emptyAccount(), loaded: true,
      identities: accountProviders[example].map(provider => ({ provider, id: provider })),
      contact: { status: 'VERIFIED', maskedEmail: 'r***@***' },
    },
  }
}

export function SettingsReview({ alerts, onAlerts }: { alerts?: RestAlerts; onAlerts?: (value: RestAlerts) => void }) {
  const mediaSources = useReviewMedia()
  const [view, setView] = useState<View | null>(null)
  const [accountMode, setAccountMode] = useState<keyof typeof accountProviders>('email')
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
    <SettingsMain hidden={view !== null} review account={{ email: 'review@example.test', loginMethod: 'email', deviceCount: 2 }}
      onAccount={event => open('account', event.currentTarget)} onRest={event => open('rest', event.currentTarget)}
      onRestAlerts={alerts && onAlerts ? event => open('alerts', event.currentTarget) : undefined}
      onCatalog={event => open('catalog', event.currentTarget)} onLogout={() => setLogoutOpen(true)} />
    {!view && <p className="muted small">{reviewNote}</p>}
    {view === 'catalog' && <CatalogView items={catalogSamples} reviewNote={reviewNote} instructionNotes={catalogInstructionNotes} mediaSources={mediaSources} onBack={back} />}
    {view === 'account' && <>
      <AccountSettings state={accountExample(accountMode)} now={0} headingRef={heading} onBack={back} />
      <label>로그인 수단 예시<select value={accountMode} onChange={event => setAccountMode(event.target.value as keyof typeof accountProviders)}>
        <option value="email">이메일만 연결</option>
        <option value="both">이메일과 Google 연결</option>
        <option value="google">Google만 연결</option>
      </select></label>
      <p className="muted small">{reviewNote} 인증과 계정 변경은 실제 앱에서 진행합니다.</p>
    </>}
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
