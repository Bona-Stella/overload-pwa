import assert from 'node:assert/strict'
import { test } from 'node:test'
import { session, scope, SESSION_EXERCISE } from './fixtures/workout-online-data.mjs'
import { sessionAchievement, hasActualPerformance } from '../src/features/home/achievement.ts'
import { loadRecent, RECENT_PAGE_LIMIT } from '../src/features/home/recent.ts'
import { routineTags, scheduleRoutineLabel } from '../src/features/home/tags.ts'

const goal = { kind:'TREADMILL',name:'러닝머신',targetSeconds:600,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null }
function value(weights=1,cardio=0) {
  const s=session({status:'FINISHED'})
  if(!weights)s.initialPlan.weightExercises=[]
  s.initialPlan.cardioActivities=Array.from({length:cardio},(_,i)=>({sessionActivityId:'c'+i,sourcePlacementId:'p'+i,plan:{...goal}}))
  return s
}
function sets(s,n,id=SESSION_EXERCISE){s.snapshot.state.performedSets=Array.from({length:n},(_,i)=>({id:'set'+i,sessionExerciseId:id,ordinal:i+1,reps:1,weightKg:'0'}));return s}
function cardio(s,ms,patch={}){s.snapshot.state.cardioResults=[{id:'r',sessionActivityId:'c0',status:'COMPLETED',result:{activeMs:ms,distanceKm:null,...patch}}];return s}
test('initial planned set counts determine completed weight exercises, not approval eligibility or reps',()=>{
  const s=sets(value(),2);assert.equal(sessionAchievement(s).weight.completed,0);assert.equal(sessionAchievement(s).state,'incomplete')
  sets(s,3);assert.equal(sessionAchievement(s).weight.completed,1);assert.equal(sessionAchievement(s).state,'complete')
  sets(s,5);assert.equal(sessionAchievement(s).weight.completed,1)
})
test('temporary plan shrink and stale first assessment do not rewrite the past denominator or current actuals',()=>{
  const s=sets(value(),2);s.snapshot.state.appliedPlan.weightExercises[0].setCount=1;s.completionAssessment={overallWeightPlanComplete:true}
  assert.equal(sessionAchievement(s).state,'incomplete');assert.equal(sessionAchievement(s).weight.planned,1)
  sets(s,3);assert.equal(sessionAchievement(s).state,'complete');sets(s,1);assert.equal(sessionAchievement(s).state,'incomplete')
})
test('added unplanned exercises retain performance but do not inflate planned achievement',()=>{
  const s=sets(value(),3,'extra');assert(hasActualPerformance(s));assert.equal(sessionAchievement(s).weight.completed,0)
})
test('weight-only, cardio-only and mixed completion stay separate',()=>{
  const w=sets(value(),3);assert.deepEqual(sessionAchievement(w).cardio,{planned:0,completed:0,unknown:0})
  const c=cardio(value(0,1),600000);assert.equal(sessionAchievement(c).state,'complete');assert.equal(sessionAchievement(c).weight.planned,0)
  const m=cardio(sets(value(1,1),3),599999);assert.equal(sessionAchievement(m).state,'incomplete');assert.equal(sessionAchievement(m).weight.completed,1);assert.equal(sessionAchievement(m).cardio.completed,0)
  cardio(m,600000);assert.equal(sessionAchievement(m).state,'complete')
})
test('cardio preserves existing time, distance, speed and pace criteria and unknown evidence',()=>{
  const s=cardio(value(0,1),600000);s.initialPlan.cardioActivities[0].plan.targetDistanceKm='1'
  assert.equal(sessionAchievement(s).state,'unknown');cardio(s,600000,{distanceKm:'0.999999'});assert.equal(sessionAchievement(s).state,'incomplete')
  cardio(s,600000,{distanceKm:'1'});s.initialPlan.cardioActivities[0].plan.intensity={mode:'PACE',value:'6'}
  assert.equal(sessionAchievement(s).state,'unknown');cardio(s,600000,{distanceKm:'1',measurement:{actualSpeedKmh:'10'}});assert.equal(sessionAchievement(s).state,'complete')
  cardio(s,600000,{distanceKm:'1',measurement:{actualSpeedKmh:'9.999999'}});assert.equal(sessionAchievement(s).state,'incomplete')
  s.initialPlan.cardioActivities[0].plan.intensity={mode:'SPEED',value:'8'};cardio(s,600000,{distanceKm:'1',measurement:{actualSpeedKmh:'8'}});assert.equal(sessionAchievement(s).state,'complete')
  s.initialPlan.cardioActivities[0].plan.inclinePercent='0';assert.equal(sessionAchievement(s).state,'unknown')
})
test('no plan is unknown, skipped and zero activity are empty, partial sets and positive cardio stay visible',()=>{
  const empty=value(0,0);assert.equal(sessionAchievement(empty).state,'unknown');assert.equal(hasActualPerformance(empty),false)
  const s=value(0,1);s.snapshot.state.cardioResults=[{status:'SKIPPED'}];assert.equal(hasActualPerformance(s),false)
  cardio(s,0,{distanceKm:'0'});assert.equal(hasActualPerformance(s),false);cardio(s,1);assert.equal(hasActualPerformance(s),true)
  cardio(s,0,{distanceKm:'0.1'});assert.equal(hasActualPerformance(s),true);assert.equal(hasActualPerformance(sets(value(),1)),true)
})
test('filtered recent list reads another page to fill three, retaining partial actuals and never deleting originals',async()=>{
  const calls=[], empty=value(), partial=sets(value(),1), full=sets(value(),3)
  const api={async closed(_s,cursor){calls.push(cursor);return cursor?{sessions:['partial','full2','full3'].map(id=>({id,deletedAt:null})),next:null}:{sessions:[{id:'deleted',deletedAt:'x'},{id:'empty',deletedAt:null}],next:{beforeClosedAt:'a',beforeId:'empty'}}},async detail(_s,id){return id==='empty'?empty:id==='partial'?partial:full}}
  const out=await loadRecent(api,scope,new AbortController().signal)
  assert.deepEqual(out.rows.map(r=>r.id),['partial','full2','full3']);assert.equal(calls.length,2);assert.equal(empty.snapshot.state.performedSets.length,0)
})
test('recent scan is bounded at 3 pages / 60 metadata entries and <=4 concurrent detail reads',async()=>{
  let pages=0,active=0,maximum=0,reads=0
  const api={async closed(){pages++;return {sessions:Array.from({length:20},(_,i)=>({id:pages+':'+i,deletedAt:null})),next:{beforeClosedAt:String(pages),beforeId:'x'}}},async detail(){reads++;maximum=Math.max(maximum,++active);await new Promise(r=>setTimeout(r,1));active--;return value()}}
  const out=await loadRecent(api,scope,new AbortController().signal);assert.equal(pages,RECENT_PAGE_LIMIT);assert.equal(reads,60);assert.equal(maximum,4);assert(out.limited);assert.equal(out.rows.length,0)
})
test('detail failures remain neutral candidates; account errors still stop the whole result',async()=>{
  const api={async closed(){return {sessions:[{id:'x',deletedAt:null}],next:null}},async detail(){throw Error('offline')}}
  const out=await loadRecent(api,scope,new AbortController().signal);assert.equal(out.rows.length,1);assert.equal(out.details.size,0);assert(out.failed)
  api.detail=async()=>{throw Object.assign(Error('boundary'),{code:'OWNER_MISMATCH'})};await assert.rejects(loadRecent(api,scope,new AbortController().signal),{code:'OWNER_MISMATCH'})
})
test('tag vocabulary is optional, never inferred from routine name',()=>{
  assert.deepEqual(routineTags,['PUSH','PULL','LEGS','FRONT','BACK','FULL','UPPER','LOWER','CARDIO','MIXED'])
  assert.equal(scheduleRoutineLabel('PUSH처럼 보이는 이름'),'PUSH처럼 보이는 이름');assert.equal(scheduleRoutineLabel('실제 긴 이름','FRONT'),'FRONT')
})
