import type { CardioDraft } from '../workout-flow/types.ts'
import { actualAverageBpm, actualCardioMeasurement } from '../workout-online/cardio-measurement.ts'
import { supportsCardioMotion } from '../workout-online/cardio-draft.ts'
import type { CardioPlan, Equipment } from '../workout-online/types.ts'
import { countDraft, decimalDraft } from '../workout-online/validation.ts'
import { WorkoutActionError } from './action-error.ts'
import type { SetDraft } from './types.ts'

function inputValue<T>(read: () => T, message?: string): T {
  try { return read() }
  catch (error) {
    throw new WorkoutActionError(message ?? (error instanceof Error ? error.message : '입력값을 확인해 주세요.'))
  }
}

export function setCompletionInput(draft: SetDraft, loadType: Equipment['loadType']) {
  if (!draft.reps.trim()) throw new WorkoutActionError('반복 횟수를 입력해 주세요.')
  const reps = inputValue(() => countDraft(draft.reps), '입력한 반복 횟수를 확인해 주세요.')
  if (!draft.weight.trim()) throw new WorkoutActionError('중량을 입력해 주세요.')
  const weightKg = inputValue(() => decimalDraft(draft.weight), '입력한 중량을 확인해 주세요.')
  const bodyweightLoad = loadType === 'BODYWEIGHT'
    ? { additionalWeightKg: inputValue(() => decimalDraft(draft.additionalWeight?.trim() || '0'), '입력한 추가 중량을 확인해 주세요.') } : undefined
  return { reps, weightKg, bodyweightLoad }
}

export function cardioCompletionInput(draft: CardioDraft, kind: CardioPlan['kind'], timerMs: number) {
  const corrected = draft.correctedSeconds !== null
  const activeMs = corrected ? inputValue(() => countDraft(draft.correctedSeconds!) * 1000, '정정한 운동 시간을 확인해 주세요.') : timerMs
  if (activeMs < 1) throw new WorkoutActionError('운동 시간을 기록해 주세요.')
  if (activeMs > 86400000) throw new WorkoutActionError('운동 시간은 24시간 이내로 입력해 주세요.')
  const { distanceKm, measurement } = inputValue(() => actualCardioMeasurement(draft, activeMs))
  if ((distanceKm !== null || measurement.actualSpeedKmh !== null) && !supportsCardioMotion(kind)) {
    throw new WorkoutActionError('거리와 속도는 러닝머신·자전거·야외 운동에만 입력할 수 있습니다.')
  }
  const averageBpm = inputValue(() => actualAverageBpm(draft.bpm))
  return { activeMs, corrected, distanceKm, measurement, averageBpm }
}
