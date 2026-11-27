import { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react'
import { useDialogHistory } from '../app/navigation.ts'
import type { ReactNode, RefObject } from 'react'
import type { RepeatPointerGuard } from './repeatPointerGuard.ts'
import { FeedbackIcon } from './common-ui/FeedbackIcon.tsx'
import styles from './Dialog.module.css'

export type DialogTone = 'info' | 'success' | 'warning' | 'error' | 'critical' | 'destructive' | 'recheck' | 'processing'
const toneIcons = { info: 'info', success: 'check', warning: 'warning', error: 'error', critical: 'critical', destructive: 'destructive', recheck: 'syncing', processing: 'syncing' } as const

function isBackdrop(dialog: HTMLDialogElement, event: Pick<MouseEvent, 'target' | 'clientX' | 'clientY'>) {
  const { left, top, right, bottom } = dialog.getBoundingClientRect()
  return event.target === dialog && (event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom)
}

export function Dialog({ title, tone, surface, onClose, children, initialFocus, className, descriptionId, closePointerGuard, dismissBlocked = false, dismissOnBackdrop = false, duringTraversal, onDismissed }: {
  title: string; onClose: () => void; children: ReactNode; initialFocus?: RefObject<HTMLElement | null>
  className?: string; descriptionId?: string; closePointerGuard?: RepeatPointerGuard; dismissBlocked?: boolean; dismissOnBackdrop?: boolean
  duringTraversal?: boolean; onDismissed?: () => void
  tone?: DialogTone; surface?: 'wheel' | 'fullscreen'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const backdropPressed = useRef(false)
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null), dismissal = useRef({ onClose, dismissBlocked })
  useLayoutEffect(() => { dismissal.current = { onClose, dismissBlocked } }, [onClose, dismissBlocked])
  const canClose = useCallback(() => !dismissal.current.dismissBlocked, [])
  const requestClose = useCallback(() => { if (canClose()) dismissal.current.onClose() }, [canClose])
  useDialogHistory(titleId, requestClose, canClose, duringTraversal, onDismissed)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog?.showModal()
    ;(initialFocus?.current ?? titleRef.current)?.focus({ preventScroll: true })
    return () => { dialog?.close(); if (previous instanceof HTMLElement) previous.focus({ preventScroll: true }) }
  }, [initialFocus])
  return <dialog ref={ref} className={[tone ? styles.message : !surface && styles.functional, className].filter(Boolean).join(' ') || undefined} data-editor-dialog data-message-tone={tone}
    closedby={dismissBlocked ? 'none' : undefined} onCancel={event => { event.preventDefault(); event.stopPropagation(); requestClose() }}
    onPointerDown={dismissOnBackdrop ? event => { backdropPressed.current = isBackdrop(event.currentTarget, event) } : undefined}
    onClick={dismissOnBackdrop ? event => {
      if (backdropPressed.current && isBackdrop(event.currentTarget, event)) requestClose()
      backdropPressed.current = false
    } : undefined}
    aria-labelledby={titleId} aria-describedby={descriptionId}>
    <div className={tone ? `section-heading ${styles.messageHeading}` : 'section-heading'}>
      {tone && <span className={styles.symbol}><FeedbackIcon name={toneIcons[tone]} size={24} spinning={tone === 'processing'} /></span>}
      <h2 id={titleId} ref={titleRef} tabIndex={-1} data-dialog-heading>{title}</h2>
      <button type="button" className="icon-button" data-close-text aria-label="닫기" disabled={dismissBlocked} data-button-pending={dismissBlocked || undefined}
        onPointerDown={closePointerGuard?.pointerDown} onPointerCancel={closePointerGuard?.pointerCancel}
        onClick={event => { if (!closePointerGuard?.blocksClick(event)) requestClose() }}>×</button></div>
    {children}
  </dialog>
}
