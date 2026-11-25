import { useEffect, useRef, useState } from 'react'
import { FeedbackIcon } from './FeedbackIcon.tsx'
import { Toast } from './Toast.tsx'
import { useReadErrorToast } from './useReadErrorToast.ts'
import styles from './ContentFeedback.module.css'

export function RefreshButton({ onRefresh, loading = false, disabled = false, className, failure }: {
  onRefresh: () => void; loading?: boolean; disabled?: boolean; className?: string; failure?: string | null
}) {
  const guard = useRef(false)
  const frame = useRef<number>(0)
  const [attempt, setAttempt] = useState<'idle' | 'requested' | 'loading' | 'settled'>('idle')
  if (loading && attempt === 'requested') setAttempt('loading')
  if (!loading && attempt === 'loading') setAttempt('settled')
  const pending = loading || attempt === 'requested'
  const feedback = useReadErrorToast(!pending && attempt === 'settled' ? failure : null)
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  return <>
    <button type="button" className={`${styles.refresh} quiet ${className ?? ''}`} data-refresh
      disabled={pending || disabled} aria-busy={pending || undefined} onClick={() => {
        if (pending || disabled || guard.current) return
        guard.current = true
        setAttempt('requested')
        onRefresh()
        frame.current = requestAnimationFrame(() => {
          guard.current = false
          setAttempt(value => value === 'requested' ? 'idle' : value)
        })
      }}><span className={styles.refreshIcon}><FeedbackIcon name="syncing" size={18} spinning={pending} /></span><span>새로고침</span></button>
    <span className="sr-only" role="status">{pending ? '새로고침 중' : ''}</span>
    {failure && <Toast toast={feedback.toast} onDismiss={feedback.dismiss} bottomClearance="var(--tabs-height, 56px)" />}
  </>
}
