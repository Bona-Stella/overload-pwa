import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Card, StatusNotice } from '../../components/ui.tsx'
import styles from '../workout-flow/WorkoutFlow.module.css'
import { Dialog } from '../../components/Dialog.tsx'
import { WorkoutApi } from './api.ts'
import { WorkoutStore } from './storage.ts'
import { ClosedWorkoutController } from './closed-controller.ts'
import type { ClosedState } from './closed-controller.ts'
import type { Manufacturer, CardioResult, ChangeEvents, ClosedPage, CompletionAssessment, PerformedSet, RecordEdit, Scope, Session } from './types.ts'
import { equipmentLabel } from './equipment.ts'
import { equipment, cardioMeasurement } from './validation.ts'
import { countDraft, decimalDraft } from './validation.ts'
import { recoveryRows, RECOVERY_LABEL } from './closed-model.ts'
import { onlineIssue } from './controller.ts'
import { distanceLabel, measuredCardio } from './cardio-measurement.ts'
import { additionalLoadInput, bodyweightLoadLabel } from './bodyweight-load.ts'
import { WorkoutSummary } from '../workout-flow/WorkoutSummary.tsx'
import { summaryData } from './summary-data.ts'
import type { StandardExercise } from './types.ts'

const time = (value: string | null) => value ? new Date(value).toLocaleString('ko-KR') : '없음'
const setPerformance = (record: PerformedSet) => (record.loadType==='BODYWEIGHT'
  ? record.bodyweightLoad?.additionalWeightKg == null ? '맨몸' : '추가 '+record.bodyweightLoad.additionalWeightKg+'kg'
  : record.weightKg+'kg')+' × '+record.reps+'회'
const reason: Record<string, string> = { PENDING: '승인 확인 필요', UNVERIFIED: '승인 문맥 확인 불가', AUTO_CLOSED: '서버 자동 종료', SESSION_DELETED: '삭제된 운동', NO_APPROVED_CONTEXT: '수행 당시 승인 문맥 미충족', INCOMPLETE_INITIAL_WEIGHT_PLAN: '최초 웨이트 계획 미완료', INSUFFICIENT_PERFORMED_SETS: '유효 수행 부족', TEMPORARY_WEIGHT: '오늘만 중량', MIXED_WEIGHT: '서로 다른 중량', SET_COUNT_MISMATCH: '최초 세트 수와 다름', INITIAL_EXERCISE_REMOVED: '최초 종목 제외', COMPARISON_CONTEXT_MISMATCH: '최초 목표와 다름' }
const advice = { INCREASE: '증량 검토', DECREASE: '감량 검토', MAINTAIN: '유지', UNAVAILABLE: '평가 자격 없음' }
function ChangeEntry({ event: e, manufacturers, name }: { event: ChangeEvents['events'][number]; manufacturers: Manufacturer[]; name: (id: string) => string }) {
  const summary = (value: Record<string, unknown> | null) => {
    if (!value) return ''
    if (typeof value.weightKg === 'string' && typeof value.reps === 'number') return `${value.ordinal}세트 · ${equipment(value) ? setPerformance(value as PerformedSet) : value.weightKg+' kg × '+value.reps+'회'}${equipment(value) ? ' · ' + equipmentLabel(value as PerformedSet, manufacturers) + (value.loadType === 'BODYWEIGHT' ? ' · ' + bodyweightLoadLabel(value as PerformedSet) : '') : ''}`
    const r = value.result as Extract<CardioResult, { status: 'COMPLETED' }>['result'] | null
    return r && typeof r.activeMs === 'number' ? `${r.activeMs / 1000}초 · ${distanceLabel({ distanceKm: typeof r.distanceKm === 'string' ? r.distanceKm : null, ...(cardioMeasurement(r.measurement) ? { measurement: r.measurement } : {}) })} · 실제 속도 ${cardioMeasurement(r.measurement) ? r.measurement.actualSpeedKmh ?? '미입력' : '미입력'} km/h · 심박수 ${r.averageBpm ?? '미입력'}` : ''
  }
  const exercise = e.after?.sessionExerciseId ?? e.before?.sessionExerciseId ?? e.after?.sessionActivityId ?? e.before?.sessionActivityId
  return <section className={styles.changeEntry}><small className="muted">{time(e.recordedAt)}</small>{typeof exercise === 'string' && <h4>{name(exercise)}</h4>}<p>{e.recordKind === 'SET' ? '세트' : e.recordKind === 'CARDIO' ? '유산소' : '운동'} · {e.changeKind === 'CORRECTED' ? '수치 정정' : e.changeKind === 'RECOVERED' ? '누락 수행 복구' : '기록 삭제'}{!!e.changeContext?.claimedWeightContext && <span> · 원래 승인 문맥 보존</span>}</p>
    {e.before && summary(e.before) && <p className="muted small">변경 전 {summary(e.before)}</p>}{e.after && summary(e.after) && <p className="muted small">변경 후 {summary(e.after)}</p>}</section>
}
function Evaluation({ value, title, name }: { value: CompletionAssessment | null; title: string; name: (id: string) => string }) {
  return <section className={styles.evaluation}><h3>{title}</h3>{!value ? <p className="muted small">평가 정보가 없습니다.</p> : value.exercises.map(e =>
    <section className={styles.recordItem} key={e.sessionExerciseId}><div className={styles.headingRow}><h4>{name(e.sessionExerciseId)}</h4><span>{advice[e.advice]}</span></div>
      {e.comparisonContext && <p className="muted small">기준 {e.comparisonContext.approvedWeightKg}kg · {e.comparisonContext.minReps}–{e.comparisonContext.maxReps}회</p>}
      {e.evaluatedReps.length > 0 && <p>{e.evaluatedReps.map(r=>r+'회').join(' / ')}</p>}
      {e.reasonCodes.length > 0 && <p className="muted small">{e.reasonCodes.map(r=>reason[r]??'평가 조건 미충족').join(' · ')}</p>}
    </section>)}</section>
}
const clockTime = (value: string | null, zone: string) => value ? new Date(value).toLocaleTimeString('ko-KR', { timeZone: zone, hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '기록 없음'
const recordName = (server: Session, id: string, definitions: StandardExercise[]) =>
  server.initialPlan.weightExercises.find(e=>e.sessionExerciseId===id)?.exerciseName
  ?? server.initialPlan.cardioActivities.find(e=>e.sessionActivityId===id)?.plan.name
  ?? server.snapshot.state.appliedPlan.cardioActivities.find(e=>e.sessionActivityId===id)?.plan.name
  ?? definitions.find(e=>e.id===server.snapshot.state.sessionExercises.find(e=>e.id===id)?.standardExerciseId)?.name ?? '추가된 운동'
function RecordFacts({ record, server, manufacturers, showEquipment = true }: { record: PerformedSet | CardioResult; server: Session; manufacturers: Manufacturer[]; showEquipment?: boolean }) {
  return <div className={styles.recordFacts}>
    {'ordinal' in record ? <><strong>{setPerformance(record)}</strong>
      {record.loadType==='BODYWEIGHT' && <small>{bodyweightLoadLabel(record)}</small>}
      {showEquipment && <small>{equipmentLabel(record,manufacturers)}</small>}
      <small><time dateTime={record.completedAt}>{clockTime(record.completedAt,server.startedTimeZone)}</time></small></>
      : <><strong>{record.status==='SKIPPED'?'미수행':record.result.activeMs/1000+'초'}</strong>
        {record.result && <small>{distanceLabel(record.result)} · 심박수 {record.result.averageBpm??'미입력'}</small>}
        <small><time dateTime={record.occurredAt}>{clockTime(record.occurredAt,server.startedTimeZone)}</time></small></>}
  </div>
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
  return <section className="card stack" aria-label="종료 운동 이력"><div className="section-heading"><h2 id="workout-history-title">종료 운동 이력</h2><button className="quiet" disabled={busy} onClick={() => void load()}>이력 다시 조회</button></div>
    {issue && <p className="notice" role="alert">{issue}</p>}{busy && <p role="status">이력을 확인 중입니다.</p>}
    {page?.sessions.length === 0 && <p>종료한 운동이 없습니다.</p>}
    {page?.sessions.map(s => <button className="outline full" key={s.id} disabled={busy} onClick={() => onOpen(s.id)}>{s.routineName} · {s.workoutDate} · {s.deletedAt ? '삭제된 운동' : s.status === 'FINISHED' ? '명시 종료 ' + time(s.endedAt) : '서버 자동 종료 ' + time(s.closedAt)}</button>)}
    {page?.next && <button className="outline" disabled={busy} onClick={() => void load(page.next)}>이전 운동 더 보기</button>}
  </section>
}
export function ClosedWorkout({ api, session, authorized, onServer, onInvalid, manufacturers = [], definitions = [], onBack, summary = false }: { summary?: boolean; api: WorkoutApi; session: Session; manufacturers?: Manufacturer[]; definitions?: StandardExercise[]; onBack?: () => void; authorized: () => boolean; onServer: (server: Session) => void; onInvalid?: (error: unknown) => void }) {
  const [initial] = useState(() => ({ session, authorized, onServer, onInvalid })) // The parent keys this panel by account/generation/session, not version.
  const [view, setView] = useState<{ controller: ClosedWorkoutController; state: ClosedState } | null>(null)
  useEffect(() => {
    const store = new WorkoutStore(), c = new ClosedWorkoutController(api, store, initial.session, initial.session.id, initial.authorized, initial.onServer, undefined, initial.onInvalid)
    const unsubscribe = c.subscribe(() => setView({ controller: c, state: c.getSnapshot() }))
    void c.open()
    return () => { unsubscribe(); c.stop(); void store.close() }
  }, [api, initial])
  return view ? <ClosedWorkoutView {...view} manufacturers={manufacturers} definitions={definitions} onBack={onBack} summary={summary} /> : <p role="status">종료 기록을 확인 중입니다.</p>
}
type EditTarget = { kind: 'SET'; record: PerformedSet } | { kind: 'CARDIO'; record: Extract<CardioResult, { status: 'COMPLETED' }> } | { kind: 'SKIPPED'; record: Extract<CardioResult, { status: 'SKIPPED' }> }
export function ClosedWorkoutView({ state, controller, manufacturers = [], definitions = [], onBack = () => {}, summary = false }: { summary?: boolean; state: ClosedState; controller: ClosedWorkoutController; manufacturers?: Manufacturer[]; definitions?: StandardExercise[]; onBack?: () => void }) {
  const [mode, setMode] = useState<'correction' | 'history' | null>(null)
  const [dialog, setDialog] = useState<'delete' | 'recovery' | EditTarget | null>(null)
  const menuRef = useRef<HTMLDetailsElement>(null)
  const server = state.server, disabled = state.busy || !state.writable || !!server?.deletedAt || state.pending?.status === 'PENDING'
  useEffect(() => {
    const close = (e: PointerEvent | KeyboardEvent) => {
      const menu=menuRef.current
      if(!menu?.open)return
      if(e instanceof KeyboardEvent) { if(e.key!=='Escape')return; menu.open=false;menu.querySelector('summary')?.focus() }
      else if(e.target instanceof Node&&!menu.contains(e.target))menu.open=false
    }
    document.addEventListener('pointerdown',close);document.addEventListener('keydown',close)
    return ()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',close)}
  }, [])
  if (!server) return <Card>{state.issue && <StatusNotice error>{state.issue}</StatusNotice>}<Button disabled={state.busy} onClick={() => void controller.refresh()}>기록 새로고침</Button></Card>
  const name = (id: string) => recordName(server,id,definitions)
  const status = <>
    {server.status==='AUTO_CLOSED' && <StatusNotice>연결 종료로 기록이 자동 마감되었습니다. 실제 종료 시각은 기록되지 않았으며, 기기에 남은 완료 수행을 확인할 수 있습니다.</StatusNotice>}
    {server.deletedAt && <StatusNotice>삭제된 운동입니다. 기록 변경과 복구를 할 수 없습니다.</StatusNotice>}
    {!state.writable && <StatusNotice>읽기 전용</StatusNotice>}
    {state.issue && <StatusNotice error>{state.issue}</StatusNotice>}
    {state.notice && <StatusNotice>{state.notice}</StatusNotice>}
    {state.pending?.status === 'PENDING' && <Card><p>이전 변경의 저장 결과를 확인해 주세요. 입력은 보존되어 있습니다.</p>
      <Button disabled={state.busy || !state.writable || !!server.deletedAt} onClick={() => void controller.retry()}>저장 결과 다시 확인</Button>
      <Button variant="quiet" disabled={state.busy || !state.writable} onClick={() => { if(window.confirm('현재 기록과 변경 이력을 확인했나요?'))void controller.reviewed() }}>현재 기록 확인 완료</Button></Card>}
    {!server.deletedAt && state.copies.filter(c=>c.finish?.request&&!c.finish.ack).map((c,i)=><Button key={i}
      disabled={state.busy || !state.writable || server.status!=='FINISHED' || c.writerEpoch!==server.writerEpoch || c.editorDeviceId!==server.editorDeviceId}
      onClick={()=>void controller.confirmFinish(c)}>운동 종료 저장 결과 확인</Button>)}
  </>
  const menuAction = (action: () => void) => { if(menuRef.current)menuRef.current.open=false; action() }
  const menu = <details className={styles.recordMenu} ref={menuRef}><summary aria-label="운동 기록 메뉴">⋮</summary><div>
    <Button disabled={disabled} onClick={()=>menuAction(()=>setMode('correction'))}>기록 정정</Button>
    <Button disabled={disabled || !state.copies.length || !state.changes} onClick={()=>menuAction(()=>setDialog('recovery'))}>누락 수행 복구</Button>
    <Button data-danger disabled={disabled} onClick={()=>menuAction(()=>setDialog('delete'))}>기록 전체 삭제</Button>
    <Button onClick={()=>menuAction(()=>setMode('history'))}>평가 변경 이력</Button>
  </div></details>
  const dialogs = <>
    {dialog==='delete' && <DeleteDialog server={server} controller={controller} busy={state.busy} onClose={()=>setDialog(null)}/>}
    {dialog==='recovery' && state.changes && state.copies.length>0 && <RecoveryDialog state={state} controller={controller} manufacturers={manufacturers} definitions={definitions} onClose={()=>setDialog(null)}/>}
    {dialog && typeof dialog==='object' && <CorrectionDialog target={dialog} server={server} controller={controller} busy={state.busy} manufacturers={manufacturers} definitions={definitions} onClose={()=>setDialog(null)}/>}
  </>
  if(!summary && mode) return <section className={styles.summary + ' closed-workout'}>
    <Button variant="quiet" onClick={()=>setMode(null)}>‹ 운동 기록 상세</Button>
    <Card hero><p>{server.workoutDate} · {new Date(server.workoutDate+'T12:00:00Z').toLocaleDateString('ko-KR',{weekday:'long',timeZone:'UTC'})}</p>
      <h1>{server.deletedAt?'삭제된 운동':server.status==='FINISHED'?'운동 완료':'운동 자동 마감'}</h1><p>{server.initialPlan.routineName}</p>
      <dl className={styles.recordTimes}><div><dt>운동 시작</dt><dd>{clockTime(server.startedAt,server.startedTimeZone)}</dd></div><div><dt>운동 종료</dt><dd>{clockTime(server.endedAt,server.startedTimeZone)}</dd></div></dl>
      <Button disabled={state.busy} onClick={()=>void controller.refresh()}>기록 새로고침</Button>
    </Card>
    {status}
    {mode==='correction' && !server.deletedAt && <Card className={styles.completedRecords}><h2>완료 수행</h2>
      {[...new Set(server.snapshot.state.performedSets.map(s=>s.sessionExerciseId))].map(id=>{
        const sets=server.snapshot.state.performedSets.filter(s=>s.sessionExerciseId===id).sort((a,b)=>a.ordinal-b.ordinal)
        const same=sets.every(s=>s.manufacturerId===sets[0].manufacturerId&&s.loadType===sets[0].loadType)
        return <section className={styles.recordItem} key={id}><h3>{name(id)}</h3>
          {same && <p className="muted small">{equipmentLabel(sets[0],manufacturers)}</p>}
          {sets.map(set=><div className={styles.recordEditRow} key={set.id}><b>{String(set.ordinal).padStart(2,'0')}세트</b>
            <RecordFacts record={set} server={server} manufacturers={manufacturers} showEquipment={!same}/>
            <Button variant="quiet" aria-label={name(id)+' '+set.ordinal+'세트 정정'} disabled={disabled} onClick={()=>setDialog({kind:'SET',record:set})}>정정</Button>
          </div>)}
        </section>
      })}
      {server.snapshot.state.cardioResults.map(record=><section className={styles.recordItem} key={record.id}><h3>{name(record.sessionActivityId)}</h3>
        <div className={styles.recordEditRow}><span>유산소</span><RecordFacts record={record} server={server} manufacturers={manufacturers}/>
          <Button variant="quiet" disabled={disabled} onClick={()=>setDialog(record.status==='COMPLETED'?{kind:'CARDIO',record}:{kind:'SKIPPED',record})}>{record.status==='SKIPPED'?'삭제':'정정'}</Button></div>
      </section>)}
      {!server.snapshot.state.performedSets.length&&!server.snapshot.state.cardioResults.length&&<p className="muted small">완료한 수행이 없습니다.</p>}
    </Card>}
    {mode==='history' && <>
      <Card><h2>공식 기준 기록 평가</h2><Evaluation value={state.assessment?.completionAssessment??null} title="운동 종료 당시" name={name}/><Evaluation value={state.assessment?.currentAssessment.evaluation??null} title="현재 기록 기준" name={name}/></Card>
      <Card><h2>기록 변경 이력</h2>{state.changes?.events.map(e=><ChangeEntry key={e.id} event={e} manufacturers={manufacturers} name={name}/>)}{!state.changes?.events.length&&<p className="muted small">변경 이력이 없습니다.</p>}</Card>
    </>}
    {[...new Set(server.snapshot.approvalResults.filter(r=>r.status==='PENDING').map(r=>r.sessionExerciseId))].map(id=><ClosedApproval key={id} server={server} id={id} controller={controller} disabled={disabled}/>)}
    {dialogs}
  </section>
  return <><WorkoutSummary {...summaryData(server,state.assessment,definitions)} manufacturers={manufacturers} onBack={onBack}
    detail={!summary} recordMenu={!summary?menu:undefined} timing={!summary?{start:clockTime(server.startedAt,server.startedTimeZone),end:clockTime(server.endedAt,server.startedTimeZone)}:undefined}>
    {status}
  </WorkoutSummary>{!summary&&dialogs}</>
}
function DeleteDialog({ server, controller, busy, onClose }: { server: Session; controller: ClosedWorkoutController; busy: boolean; onClose: () => void }) {
  const [version] = useState(server.version)
  return <Dialog title="운동 전체를 삭제할까요?" onClose={() => { if (!busy) onClose() }}><div className="stack"><p>{server.workoutDate} · {server.initialPlan.routineName} 운동을 기록과 통계에서 제외합니다. 삭제 후 되돌릴 수 없습니다.</p><button className="primary" disabled={busy} onClick={async () => { if (await controller.delete(version)) onClose() }}>운동 삭제</button></div></Dialog>
}
function ClosedApproval({ server, id, controller, disabled }: { server: Session; id: string; controller: ClosedWorkoutController; disabled: boolean }) {
  const [weight, setWeight] = useState('')
  return <section className="card stack"><h3>승인 확인 필요</h3><p>수행은 보존되었습니다. 지금 해결해도 과거 수행의 승인 문맥과 최초 평가는 바뀌지 않습니다.</p><button className="outline" disabled={disabled} onClick={() => { if (window.confirm('현재 루틴 중량을 유지하고 남은 승인 요청을 적용하지 않을까요?')) void controller.resolve(id, 'KEEP_CURRENT', '', server.version) }}>종료 후 현재 중량 유지</button><label>지금 재승인할 중량 kg<input inputMode="decimal" value={weight} disabled={disabled} onChange={e => setWeight(e.target.value)} /></label><button className="outline" disabled={disabled} onClick={() => { if (window.confirm('입력한 중량을 현재 시점의 새 승인으로 적용할까요?')) void controller.resolve(id, 'REAPPROVE', weight, server.version) }}>종료 후 명시 재승인</button></section>
}
function CorrectionDialog({ target, server, controller, busy, onClose, manufacturers, definitions }: { target: EditTarget; server: Session; controller: ClosedWorkoutController; busy: boolean; onClose: () => void; manufacturers: Manufacturer[]; definitions: StandardExercise[] }) {
  const [initial] = useState(server), [weight, setWeight] = useState(target.kind === 'SET' ? target.record.weightKg : ''), [reps, setReps] = useState(target.kind === 'SET' ? String(target.record.reps) : '')
  const [additionalWeight, setAdditionalWeight] = useState(target.kind === 'SET' ? target.record.bodyweightLoad?.additionalWeightKg ?? '' : ''), [additionalTouched, setAdditionalTouched] = useState(false)
  const cardio = target.kind === 'CARDIO' ? target.record.result : null
  const [seconds, setSeconds] = useState(cardio ? String(cardio.activeMs / 1000) : ''), [corrected, setCorrected] = useState(cardio?.corrected ?? false)
  const [distance, setDistance] = useState(cardio?.measurement?.distanceSource === 'CALCULATED' ? '' : cardio?.distanceKm ?? ''), [bpm, setBpm] = useState(cardio?.averageBpm == null ? '' : String(cardio.averageBpm)), [issue, setIssue] = useState('')
  const [speed, setSpeed] = useState(cardio?.measurement?.actualSpeedKmh ?? ''), [distanceTouched, setDistanceTouched] = useState(false)
  const kind = target.kind === 'CARDIO' ? initial.snapshot.state.appliedPlan.cardioActivities.find(p => p.sessionActivityId === target.record.sessionActivityId)?.plan.kind ?? initial.initialPlan.cardioActivities.find(p => p.sessionActivityId === target.record.sessionActivityId)?.plan.kind : undefined
  const supportsDistance = kind !== undefined && ['TREADMILL', 'BIKE', 'OUTDOOR'].includes(kind)
  let preview = ''
  try { preview = distanceLabel(measuredCardio(speed, distance, corrected ? Number(seconds) * 1000 : cardio?.timerMs ?? 0, cardio?.measurement?.distanceSource == null && !distanceTouched)) } catch { /* Invalid draft remains available for correction. */ }
  const submit = async (remove: boolean) => {
    try {
      const body: RecordEdit = { dataGeneration: initial.dataGeneration, expectedVersion: initial.version, setCorrections: [], cardioCorrections: [], deletedPerformedSetIds: [], deletedCardioResultIds: [] }
      if (remove) (target.kind === 'SET' ? body.deletedPerformedSetIds : body.deletedCardioResultIds).push(target.record.id)
      else if (target.kind === 'SET') body.setCorrections.push({ id: target.record.id, weightKg: decimalDraft(weight), reps: countDraft(reps),
        ...(target.record.loadType === 'BODYWEIGHT' && additionalTouched ? { bodyweightLoad: additionalLoadInput(additionalWeight) } : {}) })
      else if (target.kind === 'CARDIO') {
        if (!/^\d{1,5}(\.\d{1,3})?$/.test(seconds)) throw Error('활동 시간을 소수 세 자리 이내의 초로 입력해 주세요.')
        const [whole, fraction = ''] = seconds.split('.'), activeMs = corrected ? Number(BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'))) : target.record.result.timerMs
        if (activeMs < 1 || activeMs > 86400000) throw Error('활동 시간은 0.001초~24시간이어야 합니다.')
        const averageBpm = bpm.trim() ? countDraft(bpm) : null
        if (averageBpm !== null && (averageBpm < 20 || averageBpm > 300)) throw Error('심박수는 20~300 BPM입니다.')
        const measured = measuredCardio(speed, distance, activeMs, cardio?.measurement?.distanceSource == null && !distanceTouched)
        body.cardioCorrections.push({ id: target.record.id, activeMs, corrected, distanceKm: measured.distanceKm, averageBpm,
          ...(cardio?.measurement !== undefined || speed.trim() || distanceTouched ? { measurement: measured.measurement } : {}) })
      }
      if (window.confirm(remove ? '이 수행을 삭제할까요? 기록과 통계에서 제외됩니다.' : '입력한 실제 수행값으로 변경할까요? 운동 계획과 수행 시각은 유지됩니다.')) {
        if (await controller.edit(body)) onClose()
        else setIssue('저장 결과를 확인해 주세요. 입력은 유지했습니다. 이 창을 닫고 최신 기록과 변경 이력을 확인할 수 있습니다.')
      }
    } catch (error) { setIssue(error instanceof Error ? error.message : '입력을 확인해 주세요.') }
  }
  const id = target.kind==='SET'?target.record.sessionExerciseId:target.record.sessionActivityId
  return <Dialog title="기록 정정" onClose={() => { if (!busy) onClose() }}><div className={styles.recordForm}>
    <Card><h3>{recordName(initial,id,definitions)}{target.kind==='SET'&&' · '+String(target.record.ordinal).padStart(2,'0')+'세트'}</h3>
      <RecordFacts record={target.record} server={initial} manufacturers={manufacturers}/></Card>
    <fieldset disabled={busy} className="online-fieldset stack">
    {target.kind === 'SET' ? <><label>실제 중량 kg<input inputMode="decimal" value={weight} onChange={e => { setWeight(e.target.value); setIssue('') }} /></label><label>실제 반복 횟수<input inputMode="numeric" value={reps} onChange={e => { setReps(e.target.value); setIssue('') }} /></label>{target.record.loadType === 'BODYWEIGHT' && <><label>추가 중량 kg · 선택<input inputMode="decimal" value={additionalWeight} placeholder="추가 중량 없음" onChange={e => { setAdditionalWeight(e.target.value); setAdditionalTouched(true); setIssue('') }} /></label><p className="muted small">총중량에는 명시적 추가 중량만 사용합니다. 비우면 추가 중량을 제거합니다. 체중과 기존 중량을 자동 합산하지 않습니다.</p></>}</>
      : target.kind === 'CARDIO' ? <><p>원본 타이머 {target.record.result.timerMs / 1000}초</p><label><input type="checkbox" checked={corrected} onChange={e => { setCorrected(e.target.checked); setIssue('') }} />활동 시간 정정</label><label>실제 활동 시간 초<input inputMode="decimal" value={seconds} disabled={!corrected} onChange={e => { setSeconds(e.target.value); setIssue('') }} /></label>{supportsDistance && <><label>직접 입력 거리 km · 선택<input inputMode="decimal" value={distance} onChange={e => { setDistance(e.target.value); setDistanceTouched(true); setIssue('') }} /></label><label>실제 속도 km/h · 선택<input inputMode="decimal" value={speed} onChange={e => { setSpeed(e.target.value); setIssue('') }} /></label><p className="muted small">{preview} · 직접 입력 거리를 우선하며 목표 속도는 실제값으로 사용하지 않습니다.</p></>}<label>평균 심박수 BPM · 선택<input inputMode="numeric" value={bpm} onChange={e => { setBpm(e.target.value); setIssue('') }} /></label></> : <p>명시 건너뜀 기록입니다. 측정 수치를 만들거나 완료 기록으로 바꾸지 않습니다.</p>}
    </fieldset>
    {issue && <StatusNotice error>{issue}</StatusNotice>}
    <div className={styles.actions}><Button disabled={busy} onClick={onClose}>취소</Button>{target.kind!=='SKIPPED'&&<Button variant="primary" disabled={busy} onClick={()=>void submit(false)}>{busy?'저장 중':'변경 저장'}</Button>}</div>
    <Button variant="danger" disabled={busy} onClick={()=>void submit(true)}>이 수행 삭제</Button>
  </div></Dialog>
}
function RecoveryDialog({ state, controller, onClose, manufacturers, definitions }: { state: ClosedState; controller: ClosedWorkoutController; manufacturers: Manufacturer[]; definitions: StandardExercise[]; onClose: () => void }) {
  const [initial] = useState(state), [copyIndex,setCopyIndex] = useState(0), [selected,setSelected] = useState<string[]>([]), [issue,setIssue] = useState('')
  const copy=initial.copies[copyIndex], rows=recoveryRows(copy,initial.server!,initial.changes!)
  const renderRow=(row:typeof rows[number])=>{
    const record=row.record
    const id='ordinal' in record?record.sessionExerciseId:record.sessionActivityId
    return <label className={styles.recoveryRow} key={row.record.id}><input type="checkbox" disabled={!row.selectable||state.busy} checked={selected.includes(row.record.id)} onChange={e=>setSelected(e.target.checked?[...selected,row.record.id]:selected.filter(id=>id!==row.record.id))}/>
      <div><h4>{recordName(initial.server!,id,definitions)}{'ordinal' in record&&' · '+String(record.ordinal).padStart(2,'0')+'세트'}</h4>
        <p className="muted small">{RECOVERY_LABEL[row.state]}</p><RecordFacts record={row.record} server={initial.server!} manufacturers={manufacturers}/></div></label>
  }
  return <Dialog title="누락 수행 복구" onClose={()=>{if(!state.busy)onClose()}}><div className={styles.recordForm}>
    <p className="muted small">이 기기에 남은 완료 기록 중 누락된 수행만 선택해 복구합니다. 이미 저장되거나 삭제된 수행은 복구할 수 없습니다.</p>
    <label>보관된 운동 기록<select value={copyIndex} disabled={state.busy} onChange={e=>{setCopyIndex(Number(e.target.value));setSelected([]);setIssue('')}}>{initial.copies.map((c,i)=><option value={i} key={i}>{time(c.startedAt)} · {c.snapshot.performedSets.length}세트</option>)}</select></label>
    <section aria-label="복구 가능한 수행">{rows.filter(r=>r.selectable).map(renderRow)}{!rows.some(r=>r.selectable)&&<p className="muted small">복구 가능한 누락 수행이 없습니다.</p>}</section>
    {rows.some(r=>!r.selectable)&&<details><summary>복구할 수 없는 기록 확인</summary>{rows.filter(r=>!r.selectable).map(renderRow)}</details>}
    {issue&&<StatusNotice error>{issue}</StatusNotice>}
    <div className={styles.actions}><Button disabled={state.busy} onClick={onClose}>취소</Button><Button variant="primary" disabled={state.busy||!selected.length} onClick={async()=>{
      if(window.confirm('선택한 완료 수행 '+selected.length+'건을 복구할까요? 원래 중량·반복·완료 시각을 그대로 사용합니다.')){
        if(await controller.recover(copy,selected,initial.server!.version))onClose()
        else setIssue('복구 결과를 확인하지 못했습니다. 선택한 기록은 유지됩니다. 창을 닫고 최신 기록을 확인해 주세요.')
      }
    }}>{state.busy?'복구 중':'선택한 수행 복구'}</Button></div>
  </div></Dialog>
}
