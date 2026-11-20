type EventName =
  | 'document:start' | 'react-root:mount' | 'react-root:unmount'
  | 'pageshow' | 'pagehide' | 'visibilitychange' | 'focus' | 'blur' | 'online' | 'offline'
  | 'vite:disconnect' | 'vite:full-reload'
  | 'worker:registration-start' | 'worker:registration-end' | 'worker:update-found' | 'worker:state' | 'worker:controller-change'
  | 'auth:start' | 'auth:end' | 'auth:unavailable'
  | 'schedule:start' | 'schedule:end' | 'home:start' | 'home:end'
  | 'workout-data:start' | 'workout-data:end'
  | 'workout-recovery:start' | 'workout-recovery:end'

type Detail = {
  navigation?: NavigationTimingType
  standalone?: boolean
  discarded?: boolean
  persisted?: boolean
  visible?: boolean
  controlled?: boolean
  waiting?: boolean
  workerState?: ServiceWorkerState
  auth?: 'checking' | 'authenticated' | 'anonymous' | 'unavailable'
  reason?: 'initial' | 'revalidate'
  result?: 'ok' | 'error' | 'cancelled' | 'read-only'
}
type TraceEvent = { run: string; at: number; order: number; event: EventName; detail?: Detail }

const reviewBuild = import.meta.env?.MODE === 'lifecycle-review'
const enabled = import.meta.env?.DEV || reviewBuild
const traceKey = 'overload.lifecycle-review.v1'
const limit = 100
const lifetime = 4 * 60 * 60 * 1000
let activeUntil = 0
let order = 0
let run = ''
let buffer: TraceEvent[] = []

function readSaved(): { until: number; events: TraceEvent[] } | undefined {
  try {
    const saved = JSON.parse(localStorage.getItem(traceKey) ?? 'null')
    if (Number.isFinite(saved?.until) && Array.isArray(saved.events)) return saved
  }
  catch { return undefined }
}

export const recordLifecycle = enabled ? (event: EventName, detail?: Detail) => {
  const at = Date.now()
  if (at >= activeUntil) return
  const saved = readSaved()
  const events = saved?.until === activeUntil ? saved.events : buffer
  buffer = [...events.slice(1 - limit), { run, at, order: ++order, event, detail }]
  try { localStorage.setItem(traceKey, JSON.stringify({ until: activeUntil, events: buffer })) }
  catch { /* A blocked review store still supports tracing in this document. */ }
} : undefined

function addTraceViewer() {
  const open = document.createElement('button')
  const dialog = document.createElement('dialog')
  const title = document.createElement('h2')
  const output = document.createElement('textarea')
  const close = document.createElement('button')
  open.type = close.type = 'button'
  open.dataset.lifecycleDiagnostic = dialog.dataset.lifecycleDiagnostic = ''
  open.textContent = '복귀 진단'
  open.style.cssText = 'position:fixed;inset-block-start:env(safe-area-inset-top);inset-inline-end:0;z-index:100;'
  title.textContent = '복귀 진단 기록'
  dialog.setAttribute('aria-label', title.textContent)
  output.setAttribute('aria-label', '복사할 진단 기록')
  output.readOnly = true
  output.rows = 12
  close.textContent = '닫기'
  dialog.append(title, output, close)
  document.body.append(open, dialog)
  open.onclick = () => {
    if (Date.now() >= activeUntil) open.remove()
    else {
      output.value = JSON.stringify(readSaved()?.events ?? buffer, null, 2)
      dialog.showModal()
    }
  }
  close.onclick = () => dialog.close()
}

export function startLifecycleDiagnostics() {
  if (!enabled || !recordLifecycle || run) return false
  const flag = new URLSearchParams(location.search).get('lifecycleDiagnostic')
  const saved = readSaved()
  const now = Date.now()
  if (flag === '0' || (saved && saved.until <= now)) {
    try { localStorage.removeItem(traceKey) } catch { /* Storage may be blocked. */ }
  }
  if (flag === '0') return false
  // An installed review build opens the manifest start URL without the query flag.
  if (saved && saved.until > now) activeUntil = saved.until
  else if (flag === '1' || reviewBuild) activeUntil = now + lifetime
  if (!activeUntil) return false
  run = `${performance.timeOrigin}-${Math.random().toString(36).slice(2, 8)}`
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const serviceWorker = navigator.serviceWorker
  recordLifecycle('document:start', {
    navigation: navigation?.type,
    standalone: matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    discarded: (document as Document & { wasDiscarded?: boolean }).wasDiscarded,
    visible: document.visibilityState === 'visible',
    controlled: !!serviceWorker?.controller,
  })
  for (const event of ['pageshow', 'pagehide'] as const) {
    window.addEventListener(event, entry => recordLifecycle(event, { persisted: entry.persisted }))
  }
  for (const event of ['focus', 'blur', 'online', 'offline'] as const) {
    window.addEventListener(event, () => recordLifecycle(event))
  }
  document.addEventListener('visibilitychange', () => recordLifecycle('visibilitychange', { visible: document.visibilityState === 'visible' }))
  serviceWorker?.addEventListener('controllerchange', () => recordLifecycle('worker:controller-change', { controlled: !!serviceWorker.controller }))
  import.meta.hot?.on('vite:ws:disconnect', () => recordLifecycle('vite:disconnect'))
  import.meta.hot?.on('vite:beforeFullReload', () => recordLifecycle('vite:full-reload'))
  addTraceViewer()
  return true
}
