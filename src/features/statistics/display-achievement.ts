import { iconGlyphs } from '../../components/icons/glyphs.ts'
import type { CardioPlan, Session } from '../workout-online/types.ts'
import { cardioComplete, sessionAchievement } from '../home/achievement.ts'

const scale = (s: string) => { const [a,b=''] = s.split('.'); return BigInt(a) * 1000000n + BigInt(b.padEnd(6,'0')) }
export type PartialResult = 'met' | 'below' | 'unknown'
/** Existing completion and partial predicates, expressed as a shared card status. */
export function sessionDisplayStatus(session: Session) {
  const whole=sessionAchievement(session)
  if(whole.state==='complete')return {kind:'complete',mark:iconGlyphs.check,label:'전체 달성'}
  if(whole.state!=='unknown'){
    const partial=partialAchievement(session)
    if(partial==='met')return {kind:'partial',mark:iconGlyphs.partial,label:'부분 달성'}
    if(partial==='below')return {kind:'missed',mark:iconGlyphs.close,label:'기준 미달'}
  }
  return {kind:'unknown',mark:iconGlyphs.unknown,label:'달성 확인 불가'}
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

/** Explanations of the existing full/partial predicates; never weight-approval advice. */
export function achievementReasons(session:Session) {
 const status=sessionDisplayStatus(session),plan=session.initialPlan,facts=session.snapshot.state
 const result:Record<string,string[]>={}
 if(status.kind!=='partial'&&status.kind!=='missed')return result
 const counts=plan.weightExercises.map(p=>({plan:p,count:new Set(facts.performedSets.filter(s=>s.sessionExerciseId===p.sessionExerciseId).map(s=>s.ordinal)).size}))
 const plannedSets=counts.reduce((n,e)=>n+e.plan.setCount,0),performed=counts.reduce((n,e)=>n+Math.min(e.count,e.plan.setCount),0)
 const cardio=plan.cardioActivities.map(p=>{
  const actual=facts.cardioResults.find(c=>c.sessionActivityId===p.sessionActivityId&&c.status==='COMPLETED')
  const record=actual?.status==='COMPLETED'?actual:undefined,goal=p.plan
  const half=!!record&&(goal.targetSeconds<=0||record.result.activeMs*2>=goal.targetSeconds*1000)
   &&(goal.targetDistanceKm===null||record.result.distanceKm!==null&&scale(record.result.distanceKm)*2n>=scale(goal.targetDistanceKm))
  return {plan:p,record,half}
 })
 const recognized=counts.filter(e=>e.count>=Math.min(2,e.plan.setCount)).length+cardio.filter(c=>c.half).length
 const setsBelow=performed*2<plannedSets,exercisesBelow=recognized*2<counts.length+cardio.length
 for(const {plan:p,count} of counts)if(count<p.setCount&&(status.kind==='partial'||setsBelow||exercisesBelow&&count<Math.min(2,p.setCount)))result[p.sessionExerciseId]=[count?'계획 세트 미달':'계획 세트 미수행']
 for(const {plan:p,record,half} of cardio){
  if(status.kind==='missed'&&(!exercisesBelow||half))continue
  if(!record){result[p.sessionActivityId]=['계획 종목 미수행'];continue}
  if(cardioComplete(p.plan,record)===true)continue
  const multiplier=status.kind==='partial'?1:2,reasons:string[]=[]
  if(record.result.activeMs*multiplier<p.plan.targetSeconds*1000)reasons.push('시간 목표 미달')
  if(p.plan.targetDistanceKm!==null&&record.result.distanceKm!==null&&scale(record.result.distanceKm)*BigInt(multiplier)<scale(p.plan.targetDistanceKm))reasons.push('거리 목표 미달')
  const intensity=p.plan.intensity,speed=record.result.measurement?.actualSpeedKmh
  if(status.kind==='partial'&&intensity&&speed!=null&&(intensity.mode==='SPEED'?scale(speed)<scale(intensity.value):scale(speed)*scale(intensity.value)<60n*1000000n*1000000n))reasons.push('강도 목표 미달')
  if(reasons.length)result[p.sessionActivityId]=reasons
 }
 return result
}
