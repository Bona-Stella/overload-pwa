export function editorViewport() {
  const viewport = window.visualViewport
  const height = viewport?.height ?? window.innerHeight
  const offsetTop = viewport?.offsetTop ?? 0
  // During Safari keyboard panning, client rects already reflect the window scroll.
  const clientTop = viewport ? viewport.pageTop - window.scrollY : 0
  const scale = viewport?.scale ?? 1
  const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight)
  return { offsetTop, clientTop, height, scale, occlusion: Math.max(0, layoutHeight - height) }
}

export function revealEditorField(field: HTMLElement, {
  header, footer, reserve,
}: {
  header?: Element | null; footer?: Element | null; reserve?: (missing: number) => void
} = {}) {
  const dialog = field.closest('dialog[open]')
  const { clientTop, height } = editorViewport()
  let scroller: Element | null = dialog
  for (let parent = field.parentElement; parent && parent !== dialog && parent !== document.body; parent = parent.parentElement) {
    if (parent.scrollHeight > parent.clientHeight && /^(auto|scroll)$/.test(getComputedStyle(parent).overflowY)) {
      scroller = parent
      break
    }
  }
  const bounds = scroller?.getBoundingClientRect()
  const ceiling = Math.max(clientTop, bounds?.top ?? 0, dialog ? 0 : header?.getBoundingClientRect().bottom ?? 0)
  const floor = Math.min(clientTop + height, bounds?.bottom ?? Infinity, dialog ? Infinity : footer?.getBoundingClientRect().top ?? Infinity)
  if (floor <= ceiling) return

  const rect = field.getBoundingClientRect()
  // A small margin helps after a genuine obstruction, but never triggers a move on its own.
  const gap = Math.min(12, Math.max(0, floor - ceiling - rect.height))
  const movement = rect.bottom > floor + 1 && rect.top >= ceiling - 1
    ? (rect.height > floor - ceiling ? rect.top - ceiling : rect.bottom - floor + gap)
    : rect.top < ceiling - 1 && rect.bottom <= floor + 1 ? rect.top - ceiling - gap : 0
  if (Math.abs(movement) <= 1) return
  if (scroller) {
    scroller.scrollTop += movement
    return
  }

  const page = document.scrollingElement
  if (!page) return
  const target = page.scrollTop + movement
  const missing = Math.ceil(target - (page.scrollHeight - page.clientHeight))
  if (missing > 0) reserve?.(missing)
  const reachable = Math.max(0, Math.min(target, page.scrollHeight - page.clientHeight))
  if (Math.abs(reachable - page.scrollTop) > 1) window.scrollTo({ top: reachable, behavior: 'instant' })
}
