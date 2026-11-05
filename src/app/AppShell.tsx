import type { ReactNode } from 'react'
import type { AppTab, DisplayTheme } from './types'
import styles from './AppShell.module.css'
import theme from './theme.module.css'

const tabs: { id: AppTab; label: string; path: string }[] = [
  { id: 'home', label: '홈', path: 'm3 10 9-7 9 7v11h-6v-7H9v7H3Z' },
  { id: 'routines', label: '루틴', path: 'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01' },
  { id: 'history', label: '기록', path: 'M3 12a9 9 0 1 0 3-6.7M3 3v5h5M12 7v5l3 2' },
  { id: 'settings', label: '설정', path: 'M4 7h16M4 17h16M9 4v6M15 14v6' },
]

export function AppShell({ children, tab, onNavigate, authenticated, focused = false, busy = false, displayTheme = 'normal' }: {
  children: ReactNode; tab: AppTab; onNavigate: (tab: AppTab) => void; authenticated: boolean; focused?: boolean; busy?: boolean; displayTheme?: DisplayTheme
}) {
  return <div className={`${styles.shell} ${theme.theme} app-shell auth-app`} data-theme={displayTheme}>
    <main className={`${styles.content} ${authenticated && !focused ? styles.withTabs : ''} ${authenticated && !focused && tab === 'home' ? styles.homeContent : ''} page`}>{children}</main>
    {authenticated && !focused && <nav className={styles.tabs} aria-label="기본 탐색">
      {tabs.map(item => <button type="button" key={item.id} aria-current={tab === item.id ? 'page' : undefined} disabled={busy} onClick={() => onNavigate(item.id)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.path} /></svg>
        <span>{item.label}</span>
      </button>)}
    </nav>}
  </div>
}
