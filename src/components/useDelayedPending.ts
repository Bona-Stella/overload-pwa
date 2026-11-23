import { useEffect, useState } from 'react'

export function useDelayedPending(pending: boolean) {
  const [display, setDisplay] = useState({ pending, visible: false })
  if (display.pending !== pending) setDisplay({ pending, visible: false })
  useEffect(() => {
    if (!pending) return
    const timer = window.setTimeout(() => setDisplay({ pending: true, visible: true }), 300)
    return () => window.clearTimeout(timer)
  }, [pending])
  return pending && display.pending && display.visible
}
