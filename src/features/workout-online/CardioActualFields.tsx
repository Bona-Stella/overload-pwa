import type { ReactNode } from 'react'
import { CardioNumberField } from './CardioNumberField.tsx'
import { NumberWheel } from '../../components/NumberWheel.tsx'
import numeric from '../../components/NumberWheel.module.css'
import { actualAverageBpm, averageBpmBounds, calculatedSpeed, cardioMeasurementDraft, displayedCardioDistance, editCardioSpeed } from './cardio-measurement.ts'
import type { CardioMeasurementDraft } from './cardio-measurement.ts'
import type { ActualCardio } from '../workout-flow/types.ts'
import styles from './CardioFields.module.css'

export function CardioActualFields({ time, draft, bpm, bpmConfirmed, initial, activeMs, motion, incline, original, disabled, onChange, onBpm }: {
  time: ReactNode; draft: CardioMeasurementDraft; bpm: string; activeMs: number; motion: boolean; incline: boolean
  bpmConfirmed?: boolean; initial?: { distance?: string; speed?: string; bpm?: string }
  original?: ActualCardio; disabled?: boolean
  onChange?: (value: Partial<CardioMeasurementDraft>) => void; onBpm?: (bpm: string) => void
}) {
  const realDistance = draft.distanceSource === 'estimated' ? '' : displayedCardioDistance(draft, activeMs)
  const calculated = motion && !draft.speed && draft.speedSource !== 'manual' ? calculatedSpeed(realDistance, activeMs) : ''
  const distanceCandidate = (!realDistance && draft.distanceSource !== 'manual' && initial?.distance) || ''
  const speedCandidate = (!draft.speed && draft.speedSource !== 'manual' && (calculated || initial?.speed)) || ''
  const bpmCandidate = (!bpm && !bpmConfirmed && initial?.bpm) || ''
  const distance = realDistance || distanceCandidate
  const speed = draft.speed || speedCandidate
  const shownBpm = bpm || bpmCandidate
  const distanceModified = original ? realDistance !== (original.distanceKm ?? '') : draft.distanceSource === 'manual'
  const speedModified = original ? draft.speed !== (original.measurement?.actualSpeedKmh ?? '') : draft.speedSource === 'manual'
  const bpmModified = bpm !== (original?.averageBpm == null ? '' : String(original.averageBpm))

  return <div className={`${styles.fields} ${styles.planFields}`}>
    {time}
    {motion && <CardioNumberField field="distance" label="실제 거리" value={distance} actual
      valueState={distanceCandidate ? 'initial' : distanceModified && (distance || original) ? 'modified' : distance ? 'confirmed' : 'empty'}
      onChange={!disabled && onChange ? next => {
        const canRestoreSource = original?.measurement?.distanceSource !== 'CALCULATED' ||
          displayedCardioDistance({ ...draft, distanceSource: 'derived' }, activeMs) === next
        if (original && canRestoreSource && next === (original.distanceKm ?? '')) {
          const saved = cardioMeasurementDraft(original)
          onChange({ distance: saved.distance, distanceSource: saved.distanceSource })
        } else if (next !== realDistance || distanceCandidate || !next) {
          onChange({ distance: next, distanceSource: 'manual' })
        }
      } : undefined} />}
    {motion && <CardioNumberField field="speed" label="실제 평균 속도" actual value={speed}
      valueState={speedCandidate ? 'initial' : speedModified && (speed || original) ? 'modified' : speed ? 'confirmed' : 'empty'}
      onChange={!disabled && onChange ? next => {
        const edit = editCardioSpeed(draft, next, activeMs)
        onChange(original && next === (original.measurement?.actualSpeedKmh ?? '') ? { ...edit, speedSource: undefined } : edit)
      } : undefined} />}
    <div className={numeric.field}>
      <span>평균 심박수 · 선택</span>
      <NumberWheel label="평균 심박수 (BPM)" value={shownBpm} unit="BPM" start={String(averageBpmBounds.min)} hideSteps showEmptyUnit
        displayValue={shownBpm || '—'} valueState={bpmCandidate ? 'initial' : bpmModified ? 'modified' : shownBpm ? 'confirmed' : 'empty'}
        preview={disabled || !onBpm} disabled={disabled || !onBpm}
        wheelSeed={String(Math.min(averageBpmBounds.max, Math.max(averageBpmBounds.min, Number(shownBpm) || 0)))}
        adjust={(current, direction) => {
          const next = Number(current) + direction
          return next >= averageBpmBounds.min && next <= averageBpmBounds.max ? String(next) : null
        }} validate={next => String(actualAverageBpm(next) ?? '')} onChange={next => onBpm?.(next)} />
    </div>
    {incline && <small className={styles.note}>실제 경사도는 현재 저장할 수 없습니다.</small>}
    {calculated && <small className={styles.note}>자동 계산한 평균 속도는 확인용으로 표시됩니다.</small>}
  </div>
}
