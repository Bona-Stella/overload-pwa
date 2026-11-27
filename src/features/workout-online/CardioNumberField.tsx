import { NumberWheel } from '../../components/NumberWheel.tsx'
import numeric from '../../components/NumberWheel.module.css'
import { CardioValueRow } from '../workout-flow/CardioValueRow.tsx'
import { numericStateDescription } from '../../components/wheel-options.ts'
import type { NumericValueState } from '../../components/wheel-options.ts'
import { adjustCardioWheel, cardioWheelValue } from './cardio-draft.ts'
import { cardioMotionValue } from './cardio-measurement.ts'
import { decimalDraft } from './validation.ts'
import styles from './CardioFields.module.css'

export function CardioNumberField({ field, label, value, onChange, actual = false, valueState = value ? 'confirmed' : 'empty' }: {
  field: 'distance' | 'speed'; label: string; value: string; onChange?: (value: string) => void
  actual?: boolean; valueState?: NumericValueState
}) {
  const wide = field === 'distance'
  const unit = wide ? 'km' : 'km/h'
  const display = value ? cardioMotionValue(value) : '—'
  const seed = value ? cardioMotionValue(value) : '0.0'
  const validate = (input: string) => {
    if (!actual) return cardioWheelValue(input, field)
    if (!input.trim()) return ''
    const raw = decimalDraft(input)
    // A stored calculation may be zero or above the direct-entry limit.
    return wide && (raw !== value || valueState === 'initial') ? cardioWheelValue(raw, 'distance') : raw
  }
  return <div className={wide ? styles.goalRow : numeric.field}>
    {!wide && <span>{label} · 선택</span>}
    <NumberWheel label={`${label} (${unit})`} unit={unit} hideSteps inputMode="decimal" start="0.0"
      value={value} wheelSeed={seed} displayValue={display} valueState={valueState} showEmptyUnit={!actual} preview={!onChange} disabled={!onChange}
      validate={validate} validateSelection={input => input === '0.0' && (!actual || wide) ? '' : validate(input)}
      renderTrigger={wide ? (open, disabled) => <CardioValueRow label={label + ' · 선택'}
        value={<span><span data-numeric-value={valueState}>{display}</span>{(value || !actual) && ' ' + unit}</span>}
        valueDescription={value ? `${display} ${unit} ${numericStateDescription[valueState]}`
          : valueState === 'modified' ? `${numericStateDescription.empty} ${numericStateDescription.modified}` : numericStateDescription.empty}
        editLabel={label + ' 수정'} onEdit={open} disabled={disabled || !onChange} /> : undefined}
      adjust={(current, direction) => adjustCardioWheel(current, direction, field)}
      onChange={next => onChange?.(next)} />
  </div>
}
