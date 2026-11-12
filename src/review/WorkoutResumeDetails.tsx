
import { formatDuration } from '../features/workout/model.ts'
import { cardioPhaseLabel } from '../features/workout-flow/types.ts'
import { cardioElapsed, doneCount, nextPending, restRemaining } from './workout-model.ts'
import type { ReviewSession } from './workout-model.ts'
import { useReviewClock } from './useReviewClock.ts'

export function WorkoutResumeDetails({ session }: { session: ReviewSession }) {
  const [now] = useReviewClock(500)
  const weight = session.weights.find(w => w.id === session.currentId)
  const cardio = session.cardio.find(c => c.id === session.currentId)
  const remaining = restRemaining(weight, now)
  const status = session.warmup ? '준비운동 중' : !nextPending(session) ? '운동 종료 대기'
    : cardio ? cardioPhaseLabel[cardio.phase] : remaining ? '휴식 중' : session.transition ? '종목 전환 중' : '운동 중'
  return <div className="muted small">
    <p>{status} · 전체 {formatDuration(now - session.startedAt)} · 완료 {session.weights.reduce((total, w) => total + doneCount(w), 0)}세트</p>
    {cardio && <p>{cardio.plan.name} · {formatDuration(cardio.result?.activeMs ?? cardioElapsed(cardio, now))}</p>}
    {remaining > 0 && <p>남은 휴식 {formatDuration(remaining * 1000)}</p>}
  </div>
}
