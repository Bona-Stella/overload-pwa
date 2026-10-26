import { completionCounts, formatDuration, historicalWeightReview, summary } from '../workout/model'
import type { WorkoutSession } from '../workout/types'

export function SessionDetail({ session, saved }: { session: WorkoutSession; saved: boolean }) {
  const result = summary(session, session.endedAt ?? session.startedAt)
  const completion = completionCounts(session)
  return <>
    <p className="eyebrow">WORKOUT RECORD</p><h1>{saved ? '운동 기록 저장 완료' : '운동 기록 요약'}</h1><p className="muted">{session.date} · {session.routineName}</p>
    <p className={completion.allComplete ? 'success-text' : 'muted'}>{completion.allComplete ? '전체 루틴 완료 · ' : ''}완료 {completion.completed}{completion.total === null ? ' 본세트 · 당시 계획 수 미확인' : `/${completion.total} 본세트`}</p>
    <section className="card metrics"><div><span>운동 시간</span><strong>{formatDuration(result.elapsed)}</strong></div><div><span>완료 본세트</span><strong>{result.sets}<small> 세트</small></strong></div><div><span>총 볼륨</span><strong>{result.volume.toLocaleString('ko-KR', { maximumFractionDigits: 3 })}<small> kg</small></strong></div></section>
    <p className="notice">{saved ? '이 기기에 로컬 저장됨' : '저장 상태를 확인해 주세요'} · 서버 동기화 미지원</p>
    {!!session.updatedBenchmarks.length && <p className="notice success">기준 기록 갱신 · {session.updatedBenchmarks.join(', ')}</p>}
    {session.exercises.map(e => <section className="card" key={e.id}><div className="section-heading"><h2>{e.name}</h2>{e.sets.some(s => s.actual?.temporaryWeight) && <span className="badge">오늘만 중량 변경 포함</span>}</div><p className="muted small">목표 {e.minReps}–{e.maxReps}회{e.plannedSetCount !== undefined || !e.structureModified ? ` × ${e.plannedSetCount ?? e.setCount}본세트` : ' · 당시 계획 세트 수 미확인'}</p>{!e.sets.length && <p className="muted">완료한 세트 없음</p>}{e.sets.map(s => s.actual && <div className="history-set" key={s.id}><span>{s.ordinal}세트</span><strong>{s.actual.weight} kg × {s.actual.reps}회{s.actual.temporaryWeight && <small> · 오늘만</small>}</strong><span className="success-text">완료</span></div>)}</section>)}
    <section className="card" aria-label="이 운동의 중량 검토 결과"><h2>이 운동의 중량 검토 결과</h2><p className="small muted">당시 수행·승인 중량·계획에 따른 결과이며 현재 권고와 다릅니다.</p>{session.exercises.map(e => {
      const review = historicalWeightReview(session, e)
      return <div className="review-item" key={e.id}><h3>{e.name}</h3>{review.kind === 'unavailable' ? <p className="small muted">판정 제외 · {review.reason}</p> : <><strong>{review.kind === 'increase' ? '당시 증량 가능' : review.kind === 'decrease' ? '당시 감량 검토' : '당시 유지'}</strong><p className="small muted">승인 {review.weight}kg · {review.reps.join('/')}회 · 목표 {e.minReps}–{e.maxReps}회</p></>}</div>
    })}</section>
  </>
}
