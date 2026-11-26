import { flushSync } from 'react-dom'
import type { MouseEvent } from 'react'
import { ConnectedDropdown } from './ConnectedDropdown.tsx'
import styles from './ConnectedDropdown.module.css'

export type MenuAction = {
  label: string
  disabled?: boolean
  danger?: boolean
  run?: (event: MouseEvent<HTMLButtonElement>) => void
}

export function ActionMenu({ label, actions, className, icon }: {
  label: string
  actions: MenuAction[]
  className?: string
  icon?: string
}) {
  return <ConnectedDropdown label={label} value={icon} className={className} variant="action">{close =>
    <div className={styles.scroll} data-dropdown-scroll role="presentation">
      {actions.map(action => <button key={action.label} type="button" role="menuitem" className={styles.item} data-dropdown-item
        data-danger={action.danger || undefined} disabled={action.disabled} onClick={event => {
          // Remove the overlay before the caller measures the newly exposed pointer target or opens a dialog.
          flushSync(close)
          action.run?.(event)
        }}>{action.label}</button>)}
    </div>
  }</ConnectedDropdown>
}
