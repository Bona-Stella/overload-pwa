// Browser-only account UI test: actual controllers, IndexedDB and editor; simulated HTTP responses.
import React, { useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthApi } from '../../src/features/auth/api.ts'
import { AuthController } from '../../src/features/auth/controller.ts'
import { AuthContext } from '../../src/features/auth/context.ts'
import { AuthApp } from '../../src/features/auth/AuthApp.tsx'
import { WorkoutStore, LocalStoreError } from '../../src/features/workout-online/storage.ts'
import { offlineAccess } from '../../src/features/workout-local/offline.ts'
import { applyLocalChange, editDraft, completeSet } from '../../src/features/workout-local/model.ts'
import { sealSnapshot } from '../../src/features/workout-local/sync-state.ts'
import { bootstrap, routine, scope, session, USER, OTHER, SESSION_EXERCISE } from './workout-online-data.mjs'
import '../../src/index.css'

let owner = null, generation = scope.dataGeneration, active = null, failLocal = false, failSnapshot = true
let workoutKey = null
const requests = [], store = new WorkoutStore()
const baseSave = WorkoutStore.prototype.saveLocal
WorkoutStore.prototype.saveLocal = function (...args) {
  return failLocal ? Promise.reject(new LocalStoreError()) : baseSave.apply(this, args)
}
const response = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const currentScope = () => ({ userId: owner, dataGeneration: generation })
const weights = { plannedSets: '0', completedSets: '0', reps: '0', volumeLoadKg: null, setsWithoutVolume: '0' }
async function fetcher(path, options = {}) {
  const url = new URL(path, location.origin), method = options.method ?? 'GET', body = options.body ? JSON.parse(options.body) : null
  requests.push({ path: url.pathname, method, body: options.body })
  if (url.pathname === '/api/v1/auth/session') return response(owner ? { userId: owner } : { code: 'AUTHENTICATION_REQUIRED' }, owner ? 200 : 401)
  if (url.pathname === '/api/v1/auth/csrf') return response({ headerName: 'X-CSRF-TOKEN', token: 'isolated-ui-fixture' })
  if (url.pathname === '/api/v1/auth/logout') { owner = null; return response({}) }
  if (url.pathname === '/api/v1/auth/identities') return response({ identities: [] })
  if (url.pathname === '/api/v1/auth/reauth/email/contact') return response({ status: 'REQUIRED' })
  if (url.pathname === '/api/v1/routines') return response({ ...currentScope(), routines: owner === USER ? bootstrap.routines : [] })
  if (url.pathname === '/api/v1/routines/' + routine.id) return response({ ...routine, ...currentScope() })
  if (url.pathname === '/api/v1/standard-exercises/search-data') return response({ schemaVersion: 1, exercises: bootstrap.exercises })
  if (url.pathname === '/api/v1/manufacturers') return response({ manufacturers: [] })
  if (url.pathname === '/api/v1/workout-settings') return response({ ...bootstrap.settings, ...currentScope() })
  if (url.pathname === '/api/v1/weekly-schedule') return response({ ...currentScope(), version: '0', timeZone: 'Asia/Seoul', appliedAt: null, assignments: [] })
  if (url.pathname === '/api/v1/statistics/overview') return response({ statistics: { ...currentScope(), fromDate: url.searchParams.get('fromDate'), toDateExclusive: url.searchParams.get('toDateExclusive'), planCoverage: 'PARTIAL_SCHEDULE_HISTORY', plannedWorkoutDays: null, routineAchievementPercent: null, summary: weights, cardioActiveMs: '0', unmappedCompletedSets: '0', days: [], exercises: [], muscles: [], groups: [], groupActuals: [], cardio: [], recentSessions: [] }, effectiveWorkoutDays: null, unknownPlanDays: 1, unverifiableDays: 0, plannedDays: [], cardioByKind: [] })
  if (url.pathname === '/api/v1/workout-sessions/closed') return response({ ...currentScope(), sessions: [], next: null })
  if (url.pathname === '/api/v1/workout-sessions/active') return response({ ...currentScope(), session: active })
  if (active && url.pathname === '/api/v1/workout-sessions/' + active.id) return response(active)
  if (active && url.pathname.endsWith('/snapshot')) {
    if (failSnapshot) return response({ code: 'WORKOUT_DATA_UNAVAILABLE' }, 503)
    const duplicate = active.localRevision === body.localRevision, now = new Date().toISOString()
    if (!duplicate) active = { ...active, localRevision: body.localRevision, version: (BigInt(active.version) + 1n).toString(), lastSnapshotSavedAt: now, lastWorkoutSyncedAt: now,
      snapshot: { state: body.snapshot, approvalResults: [], recordedContexts: body.snapshot.performedSets.map(s => ({ setId: s.id, approvalStateAtRecording: 'TODAY_ONLY', approvedWeightKgAtRecording: null })) } }
    return response({ ...currentScope(), sessionId: active.id, writerEpoch: active.writerEpoch, acceptedLocalRevision: active.localRevision, version: active.version, snapshotSavedAt: active.lastSnapshotSavedAt, lastWorkoutSyncedAt: active.lastWorkoutSyncedAt, duplicate, approvalResults: [] })
  }
  return response({ code: 'FIXTURE_UNEXPECTED_REQUEST' }, 400)
}
const auth = new AuthController(new AuthApi(fetcher), undefined, undefined, undefined, offlineAccess)
function AccountApp() {
  const state = useSyncExternalStore(auth.subscribe, auth.getSnapshot, auth.getSnapshot)
  return <AuthContext value={{ state, controller: auth }}><AuthApp /></AuthContext>
}
createRoot(document.getElementById('root')).render(<AccountApp />)
await auth.start()
window.t01 = {
  requests,
  async login() { owner = USER; await auth.restore() },
  async activate() {
    const startedAt = new Date(Date.now() - 180000).toISOString(), deviceId = await store.deviceId()
    active = session({ editorDeviceId: deviceId, startedAt, workoutDate: startedAt.slice(0, 10), lastWorkoutSyncedAt: startedAt })
    workoutKey = { ...scope, sessionId: active.id, editorDeviceId: active.editorDeviceId, writerEpoch: active.writerEpoch }
    await store.saveSession(scope, active)
    const initial = await store.openLocal(active, bootstrap.settings, () => true)
    const next = applyLocalChange(initial, value => { editDraft(value, SESSION_EXERCISE, 1, { weight: '60.000000', reps: '8' }); completeSet(value, SESSION_EXERCISE, 1, Date.now()); editDraft(value, SESSION_EXERCISE, 2, { weight: '60.000000', reps: '9' }) })
    sealSnapshot(next); await store.saveSyncLocal(next, initial.editVersion, () => true)
  },
  failLocal(value) { failLocal = value },
  allowSnapshot() { failSnapshot = false },
  read: () => store.readLocal(workoutKey),
  async switchAccount() { owner = OTHER; active = null; await auth.restore() },
  async changeGeneration() { generation = (BigInt(generation) + 1n).toString(); active = null; await auth.restore() },
  auth: () => auth.getSnapshot(),
}
