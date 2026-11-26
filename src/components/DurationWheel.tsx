import { NumberWheel } from './NumberWheel.tsx'
import { durationParts, durationSeconds } from './duration.ts'

/** The correction dialog keeps its existing seconds draft and save contract. */
export function DurationWheel({ seconds, onChange, disabled, label = '실제 활동', fractionalSeconds = false }: {
  seconds: string; onChange: (seconds: string) => void; disabled?: boolean; label?: string; fractionalSeconds?: boolean
}) {
  const parts = durationParts(seconds || '0')
  const actual = label === '실제 활동'
  return <div className="duration-wheels" role="group" aria-label={actual ? '실제 활동 시간' : label}>
    {([['hours', '시간'], ['minutes', '분'], ['seconds', '초']] as const).map(([key, unit]) => {
      const fractional = fractionalSeconds && key === 'seconds'
      const validate = (value: string) => {
        if (!(fractional ? /^\d+(\.\d{1,3})?$/ : /^\d+$/).test(value)) throw Error(unit + ' 범위를 확인해 주세요.')
        durationSeconds({ ...parts, [key]: value })
        return value
      }
      return <div key={key}><span>{unit}</span><NumberWheel label={actual ? label + ' ' + unit : `${label} (${key === 'hours' ? '시' : unit})`} value={seconds ? parts[key] : ''}
        inputMode={fractional ? 'decimal' : 'numeric'} disabled={disabled} unit={unit} start="0" hideSteps validate={validate}
        adjust={(value, direction) => {
          const [whole, fraction] = (value || '0').split('.')
          const next = String(Number(whole) + direction) + (fraction ? '.' + fraction : '')
          try { return validate(next) } catch { return null }
        }}
        onChange={value => onChange(durationSeconds({ ...parts, [key]: value }))} /></div>
    })}
  </div>
}
