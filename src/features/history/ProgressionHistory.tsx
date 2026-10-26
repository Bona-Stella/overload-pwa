import { currentWeightReviews } from '../workout/model'
import { formatWeightDelta } from '../workout/weight'
import type { WorkoutState } from '../workout/types'

export function CurrentWeightReview({ state, routineId }: { state: WorkoutState; routineId?: string }) {
  const reviews = currentWeightReviews(state, routineId)
  if (!reviews.length) return null
  return <section className="card progression-review" aria-label="현재 중량 조정 검토"><h2>현재 중량 조정 검토</h2><p className="small muted">현재 승인 중량과 비교 가능한 기록입니다. 변경은 직접 승인해 주세요.</p>
    {reviews.map(item => <div className="review-item" key={`${item.routineId}:${item.placementId}`}><h3>{item.exerciseName}</h3><p className="small muted">{item.routineName} · 승인 {item.weight}kg</p>
      {item.benchmark && <p className="success-text">기준 기록: 증량 가능 · {item.benchmark.reps.join('/')}회</p>}
      {item.latest && <p className={item.latest.review.kind === 'decrease' ? 'review-warning' : 'muted'}>최근 비교 가능 기록: {item.latest.date} · {item.latest.review.reps.join('/')}회{item.latest.review.kind === 'decrease' ? ' · 감량 검토' : ''}</p>}
    </div>)}
  </section>
}

export function ProgressChangeHistory({ state }: { state: WorkoutState }) {
  const events = [...(state.progressChanges ?? [])].sort((a, b) => b.occurredAt - a.occurredAt)
  if (!events.length) return null
  return <section className="card" aria-label="진행 중량 변경 내역"><h2>진행 중량 변경 내역</h2><p className="small muted">실제로 승인·저장한 변경입니다. 특정 운동의 결과였다고 추정하지 않습니다.</p>
    {events.map(event => <article className="review-item" key={event.id}><h3>{event.exerciseName}</h3><p className="small muted">{event.routineName}</p><p>{event.previousApprovedWeight} → {event.nextApprovedWeight}kg</p><strong>{event.nextApprovedWeight > event.previousApprovedWeight ? '증량 완료' : '감량 완료'} {formatWeightDelta(event.previousApprovedWeight, event.nextApprovedWeight)}kg</strong><p className="small muted"><time dateTime={new Date(event.occurredAt).toISOString()}>{new Date(event.occurredAt).toLocaleString('ko-KR')}</time> · {event.source === 'routine_editor' ? '루틴에서 승인' : '운동 화면에서 승인'}</p></article>)}
  </section>
}
