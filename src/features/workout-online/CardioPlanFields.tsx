import { useState } from 'react'
import { CardioNumberField } from './CardioNumberField.tsx'
import { missingCardioTime, supportsCardioMotion } from './cardio-draft.ts'
import type { CardioDraft } from './cardio-draft.ts'
import { decimalDraft } from './validation.ts'
import styles from './CardioFields.module.css'

export function CardioPlanFields({ value, onChange }: { value: CardioDraft; onChange: (value: CardioDraft) => void }) {
  const [expanded, setExpanded] = useState(Boolean(value.intensity || value.incline || value.resistance))
  const [unitError, setUnitError] = useState('')
  const patch = (changes: Partial<CardioDraft>) => onChange({ ...value, ...changes })
  const motion = supportsCardioMotion(value.kind)
  const minutes = value.minutes ?? (value.seconds ? String(Math.round(Number(value.seconds) / 60 * 1e6) / 1e6) : '')
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
    <CardioNumberField label="목표 시간 (분)" value={minutes} onChange={minutes => patch({ minutes })} />
    {motion && <CardioNumberField label="목표 거리 (km)" value={value.distance} onChange={distance => patch({ distance })} />}
    {!minutes.trim() && <small className={styles.note}>{missingCardioTime}</small>}
    {motion && <details className={styles.extra} open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary>추가 목표 설정</summary>
      {expanded && <div className={styles.fields}>
        <label>강도 단위<select value={value.intensityMode} onChange={e => changeUnit(e.target.value as CardioDraft['intensityMode'])}>
          <option value="SPEED">속도 (km/h)</option><option value="PACE">페이스 (분/km)</option>
        </select></label>
        <CardioNumberField label={value.intensityMode === 'PACE' ? '목표 페이스 (분/km)' : '목표 속도 (km/h)'}
          value={value.intensity} onChange={intensity => { setUnitError(''); patch({ intensity }) }} />
        {unitError && <small className={styles.note} role="status">{unitError}</small>}
        {value.kind === 'TREADMILL' && <CardioNumberField label="목표 경사도 (%)" value={value.incline} onChange={incline => patch({ incline })} />}
        {value.kind === 'BIKE' && <CardioNumberField label="목표 저항" value={value.resistance} onChange={resistance => patch({ resistance })} />}
      </div>}
    </details>}
  </div>
}
