// Wire types follow the Backend V11–V15 contract. Counters/decimals never pass through Number.
export type UUID = string
export type Counter = string
export type Decimal = string
export type Instant = string
export type Scope = { userId: UUID; dataGeneration: Counter }
export type CardioPlan = { kind: 'TREADMILL' | 'BIKE' | 'OUTDOOR' | 'STAIRS' | 'OTHER'; name: string; targetSeconds: number;
  targetDistanceKm: Decimal | null; intensity: { mode: 'SPEED' | 'PACE'; value: Decimal } | null; inclinePercent: Decimal | null; resistance: Decimal | null }
export type WeightNew = { id: UUID; exerciseDefinitionId: UUID; setCount: number; minReps: number; maxReps: number; initialWeightKg: Decimal }
export type WeightPlacement = WeightNew & { exerciseName: string; approvedWeightKg: Decimal; deletedAt: Instant | null }
export type CardioPlacement = { id: UUID; plan: CardioPlan; deletedAt: Instant | null }
export type Routine = Scope & { id: UUID; version: Counter; name: string; weightPlacements: WeightPlacement[]; cardioPlacements: CardioPlacement[] }
export type RoutineList = Scope & { routines: { id: UUID; name: string; version: Counter }[] }
export type CreateRoutine = { id: UUID; dataGeneration: Counter; name: string; weightPlacements: WeightNew[]; cardioPlacements: { id: UUID; plan: CardioPlan }[] }
export type UpdateRoutine = { dataGeneration: Counter; expectedVersion: Counter; name: string;
  weightPlacements: ((WeightNew & { mode: 'NEW' }) | { mode: 'EXISTING' | 'RESTORE'; id: UUID; setCount: number; minReps: number; maxReps: number })[];
  cardioPlacements: { mode: 'NEW' | 'EXISTING' | 'RESTORE'; id: UUID; plan: CardioPlan }[];
  weightApprovals: { placementId: UUID; nextApprovedWeightKg: Decimal; occurredAt: Instant }[] }
export type Start = { id: UUID; dataGeneration: Counter; routineId: UUID; editorDeviceId: UUID; startedAt: Instant; workoutDate: string; startedTimeZone: string }
export type InitialPlan = { schemaVersion: 1; routineId: UUID; routineName: string; routineVersion: Counter;
  weightExercises: { sessionExerciseId: UUID; sourcePlacementId: UUID; exerciseDefinitionId: UUID; exerciseName: string; setCount: number; minReps: number; maxReps: number; initialWeightKg: Decimal; approvedWeightKg: Decimal }[];
  cardioActivities: { sessionActivityId: UUID; sourcePlacementId: UUID; plan: CardioPlan }[] }
export type ActiveWeightContext = { kind: 'INITIAL_APPROVED' | 'TODAY_ONLY'; requestId: null } | { kind: 'APPROVAL_REQUEST'; requestId: UUID }
export type WeightContext = ActiveWeightContext | { kind: 'UNVERIFIED'; requestId: null }
export type PerformedSet = { id: UUID; sessionExerciseId: UUID; ordinal: number; weightKg: Decimal; reps: number; completedAt: Instant; weightContext: WeightContext }
export type CardioResult = { id: UUID; sessionActivityId: UUID; occurredAt: Instant } & (
  { status: 'COMPLETED'; startedAt: Instant; result: { timerMs: number; activeMs: number; corrected: boolean; distanceKm: Decimal | null; averageBpm: number | null } }
  | { status: 'SKIPPED'; startedAt: Instant | null; result: null })
export type ApprovalRequest = { id: UUID; sessionExerciseId: UUID; sequence: Counter; previousRequestId: UUID | null; expectedRoutineVersion: Counter;
  previousApprovedWeightKg: Decimal; nextApprovedWeightKg: Decimal; occurredAt: Instant }
export type ApprovalResult = { id: UUID; sessionExerciseId: UUID; sequence: Counter; status: 'APPLIED' | 'PENDING' | 'NOT_APPLIED'; reason: string | null;
  approvalEventId: UUID | null; routineVersionBefore: Counter | null; routineVersionAfter: Counter | null; resolvedAt: Instant | null; resolvedByRequestId: UUID | null }
export type Snapshot = { sessionExercises: { id: UUID; kind: 'WEIGHT' | 'CARDIO'; exerciseDefinitionId: UUID | null }[];
  appliedPlan: { schemaVersion: 1; weightExercises: { sessionExerciseId: UUID; setCount: number; minReps: number; maxReps: number }[]; cardioActivities: { sessionActivityId: UUID; plan: CardioPlan }[] };
  performedSets: PerformedSet[]; cardioResults: CardioResult[]; deletedPerformedSetIds: UUID[]; deletedCardioResultIds: UUID[]; approvalRequests: ApprovalRequest[] }
export type Advice = 'INCREASE' | 'DECREASE' | 'MAINTAIN' | 'UNAVAILABLE'
export type ComparisonContext = { routineId: UUID; sourcePlacementId: UUID; exerciseDefinitionId: UUID; plannedSetCount: number; minReps: number; maxReps: number; approvedWeightKg: Decimal; unit: 'KG' }
export type CompletionAssessment = { schemaVersion: 1; ruleVersion: 'task009-completion-v1'; sessionVersion: Counter; assessedAt: Instant;
  overallWeightPlanComplete: boolean | null; exercises: { sessionExerciseId: UUID; eligible: boolean; reasonCodes: string[]; comparisonContext: ComparisonContext | null;
    evaluatedPerformedSetIds: UUID[]; evaluatedReps: number[]; repsSum: Counter; benchmarkEvidence: { sessionId: UUID; sessionVersion: Counter; endedAt: Instant; performedSetIds: UUID[]; reps: number[]; repsSum: Counter; ruleVersion: string } | null; advice: Advice; adviceReason: string }[] }
export type Session = Scope & { id: UUID; status: 'ACTIVE' | 'FINISHED' | 'AUTO_CLOSED'; version: Counter; startedAt: Instant; workoutDate: string; startedTimeZone: string;
  editorDeviceId: UUID; writerEpoch: Counter; localRevision: Counter; lastWorkoutSyncedAt: Instant; initialPlan: InitialPlan; lastSnapshotSavedAt: Instant | null;
  snapshot: { state: Snapshot; approvalResults: ApprovalResult[]; recordedContexts: { setId: UUID; approvalStateAtRecording: string; approvedWeightKgAtRecording: Decimal | null }[] };
  endedAt: Instant | null; closedAt: Instant | null; completionAssessment: CompletionAssessment | null; deletedAt: Instant | null }
export type ActivePerformedSet = Omit<PerformedSet, 'weightContext'> & { weightContext: ActiveWeightContext }
export type SnapshotRequest = { dataGeneration: Counter; editorDeviceId: UUID; writerEpoch: Counter; localRevision: Counter;
  snapshot: Omit<Snapshot, 'performedSets'> & { performedSets: ActivePerformedSet[] } }
export type SnapshotAck = Scope & { sessionId: UUID; writerEpoch: Counter; acceptedLocalRevision: Counter; version: Counter; snapshotSavedAt: Instant; lastWorkoutSyncedAt: Instant; duplicate: boolean; approvalResults: ApprovalResult[] }
export type FinishRequest = SnapshotRequest & { endedAt: Instant }
export type Resolution = { dataGeneration: Counter; sessionExerciseId: UUID; pendingRequestIds: UUID[]; occurredAt: Instant } & (
  { decision: 'KEEP_CURRENT'; newApprovalRequest: null } | { decision: 'REAPPROVE'; newApprovalRequest: { id: UUID; sequence: Counter; expectedRoutineVersion: Counter; previousApprovedWeightKg: Decimal; nextApprovedWeightKg: Decimal } })
export type ActiveResolution = Resolution & { editorDeviceId: UUID; writerEpoch: Counter; expectedSessionVersion: Counter; expectedLocalRevision: Counter }
export type ClosedResolution = Resolution & { expectedVersion: Counter }
export type RecordEdit = { dataGeneration: Counter; expectedVersion: Counter; setCorrections: { id: UUID; weightKg: Decimal; reps: number }[];
  cardioCorrections: { id: UUID; activeMs: number; corrected: boolean; distanceKm: Decimal | null; averageBpm: number | null }[]; deletedPerformedSetIds: UUID[]; deletedCardioResultIds: UUID[] }
export type Recovery = { dataGeneration: Counter; expectedVersion: Counter; confirm: true; origin: { editorDeviceId: UUID; writerEpoch: Counter; localRevision: Counter }; performedSets: PerformedSet[]; cardioResults: Extract<CardioResult, { status: 'COMPLETED' }>[] }
export type RecordAck = Scope & { sessionId: UUID; status: Session['status']; version: Counter; changed: boolean; changeEventIds: UUID[]; recoveredIds: UUID[]; alreadyPresentIds: UUID[]; deletedAt: Instant | null }
export type FinishAck = SnapshotAck & { status: 'FINISHED'; currentVersion: Counter; deletedAt: Instant | null; endedAt: Instant; closedAt: Instant; completionAssessment: CompletionAssessment }
export type ResolutionAck = Scope & { sessionId: UUID; writerEpoch: Counter; localRevision: Counter; version: Counter; lastWorkoutSyncedAt: Instant; approvalResults: ApprovalResult[] }
export type ClosedResolutionAck = Scope & { sessionId: UUID; status: Session['status']; version: Counter; changed: boolean; approvalResults: ApprovalResult[] }
export type AssessmentView = Scope & { sessionId: UUID; status: Session['status']; version: Counter; completionAssessment: CompletionAssessment | null;
  currentAssessment: { state: 'EVALUATED' | 'EXCLUDED'; reasonCodes: string[]; advice: 'UNAVAILABLE' | null; evaluation: CompletionAssessment | null } }
export type ChangeEvents = Scope & { sessionId: UUID; version: Counter; events: { id: UUID; recordKind: 'SET' | 'CARDIO' | 'SESSION'; recordId: UUID;
  changeKind: 'CORRECTED' | 'DELETED' | 'RECOVERED'; before: Record<string, unknown> | null; after: Record<string, unknown> | null; changeContext: Record<string, unknown> | null; recordedAt: Instant }[] }
