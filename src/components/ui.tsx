import { useEffect, useId, useRef, useState } from 'react'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { useDelayedPending } from './useDelayedPending.ts'
import styles from './ui.module.css'

export function Button({ variant = 'secondary', shape = 'pill', compact = false, className = '', type = 'button', children, loading = false, loadingLabel, pending = false, disabled, ...props }: ComponentPropsWithRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger' | 'neutral' | 'warning' | 'destructive' | 'recovery'
  shape?: 'pill' | 'control'
  compact?: boolean
  /** This button initiated a task and may show delayed progress. */
  loading?: boolean
  loadingLabel?: string
  /** Temporarily lock this button while leaving its normal appearance. */
  pending?: boolean
}) {
  const showSpinner = useDelayedPending(loading && !disabled)
  const showLoadingLabel = showSpinner && !!loadingLabel
  const control = shape === 'control' || props.role === 'switch' || props['aria-pressed'] !== undefined
  const appearance = variant === 'secondary' || variant === 'neutral' ? 'outline'
    : variant === 'warning' || variant === 'destructive' || variant === 'recovery' ? `${variant}-action` : variant
  return <button {...props} disabled={disabled || loading || pending} aria-busy={loading || props['aria-busy']}
    data-action-shape={control ? 'control' : 'pill'} data-modal-neutral={variant === 'neutral' || undefined}
    data-button-size={compact ? 'compact' : undefined}
    data-button-pending={!disabled && (loading || pending) || undefined} data-close-text={typeof children==='string'&&children.includes('닫기')||undefined}
    type={type} className={`${styles.button} ${showSpinner && !showLoadingLabel ? styles.loadingButton : ''} ${appearance} ${className}`}>
    {showLoadingLabel ? <span className={styles.loadingContent}>
      <span className={styles.buttonSpinner} data-button-spinner aria-hidden="true" />{loadingLabel}
    </span> : compact ? <span className={styles.compactSurface} data-compact-surface>
      <span className={styles.compactLabel} data-compact-label>{children}</span>
    </span> : children}
    {showSpinner && !showLoadingLabel && <span className={styles.buttonSpinner} data-button-spinner aria-hidden="true" />}
  </button>
}
export function Card({ hero = false, className = '', ...props }: ComponentPropsWithRef<'section'> & { hero?: boolean }) {
  return <section {...props} className={`app-card ${styles.cardSurface} ${styles.card} ${hero ? styles.hero : ''} ${className}`} />
}
export function SectionHeading({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: ReactNode }) {
  return <header className={styles.heading}><div>{eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}<h1>{title}</h1></div>{children}</header>
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className={styles.field}><span>{label}</span>{children}</label>
}
export function StatusNotice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <p className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{children}</p>
}
export function Metadata({ children }: { children: ReactNode }) {
  return <span className={styles.metadata}>{children}</span>
}
export function Help({ label, children }: { label: string; children: ReactNode }) {
  const id = useId(), [open, setOpen] = useState(false), root = useRef<HTMLSpanElement>(null), trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <span className={styles.help} ref={root}>
    <button type="button" className={styles.helpTrigger} aria-label={label} aria-expanded={open} aria-controls={id} ref={trigger} onClick={() => setOpen(value => !value)}><span aria-hidden="true">?</span></button>
    {open && <span id={id} className={styles.popover} role="note">{children}</span>}
  </span>
}
