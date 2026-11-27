import type { ReactNode } from 'react'
import { CardioNumberField } from './CardioNumberField.tsx'
import { NumberWheel } from '../../components/NumberWheel.tsx'
import numeric from '../../components/NumberWheel.module.css'
import { actualAverageBpm, averageBpmBounds, calculatedSpeed, editCardioSpeed } from './cardio-measurement.ts'
import type { CardioMeasurementDraft } from './cardio-measurement.ts'
import type { ActualCardio } from '../workout-flow/types.ts'
import { CardioValue } from '../workout-flow/CardioValueRow.tsx'
import styles from './CardioFields.module.css'

export function CardioActualFields({ time, draft, bpm, activeMs, motion, incline, original, disabled, onChange, onBpm }: {
  time: ReactNode; draft: CardioMeasurementDraft; bpm: string; activeMs: number; motion: boolean; incline: boolean
  original?: ActualCardio; disabled?: boolean
  onChange?: (value: Partial<CardioMeasurementDraft>) => void; onBpm?: (bpm: string) => void
}) {
  const calculated = motion && !draft.speed && draft.speedSource !== 'manual' ? calculatedSpeed(draft.distance, activeMs) : ''
  const distanceModified = original ? draft.distance !== (original.distanceKm ?? '') : draft.distanceSource === 'manual'
  const speedModified = original ? draft.speed !== (original.measurement?.actualSpeedKmh ?? '') : draft.speedSource === 'manual'
  const bpmModified = bpm !== (original?.averageBpm == null ? '' : String(original.averageBpm))
  const tag = !draft.distance.trim() ? undefined : draft.distanceSource === 'estimated' ? '추정'
    : draft.distanceSource === 'derived' ? '계산' : undefined

  return <div className={`${styles.fields} ${styles.planFields}`}>
    {time}
    {motion && <CardioNumberField field="distance" label="실제 거리" value={draft.distance} actual tag={tag} modified={distanceModified}
      onChange={!disabled && onChange ? distance => onChange({ distance, distanceSource: 'manual' }) : undefined} />}
    {motion && <CardioNumberField field="speed" label="실제 평균 속도" actual value={draft.speed} calculated={calculated} modified={speedModified}
      onChange={!disabled && onChange ? speed => onChange(editCardioSpeed(draft, speed, activeMs)) : undefined} />}
    <div className={numeric.field}>
      <span>평균 심박수 · 선택</span>
      <NumberWheel label="평균 심박수 (BPM)" value={bpm} unit="BPM" start={String(averageBpmBounds.min)} hideSteps describeBlank
        displayValue={bpm || '0'} preview={disabled || !onBpm} disabled={disabled || !onBpm}
        renderValue={bpmModified && bpm ? shown => <CardioValue modified>{shown}</CardioValue> : undefined}
        wheelSeed={String(Math.min(averageBpmBounds.max, Math.max(averageBpmBounds.min, Number(bpm) || 0)))}
        adjust={(current, direction) => {
          const next = Number(current) + direction
          return next >= averageBpmBounds.min && next <= averageBpmBounds.max ? String(next) : null
        }} validate={next => String(actualAverageBpm(next) ?? '')} onChange={next => { if (next !== bpm) onBpm?.(next) }} />
    </div>
    {incline && <small className={styles.note}>실제 경사도는 현재 저장할 수 없습니다.</small>}
    {motion && draft.distanceSource === 'estimated' && <small className={styles.note}>목표 거리에서 가져온 추정값입니다. 거리를 직접 입력하면 기록에 저장할 수 있습니다.</small>}
    {calculated && <small className={styles.note}>자동 계산한 평균 속도는 확인용으로 표시됩니다.</small>}
    {motion && draft.speedSource === 'manual' && draft.speed.trim() && !draft.distance.trim() &&
      <small className={styles.note}>평균 속도를 저장하려면 실제 거리를 입력해 주세요.</small>}
  </div>
}
