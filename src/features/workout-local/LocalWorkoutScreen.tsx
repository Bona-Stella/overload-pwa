import { RefreshButton } from '../../components/common-ui/RefreshButton.tsx'
import type { ReferenceRecord } from '../workout-online/reference-reminder.ts'
import type { Routine } from '../workout-online/types.ts'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { StatusNotice, Button } from '../../components/ui.tsx'
import { ActionDialog } from '../../components/common-ui/ActionDialog.tsx'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { LoadingSkeleton } from '../../components/LoadingSkeleton.tsx'
import { WorkoutStore } from '../workout-online/storage.ts'
import type { CardioActivity, Manufacturer, StandardExercise, Session } from '../workout-online/types.ts'
import type { EditorState } from './controller.ts'
import { LocalWorkoutController } from './controller.ts'
import type { ExitGuardRegistration, LocalWorkout, RestPolicy } from './types.ts'
import type { SyncOptions } from './sync.ts'
import { LocalWorkoutView } from './LocalWorkoutFlow.tsx'
import { ApprovalControls } from './ApprovalControls.tsx'
import type { WorkoutApi } from '../workout-online/api.ts'
import { useProgressAssessment } from './useProgressAssessment.ts'
export { LocalWorkoutView } from './LocalWorkoutFlow.tsx'

export function LocalWorkoutScreen({ server, policy, definitions, manufacturers = [], activities = [], authorized, localOnly = false, onExitGuard, sync, authenticated = false, onReady, onOpened, onWorkoutChange, offlineRestart = false, visible = true, preparingSummary = false, onHome, backLabel, history = [], historyPending, assessmentApi, referenceRecords = [], referenceRoutine = null, navigationIssue, permissionIssue, accountIssue, onReconnect, onRecheckSession, recheckBeforeOpen, editor }: {
  server: Session; policy: RestPolicy; definitions: StandardExercise[]; manufacturers?: Manufacturer[]; activities?: CardioActivity[]
  authorized: () => boolean; localOnly?: boolean; onExitGuard?: ExitGuardRegistration; sync?: SyncOptions; authenticated?: boolean
  onReady?: (workout: LocalWorkout) => void; onWorkoutChange?: (workout: LocalWorkout) => void
  onOpened?: (session: Session) => void; preparingSummary?: boolean
  offlineRestart?: boolean; visible?: boolean; onHome?: () => void; backLabel?: string; history?: Session[] | null; historyPending?: boolean
  assessmentApi?: Pick<WorkoutApi, 'progressAssessment'>; referenceRecords?:ReferenceRecord[]; referenceRoutine?:Routine|null
  navigationIssue?: string; permissionIssue?: string; accountIssue?: string; onReconnect?: () => void; onRecheckSession?: () => void
  recheckBeforeOpen?: () => Promise<Session | null>
  editor?: LocalWorkoutController
}) {
  const [initial] = useState(() => ({ server, policy, onReady, onOpened }))
  const [checking, setChecking] = useState(false)
  const [checkFailure, setCheckFailure] = useState<'read' | 'changed' | null>(null)
  const [retryFailure, setRetryFailure] = useState<EditorState['openFailure']>()
  const [dismissed, setDismissed] = useState(false)
  const retrying = useRef(false)
  const mounted = useRef(false)
  const [{ controller, store }] = useState(() => {
    if (editor) return { controller: editor, store: null }
    const store = new WorkoutStore()
    return { controller: new LocalWorkoutController(store, authorized, undefined, sync), store }
  })
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const progress = useProgressAssessment(state.workout, authenticated ? assessmentApi : undefined)
  const opening = state.loading || checking
  const openFailure = checking ? retryFailure ?? state.openFailure : state.openFailure
  const showOpening = visible && !openFailure && !preparingSummary
  if (dismissed && (!visible || !state.openFailure)) setDismissed(false)
  useLayoutEffect(() => {
    // The outgoing editor stays visible while the summary loads, but no longer needs its lock.
    if (preparingSummary) controller.stop()
  }, [controller, preparingSummary])
  useEffect(() => {
    let cancelled = false
    mounted.current = true
    const open = controller.open(initial.server, initial.policy)
    void open.then(() => {
      if (cancelled || controller.isStopped()) return
      const opened = controller.getSnapshot()
      if (opened.writable && opened.workout) initial.onReady?.(opened.workout)
      initial.onOpened?.(initial.server)
    })
    return () => {
      cancelled = true
      mounted.current = false
      controller.stop()
      void Promise.all([open, controller.settled()]).then(() => { if (!mounted.current) return store?.close() })
    }
  }, [controller, store, initial])
  async function retryOpen() {
    if (retrying.current || controller.getSnapshot().loading) return
    retrying.current = true
    setRetryFailure(controller.getSnapshot().openFailure)
    setChecking(true)
    try {
      const latest = !localOnly && recheckBeforeOpen ? await recheckBeforeOpen() : server
      if (!mounted.current) return
      if (!latest) { setCheckFailure('read'); return }
      if (latest.status !== 'ACTIVE' || latest.deletedAt || latest.userId !== server.userId
        || latest.dataGeneration !== server.dataGeneration || latest.id !== server.id
        || latest.editorDeviceId !== server.editorDeviceId || latest.writerEpoch !== server.writerEpoch) {
        setCheckFailure('changed')
        return
      }
      await controller.open(latest, policy)
      setCheckFailure(null)
      if (!mounted.current || controller.isStopped()) return
      const opened = controller.getSnapshot()
      if (opened.writable && opened.workout) onReady?.(opened.workout)
    } catch {
      if (mounted.current) setCheckFailure('read')
    } finally {
      retrying.current = false
      if (mounted.current) setChecking(false)
    }
  }
  async function retryFinish() {
    const before = controller.getSnapshot()
    if (retrying.current || before.loading || before.unsavedDrafts || before.syncStatus === 'SENDING') return
    if (!controller.canRetrySync()) {
      await retryOpen()
      await controller.syncSettled()
    } else {
      retrying.current = true
      try { await controller.retrySync() }
      finally { retrying.current = false }
    }
    const result = controller.getSnapshot()
    if (!mounted.current || controller.isStopped()) return
    return result.issue ?? result.syncIssue ?? (result.syncStatus === 'WAITING' ? '연결과 로그인 상태를 확인한 뒤 다시 시도해 주세요.' : undefined)
  }
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
    {!preparingSummary && <RecordSubpageHeader title="운동 진행" onBack={onHome} backLabel={backLabel ?? '홈으로'} backDisabled={opening} />}
    {showOpening && <LoadingSkeleton layout="workout" label="로컬 운동과 편집 잠금을 확인하고 있습니다." />}
    <ActionDialog kind="confirm" tone="critical" open={visible && !preparingSummary && !!openFailure && !dismissed} title="운동을 불러오지 못했습니다"
      description={<p>{openFailure?.preserved && <>운동 데이터는 보존되어 있습니다.<br /></>}
        {checkFailure === 'read' ? '현재 운동 상태를 확인하지 못했습니다. 연결을 확인해 주세요.' : checkFailure === 'changed'
          ? '운동 상태가 바뀌었습니다. 이전 화면에서 현재 운동을 확인해 주세요.' : openFailure?.kind === 'lock'
          ? '다른 탭에서 운동을 편집 중인지 확인한 뒤 다시 확인해 주세요.' : '현재 운동 상태를 다시 확인해 주세요.'}</p>}
      confirmLabel="다시 확인" pending={opening} onConfirm={() => void retryOpen()} onDismiss={() => setDismissed(true)} />
    {permissionIssue && <StatusNotice>{permissionIssue}</StatusNotice>}
    {localOnly && onReconnect && <Button onClick={onReconnect}>같은 계정 인증 다시 확인</Button>}
  </section>
  const retryLocal = !state.writable && !state.unsavedDrafts && !state.pending &&
    (!!state.workout.finish || !!state.issue && !state.syncIssue)
  // A saved FINISH can reach the editor before the workspace commits the summary handoff.
  const confirmingFinish = !!state.workout.finish && (state.syncStatus === 'SENDING' ||
    authenticated && state.writable && state.syncStatus === undefined ||
    authenticated && !!state.workout.finish.ack && state.syncStatus === 'SAVED')
  const onReopenLocal = retryLocal ? () => void retryOpen() : undefined
  const notices = [
    localOnly && <p key="local">{offlineRestart ? <>이 기기에 남은 운동을 이어가고 있어요.<br />로그인 상태를 확인하면 서버로 전송할 수 있어요.</> : '로그인 상태를 확인하기 전까지 이 기기에 기록해요.'}</p>,
    accountIssue && <StatusNotice key="account" error>{accountIssue}</StatusNotice>,
    !state.writable && !state.issue && !state.syncIssue && state.syncStatus !== 'OTHER' && !preparingSummary && !confirmingFinish
      && <p key="access">읽기 전용 · 편집 권한과 현재 서버 상태를 확인해 주세요.</p>,
    permissionIssue && <p key="permission">{permissionIssue}</p>,
    progress.failed && <div key="assessment"><p>잠정 중량 검토를 불러오지 못했어요.<br />수행 기록은 유지돼요.</p>
      <RefreshButton loading={progress.pending} failure="잠정 중량 검토를 불러오지 못했어요." onRefresh={progress.retry} /></div>,
    !!(sync || editor) && (state.workout.approvalResults.some(r => r.status === 'PENDING') || !!state.workout.pendingResolution)
      && <ApprovalControls key="approval" state={state} controller={controller} />,
  ].filter(Boolean)
  return <LocalWorkoutView state={state} controller={controller} definitions={definitions} manufacturers={manufacturers} activities={activities}
    referenceRecords={referenceRecords} referenceRoutine={referenceRoutine} history={history} historyPending={historyPending} visible={visible} onHome={onHome} backLabel={backLabel} notices={notices} progressAssessment={progress.value}
    progressAssessmentPending={progress.pending}
    preparingSummary={preparingSummary} confirmingFinish={confirmingFinish} navigationIssue={navigationIssue}
    recheckIssue={checkFailure === 'read' ? '현재 운동 상태를 확인하지 못했습니다. 연결을 확인해 주세요.' : checkFailure === 'changed'
      ? '운동 상태가 바뀌었습니다. 현재 서버 기록을 확인해 주세요.' : undefined}
    localOnly={localOnly} onReconnect={onReconnect} onRecheckSession={retryLocal ? undefined : onRecheckSession}
    onReopenLocal={onReopenLocal} retryFinish={retryFinish} reopeningLocal={opening} />
}
