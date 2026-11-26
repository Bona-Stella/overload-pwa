import { CardioNumberField } from './CardioNumberField.tsx'
import { NumberWheel } from '../../components/NumberWheel.tsx'
import numeric from '../../components/NumberWheel.module.css'
import { actualAverageBpm, averageBpmBounds, calculatedSpeed, editCardioSpeed } from './cardio-measurement.ts'
import type { CardioMeasurementDraft } from './cardio-measurement.ts'
import styles from './CardioFields.module.css'

export function CardioActualFields({ draft, bpm, activeMs, motion, incline, onChange, onBpm }: {
  draft: CardioMeasurementDraft; bpm: string; activeMs: number; motion: boolean; incline: boolean
  onChange?: (value: Partial<CardioMeasurementDraft>) => void; onBpm?: (bpm: string) => void
}) {
  const calculated = motion && !draft.speed && draft.speedSource !== 'manual' ? calculatedSpeed(draft.distance, activeMs) : ''
  const tag = !draft.distance.trim() ? undefined : draft.distanceSource === 'estimated' || draft.distanceSource === 'derived'
    ? '추정' : draft.distanceSource === 'manual' ? '수정' : undefined
  return <div className={styles.fields}>
    {motion && <>
      <CardioNumberField label="실제 거리 (km)" value={draft.distance} tag={tag}
        onChange={onChange && (distance => onChange({ distance, distanceSource: 'manual' }))} />
      <CardioNumberField label="실제 평균 속도 (km/h)" value={draft.speed || calculated}
        onChange={onChange && (speed => onChange(editCardioSpeed(draft, speed, activeMs)))} />
    </>}
    <div className={numeric.field}>
      <span>평균 심박수</span>
      <NumberWheel label="평균 심박수 (BPM)" value={bpm} unit="BPM" start={String(averageBpmBounds.min)} hideSteps describeBlank
        displayValue={bpm || '0'} preview={!onBpm} wheelSeed={String(Math.min(averageBpmBounds.max, Math.max(averageBpmBounds.min, Number(bpm) || 0)))}
        adjust={(current, direction) => {
          const next = Number(current) + direction
          return next >= averageBpmBounds.min && next <= averageBpmBounds.max ? String(next) : null
        }} validate={next => String(actualAverageBpm(next) ?? '')} onChange={next => onBpm?.(next)} />
    </div>
    {incline && <small className={styles.note}>실제 경사도는 현재 저장할 수 없습니다.</small>}
    {motion && draft.distanceSource === 'estimated' && <small className={styles.note}>목표 거리에서 가져온 추정값입니다. 거리를 직접 입력하면 기록에 저장할 수 있습니다.</small>}
    {calculated && <small className={styles.note}>자동 계산한 평균 속도는 확인용으로 표시됩니다.</small>}
    {motion && draft.speedSource === 'manual' && draft.speed.trim() && !draft.distance.trim() &&
      <small className={styles.note}>평균 속도를 저장하려면 실제 거리를 입력해 주세요.</small>}
  </div>
}
