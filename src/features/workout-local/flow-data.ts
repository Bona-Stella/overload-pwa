import type { Session, PerformedSet, StandardExercise } from '../workout-online/types.ts'
import type { CardioFocusData, SetResult, WeightFocusData } from '../workout-flow/types.ts'
import type { EditorState } from './controller.ts'
import type { LocalWorkout } from './types.ts'
import { slotKey } from './types.ts'
import { draftFor, elapsed, emptyTimer } from './model.ts'

export function resultView(set: PerformedSet): SetResult {
  return { kg: set.weightKg, reps: set.reps, additionalKg: set.bodyweightLoad?.additionalWeightKg ?? null,
    manufacturerId: set.manufacturerId, loadType: set.loadType, at: Date.parse(set.completedAt),
    mode: set.weightContext.kind === 'INITIAL_APPROVED' ? 'approved' : set.weightContext.kind === 'APPROVAL_REQUEST' ? 'progression' : 'today' }
}
export function previousRecords(history: Session[], workout: LocalWorkout, id: string) {
  const current = workout.snapshot.appliedPlan.weightExercises.find(p => p.sessionExerciseId === id)!
  const standard = workout.snapshot.sessionExercises.find(e => e.id === id)?.standardExerciseId
  for (const session of history) {
    if (session.deletedAt || session.status === 'ACTIVE') continue
    const ids = session.snapshot.state.sessionExercises.filter(e => e.standardExerciseId === standard && e.kind === 'WEIGHT').map(e => e.id)
    const sets = session.snapshot.state.performedSets.filter(s => ids.includes(s.sessionExerciseId) &&
      s.manufacturerId === current.manufacturerId && s.loadType === current.loadType)
    if (sets.length) return new Map(sets.map(s => [s.ordinal, { kg: s.weightKg, reps: String(s.reps), additional: s.bodyweightLoad?.additionalWeightKg ?? '' }]))
  }
  return new Map()
}
export function inputDraft(workout: LocalWorkout, id: string, ordinal: number, history: Session[]) {
  return workout.drafts[slotKey(id, ordinal)] ?? { ...draftFor(workout, id, ordinal), reps: previousRecords(history, workout, id).get(ordinal)?.reps ?? '' }
}
/** Keep the server's full count, but bound pending controls as in the existing real editor. */
export function plannedOrdinals(workout: LocalWorkout, id: string) {
  const count = workout.snapshot.appliedPlan.weightExercises.find(p => p.sessionExerciseId === id)!.setCount
  const completed = workout.snapshot.performedSets.filter(s => s.sessionExerciseId === id).map(s => s.ordinal)
  const ordinals = new Set(completed), excluded = new Set(workout.excludedSetOrdinals?.[id] ?? [])
  const visible = Math.min(count, completed.length + 20)
  for (let ordinal = 1; ordinals.size < visible; ordinal++) if (!excluded.has(ordinal)) ordinals.add(ordinal)
  return [...ordinals].sort((a, b) => a - b)
}
export function flowWeights(state: EditorState, history: Session[] = [], definitions: StandardExercise[] = []): WeightFocusData[] {
  const w = state.workout!
  return w.snapshot.appliedPlan.weightExercises.map(plan => {
    const id = plan.sessionExerciseId, initial = w.initialPlan.weightExercises.find(p => p.sessionExerciseId === id)
    const working = w.weights[id]
    const requests = w.snapshot.approvalRequests.filter(r => r.sessionExerciseId === id)
    const applied = requests.filter(r => w.approvalResults.some(a => a.id === r.id && a.status === 'APPLIED')).at(-1)
    const previous = previousRecords(history, w, id)
    const performed = w.snapshot.performedSets.filter(s => s.sessionExerciseId === id)
    return { id, standardId: w.snapshot.sessionExercises.find(e => e.id === id)?.standardExerciseId ?? '',
      plannedCount: plan.setCount,
      name: w.exerciseNames[id] ?? initial?.exerciseName ?? definitions.find(e => e.id === w.snapshot.sessionExercises.find(e => e.id === id)?.standardExerciseId)?.name ?? '추가된 운동', min: plan.minReps, max: plan.maxReps,
      manufacturerId: plan.manufacturerId, loadType: plan.loadType, working: working?.value ?? '',
      approved: applied?.nextApprovedWeightKg ?? initial?.approvedWeightKg ?? null,
      mode: working?.context.kind === 'INITIAL_APPROVED' ? 'approved' : working?.context.kind === 'APPROVAL_REQUEST' ? 'progression' : 'today',
      memo: state.memos?.[id] ?? w.equipmentMemos?.[id] ?? '',
      sets: plannedOrdinals(w, id).map(ordinal => {
        const value = state.drafts[slotKey(id, ordinal)] ?? inputDraft(w, id, ordinal, history)
        const result = performed.find(s => s.ordinal === ordinal)
        return { id: ordinal, draft: { kg: value.weight, reps: value.reps, additional: value.additionalWeight ?? '' },
          previous: previous.get(ordinal), ...(result ? { result: resultView(result) } : {}) }
      }) }
  })
}
export function flowCardio(state: EditorState, now: number): (CardioFocusData & { activeMs: number })[] {
  const w = state.workout!
  return w.snapshot.appliedPlan.cardioActivities.map(activity => {
    const id = activity.sessionActivityId, timer = { ...(w.timers[id] ?? emptyTimer()), ...state.cardioDrafts[id] }
    const result = w.snapshot.cardioResults.find(r => r.sessionActivityId === id)
    return { id, plan: activity.plan, phase: result ? result.status === 'SKIPPED' ? 'skipped' : 'completed'
      : timer.reviewing ? 'review' : timer.runningSince ? 'running' : timer.startedAt ? 'paused' : 'ready',
      draft: { distance: timer.distance, speed: timer.speed ?? '', bpm: timer.bpm, correctedSeconds: timer.correctedSeconds },
      // A committed START may be newer than this render's 250ms display tick.
      // Clamp display only; timer mutations still reject an actual clock reversal.
      result: result?.result ?? undefined, activeMs: result?.result?.activeMs ?? elapsed(timer, Math.max(now, timer.runningSince ? Date.parse(timer.runningSince) : now)) }
  })
}
export const isWeightDone = (weight: WeightFocusData) => weight.sets.filter(s => !!s.result).length >= (weight.plannedCount ?? weight.sets.length)
