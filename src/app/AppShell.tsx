import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { AppTab, DisplayTheme } from './types'
import styles from './AppShell.module.css'
import theme from './theme.module.css'

const tabs: { id: AppTab; label: string; path: string }[] = [
  { id: 'home', label: '홈', path: 'm3 10 9-7 9 7v11h-6v-7H9v7H3Z' },
  { id: 'routines', label: '루틴', path: 'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01' },
  { id: 'history', label: '기록', path: 'M3 12a9 9 0 1 0 3-6.7M3 3v5h5M12 7v5l3 2' },
  { id: 'settings', label: '설정', path: 'M9.5 3h5l.7 2.6 1.4.8 2.6-.7 2.5 4.3-1.9 1.9v1.6l1.9 1.9-2.5 4.3-2.6-.7-1.4.8-.7 2.2h-5l-.7-2.2-1.4-.8-2.6.7-2.5-4.3 1.9-1.9v-1.6L2.3 10l2.5-4.3 2.6.7 1.4-.8Z M14.6 12.5a2.6 2.6 0 1 0-5.2 0 2.6 2.6 0 1 0 5.2 0Z' },
]

export function AppShell({ children, tab, onNavigate, authenticated, focused = false, busy = false, displayTheme = 'normal' }: {
  children: ReactNode; tab: AppTab; onNavigate: (tab: AppTab) => void; authenticated: boolean; focused?: boolean; busy?: boolean; displayTheme?: DisplayTheme
}) {
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const field = document.activeElement
        const typing = field instanceof HTMLElement && (field.isContentEditable || field.matches('textarea:not([readonly]), input:not([readonly]):is([type="text"], [type="number"], [type="email"], [type="tel"], [type="search"], [type="password"], :not([type]))'))
        const occluded = viewport.scale <= 1.01 && Math.max(window.innerHeight, document.documentElement.clientHeight) - viewport.height > 100
        setKeyboardOpen(open => occluded && (typing || open))
      })
    }
    measure()
    viewport.addEventListener('resize', measure)
    document.addEventListener('focusin', measure)
    document.addEventListener('focusout', measure)
    return () => {
      cancelAnimationFrame(frame)
      viewport.removeEventListener('resize', measure)
      document.removeEventListener('focusin', measure)
      document.removeEventListener('focusout', measure)
    }
  }, [])
  const showTabs = authenticated && !focused && !keyboardOpen
  return <div className={`${styles.shell} ${theme.theme} app-shell auth-app`} data-theme={displayTheme}>
    <main className={`${styles.content} ${showTabs ? styles.withTabs : ''} ${authenticated && !focused && tab === 'home' ? styles.homeContent : ''} page`}>{children}</main>
    {showTabs && <nav className={styles.tabs} aria-label="기본 탐색" style={{ '--tab-index': tabs.findIndex(item => item.id === tab) } as CSSProperties}>
      {tabs.map(item => {
        const active = tab === item.id
        const filled = active && (item.id === 'home' || item.id === 'settings')
        return <button type="button" key={item.id} data-tab={item.id} aria-label={item.label} aria-current={active ? 'page' : undefined} disabled={busy} onClick={() => onNavigate(item.id)}>
          <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} fillRule="evenodd" stroke={filled ? 'none' : 'currentColor'} strokeWidth={active && !filled ? 2.4 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={item.path} />
          </svg>
        </button>
      })}
    </nav>}
  </div>
}
