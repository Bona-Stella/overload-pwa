import { Icon } from './icons/Icon.tsx'
import { chevronLeft } from './icons/common.tsx'
import type { ReactNode, Ref } from 'react'
import { Button } from './ui.tsx'
import styles from './RecordSubpageHeader.module.css'

export function RecordSubpageHeader({ title, onBack, backLabel = '기록으로', action, backDisabled, headingRef, brandImage }: {
  title: string; onBack?: () => void; backLabel?: string; action?: ReactNode; backDisabled?: boolean; headingRef?: Ref<HTMLHeadingElement>
  brandImage?: { src: string; alt: string; width: number; height: number }
}) {
  return <header className={styles.header}>
    {onBack&&<Button shape="control" variant="quiet" className={styles.back} aria-label={backLabel} onClick={onBack} pending={backDisabled}>
      <Icon icon={chevronLeft} size={24} strokeLinecap="round" strokeLinejoin="round" />
    </Button>}
    <h1 className={styles.title} ref={headingRef} tabIndex={headingRef ? -1 : undefined}>{title}</h1>
    {action ? <div className={styles.action}>{action}</div>
      : brandImage && <div className={styles.brand}><img {...brandImage} /></div>}
  </header>
}
