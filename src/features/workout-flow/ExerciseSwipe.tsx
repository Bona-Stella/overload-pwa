import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { ReactNode } from 'react'
import styles from './WorkoutFlow.module.css'

type Direction = 'previous' | 'next'
export type ExerciseSwipeOptions = {
  currentId: string
  previous?: { id: string; cardio: boolean }
  next?: { id: string; cardio: boolean }
  renderPreview: (id: string) => ReactNode
  disabled: boolean
  canMove?: () => boolean
  onGo: (id: string) => boolean | Promise<boolean>
}

const interactive = 'button, input, textarea, select, a, label, summary, [contenteditable], [draggable=true], [role=button], [role=slider], [role=listbox], [role=combobox], [role=spinbutton], [data-swipe-ignore]'
const keyboardOrOverlay = '[data-keyboard-open], dialog[open], [role=dialog][aria-modal=true]'
const edge = 24
const settleTime = 220
const directionOf = (distance: number): Direction => distance < 0 ? 'next' : 'previous'

function blocksSwipe(target: Element, viewport: HTMLElement) {
  if (target.closest(interactive)) return true
  for (let element: Element | null = target; element && element !== viewport; element = element.parentElement) {
    if (element.scrollWidth > element.clientWidth && /^(auto|scroll)$/.test(getComputedStyle(element).overflowX)) return true
  }
  return false
}

type Drag = {
  finger: number; x: number; y: number; width: number; distance: number; offset: number
  lastAt: number; velocity: number; horizontal: boolean
}

export function ExerciseSwipe({ options, cardio, children }: { options: ExerciseSwipeOptions; cardio?: boolean; children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const latest = useRef(options)
  useLayoutEffect(() => { latest.current = options }, [options])
  const { currentId, disabled } = options
  const [preview, setPreview] = useState<{ from: string; direction: Direction } | null>(null)
  if (preview && (disabled || preview.from !== currentId)) setPreview(null)

  useLayoutEffect(() => {
    const viewport = viewportRef.current!, track = trackRef.current!
    if (disabled) return
    const listeners = new AbortController()
    const { signal } = listeners
    let drag: Drag | undefined
    let frame = 0, timeout = 0, blockClickUntil = 0
    let settling = false
    let previewDirection: Direction | undefined
    let finishAnimation: (() => void) | undefined

    const canMove = () => latest.current.canMove?.() !== false &&
      (window.visualViewport?.scale ?? 1) <= 1.01 && !document.querySelector(keyboardOrOverlay) &&
      !document.activeElement?.matches('input, textarea, select, [contenteditable]')
    const paint = (offset: number, direction: Direction) => {
      viewport.dataset.swiping = direction
      track.style.setProperty('--exercise-swipe-offset', offset + 'px')
    }
    const positionPreview = () => {
      const page = document.scrollingElement
      const flow = viewport.closest<HTMLElement>('[data-workout-frame]')
      const pane = track.querySelector<HTMLElement>('[data-swipe-preview]')
      if (!page || !flow || !pane) return
      // Show the destination's last reachable slice without moving the source page.
      const minimum = Number.parseFloat(getComputedStyle(flow).minHeight) || 0
      const destinationHeight = Math.max(minimum, flow.offsetHeight - track.offsetHeight + pane.offsetHeight)
      const maximum = Math.max(0, page.scrollHeight - flow.offsetHeight + destinationHeight - page.clientHeight)
      pane.style.setProperty('--exercise-swipe-clamp', Math.max(0, page.scrollTop - maximum) + 'px')
    }
    const showPreview = (direction: Direction) => {
      const next = latest.current[direction] ? direction : undefined
      if (next === previewDirection) return
      previewDirection = next
      viewport.dataset.swiping = direction
      flushSync(() => setPreview(next ? { from: currentId, direction: next } : null))
      positionPreview()
    }
    const reset = (clearPreview = true) => {
      cancelAnimationFrame(frame)
      clearTimeout(timeout)
      frame = 0
      drag = undefined
      settling = false
      finishAnimation = undefined
      delete viewport.dataset.swiping
      delete viewport.dataset.swipeSettling
      track.style.removeProperty('--exercise-swipe-offset')
      previewDirection = undefined
      if (clearPreview) setPreview(null)
    }
    const release = (gesture: Drag, eventTime: number, cancelled = false) => {
      drag = undefined
      if (!gesture.horizontal) return
      if (!gesture.offset) { reset(); return }
      blockClickUntil = performance.now() + settleTime
      const direction = directionOf(gesture.distance)
      const target = latest.current[direction]
      const fast = Math.abs(gesture.distance) >= 24 && eventTime - gesture.lastAt <= 100 &&
        gesture.velocity * Math.sign(gesture.distance) >= 0.55
      const commit = !cancelled && target && canMove() && (Math.abs(gesture.distance) >= gesture.width * 0.35 || fast)
      const finish = async () => {
        clearTimeout(timeout)
        finishAnimation = undefined
        if (!commit || latest.current[direction]?.id !== target.id || !canMove()) { reset(); return }
        // Keep the preview in place while the normal transition saves the selected exercise.
        try { if (!await latest.current.onGo(target.id)) reset() }
        catch { reset() }
      }
      settling = true
      cancelAnimationFrame(frame)
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { void finish(); return }
      // The drag threshold uses the page width. Only the landing offset includes the gap.
      const gap = Number.parseFloat(getComputedStyle(viewport).getPropertyValue('--exercise-swipe-gap'))
      const landingOffset = commit ? Math.sign(gesture.distance) * (gesture.width + gap) : 0
      paint(gesture.offset, direction)
      frame = requestAnimationFrame(() => {
        viewport.dataset.swipeSettling = ''
        finishAnimation = () => { void finish() }
        paint(landingOffset, direction)
        timeout = window.setTimeout(finishAnimation, settleTime + 60)
      })
    }
    const cancel = () => { if (drag) release(drag, 0, true) }
    viewport.addEventListener('touchstart', event => {
      if (event.touches?.length !== 1) { cancel(); return }
      if (settling || !canMove() || !(event.target instanceof Element)) return
      const touch = event.touches[0]
      if (!touch || touch.clientX < edge || touch.clientX > window.innerWidth - edge || blocksSwipe(event.target, viewport)) return
      drag = { finger: touch.identifier, x: touch.clientX, y: touch.clientY, width: viewport.clientWidth, distance: 0,
        offset: 0, lastAt: event.timeStamp, velocity: 0, horizontal: false }
    }, { passive: true, signal })
    viewport.addEventListener('touchmove', event => {
      const gesture = drag
      if (!gesture) return
      if (event.touches?.length !== 1 || !event.cancelable) { cancel(); return }
      const touch = event.touches[0]
      if (touch.identifier !== gesture.finger) return
      const distance = touch.clientX - gesture.x
      if (!gesture.horizontal) {
        const vertical = Math.abs(touch.clientY - gesture.y), horizontal = Math.abs(distance)
        if (Math.max(vertical, horizontal) < 8) return
        if (vertical >= horizontal) { drag = undefined; return }
        if (horizontal < vertical * 1.25) return
        gesture.horizontal = true
      }
      // Native scrolling and edge gestures keep their default behavior until this point.
      event.preventDefault()
      const direction = directionOf(distance)
      showPreview(direction)
      gesture.velocity = (distance - gesture.distance) / Math.max(1, event.timeStamp - gesture.lastAt)
      gesture.lastAt = event.timeStamp
      gesture.distance = distance
      gesture.offset = latest.current[direction] ? Math.sign(distance) * Math.min(gesture.width, Math.abs(distance))
        : Math.sign(distance) * Math.min(28, Math.abs(distance) / 4)
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0
        paint(gesture.offset, directionOf(gesture.distance))
      })
    }, { passive: false, signal })
    viewport.addEventListener('touchend', event => {
      if (drag && event.changedTouches && Array.from(event.changedTouches).some(touch => touch.identifier === drag?.finger)) release(drag, event.timeStamp)
    }, { passive: true, signal })
    viewport.addEventListener('touchcancel', cancel, { passive: true, signal })
    viewport.addEventListener('pointercancel', event => { if (event.pointerType === 'touch') cancel() }, { signal })
    viewport.addEventListener('transitionend', event => {
      if (event.target === track && event.propertyName === 'transform') finishAnimation?.()
    }, { signal })
    viewport.addEventListener('click', event => {
      if (event.detail && performance.now() < blockClickUntil) { event.preventDefault(); event.stopPropagation() }
    }, { capture: true, signal })
    window.addEventListener('pagehide', () => reset(), { signal })
    return () => { listeners.abort(); reset(false) }
  }, [currentId, disabled])

  const adjacent = preview?.from === currentId && !disabled ? options[preview.direction] : undefined
  return <div ref={viewportRef} className={styles.swipeViewport} data-exercise-swipe>
    <div ref={trackRef} className={styles.swipeTrack} data-swipe-track>
      <div className={styles.swipePage} data-swipe-current data-cardio-page={cardio || undefined}>{children}</div>
      {preview && adjacent && <div key={adjacent.id} className={`${styles.swipePage} ${styles.swipePreview}`} data-swipe-preview={preview.direction}
        data-cardio-page={adjacent.cardio || undefined} aria-hidden="true" inert>{options.renderPreview(adjacent.id)}</div>}
    </div>
  </div>
}
