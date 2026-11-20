import { suggestedApproval } from '../features/workout-online/approval-weight.ts'
import type { WorkoutApi } from '../features/workout-online/api.ts'
import type { SavedReview } from '../features/workout-online/saved-weight-review.ts'
import type { Session } from '../features/workout-online/types.ts'
import { newId } from '../id.ts'

// A single synthetic FINISH recommendation, using the production response shape.
export function processWeightReview(session: Session, withRecommendation: boolean): Pick<WorkoutApi, 'weightReview' | 'approveReview'> {
  const plan = session.initialPlan.weightExercises[0]
  const sets = session.snapshot.state.performedSets.filter(set => set.sessionExerciseId === plan?.sessionExerciseId)
  const reference = plan?.approvedWeightKg
  const assessedAt = session.closedAt!
  const candidate = withRecommendation && reference != null && sets.length === plan.setCount && sets.every(set => set.reps >= plan.maxReps)
    ? { sessionExerciseId: plan.sessionExerciseId, sourcePlacementId: plan.sourcePlacementId, standardExerciseId: plan.standardExerciseId,
      name: plan.exerciseName, loadType: plan.loadType, recommendedWeightKg: suggestedApproval(reference, 'increase', plan.loadType),
      guidance: { sessionExerciseId: plan.sessionExerciseId, advice: 'INCREASE' as const, reasonCodes: [], referenceWeightKg: reference,
        plannedSetCount: plan.setCount, completedSetCount: sets.length, minReps: plan.minReps, maxReps: plan.maxReps, incomplete: false,
        sets: sets.map(set => ({ performedSetId: set.id, ordinal: set.ordinal, reps: set.reps, contributes: true })) } }
    : null
  let view: SavedReview = { userId: session.userId, dataGeneration: session.dataGeneration, sessionId: session.id, version: session.version,
    routineVersion: '1', frozen: candidate ? { schemaVersion: 1, sessionVersion: session.version, assessedAt, exercises: [candidate] } : null,
    current: candidate ? [{ sessionExerciseId: candidate.sessionExerciseId, available: true, approvedWeightKg: candidate.guidance.referenceWeightKg }] : [],
    approvals: [] }

  return {
    weightReview: async () => view,
    approveReview: async (_scope, _id, request) => {
      if (!candidate || view.approvals.length || request.approvals.length !== 1 || request.approvals[0].sessionExerciseId !== candidate.sessionExerciseId) {
        throw new Error('검토용 승인 대상을 확인해 주세요.')
      }
      const { id, sessionExerciseId, previousWeightKg, nextWeightKg } = request.approvals[0]
      view = { ...view, current: [{ sessionExerciseId, available: true, approvedWeightKg: nextWeightKg }],
        approvals: [{ id, eventId: newId(), sessionExerciseId, sourcePlacementId: candidate.sourcePlacementId, previousWeightKg, nextWeightKg,
          occurredAt: assessedAt, recordedAt: assessedAt, source: 'WORKOUT_REVIEW' }] }
      return view
    },
  }
}
