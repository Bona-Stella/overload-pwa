import { WorkoutApi, WorkoutApiError } from '../../../src/features/workout-online/api.ts'
import type { WorkoutTransport } from '../../../src/features/workout-online/api.ts'
import type { CreateRoutine, UpdateRoutine, ClosedPage } from '../../../src/features/workout-online/types.ts'
import { GrowthApi } from '../../../src/features/statistics/growth.ts'
import type { GrowthPeriod } from '../../../src/features/statistics/growth.ts'
import { StatisticsApi } from '../../../src/features/statistics/api.ts'
import type { Overview, Period } from '../../../src/features/statistics/api.ts'
import { activeWeights, dayOfWeek } from '../../../src/features/home/model.ts'
import { newId } from '../../../src/id.ts'
import { changedSchedule, mockScheduleWrite, unassignRoutine } from './preset-mock.ts'
import { mockSaveRoutine } from './routine-mock.ts'
import { exercises, manufacturers, reviewHome, reviewSample, reviewToday, scope } from './routine-samples.ts'
import { reviewRest } from './workout-model.ts'

export type ReadExample = 'normal' | 'delayed' | 'failed' | 'empty'
type WriteExample = 'normal' | 'failed' | 'conflict'
export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
export const ignore = () => {}
const netError = () => new TypeError('Preview response unavailable')
const disconnected = { workoutRequest: async () => { throw netError() } }
const response = (data: unknown, status = 200) => ({ data, status, contentType: 'application/json', requestId: null })

export function createPageExample(initialSchedule: ReadExample = 'normal') {
  const sample = reviewSample('normal'), rest = { ...reviewRest }
  const first = sample.routines[0]
  let { routines, schedule } = sample
  const assignments = schedule.presets[0].assignments
  if (!assignments.some(value => value.dayOfWeek === dayOfWeek(reviewToday))) assignments.push({ dayOfWeek: dayOfWeek(reviewToday), routineId: first.id })
  const historical = sample.sessions[1]
  const recent = { ...historical, workoutDate: reviewToday,
    startedAt: reviewToday + 'T02:00:00Z', endedAt: reviewToday + 'T03:00:00Z', closedAt: reviewToday + 'T03:00:00Z' }
  const summary = { ...recent, routineName: recent.initialPlan.routineName, status: 'FINISHED' as const }
  const modes = { routines: 'normal', details: 'normal', schedule: initialSchedule, records: 'normal', growthSearch: 'normal', growthDetails: 'normal' } as Record<string, ReadExample>
  const writes = { routines: 'normal', schedule: 'normal', rest: 'normal' } as Record<string, WriteExample>
  const wait = async (key: string) => {
    const mode = modes[key]
    if (mode === 'delayed') await sleep(3600)
    if (mode === 'failed') { modes[key] = 'normal'; throw netError() }
    return mode
  }
  let changedVersion = false
  const listed = () => (modes.routines === 'empty' ? [] : routines).map(routine => ({ ...routine, createdAt: routine.createdAt }))
  const update = (body: CreateRoutine | UpdateRoutine, id?: string) => {
    if (writes.routines === 'failed') { writes.routines = 'normal'; throw netError() }
    const result = mockSaveRoutine(body, routines.find(routine => routine.id === id))
    routines = [...routines.filter(routine => routine.id !== result.id), result]
    return structuredClone(result)
  }
  const api = Object.assign(new WorkoutApi(disconnected), {
    bootstrap: async () => { await wait('routines'); return { scope, routines: listed(), exercises, manufacturers, settings: { ...scope, ...rest } } },
    active: async () => ({ ...scope, session: null }),
    routine: async (_scope: unknown, id: string) => {
      if (modes.details === 'delayed') await sleep(3600)
      if (modes.details === 'failed') throw netError()
      const result = routines.find(routine => routine.id === id)
      if (!result) throw new WorkoutApiError('ROUTINE_NOT_FOUND', 404)
      if (changedVersion) { changedVersion = false; result.version = String(BigInt(result.version) + 1n) }
      return structuredClone(result)
    },
    exerciseDetail: async (_user: string, id: string) => exercises.find(item => item.id === id),
    routines: async () => ({ ...scope, routines: listed() }),
    createRoutine: async (_scope: unknown, body: CreateRoutine) => update(body),
    updateRoutine: async (_scope: unknown, id: string, body: UpdateRoutine) => update(body, id),
    deleteRoutine: async (_scope: unknown, id: string) => {
      await sleep(950)
      if (writes.routines === 'failed') { writes.routines = 'normal'; throw netError() }
      schedule = unassignRoutine(schedule, id)
      routines = routines.filter(routine => routine.id !== id)
    },
    closed: async () => ({ ...scope, sessions: await wait('records') === 'empty' ? [] : [summary], next: null } satisfies ClosedPage),
    detail: async () => structuredClone(recent),
    settings: async (_scope: unknown, values: typeof rest) => {
      await sleep(650)
      const fault = writes.rest
      writes.rest = 'normal'
      if (fault === 'conflict') { rest.restLowSeconds = 150; throw new WorkoutApiError('WRITE_CONFLICT', 409) }
      if (fault === 'failed') throw netError()
      Object.assign(rest, values)
      return { ...rest }
    },
    restSettings: async () => ({ ...rest }),
  })
  const transport: WorkoutTransport = {
    async workoutRequest(_owner, path, method, body) {
      if (path === '/api/v1/deload-periods/current') return response({ ...scope, period: null })
      if (path === '/api/v1/deload-analysis') return response({ ...scope, enabled: true, calculationStatus: 'READY', confirmedWeeks: null, recommendationThreshold: { numerator: '1', denominator: '1' } })
      if (!path.startsWith('/api/v1/weekly-schedule')) throw netError()
      let status = 200
      if (method === 'GET') await wait('schedule')
      else {
        await sleep(500)
        const fault = writes.schedule
        writes.schedule = 'normal'
        if (fault === 'conflict') { schedule = changedSchedule(schedule); throw new WorkoutApiError('SCHEDULE_STATE_VERSION_CONFLICT', 409) }
        if (fault === 'failed') throw netError()
        const parts = path.split('/'), id = parts[5], expected = schedule.version
        const input = body as { assignments: typeof assignments; name: string; presetId: string; autoEnabled: boolean; presets: { id: string; rotationIncluded: boolean }[] }
        if (path.endsWith('/assignments')) schedule = mockScheduleWrite(schedule, expected,
          { type: 'assign', id, version: schedule.presets.find(preset => preset.id === id)!.version, assignments: input.assignments }, false)
        else if (path.endsWith('/rotation')) schedule = mockScheduleWrite(schedule, expected,
          { type: 'rotate', entries: input.presets.map(p => ({ id: p.id, included: p.rotationIncluded })), enabled: input.autoEnabled }, false)
        else if (path.endsWith('/name')) schedule = mockScheduleWrite(schedule, expected, { type: 'rename', id, name: input.name }, false)
        else if (path.endsWith('/active')) schedule = mockScheduleWrite(schedule, expected, { type: 'activate', id: input.presetId }, false)
        else if (method === 'DELETE') schedule = mockScheduleWrite(schedule, expected, { type: 'delete', id }, false)
        else { schedule = mockScheduleWrite(schedule, expected, { type: 'add', id: newId() }, false); status = 201 }
      }
      return response({ dataGeneration: scope.dataGeneration, stateVersion: schedule.version, activePresetId: schedule.activeId,
        autoEnabled: schedule.autoEnabled, timeZone: 'Asia/Seoul', appliedScheduleVersion: schedule.version, appliedAt: historical.endedAt,
        nextRotationAt: null, presets: schedule.presets.map((preset, index) => ({ ...preset, displayOrder: index + 1,
          presetVersion: preset.version, rotationIncluded: preset.included })) }, status)
    },
  }
  const statistics = Object.assign(new StatisticsApi(disconnected), { overview: async (_scope: unknown, period: Period): Promise<Overview> => ({
    statistics: { ...scope, ...period, planCoverage: 'FULL_SCHEDULE_HISTORY', plannedWorkoutDays: null, routineAchievementPercent: null,
      summary: { plannedSets: '0', completedSets: '0', reps: '0', volumeLoadKg: null, setsWithoutVolume: '0' },
      cardioActiveMs: '0', unmappedCompletedSets: '0', days: [], exercises: [], groups: [], muscles: [], groupActuals: [], cardio: [], recentSessions: [] },
    effectiveWorkoutDays: null, unknownPlanDays: 0, unverifiableDays: 0, plannedDays: reviewHome({ ...sample, schedule, routines }).overview!.plannedDays, cardioByKind: [],
  }) })
  const placed = activeWeights(first)[0], lastApprovalAt = recent.endedAt!, leaf = { standardExerciseId: placed.standardExerciseId,
    name: placed.exerciseName, lastPerformedAt: lastApprovalAt, lastApprovalAt }
  const placement = { routineId: first.id, placementId: placed.id, routineName: first.name, deleted: false, lastApprovalAt }
  const growthEnvelope = (period: GrowthPeriod, timeZone: string) => ({ ...scope, period, range: { fromDate: null, toDateExclusive: reviewToday, timeZone } })
  const growth = Object.assign(new GrowthApi(disconnected), {
    search: async (_scope: unknown, period: GrowthPeriod, zone: string, query: string, offset: number) => {
      await wait('growthSearch')
      return { ...growthEnvelope(period, zone), query, offset, exercises: leaf.name.includes(query) ? [leaf] : [], nextOffset: null }
    },
    options: async (_scope: unknown, _id: string, period: GrowthPeriod, zone: string) => {
      await wait('growthDetails')
      return { ...growthEnvelope(period, zone), ...leaf, placements: [placement] }
    },
    history: async (_scope: unknown, _id: string, _placement: unknown, period: GrowthPeriod, zone: string, offset: number) => ({ ...growthEnvelope(period, zone),
      standardExerciseId: leaf.standardExerciseId, placement, offset, points: [{ id: placed.id, previousWeightKg: '25', approvedWeightKg: '27.5', occurredAt: lastApprovalAt,
        recordedAt: lastApprovalAt, source: 'WORKOUT', sessionId: recent.id, connectFromPrevious: false, previousPointId: null }], nextOffset: null }),
  })
  return { api: api as WorkoutApi, transport, statistics, growth: growth as GrowthApi,
    setRead: (key: string, mode: ReadExample) => { modes[key] = mode }, setWrite: (key: string, mode: WriteExample) => { writes[key] = mode },
    routines: listed, first, presetId: schedule.activeId, versionChanged: () => { changedVersion = true },
    updateRoutineVersion: () => { routines = routines.map(value => value.id === first.id ? { ...value, version: String(BigInt(value.version) + 1n) } : value) },
    store: { deviceId: async () => recent.editorDeviceId, attempt: async () => null, copies: async () => [],
      prepareStart: async () => { throw netError() }, saveSession: async () => {} } }
}
