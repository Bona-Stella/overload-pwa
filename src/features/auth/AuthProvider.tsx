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
    if (flow !== 'none' && flow !== 'account') window.history.replaceState(null, '', flow.startsWith('contact-') || flow.startsWith('link-') ? '/account' : '/')
    const restore = (event: PageTransitionEvent) => { if (event.persisted) controller.resume(returnFlow(window.location.pathname)) }
    const back = () => { controller.resume(returnFlow(window.location.pathname)) }
    window.addEventListener('pageshow', restore)
    window.addEventListener('popstate', back)
    return () => { window.removeEventListener('pageshow', restore); window.removeEventListener('popstate', back) }
  }, [controller, flow])
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel('overload.auth.boundary')
    let logoutPending = false
    const unsubscribe = controller.subscribe(() => {
      const pending = controller.getSnapshot().pending === 'logout'
      if (pending && !logoutPending) channel.postMessage({ kind: 'logout' })
      logoutPending = pending
    })
    channel.onmessage = event => { if (event.data?.kind === 'logout') controller.invalidateLocalWorkoutAccess() }
    return () => { unsubscribe(); channel.close() }
  }, [controller])
  return <AuthContext value={{ state, controller }}>{children}</AuthContext>
}
