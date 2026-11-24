import { useState } from 'react'
import type { ToastMessage } from './Toast.tsx'

export function useReadErrorToast(issue: string | null | undefined) {
  const [state, setState] = useState({ issue, dismissed: false })
  if (state.issue !== issue) setState({ issue, dismissed: false })
  const toast: ToastMessage | null = issue && (state.issue !== issue || !state.dismissed)
    ? { id: 'read:' + issue, tone: 'error', message: issue }
    : null
  return { toast, dismiss: () => setState({ issue, dismissed: true }) }
}
