import { createContext, useContext } from 'react'
import type { Session, StandardExercise } from '../workout-online/types.ts'
import type { AnalysisData } from './muscle-analysis.ts'
import type { CardioTotal, Period, Overview } from './api.ts'

export type ActivityPreview = {
  period: Period
  achievement: Pick<Overview, 'plannedDays' | 'effectiveWorkoutDays'> & { plannedWorkoutDays: number; routineAchievementPercent: string }
  evidence: Session[]
  cardio: { activeMs: string; days: number; totals: CardioTotal[]; weekdays: ReadonlyMap<string, string> }
}

/** Explicit, in-memory review inputs. No authenticated transport uses this context. */
export type RecordPreviewData = {
  source: 'synthetic-preview'
  activity?: ActivityPreview
  today: string
  sessions: Session[]
  evidence: Session[]
  definitions: StandardExercise[]
  overview: (range: Period) => Overview
  plan: (preset: string) => AnalysisData
  actual: AnalysisData
  trend: (range: Period, selected: string, metric: string) => number[]
  growth: { exerciseId: string; sessionId: string; date: string; kg: string; previousKg: string }[]
}
export const RecordDisplayContext = createContext<RecordPreviewData | null>(null)
export const useRecordPreview = () => useContext(RecordDisplayContext)
