// A local hook fixture for the existing Node/TypeScript tests; no DOM or React internals.
// Component code, JSX event handlers and StatisticsApi remain real.
let active
export function useState(initial) {
  const host = active, index = host.index++
  if (!(index in host.slots)) host.slots[index] = typeof initial === 'function' ? initial() : initial
  return [host.slots[index], value => {
    if (!host.mounted) { host.lateUpdates++; return }
    host.slots[index] = typeof value === 'function' ? value(host.slots[index]) : value
  }]
}
export const useRef = initial => useState(() => ({ current: initial }))[0]
export function useEffect(effect, deps) {
  const host = active, index = host.index++, previous = host.slots[index]
  if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
    host.effects.push(() => {
      previous?.cleanup?.()
      host.slots[index] = { deps, cleanup: effect() }
    })
  }
}
export function mountPanel(Component, props) {
  const host = { slots: [], effects: [], index: 0, mounted: true, lateUpdates: 0 }
  return {
    render() {
      host.index = 0; active = host
      let tree
      try { tree = Component(props) } finally { active = undefined }
      for (const effect of host.effects.splice(0)) effect()
      return tree
    },
    unmount() {
      for (const slot of host.slots) slot?.cleanup?.()
      host.mounted = false
    },
    get lateUpdates() { return host.lateUpdates },
  }
}
