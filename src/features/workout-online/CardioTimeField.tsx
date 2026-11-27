import { useId, useRef, useState } from 'react'
import { DurationWheel } from '../../components/DurationWheel.tsx'
import { Button } from '../../components/ui.tsx'
import { formatDuration } from '../workout/model.ts'
import { CardioValue, CardioValueRow } from '../workout-flow/CardioValueRow.tsx'
import styles from './CardioFields.module.css'

export function CardioTimeField({ label, seconds, onChange, displayMs = Number(seconds) * 1000, wheelLabel, fractionalSeconds, disabled, modified }: {
  label: string; seconds: string; onChange: (seconds: string) => void; displayMs?: number
  wheelLabel?: string; fractionalSeconds?: boolean; disabled?: boolean; modified?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const editor = useId()
  const expanded = !disabled && draft !== null
  const close = () => { setDraft(null); button.current?.focus() }
  return <div className={styles.goalTime}>
    <CardioValueRow label={label + ' · 필수'} value={<CardioValue modified={modified}>{formatDuration(displayMs)}</CardioValue>}
      editLabel={label + ' 수정'} expanded={expanded} controls={expanded ? editor : undefined} buttonRef={button}
      disabled={disabled} onEdit={() => { if (expanded) close(); else setDraft(seconds || '0') }} />
    {expanded && <div id={editor} className={styles.goalTime}>
      <DurationWheel label={wheelLabel} seconds={draft} fractionalSeconds={fractionalSeconds} onChange={setDraft} />
      <div className={styles.timeActions}>
        <Button onClick={close}>시간 수정 취소</Button>
        <Button variant="primary" onClick={() => { if (draft !== (seconds || '0')) onChange(draft); close() }}>시간 적용</Button>
      </div>
    </div>}
  </div>
}
