import { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react'
import { useDialogHistory } from '../app/navigation.ts'
import type { ReactNode, RefObject } from 'react'
import type { RepeatPointerGuard } from './repeatPointerGuard.ts'

export function Dialog({ title, onClose, children, initialFocus, className, descriptionId, closePointerGuard, dismissBlocked = false }: {
  title: string; onClose: () => void; children: ReactNode; initialFocus?: RefObject<HTMLElement | null>
  className?: string; descriptionId?: string; closePointerGuard?: RepeatPointerGuard; dismissBlocked?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null), dismissal = useRef({ onClose, dismissBlocked })
  useLayoutEffect(() => { dismissal.current = { onClose, dismissBlocked } }, [onClose, dismissBlocked])
  const canClose = useCallback(() => !dismissal.current.dismissBlocked, [])
  const requestClose = useCallback(() => { if (canClose()) dismissal.current.onClose() }, [canClose])
  useDialogHistory(titleId, requestClose, canClose)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog?.showModal()
    ;(initialFocus?.current ?? titleRef.current)?.focus({ preventScroll: true })
    return () => { dialog?.close(); if (previous instanceof HTMLElement) previous.focus({ preventScroll: true }) }
  }, [initialFocus])
  return <dialog ref={ref} className={className} data-editor-dialog onCancel={event => { event.preventDefault(); event.stopPropagation(); requestClose() }} aria-labelledby={titleId} aria-describedby={descriptionId}>
    <div className="section-heading"><h2 id={titleId} ref={titleRef} tabIndex={-1} data-dialog-heading>{title}</h2>
      <button type="button" className="icon-button" data-close-text aria-label="닫기" disabled={dismissBlocked} data-button-pending={dismissBlocked || undefined}
        onPointerDown={closePointerGuard?.pointerDown} onPointerCancel={closePointerGuard?.pointerCancel}
        onClick={event => { if (!closePointerGuard?.blocksClick(event)) requestClose() }}>×</button></div>
    {children}
  </dialog>
}
