import { useState } from 'react'
import type { ToastMessage } from './Toast.tsx'

export function useReadErrorToast(issue: string | null | undefined, tone: ToastMessage['tone'] = 'error') {
  const key = issue ? `${tone}:${issue}` : null
  const [state, setState] = useState({ key, dismissed: false })
  if (state.key !== key) setState({ key, dismissed: false })
  const toast: ToastMessage | null = issue && key && (state.key !== key || !state.dismissed)
    ? { id: key, tone, message: issue }
    : null
  return { toast, dismiss: () => setState({ key, dismissed: true }) }
}
