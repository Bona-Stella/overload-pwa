import { Button } from '../ui.tsx'
import styles from './CircleCheck.module.css'

export function CircleCheck({ label, checked, disabled, onClick, onCheckedChange }: {
  label: string
  checked: boolean
  disabled?: boolean
  onClick?: () => void
  onCheckedChange?: (checked: boolean) => void
}) {
  const mark = <span className={styles.mark} aria-hidden="true">{checked ? '✓' : ''}</span>

  if (onCheckedChange) {
    return <label className={`${styles.control} ${styles.choice}`} data-done={checked || undefined}>
      <input type="checkbox" aria-label={label} checked={checked} disabled={disabled}
        onChange={event => onCheckedChange(event.target.checked)} />
      {mark}
    </label>
  }

  return <Button variant="quiet" className={styles.control} aria-label={label}
    disabled={disabled} data-done={checked || undefined} onClick={onClick}>{mark}</Button>
}
