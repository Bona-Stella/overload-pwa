import { useEffect, useState, useSyncExternalStore } from 'react'
import { Dialog } from '../../components/Dialog.tsx'
import { RepsInput } from '../../components/RepsInput.tsx'
import { WorkoutStore } from '../workout-online/storage.ts'
import type { Session } from '../workout-online/types.ts'
import { countDraft } from '../workout-online/validation.ts'
import { LocalWorkoutController } from './controller.ts'
import type { EditorState } from './controller.ts'
import type { ExitGuardRegistration, LocalWorkout, RestPolicy } from './types.ts'
import { slotKey } from './types.ts'
import * as model from './model.ts'
import './local.css'

const duration = (ms: number) => { const seconds = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }
type Definition = { id: string; name: string }
export function LocalWorkoutScreen({ server, policy, definitions, authorized, localOnly = false, onExitGuard }: {
  server: Session; policy: RestPolicy; definitions: Definition[]; authorized: () => boolean; localOnly?: boolean; onExitGuard?: ExitGuardRegistration
}) {
  const [store] = useState(() => new WorkoutStore())
  const [controller] = useState(() => new LocalWorkoutController(store, authorized))
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  useEffect(() => {
    void controller.open(server, policy)
    return () => { controller.stop(); void controller.settled().then(() => { if (controller.isStopped()) return store.close() }) }
    // The parent keys this component by the server version and writer identity.
  }, [controller, store, server, policy])
  useEffect(() => { onExitGuard?.(controller.flushDrafts); return () => onExitGuard?.(null) }, [controller, onExitGuard])
  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => { if (state.pending || state.unsavedDrafts) event.preventDefault() }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [state.pending, state.unsavedDrafts])
  return <section className="local-workout stack" aria-label="실제 운동 로컬 기록">
    <p className="notice warning">이 단계의 수행 기록은 이 브라우저에만 저장됩니다. 서버 동기화·운동 종료는 아직 지원하지 않습니다. 저장소를 삭제하면 미전송 기록이 사라질 수 있습니다.</p>
    {localOnly && <p className="notice">인증 확인이 필요합니다. 이미 열어 둔 같은 계정의 운동만 로컬에 계속 기록할 수 있습니다. 서버 요청은 중단되었습니다. 같은 계정으로 다시 로그인해 주세요.</p>}
    {state.loading && <p role="status">로컬 운동과 편집 잠금을 확인하고 있습니다.</p>}
    {state.issue && <p className="notice error" role="alert">{state.issue}</p>}
    {state.unsavedDrafts && <p className="notice" role="status">입력 초안을 저장 중이거나 저장하지 못했습니다. 화면의 입력을 유지합니다.{!state.pending && <button className="outline" onClick={() => void controller.retryDrafts()}>입력 다시 저장</button>}</p>}
    {state.workout && <LocalWorkoutView state={state} controller={controller} definitions={definitions} />}
  </section>
}
export function LocalWorkoutView({ state, controller, definitions }: { state: EditorState; controller: LocalWorkoutController; definitions: Definition[] }) {
  const [now, setNow] = useState(() => Date.now())
  const [list, setList] = useState(false), [editing, setEditing] = useState(false), [weightOpen, setWeightOpen] = useState(false)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(timer) }, [])
  const workout = state.workout
  if (!workout) return null
  const id = workout.currentExerciseId, plan = workout.snapshot.appliedPlan.weightExercises.find(x => x.sessionExerciseId === id)
  const cardio = workout.snapshot.appliedPlan.cardioActivities.find(x => x.sessionActivityId === id)
  const completed = workout.snapshot.performedSets.filter(x => x.sessionExerciseId === id).sort((a, b) => a.ordinal - b.ordinal)
  const remaining = model.restRemaining(workout, now), busy = !state.writable || state.pending > 0
  const go = async (target: string) => { if (await controller.change(w => { w.currentExerciseId = target })) { setList(false); setEditing(false); window.scrollTo(0, 0) } }
  // Window only the planned slots. Backend INTEGER counts must never allocate a billion DOM rows.
  const firstPending = (() => { const occupied = new Set(completed.map(x => x.ordinal)); let n = 1; while (occupied.has(n)) n++; return n })()
  const start = Math.max(1, firstPending - 3), end = Math.min(Math.max(plan?.setCount ?? 0, completed.at(-1)?.ordinal ?? 0), start + 19)
  const ordinals = [...new Set([...completed.map(x => x.ordinal), ...Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i)])].sort((a, b) => a - b)
  return <>
    <header className="timer-bar"><div><span>전체 운동 시간</span><strong>{duration(now - Date.parse(workout.startedAt))}</strong></div><div><span>휴식 남은 시간</span><strong>{duration(remaining * 1000)}</strong></div></header>
    <div className="section-heading"><span className="muted small">{workout.initialPlan.routineName}</span><button className="outline" onClick={() => setList(true)}>종목 목록</button></div>
    <p className="muted small" role="status">{state.writable ? state.issue ? '저장 오류 · 최근 변경 미확정' : state.pending ? '이 기기에 저장 중…' : state.unsavedDrafts ? '저장하지 못한 입력 있음' : '이 기기에 저장됨' : '읽기 전용'} · 로컬 revision {workout.localRevision} · {workout.syncState === 'CLEAN' ? '서버 확인 기준에서 로컬 운동 준비' : workout.syncState === 'UNKNOWN' ? '서버 반영 여부 확인 필요' : '서버 미전송 변경 있음'}</p>
    {plan && <>
      <div className="exercise-heading"><p className="eyebrow">WORKING SETS</p><h2>{workout.exerciseNames[id] ?? '추가된 세션 종목'}</h2><span className="badge">현재 계획 {plan.setCount}세트 · {plan.minReps}~{plan.maxReps}회</span></div>
      <p className="muted small">현재 작업 중량 {workout.weights[id]?.value} kg · 완료 시 실제 입력값을 저장합니다. 계획과 다른 중량 입력은 오늘만 수행입니다.</p>
      <button className="outline" disabled={busy} onClick={() => setWeightOpen(true)}>작업 중량 변경</button>
      <section className="sets-card card" aria-label="본세트 기록">
        <div className="local-set-row set-header"><span>세트</span><span>중량 kg</span><span>이번 반복</span><span>상태</span></div>
        {ordinals.map(ordinal => {
          const record = completed.find(x => x.ordinal === ordinal), draft = state.drafts[slotKey(id, ordinal)] ?? model.draftFor(workout, id, ordinal)
          return <div className={`local-set-row ${record ? 'completed' : 'current'}`} key={slotKey(id, ordinal)}>
            <span>{ordinal}</span><label><span className="sr-only">{ordinal}세트 중량 kg</span><input inputMode="decimal" aria-label={`${ordinal}세트 중량 kg`} value={record?.weightKg ?? draft.weight} disabled={!state.writable || !!record} onChange={e => controller.draft(id, ordinal, { ...draft, weight: e.target.value })} /></label>
            <RepsInput ordinal={ordinal} value={record ? String(record.reps) : draft.reps} disabled={!state.writable || !!record} onChange={value => controller.draft(id, ordinal, { ...draft, reps: value })} />
            <button className={record ? 'set-check checked' : 'set-check'} disabled={busy || !record && remaining > 0} aria-label={`${ordinal}세트 ${record ? '완료 취소' : '완료'}`} onClick={() => {
              if (record) { if (window.confirm('이 세트의 완료를 취소할까요? 원래 수행 UUID와 삭제 사실은 보존합니다.')) void controller.change(w => model.undoSet(w, record.id)) }
              else void controller.complete(w => model.completeSet(w, id, ordinal, Date.now()))
            }}>{record ? '✓ 완료' : '완료'}</button>
          </div>
        })}
      </section>
      {end < plan.setCount && <p className="muted small">입력할 세트 주변 20개와 완료 기록을 표시합니다. 다음 미완료 {firstPending}세트부터 계속 기록할 수 있습니다.</p>}
      {remaining > 0 && <aside className="notice" aria-label="휴식 타이머"><p>휴식 {remaining}초 · 목표 반복 구간 ≤10 / 11–12 / ≥13 기준</p><div className="row"><button className="outline" disabled={busy} onClick={() => void controller.change(w => { w.rest = null })}>휴식 종료</button><button className="outline" disabled={busy} onClick={() => void controller.change(w => { if (w.rest) w.rest.endsAt = new Date(Date.parse(w.rest.endsAt) + 30000).toISOString() })}>＋30초</button></div></aside>}
      <button className="outline" disabled={busy || plan.setCount === 2147483647} onClick={() => void controller.change(w => model.updateTargets(w, id, plan.setCount + 1, plan.minReps, plan.maxReps))}>＋ 본세트 추가</button>
    </>}
    {cardio && <LocalCardio key={id} workout={workout} id={id} state={state} controller={controller} now={now} />}
    <button className="quiet full" disabled={!state.writable} onClick={() => setEditing(!editing)}>현재 운동에만 계획 변경</button>
    {editing && <LocalPlanEditor key={id} workout={workout} controller={controller} definitions={definitions} busy={busy} />}
    <details><summary>시작 당시 불변 계획</summary>{workout.initialPlan.weightExercises.map(e => <p key={e.sessionExerciseId}>{e.exerciseName} · {e.setCount}세트 · {e.minReps}~{e.maxReps}회 · 승인 {e.approvedWeightKg} kg</p>)}{workout.initialPlan.cardioActivities.map(c => <p key={c.sessionActivityId}>{c.plan.name} · {c.plan.targetSeconds}초</p>)}</details>
    <p className="muted small">공식 평가와 과거 기준 기록은 서버가 계산합니다. 이 화면은 달성 평가나 자동 증량을 계산하지 않습니다.</p>
    {weightOpen && <WeightDialog workout={workout} id={id} busy={busy} controller={controller} onClose={() => setWeightOpen(false)} />}
    {list && <Dialog title="이번 운동 종목" onClose={() => setList(false)}><div className="stack">{model.exerciseList(workout).map(e => <button key={e.id} className="list-button" disabled={busy} aria-current={e.id === id ? 'step' : undefined} onClick={() => void go(e.id)}>{e.name} · {e.kind === 'WEIGHT' ? '웨이트' : '유산소'}</button>)}</div></Dialog>}
  </>
}
function WeightDialog({ workout, id, busy, controller, onClose }: { workout: LocalWorkout; id: string; busy: boolean; controller: LocalWorkoutController; onClose: () => void }) {
  const [value, setValue] = useState(workout.weights[id]?.value ?? ''), [approve, setApprove] = useState(false)
  return <Dialog title="작업 중량 변경" onClose={onClose}><div className="stack"><label>변경 중량 kg<input inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} /></label>
    <label className="radio-option"><input type="radio" name="local-weight-mode" checked={!approve} onChange={() => setApprove(false)} /><span>오늘만 변경</span></label>
    <label className="radio-option"><input type="radio" name="local-weight-mode" checked={approve} disabled={!workout.initialPlan.weightExercises.some(x => x.sessionExerciseId === id)} onChange={() => setApprove(true)} /><span>다음 운동에도 적용할 승인 요청 저장</span></label>
    <p className="muted small">승인 요청은 아직 서버에 전송하지 않습니다. 이전 수행 문맥과 최초 계획은 바뀌지 않습니다.</p>
    <button className="primary" disabled={busy} onClick={async () => { if (await controller.change(w => model.changeWeight(w, id, value, approve, Date.now()))) onClose() }}>{approve ? '명시 승인 요청을 이 기기에 저장' : '오늘만 적용'}</button></div></Dialog>
}
function LocalCardio({ workout, id, state, controller, now }: { workout: LocalWorkout; id: string; state: EditorState; controller: LocalWorkoutController; now: number }) {
  const timer = workout.timers[id] ?? model.emptyTimer(), record = workout.snapshot.cardioResults.find(x => x.sessionActivityId === id)
  const draft = { ...timer, ...state.cardioDrafts[id] }, { distance, bpm, correctedSeconds } = draft
  const plan = workout.snapshot.appliedPlan.cardioActivities.find(x => x.sessionActivityId === id)!.plan
  const busy = !state.writable || state.pending > 0
  let timerText: string
  try { timerText = duration(model.elapsed(timer, now)) } catch (error) { timerText = error instanceof Error ? error.message : '기기 시각 확인 필요' }
  const saveDraft = (patch: Pick<Partial<typeof timer>, 'distance' | 'bpm' | 'correctedSeconds'>) => controller.cardioDraft(id, patch)
  return <div className="stack cardio-content"><div className="exercise-heading"><p className="eyebrow">CARDIO</p><h2>{plan.name}</h2><p className="badge">현재 목표 {plan.targetSeconds}초</p></div>
    <section className="card cardio-clock"><p>실제 활동 시간 · 일시정지 제외</p><strong>{record?.status === 'COMPLETED' ? duration(record.result.activeMs) : timerText}</strong><p>{record ? '이 기기의 완료 기록' : timer.runningSince ? '측정 중' : timer.startedAt ? '일시정지' : '시작 전'}</p></section>
    {!record && <><div className="row"><button className="outline" disabled={busy} onClick={() => void controller.change(w => model.timerAction(w, id, timer.runningSince ? 'pause' : 'start', Date.now()))}>{timer.runningSince ? '일시정지' : timer.startedAt ? '재개' : '유산소 시작'}</button>
      {timer.startedAt && !timer.reviewing && <button className="primary" disabled={busy} onClick={() => void controller.change(w => model.reviewCardio(w, id, Date.now()))}>유산소 완료 기록 확인</button>}</div>
      {timer.reviewing && <p className="notice">측정을 멈췄습니다. 원본 타이머와 실제 입력을 확인한 뒤 기록을 확정해 주세요.</p>}
      {['TREADMILL', 'BIKE', 'OUTDOOR'].includes(plan.kind) && <label>실제 거리 km · 선택<input inputMode="decimal" value={distance} disabled={!state.writable} onChange={e => saveDraft({ distance: e.target.value })} /></label>}
      <label>평균 심박수 BPM · 선택<input inputMode="numeric" value={bpm} disabled={!state.writable} onChange={e => saveDraft({ bpm: e.target.value })} /></label>
      <label className="radio-option"><input type="checkbox" disabled={!state.writable} checked={correctedSeconds !== null} onChange={e => saveDraft({ correctedSeconds: e.target.checked ? '' : null })} /><span>활동 시간 직접 정정</span></label>
      {correctedSeconds !== null && <label>정정 활동 시간 초<input inputMode="numeric" value={correctedSeconds} disabled={!state.writable} onChange={e => saveDraft({ correctedSeconds: e.target.value })} /></label>}
      <p className="muted small">거리 0.001~1000 km · 심박수 20~300 BPM · 정정 시간 1~86400초. 미입력값은 계획에서 만들지 않습니다.</p>
      {timer.reviewing && <><button className="primary" disabled={busy} onClick={() => void controller.complete(w => model.completeCardio(w, id, Date.now()))}>유산소 기록 완료</button><button className="quiet" disabled={busy} onClick={() => void controller.change(w => { w.timers[id].reviewing = false })}>확인 취소 · 일시정지로 돌아가기</button></>}</>}
    {record && <><p className="muted small">원본 타이머 {record.status === 'COMPLETED' ? record.result.timerMs : '—'} ms · {record.status === 'COMPLETED' && record.result.corrected ? '시간 정정 있음' : '자동 측정'} · 서버에 전송하지 않음</p><button className="outline" disabled={busy} onClick={() => { if (window.confirm('유산소 완료를 취소할까요? 재완료 시 새 수행 UUID를 사용합니다.')) void controller.change(w => model.undoCardio(w, record.id)) }}>유산소 완료 취소</button></>}
    <p className="muted small">미완료 유산소는 자동으로 건너뜀 처리하지 않습니다.</p>
  </div>
}
function LocalPlanEditor({ workout, controller, definitions, busy }: { workout: LocalWorkout; controller: LocalWorkoutController; definitions: Definition[]; busy: boolean }) {
  const id = workout.currentExerciseId, weight = workout.snapshot.appliedPlan.weightExercises.find(x => x.sessionExerciseId === id), cardio = workout.snapshot.appliedPlan.cardioActivities.find(x => x.sessionActivityId === id)
  const [sets, setSets] = useState(String(weight?.setCount ?? 3)), [min, setMin] = useState(String(weight?.minReps ?? 6)), [max, setMax] = useState(String(weight?.maxReps ?? 10))
  const [seconds, setSeconds] = useState(String(cardio?.plan.targetSeconds ?? 600)), [definition, setDefinition] = useState(definitions[0]?.id ?? '')
  const [cardioName, setCardioName] = useState(''), [cardioKind, setCardioKind] = useState<'TREADMILL' | 'BIKE' | 'OUTDOOR' | 'STAIRS' | 'OTHER'>('OTHER'), [newSeconds, setNewSeconds] = useState('600')
  return <section className="card stack" aria-label="현재 적용 계획 편집"><p className="muted small">이번 운동의 계획만 바꿉니다. 최초 계획·원래 루틴·완료 수행은 보존합니다. 완료 수행이 있는 종목은 먼저 완료 취소해야 제외할 수 있습니다.</p>
    {weight && <><label>계획 세트 수<input inputMode="numeric" value={sets} onChange={e => setSets(e.target.value)} /></label><div className="row"><label>목표 최소 반복<input inputMode="numeric" value={min} onChange={e => setMin(e.target.value)} /></label><label>목표 최대 반복<input inputMode="numeric" value={max} onChange={e => setMax(e.target.value)} /></label></div><button className="outline" disabled={busy} onClick={() => void controller.change(w => model.updateTargets(w, id, countDraft(sets), countDraft(min), countDraft(max)))}>현재 목표 적용</button></>}
    {cardio && <><label>유산소 목표 시간 초<input inputMode="numeric" value={seconds} onChange={e => setSeconds(e.target.value)} /></label><button className="outline" disabled={busy} onClick={() => void controller.change(w => model.updateCardioPlan(w, id, { ...cardio.plan, targetSeconds: countDraft(seconds) }))}>현재 유산소 목표 적용</button></>}
    <button className="quiet danger" disabled={busy} onClick={() => void controller.change(w => model.removeExercise(w, id))}>현재 종목 제외</button>
    <label>추가할 내 종목<select value={definition} onChange={e => setDefinition(e.target.value)}>{definitions.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label>
    <button className="outline" disabled={busy || !definition} onClick={() => void controller.change(w => { const d = definitions.find(x => x.id === definition); if (d) model.addWeight(w, d.id, d.name) })}>＋ 오늘만 웨이트 종목 추가</button>
    <label>추가 유산소 이름<input value={cardioName} onChange={e => setCardioName(e.target.value)} /></label>
    <label>추가 유산소 종류<select value={cardioKind} onChange={e => { const value = e.target.value; if (value === 'TREADMILL' || value === 'BIKE' || value === 'OUTDOOR' || value === 'STAIRS' || value === 'OTHER') setCardioKind(value) }}><option value="TREADMILL">러닝머신</option><option value="BIKE">자전거</option><option value="OUTDOOR">야외</option><option value="STAIRS">계단</option><option value="OTHER">기타</option></select></label>
    <label>추가 유산소 목표 초<input inputMode="numeric" value={newSeconds} onChange={e => setNewSeconds(e.target.value)} /></label>
    <button className="outline" disabled={busy} onClick={() => void controller.change(w => model.addCardio(w, { kind: cardioKind, name: cardioName, targetSeconds: countDraft(newSeconds), targetDistanceKm: null, intensity: null, inclinePercent: null, resistance: null }))}>＋ 오늘만 유산소 추가</button>
  </section>
}
