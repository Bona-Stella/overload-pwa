export function revealWorkingWeight(header: HTMLElement | null, completionTop: number) {
  if (!header || Math.abs(window.scrollY - completionTop) > 1 || document.querySelector('dialog[open]')) return
  const frame = header.closest('[data-workout-frame]')
  if (!frame || frame.closest('[data-keyboard-open]')) return
  const target = frame.querySelector('[data-swipe-current] [aria-label="진행 중량"]')
  const page = document.scrollingElement
  if (!target?.getClientRects().length || !page) return
  const top = page.scrollTop + target.getBoundingClientRect().top - header.getBoundingClientRect().bottom - 8
  const position = Math.max(0, Math.min(top, page.scrollHeight - page.clientHeight))
  if (Math.abs(position - page.scrollTop) > 1) {
    page.scrollTo({ top: position, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
}
