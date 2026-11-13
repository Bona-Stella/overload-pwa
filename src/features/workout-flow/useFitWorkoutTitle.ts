import { useLayoutEffect, useRef } from 'react'

/** Measure the rendered number/name together; preserve the existing flex row and button. */
export function useFitWorkoutTitle(title: string) {
  const ref = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    const node = ref.current, row = node?.parentElement
    if (!node || !row) return
    let frame = 0, disposed = false, lastWidth = -1
    const fit = () => {
      if (disposed || !node.isConnected || !node.clientWidth) return
      node.style.removeProperty('--workout-title-size')
      const base = parseFloat(getComputedStyle(node).fontSize)
      const range = document.createRange()
      range.selectNodeContents(node)
      const textWidth = range.getBoundingClientRect().width
      if (textWidth > node.clientWidth) {
        const size = Math.max(16, Math.floor(base * node.clientWidth / textWidth * 100) / 100)
        node.style.setProperty('--workout-title-size', size + 'px')
      }
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit) }
    const observer = new ResizeObserver(([entry]) => {
      if (Math.abs(entry.contentRect.width - lastWidth) < 0.5) return
      lastWidth = entry.contentRect.width
      schedule()
    })
    fit()
    observer.observe(row)
    void document.fonts.ready.then(() => { if (!disposed) schedule() })
    document.fonts.addEventListener('loadingdone', schedule)
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); document.fonts.removeEventListener('loadingdone', schedule) }
  }, [title])
  return ref
}
