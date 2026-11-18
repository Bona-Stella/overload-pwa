import type { ReactNode } from 'react'
import styles from './AccountSettings.module.css'

const paths = {
  email: 'M3 5h18v14H3zM3 6l9 7 9-7',
  shield: 'M12 22s7-3 7-9V6l-7-3-7 3v7c0 6 7 9 7 9Zm-3-10 2 2 4-4',
  devices: 'M10 17H3V5h14v3M7 21h3m3-10h8v10h-8z',
  refresh: 'M20 10a8 8 0 0 0-14-4L3 9m0-5v5h5m-4 5a8 8 0 0 0 14 4l3-3m0 5v-5h-5',
  link: 'M10 13a4 4 0 0 0 6 0l4-4a4 4 0 0 0-6-6l-2 2m2 6a4 4 0 0 0-6 0l-4 4a4 4 0 0 0 6 6l2-2',
  check: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 12l3 3 5-6',
  info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v5m0-8h.01',
  forward: 'm9 6 6 6-6 6',
  phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm4 16h.01',
  tablet: 'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm6 16h.01',
  computer: 'M4 4h16v12H4zm0 12-3 4h22l-3-4',
  workout: 'M2 10v4m3-7v10m3-12v14m0-7h8m0-7v14m3-12v10m3-7v4',
  eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  logout: 'M10 17v3H4V4h6v3m-2 5h12m-4-4 4 4-4 4',
  screenOff: 'M3 4h18v13H3zm9 13v4m-4 0h8M10 8l4 5m0-5-4 5',
}

export function AccountIcon({ name }: { name: keyof typeof paths }) {
  return <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

export function AccountItem({ icon, title, description, status }: {
  icon: 'email' | 'google' | 'shield' | 'devices'; title: ReactNode; description: string; status?: ReactNode
}) {
  return <span className={styles.item}>
    <span className={styles.iconBox} aria-hidden="true">{icon === 'google' ? 'G' : <AccountIcon name={icon} />}</span>
    <span className={styles.itemText}><strong>{title}</strong><small>{description}</small></span>
    {status}
  </span>
}

export function AccountStatus({ children, positive = false }: { children: ReactNode; positive?: boolean }) {
  return <span className={styles.status} data-positive={positive || undefined}>{positive && <AccountIcon name="check" />}{children}</span>
}

export function AccountNote({ children }: { children: ReactNode }) {
  return <p className={styles.note}><AccountIcon name="info" /><span>{children}</span></p>
}
