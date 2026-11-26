import { NumberWheel } from '../../components/NumberWheel.tsx'
import styles from '../../components/NumberWheel.module.css'
import { approvalStep } from '../workout-online/approval-weight.ts'
import type { LoadType } from '../workout-online/types.ts'
import { count, countDraft } from '../workout-online/validation.ts'
import { KgWheel } from './WeightFocus.tsx'

export function WeightWheelField({ label, value, onChange, loadType, optional, disabled }: {
  label: string; value: string; onChange: (value: string) => void; loadType: LoadType | null; optional?: boolean; disabled?: boolean
}) {
  return <div className={styles.field}>
    <span>{label}{optional && ' · 선택'}</span>
    <KgWheel label={label} value={value} onChange={onChange} step={approvalStep(loadType) === '2.5' ? 2.5 : 1}
      required={!optional} disabled={disabled} />
  </div>
}

export function RecordedRepsField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const label = '실제 반복 횟수'
  return <div className={styles.field}>
    <span>{label}</span>
    <NumberWheel label={label} value={value} unit="회" start="1" onChange={onChange}
      adjust={(current, direction) => {
        const next = Number(current) + direction
        return count(next) ? String(next) : null
      }} validate={next => String(countDraft(next))} />
  </div>
}
