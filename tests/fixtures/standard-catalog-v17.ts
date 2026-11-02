import { AuthApi } from '/src/features/auth/api.ts'
import { AuthController } from '/src/features/auth/controller.ts'
import { WorkoutApi } from '/src/features/workout-online/api.ts'
import { startBody } from '/src/features/workout-online/controller.ts'
import { WorkoutStore } from '/src/features/workout-online/storage.ts'
import * as m from '/src/features/workout-local/model.ts'
import * as sync from '/src/features/workout-local/sync-state.ts'
import { newWeights, updatedWeights } from '/src/features/workout-online/routine-weights.ts'

const passed=[],check=(v,label)=>{if(!v)throw Error(label)},signal=new AbortController().signal
const auth=new AuthController(new AuthApi()),api=new WorkoutApi(auth),store=new WorkoutStore()
const expect=async(fn,code)=>{try{await fn()}catch(error){check(error.code===code,code+': '+error.code);return}throw Error('Expected '+code)}
window.catalogV17Result={status:'RUNNING',passed}
try {
  await auth.start();await auth.requestOtp('catalog-v17-'+crypto.randomUUID()+'@example.test');await auth.verifyOtp((await(await fetch('/__fixture/otp')).json()).code)
  check(auth.getSnapshot().status==='authenticated','real OTP login')
  const data=await api.bootstrap(auth.getSnapshot().userId,signal),scope=data.scope
  check(data.exercises.length>=2&&data.manufacturers.length>=2,'isolated catalog fixture')
  const a={manufacturerId:data.manufacturers.find(m=>m.name==='파나타').id,loadType:'PLATE'},b={manufacturerId:data.manufacturers.find(m=>m.name==='해머스트렝스').id,loadType:'STACK'}
  const drafts=data.exercises.slice(0,2).map((e,i)=>({id:crypto.randomUUID(),standardExerciseId:e.id,exerciseName:e.name,...a,setCount:i?'1':'2',minReps:'6',maxReps:'10',initialWeightKg:'60',approvedWeightKg:null,approve:false,nextWeightKg:''}))
  let routine=await api.createRoutine(scope,{id:crypto.randomUUID(),dataGeneration:scope.dataGeneration,name:'V17 장비 실제 연동',weightPlacements:newWeights(drafts),cardioPlacements:[]},signal)
  const original=routine.weightPlacements[0]
  const update=weights=>api.updateRoutine(scope,routine.id,{dataGeneration:scope.dataGeneration,expectedVersion:routine.version,name:routine.name,weightPlacements:weights,cardioPlacements:[],weightApprovals:[]},signal)
  const existing=p=>({mode:'EXISTING',id:p.id,manufacturerId:p.manufacturerId,loadType:p.loadType,setCount:p.setCount,minReps:p.minReps,maxReps:p.maxReps})
  routine=await update([existing(routine.weightPlacements[1])])
  const removed=await api.removedPlacements(scope,routine.id,signal);check(removed.weightPlacements[0].id===original.id,'removed placement UUID')
  routine=await update([{...existing(removed.weightPlacements[0]),mode:'RESTORE'},existing(routine.weightPlacements[0])])
  check(routine.weightPlacements[0].id===original.id&&routine.weightPlacements[0].approvedWeightKg==='60','RESTORE preserves approved weight')
  passed.push('실제 V17 루틴 NEW·제거·RESTORE: 표준 UUID·배치·장비·승인 중량 보존')
  const device=await store.deviceId(),body=startBody(scope,routine.id,device,crypto.randomUUID(),new Date(),Intl.DateTimeFormat().resolvedOptions().timeZone)
  await store.prepareStart(scope,body);const server=await api.start(scope,body,signal);await store.saveSession(scope,server,body.id)
  let w=await store.openLocal(server,data.settings,()=>true)
  const initial=JSON.stringify(server.initialPlan),E=server.initialPlan.weightExercises[0].sessionExerciseId,F=server.initialPlan.weightExercises[1].sessionExerciseId
  check(server.initialPlan.schemaVersion===2&&server.snapshot.state.appliedPlan.schemaVersion===2&&w.snapshot.appliedPlan.weightExercises[0].manufacturerId===a.manufacturerId,'START copies equipment without extra input')
  const routineDrafts=routine.weightPlacements.map(p=>({...p,setCount:String(p.setCount),minReps:String(p.minReps),maxReps:String(p.maxReps),approve:false,nextWeightKg:p.approvedWeightKg,...b}))
  routine=await update(updatedWeights(routineDrafts))
  check(routine.weightPlacements[0].id===original.id&&routine.weightPlacements[0].initialWeightKg==='60'&&routine.weightPlacements[0].approvedWeightKg==='60','equipment edit preserves weights')
  const version=routine.version;routine=await update(routine.weightPlacements.map(existing));check(routine.version===version,'equipment no-op version')
  passed.push('START 장비 자동 복사·루틴 장비 변경/no-op: 동일 배치·최초/승인 중량·시작 계획 보존')
  const change=async(fn,syncOnly=false)=>{const next=m.applyLocalChange(w,fn);await (syncOnly?store.saveSyncLocal(next,w.editVersion,()=>true):store.saveLocal(next,w.editVersion,()=>true));w=next}
  const complete=(x,id,n)=>{m.editDraft(x,id,n,{weight:'60.000000',reps:'8'});m.completeSet(x,id,n,Date.now())}
  await change(x=>{complete(x,E,1);complete(x,E,2);m.changeEquipment(x,E,b);complete(x,E,3);complete(x,F,1)})
  check((await store.readLocal(w)).snapshot.performedSets.filter(s=>s.sessionExerciseId===E).map(s=>s.manufacturerId).join()===`${a.manufacturerId},${a.manufacturerId},${b.manufacturerId}`,'IDB completion equipment originals')
  await change(sync.sealSnapshot,true);const fixed=w.pendingSnapshot.requestJson,request=JSON.parse(fixed)
  const ack=await api.snapshot(scope,server.id,request,signal),duplicate=await api.snapshot(scope,server.id,JSON.parse(fixed),signal)
  check(duplicate.duplicate,'exact duplicate snapshot')
  const conflict=structuredClone(request);conflict.snapshot.appliedPlan.weightExercises[0].manufacturerId=a.manufacturerId
  await expect(()=>api.snapshot(scope,server.id,conflict,signal),'REVISION_PAYLOAD_MISMATCH')
  const immutable=structuredClone(request);immutable.localRevision=String(BigInt(request.localRevision)+1n);immutable.snapshot.performedSets[0].manufacturerId=b.manufacturerId
  await expect(()=>api.snapshot(scope,server.id,immutable,signal),'IMMUTABLE_RECORD_CONTEXT')
  await change(x=>sync.acceptSnapshot(x,ack),true)
  check(w.pendingSnapshot===null&&w.snapshot.performedSets[0].manufacturerId===a.manufacturerId,'ACK preserves equipment')
  passed.push('혼합 완료 장비 IDB/서버 보존·고정 본문 duplicate·동일 revision 장비 충돌409·과거 장비 변조422')
  const recoverySource=m.applyLocalChange(w,x=>complete(x,E,4)),missing=recoverySource.snapshot.performedSets.find(s=>s.ordinal===4)
  await change(x=>sync.intendFinish(x,Date.now()));await change(sync.sealFinish,true)
  const finishJson=w.finish.requestJson,finish=await api.finish(scope,server.id,JSON.parse(finishJson),signal)
  const again=await api.finish(scope,server.id,JSON.parse(finishJson),signal);check(again.duplicate&&finish.completionAssessment.schemaVersion===2,'FINISH duplicate schema2 assessment')
  let detail=await api.detail(scope,server.id,signal);const sealed=JSON.stringify(detail.completionAssessment)
  check(JSON.stringify(detail.initialPlan)===initial,'InitialPlan unchanged')
  const edit={dataGeneration:scope.dataGeneration,expectedVersion:detail.version,setCorrections:[{id:request.snapshot.performedSets[0].id,weightKg:'61',reps:9}],cardioCorrections:[],deletedPerformedSetIds:[],deletedCardioResultIds:[]}
  await api.records(scope,server.id,edit,signal);detail=await api.detail(scope,server.id,signal)
  check(detail.snapshot.state.performedSets.find(s=>s.id===edit.setCorrections[0].id).manufacturerId===a.manufacturerId,'correction retains equipment')
  const recovery={dataGeneration:scope.dataGeneration,expectedVersion:detail.version,confirm:true,origin:{editorDeviceId:w.editorDeviceId,writerEpoch:w.writerEpoch,localRevision:recoverySource.localRevision},performedSets:[missing],cardioResults:[]}
  await api.recover(scope,server.id,recovery,signal);detail=await api.detail(scope,server.id,signal)
  check(detail.snapshot.state.performedSets.find(s=>s.id===missing.id).manufacturerId===b.manufacturerId,'recovered original equipment')
  await api.records(scope,server.id,{...edit,expectedVersion:detail.version,setCorrections:[],deletedPerformedSetIds:[missing.id]},signal)
  detail=await api.detail(scope,server.id,signal);const changes=await api.changes(scope,server.id,signal)
  check(changes.events.some(e=>e.changeKind==='DELETED'&&e.recordId===missing.id&&e.before.manufacturerId===b.manufacturerId),'deleted original equipment audit')
  check(JSON.stringify(detail.completionAssessment)===sealed,'first assessment immutable')
  check((await api.assessment(scope,server.id,signal)).currentAssessment.evaluation.schemaVersion===2,'current assessment schema2')
  passed.push('실제 FINISH 재송신·평가schema2·정정/명시 복구/삭제 감사의 장비 원본·최초 평가 불변')
  window.catalogV17Result.status='PASS'
} catch(error) {window.catalogV17Result={status:'FAIL',passed,error:error.stack}}
finally {await store.close();document.querySelector('#result').textContent=JSON.stringify(window.catalogV17Result,null,2)}
