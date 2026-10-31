export const USER='10000000-1111-4222-8333-000000000001', OTHER='10000000-1111-4222-8333-000000000002'
export const DEVICE='20000000-1111-4222-8333-000000000001', ROUTINE='30000000-1111-4222-8333-000000000001'
export const EXERCISE='40000000-1111-4222-8333-000000000001', PLACEMENT='50000000-1111-4222-8333-000000000001'
export const SESSION='60000000-1111-4222-8333-000000000001', SESSION_EXERCISE='70000000-1111-4222-8333-000000000001'
export const scope={userId:USER,dataGeneration:'9007199254740993'}
export const routine={...scope,id:ROUTINE,version:'9007199254740994',name:'실제 계정 루틴 Ω',weightPlacements:[{id:PLACEMENT,exerciseDefinitionId:EXERCISE,exerciseName:'벤치프레스',setCount:3,minReps:6,maxReps:10,initialWeightKg:'0',approvedWeightKg:'99999999999999.999999',deletedAt:null}],cardioPlacements:[]}
export const start={id:SESSION,dataGeneration:scope.dataGeneration,routineId:ROUTINE,editorDeviceId:DEVICE,startedAt:'2026-10-31T12:00:00.000Z',workoutDate:'2026-10-31',startedTimeZone:'Asia/Seoul'}
export function session(overrides={}) {return {...scope,id:SESSION,status:'ACTIVE',version:'0',startedAt:start.startedAt,workoutDate:start.workoutDate,startedTimeZone:start.startedTimeZone,
  editorDeviceId:DEVICE,writerEpoch:'0',localRevision:'0',lastWorkoutSyncedAt:'2026-10-31T12:00:00.123456Z',lastSnapshotSavedAt:null,
  initialPlan:{schemaVersion:1,routineId:ROUTINE,routineName:routine.name,routineVersion:routine.version,weightExercises:[{sessionExerciseId:SESSION_EXERCISE,sourcePlacementId:PLACEMENT,exerciseDefinitionId:EXERCISE,exerciseName:'벤치프레스',setCount:3,minReps:6,maxReps:10,initialWeightKg:'0',approvedWeightKg:'99999999999999.999999'}],cardioActivities:[]},
  snapshot:{state:{sessionExercises:[{id:SESSION_EXERCISE,kind:'WEIGHT',exerciseDefinitionId:EXERCISE}],appliedPlan:{schemaVersion:1,weightExercises:[{sessionExerciseId:SESSION_EXERCISE,setCount:3,minReps:6,maxReps:10}],cardioActivities:[]},performedSets:[],cardioResults:[],deletedPerformedSetIds:[],deletedCardioResultIds:[],approvalRequests:[]},approvalResults:[],recordedContexts:[]},endedAt:null,closedAt:null,completionAssessment:null,deletedAt:null,...overrides}}
export const bootstrap={scope,exercises:[{id:EXERCISE,name:'벤치프레스'}],settings:{...scope,restLowSeconds:180,restMediumSeconds:120,restHighSeconds:90},routines:[{id:ROUTINE,name:routine.name,version:routine.version}]}
