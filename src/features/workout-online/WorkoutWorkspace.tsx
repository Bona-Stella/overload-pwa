import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/context.ts'
import { WorkoutApi } from './api.ts'
import { WorkoutOnlineController } from './controller.ts'
import type { OnlineState } from './controller.ts'
import type { CardioActivity, Manufacturer, Routine, Session } from './types.ts'
import { equipmentLabel } from './equipment.ts'
import { dayNames } from './routine-schedule.ts'
import { RoutineCards } from './RoutineCards.tsx'
import { RoutineForm } from './RoutineForm.tsx'
import { LocalWorkoutScreen } from '../workout-local/LocalWorkoutScreen.tsx'
import type { ExitGuardRegistration } from '../workout-local/types.ts'
import './online.css'
import { ClosedWorkout, WorkoutHistory } from './ClosedWorkout.tsx'
import { offlineAccess } from '../workout-local/offline.ts'
import type { LocalWorkout } from '../workout-local/types.ts'
import { StatisticsApi } from '../statistics/api.ts'
import { StatisticsPanel } from '../statistics/StatisticsPanel.tsx'
import type { WeeklySchedule } from '../statistics/weekly-schedule.ts'
import { WeeklyScheduleApi } from '../statistics/weekly-schedule.ts'
import { WeeklySchedulePanel } from '../statistics/WeeklySchedulePanel.tsx'
import type { AppTab } from '../../app/types.ts'
import { Button, Card, Metadata, SectionHeading, StatusNotice } from '../../components/ui.tsx'
import { boundaryError } from '../home/load.ts'
import { HomePanel } from '../home/HomePanel.tsx'

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
export function WorkspaceView({ state, controller, onEditingChange, api, weekly, refreshKey, onScheduleSaved }: { weekly?:WeeklyScheduleApi; refreshKey?:number; onScheduleSaved?:()=>void; api?: WorkoutApi; state: OnlineState; controller: WorkoutOnlineController; onEditingChange?: (editing: boolean) => void }) {
  const [editor, setEditor] = useState<{ routine: Routine | null; readOnly: boolean } | null>(null)
  const [scheduleEditing, setScheduleEditing] = useState(false)
  const [week,setWeek]=useState<{key:string;value:WeeklySchedule}|null>(null),[activities,setActivities]=useState<CardioActivity[]>([])
  const weekKey=JSON.stringify([state.scope,state.data?.routines,refreshKey])
  const currentWeek=week?.key===weekKey?week.value:undefined
  useEffect(()=>{const abort=new AbortController();if(state.scope&&weekly){const scope=state.scope;void weekly.read(scope,Intl.DateTimeFormat().resolvedOptions().timeZone,abort.signal).then(value=>{if(!abort.signal.aborted)setWeek({key:weekKey,value})}).catch(error=>{if(!abort.signal.aborted)controller.invalidateScope(error)});if(api)void api.cardioActivities(scope.userId,abort.signal).then(value=>{if(!abort.signal.aborted)setActivities(value)}).catch(error=>{if(!abort.signal.aborted)controller.invalidateScope(error)})}return()=>abort.abort()},[api,weekly,weekKey,state.scope,controller])
  const previewKey=JSON.stringify([state.scope,state.data?.routines])
  const [previews,setPreviews]=useState<{key:string;values:Map<string,Routine>}|null>(null)
  useEffect(()=>{const abort=new AbortController();if(api&&state.scope&&state.data){const scope=state.scope,list=state.data.routines;void (async()=>{const values=new Map<string,Routine>();let index=0;await Promise.all(Array.from({length:Math.min(4,list.length)},async()=>{while(index<list.length&&!abort.signal.aborted){const r=list[index++];try{values.set(r.id,await api.routine(scope,r.id,abort.signal))}catch(error){ if(boundaryError(error))controller.invalidateScope(error) }}}));if(!abort.signal.aborted)setPreviews({key:previewKey,values})})()}return()=>abort.abort()},[api,previewKey,state.scope,state.data,controller])
  const cards=new Map(previews?.key===previewKey?previews.values:[]);if(state.selected&&state.data?.routines.some(r=>r.id===state.selected?.id&&r.version===state.selected.version))cards.set(state.selected.id,state.selected)

  const schedule = weekly && state.scope && state.data ? <WeeklySchedulePanel key={state.scope.userId + ":" + state.scope.dataGeneration} api={weekly} scope={state.scope} routines={state.data.routines} refreshKey={weekKey} readOnly={!!state.active || !!state.attempt} onEditingChange={setScheduleEditing} onSaved={() => onScheduleSaved?.()} onInvalid={controller.invalidateScope} /> : null
  const managementBlocked = state.busy || !!state.attempt || !!state.active
  async function deleteRoutine(id: string) {
    if (managementBlocked) return
    await controller.select(id)
    const current = controller.getSnapshot()
    if (current.active || current.attempt || current.selected?.id !== id || !window.confirm('이 루틴을 삭제할까요? 주간 일정의 배정이 해제되며 기존 운동 기록은 보존합니다.')) return
    await controller.deleteRoutine()
    if (!controller.getSnapshot().selected) setEditor(null)
  }
  useEffect(() => { onEditingChange?.(editor !== null || scheduleEditing); return () => onEditingChange?.(false) }, [editor, scheduleEditing, onEditingChange])
  return <section className="stack workout-online" aria-labelledby="online-title"><div className="section-heading"><span id="online-title" className="muted small">ROUTINES</span><button type="button" className="quiet" disabled={state.busy || editor !== null || scheduleEditing} onClick={() => void controller.refresh()}>다시 조회</button></div>
    {state.status === 'loading' && <p role="status">현재 계정의 운동 정보를 확인하고 있습니다.</p>}
    {state.issue && <p className="notice error" role="alert">{state.issue}</p>}{state.notice && <p className="notice" role="status">{state.notice}</p>}
    {state.data && <>
      <div hidden={editor!==null}><RoutineCards week={currentWeek} schedule={schedule} scheduleEditing={scheduleEditing} onEdit={id=>{void controller.select(id).then(()=>{const selected=controller.getSnapshot().selected;if(selected?.id===id)setEditor({routine:selected,readOnly:false})})}} onDelete={id=>void deleteRoutine(id)} summaries={state.data.routines} details={cards} busy={state.busy||!currentWeek} managementBlocked={managementBlocked} onNew={()=>setEditor({routine:null,readOnly:false})} onSelect={id=>{void controller.select(id).then(()=>{const selected=controller.getSnapshot().selected;if(selected?.id===id)setEditor({routine:selected,readOnly:true})})}} /></div>
      {editor && state.scope && <><RoutineForm key={state.userId + ':' + state.scope.dataGeneration + ':' + (editor.routine ? editor.routine.id + ':' + editor.routine.version : 'new') + ':' + editor.readOnly} routine={editor.routine} readOnly={editor.readOnly}
        assignments={editor.routine && <p>현재 배정 요일 · {currentWeek?.assignments.filter(a => a.routineId === editor.routine?.id).map(a => dayNames[a.dayOfWeek - 1]).join('·') || (currentWeek ? '없음' : '확인 필요')}</p>} activities={activities} onSaved={onScheduleSaved} generation={state.scope.dataGeneration} exercises={state.data.exercises} manufacturers={state.data.manufacturers} busy={managementBlocked} controller={controller} onClose={() => setEditor(null)} managementBlocked={managementBlocked} onEdit={() => { if(!managementBlocked) setEditor({...editor,readOnly:false}) }} onDelete={() => { if(editor.routine) void deleteRoutine(editor.routine.id) }} />
        {editor.readOnly && <button type="button" className="primary" disabled={state.busy || !state.localReady || state.attempt !== null || state.active !== null} onClick={() => void controller.start()}>온라인으로 운동 시작</button>}</>}
    </>}
  </section>
}
export function WorkoutWorkspace({ onExitGuard, tab = 'home', onNavigate, onFocusChange }: {
  onExitGuard?: ExitGuardRegistration; tab?: AppTab; onNavigate?: (tab: AppTab) => Promise<boolean>; onFocusChange?: (focused: boolean) => void
} = {}) {
  const { state: auth, controller: authentication } = useAuth()
  const [api] = useState(() => new WorkoutApi(authentication))
  const [statistics] = useState(() => new StatisticsApi(authentication))
  const [weekly] = useState(() => new WeeklyScheduleApi(authentication))
  const [scheduleRefresh, setScheduleRefresh] = useState(0)
  const [controller] = useState(() => new WorkoutOnlineController(api, undefined, () => authentication.invalidateLocalWorkoutAccess()))
  const exitGuard = useRef<(() => Promise<boolean>) | null>(null)
  const registerExit = useCallback<ExitGuardRegistration>(guard => { exitGuard.current = guard; onExitGuard?.(guard) }, [onExitGuard])
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
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
  const localOnly = !!state.userId && auth.localWorkoutUserId === state.userId
  const visible = (localOnly || auth.status === 'authenticated' && auth.pending !== 'logout' && state.userId === auth.userId) && !auth.accountOpen
  const session = state.detail
  const identity = session ? [session.userId, session.dataGeneration, session.id, session.editorDeviceId, session.writerEpoch].join(':') : null
  const focused = visible && !!session && session.status === 'ACTIVE' && (localOnly || dismissedWorkout !== identity)
  useEffect(() => {
    onFocusChange?.(visible && (focused || tab === 'routines' && editingRoutine))
    return () => onFocusChange?.(false)
  }, [visible, focused, tab, editingRoutine, onFocusChange])
  if (!visible) return null
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
    if (await navigate('history')) await controller.showDetail(id)
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
  return <>
    {navigationIssue && <StatusNotice error>입력 초안을 저장하지 못해 화면 이동을 보류했습니다. 운동 원본과 입력을 유지합니다.</StatusNotice>}
    <div hidden={focused || tab !== 'home'}>{!localOnly && (state.status === 'ready' && state.scope && state.data ? <HomePanel
      key={'home:' + state.scope.userId + ':' + state.scope.dataGeneration} scope={state.scope} routines={state.data.routines} api={api} weekly={weekly} statistics={statistics}
      refreshKey={scheduleRefresh + ':' + (session ? session.id + ':' + session.version : '')} active={state.active} attempt={state.attempt !== null} busy={state.busy} localReady={state.localReady}
      issue={homeStartIssue ?? state.issue} onInvalid={controller.invalidateScope} onNavigate={next => void navigate(next)} onOpen={id => void openRecord(id)} onResume={() => void resume()} onRetry={() => void controller.start()}
      onStart={async routine => {
        if (homeStarting.current) return
        homeStarting.current = true
        try {
          const before = controller.getSnapshot()
          if (before.busy || before.active || before.attempt || !await flush()) return
          setHomeStartIssue(null)
          await controller.select(routine.id)
          const latest = controller.getSnapshot(), account = authentication.getSnapshot()
          if (latest.scope?.userId !== routine.userId || latest.scope.dataGeneration !== routine.dataGeneration || account.status !== 'authenticated' || account.pending !== null || account.userId !== routine.userId || latest.active || latest.attempt) return
          if (latest.selected?.id !== routine.id) return
          if (latest.selected.version !== routine.version) { setHomeStartIssue('루틴이 변경되었습니다. 홈을 새로고침하여 최신 계획을 확인한 뒤 시작하세요.'); return }
          await controller.start()
        } finally { homeStarting.current = false }
      }} /> : <StatusNotice error={!!state.issue}>{state.issue ?? '현재 계정의 운동 정보를 확인하고 있습니다.'}</StatusNotice>)}</div>
    {!localOnly && <div hidden={focused || tab !== 'routines'}>
      <WorkspaceView weekly={weekly} refreshKey={scheduleRefresh} onScheduleSaved={()=>setScheduleRefresh(n=>n+1)} api={api} key={state.userId + ':' + (state.scope?.dataGeneration ?? 'checking')} state={state} controller={controller} onEditingChange={setEditingRoutine} />
    </div>}

    {!localOnly && !focused && tab === 'history' && <SectionHeading title="운동 기록·분석" eyebrow="YOUR TRAINING" />}
    <div hidden={focused || tab !== 'history'}>{!localOnly && state.status === 'ready' && state.scope && session?.status !== 'ACTIVE' && <StatisticsPanel key={'statistics:' + state.scope.userId + ':' + state.scope.dataGeneration} api={statistics} scope={state.scope}
      refreshKey={(session ? session.id + ':' + session.version : 'home') + ':' + scheduleRefresh + ':' + state.data?.routines.map(r => r.id + ':' + r.version).join(',')} onInvalid={controller.invalidateScope} onOpen={id => void openRecord(id)} />}</div>
    {focused && !localOnly && <Button variant="quiet" disabled={state.busy} onClick={async () => { if (await navigate('home')) setDismissedWorkout(identity) }}>‹ 홈으로 · 운동은 계속 보존</Button>}
    {session && session.status === 'ACTIVE' && <details hidden={!focused} open={!editable}><summary>세션 상태·편집 기기 확인</summary><SessionView session={session} deviceId={state.deviceId} saved={state.copySaved} busy={state.busy} manufacturers={state.data?.manufacturers} onRefresh={() => { void (async () => { if (await flush()) await controller.showDetail(session.id) })() }} onTakeover={() => void controller.takeover()} /></details>}
    {permissionIssue && <p className="notice" role="status">오프라인 재실행 허용을 저장하지 못했습니다. 운동 원본은 유지됩니다. 저장소 설정을 확인해 주세요.</p>}
    <div hidden={!focused}>{editable && <LocalWorkoutScreen key={[session.userId, session.dataGeneration, session.id, session.editorDeviceId, session.writerEpoch].join(':')}
      server={session} policy={state.data!.settings} definitions={localOnly ? [] : state.data!.exercises} manufacturers={localOnly ? [] : state.data!.manufacturers} authorized={authorized} localOnly={localOnly} onExitGuard={registerExit} onReady={admitOffline}
      sync={{ api, online: () => { const a = authentication.getSnapshot(), s = controller.getSnapshot(); return a.status === 'authenticated' && a.pending === null && a.userId === session.userId && s.status === 'ready' && !s.busy }, onServer: controller.observeSession, onInvalid: controller.invalidateScope }} authenticated={!localOnly && auth.pending === null && state.status === 'ready' && !state.busy} />}</div>
    <div hidden={focused || tab !== 'history'}>{!localOnly && state.scope && session && session.status !== 'ACTIVE' && <ClosedWorkout key={[session.userId, session.dataGeneration, session.id].join(':')} api={api} session={session} manufacturers={state.data?.manufacturers} onServer={controller.observeSession} onInvalid={controller.invalidateScope} authorized={() => {
      const a = authentication.getSnapshot(), s = controller.getSnapshot()
      return a.status === 'authenticated' && a.pending === null && !a.accountOpen && a.userId === session.userId && s.scope?.dataGeneration === session.dataGeneration && s.detail?.id === session.id
    }} />}</div>
    <div hidden={focused || tab !== 'history'}>{!localOnly && state.scope && <WorkoutHistory key={'history:' + state.scope.userId + ':' + state.scope.dataGeneration} api={api} scope={state.scope} onInvalid={controller.invalidateScope} refreshKey={session?.status === 'ACTIVE' ? 'active' : session?.id + ':' + session?.version} onOpen={id => void openRecord(id)} />}</div>
    {!localOnly && !focused && tab === 'settings' && state.data && <Card><h2>세트 사이 휴식</h2><p className="muted small">현재 설정된 휴식 시간입니다.</p><p>1~10회 · {state.data.settings.restLowSeconds}초<br />11~12회 · {state.data.settings.restMediumSeconds}초<br />13회 이상 · {state.data.settings.restHighSeconds}초</p></Card>}
    {localOnly && <button className="outline" onClick={() => void authentication.restore()}>같은 계정 인증 다시 확인</button>}
    {state.issue && <button type="button" className="outline" onClick={() => void authentication.restore()}>로그인 상태 다시 확인</button>}</>
}
