import { DropdownField, SelectDropdown } from '../../components/common-ui/SelectDropdown.tsx'
import filterTags from '../../components/common-ui/FilterTags.module.css'
import { Button } from '../../components/ui.tsx'
import { presetNumber } from '../workout-online/preset-schedule.ts'
import type { PresetSchedule } from '../workout-online/preset-schedule.ts'
import type { ReactNode } from 'react'
import { Dialog } from '../../components/Dialog.tsx'
import { useConfirmation } from '../../components/useConfirmation.tsx'
import { sameAssignments } from '../workout-online/routine-schedule.ts'
import { useEffect, useRef, useState } from 'react'
import { navigateBack, useNavigationGuard } from '../../app/navigation.ts'
import type { RoutineList } from '../workout-online/types.ts'
import type { Assignment } from './weekly-schedule.ts'

import { routineTags } from '../home/tags.ts'
import styles from '../workout-online/Routine.module.css'

const weekdays = ['월', '화', '수', '목', '금', '토', '일']
export function ScheduleEditor({ state, routines, busy, readOnly = false, readRetry, onSave, onCancel, preset, navigationKey }: { state: { assignments: Assignment[] }; routines: RoutineList['routines']; busy: boolean; readOnly?: boolean; readRetry?: ReactNode; onSave: (assignments: Assignment[]) => void | Promise<boolean>; onCancel: () => void; navigationKey?: string; preset?: { controls: (leave: (action: () => void) => void) => ReactNode; onReload?: () => void; priorityId?: string; active: boolean; stale: boolean; initialApply?: boolean } }) {
  const [draft, setDraft] = useState<Assignment[]>(() => state.assignments.map(a => ({ ...a })))
  const [filter, setFilter] = useState('all')
  const tags = routineTags.filter(tag => routines.some(r => r.tag === tag))
  const assignedIds = new Set(state.assignments.map(a => a.routineId))
  const priority = preset?.priorityId ? routines.find(r => r.id === preset.priorityId) : undefined
  const candidates = routines.filter(r => r.id !== priority?.id).filter(r => filter === 'all' || (filter === 'assigned' ? assignedIds.has(r.id) : filter === 'unassigned' ? !assignedIds.has(r.id) : r.tag === filter.slice(4)))
  const [confirm, setConfirm] = useState(false)
  const dirty = !sameAssignments(state.assignments, draft)
  const saved = useRef(false)
  const [ask, confirmation] = useConfirmation()
  const canLeave = (duringTraversal = false) => !preset || !dirty || ask({ title: '일정 배정 변경을 버릴까요?',
    description: <p>이미 저장한 요일 배정은 유지돼요.</p>,
    confirmLabel: '버리기', destructive: true, duringTraversal,
  })
  useNavigationGuard(() => !navigationKey || saved.current || !busy && canLeave(true), navigationKey)
  const leave = async (action: () => void) => { if (await canLeave()) action() }
  const close = () => {
    if (navigationKey) navigateBack(() => leave(onCancel))
    else leave(onCancel)
  }
  const filters = useRef<HTMLFieldSetElement>(null)
  useEffect(() => { filters.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus() }, [])
  const filtersDisabled = busy || readOnly
  const assignmentFilter = filter === 'assigned' || filter === 'unassigned'
  const tagFilter = filter.startsWith('tag:')
  const canSubmit = !busy && !readOnly && !preset?.stale && (!preset || dirty || preset.initialApply)
  return <form className={styles.scheduleEditor} data-preset={!!preset} aria-label="주간 일정 편집" onSubmit={e => { e.preventDefault(); if (canSubmit) { if (preset) setConfirm(true); else onSave(draft) } }}>
    <div className="section-heading"><h2>주간 일정 편집</h2><button data-close-text type="button" className="quiet" disabled={busy} onClick={close}>닫기</button></div>
    <p>{preset && !preset.active ? '조회 중인 일정의 배정만 저장합니다.' : '저장 즉시 적용합니다. 지난 일정과 시작한 운동의 계획은 유지합니다.'}</p>
    {preset?.controls(leave)}
    <fieldset ref={filters} className={styles.candidateFilters} aria-label="루틴 후보 필터" disabled={filtersDisabled}>
      <SelectDropdown label="배정 유무" variant="filter" value={assignmentFilter ? filter : undefined} selected={assignmentFilter}
        disabled={filtersDisabled} options={[{ id: 'assigned', name: '배정 완료' }, { id: 'unassigned', name: '배정 미완료' }]} onChange={setFilter} />
      <SelectDropdown label="태그" variant="filter" value={tagFilter ? filter : undefined} selected={tagFilter}
        disabled={filtersDisabled || !tags.length} options={tags.map(tag => ({ id: `tag:${tag}`, name: tag }))} onChange={setFilter} />
      <button type="button" className={filterTags.chip} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}><span>전체 보기</span></button>
    </fieldset>
    <fieldset className={styles.scheduleDays} disabled={filtersDisabled}>{weekdays.map((name, index) => {
      const dayOfWeek = index + 1
      const assigned = draft.find(a => a.dayOfWeek === dayOfWeek)?.routineId ?? ''
      const options = [
        ...(priority ? [{ id: priority.id, name: `✦ 새 루틴 · ${priority.name}` }] : []),
        { id: '', name: '휴식' },
        ...(assigned && assigned !== priority?.id && !candidates.some(r => r.id === assigned)
          ? [{ id: assigned, name: routines.find(r => r.id === assigned)?.name ?? '사용할 수 없는 루틴 · 변경 필요' }] : []),
        ...candidates,
      ]
      return <div className={styles.scheduleDay} key={name}>
        <span>{name}요일</span>
        <SelectDropdown label={`${name}요일 루틴`} value={assigned} options={options} disabled={filtersDisabled}
          onChange={routineId => setDraft(values => {
            const next = values.filter(assignment => assignment.dayOfWeek !== dayOfWeek)
            if (routineId) next.push({ dayOfWeek, routineId })
            return next.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          })} />
      </div>
    })}</fieldset>{readRetry || (preset?.onReload
      ? <Button type="button" variant="primary" disabled={busy} onClick={() => { if (preset.onReload) void leave(preset.onReload) }}>최신 일정 확인</Button>
      : <Button type="submit" variant="primary" disabled={!canSubmit}>일정 저장</Button>)}
    {confirm && canSubmit && <Dialog title="주간 일정 변경 확인" tone="info" onClose={() => setConfirm(false)}>
      {!dirty && <p>모든 요일을 휴식으로 적용해요.</p>}<ul>{weekdays.map((name, index) => {
      const before = state.assignments.find(a => a.dayOfWeek === index + 1)?.routineId
      const after = draft.find(a => a.dayOfWeek === index + 1)?.routineId
      const nameFor = (id?: string) => id ? routines.find(r => r.id === id)?.name ?? '사용할 수 없는 루틴' : '휴식'
      return before === after ? null : <li key={name}>{name}요일 · {nameFor(before)} → {nameFor(after)}</li>
    })}</ul><div className="row"><Button type="button" variant="neutral" onClick={() => setConfirm(false)}>취소</Button><Button type="button" variant="primary" onClick={async () => {
      setConfirm(false)
      if (await onSave(draft) && navigationKey) { saved.current = true; navigateBack(onCancel) }
    }}>저장</Button></div></Dialog>}
    {confirmation}
  </form>
}
export function PresetAssignmentEditor({ base, current, id, priorityId, routines, busy, readOnly, readRetry, initialApply, onSelect, onReload, onSave, onClose, navigationKey }: {
  base: PresetSchedule; current: PresetSchedule | undefined; id: string; priorityId?: string; routines: RoutineList['routines']
  busy: boolean; readOnly: boolean; readRetry?: ReactNode; initialApply?: boolean; onSelect: (id: string) => void; onReload: () => void; onSave: (assignments: Assignment[]) => void | Promise<boolean>; onClose: () => void; navigationKey?: string
}) {
  const preset = base.presets.find(p => p.id === id)!
  const latest = current?.presets.find(p => p.id === id)
  const stale = base.version !== current?.version || preset.version !== latest?.version
  const options = current?.presets ?? base.presets
  return <ScheduleEditor key={id + ':' + base.version + ':' + preset.version} state={preset} routines={routines} busy={busy} readOnly={readOnly} readRetry={readRetry} navigationKey={navigationKey}
    preset={{ priorityId, active: id === current?.activeId, stale, initialApply, onReload: stale && current ? onReload : undefined, controls: leave => <>
      <DropdownField label="편집할 주간 일정" value={id} disabled={busy || !current || !!readRetry}
        options={[
          ...(!options.some(p => p.id === id) ? [{ id, name: '삭제된 일정', disabled: true }] : []),
          ...options.map((p, index) => ({ id: p.id, name: `${presetNumber(index)} · ${p.name}` })),
        ]} onChange={next => { void leave(() => onSelect(next)) }} />
    </> }}
    onSave={onSave} onCancel={onClose} />
}
