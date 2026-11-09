// Isolated component fixture. Real React components/API validator, in-memory transport only.
import React, { useState } from 'react'
import { root } from './routine-ui.jsx'
import { routine, bootstrap, session, start } from './workout-online-data.mjs'
import { WorkspaceView } from '../../src/features/workout-online/WorkoutWorkspace.tsx'
import { HomePanel } from '../../src/features/home/HomePanel.tsx'
import { useTrainingSchedule } from '../../src/features/workout-online/useTrainingSchedule.ts'
import { WorkoutApiError } from '../../src/features/workout-online/api.ts'
import { AppShell } from '../../src/app/AppShell.tsx'
import { addDays, dayOfWeek } from '../../src/features/home/model.ts'

const scope = { userId: routine.userId, dataGeneration: routine.dataGeneration }
const ids = [routine.id, '30000000-1111-4222-8333-000000000002', '30000000-1111-4222-8333-000000000003']
const cardio = name => ({ id: crypto.randomUUID(), deletedAt: null, plan: { kind: 'TREADMILL', name, targetSeconds: 600, targetDistanceKm: null, intensity: null, inclinePercent: null, resistance: null } })
const plans = [
  { ...structuredClone(routine), tag: 'PUSH', createdAt: '2026-11-01T00:00:00Z', name: '상체 PUSH · 매우 긴 루틴 이름의 말줄임 검토', weightPlacements: [routine.weightPlacements[0], { ...routine.weightPlacements[0], id: crypto.randomUUID(), exerciseName: '스쿼트' }, { ...routine.weightPlacements[0], id: crypto.randomUUID(), exerciseName: '데드리프트' }], cardioPlacements: [cardio('러닝머신'), cardio('트랙 러닝')] },
  { ...structuredClone(routine), id: ids[1], tag: 'CARDIO', createdAt: '2026-11-03T00:00:00Z', name: '달리기', weightPlacements: [], cardioPlacements: [cardio('야외 러닝')] },
  { ...structuredClone(routine), id: ids[2], tag: null, createdAt: '2026-11-02T00:00:00Z', name: '태그 없는 매우 긴 하체 루틴 이름', cardioPlacements: [] },
]
let calendar = { ...scope, version: '1', timeZone: 'Asia/Seoul', appliedAt: '2026-11-06T00:00:00Z', assignments: [{ dayOfWeek: 1, routineId: ids[0] }, { dayOfWeek: 3, routineId: ids[1] }, { dayOfWeek: 5, routineId: ids[0] }] }
const ui = window.listUi = { ids, requests: [], selected: [], edited: [], deleted: [], routineWrites:[], invalid: [], activeError: false, versionConflict: false, loseAck: false }
ui.confirmDelete=true;ui.confirms=[]
window.confirm=message=>{ui.confirms.push(message);return ui.confirmDelete}
const presetId = '90000000-0000-4000-8000-000000000011'
const transport = { workoutRequest: async (owner, path, method, body) => {
  if (owner !== scope.userId) throw Error('Fixture owner mismatch')
  if (path === '/api/v1/deload-periods/current') return { status: 200, data: { ...scope, period: null } }
  if (path === '/api/v1/deload-analysis') return { status: 200, data: { ...scope, enabled: true, calculationStatus: 'INITIAL', confirmedWeeks: null, recommendationThreshold: { numerator: '8', denominator: '1' } } }
  ui.requests.push({ path, method, body: structuredClone(body) })
  if (method === 'PUT') {
    if (path !== '/api/v1/weekly-schedule/presets/' + presetId + '/assignments') throw Error('Fixture requires V30 assignment endpoint')
    if (ui.activeError) throw new WorkoutApiError('ACTIVE_SESSION_EXISTS', 409)
    if (ui.versionConflict || body.expectedPresetVersion !== calendar.version) throw new WorkoutApiError('PRESET_VERSION_CONFLICT', 409)
    const changed = calendar.version === '0' || JSON.stringify(body.assignments) !== JSON.stringify(calendar.assignments)
    calendar = { ...calendar, assignments: structuredClone(body.assignments), version: (BigInt(calendar.version) + (changed ? 1n : 0n)).toString(), appliedAt: '2026-11-06T01:00:00Z' }
    if (ui.loseAck) { ui.loseAck = false; throw Error('응답 유실 · 입력 유지') }
  }
  const value = { dataGeneration: scope.dataGeneration, stateVersion: calendar.appliedAt ? '1' : '0',
    activePresetId: presetId, autoEnabled: false, timeZone: calendar.timeZone, appliedAt: calendar.appliedAt,
    appliedScheduleVersion: calendar.appliedAt ? calendar.version : null, nextRotationAt: null,
    presets: [{ id: presetId, displayOrder: 1, presetVersion: calendar.version, rotationIncluded: false, assignments: structuredClone(calendar.assignments) }] }
  if (ui.holdRead && method === 'GET') { ui.holdRead = false; return new Promise(resolve => { ui.releaseRead = () => resolve({ status: 200, data: value }) }) }
  return { status: 200, data: value }
} }
const summaries = plans.map(({ id, name, version, tag, createdAt }) => ({ id, name, version, tag, createdAt }))
const api = { routine: async (_scope, id) => structuredClone(plans.find(p => p.id === id)), cardioActivities: async () => [], routines: async () => ({ ...scope, routines: summaries }), closed: async () => ({ ...scope, sessions: [], next: null }) }
const statistics = { overview: async (_scope, period) => ({ plannedDays: Array.from({ length: 7 }, (_, i) => {
  const date = addDays(period.fromDate, i), assignment = calendar.assignments.find(a => a.dayOfWeek === dayOfWeek(date)), plan = plans.find(p => p.id === assignment?.routineId)
  const result={ date, status: plan ? 'PLANNED' : 'REST', plan: plan ?? null, effectiveDay: '0', reviewStatus: null, selectedSessionId: null }
  if(i===0&&ui.homeReview)return {...result,status:ui.homeReview==='rest'?'REST':'PLANNED',plan:ui.homeReview==='rest'?null:result.plan,effectiveDay:ui.homeReview==='completed'?'1':ui.homeReview==='partial'?'0.5':'0',reviewStatus:['completed','partial'].includes(ui.homeReview)?'PERFORMED':ui.homeReview==='missed'?'MISSED':null}
  return result
}) }) }
function ReviewWorkspace() {
  const initial = { userId: scope.userId, scope, data: { ...bootstrap, scope, routines: summaries }, selected: null, active: null, detail: null, deviceId: null, attempt: null, status: 'ready', busy: false, localReady: true, copySaved: false, issue: null, notice: '' }
  const [state, setState] = useState(initial), [refresh, setRefresh] = useState(0), [focused, setFocused] = useState(false), [tab, setTab] = useState('routines')
  const [controller] = useState(() => {
    let current = initial
    const update = patch => { current = { ...current, ...patch }; setState(current) }
    ui.setActive = active => update({ active: active ? session() : null })
    ui.setAttempt = active => update({ attempt: active ? { ...scope, request: start, requestJson: JSON.stringify(start) } : null })
    ui.staleSelection = () => update({ selected: { ...plans[0], version: '0', weightPlacements: [{ ...plans[0].weightPlacements[0], exerciseName: 'STALE EXERCISE' }] } })
    return { getSnapshot: () => current, refresh: async () => setRefresh(n => n + 1), invalidateScope: error => ui.invalid.push(error?.code), select: async id => { ui.selected.push(id); update({ selected: plans.find(p => p.id === id) }) }, deleteRoutine: async () => { ui.deleted.push(current.selected?.id);update({selected:null}) }, removedRoutine: async () => null, saveRoutine:async body=>{ui.routineWrites.push(structuredClone(body));return true},start:async()=>{} }
  })
  const training = useTrainingSchedule(transport, scope, String(refresh), controller.invalidateScope)
  ui.showHome = () => setTab('home')
  ui.setHomeReview = value => {ui.homeReview=value;setRefresh(n=>n+1)}
  ui.showRoutines = () => setTab('routines')
  ui.refresh = () => setRefresh(n => n + 1)
  ui.calendar = () => structuredClone(calendar)
  ui.useUnregistered = () => { calendar = { ...calendar, version: '0', appliedAt: null, assignments: [] }; setRefresh(n => n + 1) }
  const [visible, setVisible] = useState(true)
  ui.hide = () => setVisible(false)
  ui.reveal = () => setVisible(true)
  return <AppShell authenticated tab={tab} focused={focused} onNavigate={setTab}>
    <div hidden={tab !== 'routines'}>{visible && <WorkspaceView state={state} controller={controller} api={api} training={training} enabled onEditingChange={setFocused}/>}</div>
    {tab === 'home' && <HomePanel scope={scope} routines={summaries} api={api} training={training} statistics={statistics} visit={refresh} refreshKey={String(refresh)} active={null} attempt={false} busy={false} localReady issue={null} onStart={async () => {}} onResume={() => {}} onRetry={() => {}} onNavigate={setTab} onOpen={() => {}} onInvalid={() => {}}/>}
  </AppShell>
}
root.render(<ReviewWorkspace/> )
