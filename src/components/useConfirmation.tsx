import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Dialog } from './Dialog.tsx'
import { Button } from './ui.tsx'

type Confirmation = {
  title: string
  description: ReactNode
  confirmLabel: string
  destructive?: boolean
  duringTraversal?: boolean
  onConfirm?: () => Promise<void>
}

type Request = { details: Confirmation; resolve: (accepted: boolean) => void; reject: (error: unknown) => void; error?: { cause: unknown }; accepted?: boolean; running?: boolean }

export function useConfirmation() {
  const request = useRef<Request | null>(null)
  const [visible, setVisible] = useState<Confirmation | null>(null)
  const [pending, setPending] = useState(false)
  const cancel = useRef<HTMLButtonElement>(null)
  const descriptionId = useId()

  useEffect(() => () => { request.current?.resolve(false); request.current = null }, [])

  const confirm = useCallback((details: Confirmation) => new Promise<boolean>((resolve, reject) => {
    if (request.current) { resolve(false); return }
    request.current = { details, resolve, reject }
    setVisible(details)
  }), [])

  const finish = useCallback(() => {
    const settled = request.current
    if (!settled || settled.accepted === undefined) return
    request.current = null
    if (settled.error) settled.reject(settled.error.cause)
    else settled.resolve(settled.accepted)
  }, [])

  const dismiss = (prompt: Request, accepted: boolean) => {
    if (request.current !== prompt || prompt.accepted !== undefined) return
    prompt.accepted = accepted
    setVisible(null)
    setPending(false)
  }

  const dialog = visible && <Dialog title={visible.title} tone={visible.destructive ? 'destructive' : 'info'} initialFocus={cancel} dismissBlocked={pending}
    descriptionId={descriptionId}
    duringTraversal={visible.duringTraversal} onDismissed={finish} onClose={cancelRequest}>
    <div id={descriptionId} data-dialog-description>{visible.description}</div>
    <div className="row">
      <Button ref={cancel} variant="neutral" disabled={pending} onClick={cancelRequest}>취소</Button>
      <Button variant={visible.destructive ? 'destructive' : 'primary'} loading={pending} onClick={async () => {
        const prompt = request.current
        if (!prompt || prompt.details !== visible || prompt.running || prompt.accepted !== undefined) return
        prompt.running = true
        if (visible.onConfirm) setPending(true)
        try { await visible.onConfirm?.() }
        catch (cause) { prompt.error = { cause } }
        finally { dismiss(prompt, true) }
      }}>{visible.confirmLabel}</Button>
    </div>
  </Dialog>

  return [confirm, dialog] as const

  function cancelRequest() {
    const prompt = request.current
    if (prompt && prompt.details === visible && !prompt.running) dismiss(prompt, false)
  }
}
