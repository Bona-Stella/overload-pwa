import { Icon } from '../../components/icons/Icon.tsx'
import { accountIcons } from '../../components/icons/account.tsx'
import type { ReactNode } from 'react'
import styles from './AccountSettings.module.css'

export function AccountIcon({ name }: { name: keyof typeof accountIcons }) {
  return <Icon icon={accountIcons[name]} className={styles.icon} />
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
