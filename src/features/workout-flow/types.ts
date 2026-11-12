
import type { CardioPlan, CardioResult, Equipment } from '../workout-online/types.ts'

export type RestAlerts = { flash: boolean; threshold: 5 | 10; sound: boolean }
export type WeightMode = 'approved' | 'today' | 'progression'
export type SetDraft = { kg: string; reps: string; additional: string }
export type SetResult = Equipment & { kg: string; reps: number; additionalKg: string | null; mode: WeightMode; at: number }
export type SetRow = { id: number; draft: SetDraft; previous?: SetDraft; result?: SetResult }
export type WeightFocusData = Equipment & {
  id: string; standardId: string; name: string; min: number; max: number
  working: string; approved: string | null; mode: WeightMode; sets: SetRow[]; memo: string
}
export type CardioDraft = { distance: string; speed: string; bpm: string; correctedSeconds: string | null }
export type ActualCardio = Extract<CardioResult, { status: 'COMPLETED' }>['result']
export type CardioFocusData = {
  id: string; plan: CardioPlan; phase: 'ready' | 'running' | 'paused' | 'review' | 'completed'
  draft: CardioDraft; result?: ActualCardio
}
export const cardioPhaseLabel: Record<CardioFocusData['phase'], string> = {
  ready: '유산소 준비', running: '유산소 진행 중', paused: '유산소 일시정지',
  review: '유산소 완료 확인', completed: '유산소 완료',
}
export type WeightAdvice = { text: string; advice?: 'increase' | 'decrease' | 'maintain'; kg?: string; reps?: string }
