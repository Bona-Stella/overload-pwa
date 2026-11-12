
import { useState } from 'react'
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from 'react'

type Slot = { top: number; height: number }
type Drag<Group> = {
  pointerId: number; group: Group; slots: Slot[]
  from: number; to: number; startY: number; offset: number
}

function dragPosition<Group>(drag: Drag<Group>, pageY: number) {
  const origin = drag.slots[drag.from], last = drag.slots[drag.slots.length - 1]
  const delta = pageY - drag.startY
  const center = origin.top + origin.height / 2 + delta
  const midpoint = (index: number) => drag.slots[index].top + drag.slots[index].height / 2
  let to = drag.from
  while (to > 0 && center <= midpoint(to - 1)) to--
  while (to < drag.slots.length - 1 && center >= midpoint(to + 1)) to++
  const offset = Math.max(drag.slots[0].top - origin.top, Math.min(last.top + last.height - origin.top - origin.height, delta))
  return { to, offset }
}

function rowOffset<Group>(drag: Drag<Group>, index: number) {
  const { from, to, slots } = drag
  if (index === from) return drag.offset
  // Keep captured rows mounted until drop while adjacent rows show the insertion space.
  const gap = slots[1].top - slots[0].top - slots[0].height
  const step = slots[from].height + gap
  if (from < index && index <= to) return -step
  if (to <= index && index < from) return step
  return 0
}

/** Shared pointer capture and keyboard ordering from the weekly preset editor. */
export function useDragOrder<Group>(onMove: (group: Group, id: string, targetId: string, handle: HTMLButtonElement) => void) {
  const [drag, setDrag] = useState<Drag<Group> | null>(null)
  function start(event: PointerEvent<HTMLButtonElement>, group: Group, index: number) {
    if (!event.isPrimary || event.button !== 0 || drag) return
    const section = event.currentTarget.closest('[data-order-group]')
    if (!section) return
    const slots = Array.from(section.querySelectorAll('[data-order-row]'), row => {
      const { top, height } = row.getBoundingClientRect()
      return { top: top + window.scrollY, height }
    })
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ pointerId: event.pointerId, group, slots, from: index, to: index, startY: event.pageY, offset: 0 })
  }
  function finish(event: PointerEvent<HTMLButtonElement>, id: string, ids: string[]) {
    if (drag?.pointerId !== event.pointerId) return
    setDrag(null)
    const bounds = event.currentTarget.closest('[data-order-group]')?.getBoundingClientRect()
    if (!bounds || event.clientY < bounds.top || event.clientY > bounds.bottom ||
      event.clientX < bounds.left || event.clientX > bounds.right) return
    onMove(drag.group, id, ids[dragPosition(drag, event.pageY).to], event.currentTarget)
  }
  return {
    drag,
    rowStyle: (group: Group, index: number): CSSProperties | undefined =>
      drag?.group === group ? { transform: `translateY(${rowOffset(drag, index)}px)` } : undefined,
    handleProps: (group: Group, id: string, ids: string[], index: number) => ({
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        if (drag) {
          if (event.key === 'Escape' && event.currentTarget.hasPointerCapture(drag.pointerId)) {
            event.preventDefault()
            event.stopPropagation()
            event.currentTarget.releasePointerCapture(drag.pointerId)
            setDrag(null)
          }
          return
        }
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
        event.preventDefault()
        const target = ids[index + (event.key === 'ArrowUp' ? -1 : 1)]
        if (target) onMove(group, id, target, event.currentTarget)
      },
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => start(event, group, index),
      onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
        if (drag?.pointerId === event.pointerId) setDrag({ ...drag, ...dragPosition(drag, event.pageY) })
      },
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => finish(event, id, ids),
      onPointerCancel: () => setDrag(null),
      onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => {
        if (drag?.pointerId === event.pointerId) setDrag(null)
      },
      onClick: (event: MouseEvent<HTMLButtonElement>) => { event.preventDefault(); event.stopPropagation() },
    }),
  }
}
