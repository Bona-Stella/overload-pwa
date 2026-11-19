import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { SearchScopeControl } from '../../components/SearchList.tsx'
import styles from './Activity.module.css'

export function SearchScopePopover({ options, value, disabled, onOpen, onChange }: SearchScopeControl) {
  const id = useId()
  const region = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)
  const [keyboard, setKeyboard] = useState(false)
  const selected = Math.max(0, options.findIndex(option => option.id === value))
  const open = active !== null

  useLayoutEffect(() => {
    if (!open || !list.current || !trigger.current) return
    const bounds = list.current.getBoundingClientRect()
    const anchor = trigger.current.getBoundingClientRect()
    const nav = region.current?.closest('.app-shell')?.querySelector('main ~ nav')
    const viewport = window.visualViewport
    const top = viewport?.offsetTop ?? 0
    const bottom = Math.min(top + (viewport?.height ?? window.innerHeight), nav?.getBoundingClientRect().top ?? Infinity)
    const above = bounds.bottom > bottom - 8 && anchor.top - top > bottom - anchor.bottom
    if (above) list.current.dataset.placement = 'above'
    list.current.style.maxHeight = Math.max(44, (above ? anchor.top - top : bottom - anchor.bottom) - 14) + 'px'
    list.current.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !region.current?.contains(event.target)) setActive(null)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])

  const show = (viaKeyboard: boolean) => { onOpen(); setKeyboard(viaKeyboard); setActive(selected) }
  const close = () => { setActive(null); trigger.current?.focus({ preventScroll: true }) }
  const choose = (index: number) => {
    if (options[index].id !== value) onChange(options[index].id)
    close()
  }

  return <div className={styles.scope} ref={region} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setActive(null)
  }}>
    <button type="button" className={`quiet ${styles.scopeTrigger}`} ref={trigger} disabled={disabled}
      aria-label={'검색 범위: ' + options[selected].name} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={event => open ? close() : show(event.detail === 0)} onKeyDown={event => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        event.preventDefault()
        event.stopPropagation()
        show(true)
      }}>
      <span>{options[selected].name}</span>
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
    </button>
    {open && <div className={styles.scopeList} id={id} ref={list} role="listbox" aria-label="검색 범위" data-keyboard={keyboard}
      aria-activedescendant={`${id}-${active}`} tabIndex={0} onKeyDown={event => {
        if (event.key === 'Tab' && event.shiftKey) {
          event.preventDefault()
          close()
          return
        }
        switch (event.key) {
          case 'ArrowDown': setActive((active + 1) % options.length); break
          case 'ArrowUp': setActive((active + options.length - 1) % options.length); break
          case 'Home': setActive(0); break
          case 'End': setActive(options.length - 1); break
          case 'Enter': case ' ': choose(active); break
          case 'Escape': close(); break
          default: return
        }
        setKeyboard(true)
        event.preventDefault()
        event.stopPropagation()
      }}>
      {options.map((option, index) => <div className={styles.scopeOption} key={option.id} id={`${id}-${index}`}
        role="option" aria-selected={option.id === value} data-active={active === index} data-value={option.id}
        onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}>{option.name}</div>)}
    </div>}
  </div>
}
