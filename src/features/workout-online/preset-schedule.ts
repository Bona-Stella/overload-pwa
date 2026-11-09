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
export const presetNumber = (index: number) => String(index + 1).padStart(2, '0')
export const canDeletePreset = (schedule: PresetSchedule, preset: SchedulePreset) =>
  schedule.presets.length > 1 && preset.id !== schedule.activeId &&
  (!schedule.autoEnabled || schedule.presets.filter(p => p.id !== preset.id && p.included).length >= 2)
