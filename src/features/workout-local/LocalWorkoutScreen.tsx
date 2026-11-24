import type { ReferenceRecord } from '../workout-online/reference-reminder.ts'
import type { Routine } from '../workout-online/types.ts'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { StatusNotice, Button } from '../../components/ui.tsx'
import { LoadingSkeleton } from '../../components/LoadingSkeleton.tsx'
import { WorkoutStore } from '../workout-online/storage.ts'
import type { CardioActivity, Manufacturer, StandardExercise, Session } from '../workout-online/types.ts'
import { LocalWorkoutController } from './controller.ts'
import type { ExitGuardRegistration, LocalWorkout, RestPolicy } from './types.ts'
import type { SyncOptions } from './sync.ts'
import { LocalWorkoutView } from './LocalWorkoutFlow.tsx'
import { ApprovalControls } from './ApprovalControls.tsx'
import type { WorkoutApi } from '../workout-online/api.ts'
import { useProgressAssessment } from './useProgressAssessment.ts'
import { useDelayedPending } from '../../components/useDelayedPending.ts'
export { LocalWorkoutView } from './LocalWorkoutFlow.tsx'

export function LocalWorkoutScreen({ server, policy, definitions, manufacturers = [], activities = [], authorized, localOnly = false, onExitGuard, sync, authenticated = false, onReady, onOpened, onWorkoutChange, offlineRestart = false, visible = true, preparingSummary = false, onHome, backLabel, history = [], assessmentApi, referenceRecords = [], referenceRoutine = null, navigationIssue, permissionIssue, accountIssue, onReconnect, onRecheckSession, editor }: {
  server: Session; policy: RestPolicy; definitions: StandardExercise[]; manufacturers?: Manufacturer[]; activities?: CardioActivity[]
  authorized: () => boolean; localOnly?: boolean; onExitGuard?: ExitGuardRegistration; sync?: SyncOptions; authenticated?: boolean
  onReady?: (workout: LocalWorkout) => void; onWorkoutChange?: (workout: LocalWorkout) => void
  onOpened?: (session: Session) => void; preparingSummary?: boolean
  offlineRestart?: boolean; visible?: boolean; onHome?: () => void; backLabel?: string; history?: Session[] | null
  assessmentApi?: Pick<WorkoutApi, 'progressAssessment'>; referenceRecords?:ReferenceRecord[]; referenceRoutine?:Routine|null
  navigationIssue?: string; permissionIssue?: string; accountIssue?: string; onReconnect?: () => void; onRecheckSession?: () => void
  editor?: LocalWorkoutController
}) {
  const [initial] = useState(() => ({ server, policy, onReady, onOpened }))
  const [retry, setRetry] = useState(0)
  const [openedAttempt, setOpenedAttempt] = useState(0)
  const [{ controller, store }] = useState(() => {
    if (editor) return { controller: editor, store: null }
    const store = new WorkoutStore()
    return { controller: new LocalWorkoutController(store, authorized, undefined, sync), store }
  })
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const progress = useProgressAssessment(state.workout, authenticated ? assessmentApi : undefined)
  const opening = state.loading || retry !== openedAttempt
  const showOpening = useDelayedPending(opening && visible)
  useEffect(() => {
    let cancelled = false
    void controller.open(initial.server, initial.policy).then(() => {
      if (cancelled || controller.isStopped()) return
      const opened = controller.getSnapshot()
      if (opened.writable && opened.workout) initial.onReady?.(opened.workout)
      setOpenedAttempt(retry)
      initial.onOpened?.(initial.server)
    })
    return () => { cancelled = true; controller.stop(); void controller.settled().then(() => { if (controller.isStopped()) return store?.close() }) }
  }, [controller, store, initial, retry])
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
  useEffect(() => { if (state.workout) onWorkoutChange?.(state.workout) }, [state.workout, onWorkoutChange])
  if (!state.workout) return <section hidden={!visible} className="stack" aria-label="실제 운동 로컬 기록">
    {showOpening && <LoadingSkeleton layout="workout" label="로컬 운동과 편집 잠금을 확인하고 있습니다." />}
    {state.issue && <StatusNotice error>이 기기의 운동을 열지 못했습니다. {state.issue} <Button loading={opening} onClick={() => setRetry(value => value + 1)}>로컬 운동 다시 확인</Button></StatusNotice>}
    {permissionIssue && <StatusNotice>{permissionIssue}</StatusNotice>}
    {localOnly && onReconnect && <Button onClick={onReconnect}>같은 계정 인증 다시 확인</Button>}
  </section>
  const retryLocal = !state.writable && !!state.issue && !state.syncIssue && !state.unsavedDrafts && !state.pending && !state.workout.finish
  const confirmingFinish = authenticated && !!state.workout.finish && !state.syncIssue && state.syncStatus !== 'WAITING'
  const notices = [
    localOnly && <p key="local">{offlineRestart ? <>이 기기에 남은 운동을 이어가고 있어요.<br />로그인 상태를 확인하면 서버로 전송할 수 있어요.</> : '로그인 상태를 확인하기 전까지 이 기기에 기록해요.'}</p>,
    accountIssue && <StatusNotice key="account" error>{accountIssue}</StatusNotice>,
    !state.writable && !state.issue && !state.syncIssue && state.syncStatus !== 'OTHER' && !preparingSummary && !confirmingFinish
      && <p key="access">읽기 전용 · 편집 권한과 현재 서버 상태를 확인해 주세요.</p>,
    permissionIssue && <p key="permission">{permissionIssue}</p>,
    progress.failed && <p key="assessment">잠정 중량 검토를 불러오지 못했어요.<br />수행 기록은 유지돼요.<br /><Button onClick={progress.retry}>중량 검토 다시 확인</Button></p>,
    !!(sync || editor) && (state.workout.approvalResults.some(r => r.status === 'PENDING') || !!state.workout.pendingResolution)
      && <ApprovalControls key="approval" state={state} controller={controller} />,
  ].filter(Boolean)
  return <LocalWorkoutView state={state} controller={controller} definitions={definitions} manufacturers={manufacturers} activities={activities}
    referenceRecords={referenceRecords} referenceRoutine={referenceRoutine} history={history} visible={visible} onHome={onHome} backLabel={backLabel} notices={notices} progressAssessment={progress.value}
    progressAssessmentPending={progress.pending}
    preparingSummary={preparingSummary} confirmingFinish={confirmingFinish} navigationIssue={navigationIssue}
    localOnly={localOnly} onReconnect={onReconnect} onRecheckSession={retryLocal ? undefined : onRecheckSession}
    onReopenLocal={retryLocal ? () => setRetry(value => value + 1) : undefined} reopeningLocal={opening} />
}
