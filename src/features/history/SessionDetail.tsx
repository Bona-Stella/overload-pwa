import { formatDuration, summary } from '../workout/model'
import type { WorkoutSession } from '../workout/types'

export function SessionDetail({ session, saved }: { session: WorkoutSession; saved: boolean }) {
  const result = summary(session, session.endedAt ?? session.startedAt)
  return <>
    <p className="eyebrow">WORKOUT COMPLETE</p><h1>오늘도 한 걸음 더.</h1><p className="muted">{session.date} · {session.routineName}</p>
    <section className="card metrics"><div><span>운동 시간</span><strong>{formatDuration(result.elapsed)}</strong></div><div><span>완료 본세트</span><strong>{result.sets}<small> 세트</small></strong></div><div><span>총 볼륨</span><strong>{result.volume.toLocaleString('ko-KR', { maximumFractionDigits: 3 })}<small> kg</small></strong></div></section>
    <p className="notice">{saved ? '이 기기에 로컬 저장됨' : '저장 상태를 확인해 주세요'} · 서버 동기화 미지원</p>
    {!!session.updatedBenchmarks.length && <p className="notice success">기준 기록 갱신 · {session.updatedBenchmarks.join(', ')}</p>}
    {session.exercises.map(e => <section className="card" key={e.id}><div className="section-heading"><h2>{e.name}</h2>{e.sets.some(s => s.actual?.temporaryWeight) && <span className="badge">오늘만 중량 변경 포함</span>}</div><p className="muted small">목표 {e.minReps}–{e.maxReps}회 × {e.setCount}본세트</p>{!e.sets.length && <p className="muted">완료한 세트 없음</p>}{e.sets.map(s => s.actual && <div className="history-set" key={s.id}><span>{s.ordinal}세트</span><strong>{s.actual.weight} kg × {s.actual.reps}회{s.actual.temporaryWeight && <small> · 오늘만</small>}</strong><span className="success-text">완료</span></div>)}</section>)}
  </>
}
