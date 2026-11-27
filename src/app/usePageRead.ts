import { useCallback, useLayoutEffect, useRef } from 'react'
import { observeNavigation } from './navigation.ts'
import { readWithDeadline } from './read-deadline.ts'

/** Prepare a destination without changing the current History entry. */
export function usePageRead(enabled: boolean) {
  const flight = useRef<AbortController | null>(null)
  const cancel = useCallback(() => { flight.current?.abort(); flight.current = null }, [])
  useLayoutEffect(() => {
    if (!enabled) return
    const unsubscribe = observeNavigation(cancel)
    window.addEventListener('popstate', cancel)
    return () => { unsubscribe(); window.removeEventListener('popstate', cancel); cancel() }
  }, [enabled, cancel])

  async function read<T>(load: (signal: AbortSignal) => Promise<T>, ready: (data: T) => void, failed: (error: unknown) => void) {
    if (!enabled) return
    cancel()
    const controller = new AbortController()
    const origin = window.history.state?.overloadNavigation
    flight.current = controller
    const current = () => !controller.signal.aborted && flight.current === controller && window.history.state?.overloadNavigation === origin
    try {
      const data = await readWithDeadline(controller.signal, load)
      if (current()) ready(data)
    } catch (error) {
      if (current()) failed(error)
    } finally {
      if (flight.current === controller) flight.current = null
    }
  }

  return { read, cancel }
}
