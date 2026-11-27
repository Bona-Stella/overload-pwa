import { NumberWheel } from '../../components/NumberWheel.tsx'
import numeric from '../../components/NumberWheel.module.css'
import { CardioValue, CardioValueRow } from '../workout-flow/CardioValueRow.tsx'
import { adjustCardioWheel, cardioWheelValue } from './cardio-draft.ts'
import { cardioMotionValue } from './cardio-measurement.ts'
import { decimalDraft } from './validation.ts'
import styles from './CardioFields.module.css'

export function CardioNumberField({ field, label, value, onChange, calculated, actual = false, modified, tag }: {
  field: 'distance' | 'speed'; label: string; value: string; onChange?: (value: string) => void
  calculated?: string; actual?: boolean; modified?: boolean; tag?: '추정' | '계산'
}) {
  const wide = field === 'distance'
  const unit = wide ? 'km' : 'km/h'
  const shown = value || calculated
  const display = shown ? cardioMotionValue(shown) : actual ? undefined : '0.0'
  const seed = display ?? '0.0'
  const validate = (input: string) => {
    if (!actual) return cardioWheelValue(input, field)
    if (!input.trim()) return ''
    // Actual distances can be derived or carried from an older record. The save path validates their source.
    return decimalDraft(input)
  }
  return <div className={wide ? styles.goalRow : numeric.field}>
    {!wide && <span>{label} · 선택</span>}
    <NumberWheel label={`${label} (${unit})`} unit={unit} hideSteps inputMode="decimal" start="0.0"
      value={value} wheelSeed={seed} displayValue={display} describeBlank preview={!onChange} disabled={!onChange}
      validate={validate} validateSelection={input => input === '0.0' && (!actual || wide) ? '' : validate(input)}
      renderValue={modified && value ? shown => <CardioValue modified>{shown}</CardioValue> : undefined}
      renderTrigger={wide ? (open, disabled) => <CardioValueRow label={label + ' · 선택'}
        value={<>{display === undefined ? '미입력' : <span><CardioValue modified={modified}>{display}</CardioValue> {unit}</span>}
          {tag && <small>{tag}</small>}</>}
        editLabel={label + ' 수정'} onEdit={open} disabled={disabled || !onChange} /> : undefined}
      adjust={(current, direction) => adjustCardioWheel(current, direction, field)}
      onChange={next => { if (next !== value) onChange?.(next) }} />
  </div>
}
