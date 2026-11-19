import { cardioPhase, workoutExerciseName } from '../workout-local/flow-data.ts'
import { restRemaining, weightStarted } from '../workout-local/model.ts'
import type { LocalWorkout } from '../workout-local/types.ts'
import type { CardioPlan, Session, StandardExercise } from '../workout-online/types.ts'

export type PlanWeight = { id: string; exerciseName: string; weightKg: string | null; setCount: number; minReps: number; maxReps: number }
export type PlanCardio = { id: string; plan: CardioPlan }
export type ActiveWorkoutProgress = {
  startedAt: number
  completedSets: number
  confirmedFinished?: boolean
  weights: PlanWeight[]
  cardio: PlanCardio[]
  status: (now: number) => string
}
const cardioStatus = { ready: '준비 중', running: '진행 중', paused: '일시정지', review: '완료 확인', completed: '완료', skipped: '건너뜀' }

export function activeWorkoutProgress(session: Session, candidate: LocalWorkout | null, definitions: StandardExercise[]): ActiveWorkoutProgress {
  const local = candidate && candidate.userId === session.userId && candidate.dataGeneration === session.dataGeneration
    && candidate.sessionId === session.id && candidate.editorDeviceId === session.editorDeviceId && candidate.writerEpoch === session.writerEpoch
    && BigInt(candidate.localRevision) >= BigInt(session.localRevision) ? candidate : null
  const snapshot = local?.snapshot ?? session.snapshot.state
  const initial = session.initialPlan
  const weights = snapshot.appliedPlan.weightExercises.map(plan => {
    const id = plan.sessionExerciseId
    return { id, exerciseName: workoutExerciseName(id, snapshot, initial, definitions, local?.exerciseNames),
      weightKg: local?.weights[id]?.value || snapshot.performedSets.findLast(s => s.sessionExerciseId === id)?.weightKg
        || initial.weightExercises.find(e => e.sessionExerciseId === id)?.approvedWeightKg || null,
      setCount: plan.setCount, minReps: plan.minReps, maxReps: plan.maxReps }
  })
  const cardio = snapshot.appliedPlan.cardioActivities.map(c => ({ id: c.sessionActivityId, plan: c.plan }))
  const status = (now: number) => {
    if (!local) return '현재 종목 확인 필요'
    if (local.finish) return '운동 종료 확인 중'
    if (local.warmupCompleted === false) return '준비운동 중'
    const weight = weights.find(e => e.id === local.currentExerciseId)
    if (weight) {
      const completed = snapshot.performedSets.filter(s => s.sessionExerciseId === weight.id).length
      if (!weightStarted(local, weight.id)) return weight.exerciseName + ' · 시작 전'
      const suffix = completed >= weight.setCount ? ' · 완료' : restRemaining(local, now, weight.id) > 0 ? ' · 휴식 중' : ''
      return `${weight.exerciseName} · ${completed}/${weight.setCount}세트${suffix}`
    }
    const activity = cardio.find(e => e.id === local.currentExerciseId)
    if (!activity) return '현재 종목 확인 필요'
    const result = snapshot.cardioResults.find(r => r.sessionActivityId === activity.id)
    return activity.plan.name + ' · ' + cardioStatus[cardioPhase(result, local.timers[activity.id])]
  }
  return { startedAt: Date.parse(session.startedAt), completedSets: snapshot.performedSets.length,
    confirmedFinished: !!local?.finish?.ack, weights, cardio, status }
}
