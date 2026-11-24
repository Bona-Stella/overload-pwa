import { useState } from 'react'
import { FeedbackIcon } from '../../components/common-ui/FeedbackIcon.tsx'
import { useDelayedPending } from '../../components/useDelayedPending.ts'
import type { WorkoutSaveStatus } from '../workout-local/save-status.ts'
import styles from './WorkoutFlow.module.css'

const labels = {
  saved: { text: '저장 완료', icon: 'check' },
  saving: { text: '저장 중', icon: 'syncing' },
  waiting: { text: '전송 대기', icon: 'offline' },
  failed: { text: '저장 실패', icon: 'error' },
} as const

export function WorkoutSaveLabel({ status, syncing = false, onDetails }: { status: WorkoutSaveStatus; syncing?: boolean; onDetails?: () => void }) {
  const [showSaving, setShowSaving] = useState(false)
  const settled = useDelayedPending(status === 'saved' && showSaving)
  if (status !== 'saved' && showSaving !== (status === 'saving')) setShowSaving(status === 'saving')
  if (settled && showSaving) setShowSaving(false)

  const displayed = status === 'saved' && showSaving ? 'saving' : status
  const label = labels[displayed]
  return <>
    <small className={styles.saveLabel} data-workout-save-status={displayed}>
      <FeedbackIcon name={label.icon} size={10} spinning={status === 'saving' && syncing} />{label.text}
    </small>
    <span className="sr-only" role="status">{status === 'failed' || status === 'waiting' ? label.text : ''}</span>
    {onDetails && <button type="button" className={styles.saveDetails} aria-label={`${label.text} · 데이터 상태 확인`}
      aria-haspopup="dialog" onClick={onDetails} />}
  </>
}
