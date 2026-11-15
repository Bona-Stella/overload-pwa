import type {LocalWorkout} from './types.ts'
export function weightWorking(w:LocalWorkout,now:number){
 const plan=w.snapshot.appliedPlan.weightExercises.find(p=>p.sessionExerciseId===w.currentExerciseId)
 return !!plan&&w.warmupCompleted!==false&&!w.finish&&w.snapshot.performedSets.filter(s=>s.sessionExerciseId===plan.sessionExerciseId).length<plan.setCount&&(!w.rest||Date.parse(w.rest.endsAt)<=now)
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
 if(c.visible){
  if(c.runningSince)append(w,Date.parse(c.runningSince),now)
  else if(w.rest&&Date.parse(w.rest.endsAt)<=now&&weightWorking(w,now))append(w,Math.max(Date.parse(c.observedAt),Date.parse(w.rest.endsAt)),now)
 }
 c.runningSince=null;c.observedAt=new Date(now).toISOString()
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
export function measuredWeightMs(w:Pick<LocalWorkout,'snapshot'>){const t=w.snapshot.weightTiming;return t?.complete?t.intervals.reduce((n,s)=>n+Date.parse(s.endedAt)-Date.parse(s.startedAt),0):null}
