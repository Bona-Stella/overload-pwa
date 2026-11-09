import type { ReactNode } from 'react'
import { Dialog } from '../../components/Dialog.tsx'
import { sameAssignments } from '../workout-online/routine-schedule.ts'
import { useEffect, useRef, useState } from 'react'
import type { RoutineList, Scope } from '../workout-online/types.ts'
import type { WeeklyScheduleApi, WeeklySchedule, Assignment } from './weekly-schedule.ts'

import { scheduleIssue } from './weekly-schedule.ts'
import { saveSchedule } from '../workout-online/routine-schedule.ts'
import { routineTags } from '../home/tags.ts'
import styles from '../workout-online/Routine.module.css'

const weekdays = ['월', '화', '수', '목', '금', '토', '일']
export function ScheduleEditor({ state, routines, busy, readOnly = false, onSave, onCancel, preset }: { state: Pick<WeeklySchedule, 'assignments'>; routines: RoutineList['routines']; busy: boolean; readOnly?: boolean; onSave: (assignments: Assignment[]) => void; onCancel: () => void; preset?: { controls: (leave: (action: () => void) => void) => ReactNode; priorityId?: string; active: boolean; stale: boolean } }) {
  const [draft, setDraft] = useState<Assignment[]>(() => state.assignments.map(a => ({ ...a })))
  const [filter, setFilter] = useState('all'), [popup, setPopup] = useState<'assignment'|'tag'|null>(null)
  const tags = routineTags.filter(tag => routines.some(r => r.tag === tag))
  const chooseFilter = (value: string) => { setFilter(value); setPopup(null) }
  const assignedIds = new Set(state.assignments.map(a => a.routineId))
  const priority = preset?.priorityId ? routines.find(r => r.id === preset.priorityId) : undefined
  const candidates = routines.filter(r => r.id !== priority?.id).filter(r => filter === 'all' || (filter === 'assigned' ? assignedIds.has(r.id) : filter === 'unassigned' ? !assignedIds.has(r.id) : r.tag === filter.slice(4)))
  const [confirm, setConfirm] = useState(false)
  const dirty = !sameAssignments(state.assignments, draft)
  const leave = (action: () => void) => { if (!preset || !dirty || window.confirm('저장하지 않은 배정 변경을 버릴까요?')) action() }
  const first = useRef<HTMLButtonElement>(null), tagButton = useRef<HTMLButtonElement>(null), filters = useRef<HTMLFieldSetElement>(null)
  useEffect(() => { first.current?.focus() }, [])
  useEffect(() => {
    if (!popup) return
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !filters.current?.contains(event.target)) setPopup(null) }
    document.addEventListener('pointerdown', outside, true)
    return () => document.removeEventListener('pointerdown', outside, true)
  }, [popup])
  return <form className={styles.scheduleEditor} data-preset={!!preset} aria-label="주간 일정 편집" onSubmit={e => { e.preventDefault(); if (busy || readOnly) return; if (!preset) onSave(draft); else if (dirty && !preset.stale) setConfirm(true) }}>
    <div className="section-heading"><h2>주간 일정 편집</h2><button type="button" className="quiet" disabled={busy} onClick={() => leave(onCancel)}>닫기</button></div>
    <p>{preset && !preset.active ? '조회 중인 일정의 배정만 저장합니다.' : '저장 즉시 적용합니다. 지난 일정과 시작한 운동의 계획은 유지합니다.'}</p>
    {preset?.controls(leave)}
    <fieldset ref={filters} className={styles.candidateFilters} aria-label="루틴 후보 필터" disabled={busy || readOnly} onKeyDown={e=>{if(popup&&e.key==='Escape'){setPopup(null);(popup==='assignment'?first:tagButton).current?.focus()}}}>
      <div className={styles.candidateTags}>
        <button type="button" className={styles.chip} ref={first} aria-expanded={popup==='assignment'} aria-pressed={filter==='assigned'||filter==='unassigned'} aria-controls="schedule-candidate-assignment" onClick={()=>setPopup(value=>value==='assignment'?null:'assignment')}>{filter==='assigned'?'배정 완료':filter==='unassigned'?'배정 미완료':'배정 유무'} <span aria-hidden="true">▾</span></button>
        {popup==='assignment'&&<div id="schedule-candidate-assignment" className={styles.candidateTagOptions} aria-label="배정 유무 후보">{([['assigned','배정 완료'],['unassigned','배정 미완료']] as const).map(([value,label])=><button type="button" className={styles.chip} key={value} aria-pressed={filter===value} onClick={()=>{chooseFilter(value);first.current?.focus()}}>{label}</button>)}</div>}
      </div>
      <div className={styles.candidateTags}>
        <button type="button" className={styles.chip} ref={tagButton} aria-label={filter.startsWith('tag:') ? filter.slice(4) : '태그'} aria-expanded={popup==='tag'} aria-pressed={filter.startsWith('tag:')} aria-controls="schedule-candidate-tags" disabled={!tags.length} onClick={() => setPopup(value=>value==='tag'?null:'tag')}>{filter.startsWith('tag:') ? filter.slice(4) : '태그'} <span aria-hidden="true">▾</span></button>
        {popup==='tag' && <div id="schedule-candidate-tags" className={styles.candidateTagOptions} aria-label="후보 태그">{tags.map(tag => <button type="button" className={styles.chip} key={tag} aria-pressed={filter === `tag:${tag}`} onClick={() => { chooseFilter(`tag:${tag}`); tagButton.current?.focus() }}>{tag}</button>)}</div>}
      </div>
      <button type="button" className={styles.chip} aria-pressed={filter === 'all'} onClick={() => chooseFilter('all')}>전체 보기</button>
    </fieldset>
    <fieldset className={styles.scheduleDays} disabled={busy || readOnly}>{weekdays.map((name, index) => {
      const assigned = draft.find(a => a.dayOfWeek === index + 1)?.routineId ?? ''
      return <label key={name}>{name}요일<select aria-label={`${name}요일 루틴`} value={assigned} onChange={e => setDraft(values => [...values.filter(a => a.dayOfWeek !== index + 1), ...(e.target.value ? [{ dayOfWeek: index + 1, routineId: e.target.value }] : [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek))}>
        {priority && <option value={priority.id}>✦ 새 루틴 · {priority.name}</option>}<option value="">휴식</option>{assigned && assigned !== priority?.id && !candidates.some(r => r.id === assigned) && <option value={assigned}>{routines.find(r => r.id === assigned)?.name ?? '사용할 수 없는 루틴 · 변경 필요'}</option>}{candidates.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    })}</fieldset><button className="primary" disabled={busy || readOnly || !!preset?.stale || !!preset && !dirty}>일정 저장</button>
    {confirm && <Dialog title="주간 일정 변경 확인" onClose={() => setConfirm(false)}><ul>{weekdays.map((name, index) => {
      const before = state.assignments.find(a => a.dayOfWeek === index + 1)?.routineId
      const after = draft.find(a => a.dayOfWeek === index + 1)?.routineId
      const nameFor = (id?: string) => id ? routines.find(r => r.id === id)?.name ?? '사용할 수 없는 루틴' : '휴식'
      return before === after ? null : <li key={name}>{name}요일 · {nameFor(before)} → {nameFor(after)}</li>
    })}</ul><div className="row"><button type="button" onClick={() => setConfirm(false)}>취소</button><button type="button" className="primary" onClick={() => { setConfirm(false); onSave(draft) }}>변경 확인</button></div></Dialog>}
  </form>
}
export function WeeklySchedulePanel({ api, scope, routines, refreshKey, readOnly = false, onEditingChange, onSaved, onInvalid }: { api: WeeklyScheduleApi; scope: Scope; routines: RoutineList['routines']; refreshKey?: string; readOnly?: boolean; onEditingChange?: (editing: boolean) => void; onSaved: () => void; onInvalid: (error: unknown) => void }) {
  const [state, setState] = useState<WeeklySchedule | null>(null), [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [issue, setIssue] = useState(''), [reload, setReload] = useState(0)
  const flight = useRef<AbortController | null>(null), invalid = useRef(onInvalid)
  const saving = useRef(false), trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => { onEditingChange?.(editing); return () => onEditingChange?.(false) }, [editing, onEditingChange])
  useEffect(() => { invalid.current = onInvalid }, [onInvalid])
  useEffect(() => () => flight.current?.abort(), [scope.userId, scope.dataGeneration])
  useEffect(() => {
    // Refresh external routine/schedule saves without replacing an open editor's draft.
    if (editing) return
    const abort = new AbortController(); flight.current = abort
    void api.read({ userId: scope.userId, dataGeneration: scope.dataGeneration }, Intl.DateTimeFormat().resolvedOptions().timeZone, abort.signal)
      .then(value => { if (!abort.signal.aborted) { setState(value); setIssue('') } })
      .catch((error: unknown) => { if (!abort.signal.aborted) { invalid.current(error); setIssue('주간 일정을 불러오지 못했습니다. 다시 조회해 주세요.') } })
    return () => abort.abort()
  }, [api, scope.userId, scope.dataGeneration, reload, refreshKey, editing])
  async function save(values: Assignment[]) {
    if (!state || busy || readOnly || saving.current) return
    saving.current = true
    const abort = new AbortController(); flight.current = abort; setBusy(true); setIssue('')
    try { const result = await saveSchedule(api, scope, state, values, abort.signal); if (!abort.signal.aborted) { setState(result); setEditing(false); onSaved() } }
    catch (error) { if (!abort.signal.aborted) { invalid.current(error); setIssue(scheduleIssue(error)) } }
    finally { saving.current = false; if (!abort.signal.aborted) setBusy(false) }
  }
  const close = () => { setEditing(false); requestAnimationFrame(() => trigger.current?.focus()) }
  return <section className={styles.schedulePanel} aria-label="주간 일정 관리">
    {readOnly && <p className="notice">운동 상태와 미동기화 기록을 먼저 확인해 주세요. 배정 변경은 보류하며 입력은 유지합니다.</p>}
    {issue && <p className="notice" role="alert">{issue}</p>}{!state && !issue && <p role="status">주간 일정 확인 중…</p>}
    {!state && issue && <button type="button" className="outline" disabled={busy} onClick={() => setReload(n => n + 1)}>다시 조회</button>}
    {state && <><button type="button" ref={trigger} hidden={editing} className="outline" disabled={busy || readOnly} onClick={() => setEditing(true)}>주간 일정 편집</button>
      {editing && <ScheduleEditor key={state.version} state={state} routines={routines} busy={busy} readOnly={readOnly} onSave={values => void save(values)} onCancel={close} />}
      </>}
  </section>
}
