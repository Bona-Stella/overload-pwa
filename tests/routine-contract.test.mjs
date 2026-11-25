import assert from 'node:assert/strict'
import {test} from 'node:test'
import {adjust,cardioPlan,draftCardio,emptyCardio,parseCardioPlan,selectCardio} from '../src/features/workout-online/cardio-draft.ts'
import { searchExercises } from '../src/features/workout-online/catalog.ts'
import { cardioCategory } from '../src/features/workout-online/catalog-label.ts'
import {routineMatches} from '../src/features/workout-online/routine-match.ts'
import {newestRoutines} from '../src/features/workout-online/routine-order.ts'
import {scope,routine,session,bootstrap} from './fixtures/workout-online-data.mjs'
import * as model from '../src/features/workout-local/model.ts'

test('initial weight step retains six decimal places and clamps at zero',()=>{assert.equal(adjust('99999999.123456',1),'100000001.623456');assert.equal(adjust('0.1',-1),'0');assert.throws(()=>adjust('-2',1));assert.throws(()=>adjust('NaN',1))})
test('shared cardio draft preserves the existing plan and exact seconds without catalog inference',()=>{const p={kind:'TREADMILL',name:'과거 러닝',targetSeconds:61,targetDistanceKm:null,intensity:null,inclinePercent:null,resistance:null};assert.deepEqual(cardioPlan(draftCardio(p)),p);assert.equal(Object.hasOwn(cardioPlan(draftCardio(p)),'activityId'),false);const q=cardioPlan({...emptyCardio(),kind:'BIKE',name:'실내 자전거',activityId:'ca000000-0000-4000-8000-000000000007',minutes:'2.5',resistance:'1.5',incline:'9'});assert.equal(q.targetSeconds,150);assert.equal(q.inclinePercent,null);assert.equal(q.resistance,'1.5');assert.equal(typeof model.addCardio,'function')})
test('fixed creation confirmation rejects another composition with the same UUID',()=>{assert.equal(routineMatches(routine,{name:routine.name,weightPlacements:[],cardioPlacements:[]}),false)})

test('newest creation ordering preserves microseconds, whole-second timestamps and stable ties',()=>{const r=(id,createdAt)=>({id,createdAt,name:'routine',version:'9'});assert.deepEqual(newestRoutines([r('a','2026-11-06T00:00:00Z'),r('b','2026-11-06T00:00:00.000001Z'),r('c','2026-11-06T00:00:00.000001Z')]).map(r=>r.id),['c','b','a'])})
test('classified shared cardio input reuses session add/update interfaces without modifying the sealed plan or frozen request',()=>{const w=model.createLocalWorkout(session(),bootstrap.settings),initial=structuredClone(w.initialPlan);const fixed={request:{unchanged:true},requestJson:'fixed-byte-payload',localOnlyIds:[]};w.pendingSnapshot=structuredClone(fixed);const plan=cardioPlan({...emptyCardio(),kind:'BIKE',name:'실내 자전거',activityId:'ca000000-0000-4000-8000-000000000007',minutes:'2.5',resistance:'1.5'});const id='d0000000-0000-4000-8000-000000000001';model.addCardio(w,plan,()=>id);model.updateCardioPlan(w,id,{...plan,targetSeconds:180});assert.equal(w.snapshot.appliedPlan.cardioActivities[0].plan.activityId,plan.activityId);assert.equal(w.snapshot.appliedPlan.cardioActivities[0].plan.targetSeconds,180);assert.deepEqual(w.initialPlan,initial);assert.deepEqual(w.pendingSnapshot,fixed)})
test('standard cardio filtering uses catalog metadata and composes with shared alias search', () => {
  const activities = [
    { id: 'runner', name: '야외 달리기', aliases: ['러닝'], kind: 'OUTDOOR', category: 'RUNNING' },
    { id: 'walker', name: '실내 걷기', aliases: ['러닝머신 걷기'], kind: 'TREADMILL', category: 'WALKING' },
    { id: 'stairs', name: '천국의 계단', aliases: [], kind: 'STAIRS', category: 'WALKING' },
  ]
  assert.deepEqual(searchExercises(activities, '러 닝').map(a => a.id), ['runner', 'walker'])
  assert.deepEqual(searchExercises(activities.filter(a => cardioCategory(a) === 'RUNNING'), '러닝').map(a => a.id), ['runner'])
  assert.deepEqual(activities.filter(a => cardioCategory(a) === 'OTHER').map(a => a.id), ['stairs'])
})

test('optional goals stay blank in drafts and the current write contract rejects missing time', () => {
  const treadmill = { id: 'runner', activityId: 'activity', kind: 'TREADMILL', name: '트레드밀 달리기' }
  const empty = selectCardio(emptyCardio(), treadmill)
  assert.equal(empty.seconds, '')
  assert.equal(parseCardioPlan(empty).targetSeconds, null)
  assert.equal(parseCardioPlan(empty).targetDistanceKm, null)
  assert.equal(parseCardioPlan({ ...empty, distance: '5' }).targetDistanceKm, '5')
  assert.equal(parseCardioPlan({ ...empty, intensity: '8' }).targetDistanceKm, null)
  assert.throws(() => cardioPlan(empty), /유산소 목표 시간을 입력해 주세요/)
  assert.throws(() => parseCardioPlan({ ...empty, minutes: '0' }))
  assert.throws(() => parseCardioPlan({ ...empty, minutes: '-3' }))
  assert.throws(() => parseCardioPlan({ ...empty, distance: 'NaN' }))
  assert.equal(cardioPlan({ ...empty, minutes: '1.016667' }).targetSeconds, 61)
  assert.equal(cardioPlan({ ...empty, minutes: '40' }).targetDistanceKm, null)
  assert.equal(parseCardioPlan({ ...draftCardio(cardioPlan({ ...empty, minutes: '1' })), minutes: '' }).targetSeconds, null)
  const bike = selectCardio({ ...empty, minutes: '40', distance: '5', incline: '4', intensityMode: 'PACE', intensity: '6' },
    { id: 'bike', activityId: 'bike-activity', kind: 'BIKE', name: '실내 사이클' })
  assert.equal(bike.minutes, '40')
  assert.equal(bike.distance, '5')
  assert.equal(bike.incline, '')
  assert.equal(bike.intensity, '6')
  assert.equal(bike.intensityMode, 'PACE')
})

test('ACTIVE replacement gets a new registered ID in place and protects measured or original plans', () => {
  const workout = model.createLocalWorkout(session(), bootstrap.settings)
  const original = structuredClone(workout.initialPlan)
  const run = { ...cardioPlan({ ...emptyCardio(), name: '달리기', kind: 'OUTDOOR', minutes: '40' }),
    standardExerciseId: crypto.randomUUID(), activityId: crypto.randomUUID() }
  const bike = { ...run, name: '사이클', kind: 'BIKE', standardExerciseId: crypto.randomUUID(), activityId: crypto.randomUUID() }
  model.addCardio(workout, run)
  const first = workout.currentExerciseId
  model.addCardio(workout, run)
  const second = workout.currentExerciseId
  model.replaceCardio(workout, first, bike)
  const next = workout.currentExerciseId
  assert.notEqual(next, first)
  assert.deepEqual(workout.snapshot.appliedPlan.cardioActivities.map(row => row.sessionActivityId), [next, second])
  assert.equal(workout.snapshot.sessionExercises.find(row => row.id === next).standardExerciseId, bike.standardExerciseId)
  assert.equal(workout.snapshot.sessionExercises.find(row => row.id === first).standardExerciseId, run.standardExerciseId)
  assert.deepEqual(workout.initialPlan, original)
  const at = Date.parse(workout.startedAt) + 1000
  model.timerAction(workout, next, 'start', at)
  model.timerAction(workout, next, 'pause', at + 500)
  assert.throws(() => model.replaceCardio(workout, next, run), /측정 시작 전/)
  assert.throws(() => model.updateCardioPlan(workout, next, run), /종목 교체/)
  assert.equal(workout.timers[next].accumulatedMs, 500)
})
