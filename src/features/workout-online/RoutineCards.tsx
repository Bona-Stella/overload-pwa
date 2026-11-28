import { WeekDateGrid } from '../../components/common-ui/WeekDateGrid.tsx'
import { iconGlyphs } from '../../components/icons/glyphs.ts'
import { Icon } from '../../components/icons/Icon.tsx'
import { weekColumns, weekRows } from '../../components/icons/routine.tsx'
import { ActionMenu } from '../../components/common-ui/ActionMenu.tsx'
import { SelectDropdown } from '../../components/common-ui/SelectDropdown.tsx'
import { useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { createRepeatPointerGuard } from '../../components/repeatPointerGuard.ts'
import type { SchedulePreset } from './preset-schedule.ts'
import { activeWeights, activeCardio, dateInZone, dayOfWeek, weekDates } from '../home/model.ts'
import { scheduleRoutineLabel } from '../home/tags.ts'
import { AchievementIcon } from '../../components/AchievementIcon.tsx'
import { Button, Card } from '../../components/ui.tsx'
import { EmptyState } from '../../components/common-ui/ContentFeedback.tsx'
import { FeedbackIcon } from '../../components/common-ui/FeedbackIcon.tsx'
import { newestRoutines } from './routine-order.ts'
import { dayNames } from './routine-schedule.ts'
import type { Routine, RoutineList } from './types.ts'
import styles from './Routine.module.css'

function exerciseSummary(names: string[]) {
  const first = names[0] ?? '없음', remaining = Math.max(0, names.length - 1)
  return { first, remaining, text: first + (remaining ? ` 외 ${remaining}` : '') }
}
function composition(routine: Routine | undefined) {
  return routine ? { weight: exerciseSummary(activeWeights(routine).map(p => p.exerciseName)), cardio: exerciseSummary(activeCardio(routine).map(p => p.plan.name)) }
    : null
}
export function RoutineCards({ summaries, details, busy, managementBlocked = false, onSelect, onNew, onEdit, onDelete, schedule, scheduleEditing = false, week, presetHeader, presetNavigation, presetAssignments, scheduleState, scheduleLoading = false, listState, listRetry, timeZone }: {
  timeZone?: string;
  week?: Pick<SchedulePreset, 'assignments' | 'version'>;
  presetHeader?: (viewToggle: ReactNode) => ReactNode; presetNavigation?: ReactNode; presetAssignments?: (id: string) => ReactNode; schedule?: ReactNode; scheduleEditing?: boolean;
  scheduleState?: ReactNode; scheduleLoading?: boolean; listState?: ReactNode; listRetry?: ReactNode;
  onEdit?: (id: string) => void; onDelete?: (id: string) => void;
  summaries: RoutineList['routines']; details: Map<string, Routine>; busy: boolean; managementBlocked?: boolean;
  onSelect: (id: string, trigger: HTMLButtonElement) => void; onNew: (trigger: HTMLButtonElement) => void;
}) {
  const [day, setDay] = useState<number | null>(null)
  const [vertical, setVertical] = useState(false)
  const [filter, setFilter] = useState('all')
  const [detailPointerGuard] = useState(createRepeatPointerGuard)
  const root = useRef<HTMLDivElement>(null)
  function deleteFromMenu(event: MouseEvent<HTMLButtonElement>, id: string) {
    const revealed = event.detail > 0
      ? document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>('button[data-routine-detail]')
      : null
    detailPointerGuard.arm(event, revealed && root.current?.contains(revealed) ? revealed : null)
    onDelete?.(id)
  }
  const assigned = week?.assignments ?? []
  const assignedIds = new Set(assigned.map(a => a.routineId))
  const newest = newestRoutines(summaries), sorted = filter === 'oldest' ? [...newest].reverse() : newest
  const filtered = sorted.filter(r => day !== null ? assigned.some(a => a.dayOfWeek === day && a.routineId === r.id)
    : filter !== 'assigned' && filter !== 'unassigned' || (filter === 'assigned' ? assignedIds.has(r.id) : !assignedIds.has(r.id)))
  const today = dateInZone(new Date(), timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
  const dates = weekDates(today)
  const chooseDate = (date: string | null) => {
    const next = date ? dayOfWeek(date) : null
    setDay(current => current === next ? null : next)
    setFilter('all')
  }
  const dayRoutine = (value: number) => summaries.find(r => r.id === assigned.find(a => a.dayOfWeek === value)?.routineId)
  const emptyDay = week ? week.version === '0' && !presetHeader ? '미등록' : '휴식' : ''
  const dayLabel = (value: number) => dayRoutine(value)?.name ?? (assigned.some(a => a.dayOfWeek === value) ? '루틴 확인 필요' : emptyDay)
  const viewToggle = <button type="button" className={styles.viewToggle} aria-label={vertical ? '가로 일정 보기' : '세로 일정 보기'} aria-pressed={vertical} onClick={() => setVertical(v => !v)}>
          <Icon icon={vertical ? weekColumns : weekRows} />
        </button>
  return <div className={styles.list} ref={root}>
    <header hidden={scheduleEditing} className={styles.hero}>
      <div className={styles.eyebrow}>YOUR TRAINING PLAN</div>
      <div className={styles.title}>
        <div><h2>나의 루틴</h2><p className="muted small">다음 운동을 위한 준비. 나에게 맞는 순서로.</p></div>
        <Button type="button" disabled={busy || managementBlocked} onClick={event => onNew(event.currentTarget)}>+ 새 루틴</Button>
      </div>
    </header>
    <Card className={styles.weekSection} aria-label="루틴 주간 일정" aria-busy={scheduleLoading || undefined}>
      <div className={styles.weekContent} hidden={scheduleEditing}>
        {presetHeader ? presetHeader(viewToggle) : <div className={styles.title}><strong>이번 주 일정</strong>{viewToggle}</div>}
        {scheduleState ?? <WeekDateGrid days={dates.map((date, index) => {
          const value = index + 1
          const weekday = dayNames[index]
          const routine = dayRoutine(value)
          const detail = vertical && routine ? details.get(routine.id) : undefined
          const weight = detail ? activeWeights(detail).length : 0
          const cardio = detail ? activeCardio(detail).length : 0
          return {
            date, weekday, infoTitle: dayLabel(value),
            info: routine ? scheduleRoutineLabel(routine.name, routine.tag ?? undefined) : dayLabel(value),
            label: [date, `${weekday}요일`, routine?.tag, dayLabel(value),
              weight ? `웨이트 ${weight}종목` : '', cardio ? `유산소 ${cardio}종목` : ''].filter(Boolean).join(' · '),
            counts: detail && <span className={styles.planCounts}>
              {!!weight && <span aria-label={`웨이트 ${weight}종목`}><AchievementIcon kind="weight" />{weight}</span>}
              {!!cardio && <span aria-label={`유산소 ${cardio}종목`}><AchievementIcon kind="cardio" />{cardio}</span>}
            </span>,
          }
        })} today={today} selected={day === null ? null : dates[day - 1]} onSelect={chooseDate}
          label={vertical ? '세로 주간 일정' : '가로 주간 일정'} disabled={!week} vertical={vertical} dateDot />}
        {!scheduleState && day !== null && <p className={styles.selectedDay}>{[`${dayNames[day - 1]}요일`, dayRoutine(day)?.tag, dayLabel(day)].filter(Boolean).join(' - ')}<button type="button" className="quiet" aria-label="요일 필터 해제" onClick={() => chooseDate(null)}>{iconGlyphs.close}</button></p>}
      </div>
      {schedule}
    </Card>
    {presetNavigation}
    {listState ?? <div hidden={scheduleEditing}>
      <div className={styles.listHeading} data-preset={!!presetHeader}><strong>저장된 루틴 {summaries.length}개</strong><SelectDropdown label="저장된 루틴 필터" className={styles.listFilter}
        variant="filter" disabled={day !== null} value={day !== null ? `day:${day}` : filter} onChange={setFilter}
        options={[
          ...(day !== null ? [{ id: `day:${day}`, name: dayNames[day - 1] + '요일' }] : []),
          { id: 'all', name: '전체' }, { id: 'newest', name: '최신순' }, { id: 'oldest', name: '오래된순' },
          { id: 'assigned', name: presetHeader ? '이 일정 배정' : '배정된 루틴', disabled: !week },
          { id: 'unassigned', name: presetHeader ? '이 일정 미배정' : '미배정된 루틴', disabled: !week },
        ]} />{listRetry}</div>
      {!summaries.length && <Card><EmptyState embedded icon={<FeedbackIcon name="routine" size={24} />} title="등록된 루틴이 없어요" description="첫 번째 루틴을 만들어 보세요." /></Card>}
      {!!summaries.length && !filtered.length && <EmptyState icon={<FeedbackIcon name="search" size={24} />} title={day !== null ? `${dayNames[day-1]}요일에 배정된 루틴이 없어요` : '조건에 맞는 루틴이 없어요'} />}
      <div className={styles.cardList}>{filtered.map(r => {
        const summary = composition(details.get(r.id)), days = assigned.filter(a => a.routineId === r.id).sort((a,b) => a.dayOfWeek-b.dayOfWeek).map(a => dayNames[a.dayOfWeek - 1]).join('·') || (week ? '미배정' : '')
        return <article className={`${styles.compactCard} ${assignedIds.has(r.id) ? styles.assignedCard : ''}`} key={r.id} aria-label={`${r.name} 루틴 카드`}>
          <div className={styles.cardTop}><span className={styles.eyebrow}>ROUTINE {String(newest.findIndex(x => x.id === r.id) + 1).padStart(2, '0')}</span>{r.tag && <span className={styles.tag}>{r.tag}</span>}{!presetAssignments && <span className={styles.cardDays} title={days}>{days}</span>}
            {(onEdit || onDelete) && <ActionMenu label={`${r.name} 메뉴`} className={styles.cardMenu} actions={[
              ...(onEdit ? [{ label: '수정', disabled: busy || managementBlocked, run: () => onEdit(r.id) }] : []),
              ...(onDelete ? [{ label: '삭제', danger: true, disabled: busy || managementBlocked, run: (event: MouseEvent<HTMLButtonElement>) => deleteFromMenu(event, r.id) }] : []),
            ]} />}
          </div>
          <button type="button" className={styles.cardBody} aria-label={`${r.name} 상세`} data-routine-detail
            onPointerDown={detailPointerGuard.pointerDown} onPointerCancel={detailPointerGuard.pointerCancel}
            onClick={event => { if (!detailPointerGuard.blocksClick(event)) onSelect(r.id, event.currentTarget) }}><span className={styles.cardName}>{r.name}</span><span className={styles.exerciseLine}><b>WEIGHT</b><span title={summary?.weight.text}>{summary?.weight.text}</span></span><span className={styles.exerciseLine}><b>CARDIO</b><span title={summary?.cardio.text}>{summary?.cardio.text}</span></span></button>
          {presetAssignments?.(r.id)}
        </article>
      })}</div>
    </div>}
  </div>
}
