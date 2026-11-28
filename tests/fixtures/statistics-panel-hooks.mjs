// A local hook fixture for the existing Node/TypeScript tests; no DOM or React internals.
// Component code, JSX event handlers and StatisticsApi remain real.
let active
export function useState(initial) {
  const host = active, index = host.index++
  if (!(index in host.slots)) host.slots[index] = typeof initial === 'function' ? initial() : initial
  return [host.slots[index], value => {
    if (!host.mounted) { host.lateUpdates++; return }
    const current = host.slots[index]
    const next = typeof value === 'function' ? value(current) : value
    if (!Object.is(current, next)) {
      host.slots[index] = next
      host.updated = true
    }
  }]
}
export function useCallback(callback, deps) {
  const ref = useRef({ callback, deps })
  if (deps.some((item, index) => !Object.is(item, ref.current.deps[index]))) ref.current = { callback, deps }
  return ref.current.callback
}
export const observeNavigation = () => () => {}
export const useRef = initial => useState(() => ({ current: initial }))[0]
export function useEffectEvent(callback) {
  const ref = useRef(callback)
  ref.current = callback
  return (...args) => ref.current(...args)
}
export function useEffect(effect, deps) {
  const host = active, index = host.index++, previous = host.slots[index]
  if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
    host.effects.push(() => {
      previous?.cleanup?.()
      host.slots[index] = { deps, cleanup: effect() }
    })
  }
}
export const useLayoutEffect = useEffect
export function useImperativeHandle(ref, create) {
  useLayoutEffect(() => {
    if (!ref) return
    ref.current = create()
    return () => { ref.current = null }
  }, [ref, create])
}
export function mountPanel(Component, props) {
  const host = { slots: [], effects: [], index: 0, mounted: true, lateUpdates: 0 }
  return {
    render() {
      for (let render = 0; render < 25; render++) {
        host.index = 0; host.updated = false; active = host
        let tree
        try { tree = Component(props) } finally { active = undefined }
        if (host.updated) { host.effects.length = 0; continue }
        for (const effect of host.effects.splice(0)) effect()
        if (!host.updated) return tree
      }
      throw new Error('Statistics fixture did not settle')
    },
    unmount() {
      for (const slot of host.slots) slot?.cleanup?.()
      host.mounted = false
    },
    get lateUpdates() { return host.lateUpdates },
  }
}

export const useScreenHistory = (_key, initial) => useState(initial)
export const navigateBack = fallback => fallback()
