import type { ReactNode } from 'react'
import { Button } from './ui.tsx'
import styles from './RecordSubpageHeader.module.css'

export function RecordSubpageHeader({ title, onBack, backLabel = '기록으로', action }: { title: string; onBack?: () => void; backLabel?: string; action?: ReactNode }) {
  return <header className={styles.header}>
    {onBack&&<Button variant="quiet" className={styles.back} aria-label={backLabel} onClick={onBack}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
    </Button>}
    <h1 className={styles.title}>{title}</h1>
    {action && <div className={styles.action}>{action}</div>}
  </header>
}
