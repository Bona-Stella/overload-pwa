import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { AuthController } from './controller.ts'
import { returnFlow } from './controller.ts'
import type { ReturnFlow } from './controller.ts'
import { AuthContext } from './context.ts'
import { offlineAccess } from '../workout-local/offline.ts'
import { changeScreenPath, observeNavigation } from '../../app/navigation.ts'

export function AuthProvider({ children, flow = 'none' }: { children: ReactNode; flow?: ReturnFlow }) {
  const [controller] = useState(() => new AuthController(undefined, undefined, undefined, changeScreenPath, offlineAccess))
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
  useEffect(() => {
    void controller.start(flow)
    if (flow !== 'none' && flow !== 'account') changeScreenPath(flow.startsWith('contact-') || flow.startsWith('link-') ? '/account' : '/', true)
    const restore = (event: PageTransitionEvent) => { if (event.persisted) controller.resume(returnFlow(window.location.pathname)) }
    const stop = observeNavigation(() => {
      const route = returnFlow(window.location.pathname)
      const accountOpen = controller.getSnapshot().accountOpen
      if (route === 'account' && !accountOpen) void controller.openAccount(false)
      if (route !== 'account' && accountOpen) controller.closeAccount(false)
    })
    window.addEventListener('pageshow', restore)
    return () => { window.removeEventListener('pageshow', restore); stop() }
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
