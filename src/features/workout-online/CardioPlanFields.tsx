import { useState } from 'react'
import { NumberWheel } from '../../components/NumberWheel.tsx'
import numeric from '../../components/NumberWheel.module.css'
import segmented from '../../components/common-ui/SegmentedControl.module.css'
import { Button } from '../../components/ui.tsx'
import { CardioNumberField } from './CardioNumberField.tsx'
import { CardioTimeField } from './CardioTimeField.tsx'
import { adjustCardioWheel, adjustPaceWheel, cardioSecondsFromMinutes, cardioWheelValue, missingCardioTime, paceDirectValue, paceFromSeconds, paceLabel, supportsCardioMotion } from './cardio-draft.ts'
import type { CardioDraft } from './cardio-draft.ts'
import { decimalDraft } from './validation.ts'
import styles from './CardioFields.module.css'

export function CardioPlanFields({ value, onChange, previewGoals }: {
  value: CardioDraft; onChange: (value: CardioDraft) => void; previewGoals?: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(Boolean(value.intensity || value.incline || value.resistance))
  const [unitError, setUnitError] = useState('')
  const patch = (changes: Partial<CardioDraft>) => onChange({ ...value, ...changes })
  const motion = supportsCardioMotion(value.kind)
  let seconds = value.seconds
  if (value.minutes !== undefined) {
    try { seconds = cardioSecondsFromMinutes(value.minutes) }
    catch { seconds = '' }
  }
  if (Number(seconds) > 86400) seconds = ''
  function changeUnit(mode: CardioDraft['intensityMode']) {
    try {
      const number = value.intensity.trim() ? Number(decimalDraft(value.intensity)) : null
      const converted = number === null ? null : Math.round(60 / number * 1e6) / 1e6
      if (converted !== null && (converted < .1 || converted > (mode === 'SPEED' ? 100 : 120))) throw Error()
      patch({ intensityMode: mode, intensity: converted === null ? '' : String(converted) })
      setUnitError('')
    } catch { setUnitError('현재 강도를 새 단위로 바꿀 수 없습니다. 값을 확인해 주세요.') }
  }

  return <div className={`${styles.fields} ${styles.planFields}`}>
    <CardioTimeField label="목표 시간" wheelLabel="목표 시간" seconds={seconds} onChange={seconds => patch({ seconds, minutes: undefined })} />
    {motion && <CardioNumberField field="distance" label="목표 거리" value={value.distance} onChange={distance => patch({ distance })} />}
    {!Number(seconds) && <small className={styles.note}>{missingCardioTime}</small>}
    {motion && <details className={styles.extra} open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary>추가 목표 설정</summary>
      {expanded && <div className={styles.fields}>
        <div className={`${segmented.segment} ${styles.intensity}`} role="group" aria-label="강도 단위">
          <Button aria-pressed={value.intensityMode === 'SPEED'} onClick={() => { if (value.intensityMode !== 'SPEED') changeUnit('SPEED') }}>속도 (km/h)</Button>
          <Button aria-pressed={value.intensityMode === 'PACE'} onClick={() => { if (value.intensityMode !== 'PACE') changeUnit('PACE') }}>페이스 (분/km)</Button>
        </div>
        {value.intensityMode === 'PACE'
          ? <PaceGoal value={value.intensity} onChange={intensity => { setUnitError(''); patch({ intensity }) }} />
          : <CardioNumberField field="speed" label="목표 속도" value={value.intensity} onChange={intensity => { setUnitError(''); patch({ intensity }) }} />}
        {value.kind === 'TREADMILL' && <AdditionalGoal field="incline" value={value.incline} onChange={incline => patch({ incline })} />}
        {value.kind === 'BIKE' && <AdditionalGoal field="resistance" value={value.resistance} onChange={resistance => patch({ resistance })} />}
        {unitError && <small className={styles.note} role="status">{unitError}</small>}
        {previewGoals}
      </div>}
    </details>}
  </div>
}

function PaceGoal({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const seconds = Math.round(Number(value) * 60)
  const seed = seconds ? Math.max(10, Math.round(seconds / 5) * 5) : 0
  return <div className={numeric.field}>
    <span>목표 페이스 · 선택</span>
    <NumberWheel label="목표 페이스 (분/km)" value={value} unit="분/km" hideSteps describeBlank
      displayValue={paceLabel(seconds)} start="0" wheelSeed={String(seed)}
      formatOption={choice => paceLabel(Number(choice))} adjust={adjustPaceWheel} validateSelection={paceFromSeconds}
      inputMode="text" directHint="분:초 또는 소수 분을 입력해 주세요. 공란으로 두면 목표가 해제돼요."
      validate={paceDirectValue} onChange={onChange} />
  </div>
}

function AdditionalGoal({ field, value, onChange }: { field: 'incline' | 'resistance'; value: string; onChange: (value: string) => void }) {
  const incline = field === 'incline'
  const label = incline ? '목표 경사도' : '목표 저항'
  const seed = Number(value || 0).toFixed(incline ? 1 : 0)
  const validate = (next: string) => cardioWheelValue(next, field)
  return <div className={numeric.field}>
    <span>{label} · 선택</span>
    <NumberWheel label={incline ? `${label} (%)` : label} value={value} unit={incline ? '%' : ''} hideSteps describeBlank
      displayValue={seed}
      start={incline ? '0.0' : '0'} wheelSeed={seed} inputMode="decimal" validate={validate}
      validateSelection={incline ? undefined : next => next === '0' ? '' : validate(next)}
      adjust={(current, direction) => adjustCardioWheel(current, direction, field)} onChange={onChange} />
  </div>
}
