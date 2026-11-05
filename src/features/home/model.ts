import type { PlannedDay } from '../statistics/api.ts'
import type { CardioPlan, Routine } from '../workout-online/types.ts'

export const weekdays = ['월', '화', '수', '목', '금', '토', '일']
export function dateInZone(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  return ['year', 'month', 'day'].map(key => parts.find(p => p.type === key)!.value).join('-')
}
export function addDays(date: string, days: number) {
  const value = new Date(date + 'T12:00:00Z'); value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
export const dayOfWeek = (date: string) => (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7 + 1
export const weekDates = (date: string) => Array.from({ length: 7 }, (_, i) => addDays(date, i + 1 - dayOfWeek(date)))
export function dayStatus(day: PlannedDay | undefined, date: string, today: string) {
  if (!day || day.status === 'UNKNOWN' || day.status === 'UNVERIFIABLE') return { mark: '?', label: '확인 불가', kind: 'unknown' }
  if (day.status === 'BEFORE_REGISTRATION') return { mark: '·', label: '일정 등록 전', kind: 'unknown' }
  if (day.status === 'REST') return { mark: '–', label: '휴식', kind: 'rest' }
  if (date >= today) return { mark: String(Number(date.slice(8))), label: date === today ? '오늘 예정' : '예정', kind: 'planned' }
  if (day.effectiveDay === '1') return { mark: '✓', label: '완료', kind: 'complete' }
  if (day.effectiveDay === null) return { mark: '?', label: '달성 확인 불가', kind: 'unknown' }
  if (day.effectiveDay !== '0') return { mark: '△', label: '일부 달성', kind: 'partial' }
  // Zero achievement can include performed sets below the plan's threshold.
  return { mark: '×', label: day.selectedSessionId ? '계획 미달' : '미수행', kind: 'missed' }
}
export const activeWeights = (routine: Routine) => routine.weightPlacements.filter(p => p.deletedAt === null)
export const activeCardio = (routine: Routine) => routine.cardioPlacements.filter(p => p.deletedAt === null)
export function representativeExercises(routine: Routine) {
  return [...activeWeights(routine).map(p => p.exerciseName), ...activeCardio(routine).map(p => p.plan.name)].slice(0, 2).join(' · ') || '등록된 운동 없음'
}
export function cardioPlanLabel(plan: CardioPlan) {
  const duration = plan.targetSeconds % 60 === 0 ? `${plan.targetSeconds / 60}분` : `${Math.floor(plan.targetSeconds / 60)}분 ${plan.targetSeconds % 60}초`
  return [duration, plan.targetDistanceKm !== null ? `${plan.targetDistanceKm} km` : null,
    plan.intensity ? `${plan.intensity.value} ${plan.intensity.mode === 'SPEED' ? 'km/h' : '분/km'}` : null].filter(Boolean).join(' · ')
}
