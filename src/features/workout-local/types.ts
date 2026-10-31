import type { ActiveWeightContext, CardioResult, Counter, InitialPlan, PerformedSet, Scope, Session, Snapshot } from '../workout-online/types.ts'

export type LocalKey = Scope & { sessionId: string; editorDeviceId: string; writerEpoch: Counter }
export type RecordPresence = 'LOCAL_ONLY' | 'SERVER_CONFIRMED' | 'UNKNOWN'
export type SetDraft = { weight: string; reps: string }
export type CardioTimer = { startedAt: string | null; runningSince: string | null; accumulatedMs: number;
  segments: { startedAt: string; stoppedAt: string }[]; distance: string; bpm: string; correctedSeconds: string | null; reviewing: boolean }
export type RestPolicy = { restLowSeconds: number; restMediumSeconds: number; restHighSeconds: number }
export type ExitGuardRegistration = (guard: (() => Promise<boolean>) | null) => void
export type LocalWorkout = LocalKey & {
  schemaVersion: 1
  startedAt: string
  initialPlan: InitialPlan
  snapshot: Snapshot
  // editVersion serializes every local write; localRevision changes only with snapshot meaning.
  editVersion: Counter
  localRevision: Counter
  serverRevision: Counter
  serverVersion: Counter
  syncState: 'CLEAN' | 'UNSENT' | 'UNKNOWN'
  recordedContexts: Session['snapshot']['recordedContexts']
  approvalResults: Session['snapshot']['approvalResults']
  presence: Record<string, RecordPresence>
  cancelled: { sets: PerformedSet[]; cardio: CardioResult[] }
  drafts: Record<string, SetDraft>
  weights: Record<string, { value: string; context: ActiveWeightContext }>
  timers: Record<string, CardioTimer>
  currentExerciseId: string
  exerciseNames: Record<string, string>
  restPolicy: RestPolicy
  rest: { endsAt: string; startedAt: string; seconds: number; sessionExerciseId: string; ordinal: number } | null
}
export const localKey = (value: LocalKey) => [value.userId, value.dataGeneration, value.sessionId, value.editorDeviceId, value.writerEpoch]
export const slotKey = (exerciseId: string, ordinal: number) => `${exerciseId}:${ordinal}`
