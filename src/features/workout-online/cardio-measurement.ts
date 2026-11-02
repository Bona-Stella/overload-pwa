import type { CardioMeasurement } from './types.ts'
import { decimalDraft } from './validation.ts'

const scaled = (value: string) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0')) }
const decimal = (value: bigint) => { const whole = value / 1000000n, fraction = (value % 1000000n).toString().padStart(6, '0').replace(/0+$/, ''); return whole.toString() + (fraction ? '.' + fraction : '') }
export function calculatedDistance(speed: string | null, activeMs: number): string | null {
  if (speed === null || !Number.isSafeInteger(activeMs) || activeMs < 1 || activeMs > 86400000) return null
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
export function distanceLabel(result: { distanceKm: string | null; measurement?: CardioMeasurement }) {
  if (result.distanceKm === null) return '거리 미입력'
  const source = result.measurement?.distanceSource
  return `${source === 'CALCULATED' ? '계산 거리' : source === 'MANUAL' ? '직접 입력 거리' : '거리 · 출처 미확인'} ${result.distanceKm} km`
}
