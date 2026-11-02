import { useEffect, useRef, useState } from 'react'
import type { Scope } from '../workout-online/types.ts'
import type { Statistics, StatisticsApi, WeightStats, Overview } from './api.ts'
import { periodFor } from './api.ts'
import './statistics.css'

const groups: Record<string, string> = { CHEST: '가슴', BACK: '등', SHOULDERS: '어깨', ARMS: '팔', LEGS: '하체', CORE: '코어' }
const minutes = (ms: string) => (BigInt(ms) / 60000n).toString()
type Row = { key: string; name: string; weights: WeightStats }
export function WeightChart({ rows }: { rows: Row[] }) {
  const [metric, setMetric] = useState<'sets' | 'volume'>('sets')
  const volumeAvailable = rows.some(r => r.weights.volumeLoadKg !== null)
  const values = rows.map(r => metric === 'volume' && volumeAvailable ? r.weights.volumeLoadKg : r.weights.completedSets)
  // Scale exact decimal strings to integers before computing a bounded CSS percentage.
  const scaled = values.map(value => value === null ? 0n : BigInt(value.replace('.', '')) * 10n ** BigInt(6 - (value.split('.')[1]?.length ?? 0)))
  const maximum = scaled.reduce((a, b) => a > b ? a : b, 0n)
  return <div className="stack">{volumeAvailable && <div className="row" aria-label="집계 항목"><button className="outline" aria-pressed={metric === 'sets'} onClick={() => setMetric('sets')}>세트 수</button><button className="outline" aria-pressed={metric === 'volume'} onClick={() => setMetric('volume')}>총중량</button></div>}
    {!rows.length && <p className="muted">해당 기간의 기록이 없습니다.</p>}
    {rows.map((row, index) => <div className="statistics-row" key={row.key}><div><strong>{row.name}</strong><span>{metric === 'volume' && volumeAvailable ? values[index] === null ? '중량 기록 없음' : `${values[index]} kg` : `${row.weights.completedSets}세트 · ${row.weights.reps}회`}</span></div>
      <div className="statistics-bar" aria-hidden="true"><i style={{ width: `${maximum ? Number(scaled[index] * 100n / maximum) : 0}%` }} /></div>
      <small>{row.weights.plannedSets === '0' ? '확인된 계획 없음' : `계획 ${row.weights.plannedSets}세트`}{row.weights.setsWithoutVolume !== '0' && ' · 맨몸 세트는 총중량에서 제외'}</small></div>)}
  </div>
}
export function StatisticsView({ data, planning, screen, onScreen, onOpen, onHistory }: { data: Statistics; planning?: Overview; screen: string; onScreen: (screen: 'summary' | 'activity' | 'muscles') => void; onOpen: (id: string) => void; onHistory: () => void }) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  return <>
    {screen === 'summary' ? <><div className="statistics-summary"><div><strong>{data.summary.completedSets}</strong><span>완료 웨이트 세트</span></div><div><strong>{minutes(data.cardioActiveMs)}분</strong><span>유산소 시간</span></div></div>
      {data.plannedWorkoutDays === null ? <p className="muted small">주간 계획 운동일과 루틴 달성률은 아직 확인할 수 없습니다. 과거 계획을 확인할 근거가 없는 날짜는 추정하지 않습니다.</p>
        : data.plannedWorkoutDays === 0 ? <p>등록된 운동 계획 없음</p>
          : <p>계획 운동일 {planning?.effectiveWorkoutDays ?? '확인 중'} / {data.plannedWorkoutDays}일 · {data.routineAchievementPercent !== null ? `루틴 달성률 ${data.routineAchievementPercent}%` : '유산소 목표 달성 확인 필요'}</p>}
      <p className="muted small">서버에 반영된 종료 기록 기준입니다. 기기의 미전송 기록은 포함되지 않습니다.</p>
      <div className="row"><button className="outline" onClick={() => onScreen('activity')}>운동 현황</button><button className="outline" onClick={() => onScreen('muscles')}>근육별 통계</button><button className="outline" onClick={onHistory}>운동 이력 전체 보기</button></div>
      <h3>최근 운동</h3>{!data.recentSessions.length && <p>운동 이력이 없습니다.</p>}{data.recentSessions.map(s => <button className="outline full" key={s.id} onClick={() => onOpen(s.id)}>{s.workoutDate} · {s.routineName}{s.status === 'AUTO_CLOSED' && ' · 자동 종료'}</button>)}</>
      : screen === 'activity' ? <><h3>운동량 추이</h3><WeightChart rows={data.days.map(d => ({ key: d.date, name: d.date, weights: d.weights }))} />
        <h3>운동 종목별</h3><WeightChart rows={data.exercises.map(e => ({ key: e.standardExerciseId, name: e.name, weights: e.weights }))} />
        <h3>유산소 시간·거리</h3>{!data.cardio.length && <p>유산소 기록이 없습니다.</p>}{data.cardio.map(c => <p key={c.kind + ':' + c.name}>{c.name} · {minutes(c.activeMs)}분{c.distanceKm !== null && ` · ${c.distanceKm} km`}{c.recordsWithoutDistance !== '0' && ' · 거리 미입력 기록 포함'}</p>)}</>
      : <><h3>주동근 세트</h3><p className="muted small">{data.planCoverage === 'FULL_SCHEDULE_HISTORY' ? '미수행 예정일을 포함한 당시 일정과 계획입니다.' : '계획이 확인된 날짜만 표시합니다. 전체 주간 계획과는 다를 수 있습니다.'}</p>
        <WeightChart rows={data.groups.filter(g => g.role === 'PRIMARY').map(g => ({ key: g.groupCode, name: groups[g.groupCode], weights: g.weights }))} />
        <div className="row"><button className="outline" aria-pressed={selectedGroup === null} onClick={() => setSelectedGroup(null)}>전체 부위</button>{data.groups.filter(g => g.role === 'PRIMARY').map(g => <button className="outline" key={g.groupCode} aria-pressed={selectedGroup === g.groupCode} onClick={() => setSelectedGroup(g.groupCode)}>{groups[g.groupCode]} 상세</button>)}</div>
        {selectedGroup && <><h3>{groups[selectedGroup]} 세부 주동근</h3><WeightChart rows={data.muscles.filter(m => m.groupCode === selectedGroup && m.role === 'PRIMARY').map(m => ({ key: m.id, name: m.name, weights: m.weights }))} /></>}
        <details><summary>보조근 참여 · 주동근과 별도</summary><WeightChart rows={data.muscles.filter(m => m.role === 'SECONDARY' && (!selectedGroup || m.groupCode === selectedGroup)).map(m => ({ key: m.id, name: m.name, weights: m.weights }))} /></details>
        {data.unmappedCompletedSets !== '0' && <p className="notice">주동근 분류가 없는 완료 세트 {data.unmappedCompletedSets}개는 전체 운동량에 포함됩니다.</p>}</>}
    {planning && <details><summary>예정일과 달성 내역</summary>{planning.plannedDays.map(d => <div className="statistics-row" key={d.date}><p>{d.date} · {d.status === 'BEFORE_REGISTRATION' ? '최초 등록 전 · 달성률 제외' : d.status === 'UNKNOWN' ? '과거 계획 확인 불가' : d.status === 'REST' ? '휴식' : `${d.plan?.name} · ${d.completedExercises ?? '확인 중'} / ${d.plannedExercises}종목`}{d.status === 'UNVERIFIABLE' && ' · 실제 유산소 목표 확인 불가'}</p>
      {d.plan && <details><summary>당시 계획 보기</summary>{d.plan.weightPlacements.map(w => <p key={w.id}>{w.exerciseName} · {w.setCount}세트</p>)}{d.plan.cardioPlacements.map(c => <p key={c.id}>{c.plan.name} · 목표 {c.plan.targetSeconds}초</p>)}</details>}
      {d.selectedSessionId && <button className="outline" onClick={() => onOpen(d.selectedSessionId!)}>수행 기록 보기</button>}</div>)}</details>}
  </>
}
export function StatisticsPanel({ api, scope, refreshKey, onOpen, onInvalid }: { api: StatisticsApi; scope: Scope; refreshKey: string; onOpen: (id: string) => void; onInvalid: (error: unknown) => void }) {
  const [screen, setScreen] = useState<'summary' | 'activity' | 'muscles'>('summary')
  const [mode, setMode] = useState<'week' | 'month'>('week'), [offset, setOffset] = useState(0)
  const [state, setState] = useState<{ data: Overview | null; issue: boolean }>({ data: null, issue: false })
  const [reload, setReload] = useState(0)
  const invalid = useRef(onInvalid)
  useEffect(() => { invalid.current = onInvalid }, [onInvalid])
  const range = periodFor(new Date(), screen === 'summary' ? 'week' : mode, screen === 'summary' ? 0 : offset)
  const { fromDate, toDateExclusive } = range
  useEffect(() => {
    const abort = new AbortController()
    void api.overview({ userId: scope.userId, dataGeneration: scope.dataGeneration }, { fromDate, toDateExclusive }, abort.signal).then(data => {
      if (!abort.signal.aborted) setState({ data, issue: false })
    }).catch((error: unknown) => {
      if (abort.signal.aborted) return
      if (error && typeof error === 'object' && 'code' in error && ['OWNER_MISMATCH', 'DATA_GENERATION_MISMATCH'].includes(String(error.code))) invalid.current(error)
      setState({ data: null, issue: true })
    })
    return () => abort.abort()
  }, [api, scope.userId, scope.dataGeneration, fromDate, toDateExclusive, refreshKey, reload])
  const current = state.data?.statistics.fromDate === range.fromDate && state.data?.statistics.toDateExclusive === range.toDateExclusive ? state.data : null
  return <section className="card stack statistics" aria-labelledby="statistics-title"><div className="section-heading"><h2 id="statistics-title">통계·추적</h2><button className="outline" onClick={() => { setState({ data: null, issue: false }); setReload(n => n + 1) }}>새로고침</button></div>
    {screen !== 'summary' && <><button className="outline" onClick={() => setScreen('summary')}>이번 주 요약으로</button><div className="row"><button className="outline" aria-pressed={mode === 'week'} onClick={() => { setMode('week'); setOffset(0) }}>주간</button><button className="outline" aria-pressed={mode === 'month'} onClick={() => { setMode('month'); setOffset(0) }}>월간</button><button className="outline" onClick={() => setOffset(n => n - 1)}>이전</button><button className="outline" onClick={() => setOffset(n => n + 1)}>다음</button></div></>}
    <p className="muted small">{range.fromDate} ~ {new Date(Date.parse(range.toDateExclusive) - 86400000).toISOString().slice(0, 10)}</p>
    {state.issue ? <p className="notice" role="alert">통계를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.</p> : !current ? <p role="status">통계 불러오는 중…</p> : <StatisticsView data={current.statistics} planning={current} screen={screen} onScreen={setScreen} onOpen={onOpen} onHistory={() => document.getElementById('workout-history-title')?.scrollIntoView({ behavior: 'smooth' })} />}
  </section>
}
