import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { SchedulePreset } from './preset-schedule.ts'
import { activeWeights, activeCardio } from '../home/model.ts'
import { scheduleRoutineLabel } from '../home/tags.ts'
import { AchievementIcon } from '../../components/AchievementIcon.tsx'
import home from '../home/Home.module.css'
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
    : { weight: exerciseSummary(['구성 확인 필요']), cardio: exerciseSummary(['구성 확인 필요']) }
}
export function RoutineCards({ summaries, details, busy, managementBlocked = false, onSelect, onNew, onEdit, onDelete, schedule, scheduleEditing = false, week, presetHeader, presetNavigation, presetAssignments }: {
  week?: Pick<SchedulePreset, 'assignments' | 'version'>;
  presetHeader?: (viewToggle: ReactNode) => ReactNode; presetNavigation?: ReactNode; presetAssignments?: (id: string) => ReactNode; schedule?: ReactNode; scheduleEditing?: boolean;
  onEdit?: (id: string) => void; onDelete?: (id: string) => void;
  summaries: RoutineList['routines']; details: Map<string, Routine>; busy: boolean; managementBlocked?: boolean;
  onSelect: (id: string) => void; onNew: () => void;
}) {
  const [day, setDay] = useState<number | null>(null)
  const [vertical, setVertical] = useState(false)
  const [filter, setFilter] = useState('all')
  const root = useRef<HTMLDivElement>(null)
  const closeMenus = () => root.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(menu => { menu.open = false })
  useEffect(() => {
    const outside = (event: PointerEvent) => root.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(menu => { if (event.target instanceof Node && !menu.contains(event.target)) menu.open = false })
    const scroll = () => root.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(menu => { menu.open = false })
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const menu = root.current?.querySelector<HTMLDetailsElement>('details[open]')
      if (menu) { menu.open = false; menu.querySelector('summary')?.focus() }
    }
    document.addEventListener('pointerdown', outside, true)
    document.addEventListener('scroll', scroll, { capture: true, passive: true })
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('scroll', scroll, true); document.removeEventListener('keydown', escape) }
  }, [])
  const assigned = week?.assignments ?? []
  const assignedIds = new Set(assigned.map(a => a.routineId))
  const newest = newestRoutines(summaries), sorted = filter === 'oldest' ? [...newest].reverse() : newest
  const filtered = sorted.filter(r => day !== null ? assigned.some(a => a.dayOfWeek === day && a.routineId === r.id)
    : filter !== 'assigned' && filter !== 'unassigned' || (filter === 'assigned' ? assignedIds.has(r.id) : !assignedIds.has(r.id)))
  const chooseDay = (value: number) => { setDay(current => current === value ? null : value); setFilter('all') }
  const dayRoutine = (value: number) => summaries.find(r => r.id === assigned.find(a => a.dayOfWeek === value)?.routineId)
  const emptyDay = week ? week.version === '0' && !presetHeader ? '미등록' : '휴식' : '확인 중'
  const dayLabel = (value: number) => dayRoutine(value)?.name ?? (assigned.some(a => a.dayOfWeek === value) ? '루틴 확인 필요' : emptyDay)
  const viewToggle = <button type="button" className={styles.viewToggle} aria-label={vertical ? '가로 일정 보기' : '세로 일정 보기'} aria-pressed={vertical} onClick={() => setVertical(v => !v)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7">{vertical ? <><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="16" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></> : <><rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/><rect x="3" y="16" width="18" height="4" rx="1"/></>}</svg>
        </button>
  return <div className={styles.list} ref={root}>
    <header hidden={scheduleEditing} className={styles.hero}><div className={styles.eyebrow}>YOUR TRAINING PLAN</div><div className={styles.title}><h2>나의 루틴</h2><button type="button" disabled={busy || managementBlocked} onClick={onNew}>+ 새 루틴</button></div><p className="muted small">다음 운동을 위한 준비. 나에게 맞는 순서로.</p></header>
    <section className={`${home.home} ${styles.weekSection}`} aria-label="루틴 주간 일정">
      <div hidden={scheduleEditing}>
        {presetHeader ? presetHeader(viewToggle) : <div className={styles.title}><strong>이번 주 일정</strong>{viewToggle}</div>}
        {vertical ? <div className={styles.weekRows} aria-label="세로 주간 일정">{dayNames.map((name, i) => {
          const r = dayRoutine(i + 1), detail = r ? details.get(r.id) : undefined
          const weight = detail ? activeWeights(detail).length : 0, cardio = detail ? activeCardio(detail).length : 0
          const counts = detail ? [weight ? `웨이트 ${weight}종목` : '',cardio ? `유산소 ${cardio}종목` : ''].filter(Boolean).join(' · ') : r ? '구성 확인 필요' : ''
          return <button type="button" key={name} className={styles.weekRow} disabled={!week} aria-pressed={day === i + 1} aria-label={[`${name}요일`,r?.tag,dayLabel(i + 1),counts].filter(Boolean).join(' · ')} onClick={() => chooseDay(i + 1)}>
            <b className={styles.weekDay}>{name}</b><span className={styles.weekInfo}>{r?.tag && <span className={styles.tag}>{r.tag}</span>}<strong title={dayLabel(i+1)}>{dayLabel(i + 1)}</strong></span>
            {detail && <span className={styles.planCounts}>{!!weight && <span aria-label={`웨이트 ${weight}종목`}><AchievementIcon kind="weight" />{weight}</span>}{!!cardio && <span aria-label={`유산소 ${cardio}종목`}><AchievementIcon kind="cardio" />{cardio}</span>}</span>}
          </button>
        })}</div> : <div className={`${home.days} ${styles.weekTiles}`} aria-label="가로 주간 일정">{dayNames.map((name, i) => {
          const r = dayRoutine(i + 1)
          return <button type="button" key={name} disabled={!week} aria-pressed={day === i + 1} aria-label={[`${name}요일`, r?.tag, dayLabel(i + 1)].filter(Boolean).join(' · ')} onClick={() => chooseDay(i + 1)}>
            <strong>{name}</strong><span className={styles.weekName} title={dayLabel(i + 1)}>{r ? scheduleRoutineLabel(r.name, r.tag ?? undefined) : dayLabel(i + 1)}</span>
          </button>
        })}</div>}
        {day !== null && <p className={styles.selectedDay}>{dayNames[day - 1]}요일 · {dayLabel(day)}<button type="button" className="quiet" aria-label="요일 필터 해제" onClick={() => {setDay(null);setFilter('all')}}>×</button></p>}
      </div>
      {schedule}
    </section>
    {presetNavigation}
    <div hidden={scheduleEditing}>
      <div className={styles.listHeading} data-preset={!!presetHeader}><strong>저장된 루틴 {summaries.length}개</strong><select aria-label="저장된 루틴 필터" disabled={day !== null} value={day !== null ? `day:${day}` : filter} onChange={e => { closeMenus(); setFilter(e.target.value) }}>{day !== null && <option value={`day:${day}`}>{dayNames[day-1]}요일</option>}<option value="all">전체</option><option value="newest">최신순</option><option value="oldest">오래된순</option><option value="assigned" disabled={!week}>{presetHeader ? '이 일정 배정' : '배정된 루틴'}</option><option value="unassigned" disabled={!week}>{presetHeader ? '이 일정 미배정' : '미배정된 루틴'}</option></select></div>
      {!summaries.length && <section className={styles.card}><p>아직 루틴이 없습니다. 표준 운동으로 첫 루틴을 만들어 주세요.</p></section>}
      {!!summaries.length && !filtered.length && <p className="muted">{day !== null ? `${dayNames[day-1]}요일에 배정된 루틴이 없습니다.` : '조건에 맞는 루틴이 없습니다.'}</p>}
      <div className={styles.cardList}>{filtered.map(r => {
        const summary = composition(details.get(r.id)), days = assigned.filter(a => a.routineId === r.id).sort((a,b) => a.dayOfWeek-b.dayOfWeek).map(a => dayNames[a.dayOfWeek - 1]).join('·') || (week ? '미배정' : '배정 확인 중')
        return <article className={`${styles.compactCard} ${assignedIds.has(r.id) ? styles.assignedCard : ''}`} key={r.id} aria-label={`${r.name} 루틴 카드`}>
          <div className={styles.cardTop}><span className={styles.eyebrow}>ROUTINE {String(newest.findIndex(x => x.id === r.id) + 1).padStart(2, '0')}</span>{r.tag && <span className={styles.tag}>{r.tag}</span>}{!presetAssignments && <span className={styles.cardDays} title={days}>{days}</span>}
            {(onEdit || onDelete) && <details className={styles.cardMenu} onToggle={e => { const current = e.currentTarget; if (current.open) root.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(menu => { if (menu !== current) menu.open = false }) }}><summary aria-label={`${r.name} 메뉴`}>⋯</summary><div>
              {onEdit && <button type="button" disabled={busy || managementBlocked} onClick={e => { e.currentTarget.closest('details')!.open = false; onEdit(r.id) }}>수정</button>}
              {onDelete && <button type="button" className="danger" disabled={busy || managementBlocked} onClick={e => { e.currentTarget.closest('details')!.open = false; onDelete(r.id) }}>삭제</button>}
            </div></details>}
          </div>
          <button type="button" className={styles.cardBody} disabled={busy} aria-label={`${r.name} 상세`} onClick={() => { closeMenus(); onSelect(r.id) }}><span className={styles.cardName}>{r.name}</span><span className={styles.exerciseLine}><b>WEIGHT</b><span title={summary.weight.text}>{summary.weight.text}</span></span><span className={styles.exerciseLine}><b>CARDIO</b><span title={summary.cardio.text}>{summary.cardio.text}</span></span></button>
          {presetAssignments?.(r.id)}
        </article>
      })}</div>
    </div>
  </div>
}
