import { Icon } from '../../components/icons/Icon.tsx'
import { cardioEdit } from '../../components/icons/workout.tsx'
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
      <Icon icon={cardioEdit} />
    </button>
  </div>
}
