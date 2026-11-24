import { useCallback, useRef, useState } from 'react'
import type { ToastMessage } from './Toast.tsx'

export function useSuccessToast(scope: string | null) {
  const sequence = useRef(0)
  const [current, setCurrent] = useState<{ scope: string; toast: ToastMessage } | null>(null)
  if (current && current.scope !== scope) setCurrent(null)
  const show = useCallback((message: string) => {
    if (scope === null) return
    setCurrent({ scope, toast: { id: ++sequence.current, tone: 'success', message } })
  }, [scope])
  const dismiss = useCallback((id: ToastMessage['id']) => {
    setCurrent(current => current?.toast.id === id ? null : current)
  }, [])
  const clear = useCallback(() => setCurrent(null), [])
  return { toast: current?.scope === scope ? current.toast : null, show, dismiss, clear }
}
