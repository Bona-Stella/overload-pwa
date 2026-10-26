import type { Benchmark, ProgressChange, Routine, RoutineExercise, WorkoutExercise, WorkoutSession, WorkoutState, WorkoutTimer } from './types.ts'
import { validReps } from './reps.ts'

export const DAYS = ['일', '월', '화', '수', '목', '금', '토']
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
// Demonstration defaults only; these are editable in Settings, not training prescriptions.
export const DEFAULT_REST_SETTINGS = { low: 180, medium: 120, high: 90 }
export function newId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // LAN HTTP previews lack randomUUID; getRandomValues still provides UUID v4 entropy.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
export const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function createInitialState(): WorkoutState {
  const row = (id: string, exerciseId: string, initialWeight: number): RoutineExercise => ({ id, exerciseId, setCount: 3, minReps: 6, maxReps: 10, initialWeight })
  const routines: Routine[] = [
    { id: 'push', name: 'PUSH DAY', exercises: [row('push-bench', 'bench', 60), row('push-incline', 'incline', 20), row('push-shoulder', 'shoulder', 15)] },
    { id: 'pull', name: 'PULL DAY', exercises: [row('pull-lat', 'lat', 40), row('pull-row', 'row', 35)] },
    { id: 'legs', name: 'LEG DAY', exercises: [row('legs-squat', 'squat', 60), row('legs-curl', 'curl', 25)] },
  ]
  return {
    version: 1,
    definitions: [
      ['bench', '바벨 벤치프레스'], ['incline', '인클라인 덤벨 프레스'], ['shoulder', '덤벨 숄더 프레스'],
      ['lat', '랫 풀다운'], ['row', '시티드 케이블 로우'], ['squat', '바벨 스쿼트'], ['curl', '레그 컬'],
    ].map(([id, name]) => ({ id, name })),
    routines, schedule: { 1: 'push', 2: 'pull', 3: 'legs', 4: 'push', 5: 'pull', 6: 'legs' },
    progress: Object.fromEntries(routines.flatMap(r => r.exercises.map(e => [e.id, e.initialWeight]))),
    benchmarks: {}, memos: {}, restSettings: { ...DEFAULT_REST_SETTINGS }, active: null, history: [],
  }
}

export function validateRoutine(routine: Routine): string | null {
  if (!routine.name.trim()) return '루틴 이름을 입력해 주세요.'
  if (!routine.exercises.length) return '운동을 한 종목 이상 추가해 주세요.'
  if (new Set(routine.exercises.map(e => e.id)).size !== routine.exercises.length) return '종목 배치 식별자가 중복되었습니다.'
  for (const e of routine.exercises) {
    if (!Number.isSafeInteger(e.setCount) || e.setCount <= 0) return '본세트 수는 양의 정수로 입력해 주세요.'
    if (!Number.isSafeInteger(e.minReps) || e.minReps <= 0 || !Number.isSafeInteger(e.maxReps) || e.maxReps < e.minReps) return '목표 횟수는 최소 1회 이상, 최대는 최소 이상이어야 합니다.'
    if (!Number.isFinite(e.initialWeight) || e.initialWeight < 0) return '최초 중량은 0 이상의 숫자로 입력해 주세요.'
  }
  return null
}

export function scheduleConflicts(state: WorkoutState, routineId: string, days: number[]) {
  return days.filter(day => state.schedule[day] && state.schedule[day] !== routineId)
}

export function saveRoutine(state: WorkoutState, routine: Routine, days: number[], replace = false, progressWeights: Record<string, number> = {}, now = Date.now()): WorkoutState {
  const error = validateRoutine(routine)
  if (error) throw new Error(error)
  if (days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error('올바른 요일을 선택해 주세요.')
  if (routine.exercises.some(e => !state.definitions.some(d => d.id === e.exerciseId))) throw new Error('운동 종목을 확인해 주세요.')
  if (routine.exercises.some(e => state.routines.some(r => r.id !== routine.id && r.exercises.some(other => other.id === e.id)))) throw new Error('다른 루틴의 종목 배치 식별자를 사용할 수 없습니다.')
  if (!replace && scheduleConflicts(state, routine.id, days).length) throw new Error('기존 요일 일정을 교체할지 확인해 주세요.')
  const previousRoutine = state.routines.find(r => r.id === routine.id)
  for (const [id, weight] of Object.entries(progressWeights)) {
    if (!previousRoutine?.exercises.some(e => e.id === id) || !routine.exercises.some(e => e.id === id)) throw new Error('진행 중량을 변경할 기존 루틴 종목을 확인해 주세요.')
    if (!Number.isFinite(weight) || weight < 0) throw new Error('진행 중량은 0 이상의 숫자로 입력해 주세요.')
  }
  const next = structuredClone(state)
  const index = next.routines.findIndex(r => r.id === routine.id)
  const saved = { ...structuredClone(routine), name: routine.name.trim() }
  if (index < 0) next.routines.push(saved)
  else next.routines[index] = saved
  for (const day of Object.keys(next.schedule)) if (next.schedule[day] === routine.id) delete next.schedule[day]
  for (const day of days) next.schedule[day] = routine.id
  for (const e of routine.exercises) if (next.progress[e.id] === undefined) next.progress[e.id] = e.initialWeight
  for (const [id, weight] of Object.entries(progressWeights)) {
    const previous = previousRoutine?.exercises.find(e => e.id === id)
    if (!previous) continue
    const previousWeight = state.progress[id] ?? previous.initialWeight
    next.progress[id] = weight
    if (previousWeight !== weight) next.progressChanges = [{ id: newId(), occurredAt: now, routineId: routine.id, placementId: id, routineName: saved.name, exerciseName: state.definitions.find(d => d.id === previous.exerciseId)?.name ?? '운동 종목', previousApprovedWeight: previousWeight, nextApprovedWeight: weight, source: 'routine_editor' }, ...(next.progressChanges ?? [])]
  }
  return next
}

export function deleteRoutine(state: WorkoutState, id: string): WorkoutState {
  return { ...state, routines: state.routines.filter(r => r.id !== id), schedule: Object.fromEntries(Object.entries(state.schedule).filter(([, value]) => value !== id)) }
}

export function selectRoutine(state: WorkoutState, date: Date, override?: string) {
  return state.routines.find(r => r.id === (override ?? state.schedule[date.getDay()])) ?? null
}

export function benchmarkKey(routineId: string, e: RoutineExercise, weight: number) {
  return JSON.stringify([routineId, e.id, e.exerciseId, e.setCount, e.minReps, e.maxReps, weight])
}

export function increaseBenchmark(state: WorkoutState, routineId: string, exercise: WorkoutExercise | RoutineExercise): Benchmark | null {
  const approvedWeight = state.progress[exercise.id] ?? ('approvedWeight' in exercise ? exercise.approvedWeight : exercise.initialWeight)
  if ('sets' in exercise && (exercise.structureModified || exercise.sets.length !== exercise.setCount || approvedWeight !== exercise.approvedWeight)) return null
  // Read the comparable whole-session benchmark, never combine individual history sets.
  const benchmark = state.benchmarks[benchmarkKey(routineId, exercise, approvedWeight)]
  return benchmark?.reps.length === exercise.setCount && benchmark.reps.every(reps => reps >= exercise.maxReps) ? benchmark : null
}

export function createWorkoutExercise(state: WorkoutState, routineId: string, e: RoutineExercise): WorkoutExercise {
  const weight = state.progress[e.id] ?? e.initialWeight
  const benchmark = state.benchmarks[benchmarkKey(routineId, e, weight)]?.reps ?? null
  return {
    ...structuredClone(e), name: state.definitions.find(d => d.id === e.exerciseId)?.name ?? '알 수 없는 종목',
    approvedWeight: weight, weight, temporaryWeight: false, structureModified: false,
    benchmark: benchmark ? [...benchmark] : null,
    sets: Array.from({ length: e.setCount }, (_, i) => ({ id: newId(), ordinal: i + 1, reps: benchmark ? String(benchmark[i]) : '', actual: null })),
  }
}

export function startWorkout(state: WorkoutState, routineId: string, now: number): WorkoutState {
  if (state.active) return state
  const routine = state.routines.find(r => r.id === routineId)
  if (!routine) throw new Error('시작할 루틴을 선택해 주세요.')
  const exercises = routine.exercises.map(e => createWorkoutExercise(state, routine.id, e))
  return { ...state, active: {
    id: newId(), routineId, routineName: routine.name, date: localDate(new Date(now)), startedAt: now,
    endedAt: null, phase: 'warmup', currentExerciseId: exercises[0].id, exercises, timer: null, updatedBenchmarks: [],
  } }
}

export function restSeconds(maxReps: number, settings = DEFAULT_REST_SETTINGS) {
  return maxReps <= 8 ? settings.low : maxReps <= 12 ? settings.medium : settings.high
}

function editActive(state: WorkoutState, edit: (session: WorkoutSession) => void): WorkoutState {
  if (!state.active) return state
  const active = structuredClone(state.active)
  active.timer = resolveWorkoutTimer(active)
  edit(active)
  active.timer = resolveWorkoutTimer(active)
  return { ...state, active }
}

export function isExerciseComplete(exercise: WorkoutExercise) {
  return exercise.sets.length > 0 && exercise.sets.every(s => s.actual !== null)
}

export function resolveWorkoutTimer(session: WorkoutSession): WorkoutTimer {
  const timer = session.timer
  if (!timer || !hasIncompleteSets(session)) return null
  const source = session.exercises.find(e => e.id === timer.exerciseId)
  if (!source?.sets.some(s => s.id === timer.setId && s.actual)) return null
  if (timer.kind === 'transition') return isExerciseComplete(source) ? timer : null
  if (!isExerciseComplete(source)) return timer
  // v1 sessions can still contain a rest saved by the old last-set behavior.
  // Derive its display from actual completion time without rewriting stored records on load.
  const last = source.sets.reduce((a, b) => (a.actual?.completedAt ?? 0) >= (b.actual?.completedAt ?? 0) ? a : b)
  return last.actual ? { kind: 'transition', exerciseId: source.id, setId: last.id, since: last.actual.completedAt } : null
}

export function nextIncompleteExercise(session: WorkoutSession, afterId: string) {
  const index = session.exercises.findIndex(e => e.id === afterId)
  return [...session.exercises.slice(index + 1), ...session.exercises.slice(0, index)].find(e => !isExerciseComplete(e)) ?? null
}

export function beginWorking(state: WorkoutState) {
  return editActive(state, session => { session.phase = 'working' })
}

export function editReps(state: WorkoutState, exerciseId: string, setId: string, reps: string) {
  return editActive(state, session => {
    const set = session.exercises.find(e => e.id === exerciseId)?.sets.find(s => s.id === setId)
    if (set && !set.actual) set.reps = reps
  })
}

export function completeSet(state: WorkoutState, exerciseId: string, setId: string, now: number) {
  return editActive(state, session => {
    if (session.phase !== 'working') throw new Error('준비운동 완료 후 기록해 주세요.')
    const exercise = session.exercises.find(e => e.id === exerciseId)
    const set = exercise?.sets.find(s => s.id === setId)
    if (!exercise || !set || set.actual) return
    const reps = validReps(set.reps)
    if (reps === null) throw new Error('실제 반복 횟수를 1 이상의 정수로 입력해 주세요.')
    if (!Number.isFinite(exercise.weight * reps)) throw new Error('중량과 횟수가 너무 큽니다. 입력을 확인해 주세요.')
    set.actual = { weight: exercise.weight, reps, completedAt: now, temporaryWeight: exercise.temporaryWeight }
    if (isExerciseComplete(exercise)) {
      const next = nextIncompleteExercise(session, exerciseId)
      session.timer = next ? { kind: 'transition', exerciseId, setId, since: now } : null
    } else {
      session.timer = { kind: 'rest', exerciseId, setId, endAt: now + restSeconds(exercise.maxReps, state.restSettings) * 1000 }
    }
  })
}

export function undoSet(state: WorkoutState, exerciseId: string, setId: string) {
  return editActive(state, session => {
    const set = session.exercises.find(e => e.id === exerciseId)?.sets.find(s => s.id === setId)
    if (set) set.actual = null
    if (session.timer?.setId === setId) session.timer = null
  })
}

export function adjustRest(state: WorkoutState, extraSeconds: number | null, now: number) {
  return editActive(state, session => {
    if (session.timer?.kind !== 'rest') return
    if (extraSeconds === null) session.timer = null
    else session.timer.endAt = Math.max(now, session.timer.endAt) + extraSeconds * 1000
  })
}

export function navigateExercise(state: WorkoutState, id: string) {
  return editActive(state, session => {
    if (session.currentExerciseId === id || !session.exercises.some(e => e.id === id)) return
    session.currentExerciseId = id
  })
}

export function changeWeight(state: WorkoutState, exerciseId: string, weight: number, mode: 'today' | 'progress', now = Date.now()): WorkoutState {
  if (!Number.isFinite(weight) || weight < 0) throw new Error('중량은 0 이상의 숫자로 입력해 주세요.')
  const source = state.active?.exercises.find(e => e.id === exerciseId)
  if (!source || !state.active) throw new Error('중량을 변경할 진행 중인 종목을 확인해 주세요.')
  const next = editActive(state, session => {
    const e = session.exercises.find(e => e.id === exerciseId)
    if (!e) return
    e.weight = weight
    e.temporaryWeight = mode === 'today'
    if (mode === 'progress') e.approvedWeight = weight
    const benchmark = mode === 'progress' && !e.structureModified ? state.benchmarks[benchmarkKey(session.routineId, e, weight)]?.reps ?? null : null
    e.benchmark = benchmark ? [...benchmark] : null
    e.sets.forEach((set, i) => { if (!set.actual) set.reps = benchmark?.[i] === undefined ? '' : String(benchmark[i]) })
  })
  if (mode === 'today') return next
  const previousWeight = state.progress[exerciseId] ?? source.approvedWeight
  const event: ProgressChange | null = previousWeight === weight ? null : { id: newId(), occurredAt: now, routineId: state.active.routineId, placementId: exerciseId, routineName: state.active.routineName, exerciseName: source.name, previousApprovedWeight: previousWeight, nextApprovedWeight: weight, source: 'workout', relatedSessionId: state.active.id }
  return { ...next, progress: { ...next.progress, [exerciseId]: weight }, ...(event ? { progressChanges: [event, ...(state.progressChanges ?? [])] } : {}) }
}

export function addSessionSet(state: WorkoutState, exerciseId: string) {
  return editActive(state, session => {
    const e = session.exercises.find(e => e.id === exerciseId)
    if (e) { e.sets.push({ id: newId(), ordinal: Math.max(...e.sets.map(s => s.ordinal)) + 1, reps: '', actual: null }); e.structureModified = true; e.benchmark = null }
  })
}

export function removeSessionSet(state: WorkoutState, exerciseId: string, setId: string) {
  return editActive(state, session => {
    const e = session.exercises.find(e => e.id === exerciseId)
    const set = e?.sets.find(s => s.id === setId)
    if (!e || !set) return
    if (set.actual) throw new Error('완료한 세트는 완료 취소 후 제외해 주세요.')
    if (e.sets.length <= 1) throw new Error('본세트는 한 개 이상 남겨 주세요.')
    e.sets = e.sets.filter(s => s.id !== setId)
    e.structureModified = true
    e.benchmark = null
  })
}

export function addSessionExercise(state: WorkoutState, definitionId: string) {
  return editActive(state, session => {
    const e = createWorkoutExercise(state, session.routineId, { id: newId(), exerciseId: definitionId, setCount: 3, minReps: 6, maxReps: 10, initialWeight: 0 })
    e.structureModified = true
    session.exercises.push(e)
  })
}

export function removeSessionExercise(state: WorkoutState, id: string) {
  return editActive(state, session => {
    const e = session.exercises.find(e => e.id === id)
    if (e?.sets.some(s => s.actual)) throw new Error('완료 기록이 있는 종목은 제외할 수 없습니다.')
    if (session.exercises.length <= 1) throw new Error('종목은 한 개 이상 남겨 주세요.')
    session.exercises = session.exercises.filter(e => e.id !== id)
    if (session.currentExerciseId === id) session.currentExerciseId = session.exercises[0].id
  })
}

export function reorderSessionExercise(state: WorkoutState, id: string, offset: number) {
  return editActive(state, session => { session.exercises = moveItem(session.exercises, session.exercises.findIndex(e => e.id === id), offset) })
}

export function moveItem<T>(items: T[], index: number, offset: number): T[] {
  const next = [...items]
  const to = index + offset
  if (index < 0 || to < 0 || to >= next.length) return next
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}

export function recommendation(exercise: WorkoutExercise): 'increase' | 'decrease' | null {
  if (exercise.sets.some(s => s.actual && s.actual.reps < exercise.minReps)) return 'decrease'
  if (!exercise.temporaryWeight && exercise.sets.length === exercise.setCount && exercise.sets.every(s => s.actual && !s.actual.temporaryWeight && s.actual.weight === exercise.approvedWeight && s.actual.reps >= exercise.maxReps)) return 'increase'
  return null
}

export function summary(session: WorkoutSession, now: number) {
  const actuals = session.exercises.flatMap(e => e.sets.flatMap(s => s.actual ? [s.actual] : []))
  return { sets: actuals.length, volume: actuals.reduce((sum, s) => sum + s.weight * s.reps, 0), elapsed: Math.max(0, (session.endedAt ?? now) - session.startedAt) }
}

export function hasIncompleteSets(session: WorkoutSession) { return session.exercises.some(e => e.sets.some(s => !s.actual)) }

export function completionCounts(session: WorkoutSession) {
  const completed = session.exercises.reduce((sum, e) => sum + e.sets.filter(s => s.actual).length, 0)
  // Old edited history has already discarded drafts; its final plan cannot be inferred safely.
  const counts = session.exercises.map(e => session.phase !== 'finished' ? e.sets.length : e.plannedSetCount ?? (e.structureModified ? null : e.setCount))
  const total = counts.every(count => count !== null) ? counts.reduce<number>((sum, count) => sum + (count ?? 0), 0) : null
  return { completed, total, allComplete: total !== null && total > 0 && completed === total }
}

export function historicalWeightReview(session: WorkoutSession, exercise: WorkoutExercise): { kind: 'unavailable'; reason: string } | { kind: 'increase' | 'decrease' | 'maintain'; weight: number; reps: number[] } {
  if (session.phase !== 'finished' || !completionCounts(session).allComplete) return { kind: 'unavailable' as const, reason: '전체 계획 미완료 또는 당시 계획 수 미확인' }
  if (exercise.structureModified || exercise.sets.length !== exercise.setCount) return { kind: 'unavailable' as const, reason: '세션에서 본세트 구성을 변경한 기록' }
  if (exercise.temporaryWeight || !exercise.sets.every(s => s.actual && !s.actual.temporaryWeight && s.actual.weight === exercise.approvedWeight)) return { kind: 'unavailable' as const, reason: '일시 중량 또는 혼합 중량 기록' }
  return { kind: recommendation(exercise) ?? 'maintain', weight: exercise.approvedWeight, reps: exercise.sets.map(s => s.actual?.reps ?? 0) }
}

export function currentWeightReviews(state: WorkoutState, onlyRoutineId?: string) {
  return state.routines.filter(r => onlyRoutineId === undefined || r.id === onlyRoutineId).flatMap(routine => routine.exercises.flatMap(exercise => {
    const weight = state.progress[exercise.id] ?? exercise.initialWeight
    const benchmark = increaseBenchmark(state, routine.id, exercise)
    const key = benchmarkKey(routine.id, exercise, weight)
    const latest = state.history.filter(s => s.routineId === routine.id).flatMap(session => session.exercises.flatMap(e => {
      if (e.id !== exercise.id || benchmarkKey(session.routineId, e, e.approvedWeight) !== key) return []
      const review = historicalWeightReview(session, e)
      return review.kind === 'unavailable' ? [] : [{ sessionId: session.id, endedAt: session.endedAt ?? session.startedAt, date: session.date, review }]
    })).sort((a, b) => b.endedAt - a.endedAt)[0]
    if (!benchmark && latest?.review.kind !== 'decrease') return []
    return [{ routineId: routine.id, placementId: exercise.id, routineName: routine.name, exerciseName: state.definitions.find(d => d.id === exercise.exerciseId)?.name ?? '운동 종목', weight, benchmark, latest }]
  }))
}

export function finishWorkout(state: WorkoutState, now: number, confirmIncomplete = false): WorkoutState {
  if (!state.active) return state
  if (hasIncompleteSets(state.active) && !confirmIncomplete) throw new Error('미완료 세트는 기록에서 제외됩니다. 종료를 확인해 주세요.')
  const session = structuredClone(state.active)
  const benchmarks = { ...state.benchmarks }
  // Only a fully completed session can contribute a benchmark; actual history is always kept.
  if (session.phase === 'working' && !hasIncompleteSets(session)) for (const e of session.exercises) {
    if (e.temporaryWeight || e.structureModified || e.sets.length !== e.setCount || !e.sets.every(s => s.actual && !s.actual.temporaryWeight && s.actual.weight === e.approvedWeight)) continue
    const key = benchmarkKey(session.routineId, e, e.approvedWeight)
    const reps = e.sets.map(s => s.actual?.reps ?? 0)
    const previous = benchmarks[key]
    if (!previous || reps.reduce((a, b) => a + b, 0) > previous.reps.reduce((a, b) => a + b, 0)) {
      benchmarks[key] = { sessionId: session.id, reps }
      session.updatedBenchmarks.push(e.name)
    }
  }
  session.endedAt = Math.max(now, session.startedAt)
  session.phase = 'finished'
  session.timer = null
  // Uncompleted drafts never become history records.
  session.exercises = session.exercises.map(e => ({ ...e, plannedSetCount: e.sets.length, sets: e.sets.filter(s => s.actual) }))
  return { ...state, benchmarks, active: null, history: [session, ...state.history] }
}

export function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
