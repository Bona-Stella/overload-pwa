import { useCallback, useRef, useState } from 'react'
import type { ToastMessage } from './Toast.tsx'

export function useSuccessToast(scope: string | null) {
  const sequence = useRef(0)
  const [current, setCurrent] = useState<{ scope: string; toast: ToastMessage } | null>(null)
  if (current && current.scope !== scope) setCurrent(null)
  const show = useCallback((message: string, tone: ToastMessage['tone'] = 'success') => {
    if (scope === null) return
    const next = { scope, toast: { id: ++sequence.current, tone, message } }
    setCurrent(current => tone === 'error' && current?.scope === scope && current.toast.tone === tone && current.toast.message === message ? current : next)
  }, [scope])
  const dismiss = useCallback((id: ToastMessage['id']) => {
    setCurrent(current => current?.toast.id === id ? null : current)
  }, [])
  const clear = useCallback(() => setCurrent(null), [])
  const clearError = useCallback(() => setCurrent(current => current?.toast.tone === 'error' ? null : current), [])
  return { toast: current?.scope === scope ? current.toast : null, show, dismiss, clear, clearError }
}
