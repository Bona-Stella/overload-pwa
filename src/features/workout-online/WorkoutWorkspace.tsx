import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/context.ts'
import { WorkoutApi } from './api.ts'
import { WorkoutOnlineController } from './controller.ts'
import type { OnlineState } from './controller.ts'
import type { Manufacturer, Routine, Session } from './types.ts'
import { equipmentLabel } from './equipment.ts'
import { RoutineForm } from './RoutineForm.tsx'
import { LocalWorkoutScreen } from '../workout-local/LocalWorkoutScreen.tsx'
import type { ExitGuardRegistration } from '../workout-local/types.ts'
import './online.css'
import { ClosedWorkout, WorkoutHistory } from './ClosedWorkout.tsx'
import { offlineAccess } from '../workout-local/offline.ts'
import type { LocalWorkout } from '../workout-local/types.ts'
import { StatisticsApi } from '../statistics/api.ts'
import { StatisticsPanel } from '../statistics/StatisticsPanel.tsx'
import { WeeklyScheduleApi } from '../statistics/weekly-schedule.ts'
import { WeeklySchedulePanel } from '../statistics/WeeklySchedulePanel.tsx'

export function SessionView({ session, deviceId, saved, busy, onRefresh, onTakeover, manufacturers = [] }: { manufacturers?: Manufacturer[]; session: Session; deviceId: string | null; saved: boolean; busy: boolean; onRefresh: () => void; onTakeover?: () => void }) {
  const otherEditor = session.editorDeviceId !== deviceId
  const label = session.status === 'ACTIVE' ? '진행 중' : session.status === 'FINISHED' ? '명시 종료' : '서버 자동 종료'
  return <section className="card stack" aria-labelledby="online-session-title"><div className="section-heading"><h2 id="online-session-title">{session.initialPlan.routineName}</h2><span className="workout-read-badge">{label}</span></div>
    <p>{session.workoutDate} · <time dateTime={session.startedAt}>{session.startedAt}</time></p>
    {session.status === 'ACTIVE' && <p className="notice">{otherEditor ? '다른 기기에서 편집 중입니다. 이 화면은 읽기 전용입니다.' : '이 기기의 운동입니다. 아래에서 기록하고 서버 저장 상태를 확인할 수 있습니다.'}</p>}
    {session.status === 'ACTIVE' && otherEditor && onTakeover && <button className="outline full" disabled={busy || !deviceId || !saved} onClick={() => { if (window.confirm('서버에 저장된 기록으로 이 기기에서 편집할까요? 다른 기기의 미전송 기록은 자동으로 합치지 않습니다.')) onTakeover() }}>이 기기로 편집 가져오기</button>}
    {session.status === 'AUTO_CLOSED' && <p className="notice">서버가 마지막 저장 상태로 자동 종료했습니다. 사용자 종료 시각이나 최초 명시 종료 평가를 생성하지 않습니다.</p>}
    {session.deletedAt && <p className="notice">삭제된 운동입니다. 기록을 자동 복원하지 않습니다.</p>}
    <p className="muted small" role="status">{saved ? '서버에서 확인한 세션 사본을 이 기기에 저장했습니다.' : '서버 세션의 로컬 보존을 확인하지 못했습니다. 수행 입력을 시작할 수 없습니다.'}</p>
    <details><summary>시작 당시 계획</summary><div className="stack">{session.initialPlan.weightExercises.map(e => <p key={e.sessionExerciseId}>{e.exerciseName} · {e.setCount}세트 · {e.minReps}~{e.maxReps}회 · 승인 {e.approvedWeightKg} kg · {equipmentLabel(e, manufacturers)}</p>)}
      {session.initialPlan.cardioActivities.map(c => <p key={c.sessionActivityId}>{c.plan.name} · 목표 {c.plan.targetSeconds}초</p>)}</div></details>
    <details><summary>서버에서 마지막 확인한 적용 계획·수행</summary><div className="stack">{session.snapshot.state.appliedPlan.weightExercises.map(e => <p key={e.sessionExerciseId}>{session.initialPlan.weightExercises.find(x => x.sessionExerciseId === e.sessionExerciseId)?.exerciseName ?? '추가된 세션 종목'} · {e.setCount}세트 · {e.minReps}~{e.maxReps}회</p>)}
      {session.snapshot.state.appliedPlan.cardioActivities.map(c => <p key={c.sessionActivityId}>{c.plan.name} · 목표 {c.plan.targetSeconds}초</p>)}
      <p>완료 웨이트 {session.snapshot.state.performedSets.length}세트 · 확정 유산소 {session.snapshot.state.cardioResults.length}건</p>
      {session.snapshot.state.performedSets.map(s => <p key={s.id}>{s.ordinal}세트 · {s.weightKg} kg × {s.reps}회 · {equipmentLabel(s, manufacturers)}</p>)}</div></details>
    {session.snapshot.approvalResults.some(r => r.status === 'PENDING') && <p className="notice">승인 확인 필요 · 수행 기록의 저장과 중량 승인 적용은 별개입니다.</p>}
    <button type="button" className="outline full" disabled={busy} onClick={onRefresh}>세션 상세 다시 확인</button>
  </section>
}
export function WorkspaceView({ state, controller }: { state: OnlineState; controller: WorkoutOnlineController }) {
  const [editor, setEditor] = useState<Routine | 'new' | null>(null)
  return <section className="stack workout-online" aria-labelledby="online-title"><div className="section-heading"><h2 id="online-title">내 루틴과 현재 운동</h2><button type="button" className="quiet" disabled={state.busy} onClick={() => void controller.refresh()}>다시 조회</button></div>
    <p className="muted small">운동 입력·타이머는 이 기기에 보존하고 완료 기록과 적용 계획은 서버에 저장합니다. 앱 준비 후 연결이 끊기면 이 기기의 기존 운동만 명시적으로 이어갈 수 있습니다.</p>
    {state.status === 'loading' && <p role="status">현재 계정의 운동 정보를 확인하고 있습니다.</p>}
    {state.issue && <p className="notice error" role="alert">{state.issue}</p>}{state.notice && <p className="notice" role="status">{state.notice}</p>}
    {state.attempt && <section className="card stack"><h3>시작 결과 확인 필요</h3><p>이 기기에 원래 시작 요청이 남아 있습니다. 새 운동을 만들지 않고 같은 요청을 다시 확인합니다.</p>
      <button className="primary" disabled={state.busy || !state.localReady} onClick={() => void controller.start()}>기존 시작 요청 다시 확인</button></section>}
    {state.detail && <SessionView session={state.detail} deviceId={state.deviceId} saved={state.copySaved} busy={state.busy} manufacturers={state.data?.manufacturers} onRefresh={() => void controller.showDetail(state.detail!.id)} onTakeover={() => void controller.takeover()} />}
    {state.active && state.detail?.id !== state.active.id && <button className="outline" disabled={state.busy} onClick={() => void controller.showDetail(state.active!.id)}>진행 중인 운동으로 돌아가기</button>}
    {state.data && <>
      <section className="card stack"><h3>세트 사이 휴식</h3><p>목표 ≤10회: {state.data.settings.restLowSeconds}초 · 11~12회: {state.data.settings.restMediumSeconds}초 · ≥13회: {state.data.settings.restHighSeconds}초</p></section>
      <section className="card stack"><h3>내 루틴</h3>{state.data.routines.length === 0 ? <p>아직 루틴이 없습니다. 표준 운동으로 첫 루틴을 만들어 주세요.</p>
        : <ul className="online-routine-list">{state.data.routines.map(r => <li key={r.id}><button type="button" className="outline full" aria-pressed={state.selected?.id === r.id} disabled={state.busy} onClick={() => { setEditor(null); void controller.select(r.id) }}>{r.name}</button></li>)}</ul>}
        <button type="button" className="outline full" disabled={state.busy} onClick={() => setEditor('new')}>새 루틴 만들기</button></section>
      {state.selected && !editor && <section className="card stack"><h3>{state.selected.name}</h3>
        {state.selected.weightPlacements.map(w => <p key={w.id}>{w.exerciseName} · {w.setCount}세트 · {w.minReps}~{w.maxReps}회 · 승인 {w.approvedWeightKg} kg · {equipmentLabel(w, state.data?.manufacturers)}</p>)}
        {state.selected.cardioPlacements.map(c => <p key={c.id}>{c.plan.name} · 목표 {c.plan.targetSeconds}초</p>)}
        <button type="button" className="outline" disabled={state.busy} onClick={() => setEditor(state.selected)}>이 루틴 편집</button>
        <button type="button" className="quiet danger" disabled={state.busy} onClick={() => { if (window.confirm('이 루틴을 삭제할까요? 기존 운동 기록은 보존합니다.')) void controller.deleteRoutine() }}>루틴 삭제</button>
        <p className="muted small">시작 후 입력과 타이머를 이 기기에 보존하고 완료 기록을 서버에 저장합니다.</p>
        <button type="button" className="primary" disabled={state.busy || !state.localReady || state.attempt !== null || state.active !== null} onClick={() => void controller.start()}>온라인으로 운동 시작</button>
        {state.active && <p className="muted small">진행 중인 운동이 있어 새 운동을 시작할 수 없습니다.</p>}
      </section>}
      {editor && state.scope && <RoutineForm key={state.userId + ':' + state.scope.dataGeneration + ':' + (editor === 'new' ? 'new' : editor.id + ':' + editor.version)} routine={editor === 'new' ? null : editor}
        generation={state.scope.dataGeneration} exercises={state.data.exercises} manufacturers={state.data.manufacturers} busy={state.busy} controller={controller} onClose={() => setEditor(null)} />}
    </>}
  </section>
}
export function WorkoutWorkspace({ onExitGuard }: { onExitGuard?: ExitGuardRegistration } = {}) {
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
  if ((!localOnly && (auth.status !== 'authenticated' || auth.pending === 'logout' || state.userId !== auth.userId)) || auth.accountOpen) return null
  const session = state.detail
  const editable = session && session.status === 'ACTIVE' && !session.deletedAt && session.editorDeviceId === state.deviceId && state.copySaved && state.data
  const authorized = () => {
    const a = authentication.getSnapshot(), s = controller.getSnapshot()
    return a.pending !== 'logout' && !!session && s.scope?.dataGeneration === session.dataGeneration && s.detail?.id === session.id
      && s.detail.writerEpoch === session.writerEpoch && s.detail.editorDeviceId === session.editorDeviceId && s.detail.status === 'ACTIVE'
      && (a.status === 'authenticated' && a.userId === session.userId || a.localWorkoutUserId === session.userId)
  }
  return <>{!localOnly && state.status === 'ready' && state.scope && session?.status !== 'ACTIVE' && <StatisticsPanel key={state.scope.userId + ':' + state.scope.dataGeneration} api={statistics} scope={state.scope}
      refreshKey={(session ? session.id + ':' + session.version : 'home') + ':' + scheduleRefresh + ':' + state.data?.routines.map(r => r.id + ':' + r.version).join(',')} onInvalid={controller.invalidateScope} onOpen={id => { void (async () => { if (await (exitGuard.current?.() ?? Promise.resolve(true))) await controller.showDetail(id) })() }} />}
    {!localOnly && state.status === 'ready' && state.scope && state.data && session?.status !== 'ACTIVE' && <WeeklySchedulePanel key={'schedule:' + state.scope.userId + ':' + state.scope.dataGeneration} api={weekly} scope={state.scope} routines={state.data.routines} onSaved={() => setScheduleRefresh(n => n + 1)} onInvalid={controller.invalidateScope} />}
    {!localOnly && <WorkspaceView key={state.userId + ':' + (state.scope?.dataGeneration ?? 'checking')} state={state} controller={controller} />}
    {permissionIssue && <p className="notice" role="status">오프라인 재실행 허용을 저장하지 못했습니다. 운동 원본은 유지됩니다. 저장소 설정을 확인해 주세요.</p>}
    {editable && <LocalWorkoutScreen key={[session.userId, session.dataGeneration, session.id, session.editorDeviceId, session.writerEpoch].join(':')}
      server={session} policy={state.data!.settings} definitions={localOnly ? [] : state.data!.exercises} manufacturers={localOnly ? [] : state.data!.manufacturers} authorized={authorized} localOnly={localOnly} onExitGuard={registerExit} onReady={admitOffline}
      sync={{ api, online: () => { const a = authentication.getSnapshot(), s = controller.getSnapshot(); return a.status === 'authenticated' && a.pending === null && a.userId === session.userId && s.status === 'ready' && !s.busy }, onServer: controller.observeSession, onInvalid: controller.invalidateScope }} authenticated={!localOnly && auth.pending === null && state.status === 'ready' && !state.busy} />}
    {!localOnly && state.scope && session && session.status !== 'ACTIVE' && <ClosedWorkout key={[session.userId, session.dataGeneration, session.id].join(':')} api={api} session={session} manufacturers={state.data?.manufacturers} onServer={controller.observeSession} onInvalid={controller.invalidateScope} authorized={() => {
      const a = authentication.getSnapshot(), s = controller.getSnapshot()
      return a.status === 'authenticated' && a.pending === null && !a.accountOpen && a.userId === session.userId && s.scope?.dataGeneration === session.dataGeneration && s.detail?.id === session.id
    }} />}
    {!localOnly && state.scope && <WorkoutHistory key={'history:' + state.scope.userId + ':' + state.scope.dataGeneration} api={api} scope={state.scope} onInvalid={controller.invalidateScope} refreshKey={session?.status === 'ACTIVE' ? 'active' : session?.id + ':' + session?.version} onOpen={id => { void (async () => { if (await (exitGuard.current?.() ?? Promise.resolve(true))) await controller.showDetail(id) })() }} />}
    {localOnly && <button className="outline" onClick={() => void authentication.restore()}>같은 계정 인증 다시 확인</button>}
    {state.issue && <button type="button" className="outline" onClick={() => void authentication.restore()}>로그인 상태 다시 확인</button>}</>
}
