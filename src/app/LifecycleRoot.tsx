import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { recordLifecycle } from './lifecycle-diagnostics.ts'

// Outside StrictMode so the development effect replay does not look like a root remount.
export function LifecycleRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    recordLifecycle?.('react-root:mount')
    return () => recordLifecycle?.('react-root:unmount')
  }, [])
  return children
}
