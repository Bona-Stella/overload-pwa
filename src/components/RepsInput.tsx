import { adjustRepsDraft } from '../features/workout/reps'

export function RepsInput({ ordinal, value, disabled, onChange }: { ordinal: number; value: string; disabled: boolean; onChange: (value: string) => void }) {
  const label = `${ordinal}세트 이번 반복 횟수`
  const lower = adjustRepsDraft(value, -1)
  const higher = adjustRepsDraft(value, 1)
  return <div className="reps-control" role="group" aria-label={label}>
    <button type="button" className="outline" aria-label={`${ordinal}세트 1회 감소`} disabled={disabled || lower === null} onClick={() => { if (lower !== null) onChange(lower) }}>−1</button>
    <label className="reps-input"><span className="sr-only">{label}</span><input type="text" inputMode="numeric" aria-label={label} placeholder="입력" value={value} disabled={disabled} onChange={event => onChange(event.target.value)} /><span aria-hidden="true">회</span></label>
    <button type="button" className="outline" aria-label={`${ordinal}세트 1회 증가`} disabled={disabled || higher === null} onClick={() => { if (higher !== null) onChange(higher) }}>+1</button>
  </div>
}
