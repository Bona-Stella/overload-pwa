import { useEffect, useRef, useState } from 'react'
import type { RoutineList, Scope } from '../workout-online/types.ts'
import type { WeeklyScheduleApi, WeeklySchedule, Assignment, ScheduleVersion } from './weekly-schedule.ts'

import { scheduleIssue } from './weekly-schedule.ts'
import { saveSchedule } from '../workout-online/routine-schedule.ts'

const weekdays = ['월', '화', '수', '목', '금', '토', '일']
export function ScheduleEditor({ state, routines, busy, onSave, onCancel }: { state: WeeklySchedule; routines: RoutineList['routines']; busy: boolean; onSave: (assignments: Assignment[]) => void; onCancel: () => void }) {
  const latest = state
  const [draft, setDraft] = useState<Assignment[]>(() => latest.assignments.map(a => ({ ...a })) ?? [])
  return <form className="stack" onSubmit={e => { e.preventDefault(); onSave(draft) }}>
    <p>{'저장 즉시 적용합니다. 지난 일정과 시작한 운동의 계획은 유지합니다.'}</p>
    <fieldset className="online-fieldset stack" disabled={busy}>{weekdays.map((name, index) => {
      const assigned = draft.find(a => a.dayOfWeek === index + 1)?.routineId ?? ''
      return <label key={name}>{name}요일<select aria-label={`${name}요일 루틴`} value={assigned} onChange={e => setDraft(values => [...values.filter(a => a.dayOfWeek !== index + 1), ...(e.target.value ? [{ dayOfWeek: index + 1, routineId: e.target.value }] : [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek))}>
        <option value="">휴식</option>{assigned && !routines.some(r => r.id === assigned) && <option value={assigned}>사용할 수 없는 루틴 · 변경 필요</option>}{routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    })}</fieldset><div className="row"><button className="primary" disabled={busy}>일정 저장</button><button type="button" className="outline" disabled={busy} onClick={onCancel}>닫기</button></div>
  </form>
}
export function WeeklySchedulePanel({ api, scope, routines, refreshKey, onSaved, onInvalid }: { api: WeeklyScheduleApi; scope: Scope; routines: RoutineList['routines']; refreshKey?: string; onSaved: () => void; onInvalid: (error: unknown) => void }) {
  const [state, setState] = useState<WeeklySchedule | null>(null), [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [issue, setIssue] = useState(''), [reload, setReload] = useState(0)
  const [older, setOlder] = useState<ScheduleVersion[]>([]), [cursor, setCursor] = useState<string | null | undefined>(undefined)
  const flight = useRef<AbortController | null>(null), invalid = useRef(onInvalid)
  useEffect(() => { invalid.current = onInvalid }, [onInvalid])
  useEffect(() => () => flight.current?.abort(), [scope.userId, scope.dataGeneration])
  useEffect(() => {
    // Refresh external routine/schedule saves without replacing an open editor's draft.
    if (editing) return
    const abort = new AbortController(); flight.current = abort
    void api.read({ userId: scope.userId, dataGeneration: scope.dataGeneration }, Intl.DateTimeFormat().resolvedOptions().timeZone, abort.signal)
      .then(value => { if (!abort.signal.aborted) { setState(value); setIssue(''); setOlder([]); setCursor(undefined) } })
      .catch((error: unknown) => { if (!abort.signal.aborted) { invalid.current(error); setIssue('주간 일정을 불러오지 못했습니다. 다시 조회해 주세요.') } })
    return () => abort.abort()
  }, [api, scope.userId, scope.dataGeneration, reload, refreshKey, editing])
  async function save(values: Assignment[]) {
    if (!state || busy) return
    const abort = new AbortController(); flight.current = abort; setBusy(true); setIssue('')
    try { const result = await saveSchedule(api, scope, state, values, abort.signal); if (!abort.signal.aborted) { setState(result); setEditing(false); setOlder([]); setCursor(undefined); onSaved() } }
    catch (error) { if (!abort.signal.aborted) { invalid.current(error); setIssue(scheduleIssue(error)) } }
    finally { if (!abort.signal.aborted) setBusy(false) }
  }
  const name = (id: string) => routines.find(r => r.id === id)?.name ?? '사용할 수 없는 루틴'
  const description = (value: Pick<WeeklySchedule, 'assignments'>) => value?.assignments.length ? value.assignments.map(a => `${weekdays[a.dayOfWeek - 1]} ${name(a.routineId)}`).join(' · ') : '휴식'
  const before = cursor === undefined ? state?.version : cursor
  async function history() {
    if (!before || BigInt(before) <= 1n || busy) return
    const abort = new AbortController(); flight.current = abort; setBusy(true)
    try { const page = await api.history(scope, before, abort.signal); if (!abort.signal.aborted) { setOlder(values => [...values, ...page.history]); setCursor(page.nextBeforeVersion) } }
    catch (error) { if (!abort.signal.aborted) { invalid.current(error); setIssue('이전 일정 이력을 불러오지 못했습니다.') } }
    finally { if (!abort.signal.aborted) setBusy(false) }
  }
  const allHistory = [...new Map(older.map(v => [v.version, v])).values()].sort((a, b) => BigInt(a.version) < BigInt(b.version) ? -1 : 1)
  return <section className="card stack online-routine" aria-labelledby="weekly-schedule-title"><div className="section-heading"><h2 id="weekly-schedule-title">주간 루틴 일정</h2><button className="outline" disabled={busy || editing} onClick={() => setReload(n => n + 1)}>다시 조회</button></div>
    {issue && <p className="notice" role="alert">{issue}</p>}{!state && !issue && <p role="status">주간 일정 확인 중…</p>}
    {state && <><p>{state.version !== '0' ? `현재 일정 · ${description(state)}` : '등록된 일정이 없습니다.'}</p>
      {editing ? <ScheduleEditor key={state.version} state={state} routines={routines} busy={busy} onSave={values => void save(values)} onCancel={() => setEditing(false)} /> : <button className="outline" disabled={busy} onClick={() => setEditing(true)}>주간 일정 편집</button>}
      <details><summary>일정 변경 이력</summary>{allHistory.map(v => <p key={v.version}>{v.appliedAt ? '즉시 반영' : '과거 계약 기준일'} {v.effectiveFrom} · {description(v)}</p>)}{before && BigInt(before) > 1n && <button className="outline" disabled={busy || editing} onClick={() => void history()}>이전 이력 더 보기</button>}</details></>}
  </section>
}
