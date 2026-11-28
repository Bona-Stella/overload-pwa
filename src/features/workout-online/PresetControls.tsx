import { iconGlyphs } from '../../components/icons/glyphs.ts'
import { Icon } from '../../components/icons/Icon.tsx'
import { FeedbackIcon } from '../../components/common-ui/FeedbackIcon.tsx'
import { scheduleView, scheduleSwitch } from '../../components/icons/routine.tsx'
import { ActionMenu } from '../../components/common-ui/ActionMenu.tsx'
import type { ReactNode } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import { dayNames } from './routine-schedule.ts'
import { canDeletePreset, presetLimit, presetNumber, routinePresetEntries } from './preset-schedule.ts'
import type { PresetSchedule, SchedulePreset } from './preset-schedule.ts'
import styles from './Presets.module.css'

export function PresetHeader({ schedule, viewed, busy, readOnly, rotating = false, viewToggle, onActivate, onToggle, onRename, onOrganize, onDelete, onPlan }: {
  schedule: PresetSchedule; viewed: SchedulePreset; busy: boolean; readOnly: boolean; rotating?: boolean; viewToggle: ReactNode
  onActivate: () => void; onToggle: () => void; onRename?: () => void; onOrganize: () => void; onDelete: () => void
  onPlan?: () => void
}) {
  const active = schedule.activeId === viewed.id
  const number = presetNumber(schedule.presets.indexOf(viewed))
  return <>
    <div className={styles.titleRow}>
      <span className={styles.kicker}>주간 루틴 일정</span>
      {active ? <span className={styles.status} data-mode="active" title="현재 적용된 주간 일정"><span aria-hidden="true">{iconGlyphs.check}</span>진행중</span>
        : schedule.autoEnabled ? <span className={styles.status} data-mode="preview" role="status" aria-label="보기 · 조회 전용" title="자동 순환 중 · 조회 전용">
          <Icon icon={scheduleView} />보기</span>
          : <button type="button" className={styles.status} disabled={busy || readOnly} data-button-pending={busy && !readOnly || undefined} onClick={onActivate} aria-label={number + '번 주간 일정으로 즉시 전환'}>
            <Icon icon={scheduleSwitch} size={11} />전환</button>}
    </div>
    <div className={styles.header}>
      <div className={styles.presetIdentity}><span className={styles.number} aria-label={number + '번 일정'}>{number}</span><strong title={viewed.name}>{viewed.name}</strong></div>
      <div className={styles.tools}>
        <button type="button" className={styles.icon} aria-label="자동 순환" title={schedule.autoEnabled ? '자동 순환 ON' : '자동 순환 OFF'} aria-pressed={schedule.autoEnabled} aria-busy={rotating || undefined} disabled={busy || readOnly} data-button-pending={busy && !readOnly || undefined} onClick={onToggle}>
          <FeedbackIcon name="syncing" size={15} spinning={rotating} />
        </button>
        {viewToggle}
        <ActionMenu label="주간 루틴 일정 메뉴" actions={[
          ...(onPlan ? [{ label: '주간 근육 계획', disabled: busy, run: onPlan }] : []),
          onRename ? { label: '주간 일정 이름 변경', disabled: busy || readOnly, run: onRename } : { label: '주간 일정 이름 변경 · 서버 미지원', disabled: true },
          { label: '주간 일정 전체 편집', disabled: busy, run: onOrganize },
          { label: '현재 일정 삭제', danger: true, disabled: busy || readOnly || !canDeletePreset(schedule, viewed), run: onDelete },
        ]} />
      </div>
    </div>
  </>
}

export function PresetLoadingHeader() {
  return <>
    <div className={styles.titleRow}>
      <span className={styles.kicker}>주간 루틴 일정</span><span className={`${styles.status} ${styles.loadingSlot}`} aria-hidden="true" />
    </div>
    <div className={styles.header} aria-hidden="true">
      <div className={styles.presetIdentity}><span className={styles.number} /><strong className={styles.loadingSlot}>주간 루틴 일정</strong></div>
      <div className={styles.tools}>{[0, 1, 2].map(slot => <span className={styles.loadingSlot} key={slot} />)}</div>
    </div>
  </>
}

export function PresetLoadingNavigation() {
  return <div className={styles.navigation} aria-hidden="true">{[0, 1, 2].map(slot => <span className={styles.loadingSlot} key={slot} />)}</div>
}

export function RoutineCreatedNotice({ name, onLater, onAssign, blocked = false }: {
  name: string; onLater: () => void; onAssign: () => void; blocked?: boolean
}) {
  return <Card aria-label="새 루틴 일정 배정">
    <h2>주간 일정에 배정할까요?</h2>
    <p className={styles.createdMessage}>“{name}”</p>
    <div className={styles.createdActions}><Button type="button" onClick={onLater}>나중에</Button>
      <Button type="button" variant="primary" disabled={blocked} onClick={onAssign}>배정하기</Button></div>
  </Card>
}

export function PresetNavigation({ schedule, viewed, busy, readOnly, onView, onAdd }: {
  schedule: PresetSchedule; viewed: SchedulePreset; busy: boolean; readOnly: boolean
  onView: (id: string) => void; onAdd: () => void
}) {
  return <div className={styles.navigation} role="group" aria-label="주간 일정 프리셋">
      {schedule.presets.map((preset, index) => <button type="button" key={preset.id} aria-label={(index + 1) + '번 프리셋 보기'}
        title={preset.name} aria-pressed={viewed.id === preset.id} onClick={() => onView(preset.id)}>{index + 1}</button>)}
      {schedule.presets.length < presetLimit && !readOnly && <button type="button" aria-label="빈 프리셋 추가" disabled={busy} data-button-pending={busy || undefined} onClick={onAdd}>{iconGlyphs.add}</button>}
  </div>
}

export function PresetMembership({ presets, routineId }: { presets: SchedulePreset[]; routineId: string }) {
  const entries = routinePresetEntries(presets, routineId)
  return <div className={styles.membership} aria-label="주간 일정 배정">
    {entries.length ? entries.map(({ preset, number, days }) => <p key={preset.id}><b>{number}</b> {preset.name} · {days.map(day => dayNames[day - 1]).join('·')}</p>) : <p>주간 일정 미배정</p>}
  </div>
}
