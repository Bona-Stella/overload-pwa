import type { ReactNode, Ref } from 'react'
import styles from './CardioFocus.module.css'

export function CardioValue({ children, modified }: { children: ReactNode; modified?: boolean }) {
  return modified ? <span className={styles.modifiedValue} data-modified>{children}</span> : children
}

export function CardioValueRow({ label, value, editLabel, valueDescription, onEdit, expanded, controls, disabled, buttonRef }: {
  label: ReactNode; value: ReactNode; editLabel: string; onEdit?: () => void; expanded?: boolean; controls?: string
  disabled?: boolean; buttonRef?: Ref<HTMLButtonElement>; valueDescription?: string
}) {
  return <div className={styles.recordedTime}>
    <span>{label}</span>
    <strong>{value}</strong>
    <button ref={buttonRef} type="button" className={`quiet ${styles.editTime}`} aria-label={editLabel}
      aria-description={valueDescription} aria-expanded={expanded} aria-controls={controls} disabled={disabled} onClick={onEdit}>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5 11.5-1 4.5 4.5-1L16 7.5 12.5 4zM11 5.5 14.5 9" />
      </svg>
    </button>
  </div>
}
