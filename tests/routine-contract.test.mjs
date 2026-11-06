import assert from 'node:assert/strict'
import {test} from 'node:test'
import {adjust,cardioPlan,draftCardio,emptyCardio} from '../src/features/workout-online/cardio-draft.ts'
import {routineAssignments,saveSchedule} from '../src/features/workout-online/routine-schedule.ts'
import {routineMatches} from '../src/features/workout-online/routine-match.ts'
import {newestRoutines} from '../src/features/workout-online/routine-order.ts'
import {scope,routine,session,bootstrap} from './fixtures/workout-online-data.mjs'
import * as model from '../src/features/workout-local/model.ts'

test('initial weight step retains six decimal places and clamps at zero',()=>{assert.equal(adjust('99999999.123456',1),'100000001.623456');assert.equal(adjust('0.1',-1),'0');assert.throws(()=>adjust('-2',1));assert.throws(()=>adjust('NaN',1))})
test('shared cardio draft preserves the existing plan and exact seconds without catalog inference',()=>{const p={kind:'TREADMILL',name:'과거 러닝',targetSeconds:61,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null};assert.deepEqual(cardioPlan(draftCardio(p)),p);assert.equal(Object.hasOwn(cardioPlan(draftCardio(p)),'activityId'),false);const q=cardioPlan({...emptyCardio(),kind:'BIKE',name:'실내 자전거',activityId:'ca000000-0000-4000-8000-000000000007',minutes:'2.5',resistance:'1.5',incline:'9'});assert.equal(q.targetSeconds,150);assert.equal(q.inclinePercent,null);assert.equal(q.resistance,'1.5');assert.equal(typeof model.addCardio,'function')})
const base={...scope,version:'4',timeZone:'Asia/Seoul',appliedAt:'2026-11-06T00:00:00Z',assignments:[{dayOfWeek:1,routineId:'old'},{dayOfWeek:2,routineId:'other'},{dayOfWeek:3,routineId:'self'}]}
test('weekday replacement affects only selected days and removes only the edited routine assignments',()=>assert.deepEqual(routineAssignments(base.assignments,'self',[1,4]),[{dayOfWeek:1,routineId:'self'},{dayOfWeek:2,routineId:'other'},{dayOfWeek:4,routineId:'self'}]))
test('schedule version conflict never overwrites or silently rebases',async()=>{let writes=0;await assert.rejects(saveSchedule({read:async()=>({...base,version:'5'}),save:async()=>writes++},scope,base,[{dayOfWeek:7,routineId:'self'}],new AbortController().signal),/다른 화면/);assert.equal(writes,0)})
test('registering an all-rest schedule writes once instead of treating an unregistered empty calendar as saved',async()=>{
    const unregistered={...base,version:'0',appliedAt:null,assignments:[]};let writes=0;
    const saved={...unregistered,version:'1',appliedAt:'2026-11-06T00:00:00Z'};
    const api={read:async()=>unregistered,save:async(_scope,state,desired)=>{writes++;assert.equal(state.version,'0');assert.deepEqual(desired,[]);return saved}};
    assert.deepEqual(await saveSchedule(api,scope,unregistered,[],new AbortController().signal),saved);assert.equal(writes,1);
    api.read=async()=>saved;await saveSchedule(api,scope,saved,[],new AbortController().signal);assert.equal(writes,1);
})
test('lost schedule ACK is confirmed by exact assignments and one version and exact assignments without a second PUT',async()=>{let writes=0;const desired=[{dayOfWeek:1,routineId:'self'}];const api={read:async()=>({...base,version:'5',assignments:desired}),save:async()=>writes++};assert.equal((await saveSchedule(api,scope,base,desired,new AbortController().signal)).version,'5');assert.equal(writes,0);api.read=async()=>({...base,version:'6',assignments:desired});await assert.rejects(saveSchedule(api,scope,base,desired,new AbortController().signal))})
test('fixed creation confirmation rejects another composition with the same UUID',()=>{assert.equal(routineMatches(routine,{name:routine.name,weightPlacements:[],cardioPlacements:[]}),false)})

test('newest creation ordering preserves microseconds, whole-second timestamps and stable ties',()=>{const r=(id,createdAt)=>({id,createdAt,name:'routine',version:'9'});assert.deepEqual(newestRoutines([r('a','2026-11-06T00:00:00Z'),r('b','2026-11-06T00:00:00.000001Z'),r('c','2026-11-06T00:00:00.000001Z')]).map(r=>r.id),['c','b','a'])})
test('classified shared cardio input reuses session add/update interfaces without modifying the sealed plan or frozen request',()=>{const w=model.createLocalWorkout(session(),bootstrap.settings),initial=structuredClone(w.initialPlan);const fixed={request:{unchanged:true},requestJson:'fixed-byte-payload',localOnlyIds:[]};w.pendingSnapshot=structuredClone(fixed);const plan=cardioPlan({...emptyCardio(),kind:'BIKE',name:'실내 자전거',activityId:'ca000000-0000-4000-8000-000000000007',minutes:'2.5',resistance:'1.5'});const id='d0000000-0000-4000-8000-000000000001';model.addCardio(w,plan,()=>id);model.updateCardioPlan(w,id,{...plan,targetSeconds:180});assert.equal(w.snapshot.appliedPlan.cardioActivities[0].plan.activityId,plan.activityId);assert.equal(w.snapshot.appliedPlan.cardioActivities[0].plan.targetSeconds,180);assert.deepEqual(w.initialPlan,initial);assert.deepEqual(w.pendingSnapshot,fixed)})
