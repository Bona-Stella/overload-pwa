import type {PerformedSet, Session} from './types.ts'
import {sessionAchievement} from '../home/achievement.ts'
import {sessionDisplayStatus} from '../statistics/display-achievement.ts'
import {measuredWeightMs} from '../workout-local/weight-timing.ts'

const scaled = (value:string) => {const [a,b='']=value.split('.');return BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'))}
const decimal = (value:bigint) => {const fraction=String(value%1000000n).padStart(6,'0').replace(/0+$/,'');return String(value/1000000n)+(fraction?'.'+fraction:'')}
export function setVolume(set:PerformedSet):string|null {
 const kg=set.loadType==='BODYWEIGHT'?set.bodyweightLoad?.additionalWeightKg:set.weightKg
 return kg==null?null:decimal(scaled(kg)*BigInt(set.reps))
}
export function recordSummary(session:Session) {
 const facts=session.snapshot.state, plan=session.initialPlan, achievement=sessionAchievement(session)
 const volumes=facts.performedSets.map(setVolume),known=volumes.filter((v):v is string=>v!==null)
 const cardio=facts.cardioResults.filter(c=>c.status==='COMPLETED')
 const distances=cardio.flatMap(c=>c.result.distanceKm===null?[]:[c.result.distanceKm])
 const elapsed=session.endedAt?Date.parse(session.endedAt)-Date.parse(session.startedAt):null
 const totalMs=elapsed!==null&&Number.isSafeInteger(elapsed)&&elapsed>=0?elapsed:null
 const hasWeight=plan.weightExercises.length>0,hasCardio=plan.cardioActivities.length>0
 const weightMs=hasWeight||facts.sessionExercises.some(e=>e.kind==='WEIGHT')?measuredWeightMs({snapshot:facts}):0
 const cardioMs=cardio.reduce((n,c)=>n+c.result.activeMs,0)
 const invalidTiming=totalMs!==null&&(cardioMs>totalMs||weightMs!==null&&weightMs+cardioMs>totalMs)
 const inactiveMs=totalMs===null||weightMs===null||invalidTiming?null:totalMs-weightMs-cardioMs
 return {sessionId:session.id,version:session.version,routineName:plan.routineName,startedAt:session.startedAt,endedAt:session.endedAt,
  hasWeight,hasCardio,achievement,status:sessionDisplayStatus(session),totalMs,weightMs,cardioMs,inactiveMs,
  timingIssue:invalidTiming?'수행 시간 합계가 전체 경과 시간을 초과해 확인이 필요합니다.':null,
  completedSets:facts.performedSets.length,plannedSets:plan.weightExercises.reduce((n,p)=>n+p.setCount,0),
  volumeKg:known.length||!volumes.length?decimal(known.reduce((n,v)=>n+scaled(v),0n)):null,unknownVolume:volumes.length-known.length,
  distanceKm:distances.length?decimal(distances.reduce((n,v)=>n+scaled(v),0n)):null,unknownDistance:cardio.length-distances.length}
}
export type RecordSummary=ReturnType<typeof recordSummary>
/** Formatting only. Persisted milliseconds and decimal measurements remain unchanged. */
export function recordDuration(ms:number|null,precision:'minute'|'second'='second') {
 if(ms===null||!Number.isFinite(ms)||ms<0)return '미확인'
 const seconds=Math.floor(ms/1000),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds/60)%60
 return precision==='minute'?String(hours).padStart(2,'0')+':'+String(minutes).padStart(2,'0')
  :hours?hours+':'+String(minutes).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')
  :Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')
}
export function recordKg(kg:string|null){if(kg===null)return '미확인';const [whole,fraction]=kg.split('.');return BigInt(whole).toLocaleString('ko-KR')+(fraction?'.'+fraction:'')+'kg'}
