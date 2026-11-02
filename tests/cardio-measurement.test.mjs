import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calculatedDistance, measuredCardio, distanceLabel } from '../src/features/workout-online/cardio-measurement.ts'
import * as m from '../src/features/workout-local/model.ts'
import * as sync from '../src/features/workout-local/sync-state.ts'
import { localWorkout } from '../src/features/workout-local/validation.ts'
import { sameRecord } from '../src/features/workout-online/closed-model.ts'
import { session, bootstrap } from './fixtures/workout-online-data.mjs'
const at=Date.parse('2026-10-31T14:55:00.000Z')
const plan={kind:'TREADMILL',name:'actual run',targetSeconds:1800,targetDistanceKm:null,intensity:{mode:'SPEED',value:'20'},inclinePercent:null,resistance:null}
const local=()=>m.applyLocalChange(m.createLocalWorkout(session(),bootstrap.settings),w=>m.addCardio(w,plan))
const complete=(speed='',distance='')=>{
  let w=local(),id=w.currentExerciseId
  w=m.applyLocalChange(w,x=>m.timerAction(x,id,'start',at))
  return m.applyLocalChange(w,x=>{x.timers[id].speed=speed;x.timers[id].distance=distance;m.completeCardio(x,id,at+1800000)})
}
test('actual speed uses active milliseconds and rounds exact distance to six decimals',()=>{
  assert.equal(calculatedDistance('8',1800000),'4');assert.equal(calculatedDistance('1',1200000),'0.333333')
  assert.equal(calculatedDistance('1.8',1),'0.000001');assert.equal(calculatedDistance('0',1800000),'0')
  assert.throws(()=>calculatedDistance('99999999999999.999999',86400000),/범위/)
})
test('manual and corrected distances override calculation and old unknown provenance is preserved',()=>{
  assert.deepEqual(measuredCardio('8','3.8',1800000),{distanceKm:'3.8',measurement:{actualSpeedKmh:'8',distanceSource:'MANUAL'}})
  assert.deepEqual(measuredCardio('10','3.8',3600000),{distanceKm:'3.8',measurement:{actualSpeedKmh:'10',distanceSource:'MANUAL'}})
  assert.deepEqual(measuredCardio('8','3.8',1800000,true),{distanceKm:'3.8',measurement:{actualSpeedKmh:'8',distanceSource:null}})
  assert.equal(measuredCardio('8','',3600000).distanceKm,'8')
})
test('missing actual speed or valid active time never guesses a distance from targets',()=>{
  assert.equal(calculatedDistance(null,1800000),null);assert.equal(calculatedDistance('8',0),null);assert.equal(calculatedDistance('8',NaN),null)
  const w=complete(),r=w.snapshot.cardioResults[0]
  assert.equal(r.result.distanceKm,null);assert.equal(r.result.measurement,undefined);assert.equal(w.snapshot.appliedPlan.cardioActivities[0].plan.intensity.value,'20')
})
test('pause intervals and midnight do not become active time or change the session origin',()=>{
  let w=local(),id=w.currentExerciseId,initial=structuredClone(w.initialPlan)
  for(const [action,delta] of [['start',0],['pause',600000],['start',1800000]])w=m.applyLocalChange(w,x=>m.timerAction(x,id,action,at+delta))
  w=m.applyLocalChange(w,x=>{x.timers[id].speed='8';m.completeCardio(x,id,at+3000000)})
  const r=w.snapshot.cardioResults[0];assert.equal(r.result.activeMs,1800000);assert.equal(r.result.distanceKm,'4');assert.equal(r.result.measurement.distanceSource,'CALCULATED')
  assert.equal(r.startedAt,new Date(at).toISOString());assert.equal(r.occurredAt,new Date(at+3000000).toISOString());assert.deepEqual(w.initialPlan,initial);assert.equal(w.startedAt,session().startedAt)
})
test('legacy and extended frozen snapshot bytes survive reload and subsequent input changes',()=>{
  for(const legacy of [true,false]){
    let w=complete('8')
    if(legacy){delete w.snapshot.cardioResults[0].result.measurement;for(const timer of Object.values(w.timers))delete timer.speed}
    w=m.applyLocalChange(w,sync.sealSnapshot);const frozen=w.pendingSnapshot.requestJson,copy=structuredClone(w)
    assert.ok(localWorkout(copy));assert.equal(copy.pendingSnapshot.requestJson,frozen);assert.equal(JSON.stringify(copy.pendingSnapshot.request),frozen)
    const next=m.applyLocalChange(copy,x=>{x.timers[x.currentExerciseId].speed='10'})
    assert.equal(next.pendingSnapshot.requestJson,frozen);assert.equal(next.pendingSnapshot.request.snapshot.cardioResults[0].result.distanceKm,'4')
    if(legacy)assert.doesNotMatch(frozen,/measurement|actualSpeed/);else assert.match(frozen,/"actualSpeedKmh":"8"/)
  }
})
test('extended finish is sealed once with original measurements and audit comparisons do not erase source conflicts',()=>{
  let w=complete('8');w=m.applyLocalChange(w,x=>sync.intendFinish(x,at+1800000));w=m.applyLocalChange(w,sync.sealFinish)
  const raw=w.finish.requestJson,copy=structuredClone(w);assert.ok(localWorkout(copy));sync.sealFinish(copy);assert.equal(copy.finish.requestJson,raw)
  const r=copy.snapshot.cardioResults[0],legacy=structuredClone(r);delete legacy.result.measurement
  assert.equal(sameRecord(r,legacy),false);assert.equal(sameRecord(r,structuredClone(r)),true)
  const changed=structuredClone(r);changed.result.measurement.actualSpeedKmh='10';assert.equal(sameRecord(r,changed),false)
})
test('manual calculated and unknown distances have distinct labels, including zero and absent values',()=>{
  assert.match(distanceLabel(measuredCardio('8','',1800000)),/계산 거리 4 km/)
  assert.match(distanceLabel(measuredCardio('8','3.8',1800000)),/직접 입력 거리 3.8 km/)
  assert.match(distanceLabel({distanceKm:'3.8'}),/출처 미확인/)
  assert.match(distanceLabel(measuredCardio('0','',1800000)),/계산 거리 0 km/)
  assert.equal(distanceLabel({distanceKm:null}),'거리 미입력')
})
