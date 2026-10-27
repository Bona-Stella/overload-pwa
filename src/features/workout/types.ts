export type ExerciseDefinition = { id: string; name: string }
export type RoutineExercise = {
  id: string
  exerciseId: string
  setCount: number
  minReps: number
  maxReps: number
  initialWeight: number
}
export type CardioKind = 'treadmill' | 'bike' | 'outdoor' | 'stairs' | 'other'
export type CardioPlan = {
  id: string
  kind: CardioKind
  name: string
  targetSeconds: number
  targetDistance: number | null
  intensity: { mode: 'speed' | 'pace'; value: number } | null
  incline: number | null
  resistance: number | null
}
export type CardioActivity = {
  id: string
  plan: CardioPlan
  status: 'ready' | 'running' | 'paused' | 'review' | 'completed' | 'skipped'
  startedAt: number | null
  runSince: number | null
  pausedAt: number | null
  accumulatedMs: number
  draft: { distance: string; bpm: string; correctedSeconds: string | null }
  result: { timerMs: number; activeMs: number; corrected: boolean; distance: number | null; bpm: number | null; completedAt: number } | null
}
export type Routine = { id: string; name: string; exercises: RoutineExercise[]; cardio?: CardioPlan[] }
export type WorkoutSet = {
  id: string
  ordinal: number
  reps: string
  actual: { weight: number; reps: number; completedAt: number; temporaryWeight: boolean } | null
}
export type WorkoutExercise = RoutineExercise & {
  name: string
  approvedWeight: number
  weight: number
  temporaryWeight: boolean
  structureModified: boolean
  benchmark: number[] | null
  plannedSetCount?: number
  sets: WorkoutSet[]
}
export type WorkoutTimer =
  | { kind: 'rest'; exerciseId: string; setId: string; endAt: number }
  | { kind: 'transition'; exerciseId: string; setId: string; since: number }
  | null
export type WorkoutSession = {
  id: string
  routineId: string
  routineName: string
  date: string
  startedAt: number
  endedAt: number | null
  phase: 'warmup' | 'working' | 'finished'
  currentExerciseId: string
  exercises: WorkoutExercise[]
  cardio?: CardioActivity[]
  timer: WorkoutTimer
  updatedBenchmarks: string[]
}
export type Benchmark = { sessionId: string; reps: number[] }
export type RestSettings = { low: number; medium: number; high: number }
export type ProgressChange = {
  id: string
  occurredAt: number
  routineId: string
  placementId: string
  routineName: string
  exerciseName: string
  previousApprovedWeight: number
  nextApprovedWeight: number
  source: 'routine_editor' | 'workout'
  relatedSessionId?: string
}
export type WorkoutState = {
  version: 1
  definitions: ExerciseDefinition[]
  routines: Routine[]
  schedule: Record<string, string>
  progress: Record<string, number>
  benchmarks: Record<string, Benchmark>
  memos: Record<string, string>
  restSettings: RestSettings
  active: WorkoutSession | null
  history: WorkoutSession[]
  progressChanges?: ProgressChange[]
}
