import { useLayoutEffect, useRef, useState } from 'react'
import { navigateBack, useScreenHistory } from '../../../src/app/navigation.ts'
import { Dialog } from '../../../src/components/Dialog.tsx'
import { Button } from '../../../src/components/ui.tsx'
import { AccountSettings } from '../../../src/features/auth/AccountSettings.tsx'
import { emptyAccount } from '../../../src/features/auth/account.ts'
import type { AuthState } from '../../../src/features/auth/controller.ts'
import { RestSettings } from '../../../src/features/settings/RestSettings.tsx'
import type { RestExitGuard } from '../../../src/features/settings/RestSettings.tsx'
import { RestAlertSettings } from '../../../src/features/settings/RestAlertSettings.tsx'
import { CatalogView } from '../../../src/features/workout-online/PublicCatalog.tsx'
import { SettingsMain } from '../../../src/features/settings/SettingsMain.tsx'
import { catalogInstructionNotes, catalogSamples } from './catalog-samples.ts'
import { useReviewMedia } from './useReviewMedia.ts'
import type { RestAlerts } from '../../../src/features/workout-flow/rest-alerts.ts'
import { reviewRest } from './workout-model.ts'
import { DevicesReview } from './DevicesReview.tsx'

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

export function SettingsReview({ alerts, onAlerts, onRestExitGuard, takeRestSaveFailure, estimate, onEstimate, allowReviewMedia = true }: {
  alerts?: RestAlerts; onAlerts?: (value: RestAlerts) => void; onRestExitGuard?: (guard: RestExitGuard | null) => void
  takeRestSaveFailure?: () => boolean
  estimate?: boolean; onEstimate?: (value: boolean) => void
  allowReviewMedia?: boolean
}) {
  const mediaSources = useReviewMedia(allowReviewMedia)
  const [view, setView] = useScreenHistory<View | null>('review-settings', null)
  const [accountMode, setAccountMode] = useState<keyof typeof accountProviders>('email')
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [rest, setRest] = useState(reviewRest)
  const trigger = useRef<HTMLButtonElement>(null)
  const menuScroll = useRef(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const back = (canLeave?: RestExitGuard) => navigateBack(async () => {
    if (!canLeave || await canLeave()) setView(null, true)
  })

  useLayoutEffect(() => {
    if (!view && trigger.current) {
      trigger.current.focus({ preventScroll: true })
      window.scrollTo(0, menuScroll.current)
    } else if (view === 'account') {
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
    <SettingsMain hidden={view !== null} review reviewEstimate={onEstimate && { value: !!estimate, onChange: onEstimate }} account={{ email: 'review@example.test', loginMethod: 'email', deviceCount: 2 }}
      onAccount={event => open('account', event.currentTarget)} onRest={event => open('rest', event.currentTarget)}
      onRestAlerts={alerts && onAlerts ? event => open('alerts', event.currentTarget) : undefined}
      onCatalog={event => open('catalog', event.currentTarget)} onLogout={() => setLogoutOpen(true)} />
    {!view && <p className="muted small">{reviewNote}</p>}
    {view === 'catalog' && <CatalogView items={catalogSamples} reviewNote={reviewNote} instructionNotes={catalogInstructionNotes} mediaSources={mediaSources} onBack={back} />}
    {view === 'account' && <AccountSettings state={accountExample(accountMode)} now={0} headingRef={heading} onBack={back} DevicesPage={DevicesReview}>
      <label>로그인 수단 예시<select value={accountMode} onChange={event => setAccountMode(event.target.value as keyof typeof accountProviders)}>
        <option value="email">이메일만 연결</option>
        <option value="both">이메일과 Google 연결</option>
        <option value="google">Google만 연결</option>
      </select></label>
      <p className="muted small">{reviewNote} 인증과 계정 변경은 실제 앱에서 진행합니다.</p>
    </AccountSettings>}
    {view === 'rest' && <RestSettings settings={rest} onBack={back} onExitGuard={onRestExitGuard} review onRequest={async values => {
      if (takeRestSaveFailure?.()) return { message: '연결을 확인하지 못했습니다. 입력을 유지하고 다시 시도해 주세요.' }
      if (values) setRest(values)
      return null
    }} />}
    {view === 'alerts' && alerts && onAlerts && <RestAlertSettings alerts={alerts} onChange={onAlerts} onBack={back} review />}
    {logoutOpen && <Dialog title="로그아웃할까요?" tone="warning" onClose={() => setLogoutOpen(false)}>
      <div className="stack">
        <p>검수용 화면이며 실제 로그인 상태는 유지돼요.</p>
        <Button variant="warning" disabled>로그아웃</Button>
        <Button variant="neutral" onClick={() => setLogoutOpen(false)}>취소</Button>
      </div>
    </Dialog>}
  </>
}
