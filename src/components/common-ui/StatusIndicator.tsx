import { FeedbackIcon } from './FeedbackIcon'
import styles from './StatusIndicator.module.css'

type StatusTagProps = { label: string } & (
  | { kind: 'recommendation'; onOpenDetails?: () => void }
  | { kind: 'activity' | 'quantity' }
)

export function StatusTag(props: StatusTagProps) {
  const tag = <span className={styles.tag} data-kind={props.kind}>{props.label}</span>
  return props.kind === 'recommendation' && props.onOpenDetails
    ? <button type="button" className={styles.tagTrigger} aria-haspopup="dialog" onClick={props.onOpenDetails}>{tag}</button>
    : tag
}

export function StatusText({ kind, label }: {
  kind: 'connected' | 'muted' | 'online' | 'offline'
  label: string
}) {
  return <span className={styles.status} data-kind={kind}>
    {kind === 'connected' && <FeedbackIcon name="check" size={13} />}
    {label}
  </span>
}
