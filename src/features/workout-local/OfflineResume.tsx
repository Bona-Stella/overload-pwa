import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { navigateBack, useScreenHistory } from '../../app/navigation.ts'
import { useAuth } from '../auth/context.ts'
import { WorkoutApi } from '../workout-online/api.ts'
import type { ExitGuardRegistration } from './types.ts'
import type { OfflineSource } from './offline-access.ts'
import { OFFLINE_FENCE } from './offline-access.ts'
import { offlineAccess } from './offline.ts'
import { LocalWorkoutScreen } from './LocalWorkoutScreen.tsx'
import { LoadingSkeleton } from '../../components/LoadingSkeleton.tsx'
import { Button, StatusNotice } from '../../components/ui.tsx'

export function OfflineResumeOffer({ status, disabled, onContinue }: { status: 'loading' | 'failed' | 'unavailable' | 'ready'; disabled: boolean; onContinue: () => void }) {
  if (status === 'failed') return <StatusNotice error>이 기기의 운동을 확인하지 못했습니다. 다시 연결해 로그인 상태를 확인해 주세요.</StatusNotice>
  if (status === 'loading') return <LoadingSkeleton layout="workout" label="이 기기에 저장된 운동을 확인하는 중입니다." />
  if (status === 'unavailable') return <p className="muted small">이 환경에서 이어갈 수 있는 로컬 운동을 확인하지 못했습니다. 온라인에서 로그인하고 운동을 연 기기에서만 이어갈 수 있습니다.</p>
  return <div className="card stack"><h2>이 기기의 운동 이어가기</h2><p>인터넷에 연결되면 로그인 상태와 저장 결과를 확인할 수 있어요.</p><p className="muted small">공용 기기에서는 인터넷에 연결한 뒤 로그아웃해 주세요.</p><Button variant="primary" disabled={disabled} onClick={onContinue}>이 기기의 운동 이어가기</Button></div>
}

export function OfflineResume({ onExitGuard, onActiveChange, onReconnect }: { onExitGuard: ExitGuardRegistration; onActiveChange: (active: boolean) => void; onReconnect: () => void }) {
  const { state, controller } = useAuth()
  const [source, setSource] = useState<OfflineSource | null>()
  const [selected, setSelected] = useScreenHistory<string | null>('workout-view:offline', null)
  const [issue, setIssue] = useState(false)
  const [api] = useState(() => new WorkoutApi(controller))
  const choice = useRef(false)
  const exitGuard = useRef<(() => Promise<boolean>) | null>(null)
  const registerExit = useCallback<ExitGuardRegistration>(guard => { exitGuard.current = guard; onExitGuard(guard) }, [onExitGuard])
  const eligible = state.status === 'unavailable' && !!state.offlineNetworkFailure && !state.localWorkoutUserId
  const chosen = eligible && !!source && selected === source.permit.sessionId
  useLayoutEffect(() => { choice.current = chosen }, [chosen])
  useLayoutEffect(() => {
    onActiveChange(chosen)
    return () => onActiveChange(false)
  }, [chosen, onActiveChange])
  useEffect(() => {
    let current = true
    const load = () => {
      void offlineAccess.source().then(value => {
        if (!current) return
        setIssue(false)
        setSource(value)
        if (!value) choice.current = false
      }).catch(() => { if (current) { setIssue(true); setSource(null); choice.current = false } })
    }
    const changed = (event: StorageEvent) => { if (event.key === OFFLINE_FENCE || event.key === null) load() }
    load(); window.addEventListener('storage', changed)
    return () => { current = false; choice.current = false; window.removeEventListener('storage', changed) }
  }, [])
  if (!eligible) return null
  const authorized = () => {
    const a = controller.getSnapshot()
    return choice.current && !!source && offlineAccess.matches(source.permit) && a.status === 'unavailable' && !!a.offlineNetworkFailure && a.pending === null && !a.localWorkoutUserId
  }
  return <section className="stack" aria-label="오프라인 운동 이어가기">
    {issue && <OfflineResumeOffer status="failed" disabled onContinue={() => {}} />}
    {chosen && source ? <LocalWorkoutScreen key={source.permit.nonce} server={source.server} policy={source.workout.restPolicy} definitions={[]} authorized={authorized} localOnly offlineRestart onExitGuard={registerExit}
      onHome={() => navigateBack(() => { void (exitGuard.current?.() ?? Promise.resolve(true)).then(saved => { if (saved) setSelected(null, true) }) })}
      accountIssue={state.issue?.message} onReconnect={onReconnect} sync={{ api, online: () => false }} />
      : (source !== null || !issue) && <OfflineResumeOffer status={source === undefined ? 'loading' : source ? 'ready' : 'unavailable'} disabled={state.pending !== null} onContinue={async () => {
        const origin = window.history.state?.overloadNavigation
        try { const latest = await offlineAccess.source(), a = controller.getSnapshot(); if (latest && a.status === 'unavailable' && a.offlineNetworkFailure && !a.localWorkoutUserId && a.pending === null && window.history.state?.overloadNavigation === origin) { setSource(latest); setSelected(latest.permit.sessionId) } }
        catch { setIssue(true) }
      }} />}
  </section>
}
