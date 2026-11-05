import type { CardioPlan, CardioResult, Session } from '../workout-online/types.ts'

type CompletedCardio = Extract<CardioResult, { status: 'COMPLETED' }>
export type Achievement = { planned: number; completed: number; unknown: number }
const scale = (value: string) => { const [a,b=''] = value.split('.'); return BigInt(a) * 1000000n + BigInt(b.padEnd(6,'0')) }

/** Projection of the existing PlanningCalculator.judge / weekly-schedule contract, not approval eligibility. */
function cardioComplete(goal: CardioPlan, actual: CompletedCardio | undefined): boolean | null {
  if (!actual || actual.result.activeMs < goal.targetSeconds * 1000) return false
  const distance = actual.result.distanceKm, speed = actual.result.measurement?.actualSpeedKmh
  if (goal.targetDistanceKm !== null && distance !== null && scale(distance) < scale(goal.targetDistanceKm)) return false
  let intensityUnknown = false
  if (goal.intensity) {
    if (speed == null) intensityUnknown = true
    else if (goal.intensity.mode === 'SPEED' ? scale(speed) < scale(goal.intensity.value) : scale(speed) * scale(goal.intensity.value) < 60n * 1000000n * 1000000n) return false
  }
  if (goal.targetDistanceKm !== null && distance === null || intensityUnknown || goal.inclinePercent !== null || goal.resistance !== null) return null
  return true
}
export function hasActualPerformance(session: Session) {
  return session.snapshot.state.performedSets.length > 0 || session.snapshot.state.cardioResults.some(c => c.status === 'COMPLETED' && (c.result.activeMs > 0 || c.result.distanceKm !== null && scale(c.result.distanceKm) > 0n))
}
export function sessionAchievement(session: Session): { weight: Achievement; cardio: Achievement; state: 'complete' | 'incomplete' | 'unknown' } {
  const initial = session.initialPlan, actual = session.snapshot.state
  const weight: Achievement = { planned: initial.weightExercises.length, completed: 0, unknown: 0 }
  const cardio: Achievement = { planned: initial.cardioActivities.length, completed: 0, unknown: 0 }
  for (const plan of initial.weightExercises) if (actual.performedSets.filter(s => s.sessionExerciseId === plan.sessionExerciseId).length >= plan.setCount) weight.completed++
  for (const plan of initial.cardioActivities) {
    const result = cardioComplete(plan.plan, actual.cardioResults.find((c): c is CompletedCardio => c.sessionActivityId === plan.sessionActivityId && c.status === 'COMPLETED'))
    if (result === null) cardio.unknown++; else if (result) cardio.completed++
  }
  const state = !weight.planned && !cardio.planned || cardio.unknown ? 'unknown' : weight.completed === weight.planned && cardio.completed === cardio.planned ? 'complete' : 'incomplete'
  return { weight, cardio, state }
}
