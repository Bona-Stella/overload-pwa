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
import type { ExitGuardRegistration } from '../workout-local/types.ts'
import './online.css'
import { ClosedWorkout } from './ClosedWorkout.tsx'
import { useScreenHistory } from '../../app/navigation.ts'
import { WeeklyMusclePlan } from '../statistics/MuscleAnalysis.tsx'
import { offlineAccess } from '../workout-local/offline.ts'
import type { LocalWorkout } from '../workout-local/types.ts'
import { StatisticsApi } from '../statistics/api.ts'
import { StatisticsPanel } from '../statistics/StatisticsPanel.tsx'
import type { AppTab } from '../../app/types.ts'
import { Metadata, StatusNotice } from '../../components/ui.tsx'
import { boundaryError } from '../home/load.ts'
import { HomePanel } from '../home/HomePanel.tsx'
import { RestSettings } from '../settings/RestTimeCard.tsx'

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

export function WorkspaceView({ state, controller, api, training, enabled, activities = [], onEditingChange }: {
  state: OnlineState; controller: WorkoutOnlineController; api: WorkoutApi; training: TrainingSchedule
  enabled: boolean; activities?: CardioActivity[]; onEditingChange?: (editing: boolean) => void
}) {
  const { schedule, protection } = training
  const [planPreset, setPlanPreset] = useScreenHistory<string | null>('routine-plan:' + state.scope?.userId + ':' + state.scope?.dataGeneration, null)
  const [editorData, setEditorData] = useState<RoutineEditorState | null>(null)
  const [editorRoute, setEditorRoute] = useScreenHistory<{ id:string; readOnly:boolean } | null>('routine-editor:' + state.scope?.userId + ':' + state.scope?.dataGeneration, null)
  const editor = editorData && editorRoute?.id === (editorData.routine?.id ?? 'new') && editorRoute.readOnly === editorData.readOnly ? editorData : null
  const setEditor = (next: RoutineEditorState | null) => {
    setEditorData(next)
    if (next) setEditorRoute({ id:next.routine?.id ?? 'new', readOnly:next.readOnly })
    else setEditorRoute(null, true)
  }
  useEffect(() => {
    if (!enabled || !editorRoute || editorData && editorRoute.id === (editorData.routine?.id ?? 'new') && editorRoute.readOnly === editorData.readOnly) return
    let cancelled = false
    void Promise.resolve().then(async () => {
      if (cancelled) return
      if (editorRoute.id === 'new') { setEditorData({ routine:null,readOnly:false }); return }
      await controller.select(editorRoute.id)
      const routine = controller.getSnapshot().selected
      if (!cancelled && routine?.id === editorRoute.id) setEditorData({ routine,readOnly:editorRoute.readOnly })
    })
    return () => { cancelled = true }
  }, [enabled, editorRoute, editorData, controller])
  const [scheduleEditor, setScheduleEditor] = useState<ScheduleEditorState | null>(null)
  const [viewedId, setViewedId] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState<{ id: string; base: LiveSchedule } | null>(null)
  const [renaming, setRenaming] = useState<RenameDraft | null>(null)
  const renameInput = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<{ key: string; values: Map<string, Routine> } | null>(null)
  const previewKey = JSON.stringify([state.scope, state.data?.routines])
  useEffect(() => {
    if (!enabled || !state.scope || !state.data) return
    const abort = new AbortController(), scope = state.scope, list = state.data.routines
    const values = new Map<string, Routine>()
    let index = 0
    void Promise.all(Array.from({ length: Math.min(4, list.length) }, async () => {
      while (index < list.length && !abort.signal.aborted) {
        const routine = list[index++]
        try { values.set(routine.id, await api.routine(scope, routine.id, abort.signal)) }
        catch (error) { if (!abort.signal.aborted && boundaryError(error)) controller.invalidateScope(error) }
      }
    })).then(() => { if (!abort.signal.aborted) setPreviews({ key: previewKey, values }) })
    return () => abort.abort()
  }, [api, previewKey, state.scope, state.data, controller, enabled])
  const cards = new Map(previews?.key === previewKey ? previews.values : [])
  if (state.selected && state.data?.routines.some(r => r.id === state.selected?.id && r.version === state.selected.version)) cards.set(state.selected.id, state.selected)

  const viewed = schedule?.presets.find(p => p.id === viewedId) ?? schedule?.presets.find(p => p.id === schedule.activeId)
  const busy = state.busy || training.busy
  const managementBlocked = !enabled || busy || !!state.active || !!state.attempt || protection !== null || training.loading
  const scheduleBlocked = managementBlocked || !training.canWrite
  const focused = editor !== null || scheduleEditor !== null
  useEffect(() => { onEditingChange?.(focused); return () => onEditingChange?.(false) }, [focused, onEditingChange])
  useEffect(() => { if (focused && enabled) window.scrollTo(0, 0) }, [focused, enabled])
  const membership = (id: string) => schedule && <PresetMembership presets={schedule.presets} routineId={id} />
  const routineName = (id: string) => state.data?.routines.find(r => r.id === id)?.name ?? '루틴 확인 필요'
  function openSchedule(priorityId?: string) {
    if (!schedule || !viewed || scheduleBlocked) return
    setCreated(null)
    setScheduleEditor({ type: 'assign', id: viewed.id, base: schedule, priorityId })
  }
  async function openRoutine(id: string, readOnly: boolean) {
    if (!readOnly && managementBlocked) return
    await controller.select(id)
    const selected = controller.getSnapshot().selected
    if (selected?.id === id) setEditor({ routine: selected, readOnly })
  }
  async function deleteRoutine(id: string) {
    if (managementBlocked) return
    await controller.select(id)
    const current = controller.getSnapshot()
    if (current.active || current.attempt || current.selected?.id !== id ||
      !window.confirm('이 루틴을 삭제할까요? 모든 주간 일정의 배정이 해제되며 기존 운동 기록은 보존합니다.')) return
    await controller.deleteRoutine()
    training.refresh()
    if (!controller.getSnapshot().selected) setEditor(null)
  }
  const deletingPreset = deleting?.base.presets.find(p => p.id === deleting.id)
  const latestName = renaming && schedule?.presets.find(p => p.id === renaming.id)
  const renameStale = renaming && (renaming.base.version !== schedule?.version || renaming.version !== latestName?.version)
  const showToolbar = !editor?.readOnly || !!training.issue
  return <section className={`stack workout-online ${editor?.readOnly ? detailStyles.workspace : ''}`}
    aria-labelledby={showToolbar ? 'online-title' : undefined} aria-label={showToolbar ? undefined : '루틴'}>
    {showToolbar && <div className="section-heading"><span id="online-title" className="muted small">ROUTINES</span>
      <button type="button" className="quiet" disabled={busy} onClick={() => { training.refresh(); if (!focused) void controller.refresh() }}>다시 조회</button></div>}
    {state.status === 'loading' && <p role="status">현재 계정의 운동 정보를 확인하고 있습니다.</p>}
    {training.loading && <p role="status">주간 일정과 디로딩 상태를 확인하고 있습니다.</p>}
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
      {planPreset && <><button type="button" className="quiet" onClick={() => window.history.back()}>‹ 루틴으로</button><WeeklyMusclePlan definitions={state.data.exercises} api={api} scope={state.scope} schedule={schedule} initialPreset={planPreset} refreshKey={previewKey} onInvalid={controller.invalidateScope} /></>}
      {scheduleEditor?.type === 'assign' && <PresetAssignmentEditor base={scheduleEditor.base} current={schedule} id={scheduleEditor.id}
        priorityId={scheduleEditor.priorityId} routines={state.data.routines} busy={busy} readOnly={scheduleBlocked}
        initialApply={scheduleEditor.base.appliedVersion === null && scheduleEditor.id === scheduleEditor.base.activeId}
        onSelect={id => { if (schedule) setScheduleEditor({ ...scheduleEditor, id, base: schedule }) }}
        onReload={() => { if (schedule && viewed) setScheduleEditor({ ...scheduleEditor, id: schedule.presets.some(p => p.id === scheduleEditor.id) ? scheduleEditor.id : viewed.id, base: schedule }) }}
        onClose={() => setScheduleEditor(null)}
        onSave={async assignments => {
          const preset = scheduleEditor.base.presets.find(p => p.id === scheduleEditor.id)!
          if (await training.write({ type: 'assign', id: preset.id, version: preset.version, assignments }, scheduleEditor.base)) {
            setViewedId(preset.id)
            setScheduleEditor(null)
          }
        }} />}
      {scheduleEditor?.type === 'order' && <PresetOrderEditor key={scheduleEditor.base.version} schedule={scheduleEditor.base} busy={busy}
        stale={scheduleEditor.base.version !== schedule?.version} readOnly={scheduleBlocked} routineName={routineName}
        onClose={() => setScheduleEditor(null)} onReload={() => { if (schedule) setScheduleEditor({ type: 'order', base: schedule }) }}
        onSave={async entries => {
          if (await training.write({ type: 'rotate', enabled: scheduleEditor.base.autoEnabled, entries }, scheduleEditor.base)) setScheduleEditor(null)
        }} />}
      {editor?.readOnly && editor.routine && <RoutineDetail routine={editor.routine} exercises={state.data.exercises} activities={activities} manufacturers={state.data.manufacturers}
        presets={schedule?.presets} scheduleLoading={training.loading} timeZone={schedule?.timeZone ?? undefined} managementBlocked={managementBlocked}
        onBack={() => setEditor(null)} onEdit={() => { if (!managementBlocked) setEditor({ ...editor, readOnly: false }) }}
        onDelete={() => { if (editor.routine) void deleteRoutine(editor.routine.id) }}
        start={<button type="button" className="primary" disabled={managementBlocked || !state.localReady} onClick={() => void controller.start()}>온라인으로 운동 시작</button>} />}
      {editor && !editor.readOnly && <RoutineForm key={editor.routine?.id ?? 'new'} routine={editor.routine} activities={activities}
        onSaved={(id, name) => { if (!editor.routine) setCreated({ id, name }); training.refresh() }}
        generation={state.scope.dataGeneration} exercises={state.data.exercises} manufacturers={state.data.manufacturers}
        busy={busy} controller={controller} onClose={() => setEditor(null)} managementBlocked={managementBlocked} />}
    </>}
    {enabled && renaming && <Dialog title="주간 일정 이름 변경" initialFocus={renameInput} onClose={() => { if (!busy) setRenaming(null) }}>
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
        <label>일정 이름<input ref={renameInput} name="name" type="text" value={renaming.value} autoComplete="off"
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
export function WorkoutWorkspace({ onExitGuard, tab = 'home', onNavigate, onFocusChange, catalogOpen = false, restOpen = false, onSettingsBack }: {
  onExitGuard?: ExitGuardRegistration; tab?: AppTab; onNavigate?: (tab: AppTab) => Promise<boolean>; onFocusChange?: (focused: boolean) => void
  catalogOpen?: boolean; restOpen?: boolean; onSettingsBack?: () => void
} = {}) {
  const { state: auth, controller: authentication } = useAuth()
  const [api] = useState(() => new WorkoutApi(authentication))
  const [statistics] = useState(() => new StatisticsApi(authentication))
  const [controller] = useState(() => new WorkoutOnlineController(api, undefined, () => authentication.invalidateLocalWorkoutAccess()))
  const exitGuard = useRef<(() => Promise<boolean>) | null>(null)
  const registerExit = useCallback<ExitGuardRegistration>(guard => { exitGuard.current = guard; onExitGuard?.(guard) }, [onExitGuard])
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  const accountReady = auth.status === 'authenticated' && auth.pending === null && state.scope?.userId === auth.userId && !auth.accountOpen
  const cardioScope = accountReady ? state.scope : null
  const [cardioChoices, setCardioChoices] = useState<{ key: string; values: CardioActivity[] } | null>(null)
  const cardioKey = cardioScope ? cardioScope.userId + ':' + cardioScope.dataGeneration : null
  const activities = cardioKey && cardioChoices?.key === cardioKey ? cardioChoices.values : []
  useEffect(() => {
    if (!cardioScope || !cardioKey) return
    const abort = new AbortController()
    void api.cardioActivities(cardioScope.userId, abort.signal).then(values => {
      if (!abort.signal.aborted) setCardioChoices({ key: cardioKey, values })
    }).catch(error => { if (!abort.signal.aborted) controller.invalidateScope(error) })
    return () => abort.abort()
  }, [api, cardioScope, cardioKey, controller])
  const [visit, setVisit] = useState({ tab, count: 0 })
  if (visit.tab !== tab) setVisit({ tab, count: visit.count + 1 })
  const scheduleRevision = [visit.count, state.detail?.id, state.detail?.version,
    state.data?.routines.map(r => r.id + ':' + r.version).join(',')].join('|')
  const training = useTrainingSchedule(authentication, accountReady ? state.scope : null, scheduleRevision, controller.invalidateScope)
  const [permissionIssue, setPermissionIssue] = useState(false)
  const [dismissedWorkout, setDismissedWorkout] = useState<string | null>(null)
  const [editingRoutine, setEditingRoutine] = useState(false)
  const [navigationIssue, setNavigationIssue] = useState(false)
  const [homeStartIssue, setHomeStartIssue] = useState<string | null>(null)
  const homeStarting = useRef(false)
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
  const visible = (localOnly || auth.status === 'authenticated' && auth.pending !== 'logout' && state.userId === auth.userId) && !auth.accountOpen
  const preserveDrafts = auth.offlineNetworkFailure && !!state.scope && state.scope.userId === auth.localWorkoutUserId
  const session = state.detail
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
  const [recordRoute, setRecordRoute] = useScreenHistory<string | null>('record-detail:' + state.scope?.userId + ':' + state.scope?.dataGeneration, null)
  const [summaryRecord, setSummaryRecord] = useState<string | null>(null)
  const [,setRecordsScreen]=useScreenHistory('records:'+(state.scope?.userId??'')+':'+(state.scope?.dataGeneration??''),'summary')
  const recordIdentity = session && session.status !== 'ACTIVE' ? [session.userId, session.dataGeneration, session.id].join(':') : null
  const recordFocused = !!recordIdentity && recordRoute === session?.id
  useEffect(() => {
    if (recordRoute && tab === 'history' && accountReady && state.scope && !state.active && state.detail?.status !== 'ACTIVE' && state.detail?.id !== recordRoute) void controller.showDetail(recordRoute)
  }, [recordRoute, tab, accountReady, state.scope, state.active, state.detail?.status, state.detail?.id, controller])
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
  const identity = session ? [session.userId, session.dataGeneration, session.id, session.editorDeviceId, session.writerEpoch].join(':') : null
  const focused = visible && !!session && session.status === 'ACTIVE' && (localOnly || dismissedWorkout !== identity)
  const lastFocused = useRef<string | null>(null)
  useEffect(() => {
    if (focused && session?.status === 'ACTIVE') lastFocused.current = session.id
    else if (session?.status === 'FINISHED' && lastFocused.current === session.id) {
      lastFocused.current = null
      const finished = session
      void (async () => {
        if (onNavigate && !await onNavigate('history')) return
        const latest = controller.getSnapshot()
        if (latest.scope?.userId === finished.userId && latest.scope.dataGeneration === finished.dataGeneration && latest.detail?.id === finished.id) setRecordRoute(finished.id, true)
      })()
    }
  }, [focused, session, onNavigate, controller, setRecordRoute])
  useEffect(() => {
    onFocusChange?.(visible && (focused || tab === 'history' && recordFocused || tab === 'routines' && editingRoutine))
    return () => onFocusChange?.(false)
  }, [visible, focused, tab, editingRoutine, recordFocused, onFocusChange])
  const settingsDetail = !localOnly && !focused && tab === 'settings' && onSettingsBack
    ? catalogOpen ? <PublicCatalog key={cardioKey} api={api} userId={cardioScope?.userId ?? null} onInvalid={controller.invalidateScope} onBack={onSettingsBack} />
      : restOpen ? <RestSettings settings={accountReady ? state.data?.settings : undefined} onBack={onSettingsBack} /> : null
    : null
  if (!visible && !preserveDrafts) return settingsDetail
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
    if (await navigate('history')) { setSummaryRecord(null); await controller.showDetail(id); if (controller.getSnapshot().detail?.id === id) setRecordRoute(id); window.scrollTo(0, 0) }
  }
  const resume = async () => {
    if (!state.active || !await flush()) return
    if (state.detail?.id !== state.active.id) await controller.showDetail(state.active.id)
    setDismissedWorkout(null)
  }
  const authorized = () => {
    const a = authentication.getSnapshot(), s = controller.getSnapshot()
    return a.pending !== 'logout' && !!session && s.scope?.dataGeneration === session.dataGeneration && s.detail?.id === session.id
      && s.detail.writerEpoch === session.writerEpoch && s.detail.editorDeviceId === session.editorDeviceId && s.detail.status === 'ACTIVE'
      && (a.status === 'authenticated' && a.userId === session.userId || a.localWorkoutUserId === session.userId)
  }
  return <CombinationMemoProvider key={state.scope?.userId + ':' + state.scope?.dataGeneration}><SearchExerciseDetails api={api} userId={state.scope?.userId}>
    {visible && navigationIssue && <StatusNotice error>입력 초안을 저장하지 못해 화면 이동을 보류했습니다. 운동 원본과 입력을 유지합니다.</StatusNotice>}
    <div hidden={!visible || focused || tab !== 'home'}>{visible && !localOnly && (state.status === 'ready' && state.scope && state.data ? <HomePanel
      key={'home:' + state.scope.userId + ':' + state.scope.dataGeneration} scope={state.scope} routines={state.data.routines} api={api} training={training} statistics={statistics} visit={visit.count}
      refreshKey={scheduleRevision} active={state.active} attempt={state.attempt !== null} busy={state.busy} localReady={state.localReady}
      issue={homeStartIssue ?? state.issue} onInvalid={controller.invalidateScope} onHistory={()=>{void navigate('history').then(ok=>{if(ok)setRecordsScreen('history',true)})}} onNavigate={next => void navigate(next)} onOpen={id => void openRecord(id)} onResume={() => void resume()} onRetry={() => void controller.start()}
      onStart={async routine => {
        if (homeStarting.current) return
        homeStarting.current = true
        try {
          const before = controller.getSnapshot()
          if (!training.canWrite || before.busy || before.active || before.attempt || !await flush()) return
          setHomeStartIssue(null)
          await controller.select(routine.id)
          const latest = controller.getSnapshot(), account = authentication.getSnapshot()
          if (latest.scope?.userId !== routine.userId || latest.scope.dataGeneration !== routine.dataGeneration || account.status !== 'authenticated' || account.pending !== null || account.userId !== routine.userId || latest.active || latest.attempt) return
          if (latest.selected?.id !== routine.id) return
          if (latest.selected.version !== routine.version) { setHomeStartIssue('루틴이 변경되었습니다. 홈을 새로고침하여 최신 계획을 확인한 뒤 시작하세요.'); return }
          await controller.start()
        } finally { homeStarting.current = false }
      }} /> : <StatusNotice error={!!state.issue}>{state.issue ?? '현재 계정의 운동 정보를 확인하고 있습니다.'}</StatusNotice>)}</div>
    {(!localOnly || preserveDrafts) && <div hidden={!visible || localOnly || focused || tab !== 'routines'}>
      <WorkspaceView activities={activities} training={training} enabled={accountReady} api={api} key={state.userId + ':' + (state.scope?.dataGeneration ?? 'checking')} state={state} controller={controller} onEditingChange={setEditingRoutine} />
    </div>}

    <div hidden={!visible || focused || recordFocused || tab !== 'history'}>{visible && !localOnly && state.status === 'ready' && state.scope && session?.status !== 'ACTIVE' && <StatisticsPanel enabled={accountReady&&!state.busy} key={'statistics:' + state.scope.userId + ':' + state.scope.dataGeneration} api={statistics} scope={state.scope}
      workoutApi={api} schedule={training.schedule} definitions={state.data?.exercises} refreshKey={[scheduleRevision,training.schedule?.appliedVersion,session?.id,session?.version,session?.deletedAt].join(':')} onInvalid={controller.invalidateScope} onOpen={id => void openRecord(id)} />}</div>
    {session && session.status === 'ACTIVE' && !editable && <details hidden={!focused} open><summary>세션 상태·편집 기기 확인</summary><SessionView session={session} deviceId={state.deviceId} saved={state.copySaved} busy={state.busy} manufacturers={state.data?.manufacturers} onRefresh={() => { void (async () => { if (await flush()) await controller.showDetail(session.id) })() }} onTakeover={() => void controller.takeover()} /></details>}
    {visible && permissionIssue && <p className="notice" role="status">오프라인 재실행 허용을 저장하지 못했습니다. 운동 원본은 유지됩니다. 저장소 설정을 확인해 주세요.</p>}
    {editable && <LocalWorkoutScreen key={[session.userId, session.dataGeneration, session.id, session.editorDeviceId, session.writerEpoch].join(':')}
      assessmentApi={localOnly ? undefined : api}
      visible={focused} onHome={() => { void (async () => { if (await navigate('home')) setDismissedWorkout(identity) })() }}
      history={referenceHistory?.key === referenceKey ? referenceHistory.sessions : []}
      referenceRecords={referenceHistory?.key===referenceKey?referenceHistory.references:[]} referenceRoutine={referenceHistory?.key===referenceKey?referenceHistory.routine:null}
      server={session} policy={state.data!.settings} definitions={localOnly ? [] : sessionDefinitions} manufacturers={localOnly ? [] : state.data!.manufacturers} activities={localOnly ? [] : activities} authorized={authorized} localOnly={localOnly} onExitGuard={registerExit} onReady={admitOffline}
      sync={{ api, online: () => { const a = authentication.getSnapshot(), s = controller.getSnapshot(); return a.status === 'authenticated' && a.pending === null && a.userId === session.userId && s.status === 'ready' && !s.busy }, onServer: server => { if (server.status === 'FINISHED') { setSummaryRecord([server.userId, server.dataGeneration, server.id].join(':')) } controller.observeSession(server) }, onInvalid: controller.invalidateScope }} authenticated={!localOnly && auth.pending === null && state.status === 'ready' && !state.busy} />}
    <div hidden={!visible || focused || !recordFocused || tab !== 'history'}>{visible && !localOnly && recordFocused && state.scope && session && session.status !== 'ACTIVE' && <ClosedWorkout key={[session.userId, session.dataGeneration, session.id].join(':')} api={api} session={session} summary={summaryRecord === recordIdentity} manufacturers={state.data?.manufacturers} definitions={sessionDefinitions}
      onBack={() => { if (summaryRecord === recordIdentity) { setSummaryRecord(null); setRecordRoute(null, true); void navigate('home') } else if (window.history.state?.overloadNavigation?.index > 0) window.history.back(); else setRecordRoute(null, true); window.scrollTo(0, 0) }} onServer={controller.observeSession} onInvalid={controller.invalidateScope} authorized={() => {
      const a = authentication.getSnapshot(), s = controller.getSnapshot()
      return a.status === 'authenticated' && a.pending === null && !a.accountOpen && a.userId === session.userId && s.scope?.dataGeneration === session.dataGeneration && s.detail?.id === session.id
    }} />}</div>
    {settingsDetail}
    {localOnly && <button className="outline" onClick={() => void authentication.restore()}>같은 계정 인증 다시 확인</button>}
    {visible && state.issue && <button type="button" className="outline" onClick={() => void authentication.restore()}>로그인 상태 다시 확인</button>}</SearchExerciseDetails></CombinationMemoProvider>
}
