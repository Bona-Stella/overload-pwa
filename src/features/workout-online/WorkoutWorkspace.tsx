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
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/context.ts'
import { PublicCatalog } from './PublicCatalog.tsx'
import { WorkoutApi } from './api.ts'
import { WorkoutOnlineController } from './controller.ts'
import type { OnlineState } from './controller.ts'
import type { CardioActivity, Manufacturer, Routine, Session, StandardExercise } from './types.ts'
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
import { useWorkoutSummaryEntry } from '../workout-flow/useWorkoutSummaryEntry.ts'
import { navigateBack, useScreenHistory } from '../../app/navigation.ts'
import { useRecordDetailHistory } from '../history/useRecordDetailHistory.ts'
import { WeeklyMusclePlan } from '../statistics/MuscleAnalysis.tsx'
import { offlineAccess } from '../workout-local/offline.ts'
import type { LocalWorkout } from '../workout-local/types.ts'
import { StatisticsApi } from '../statistics/api.ts'
import { StatisticsPanel } from '../statistics/StatisticsPanel.tsx'
import type { AppTab } from '../../app/types.ts'
import { Metadata, StatusNotice } from '../../components/ui.tsx'
import { LoadingSkeleton } from '../../components/LoadingSkeleton.tsx'
import { boundaryError, readAccessDenied } from '../home/load.ts'
import { Button } from '../../components/ui.tsx'
import { HomePanel, HomeStartup } from '../home/HomePanel.tsx'
import { useStartupReveal } from '../../app/useStartupReveal.ts'
import { activeWorkoutProgress } from '../home/active-workout.ts'
import { RestSettings } from '../settings/RestSettings.tsx'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'

export function SessionView({ session, deviceId, saved, busy, onRefresh, onTakeover, manufacturers = [] }: { manufacturers?: Manufacturer[]; session: Session; deviceId: string | null; saved: boolean; busy: boolean; onRefresh: () => void; onTakeover?: () => void }) {
  const otherEditor = session.editorDeviceId !== deviceId
  const label = session.status === 'ACTIVE' ? '진행 중' : session.status === 'FINISHED' ? '명시 종료' : '서버 자동 종료'
  return <section className="card stack" aria-labelledby="online-session-title"><div className="section-heading"><h2 id="online-session-title">{session.initialPlan.routineName}</h2><span className="online-session-badge">{label}</span></div>
    <p>{session.workoutDate} · <time dateTime={session.startedAt}>{session.startedAt}</time></p>
    {session.status === 'ACTIVE' && <p className="notice">{otherEditor ? '다른 기기에서 편집 중입니다. 이 화면은 읽기 전용입니다.' : '이 기기의 운동입니다. 아래에서 기록하고 서버 저장 상태를 확인할 수 있습니다.'}</p>}
    {session.status === 'ACTIVE' && otherEditor && onTakeover && <button className="outline full" disabled={busy || !deviceId || !saved} onClick={() => { if (window.confirm('서버에 저장된 기록으로 이 기기에서 편집할까요? 다른 기기의 미전송 기록은 자동으로 합치지 않습니다.')) onTakeover() }}>이 기기로 편집 가져오기</button>}
    {session.status === 'AUTO_CLOSED' && <p className="notice">서버가 마지막 저장 상태로 자동 종료했습니다. 사용자 종료 시각이나 최초 명시 종료 평가를 생성하지 않습니다.</p>}
    {session.deletedAt && <p className="notice">삭제된 운동입니다. 기록을 자동 복원하지 않습니다.</p>}
    <p className="muted small" role="status">{saved ? '서버에서 확인한 세션 사본을 이 기기에 저장했습니다.' : '서버 세션의 로컬 보존을 확인하지 못했습니다. 수행 입력을 시작할 수 없습니다.'}</p>
    <details><summary>시작 당시 계획</summary><div className="stack">{session.initialPlan.weightExercises.map(e => <p key={e.sessionExerciseId}>{e.exerciseName} · {e.setCount}세트 · {e.minReps}~{e.maxReps}회 · 승인 {e.approvedWeightKg} kg · <Metadata>{equipmentLabel(e, manufacturers)}</Metadata></p>)}
      {session.initialPlan.cardioActivities.map(c => <p key={c.sessionActivityId}>{c.plan.name} · 목표 {c.plan.targetSeconds}초</p>)}</div></details>
    <details><summary>서버에서 마지막 확인한 적용 계획·수행</summary><div className="stack">{session.snapshot.state.appliedPlan.weightExercises.map(e => <p key={e.sessionExerciseId}>{session.initialPlan.weightExercises.find(x => x.sessionExerciseId === e.sessionExerciseId)?.exerciseName ?? '추가된 세션 종목'} · {e.setCount}세트 · {e.minReps}~{e.maxReps}회</p>)}
      {session.snapshot.state.appliedPlan.cardioActivities.map(c => <p key={c.sessionActivityId}>{c.plan.name} · 목표 {c.plan.targetSeconds}초</p>)}
      <p>완료 웨이트 {session.snapshot.state.performedSets.length}세트 · 확정 유산소 {session.snapshot.state.cardioResults.length}건</p>
      {session.snapshot.state.performedSets.map(s => <p key={s.id}>{s.ordinal}세트 · {s.weightKg} kg × {s.reps}회 · <Metadata>{equipmentLabel(s, manufacturers)}</Metadata></p>)}</div></details>
    {session.snapshot.approvalResults.some(r => r.status === 'PENDING') && <p className="notice">승인 확인 필요 · 수행 기록의 저장과 중량 승인 적용은 별개입니다.</p>}
    <button type="button" className="outline full" disabled={busy} onClick={onRefresh}>세션 상세 다시 확인</button>
  </section>
}
type RoutineEditorState = { routine: Routine | null; readOnly: boolean }
type ScheduleEditorState = { type: 'assign'; id: string; base: LiveSchedule; priorityId?: string } | { type: 'order'; base: LiveSchedule }
type RenameDraft = { id: string; version: string; base: LiveSchedule; value: string; issue?: string }

export function WorkspaceView({ state, controller, api, training, enabled, activities = [], onEditingChange, onStart }: {
  state: OnlineState; controller: WorkoutOnlineController; api: WorkoutApi; training: TrainingSchedule
  enabled: boolean; activities?: CardioActivity[]; onEditingChange?: (editing: boolean) => void; onStart?: () => void | Promise<void>
}) {
  const { schedule, protection } = training
  const [planPreset, setPlanPreset] = useScreenHistory<string | null>('routine-plan:' + state.scope?.userId + ':' + state.scope?.dataGeneration, null)
  const [editorData, setEditorData] = useState<RoutineEditorState | null>(null)
  const editorKey = 'routine-editor:' + state.scope?.userId + ':' + state.scope?.dataGeneration
  const [editorRoute, setEditorRoute] = useScreenHistory<{ id: string; readOnly: boolean; fromDetail?: boolean } | null>(editorKey, null)
  const [editorIssue, setEditorIssue] = useState<string | null>(null)
  const [editorRetry, setEditorRetry] = useState(0)
  const [startingRoutine, setStartingRoutine] = useState<string | null>(null)
  const startPending = useRef(false)
  const setEditor = (next: RoutineEditorState | null, fromDetail = false) => {
    setEditorData(next)
    if (next) setEditorRoute({ id: next.routine?.id ?? 'new', readOnly: next.readOnly, fromDetail })
    else setEditorRoute(null, true)
  }
  const backFromEditor = () => navigateBack(() => setEditor(null))
  const scheduleKey = 'routine-schedule:' + state.scope?.userId + ':' + state.scope?.dataGeneration
  const [scheduleRoute, setScheduleRoute] = useScreenHistory<{ type: 'assign'; id: string; priorityId?: string } | { type: 'order' } | null>(scheduleKey, null)
  const [scheduleData, setScheduleData] = useState<ScheduleEditorState | null>(null)
  const scheduleEditor = scheduleRoute && (scheduleData?.type === scheduleRoute.type &&
    (scheduleRoute.type === 'order' || scheduleData.type === 'assign' && scheduleData.id === scheduleRoute.id)
    ? scheduleData : schedule && (scheduleRoute.type === 'order' || schedule.presets.some(p => p.id === scheduleRoute.id))
      ? { ...scheduleRoute, base: schedule } : null)
  const setScheduleEditor = (next: ScheduleEditorState, replace = false) => {
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
  const editorRequest = JSON.stringify([editorId, editorVersion, editorRetry])
  const editor = editorRoute && (editorId === 'new' ? { routine: null, readOnly: false }
    : draft ?? (cachedRoutine && editorIssue !== editorRequest ? { routine: cachedRoutine, readOnly } : null))
  const editorRefresh = editor?.readOnly && editor.routine ? state.routineRefreshes?.get(editor.routine.id) : undefined
  const scope = state.scope
  useEffect(() => {
    if (!enabled || !scope || !editorId || editorId === 'new' || editingDraft) return
    const abort = new AbortController()
    void api.routine(scope, editorId, abort.signal).then(routine => {
      if (!abort.signal.aborted) { setEditorData({ routine, readOnly }); setEditorIssue(null) }
    }).catch(error => {
      if (abort.signal.aborted) return
      if (boundaryError(error)) controller.invalidateScope(error)
      if (readAccessDenied(error)) setEditorData(null)
      setEditorIssue(editorRequest)
    })
    return () => abort.abort()
  }, [api, controller, editingDraft, editorId, editorRequest, enabled, readOnly, scope])

  const viewed = schedule?.presets.find(p => p.id === viewedId) ?? schedule?.presets.find(p => p.id === schedule.activeId)
  const busy = state.busy || training.busy
  const managementBlocked = !enabled || busy || !!state.active || !!state.attempt || protection !== null || training.loading
  const scheduleBlocked = managementBlocked || !training.canWrite
  const focused = editorRoute !== null || scheduleRoute !== null
  useEffect(() => { onEditingChange?.(focused); return () => onEditingChange?.(false) }, [focused, onEditingChange])
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
    if (managementBlocked) return
    const origin = window.history.state?.overloadNavigation
    await controller.select(id)
    const current = controller.getSnapshot()
    if (window.history.state?.overloadNavigation !== origin || current.active || current.attempt || current.selected?.id !== id ||
      !window.confirm('이 루틴을 삭제할까요? 모든 주간 일정의 배정이 해제되며 기존 운동 기록은 보존합니다.')) return
    await controller.deleteRoutine()
    training.refresh()
    if (!controller.getSnapshot().selected && editorRoute) backFromEditor()
  }
  const deletingPreset = deleting?.base.presets.find(p => p.id === deleting.id)
  const latestName = renaming && schedule?.presets.find(p => p.id === renaming.id)
  const renameStale = renaming && (renaming.base.version !== schedule?.version || renaming.version !== latestName?.version)
  const showToolbar = !editor || !!training.issue
  return <section className={`stack workout-online ${editor ? detailStyles.workspace : ''}`}
    aria-labelledby={showToolbar ? 'online-title' : undefined} aria-label={showToolbar ? undefined : '루틴'}>
    {showToolbar && <div className="section-heading"><span id="online-title" className="muted small">ROUTINES</span>
      <button type="button" className="quiet" disabled={busy} onClick={() => { training.refresh(); if (!focused) void controller.refresh() }}>다시 조회</button></div>}
    {!state.data && !state.issue && <div aria-busy="true" />}
    {protection && <p className="notice" role="status">{protection === 'ACTIVE' ? '디로딩 진행 중' : '디로딩 완료 당일'} · 일반 루틴과 주간 일정은 조회 전용입니다.</p>}
    {training.issue && <p className="notice error" role="alert">{training.issue}</p>}
    {training.writeIssue && !renaming && <p className="notice error" role="alert">{training.writeIssue}</p>}
    {state.issue && <p className="notice error" role="alert">{state.issue}</p>}{state.notice && <p className="notice" role="status">{state.notice}</p>}
    {state.data && state.scope && <>
      <div hidden={focused || !!planPreset}>
        {created && <RoutineCreatedNotice name={created.name} onLater={() => setCreated(null)} onAssign={() => openSchedule(created.id)} blocked={scheduleBlocked} />}
        <RoutineCards week={viewed} summaries={state.data.routines} details={cards} busy={busy} managementBlocked={managementBlocked}
          onNew={() => { setCreated(null); setEditor({ routine: null, readOnly: false }) }}
          onEdit={id => void openRoutine(id, false)} onSelect={id => void openRoutine(id, true)} onDelete={id => void deleteRoutine(id)}
          presetHeader={schedule && viewed ? viewToggle => <PresetHeader schedule={schedule} viewed={viewed} busy={busy} readOnly={scheduleBlocked} viewToggle={viewToggle}
            onPlan={() => setPlanPreset(viewed.id)}
            onActivate={() => void training.write({ type: 'activate', id: viewed.id })}
            onToggle={() => void training.write({ type: 'rotate', enabled: !schedule.autoEnabled, entries: schedule.presets })}
            onRename={schedule.renameSupported ? () => {
              training.clearWriteIssue()
              setRenaming({ id: viewed.id, version: viewed.version, base: schedule, value: viewed.name })
            } : undefined}
            onOrganize={() => setScheduleEditor({ type: 'order', base: schedule })}
            onDelete={() => setDeleting({ id: viewed.id, base: schedule })} /> : undefined}
          schedule={schedule && <button type="button" className="outline full" disabled={scheduleBlocked} onClick={() => openSchedule()}>주간 일정 편집</button>}
          presetNavigation={schedule && viewed && <PresetNavigation schedule={schedule} viewed={viewed} busy={busy} readOnly={scheduleBlocked}
            onView={setViewedId} onAdd={async () => {
              const saved = await training.write({ type: 'add' })
              const added = saved?.presets.find(p => !schedule.presets.some(old => old.id === p.id))
              if (added) setViewedId(added.id)
            }} />}
          presetAssignments={schedule ? membership : undefined} />
      </div>
      {planPreset && <><button type="button" className="quiet" onClick={() => navigateBack(() => setPlanPreset(null, true))}>‹ 루틴으로</button><WeeklyMusclePlan definitions={state.data.exercises} api={api} scope={state.scope} schedule={schedule} initialPreset={planPreset} refreshKey={previewKey} onInvalid={controller.invalidateScope} /></>}
      {editorRoute && !editor && <RecordSubpageHeader title="루틴" onBack={backFromEditor} />}
      {editorRoute && editorIssue === editorRequest && <StatusNotice error>루틴을 조회하지 못했습니다. <Button onClick={() => setEditorRetry(value => value + 1)}>다시 조회</Button></StatusNotice>}
      {editorRoute && !editor && editorIssue !== editorRequest && <LoadingSkeleton layout="detail" label="루틴 정보를 확인하는 중입니다." />}
      {scheduleRoute && !scheduleEditor && <><RecordSubpageHeader title="주간 일정" onBack={() => navigateBack(closeScheduleEditor)} />{training.loading ? <div aria-busy="true" /> : !training.issue && <StatusNotice>주간 일정을 찾을 수 없어요.</StatusNotice>}</>}
      {scheduleEditor?.type === 'assign' && <PresetAssignmentEditor base={scheduleEditor.base} current={schedule} id={scheduleEditor.id}
        priorityId={scheduleEditor.priorityId} routines={state.data.routines} busy={busy} readOnly={scheduleBlocked}
        initialApply={scheduleEditor.base.appliedVersion === null && scheduleEditor.id === scheduleEditor.base.activeId}
        navigationKey={scheduleKey} onSelect={id => { if (schedule) setScheduleEditor({ ...scheduleEditor, id, base: schedule }, true) }}
        onReload={() => { if (schedule && viewed) setScheduleEditor({ ...scheduleEditor, id: schedule.presets.some(p => p.id === scheduleEditor.id) ? scheduleEditor.id : viewed.id, base: schedule }, true) }}
        onClose={closeScheduleEditor}
        onSave={async assignments => {
          const preset = scheduleEditor.base.presets.find(p => p.id === scheduleEditor.id)!
          if (!await training.write({ type: 'assign', id: preset.id, version: preset.version, assignments }, scheduleEditor.base)) return false
          setViewedId(preset.id)
          return true
        }} />}
      {scheduleEditor?.type === 'order' && <PresetOrderEditor key={scheduleEditor.base.version} schedule={scheduleEditor.base} busy={busy}
        stale={scheduleEditor.base.version !== schedule?.version} readOnly={scheduleBlocked} routineName={routineName}
        navigationKey={scheduleKey} onClose={closeScheduleEditor} onReload={() => { if (schedule) setScheduleEditor({ type: 'order', base: schedule }, true) }}
        onSave={async entries => !!await training.write({ type: 'rotate', enabled: scheduleEditor.base.autoEnabled, entries }, scheduleEditor.base)} />}
      {editor?.readOnly && editor.routine && <RoutineDetail routine={editor.routine} exercises={state.data.exercises} activities={activities} manufacturers={state.data.manufacturers}
        presets={schedule?.presets} scheduleLoading={training.loading} timeZone={schedule?.timeZone ?? undefined} managementBlocked={managementBlocked}
        onBack={backFromEditor} onEdit={() => { if (!managementBlocked) setEditor({ ...editor, readOnly: false }, true) }}
        onDelete={() => { if (editor.routine) void deleteRoutine(editor.routine.id) }}
        start={<>
          {editorRefresh?.failed && <Button onClick={() => controller.retryRoutineRefresh(editor.routine!.id)}>루틴 다시 조회</Button>}
          <Button variant="primary" loading={startingRoutine === editor.routine.id || !!editorRefresh && !editorRefresh.failed}
            disabled={!supportsWorkoutEditing() || managementBlocked || !state.localReady || !!startingRoutine || !!editorRefresh}
            onClick={() => void startRoutine(editor.routine!)}>온라인으로 운동 시작</Button>
        </>} />}
      {editor && !editor.readOnly && <RoutineForm key={editor.routine?.id ?? 'new'} routine={editor.routine} activities={activities}
        onSaved={(id, name) => { if (!editor.routine) setCreated({ id, name }); training.refresh() }}
        generation={state.scope.dataGeneration} exercises={state.data.exercises} manufacturers={state.data.manufacturers}
        busy={busy} controller={controller} onClose={() => setEditor(null)} navigationKey={editorKey} backLabel={editorRoute?.fromDetail ? '루틴 상세로' : undefined} managementBlocked={managementBlocked} />}
    </>}
    {enabled && renaming && <Dialog title="주간 일정 이름 변경" onClose={() => { if (!busy) setRenaming(null) }}>
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
        <label>일정 이름<input name="name" type="text" value={renaming.value} autoComplete="off"
          aria-invalid={!!renaming.issue} aria-describedby={renaming.issue ? 'preset-name-issue' : undefined} disabled={busy}
          onChange={event => setRenaming({ ...renaming, value: event.target.value, issue: undefined })} /></label>
        {(renaming.issue || training.writeIssue || training.issue) &&
          <p id="preset-name-issue" className="notice error" role="alert">{renaming.issue ?? training.writeIssue ?? training.issue}</p>}
        {training.issue && <button type="button" className="outline" disabled={busy || training.loading} onClick={training.refresh}>
          일정 다시 조회
        </button>}
        {renameStale && schedule && (latestName
          ? <><p role="status">현재 저장 이름 · {latestName.name}</p>
            <button type="button" className="outline" disabled={scheduleBlocked} onClick={() => {
              training.clearWriteIssue()
              setRenaming({ ...renaming, base: schedule, version: latestName.version })
            }}>최신 버전 사용</button></>
          : <p role="status">이 일정이 삭제되었거나 더 이상 조회할 수 없습니다.</p>)}
        <div className="row">
          <button type="button" className="outline" disabled={busy} onClick={() => setRenaming(null)}>취소</button>
          <button className="primary" disabled={scheduleBlocked || !!renameStale}>{busy ? '저장 중…' : '저장'}</button>
        </div>
      </form>
    </Dialog>}
    {enabled && deleting && deletingPreset && <Dialog title="주간 일정 삭제" onClose={() => { if (!busy) setDeleting(null) }}>
      <p>“{deletingPreset.name}” 일정을 삭제할까요? 이 일정에 저장된 요일 배정이 사라집니다.</p>
      {training.writeIssue && <p role="alert">{training.writeIssue}</p>}
      <div className="row"><button type="button" disabled={busy} onClick={() => setDeleting(null)}>취소</button>
        <button type="button" className="danger" disabled={scheduleBlocked || deleting.base.version !== schedule?.version}
          onClick={async () => { if (await training.write({ type: 'delete', id: deleting.id }, deleting.base)) setDeleting(null) }}>일정 삭제</button></div>
    </Dialog>}
  </section>
}
export function WorkoutWorkspace({ onExitGuard, tab = 'home', onNavigate, onFocusChange, catalogOpen = false, restOpen = false, onSettingsBack, onRestExitGuard }: {
  onExitGuard?: ExitGuardRegistration; tab?: AppTab; onNavigate?: (tab: AppTab, replace?: boolean, children?: Record<string, unknown>) => Promise<boolean>; onFocusChange?: (focused: boolean) => void
  catalogOpen?: boolean; restOpen?: boolean; onSettingsBack?: (canLeave?: () => boolean) => void
  onRestExitGuard?: (guard: (() => boolean) | null) => void
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
  const [permissionIssue, setPermissionIssue] = useState(false)
  const [workoutRoute, setWorkoutRoute] = useScreenHistory<string | null>('workout-view:' + state.scope?.userId + ':' + state.scope?.dataGeneration, null)
  const [editingRoutine, setEditingRoutine] = useState(false)
  const [navigationIssue, setNavigationIssue] = useState(false)
  const [homeStartIssue, setHomeStartIssue] = useState<string | null>(null)
  const [homeAction, setHomeAction] = useState<'start' | 'retry' | 'resume' | null>(null)
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
  const { route: recordRoute, open: openRecordRoute, back: backFromRecord } = useRecordDetailHistory(recordKey, tab)
  const [,setRecordsScreen]=useScreenHistory('records:'+(state.scope?.userId??'')+':'+(state.scope?.dataGeneration??''),'summary')
  const recordId = !workoutRoute && (tab === 'home' || tab === 'history') ? recordRoute?.id : undefined
  const { markSummaryEntry, takeInitialScroll } = useWorkoutSummaryEntry(recordId)
  const recordFocused = !!recordId
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
  const [referenceHistory, setReferenceHistory] = useState<{ key: string; sessions: Session[]; references:ReferenceRecord[]; routine:Routine|null } | null>(null)
  const referenceUser = accountReady && session?.status === 'ACTIVE' ? session.userId : null
  const referenceGeneration = referenceUser ? session!.dataGeneration : null
  const referenceId = referenceUser ? session!.id : null
  const referenceRoutineId = referenceUser ? session!.initialPlan.routineId : null
  const referenceKey = referenceUser ? [referenceUser, referenceGeneration, referenceId].join(':') : null
  useEffect(() => {
    if (!referenceUser || !referenceGeneration || !referenceKey || !referenceRoutineId) return
    const abort = new AbortController(), scope = { userId: referenceUser, dataGeneration: referenceGeneration }
    void (async()=>{
      const routine=await api.routine(scope,referenceRoutineId,abort.signal)
      const references:ReferenceRecord[]=[], sessions:Session[]=[]
      let cursor:Parameters<WorkoutApi['closed']>[1]=null
      do {
        const page=await api.closed(scope,cursor,abort.signal),rows=page.sessions.filter(s=>!s.deletedAt&&s.status==='FINISHED')
        let at=0
        await Promise.all(Array.from({length:Math.min(4,rows.length)},async()=>{
          while(at<rows.length&&!abort.signal.aborted){const id=rows[at++].id,record=await api.detail(scope,id,abort.signal)
            sessions.push(record)
            if(record.initialPlan.routineId===routine.id)references.push({session:record,assessment:await api.assessment(scope,id,abort.signal)})
          }
        }))
        cursor=page.next
      }while(cursor&&!abort.signal.aborted)
      if(!abort.signal.aborted)setReferenceHistory({key:referenceKey,sessions,references,routine})
    })().catch(error=>{if(!abort.signal.aborted){setReferenceHistory({key:referenceKey,sessions:[],references:[],routine:null});controller.invalidateScope(error)}})
    return () => abort.abort()
  }, [api, controller, referenceUser, referenceGeneration, referenceKey, referenceRoutineId])
  const focused = visible && !!session && session.status === 'ACTIVE' && (localOnly || workoutRoute === session.id)
  const workoutLoading = !!workoutRoute && workoutRoute !== session?.id && !state.issue
  useStartupReveal(auth.status === 'authenticated' && tab === 'home' && (
    visible && (focused || workoutLoading || recordFocused) || state.userId === auth.userId && !!state.issue && !state.data
  ))
  const lastFocused = useRef<string | null>(null)
  useEffect(() => {
    if (focused && session?.status === 'ACTIVE') lastFocused.current = session.id
    else if (session?.status === 'FINISHED' && workoutRoute === session.id && lastFocused.current === session.id) {
      lastFocused.current = null
      markSummaryEntry(session.id)
      void onNavigate?.('history', true, { [recordKey]: { id: session.id, summary: true, backLabel: tab === 'routines' ? '루틴으로' : '홈으로' } })
    }
  }, [focused, session, workoutRoute, onNavigate, recordKey, tab, markSummaryEntry])
  useEffect(() => {
    onFocusChange?.(visible && (focused || workoutLoading || recordFocused || tab === 'routines' && editingRoutine))
    return () => onFocusChange?.(false)
  }, [visible, focused, workoutLoading, tab, editingRoutine, recordFocused, onFocusChange])
  const settingsDetail = onSettingsBack && <>{restOpen && <RestSettings key={state.userId + ':' + state.scope?.dataGeneration}
    settings={state.userId === auth.userId && !state.revalidatingScope ? state.data?.settings : undefined} hidden={auth.status !== 'authenticated'} busy={!accountReady || state.busy} loadIssue={state.issue}
    onBack={onSettingsBack} onRequest={controller.requestRestSettings} onExitGuard={onRestExitGuard} />}
    {(catalogOpen || cardioKey && catalogScope === cardioKey) && <PublicCatalog key={cardioKey} api={api} userId={cardioScope?.userId ?? null}
      active={!localOnly && !focused && tab === 'settings' && catalogOpen} enabled={accountReady} onInvalid={controller.invalidateScope} onBack={onSettingsBack} />}</>
  if (!retainOnlineViews && !preserveDrafts) return auth.status === 'authenticated' && auth.pending === null && !auth.accountOpen && tab === 'home'
    ? <HomeStartup /> : settingsDetail
  const editable = session && session.status === 'ACTIVE' && !session.deletedAt && session.editorDeviceId === state.deviceId && state.copySaved && state.data
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
    const entry = window.history.state?.overloadNavigation
    const returnScroll = window.scrollY
    if (!accountReady || !await flush()) return
    if (window.history.state?.overloadNavigation === entry) openRecordRoute(id, returnScroll)
  }
  const resume = async () => {
    const origin = window.history.state?.overloadNavigation
    const id = state.active?.id
    if (!id || !await flush() || window.history.state?.overloadNavigation !== origin) return
    if (state.detail?.id !== id) await controller.showDetail(id)
    const latest = controller.getSnapshot()
    if (window.history.state?.overloadNavigation === origin && latest.detail?.id === id && latest.detail.status === 'ACTIVE') {
      setWorkoutRoute(id)
      window.scrollTo(0, 0)
    }
  }
  const startWorkout = async () => {
    const origin = window.history.state?.overloadNavigation
    await controller.start()
    const latest = controller.getSnapshot()
    if (window.history.state?.overloadNavigation === origin && latest.detail?.status === 'ACTIVE' && latest.copySaved) {
      setWorkoutRoute(latest.detail.id)
      window.scrollTo(0, 0)
    }
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
  return <CombinationMemoProvider key={state.scope?.userId + ':' + state.scope?.dataGeneration}><SearchExerciseDetails api={api} userId={state.scope?.userId}>
    {state.revalidatingScope && state.issue && <StatusNotice error>{state.issue} <Button onClick={() => void controller.refresh(true)}>다시 조회</Button></StatusNotice>}
    {visible && navigationIssue && <StatusNotice error>입력 초안을 저장하지 못해 화면 이동을 보류했습니다. 운동 원본과 입력을 유지합니다.</StatusNotice>}
    <div hidden={!visible || focused || workoutLoading || recordFocused || tab !== 'home'}>{retainOnlineViews && !localOnly && (state.scope && state.data ? <HomePanel
      key={'home:' + state.scope.userId + ':' + state.scope.dataGeneration} scope={state.scope} routines={state.data.routines} api={api} training={training} statistics={statistics} visit={visit.home}
      enabled={accountReady} startupHome={visible && tab === 'home' && !focused && !workoutLoading && !recordFocused}
      refreshKey={dataRevision} active={state.active} progress={state.active ? activeWorkoutProgress(state.active, homeWorkout, state.data.exercises) : undefined}
      onRefreshRoutines={() => void controller.refresh()}
      routineRefreshes={state.routineRefreshes} onRetryRoutineRefresh={controller.retryRoutineRefresh}
      attempt={state.attempt !== null} busy={state.busy} localReady={state.localReady} action={homeAction}
      issue={homeStartIssue ?? state.issue} onInvalid={controller.invalidateScope} onHistory={()=>{void navigate('history').then(ok=>{if(ok)setRecordsScreen('history',true)})}} onNavigate={next => void navigate(next)} onOpen={id => void openRecord(id)} onResume={() => void runHomeAction('resume', resume)} onRetry={() => void runHomeAction('retry', startWorkout)}
      onStart={routine => runHomeAction('start', async () => {
          const before = controller.getSnapshot(), origin = window.history.state?.overloadNavigation
          if (!training.canWrite || before.busy || before.active || before.attempt || !await flush()) return
          setHomeStartIssue(null)
          await controller.select(routine.id)
          const latest = controller.getSnapshot(), account = authentication.getSnapshot()
          if (latest.scope?.userId !== routine.userId || latest.scope.dataGeneration !== routine.dataGeneration || account.status !== 'authenticated' || account.pending !== null || account.userId !== routine.userId || latest.active || latest.attempt) return
          if (latest.selected?.id !== routine.id || window.history.state?.overloadNavigation !== origin) return
          if (latest.selected.version !== routine.version) { setHomeStartIssue('루틴이 변경되었습니다. 홈을 새로고침하여 최신 계획을 확인한 뒤 시작하세요.'); return }
          await startWorkout()
      })} /> : state.issue ? <StatusNotice error>{state.issue}</StatusNotice> : <HomeStartup />)}</div>
    {(!localOnly || preserveDrafts) && <div hidden={!visible || localOnly || focused || workoutLoading || tab !== 'routines'}>
      <WorkspaceView activities={activities} training={training} enabled={accountReady && visit.routines} api={api} key={state.userId + ':' + (state.scope?.dataGeneration ?? 'checking')} state={state} controller={controller} onEditingChange={setEditingRoutine} onStart={startWorkout} />
    </div>}

    <div hidden={!visible || focused || workoutLoading || recordFocused || tab !== 'history'}>{retainOnlineViews && !localOnly &&
      (session?.status === 'ACTIVE' ? <StatusNotice>진행 중인 운동을 마치면 기록을 확인할 수 있습니다.</StatusNotice>
        : state.scope ? <StatisticsPanel enabled={accountReady && visit.history} key={'statistics:' + state.scope.userId + ':' + state.scope.dataGeneration} api={statistics} scope={state.scope}
          workoutApi={api} schedule={training.schedule} definitions={state.data?.exercises} dataRevision={dataRevision} refreshKey={[dataRevision,training.schedule?.appliedVersion].join(':')} onInvalid={controller.invalidateScope} onOpen={id => void openRecord(id)} />
          : state.issue ? <StatusNotice error>{state.issue}</StatusNotice> : <section aria-label="운동 기록·분석" aria-busy="true" />)}</div>
    {workoutLoading && <><RecordSubpageHeader title="운동 진행" onBack={leaveWorkout} backLabel="이전 화면으로" /><LoadingSkeleton layout="workout" label="운동 정보를 확인하는 중입니다." /></>}
    {session && session.status === 'ACTIVE' && !editable && <div hidden={!focused}><RecordSubpageHeader title="운동 진행" onBack={leaveWorkout} backLabel="이전 화면으로" /><details open><summary>세션 상태·편집 기기 확인</summary><SessionView session={session} deviceId={state.deviceId} saved={state.copySaved} busy={state.busy} manufacturers={state.data?.manufacturers} onRefresh={() => { void (async () => { if (await flush()) await controller.showDetail(session.id) })() }} onTakeover={() => void controller.takeover()} /></details></div>}
    {visible && permissionIssue && <p className="notice" role="status">오프라인 재실행 허용을 저장하지 못했습니다. 운동 원본은 유지됩니다. 저장소 설정을 확인해 주세요.</p>}
    {editable && <LocalWorkoutScreen key={[session.userId, session.dataGeneration, session.id, session.editorDeviceId, session.writerEpoch].join(':')}
      assessmentApi={localOnly ? undefined : api}
      visible={focused} onHome={leaveWorkout} backLabel={tab === 'routines' ? '루틴' : undefined}
      history={referenceHistory?.key === referenceKey ? referenceHistory.sessions : []}
      referenceRecords={referenceHistory?.key===referenceKey?referenceHistory.references:[]} referenceRoutine={referenceHistory?.key===referenceKey?referenceHistory.routine:null}
      server={session} policy={state.data!.settings} definitions={localOnly ? [] : sessionDefinitions} manufacturers={localOnly ? [] : state.data!.manufacturers} activities={localOnly ? [] : activities} authorized={authorized} localOnly={localOnly} onExitGuard={registerExit} onReady={admitOffline} onWorkoutChange={setHomeWorkout}
      sync={{ api, online: () => { const a = authentication.getSnapshot(), s = controller.getSnapshot(); return a.status === 'authenticated' && a.pending === null && a.userId === session.userId && s.status === 'ready' && !s.busy }, onServer: controller.observeSession, onInvalid: controller.invalidateScope }} authenticated={!localOnly && auth.pending === null && state.status === 'ready' && !state.busy} />}
    <div hidden={!visible || focused || !recordFocused}>
      {visible && !localOnly && recordId && state.scope && recordCache.key === recordKey && <ClosedWorkout key={[recordKey, recordId].join(':')} api={api} scope={state.scope} recordId={recordId} cache={recordCache.entries}
      session={session?.id === recordId && session.status !== 'ACTIVE' ? session : null}
      accountReady={accountReady} summary={recordRoute?.summary === true} takeInitialScroll={takeInitialScroll} manufacturers={state.data?.manufacturers} definitions={sessionDefinitions} backLabel={recordRoute?.backLabel ?? (tab === 'home' ? '홈으로' : '기록으로')}
      onBack={backFromRecord} onServer={controller.observeClosedRecord} onRoutineApproved={controller.observeRoutineApproval} onInvalid={error => { if (boundaryError(error)) controller.invalidateScope(error) }} authorized={() => {
      const a = authentication.getSnapshot(), s = controller.getSnapshot()
      return a.status === 'authenticated' && a.pending === null && !a.accountOpen && a.userId === state.scope?.userId
        && s.scope?.dataGeneration === state.scope?.dataGeneration && window.history.state?.overloadNavigation?.values?.[recordKey]?.id === recordId
    }} />}</div>
    {settingsDetail}
    {localOnly && <button className="outline" onClick={() => void authentication.restore()}>같은 계정 인증 다시 확인</button>}
    {visible && state.issue && <button type="button" className="outline" onClick={async () => {
      await authentication.restore()
      // The same authenticated account may still need to retry its failed initial workout read.
      if (!controller.getSnapshot().data) await controller.refresh()
    }}>로그인 상태 다시 확인</button>}</SearchExerciseDetails></CombinationMemoProvider>
}
