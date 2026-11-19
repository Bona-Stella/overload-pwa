import type { ComponentPropsWithoutRef } from 'react'
import styles from './ActionButton.module.css'

type ActionButtonProps = ComponentPropsWithoutRef<'button'> & {
  appearance?: 'primary' | 'secondary' | 'danger-outline' | 'danger-primary' | 'contrast-outline'
  size?: 'regular' | 'modal' | 'small'
  loading?: boolean
  loadingLabel?: string
}

export function ActionButton({
  appearance = 'secondary', size = 'regular', loading, loadingLabel,
  disabled, type = 'button', className, children, ...props
}: ActionButtonProps) {
  const hasLoadingState = loading !== undefined || loadingLabel !== undefined
  return <button
    {...props}
    type={type}
    className={className ? `${styles.button} ${className}` : styles.button}
    data-appearance={appearance}
    data-size={size}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
  >
    <span className={styles.content} aria-hidden={loading || undefined}>{children}</span>
    {hasLoadingState && <span className={styles.content} aria-hidden={loading ? undefined : true}>
      <span className={styles.spinner} aria-hidden="true" />
      {loadingLabel ?? '처리 중'}
    </span>}
  </button>
}
