import ui from '../../components/ui.module.css'
import {SearchExerciseDetails} from '../../components/SearchExerciseDetails.tsx'
import type { ReferenceRecord } from './reference-reminder.ts'
import { CombinationMemoProvider } from './CombinationMemo.tsx'
import type { LiveSchedule } from '../statistics/weekly-schedule.ts'
import { PresetAssignmentEditor } from '../statistics/WeeklySchedulePanel.tsx'
import { PresetHeader, PresetMembership, PresetNavigation, RoutineCreatedNotice } from './PresetControls.tsx'
import { PresetOrderEditor } from './PresetOrderEditor.tsx'
import { normalizePresetName, presetNameLimit, validPresetName } from './preset-schedule.ts'
import { useTrainingSchedule } from './useTrainingSchedule.ts'
import type { TrainingSchedule } from './useTrainingSchedule.ts'
import { Dialog } from '../../components/Dialog.tsx'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/context.ts'
import { PublicCatalog } from './PublicCatalog.tsx'
import { WorkoutApi } from './api.ts'
import { WorkoutOnlineController } from './controller.ts'
import type { OnlineState } from './controller.ts'
import type { CardioActivity, Manufacturer, Routine, Scope, Session, StandardExercise } from './types.ts'
import { equipmentLabel } from './equipment.ts'
import { RoutineCards } from './RoutineCards.tsx'
import { RoutineDetail } from './RoutineDetail.tsx'
import detailStyles from './RoutineDetail.module.css'
import { RoutineForm } from './RoutineForm.tsx'
import { LocalWorkoutScreen } from '../workout-local/LocalWorkoutScreen.tsx'
import { supportsWorkoutEditing } from '../workout-local/lock.ts'
import type { ExitGuardRegistration } from '../workout-local/types.ts'
import './online.css'
import { ClosedWorkout } from './ClosedWorkout.tsx'
import type { ClosedDisplay } from './closed-controller.ts'
import flowStyles from '../workout-flow/WorkoutFlow.module.css'
import { navigateBack, useScreenHistory } from '../../app/navigation.ts'
import { useRecordDetailHistory } from '../history/useRecordDetailHistory.ts'
import { WeeklyMusclePlan } from '../statistics/MuscleAnalysis.tsx'
import { offlineAccess } from '../workout-local/offline.ts'
import type { LocalWorkout } from '../workout-local/types.ts'
import { StatisticsApi } from '../statistics/api.ts'
import { StatisticsPanel } from '../statistics/StatisticsPanel.tsx'
import type { AppTab } from '../../app/types.ts'
import { Metadata, StatusNotice } from '../../components/ui.tsx'
import { useConfirmation } from '../../components/useConfirmation.tsx'
import { Toast } from '../../components/common-ui/Toast.tsx'
import { RefreshButton } from '../../components/common-ui/RefreshButton.tsx'
import { readFailure, readWithDeadline } from '../../app/read-deadline.ts'
import { ContentError } from '../../components/common-ui/ContentFeedback.tsx'
import { useSuccessToast } from '../../components/common-ui/useSuccessToast.ts'
import { useReadErrorToast } from '../../components/common-ui/useReadErrorToast.ts'
import { LoadingSkeleton } from '../../components/LoadingSkeleton.tsx'
import { boundaryError, readAccessDenied } from '../home/load.ts'
import { Button } from '../../components/ui.tsx'
import { HomePanel, HomeStartup } from '../home/HomePanel.tsx'
import { useStartupReveal } from '../../app/useStartupReveal.ts'
import { activeWorkoutProgress } from '../home/active-workout.ts'
import { RestSettings } from '../settings/RestSettings.tsx'
import type { RestExitGuard } from '../settings/RestSettings.tsx'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { useDelayedPending } from '../../components/useDelayedPending.ts'
import { useRoutineEditorRoutes } from './useRoutineEditorRoutes.ts'

export const workoutNavigationFailure = '입력 초안을 저장하지 못해 화면 이동을 보류했습니다. 운동 원본과 입력을 유지합니다.'
export const workoutPermissionFailure = '오프라인 재실행 허용을 저장하지 못했습니다. 운동 원본은 유지됩니다. 저장소 설정을 확인해 주세요.'

export function SessionView({ session, deviceId, saved, busy, onRefresh, onTakeover, issue, manufacturers = [] }: { manufacturers?: Manufacturer[]; session: Session; deviceId: string | null; saved: boolean; busy: boolean; onRefresh: () => void; onTakeover?: () => Promise<void>; issue?: string | null }) {
  const [confirm, confirmation] = useConfirmation()
  const otherEditor = session.editorDeviceId !== deviceId
  const label = session.status === 'ACTIVE' ? '진행 중' : session.status === 'FINISHED' ? '명시 종료' : '서버 자동 종료'
  return <section className="card stack" aria-labelledby="online-session-title"><div className="section-heading"><h2 id="online-session-title">{session.initialPlan.routineName}</h2><span className="online-session-badge">{label}</span></div>
    <p>{session.workoutDate} · <time dateTime={session.startedAt}>{session.startedAt}</time></p>
    {session.status === 'ACTIVE' && otherEditor && <StatusNotice>다른 기기에서 편집 중입니다. 이 화면은 읽기 전용입니다.</StatusNotice>}
    {session.status === 'ACTIVE' && otherEditor && onTakeover && <button className="outline full action-pill" disabled={busy || !deviceId || !saved} onClick={() => void confirm({
      title: '이 기기에서 편집할까요?', description: <p>서버에 저장된 기록으로 시작해요.<br />다른 기기의 미전송 기록은 자동으로 합쳐지지 않아요.</p>,
      confirmLabel: '편집 가져오기', onConfirm: onTakeover,
    })}>이 기기로 편집 가져오기</button>}
    {session.status === 'AUTO_CLOSED' && <p className="notice">서버가 마지막 저장 상태로 자동 종료했습니다. 사용자 종료 시각이나 최초 명시 종료 평가를 생성하지 않습니다.</p>}
    {session.deletedAt && <p className="notice">삭제된 운동입니다. 기록을 자동 복원하지 않습니다.</p>}
    {issue ? <StatusNotice error>{issue}</StatusNotice> : !saved && <StatusNotice error>이 기기에 운동을 열지 못해 수행 입력을 시작할 수 없습니다. 세션을 다시 확인해 주세요.</StatusNotice>}
    <details><summary>시작 당시 계획</summary><div className="stack">{session.initialPlan.weightExercises.map(e => <p key={e.sessionExerciseId}>{e.exerciseName} · {e.setCount}세트 · {e.minReps}~{e.maxReps}회 · 승인 {e.approvedWeightKg} kg · <Metadata>{equipmentLabel(e, manufacturers)}</Metadata></p>)}
      {session.initialPlan.cardioActivities.map(c => <p key={c.sessionActivityId}>{c.plan.name} · 목표 {c.plan.targetSeconds}초</p>)}</div></details>
    <details><summary>서버에서 마지막 확인한 적용 계획·수행</summary><div className="stack">{session.snapshot.state.appliedPlan.weightExercises.map(e => <p key={e.sessionExerciseId}>{session.initialPlan.weightExercises.find(x => x.sessionExerciseId === e.sessionExerciseId)?.exerciseName ?? '추가된 세션 종목'} · {e.setCount}세트 · {e.minReps}~{e.maxReps}회</p>)}
      {session.snapshot.state.appliedPlan.cardioActivities.map(c => <p key={c.sessionActivityId}>{c.plan.name} · 목표 {c.plan.targetSeconds}초</p>)}
      <p>완료 웨이트 {session.snapshot.state.performedSets.length}세트 · 확정 유산소 {session.snapshot.state.cardioResults.length}건</p>
      {session.snapshot.state.performedSets.map(s => <p key={s.id}>{s.ordinal}세트 · {s.weightKg} kg × {s.reps}회 · <Metadata>{equipmentLabel(s, manufacturers)}</Metadata></p>)}</div></details>
    {session.snapshot.approvalResults.some(r => r.status === 'PENDING') && <p className="notice">승인 확인 필요 · 수행 기록의 저장과 중량 승인 적용은 별개입니다.</p>}
    <button type="button" className="outline full action-pill" disabled={busy} onClick={onRefresh}>세션 상세 다시 확인</button>
    {confirmation}
  </section>
}
type RoutineEditorState = { routine: Routine | null; readOnly: boolean }
type ScheduleEditorState = { type: 'assign'; id: string; base: LiveSchedule; priorityId?: string } | { type: 'order'; base: LiveSchedule }
type RenameDraft = { id: string; version: string; base: LiveSchedule; value: string; issue?: string }
const editorIdentity = (session: Session) => [session.userId, session.dataGeneration, session.id, session.editorDeviceId, session.writerEpoch].join(':')

export function WorkspaceView({ state, controller, api, training, enabled, activities = [], routes, onStart, openingWorkout = false, visible = true }: {
  state: OnlineState; controller: WorkoutOnlineController; api: WorkoutApi; training: TrainingSchedule
  enabled: boolean; activities?: CardioActivity[]; routes: ReturnType<typeof useRoutineEditorRoutes>; onStart?: () => void | Promise<void>; openingWorkout?: boolean; visible?: boolean
}) {
  const { schedule, protection } = training
  const [planPreset, setPlanPreset] = useScreenHistory<string | null>('routine-plan:' + state.scope?.userId + ':' + state.scope?.dataGeneration, null)
  const [editorData, setEditorData] = useState<RoutineEditorState | null>(null)
  const { editorKey, scheduleKey, editorRoute, setEditorRoute, scheduleRoute, setScheduleRoute, focused } = routes
  const [editorIssue, setEditorIssue] = useState<{ target: string; attempt: number; message: string } | null>(null)
  const [editorRetry, setEditorRetry] = useState(0)
  const [startingRoutine, setStartingRoutine] = useState<string | null>(null)
  const startWaiting = !!startingRoutine || openingWorkout
  const [deletingRoutine, setDeletingRoutine] = useState<string | null>(null)
  const [confirm, confirmation] = useConfirmation()
  const feedback = useSuccessToast(visible ? 'routines' : null)
  const startPending = useRef(false)
  const setEditor = (next: RoutineEditorState | null, fromDetail = false) => {
    if (next) feedback.clear()
    setEditorData(next)
    if (next) setEditorRoute({ id: next.routine?.id ?? 'new', readOnly: next.readOnly, fromDetail })
    else setEditorRoute(null, true)
  }
  const backFromEditor = () => { feedback.clear(); navigateBack(() => setEditor(null)) }
  const [scheduleData, setScheduleData] = useState<ScheduleEditorState | null>(null)
  const scheduleEditor = scheduleRoute && (scheduleData?.type === scheduleRoute.type &&
    (scheduleRoute.type === 'order' || scheduleData.type === 'assign' && scheduleData.id === scheduleRoute.id)
    ? scheduleData : schedule && (scheduleRoute.type === 'order' || schedule.presets.some(p => p.id === scheduleRoute.id))
      ? { ...scheduleRoute, base: schedule } : null)
  // A route restored by History needs the same fixed editing base as an editor opened from the list.
  if (scheduleEditor !== scheduleData) setScheduleData(scheduleEditor)
  const setScheduleEditor = (next: ScheduleEditorState, replace = false) => {
    feedback.clear()
    setScheduleData(next)
    setScheduleRoute(next.type === 'assign' ? { type: next.type, id: next.id, priorityId: next.priorityId } : { type: next.type }, replace)
  }
  const closeScheduleEditor = () => {
    setScheduleData(null)
    setScheduleRoute(null, true)
  }
  const [viewedId, setViewedId] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState<{ id: string; base: LiveSchedule } | null>(null)
  const [renaming, setRenaming] = useState<RenameDraft | null>(null)
  const [previews, setPreviews] = useState(() => new Map<string, Routine>())
  const routineList = state.data?.routines
  const previewKey = JSON.stringify([state.scope, routineList?.map(r => [r.id, r.version])])
  useEffect(() => {
    if (!enabled || !state.scope || !routineList) return
    const abort = new AbortController(), scope = state.scope, list = routineList
    const values = new Map<string, Routine>()
    let index = 0
    void Promise.all(Array.from({ length: Math.min(4, list.length) }, async () => {
      while (index < list.length && !abort.signal.aborted) {
        const routine = list[index++]
        try {
          const detail = await api.routine(scope, routine.id, abort.signal)
          if (detail.version === routine.version) values.set(routine.id, detail)
        }
        catch (error) { if (!abort.signal.aborted && boundaryError(error)) controller.invalidateScope(error) }
      }
    })).then(() => { if (!abort.signal.aborted) setPreviews(previous => new Map(list.flatMap(routine => {
      const detail = values.get(routine.id) ?? previous.get(routine.id)
      return detail?.userId === scope.userId && detail.dataGeneration === scope.dataGeneration && detail.version === routine.version ? [[detail.id, detail]] : []
    }))) })
    return () => abort.abort()
  }, [api, previewKey, state.scope, routineList, controller, enabled])
  const cards = new Map(routineList?.flatMap(routine => {
    const detail = previews.get(routine.id)
    return detail && detail.userId === state.scope?.userId && detail.dataGeneration === state.scope.dataGeneration && detail.version === routine.version ? [[detail.id, detail]] : []
  }))
  if (state.selected && state.data?.routines.some(r => r.id === state.selected?.id && r.version === state.selected.version)) cards.set(state.selected.id, state.selected)
  const editorId = editorRoute?.id
  const readOnly = editorRoute?.readOnly ?? false
  const editorVersion = routineList?.find(routine => routine.id === editorId)?.version
  const cachedRoutine = editorId ? cards.get(editorId) : undefined
  const draft = editorData && editorId === (editorData.routine?.id ?? 'new') && editorData.readOnly === readOnly ? editorData : null
  const editingDraft = !!draft && !readOnly
  const editorTarget = JSON.stringify([editorId, editorVersion])
  const editorFailure = editorIssue?.target === editorTarget ? editorIssue : null
  const editor = editorRoute && (editorId === 'new' ? { routine: null, readOnly: false }
    : draft ?? (cachedRoutine && !editorFailure ? { routine: cachedRoutine, readOnly } : null))
  const showEditorLoading = useDelayedPending(!!editorRoute && !editor && !editorFailure)
  const editorRefresh = editor?.readOnly && editor.routine ? state.routineRefreshes?.get(editor.routine.id) : undefined
  const scope = state.scope
  useEffect(() => {
    if (!enabled || !scope || !editorId || editorId === 'new' || editingDraft) return
    const abort = new AbortController()
    void readWithDeadline(abort.signal, signal => api.routine(scope, editorId, signal)).then(routine => {
      if (!abort.signal.aborted) { setEditorData({ routine, readOnly }); setEditorIssue(null) }
    }).catch(error => {
      if (abort.signal.aborted) return
      if (boundaryError(error)) controller.invalidateScope(error)
      if (readAccessDenied(error)) setEditorData(null)
      setEditorIssue({ target: editorTarget, attempt: editorRetry, message: readFailure(error, '루틴을 불러오지 못했어요.') })
    })
    return () => abort.abort()
  }, [api, controller, editingDraft, editorId, editorTarget, editorRetry, enabled, readOnly, scope])

  const viewed = schedule?.presets.find(p => p.id === viewedId) ?? schedule?.presets.find(p => p.id === schedule.activeId)
  const busy = state.busy || training.busy
  const managementBlocked = !enabled || !state.data || busy || !!state.active || !!state.attempt || protection !== null || training.loading
  const scheduleBlocked = managementBlocked || !training.canWrite
  useEffect(() => { if (focused) window.scrollTo(0, 0) }, [focused])
  const membership = (id: string) => schedule && <PresetMembership presets={schedule.presets} routineId={id} />
  const routineName = (id: string) => state.data?.routines.find(r => r.id === id)?.name ?? '루틴 확인 필요'
  function openSchedule(priorityId?: string) {
    if (!schedule || !viewed || scheduleBlocked) return
    setCreated(null)
    setScheduleEditor({ type: 'assign', id: viewed.id, base: schedule, priorityId })
  }
  function openRoutine(id: string, readOnly: boolean) {
    if (!readOnly && managementBlocked) return
    feedback.clear()
    const routine = cards.get(id)
    setEditorData(routine ? { routine, readOnly } : null)
    setEditorIssue(null)
    setEditorRoute({ id, readOnly })
  }
  async function startRoutine(routine: Routine) {
    if (!supportsWorkoutEditing() || managementBlocked || startPending.current || state.routineRefreshes?.has(routine.id)) return
    startPending.current = true
    setStartingRoutine(routine.id)
    const origin = window.history.state?.overloadNavigation
    try {
      await controller.select(routine.id)
      const latest = controller.getSnapshot()
      if (window.history.state?.overloadNavigation !== origin || latest.selected?.id !== routine.id || latest.scope !== scope) return
      if (latest.selected.version !== routine.version) {
        setEditorData({ routine: latest.selected, readOnly: true })
        feedback.show('루틴이 변경됐어요. 다시 확인해 주세요.', 'warning')
        return
      }
      if (onStart) await onStart()
      else await controller.start()
    } finally {
      startPending.current = false
      setStartingRoutine(null)
    }
  }
  async function deleteRoutine(id: string) {
    const target = editor?.routine?.id === id ? editor.routine : routineList?.find(routine => routine.id === id)
    if (managementBlocked || deletingRoutine || !target) return
    let deleted = false
    await confirm({ title: '루틴을 삭제할까요?', confirmLabel: '삭제', destructive: true,
      description: <p>“{target.name}”의 주간 일정 배정이 모두 해제돼요.<br />기존 운동 기록은 유지돼요.</p>,
      onConfirm: async () => {
        const before = controller.getSnapshot()
        if (before.busy || before.active || before.attempt || before.scope !== scope) return
        setDeletingRoutine(id)
        try {
          await controller.select(id)
          const current = controller.getSnapshot()
          if (current.scope !== scope || current.active || current.attempt || current.selected?.id !== id) return
          deleted = await controller.deleteRoutine(target.version)
          training.refresh()
        } finally { setDeletingRoutine(null) }
      } })
    if (deleted) {
      feedback.show('루틴을 삭제했습니다.')
      if (editorRoute) navigateBack(() => setEditor(null))
    }
  }
  const deletingPreset = deleting?.base.presets.find(p => p.id === deleting.id)
  const latestName = renaming && schedule?.presets.find(p => p.id === renaming.id)
  const renameStale = renaming && (renaming.base.version !== schedule?.version || renaming.version !== latestName?.version)
  const retrySchedule = training.issue && <RefreshButton loading={training.loading} disabled={busy}
    onRefresh={training.refresh} failure={!schedule ? training.issue : null} />
  const unavailableSchedule = training.issue && <ContentError embedded title={training.issue} action={retrySchedule} />
  const scheduleUnchanged = scheduleEditor && schedule && schedule.version === scheduleEditor.base.version &&
    (scheduleEditor.type === 'order' || schedule.presets.find(preset => preset.id === scheduleEditor.id)?.version === scheduleEditor.base.presets.find(preset => preset.id === scheduleEditor.id)?.version)
  const confirmSchedule = scheduleUnchanged && !training.loading && training.writeIssueTone === 'warning' &&
    <Button disabled={busy} onClick={() => { training.clearWriteIssue(); training.refresh() }}>최신 일정 확인</Button>
  const retryRoutines = <RefreshButton loading={state.status === 'loading'} disabled={busy} onRefresh={() => void controller.refresh()}
    failure={!state.data ? state.issue : null} />
  const retryEditor = editorFailure && <RefreshButton loading={editorFailure.attempt !== editorRetry}
    failure={!editor ? editorFailure.message : null} onRefresh={() => setEditorRetry(value => value + 1)} />
  const writeIssue = !renaming && !deleting ? training.writeIssue : null
  const scheduleReadIssue = (schedule || scheduleEditor) && !training.loading ? training.issue : undefined
  const workspaceIssue = visible && !renaming && !deleting ? scheduleReadIssue ?? writeIssue
    ?? (editor && editorFailure?.attempt === editorRetry ? editorFailure.message : undefined)
    ?? (state.data && state.readIssue && state.status !== 'loading' ? '루틴을 불러오지 못했어요.' : undefined)
    ?? (state.data && (!editor || editor.readOnly) && !startWaiting ? state.startUnconfirmed ? '운동이 시작됐는지 확인하지 못했어요.' : state.issue : null) : null
  const readFeedback = useReadErrorToast(workspaceIssue, scheduleReadIssue ? 'error' : writeIssue ? training.writeIssueTone ?? 'error' : state.startUnconfirmed ? 'warning' : 'error')
  return <section className={`stack workout-online ${editor ? detailStyles.workspace : ''}`}
    aria-label="루틴"
    data-tab-overview={!focused && !planPreset || undefined}>
    {protection && <p className="notice" role="status">{protection === 'ACTIVE' ? '디로딩 진행 중' : '디로딩 완료 당일'} · 일반 루틴과 주간 일정은 조회 전용입니다.</p>}
      <div hidden={focused || !!planPreset}>
        {created && <RoutineCreatedNotice name={created.name} onLater={() => setCreated(null)} onAssign={() => openSchedule(created.id)} blocked={scheduleBlocked} />}
        <RoutineCards week={viewed} summaries={state.data?.routines ?? []} details={cards} busy={busy} managementBlocked={managementBlocked}
          listState={!state.data && (state.issue ? <ContentError embedded title="루틴을 불러오지 못했어요." action={retryRoutines} />
            : <LoadingSkeleton layout="list" label="루틴 목록을 확인하는 중입니다." />) || undefined}
          listRetry={state.data && state.readIssue && state.issue && retryRoutines}
          scheduleState={!schedule && (unavailableSchedule || <LoadingSkeleton layout="row" label="주간 일정을 확인하는 중입니다." />) || undefined}
          onNew={() => { setCreated(null); setEditor({ routine: null, readOnly: false }) }}
          onEdit={id => void openRoutine(id, false)} onSelect={id => void openRoutine(id, true)} onDelete={id => void deleteRoutine(id)}
          presetHeader={schedule && viewed ? viewToggle => <PresetHeader schedule={schedule} viewed={viewed} busy={busy} readOnly={scheduleBlocked} viewToggle={viewToggle}
            onPlan={() => { feedback.clear(); setPlanPreset(viewed.id) }}
            onActivate={() => void training.write({ type: 'activate', id: viewed.id })}
            onToggle={() => void training.write({ type: 'rotate', enabled: !schedule.autoEnabled, entries: schedule.presets })}
            onRename={schedule.renameSupported ? () => {
              training.clearWriteIssue()
              setRenaming({ id: viewed.id, version: viewed.version, base: schedule, value: viewed.name })
            } : undefined}
            onOrganize={() => setScheduleEditor({ type: 'order', base: schedule })}
            onDelete={() => setDeleting({ id: viewed.id, base: schedule })} /> : undefined}
          schedule={schedule && (retrySchedule || <button type="button" className="outline full action-pill" disabled={scheduleBlocked} onClick={() => openSchedule()}>주간 일정 편집</button>)}
          presetNavigation={schedule && viewed && <PresetNavigation schedule={schedule} viewed={viewed} busy={busy || scheduleBlocked}
            readOnly={scheduleBlocked && !training.loading && !training.issue}
            onView={setViewedId} onAdd={async () => {
              const saved = await training.write({ type: 'add' })
              const added = saved?.presets.find(p => !schedule.presets.some(old => old.id === p.id))
              if (added) setViewedId(added.id)
            }} />}
          presetAssignments={schedule ? membership : undefined} />
      </div>
    {planPreset && <button type="button" className="quiet" onClick={() => navigateBack(() => setPlanPreset(null, true))}>‹ 루틴으로</button>}
    {scheduleRoute && (!scheduleEditor || !state.data) && <><RecordSubpageHeader title={scheduleRoute.type === 'order' ? '주간 일정 전체 편집' : '주간 일정 편집'} onBack={() => navigateBack(closeScheduleEditor)} />
      {unavailableSchedule || (state.issue && !state.data ? <ContentError embedded title="루틴을 불러오지 못했어요." action={retryRoutines} />
        : training.loading || !state.data ? <LoadingSkeleton layout="detail" label="주간 일정을 확인하는 중입니다." /> : <StatusNotice>주간 일정을 찾을 수 없어요.</StatusNotice>)}</>}
    {state.data && state.scope && <>
      {planPreset && (schedule ? <><WeeklyMusclePlan definitions={state.data.exercises} api={api} scope={state.scope} schedule={schedule} initialPreset={planPreset} refreshKey={previewKey} onInvalid={controller.invalidateScope} />{retrySchedule}</>
        : unavailableSchedule || <LoadingSkeleton layout="detail" label="주간 일정을 확인하는 중입니다." />)}
      {editorRoute && !editor && <RecordSubpageHeader title="루틴" onBack={backFromEditor} />}
      {editorRoute && editorFailure && !editor && <ContentError title="루틴을 불러오지 못했어요." action={retryEditor} />}
      {showEditorLoading && <LoadingSkeleton layout="detail" label="루틴 정보를 확인하는 중입니다." />}
      {scheduleEditor?.type === 'assign' && <PresetAssignmentEditor base={scheduleEditor.base} current={schedule} id={scheduleEditor.id}
        priorityId={scheduleEditor.priorityId} routines={state.data.routines} busy={busy} readOnly={scheduleBlocked} readRetry={retrySchedule || confirmSchedule}
        initialApply={scheduleEditor.base.appliedVersion === null && scheduleEditor.id === scheduleEditor.base.activeId}
        navigationKey={scheduleKey} onSelect={id => { if (schedule) setScheduleEditor({ ...scheduleEditor, id, base: schedule }, true) }}
        onReload={() => { if (schedule && viewed) { training.clearWriteIssue(); setScheduleEditor({ ...scheduleEditor, id: schedule.presets.some(p => p.id === scheduleEditor.id) ? scheduleEditor.id : viewed.id, base: schedule }, true) } }}
        onClose={closeScheduleEditor}
        onSave={async assignments => {
          const preset = scheduleEditor.base.presets.find(p => p.id === scheduleEditor.id)!
          if (!await training.write({ type: 'assign', id: preset.id, version: preset.version, assignments }, scheduleEditor.base)) return false
          setViewedId(preset.id)
          return true
        }} />}
      {scheduleEditor?.type === 'order' && <PresetOrderEditor key={scheduleEditor.base.version} schedule={scheduleEditor.base} busy={busy}
        stale={!!schedule && scheduleEditor.base.version !== schedule.version} readOnly={scheduleBlocked && !training.loading && !training.issue}
        locked={scheduleBlocked} readRetry={retrySchedule || confirmSchedule} routineName={routineName}
        navigationKey={scheduleKey} onClose={closeScheduleEditor} onReload={() => { if (schedule) { training.clearWriteIssue(); setScheduleEditor({ type: 'order', base: schedule }, true) } }}
        onSave={async entries => !!await training.write({ type: 'rotate', enabled: scheduleEditor.base.autoEnabled, entries }, scheduleEditor.base)} />}
      {editor?.readOnly && editor.routine && <RoutineDetail routine={editor.routine} exercises={state.data.exercises} activities={activities} manufacturers={state.data.manufacturers}
        presets={schedule?.presets} scheduleLoading={training.loading} timeZone={schedule?.timeZone ?? undefined} managementBlocked={managementBlocked} deleting={deletingRoutine === editor.routine.id}
        onBack={backFromEditor} onEdit={() => { if (!managementBlocked) setEditor({ ...editor, readOnly: false }, true) }}
        onDelete={() => { if (editor.routine) void deleteRoutine(editor.routine.id) }}
        start={<>
          {state.attempt?.request.routineId === editor.routine.id && !state.active ?
            <Button variant="primary" loading={startWaiting} disabled={!state.localReady || busy} onClick={() => { if (onStart) void onStart(); else void controller.start() }}>{startWaiting ? '확인 중' : '운동 시작'}</Button> : <>
          {editorRefresh && (editorRefresh.failed || editorRefresh.retrying) &&
            <RefreshButton loading={!editorRefresh.failed} failure={editorRefresh.failed ? '최신 루틴을 불러오지 못했어요.' : null}
              onRefresh={() => controller.retryRoutineRefresh(editor.routine!.id)} />}
          <Button variant="primary" loading={startWaiting || !!editorRefresh && !editorRefresh.failed && !editorRefresh.retrying}
            disabled={!startWaiting && (!supportsWorkoutEditing() || managementBlocked || !state.localReady || !!editorRefresh)}
            onClick={() => void startRoutine(editor.routine!)}>운동 시작</Button></>}
        </>} />}
      {editor && !editor.readOnly && <RoutineForm key={editor.routine?.id ?? 'new'} routine={editor.routine} activities={activities}
        onSaved={(id, name) => {
          if (!editor.routine) setCreated({ id, name })
          feedback.show(editor.routine ? '루틴 변경사항을 저장했습니다.' : '루틴을 만들었습니다.')
          training.refresh()
        }}
        generation={state.scope.dataGeneration} exercises={state.data.exercises} manufacturers={state.data.manufacturers}
        busy={busy} controller={controller} onClose={() => setEditor(null)} navigationKey={editorKey} backLabel={editorRoute?.fromDetail ? '루틴 상세로' : undefined} managementBlocked={managementBlocked} />}
    </>}
    {editor && retryEditor}
    {!state.data && editorRoute && <><RecordSubpageHeader title="루틴" onBack={backFromEditor} />
      {state.issue ? <ContentError title="루틴을 불러오지 못했어요." action={retryRoutines} /> : <LoadingSkeleton layout="detail" label="루틴 정보를 확인하는 중입니다." />}</>}
    {!state.data && planPreset && (state.issue ? <ContentError title="계획을 불러오지 못했어요." action={retryRoutines} /> : <LoadingSkeleton layout="detail" label="계획을 확인하는 중입니다." />)}
    {state.data && state.issue && state.readIssue && (focused || !!planPreset) && !training.issue && retryRoutines}
    {enabled && renaming && <Dialog title="주간 일정 이름 변경" dismissBlocked={busy} onClose={() => setRenaming(null)}>
      <form className="stack" onSubmit={async event => {
        event.preventDefault()
        if (scheduleBlocked || renameStale) return
        const name = normalizePresetName(renaming.value)
        if (!validPresetName(name)) {
          const issue = name ? `일정 이름은 줄바꿈 없이 ${presetNameLimit}자 이하로 입력해 주세요.` : '일정 이름을 입력해 주세요.'
          setRenaming({ ...renaming, issue })
          return
        }
        if (await training.write({ type: 'rename', id: renaming.id, name }, renaming.base)) setRenaming(null)
      }}>
        <label className={ui.field}>일정 이름<input className={ui.input} name="name" type="text" value={renaming.value} autoComplete="off"
          aria-invalid={!!renaming.issue} aria-describedby={renaming.issue ? 'preset-name-issue' : undefined} disabled={busy}
          onChange={event => setRenaming({ ...renaming, value: event.target.value, issue: undefined })} /></label>
        {(renaming.issue || training.writeIssue || training.issue) &&
          <p id="preset-name-issue" className="notice error" role="alert">{renaming.issue ?? training.writeIssue ?? training.issue}</p>}
        {training.issue && <RefreshButton disabled={busy} loading={training.loading} onRefresh={training.refresh} />}
        {renameStale && schedule && (latestName
          ? <><p role="status">현재 저장 이름 · {latestName.name}</p>
            <button type="button" className="outline action-pill" disabled={scheduleBlocked} onClick={() => {
              training.clearWriteIssue()
              setRenaming({ ...renaming, base: schedule, version: latestName.version })
            }}>최신 버전 사용</button></>
          : <p role="status">이 일정이 삭제되었거나 더 이상 조회할 수 없습니다.</p>)}
        <div className="row">
          <button type="button" className="action-pill modal-neutral" data-modal-neutral disabled={busy} data-button-pending={training.busy || undefined} onClick={() => setRenaming(null)}>취소</button>
          <Button type="submit" variant="primary" disabled={!!renameStale || scheduleBlocked && !training.busy} pending={training.busy && !renameStale} aria-busy={training.busy || undefined}>저장</Button>
        </div>
      </form>
    </Dialog>}
    {enabled && deleting && deletingPreset && <Dialog title="주간 일정 삭제" tone="destructive" dismissBlocked={busy} onClose={() => setDeleting(null)}>
      <p>“{deletingPreset.name}”에 저장된 요일 배정이 사라져요.</p>
      {training.writeIssue && <p role="alert">{training.writeIssue}</p>}
      <div className="row"><button type="button" className="action-pill modal-neutral" data-modal-neutral disabled={busy} data-button-pending={training.busy || undefined} onClick={() => setDeleting(null)}>취소</button>
        <button type="button" className="action-pill destructive-action" disabled={scheduleBlocked || deleting.base.version !== schedule?.version}
          aria-busy={training.busy || undefined} data-button-pending={training.busy && deleting.base.version === schedule?.version || undefined}
          onClick={async () => { if (await training.write({ type: 'delete', id: deleting.id }, deleting.base)) setDeleting(null) }}>삭제</button></div>
    </Dialog>}
    {confirmation}
    <Toast toast={readFeedback.toast ?? (visible && (!focused || editor?.readOnly) && !planPreset ? feedback.toast : null)}
      onDismiss={readFeedback.toast ? readFeedback.dismiss : feedback.dismiss} bottomClearance={focused ? '0px' : 'var(--tabs-height, 56px)'} />
  </section>
}
export function WorkoutWorkspace({ onExitGuard, tab = 'home', onNavigate, renderShell, catalogOpen = false, restOpen = false, onSettingsBack, onRestExitGuard }: {
  onExitGuard?: ExitGuardRegistration; tab?: AppTab; onNavigate?: (tab: AppTab, replace?: boolean, children?: Record<string, unknown>, resetScroll?: boolean) => Promise<boolean>
  renderShell?: (content: ReactNode, focused: boolean, routineEditor: boolean) => ReactNode
  catalogOpen?: boolean; restOpen?: boolean; onSettingsBack?: (canLeave?: RestExitGuard) => void
  onRestExitGuard?: (guard: RestExitGuard | null) => void
} = {}) {
  const { state: auth, controller: authentication } = useAuth()
  const [api] = useState(() => new WorkoutApi(authentication))
  const [statistics] = useState(() => new StatisticsApi(authentication))
  const [controller] = useState(() => new WorkoutOnlineController(api, undefined, () => authentication.invalidateLocalWorkoutAccess()))
  const exitGuard = useRef<(() => Promise<boolean>) | null>(null)
  const registerExit = useCallback<ExitGuardRegistration>(guard => { exitGuard.current = guard; onExitGuard?.(guard) }, [onExitGuard])
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const accountReady = auth.status === 'authenticated' && auth.pending === null && state.scope?.userId === auth.userId && !state.revalidatingScope && !auth.accountOpen
  const cardioScope = auth.status === 'authenticated' && !state.revalidatingScope && state.scope?.userId === auth.userId ? state.scope : null
  const [cardioChoices, setCardioChoices] = useState<{ key: string; values: CardioActivity[] } | null>(null)
  const cardioKey = cardioScope ? cardioScope.userId + ':' + cardioScope.dataGeneration : null
  const [catalogScope, setCatalogScope] = useState<string | null>(null)
  if (catalogOpen && cardioKey && catalogScope !== cardioKey) setCatalogScope(cardioKey)
  const activities = cardioKey && cardioChoices?.key === cardioKey ? cardioChoices.values : []
  useEffect(() => {
    if (!accountReady || !cardioScope || !cardioKey) return
    const abort = new AbortController()
    void api.cardioActivities(cardioScope.userId, abort.signal).then(values => {
      if (!abort.signal.aborted) setCardioChoices({ key: cardioKey, values })
    }).catch(error => { if (!abort.signal.aborted) controller.invalidateScope(error) })
    return () => abort.abort()
  }, [api, cardioScope, cardioKey, controller, accountReady])
  const [visit, setVisit] = useState({ tab, home: 0, routines: tab === 'routines', history: tab === 'history' })
  if (visit.tab !== tab) setVisit({ tab, home: visit.home + Number(tab === 'home'),
    routines: visit.routines || tab === 'routines', history: visit.history || tab === 'history' })
  const dataRevision = [state.recordsRevision, state.data?.routines.map(r => r.id + ':' + r.version).join(',')].join('|')
  const training = useTrainingSchedule(authentication, cardioScope, dataRevision, controller.invalidateScope, accountReady)
  const canStartFromHome = useRef(training.canWrite)
  useLayoutEffect(() => { canStartFromHome.current = training.canWrite }, [training.canWrite])
  const [permissionIssue, setPermissionIssue] = useState(false)
  const [workoutRoute, setWorkoutRoute] = useScreenHistory<string | null>('workout-view:' + state.scope?.userId + ':' + state.scope?.dataGeneration, null)
  const routineRoutes = useRoutineEditorRoutes(state.scope)
  const [navigationIssue, setNavigationIssue] = useState(false)
  const [homeStartIssue, setHomeStartIssue] = useState<string | null>(null)
  const [homeAction, setHomeAction] = useState<'start' | 'retry' | 'resume' | null>(null)
  const [entry, setEntry] = useState<{ scope: Scope; tab: AppTab; action: 'start' | 'retry' | 'resume'; id: string | null } | null>(null)
  const [openedEditor, setOpenedEditor] = useState<string | null>(null)
  const onEditorOpened = useCallback((session: Session) => setOpenedEditor(editorIdentity(session)), [])
  const [retainedEditor, setRetainedEditor] = useState<Session | null>(null)
  const [settledSummary, setSettledSummary] = useState<string | null>(null)
  const [recordOpening, setRecordOpening] = useState<{ key: string; id: string } | null>(null)
  const homeActionPending = useRef(false)
  async function runHomeAction(action: NonNullable<typeof homeAction>, run: () => Promise<void>) {
    if (homeActionPending.current) return
    homeActionPending.current = true
    setHomeAction(action)
    try { await run() }
    finally { homeActionPending.current = false; setHomeAction(null) }
  }
  const admitOffline = useCallback((workout: LocalWorkout) => {
    const allowed = () => {
      const a = authentication.getSnapshot(), s = controller.getSnapshot(), server = s.detail
      return a.status === 'authenticated' && a.pending === null && a.userId === workout.userId && s.scope?.dataGeneration === workout.dataGeneration
        && !!server && server.id === workout.sessionId && server.status === 'ACTIVE' && !server.deletedAt && server.writerEpoch === workout.writerEpoch && server.editorDeviceId === workout.editorDeviceId
    }
    void offlineAccess.grant(workout, allowed).catch(() => setPermissionIssue(true))
  }, [authentication, controller])
  useEffect(() => controller.connect(authentication), [controller, authentication])
  useEffect(() => {
    if (auth.status !== 'authenticated' || auth.pending !== null || state.scope?.userId !== auth.userId) return
    void Promise.resolve().then(() => offlineAccess.scope(state.scope!)).catch(() => setPermissionIssue(true))
    if (state.deviceId && state.detail && (state.detail.status !== 'ACTIVE' || state.detail.deletedAt || state.detail.editorDeviceId !== state.deviceId)) {
      // Revoke only if this is the permitted workout, never an unrelated history detail.
      void offlineAccess.source().then(source => {
        const a = authentication.getSnapshot(), latest = controller.getSnapshot(), detail = latest.detail
        if (source && a.status === 'authenticated' && a.userId === source.permit.userId && detail?.id === source.permit.sessionId && latest.deviceId
          && (detail.status !== 'ACTIVE' || detail.deletedAt || detail.editorDeviceId !== latest.deviceId || detail.writerEpoch !== source.permit.writerEpoch)) return offlineAccess.deny()
      }).catch(() => setPermissionIssue(true))
    }
  }, [auth.status, auth.pending, auth.userId, state.scope, state.detail, state.deviceId, authentication, controller])
  const localOnly = !!state.userId && auth.localWorkoutUserId === state.userId && state.detail?.status === 'ACTIVE'
  const visible = (localOnly || auth.status === 'authenticated' && auth.pending !== 'logout' && state.userId === auth.userId && !state.revalidatingScope) && !auth.accountOpen
  const retainOnlineViews = visible || auth.accountOpen && auth.status === 'authenticated' && state.scope?.userId === auth.userId && !state.revalidatingScope
  const preserveDrafts = state.revalidatingScope || auth.offlineNetworkFailure && !!state.scope && state.scope.userId === auth.localWorkoutUserId
  const session = state.detail
  const editable = session?.status === 'ACTIVE' && !session.deletedAt && session.editorDeviceId === state.deviceId && state.copySaved && state.data
    && state.scope?.userId === session.userId && state.scope.dataGeneration === session.dataGeneration ? session : null
  const editableKey = editable && editorIdentity(editable)
  if (editable && (!retainedEditor || editorIdentity(retainedEditor) !== editableKey)) setRetainedEditor(editable)
  else if (retainedEditor && (!state.scope || retainedEditor.userId !== state.scope.userId || retainedEditor.dataGeneration !== state.scope.dataGeneration || !session || session.id !== retainedEditor.id)) setRetainedEditor(null)
  // Opening the local editor does not take ownership of the visible route yet.
  const opening = entry && entry.scope === state.scope && entry.tab === tab &&
    (entry.id === null || entry.id === workoutRoute && editableKey && openedEditor !== editableKey) ? entry : null
  const handoff = visible && session?.status === 'FINISHED' && !session.deletedAt && workoutRoute === session.id ? session : null
  const [homeWorkout, setHomeWorkout] = useState<LocalWorkout | null>(null)
  const [retainedNames, setRetainedNames] = useState<{ key: string; exercises: StandardExercise[] } | null>(null)
  const nameUser = accountReady ? session?.userId : null
  const missingNames = JSON.stringify([...new Set(session?.snapshot.state.sessionExercises.filter(e => e.kind === 'WEIGHT'
    && !state.data?.exercises.some(d => d.id === e.standardExerciseId)
    && !session.initialPlan.weightExercises.some(p => p.sessionExerciseId === e.id)).map(e => e.standardExerciseId).filter((id): id is string => !!id) ?? [])].sort())
  const nameKey = [nameUser, session?.dataGeneration, missingNames].join(':')
  useEffect(() => {
    const ids: string[] = JSON.parse(missingNames)
    if (!nameUser || !ids.length) return
    const abort = new AbortController()
    void Promise.all(ids.map(id => api.exerciseDetail(nameUser, id, abort.signal))).then(exercises => {
      if (!abort.signal.aborted) setRetainedNames({ key: nameKey, exercises })
    }).catch(error => { if (!abort.signal.aborted && boundaryError(error)) controller.invalidateScope(error) })
    return () => abort.abort()
  }, [api, controller, nameUser, nameKey, missingNames])
  const sessionDefinitions = [...(state.data?.exercises ?? []), ...(retainedNames?.key === nameKey ? retainedNames.exercises : [])]
  const recordKey = 'record-detail:' + state.scope?.userId + ':' + state.scope?.dataGeneration
  const [recordCache, setRecordCache] = useState(() => ({ key: recordKey, entries: new Map<string, ClosedDisplay>() }))
  if (recordCache.key !== recordKey) setRecordCache({ key: recordKey, entries: new Map() })
  const { route: recordRoute, open: openRecordRoute, back: backFromRecord } = useRecordDetailHistory(recordKey, tab, false)
  const [,setRecordsScreen]=useScreenHistory('records:'+(state.scope?.userId??'')+':'+(state.scope?.dataGeneration??''),'summary')
  const recordId = handoff?.id ?? (!workoutRoute && (tab === 'home' || tab === 'history') ? recordRoute?.id : undefined)
  const summary = !!handoff || recordRoute?.summary === true
  const summaryIdentity = `${recordKey}:${recordId}`
  const summaryPending = !!handoff && settledSummary !== summaryIdentity
  const showSummaryWait = useDelayedPending(summaryPending)
  const detailOpening = !summary && recordOpening?.key === recordKey && recordOpening.id === recordId ? recordOpening : null
  const showDetailWait = useDelayedPending(visible && !!detailOpening)
  // The local view is already read-only after confirmation; keep it mounted while the summary reads.
  const handoffEditor = handoff && state.data && retainedEditor && editorIdentity(handoff) === editorIdentity(retainedEditor) ? retainedEditor : null
  const localSession = editable ?? handoffEditor
  const recordFocused = !!recordId && !detailOpening
  const visibleRecord = visible && !localOnly && recordFocused && !summaryPending ? summaryIdentity : null
  // Reset scroll once, in the commit that replaces the visible source.
  useLayoutEffect(() => {
    if (visibleRecord) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [visibleRecord])
  const detailId = workoutRoute
  const detailAttempt = useRef<string | null>(null)
  useEffect(() => {
    if (!accountReady || detailAttempt.current !== detailId) detailAttempt.current = null
    if (detailId && accountReady && state.status === 'ready' && !state.busy
      && state.detail?.id !== detailId && detailAttempt.current !== detailId) {
      detailAttempt.current = detailId
      void controller.showDetail(detailId)
    }
  }, [detailId, accountReady, state.status, state.busy, state.detail?.id, controller])
  const [repHistory, setRepHistory] = useState<{ key: string; sessions: Session[] } | null>(null)
  const [referenceHistory, setReferenceHistory] = useState<{ key: string; references: ReferenceRecord[]; routine: Routine } | null>(null)
  const referenceUser = accountReady && session?.status === 'ACTIVE' ? session.userId : null
  const referenceGeneration = referenceUser ? session!.dataGeneration : null
  const referenceId = referenceUser ? session!.id : null
  const referenceRoutineId = referenceUser ? session!.initialPlan.routineId : null
  const referenceKey = referenceUser ? [referenceUser, referenceGeneration, referenceId].join(':') : null
  const localReferenceKey = localSession ? [localSession.userId, localSession.dataGeneration, localSession.id].join(':') : null
  useEffect(() => {
    if (!referenceUser || !referenceGeneration || !referenceKey || !referenceRoutineId) return
    const abort = new AbortController(), scope = { userId: referenceUser, dataGeneration: referenceGeneration }
    const loadSessions = async () => {
      const sessions: Session[] = []
      let cursor: Parameters<WorkoutApi['closed']>[1] = null
      do {
        const page = await api.closed(scope, cursor, abort.signal)
        const rows = page.sessions.filter(s => !s.deletedAt && s.status === 'FINISHED')
        for (let at = 0; at < rows.length && !abort.signal.aborted; at += 4) {
          sessions.push(...await Promise.all(rows.slice(at, at + 4).map(row => api.detail(scope, row.id, abort.signal))))
        }
        cursor = page.next
      } while (cursor && !abort.signal.aborted)
      return sessions
    }
    const history = loadSessions().then(sessions => {
      // Repetition defaults only need the performed sets.
      if (!abort.signal.aborted) setRepHistory({ key: referenceKey, sessions })
      return sessions
    }).catch(error => {
      if (!abort.signal.aborted) {
        setRepHistory({ key: referenceKey, sessions: [] })
        if (boundaryError(error)) controller.invalidateScope(error)
      }
      return null
    })
    const loadReferences = async () => {
      const [sessions, routine] = await Promise.all([history, api.routine(scope, referenceRoutineId, abort.signal)])
      if (!sessions || abort.signal.aborted) return
      const records = sessions.filter(record => record.initialPlan.routineId === routine.id)
      const references: ReferenceRecord[] = []
      for (let at = 0; at < records.length && !abort.signal.aborted; at += 4) {
        references.push(...await Promise.all(records.slice(at, at + 4).map(async session => ({
          session, assessment: await api.assessment(scope, session.id, abort.signal),
        }))))
      }
      if (!abort.signal.aborted) setReferenceHistory({ key: referenceKey, references, routine })
    }
    void loadReferences().catch(error => { if (!abort.signal.aborted && boundaryError(error)) controller.invalidateScope(error) })
    return () => abort.abort()
  }, [api, controller, referenceUser, referenceGeneration, referenceKey, referenceRoutineId])
  const focused = visible && !opening && !!session && session.status === 'ACTIVE' && (localOnly || workoutRoute === session.id)
  const enteredWorkout = focused && entry?.id === workoutRoute ? workoutRoute : null
  useLayoutEffect(() => { if (enteredWorkout) window.scrollTo(0, 0) }, [enteredWorkout])
  const workoutLoading = visible && !opening && !!workoutRoute && workoutRoute !== session?.id
  const showWorkoutLoading = useDelayedPending(workoutLoading && !state.issue)
  const routineEditor = visible && tab === 'routines' && routineRoutes.focused
  const shellFocused = visible && (focused || workoutLoading || recordFocused || routineEditor)
  const present = (content: ReactNode) => renderShell ? renderShell(content, shellFocused, routineEditor) : content
  useStartupReveal(auth.status === 'authenticated' && tab === 'home' && (
    visible && (focused || workoutLoading || recordFocused) || state.userId === auth.userId && !!state.issue && !state.data
  ))
  useEffect(() => {
    if (handoff && !summaryPending) void onNavigate?.('history', true, { [recordKey]: { id: handoff.id, summary: true, backLabel: tab === 'routines' ? '루틴으로' : '홈으로' } }, false)
  }, [handoff, summaryPending, onNavigate, recordKey, tab])
  const settingsDetail = onSettingsBack && <>{restOpen && !shellFocused && <RestSettings key={'rest-settings:' + state.userId + ':' + state.scope?.dataGeneration}
    settings={state.userId === auth.userId && !state.revalidatingScope ? state.data?.settings : undefined} hidden={auth.status !== 'authenticated'} busy={!accountReady || state.busy} loadIssue={state.issue}
    onBack={onSettingsBack} onRequest={controller.requestRestSettings} onRetry={() => void controller.refresh()} onExitGuard={onRestExitGuard} />}
    {(catalogOpen || cardioKey && catalogScope === cardioKey) && <PublicCatalog key={'public-catalog:' + cardioKey} api={api} userId={cardioScope?.userId ?? null}
      active={!localOnly && !shellFocused && tab === 'settings' && catalogOpen} enabled={accountReady} onInvalid={controller.invalidateScope} onBack={onSettingsBack} />}</>
  if (!retainOnlineViews && !preserveDrafts) return present(auth.status === 'authenticated' && auth.pending === null && !auth.accountOpen && tab === 'home'
    ? <HomeStartup /> : settingsDetail)
  const flush = async () => {
    const before = controller.getSnapshot(), guard = exitGuard.current
    const saved = await (guard?.() ?? Promise.resolve(true))
    const latest = controller.getSnapshot(), account = authentication.getSnapshot()
    const current = latest.userId === before.userId && latest.scope?.dataGeneration === before.scope?.dataGeneration
      && latest.detail?.id === before.detail?.id && latest.detail?.writerEpoch === before.detail?.writerEpoch && exitGuard.current === guard
      && account.pending !== 'logout' && (account.userId === before.userId || account.localWorkoutUserId === before.userId)
    if (current) setNavigationIssue(!saved)
    return saved && current
  }
  const navigate = async (next: AppTab) => onNavigate ? onNavigate(next) : flush()
  const openRecord = async (id: string) => {
    if (detailOpening) return
    const entry = window.history.state?.overloadNavigation
    const returnScroll = window.scrollY
    if (!accountReady || !await flush()) return
    if (window.history.state?.overloadNavigation === entry) {
      setRecordOpening({ key: recordKey, id })
      openRecordRoute(id, returnScroll)
    }
  }
  const resume = async () => {
    const origin = window.history.state?.overloadNavigation
    const id = state.active?.id
    if (!id || !await flush() || window.history.state?.overloadNavigation !== origin) return
    if (state.detail?.id !== id) await controller.showDetail(id)
    const latest = controller.getSnapshot()
    if (window.history.state?.overloadNavigation === origin && latest.detail?.id === id && latest.detail.status === 'ACTIVE') {
      if (latest.scope) setEntry({ scope: latest.scope, tab, action: 'resume', id })
      setWorkoutRoute(id)
    }
  }
  const startWorkout = async () => {
    const origin = window.history.state?.overloadNavigation
    const initial = controller.getSnapshot()
    if (!initial.scope) return
    const opening = { scope: initial.scope, tab, action: initial.attempt ? 'retry' as const : 'start' as const, id: null }
    setEntry(opening)
    await controller.start()
    const latest = controller.getSnapshot()
    if (window.history.state?.overloadNavigation === origin && latest.scope === opening.scope && latest.detail?.status === 'ACTIVE' && latest.copySaved) {
      setEntry({ ...opening, id: latest.detail.id })
      setWorkoutRoute(latest.detail.id)
    } else setEntry(value => value === opening ? null : value)
  }
  const leaveWorkout = () => navigateBack(() => { void (async () => {
    if (await flush()) setWorkoutRoute(null, true)
  })() })
  const authorized = () => {
    const a = authentication.getSnapshot(), s = controller.getSnapshot()
    return a.pending !== 'logout' && !!session && s.scope?.dataGeneration === session.dataGeneration && s.detail?.id === session.id
      && s.detail.writerEpoch === session.writerEpoch && s.detail.editorDeviceId === session.editorDeviceId && s.detail.status === 'ACTIVE'
      && (a.status === 'authenticated' && a.userId === session.userId || a.localWorkoutUserId === session.userId)
  }
  const starting = opening !== null && opening.action !== 'resume'
  const workoutNavigationIssue = navigationIssue ? workoutNavigationFailure : undefined
  const workoutPermissionIssue = permissionIssue ? workoutPermissionFailure : undefined
  return present(<CombinationMemoProvider key={state.scope?.userId + ':' + state.scope?.dataGeneration}><SearchExerciseDetails api={api} userId={state.scope?.userId}>
    {state.revalidatingScope && state.issue && <ContentError title="운동 정보를 불러오지 못했어요." action={<RefreshButton loading={state.status === 'loading'} failure={state.issue} onRefresh={() => void controller.refresh(true)} />} />}
    {visible && !localSession && workoutNavigationIssue && <StatusNotice error>{workoutNavigationIssue}</StatusNotice>}
    <div hidden={!visible || focused || workoutLoading || recordFocused || tab !== 'home'}>{retainOnlineViews && !localOnly && (state.scope && state.data ? <HomePanel
      key={'home:' + state.scope.userId + ':' + state.scope.dataGeneration} scope={state.scope} routines={state.data.routines} api={api} training={training} statistics={statistics} visit={visit.home}
      enabled={accountReady} startupHome={visible && tab === 'home' && !focused && !workoutLoading && !recordFocused}
      refreshKey={dataRevision} active={starting ? null : state.active} progress={!starting && state.active ? activeWorkoutProgress(state.active, homeWorkout, state.data.exercises) : undefined}
      onRefreshRoutines={() => void controller.refresh()}
      routineRefreshes={state.routineRefreshes} onRetryRoutineRefresh={controller.retryRoutineRefresh}
      attempt={starting ? opening.action === 'retry' : state.attempt !== null} busy={state.busy} localReady={state.localReady} action={opening?.action ?? homeAction}
      startUnconfirmed={state.startUnconfirmed}
      startIssueTone={homeStartIssue || state.issueCode === 'ROUTINE_VERSION_CONFLICT' ? 'warning' : undefined}
      issue={homeStartIssue ?? (state.readIssue ? null : state.issue)} readIssue={state.readIssue ? state.issue : null}
      onInvalid={controller.invalidateScope} onHistory={()=>{void navigate('history').then(ok=>{if(ok)setRecordsScreen('history',true)})}} onNavigate={next => void navigate(next)} onOpen={id => void openRecord(id)} onResume={() => void runHomeAction('resume', resume)} onRetry={() => void runHomeAction('retry', startWorkout)}
      onStart={routine => runHomeAction('start', async () => {
          const before = controller.getSnapshot(), origin = window.history.state?.overloadNavigation
          if (!canStartFromHome.current || before.busy || before.active || before.attempt || before.routineRefreshes.has(routine.id) || !await flush()) return
          setHomeStartIssue(null)
          await controller.select(routine.id)
          const latest = controller.getSnapshot(), account = authentication.getSnapshot()
          if (latest.scope?.userId !== routine.userId || latest.scope.dataGeneration !== routine.dataGeneration || account.status !== 'authenticated' || account.pending !== null || account.userId !== routine.userId || latest.active || latest.attempt) return
          if (latest.selected?.id !== routine.id || window.history.state?.overloadNavigation !== origin) return
          if (latest.selected.version !== routine.version) { setHomeStartIssue('루틴이 변경됐어요. 다시 확인해 주세요.'); return }
          if (!canStartFromHome.current || latest.routineRefreshes.has(routine.id)) return
          await startWorkout()
      })} /> : state.issue ? <ContentError title="홈을 불러오지 못했어요." action={<RefreshButton loading={state.status === 'loading'} failure={state.issue} onRefresh={() => void controller.refresh()} />} /> : <HomeStartup />)}</div>
    {(!localOnly || preserveDrafts) && <div hidden={!visible || localOnly || focused || workoutLoading || recordFocused || tab !== 'routines'}>
      <WorkspaceView activities={activities} training={training} enabled={accountReady && visit.routines} api={api} key={state.userId + ':' + (state.scope?.dataGeneration ?? 'checking')} state={state} controller={controller} routes={routineRoutes} onStart={startWorkout} openingWorkout={starting} visible={visible && !localOnly && !focused && !workoutLoading && !recordFocused && tab === 'routines'} />
    </div>}

    <div hidden={!visible || focused || workoutLoading || recordFocused || tab !== 'history'}
      data-tab-overview={(!state.scope || session?.status === 'ACTIVE') || undefined}>{retainOnlineViews && !localOnly &&
      (session?.status === 'ACTIVE' ? <StatusNotice>진행 중인 운동을 마치면 기록을 확인할 수 있습니다.</StatusNotice>
        : state.scope ? <StatisticsPanel enabled={accountReady && visit.history} key={'statistics:' + state.scope.userId + ':' + state.scope.dataGeneration} api={statistics} scope={state.scope}
          workoutApi={api} schedule={training.schedule} scheduleLoading={training.loading} scheduleIssue={training.issue} onRetrySchedule={training.refresh}
          definitions={state.data?.exercises} dataRevision={dataRevision} refreshKey={[dataRevision,training.schedule?.appliedVersion].join(':')} onInvalid={controller.invalidateScope} onOpen={id => void openRecord(id)} />
          : state.issue ? <ContentError title="운동 기록을 불러오지 못했어요."
            action={<RefreshButton loading={state.status === 'loading'} failure={state.issue} onRefresh={() => void controller.refresh()} />} />
            : <LoadingSkeleton layout="detail" label="운동 기록을 불러오고 있어요." />)}</div>
    {showDetailWait && <div className={flowStyles.detailWait}><StatusNotice>운동 기록을 확인하는 중입니다.</StatusNotice></div>}
    {workoutLoading && <><RecordSubpageHeader title="운동 진행" onBack={leaveWorkout} backLabel="이전 화면으로" />
      {state.issue && state.scope ? <StatusNotice error>{state.issue} <Button disabled={!accountReady} loading={state.busy} onClick={() => void controller.showDetail(workoutRoute)}>세션 상세 다시 확인</Button></StatusNotice>
        : showWorkoutLoading && <LoadingSkeleton layout="workout" label="운동 정보를 확인하는 중입니다." />}</>}
    {session && session.status === 'ACTIVE' && !editable && <div hidden={!focused}><RecordSubpageHeader title="운동 진행" onBack={leaveWorkout} backLabel="이전 화면으로" /><details open><summary>세션 상태·편집 기기 확인</summary><SessionView session={session} deviceId={state.deviceId} saved={state.copySaved} busy={state.busy} issue={state.issue} manufacturers={state.data?.manufacturers} onRefresh={() => { void (async () => { if (await flush()) await controller.showDetail(session.id) })() }} onTakeover={controller.takeover} /></details></div>}
    {visible && !localSession && workoutPermissionIssue && <StatusNotice>{workoutPermissionIssue}</StatusNotice>}
    {summaryPending && !handoffEditor && <RecordSubpageHeader title="운동 기록 요약" onBack={leaveWorkout} />}
    {showSummaryWait && !handoffEditor && <StatusNotice>운동 기록 요약을 불러오고 있습니다.</StatusNotice>}
    {localSession && <LocalWorkoutScreen key={editorIdentity(localSession)}
      assessmentApi={localOnly ? undefined : api}
      visible={focused || summaryPending} preparingSummary={summaryPending} onHome={leaveWorkout} backLabel={tab === 'routines' ? '루틴' : undefined}
      navigationIssue={workoutNavigationIssue} permissionIssue={workoutPermissionIssue}
      accountIssue={localOnly ? auth.issue?.message : undefined} onReconnect={() => void authentication.restore()}
      onRecheckSession={() => { void (async () => { if (await flush()) await controller.showDetail(localSession.id) })() }}
      history={repHistory?.key === localReferenceKey ? repHistory.sessions : referenceKey && referenceKey === localReferenceKey ? null : []}
      referenceRecords={referenceHistory?.key===localReferenceKey?referenceHistory.references:[]} referenceRoutine={referenceHistory?.key===localReferenceKey?referenceHistory.routine:null}
      server={localSession} policy={state.data!.settings} definitions={localOnly ? [] : sessionDefinitions} manufacturers={localOnly ? [] : state.data!.manufacturers} activities={localOnly ? [] : activities} authorized={authorized} localOnly={localOnly} onExitGuard={registerExit} onReady={admitOffline} onWorkoutChange={setHomeWorkout} onOpened={onEditorOpened}
      sync={{ api, online: () => { const a = authentication.getSnapshot(), s = controller.getSnapshot(); return a.status === 'authenticated' && a.pending === null && a.userId === localSession.userId && s.status === 'ready' && !s.busy }, onServer: controller.observeSession, onInvalid: controller.invalidateScope }} authenticated={!localOnly && auth.pending === null && state.status === 'ready' && !state.busy} />}
    <div hidden={!visible || focused || !recordFocused || summaryPending}>
      {visible && !localOnly && recordId && state.scope && recordCache.key === recordKey && <ClosedWorkout key={[recordKey, recordId].join(':')} api={api} scope={state.scope} recordId={recordId} cache={recordCache.entries}
      session={session?.id === recordId && session.status !== 'ACTIVE' ? session : null}
      accountReady={accountReady} summary={summary} manufacturers={state.data?.manufacturers} definitions={sessionDefinitions} backLabel={recordRoute?.backLabel ?? (tab === 'routines' ? '루틴으로' : tab === 'home' ? '홈으로' : '기록으로')}
      onSettled={handoff ? () => setSettledSummary(summaryIdentity) : detailOpening
        ? () => setRecordOpening(opening => opening === detailOpening ? null : opening) : undefined}
      onBack={backFromRecord} onServer={controller.observeClosedRecord} onRoutineApproved={controller.observeRoutineApproval} onInvalid={error => { if (boundaryError(error)) controller.invalidateScope(error) }} authorized={() => {
      const a = authentication.getSnapshot(), s = controller.getSnapshot()
      return a.status === 'authenticated' && a.pending === null && !a.accountOpen && a.userId === state.scope?.userId
        && s.scope?.dataGeneration === state.scope?.dataGeneration && (window.history.state?.overloadNavigation?.values?.[recordKey]?.id === recordId
          || window.history.state?.overloadNavigation?.values?.['workout-view:' + state.scope?.userId + ':' + state.scope?.dataGeneration] === recordId && s.detail?.id === recordId && s.detail.status === 'FINISHED')
    }} />}</div>
    {settingsDetail}
    {localOnly && !localSession && <button className="outline action-pill" onClick={() => void authentication.restore()}>같은 계정 인증 다시 확인</button>}
    {visible && state.issue && !accountReady && !(state.scope && (workoutLoading || focused && !editable)) && <button type="button" className="outline action-pill" onClick={async () => {
      await authentication.restore()
      // The same authenticated account may still need to retry its failed initial workout read.
      if (!controller.getSnapshot().data) await controller.refresh()
    }}>로그인 상태 다시 확인</button>}</SearchExerciseDetails></CombinationMemoProvider>)
}
