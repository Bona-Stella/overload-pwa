import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { FeedbackIcon } from './FeedbackIcon.tsx'
import styles from './Toast.module.css'

export type ToastMessage = {
  id: string | number
  tone: 'success' | 'error' | 'warning' | 'info'
  message: string
}

const durationByTone = { success: 4000, error: 7000, warning: 7000, info: 4000 }

type ToastProps = {
  toast: ToastMessage | null
  onDismiss: (id: ToastMessage['id']) => void
  /** Dock clearance in addition to the safe area, such as the tab bar or the workout footer. */
  bottomClearance?: string
  passThrough?: boolean
}

export function Toast({ toast, onDismiss, bottomClearance = '0px', passThrough = false }: ToastProps) {
  const urgent = toast?.tone === 'error' || toast?.tone === 'warning'
  return <>
    <span className="sr-only" role="status">{urgent ? '' : toast?.message}</span>
    <span className="sr-only" role="alert">{urgent ? toast?.message : ''}</span>
    {toast && <ToastPill toast={toast} onDismiss={onDismiss} bottomClearance={bottomClearance} passThrough={passThrough} />}
  </>
}

function ToastPill({ toast, onDismiss, bottomClearance, passThrough }: Required<Omit<ToastProps, 'toast'>> & { toast: ToastMessage }) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const pill = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const { id, tone, message } = toast
  const paused = hovered || focused
  const dismiss = useEffectEvent((scheduledId: ToastMessage['id']) => {
    if (!paused && scheduledId === id) onDismiss(id)
  })

  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(() => dismiss(id), durationByTone[tone])
    return () => window.clearTimeout(timer)
  }, [id, tone, paused])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const measure = () => {
      const inset = viewport.scale <= 1.01
        ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)
        : 0
      pill.current?.style.setProperty('--toast-viewport-inset', `${inset}px`)
    }
    measure()
    viewport.addEventListener('resize', measure)
    viewport.addEventListener('scroll', measure)
    return () => {
      viewport.removeEventListener('resize', measure)
      viewport.removeEventListener('scroll', measure)
    }
  }, [])

  return <div
    ref={pill}
    className={styles.toast}
    data-tone={tone}
    data-pass-through={passThrough || undefined}
    style={{ '--toast-clearance': bottomClearance } as CSSProperties}
    onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true) }}
    onPointerLeave={() => setHovered(false)}
  >
    <FeedbackIcon name={tone === 'success' ? 'check' : tone} />
    <p aria-hidden="true">{message}</p>
    <button
      type="button" aria-label="알림 닫기" className={styles.close}
      onFocus={event => {
        previousFocus.current = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null
        setFocused(true)
      }}
      onBlur={() => setFocused(false)}
      onClick={event => {
        if (document.activeElement === event.currentTarget) previousFocus.current?.focus({ preventScroll: true })
        onDismiss(id)
      }}
    ><FeedbackIcon name="close" size={16} /></button>
  </div>
}
