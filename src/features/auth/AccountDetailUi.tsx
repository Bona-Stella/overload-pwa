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
}

export function AccountIcon({ name }: { name: keyof typeof paths }) {
  return <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

export function AccountItem({ icon, title, description, status }: {
  icon: 'email' | 'google' | 'shield' | 'devices'; title: string; description: string; status?: ReactNode
}) {
  return <div className={styles.item}>
    <span className={styles.iconBox} aria-hidden="true">{icon === 'google' ? 'G' : <AccountIcon name={icon} />}</span>
    <div className={styles.itemText}><strong>{title}</strong><small>{description}</small></div>
    {status}
  </div>
}

export function AccountStatus({ children, positive = false }: { children: ReactNode; positive?: boolean }) {
  return <span className={styles.status} data-positive={positive || undefined}>{positive && <AccountIcon name="check" />}{children}</span>
}

export function AccountNote({ children }: { children: ReactNode }) {
  return <p className={styles.note}><AccountIcon name="info" /><span>{children}</span></p>
}
