import assert from 'node:assert/strict'
import { test } from 'node:test'
import { recordPreviewData } from '../src/review/record-data.ts'
import { reviewSample, reviewHome, reviewToday } from '../src/review/routine-samples.ts'
import { overview, periodFor } from '../src/features/statistics/api.ts'
const seed=reviewSample('normal')
const data=recordPreviewData(seed.routines,seed.schedule,seed.sessions,reviewHome(seed).overview.plannedDays)
test('review aggregates satisfy the real overview contract and retain exact performed totals across periods',()=>{
 for(const [anchor,mode] of [[reviewToday,'week'],[reviewToday,'month'],['2026-10-01','month'],['2025-01-01','month']]){
  const range=periodFor(new Date(anchor+'T12:00:00'),mode,0),result=data.overview(range)
  assert.equal(overview(result),true,anchor+' '+mode)
  const records=data.sessions.filter(s=>s.workoutDate>=range.fromDate&&s.workoutDate<range.toDateExclusive)
  const facts=records.flatMap(s=>s.snapshot.state.performedSets)
  assert.equal(result.statistics.summary.completedSets,String(facts.length))
  assert.equal(result.statistics.summary.reps,String(facts.reduce((n,f)=>n+f.reps,0)))
  assert.equal(result.statistics.summary.volumeLoadKg,String(facts.reduce((n,f)=>n+Number(f.weightKg)*f.reps,0)))
  for(const kind of result.cardioByKind){
   const results=records.flatMap(s=>s.snapshot.state.cardioResults.filter(c=>c.status==='COMPLETED'&&s.initialPlan.cardioActivities.find(a=>a.sessionActivityId===c.sessionActivityId)?.plan.kind===kind.kind))
   assert.equal(kind.distanceKm,String(results.reduce((n,c)=>n+Number(c.result.distanceKm??0),0)))
   assert.equal(kind.activeMs,String(results.reduce((n,c)=>n+c.result.activeMs,0)))
  }
  assert.equal(result.unknownPlanDays,result.plannedDays.filter(d=>d.status==='UNKNOWN').length)
 }
})
test('review plan totals come from current assigned routines and independent classifications, not extra invented placements',()=>{
 for(const preset of seed.schedule.presets){
  const expected=preset.assignments.reduce((n,a)=>n+(seed.routines.find(r=>r.id===a.routineId)?.weightPlacements.filter(p=>!p.deletedAt).reduce((n,p)=>n+p.setCount,0)??0),0)
  const plan=data.plan(preset.id)
  assert.equal(plan.total,String(expected))
  for(const rows of [plan.frontBack,plan.ppl,plan.groups])assert.equal(rows.reduce((n,r)=>n+Number(r.planned),0),expected)
  assert.match(plan.issues.join(' '),/합성 가이드/)
 }
})
test('every review approval links to the matching session date, exercise and preserved approved context',()=>{
 assert.equal(data.source,'synthetic-preview')
 for(const point of data.growth){
  const record=data.sessions.find(s=>s.id===point.sessionId)
  assert.equal(record.workoutDate,point.date)
  assert.equal(record.initialPlan.weightExercises.find(e=>e.standardExerciseId===point.exerciseId).approvedWeightKg,point.kg)
 }
 for(const day of reviewHome(seed).overview.plannedDays)if(day.selectedSessionId)assert.ok(data.sessions.some(s=>s.id===day.selectedSessionId))
})
