import { createInitialState } from './model.ts'
import type { WorkoutState } from './types.ts'

export const STORAGE_KEY = 'overload.core.v1'
export type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string'
const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
const integer = (v: unknown): v is number => number(v) && Number.isSafeInteger(v)
const positive = (v: unknown): v is number => integer(v) && v > 0
const list = (v: unknown, check: (item: unknown) => boolean): v is unknown[] => Array.isArray(v) && v.every(check)
const dictionary = (v: unknown, check: (item: unknown) => boolean) => record(v) && Object.values(v).every(check)
const unique = (items: unknown[]) => new Set(items.map(item => record(item) ? item.id : null)).size === items.length

function routineExercise(v: unknown) {
  return record(v) && text(v.id) && text(v.exerciseId) && positive(v.setCount) && positive(v.minReps) && positive(v.maxReps) && v.maxReps >= v.minReps && number(v.initialWeight)
}

function workoutExercise(v: unknown) {
  if (record(v) && v.plannedSetCount !== undefined && (!positive(v.plannedSetCount) || !Array.isArray(v.sets) || v.plannedSetCount < v.sets.length)) return false
  return record(v) && routineExercise(v) && text(v.name) && number(v.approvedWeight) && number(v.weight) && typeof v.temporaryWeight === 'boolean' && typeof v.structureModified === 'boolean' && (v.benchmark === null || list(v.benchmark, integer)) && list(v.sets, s => record(s) && text(s.id) && positive(s.ordinal) && text(s.reps) && (s.actual === null || (record(s.actual) && number(s.actual.weight) && integer(s.actual.reps) && number(s.actual.completedAt) && typeof s.actual.temporaryWeight === 'boolean'))) && unique(v.sets as unknown[])
}

function session(v: unknown, finished: boolean) {
  if (!record(v) || !text(v.id) || !text(v.routineId) || !text(v.routineName) || !text(v.date) || !/^\d{4}-\d{2}-\d{2}$/.test(v.date) || !number(v.startedAt) || !text(v.currentExerciseId) || !list(v.exercises, workoutExercise) || !list(v.updatedBenchmarks, text)) return false
  const exercises = v.exercises as Record<string, unknown>[]
  if (!unique(exercises) || !exercises.length || !exercises.some(e => e.id === v.currentExerciseId)) return false
  if (finished) return v.phase === 'finished' && number(v.endedAt) && v.endedAt >= v.startedAt && v.timer === null && exercises.every(e => (e.sets as Record<string, unknown>[]).every(s => s.actual !== null))
  if (!['warmup', 'working'].includes(String(v.phase)) || v.endedAt !== null || exercises.some(e => !(e.sets as unknown[]).length)) return false
  if (v.timer === null) return true
  if (!record(v.timer) || !text(v.timer.exerciseId) || !text(v.timer.setId)) return false
  const timer = v.timer
  const source = exercises.find(e => e.id === timer.exerciseId)
  if (!source || !(source.sets as Record<string, unknown>[]).some(s => s.id === timer.setId && s.actual !== null)) return false
  return (timer.kind === 'rest' && number(timer.endAt)) || (timer.kind === 'transition' && number(timer.since))
}

function progressChange(v: unknown) {
  return record(v) && text(v.id) && !!v.id && integer(v.occurredAt) && !Number.isNaN(new Date(v.occurredAt).getTime()) && text(v.routineId) && !!v.routineId && text(v.placementId) && !!v.placementId && text(v.routineName) && text(v.exerciseName) && number(v.previousApprovedWeight) && number(v.nextApprovedWeight) && v.previousApprovedWeight !== v.nextApprovedWeight && ['routine_editor', 'workout'].includes(String(v.source)) && (v.relatedSessionId === undefined || (v.source === 'workout' && text(v.relatedSessionId) && !!v.relatedSessionId))
}

export function isWorkoutState(v: unknown): v is WorkoutState {
  if (!record(v) || v.version !== 1 || !list(v.definitions, d => record(d) && text(d.id) && text(d.name)) || !list(v.routines, r => record(r) && text(r.id) && text(r.name) && list(r.exercises, routineExercise) && (r.exercises as unknown[]).length > 0 && unique(r.exercises as unknown[]))) return false
  const definitions = v.definitions as { id: string }[]
  const routines = v.routines as { id: string; exercises: { exerciseId: string; id: string }[] }[]
  if (!unique(definitions) || !unique(routines) || !unique(routines.flatMap(r => r.exercises)) || routines.some(r => r.exercises.some(e => !definitions.some(d => d.id === e.exerciseId)))) return false
  if (v.progressChanges !== undefined && (!list(v.progressChanges, progressChange) || !unique(v.progressChanges))) return false
  return record(v.schedule) && Object.entries(v.schedule).every(([day, id]) => /^[0-6]$/.test(day) && routines.some(r => r.id === id)) && dictionary(v.progress, number) && dictionary(v.memos, text) && dictionary(v.benchmarks, b => record(b) && text(b.sessionId) && list(b.reps, integer)) && record(v.restSettings) && positive(v.restSettings.low) && positive(v.restSettings.medium) && positive(v.restSettings.high) && (v.active === null || session(v.active, false)) && list(v.history, h => session(h, true))
}

export function loadWorkout(storage: StorageAdapter): { state: WorkoutState; error: string | null; blocked: boolean } {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return { state: createInitialState(), error: null, blocked: false }
    const data: unknown = JSON.parse(raw)
    if (!isWorkoutState(data)) throw new Error('invalid schema')
    return { state: data, error: null, blocked: false }
  } catch {
    return { state: createInitialState(), error: '저장된 데이터를 읽을 수 없습니다. 기존 데이터 보호를 위해 편집을 중지했습니다. 저장소 접근 설정을 확인한 뒤 다시 열어 주세요.', blocked: true }
  }
}

export function saveWorkout(storage: StorageAdapter, state: WorkoutState) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function persistWorkoutUpdate(storage: StorageAdapter, previous: WorkoutState, next: WorkoutState) {
  try {
    saveWorkout(storage, next)
    return { state: next, persisted: true, approvalRejected: false }
  } catch {
    const approvalRejected = (next.progressChanges?.length ?? 0) > (previous.progressChanges?.length ?? 0)
    return { state: approvalRejected ? previous : next, persisted: false, approvalRejected }
  }
}
