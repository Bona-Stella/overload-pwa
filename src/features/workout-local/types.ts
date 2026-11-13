import type { ActiveResolution, ActiveWeightContext, CardioResult, Counter, FinishAck, FinishRequest, InitialPlan, PerformedSet, Scope, Session, Snapshot, SnapshotAck, SnapshotRequest } from '../workout-online/types.ts'

export type LocalKey = Scope & { sessionId: string; editorDeviceId: string; writerEpoch: Counter }
export type RecordPresence = 'LOCAL_ONLY' | 'SERVER_CONFIRMED' | 'UNKNOWN'
export type SetDraft = { weight: string; reps: string; additionalWeight?: string }
export type CardioTimer = { startedAt: string | null; runningSince: string | null; accumulatedMs: number;
  segments: { startedAt: string; stoppedAt: string }[]; distance: string; speed?: string; bpm: string; correctedSeconds: string | null; reviewing: boolean }
export type RestPolicy = { restLowSeconds: number; restMediumSeconds: number; restHighSeconds: number }
export type ExitGuardRegistration = (guard: (() => Promise<boolean>) | null) => void
export type LocalWorkout = LocalKey & {
  schemaVersion: 2
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
  warmupCompleted?: boolean
  // The current server contract has no equipment memo field. Never send these as snapshots.
  equipmentMemos?: Record<string, string>
  excludedSetOrdinals?: Record<string, number[]>
  exerciseNames: Record<string, string>
  restPolicy: RestPolicy
  rest: { endsAt: string; startedAt: string; seconds: number; sessionExerciseId: string; ordinal: number } | null
  // At most one frozen snapshot, never a command queue.
  pendingSnapshot?: { request: SnapshotRequest; requestJson: string; localOnlyIds: string[]; rejected?: boolean } | null
  pendingResolution?: { request: ActiveResolution; requestJson: string; rejected?: boolean; workingBefore?: { value: string; context: ActiveWeightContext } } | null
  confirmedDeletedSetIds?: string[]
  confirmedDeletedCardioIds?: string[]
  lastAck?: SnapshotAck | null
  finish?: { endedAt: string; snapshot: Snapshot; request?: FinishRequest; requestJson?: string; ack?: FinishAck }
}
export const localKey = (value: LocalKey) => [value.userId, value.dataGeneration, value.sessionId, value.editorDeviceId, value.writerEpoch]
export const slotKey = (exerciseId: string, ordinal: number) => `${exerciseId}:${ordinal}`
