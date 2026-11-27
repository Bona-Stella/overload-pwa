import { useLayoutEffect, useRef } from 'react'
import { navigateBack, useScreenHistory } from '../../app/navigation.ts'
import type { RefObject } from 'react'
import type { AppTab } from '../../app/types.ts'

type RecordRoute = { id: string; returnScroll?: number; summary?: boolean; backLabel?: string }

export function restoreParentScroll(position: number) {
  const restore = () => {
    if (Math.abs(window.scrollY - position) > 1) window.scrollTo({ top: position, behavior: 'instant' })
    return Math.abs(window.scrollY - position) <= 1
  }
  if (restore()) return
  // The parent can briefly have only its loading content after a browser Back.
  const input = new AbortController()
  const observer = new ResizeObserver(() => { if (restore()) stop() })
  const frame = requestAnimationFrame(() => { if (restore()) stop() })
  const stop = () => {
    cancelAnimationFrame(frame)
    observer.disconnect()
    input.abort()
  }
  observer.observe(document.querySelector('main') ?? document.body)
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) {
    window.addEventListener(event, stop, { passive: true, signal: input.signal })
  }
  return stop
}

export function useDetailReturn(id: string | undefined, owner: string, returnScroll?: number, resetOnOpen = true, container?: RefObject<HTMLElement | null>) {
  const origin = useRef<{ owner: string; trigger: HTMLElement | null; top: number } | null>(null)
  const previous = useRef({ id, owner, returnScroll })
  useLayoutEffect(() => {
    const parent = previous.current
    previous.current = { id, owner, returnScroll }
    if (parent.owner !== owner) { origin.current = null; return }
    if (container && !container.current?.getClientRects().length) return
    if (id) {
      if (resetOnOpen && id !== parent.id && window.scrollY !== 0) window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }
    if (!parent.id) return
    const source = origin.current
    const trigger = source?.trigger
    if (trigger?.isConnected && trigger.getClientRects().length && !trigger.closest('[hidden], [inert]') && !trigger.matches(':disabled')) {
      trigger.focus({ preventScroll: true })
    } else {
      document.querySelector<HTMLElement>('nav[aria-label="기본 탐색"] button[aria-current="page"]:enabled')?.focus({ preventScroll: true })
    }
    const position = parent.returnScroll ?? (source?.owner === owner ? source.top : undefined)
    if (position !== undefined) return restoreParentScroll(position)
  }, [id, owner, returnScroll, resetOnOpen, container])
  return (trigger?: HTMLElement, top = window.scrollY) => {
    const active = trigger ?? document.activeElement
    origin.current = { owner, trigger: active instanceof HTMLElement && active.matches('button, a[href]') ? active : null, top }
  }
}

export function useRecordDetailHistory(key: string, tab: AppTab, resetOnOpen = true) {
  const [route, setRoute] = useScreenHistory<RecordRoute | null>(key, null)
  const remember = useDetailReturn(route?.id, key + ':' + tab, route?.returnScroll, resetOnOpen)
  const open = (id: string, returnScroll = window.scrollY, trigger?: HTMLElement) => {
    remember(trigger, returnScroll)
    setRoute({ id, returnScroll })
  }
  const back = () => navigateBack(() => setRoute(null, true))
  return { route, open, back }
}
