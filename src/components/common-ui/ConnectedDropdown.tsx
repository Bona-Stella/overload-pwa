import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { editorViewport } from '../editorViewport.ts'
import styles from './ConnectedDropdown.module.css'

type Props = {
  label: string
  className?: string
  children: (close: () => void) => ReactNode
}

export function ConnectedDropdown({ label, className, children }: Props) {
  const id = useId()
  const triggerId = `${id}-trigger`
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const close = () => {
    setOpen(false)
    document.getElementById(triggerId)?.focus({ preventScroll: true })
  }

  useLayoutEffect(() => {
    const region = root.current
    const content = panel.current
    if (!open || !region || !content) return

    const navigation = region.closest('.app-shell')?.querySelector('main ~ nav')
    const viewport = window.visualViewport
    const position = () => {
      const { clientTop, height } = editorViewport()
      const bottom = Math.min(clientTop + height, navigation?.getBoundingClientRect().top ?? Infinity)
      const available = Math.floor(bottom - region.getBoundingClientRect().bottom - 8)
      content.style.setProperty('--dropdown-available', `${Math.max(0, available)}px`)
      return available
    }

    // Reveal enough space for the controls on short screens without adding document height.
    const missing = Math.min(200, content.scrollHeight + 2) - position()
    if (missing > 0) {
      window.scrollBy({ top: missing, behavior: 'instant' })
      position()
    }

    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !region.contains(event.target)) setOpen(false)
    }
    const observer = new ResizeObserver(position)
    observer.observe(region.parentElement ?? region)
    if (navigation) observer.observe(navigation)
    document.addEventListener('pointerdown', outside, true)
    window.addEventListener('scroll', position)
    window.addEventListener('resize', position)
    viewport?.addEventListener('scroll', position)
    viewport?.addEventListener('resize', position)
    return () => {
      observer.disconnect()
      document.removeEventListener('pointerdown', outside, true)
      window.removeEventListener('scroll', position)
      window.removeEventListener('resize', position)
      viewport?.removeEventListener('scroll', position)
      viewport?.removeEventListener('resize', position)
    }
  }, [open])

  return <div ref={root} className={className ? `${styles.root} ${className}` : styles.root} data-open={open} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }} onKeyDown={event => {
    if (open && event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  }}>
    <button id={triggerId} type="button" className={styles.trigger} aria-expanded={open}
      aria-controls={open ? id : undefined} onClick={() => setOpen(value => !value)}>
      {label}<span className={styles.indicator} aria-hidden="true" />
    </button>
    {open && <div id={id} ref={panel} className={styles.panel} role="region" aria-labelledby={triggerId}>
      {children(close)}
    </div>}
  </div>
}
