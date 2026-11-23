import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { AppTab, DisplayTheme } from './types'
import styles from './AppShell.module.css'
import theme from './theme.module.css'
import { EditorViewportOccluded, useEditorKeyboard } from '../components/useEditorKeyboard.ts'
import { createRepeatPointerGuard } from '../components/repeatPointerGuard.ts'

const tabs: { id: AppTab; label: string; path: string }[] = [
  { id: 'home', label: '홈', path: 'm3 10 9-7 9 7v11h-6v-7H9v7H3Z' },
  { id: 'routines', label: '루틴', path: 'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01' },
  { id: 'history', label: '기록', path: 'M3 12a9 9 0 1 0 3-6.7M3 3v5h5M12 7v5l3 2' },
  { id: 'settings', label: '설정', path: 'M9.5 3h5l.7 2.6 1.4.8 2.6-.7 2.5 4.3-1.9 1.9v1.6l1.9 1.9-2.5 4.3-2.6-.7-1.4.8-.7 2.2h-5l-.7-2.2-1.4-.8-2.6.7-2.5-4.3 1.9-1.9v-1.6L2.3 10l2.5-4.3 2.6.7 1.4-.8Z M14.6 12.5a2.6 2.6 0 1 0-5.2 0 2.6 2.6 0 1 0 5.2 0Z' },
]

const tabScrollThreshold = 24

function useTabBarCollapse(tab: AppTab, visible: boolean) {
  const [state, setState] = useState({ tab, visible, collapsed: false })
  const navigation = useRef<HTMLElement>(null)
  const collapsed = state.tab === tab && state.visible === visible && state.collapsed
  if (state.tab !== tab || state.visible !== visible) {
    setState({ tab, visible, collapsed: false })
  }

  useLayoutEffect(() => {
    const root = document.scrollingElement
    if (!visible || !root) return

    const scrollPosition = () => Math.max(0, Math.min(root.scrollTop, root.scrollHeight - root.clientHeight))
    let previous = scrollPosition()
    let distance = 0
    let frame = 0
    const measure = () => {
      frame = 0
      const current = scrollPosition()
      const delta = current - previous
      previous = current
      if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) {
        distance = 0
        return
      }
      if (current === 0) {
        distance = 0
        if (collapsed) setState({ tab, visible, collapsed: false })
        return
      }
      if (delta === 0) return
      distance = Math.sign(distance) === Math.sign(delta) ? distance + delta : delta
      if (collapsed && distance <= -tabScrollThreshold) {
        setState({ tab, visible, collapsed: false })
      } else if (!collapsed && distance >= tabScrollThreshold) {
        const focusedTab = navigation.current?.querySelector('button:not([aria-current="page"]):focus-visible')
        if (!focusedTab) setState({ tab, visible, collapsed: true })
        distance = 0
      }
    }
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(measure)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    // A route change can reach the top while the collapsed listener is being replaced.
    if (collapsed && previous === 0) onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [collapsed, tab, visible])

  return { navigation, collapsed, expand: () => setState({ tab, visible, collapsed: false }) }
}

const routineReturnWindow = 275

export function AppShell({ children, tab, onNavigate, authenticated, focused = false, routineEditor = false, busy = false, displayTheme = 'normal' }: {
  children: ReactNode; tab: AppTab; onNavigate: (tab: AppTab) => void; authenticated: boolean; focused?: boolean; routineEditor?: boolean; busy?: boolean; displayTheme?: DisplayTheme
}) {
  const shell = useRef<HTMLDivElement>(null)
  const pressed = useRef<{ button: HTMLButtonElement | null; pointerId: number; action?: string } | null>(null)
  const { occluded, keyboardOpen } = useEditorKeyboard(shell)
  const reserveTabs = authenticated && !focused
  const showTabs = reserveTabs && !keyboardOpen
  const { navigation, collapsed, expand } = useTabBarCollapse(tab, showTabs)
  const wasRoutineEditor = useRef(false)
  const lastRoutineClick = useRef<{ x: number; y: number; at: number } | null>(null)
  const revealedTabs = useRef<{ x: number; y: number; until: number } | null>(null)
  const [expandedTabGuard] = useState(createRepeatPointerGuard)
  useLayoutEffect(() => {
    const last = lastRoutineClick.current
    const now = performance.now()
    if (wasRoutineEditor.current && !routineEditor && !focused && tab === 'routines' && last && now - last.at <= routineReturnWindow) {
      revealedTabs.current = { x: last.x, y: last.y, until: now + routineReturnWindow }
    } else if (routineEditor || tab !== 'routines' || focused) revealedTabs.current = null
    if (!routineEditor) lastRoutineClick.current = null
    wasRoutineEditor.current = routineEditor
  }, [focused, routineEditor, tab])
  return <div ref={shell} className={`${styles.shell} ${theme.theme} app-shell auth-app`} data-theme={displayTheme} data-keyboard-open={keyboardOpen || undefined}
    onPointerDownCapture={event => {
      if (!event.isPrimary || event.button !== 0) return
      const button = event.target instanceof Element ? event.target.closest('button') : null
      pressed.current = { button: button?.matches(':disabled') ? null : button, pointerId: event.pointerId, action: button?.dataset.clickAction }
    }} onPointerCancelCapture={() => { pressed.current = null }} onClickCapture={event => {
      const start = pressed.current
      pressed.current = null
      // Async content can move under a finger between pointerdown and click.
      if (event.detail === 0 || !(event.target instanceof Element)) return
      const button = event.target.closest('button')
      if (start && (!('pointerId' in event.nativeEvent) || event.nativeEvent.pointerId === start.pointerId)
        && button && (button !== start.button || button.dataset.clickAction !== start.action)) { event.preventDefault(); event.stopPropagation(); return }
      const recent = revealedTabs.current
      if (recent && button?.dataset.tab && performance.now() < recent.until && Math.hypot(event.clientX - recent.x, event.clientY - recent.y) <= 24) {
        event.preventDefault(); event.stopPropagation(); return
      }
      if (routineEditor && button) lastRoutineClick.current = { x: event.clientX, y: event.clientY, at: performance.now() }
    }}>
    <main className={`${styles.content} ${reserveTabs ? styles.withTabs : ''} ${authenticated && !focused && tab === 'home' ? styles.homeContent : ''} page`}>
      <EditorViewportOccluded value={occluded}>{children}</EditorViewportOccluded>
    </main>
    {showTabs && <nav ref={navigation} className={styles.tabs} aria-label="기본 탐색" data-collapsed={collapsed}>
      <span className={styles.tabSurface} data-tab-surface aria-hidden="true" />
      <div className={styles.tabTrack} style={{ '--tab-index': tabs.findIndex(item => item.id === tab) } as CSSProperties}>
        <span className={styles.tabIndicator} data-tab-indicator aria-hidden="true" />
        {tabs.map((item, index) => {
          const active = tab === item.id
          const filled = active && (item.id === 'home' || item.id === 'settings')
          const expandsMenu = collapsed && active
          const hidden = collapsed && !active
          return <div className={styles.tabSlot} key={item.id} style={{ '--item-index': index } as CSSProperties}>
            <button type="button" data-tab={item.id}
              data-click-action={expandsMenu ? 'expand-tabs' : item.id}
              aria-label={expandsMenu ? '하단 메뉴 펼치기' : item.label} aria-current={active ? 'page' : undefined}
              aria-expanded={expandsMenu ? false : undefined} inert={hidden} aria-hidden={hidden || undefined} disabled={busy && !expandsMenu}
              onPointerDown={expandedTabGuard.pointerDown} onPointerCancel={expandedTabGuard.pointerCancel}
              onClick={event => {
                if (expandsMenu) {
                  expandedTabGuard.arm(event)
                  expand()
                } else if (!expandedTabGuard.blocksClick(event)) onNavigate(item.id)
              }}>
              <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} fillRule="evenodd" stroke={filled ? 'none' : 'currentColor'} strokeWidth={active && !filled ? 3 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={item.path} />
              </svg>
            </button>
          </div>
        })}
      </div>
    </nav>}
  </div>
}
