import { Icon } from '../../components/icons/Icon.tsx'
import { chevronLeft, chevronRight } from '../../components/icons/common.tsx'
import { periodCalendar } from '../../components/icons/period.tsx'
import type { PlannedDay } from './api.ts'
import { useRecordPreview } from './RecordDisplayContext.ts'
import { partialAchievement } from './display-achievement.ts'
import { localToday } from './period-selection.ts'
import { useState } from 'react'
import { addDays, dayOfWeek, weekdays, dayStatus } from '../home/model.ts'
import { selectedPeriod } from './period-selection.ts'
import type { PeriodSelection } from './period-selection.ts'
import { useDelayedPending } from '../../components/useDelayedPending.ts'
import { Card } from '../../components/ui.tsx'
import segmented from '../../components/common-ui/SegmentedControl.module.css'

export function PeriodControls({ value, onChange, monthOnly = false, compact = false, days = [], variant, pendingMode, pendingValue }: { value: PeriodSelection; onChange: (value: PeriodSelection) => void; monthOnly?: boolean; compact?: boolean; days?:PlannedDay[]; variant?:'activity'; pendingMode?: PeriodSelection['mode']; pendingValue?: PeriodSelection }) {
  const preview=useRecordPreview()
  const [calendar, setCalendar] = useState<string | null>(null)
  const range = selectedPeriod(value)
  const showPending = useDelayedPending(!!pendingMode)
  const monthMove = (anchor: string, direction: number) => {
    const d = new Date(anchor.slice(0,7) + '-01T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + direction)
    return d.toISOString().slice(0,10)
  }
  const move = (direction: number) => {
    const base = pendingValue?.mode === value.mode ? pendingValue : value
    onChange({ ...base, anchor:base.mode === 'week' ? addDays(selectedPeriod(base).fromDate, direction * 7) : monthMove(base.anchor,direction) })
  }
  const monthLabel = (anchor: string) => anchor.slice(0,4) + '년 ' + Number(anchor.slice(5,7)) + '월'
  const periodLabel = value.mode === 'month'
    ? (variant === 'activity' ? value.anchor.slice(0,7).replace('-','/') : monthLabel(value.anchor))
    : range.fromDate.slice(5).replace('-','/') + ' ~ ' + addDays(range.toDateExclusive,-1).slice(5).replace('-','/')
  const first = calendar?.slice(0,7) + '-01'
  const count = calendar ? new Date(Date.UTC(Number(calendar.slice(0,4)),Number(calendar.slice(5,7)),0)).getUTCDate() : 0
  const Container = compact ? 'section' : Card
  return <Container className="record-period" data-layout={variant} aria-label={monthOnly ? '조회 월' : '조회 기간'}>
    {!monthOnly && <>{variant!=='activity'&&<h2>조회 기간</h2>}<div className={`record-tabs ${segmented.segment}`} data-period-tabs>
      {(['week', 'month'] as const).map(mode => <button key={mode} type="button" className="outline" aria-pressed={value.mode === mode}
        aria-busy={pendingMode === mode || undefined} aria-disabled={pendingMode === mode || undefined}
        data-wait={showPending && pendingMode === mode || undefined}
        onClick={() => { if (pendingMode !== mode) onChange({ ...value, mode }) }}>
        {mode === 'week' ? '주간' : '월간'}
      </button>)}
    </div></>}
    <div className="record-period-row"><button type="button" className="outline" aria-label="이전 기간" onClick={() => move(-1)}><Icon icon={chevronLeft} /></button><b>{periodLabel}</b><button type="button" className="outline" aria-label="다음 기간" onClick={() => move(1)}><Icon icon={chevronRight} /></button><button type="button" className="outline record-calendar-trigger" aria-label="달력 열기" aria-expanded={!!calendar} onClick={() => setCalendar(calendar ? null : value.anchor)}><Icon icon={periodCalendar} /></button></div>
    {calendar && <section className="record-calendar" aria-label="조회 기간 선택"><div className="section-heading"><button className="quiet" aria-label="달력 이전 달" onClick={() => setCalendar(monthMove(calendar,-1))}><Icon icon={chevronLeft} /></button><b>{monthLabel(calendar)}</b><button className="quiet" aria-label="달력 다음 달" onClick={() => setCalendar(monthMove(calendar,1))}><Icon icon={chevronRight} /></button><button data-close-text className="quiet" onClick={() => setCalendar(null)}>닫기</button></div><div className="record-calendar-grid">{weekdays.map(w => <span key={w}>{w}</span>)}{Array.from({length:dayOfWeek(first)-1},(_,i) => <span key={'pad'+i} />)}{Array.from({length:count},(_,i) => { const day=addDays(first,i),planned=(preview?.overview(selectedPeriod({mode:'month',anchor:day})).plannedDays??days).find(d=>d.date===day),session=preview?.evidence.find(s=>s.id===planned?.selectedSessionId),status=dayStatus(planned,day,preview?.today??localToday(),session?partialAchievement(session):'unknown'),mark=day>(preview?.today??localToday())?'·':status.kind==='unknown'?'?':status.kind==='planned'?'·':status.mark; return <button className="quiet" key={day} aria-label={day} aria-pressed={day===value.anchor} onClick={() => { onChange({...value,anchor:day}); setCalendar(null) }} title={status.label}>{i+1}<small aria-hidden="true" data-state={status.kind}>{mark}</small></button> })}</div></section>}
  </Container>
}
