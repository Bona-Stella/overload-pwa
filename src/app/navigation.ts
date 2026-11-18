import { useCallback, useEffect, useMemo, useState } from 'react'

type Entry = { index: number; values: Record<string, unknown> }
const listeners = new Set<() => void>()
const guards = new Set<() => boolean | Promise<boolean>>()
let current: Entry | null = null
let restoring = false
let pending = false
let closeOnly = false
const deferredNavigation: (()=>void)[]=[]
const afterDialogClose=(action:()=>void)=>{if(closeOnly)deferredNavigation.push(action);else action()}
const layers: { id: string; close: () => void }[] = []
const read = (): Entry => window.history.state?.overloadNavigation ?? { index: 0, values: {} }
const publish = () => listeners.forEach(listener => listener())
/** A bottom-tab action always opens its root in one history entry. */
export function navigateTabRoot(key: string, value: unknown, children: Record<string, unknown> = {}) {
  initialize()
  afterDialogClose(()=>{
  const values = { ...current!.values }
  for (const name of Object.keys(values)) {
    if (/^(exercise-detail:|records:|record-detail:|routine-plan:|routine-editor:|account-devices:|review-record$|review-record-summary$|__dialog$)/.test(name)) delete values[name]
  }
  Object.assign(values, children)
  values[key] = value
  current = { index: current!.index + 1, values }
  window.history.pushState({ ...window.history.state, overloadNavigation: current }, '')
  publish()
  })
}
function initialize() {
  if (current || typeof window === 'undefined') return
  current = read()
  window.history.replaceState({ ...window.history.state, overloadNavigation: current }, '')
  window.addEventListener('popstate', () => {
    if (restoring) { restoring = false; return }
    const next = read(), previous = current!
    if (closeOnly) { closeOnly = false; current = next; for(const action of deferredNavigation.splice(0))action(); publish(); return }
    const layer = layers.at(-1)
    if (layer && next.values.__dialog !== layer.id) { current = next; layer.close(); publish(); return }
    if (pending) { restoring = true; window.history.go(previous.index - next.index); return }
    pending = true
    void (async () => {
      try {
        for (const guard of guards) if (!await guard()) {
          restoring = true
          window.history.go(previous.index - next.index)
          return
        }
        current = next; publish()
      } finally { pending = false }
    })()
  })
}

/** Browser-native history; only navigation context belongs here, never workout facts. */
export function useScreenHistory<T>(key: string, initial: T): [T, (next: T | ((value: T) => T), replace?: boolean) => void] {
  const initialJson = JSON.stringify(initial)
  const fallback = useMemo(() => JSON.parse(initialJson) as T, [initialJson])
  const [stored, setStored] = useState(() => ({ key, value: typeof window === 'undefined' ? fallback : read().values[key] as T ?? fallback }))
  const value = stored.key === key ? stored.value : typeof window === 'undefined' ? fallback : read().values[key] as T ?? fallback
  useEffect(() => {
    initialize()
    const update = () => setStored({ key, value:current!.values[key] as T ?? fallback })
    listeners.add(update); update()
    return () => { listeners.delete(update) }
  }, [key, fallback])
  const change = useCallback((next: T | ((value: T) => T), replace = false) => {
    initialize()
    afterDialogClose(()=>{
    const old = current!.values[key] as T ?? fallback
    const result = typeof next === 'function' ? (next as (value: T) => T)(old) : next
    if (JSON.stringify(result) === JSON.stringify(old)) return
    const values = { ...current!.values, [key]:result }
    delete values.__dialog
    current = { index: current!.index + (replace ? 0 : 1), values }
    window.history[replace ? 'replaceState' : 'pushState']({ ...window.history.state, overloadNavigation: current }, '')
    publish()
    })
  }, [key, fallback])
  return [value, change]
}

export function useNavigationGuard(guard: () => boolean | Promise<boolean>) {
  useEffect(() => { guards.add(guard); return () => { guards.delete(guard) } }, [guard])
}

export function useDialogHistory(id: string, close: () => void) {
  useEffect(() => {
    let cancelled = false, pushedIndex: number | null = null
    const layer = { id, close }
    void Promise.resolve().then(() => {
      if (cancelled) return
      initialize(); afterDialogClose(()=>{
      if(cancelled)return
      layers.push(layer)
      current = { index: current!.index + 1, values: { ...current!.values, __dialog:id } }
      window.history.pushState({ ...window.history.state, overloadNavigation:current }, '')
      pushedIndex = current.index
      })
    })
    return () => {
      cancelled = true
      const index = layers.indexOf(layer); if (index >= 0) layers.splice(index,1)
      if (pushedIndex !== null && read().index === pushedIndex && read().values.__dialog === id) { closeOnly = true; window.history.back() }
    }
  }, [id, close])
}
