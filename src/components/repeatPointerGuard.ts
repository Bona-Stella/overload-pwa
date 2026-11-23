import type { MouseEvent, PointerEvent } from 'react'

const repeatWindow = 275
const repeatRadius = 24

/** Protects the receiving button when a pointer action reveals it under the same point. */
export function createRepeatPointerGuard() {
  let opening: { x: number; y: number; until: number; target?: HTMLElement } | null = null
  let blockedPress: { id: number; target: HTMLElement } | null = null

  const matches = (event: MouseEvent<HTMLElement>) => opening !== null
    && (!opening.target || event.currentTarget === opening.target)
    && performance.now() < opening.until
    && Math.hypot(event.clientX - opening.x, event.clientY - opening.y) <= repeatRadius

  return {
    arm(event: MouseEvent<HTMLElement>, target?: HTMLElement | null) {
      blockedPress = null
      opening = event.detail === 0 || target === null ? null : {
        x: event.clientX, y: event.clientY, until: performance.now() + repeatWindow, target,
      }
    },
    pointerDown(event: PointerEvent<HTMLElement>) {
      if (event.isPrimary && event.button === 0) {
        blockedPress = matches(event) ? { id: event.pointerId, target: event.currentTarget } : null
      }
    },
    pointerCancel(event: PointerEvent<HTMLElement>) {
      if (blockedPress?.id === event.pointerId) blockedPress = null
    },
    blocksClick(event: MouseEvent<HTMLElement>) {
      if (event.detail === 0) return false
      const pointerId = (event.nativeEvent as Partial<globalThis.PointerEvent>).pointerId
      const startedDuringGuard = blockedPress?.target === event.currentTarget
        && (pointerId === undefined || pointerId < 0 || pointerId === blockedPress.id)
      blockedPress = null
      if (!startedDuringGuard && !matches(event)) return false
      event.preventDefault()
      event.stopPropagation()
      return true
    },
  }
}

export type RepeatPointerGuard = ReturnType<typeof createRepeatPointerGuard>
