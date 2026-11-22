import type { ActiveWeightContext, CardioPlan, Equipment, Session } from '../workout-online/types.ts'
import { newId } from '../../id.ts'
import { count, countDraft, counter, decimalDraft, snapshot, targets, cardioPlan, uuid, equipment } from '../workout-online/validation.ts'
import type { CardioTimer, LocalWorkout, RestPolicy, SetDraft } from './types.ts'
import { slotKey } from './types.ts'
import { actualCardioMeasurement, estimatedCardioDistance } from '../workout-online/cardio-measurement.ts'
import { supportsCardioMotion } from '../workout-online/cardio-draft.ts'
import { defaultRestAlerts, REST_TEST_MIDDLE_SECONDS, REST_TEST_SECONDS } from '../workout-flow/rest-alerts.ts'
import type { RestAlerts } from '../workout-flow/rest-alerts.ts'

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
  return { schemaVersion: 2, userId: server.userId, dataGeneration: server.dataGeneration, sessionId: server.id, editorDeviceId: server.editorDeviceId,
    writerEpoch: server.writerEpoch, startedAt: server.startedAt, initialPlan: structuredClone(server.initialPlan), snapshot: state,
    editVersion: '0', localRevision: server.localRevision, serverRevision: server.localRevision, serverVersion: server.version, syncState: 'CLEAN',
    recordedContexts: structuredClone(server.snapshot.recordedContexts), approvalResults: structuredClone(server.snapshot.approvalResults),
    presence: Object.fromEntries([...state.performedSets, ...state.cardioResults].map(x => [x.id, 'SERVER_CONFIRMED'])), cancelled: { sets: [], cardio: [] },
    drafts: {}, weights, timers: {}, exerciseNames: Object.fromEntries(server.initialPlan.weightExercises.map(x => [x.sessionExerciseId, x.exerciseName])),
    currentExerciseId: state.appliedPlan.weightExercises.find(e => !weightDone(state, e.sessionExerciseId))?.sessionExerciseId
      ?? state.appliedPlan.cardioActivities.find(a => !state.cardioResults.some(r => r.sessionActivityId === a.sessionActivityId))?.sessionActivityId
      ?? state.appliedPlan.cardioActivities.at(-1)?.sessionActivityId ?? state.appliedPlan.weightExercises.at(-1)?.sessionExerciseId ?? '',
    startedWeights: {}, preparationFrom: {},
    warmupCompleted: server.localRevision !== '0' || state.performedSets.length > 0 || state.cardioResults.length > 0 || !state.appliedPlan.weightExercises.length,
    equipmentMemos: {}, restPolicy: { ...restPolicy }, rests: {} }
}
export const emptyTimer = (): CardioTimer => ({ startedAt: null, runningSince: null, accumulatedMs: 0, segments: [], distance: '', speed: '', bpm: '', correctedSeconds: null, reviewing: false })
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
export function exerciseRest(workout: LocalWorkout, id = workout.currentExerciseId) {
  return workout.rests?.[id] ?? (workout.rest?.sessionExerciseId === id ? workout.rest : undefined)
}
export function migrateRest(workout: LocalWorkout) {
  workout.rests ??= workout.rest ? { [workout.rest.sessionExerciseId]: workout.rest } : {}
  delete workout.rest
  return workout.rests
}
export function restRemaining(workout: LocalWorkout, now: number, id = workout.currentExerciseId) {
  const rest = exerciseRest(workout, id)
  return rest ? Math.max(0, Math.ceil((Date.parse(rest.endsAt) - now) / 1000)) : 0
}
export function weightDone(snapshot: LocalWorkout['snapshot'], id: string) {
  const plan = snapshot.appliedPlan.weightExercises.find(e => e.sessionExerciseId === id)
  return !!plan && snapshot.performedSets.filter(s => s.sessionExerciseId === id).length >= plan.setCount
}
export function weightStarted(workout: LocalWorkout, id: string) {
  return !!workout.startedWeights?.[id] || workout.snapshot.performedSets.some(s => s.sessionExerciseId === id)
}
export function completeWarmup(workout: LocalWorkout, now: number) {
  if (workout.warmupCompleted !== false) return
  workout.warmupCompletedAt = eventTime(workout, now)
  workout.warmupCompleted = true
}
export function startExercise(workout: LocalWorkout, id: string, now: number) {
  if (workout.warmupCompleted === false || workout.currentExerciseId !== id) throw new Error('현재 준비 중인 종목을 확인해 주세요.')
  if (workout.snapshot.appliedPlan.weightExercises.some(e => e.sessionExerciseId === id)) {
    if (weightDone(workout.snapshot, id) || weightStarted(workout, id)) return
    const starts = workout.startedWeights ??= {}
    starts[id] = eventTime(workout, now)
  } else {
    timerAction(workout, id, 'start', now)
  }
  if (workout.preparationFrom) delete workout.preparationFrom[id]
}
export function preparationCompletedAt(workout: LocalWorkout, id: string) {
  const recordId = workout.preparationFrom?.[id]
  if (!recordId) return
  const set = workout.snapshot.performedSets.find(s => s.id === recordId)
  return set && weightDone(workout.snapshot, set.sessionExerciseId) ? set.completedAt
    : workout.snapshot.cardioResults.find(c => c.id === recordId)?.occurredAt
}
function exerciseOrder(snapshot: LocalWorkout['snapshot']) {
  return [...snapshot.appliedPlan.weightExercises.map(e => e.sessionExerciseId), ...snapshot.appliedPlan.cardioActivities.map(c => c.sessionActivityId)]
}
export function exercisePreparationStartedAt(workout: LocalWorkout, id: string) {
  const anchored = preparationCompletedAt(workout, id)
  if (anchored) return anchored
  const { snapshot } = workout, order = exerciseOrder(snapshot)
  const previous = order[order.indexOf(id) - 1]
  if (previous && weightDone(snapshot, previous)) {
    const completedAt = snapshot.performedSets.reduce<string | undefined>((latest, set) =>
      set.sessionExerciseId === previous && (!latest || Date.parse(set.completedAt) > Date.parse(latest)) ? set.completedAt : latest, undefined)
    if (completedAt) return completedAt
  }
  return snapshot.cardioResults.find(r => r.sessionActivityId === previous && r.status === 'COMPLETED')?.occurredAt
    ?? workout.warmupCompletedAt ?? workout.startedAt
}
/** Called inside the same durable transaction as the new completion record. */
export function advanceAfterCompletion(workout: LocalWorkout, id: string) {
  if (workout.currentExerciseId !== id) return
  const { snapshot } = workout
  const weight = weightDone(snapshot, id)
  const record = weight ? snapshot.performedSets.findLast(s => s.sessionExerciseId === id)
    : snapshot.cardioResults.find(c => c.sessionActivityId === id && c.status === 'COMPLETED')
  if (!record) return
  const order = exerciseOrder(snapshot)
  const next = order.slice(order.indexOf(id) + 1).find(target => !weightDone(snapshot, target) && !snapshot.cardioResults.some(c => c.sessionActivityId === target))
  if (!next) return
  if (!weightStarted(workout, next) && !workout.timers[next]?.startedAt) {
    const origins = workout.preparationFrom ??= {}
    origins[next] = record.id
  }
  // Keep the existing finish/continue choice at the WEIGHT → CARDIO boundary.
  if (!weight || snapshot.appliedPlan.weightExercises.some(e => e.sessionExerciseId === next)) workout.currentExerciseId = next
}
export function draftFor(workout: LocalWorkout, id: string, ordinal: number): SetDraft { return workout.drafts[slotKey(id, ordinal)] ?? { weight: workout.weights[id]?.value ?? '', reps: '' } }
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
export function completeSet(workout: LocalWorkout, id: string, ordinal: number, now: number, randomId = newId,
  alerts: Pick<RestAlerts, 'testMode' | 'middleAt'> = defaultRestAlerts) {
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
  const bodyweightLoad = plan.loadType === 'BODYWEIGHT' && draft.additionalWeight?.trim() ? { additionalWeightKg: decimalDraft(draft.additionalWeight) } : undefined
  const performed = { id: freshId(workout, randomId), sessionExerciseId: id, ordinal, weightKg, reps, completedAt, weightContext: { ...context }, manufacturerId: plan.manufacturerId, loadType: plan.loadType,
    ...(bodyweightLoad ? { bodyweightLoad } : {}) }
  workout.snapshot.performedSets.push(performed); workout.presence[performed.id] = 'LOCAL_ONLY'
  // Preserve the original input text, including trailing decimal zeros.
  workout.drafts[slotKey(id, ordinal)] = { ...draft }
  const rests = migrateRest(workout)
  if (weightDone(workout.snapshot, id)) delete rests[id]
  else {
    const seconds = alerts.testMode ? REST_TEST_SECONDS : restSeconds(workout.restPolicy, plan.maxReps)
    const middleAt = alerts.testMode ? REST_TEST_MIDDLE_SECONDS : alerts.middleAt
    rests[id] = { startedAt: completedAt, endsAt: new Date(now + seconds * 1000).toISOString(), seconds, sessionExerciseId: id, ordinal, middleAt }
  }
}
export function undoSet(workout: LocalWorkout, recordId: string) {
  const record = workout.snapshot.performedSets.find(x => x.id === recordId)
  if (!record) throw new Error('완료 기록을 찾지 못했습니다.')
  const starts = workout.startedWeights ??= {}
  starts[record.sessionExerciseId] ??= record.completedAt
  workout.cancelled.sets.push(structuredClone(record))
  // Local-only tombstones stay in cancelled, not in a server deletion list for nonexistent rows.
  // Unknown delivery must be reconciled in 5C; it is never silently treated as local-only.
  if (workout.presence[record.id] !== 'LOCAL_ONLY') workout.snapshot.deletedPerformedSetIds.push(record.id)
  if (!workout.presence[record.id] || workout.presence[record.id] === 'UNKNOWN') { workout.presence[record.id] = 'UNKNOWN'; workout.syncState = 'UNKNOWN' }
  workout.snapshot.performedSets = workout.snapshot.performedSets.filter(x => x.id !== recordId)
  workout.drafts[slotKey(record.sessionExerciseId, record.ordinal)] ??= { weight: record.weightKg, reps: String(record.reps), ...(record.bodyweightLoad ? { additionalWeight: record.bodyweightLoad.additionalWeightKg ?? '' } : {}) }
  if (exerciseRest(workout, record.sessionExerciseId)?.ordinal === record.ordinal) delete migrateRest(workout)[record.sessionExerciseId]
}
export function changeWeight(workout: LocalWorkout, id: string, value: string, approve: boolean, now: number, randomId = newId) {
  requireWeight(workout, id)
  const weight = decimalDraft(value)
  let context: ActiveWeightContext = { kind: 'TODAY_ONLY', requestId: null }
  if (approve) {
    const resolving = workout.pendingResolution
    if (resolving && !resolving.rejected && resolving.request.sessionExerciseId === id) throw new Error('이 종목의 승인 해결 결과를 먼저 확인해 주세요. 오늘만 중량 변경은 계속할 수 있습니다.')
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
export function changeEquipment(workout: LocalWorkout, id: string, settings: Equipment) {
  if (!equipment(settings)) throw new Error('장비 설정을 확인해 주세요.')
  const current = requireWeight(workout, id)
  if (workout.initialPlan.weightExercises.some(p => p.sessionExerciseId === id)
    && (current.manufacturerId !== settings.manufacturerId || current.loadType !== settings.loadType)) workout.originalCombinationChanged = true
  Object.assign(current, settings)
}
export function addWeight(workout: LocalWorkout, standardExerciseId: string, name: string, randomId = newId, settings: Equipment = { manufacturerId: null, loadType: null }) {
  if (!uuid(standardExerciseId) || !equipment(settings)) throw new Error('표준 운동과 장비 설정을 확인해 주세요.')
  const id = freshId(workout, randomId)
  workout.snapshot.sessionExercises.push({ id, kind: 'WEIGHT', standardExerciseId })
  workout.snapshot.appliedPlan.weightExercises.push({ sessionExerciseId: id, setCount: 3, minReps: 6, maxReps: 10, ...settings })
  workout.weights[id] = { value: '0', context: { kind: 'TODAY_ONLY', requestId: null } }; workout.exerciseNames[id] = name; workout.currentExerciseId = id
}
export function replaceWeight(workout: LocalWorkout, id: string, standardExerciseId: string, name: string, randomId = newId) {
  const target = requireWeight(workout, id)
  if (workout.snapshot.performedSets.some(s => s.sessionExerciseId === id)) throw new Error('완료 기록을 먼저 취소해 주세요.')
  const index = workout.snapshot.appliedPlan.weightExercises.findIndex(e => e.sessionExerciseId === id)
  const source = workout.replacementSlots?.[id] ?? workout.initialPlan.weightExercises.find(p => p.sessionExerciseId === id)?.sessionExerciseId
  addWeight(workout, standardExerciseId, name, randomId)
  const added = workout.currentExerciseId
  if (source) { workout.replacementSlots = { ...workout.replacementSlots, [added]:source }; workout.originalCombinationChanged = true }
  updateTargets(workout, added, target.setCount, target.minReps, target.maxReps)
  removeExercise(workout, id)
  const plan = workout.snapshot.appliedPlan.weightExercises
  const addition = plan.splice(plan.findIndex(e => e.sessionExerciseId === added),1)[0]
  plan.splice(index,0,addition); workout.currentExerciseId = added
}
export function updateCardioPlan(workout: LocalWorkout, id: string, plan: CardioPlan, estimate = false) {
  if (!cardioPlan(plan) || plan.name.length > 100) throw new Error('유산소 이름(100자 이내)과 계획을 확인해 주세요.')
  const activity = workout.snapshot.appliedPlan.cardioActivities.find(x => x.sessionActivityId === id)
  if (!activity) throw new Error('현재 적용 계획에 없는 유산소입니다.')
  if (workout.snapshot.cardioResults.some(result => result.sessionActivityId === id)) throw new Error('확정된 유산소 기록의 계획은 편집할 수 없습니다.')
  const previous = activity.plan
  if (plan.standardExerciseId !== previous.standardExerciseId || plan.activityId !== previous.activityId
    || plan.kind !== previous.kind || plan.name !== previous.name) throw new Error('다른 유산소는 종목 교체로 적용해 주세요.')
  activity.plan = structuredClone(plan)
  const timer = workout.timers[id]
  if (timer?.reviewing) applyCardioEstimate(timer, plan, estimate)
}
export function addCardio(workout: LocalWorkout, plan: CardioPlan, randomId = newId) {
  if (!cardioPlan(plan) || plan.name.length > 100) throw new Error('유산소 이름(100자 이내)과 계획을 확인해 주세요.')
  const id = freshId(workout, randomId)
  workout.snapshot.sessionExercises.push({ id, kind: 'CARDIO', standardExerciseId: plan.standardExerciseId ?? null })
  workout.snapshot.appliedPlan.cardioActivities.push({ sessionActivityId: id, plan: structuredClone(plan) }); workout.currentExerciseId = id
}
export function replaceCardio(workout: LocalWorkout, id: string, plan: CardioPlan, randomId = newId) {
  const activities = workout.snapshot.appliedPlan.cardioActivities
  const index = activities.findIndex(activity => activity.sessionActivityId === id)
  if (index < 0 || workout.timers[id]?.startedAt || workout.snapshot.cardioResults.some(result => result.sessionActivityId === id)) {
    throw new Error('측정 시작 전의 유산소만 교체할 수 있습니다.')
  }
  if (!plan.standardExerciseId || !plan.activityId) throw new Error('표준 유산소 종목을 선택해 주세요.')
  addCardio(workout, plan, randomId)
  activities.splice(index, 1, activities.pop()!)
  delete workout.timers[id]
}
export function removeExercise(workout: LocalWorkout, id: string) {
  if (workout.snapshot.performedSets.some(x => x.sessionExerciseId === id) || workout.snapshot.cardioResults.some(x => x.sessionActivityId === id)) throw new Error('완료 기록을 먼저 취소해 주세요.')
  const p = workout.snapshot.appliedPlan
  if (p.weightExercises.length + p.cardioActivities.length <= 1) throw new Error('현재 계획에는 한 종목 이상이 필요합니다.')
  if (workout.timers[id]?.runningSince) throw new Error('유산소 타이머를 먼저 정지해 주세요.')
  p.weightExercises = p.weightExercises.filter(x => x.sessionExerciseId !== id); p.cardioActivities = p.cardioActivities.filter(x => x.sessionActivityId !== id)
  delete migrateRest(workout)[id]
  if (workout.startedWeights) delete workout.startedWeights[id]
  if (workout.preparationFrom) delete workout.preparationFrom[id]
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
function applyCardioEstimate(timer: CardioTimer, plan: CardioPlan, enabled: boolean) {
  if (!supportsCardioMotion(plan.kind)) return
  const activeMs = timer.correctedSeconds === null ? timer.accumulatedMs : Number(timer.correctedSeconds) * 1000
  Object.assign(timer, estimatedCardioDistance({ ...timer, speed: timer.speed ?? '' }, plan.targetDistanceKm, activeMs, enabled))
}
export function reviewCardio(workout: LocalWorkout, id: string, now: number, estimate = false) {
  timerAction(workout, id, 'pause', now)
  const timer = workout.timers[id]
  if (!timer.startedAt) throw new Error('유산소를 먼저 시작해 주세요.')
  const plan = workout.snapshot.appliedPlan.cardioActivities.find(activity => activity.sessionActivityId === id)!.plan
  applyCardioEstimate(timer, plan, estimate)
  timer.reviewing = true
}
export function completeCardio(workout: LocalWorkout, id: string, now: number, randomId = newId) {
  timerAction(workout, id, 'pause', now)
  const timer = workout.timers[id], activity = workout.snapshot.appliedPlan.cardioActivities.find(x => x.sessionActivityId === id)
  if (!timer?.startedAt || !activity) throw new Error('유산소를 먼저 시작해 주세요.')
  const timerMs = timer.accumulatedMs, corrected = timer.correctedSeconds !== null
  const activeMs = corrected ? countDraft(timer.correctedSeconds!) * 1000 : timerMs
  if (activeMs < 1 || activeMs > 86400000 || timerMs > now - Date.parse(timer.startedAt)) throw new Error('실제 활동 시간은 1ms~24시간이어야 합니다. 타이머와 정정값을 확인해 주세요.')
  const { distanceKm, measurement } = actualCardioMeasurement({ ...timer, speed: timer.speed ?? '' }, activeMs)
  if ((distanceKm !== null || measurement.actualSpeedKmh !== null) && !supportsCardioMotion(activity.plan.kind)) throw new Error('거리와 속도는 러닝머신·자전거·야외 운동에만 입력할 수 있습니다.')
  const averageBpm = timer.bpm.trim() ? countDraft(timer.bpm) : null
  if (averageBpm !== null && (averageBpm < 20 || averageBpm > 300)) throw new Error('평균 심박수는 20~300 BPM을 입력해 주세요.')
  const result = { id: freshId(workout, randomId), sessionActivityId: id, status: 'COMPLETED' as const, startedAt: timer.startedAt, occurredAt: eventTime(workout, now),
    result: { timerMs, activeMs, corrected, distanceKm, averageBpm, ...(distanceKm !== null || measurement.actualSpeedKmh !== null ? { measurement } : {}) } }
  workout.snapshot.cardioResults.push(result); workout.presence[result.id] = 'LOCAL_ONLY'
}
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
// Clock checkpoints stay durable locally. The next record edit or FINISH carries them with its snapshot.
export function advancesLocalRevision(previous: LocalWorkout, next: LocalWorkout, deferWeightTiming: boolean) {
  const snapshotJson = (state: LocalWorkout['snapshot']) => JSON.stringify(deferWeightTiming ? { ...state, weightTiming: undefined } : state)
  return snapshotJson(previous.snapshot) !== snapshotJson(next.snapshot) || !previous.finish && !!next.finish
}

export function applyLocalChange(previous: LocalWorkout, transform: (next: LocalWorkout) => void, deferWeightTiming = false): LocalWorkout {
  const next = structuredClone(previous); transform(next)
  for (const record of previous.snapshot.performedSets) {
    const current = next.snapshot.performedSets.find(s => s.id === record.id)
    if (current && (current.manufacturerId !== record.manufacturerId || current.loadType !== record.loadType)) throw new Error('완료 당시 장비는 변경할 수 없습니다.')
  }
  if (!snapshot(next.snapshot)) throw new Error('운동 저장 형식을 확인하지 못했습니다.')
  if (advancesLocalRevision(previous, next, deferWeightTiming)) {
    next.localRevision = increment(previous.localRevision)
    next.syncState = next.syncState === 'UNKNOWN' ? 'UNKNOWN' : 'UNSENT'
  }
  next.editVersion = increment(previous.editVersion)
  return next
}
