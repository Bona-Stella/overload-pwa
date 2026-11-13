import type { AssessmentView, PerformedSet, Session, StandardExercise } from './types.ts'
import type { WeightSummary, CardioSummary } from '../workout-flow/WorkoutSummary.tsx'
import { resultView } from '../workout-local/flow-data.ts'

/** Display arithmetic only; the server owns completion eligibility and advice. */
export function setVolume(set: PerformedSet): string | null {
  const kg = set.loadType === 'BODYWEIGHT' ? set.bodyweightLoad?.additionalWeightKg : set.weightKg
  if (kg == null) return null
  const [whole, fraction = ''] = kg.split('.')
  const volume = (BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'))) * BigInt(set.reps)
  const decimals = String(volume % 1000000n).padStart(6, '0').replace(/0+$/, '')
  return String(volume / 1000000n) + (decimals ? '.' + decimals : '')
}
export function summaryData(server: Session, assessment: AssessmentView | null, definitions: StandardExercise[] = []) {
  const snapshot = server.snapshot.state, initial = server.initialPlan
  const current = assessment?.sessionId === server.id && assessment.version === server.version ? assessment : null
  const evaluation = current?.currentAssessment.evaluation
  const review = current?.weightReview?.sessionVersion === server.version ? current.weightReview : null
  let reviewIssue: string | undefined
  const ids = [...new Set([...snapshot.appliedPlan.weightExercises.map(e => e.sessionExerciseId), ...snapshot.performedSets.map(s => s.sessionExerciseId)])]
  const weights: WeightSummary[] = ids.map(id => {
    const planned = initial.weightExercises.find(e => e.sessionExerciseId === id)
    const target = snapshot.appliedPlan.weightExercises.find(e => e.sessionExerciseId === id)
    const registry = snapshot.sessionExercises.find(e => e.id === id)
    const result = review?.exercises.find(e => e.sessionExerciseId === id)
    const actual = snapshot.performedSets.filter(s => s.sessionExerciseId === id)
    const actionable = result?.advice === 'INCREASE' || result?.advice === 'DECREASE'
    const linked = !!result && result.sets.length === actual.length && result.completedSetCount === actual.length
      && result.sets.every(set => actual.some(s => s.id === set.performedSetId && s.ordinal === set.ordinal && s.reps === set.reps))
    if (actionable && (!linked || result.referenceWeightKg === null)) reviewIssue = '중량 검토에 해당하는 수행 기록을 확인하지 못했습니다. 기록을 다시 조회해 주세요.'
    const guidance: WeightSummary['review'] = actionable && linked && result.referenceWeightKg !== null ? {
      direction: result.advice === 'INCREASE' ? 'increase' : 'decrease', referenceKg: result.referenceWeightKg,
      planned: result.plannedSetCount, completed: result.completedSetCount, incomplete: result.incomplete,
      sets: result.sets.map(set => ({ id: set.performedSetId, reps: set.reps, contributes: set.contributes })),
    } : undefined
    return { id, name: planned?.exerciseName ?? definitions.find(e => e.id === registry?.standardExerciseId)?.name ?? '세션에서 추가한 운동',
      referenceKg: planned?.approvedWeightKg ?? null, planned: target?.setCount, goal: target ? `${target.minReps}–${target.maxReps}회 × ${target.setCount}세트` : undefined,
      results: actual.sort((a, b) => a.ordinal - b.ordinal)
        .map(s => ({ id: s.ordinal, result: resultView(s), volume: setVolume(s) })),
      review: guidance }
  })
  const cardioIds = [...new Set([...snapshot.appliedPlan.cardioActivities.map(e => e.sessionActivityId), ...snapshot.cardioResults.map(e => e.sessionActivityId)])]
  const cardio: CardioSummary[] = cardioIds.flatMap(id => {
    const original = initial.cardioActivities.find(e => e.sessionActivityId === id)
    const plan = snapshot.appliedPlan.cardioActivities.find(e => e.sessionActivityId === id)?.plan ?? original?.plan
    const record = snapshot.cardioResults.find(e => e.sessionActivityId === id)
    return [{ id, plan, added: !original, phase: record?.status === 'COMPLETED' ? 'completed' : record?.status === 'SKIPPED' ? 'skipped' : 'ready',
      draft: { distance: '', speed: '', bpm: '', correctedSeconds: null }, result: record?.result ?? undefined }]
  })
  return { reviewUnavailable: review?.exercises.filter(e => e.advice === 'UNAVAILABLE').length ?? 0, reviewState: review ? 'ready' as const : 'unavailable' as const, reviewIssue, routine: initial.routineName, date: server.workoutDate, deload: false,
    elapsed: server.endedAt ? Math.max(0, Date.parse(server.endedAt) - Date.parse(server.startedAt)) : undefined,
    plannedSets: weights.reduce((sum, w) => sum + (w.planned ?? w.results.length), 0), weights, cardio,
    whole: evaluation?.overallWeightPlanComplete === true && cardio.every(c => c.phase === 'completed'),
    dataNote: server.deletedAt ? '삭제된 운동 · 원본 및 변경 이력은 보존됩니다.' : server.status === 'AUTO_CLOSED'
      ? '서버 자동 종료 · 실제 종료 시각과 최초 종료 평가는 없습니다.' : '서버에 저장된 수행 기록 · 중량 검토는 서버 평가 결과입니다.' }
}
