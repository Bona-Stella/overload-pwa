import type { Equipment, UpdateRoutine, WeightNew } from './types.ts'
import { countDraft, decimalDraft } from './validation.ts'

export type WeightDraft = Equipment & { restore?: boolean; id: string; standardExerciseId: string; exerciseName: string;
  setCount: string; minReps: string; maxReps: string; initialWeightKg: string; approvedWeightKg: string | null; approve: boolean; nextWeightKg: string }
export function newWeights(weights: WeightDraft[]): WeightNew[] {
  return weights.map(w => {
    const setCount = countDraft(w.setCount), minReps = countDraft(w.minReps), maxReps = countDraft(w.maxReps)
    if (minReps > maxReps) throw new Error('최소 반복 수는 최대 반복 수를 넘을 수 없습니다.')
    return { id: w.id, standardExerciseId: w.standardExerciseId, manufacturerId: w.manufacturerId, loadType: w.loadType,
      setCount, minReps, maxReps, initialWeightKg: decimalDraft(w.initialWeightKg) }
  })
}
export function updatedWeights(weights: WeightDraft[]): UpdateRoutine['weightPlacements'] {
  return newWeights(weights).map((w, index) => weights[index].approvedWeightKg !== null
    ? { mode: weights[index].restore ? 'RESTORE' : 'EXISTING', id: w.id, manufacturerId: w.manufacturerId, loadType: w.loadType,
      setCount: w.setCount, minReps: w.minReps, maxReps: w.maxReps }
    : { mode: 'NEW', ...w })
}
