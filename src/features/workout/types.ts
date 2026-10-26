export type ExerciseDefinition = { id: string; name: string }
export type RoutineExercise = {
  id: string
  exerciseId: string
  setCount: number
  minReps: number
  maxReps: number
  initialWeight: number
}
export type Routine = { id: string; name: string; exercises: RoutineExercise[] }
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
