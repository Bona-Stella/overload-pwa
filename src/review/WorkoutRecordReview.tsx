
import { WorkoutSummary } from '../features/workout-flow/WorkoutSummary.tsx'
import { manufacturers, reviewToday } from './routine-samples.ts'
import { makeCardio, sessionAdvice, setVolume, weightDone } from './workout-model.ts'
import type { ReviewRecord } from './workout-model.ts'

export function WorkoutRecordReview({ record, onBack }: { record: ReviewRecord; onBack: () => void }) {
  const { session, endedAt } = record
  const { initialPlan, weights, cardio } = session
  const removed = initialPlan.weightExercises.filter(p => !weights.some(w => w.id === p.sessionExerciseId))
  const goal = (p: typeof initialPlan.weightExercises[number]) => `목표 ${p.minReps}–${p.maxReps}회 × ${p.setCount}세트`
  const summaryWeights = weights.map(w => {
    const planned = initialPlan.weightExercises.find(p => p.sessionExerciseId === w.id)
    return {
      id: w.id, name: w.name, planned: planned?.setCount, goal: planned && goal(planned),
      results: w.sets.flatMap(s => s.result ? [{ id: s.id, result: s.result, volume: setVolume(s.result) }] : []),
      advice: sessionAdvice(session, w, true),
    }
  })
  const whole = initialPlan.weightExercises.every(p => {
    const current = weights.find(w => w.id === p.sessionExerciseId)
    return current && current.sets.filter(s => s.result).length >= p.setCount
  }) && initialPlan.cardioActivities.every(p => cardio.some(c => c.id === p.sessionActivityId && c.phase === 'completed'))
    && weights.every(weightDone) && cardio.every(c => c.phase === 'completed')
  const plannedSets = initialPlan.weightExercises.reduce((sum, p) => sum + p.setCount, 0)
  return <WorkoutSummary routine={initialPlan.routineName} date={reviewToday} elapsed={endedAt - session.startedAt} deload={session.deload}
    manufacturers={manufacturers} plannedSets={plannedSets} whole={whole} onBack={onBack}
    weights={[...summaryWeights, ...removed.map(p => ({ id: p.sessionExerciseId, name: p.exerciseName, planned: p.setCount, goal: goal(p),
      results: [], advice: { text: '이번 운동에서 제외한 종목' } }))]}
    cardio={[
      ...cardio.map(item => ({ ...item, added: !initialPlan.cardioActivities.some(p => p.sessionActivityId === item.id) })),
      ...initialPlan.cardioActivities.filter(p => !cardio.some(c => c.id === p.sessionActivityId)).map(p => ({ ...makeCardio(p.plan, p.sessionActivityId), added: false })),
    ]} />
}
