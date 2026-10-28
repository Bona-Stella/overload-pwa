import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { AuthController } from './controller.ts'
import type { ReturnFlow } from './controller.ts'
import { AuthContext } from './context.ts'

export function AuthProvider({ children, flow = 'none' }: { children: ReactNode; flow?: ReturnFlow }) {
  const [controller] = useState(() => new AuthController())
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  useEffect(() => {
    void controller.start(flow)
    if (flow !== 'none') window.history.replaceState(null, '', '/')
    const restore = (event: PageTransitionEvent) => { if (event.persisted) controller.resume() }
    window.addEventListener('pageshow', restore)
    return () => window.removeEventListener('pageshow', restore)
  }, [controller, flow])
  return <AuthContext value={{ state, controller }}>{children}</AuthContext>
}
