import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog } from '../../components/Dialog.tsx'
import { WorkoutApi } from './api.ts'
import { WorkoutStore } from './storage.ts'
import { ClosedWorkoutController } from './closed-controller.ts'
import type { ClosedState } from './closed-controller.ts'
import type { CardioResult, ChangeEvents, ClosedPage, CompletionAssessment, PerformedSet, RecordEdit, Scope, Session } from './types.ts'
import { countDraft, decimalDraft } from './validation.ts'
import { recoveryRows, RECOVERY_LABEL } from './closed-model.ts'
import { onlineIssue } from './controller.ts'

const time = (value: string | null) => value ? new Date(value).toLocaleString('ko-KR') : '없음'
const performance = (record: PerformedSet | CardioResult) => 'ordinal' in record
  ? `${record.ordinal}세트 · ${record.weightKg} kg × ${record.reps}회 · ${time(record.completedAt)}`
  : record.status === 'COMPLETED' ? `${record.result.activeMs / 1000}초 · 거리 ${record.result.distanceKm ?? '미입력'} km · ${time(record.occurredAt)}` : '명시 건너뜀'
const reason: Record<string, string> = { PENDING: '승인 확인 필요', UNVERIFIED: '승인 문맥 확인 불가', AUTO_CLOSED: '서버 자동 종료', SESSION_DELETED: '삭제된 운동', NO_APPROVED_CONTEXT: '수행 당시 승인 문맥 미충족', INCOMPLETE_INITIAL_WEIGHT_PLAN: '최초 웨이트 계획 미완료', INSUFFICIENT_PERFORMED_SETS: '유효 수행 부족', TEMPORARY_WEIGHT: '오늘만 중량', MIXED_WEIGHT: '서로 다른 중량', SET_COUNT_MISMATCH: '최초 세트 수와 다름', INITIAL_EXERCISE_REMOVED: '최초 종목 제외', COMPARISON_CONTEXT_MISMATCH: '최초 목표와 다름' }
const advice = { INCREASE: '증량 검토', DECREASE: '감량 검토', MAINTAIN: '유지 검토', UNAVAILABLE: '평가 자격 없음' }
function ChangeEntry({ event: e }: { event: ChangeEvents['events'][number] }) {
  const summary = (value: Record<string, unknown> | null) => {
    if (!value) return ''
    if (typeof value.weightKg === 'string' && typeof value.reps === 'number') return `${value.ordinal}세트 · ${value.weightKg} kg × ${value.reps}회`
    const r = value.result as Extract<CardioResult, { status: 'COMPLETED' }>['result'] | null
    return r && typeof r.activeMs === 'number' ? `${r.activeMs / 1000}초 · 거리 ${r.distanceKm ?? '미입력'} km · 심박수 ${r.averageBpm ?? '미입력'}` : ''
  }
  return <div><p>{e.recordKind === 'SET' ? '세트' : e.recordKind === 'CARDIO' ? '유산소' : '운동'} · {e.changeKind === 'CORRECTED' ? '수치 정정' : e.changeKind === 'RECOVERED' ? '누락 수행 복구' : '논리 삭제'} · {time(e.recordedAt)}{!!e.changeContext?.claimedWeightContext && <span> · 원래 승인 문맥 보존</span>}</p>
    {e.before && summary(e.before) && <p className="muted small">변경 전 {summary(e.before)}</p>}{e.after && summary(e.after) && <p className="muted small">변경 후 {summary(e.after)}</p>}</div>
}
function Evaluation({ value, title }: { value: CompletionAssessment | null; title: string }) {
  return <section className="stack"><h3>{title}</h3>{!value ? <p>최초 명시 종료 평가가 없습니다.</p> : <>
    <p>웨이트 최초 계획 {value.overallWeightPlanComplete === null ? '해당 없음' : value.overallWeightPlanComplete ? '완료' : '미완료'}</p>
    {value.exercises.map(e => <p key={e.sessionExerciseId}>{advice[e.advice]}{e.reasonCodes.length ? ' · ' + e.reasonCodes.map(r => reason[r] ?? '평가 조건 미충족').join(', ') : ''} · 선택 수행 반복 합계 {e.repsSum}회</p>)}
    <p className="muted small">서버의 판단 안내입니다. 중량을 자동으로 변경하지 않습니다.</p></>}</section>
}
export function WorkoutHistory({ api, scope, onOpen, refreshKey, onInvalid }: { api: WorkoutApi; scope: Scope; onOpen: (id: string) => void; refreshKey: string; onInvalid?: (error: unknown) => void }) {
  const [page, setPage] = useState<ClosedPage | null>(null), [busy, setBusy] = useState(true), [issue, setIssue] = useState<string | null>(null)
  const flight = useRef<AbortController | null>(null)
  const { userId, dataGeneration } = scope
  const failure = useCallback((error: unknown) => {
    setPage(null); setIssue(onlineIssue(error))
    if (['DATA_GENERATION_MISMATCH','OWNER_MISMATCH','SESSION_CHANGED'].includes((error as { code?: string }).code ?? '')) onInvalid?.(error)
  }, [onInvalid])
  const load = useCallback(async (cursor: ClosedPage['next'] = null) => {
    flight.current?.abort(); const abort = new AbortController(); flight.current = abort
    await Promise.resolve(); if (abort.signal.aborted) return
    setBusy(true); setIssue(null)
    try { const next = await api.closed({ userId, dataGeneration }, cursor, abort.signal); if (!abort.signal.aborted) setPage(previous => cursor && previous ? { ...next, sessions: [...previous.sessions, ...next.sessions.filter(s => !previous.sessions.some(p => p.id === s.id))] } : next) }
    catch (error) { if (!abort.signal.aborted) failure(error) } finally { if (!abort.signal.aborted) setBusy(false) }
  }, [api, userId, dataGeneration, failure])
  useEffect(() => {
    const abort = new AbortController(); flight.current?.abort(); flight.current = abort
    void api.closed({ userId, dataGeneration }, null, abort.signal).then(next => { if (!abort.signal.aborted) { setPage(next); setIssue(null) } })
      .catch(error => { if (!abort.signal.aborted) failure(error) }).finally(() => { if (!abort.signal.aborted) setBusy(false) })
    return () => abort.abort()
  }, [api, userId, dataGeneration, refreshKey, failure])
  return <section className="card stack" aria-label="종료 운동 이력"><div className="section-heading"><h2>종료 운동 이력</h2><button className="quiet" disabled={busy} onClick={() => void load()}>이력 다시 조회</button></div>
    {issue && <p className="notice" role="alert">{issue}</p>}{busy && <p role="status">이력을 확인 중입니다.</p>}
    {page?.sessions.length === 0 && <p>종료한 운동이 없습니다.</p>}
    {page?.sessions.map(s => <button className="outline full" key={s.id} disabled={busy} onClick={() => onOpen(s.id)}>{s.routineName} · {s.workoutDate} · {s.deletedAt ? '삭제된 운동' : s.status === 'FINISHED' ? '명시 종료 ' + time(s.endedAt) : '서버 자동 종료 ' + time(s.closedAt)}</button>)}
    {page?.next && <button className="outline" disabled={busy} onClick={() => void load(page.next)}>이전 운동 더 보기</button>}
  </section>
}
export function ClosedWorkout({ api, session, authorized, onServer, onInvalid }: { api: WorkoutApi; session: Session; authorized: () => boolean; onServer: (server: Session) => void; onInvalid?: (error: unknown) => void }) {
  const [initial] = useState(() => ({ session, authorized, onServer, onInvalid })) // The parent keys this panel by account/generation/session, not version.
  const [view, setView] = useState<{ controller: ClosedWorkoutController; state: ClosedState } | null>(null)
  useEffect(() => {
    const store = new WorkoutStore(), c = new ClosedWorkoutController(api, store, initial.session, initial.session.id, initial.authorized, initial.onServer, undefined, initial.onInvalid)
    const unsubscribe = c.subscribe(() => setView({ controller: c, state: c.getSnapshot() }))
    void c.open()
    return () => { unsubscribe(); c.stop(); void store.close() }
  }, [api, initial])
  return view ? <ClosedWorkoutView {...view} /> : <p role="status">종료 기록을 확인 중입니다.</p>
}
type EditTarget = { kind: 'SET'; record: PerformedSet } | { kind: 'CARDIO'; record: Extract<CardioResult, { status: 'COMPLETED' }> } | { kind: 'SKIPPED'; record: Extract<CardioResult, { status: 'SKIPPED' }> }
export function ClosedWorkoutView({ state, controller }: { state: ClosedState; controller: ClosedWorkoutController }) {
  const [dialog, setDialog] = useState<'delete' | 'recovery' | EditTarget | null>(null)
  const server = state.server, disabled = state.busy || !state.writable || !!server?.deletedAt || state.pending?.status === 'PENDING'
  if (!server) return <section className="card stack">{state.issue && <p role="alert">{state.issue}</p>}<button className="outline" disabled={state.busy} onClick={() => void controller.refresh()}>종료 기록 다시 확인</button></section>
  const name = (id: string) => server.initialPlan.weightExercises.find(e => e.sessionExerciseId === id)?.exerciseName ?? server.initialPlan.cardioActivities.find(e => e.sessionActivityId === id)?.plan.name ?? '추가된 운동'
  return <section className="stack closed-workout" aria-label="종료 운동 기록">
    <section className="card stack"><h2>{server.initialPlan.routineName} · {server.status === 'AUTO_CLOSED' ? '서버 자동 종료' : '명시 종료'}</h2>
      <p>운동 시작 {time(server.startedAt)} · 실제 운동 종료 {time(server.endedAt)}</p><p className="muted small">서버 종료 확정 {time(server.closedAt)}</p>
      {server.status === 'AUTO_CLOSED' && <p className="notice">사용자가 명시 종료한 운동이 아닙니다. 최초 종료 평가와 실제 종료 시각은 없습니다. 누락 완료 수행만 선택하여 복구할 수 있습니다.</p>}
      {server.deletedAt && <p className="notice">삭제된 운동 · {time(server.deletedAt)}. 자동 전송·정정·복구가 차단됩니다.</p>}
      {!state.writable && <p className="notice">읽기 전용</p>}{state.issue && <p role="alert" className="notice error">{state.issue}</p>}{state.notice && <p role="status" className="notice">{state.notice}</p>}
      <button className="outline" disabled={state.busy} onClick={() => void controller.refresh()}>종료 기록 다시 확인</button>
      {state.pending?.status === 'PENDING' && <div className="stack"><p>서버 처리 결과 확인 필요 · 원래 입력과 요청을 보존했습니다. 새 요청으로 자동 대체하지 않습니다.</p><button className="outline" disabled={state.busy || !state.writable || !!server.deletedAt} onClick={() => void controller.retry()}>같은 요청 다시 확인</button><button className="quiet" disabled={state.busy || !state.writable} onClick={() => { if (window.confirm('현재 서버 기록과 변경 이력을 확인했나요? 이전 요청을 성공으로 단정하지 않고, 이후 변경은 새로 선택합니다.')) void controller.reviewed() }}>현재 기록 검토 완료</button></div>}
      {!server.deletedAt && state.copies.filter(c => c.finish?.request && !c.finish.ack).map((c, i) => <button className="outline" key={i} disabled={state.busy || !state.writable || server.status !== 'FINISHED' || c.writerEpoch !== server.writerEpoch || c.editorDeviceId !== server.editorDeviceId} onClick={() => void controller.confirmFinish(c)}>미확인 종료 요청 결과 확인</button>)}
    </section>
    {!server.deletedAt && <>
      <section className="card stack"><h3>완료 수행</h3>{server.snapshot.state.performedSets.map(s => <div key={s.id}><p>{name(s.sessionExerciseId)} · {s.ordinal}세트 · {s.weightKg} kg × {s.reps}회 · {time(s.completedAt)}</p><p className="muted small">수행 당시 승인: {reason[server.snapshot.recordedContexts.find(c => c.setId === s.id)?.approvalStateAtRecording ?? ''] ?? '서버 확인 문맥'}</p><button className="outline" disabled={disabled} onClick={() => setDialog({ kind: 'SET', record: s })}>세트 정정·삭제</button></div>)}
        {server.snapshot.state.cardioResults.map(r => <div key={r.id}><p>{name(r.sessionActivityId)} · {r.status === 'SKIPPED' ? '명시 건너뜀' : `${r.result.activeMs / 1000}초 · 거리 ${r.result.distanceKm ?? '미입력'} km · 심박수 ${r.result.averageBpm ?? '미입력'}`}</p>{r.status === 'COMPLETED' ? <button className="outline" disabled={disabled} onClick={() => setDialog({ kind: 'CARDIO', record: r })}>유산소 정정·삭제</button> : <button className="outline" disabled={disabled} onClick={() => setDialog({ kind: 'SKIPPED', record: r })}>건너뜀 기록 삭제</button>}</div>)}
        <button className="outline" disabled={disabled || !state.copies.length} onClick={() => setDialog('recovery')}>이 기기의 누락 완료 수행 비교·복구</button>
      </section>
      <section className="card stack"><Evaluation value={state.assessment?.completionAssessment ?? null} title="최초 종료 평가 · 변경되지 않음" /><Evaluation value={state.assessment?.currentAssessment.evaluation ?? null} title="현재 기록 기준 평가 · 서버 재계산" />
        {state.assessment?.currentAssessment.state === 'EXCLUDED' && <p>현재 평가 자격 없음 · {state.assessment.currentAssessment.reasonCodes.map(r => reason[r] ?? '평가 조건 미충족').join(', ')}</p>}</section>
      {[...new Set(server.snapshot.approvalResults.filter(r => r.status === 'PENDING').map(r => r.sessionExerciseId))].map(id => <ClosedApproval key={id} server={server} id={id} controller={controller} disabled={disabled} />)}
      <button className="outline" disabled={disabled} onClick={() => setDialog('delete')}>운동 전체 논리 삭제</button>
    </>}
    <details className="card"><summary>기록 변경 이력</summary>{state.changes?.events.map(e => <ChangeEntry key={e.id} event={e} />)}{!state.changes?.events.length && <p>변경 이력이 없습니다.</p>}</details>
    {dialog === 'delete' && <DeleteDialog server={server} controller={controller} busy={state.busy} onClose={() => setDialog(null)} />}
    {dialog === 'recovery' && state.changes && <RecoveryDialog state={state} controller={controller} onClose={() => setDialog(null)} />}
    {dialog && typeof dialog === 'object' && <CorrectionDialog target={dialog} server={server} controller={controller} busy={state.busy} onClose={() => setDialog(null)} />}
  </section>
}
function DeleteDialog({ server, controller, busy, onClose }: { server: Session; controller: ClosedWorkoutController; busy: boolean; onClose: () => void }) {
  const [version] = useState(server.version)
  return <Dialog title="운동 전체를 삭제할까요?" onClose={() => { if (!busy) onClose() }}><div className="stack"><p>운동을 논리 삭제하고 공식 평가에서 제외합니다. 원본과 변경 이력은 보존되며 자동 복원할 수 없습니다.</p><button className="primary" disabled={busy} onClick={async () => { if (await controller.delete(version)) onClose() }}>운동 전체 삭제 확인</button></div></Dialog>
}
function ClosedApproval({ server, id, controller, disabled }: { server: Session; id: string; controller: ClosedWorkoutController; disabled: boolean }) {
  const [weight, setWeight] = useState('')
  return <section className="card stack"><h3>승인 확인 필요</h3><p>수행은 보존되었습니다. 지금 해결해도 과거 수행의 승인 문맥과 최초 평가는 바뀌지 않습니다.</p><button className="outline" disabled={disabled} onClick={() => { if (window.confirm('현재 루틴 중량을 유지하고 남은 승인 요청을 적용하지 않을까요?')) void controller.resolve(id, 'KEEP_CURRENT', '', server.version) }}>종료 후 현재 중량 유지</button><label>지금 재승인할 중량 kg<input inputMode="decimal" value={weight} disabled={disabled} onChange={e => setWeight(e.target.value)} /></label><button className="outline" disabled={disabled} onClick={() => { if (window.confirm('입력한 중량을 현재 시점의 새 승인으로 적용할까요?')) void controller.resolve(id, 'REAPPROVE', weight, server.version) }}>종료 후 명시 재승인</button></section>
}
function CorrectionDialog({ target, server, controller, busy, onClose }: { target: EditTarget; server: Session; controller: ClosedWorkoutController; busy: boolean; onClose: () => void }) {
  const [initial] = useState(server), [weight, setWeight] = useState(target.kind === 'SET' ? target.record.weightKg : ''), [reps, setReps] = useState(target.kind === 'SET' ? String(target.record.reps) : '')
  const cardio = target.kind === 'CARDIO' ? target.record.result : null
  const [seconds, setSeconds] = useState(cardio ? String(cardio.activeMs / 1000) : ''), [corrected, setCorrected] = useState(cardio?.corrected ?? false)
  const [distance, setDistance] = useState(cardio?.distanceKm ?? ''), [bpm, setBpm] = useState(cardio?.averageBpm == null ? '' : String(cardio.averageBpm)), [issue, setIssue] = useState('')
  const submit = async (remove: boolean) => {
    try {
      const body: RecordEdit = { dataGeneration: initial.dataGeneration, expectedVersion: initial.version, setCorrections: [], cardioCorrections: [], deletedPerformedSetIds: [], deletedCardioResultIds: [] }
      if (remove) (target.kind === 'SET' ? body.deletedPerformedSetIds : body.deletedCardioResultIds).push(target.record.id)
      else if (target.kind === 'SET') body.setCorrections.push({ id: target.record.id, weightKg: decimalDraft(weight), reps: countDraft(reps) })
      else if (target.kind === 'CARDIO') {
        if (!/^\d{1,5}(\.\d{1,3})?$/.test(seconds)) throw Error('활동 시간을 소수 세 자리 이내의 초로 입력해 주세요.')
        const [whole, fraction = ''] = seconds.split('.'), activeMs = corrected ? Number(BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'))) : target.record.result.timerMs
        if (activeMs < 1 || activeMs > 86400000) throw Error('활동 시간은 0.001초~24시간이어야 합니다.')
        const averageBpm = bpm.trim() ? countDraft(bpm) : null
        if (averageBpm !== null && (averageBpm < 20 || averageBpm > 300)) throw Error('심박수는 20~300 BPM입니다.')
        body.cardioCorrections.push({ id: target.record.id, activeMs, corrected, distanceKm: distance.trim() ? decimalDraft(distance) : null, averageBpm })
      }
      if (window.confirm(remove ? '이 완료 수행을 논리 삭제할까요? 원본과 변경 이력은 보존합니다.' : '입력한 실제 수치로 정정할까요? 최초 계획·평가·승인 문맥은 바뀌지 않습니다.')) {
        if (await controller.edit(body)) onClose()
        else setIssue('저장 결과를 확인해 주세요. 입력은 유지했습니다. 이 창을 닫고 최신 기록과 변경 이력을 확인할 수 있습니다.')
      }
    } catch (error) { setIssue(error instanceof Error ? error.message : '입력을 확인해 주세요.') }
  }
  return <Dialog title="완료 수행 정정·삭제" onClose={() => { if (!busy) onClose() }}><div className="stack">{issue && <p role="alert">{issue}</p>}
    {target.kind === 'SET' ? <><label>실제 중량 kg<input inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} /></label><label>실제 반복 횟수<input inputMode="numeric" value={reps} onChange={e => setReps(e.target.value)} /></label></>
      : target.kind === 'CARDIO' ? <><p>원본 타이머 {target.record.result.timerMs / 1000}초</p><label><input type="checkbox" checked={corrected} onChange={e => setCorrected(e.target.checked)} />활동 시간 정정</label><label>실제 활동 시간 초<input inputMode="decimal" value={seconds} disabled={!corrected} onChange={e => setSeconds(e.target.value)} /></label><label>실제 거리 km · 선택<input inputMode="decimal" value={distance} onChange={e => setDistance(e.target.value)} /></label><label>평균 심박수 BPM · 선택<input inputMode="numeric" value={bpm} onChange={e => setBpm(e.target.value)} /></label></> : <p>명시 건너뜀 기록입니다. 측정 수치를 만들거나 완료 기록으로 바꾸지 않습니다.</p>}
    {target.kind !== 'SKIPPED' && <button className="primary" disabled={busy} onClick={() => void submit(false)}>정정 내용 서버 저장</button>}<button className="outline" disabled={busy} onClick={() => void submit(true)}>이 수행 논리 삭제</button></div></Dialog>
}
function RecoveryDialog({ state, controller, onClose }: { state: ClosedState; controller: ClosedWorkoutController; onClose: () => void }) {
  const [initial] = useState(state), [copyIndex, setCopyIndex] = useState(0), [selected, setSelected] = useState<string[]>([])
  const copy = initial.copies[copyIndex], rows = recoveryRows(copy, initial.server!, initial.changes!)
  return <Dialog title="누락 완료 수행 선택 복구" onClose={() => { if (!state.busy) onClose() }}><div className="stack"><p>원래 기기 사본의 완료 기록만 비교합니다. 선택한 항목만 복구하며 계획·초안·진행 타이머는 전송하지 않습니다. 승인 문맥은 서버가 확인하고, 확인 불가는 별도로 보존하여 공식 평가에서 제외합니다.</p>
    <label>이 기기의 보존 사본<select value={copyIndex} disabled={state.busy} onChange={e => { setCopyIndex(Number(e.target.value)); setSelected([]) }}>{initial.copies.map((c, i) => <option value={i} key={i}>보존 사본 {i + 1} · 실제 시작 {time(c.startedAt)} · 완료 웨이트 {c.snapshot.performedSets.length}개</option>)}</select></label>
    {rows.map(row => {
      const records = row.kind === 'SET' ? initial.server!.snapshot.state.performedSets : initial.server!.snapshot.state.cardioResults
      const current = records.find(r => r.id === row.record.id || ('ordinal' in r && 'ordinal' in row.record ? r.sessionExerciseId === row.record.sessionExerciseId && r.ordinal === row.record.ordinal : 'sessionActivityId' in r && 'sessionActivityId' in row.record && r.sessionActivityId === row.record.sessionActivityId))
      return <label className="radio-option" key={row.record.id}><input type="checkbox" disabled={!row.selectable || state.busy} checked={selected.includes(row.record.id)} onChange={e => setSelected(e.target.checked ? [...selected, row.record.id] : selected.filter(id => id !== row.record.id))} /><span>{RECOVERY_LABEL[row.state]}<br />원본 {performance(row.record)}{current && <><br />서버 {performance(current)}</>}</span></label>
    })}
    {!rows.length && <p>비교할 완료 수행이 없습니다.</p>}
    <button className="primary" disabled={state.busy || !selected.length} onClick={async () => { if (window.confirm('선택한 원래 UUID·시각·수치를 그대로 복구할까요? 확인 불가 승인 문맥은 승인으로 바꾸지 않습니다.')) { if (await controller.recover(copy, selected, initial.server!.version)) onClose() } }}>선택한 완료 수행 복구 확인</button></div></Dialog>
}
