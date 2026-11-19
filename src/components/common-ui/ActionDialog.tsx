import { useId } from 'react'
import type { ReactNode } from 'react'
import { Dialog } from '../Dialog'
import { ActionButton } from './ActionButton'
import styles from './ActionDialog.module.css'

type ActionDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  onDismiss: () => void
} & (
  | { kind: 'alert' }
  | {
    kind: 'confirm' | 'destructive'
    cancelLabel: string
    onConfirm: () => void
    pending?: boolean
    pendingLabel?: string
  }
)

export function ActionDialog(props: ActionDialogProps) {
  const descriptionId = useId()
  if (!props.open) return null

  return <Dialog
    title={props.title}
    onClose={props.onDismiss}
    className={styles.dialog}
    descriptionId={descriptionId}
  >
    <div id={descriptionId} className={styles.description}>{props.description}</div>
    <div className={styles.actions}>
      {props.kind !== 'alert' && <ActionButton size="modal" appearance={props.kind === 'destructive' ? 'contrast-outline' : 'secondary'}
        onClick={props.onDismiss}>{props.cancelLabel}</ActionButton>}
      <ActionButton
        size="modal"
        appearance={props.kind === 'destructive' ? 'danger-primary' : 'primary'}
        onClick={props.kind === 'alert' ? props.onDismiss : props.onConfirm}
        loading={props.kind === 'alert' ? undefined : props.pending}
        loadingLabel={props.kind === 'alert' ? undefined : props.pendingLabel}
      >{props.confirmLabel}</ActionButton>
    </div>
  </Dialog>
}
