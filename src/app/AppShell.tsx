import { NavigationIcon } from '../components/icons/NavigationIcon.tsx'
import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { AppTab, DisplayTheme } from './types'
import styles from './AppShell.module.css'
import theme from './theme.module.css'
import { EditorViewportOccluded, useEditorKeyboard } from '../components/useEditorKeyboard.ts'
import { createRepeatPointerGuard } from '../components/repeatPointerGuard.ts'

const tabs: { id: AppTab; label: string }[] = [
  { id: 'home', label: '홈' },
  { id: 'routines', label: '루틴' },
  { id: 'history', label: '기록' },
  { id: 'settings', label: '설정' },
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
const modifierKeys = new Set(['Alt', 'AltGraph', 'Control', 'Meta', 'Shift'])

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
    // Tab can start at the document body after a tap on a non-focusable area.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isTrusted && !modifierKeys.has(event.key)) shell.current?.removeAttribute('data-focus-input')
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [])
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
      if (event.isTrusted && event.isPrimary) event.currentTarget.dataset.focusInput = 'pointer'
      if (!event.isPrimary || event.button !== 0) return
      const button = event.target instanceof Element ? event.target.closest('button') : null
      pressed.current = { button: button?.matches(':disabled') ? null : button, pointerId: event.pointerId, action: button?.dataset.clickAction }
    }} onPointerCancelCapture={() => { pressed.current = null }} onClickCapture={event => {
      // Keyboard and assistive activation can arrive as trusted clicks without a pointer.
      if (event.isTrusted && event.detail === 0 && !('pointerType' in event.nativeEvent && event.nativeEvent.pointerType)) {
        event.currentTarget.removeAttribute('data-focus-input')
      }
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
              <NavigationIcon tab={item.id} active={active} />
            </button>
          </div>
        })}
      </div>
    </nav>}
  </div>
}
