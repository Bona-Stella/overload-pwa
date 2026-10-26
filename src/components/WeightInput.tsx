import { adjustWeightDraft } from '../features/workout/weight'

export function WeightInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const lower = adjustWeightDraft(value, -1)
  const higher = adjustWeightDraft(value, 1)
  return <div className="weight-field"><p className="field-label">{label}</p><div className="weight-input" role="group" aria-label="중량 빠른 조절">
    <button type="button" className="outline" aria-label="중량 2.5kg 감소" disabled={lower === null} onClick={() => { if (lower !== null) onChange(lower) }}>−2.5</button>
    <label className="weight-value"><span className="sr-only">{label}</span><input aria-label={label} inputMode="decimal" title="중량 직접 입력" value={value} onChange={event => onChange(event.target.value)} /><span className="weight-unit" aria-hidden="true">kg</span></label>
    <button type="button" className="outline" aria-label="중량 2.5kg 증가" disabled={higher === null} onClick={() => { if (higher !== null) onChange(higher) }}>+2.5</button>
  </div></div>
}
