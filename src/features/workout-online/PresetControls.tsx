import type { ReactNode } from 'react'
import { dayNames } from './routine-schedule.ts'
import { canDeletePreset, presetLimit, presetNumber } from './preset-schedule.ts'
import type { PresetSchedule, SchedulePreset } from './preset-schedule.ts'
import styles from './Presets.module.css'

export function PresetHeader({ schedule, viewed, busy, readOnly, viewToggle, onActivate, onToggle, onRename, onOrganize, onDelete }: {
  schedule: PresetSchedule; viewed: SchedulePreset; busy: boolean; readOnly: boolean; viewToggle: ReactNode
  onActivate: () => void; onToggle: () => void; onRename: () => void; onOrganize: () => void; onDelete: () => void
}) {
  const active = schedule.activeId === viewed.id
  const number = presetNumber(schedule.presets.indexOf(viewed))
  const menuAction = (button: HTMLButtonElement, action: () => void) => {
    const menu = button.closest('details')
    if (menu) { menu.open = false; menu.querySelector('summary')?.focus() }
    action()
  }
  return <>
    <div className={styles.titleRow}>
      <span className={styles.kicker}>주간 루틴 일정</span>
      {active ? <span className={styles.status} data-mode="active" title="현재 적용된 주간 일정"><span aria-hidden="true">✓</span>진행중</span>
        : schedule.autoEnabled ? <span className={styles.status} data-mode="preview" role="status" aria-label="보기 · 조회 전용" title="자동 순환 중 · 조회 전용">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/></svg>보기</span>
          : <button type="button" className={styles.status} disabled={busy || readOnly} onClick={onActivate} aria-label={number + '번 주간 일정으로 즉시 전환'}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 7h14m0 0-4-4m4 4-4 4M17 17H3m0 0 4-4m-4 4 4 4"/></svg>전환</button>}
    </div>
    <div className={styles.header}>
      <div className={styles.presetIdentity}><span className={styles.number} aria-label={number + '번 일정'}>{number}</span><strong title={viewed.name}>{viewed.name}</strong></div>
      <div className={styles.tools}>
        <button type="button" className={styles.icon} aria-label="자동 순환" title={schedule.autoEnabled ? '자동 순환 ON' : '자동 순환 OFF'} aria-pressed={schedule.autoEnabled} disabled={busy || readOnly} onClick={onToggle}>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 8a8 8 0 0 0-14-2L4 9m0-5v5h5m-5 7a8 8 0 0 0 14 2l2-3m0 5v-5h-5"/></svg>
        </button>
        {viewToggle}
        <details className={styles.menu}><summary aria-label="주간 루틴 일정 메뉴">⋯</summary><div>
          <button type="button" disabled={busy || readOnly} onClick={e => menuAction(e.currentTarget, onRename)}>주간 일정 이름 변경</button>
          <button type="button" disabled={busy} onClick={e => menuAction(e.currentTarget, onOrganize)}>주간 일정 전체 편집</button>
          <button type="button" className="danger" disabled={busy || readOnly || !canDeletePreset(schedule, viewed)} onClick={e => menuAction(e.currentTarget, onDelete)}>현재 보고 있는 일정 삭제</button>
        </div></details>
      </div>
    </div>
  </>
}

export function PresetNavigation({ schedule, viewed, busy, readOnly, onView, onAdd }: {
  schedule: PresetSchedule; viewed: SchedulePreset; busy: boolean; readOnly: boolean
  onView: (id: string) => void; onAdd: () => void
}) {
  return <div className={styles.navigation} role="group" aria-label="주간 일정 프리셋">
      {schedule.presets.map((preset, index) => <button type="button" key={preset.id} aria-label={(index + 1) + '번 프리셋 보기'}
        title={preset.name} aria-pressed={viewed.id === preset.id} onClick={() => onView(preset.id)}>{index + 1}</button>)}
      {schedule.presets.length < presetLimit && !readOnly && <button type="button" aria-label="빈 프리셋 추가" disabled={busy} onClick={onAdd}>+</button>}
  </div>
}

export function PresetMembership({ presets, routineId }: { presets: SchedulePreset[]; routineId: string }) {
  const entries = presets.flatMap((preset, index) => {
    const days = preset.assignments.filter(a => a.routineId === routineId).map(a => dayNames[a.dayOfWeek - 1])
    return days.length ? [{ preset, number: presetNumber(index), days }] : []
  })
  return <div className={styles.membership} aria-label="주간 일정 배정">
    {entries.length ? entries.map(({ preset, number, days }) => <p key={preset.id}><b>{number}</b> {preset.name} · {days.join('·')}</p>) : <p>주간 일정 미배정</p>}
  </div>
}
