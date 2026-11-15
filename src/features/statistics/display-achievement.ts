import type { CardioPlan, Session } from '../workout-online/types.ts'
import { sessionAchievement } from '../home/achievement.ts'

const scale = (s: string) => { const [a,b=''] = s.split('.'); return BigInt(a) * 1000000n + BigInt(b.padEnd(6,'0')) }
export type PartialResult = 'met' | 'below' | 'unknown'
/** Existing completion and partial predicates, expressed as a shared card status. */
export function sessionDisplayStatus(session: Session) {
  const whole=sessionAchievement(session)
  if(whole.state==='complete')return {kind:'complete',mark:'✓',label:'전체 달성'}
  if(whole.state!=='unknown'){
    const partial=partialAchievement(session)
    if(partial==='met')return {kind:'partial',mark:'△',label:'부분 달성'}
    if(partial==='below')return {kind:'missed',mark:'×',label:'기준 미달'}
  }
  return {kind:'unknown',mark:'?',label:'달성 확인 불가'}
}
/** UI classification only; never sent as effectiveDay, completion or an approval result. */
export function partialAchievement(session: Session): PartialResult {
  const plan = session.initialPlan, facts = session.snapshot.state
  let plannedSets = 0, performed = 0, recognized = 0
  for (const exercise of plan.weightExercises) {
    const applied = facts.appliedPlan.weightExercises.find(e => e.sessionExerciseId === exercise.sessionExerciseId)
    if (!applied || applied.manufacturerId !== exercise.manufacturerId || applied.loadType !== exercise.loadType) return 'unknown'
    const count = new Set(facts.performedSets.filter(s => s.sessionExerciseId === exercise.sessionExerciseId).map(s => s.ordinal)).size
    plannedSets += exercise.setCount; performed += Math.min(count, exercise.setCount)
    if (count >= Math.min(2, exercise.setCount)) recognized++
  }
  for (const activity of plan.cardioActivities) {
    const record = facts.cardioResults.find(c => c.sessionActivityId === activity.sessionActivityId)
    if (!record || record.status !== 'COMPLETED') continue
    const goal: CardioPlan = activity.plan
    const hasTime = goal.targetSeconds > 0, hasDistance = goal.targetDistanceKm !== null
    if (!hasTime && !hasDistance) return 'unknown'
    if (hasDistance && record.result.distanceKm === null) return 'unknown'
    if ((!hasTime || record.result.activeMs * 2 >= goal.targetSeconds * 1000) && (!hasDistance || scale(record.result.distanceKm!) * 2n >= scale(goal.targetDistanceKm!))) recognized++
  }
  const total = plan.weightExercises.length + plan.cardioActivities.length
  if (!total) return 'unknown'
  return (!plannedSets || performed * 2 >= plannedSets) && recognized * 2 >= total ? 'met' : 'below'
}
