export function startKeyboardDiagnostics(mode: 'app' | 'native') {
  const root = document.documentElement
  const visual = window.visualViewport
  root.dataset.keyboardDiagnostic = mode
  const rows: object[] = []
  let started = performance.now()
  let field: HTMLElement | null = null
  const isField = (value: unknown): value is HTMLElement =>
    value instanceof HTMLElement && value.matches('input:not([type=checkbox], [type=radio], [type=range]), textarea, [contenteditable=true]')
  const record = (event: string, call?: object) => {
    if (!field || rows.length >= 600) return
    const scope = field.closest('dialog, [data-workout-frame], form, main')
    const footer = scope?.querySelector('footer') ?? document.querySelector('.app-shell footer')
    const footerStyle = footer && getComputedStyle(footer)
    const page = document.scrollingElement
    rows.push({
      ms: Math.round(performance.now() - started), event, call,
      focus: field.tagName.toLowerCase(), type: field.getAttribute('type'), memo: field.hasAttribute('data-workout-memo'),
      fontSize: getComputedStyle(field).fontSize,
      rect: field.getBoundingClientRect().toJSON(), y: window.scrollY, scrollTop: page?.scrollTop,
      pageHeight: page?.scrollHeight, layoutHeight: page?.clientHeight,
      viewport: visual && { height: visual.height, offsetTop: visual.offsetTop, pageTop: visual.pageTop, scale: visual.scale },
      footer: footerStyle && { display: footerStyle.display, visibility: footerStyle.visibility, height: footer?.getBoundingClientRect().height },
      scopeHeight: scope?.scrollHeight,
      memoClearance: field.hasAttribute('data-workout-memo') && scope && getComputedStyle(scope).paddingBottom,
      memoSpace: field.hasAttribute('data-workout-memo') && scope instanceof HTMLElement && scope.style.getPropertyValue('--workout-memo-space'),
    })
  }
  const watch = (target: EventTarget | null, event: string, label = event) =>
    target?.addEventListener(event, () => record(label), { capture: true, passive: true })
  document.addEventListener('pointerdown', event => {
    const candidate = event.target instanceof HTMLElement ? event.target.closest('input, textarea, [contenteditable=true]') : null
    if (isField(candidate)) {
      field = candidate
      record('pointerdown')
    }
  }, true)
  document.addEventListener('focusin', event => {
    if (isField(event.target)) field = event.target
    record('focusin')
  }, true)
  watch(document, 'pointerup')
  watch(document, 'pointercancel')
  watch(document, 'focusout')
  watch(document, 'input')
  watch(document, 'scroll', 'document/element.scroll')
  watch(window, 'resize', 'window.resize')
  watch(visual, 'resize', 'visualViewport.resize')
  watch(visual, 'scroll', 'visualViewport.scroll')
  new MutationObserver(() => {
    if (field?.hasAttribute('data-workout-memo')) record('memo-space.changed')
  }).observe(root, { subtree: true, attributeFilter: ['data-memo-keyboard-space'] })
  for (const name of ['scroll', 'scrollTo', 'scrollBy'] as const) {
    const original = window[name]
    window[name] = (...args: unknown[]) => {
      record('window.' + name, { args, stack: new Error().stack })
      Reflect.apply(original, window, args)
    }
  }
  for (const name of ['scrollTo', 'scrollBy', 'scrollIntoView'] as const) {
    const original = Element.prototype[name]
    Element.prototype[name] = function (this: Element, ...args: unknown[]) {
      record('element.' + name, { args, tag: this.tagName, stack: new Error().stack })
      Reflect.apply(original, this, args)
    }
  }
  const scrollTop = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')
  if (scrollTop?.configurable && scrollTop.set) Object.defineProperty(Element.prototype, 'scrollTop', {
    ...scrollTop,
    set(this: Element, value: number) {
      record('element.scrollTop=', { value, tag: this.tagName, stack: new Error().stack })
      scrollTop.set!.call(this, value)
    },
  })
  const panel = document.createElement('div')
  panel.dataset.keyboardDiagnosticPanel = mode
  panel.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top) + 2px);right:4px;z-index:1000;display:flex;gap:4px'
  const reset = document.createElement('button')
  reset.textContent = mode === 'app' ? 'A · 초기화' : 'B · 초기화'
  reset.onclick = () => { rows.length = 0; field = null; started = performance.now() }
  const download = document.createElement('button')
  download.textContent = '스크롤 로그'
  download.onclick = () => {
    const link = document.createElement('a')
    const url = URL.createObjectURL(new Blob([JSON.stringify({ mode, rows }, null, 2)], { type: 'application/json' }))
    link.href = url
    link.download = 'overload-keyboard-' + mode + '.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  panel.append(reset, download)
  document.body.append(panel)
}
