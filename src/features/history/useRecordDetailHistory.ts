import { useLayoutEffect, useRef } from 'react'
import { navigateBack, useScreenHistory } from '../../app/navigation.ts'
import type { AppTab } from '../../app/types.ts'

type RecordRoute = { id: string; returnScroll?: number; summary?: boolean; backLabel?: string }

export function restoreParentScroll(position: number) {
  const restore = () => {
    window.scrollTo(0, position)
    return Math.abs(window.scrollY - position) <= 1
  }
  restore()
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

export function useRecordDetailHistory(key: string, tab: AppTab, resetOnOpen = true) {
  const [route, setRoute] = useScreenHistory<RecordRoute | null>(key, null)
  const id = route?.id
  const returnScroll = route?.returnScroll
  const previous = useRef({ key, returnScroll, tab })
  useLayoutEffect(() => {
    const parent = previous.current
    previous.current = { key, returnScroll, tab }
    if (id && resetOnOpen) window.scrollTo(0, 0)
    if (!id && parent.key === key && parent.tab === tab && parent.returnScroll !== undefined) {
      return restoreParentScroll(parent.returnScroll)
    }
  }, [id, key, returnScroll, tab, resetOnOpen])
  const open = (id: string, returnScroll = window.scrollY) => setRoute({ id, returnScroll })
  const back = () => navigateBack(() => setRoute(null, true))
  return { route, open, back }
}
