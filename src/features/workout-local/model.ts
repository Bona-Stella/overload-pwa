import type { ActiveWeightContext, CardioPlan, Session } from '../workout-online/types.ts'
import { count, countDraft, counter, decimalDraft, snapshot, targets, cardioPlan, uuid } from '../workout-online/validation.ts'
import type { CardioTimer, LocalWorkout, RestPolicy } from './types.ts'
import { slotKey } from './types.ts'

export function increment(value: string) {
  const next = (BigInt(value) + 1n).toString()
  if (!counter(next)) throw new Error('로컬 순번 한도에 도달해 편집을 중단했습니다.')
  return next
}
export function createLocalWorkout(server: Session, restPolicy: RestPolicy): LocalWorkout {
  const state = structuredClone(server.snapshot.state)
  const weights: LocalWorkout['weights'] = {}
  for (const e of state.appliedPlan.weightExercises) {
    const initial = server.initialPlan.weightExercises.find(x => x.sessionExerciseId === e.sessionExerciseId)
    const last = state.performedSets.filter(x => x.sessionExerciseId === e.sessionExerciseId).sort((a, b) => b.ordinal - a.ordinal)[0]
    // A prior request/record is historical context, never an implicit new approval.
    weights[e.sessionExerciseId] = { value: last?.weightKg ?? initial?.approvedWeightKg ?? '0',
      context: last?.weightContext.kind === 'UNVERIFIED' ? { kind: 'TODAY_ONLY', requestId: null }
        : last?.weightContext ?? { kind: initial ? 'INITIAL_APPROVED' : 'TODAY_ONLY', requestId: null } }
  }
  return { schemaVersion: 1, userId: server.userId, dataGeneration: server.dataGeneration, sessionId: server.id, editorDeviceId: server.editorDeviceId,
    writerEpoch: server.writerEpoch, startedAt: server.startedAt, initialPlan: structuredClone(server.initialPlan), snapshot: state,
    editVersion: '0', localRevision: server.localRevision, serverRevision: server.localRevision, serverVersion: server.version, syncState: 'CLEAN',
    recordedContexts: structuredClone(server.snapshot.recordedContexts), approvalResults: structuredClone(server.snapshot.approvalResults),
    presence: Object.fromEntries([...state.performedSets, ...state.cardioResults].map(x => [x.id, 'SERVER_CONFIRMED'])), cancelled: { sets: [], cardio: [] },
    drafts: {}, weights, timers: {}, exerciseNames: Object.fromEntries(server.initialPlan.weightExercises.map(x => [x.sessionExerciseId, x.exerciseName])),
    currentExerciseId: state.appliedPlan.weightExercises[0]?.sessionExerciseId ?? state.appliedPlan.cardioActivities[0]?.sessionActivityId ?? '', restPolicy: { ...restPolicy }, rest: null }
}
export const emptyTimer = (): CardioTimer => ({ startedAt: null, runningSince: null, accumulatedMs: 0, segments: [], distance: '', bpm: '', correctedSeconds: null, reviewing: false })
function eventTime(workout: LocalWorkout, now: number) {
  if (!Number.isSafeInteger(now) || now < Date.parse(workout.startedAt)) throw new Error('기기 시각이 운동 시작보다 이릅니다. 입력을 보존하고 날짜·시간을 확인해 주세요.')
  return new Date(now).toISOString()
}
function freshId(workout: LocalWorkout, randomId: () => string) {
  const id = randomId(), state = workout.snapshot
  if (!uuid(id) || [...state.sessionExercises, ...state.performedSets, ...state.cardioResults, ...state.approvalRequests, ...workout.cancelled.sets, ...workout.cancelled.cardio].some(x => x.id === id)
    || state.deletedPerformedSetIds.includes(id) || state.deletedCardioResultIds.includes(id)) throw new Error('수행 UUID가 중복되어 저장하지 않았습니다. 다시 시도해 주세요.')
  return id
}
export function restSeconds(policy: RestPolicy, maxReps: number) { return maxReps <= 10 ? policy.restLowSeconds : maxReps <= 12 ? policy.restMediumSeconds : policy.restHighSeconds }
export function restRemaining(workout: LocalWorkout, now: number) { return workout.rest ? Math.max(0, Math.ceil((Date.parse(workout.rest.endsAt) - now) / 1000)) : 0 }
export function draftFor(workout: LocalWorkout, id: string, ordinal: number) { return workout.drafts[slotKey(id, ordinal)] ?? { weight: workout.weights[id]?.value ?? '', reps: '' } }
export function editDraft(workout: LocalWorkout, id: string, ordinal: number, patch: Partial<ReturnType<typeof draftFor>>) {
  requireWeight(workout, id)
  if (!count(ordinal) || workout.snapshot.performedSets.some(x => x.sessionExerciseId === id && x.ordinal === ordinal)) throw new Error('완료한 세트는 먼저 완료 취소해 주세요.')
  workout.drafts[slotKey(id, ordinal)] = { ...draftFor(workout, id, ordinal), ...patch }
}
function requireWeight(workout: LocalWorkout, id: string) {
  const e = workout.snapshot.appliedPlan.weightExercises.find(x => x.sessionExerciseId === id)
  if (!e) throw new Error('현재 적용 계획에 없는 종목입니다.')
  return e
}
export function completeSet(workout: LocalWorkout, id: string, ordinal: number, now: number, randomId = () => crypto.randomUUID()) {
  const plan = requireWeight(workout, id)
  if (!count(ordinal) || workout.snapshot.performedSets.some(x => x.sessionExerciseId === id && x.ordinal === ordinal)) throw new Error('이미 완료한 세트입니다.')
  const draft = draftFor(workout, id, ordinal), weightKg = decimalDraft(draft.weight), reps = countDraft(draft.reps)
  const completedAt = eventTime(workout, now), selected = workout.weights[id]
  let context: ActiveWeightContext = selected?.context ?? { kind: 'TODAY_ONLY', requestId: null }
  const approved = context.kind === 'INITIAL_APPROVED' ? workout.initialPlan.weightExercises.find(x => x.sessionExerciseId === id)?.approvedWeightKg
    : context.kind === 'APPROVAL_REQUEST' ? workout.snapshot.approvalRequests.find(x => x.id === context.requestId)?.nextApprovedWeightKg : null
  if (approved !== weightKg) context = { kind: 'TODAY_ONLY', requestId: null }
  const approval = context.kind === 'APPROVAL_REQUEST' ? workout.snapshot.approvalRequests.find(x => x.id === context.requestId) : null
  if (approval && Date.parse(approval.occurredAt) > now) throw new Error('완료 시각이 승인 요청보다 이릅니다. 기기 시각을 확인해 주세요.')
  const performed = { id: freshId(workout, randomId), sessionExerciseId: id, ordinal, weightKg, reps, completedAt, weightContext: { ...context } }
  workout.snapshot.performedSets.push(performed); workout.presence[performed.id] = 'LOCAL_ONLY'
  // Preserve the original input text, including trailing decimal zeros.
  workout.drafts[slotKey(id, ordinal)] = { ...draft }
  const seconds = restSeconds(workout.restPolicy, plan.maxReps)
  workout.rest = { startedAt: completedAt, endsAt: new Date(now + seconds * 1000).toISOString(), seconds, sessionExerciseId: id, ordinal }
}
export function undoSet(workout: LocalWorkout, recordId: string) {
  const record = workout.snapshot.performedSets.find(x => x.id === recordId)
  if (!record) throw new Error('완료 기록을 찾지 못했습니다.')
  workout.cancelled.sets.push(structuredClone(record))
  // Local-only tombstones stay in cancelled, not in a server deletion list for nonexistent rows.
  // Unknown delivery must be reconciled in 5C; it is never silently treated as local-only.
  if (workout.presence[record.id] !== 'LOCAL_ONLY') workout.snapshot.deletedPerformedSetIds.push(record.id)
  if (!workout.presence[record.id] || workout.presence[record.id] === 'UNKNOWN') { workout.presence[record.id] = 'UNKNOWN'; workout.syncState = 'UNKNOWN' }
  workout.snapshot.performedSets = workout.snapshot.performedSets.filter(x => x.id !== recordId)
  workout.drafts[slotKey(record.sessionExerciseId, record.ordinal)] ??= { weight: record.weightKg, reps: String(record.reps) }
  if (workout.rest?.sessionExerciseId === record.sessionExerciseId && workout.rest.ordinal === record.ordinal) workout.rest = null
}
export function changeWeight(workout: LocalWorkout, id: string, value: string, approve: boolean, now: number, randomId = () => crypto.randomUUID()) {
  requireWeight(workout, id)
  const weight = decimalDraft(value)
  let context: ActiveWeightContext = { kind: 'TODAY_ONLY', requestId: null }
  if (approve) {
    const initial = workout.initialPlan.weightExercises.find(x => x.sessionExerciseId === id)
    if (!initial) throw new Error('추가 종목에는 원래 루틴 배치가 없어 승인 요청을 만들 수 없습니다.')
    const previous = workout.snapshot.approvalRequests.filter(x => x.sessionExerciseId === id).sort((a, b) => BigInt(a.sequence) < BigInt(b.sequence) ? -1 : 1).at(-1)
    const occurredAt = eventTime(workout, now)
    if (previous && Date.parse(previous.occurredAt) > now) throw new Error('승인 요청 시각이 선행 요청보다 이릅니다. 기기 시각을 확인해 주세요.')
    const request = { id: freshId(workout, randomId), sessionExerciseId: id, sequence: previous ? increment(previous.sequence) : '1', previousRequestId: previous?.id ?? null,
      expectedRoutineVersion: previous?.expectedRoutineVersion ?? workout.initialPlan.routineVersion,
      previousApprovedWeightKg: previous?.nextApprovedWeightKg ?? initial.approvedWeightKg, nextApprovedWeightKg: weight, occurredAt }
    workout.snapshot.approvalRequests.push(request); context = { kind: 'APPROVAL_REQUEST', requestId: request.id }
  }
  workout.weights[id] = { value, context }
  for (const [key, draft] of Object.entries(workout.drafts)) {
    if (key.startsWith(id + ':') && !workout.snapshot.performedSets.some(x => slotKey(id, x.ordinal) === key && x.sessionExerciseId === id)) draft.weight = value
  }
}
export function updateTargets(workout: LocalWorkout, id: string, setCount: number, minReps: number, maxReps: number) {
  if (!targets({ setCount, minReps, maxReps })) throw new Error('세트와 반복 목표 범위를 확인해 주세요.')
  Object.assign(requireWeight(workout, id), { setCount, minReps, maxReps })
}
export function addWeight(workout: LocalWorkout, definitionId: string, name: string, randomId = () => crypto.randomUUID()) {
  const id = freshId(workout, randomId)
  workout.snapshot.sessionExercises.push({ id, kind: 'WEIGHT', exerciseDefinitionId: definitionId })
  workout.snapshot.appliedPlan.weightExercises.push({ sessionExerciseId: id, setCount: 3, minReps: 6, maxReps: 10 })
  workout.weights[id] = { value: '0', context: { kind: 'TODAY_ONLY', requestId: null } }; workout.exerciseNames[id] = name; workout.currentExerciseId = id
}
export function updateCardioPlan(workout: LocalWorkout, id: string, plan: CardioPlan) {
  if (!cardioPlan(plan) || plan.name.length > 100) throw new Error('유산소 이름(100자 이내)과 계획을 확인해 주세요.')
  const activity = workout.snapshot.appliedPlan.cardioActivities.find(x => x.sessionActivityId === id)
  if (!activity) throw new Error('현재 적용 계획에 없는 유산소입니다.')
  activity.plan = structuredClone(plan)
}
export function addCardio(workout: LocalWorkout, plan: CardioPlan, randomId = () => crypto.randomUUID()) {
  if (!cardioPlan(plan) || plan.name.length > 100) throw new Error('유산소 이름(100자 이내)과 계획을 확인해 주세요.')
  const id = freshId(workout, randomId)
  workout.snapshot.sessionExercises.push({ id, kind: 'CARDIO', exerciseDefinitionId: null })
  workout.snapshot.appliedPlan.cardioActivities.push({ sessionActivityId: id, plan: structuredClone(plan) }); workout.currentExerciseId = id
}
export function removeExercise(workout: LocalWorkout, id: string) {
  if (workout.snapshot.performedSets.some(x => x.sessionExerciseId === id) || workout.snapshot.cardioResults.some(x => x.sessionActivityId === id)) throw new Error('완료 기록을 먼저 취소해 주세요.')
  const p = workout.snapshot.appliedPlan
  if (p.weightExercises.length + p.cardioActivities.length <= 1) throw new Error('현재 계획에는 한 종목 이상이 필요합니다.')
  if (workout.timers[id]?.runningSince) throw new Error('유산소 타이머를 먼저 정지해 주세요.')
  p.weightExercises = p.weightExercises.filter(x => x.sessionExerciseId !== id); p.cardioActivities = p.cardioActivities.filter(x => x.sessionActivityId !== id)
  workout.currentExerciseId = p.weightExercises[0]?.sessionExerciseId ?? p.cardioActivities[0]?.sessionActivityId ?? ''
}
export function elapsed(timer: CardioTimer, now: number) {
  const delta = timer.runningSince ? now - Date.parse(timer.runningSince) : 0
  if (delta < 0) throw new Error('기기 시각이 타이머 시작보다 이릅니다. 원본을 보존하고 시각을 확인해 주세요.')
  const value = timer.accumulatedMs + delta
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('타이머 시간 범위를 확인해 주세요.')
  return value
}
export function timerAction(workout: LocalWorkout, id: string, action: 'start' | 'pause', now: number) {
  if (!workout.snapshot.appliedPlan.cardioActivities.some(x => x.sessionActivityId === id) || workout.snapshot.cardioResults.some(x => x.sessionActivityId === id)) throw new Error('현재 측정할 수 없는 유산소입니다.')
  const at = eventTime(workout, now), timer = workout.timers[id] ??= emptyTimer()
  if (timer.segments.at(-1) && Date.parse(timer.segments.at(-1)!.stoppedAt) > now) throw new Error('기기 시각이 이전 타이머 정지보다 이릅니다. 원본을 보존하고 시각을 확인해 주세요.')
  if (action === 'start' && !timer.runningSince) { timer.startedAt ??= at; timer.runningSince = at; timer.reviewing = false }
  if (action === 'pause' && timer.runningSince) {
    timer.accumulatedMs = elapsed(timer, now); timer.segments.push({ startedAt: timer.runningSince, stoppedAt: at }); timer.runningSince = null
  }
}
export function reviewCardio(workout: LocalWorkout, id: string, now: number) {
  timerAction(workout, id, 'pause', now)
  if (!workout.timers[id].startedAt) throw new Error('유산소를 먼저 시작해 주세요.')
  workout.timers[id].reviewing = true
}
export function completeCardio(workout: LocalWorkout, id: string, now: number, randomId = () => crypto.randomUUID()) {
  timerAction(workout, id, 'pause', now)
  const timer = workout.timers[id], activity = workout.snapshot.appliedPlan.cardioActivities.find(x => x.sessionActivityId === id)
  if (!timer?.startedAt || !activity) throw new Error('유산소를 먼저 시작해 주세요.')
  const timerMs = timer.accumulatedMs, corrected = timer.correctedSeconds !== null
  const activeMs = corrected ? countDraft(timer.correctedSeconds!) * 1000 : timerMs
  if (activeMs < 1 || activeMs > 86400000 || timerMs > now - Date.parse(timer.startedAt)) throw new Error('실제 활동 시간은 1ms~24시간이어야 합니다. 타이머와 정정값을 확인해 주세요.')
  const distanceKm = timer.distance.trim() ? decimalDraft(timer.distance) : null
  if (distanceKm !== null && (!['TREADMILL', 'BIKE', 'OUTDOOR'].includes(activity.plan.kind) || compareDistance(distanceKm) < 1000n || compareDistance(distanceKm) > 1000000000n)) throw new Error('거리는 0.001~1000 km이며 러닝머신·자전거·야외 운동에만 입력할 수 있습니다.')
  const averageBpm = timer.bpm.trim() ? countDraft(timer.bpm) : null
  if (averageBpm !== null && (averageBpm < 20 || averageBpm > 300)) throw new Error('평균 심박수는 20~300 BPM을 입력해 주세요.')
  const result = { id: freshId(workout, randomId), sessionActivityId: id, status: 'COMPLETED' as const, startedAt: timer.startedAt, occurredAt: eventTime(workout, now),
    result: { timerMs, activeMs, corrected, distanceKm, averageBpm } }
  workout.snapshot.cardioResults.push(result); workout.presence[result.id] = 'LOCAL_ONLY'
}
function compareDistance(value: string) { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0')) }
export function undoCardio(workout: LocalWorkout, recordId: string) {
  const record = workout.snapshot.cardioResults.find(x => x.id === recordId)
  if (!record) throw new Error('완료 유산소를 찾지 못했습니다.')
  workout.cancelled.cardio.push(structuredClone(record))
  if (workout.presence[record.id] !== 'LOCAL_ONLY') workout.snapshot.deletedCardioResultIds.push(record.id)
  if (!workout.presence[record.id] || workout.presence[record.id] === 'UNKNOWN') { workout.presence[record.id] = 'UNKNOWN'; workout.syncState = 'UNKNOWN' }
  workout.snapshot.cardioResults = workout.snapshot.cardioResults.filter(x => x.id !== recordId)
}
/** Navigation order is presentation only. Initial unfinished weight exercises come first. */
export function exerciseList(workout: LocalWorkout) {
  const initial = new Set(workout.initialPlan.weightExercises.map(x => x.sessionExerciseId))
  const weights = workout.snapshot.appliedPlan.weightExercises.map(x => ({ id: x.sessionExerciseId, name: workout.exerciseNames[x.sessionExerciseId] ?? '추가된 세션 종목', kind: 'WEIGHT' as const,
    priority: initial.has(x.sessionExerciseId) && workout.snapshot.performedSets.filter(s => s.sessionExerciseId === x.sessionExerciseId).length < x.setCount ? 0 : 1 }))
  return [...weights.sort((a, b) => a.priority - b.priority), ...workout.snapshot.appliedPlan.cardioActivities.map(x => ({ id: x.sessionActivityId, name: x.plan.name, kind: 'CARDIO' as const, priority: 2 }))]
}
export function applyLocalChange(previous: LocalWorkout, transform: (next: LocalWorkout) => void): LocalWorkout {
  const next = structuredClone(previous); transform(next)
  if (!snapshot(next.snapshot)) throw new Error('운동 저장 형식을 확인하지 못했습니다.')
  if (JSON.stringify(previous.snapshot) !== JSON.stringify(next.snapshot)) {
    next.localRevision = increment(previous.localRevision)
    next.syncState = next.syncState === 'UNKNOWN' ? 'UNKNOWN' : 'UNSENT'
  }
  next.editVersion = increment(previous.editVersion)
  return next
}
