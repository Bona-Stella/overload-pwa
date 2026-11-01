type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
type State = { ready: boolean; waiting: boolean; failed: boolean; installable: boolean }
let state: State = { ready: false, waiting: false, failed: false, installable: false }
let registration: ServiceWorkerRegistration | null = null
let prompt: InstallPrompt | null = null
let started = false
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()) }
export const pwaSnapshot = () => state
export const subscribePwa = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
export function registerPwa() {
  if (started) return
  started = true
  if (!('serviceWorker' in navigator) || !window.isSecureContext) { set({ failed: true }); return }
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); prompt = event as InstallPrompt; set({ installable: true }) })
  window.addEventListener('appinstalled', () => { prompt = null; set({ installable: false }) })
  void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(value => {
    registration = value
    const update = () => set({ ready: !!value.active, waiting: !!value.waiting })
    update()
    value.addEventListener('updatefound', () => {
      const installing = value.installing
      installing?.addEventListener('statechange', () => {
        update()
        if (installing.state === 'redundant') set({ failed: true })
      })
    })
    void navigator.serviceWorker.ready.then(update)
  }).catch(() => set({ failed: true }))
}
export async function checkUpdate() {
  try { await registration?.update(); set({ failed: false }) } catch { set({ failed: true }) }
}
export async function installApp() {
  const current = prompt
  if (!current) return
  try { await current.prompt(); await current.userChoice } finally { prompt = null; set({ installable: false }) }
}
