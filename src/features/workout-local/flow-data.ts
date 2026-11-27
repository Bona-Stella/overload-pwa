import type { CardioPlan, CardioResult, Session, PerformedSet, StandardExercise } from '../workout-online/types.ts'
import type { CardioFocusData, SetResult, WeightFocusData } from '../workout-flow/types.ts'
import type { EditorState } from './controller.ts'
import type { CardioTimer, LocalWorkout, SetDraft } from './types.ts'
import { slotKey } from './types.ts'
import { elapsed, emptyTimer } from './model.ts'
import { suggestedReps } from '../workout/reps.ts'
import { latestActualWeight, previousWeightSets } from '../workout-online/workout-history.ts'

export function workoutExerciseName(id: string, snapshot: LocalWorkout['snapshot'], initialPlan: LocalWorkout['initialPlan'],
  definitions: StandardExercise[], names?: LocalWorkout['exerciseNames']) {
  const standardId = snapshot.sessionExercises.find(e => e.id === id)?.standardExerciseId
  return names?.[id] ?? initialPlan.weightExercises.find(e => e.sessionExerciseId === id)?.exerciseName
    ?? definitions.find(e => e.id === standardId)?.name ?? '추가된 운동'
}

export function resultView(set: PerformedSet): SetResult {
  return { kg: set.weightKg, reps: set.reps, additionalKg: set.bodyweightLoad?.additionalWeightKg ?? null,
    manufacturerId: set.manufacturerId, loadType: set.loadType, at: Date.parse(set.completedAt),
    mode: set.weightContext.kind === 'INITIAL_APPROVED' ? 'approved' : set.weightContext.kind === 'APPROVAL_REQUEST' ? 'progression' : 'today' }
}
export function previousRecords(history: Session[], workout: LocalWorkout, id: string) {
  const current = workout.snapshot.appliedPlan.weightExercises.find(p => p.sessionExerciseId === id)!
  const standard = workout.snapshot.sessionExercises.find(e => e.id === id)?.standardExerciseId
  const placement = workout.initialPlan.weightExercises.find(plan => plan.sessionExerciseId === id)?.sourcePlacementId
  const duplicate = workout.snapshot.appliedPlan.weightExercises.some(plan => plan.sessionExerciseId !== id &&
    plan.manufacturerId === current.manufacturerId && plan.loadType === current.loadType &&
    workout.snapshot.sessionExercises.some(exercise => exercise.id === plan.sessionExerciseId && exercise.standardExerciseId === standard))
  const sets = standard ? previousWeightSets(history, standard, current, placement, duplicate) : []
  return new Map(sets.map(s => [s.ordinal, { kg: s.weightKg, reps: String(s.reps), additional: s.bodyweightLoad?.additionalWeightKg ?? '' }]))
}
function workingValue(workout: LocalWorkout, id: string, history: Session[] | null) {
  const working = workout.weights[id]
  const plan = workout.snapshot.appliedPlan.weightExercises.find(p => p.sessionExerciseId === id)!
  const standard = workout.snapshot.sessionExercises.find(e => e.id === id)?.standardExerciseId
  const previous = working?.initial && standard && history ? latestActualWeight(history, standard, plan) : undefined
  return { value: previous ?? working?.value ?? '', previous }
}
export function inputDraft(workout: LocalWorkout, id: string, ordinal: number, history: Session[] | null, pending?: Partial<SetDraft>): SetDraft {
  const plan = workout.snapshot.appliedPlan.weightExercises.find(p => p.sessionExerciseId === id)!
  const prior = history && previousRecords(history, workout, id).get(ordinal)
  return {
    weight: workingValue(workout, id, history).value || '0',
    reps: prior ? prior.reps : suggestedReps(plan.minReps, plan.maxReps),
    ...(plan.loadType === 'BODYWEIGHT' ? { additionalWeight: '0' } : {}),
    ...workout.drafts[slotKey(id, ordinal)],
    ...pending,
  }
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
export function flowWeights(state: EditorState, history: Session[] | null = [], definitions: StandardExercise[] = [], historyPending = history === null): WeightFocusData[] {
  const w = state.workout!
  return w.snapshot.appliedPlan.weightExercises.map(plan => {
    const id = plan.sessionExerciseId, initial = w.initialPlan.weightExercises.find(p => p.sessionExerciseId === id)
    const working = w.weights[id]
    const { value: workingKg, previous: previousKg } = workingValue(w, id, history)
    const requests = w.snapshot.approvalRequests.filter(r => r.sessionExerciseId === id)
    const applied = requests.filter(r => w.approvalResults.some(a => a.id === r.id && a.status === 'APPLIED')).at(-1)
    const previous = previousRecords(history ?? [], w, id)
    const performed = w.snapshot.performedSets.filter(s => s.sessionExerciseId === id)
    return { id, standardId: w.snapshot.sessionExercises.find(e => e.id === id)?.standardExerciseId ?? '',
      plannedCount: plan.setCount,
      name: workoutExerciseName(id, w.snapshot, w.initialPlan, definitions, w.exerciseNames), min: plan.minReps, max: plan.maxReps,
      manufacturerId: plan.manufacturerId, loadType: plan.loadType, working: workingKg, workingInitial: working?.initial || !workingKg,
      workingFromHistory: typeof previousKg === 'string', workingAmbiguous: previousKg === null,
      approved: applied?.nextApprovedWeightKg ?? initial?.approvedWeightKg ?? null,
      mode: working?.context.kind === 'INITIAL_APPROVED' ? 'approved' : working?.context.kind === 'APPROVAL_REQUEST' ? 'progression' : 'today',
      memo: state.memos?.[id] ?? w.equipmentMemos?.[id] ?? '',
      sets: plannedOrdinals(w, id).map(ordinal => {
        const key = slotKey(id, ordinal)
        const existing = { ...w.drafts[key], ...state.drafts[key] }
        const prior = previous.get(ordinal)
        const result = performed.find(s => s.ordinal === ordinal)
        return { id: ordinal, draft: { kg: existing.weight ?? (workingKg || '0'), reps: existing.reps ?? prior?.reps ?? suggestedReps(plan.minReps, plan.maxReps), additional: existing.additionalWeight || '0' },
          repsInitial: existing.reps === undefined, additionalInitial: !existing.additionalWeight,
          previous: prior, repsPending: historyPending && previous.size === 0 && existing.reps === undefined, ...(result ? { result: resultView(result) } : {}) }
      }) }
  })
}
export function flowCardio(state: EditorState, now: number): (CardioFocusData & { activeMs: number })[] {
  const w = state.workout!
  return w.snapshot.appliedPlan.cardioActivities.map(activity => {
    const id = activity.sessionActivityId, timer = { ...(w.timers[id] ?? emptyTimer()), ...state.cardioDrafts[id] }
    const result = w.snapshot.cardioResults.find(r => r.sessionActivityId === id)
    return { id, plan: activity.plan, phase: cardioPhase(result, timer),
      draft: { distance: timer.distance, speed: timer.speed ?? '', bpm: timer.bpm, bpmConfirmed: timer.bpmConfirmed, correctedSeconds: timer.correctedSeconds,
        distanceSource: timer.distanceSource, speedSource: timer.speedSource },
      // A committed START may be newer than this render's 250ms display tick.
      // Clamp display only; timer mutations still reject an actual clock reversal.
      result: result?.result ?? undefined, activeMs: result?.result?.activeMs ?? elapsed(timer, Math.max(now, timer.runningSince ? Date.parse(timer.runningSince) : now)) }
  })
}
export function previousCardioResult(history: Session[] | null, plan: CardioPlan) {
  if (!plan.standardExerciseId || !plan.activityId) return undefined
  for (const record of history ?? []) {
    if (record.status !== 'FINISHED' || record.deletedAt) continue
    const matching = record.snapshot.state.appliedPlan.cardioActivities.filter(activity =>
      activity.plan.standardExerciseId === plan.standardExerciseId && activity.plan.activityId === plan.activityId && activity.plan.kind === plan.kind)
    const results = record.snapshot.state.cardioResults.filter(result => result.status === 'COMPLETED' &&
      matching.some(activity => activity.sessionActivityId === result.sessionActivityId))
    if (results.length) return results.length === 1 ? results[0].result ?? undefined : undefined
  }
  return undefined
}
export function cardioPhase(result: CardioResult | undefined, timer: CardioTimer | undefined): CardioFocusData['phase'] {
  return result ? result.status === 'SKIPPED' ? 'skipped' : 'completed'
    : timer?.reviewing ? 'review' : timer?.runningSince ? 'running' : timer?.startedAt ? 'paused' : 'ready'
}
export const isWeightDone = (weight: WeightFocusData) => weight.sets.filter(s => !!s.result).length >= (weight.plannedCount ?? weight.sets.length)
