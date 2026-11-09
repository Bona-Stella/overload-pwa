import type { Scope } from '../workout-online/types.ts'
import type { WorkoutTransport } from '../workout-online/api.ts'
import { WorkoutApiError } from '../workout-online/api.ts'
import * as v from '../workout-online/validation.ts'
import { normalizePresetName, presetLimit, presetNumber, validPresetName } from '../workout-online/preset-schedule.ts'
import type { PresetSchedule, ScheduleCommand } from '../workout-online/preset-schedule.ts'

export type Assignment = { dayOfWeek: number; routineId: string }
export type LiveSchedule = PresetSchedule & {
  timeZone: string | null
  appliedVersion: string | null
  appliedAt: string | null
  nextRotationAt: string | null
  renameSupported: boolean
}

const root = '/api/v1/weekly-schedule'
const nullableString = (value: unknown, guard: (x: unknown) => boolean): value is string | null =>
  value === null || typeof value === 'string' && guard(value)
export function timeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value) return false
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false }
}
function assignments(value: unknown): value is Assignment[] {
  return v.array(value, a => v.object(a) && Number.isInteger(a.dayOfWeek) && Number(a.dayOfWeek) >= 1 &&
    Number(a.dayOfWeek) <= 7 && v.uuid(a.routineId))
    && value.length <= 7 && new Set(value.map(a => (a as Assignment).dayOfWeek)).size === value.length
}
type ServerPreset = { id: string; displayOrder: number; presetVersion: string; rotationIncluded: boolean; assignments: Assignment[]; name?: string }
function preset(value: unknown): value is ServerPreset {
  return v.object(value) && v.uuid(value.id) && Number.isInteger(value.displayOrder) && v.counter(value.presetVersion) &&
    typeof value.rotationIncluded === 'boolean' && assignments(value.assignments) &&
    (value.name === undefined || typeof value.name === 'string' && validPresetName(value.name) && normalizePresetName(value.name) === value.name)
}
function checked(scope: Scope, result: { status: number; data: unknown }, expected: number): LiveSchedule {
  const { status, data } = result
  if (status !== expected || !v.object(data) || !v.counter(data.dataGeneration) || !v.counter(data.stateVersion) ||
    !v.uuid(data.activePresetId) || typeof data.autoEnabled !== 'boolean' || !nullableString(data.timeZone, timeZone) ||
    !nullableString(data.appliedScheduleVersion, v.counter) || !nullableString(data.appliedAt, v.instant) ||
    !nullableString(data.nextRotationAt, v.instant) || !v.array(data.presets, preset) || data.presets.length < 1 || data.presets.length > presetLimit) {
    throw new WorkoutApiError('RESPONSE_INVALID', status)
  }
  // V30 derives the owner from the session; workoutRequest guards the account before and after the request.
  if (data.dataGeneration !== scope.dataGeneration) throw new WorkoutApiError('DATA_GENERATION_MISMATCH', 409)
  const presets = data.presets as ServerPreset[]
  if (new Set(presets.map(p => p.id)).size !== presets.length || !presets.some(p => p.id === data.activePresetId) ||
    presets.some((p, i) => p.displayOrder !== i + 1) || (data.appliedScheduleVersion === null) !== (data.appliedAt === null)) {
    throw new WorkoutApiError('RESPONSE_INVALID', status)
  }
  return {
    version: data.stateVersion, activeId: data.activePresetId, autoEnabled: data.autoEnabled,
    timeZone: data.timeZone, appliedVersion: data.appliedScheduleVersion, appliedAt: data.appliedAt, nextRotationAt: data.nextRotationAt,
    renameSupported: presets.every(p => p.name !== undefined),
    presets: presets.map(p => ({
      id: p.id, name: p.name ?? presetNumber(p.displayOrder - 1) + ' 주간 일정', version: p.presetVersion,
      included: p.rotationIncluded, assignments: p.assignments,
    })),
  }
}

export class WeeklyScheduleApi {
  private readonly transport: WorkoutTransport
  constructor(transport: WorkoutTransport) { this.transport = transport }
  async read(scope: Scope, signal: AbortSignal) {
    return checked(scope, await this.transport.workoutRequest(scope.userId, root, 'GET', undefined, signal), 200)
  }
  async write(scope: Scope, base: LiveSchedule, command: ScheduleCommand, signal: AbortSignal) {
    const version = { dataGeneration: scope.dataGeneration, expectedStateVersion: base.version }
    const zone = { timeZone: base.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone }
    const request = async (method: string, path: string, body: object, status = 200) =>
      checked(scope, await this.transport.workoutRequest(scope.userId, root + path, method, body, signal), status)
    switch (command.type) {
      case 'add': return request('POST', '/presets', version, 201)
      case 'activate':
        if (!v.uuid(command.id)) throw new WorkoutApiError('INVALID_REQUEST', 400)
        return request('PUT', '/active', { ...version, ...zone, presetId: command.id })
      case 'rotate':
        return request('PUT', '/rotation', {
          ...version, ...zone, autoEnabled: command.enabled,
          presets: command.entries.map(({ id, included }) => ({ id, rotationIncluded: included })),
        })
      case 'assign':
      case 'rename':
      case 'delete': {
        const preset = base.presets.find(p => p.id === command.id)
        if (!preset || !v.uuid(preset.id)) throw new WorkoutApiError('PRESET_NOT_FOUND', 404)
        const path = '/presets/' + preset.id
        if (command.type === 'delete') return request('DELETE', path, { ...version, expectedPresetVersion: preset.version })
        if (command.type === 'rename') {
          const name = normalizePresetName(command.name)
          if (!base.renameSupported || !validPresetName(name)) throw new WorkoutApiError('INVALID_REQUEST', 400)
          const saved = await request('PUT', path + '/name', { ...version, expectedPresetVersion: preset.version, name })
          if (!saved.renameSupported || saved.presets.find(p => p.id === preset.id)?.name !== name) throw new WorkoutApiError('RESPONSE_INVALID')
          return saved
        }
        if (!assignments(command.assignments)) throw new WorkoutApiError('INVALID_REQUEST', 400)
        return request('PUT', path + '/assignments', { ...version, ...zone, expectedPresetVersion: command.version, assignments: command.assignments })
      }
    }
  }
}

export function scheduleIssue(error: unknown) {
  const code = error instanceof Error && 'code' in error ? error.code : null
  switch (code) {
    case 'ACTIVE_SESSION_EXISTS': return '진행 중인 운동을 종료하고 저장 상태를 확인한 뒤 변경해 주세요.'
    case 'SCHEDULE_STATE_VERSION_CONFLICT':
    case 'PRESET_VERSION_CONFLICT':
    case 'SCHEDULE_TIME_ZONE_CONFLICT': return '일정이 다른 화면에서 변경되었습니다. 입력은 유지됩니다. 최신 일정을 다시 열어 주세요.'
    case 'DELOAD_ACTIVE_PERIOD': return '디로딩 진행 중이거나 완료 당일에는 일반 루틴과 일정을 변경할 수 없습니다.'
    case 'ROTATION_REQUIRES_TWO_PRESETS': return '자동 순환에는 포함 일정이 최소 2개 필요합니다.'
    case 'AUTO_ROTATION_ENABLED': return '자동 순환 중에는 수동으로 전환할 수 없습니다.'
    case 'PRESET_LIMIT_REACHED': return '일정은 최대 4개까지 만들 수 있습니다.'
    case 'ACTIVE_PRESET':
    case 'LAST_PRESET': return '현재 적용된 일정이나 마지막 일정은 삭제할 수 없습니다.'
    case 'PRESET_STATE_MISSING': return '이 계정의 주간 일정 상태를 찾을 수 없습니다.'
    case 'PRESET_NOT_FOUND': return '이 일정을 찾을 수 없습니다. 최신 일정을 다시 조회해 주세요.'
    case 'CSRF_INVALID':
    case 'CSRF_REQUIRED': return '보안 확인이 만료됐습니다. 최신 일정을 확인한 뒤 다시 시도해 주세요.'
    default: return '일정 변경을 확인하지 못했습니다. 입력은 유지됩니다. 최신 일정을 확인해 주세요.'
  }
}
