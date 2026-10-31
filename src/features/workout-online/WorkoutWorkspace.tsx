import { useEffect, useState, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/context.ts'
import { WorkoutApi } from './api.ts'
import { WorkoutOnlineController } from './controller.ts'
import type { OnlineState } from './controller.ts'
import type { Routine, Session } from './types.ts'
import { RoutineForm } from './RoutineForm.tsx'
import { LocalWorkoutScreen } from '../workout-local/LocalWorkoutScreen.tsx'
import type { ExitGuardRegistration } from '../workout-local/types.ts'
import './online.css'

export function SessionView({ session, deviceId, saved, busy, onRefresh }: { session: Session; deviceId: string | null; saved: boolean; busy: boolean; onRefresh: () => void }) {
  const otherEditor = session.editorDeviceId !== deviceId
  const label = session.status === 'ACTIVE' ? '진행 중' : session.status === 'FINISHED' ? '명시 종료' : '서버 자동 종료'
  return <section className="card stack" aria-labelledby="online-session-title"><div className="section-heading"><h2 id="online-session-title">{session.initialPlan.routineName}</h2><span className="workout-read-badge">{label}</span></div>
    <p>{session.workoutDate} · <time dateTime={session.startedAt}>{session.startedAt}</time></p>
    {session.status === 'ACTIVE' && <p className="notice">{otherEditor ? '다른 기기가 편집권을 가지고 있습니다. 이 화면은 읽기 전용입니다.' : '이 기기의 운동입니다. 아래 로컬 기록에서 입력할 수 있습니다. 서버 동기화·운동 종료는 후속 단계입니다.'}</p>}
    {session.status === 'AUTO_CLOSED' && <p className="notice">서버가 마지막 저장 상태로 자동 종료했습니다. 사용자 종료 시각이나 최초 명시 종료 평가를 생성하지 않습니다.</p>}
    {session.deletedAt && <p className="notice">삭제된 운동입니다. 기록을 자동 복원하지 않습니다.</p>}
    <p className="muted small" role="status">{saved ? '서버에서 확인한 세션 사본을 이 기기에 저장했습니다.' : '서버 세션의 로컬 보존을 확인하지 못했습니다. 수행 입력을 시작할 수 없습니다.'}</p>
    <details><summary>시작 당시 계획</summary><div className="stack">{session.initialPlan.weightExercises.map(e => <p key={e.sessionExerciseId}>{e.exerciseName} · {e.setCount}세트 · {e.minReps}~{e.maxReps}회 · 승인 {e.approvedWeightKg} kg</p>)}
      {session.initialPlan.cardioActivities.map(c => <p key={c.sessionActivityId}>{c.plan.name} · 목표 {c.plan.targetSeconds}초</p>)}</div></details>
    <details><summary>서버에서 마지막 확인한 적용 계획·수행</summary><div className="stack">{session.snapshot.state.appliedPlan.weightExercises.map(e => <p key={e.sessionExerciseId}>{session.initialPlan.weightExercises.find(x => x.sessionExerciseId === e.sessionExerciseId)?.exerciseName ?? '추가된 세션 종목'} · {e.setCount}세트 · {e.minReps}~{e.maxReps}회</p>)}
      {session.snapshot.state.appliedPlan.cardioActivities.map(c => <p key={c.sessionActivityId}>{c.plan.name} · 목표 {c.plan.targetSeconds}초</p>)}
      <p>완료 웨이트 {session.snapshot.state.performedSets.length}세트 · 확정 유산소 {session.snapshot.state.cardioResults.length}건</p>
      {session.snapshot.state.performedSets.map(s => <p key={s.id}>{s.ordinal}세트 · {s.weightKg} kg × {s.reps}회</p>)}</div></details>
    {session.snapshot.approvalResults.some(r => r.status === 'PENDING') && <p className="notice">저장된 수행과 별도로 확인이 필요한 중량 승인 요청이 있습니다. 해결 화면은 후속 단계에서 연결됩니다.</p>}
    <button type="button" className="outline full" disabled={busy} onClick={onRefresh}>세션 상세 다시 확인</button>
  </section>
}
export function WorkspaceView({ state, controller }: { state: OnlineState; controller: WorkoutOnlineController }) {
  const [editor, setEditor] = useState<Routine | 'new' | null>(null)
  return <section className="stack workout-online" aria-labelledby="online-title"><div className="section-heading"><h2 id="online-title">내 루틴과 현재 운동</h2><button type="button" className="quiet" disabled={state.busy} onClick={() => void controller.refresh()}>다시 조회</button></div>
    <p className="muted small">온라인으로 시작한 운동의 입력·완료·타이머를 이 기기에 저장합니다. 서버 동기화·운동 종료와 완전 오프라인 앱 재실행은 아직 지원하지 않습니다.</p>
    {state.status === 'loading' && <p role="status">현재 계정의 운동 정보를 확인하고 있습니다.</p>}
    {state.issue && <p className="notice error" role="alert">{state.issue}</p>}{state.notice && <p className="notice" role="status">{state.notice}</p>}
    {state.attempt && <section className="card stack"><h3>시작 결과 확인 필요</h3><p>이 기기에 원래 시작 요청이 남아 있습니다. 새 운동을 만들지 않고 같은 요청을 다시 확인합니다.</p>
      <button className="primary" disabled={state.busy || !state.localReady} onClick={() => void controller.start()}>기존 시작 요청 다시 확인</button></section>}
    {state.detail && <SessionView session={state.detail} deviceId={state.deviceId} saved={state.copySaved} busy={state.busy} onRefresh={() => void controller.showDetail(state.detail!.id)} />}
    {state.data && <>
      <section className="card stack"><h3>내 루틴</h3>{state.data.routines.length === 0 ? <p>아직 루틴이 없습니다. 내 운동 종목으로 첫 루틴을 만들어 주세요.</p>
        : <ul className="online-routine-list">{state.data.routines.map(r => <li key={r.id}><button type="button" className="outline full" aria-pressed={state.selected?.id === r.id} disabled={state.busy} onClick={() => { setEditor(null); void controller.select(r.id) }}>{r.name}</button></li>)}</ul>}
        <button type="button" className="outline full" disabled={state.busy} onClick={() => setEditor('new')}>새 루틴 만들기</button></section>
      {state.selected && !editor && <section className="card stack"><h3>{state.selected.name}</h3>
        {state.selected.weightPlacements.map(w => <p key={w.id}>{w.exerciseName} · {w.setCount}세트 · {w.minReps}~{w.maxReps}회 · 승인 {w.approvedWeightKg} kg</p>)}
        {state.selected.cardioPlacements.map(c => <p key={c.id}>{c.plan.name} · 목표 {c.plan.targetSeconds}초</p>)}
        <button type="button" className="outline" disabled={state.busy} onClick={() => setEditor(state.selected)}>이 루틴 편집</button>
        <p className="muted small">시작 후 수행을 로컬에 기록할 수 있습니다. 서버 동기화와 운동 종료는 아직 지원하지 않습니다.</p>
        <button type="button" className="primary" disabled={state.busy || !state.localReady || state.attempt !== null || state.active !== null} onClick={() => void controller.start()}>온라인으로 운동 시작</button>
        {state.active && <p className="muted small">진행 중인 운동이 있어 새 운동을 시작할 수 없습니다.</p>}
      </section>}
      {editor && state.scope && <RoutineForm key={state.userId + ':' + state.scope.dataGeneration + ':' + (editor === 'new' ? 'new' : editor.id + ':' + editor.version)} routine={editor === 'new' ? null : editor}
        generation={state.scope.dataGeneration} exercises={state.data.exercises} busy={state.busy} controller={controller} onClose={() => setEditor(null)} />}
    </>}
  </section>
}
export function WorkoutWorkspace({ onExitGuard }: { onExitGuard?: ExitGuardRegistration } = {}) {
  const { state: auth, controller: authentication } = useAuth()
  const [controller] = useState(() => new WorkoutOnlineController(new WorkoutApi(authentication)))
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  useEffect(() => controller.connect(authentication), [controller, authentication])
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
  return <>{!localOnly && <WorkspaceView key={state.userId + ':' + (state.scope?.dataGeneration ?? 'checking')} state={state} controller={controller} />}
    {editable && <LocalWorkoutScreen key={[session.userId, session.dataGeneration, session.id, session.editorDeviceId, session.writerEpoch, session.version].join(':')}
      server={session} policy={state.data!.settings} definitions={localOnly ? [] : state.data!.exercises} authorized={authorized} localOnly={localOnly} onExitGuard={onExitGuard} />}
    {localOnly && <button className="outline" onClick={() => void authentication.restore()}>같은 계정 인증 다시 확인</button>}
    {state.issue && <button type="button" className="outline" onClick={() => void authentication.restore()}>로그인 상태 다시 확인</button>}</>
}
