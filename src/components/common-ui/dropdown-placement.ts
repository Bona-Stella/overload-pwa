import { editorViewport } from '../editorViewport.ts'

type Space = { above: number; below: number }

export function dropdownSide({ above, below }: Space, desired: number, previous?: 'above' | 'below', preferBelow = false, minimum = 48) {
  const usable = Math.min(desired, minimum)
  if (previous && (previous === 'below' ? below : above) >= usable) return previous
  if (below >= desired || preferBelow && below >= usable) return 'below'
  if (above >= desired) return 'above'
  return below >= above ? 'below' : 'above'
}

export function placeDropdown(root: HTMLElement, trigger: HTMLElement, panel: HTMLElement, connected: boolean, preferBelow: boolean, alignEnd: boolean) {
  const dialog = root.closest('dialog[open]')
  const shell = root.closest('.app-shell')
  const chrome = dialog ? [] : [...(shell?.querySelectorAll<HTMLElement>('main ~ nav, main footer, main [data-keyboard-header], main header') ?? [])]
  const clipped: HTMLElement[] = []
  let scroller: HTMLElement | undefined
  for (let element = root.parentElement; element && element !== document.body; element = element.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(element)
    if (/auto|scroll|hidden|clip/.test(overflowX + overflowY)) clipped.push(element)
    if (!scroller && /auto|scroll/.test(overflowY) && element.scrollHeight > element.clientHeight) scroller = element
    if (element === dialog) break
  }
  const gap = connected ? 0 : 4
  let previous: 'above' | 'below' | undefined
  function bounds() {
    const viewport = editorViewport()
    const visualLeft = window.visualViewport?.offsetLeft ?? 0
    let top = viewport.clientTop + 8, bottom = viewport.clientTop + viewport.height - 8
    let left = visualLeft + 8, right = visualLeft + (window.visualViewport?.width ?? document.documentElement.clientWidth) - 8
    for (const element of chrome) {
      if (!element.getClientRects().length) continue
      const { position, visibility } = getComputedStyle(element)
      if (visibility === 'hidden') continue
      if (position !== 'fixed' && position !== 'sticky') continue
      const rect = element.getBoundingClientRect()
      if (element.matches('header, [data-keyboard-header]')) top = Math.max(top, rect.bottom + 8)
      else bottom = Math.min(bottom, rect.top - 8)
    }
    for (const element of clipped) {
      const rect = element.getBoundingClientRect(), css = getComputedStyle(element)
      if (/auto|scroll|hidden|clip/.test(css.overflowY)) {
        top = Math.max(top, rect.top + element.clientTop + 8)
        bottom = Math.min(bottom, rect.top + element.clientTop + element.clientHeight - 8)
      }
      if (/auto|scroll|hidden|clip/.test(css.overflowX)) {
        left = Math.max(left, rect.left + element.clientLeft)
        right = Math.min(right, rect.left + element.clientLeft + element.clientWidth)
      }
    }
    return { top, bottom, left, right }
  }
  function measure(allowScroll = false) {
    if (!trigger.getClientRects().length) return false
    const { top, bottom, left, right } = bounds()
    const rect = trigger.getBoundingClientRect()
    panel.style.setProperty('--dropdown-width-limit', `${Math.max(0, right - left)}px`)
    const list = panel.querySelector<HTMLElement>('[data-dropdown-scroll]')
    const natural = panel.scrollHeight + 2 + (list ? list.scrollHeight - list.clientHeight : 0)
    const desired = Math.min(340, natural)
    const space = { above: rect.top - top - gap, below: bottom - rect.bottom - gap }
    const minimum = Math.min(desired, 48 + (list ? panel.scrollHeight - list.clientHeight + 2 : 0))
    const side = dropdownSide(space, desired, previous, preferBelow, minimum)
    if (allowScroll && bottom - top > rect.height) {
      let movement = rect.top < top ? rect.top - top : rect.bottom > bottom ? rect.bottom - bottom : 0
      if (!movement && space[side] < minimum) {
        movement = side === 'below' ? Math.min(minimum - space.below, rect.top - top) : -Math.min(minimum - space.above, bottom - rect.bottom)
      }
      if (Math.abs(movement) >= 1) {
        if (scroller) scroller.scrollBy({ top: movement, behavior: 'instant' })
        else window.scrollBy({ top: movement, behavior: 'instant' })
        return measure()
      }
    }
    previous = side
    root.dataset.placement = side
    panel.dataset.placement = side
    panel.style.setProperty('--dropdown-available', `${Math.max(0, Math.floor(space[side]))}px`)
    const width = panel.getBoundingClientRect().width
    const start = alignEnd ? rect.right - width : rect.left
    panel.style.setProperty('--dropdown-inline-offset', `${Math.max(left, Math.min(start, right - width)) - rect.left}px`)
    return true
  }
  const update = () => { measure() }
  measure(true)
  const list = panel.querySelector<HTMLElement>('[data-dropdown-scroll][role="listbox"]')
  const current = list?.querySelector<HTMLElement>('[aria-selected="true"]')
  if (list && current) {
    const area = list.getBoundingClientRect(), item = current.getBoundingClientRect()
    if (item.bottom > area.bottom) list.scrollTop += item.bottom - area.bottom
    else if (item.top < area.top) list.scrollTop += item.top - area.top
  }
  const resize = () => { measure(true) }
  const observer = new ResizeObserver(update)
  for (const element of [trigger, root.parentElement, panel, ...chrome, ...clipped]) if (element) observer.observe(element)
  const viewport = window.visualViewport
  window.addEventListener('scroll', update, { capture: true, passive: true })
  window.addEventListener('resize', resize)
  viewport?.addEventListener('scroll', update)
  viewport?.addEventListener('resize', resize)
  return () => {
    observer.disconnect()
    window.removeEventListener('scroll', update, true)
    window.removeEventListener('resize', resize)
    viewport?.removeEventListener('scroll', update)
    viewport?.removeEventListener('resize', resize)
  }
}
