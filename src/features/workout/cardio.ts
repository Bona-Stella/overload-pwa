import type { CardioActivity, CardioKind, CardioPlan, WorkoutSession, WorkoutState } from './types.ts'
import { newId } from './id.ts'

export const CARDIO_NAMES: Record<CardioKind, string> = { treadmill: '러닝머신', bike: '실내 자전거', outdoor: '야외 러닝', stairs: '계단 운동', other: '기타 유산소' }
export const CARDIO_STATUS: Record<CardioActivity['status'], string> = { ready: '유산소 준비', running: '유산소 진행 중', paused: '유산소 일시정지', review: '유산소 완료 확인', completed: '유산소 완료', skipped: '유산소 건너뜀' }
export const supportsDistance = (kind: CardioKind) => ['treadmill', 'bike', 'outdoor'].includes(kind)
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const range = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max
const optionalRange = (v: unknown, min: number, max: number) => v === null || range(v, min, max)
const timestamp = (v: unknown) => range(v, 0, 8640000000000000) && Number.isSafeInteger(v)

// V1 input safety limits, not training prescriptions. No missing value becomes zero.
export function isCardioPlan(v: unknown): v is CardioPlan {
  if (!object(v) || typeof v.id !== 'string' || !v.id || typeof v.kind !== 'string' || !Object.hasOwn(CARDIO_NAMES, v.kind) || typeof v.name !== 'string' || !v.name.trim() || v.name.length > 100) return false
  const kind = v.kind as CardioKind
  return range(v.targetSeconds, 1, 86400) && Number.isInteger(v.targetSeconds) && optionalRange(v.targetDistance, .001, 1000) && (supportsDistance(kind) || v.targetDistance === null) && (v.intensity === null || (supportsDistance(kind) && object(v.intensity) && ((v.intensity.mode === 'speed' && range(v.intensity.value, .1, 100)) || (v.intensity.mode === 'pace' && range(v.intensity.value, .1, 120))))) && optionalRange(v.incline, 0, 50) && (kind === 'treadmill' || v.incline === null) && optionalRange(v.resistance, 1, 100) && (kind === 'bike' || v.resistance === null)
}

export function createCardio(plan: CardioPlan): CardioActivity {
  if (!isCardioPlan(plan)) throw new Error('유산소 종류와 목표 시간, 선택값의 입력 범위를 확인해 주세요.')
  return { id: newId(), plan: structuredClone(plan), status: 'ready', startedAt: null, runSince: null, pausedAt: null, accumulatedMs: 0, draft: { distance: '', bpm: '', correctedSeconds: null }, result: null }
}

export function cardioElapsed(activity: CardioActivity, now: number) {
  return activity.accumulatedMs + (activity.status === 'running' && activity.runSince !== null ? Math.max(0, now - activity.runSince) : 0)
}
export function cardioCounts(session: WorkoutSession) {
  const items = session.cardio ?? []
  return { completed: items.filter(a => a.status === 'completed').length, total: items.length }
}
export const cardioPending = (session: WorkoutSession) => (session.cardio ?? []).some(a => !['completed', 'skipped'].includes(a.status))

function edit(state: WorkoutState, id: string, action: (a: CardioActivity) => void, allowWarmup = false) {
  if (!state.active || (state.active.phase !== 'working' && !allowWarmup)) return state
  const active = structuredClone(state.active)
  const item = active.cardio?.find(a => a.id === id)
  if (!item || ['completed', 'skipped'].includes(item.status)) return state
  action(item)
  return { ...state, active }
}
export function addCardio(state: WorkoutState, plan: CardioPlan) {
  if (!state.active) return state
  if ([...state.active.exercises.map(e => e.id), ...(state.active.cardio ?? []).flatMap(a => [a.id, a.plan.id]), ...state.definitions.map(d => d.id)].includes(plan.id)) throw new Error('유산소 계획 식별자가 중복되었습니다.')
  const activity = createCardio(plan)
  return { ...state, active: { ...state.active, cardio: [...(state.active.cardio ?? []), activity] } }
}
export function startCardio(state: WorkoutState, id: string, now: number) {
  if (!timestamp(now)) throw new Error('시각을 확인해 주세요.')
  return edit(state, id, a => {
    if (!['ready', 'paused'].includes(a.status)) return
    if (now < Math.max(state.active?.startedAt ?? 0, a.pausedAt ?? 0)) throw new Error('현재 시각이 이전 운동 시각보다 빠릅니다. 기기 시각을 확인해 주세요.')
    if (state.active?.cardio?.some(other => other.id !== id && ['running', 'review'].includes(other.status))) throw new Error('진행 중인 유산소를 먼저 일시정지하거나 완료해 주세요.')
    a.startedAt ??= now
    a.runSince = now
    a.pausedAt = null
    a.status = 'running'
  })
}
export function pauseCardio(state: WorkoutState, id: string, now: number) {
  return edit(state, id, a => { if (a.status === 'running') { if (!timestamp(now) || now < (a.runSince ?? 0)) throw new Error('현재 시각이 유산소 시작 시각보다 빠릅니다. 기기 시각을 확인해 주세요.'); a.accumulatedMs = cardioElapsed(a, now); a.runSince = null; a.pausedAt = now; a.status = 'paused' } })
}
export function reviewCardio(state: WorkoutState, id: string, now: number) {
  if (state.active?.cardio?.some(other => other.id !== id && ['running', 'review'].includes(other.status))) throw new Error('진행 중인 유산소를 먼저 일시정지하거나 완료해 주세요.')
  const paused = pauseCardio(state, id, now)
  return edit(paused, id, a => { if (a.status === 'paused') a.status = 'review' })
}
export function cancelCardioReview(state: WorkoutState, id: string) {
  return edit(state, id, a => { if (a.status === 'review') a.status = 'paused' })
}
export function editCardioDraft(state: WorkoutState, id: string, draft: Partial<CardioActivity['draft']>) {
  return edit(state, id, a => { if (a.status === 'review') a.draft = { ...a.draft, ...draft } })
}
function optionalNumber(value: string, min: number, max: number, label: string, integer = false) {
  if (!value.trim()) return null
  const number = Number(value)
  if (!range(number, min, max) || (integer && !Number.isInteger(number))) throw new Error(`${label} 입력 범위를 확인해 주세요 (${min}–${max}).`)
  return number
}
export function confirmCardio(state: WorkoutState, id: string, now: number) {
  return edit(state, id, a => {
    if (a.status !== 'review') return
    if (!timestamp(now) || now < (a.pausedAt ?? 0)) throw new Error('완료 시각을 확인해 주세요.')
    const distance = supportsDistance(a.plan.kind) ? optionalNumber(a.draft.distance, .001, 1000, '실제 거리') : null
    const bpm = optionalNumber(a.draft.bpm, 20, 300, '수동 평균 심박수', true)
    const corrected = a.draft.correctedSeconds !== null
    const seconds = corrected ? optionalNumber(a.draft.correctedSeconds ?? '', 1, 86400, '실제 시간(초)', true) : null
    if (corrected && seconds === null) throw new Error('정정할 실제 시간을 입력해 주세요.')
    const activeMs = seconds === null ? a.accumulatedMs : seconds * 1000
    if (!range(activeMs, 1, 86400000)) throw new Error('실제 운동 시간은 0초 초과, 24시간 이하여야 합니다. 필요하면 시간을 정정해 주세요.')
    a.result = { timerMs: a.accumulatedMs, activeMs, corrected, distance, bpm, completedAt: now }
    a.status = 'completed'
  })
}
export function skipCardio(state: WorkoutState, id: string, now: number) {
  return edit(state, id, a => { a.accumulatedMs = cardioElapsed(a, now); a.runSince = null; a.status = 'skipped'; a.result = null; a.draft = { distance: '', bpm: '', correctedSeconds: null } }, true)
}

export function isCardioActivity(v: unknown, finished: boolean): v is CardioActivity {
  if (!object(v) || typeof v.id !== 'string' || !v.id || !isCardioPlan(v.plan) || !['ready', 'running', 'paused', 'review', 'completed', 'skipped'].includes(String(v.status)) || !range(v.accumulatedMs, 0, Number.MAX_SAFE_INTEGER) || !Number.isInteger(v.accumulatedMs) || !object(v.draft) || typeof v.draft.distance !== 'string' || typeof v.draft.bpm !== 'string' || !(v.draft.correctedSeconds === null || typeof v.draft.correctedSeconds === 'string')) return false
  if (![v.startedAt, v.runSince, v.pausedAt].every(t => t === null || timestamp(t))) return false
  if (v.status === 'running' ? v.runSince === null || v.startedAt === null : v.runSince !== null) return false
  if (v.status === 'ready' && (v.startedAt !== null || v.accumulatedMs !== 0 || v.pausedAt !== null)) return false
  if (['paused', 'review', 'completed'].includes(String(v.status)) && (v.startedAt === null || v.pausedAt === null)) return false
  if ((v.runSince !== null && Number(v.runSince) < Number(v.startedAt)) || (v.pausedAt !== null && Number(v.pausedAt) < Number(v.startedAt))) return false
  if (finished && !['completed', 'skipped'].includes(String(v.status))) return false
  if (v.status !== 'completed') return v.result === null
  const r = v.result
  return object(r) && range(r.timerMs, 0, Number.MAX_SAFE_INTEGER) && r.timerMs === v.accumulatedMs && range(r.activeMs, 1, 86400000) && typeof r.corrected === 'boolean' && (r.corrected || r.activeMs === r.timerMs) && optionalRange(r.distance, .001, 1000) && (supportsDistance(v.plan.kind) || r.distance === null) && optionalRange(r.bpm, 20, 300) && (r.bpm === null || Number.isInteger(r.bpm)) && timestamp(r.completedAt) && Number(r.completedAt) >= Number(v.pausedAt)
}
