
import type { ActiveWorkoutProgress } from '../features/home/active-workout.ts'
import { cardioPhaseLabel } from '../features/workout-flow/types.ts'
import { doneCount, nextPending, restRemaining } from './workout-model.ts'
import type { ReviewSession } from './workout-model.ts'

export function reviewResumeProgress(session: ReviewSession): ActiveWorkoutProgress {
  const weight = session.weights.find(w => w.id === session.currentId)
  const cardio = session.cardio.find(c => c.id === session.currentId)
  const status = (now: number) => session.warmup ? '준비운동 중' : !nextPending(session) ? '운동 종료 대기'
    : cardio ? cardio.plan.name + ' · ' + cardioPhaseLabel[cardio.phase] : weight
      ? `${weight.name} · ${doneCount(weight)}/${weight.sets.length}세트${restRemaining(weight, now) ? ' · 휴식 중' : ''}` : '운동 중'
  return {
    startedAt: session.startedAt, status, completedSets: session.weights.reduce((total, item) => total + doneCount(item), 0),
    weights: session.weights.map(w => ({ id: w.id, exerciseName: w.name, weightKg: w.working || null, setCount: w.sets.length, minReps: w.min, maxReps: w.max })),
    cardio: session.cardio,
  }
}
