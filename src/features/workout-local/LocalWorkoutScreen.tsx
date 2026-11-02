import { useEffect, useState, useSyncExternalStore } from 'react'
import { Dialog } from '../../components/Dialog.tsx'
import { distanceLabel, measuredCardio } from '../workout-online/cardio-measurement.ts'
import { RepsInput } from '../../components/RepsInput.tsx'
import { WorkoutStore } from '../workout-online/storage.ts'
import { ExerciseSearch } from '../workout-online/ExerciseSearch.tsx'
import { EquipmentFields } from '../workout-online/EquipmentFields.tsx'
import { equipmentLabel } from '../workout-online/equipment.ts'
import type { Equipment, Manufacturer, StandardExercise, Session } from '../workout-online/types.ts'
import { countDraft } from '../workout-online/validation.ts'
import { LocalWorkoutController } from './controller.ts'
import type { EditorState } from './controller.ts'
import type { ExitGuardRegistration, LocalWorkout, RestPolicy } from './types.ts'
import { slotKey } from './types.ts'
import * as model from './model.ts'
import { SYNC_LABEL } from './sync.ts'
import type { SyncOptions } from './sync.ts'
import './local.css'

const duration = (ms: number) => { const seconds = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }
type Definition = StandardExercise
export function LocalWorkoutScreen({ server, policy, definitions, manufacturers = [], authorized, localOnly = false, onExitGuard, sync, authenticated = false, onReady, offlineRestart = false }: {
  server: Session; policy: RestPolicy; definitions: Definition[]; manufacturers?: Manufacturer[]; authorized: () => boolean; localOnly?: boolean; onExitGuard?: ExitGuardRegistration; sync?: SyncOptions; authenticated?: boolean; onReady?: (workout: LocalWorkout) => void; offlineRestart?: boolean
}) {
  const [initial] = useState(() => ({ server, policy, onReady }))
  const [ending, setEnding] = useState(false)
  const [store] = useState(() => new WorkoutStore())
  const [controller] = useState(() => new LocalWorkoutController(store, authorized, undefined, sync))
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  useEffect(() => {
    void controller.open(initial.server, initial.policy).then(() => {
      const opened = controller.getSnapshot()
      if (!controller.isStopped() && opened.writable && opened.workout) initial.onReady?.(opened.workout)
    })
    return () => { controller.stop(); void controller.settled().then(() => { if (controller.isStopped()) return store.close() }) }
    // ACK versions update in place. Only session/writer identity remounts the editor.
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
  return <section className="local-workout stack" aria-label="실제 운동 로컬 기록">
    <p className="notice warning">입력과 타이머는 이 기기에 보존합니다. 서버에 저장되지 않은 기록은 저장소를 삭제하면 사라질 수 있습니다.</p>
    {localOnly && <p className="notice">{offlineRestart ? '이 기기의 기존 운동을 로컬에서 이어갑니다. 서버 로그인·운동 상태는 아직 확인하지 않았습니다. 연결 후 확인하기 전에는 전송하지 않습니다.' : '인증 확인이 필요합니다. 이미 열어 둔 같은 계정의 운동만 로컬에 계속 기록할 수 있습니다. 서버 요청은 중단되었습니다. 같은 계정으로 다시 로그인해 주세요.'}</p>}
    {state.loading && <p role="status">로컬 운동과 편집 잠금을 확인하고 있습니다.</p>}
    {state.issue && <p className="notice error" role="alert">{state.issue}</p>}
    {state.syncIssue && <p className="notice" role="status">{state.syncIssue}</p>}
    {!!sync && <button className="outline" disabled={!authenticated || !state.writable || state.syncStatus === 'SENDING'} onClick={() => void controller.retrySync()}>서버 저장 상태 다시 확인</button>}
    {state.unsavedDrafts && <p className="notice" role="status">입력 초안을 저장 중이거나 저장하지 못했습니다. 화면의 입력을 유지합니다.{!state.pending && <button className="outline" onClick={() => void controller.retryDrafts()}>입력 다시 저장</button>}</p>}
    {state.workout && <LocalWorkoutView state={state} controller={controller} definitions={definitions} manufacturers={manufacturers} />}
    {state.workout && !!sync && <ApprovalControls state={state} controller={controller} />}
    {state.workout && !!sync && <>
      {state.workout.finish ? <p className="notice">{state.workout.finish.ack ? '서버에서 운동 종료를 확인했습니다.' : '종료 요청을 이 기기에 보존했습니다. 서버 종료는 아직 확인하지 못했습니다.'} 실제 종료 선택 시각 <time dateTime={state.workout.finish.endedAt}>{new Date(state.workout.finish.endedAt).toLocaleString('ko-KR')}</time></p>
        : <button className="primary full" disabled={!state.writable || state.pending > 0} onClick={() => setEnding(true)}>운동 종료</button>}
      {ending && <Dialog title="운동을 종료할까요?" onClose={() => setEnding(false)}><div className="stack"><p>완료한 수행만 저장합니다. 미완료 세트와 유산소는 자동 완료하지 않습니다. 확인을 누른 시각과 최종 기록을 이 기기에 보존한 뒤, 앞선 저장 결과를 확인하고 서버 종료를 요청합니다.</p>
        <button className="primary" disabled={state.pending > 0} onClick={async () => { const endedAt = Date.now(); if (await controller.finish(endedAt)) setEnding(false) }}>이 시각으로 운동 종료 확인</button><button className="quiet" onClick={() => setEnding(false)}>계속 운동</button></div></Dialog>}
    </>}
  </section>
}
export function LocalWorkoutView({ state, controller, definitions, manufacturers = [] }: { state: EditorState; controller: LocalWorkoutController; definitions: Definition[]; manufacturers?: Manufacturer[] }) {
  const [now, setNow] = useState(() => Date.now())
  const [list, setList] = useState(false), [editing, setEditing] = useState(false), [weightOpen, setWeightOpen] = useState(false)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(timer) }, [])
  const workout = state.workout
  if (!workout) return null
  const id = workout.currentExerciseId, plan = workout.snapshot.appliedPlan.weightExercises.find(x => x.sessionExerciseId === id)
  const cardio = workout.snapshot.appliedPlan.cardioActivities.find(x => x.sessionActivityId === id)
  const completed = workout.snapshot.performedSets.filter(x => x.sessionExerciseId === id).sort((a, b) => a.ordinal - b.ordinal)
  const remaining = model.restRemaining(workout, now), busy = !state.writable || state.pending > 0 || !!workout.finish
  const go = async (target: string) => { if (await controller.change(w => { w.currentExerciseId = target })) { setList(false); setEditing(false); window.scrollTo(0, 0) } }
  // Window only the planned slots. Backend INTEGER counts must never allocate a billion DOM rows.
  const firstPending = (() => { const occupied = new Set(completed.map(x => x.ordinal)); let n = 1; while (occupied.has(n)) n++; return n })()
  const start = Math.max(1, firstPending - 3), end = Math.min(Math.max(plan?.setCount ?? 0, completed.at(-1)?.ordinal ?? 0), start + 19)
  const ordinals = [...new Set([...completed.map(x => x.ordinal), ...Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i)])].sort((a, b) => a - b)
  return <>
    <header className="timer-bar"><div><span>전체 운동 시간</span><strong>{duration((workout.finish ? Date.parse(workout.finish.endedAt) : now) - Date.parse(workout.startedAt))}</strong></div><div><span>휴식 남은 시간</span><strong>{duration(remaining * 1000)}</strong></div></header>
    <div className="section-heading"><span className="muted small">{workout.initialPlan.routineName}</span><button className="outline" onClick={() => setList(true)}>종목 목록</button></div>
    <p className="muted small" role="status">{!state.writable ? '읽기 전용' : state.issue ? '저장 오류 · 최근 변경 미확정' : state.pending ? '이 기기에 저장 중…' : state.unsavedDrafts ? '저장하지 못한 입력 있음' : SYNC_LABEL[state.syncStatus ?? (workout.syncState === 'CLEAN' ? 'LOCAL' : 'WAITING')]}</p>
    {plan && <>
      <div className="exercise-heading"><p className="eyebrow">WORKING SETS</p><h2>{workout.exerciseNames[id] ?? '추가된 세션 종목'}</h2><span className="badge">현재 계획 {plan.setCount}세트 · {plan.minReps}~{plan.maxReps}회</span></div>
      <p className="muted small">현재 작업 중량 {workout.weights[id]?.value} kg · 완료 시 실제 입력값을 저장합니다. 계획과 다른 중량 입력은 오늘만 수행입니다.</p>
      <p className="muted small">현재 장비: {equipmentLabel(plan, manufacturers)}</p>
      <button className="outline" disabled={busy} onClick={() => setWeightOpen(true)}>작업 중량 변경</button>
      <section className="sets-card card" aria-label="본세트 기록">
        <div className="local-set-row set-header"><span>세트</span><span>중량 kg</span><span>이번 반복</span><span>상태</span></div>
        {ordinals.map(ordinal => {
          const record = completed.find(x => x.ordinal === ordinal), draft = state.drafts[slotKey(id, ordinal)] ?? model.draftFor(workout, id, ordinal)
          return <div className={`local-set-row ${record ? 'completed' : 'current'}`} key={slotKey(id, ordinal)}>
            <span>{ordinal}</span><label><span className="sr-only">{ordinal}세트 중량 kg</span><input inputMode="decimal" aria-label={`${ordinal}세트 중량 kg`} value={record?.weightKg ?? draft.weight} disabled={!state.writable || !!workout.finish || !!record} onChange={e => controller.draft(id, ordinal, { ...draft, weight: e.target.value })} /></label>
            <RepsInput ordinal={ordinal} value={record ? String(record.reps) : draft.reps} disabled={!state.writable || !!workout.finish || !!record} onChange={value => controller.draft(id, ordinal, { ...draft, reps: value })} />
            <button className={record ? 'set-check checked' : 'set-check'} disabled={busy || !record && remaining > 0} aria-label={`${ordinal}세트 ${record ? '완료 취소' : '완료'}`} onClick={() => {
              if (record) { if (window.confirm('이 세트의 완료를 취소할까요? 원래 수행 UUID와 삭제 사실은 보존합니다.')) void controller.change(w => model.undoSet(w, record.id)) }
              else void controller.complete(w => model.completeSet(w, id, ordinal, Date.now()))
            }}>{record ? '✓ 완료' : '완료'}</button>{record && <small className="muted local-set-equipment">완료 당시 {equipmentLabel(record, manufacturers)}</small>}
            {(record ? record.loadType : plan.loadType) === 'BODYWEIGHT' && <label className="local-set-equipment">{ordinal}세트 추가 중량 kg · 선택<input inputMode="decimal" aria-label={`${ordinal}세트 추가 중량 kg`} placeholder="추가 중량 없음" value={record ? record.bodyweightLoad?.additionalWeightKg ?? '' : draft.additionalWeight ?? ''} disabled={!state.writable || !!workout.finish || !!record} onChange={e => controller.draft(id, ordinal, { ...draft, additionalWeight: e.target.value })} /><small>총중량에는 추가 중량만 사용합니다. 체중은 포함하지 않습니다.</small></label>}
          </div>
        })}
      </section>
      {end < plan.setCount && <p className="muted small">입력할 세트 주변 20개와 완료 기록을 표시합니다. 다음 미완료 {firstPending}세트부터 계속 기록할 수 있습니다.</p>}
      {remaining > 0 && <aside className="notice" aria-label="휴식 타이머"><p>휴식 {remaining}초 · 목표 반복 구간 ≤10 / 11–12 / ≥13 기준</p><div className="row"><button className="outline" disabled={busy} onClick={() => void controller.change(w => { w.rest = null })}>휴식 종료</button><button className="outline" disabled={busy} onClick={() => void controller.change(w => { if (w.rest) w.rest.endsAt = new Date(Date.parse(w.rest.endsAt) + 30000).toISOString() })}>＋30초</button></div></aside>}
      <button className="outline" disabled={busy || plan.setCount === 2147483647} onClick={() => void controller.change(w => model.updateTargets(w, id, plan.setCount + 1, plan.minReps, plan.maxReps))}>＋ 본세트 추가</button>
    </>}
    {cardio && <LocalCardio key={id} workout={workout} id={id} state={state} controller={controller} now={now} />}
    <button className="quiet full" disabled={busy} onClick={() => setEditing(!editing)}>현재 운동에만 계획 변경</button>
    {editing && <LocalPlanEditor key={id} workout={workout} controller={controller} definitions={definitions} manufacturers={manufacturers} busy={busy} />}
    <details><summary>시작 당시 불변 계획</summary>{workout.initialPlan.weightExercises.map(e => <p key={e.sessionExerciseId}>{e.exerciseName} · {e.setCount}세트 · {e.minReps}~{e.maxReps}회 · 승인 {e.approvedWeightKg} kg</p>)}{workout.initialPlan.cardioActivities.map(c => <p key={c.sessionActivityId}>{c.plan.name} · {c.plan.targetSeconds}초</p>)}</details>
    <p className="muted small">공식 평가와 과거 기준 기록은 서버가 계산합니다. 이 화면은 달성 평가나 자동 증량을 계산하지 않습니다.</p>
    {weightOpen && <WeightDialog workout={workout} id={id} busy={busy} controller={controller} onClose={() => setWeightOpen(false)} />}
    {list && <Dialog title="이번 운동 종목" onClose={() => setList(false)}><div className="stack">{model.exerciseList(workout).map(e => <button key={e.id} className="list-button" disabled={busy} aria-current={e.id === id ? 'step' : undefined} onClick={() => void go(e.id)}>{e.name} · {e.kind === 'WEIGHT' ? '웨이트' : '유산소'}</button>)}</div></Dialog>}
  </>
}
function WeightDialog({ workout, id, busy, controller, onClose }: { workout: LocalWorkout; id: string; busy: boolean; controller: LocalWorkoutController; onClose: () => void }) {
  const [value, setValue] = useState(workout.weights[id]?.value ?? ''), [approve, setApprove] = useState(false)
  const resolving = !!workout.pendingResolution && !workout.pendingResolution.rejected && workout.pendingResolution.request.sessionExerciseId === id
  return <Dialog title="작업 중량 변경" onClose={onClose}><div className="stack"><label>변경 중량 kg<input inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} /></label>
    <label className="radio-option"><input type="radio" name="local-weight-mode" checked={!approve} onChange={() => setApprove(false)} /><span>오늘만 변경</span></label>
    <label className="radio-option"><input type="radio" name="local-weight-mode" checked={approve} disabled={resolving || !workout.initialPlan.weightExercises.some(x => x.sessionExerciseId === id)} onChange={() => setApprove(true)} /><span>다음 운동에도 적용할 승인 요청 저장</span></label>
    <p className="muted small">승인 요청은 이 기기에 보존한 뒤 서버로 전송합니다. 이전 수행 문맥과 최초 계획은 바뀌지 않습니다.</p>
    {resolving && <p className="notice">이 종목의 승인 해결 결과를 확인 중입니다. 오늘만 변경은 계속할 수 있습니다.</p>}
    <button className="primary" disabled={busy || approve && resolving} onClick={async () => { if (await controller.change(w => model.changeWeight(w, id, value, approve, Date.now()))) onClose() }}>{approve ? '명시 승인 요청을 이 기기에 저장' : '오늘만 적용'}</button></div></Dialog>
}
function LocalCardio({ workout, id, state, controller, now }: { workout: LocalWorkout; id: string; state: EditorState; controller: LocalWorkoutController; now: number }) {
  const timer = workout.timers[id] ?? model.emptyTimer(), record = workout.snapshot.cardioResults.find(x => x.sessionActivityId === id)
  const draft = { ...timer, ...state.cardioDrafts[id] }, { distance, speed = '', bpm, correctedSeconds } = draft
  const plan = workout.snapshot.appliedPlan.cardioActivities.find(x => x.sessionActivityId === id)!.plan
  const busy = !state.writable || state.pending > 0 || !!workout.finish
  let timerText: string
  try { timerText = duration(model.elapsed(timer, workout.finish ? Date.parse(workout.finish.endedAt) : now)) } catch (error) { timerText = error instanceof Error ? error.message : '기기 시각 확인 필요' }
  const saveDraft = (patch: Pick<Partial<typeof timer>, 'distance' | 'speed' | 'bpm' | 'correctedSeconds'>) => controller.cardioDraft(id, patch)
  let measurementPreview = ''
  try { measurementPreview = distanceLabel(measuredCardio(speed, distance, correctedSeconds === null ? model.elapsed(timer, now) : Number(correctedSeconds) * 1000)) } catch { /* Keep invalid drafts intact until explicit completion. */ }
  return <div className="stack cardio-content"><div className="exercise-heading"><p className="eyebrow">CARDIO</p><h2>{plan.name}</h2><p className="badge">현재 목표 {plan.targetSeconds}초</p></div>
    <section className="card cardio-clock"><p>실제 활동 시간 · 일시정지 제외</p><strong>{record?.status === 'COMPLETED' ? duration(record.result.activeMs) : timerText}</strong><p>{record ? '이 기기의 완료 기록' : workout.finish ? '종료 선택 시점의 미완료 원본' : timer.runningSince ? '측정 중' : timer.startedAt ? '일시정지' : '시작 전'}</p></section>
    {!record && <><div className="row"><button className="outline" disabled={busy} onClick={() => void controller.change(w => model.timerAction(w, id, timer.runningSince ? 'pause' : 'start', Date.now()))}>{timer.runningSince ? '일시정지' : timer.startedAt ? '재개' : '유산소 시작'}</button>
      {timer.startedAt && !timer.reviewing && <button className="primary" disabled={busy} onClick={() => void controller.change(w => model.reviewCardio(w, id, Date.now()))}>유산소 완료 기록 확인</button>}</div>
      {timer.reviewing && <p className="notice">측정을 멈췄습니다. 원본 타이머와 실제 입력을 확인한 뒤 기록을 확정해 주세요.</p>}
      {['TREADMILL', 'BIKE', 'OUTDOOR'].includes(plan.kind) && <label>실제 거리 km · 선택<input inputMode="decimal" value={distance} disabled={!state.writable || !!workout.finish} onChange={e => saveDraft({ distance: e.target.value })} /></label>}
      {['TREADMILL', 'BIKE', 'OUTDOOR'].includes(plan.kind) && <label>실제 속도 km/h · 선택<input inputMode="decimal" value={speed} disabled={!state.writable || !!workout.finish} onChange={e => saveDraft({ speed: e.target.value })} /></label>}
      {measurementPreview && <p className="muted small">{measurementPreview}</p>}<p className="muted small">직접 입력 거리를 우선합니다. 미입력 시 실제 속도와 활동 시간으로 계산하며 목표 속도는 사용하지 않습니다.</p>
      <label>평균 심박수 BPM · 선택<input inputMode="numeric" value={bpm} disabled={!state.writable || !!workout.finish} onChange={e => saveDraft({ bpm: e.target.value })} /></label>
      <label className="radio-option"><input type="checkbox" disabled={!state.writable || !!workout.finish} checked={correctedSeconds !== null} onChange={e => saveDraft({ correctedSeconds: e.target.checked ? '' : null })} /><span>활동 시간 직접 정정</span></label>
      {correctedSeconds !== null && <label>정정 활동 시간 초<input inputMode="numeric" value={correctedSeconds} disabled={!state.writable || !!workout.finish} onChange={e => saveDraft({ correctedSeconds: e.target.value })} /></label>}
      <p className="muted small">직접 입력 거리 0.001~1000 km · 심박수 20~300 BPM · 정정 시간 1~86400초. 미입력값은 계획에서 만들지 않습니다.</p>
      {timer.reviewing && <><button className="primary" disabled={busy} onClick={() => void controller.complete(w => model.completeCardio(w, id, Date.now()))}>유산소 기록 완료</button><button className="quiet" disabled={busy} onClick={() => void controller.change(w => { w.timers[id].reviewing = false })}>확인 취소 · 일시정지로 돌아가기</button></>}</>}
    {record && <><p className="muted small">원본 타이머 {record.status === 'COMPLETED' ? duration(record.result.timerMs) : '—'} · {record.status === 'COMPLETED' && record.result.corrected ? '시간 정정 있음' : '자동 측정'}</p>{record.status === 'COMPLETED' && <p>{distanceLabel(record.result)}{record.result.measurement?.actualSpeedKmh != null && ` · 실제 속도 ${record.result.measurement.actualSpeedKmh} km/h`}</p>}<button className="outline" disabled={busy} onClick={() => { if (window.confirm('유산소 완료를 취소할까요? 원래 완료 기록과 취소 사실은 보존합니다.')) void controller.change(w => model.undoCardio(w, record.id)) }}>유산소 완료 취소</button></>}
    <p className="muted small">미완료 유산소는 자동으로 건너뜀 처리하지 않습니다.</p>
  </div>
}
const approvalReason: Record<string, string> = { ROUTINE_CHANGED: '다른 곳에서 루틴이 바뀌었습니다.', SOURCE_REMOVED: '원래 루틴 또는 배치가 제거되었습니다.', NO_SOURCE_PLACEMENT: '원래 루틴 배치가 없는 종목입니다.', PREDECESSOR_PENDING: '앞선 승인 요청의 확인이 필요합니다.', PREDECESSOR_NOT_APPLIED: '앞선 승인 요청이 적용되지 않았습니다.' }
function ApprovalControls({ state, controller }: { state: EditorState; controller: LocalWorkoutController }) {
  const workout = state.workout!
  const groups = [...new Set(workout.approvalResults.filter(r => r.status === 'PENDING').map(r => r.sessionExerciseId))]
  return <section className="stack" aria-label="중량 승인 상태">
    {workout.snapshot.approvalRequests.map(request => { const result = workout.approvalResults.find(r => r.id === request.id)
      return <p className="muted small" key={request.id}>{workout.exerciseNames[request.sessionExerciseId] ?? '운동 종목'} · 요청 {request.nextApprovedWeightKg} kg · {result?.status === 'APPLIED' ? '적용됨' : result?.status === 'NOT_APPLIED' ? '적용하지 않음' : result?.status === 'PENDING' ? '승인 확인 필요' : '연결되면 전송'}</p>
    })}
    {groups.map(id => <ApprovalChoice key={id + ':' + workout.approvalResults.filter(r => r.sessionExerciseId === id && r.status === 'PENDING').map(r => r.id).join(':')} state={state} controller={controller} id={id} />)}
  </section>
}
function ApprovalChoice({ state, controller, id }: { state: EditorState; controller: LocalWorkoutController; id: string }) {
  const w = state.workout!, pending = w.approvalResults.filter(r => r.sessionExerciseId === id && r.status === 'PENDING')
  const [value, setValue] = useState(w.snapshot.approvalRequests.filter(r => r.sessionExerciseId === id).at(-1)?.nextApprovedWeightKg ?? '')
  const busy = !state.writable || state.pending > 0 || state.syncStatus === 'SENDING' || !!w.finish
  const canApprove = w.initialPlan.weightExercises.some(e => e.sessionExerciseId === id) && !pending.some(r => r.reason === 'SOURCE_REMOVED' || r.reason === 'NO_SOURCE_PLACEMENT')
  return <section className="card stack"><h3>{w.exerciseNames[id] ?? '운동 종목'} · 승인 확인 필요</h3>
    <p>{approvalReason[pending[0]?.reason ?? ''] ?? '현재 루틴의 승인 중량을 확인해 주세요.'} 실제 수행 기록은 보존되었습니다. 아래 선택은 과거 수행의 승인 문맥을 바꾸지 않습니다.</p>
    <button className="outline" disabled={busy} onClick={() => { if (window.confirm('이 승인 요청들을 적용하지 않고 현재 루틴 중량을 유지할까요?')) void controller.resolveApproval(id, pending.map(r => r.id), 'KEEP_CURRENT', '') }}>현재 루틴 중량 유지</button>
    {canApprove && <><label>지금 다시 승인할 중량 kg<input inputMode="decimal" value={value} disabled={busy} onChange={e => setValue(e.target.value)} /></label><button className="primary" disabled={busy} onClick={() => { if (window.confirm(`${value} kg을 현재 시점의 새 중량으로 명시 승인할까요? 과거 수행에는 소급 적용하지 않습니다.`)) void controller.resolveApproval(id, pending.map(r => r.id), 'REAPPROVE', value) }}>이 중량으로 지금 재승인</button></>}
  </section>
}
function LocalPlanEditor({ workout, controller, definitions, manufacturers, busy }: { workout: LocalWorkout; controller: LocalWorkoutController; definitions: Definition[]; manufacturers: Manufacturer[]; busy: boolean }) {
  const id = workout.currentExerciseId, weight = workout.snapshot.appliedPlan.weightExercises.find(x => x.sessionExerciseId === id), cardio = workout.snapshot.appliedPlan.cardioActivities.find(x => x.sessionActivityId === id)
  const [sets, setSets] = useState(String(weight?.setCount ?? 3)), [min, setMin] = useState(String(weight?.minReps ?? 6)), [max, setMax] = useState(String(weight?.maxReps ?? 10))
  const [seconds, setSeconds] = useState(String(cardio?.plan.targetSeconds ?? 600))
  const [settings, setSettings] = useState<Equipment>(() => ({ manufacturerId: weight?.manufacturerId ?? null, loadType: weight?.loadType ?? null }))
  const [addition, setAddition] = useState<Equipment>({ manufacturerId: null, loadType: null })
  const [cardioName, setCardioName] = useState(''), [cardioKind, setCardioKind] = useState<'TREADMILL' | 'BIKE' | 'OUTDOOR' | 'STAIRS' | 'OTHER'>('OTHER'), [newSeconds, setNewSeconds] = useState('600')
  return <section className="card stack" aria-label="현재 적용 계획 편집"><p className="muted small">이번 운동의 계획만 바꿉니다. 최초 계획·원래 루틴·완료 수행은 보존합니다. 완료 수행이 있는 종목은 먼저 완료 취소해야 제외할 수 있습니다.</p>
    {weight && <><label>계획 세트 수<input inputMode="numeric" value={sets} onChange={e => setSets(e.target.value)} /></label><div className="row"><label>목표 최소 반복<input inputMode="numeric" value={min} onChange={e => setMin(e.target.value)} /></label><label>목표 최대 반복<input inputMode="numeric" value={max} onChange={e => setMax(e.target.value)} /></label></div><button className="outline" disabled={busy} onClick={() => void controller.change(w => model.updateTargets(w, id, countDraft(sets), countDraft(min), countDraft(max)))}>현재 목표 적용</button></>}
    {weight && <><EquipmentFields value={settings} manufacturers={manufacturers} onChange={setSettings} disabled={busy} /><button className="outline" disabled={busy} onClick={() => void controller.change(w => model.changeEquipment(w, id, settings))}>현재 장비 적용</button><p className="muted small">이후 완료하는 세트에만 적용합니다. 완료 기록과 중량 승인은 유지합니다.</p></>}
    {cardio && <><label>유산소 목표 시간 초<input inputMode="numeric" value={seconds} onChange={e => setSeconds(e.target.value)} /></label><button className="outline" disabled={busy} onClick={() => void controller.change(w => model.updateCardioPlan(w, id, { ...cardio.plan, targetSeconds: countDraft(seconds) }))}>현재 유산소 목표 적용</button></>}
    <button className="quiet danger" disabled={busy} onClick={() => void controller.change(w => model.removeExercise(w, id))}>현재 종목 제외</button>
    <EquipmentFields value={addition} manufacturers={manufacturers} onChange={setAddition} disabled={busy} />
    <ExerciseSearch exercises={definitions} disabled={busy} onSelect={exercise => void controller.change(w => model.addWeight(w, exercise.id, exercise.name, undefined, addition))} />
    <label>추가 유산소 이름<input value={cardioName} onChange={e => setCardioName(e.target.value)} /></label>
    <label>추가 유산소 종류<select value={cardioKind} onChange={e => { const value = e.target.value; if (value === 'TREADMILL' || value === 'BIKE' || value === 'OUTDOOR' || value === 'STAIRS' || value === 'OTHER') setCardioKind(value) }}><option value="TREADMILL">러닝머신</option><option value="BIKE">자전거</option><option value="OUTDOOR">야외</option><option value="STAIRS">계단</option><option value="OTHER">기타</option></select></label>
    <label>추가 유산소 목표 초<input inputMode="numeric" value={newSeconds} onChange={e => setNewSeconds(e.target.value)} /></label>
    <button className="outline" disabled={busy} onClick={() => void controller.change(w => model.addCardio(w, { kind: cardioKind, name: cardioName, targetSeconds: countDraft(newSeconds), targetDistanceKm: null, intensity: null, inclinePercent: null, resistance: null }))}>＋ 오늘만 유산소 추가</button>
  </section>
}
