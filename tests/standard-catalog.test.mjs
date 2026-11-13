import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeSearch, searchExercises } from '../src/features/workout-online/catalog.ts'
import { browseExercises, catalogRowGroup, primaryMuscles } from '../src/features/workout-online/catalog-browse.ts'
import { newWeights, updatedWeights } from '../src/features/workout-online/routine-weights.ts'
import { WorkoutApi } from '../src/features/workout-online/api.ts'
import { AuthApi } from '../src/features/auth/api.ts'
import * as v from '../src/features/workout-online/validation.ts'
import * as m from '../src/features/workout-local/model.ts'
import * as sync from '../src/features/workout-local/sync-state.ts'
import { localWorkout } from '../src/features/workout-local/validation.ts'
import { sameRecord, recoveryRows } from '../src/features/workout-online/closed-model.ts'
import { session, bootstrap, scope, EXERCISE, OTHER, PLACEMENT, SESSION_EXERCISE as E } from './fixtures/workout-online-data.mjs'

const A = '80000000-1111-4222-8333-000000000001', B = '80000000-1111-4222-8333-000000000002'
const catalog = [{id:EXERCISE,name:'벤치프레스',aliases:['Bench Press','공통 별칭']},{id:OTHER,name:'덤벨 벤치프레스',aliases:['공통 별칭']}]
const first = {manufacturerId:A,loadType:'PLATE'}, second = {manufacturerId:B,loadType:'STACK'}
const at = Date.parse(session().startedAt) + 60000
const local = () => {const s=session();Object.assign(s.initialPlan.weightExercises[0],first);Object.assign(s.snapshot.state.appliedPlan.weightExercises[0],first);return m.createLocalWorkout(s,bootstrap.settings)}
const complete=(w,n)=>{m.editDraft(w,E,n,{weight:w.weights[E].value,reps:'8'});m.completeSet(w,E,n,at+n)}

test('catalog normalizes case, NFKC, Unicode whitespace and searches names and aliases',()=>{
  assert.equal(normalizeSearch('　ＢＥＮＣＨ\u0085 \tＰｒｅｓｓ　'),'benchpress')
  assert.deepEqual(searchExercises(catalog,'ＢＥＮＣＨ　 press').map(x=>x.id),[EXERCISE])
  assert.equal(searchExercises(catalog,'벤치').length,2)
  assert.equal(searchExercises(catalog,'공통 별칭').length,2)
  assert.deepEqual(searchExercises([...catalog,catalog[0]],'공통 별칭').map(x=>x.id),[EXERCISE,OTHER])
  assert.equal(searchExercises(Array.from({length:30},(_,i)=>({id:String(i),name:'운동',aliases:[]})),'').length,20)
  assert.deepEqual(searchExercises([],''),[])
})
test('settings catalog browses all matches and combines aliases with any PRIMARY group by exercise ID', () => {
  const items = Array.from({ length: 25 }, (_, id) => ({
    id: String(id), name: '케이블 로우', aliases: ['Wide Row', '와이드 로우'], exerciseType: 'WEIGHT',
    muscles: [
      { id: 'back', groupCode: 'BACK', name: '광배근', role: 'PRIMARY' },
      { id: 'shoulder', groupCode: 'SHOULDERS', name: '후면 삼각근', role: 'PRIMARY' },
      { id: 'arm', groupCode: 'ARMS', name: '상완이두근', role: 'SECONDARY' },
    ],
  }))
  const cardio = { id: 'walk', name: '걷기', aliases: [], exerciseType: 'CARDIO', muscles: [] }
  const other = { id: 'stretch', name: '스트레칭', aliases: [], exerciseType: 'STRETCH', muscles: [] }
  const all = [...items, items[0], cardio, other]
  assert.equal(browseExercises(all, '', 'ALL').length, 27)
  assert.deepEqual(browseExercises(all, 'ＷＩＤＥ row', 'SHOULDERS'), items)
  assert.deepEqual(browseExercises(all, '와이드 로우', 'BACK'), items)
  assert.deepEqual(browseExercises(all, 'row', 'ARMS'), [])
  assert.deepEqual(browseExercises(all, 'row', 'CARDIO'), [])
  assert.deepEqual(browseExercises(all, '', 'CARDIO'), [cardio])
  assert.deepEqual(browseExercises(all, '', 'OTHER'), [other])
  assert.equal(catalogRowGroup(items[0], primaryMuscles(items[0])[0]), 'BACK')
})
test('catalog endpoints use the authenticated transport and keep their own unscoped schema1 envelope',async()=>{
  const calls=[],api=new WorkoutApi({workoutRequest:async(user,path,method,body)=>{
    calls.push({user,path,method,body});return {status:200,data:path.endsWith('search-data')?{schemaVersion:1,exercises:catalog}:{manufacturers:[]}}
  }}),signal=new AbortController().signal
  assert.deepEqual(await api.catalog(scope.userId,signal),catalog);assert.deepEqual(await api.manufacturers(scope.userId,signal),[])
  for(let i=0;i<20;i++)searchExercises(catalog,String(i))
  assert.equal(calls.length,2);assert.ok(calls.every(c=>c.user===scope.userId&&c.method==='GET'&&c.body===undefined))
  for(const data of [{schemaVersion:2,exercises:catalog},{schemaVersion:1,exercises:[{id:EXERCISE,name:'벤치',aliases:undefined}]}]){
    await assert.rejects(new WorkoutApi({workoutRequest:async()=>({status:200,data})}).catalog(scope.userId,signal),{code:'RESPONSE_INVALID'})
  }
})
test('auth transport accepts only exact catalog GETs and does not open a catalog write path',async()=>{
  const api=new AuthApi(async()=>new Response('{}',{headers:{'Content-Type':'application/json'}})),signal=new AbortController().signal
  for(const path of ['/api/v1/standard-exercises/search-data','/api/v1/manufacturers']){
    await api.workoutRequest(path,'GET',undefined,signal)
    await assert.rejects(api.workoutRequest(path,'POST',{},signal),{code:'INVALID_REQUEST'})
    await assert.rejects(api.workoutRequest(path+'?q=bench','GET',undefined,signal),{code:'INVALID_REQUEST'})
  }
})
test('routine NEW, EXISTING and RESTORE emit required nullable equipment and keep placement and weight',()=>{
  const w={id:PLACEMENT,standardExerciseId:EXERCISE,exerciseName:'벤치',manufacturerId:null,loadType:null,setCount:'3',minReps:'6',maxReps:'10',initialWeightKg:'60',approvedWeightKg:null,approve:false,nextWeightKg:''}
  assert.deepEqual(newWeights([w])[0],{id:PLACEMENT,standardExerciseId:EXERCISE,manufacturerId:null,loadType:null,setCount:3,minReps:6,maxReps:10,initialWeightKg:'60'})
  const original={...w,approvedWeightKg:'65'},changed={...original,...second}
  assert.deepEqual(updatedWeights([changed])[0],{mode:'EXISTING',id:PLACEMENT,...second,setCount:3,minReps:6,maxReps:10})
  assert.equal(updatedWeights([{...changed,restore:true}])[0].mode,'RESTORE')
  assert.equal(changed.initialWeightKg,'60');assert.equal(changed.approvedWeightKg,'65');assert.equal(changed.approve,false)
  assert.equal('standardExerciseId' in updatedWeights([changed])[0],false)
})
test('schema2 rejects legacy documents, missing nullable equipment, invalid load codes and absent standard UUIDs',()=>{
  assert.ok(v.session(session()))
  for(const mutate of [s=>{s.initialPlan.schemaVersion=1},s=>{s.snapshot.state.appliedPlan.schemaVersion=1},s=>{delete s.initialPlan.weightExercises[0].manufacturerId},s=>{delete s.snapshot.state.appliedPlan.weightExercises[0].loadType},s=>{s.initialPlan.weightExercises[0].loadType='FREE_WEIGHT'},s=>{delete s.snapshot.state.sessionExercises[0].standardExerciseId}]){
    const s=session();mutate(s);assert.equal(v.session(s),false)
  }
  const w=local();assert.ok(localWorkout(w));w.schemaVersion=1;assert.equal(localWorkout(w),false)
})
test('START equipment copies remain independent; mixed equipment completions keep weight approval and originals',()=>{
  let w=local();const initial=structuredClone(w.initialPlan),working=structuredClone(w.weights)
  w=m.applyLocalChange(w,x=>{complete(x,1);complete(x,2)})
  w=m.applyLocalChange(w,x=>m.changeEquipment(x,E,second))
  assert.deepEqual(w.weights,working);assert.deepEqual(w.initialPlan,initial);assert.deepEqual(w.snapshot.approvalRequests,[])
  w=m.applyLocalChange(w,x=>complete(x,3))
  assert.deepEqual(w.snapshot.performedSets.map(x=>[x.manufacturerId,x.loadType]),[[A,'PLATE'],[A,'PLATE'],[B,'STACK']])
  assert.ok(w.snapshot.performedSets.every(x=>x.weightContext.kind==='INITIAL_APPROVED'))
  assert.ok(localWorkout(w));assert.ok(localWorkout(structuredClone(w)))
  assert.throws(()=>m.applyLocalChange(w,x=>{x.snapshot.performedSets[0].manufacturerId=B}),/완료 당시/)
})
test('frozen snapshot and FINISH JSON retain equipment through later local equipment edits and restore',()=>{
  let w=m.applyLocalChange(local(),x=>complete(x,1));sync.sealSnapshot(w)
  const fixed=w.pendingSnapshot.requestJson
  w=m.applyLocalChange(w,x=>m.changeEquipment(x,E,second))
  assert.equal(w.pendingSnapshot.requestJson,fixed);assert.equal(JSON.parse(fixed).snapshot.performedSets[0].manufacturerId,A)
  const ack={...scope,sessionId:w.sessionId,writerEpoch:w.writerEpoch,acceptedLocalRevision:w.pendingSnapshot.request.localRevision,version:'1',snapshotSavedAt:new Date(at).toISOString(),lastWorkoutSyncedAt:new Date(at).toISOString(),duplicate:true,approvalResults:[]}
  sync.acceptSnapshot(w,ack);w=m.applyLocalChange(w,x=>complete(x,2));w=m.applyLocalChange(w,x=>sync.intendFinish(x,at+1000));sync.sealFinish(w)
  const finish=w.finish.requestJson,restored=structuredClone(w)
  assert.equal(restored.finish.requestJson,finish);assert.deepEqual(JSON.parse(finish).snapshot.performedSets.map(x=>x.manufacturerId),[A,B]);assert.ok(localWorkout(restored))
})
test('snapshot content changes with equipment at the same revision; recovery compares original equipment',()=>{
  const w=m.applyLocalChange(local(),x=>complete(x,1)),changed=structuredClone(w)
  changed.snapshot.appliedPlan.weightExercises[0].loadType='STACK'
  sync.sealSnapshot(w);sync.sealSnapshot(changed)
  assert.equal(w.localRevision,changed.localRevision);assert.notEqual(w.pendingSnapshot.requestJson,changed.pendingSnapshot.requestJson)
  const record=w.snapshot.performedSets[0];assert.equal(sameRecord(record,{...record,...second}),false)
  const server=session({status:'AUTO_CLOSED',closedAt:new Date(at+2000).toISOString()});server.snapshot.state.performedSets=[{...record,...second}]
  assert.equal(recoveryRows(w,server,{events:[]})[0].state,'VALUE_CONFLICT')
  const recovered={...record,weightContext:{kind:'UNVERIFIED',requestId:null}}
  assert.equal(sameRecord(record,recovered,record.weightContext),true)
  assert.equal(sameRecord(record,{...recovered,...second},record.weightContext),false)
})

test('completed facts and frozen pending requests reject nullable omissions or a rewritten equipment body',()=>{
  let w=m.applyLocalChange(local(),x=>complete(x,1));assert.ok(localWorkout(w))
  for(const key of ['manufacturerId','loadType']){const invalid=structuredClone(w);delete invalid.snapshot.performedSets[0][key];assert.equal(localWorkout(invalid),false)}
  sync.sealSnapshot(w);w.pendingSnapshot.request.snapshot.performedSets[0].manufacturerId=B
  assert.equal(localWorkout(w),false)
})

test('catalog search ignores spaces and resolves aliases to one standardized exercise', () => {
  const examples = [
    { id:'pull',name:'컨버전트 랫풀다운',aliases:['Convergent Lat Pulldown'] },
    { id:'shoulder',name:'머신 숄더 프레스',aliases:['숄더프레스','Machine Shoulder Press'] },
  ]
  for(const [query,expected] of [['랫 풀다운',['pull']],['랫풀다운',['pull']],['머신숄더프레스',['shoulder']],['machine shoulder press',['shoulder']]])
    assert.deepEqual(searchExercises(examples,query).map(e=>e.id),expected)
})
