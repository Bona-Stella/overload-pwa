import type { Equipment, Manufacturer } from './types.ts'

export const LOAD_LABELS = { PLATE: '원판식', STACK: '핀·스택식', DUMBBELL: '덤벨', BODYWEIGHT: '맨몸' }
export function equipmentLabel(value: Equipment, manufacturers: Manufacturer[] = []) {
  return `${value.manufacturerId ? manufacturers.find(m => m.id === value.manufacturerId)?.name ?? '현재 목록에 없는 제조사' : '제조사 미지정'} · ${value.loadType ? LOAD_LABELS[value.loadType] : '부하 미지정'}`
}
