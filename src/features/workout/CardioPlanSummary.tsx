import { CARDIO_NAMES } from './cardio'
import { formatDuration } from './model'
import type { CardioPlan } from './types'

export function CardioPlanSummary({ plan }: { plan: CardioPlan }) {
  return <div className="stack small"><p>{CARDIO_NAMES[plan.kind]} · 목표 {formatDuration(plan.targetSeconds * 1000)}</p>
    {plan.targetDistance !== null && <p>목표 거리 {plan.targetDistance} km</p>}
    {plan.intensity && <p>계획 {plan.intensity.mode === 'speed' ? `설정 속도 ${plan.intensity.value} km/h` : `페이스 ${plan.intensity.value} 분/km`}</p>}
    {plan.incline !== null && <p>경사도 {plan.incline}%</p>}{plan.resistance !== null && <p>저항 레벨 {plan.resistance}</p>}
  </div>
}
