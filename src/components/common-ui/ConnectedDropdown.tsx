import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { placeDropdown } from './dropdown-placement.ts'
import styles from './ConnectedDropdown.module.css'

type Props = {
  label: string
  value?: string
  selectedValue?: string
  variant?: 'value' | 'filter' | 'content' | 'scope' | 'action'
  className?: string
  disabled?: boolean
  selected?: boolean
  onOpen?: () => void
  children: (close: () => void) => ReactNode
}

const openedEvent = 'overload-dropdown-open'

export function ConnectedDropdown({ label, value, selectedValue, variant = 'content', className, disabled, selected, onOpen, children }: Props) {
  const id = useId()
  const triggerId = `${id}-trigger`
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [requested, setOpen] = useState(false)
  if (disabled && requested) setOpen(false)
  const open = requested && !disabled
  const role = variant === 'action' ? 'menu' : variant === 'content' ? undefined : 'listbox'
  const connected = variant === 'value' || variant === 'content'
  const close = () => {
    setOpen(false)
    document.getElementById(triggerId)?.focus({ preventScroll: true })
  }
  const options = () => [...(panel.current?.querySelectorAll<HTMLButtonElement>('[data-dropdown-item]:not(:disabled)') ?? [])]
    .filter(item => item.closest('[data-dropdown-panel]') === panel.current)
  const show = () => {
    trigger.current?.focus({ preventScroll: true })
    root.current?.dispatchEvent(new Event(openedEvent, { bubbles: true }))
    setOpen(true)
    onOpen?.()
  }

  useLayoutEffect(() => {
    const region = root.current, button = trigger.current, content = panel.current
    if (!open || !region || !button || !content) return
    const stop = placeDropdown(region, button, content, connected, variant === 'content', variant === 'action')
    const dismiss = (event: Event) => {
      if (event.target instanceof Node && !region.contains(event.target)) setOpen(false)
    }
    const navigate = () => setOpen(false)
    const visibility = new ResizeObserver(() => {
      if (!button.getClientRects().length || button.matches(':disabled')) setOpen(false)
    })
    visibility.observe(region)
    document.addEventListener('pointerdown', dismiss, true)
    document.addEventListener(openedEvent, dismiss)
    window.addEventListener('popstate', navigate)
    return () => {
      stop()
      visibility.disconnect()
      document.removeEventListener('pointerdown', dismiss, true)
      document.removeEventListener(openedEvent, dismiss)
      window.removeEventListener('popstate', navigate)
      delete region.dataset.placement
    }
  }, [open, connected, variant])

  return <div ref={root} className={[styles.root, className].filter(Boolean).join(' ')} data-dropdown={variant} data-open={open}
    onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }} onKeyDown={event => {
      if (event.defaultPrevented || event.nativeEvent.isComposing) return
      if (open && event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
        return
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || trigger.current?.matches(':disabled')) return
      const fromTrigger = event.target === trigger.current
      const items = options()
      const focused = items.indexOf(document.activeElement as HTMLButtonElement)
      const active = fromTrigger && variant === 'scope' ? items.findIndex(item => item.ariaSelected === 'true') : focused
      if (!fromTrigger && active < 0) return
      event.preventDefault()
      event.stopPropagation()
      const last = event.key === 'End' || event.key === 'ArrowUp'
      if (!open) {
        show()
        requestAnimationFrame(() => { const items = options(); items[last ? items.length - 1 : 0]?.focus() })
        return
      }
      const index = event.key === 'Home' ? 0 : event.key === 'End' || active < 0 && last ? items.length - 1
        : (active + (last ? -1 : 1) + items.length) % items.length
      items[index]?.focus()
    }}>
    <button id={triggerId} ref={trigger} type="button" className={styles.trigger} disabled={disabled} aria-expanded={open}
      aria-label={variant === 'action' || value === undefined || value === label ? label : `${label}: ${value}`}
      aria-haspopup={role} aria-pressed={selected} aria-controls={open ? id : undefined} data-dropdown-label={label} data-value={selectedValue} data-selected={selected}
      onClick={() => { if (open) close(); else show() }}>
      <span className={styles.surface}>
        {variant === 'action' ? <span aria-hidden="true">{value ?? '⋯'}</span> : <>
          <span className={styles.value} title={value}>{value ?? label}</span>
          <svg className={styles.indicator} viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
        </>}
      </span>
    </button>
    {(open || variant === 'action') && <div id={id} ref={panel} className={styles.panel} data-dropdown-panel hidden={!open} inert={!open}
      role={variant === 'action' ? 'menu' : variant === 'content' ? 'region' : undefined} aria-labelledby={triggerId}>
      {children(close)}
    </div>}
  </div>
}
