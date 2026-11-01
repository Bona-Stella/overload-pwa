import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/context.ts'
import { WorkoutApi } from '../workout-online/api.ts'
import type { ExitGuardRegistration } from './types.ts'
import type { OfflineSource } from './offline-access.ts'
import { OFFLINE_FENCE } from './offline-access.ts'
import { offlineAccess } from './offline.ts'
import { LocalWorkoutScreen } from './LocalWorkoutScreen.tsx'

export function OfflineResume({ onExitGuard }: { onExitGuard: ExitGuardRegistration }) {
  const { state, controller } = useAuth()
  const [source, setSource] = useState<OfflineSource | null>(null)
  const [chosen, setChosen] = useState(false), [issue, setIssue] = useState(false)
  const [api] = useState(() => new WorkoutApi(controller))
  const choice = useRef(false)
  const eligible = state.status === 'unavailable' && !!state.offlineNetworkFailure && !state.localWorkoutUserId
  useEffect(() => {
    let current = true
    const load = () => {
      void offlineAccess.source().then(value => {
        if (!current) return
        setSource(value)
        if (!value) { choice.current = false; setChosen(false) }
      }).catch(() => { if (current) { setIssue(true); setSource(null); choice.current = false; setChosen(false) } })
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
    {issue && <p className="notice error">로컬 운동의 접근 허용 또는 저장소를 확인하지 못했습니다. 원본은 보존했습니다.</p>}
    {!source ? <p className="muted small">이 환경에서 이어갈 수 있는 로컬 운동을 확인하지 못했습니다. 온라인에서 로그인하고 운동을 연 기기에서만 이어갈 수 있습니다.</p>
      : !chosen ? <div className="card stack"><h2>이 기기의 운동 이어가기</h2><p>마지막으로 서버 인증을 확인한 계정의 기존 진행 운동만 엽니다. 현재 서버 로그인과 운동 상태가 확인된 것은 아닙니다.</p><p className="muted small">이 브라우저의 로컬 접근 제한은 인증이나 암호화가 아닙니다. 기기를 공유할 때는 온라인에서 로그아웃하세요.</p><button className="primary" disabled={state.pending !== null} onClick={async () => {
        try { const latest = await offlineAccess.source(), a = controller.getSnapshot(); if (latest && a.status === 'unavailable' && a.offlineNetworkFailure && !a.localWorkoutUserId && a.pending === null) { setSource(latest); choice.current = true; setChosen(true) } }
        catch { setIssue(true) }
      }}>이 기기의 운동 이어가기</button></div>
        : <LocalWorkoutScreen key={source.permit.nonce} server={source.server} policy={source.workout.restPolicy} definitions={[]} authorized={authorized} localOnly offlineRestart onExitGuard={onExitGuard}
          sync={{ api, online: () => false }} />}
  </section>
}
