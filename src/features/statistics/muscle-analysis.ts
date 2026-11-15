import {sumDecimals,displayDecimal} from './display-decimal.ts'
import type { Routine, StandardExercise, StandardExerciseDetail } from '../workout-online/types.ts'
import type { SchedulePreset } from '../workout-online/preset-schedule.ts'
import type { Statistics } from './api.ts'

export const muscleGroups: Record<string, string> = { CHEST: '가슴', BACK: '등', SHOULDERS: '어깨', ARMS: '팔', LEGS: '하체', CORE: '코어' }
export type AnalysisRow = { id: string; name: string; group: string; actual: string | null; planned: string | null; planState?: 'none' | 'unknown'; volume: string | null; minimum?: number; maximum?: number }
export type AnalysisData = { muscles: AnalysisRow[]; frontBack: AnalysisRow[]; ppl: AnalysisRow[]; groups: AnalysisRow[]; total: string; issues: string[] }
export const halfString = (value: bigint) => `${value / 2n}${value % 2n ? '.5' : ''}`
const base = (id: string, name: string, group = ''): AnalysisRow => ({ id, name, group, actual: null, planned: '0', volume: null })

/** Current repeating-plan presentation only. Never used for official completion or G4. */
export function plannedAnalysis(preset: SchedulePreset, routines: Map<string, Routine>, catalog: StandardExerciseDetail[], knownMuscles: NonNullable<StandardExercise['muscles']> = []): AnalysisData {
  const muscles = new Map<string, AnalysisRow>(), halves = new Map<string, bigint>()
  const frontBack = [base('FRONT', '전면'), base('BACK', '후면')], ppl = [base('PUSH', 'PUSH'), base('PULL', 'PULL'), base('LEGS', 'LEGS')]
  const groups = Object.entries(muscleGroups).map(([id, name]) => ({ ...base(id, name), planned: null }))
  const issues = new Set<string>(); let total = 0n
  let missingPlan = false, missingMuscles = false, missingFront = false, missingPpl = false
  for (const muscle of knownMuscles) muscles.set(muscle.id, base(muscle.id, muscle.name, muscle.groupCode))
  for (const exercise of catalog) for (const muscle of [...exercise.primaryMuscles, ...exercise.secondaryMuscles]) {
    if (!muscles.has(muscle.id)) muscles.set(muscle.id, base(muscle.id, muscle.name, muscle.groupCode))
  }
  for (const assignment of preset.assignments) {
    const routine = routines.get(assignment.routineId)
    if (!routine) { missingPlan = true; issues.add('일부 배정 루틴의 현재 계획을 확인하지 못했습니다.'); continue }
    for (const plan of routine.weightPlacements.filter(p => !p.deletedAt)) {
      const count = BigInt(plan.setCount); total += count
      const exercise = catalog.find(e => e.id === plan.standardExerciseId)
      if (!exercise) { missingMuscles = true; missingFront = true; missingPpl = true; issues.add('일부 운동의 검수 분류·근육 매핑을 확인하지 못했습니다.'); continue }
      const front = frontBack.find(r => r.id === exercise.frontBackSplit), split = ppl.find(r => r.id === exercise.pplSplit)
      if (front) front.planned = String(BigInt(front.planned!) + count); else { missingFront = true; issues.add('전면/후면 분류가 없는 운동이 있습니다.') }
      if (split) split.planned = String(BigInt(split.planned!) + count); else { missingPpl = true; issues.add('PPL 분류가 없는 운동이 있습니다.') }
      if (!exercise.primaryMuscles.length) missingMuscles = true
      for (const muscle of exercise.primaryMuscles) halves.set(muscle.id, (halves.get(muscle.id) ?? 0n) + count * 2n)
      for (const muscle of exercise.secondaryMuscles) if (!exercise.primaryMuscles.some(m => m.id === muscle.id)) halves.set(muscle.id, (halves.get(muscle.id) ?? 0n) + count)
    }
  }
  if (missingPlan || missingFront) frontBack.forEach(row => { row.planned = null })
  if (missingPlan || missingPpl) ppl.forEach(row => { row.planned = null })
  for (const row of muscles.values()) row.planned = missingPlan || missingMuscles ? null : halfString(halves.get(row.id) ?? 0n)
  issues.add('일부 부위 분류·전체 근육 목록과 권장 범위는 확인 중입니다. 확인된 항목만 표시합니다.')
  return { muscles: [...muscles.values()], frontBack, ppl, groups, total: missingPlan ? '—' : String(total), issues: [...issues] }
}

export function actualAnalysis(statistics: Statistics): AnalysisData {
  const muscles = new Map<string, AnalysisRow>()
  for (const m of statistics.muscles) {
    const row = muscles.get(m.id) ?? { ...base(m.id, m.name, m.groupCode), actual: '0', planned: statistics.planCoverage==='FULL_SCHEDULE_HISTORY'?'0':null }
    const toHalves = (s: string) => { const [whole, fraction] = s.split('.'); return BigInt(whole) * 2n + (fraction === '5' ? 1n : 0n) }
    row.actual = halfString(toHalves(row.actual!) + toHalves(m.contributionSets))
    if(row.planned!==null)row.planned=halfString(toHalves(row.planned)+BigInt(m.weights.plannedSets)*(m.role==='PRIMARY'?2n:1n))
    // Existing volume policy is PRIMARY participation, without the contribution coefficient.
    if (m.role === 'PRIMARY') row.volume = m.weights.volumeLoadKg
    muscles.set(m.id, row)
  }
  for(const row of muscles.values())if(row.planned==='0'){row.planned=null;row.planState='none'}else if(row.planned===null)row.planState='unknown'
  return { muscles: [...muscles.values()], frontBack: [base('FRONT', '전면'), base('BACK', '후면')].map(r => ({ ...r, planned: null })),
    ppl: [base('PUSH', 'PUSH'), base('PULL', 'PULL'), base('LEGS', 'LEGS')].map(r => ({ ...r, planned: null })),
    groups: Object.entries(muscleGroups).map(([id, name]) => ({ ...base(id, name), planned: null })), total: statistics.summary.completedSets,
    issues: [statistics.planCoverage==='FULL_SCHEDULE_HISTORY'?'근육별 실제 기여와 당시 계획을 표시합니다. 분류별 독립 집계는 아직 확인할 수 없습니다.':'실제 근육 기여를 표시합니다. 분류별 값과 당시 계획은 아직 확인할 수 없습니다.'] }
}

/** Visible detailed-muscle contribution sums only, never classification or volume totals. */
export function muscleSubtotal(rows:AnalysisRow[]){
 const actual=rows.some(r=>r.actual===null)?'확인 불가':displayDecimal(sumDecimals(rows.map(r=>r.actual!)))
 const planned=rows.every(r=>r.planned===null&&r.planState==='none')?'—':rows.some(r=>r.planned===null&&r.planState!=='none')?'확인 불가':displayDecimal(sumDecimals(rows.flatMap(r=>r.planned===null?[]:[r.planned])))
 return actual+' / '+planned+'세트'
}
