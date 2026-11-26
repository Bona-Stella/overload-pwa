import { useLayoutEffect, useRef } from 'react'

/** Measure the rendered number/name together; preserve the existing flex row and button. */
export function useFitWorkoutTitle(title: string, observe = true) {
  const ref = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    const node = ref.current, row = node?.parentElement
    if (!node || !row) return
    let frame = 0, disposed = false, lastWidth = -1
    const fit = () => {
      if (disposed || !node.isConnected) return
      const width = node.getBoundingClientRect().width
      if (!width) return
      node.style.removeProperty('--workout-title-size')
      const range = document.createRange()
      range.selectNodeContents(node)
      const fits = () => range.getBoundingClientRect().width <= width
      if (fits()) return

      // Font hinting and fallback glyphs can change the width non-proportionally.
      // Measure each candidate and let CSS truncate a title that still overflows at 16px.
      const minimum = 160
      let best = minimum, low = minimum + 1, high = Math.floor(parseFloat(getComputedStyle(node).fontSize) * 10)
      while (low <= high) {
        const size = Math.floor((low + high) / 2)
        node.style.setProperty('--workout-title-size', size / 10 + 'px')
        if (fits()) {
          best = size
          low = size + 1
        } else {
          high = size - 1
        }
      }
      node.style.setProperty('--workout-title-size', best / 10 + 'px')
    }
    fit()
    if (!observe) return
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit) }
    const observer = new ResizeObserver(([entry]) => {
      if (Math.abs(entry.contentRect.width - lastWidth) < 0.5) return
      lastWidth = entry.contentRect.width
      schedule()
    })
    observer.observe(row)
    void document.fonts.ready.then(() => { if (!disposed) schedule() })
    document.fonts.addEventListener('loadingdone', schedule)
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); document.fonts.removeEventListener('loadingdone', schedule) }
  }, [title, observe])
  return ref
}
