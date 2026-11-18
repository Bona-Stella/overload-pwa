import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { readRestAlerts } from './rest-alerts.ts'
import type { RestAlerts } from './rest-alerts.ts'

const changed = 'overload:rest-alert-preferences'
const serverSnapshot = () => null

export function useRestAlertPreferences(userId: string | null) {
  const key = userId ? `overload.rest-alerts.v1:${userId}` : null
  const subscribe = useCallback((notify: () => void) => {
    if (!key) return () => {}
    const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) notify() }
    window.addEventListener('storage', storage)
    window.addEventListener(changed, notify)
    return () => {
      window.removeEventListener('storage', storage)
      window.removeEventListener(changed, notify)
    }
  }, [key])
  const snapshot = useCallback(() => {
    if (!key) return null
    try { return localStorage.getItem(key) } catch { return null }
  }, [key])
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const value = useMemo(() => readRestAlerts(raw), [raw])
  const save = useCallback((next: RestAlerts) => {
    if (!key) return false
    try { localStorage.setItem(key, JSON.stringify(next)) } catch { return false }
    window.dispatchEvent(new Event(changed))
    return true
  }, [key])
  return [value, save] as const
}
