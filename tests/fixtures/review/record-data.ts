import type { ReviewRecord } from './workout-model.ts'
import type { Routine, Session, StandardExercise } from '../../../src/features/workout-online/types.ts'
import type { PresetSchedule } from '../../../src/features/workout-online/preset-schedule.ts'
import type { Period, PlannedDay, WeightStats } from '../../../src/features/statistics/api.ts'
import type { AnalysisData, AnalysisRow } from '../../../src/features/statistics/muscle-analysis.ts'
import type { RecordPreviewData } from '../../../src/features/statistics/RecordDisplayContext.ts'
import { muscleGroups } from '../../../src/features/statistics/muscle-analysis.ts'
import { addDays, weekDates } from '../../../src/features/home/model.ts'
import { reviewToday, scope } from './routine-samples.ts'

const uid = (n: number) => '20000000-0000-4000-8000-' + String(n).padStart(12,'0')
const muscleNames = [['대흉근','CHEST'],['광배근','BACK'],['승모근','BACK'],['전면 삼각근','SHOULDERS'],['측면 삼각근','SHOULDERS'],['후면 삼각근','SHOULDERS'],['상완이두근','ARMS'],['상완삼두근','ARMS'],['대퇴사두근','LEGS'],['햄스트링','LEGS'],['대둔근','LEGS'],['복직근','CORE']]
const muscles = muscleNames.map(([name,groupCode],i) => ({id:uid(100+i),name,groupCode}))
const specs: [string,string,string,string,number[],number[]][] = [
 ['벤치 프레스','CHEST','FRONT','PUSH',[0],[3,7]],
 ['바벨 스쿼트','LEGS','FRONT','LEGS',[8],[9,10]],
 ['랫 풀다운','BACK','BACK','PULL',[1],[6]],
 ['인클라인 덤벨 프레스','CHEST','FRONT','PUSH',[0],[3,7]],
 ['시티드 케이블 로우','BACK','BACK','PULL',[1,2],[6,5]],
 ['숄더 프레스','SHOULDERS','FRONT','PUSH',[3],[4,7]],
 ['사이드 레터럴 레이즈','SHOULDERS','FRONT','PUSH',[4],[]],
 ['덤벨 컬','ARMS','FRONT','PULL',[6],[]],
 ['케이블 푸시다운','ARMS','FRONT','PUSH',[7],[]],
 ['레그 컬','LEGS','BACK','LEGS',[9],[]],
 ['레그 프레스','LEGS','FRONT','LEGS',[8],[10]],
 ['크런치','CORE','FRONT','PUSH',[11],[]],
]
export function recordPreviewData(routines: Routine[], schedule: PresetSchedule, seeds: Session[], days: PlannedDay[], empty = false, extraSessions:Session[]=[]): RecordPreviewData & { today: string } {
 const definitions: StandardExercise[] = specs.map(([name,,, ,primary,secondary],i) => ({id:i<3?routines.flatMap(r=>r.weightPlacements).find(p=>p.exerciseName===name)?.standardExerciseId??uid(i+1):uid(i+1),name,aliases:[['bench press','squat','lat pulldown'][i]??name],muscles:[...primary.map(index=>({...muscles[index],role:'PRIMARY' as const})),...secondary.map(index=>({...muscles[index],role:'SECONDARY' as const}))]}))
 const split = [[0,5,8],[1,9,10],[2,4,7],[3,6,11]]
 const offsets=[0,0,-1,-3,-6,-7,-12,-34,-65]
 const sessions: Session[] = empty || !seeds.length ? [] : offsets.map((offset,i) => {
   const base=structuredClone(seeds[0]), type=i===1?3:i>=7?0:i%3, routine=routines[type]??routines[0], date=addDays(reviewToday,offset), cardioOnly=i===1
   const chosen=cardioOnly?[]:split[type].map(n=>definitions[n])
   const start=date+(i===1?'T00:00:00Z':'T10:00:00Z'), end=date+(i===1?'T00:30:00Z':'T10:42:20Z')
   const weightExercises=chosen.map((e,j)=>({sessionExerciseId:uid(1000+i*10+j),sourcePlacementId:uid(2000+i*10+j),standardExerciseId:e.id,exerciseName:e.name,setCount:3,minReps:8,maxReps:12,initialWeightKg:String([25,20,12][j]-(i>=7?(i===7?5:10):0)),approvedWeightKg:String([25,20,12][j]-(i>=7?(i===7?5:10):0)),manufacturerId:null,loadType:'PLATE' as const}))
   const plan=routines.flatMap(r=>r.cardioPlacements)[0]?.plan
   const cardioActivities=(i%2===0||cardioOnly)&&plan?[{sessionActivityId:uid(3000+i),sourcePlacementId:uid(3100+i),plan:{...plan,kind:cardioOnly?'BIKE' as const:plan.kind,name:cardioOnly?'실내 자전거':plan.name,targetSeconds:1800,targetDistanceKm:cardioOnly?'7.5':'4',intensity:cardioOnly?null:plan.intensity}}]:[]
   const state={...base.snapshot.state,sessionExercises:[...weightExercises.map(e=>({id:e.sessionExerciseId,kind:'WEIGHT' as const,standardExerciseId:e.standardExerciseId})),...cardioActivities.map(e=>({id:e.sessionActivityId,kind:'CARDIO' as const,standardExerciseId:null}))],appliedPlan:{schemaVersion:2 as const,weightExercises,cardioActivities},
    performedSets:weightExercises.flatMap((e,j)=>Array.from({length:i===2?(j===2?0:3):3},(_,k)=>({id:uid(4000+i*100+j*10+k),sessionExerciseId:e.sessionExerciseId,ordinal:k+1,weightKg:e.approvedWeightKg,reps:12-k,completedAt:end,manufacturerId:e.manufacturerId,loadType:e.loadType,weightContext:{kind:'INITIAL_APPROVED' as const,requestId:null}}))),
    cardioResults:cardioActivities.map(e=>({id:uid(6000+i),sessionActivityId:e.sessionActivityId,status:'COMPLETED' as const,startedAt:start,occurredAt:end,result:{activeMs:1800000,timerMs:1800000,corrected:false,distanceKm:e.plan.targetDistanceKm,averageBpm:132,measurement:{actualSpeedKmh:cardioOnly?null:'8',distanceSource:cardioOnly?'MANUAL' as const:'CALCULATED' as const}}})),approvalRequests:[],deletedPerformedSetIds:[],deletedCardioResultIds:[]}
   return {...base,id:uid(7000+i),workoutDate:date,startedAt:start,endedAt:end,closedAt:end,initialPlan:{schemaVersion:2,routineId:routine.id,routineName:cardioOnly?'아침 유산소':routine.name,routineVersion:routine.version,weightExercises,cardioActivities},snapshot:{...base.snapshot,state,approvalResults:[],recordedContexts:[]}}
 })
 if(!empty)for(const seed of seeds)if(days.some(d=>d.selectedSessionId===seed.id)&&!sessions.some(s=>s.id===seed.id))sessions.push(structuredClone(seed))
 if(!empty)for(const extra of extraSessions){const at=sessions.findIndex(s=>s.id===extra.id);if(at>=0)sessions.splice(at,1);sessions.push(extra)}
 const facts=sessions.flatMap(s=>s.initialPlan.weightExercises.map(e=>{const rows=s.snapshot.state.performedSets.filter(f=>f.sessionExerciseId===e.sessionExerciseId);return {id:e.standardExerciseId,date:s.workoutDate,actual:rows.length,planned:e.setCount,reps:rows.reduce((n,f)=>n+f.reps,0),volume:rows.reduce((n,f)=>n+Number(f.weightKg)*f.reps,0)}}))
 const aggregate=(rows:typeof facts,plan=false):AnalysisData=>{
  const row=(id:string,name:string,group=''):AnalysisRow=>({id,name,group,actual:'0',planned:'0',volume:'0'})
  const frontBack=[row('FRONT','전면'),row('BACK','후면')],ppl=['PUSH','PULL','LEGS'].map(n=>row(n,n)),groups=Object.entries(muscleGroups).map(([id,name])=>row(id,name)),muscleRows=muscles.map(m=>({...row(m.id,m.name,m.groupCode),...(plan?{minimum:4,maximum:12}:{})}))
  for(const f of rows){const index=definitions.findIndex(d=>d.id===f.id);if(index<0)continue;const spec=specs[index];const targets=[frontBack.find(r=>r.id===spec[2])!,ppl.find(r=>r.id===spec[3])!,groups.find(r=>r.id===spec[1])!]
   for(const r of targets){r.actual=String(Number(r.actual)+f.actual);r.planned=String(Number(r.planned)+f.planned);r.volume=String(Number(r.volume)+f.volume)}
   for(const m of definitions[index].muscles??[]){const r=muscleRows.find(r=>r.id===m.id)!;const factor=m.role==='PRIMARY'?1:.5;r.actual=String(Number(r.actual)+f.actual*factor);r.planned=String(Number(r.planned)+f.planned*factor);if(m.role==='PRIMARY')r.volume=String(Number(r.volume)+f.volume)}
  }
  return {frontBack,ppl,groups,muscles:muscleRows,total:String(rows.reduce((n,r)=>n+(plan?r.planned:r.actual),0)),issues:['합성 시연 데이터 · 상위 분류는 검수된 운동 분류로 독립 집계. 세부 근육만 PRIMARY 1.0 / SECONDARY 0.5.'+(plan?' ▼ 시작 4 · 최대 12세트는 UI 검토용 합성 가이드입니다.':'')]}
 }
 const inRange=(date:string,range:Period)=>date>=range.fromDate&&date<range.toDateExclusive
 const weightStats=(rows:typeof facts):WeightStats=>({plannedSets:String(rows.reduce((n,r)=>n+r.planned,0)),completedSets:String(rows.reduce((n,r)=>n+r.actual,0)),reps:String(rows.reduce((n,r)=>n+r.reps,0)),volumeLoadKg:String(rows.reduce((n,r)=>n+r.volume,0)),setsWithoutVolume:'0'})
 const week=weekDates(reviewToday), range={fromDate:week[0],toDateExclusive:addDays(week[6],1)}
 return {source:'synthetic-preview',today:reviewToday,sessions,evidence:seeds,definitions,
  overview:range=>{const rows=facts.filter(f=>inRange(f.date,range)), dates:string[]=[];for(let d=range.fromDate;d<range.toDateExclusive;d=addDays(d,1))dates.push(d)
   const knownDays=dates.map(date=>days.find(d=>d.date===date)),unknown=knownDays.filter(d=>!d||d.status==='UNKNOWN'||d.status==='UNVERIFIABLE').length
   const plannedDays=unknown?null:knownDays.filter(d=>d?.status==='PLANNED').length
   const effective=unknown?null:String(knownDays.reduce((n,d)=>n+Number(d?.effectiveDay??0),0))
   const percent=plannedDays&&effective!==null?(Number(effective)/plannedDays*100).toFixed(6).replace(/\.?0+$/,''):null
   const cardios=sessions.filter(s=>inRange(s.workoutDate,range)).flatMap(s=>s.snapshot.state.cardioResults.filter(c=>c.status==='COMPLETED').map(c=>({...c,kind:s.initialPlan.cardioActivities.find(a=>a.sessionActivityId===c.sessionActivityId)?.plan.kind??'OTHER'})))
   const cardioMs=cardios.reduce((n,c)=>n+(c.status==='COMPLETED'?c.result.activeMs:0),0)
   const muscleStats = definitions.flatMap(definition => definition.muscles ?? [])
   const links = [...new Map(muscleStats.map(m => [m.id + ':' + m.role, m])).values()]
   const touches = (row: typeof facts[number], id: string, role: 'PRIMARY' | 'SECONDARY') =>
    definitions.find(d => d.id === row.id)?.muscles?.some(m => m.id === id && m.role === role)
   const muscleRows = links.map(m => {
    const weights = weightStats(rows.filter(row => touches(row, m.id, m.role)))
    return {...m, weights, contributionSets: (Number(weights.completedSets) * (m.role === 'PRIMARY' ? 1 : .5)).toFixed(1)}
   })
   const groupRows = [...new Map(links.map(m => [m.groupCode + ':' + m.role, m])).values()].map(({groupCode, role}) => ({
    groupCode, role, weights: weightStats(rows.filter(row => links.some(m => m.groupCode === groupCode && m.role === role && touches(row, m.id, role)))),
   }))
   const groupActuals = [...new Set(links.map(m => m.groupCode))].map(groupCode => ({
    groupCode, completedSets: weightStats(rows.filter(row => links.some(m => m.groupCode === groupCode && touches(row, m.id, m.role)))).completedSets,
   }))
   return {statistics:{...scope,...range,planCoverage:unknown?'PARTIAL_SCHEDULE_HISTORY':'FULL_SCHEDULE_HISTORY',plannedWorkoutDays:plannedDays,routineAchievementPercent:percent,summary:weightStats(rows),cardioActiveMs:String(cardioMs),unmappedCompletedSets:'0',days:dates.map(date=>({date,weights:weightStats(rows.filter(r=>r.date===date)),cardioActiveMs:'0'})),exercises:definitions.map(e=>({standardExerciseId:e.id,name:e.name,weights:weightStats(rows.filter(r=>r.id===e.id))})),muscles:muscleRows,groups:groupRows,groupActuals,cardio:[],recentSessions:[]},effectiveWorkoutDays:effective,unknownPlanDays:unknown,unverifiableDays:0,plannedDays:dates.map(date=>days.find(d=>d.date===date)??{date,status:'UNKNOWN',scheduleVersion:null,plan:null,plannedExercises:null,completedExercises:null,effectiveDay:null,selectedSessionId:null,reviewStatus:null,reviewRevision:null}),
    cardioByKind:[...new Set(cardios.map(c=>c.kind))].map(kind=>{
     const records=cardios.filter(c=>c.kind===kind),source=(value:string|null)=>records.filter(c=>(c.result.measurement?.distanceSource??null)===value),distance=(rows:typeof records)=>{const values=rows.flatMap(c=>c.result.distanceKm!==null?[c.result.distanceKm]:[]);return values.length?String(values.reduce((n,v)=>n+Number(v),0)):null}
     return {kind,activeMs:String(records.reduce((n,c)=>n+c.result.activeMs,0)),distanceKm:distance(records),manualDistanceKm:distance(source('MANUAL')),calculatedDistanceKm:distance(source('CALCULATED')),unknownSourceDistanceKm:distance(source(null)),manualRecords:String(source('MANUAL').length),calculatedRecords:String(source('CALCULATED').length),unknownSourceRecords:String(source(null).length),recordsWithoutDistance:String(records.filter(c=>c.result.distanceKm===null).length)}
    })}
  },
  actual:aggregate(facts.filter(f=>inRange(f.date,range))),
  plan:preset=>{const p=schedule.presets.find(p=>p.id===preset);const rows=(p?.assignments??[]).flatMap(a=>{const r=routines.find(r=>r.id===a.routineId);return (r?.weightPlacements.filter(p=>!p.deletedAt)??[]).flatMap(e=>{const at=definitions.findIndex(d=>d.id===e.standardExerciseId);return at<0?[]:[{id:definitions[at].id,date:reviewToday,actual:0,planned:e.setCount,reps:0,volume:0}]})});return aggregate(rows,true)},
  trend:(range,selected,metric)=>{const dates:string[]=[];for(let d=range.fromDate;d<range.toDateExclusive;d=addDays(d,1))dates.push(d);return dates.map(date=>facts.filter(f=>f.date===date).reduce((sum,f)=>{const e=definitions.find(e=>e.id===f.id), spec=e?specs[definitions.indexOf(e)]:undefined;let factor=1;if(selected.startsWith('exercise:')&&f.id!==selected.slice(9))return sum;if(selected.startsWith('group:')&&(!spec||spec[1]!==selected.slice(6)))return sum;if(selected.startsWith('muscle:')){const m=e?.muscles?.find(m=>m.id===selected.slice(7));if(!m)return sum;factor=metric==='sets'&&m.role==='SECONDARY'?.5:1}return sum+(metric==='sets'?f.actual*factor:f.volume)},0))},
  growth:definitions.slice(0,5).flatMap((e,i)=>{
   if(i===2)return []
   const records=sessions.filter(s=>s.initialPlan.weightExercises.some(w=>w.standardExerciseId===e.id)).toSorted((a,b)=>a.workoutDate.localeCompare(b.workoutDate))
   let previous:string|null=null
   return records.flatMap(s=>{const kg=s.initialPlan.weightExercises.find(w=>w.standardExerciseId===e.id)!.approvedWeightKg;const previousKg=previous;previous=kg;if(previousKg===null||previousKg===kg)return [];return [{exerciseId:e.id,sessionId:s.id,date:s.workoutDate,kg,previousKg}]})
  })
 }
}

/** Isolated preview display mapping. Never sent to an API or persisted as a real session. */
export function reviewRecordSession(record:ReviewRecord):Session{
 const {session:s,endedAt}=record,at=new Date(endedAt).toISOString()
 const weights=s.weights.map(w=>({sessionExerciseId:w.id,setCount:w.sets.length,minReps:w.min,maxReps:w.max,manufacturerId:w.manufacturerId,loadType:w.loadType}))
 const cardio=s.cardio.map(c=>({sessionActivityId:c.id,plan:structuredClone(c.plan)}))
 return {...scope,id:s.id,status:'FINISHED',version:'0',startedAt:new Date(s.startedAt).toISOString(),workoutDate:record.workoutDate??new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s.startedAt)),startedTimeZone:'Asia/Seoul',editorDeviceId:s.id,writerEpoch:'0',localRevision:'0',lastWorkoutSyncedAt:at,lastSnapshotSavedAt:at,initialPlan:structuredClone(s.initialPlan),endedAt:at,closedAt:at,deletedAt:null,completionAssessment:null,
 snapshot:{state:{sessionExercises:[...s.weights.map(w=>({id:w.id,kind:'WEIGHT' as const,standardExerciseId:w.standardId})),...s.cardio.map(c=>({id:c.id,kind:'CARDIO' as const,standardExerciseId:null}))],appliedPlan:{schemaVersion:2,weightExercises:weights,cardioActivities:cardio},
 performedSets:s.weights.flatMap(w=>w.sets.flatMap(row=>row.result?[{id:s.id+':'+w.id+':'+row.id,sessionExerciseId:w.id,ordinal:row.id,weightKg:row.result.kg,reps:row.result.reps,completedAt:new Date(row.result.at).toISOString(),manufacturerId:row.result.manufacturerId,loadType:row.result.loadType,weightContext:{kind:row.result.mode==='approved'?'INITIAL_APPROVED' as const:'UNVERIFIED' as const,requestId:null},...(row.result.additionalKg!==null?{bodyweightLoad:{additionalWeightKg:row.result.additionalKg}}:{})}]:[])),
 cardioResults:s.cardio.flatMap<Session['snapshot']['state']['cardioResults'][number]>(c=>c.phase==='completed'&&c.result?[{id:s.id+':'+c.id,sessionActivityId:c.id,status:'COMPLETED' as const,startedAt:new Date(s.startedAt).toISOString(),occurredAt:at,result:structuredClone(c.result)}]:c.phase==='skipped'?[{id:s.id+':'+c.id,sessionActivityId:c.id,status:'SKIPPED' as const,startedAt:null,result:null,occurredAt:at}]:[]),approvalRequests:[],deletedPerformedSetIds:[],deletedCardioResultIds:[]},approvalResults:[],recordedContexts:[]}}
}
