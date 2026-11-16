import {recordTime as formatRecordTime} from '../../components/record-time.ts'
import { changedOriginalCombination } from './approval-weight.ts'
import type { AssessmentView, Session, StandardExercise } from './types.ts'
import type { WeightSummary, CardioSummary } from '../workout-flow/WorkoutSummary.tsx'
import { resultView } from '../workout-local/flow-data.ts'

export {setVolume} from './record-summary.ts'
import {setVolume,recordSummary} from './record-summary.ts'
import {achievementReasons} from '../statistics/display-achievement.ts'
import {recordRange} from '../../components/record-time.ts'

export function summaryData(server: Session, assessment: AssessmentView | null, definitions: StandardExercise[] = [], localCombinationChanged = false) {
  const snapshot = server.snapshot.state, initial = server.initialPlan
  const current = assessment?.sessionId === server.id && assessment.version === server.version ? assessment : null
  const evaluation = current?.currentAssessment.evaluation
  const review = current?.weightReview?.sessionVersion === server.version ? current.weightReview : null
  let reviewIssue: string | undefined
  const ids = [...new Set([...initial.weightExercises.map(e=>e.sessionExerciseId), ...snapshot.appliedPlan.weightExercises.map(e => e.sessionExerciseId), ...snapshot.performedSets.map(s => s.sessionExerciseId)])]
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
    return { id, loadType: target?.loadType ?? planned?.loadType ?? null, name: planned?.exerciseName ?? definitions.find(e => e.id === registry?.standardExerciseId)?.name ?? '세션에서 추가한 운동',
      referenceKg: planned?.approvedWeightKg ?? null, planned: target?.setCount, goal: target ? `${target.minReps}–${target.maxReps}회 × ${target.setCount}세트` : undefined,
      results: actual.sort((a, b) => a.ordinal - b.ordinal)
        .map(s => ({ id: s.ordinal, result: resultView(s), volume: setVolume(s) })),
      review: guidance }
  })
  const cardioIds = [...new Set([...initial.cardioActivities.map(e=>e.sessionActivityId), ...snapshot.appliedPlan.cardioActivities.map(e => e.sessionActivityId), ...snapshot.cardioResults.map(e => e.sessionActivityId)])]
  const cardio: CardioSummary[] = cardioIds.flatMap(id => {
    const original = initial.cardioActivities.find(e => e.sessionActivityId === id)
    const plan = snapshot.appliedPlan.cardioActivities.find(e => e.sessionActivityId === id)?.plan ?? original?.plan
    const record = snapshot.cardioResults.find(e => e.sessionActivityId === id)
    return [{ id, plan, added: !original, phase: record?.status === 'COMPLETED' ? 'completed' : record?.status === 'SKIPPED' ? 'skipped' : 'ready',
      draft: { distance: '', speed: '', bpm: '', correctedSeconds: null }, result: record?.result ?? undefined }]
  })
  return { recordFacts:recordSummary(server),achievementReasons:achievementReasons(server),recordRange:recordRange(server.startedAt,server.endedAt,server.startedTimeZone,server.workoutDate), historicalWeights: historicalReviews(server), reviewExcluded: localCombinationChanged || changedOriginalCombination(initial, snapshot), reviewUnavailable: review?.exercises.filter(e => e.advice === 'UNAVAILABLE').length ?? 0, reviewState: review ? 'ready' as const : 'unavailable' as const, reviewIssue, routine: initial.routineName, recordTime:formatRecordTime(server.startedAt,server.startedTimeZone,server.workoutDate), date: server.workoutDate, deload: false,
    elapsed: server.endedAt ? Math.max(0, Date.parse(server.endedAt) - Date.parse(server.startedAt)) : undefined,
    plannedSets: weights.reduce((sum, w) => sum + (w.planned ?? w.results.length), 0), weights, cardio,
    whole: evaluation?.overallWeightPlanComplete === true && cardio.every(c => c.phase === 'completed'),
    dataNote: server.deletedAt ? '삭제된 운동 · 원본 및 변경 이력은 보존됩니다.' : server.status === 'AUTO_CLOSED'
      ? '서버 자동 종료 · 실제 종료 시각과 최초 종료 평가는 없습니다.' : '서버에 저장된 수행 기록 · 중량 검토는 서버 평가 결과입니다.' }
}

/** Frozen FINISH evidence only. Corrections and current evaluations never manufacture a past judgment. */
export function historicalReviews(server:Session):WeightSummary[]{
  const evaluation=server.completionAssessment
  if(server.status!=='FINISHED'||!evaluation||evaluation.overallWeightPlanComplete!==true)return []
  return evaluation.exercises.flatMap(e=>{
    const p=server.initialPlan.weightExercises.find(p=>p.sessionExerciseId===e.sessionExerciseId),context=e.comparisonContext
    if(!e.eligible||!p||!context||!['INCREASE','DECREASE'].includes(e.advice)||context.routineId!==server.initialPlan.routineId||context.sourcePlacementId!==p.sourcePlacementId||context.standardExerciseId!==p.standardExerciseId||e.evaluatedReps.length!==context.plannedSetCount||e.evaluatedPerformedSetIds.length!==context.plannedSetCount)return []
    return [{id:e.sessionExerciseId,name:p.exerciseName,loadType:p.loadType,results:[],review:{direction:e.advice==='INCREASE'?'increase' as const:'decrease' as const,referenceKg:context.approvedWeightKg,planned:context.plannedSetCount,completed:e.evaluatedReps.length,incomplete:false,sets:e.evaluatedReps.map((reps,i)=>({id:e.evaluatedPerformedSetIds[i],reps,contributes:e.advice==='INCREASE'||reps<context.minReps}))}}]
  })
}
