import { useEffect, useId, useRef, useState } from 'react'
import type { ComponentPropsWithRef, ComponentPropsWithoutRef, ReactNode } from 'react'
import styles from './ui.module.css'

export function Button({ variant = 'secondary', className = '', type = 'button', ...props }: ComponentPropsWithoutRef<'button'> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger' }) {
  return <button {...props} type={type} className={`${styles.button} ${variant === 'secondary' ? 'outline' : variant} ${className}`} />
}
export function Card({ hero = false, className = '', ...props }: ComponentPropsWithRef<'section'> & { hero?: boolean }) {
  return <section {...props} className={`${styles.card} ${hero ? styles.hero : ''} ${className}`} />
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
