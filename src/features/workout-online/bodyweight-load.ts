import type { PerformedSet } from './types.ts'
import { decimalDraft } from './validation.ts'

/** No default from weightKg, approval weight or the user's body mass. */
export function additionalLoadInput(value: string) {
  return { additionalWeightKg: value.trim() ? decimalDraft(value) : null }
}
export function bodyweightLoadLabel(record: Pick<PerformedSet, 'loadType' | 'bodyweightLoad'>) {
  if (record.loadType !== 'BODYWEIGHT') return ''
  const value = record.bodyweightLoad?.additionalWeightKg
  return value == null ? '추가 중량 근거 없음 · 세트·반복만 집계' : `명시적 추가 중량 ${value} kg`
}
