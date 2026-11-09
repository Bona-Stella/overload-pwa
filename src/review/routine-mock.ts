import type { CreateRoutine, Routine, UpdateRoutine, WeightNew, WeightPlacement } from '../features/workout-online/types.ts'
import { exercises, scope } from './routine-samples.ts'

export function mockSaveRoutine(body: CreateRoutine | UpdateRoutine, current?: Routine): Routine {
  const update = 'expectedVersion' in body ? body : null
  if (update && current?.version !== update.expectedVersion) throw Error('루틴 버전이 달라졌습니다. 최신 루틴을 다시 열어 주세요.')
  const now = new Date().toISOString()
  const createPlacement = (p: WeightNew): WeightPlacement => ({
    ...p, exerciseName: exercises.find(e => e.id === p.standardExerciseId)!.name, approvedWeightKg: p.initialWeightKg, deletedAt: null,
  })
  const weight = body.weightPlacements.map(p => {
    if (!('mode' in p)) return createPlacement(p)
    const { mode, ...placement } = p
    if (mode === 'NEW' && 'initialWeightKg' in placement) return createPlacement(placement)
    const original = current?.weightPlacements.find(item => item.id === p.id)
    if (!original) throw Error('저장된 운동 배치를 확인하지 못했습니다.')
    const approved = update?.weightApprovals.find(a => a.placementId === p.id)?.nextApprovedWeightKg
    return { ...original, ...placement, approvedWeightKg: approved ?? original.approvedWeightKg, deletedAt: null }
  })
  const cardio = body.cardioPlacements.map(p => ({ id: p.id, plan: p.plan, deletedAt: null }))
  return {
    ...scope, id: current?.id ?? ('id' in body ? body.id : ''), version: current ? String(BigInt(current.version) + 1n) : '1',
    name: body.name.trim(), tag: body.tag, createdAt: current?.createdAt ?? now,
    weightPlacements: [...weight, ...(current?.weightPlacements ?? []).filter(p => !weight.some(next => next.id === p.id)).map(p => ({ ...p, deletedAt: p.deletedAt ?? now }))],
    cardioPlacements: [...cardio, ...(current?.cardioPlacements ?? []).filter(p => !cardio.some(next => next.id === p.id)).map(p => ({ ...p, deletedAt: p.deletedAt ?? now }))],
  }
}
