import type { CardioMeasurement, CardioResult } from './types.ts'
import { decimalDraft, decimal as validDecimal } from './validation.ts'

const scaled = (value: string) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0')) }
const decimal = (value: bigint) => { const whole = value / 1000000n, fraction = (value % 1000000n).toString().padStart(6, '0').replace(/0+$/, ''); return whole.toString() + (fraction ? '.' + fraction : '') }
export type CardioMeasurementDraft = {
  distance: string; speed: string
  distanceSource?: 'estimated' | 'derived' | 'manual' | 'stored'
  speedSource?: 'manual'
}
type ActualCardio = Extract<CardioResult, { status: 'COMPLETED' }>['result']

const validTime = (activeMs: number) => Number.isSafeInteger(activeMs) && activeMs >= 1 && activeMs <= 86400000
export function estimatedCardioDistance(draft: CardioMeasurementDraft, goal: string | null, activeMs: number, enabled: boolean): Partial<CardioMeasurementDraft> {
  const canSeed = draft.distanceSource === undefined && !draft.distance.trim() && !draft.speed.trim()
  if (!enabled || !validTime(activeMs) || (!canSeed && draft.distanceSource !== 'estimated')) return {}
  if (validDecimal(goal) && Number(goal) >= .001 && Number(goal) <= 1000) return { distance: goal, distanceSource: 'estimated' }
  if (draft.distanceSource === 'estimated') return { distance: '', distanceSource: undefined }
  return {}
}

export function calculatedSpeed(distance: string, activeMs: number): string {
  if (!distance.trim() || !validTime(activeMs)) return ''
  try {
    const time = BigInt(activeMs)
    const speed = (scaled(decimalDraft(distance)) * 3600000n + time / 2n) / time
    return speed < 100000000000000000000n ? decimal(speed) : ''
  } catch { return '' }
}

export function editCardioSpeed(draft: CardioMeasurementDraft, speed: string, activeMs: number): Partial<CardioMeasurementDraft> {
  const edit = { speed, speedSource: 'manual' as const }
  if (speed.trim() && (draft.distanceSource === 'estimated' || draft.distanceSource === 'derived')) {
    try {
      const distance = calculatedDistance(speed, activeMs)
      if (distance !== null) return { ...edit, distance, distanceSource: 'derived' }
    } catch { /* Keep the visible input for correction. */ }
  }
  return edit
}

export function cardioMeasurementDraft(result: ActualCardio): CardioMeasurementDraft {
  const source = result.measurement?.distanceSource
  return { distance: result.distanceKm ?? '', speed: result.measurement?.actualSpeedKmh ?? '',
    distanceSource: source === 'CALCULATED' ? 'derived' : source === 'MANUAL' ? 'manual' : 'stored' }
}

export function actualCardioMeasurement(draft: CardioMeasurementDraft, activeMs: number) {
  if (draft.distanceSource === 'estimated') {
    if (draft.speed.trim()) throw Error('수정한 평균 속도를 저장하려면 실제 거리를 입력해 주세요.')
    return measuredCardio('', '', activeMs)
  }
  if (draft.distanceSource === 'derived') {
    const measured = measuredCardio(draft.speed, '', activeMs)
    if (measured.distanceKm !== draft.distance) throw Error('계산한 거리와 입력값이 달라요. 실제 거리를 입력하거나 거리와 속도를 비워 주세요.')
    return measured
  }
  if (!draft.distance.trim() && draft.speed.trim() && (draft.distanceSource === 'manual' || draft.speedSource === 'manual')) {
    throw Error('평균 속도를 저장하려면 실제 거리를 입력해 주세요.')
  }
  return measuredCardio(draft.speed, draft.distance, activeMs, draft.distanceSource === 'stored')
}

export function calculatedDistance(speed: string | null, activeMs: number): string | null {
  if (speed === null || !validTime(activeMs)) return null
  const numerator = scaled(decimalDraft(speed)) * BigInt(activeMs), distance = (numerator + 1800000n) / 3600000n
  if (distance >= 100000000000000000000n) throw new Error('계산 거리가 저장 가능한 범위를 초과했습니다.')
  return decimal(distance)
}
export function measuredCardio(speedDraft: string, distanceDraft: string, activeMs: number, preserveUnknown = false): { distanceKm: string | null; measurement: CardioMeasurement } {
  const actualSpeedKmh = speedDraft.trim() ? decimalDraft(speedDraft) : null
  const manual = distanceDraft.trim() ? decimalDraft(distanceDraft) : null
  if (manual !== null) {
    if (scaled(manual) < 1000n || scaled(manual) > 1000000000n) throw new Error('직접 입력 거리는 0.001~1000 km여야 합니다.')
    return { distanceKm: manual, measurement: { actualSpeedKmh, distanceSource: preserveUnknown ? null : 'MANUAL' } }
  }
  const distanceKm = calculatedDistance(actualSpeedKmh, activeMs)
  return { distanceKm, measurement: { actualSpeedKmh, distanceSource: distanceKm === null ? null : 'CALCULATED' } }
}
export function cardioMotionValue(value: string) {
  if (!validDecimal(value)) return value
  const tenths = (scaled(value) + 50000n) / 100000n
  return `${tenths / 10n}.${tenths % 10n}`
}
export function distanceSourceLabel(source: CardioMeasurement['distanceSource'] | undefined) {
  return source === 'CALCULATED' ? '계산 거리' : source === 'MANUAL' ? '직접 입력 거리' : '거리 · 출처 미확인'
}
export function distanceLabel(result: { distanceKm: string | null; measurement?: CardioMeasurement }) {
  if (result.distanceKm === null) return '거리 미입력'
  return `${distanceSourceLabel(result.measurement?.distanceSource)} ${cardioMotionValue(result.distanceKm)} km`
}
export const averageBpmBounds = { min: 20, max: 300 } as const
export const averageBpmMessage = '평균 심박수는 20~300 BPM을 입력해 주세요.'

export function actualAverageBpm(value: string) {
  if (!value.trim()) return null
  const bpm = Number(value)
  if (!/^\d+$/.test(value.trim()) || bpm < averageBpmBounds.min || bpm > averageBpmBounds.max) throw Error(averageBpmMessage)
  return bpm
}
