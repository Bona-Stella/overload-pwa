
import { useEffect, useState } from 'react'
import { reviewClock } from './workout-model.ts'

export function useReviewClock(intervalMs = 125) {
  const [now, setNow] = useState(reviewClock)
  useEffect(() => {
    const tick = () => setNow(reviewClock())
    const interval = window.setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', tick) }
  }, [intervalMs])
  return [now, setNow] as const
}
