import { useCallback, useEffect, useId, useRef } from 'react'
import { useDialogHistory } from '../app/navigation.ts'
import type { ReactNode, RefObject } from 'react'

export function Dialog({ title, onClose, children, initialFocus, className, descriptionId }: {
  title: string; onClose: () => void; children: ReactNode; initialFocus?: RefObject<HTMLElement | null>
  className?: string; descriptionId?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null), closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useDialogHistory(titleId, useCallback(() => closeRef.current(), []))
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog?.showModal()
    ;(initialFocus?.current ?? titleRef.current)?.focus({ preventScroll: true })
    return () => { dialog?.close(); if (previous instanceof HTMLElement) previous.focus({ preventScroll: true }) }
  }, [initialFocus])
  return <dialog ref={ref} className={className} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }} aria-labelledby={titleId} aria-describedby={descriptionId}>
    <div className="section-heading"><h2 id={titleId} ref={titleRef} tabIndex={-1} data-dialog-heading>{title}</h2><button type="button" className="icon-button" data-close-text aria-label="닫기" onClick={onClose}>×</button></div>
    {children}
  </dialog>
}
