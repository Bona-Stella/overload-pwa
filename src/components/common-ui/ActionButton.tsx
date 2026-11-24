import type { ComponentPropsWithoutRef } from 'react'
import { useDelayedPending } from '../useDelayedPending'
import styles from './ActionButton.module.css'

export type ActionAppearance = 'primary' | 'secondary' | 'danger-outline' | 'danger-primary' | 'contrast-outline' | 'warning' | 'recovery'
type ActionButtonProps = ComponentPropsWithoutRef<'button'> & {
  appearance?: ActionAppearance
  size?: 'regular' | 'modal' | 'small'
  loading?: boolean
  loadingLabel?: string
}

export function ActionButton({
  appearance = 'secondary', size = 'regular', loading, loadingLabel,
  disabled, type = 'button', className, children, ...props
}: ActionButtonProps) {
  const hasLoadingState = loading !== undefined || loadingLabel !== undefined
  const pending = !!loading && !disabled
  const showSpinner = useDelayedPending(pending)
  return <button
    {...props}
    type={type}
    className={className ? `${styles.button} ${className}` : styles.button}
    data-appearance={appearance}
    data-size={size}
    data-button-pending={pending || undefined}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
  >
    <span className={styles.content} data-progress-hidden={showSpinner && !loadingLabel || undefined} aria-hidden={showSpinner && !!loadingLabel || undefined}>{children}</span>
    {hasLoadingState && <span className={styles.content} data-progress-visible={showSpinner ? true : undefined} aria-hidden={!showSpinner || !loadingLabel || undefined}>
      <span className={styles.spinner} data-button-spinner={showSpinner || undefined} aria-hidden="true" />
      {loadingLabel}
    </span>}
  </button>
}
