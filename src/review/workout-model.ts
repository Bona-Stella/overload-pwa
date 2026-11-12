
import { activeCardio, activeWeights } from '../features/home/model.ts'
import { additionalLoadInput } from '../features/workout-online/bodyweight-load.ts'
import { measuredCardio } from '../features/workout-online/cardio-measurement.ts'
import type { CardioPlan, Equipment, InitialPlan, Routine, Session, StandardExercise } from '../features/workout-online/types.ts'
import { countDraft, decimalDraft } from '../features/workout-online/validation.ts'
import { restSeconds } from '../features/workout-local/model.ts'
import type { ActualCardio, CardioFocusData, RestAlerts, SetDraft, SetResult, SetRow, WeightAdvice, WeightFocusData } from '../features/workout-flow/types.ts'
import { newId } from '../id.ts'

export const reviewRest = { restLowSeconds: 180, restMediumSeconds: 120, restHighSeconds: 90 }
export const defaultRestAlerts: RestAlerts = { flash: true, threshold: 5, sound: true }
export const reviewClock = () => Date.now()

export type ReviewWeight = WeightFocusData & {
  nextSlot: number; rest?: { ends: number; slot: number }
}
export type ReviewCardio = CardioFocusData & {
  accumulated: number; runningSince: number | null
}
export type ReviewSession = {
  id: string; startedAt: number; warmup: boolean; currentId: string; deload: boolean; initialPlan: InitialPlan
  weights: ReviewWeight[]; cardio: ReviewCardio[]; transition?: { exerciseId: string; at: number }
}
export type ReviewRecord = { session: ReviewSession; endedAt: number }

function slot(id: number, kg: string, previous?: SetDraft): SetRow {
  return { id, previous, draft: { kg, reps: previous?.reps ?? '', additional: previous?.additional ?? '' } }
}

export function previousSets(sessions: Session[], standardId: string, equipment: Equipment, approved?: string) {
  for (const session of sessions) {
    const plan = session.initialPlan.weightExercises.find(p => p.standardExerciseId === standardId &&
      p.manufacturerId === equipment.manufacturerId && p.loadType === equipment.loadType)
    if (!plan) continue
    const records = session.snapshot.state.performedSets.filter(s => s.sessionExerciseId === plan.sessionExerciseId &&
      s.manufacturerId === equipment.manufacturerId && s.loadType === equipment.loadType &&
      (approved === undefined || approved === s.weightKg && s.weightContext.kind === 'INITIAL_APPROVED'))
    if (records.length) return new Map(records.map(s => [s.ordinal, {
      kg: s.weightKg, reps: String(s.reps), additional: s.bodyweightLoad?.additionalWeightKg ?? '',
    }]))
  }
  return new Map<number, SetDraft>()
}

export function makeCardio(plan: CardioPlan, id = newId()): ReviewCardio {
  return { id, plan: structuredClone(plan), phase: 'ready', accumulated: 0, runningSince: null,
    draft: { distance: '', speed: '', bpm: '', correctedSeconds: null } }
}

export function startReview(routine: Routine, deload: boolean, now: number, history: Session[]): ReviewSession {
  const plannedWeights = activeWeights(routine), plannedCardio = activeCardio(routine)
  if (!plannedWeights.length && !plannedCardio.length) throw Error('루틴에 운동 종목이 필요합니다.')
  const initialPlan: InitialPlan = {
    schemaVersion: 2, routineId: routine.id, routineName: routine.name, routineVersion: routine.version,
    weightExercises: plannedWeights.map(p => ({ ...p, sourcePlacementId: p.id, sessionExerciseId: newId() })),
    cardioActivities: plannedCardio.map(p => ({ sourcePlacementId: p.id, sessionActivityId: newId(), plan: structuredClone(p.plan) })),
  }
  const weights = initialPlan.weightExercises.map((p): ReviewWeight => {
    const previous = deload ? undefined : previousSets(history, p.standardExerciseId, p, p.approvedWeightKg)
    return {
      id: p.sessionExerciseId, standardId: p.standardExerciseId, name: p.exerciseName,
      min: p.minReps, max: p.maxReps, working: p.approvedWeightKg, approved: p.approvedWeightKg, mode: 'approved',
      manufacturerId: p.manufacturerId, loadType: p.loadType, memo: '', nextSlot: p.setCount + 1,
      sets: Array.from({ length: p.setCount }, (_, i) => slot(i + 1, p.approvedWeightKg, previous?.get(i + 1))),
    }
  })
  const cardio = initialPlan.cardioActivities.map(p => makeCardio(p.plan, p.sessionActivityId))
  return { id: newId(), startedAt: now, warmup: weights.length > 0, currentId: weights[0]?.id ?? cardio[0].id, deload, initialPlan, weights, cardio }
}

export function newReviewWeight(exercise: StandardExercise, history: Map<number, SetDraft>, equipment: Equipment): ReviewWeight {
  const working = history.get(1)?.kg ?? history.values().next().value?.kg ?? ''
  return { id: newId(), standardId: exercise.id, name: exercise.name, min: 6, max: 10,
    ...equipment, working, approved: null, mode: 'today', memo: '', nextSlot: 4,
    sets: [1, 2, 3].map(id => slot(id, history.get(id)?.kg ?? working, history.get(id))) }
}

export const doneCount = (weight: ReviewWeight) => weight.sets.filter(s => s.result).length
export const weightDone = (weight: ReviewWeight) => weight.sets.every(s => s.result)
export const restRemaining = (weight: ReviewWeight | undefined, now: number) =>
  weight?.rest && !weightDone(weight) ? Math.max(0, Math.ceil((weight.rest.ends - now) / 1000)) : 0
export const cardioElapsed = (cardio: ReviewCardio, now: number) =>
  cardio.accumulated + (cardio.runningSince === null ? 0 : Math.max(0, now - cardio.runningSince))

export function addSet(weight: ReviewWeight): ReviewWeight {
  return { ...weight, nextSlot: weight.nextSlot + 1, sets: [...weight.sets, slot(weight.nextSlot, weight.working)] }
}

export function changeWeight(weight: ReviewWeight, value: string, mode: 'today' | 'progression', history = new Map<number, SetDraft>()): ReviewWeight {
  const kg = decimalDraft(value)
  return { ...weight, working: kg, approved: mode === 'progression' ? kg : weight.approved, mode,
    sets: weight.sets.map(s => {
      if (s.result) return s
      const previous = mode === 'progression' ? history.get(s.id) : undefined
      return { ...s, previous, draft: { ...s.draft, kg, reps: previous?.reps ?? '' } }
    }) }
}

export function finishSet(session: ReviewSession, weight: ReviewWeight, set: SetRow, now: number, previewRest: boolean): ReviewSession {
  if (set.result || restRemaining(weight, now)) return session
  const kg = decimalDraft(set.draft.kg)
  const result: SetResult = {
    kg, reps: countDraft(set.draft.reps), at: now,
    manufacturerId: weight.manufacturerId, loadType: weight.loadType,
    additionalKg: weight.loadType === 'BODYWEIGHT' ? additionalLoadInput(set.draft.additional).additionalWeightKg : null,
    mode: kg === weight.approved && weight.mode !== 'today' ? weight.mode : 'today',
  }
  const updated = { ...weight, sets: weight.sets.map(s => s.id === set.id ? { ...s, result } : s) }
  const complete = weightDone(updated)
  updated.rest = complete ? undefined : { slot: set.id,
    ends: now + (previewRest ? 12 : restSeconds(reviewRest, weight.max)) * 1000 }
  return { ...session, weights: session.weights.map(w => w.id === updated.id ? updated : w),
    transition: complete ? { exerciseId: weight.id, at: now } : undefined }
}

export function cancelSet(weight: ReviewWeight, id: number): ReviewWeight {
  return { ...weight, rest: weight.rest?.slot === id ? undefined : weight.rest,
    sets: weight.sets.map(s => s.id === id ? { ...s, result: undefined } : s) }
}

export function nextPending(session: ReviewSession) {
  const { weights, cardio, currentId, initialPlan } = session
  const index = weights.findIndex(w => w.id === currentId)
  const ordered = [...weights.slice(index + 1), ...weights.slice(0, index + 1)].filter(w => !weightDone(w))
  const cardioIndex = cardio.findIndex(c => c.id === currentId)
  const orderedCardio = [...cardio.slice(cardioIndex + 1), ...cardio.slice(0, cardioIndex + 1)]
  return (ordered.find(w => initialPlan.weightExercises.some(p => p.sessionExerciseId === w.id)) ?? ordered[0])?.id
    ?? orderedCardio.find(c => c.phase !== 'completed')?.id
}

export function recordCardio(cardio: ReviewCardio): ActualCardio {
  const { draft, accumulated: timerMs } = cardio
  const corrected = draft.correctedSeconds !== null
  const activeMs = corrected ? countDraft(draft.correctedSeconds!) * 1000 : timerMs
  if (activeMs < 1 || activeMs > 86400000) throw Error('실제 활동 시간은 0초 초과, 24시간 이하여야 합니다.')
  const averageBpm = draft.bpm.trim() ? countDraft(draft.bpm) : null
  if (averageBpm !== null && (averageBpm < 20 || averageBpm > 300)) throw Error('평균 심박수는 20~300 BPM을 입력해 주세요.')
  return { timerMs, activeMs, corrected, averageBpm, ...measuredCardio(draft.speed, draft.distance, activeMs) }
}

export function sessionAdvice(session: ReviewSession, weight: ReviewWeight, final = false): WeightAdvice {
  const initial = session.initialPlan.weightExercises.find(p => p.sessionExerciseId === weight.id)
  if (session.deload) return { text: '디로딩 운동 · 검토 제외' }
  if (!initial || initial.setCount !== weight.sets.length) return { text: '임시 세트 구성 · 검토 제외' }
  if (final && session.initialPlan.weightExercises.some(p => {
    const current = session.weights.find(w => w.id === p.sessionExerciseId)
    return !current || doneCount(current) < p.setCount
  })) return { text: '일부 원래 계획 미완료 · 검토 제외' }
  const results = weight.sets.flatMap(s => s.result ? [s.result] : [])
  if (results.length !== initial.setCount) return { text: '일부 세트 미완료 · 검토 제외' }
  const kg = results[0].kg
  if (results.some(r => r.mode === 'today' || r.kg !== kg) || kg !== weight.approved) return { text: '임시 또는 혼합 중량 · 검토 제외' }
  const advice = results.every(r => r.reps >= initial.maxReps) ? 'increase'
    : results.some(r => r.reps < initial.minReps) ? 'decrease' : 'maintain'
  return { advice, text: advice === 'increase' ? '당시 증량 가능' : advice === 'decrease' ? '당시 감량 검토' : '당시 유지', kg,
    reps: results.map(r => r.reps).join(' / ') }
}

export function setVolume(result: SetResult) {
  const kg = result.loadType === 'BODYWEIGHT' ? result.additionalKg : result.kg
  return kg === null ? null : Number(kg) * result.reps
}
