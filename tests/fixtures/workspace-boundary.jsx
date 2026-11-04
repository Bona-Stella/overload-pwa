// Component-only fixture: real React DOM, WorkoutWorkspace and StatisticsPanel; no Backend claims.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { AuthContext } from '../../src/features/auth/context.ts'
import { WorkoutWorkspace } from '../../src/features/workout-online/WorkoutWorkspace.tsx'
import { bootstrap, session, USER, OTHER, DEVICE } from './workout-online-data.mjs'

const host = document.getElementById('root')
let root = createRoot(host)
const weights = count => ({ plannedSets: '0', completedSets: String(count), reps: String(count * 2), volumeLoadKg: null, setsWithoutVolume: '0' })
const held = []
window.boundaryRequests = []
window.boundaryOverview = (scope, period, signal) => {
  const count = scope.userId === USER && scope.dataGeneration === '0' ? 7 : 0
  const value = { statistics: { ...scope, ...period, planCoverage: 'PARTIAL_SCHEDULE_HISTORY', plannedWorkoutDays: null, routineAchievementPercent: null,
    summary: weights(count), cardioActiveMs: '0', unmappedCompletedSets: '0', days: [], exercises: [], muscles: [], groups: [], cardio: [], recentSessions: [] },
    effectiveWorkoutDays: null, unknownPlanDays: 1, unverifiableDays: 0, plannedDays: [], cardioByKind: [] }
  const request = { scope, signal }; window.boundaryRequests.push(request)
  if (window.holdBoundaryRequest) { window.holdBoundaryRequest = false; request.held = true; return new Promise(resolve => held.push(() => resolve(value))) }
  return Promise.resolve(value)
}
window.releaseBoundaryResponses = () => held.splice(0).forEach(resolve => resolve())
const authentication = { getSnapshot: () => window.boundaryAuth, invalidateLocalWorkoutAccess() {} }
window.renderBoundary = (owner = 'A', generation = '0', active = false) => {
  const userId = owner === 'A' ? USER : OTHER, scope = { userId, dataGeneration: generation }
  window.boundaryAuth = { status: owner === 'logout' ? 'anonymous' : owner === 'expired' ? 'unavailable' : 'authenticated', pending: null, userId, accountOpen: false, localWorkoutUserId: null }
  const detail = active ? session({ ...scope, editorDeviceId: DEVICE }) : null
  window.boundaryState = { userId, scope, data: { ...bootstrap, scope, routines: [] }, selected: null, active: detail, detail, deviceId: DEVICE,
    attempt: null, status: 'ready', busy: false, localReady: true, copySaved: false, issue: null, notice: '' }
  root.render(<AuthContext value={{ state: window.boundaryAuth, controller: authentication }}><WorkoutWorkspace /></AuthContext>)
}
window.resetBoundary = () => { root.unmount(); host.replaceChildren(); root = createRoot(host); window.boundaryRequests.length = 0; held.length = 0 }
window.renderBoundary()
