import { useSyncExternalStore } from 'react'

const changed = 'overload:cardio-estimate'
function subscribe(notify: () => void) {
  window.addEventListener('storage', notify)
  window.addEventListener(changed, notify)
  return () => {
    window.removeEventListener('storage', notify)
    window.removeEventListener(changed, notify)
  }
}
const defaultEstimate = () => false

export function useCardioEstimate(userId: string | null) {
  const key = userId ? `overload.cardio-estimate.v1:${userId}` : null
  const enabled = useSyncExternalStore(subscribe, () => {
    try { return key !== null && localStorage.getItem(key) === 'on' } catch { return false }
  }, defaultEstimate)
  function save(next: boolean) {
    if (!key) return false
    try { localStorage.setItem(key, next ? 'on' : 'off') } catch { return false }
    window.dispatchEvent(new Event(changed))
    return true
  }
  return [enabled, save] as const
}
