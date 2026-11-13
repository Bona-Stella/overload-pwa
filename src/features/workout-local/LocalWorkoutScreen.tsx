import { useEffect, useState, useSyncExternalStore } from 'react'
import { StatusNotice, Button } from '../../components/ui.tsx'
import { WorkoutStore } from '../workout-online/storage.ts'
import type { CardioActivity, Manufacturer, StandardExercise, Session } from '../workout-online/types.ts'
import { LocalWorkoutController } from './controller.ts'
import type { ExitGuardRegistration, LocalWorkout, RestPolicy } from './types.ts'
import type { SyncOptions } from './sync.ts'
import { LocalWorkoutView } from './LocalWorkoutFlow.tsx'
import { ApprovalControls } from './ApprovalControls.tsx'
import type { WorkoutApi } from '../workout-online/api.ts'
import { useProgressAssessment } from './useProgressAssessment.ts'
export { LocalWorkoutView } from './LocalWorkoutFlow.tsx'

export function LocalWorkoutScreen({ server, policy, definitions, manufacturers = [], activities = [], authorized, localOnly = false, onExitGuard, sync, authenticated = false, onReady, offlineRestart = false, visible = true, onHome, history = [], assessmentApi }: {
  server: Session; policy: RestPolicy; definitions: StandardExercise[]; manufacturers?: Manufacturer[]; activities?: CardioActivity[]
  authorized: () => boolean; localOnly?: boolean; onExitGuard?: ExitGuardRegistration; sync?: SyncOptions; authenticated?: boolean
  onReady?: (workout: LocalWorkout) => void; offlineRestart?: boolean; visible?: boolean; onHome?: () => void; history?: Session[]
  assessmentApi?: Pick<WorkoutApi, 'progressAssessment'>
}) {
  const [initial] = useState(() => ({ server, policy, onReady }))
  const [store] = useState(() => new WorkoutStore())
  const [controller] = useState(() => new LocalWorkoutController(store, authorized, undefined, sync))
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const progress = useProgressAssessment(state.workout, authenticated ? assessmentApi : undefined)
  useEffect(() => {
    void controller.open(initial.server, initial.policy).then(() => {
      const opened = controller.getSnapshot()
      if (!controller.isStopped() && opened.writable && opened.workout) initial.onReady?.(opened.workout)
    })
    return () => { controller.stop(); void controller.settled().then(() => { if (controller.isStopped()) return store.close() }) }
  }, [controller, store, initial])
  useEffect(() => {
    const retry = () => { if (authenticated) void controller.retrySync() }
    window.addEventListener('online', retry)
    if (authenticated) retry()
    return () => window.removeEventListener('online', retry)
  }, [controller, authenticated])
  useEffect(() => { onExitGuard?.(controller.flushDrafts); return () => onExitGuard?.(null) }, [controller, onExitGuard])
  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => { if (state.pending || state.unsavedDrafts) event.preventDefault() }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [state.pending, state.unsavedDrafts])
  if (!state.workout) return <section hidden={!visible} className="stack" aria-label="실제 운동 로컬 기록">
    {state.loading && <p role="status">로컬 운동과 편집 잠금을 확인하고 있습니다.</p>}
    {state.issue && <StatusNotice error>{state.issue}</StatusNotice>}
  </section>
  const notices = [
    localOnly && <p key="local">{offlineRestart ? '이 기기의 기존 운동입니다. 서버 확인 전에는 전송하지 않습니다.' : '인증 확인 전에는 이 기기에만 기록합니다.'}</p>,
    !state.writable && <p key="access">읽기 전용 · 편집 권한과 현재 서버 상태를 확인해 주세요.</p>,
    state.unsavedDrafts && !state.pending && <Button key="drafts" onClick={() => void controller.retryDrafts()}>입력 다시 저장</Button>,
    state.syncIssue && !state.workout.finish && <Button key="sync" onClick={() => void controller.retrySync()}>서버 저장 다시 확인</Button>,
    progress.failed && <p key="assessment">잠정 중량 검토를 불러오지 못했습니다. 수행 기록은 유지됩니다. <Button onClick={progress.retry}>중량 검토 다시 확인</Button></p>,
    state.workout.finish && <p key="finish">{state.workout.finish.ack ? '서버에서 운동 종료를 확인했습니다.' : '종료 요청 보존됨 · 서버 종료는 아직 확인되지 않았습니다.'}</p>,
    !!sync && (state.workout.approvalResults.some(r => r.status === 'PENDING') || !!state.workout.pendingResolution)
      && <ApprovalControls key="approval" state={state} controller={controller} />,
  ].filter(Boolean)
  return <LocalWorkoutView state={state} controller={controller} definitions={definitions} manufacturers={manufacturers} activities={activities}
    history={history} visible={visible} onHome={onHome} notices={notices} progressAssessment={progress.value} />
}
