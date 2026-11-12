import { useEffect, useId, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'

export function Dialog({ title, onClose, children, initialFocus }: {
  title: string; onClose: () => void; children: ReactNode; initialFocus?: RefObject<HTMLElement | null>
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog?.showModal()
    initialFocus?.current?.focus()
    return () => { dialog?.close(); if (previous instanceof HTMLElement) previous.focus({ preventScroll: true }) }
  }, [initialFocus])
  return <dialog ref={ref} onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }} aria-labelledby={titleId}>
    <div className="section-heading"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="닫기" onClick={onClose}>×</button></div>
    {children}
  </dialog>
}
