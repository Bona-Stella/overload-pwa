import { cardioGoalValues } from '../workout-online/cardio-draft.ts'
import type { PlannedDay } from '../statistics/api.ts'
import type { CardioPlan, Routine } from '../workout-online/types.ts'
import type { PartialResult } from '../statistics/display-achievement.ts'

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
export function dayStatus(day: PlannedDay | undefined, date: string, today: string, partial: PartialResult = 'unknown') {
  const weekday = weekdays[dayOfWeek(date) - 1]
  if (day?.status === 'PENDING') return { mark: weekday, label: '운동 진행 중 · 판정 대기', kind: 'unknown' }
  if (!day || day.status === 'UNKNOWN' || day.status === 'UNVERIFIABLE') return { mark: weekday, label: '확인 불가', kind: 'unknown' }
  if (day.status === 'BEFORE_REGISTRATION') return { mark: weekday, label: '일정 등록 전', kind: 'unknown' }
  if (date > today) return { mark: weekday, label: '예정', kind: 'planned' }
  if (day.status === 'REST') return { mark: '–', label: '휴식', kind: 'rest' }
  if (day.reviewStatus === 'PENDING' || day.reviewStatus === 'PENDING_ACTIVE' || day.reviewStatus === 'UNKNOWN') return { mark:weekday, label:day.reviewStatus === 'PENDING_ACTIVE' ? '운동 진행 중 · 판정 대기' : '검사 대기', kind:'unknown' }
  if (day.effectiveDay === '1') return { mark: '✓', label: '완료', kind: 'complete' }
  if (day.effectiveDay === null) {
    const scheduledToday = date === today && day.plan && day.reviewStatus === null && day.selectedSessionId === null
    return { mark: weekday, label: scheduledToday ? '오늘 예정' : '달성 확인 불가', kind: 'unknown' }
  }
  if (partial === 'met') return { mark: '△', label: '부분 달성', kind: 'partial' }
  if (partial === 'below') return { mark: '×', label: '부분 달성 기준 미달', kind: 'missed' }
  if (day.reviewStatus !== 'PERFORMED' && day.reviewStatus !== 'MISSED') return { mark: weekday, label: date === today ? '오늘 예정' : '검사 대기', kind: 'unknown' }
  // Zero achievement can include performed sets below the plan's threshold.
  return day.reviewStatus === 'MISSED' && !day.selectedSessionId ? { mark: '×', label: '미수행', kind: 'missed' } : { mark: weekday, label: '부분 달성 근거 확인 필요', kind: 'unknown' }
}
export const activeWeights = (routine: Routine) => routine.weightPlacements.filter(p => p.deletedAt === null)
export const activeCardio = (routine: Routine) => routine.cardioPlacements.filter(p => p.deletedAt === null)
export function representativeExercises(routine: Routine) {
  return [...activeWeights(routine).map(p => p.exerciseName), ...activeCardio(routine).map(p => p.plan.name)].slice(0, 2).join(' · ') || '등록된 운동 없음'
}
export function cardioPlanLabel(plan: CardioPlan) {
  return cardioGoalValues(plan).flatMap(({ value, unit }) => value === null ? [] : [unit ? value + ' ' + unit : value]).join(' · ')
}
