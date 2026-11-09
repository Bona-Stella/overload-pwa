import type { Assignment } from '../features/statistics/weekly-schedule.ts'
import type { PresetSchedule, SchedulePreset } from '../features/workout-online/preset-schedule.ts'
import { canDeletePreset, presetLimit } from '../features/workout-online/preset-schedule.ts'
import { sameAssignments } from '../features/workout-online/routine-schedule.ts'

type RotationEntry = Pick<SchedulePreset, 'id' | 'included'>
export type ScheduleCommand =
  | { type: 'add'; id: string }
  | { type: 'rename'; id: string; name: string }
  | { type: 'activate'; id: string }
  | { type: 'delete'; id: string }
  | { type: 'assign'; id: string; version: string; assignments: Assignment[] }
  | { type: 'rotate'; enabled: boolean; entries: RotationEntry[] }

const nextVersion = (version: string) => String(BigInt(version) + 1n)
export const changedSchedule = (schedule: PresetSchedule) => ({ ...schedule, version: nextVersion(schedule.version) })

/** In-memory review responses. Time-based rotation and historical assessment belong to the backend. */
export function mockScheduleWrite(schedule: PresetSchedule, expectedVersion: string, command: ScheduleCommand, protectedView: boolean): PresetSchedule {
  if (protectedView) throw Error('디로딩 보호 중에는 일반 일정을 변경할 수 없습니다.')
  if (schedule.version !== expectedVersion) throw Error('다른 변경으로 일정 버전이 달라졌습니다. 최신 일정을 열어 다시 확인해 주세요.')
  const { presets } = schedule
  if (command.type === 'add') {
    if (presets.length >= presetLimit) throw Error('일정은 최대 4개까지 저장할 수 있습니다.')
    return { ...changedSchedule(schedule), presets: [...presets, { id: command.id, name: '새 주간 일정', version: '0', included: false, assignments: [] }] }
  }
  if (command.type === 'rotate') {
    const included = command.entries.filter(entry => entry.included)
    if (command.enabled && included.length < 2) throw Error('자동 순환을 켜려면 포함 일정이 최소 2개 필요합니다.')
    const changed = command.entries.some((entry, index) => entry.id !== presets[index].id || entry.included !== presets[index].included)
    if (!changed && command.enabled === schedule.autoEnabled) return schedule
    return {
      ...changedSchedule(schedule),
      autoEnabled: command.enabled,
      activeId: command.enabled ? included[0].id : schedule.activeId,
      presets: command.entries.map(entry => ({ ...presets.find(p => p.id === entry.id)!, included: entry.included })),
    }
  }
  const target = presets.find(p => p.id === command.id)
  if (!target) throw Error('일정이 삭제되었습니다. 최신 일정을 확인해 주세요.')
  if (command.type === 'activate') {
    if (schedule.autoEnabled) throw Error('자동 순환 중에는 수동 전환할 수 없습니다.')
    return target.id === schedule.activeId ? schedule : { ...changedSchedule(schedule), activeId: target.id }
  }
  if (command.type === 'delete') {
    if (!canDeletePreset(schedule, target)) throw Error('현재 일정은 삭제할 수 없습니다.')
    const remaining = presets.filter(p => p.id !== target.id)
    return { ...changedSchedule(schedule), presets: remaining, activeId: schedule.autoEnabled ? remaining.find(p => p.included)!.id : schedule.activeId }
  }
  if (command.type === 'rename') {
    if (target.name === command.name) return schedule
    return { ...changedSchedule(schedule), presets: presets.map(p => p === target ? { ...p, name: command.name } : p) }
  }
  if (target.version !== command.version) throw Error('요일 배정이 변경되었습니다. 최신 일정을 확인해 주세요.')
  if (sameAssignments(target.assignments, command.assignments)) return schedule
  return { ...schedule, presets: presets.map(p => p === target ? { ...p, version: nextVersion(p.version), assignments: command.assignments } : p) }
}

export function unassignRoutine(schedule: PresetSchedule, id: string): PresetSchedule {
  return { ...schedule, presets: schedule.presets.map(preset => {
    const assignments = preset.assignments.filter(a => a.routineId !== id)
    return assignments.length === preset.assignments.length ? preset : { ...preset, version: nextVersion(preset.version), assignments }
  }) }
}
