import { formatDuration, hasIncompleteSets, resolveWorkoutTimer, summary } from './model'
import type { WorkoutSession } from './types'

export function ResumeWorkoutCard({ session, now, onResume }: { session: WorkoutSession; now: number; onResume: () => void }) {
  const result = summary(session, now)
  const timer = resolveWorkoutTimer(session)
  const resting = timer?.kind === 'rest' && timer.endAt > now
  const status = session.phase === 'warmup' ? '준비운동 중' : !hasIncompleteSets(session) ? '운동 종료 대기' : resting ? '휴식 중' : timer?.kind === 'transition' ? '종목 전환 중' : '운동 중'
  return <section className="card resume-card" aria-label="진행 중인 운동">
    <span className="badge">{status}</span><h2>{session.routineName}</h2>
    <p className="muted small">{result.sets}세트 완료 · 전체 {formatDuration(result.elapsed)}</p>
    {session.phase !== 'warmup' && (resting && timer?.kind === 'rest' ? <p className="resume-timer">남은 휴식 {formatDuration(timer.endAt - now)}</p> : timer?.kind === 'transition' ? <p className="resume-timer">완료 후 경과 {formatDuration(now - timer.since)}</p> : null)}
    <button className="primary full" onClick={onResume}>운동 이어하기 →</button>
  </section>
}
