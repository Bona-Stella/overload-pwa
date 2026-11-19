import type {LocalWorkout} from './types.ts'
import { exerciseRest, weightDone, weightStarted } from './model.ts'
export function weightWorking(w:LocalWorkout,now:number){
 const id = w.currentExerciseId, rest = exerciseRest(w)
 return w.warmupCompleted !== false && !w.finish && w.snapshot.appliedPlan.weightExercises.some(p => p.sessionExerciseId === id)
  && weightStarted(w, id) && !weightDone(w.snapshot, id) && (!rest || Date.parse(rest.endsAt) <= now)
}
function append(w:LocalWorkout,start:number,end:number){
 if(end<=start)return
 const timing=w.snapshot.weightTiming!
 const last=timing.intervals.at(-1)
 if(last&&Date.parse(last.endedAt)===start)last.endedAt=new Date(end).toISOString()
 else timing.intervals.push({startedAt:new Date(start).toISOString(),endedAt:new Date(end).toISOString()})
}
export function settleWeightClock(w:LocalWorkout,now:number){
 const c=w.weightClock;if(!c||!w.snapshot.weightTiming)return
 if(!Number.isSafeInteger(now)||now<Date.parse(c.observedAt))throw Error('웨이트 측정 시각이 이전 시각보다 이릅니다. 기기 시각을 확인해 주세요.')
 const runningSince = observedStart(w, now)
 if (runningSince !== null) append(w, runningSince, now)
 c.runningSince=null;c.observedAt=new Date(now).toISOString()
}
function observedStart(w: LocalWorkout, now: number) {
 const clock = w.weightClock
 if (!clock?.visible || !weightWorking(w, now)) return null
 if (clock.runningSince) return Date.parse(clock.runningSince)
 const rest = exerciseRest(w)
 return rest ? Math.max(Date.parse(clock.observedAt), Date.parse(rest.endsAt)) : null
}
export function observedWeightMs(w: LocalWorkout, now: number) {
 const runningSince = observedStart(w, now)
 return totalWeightMs(w.snapshot.weightTiming) + (runningSince === null ? 0 : Math.max(0, now - runningSince))
}
export function resumeWeightClock(w:LocalWorkout,now:number){
 const c=w.weightClock;if(!c)return
 c.runningSince=c.visible&&weightWorking(w,now)?new Date(now).toISOString():null
 c.observedAt=new Date(now).toISOString()
}
export function weightVisibility(w:LocalWorkout,visible:boolean,now:number){
 if(!w.weightClock&&w.snapshot.weightTiming&&w.serverRevision!=='0')w.snapshot.weightTiming.complete=false
 w.snapshot.weightTiming??={schemaVersion:1,complete:w.serverRevision==='0'&&!w.snapshot.performedSets.length&&!w.snapshot.cardioResults.length,intervals:[]}
 w.weightClock??={visible:false,runningSince:null,observedAt:new Date(now).toISOString()}
 w.weightClock.visible=visible
}
export function recoverWeightClock(w:LocalWorkout,now:number){
 const c=w.weightClock;if(!c)return
 if(now<Date.parse(c.observedAt))throw Error('기기 시각이 마지막 웨이트 측정 시각보다 이릅니다.')
 if(c.visible&&(c.runningSince||weightWorking(w,now))&&w.snapshot.weightTiming)w.snapshot.weightTiming.complete=false
 c.visible=false;c.runningSince=null;c.observedAt=new Date(now).toISOString()
}
const totalWeightMs = (timing: LocalWorkout['snapshot']['weightTiming']) => timing?.intervals.reduce((n,s)=>n+Date.parse(s.endedAt)-Date.parse(s.startedAt),0) ?? 0
export function measuredWeightMs(w:Pick<LocalWorkout,'snapshot'>){const t=w.snapshot.weightTiming;return t?.complete ? totalWeightMs(t) : null}
