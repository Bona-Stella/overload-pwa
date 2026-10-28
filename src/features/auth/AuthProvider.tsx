import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { AuthController } from './controller.ts'
import { returnFlow } from './controller.ts'
import type { ReturnFlow } from './controller.ts'
import { AuthContext } from './context.ts'

export function AuthProvider({ children, flow = 'none' }: { children: ReactNode; flow?: ReturnFlow }) {
  const [controller] = useState(() => new AuthController())
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  useEffect(() => {
    void controller.start(flow)
    if (flow !== 'none' && flow !== 'account') window.history.replaceState(null, '', flow.startsWith('contact-') ? '/account' : '/')
    const restore = (event: PageTransitionEvent) => { if (event.persisted) controller.resume(returnFlow(window.location.pathname)) }
    const back = () => { controller.resume(returnFlow(window.location.pathname)) }
    window.addEventListener('pageshow', restore)
    window.addEventListener('popstate', back)
    return () => { window.removeEventListener('pageshow', restore); window.removeEventListener('popstate', back) }
  }, [controller, flow])
  return <AuthContext value={{ state, controller }}>{children}</AuthContext>
}
