import { useId } from 'react'
import type { ReactNode } from 'react'
import { Dialog } from '../Dialog'
import type { DialogTone } from '../Dialog'
import { ActionButton } from './ActionButton'
import type { ActionAppearance } from './ActionButton'
import styles from './ActionDialog.module.css'

type ActionDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  onDismiss: () => void
  tone?: DialogTone
  actionAppearance?: ActionAppearance
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
  const pending = props.kind !== 'alert' && props.pending
  const tone = props.tone ?? (props.kind === 'destructive' ? 'destructive' : 'info')
  const closesResult = props.kind === 'alert' && (tone === 'success' || tone === 'error')
  const recovery = props.kind === 'confirm' && (tone === 'error' || tone === 'critical')
  const appearance = props.actionAppearance ?? (closesResult ? 'contrast-outline' : recovery ? 'recovery' : props.kind === 'destructive' ? 'danger-primary' : 'primary')

  return <Dialog
    title={props.title}
    tone={tone}
    onClose={props.onDismiss}
    dismissBlocked={pending}
    className={styles.dialog}
    descriptionId={descriptionId}
  >
    <div id={descriptionId} data-dialog-description className={styles.description}>{props.description}</div>
    <div className={styles.actions} data-dialog-actions>
      {props.kind !== 'alert' && <ActionButton size="modal" appearance="contrast-outline" disabled={pending}
        onClick={props.onDismiss}>{props.cancelLabel}</ActionButton>}
      <ActionButton
        size="modal"
        appearance={appearance}
        onClick={props.kind === 'alert' ? props.onDismiss : props.onConfirm}
        loading={props.kind === 'alert' ? undefined : props.pending}
        loadingLabel={props.kind === 'alert' ? undefined : props.pendingLabel}
      >{props.confirmLabel}</ActionButton>
    </div>
  </Dialog>
}
