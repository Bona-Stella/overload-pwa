import type { Assignment } from '../statistics/weekly-schedule.ts'

export const presetLimit = 4
export type SchedulePreset = {
  id: string
  name: string
  version: string
  included: boolean
  assignments: Assignment[]
}
export type PresetSchedule = {
  version: string
  activeId: string
  autoEnabled: boolean
  presets: SchedulePreset[]
}
export type ScheduleCommand =
  | { type: 'add' }
  | { type: 'activate'; id: string }
  | { type: 'delete'; id: string }
  | { type: 'rename'; id: string; name: string }
  | { type: 'assign'; id: string; version: string; assignments: Assignment[] }
  | { type: 'rotate'; enabled: boolean; entries: Pick<SchedulePreset, 'id' | 'included'>[] }
export const presetNumber = (index: number) => String(index + 1).padStart(2, '0')
export const presetNameLimit = 100
export const normalizePresetName = (value: string) => value.replace(/^[\p{White_Space}\uFEFF]+|[\p{White_Space}\uFEFF]+$/gu, '')
export const validPresetName = (name: string) =>
  name.length > 0 && Array.from(name).length <= presetNameLimit && !/[\p{Cc}\p{Cs}]/u.test(name)
export const canDeletePreset = (schedule: PresetSchedule, preset: SchedulePreset) =>
  schedule.presets.length > 1 && preset.id !== schedule.activeId &&
  (!schedule.autoEnabled || schedule.presets.filter(p => p.id !== preset.id && p.included).length >= 2)
