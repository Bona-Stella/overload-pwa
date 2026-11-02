import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ExerciseSearch } from '/src/features/workout-online/ExerciseSearch.tsx'
import { EquipmentFields } from '/src/features/workout-online/EquipmentFields.tsx'
import { RoutineForm } from '/src/features/workout-online/RoutineForm.tsx'
import { WorkoutStore } from '/src/features/workout-online/storage.ts'
import * as model from '/src/features/workout-local/model.ts'
import { OfflineAccess } from '/src/features/workout-local/offline-access.ts'
import { scope, session, DEVICE, bootstrap, routine } from './workout-online-data.mjs'
import '/src/index.css'
import '/src/App.css'
import '/src/features/workout-online/online.css'

const check=(value,label)=>{if(!value)throw Error(label)},passed=[]
const raw=(name,version,upgrade)=>new Promise((resolve,reject)=>{const q=indexedDB.open(name,version);q.onupgradeneeded=()=>upgrade?.(q.result,q.transaction);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})
const transaction=(db,stores,action,mode='readwrite')=>new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);action(tx);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error)})
async function legacy(name) {
  const db=await raw(name,2,(db)=>{
    db.createObjectStore('meta');db.createObjectStore('startAttempts',{keyPath:['userId','dataGeneration']})
    db.createObjectStore('sessionCopies',{keyPath:['userId','dataGeneration','sessionId','editorDeviceId','writerEpoch']}).createIndex('scope',['userId','dataGeneration'])
    db.createObjectStore('localWorkouts',{keyPath:['userId','dataGeneration','sessionId','editorDeviceId','writerEpoch']})
  })
  await transaction(db,['meta','startAttempts','sessionCopies','localWorkouts'],tx=>{
    tx.objectStore('meta').put(DEVICE,'editorDeviceId');tx.objectStore('meta').put({nonce:DEVICE},'offlineResume')
    tx.objectStore('startAttempts').put({...scope,legacy:true})
    for(const name of ['sessionCopies','localWorkouts'])tx.objectStore(name).put({...scope,sessionId:DEVICE,editorDeviceId:DEVICE,writerEpoch:'0',schemaVersion:1})
  })
  return db
}
async function counts(db) {
  const output={};await transaction(db,[...db.objectStoreNames],tx=>{for(const name of db.objectStoreNames){const q=tx.objectStore(name).getAll();q.onsuccess=()=>output[name]=q.result}},'readonly');return output
}
async function databaseTests() {
  const other=await raw('another-app-sentinel',1,db=>db.createObjectStore('private'));await transaction(other,['private'],tx=>tx.objectStore('private').put('keep','sentinel'))
  localStorage.setItem('another-app-key','keep');const cache=await caches.open('another-app-cache');await cache.put('/sentinel',new Response('keep'))
  const name='overload.workout.v1',old=await legacy(name);old.close()
  const store=new WorkoutStore(indexedDB,()=>DEVICE,name);check(await store.offlineSource()===null,'legacy offline grant revoked');check(await store.attempt(scope)===null,'legacy pending cleared')
  check((await store.copies(scope)).length===0,'legacy copies cleared');const inspected=await raw(name,3);let data=await counts(inspected)
  check(Object.values(data).every(rows=>rows.length===0),'one atomic reset of four known stores');inspected.close()
  await store.deviceId();await store.saveSession(scope,session());const base=await store.openLocal(session(),bootstrap.settings,()=>true)
  const w=model.applyLocalChange(base,x=>{
    const id=x.currentExerciseId
    model.changeEquipment(x,id,{manufacturerId:'80000000-1111-4222-8333-000000000001',loadType:'PLATE'})
    model.editDraft(x,id,1,{weight:'60',reps:'8'});model.completeSet(x,id,1,Date.parse(x.startedAt)+1000)
    model.changeEquipment(x,id,{manufacturerId:'80000000-1111-4222-8333-000000000002',loadType:'STACK'})
    model.editDraft(x,id,2,{weight:'60',reps:'8'});model.completeSet(x,id,2,Date.parse(x.startedAt)+2000)
  })
  await store.saveLocal(w,base.editVersion,()=>true)
  check((await store.readLocal(w)).snapshot.performedSets.map(s=>s.loadType).join() === 'PLATE,STACK','completed equipment persisted independently')
  check(w.schemaVersion===2&&w.initialPlan.schemaVersion===2,'new START and schema2 storage')
  const access=new OfflineAccess(store);access.scope(scope);await access.grant(w,()=>true);check(!!await access.source(),'new schema2 offline permission')
  let oldRejected=false;try{await raw(name,2)}catch{oldRejected=true}check(oldRejected,'old DB2 client cannot reopen DB3')
  await store.close();const reopened=new WorkoutStore(indexedDB,()=>crypto.randomUUID(),name)
  check(await reopened.deviceId()===DEVICE,'DB3 device retained');check(JSON.stringify(await reopened.readLocal(w))===JSON.stringify(w),'DB3 original workout retained on reopen')
  check(!!await new OfflineAccess(reopened).source(),'DB3 offline permit retained');await reopened.close()
  check(localStorage.getItem('another-app-key')==='keep'&&(await(await cache.match('/sentinel')).text())==='keep','unrelated localStorage/cache retained')
  check((await counts(other)).private[0]==='keep','other app IndexedDB retained');other.close();passed.push('DB2→3 일회 원자 정리·DB3 재실행 보존·새 START/허용·다른 앱 저장소 보존')

  const abortedName='overload.test.catalog.abort',aborted=await legacy(abortedName);aborted.close()
  const clear=IDBObjectStore.prototype.clear;let clears=0
  IDBObjectStore.prototype.clear=function(){const r=clear.call(this);if(this.transaction.db.name===abortedName&&++clears===2)this.transaction.abort();return r}
  const failing=new WorkoutStore(indexedDB,()=>DEVICE,abortedName);let rejected=false
  try{await failing.deviceId()}catch{rejected=true}finally{IDBObjectStore.prototype.clear=clear}
  check(rejected,'upgrade abort surfaced');const unchanged=await raw(abortedName,2);data=await counts(unchanged);check(unchanged.version===2&&data.meta.length===2&&data.startAttempts.length===1&&data.localWorkouts.length===1&&data.sessionCopies.length===1,'upgrade abort rolls all stores back');unchanged.close()
  passed.push('전환 중 transaction.abort: DB2와 모든 원본 원자 보존')

  const blockedName='overload.test.catalog.blocked',holder=await legacy(blockedName);holder.onversionchange=()=>{}
  const blockedStore=new WorkoutStore(indexedDB,()=>DEVICE,blockedName);rejected=false
  try{await blockedStore.deviceId()}catch{rejected=true}check(rejected,'blocked fails closed');holder.close();await new Promise(r=>setTimeout(r,100))
  const kept=await raw(blockedName,2);check(kept.version===2&&(await counts(kept)).localWorkouts.length===1,'failed blocked opener cannot reset later');kept.close()
  passed.push('blocked 실패 뒤 연결 해제: 지연된 upgrade도 abort·원본 보존')

  const first=new WorkoutStore(indexedDB,()=>DEVICE,'overload.test.catalog.versionchange');await first.deviceId()
  const newer=await raw('overload.test.catalog.versionchange',4);check(newer.version===4,'versionchange closes active store connection')
  rejected=false;try{await first.deviceId()}catch{rejected=true}check(rejected,'older client cannot reopen or overwrite newer DB');newer.close()
  const fresh=new WorkoutStore(indexedDB,()=>DEVICE,'overload.test.catalog.fresh');await fresh.deviceId();await fresh.saveSession(scope,session());await fresh.close()
  const again=new WorkoutStore(indexedDB,()=>DEVICE,'overload.test.catalog.fresh');check((await again.copies(scope)).length===1,'fresh DB3 never resets');await again.close()
  passed.push('versionchange 연결 해제·구 앱 쓰기 차단·신규 DB3 데이터 보존')
  return passed
}
const exercises=[{id:'40000000-1111-4222-8333-000000000001',name:'벤치프레스',aliases:['Bench Press','공통 별칭']},{id:'40000000-1111-4222-8333-000000000002',name:'덤벨 벤치프레스',aliases:['공통 별칭']}]
export function SearchFixture(){const[selected,setSelected]=useState(''),[equipment,setEquipment]=useState({manufacturerId:null,loadType:null});return <main className="page stack"><ExerciseSearch exercises={exercises} onSelect={x=>setSelected(x.id)} /><output id="selected">{selected}</output><EquipmentFields value={equipment} manufacturers={[]} onChange={setEquipment}/><output id="equipment">{JSON.stringify(equipment)}</output><ExerciseSearch exercises={[]} onSelect={()=>{}} />
  <RoutineForm routine={routine} generation={scope.dataGeneration} exercises={exercises} manufacturers={[]} busy={false} controller={{saveRoutine:async(body)=>{window.savedRoutine=body;return false},removedRoutine:async()=>({...routine,weightPlacements:[{...routine.weightPlacements[0],id:crypto.randomUUID(),deletedAt:new Date().toISOString()}]})}} onClose={()=>{}} />
  </main>}
window.catalogResult={status:'RUNNING',passed}
try{await databaseTests();createRoot(document.querySelector('#root')).render(<SearchFixture/>);window.catalogResult.status='UI_READY'}catch(error){window.catalogResult={status:'FAIL',passed,error:error.stack}}
