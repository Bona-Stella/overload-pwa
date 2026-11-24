import { useCallback, useEffect, useMemo, useState } from 'react'

type Entry = { index: number; values: Record<string, unknown>; tabStart?: number }
type Guard = () => boolean | Promise<boolean>
const listeners = new Set<() => void>()
const guards = new Map<Guard, string | undefined>()
let current: Entry | null = null
let rollback: { index: number; dialog?: string } | null = null
let checking = false
let requested: Entry | null = null
let backRequested = false
let closeOnly = false
const deferredNavigation: (() => void)[] = []
const afterDialogClose = (action: () => void) => { if (closeOnly) deferredNavigation.push(action); else action() }
const layers: { id: string; close: () => void; canClose: () => boolean }[] = []
let traversalDialog: { close: () => void } | null = null
const read = (): Entry => window.history.state?.overloadNavigation ?? { index: 0, values: {} }
const publish = () => listeners.forEach(listener => listener())
function write(values: Entry['values'], replace: boolean, url?: string, tabRoot = false) {
  const index = current!.index + (replace ? 0 : 1)
  current = { index, values, tabStart: tabRoot ? index : current!.tabStart }
  window.history[replace ? 'replaceState' : 'pushState']({ ...window.history.state, overloadNavigation: current }, '', url)
  publish()
}

export function navigateBack(fallback: () => void) {
  traverseToParent(1, fallback)
}

export function navigateToCurrentTabRoot(fallback: () => void) {
  initialize()
  const start = current!.tabStart ?? 0
  traverseToParent(current!.index - start, fallback)
}

function traverseToParent(distance: number, fallback: () => void) {
  initialize()
  if (closeOnly) { deferredNavigation.push(() => traverseToParent(distance, fallback)); return }
  if (backRequested || checking || rollback) return
  if (!distance || current!.index < distance) { fallback(); return }
  backRequested = true
  window.history.go(-distance)
}

export function observeNavigation(listener: () => void) {
  initialize()
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function changeScreenPath(url: string, replace = false) {
  initialize()
  afterDialogClose(() => {
    if (!checking && !rollback) write(current!.values, replace, url)
  })
}

/** Reset the destination's children while preserving the entry the user is leaving. */
export function navigateTabRoot(key: string, value: unknown, children: Record<string, unknown> = {}, url?: string, replace = false) {
  initialize()
  afterDialogClose(() => {
    if (checking || rollback) return
    const values = { ...current!.values }
    for (const name of Object.keys(values)) {
      if (/^(exercise-detail:|records:|record-detail:|routine-plan:|routine-editor:|routine-schedule:|workout-view:|account-devices:|review-settings$|review-record$|__dialog$)/.test(name)) delete values[name]
    }
    Object.assign(values, children)
    values[key] = value
    if (replace && url === undefined && JSON.stringify(values) === JSON.stringify(current!.values)) return
    write(values, replace, url, true)
  })
}

async function settleTraversal() {
  checking = true
  try {
    let allowed = true
    const accepted = new Set<Guard>()
    let target: Entry | null
    // The latest destination wins while a draft is being checked.
    do {
      target = requested
      for (const [guard, key] of [...guards]) {
        if (accepted.has(guard) || !guards.has(guard)) continue
        if (key && JSON.stringify(current!.values[key]) === JSON.stringify(target?.values[key])) continue
        try { allowed = await guard() } catch { allowed = false }
        if (!allowed) break
        accepted.add(guard)
      }
    } while (allowed && target !== requested)
    const next = requested
    requested = null
    if (!next) return
    if (!allowed) {
      const delta = current!.index - next.index
      if (delta) { rollback = { index: current!.index }; window.history.go(delta) }
      return
    }
    current = next
    const layer = layers.at(-1)
    if (layer && next.values.__dialog !== layer.id) layer.close()
    checking = false
    publish()
  } finally { checking = false }
}

function initialize() {
  if (current || typeof window === 'undefined') return
  current = read()
  window.history.replaceState({ ...window.history.state, overloadNavigation: current }, '')
  window.addEventListener('popstate', () => {
    const next = read(), previous = current!
    backRequested = false
    if (rollback) {
      if (next.index === rollback.index) {
        const dialog = rollback.dialog
        rollback = null
        // A request can settle and close its dialog while Forward restores its entry.
        if (dialog && !layers.some(layer => layer.id === dialog)) {
          closeOnly = true
          window.history.back()
        }
        return
      }
      window.history.go(rollback.index - next.index)
      return
    }
    if (closeOnly) {
      closeOnly = false
      current = next
      for (const action of deferredNavigation.splice(0)) action()
      publish()
      return
    }
    if (checking && traversalDialog) {
      requested = next
      traversalDialog.close()
      return
    }
    const layer = layers.at(-1)
    if (layer && previous.values.__dialog === layer.id && next.values.__dialog !== layer.id && next.index === previous.index - 1) {
      if (!layer.canClose()) {
        rollback = { index: previous.index, dialog: layer.id }
        window.history.forward()
      } else {
        current = next
        layer.close()
        publish()
      }
      return
    }
    requested = next
    if (!checking) void settleTraversal()
  })
}

/** Browser-native history; only navigation context belongs here, never workout facts. */
export function useScreenHistory<T>(key: string, initial: T): [T, (next: T | ((value: T) => T), replace?: boolean) => void] {
  const initialJson = JSON.stringify(initial)
  const fallback = useMemo(() => JSON.parse(initialJson) as T, [initialJson])
  const fromEntry = useCallback((entry: Entry) => Object.hasOwn(entry.values, key) ? entry.values[key] as T : fallback, [key, fallback])
  const [stored, setStored] = useState(() => ({ key, value: typeof window === 'undefined' ? fallback : fromEntry(read()) }))
  const value = stored.key === key ? stored.value : typeof window === 'undefined' ? fallback : fromEntry(read())
  useEffect(() => {
    initialize()
    const update = () => setStored({ key, value: fromEntry(current!) })
    listeners.add(update); update()
    return () => { listeners.delete(update) }
  }, [key, fromEntry])
  const change = useCallback((next: T | ((value: T) => T), replace = false) => {
    initialize()
    afterDialogClose(() => {
      if (checking || rollback) return
      const old = fromEntry(current!)
      const result = typeof next === 'function' ? (next as (value: T) => T)(old) : next
      if (JSON.stringify(result) === JSON.stringify(old)) return
      const values = { ...current!.values, [key]: result }
      delete values.__dialog
      write(values, replace)
    })
  }, [key, fromEntry])
  return [value, change]
}

export function useNavigationGuard(guard: Guard, key?: string) {
  useEffect(() => { guards.set(guard, key); return () => { guards.delete(guard) } }, [guard, key])
}

export function useDialogHistory(id: string, close: () => void, canClose: () => boolean, duringTraversal = false, onDismissed?: () => void) {
  useEffect(() => {
    let cancelled = false, pushedIndex: number | null = null
    const layer = { id, close, canClose }
    void Promise.resolve().then(() => {
      if (cancelled) return
      initialize()
      afterDialogClose(() => {
        if (cancelled || rollback) return
        if (checking) {
          // A traversal guard still owns the pending destination. Do not rewrite browser history.
          if (duringTraversal) traversalDialog = layer
          return
        }
        layers.push(layer)
        current = { ...current!, index: current!.index + 1, values: { ...current!.values, __dialog: id } }
        window.history.pushState({ ...window.history.state, overloadNavigation: current }, '')
        pushedIndex = current.index
      })
    })
    return () => {
      cancelled = true
      if (traversalDialog === layer) traversalDialog = null
      const index = layers.indexOf(layer); if (index >= 0) layers.splice(index,1)
      if (rollback?.dialog === id) {
        if (onDismissed) deferredNavigation.push(onDismissed)
      } else if (pushedIndex !== null && read().index === pushedIndex && read().values.__dialog === id) {
        if (onDismissed) deferredNavigation.push(onDismissed)
        closeOnly = true
        window.history.back()
      } else onDismissed?.()
    }
  }, [id, close, canClose, duringTraversal, onDismissed])
}
