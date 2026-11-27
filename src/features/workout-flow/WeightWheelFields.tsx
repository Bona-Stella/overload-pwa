import { NumberWheel } from '../../components/NumberWheel.tsx'
import styles from '../../components/NumberWheel.module.css'
import { approvalStep } from '../workout-online/approval-weight.ts'
import type { LoadType } from '../workout-online/types.ts'
import { count, countDraft } from '../workout-online/validation.ts'
import { KgWheel } from './WeightFocus.tsx'
import type { NumericValueState } from '../../components/wheel-options.ts'

export function WeightWheelField({ label, value, onChange, loadType, optional, disabled, valueState }: {
  label: string; value: string; onChange: (value: string) => void; loadType: LoadType | null; optional?: boolean; disabled?: boolean
  valueState?: NumericValueState
}) {
  return <div className={styles.field}>
    <span>{label}{optional && ' · 선택'}</span>
    <KgWheel label={label} value={value || (optional ? '' : '0')} valueState={valueState ?? (!optional && !value ? 'initial' : undefined)} onChange={onChange} step={approvalStep(loadType) === '2.5' ? 2.5 : 1}
      required={!optional} disabled={disabled} />
  </div>
}

export function RecordedRepsField({ value, onChange, modified }: { value: string; onChange: (value: string) => void; modified?: boolean }) {
  const label = '실제 반복 횟수'
  return <div className={styles.field}>
    <span>{label}</span>
    <NumberWheel label={label} value={value} valueState={modified ? 'modified' : 'confirmed'} unit="회" start="1" onChange={onChange}
      adjust={(current, direction) => {
        const next = Number(current) + direction
        return count(next) ? String(next) : null
      }} validate={next => String(countDraft(next))} />
  </div>
}
