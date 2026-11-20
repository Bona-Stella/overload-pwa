import { Card } from './ui.tsx'
import styles from './LoadingSkeleton.module.css'

const layouts = {
  home: ['hero', 'row', 'week', 'list'],
  routine: ['week', 'list'],
  summary: ['summary', 'menu'],
  activity: ['metrics', 'chart'],
  row: ['row'],
  list: ['list'],
  detail: ['summary', 'list'],
  settings: ['settings'],
  workout: ['metrics', 'hero'],
  auth: ['hero'],
} as const

export function LoadingSkeleton({ layout, label }: { layout: keyof typeof layouts; label: string }) {
  return <div className={styles.region} role="status" data-loading-skeleton={layout}>
    <span className="sr-only">{label}</span>
    <div className={styles.region} aria-hidden="true">
      {layouts[layout].map(block => <Card key={block} className={styles.card} data-skeleton-block={block}>
        <span className={styles.line} /><span className={styles.line} /><span className={styles.line} />
        {block === 'menu' && <><span className={styles.line} /><span className={styles.line} /></>}
        {block === 'summary' && <div className={styles.summaryMetrics}><span /><span /><span /></div>}
      </Card>)}
    </div>
  </div>
}
