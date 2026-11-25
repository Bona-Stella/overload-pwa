import { readWithDeadline } from '../../../src/app/read-deadline.ts'
import { useEffect, useRef, useState } from 'react'

// Keep the real pending state visible long enough to observe two complete rotations.
const responseDelay = 2700

function waitForResponse(signal: AbortSignal, delayMs: number) {
  signal.throwIfAborted()
  return new Promise<void>((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); reject(signal.reason) }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel)
      resolve()
    }, delayMs)
    signal.addEventListener('abort', cancel, { once: true })
  })
}

export async function reviewRead<T>(signal: AbortSignal | undefined, response: () => T, options?: {
  slow?: boolean; timeout?: boolean
}) {
  const parent = signal ?? new AbortController().signal
  if (options?.timeout) {
    return readWithDeadline(parent, async request => {
      await waitForResponse(request, responseDelay + 900)
      return response()
    }, responseDelay)
  }
  await waitForResponse(parent, options?.slow ? 3600 : responseDelay)
  parent.throwIfAborted()
  return response()
}

export function useReviewRecovery() {
  const request = useRef<AbortController | null>(null)
  const [pending, setPending] = useState(false)
  useEffect(() => () => request.current?.abort(), [])
  const cancel = () => {
    request.current?.abort()
    request.current = null
    setPending(false)
  }
  const recover = (onSuccess: () => void) => {
    if (request.current) return
    const abort = new AbortController()
    request.current = abort
    setPending(true)
    void reviewRead(abort.signal, onSuccess).catch(error => {
      if (!abort.signal.aborted) throw error
    }).finally(() => {
      if (request.current !== abort || abort.signal.aborted) return
      request.current = null
      setPending(false)
    })
  }
  return { pending, cancel, recover }
}
