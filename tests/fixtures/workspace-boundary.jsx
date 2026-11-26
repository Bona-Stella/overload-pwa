// Component-only fixture: real React DOM, WorkoutWorkspace and StatisticsPanel; no Backend claims.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from '../../src/features/auth/context.ts'
import { WorkoutWorkspace } from '../../src/features/workout-online/WorkoutWorkspace.tsx'
import { navigateTabRoot, useScreenHistory } from '../../src/app/navigation.ts'
import { AppShell } from '../../src/app/AppShell.tsx'
import { bootstrap, routine, session, USER, OTHER, DEVICE, EXERCISE, PLACEMENT, ROUTINE } from './workout-online-data.mjs'

const host = document.getElementById('root')
let root = createRoot(host)
const weights = count => ({ plannedSets: '0', completedSets: String(count), reps: String(count * 2), volumeLoadKg: null, setsWithoutVolume: '0' })
const held = []
window.boundaryRequests = []
window.boundaryOverview = (scope, period, signal) => {
  const count = scope.userId === USER && scope.dataGeneration === '0' ? 7 : 0
  const value = { statistics: { ...scope, ...period, planCoverage: 'PARTIAL_SCHEDULE_HISTORY', plannedWorkoutDays: null, routineAchievementPercent: null,
    summary: weights(count), cardioActiveMs: '0', unmappedCompletedSets: '0', days: [], exercises: [],
    muscles: count ? [{ id: DEVICE, groupCode: 'LEGS', role: 'SECONDARY', name: '햄스트링', weights: weights(3), contributionSets: '1.5' }] : [],
    groups: [], groupActuals: count ? [{ groupCode: 'LEGS', completedSets: '3' }] : [], cardio: [], recentSessions: [] },
    effectiveWorkoutDays: null, unknownPlanDays: 1, unverifiableDays: 0, plannedDays: [], cardioByKind: [] }
  const request = { scope, signal }; window.boundaryRequests.push(request)
  if (window.holdBoundaryRequest) { window.holdBoundaryRequest = false; request.held = true; return new Promise(resolve => held.push(() => resolve(value))) }
  return Promise.resolve(value)
}
window.releaseBoundaryResponses = () => held.splice(0).forEach(resolve => resolve())
window.boundaryWeightReview = (scope, id) => new Promise((resolve, reject) => {
  window.finishBoundaryWeightReview = scenario => {
    window.finishBoundaryWeightReview = null
    if (scenario === 'error') return reject(new Error('saved review unavailable'))
    const detail = window.boundaryState.detail ?? window.recordScenario
    const plan = detail.initialPlan.weightExercises[0]
    const advice = scenario === 'maintain' ? 'MAINTAIN' : scenario === 'unavailable' ? 'UNAVAILABLE' : 'INCREASE'
    const candidate = advice === 'INCREASE'
    resolve({ ...scope, sessionId: id, version: detail.version, routineVersion: '1', approvals: [],
      current: [{ sessionExerciseId: plan.sessionExerciseId, available: scenario !== 'blocked', approvedWeightKg: '25' }],
      frozen: scenario === 'empty' ? null : { schemaVersion: 1, sessionVersion: detail.version, assessedAt: detail.closedAt,
        exercises: [{ sessionExerciseId: plan.sessionExerciseId, sourcePlacementId: plan.sourcePlacementId,
          standardExerciseId: plan.standardExerciseId, name: plan.exerciseName, loadType: plan.loadType,
          recommendedWeightKg: candidate ? '30' : null, guidance: { sessionExerciseId: plan.sessionExerciseId, advice,
            referenceWeightKg: '25', plannedSetCount: 3, completedSetCount: 3, incomplete: false,
            sets: [1, 2, 3].map(ordinal => ({ performedSetId: crypto.randomUUID(), ordinal, reps: 10, contributes: candidate })) } }] } })
  }
})
const authentication = { getSnapshot: () => window.boundaryAuth, invalidateLocalWorkoutAccess() {} }

function SettingsRouteHarness() {
  const [view, setView] = useScreenHistory('boundary-settings', null)
  return <>
    <button onClick={() => setView('rest')}>휴식 화면 열기</button>
    <button onClick={() => setView('catalog')}>카탈로그 화면 열기</button>
    <WorkoutWorkspace tab="settings" restOpen={view === 'rest'} catalogOpen={view === 'catalog'}
      onSettingsBack={() => history.back()} onRestExitGuard={guard => { window.settingsExitGuard = guard }} />
  </>
}

function FinishRouteHarness() {
  const { scope, detail } = window.boundaryState
  const [tab] = useScreenHistory('boundary-tab', 'home')
  const [, setWorkout] = useScreenHistory('workout-view:' + scope.userId + ':' + scope.dataGeneration, null)
  return <><button id="test-open-workout" onClick={() => setWorkout(detail.id)}>운동 열기</button>
    <WorkoutWorkspace tab={tab} renderShell={(content, focused) => <AppShell authenticated tab={tab} focused={focused} onNavigate={() => {}}>{content}</AppShell>} onNavigate={async (next, replace, children) => {
      navigateTabRoot('boundary-tab', next, children, undefined, replace)
      return true
    }} />
  </>
}
window.renderBoundary = (owner = 'A', generation = '0', active = false, finishFlow = false, tab = 'history', refreshing = false) => {
  const userId = owner === 'A' ? USER : OTHER, scope = { userId, dataGeneration: generation }
  window.boundaryAuth = { status: owner === 'logout' ? 'anonymous' : owner === 'expired' ? 'unavailable' : 'authenticated', pending: null, userId, accountOpen: false, localWorkoutUserId: null }
  const detail = active ? session({ ...scope, editorDeviceId: DEVICE, ...(active === 'finished'
    ? { status: 'FINISHED', endedAt: '2026-10-31T12:30:00Z', closedAt: '2026-10-31T12:30:01Z' } : {}) }) : null
  window.boundaryState = { userId, scope, data: { ...bootstrap, scope, routines: [] }, selected: null,
    active: detail?.status === 'ACTIVE' ? detail : null, detail, deviceId: DEVICE,
    attempt: null, status: refreshing ? 'loading' : 'ready', busy: refreshing, localReady: true, copySaved: finishFlow && !!detail, issue: null, notice: '' }
  root.render(<AuthContext value={{ state: window.boundaryAuth, controller: authentication }}>
    {finishFlow ? <FinishRouteHarness /> : tab === 'settings' ? <SettingsRouteHarness /> : <WorkoutWorkspace tab={tab} />}
  </AuthContext>)
}
window.startBoundary = () => {
  window.resetBoundary()
  window.recordScenario = null
  navigateTabRoot('boundary-tab','home')
  const scope = {userId:USER,dataGeneration:'0'}
  const selected = {...routine,...scope}
  window.boundaryAuth = {status:'authenticated',pending:null,userId:USER,accountOpen:false,localWorkoutUserId:null}
  window.boundaryState = {userId:USER,scope,data:{...bootstrap,scope},selected,active:null,detail:null,
    deviceId:DEVICE,attempt:null,status:'ready',busy:false,localReady:true,copySaved:false,issue:null,notice:'',routineRefreshes:new Map()}
  window.startScenario = {listeners:new Set(),routine:selected,session:session({...scope,editorDeviceId:DEVICE}),posts:0}
  root.render(<AuthContext value={{state:window.boundaryAuth,controller:authentication}}>
    <WorkoutWorkspace tab="home" renderShell={(content,focused)=><AppShell authenticated tab="home" focused={focused} onNavigate={()=>{}}>{content}</AppShell>} />
  </AuthContext>)
}
window.openRecordBoundary = tab => {
  window.resetBoundary()
  navigateTabRoot('boundary-tab', tab)
  const scope = { userId: USER, dataGeneration: '0' }
  const ended = new Date()
  const workoutDate = ended.toISOString().slice(0, 10)
  window.recordScenario = { ...session({ ...scope, editorDeviceId: DEVICE, status: 'FINISHED', workoutDate,
    endedAt: ended.toISOString(), closedAt: ended.toISOString() }), routineName: '검수 루틴' }
  window.renderBoundary('A', '0', false, true, tab)
}
window.openGraphBoundary = () => {
  window.openRecordBoundary('history')
  const scope = window.boundaryState.scope
  const exercise = { standardExerciseId: EXERCISE, name: '벤치프레스', lastPerformedAt: null }
  const placement = { routineId: ROUTINE, placementId: PLACEMENT, routineName: routine.name, deleted: false }
  window.graphBoundary = {
    schedule: { activeId: ROUTINE, presets: [
      { id: ROUTINE, version: '1', name: '테스트 계획', assignments: [{ routineId: ROUTINE }] },
      { id: DEVICE, version: '1', name: '빈 계획', assignments: [] },
    ] },
    routineReads: 0,
    routine: () => new Promise(resolve => {
      window.graphBoundary.routineReads++
      window.releasePlan = () => resolve({ ...routine, ...scope })
    }),
    exerciseDetail: async () => ({ id: EXERCISE, primaryMuscles: [], secondaryMuscles: [], frontBackSplit: 'FRONT', pplSplit: 'PUSH' }),
    growth: {
      search: async () => ({ exercises: [exercise], nextOffset: null }),
      options: async () => ({ placements: [placement] }),
      history: (_owner, _id, _placement, period) => new Promise((resolve, reject) => {
        window.releaseGrowth = (failed = false) => {
          window.releaseGrowth = null
          if (failed) { reject(Error('unavailable')); return }
          resolve({ points: [{ id: PLACEMENT, approvedWeightKg: period === 'all' ? '30' : '25', previousWeightKg: '20',
            occurredAt: '2026-10-31T12:00:00Z', sessionId: null, connectFromPrevious: false }], nextOffset: null })
        }
      }),
    },
  }
}
window.resetBoundary = () => { root.unmount(); host.replaceChildren(); root = createRoot(host); window.boundaryRequests.length = 0; held.length = 0 }
window.renderBoundary()
