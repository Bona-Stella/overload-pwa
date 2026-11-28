import type { ReactNode } from 'react'
import styles from './WeekDateGrid.module.css'

type DateItem = {
  date: string
  weekday: string
  label: string
  mark?: string
  markStatus?: string
  info: ReactNode
  infoLabel?: string
  infoTitle?: string
  infoStatus?: string
  counts?: ReactNode
}

export function WeekDateGrid({ days, today, selected = null, onSelect, label, disabled, vertical, dateDot = false }: {
  days: DateItem[]
  today: string
  selected?: string | null
  onSelect?: (date: string) => void
  label: string
  disabled?: boolean
  vertical?: boolean
  dateDot?: boolean
}) {
  return <div role="group" aria-label={label} className={styles.grid}
    data-week-grid data-vertical={vertical || undefined}>
    {days.map(({ date, weekday, label, mark, markStatus, info, infoLabel, infoTitle, infoStatus, counts }) => {
      const isSelected = selected === date
      const isToday = date === today
      const isPast = date < today
      const item = {
        'aria-current': isToday ? 'date' as const : undefined,
        'data-week-day': date, className: styles.day,
      }
      const content = <>
        {dateDot
          ? <span className={styles.dateSlot} aria-hidden="true" data-week-dot={isSelected || isToday || undefined} />
          : <time className={styles.date} dateTime={date} data-past={isPast}>{date.slice(8)}</time>}
        <strong className={styles.mark} data-status={markStatus}>{mark ?? weekday}</strong>
        <span className={styles.info} role={infoLabel ? "img" : undefined} aria-label={infoLabel} data-week-info data-status={infoStatus} data-past={isPast} title={infoTitle}>{info}</span>
        {counts}
      </>
      return onSelect
        ? <button key={date} type="button" {...item} aria-label={label} aria-pressed={isSelected} disabled={disabled}
          onClick={() => onSelect(date)}>{content}</button>
        : <div key={date} {...item} title={label}>{content}</div>
    })}
  </div>
}
