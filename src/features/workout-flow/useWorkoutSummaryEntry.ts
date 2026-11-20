import { useCallback, useRef } from 'react'

export function useWorkoutSummaryEntry(sessionId?: string) {
  const pending = useRef<string | null>(null)
  const markSummaryEntry = useCallback((id: string) => { pending.current = id }, [])
  const takeInitialScroll = useCallback(() => {
    if (!sessionId || pending.current !== sessionId) return false
    pending.current = null
    return true
  }, [sessionId])
  return { markSummaryEntry, takeInitialScroll }
}
