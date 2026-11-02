import { useEffect, useRef, useState } from 'react'
import type { Scope } from '../workout-online/types.ts'
import type { GrowthApi, GrowthExercise, GrowthOptions, GrowthPeriod, GrowthPlacement, GrowthPoint } from './growth.ts'

type Context = { api: GrowthApi; scope: Scope; period: GrowthPeriod; zone: string; onInvalid: (error: unknown) => void; onOpen: (id: string) => void }
const amount = (text: string) => { const [whole, part = ''] = text.split('.'); return BigInt(whole) * 1000000n + BigInt(part.padEnd(6, '0')) }
export function GrowthGraph({ points, zone }: { points: GrowthPoint[]; zone: string }) {
  const fraction = (text: string) => (text.match(/\.(\d+)/)?.[1] ?? '').padEnd(9, '0')
  const ordered = [...points].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || fraction(a.occurredAt).localeCompare(fraction(b.occurredAt)) || a.id.localeCompare(b.id))
  if (!ordered.length) return <p>이 기간의 승인 중량 변경 기록이 없습니다.</p>
  const amounts = ordered.map(p => amount(p.approvedWeightKg)), minimum = amounts.reduce((a, b) => a < b ? a : b), maximum = amounts.reduce((a, b) => a > b ? a : b)
  const times = ordered.map(p => Date.parse(p.occurredAt)), first = times.reduce((a, b) => Math.min(a, b)), last = times.reduce((a, b) => Math.max(a, b))
  const x = (i: number) => last === first ? 320 : 40 + (times[i] - first) / (last - first) * 560
  const y = (i: number) => maximum === minimum ? 100 : 180 - Number((amounts[i] - minimum) * 140n / (maximum - minimum))
  const label = (p: GrowthPoint) => new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeZone: zone }).format(new Date(p.occurredAt))
  return <><svg viewBox="0 0 640 230" role="img" aria-label="승인 중량 변화" style={{ width: '100%', maxHeight: 280 }}>
    <title>선택한 루틴 배치의 승인 변경 기록 · kg</title><text x="4" y="20">{maximum === minimum ? ordered[0].approvedWeightKg : ordered[amounts.findIndex(v => v === maximum)].approvedWeightKg} kg</text>
    <line x1="40" x2="600" y1="190" y2="190" stroke="currentColor" />
    {ordered.map((p, i) => <g key={p.id}>{i > 0 && p.connectFromPrevious && p.previousPointId === ordered[i - 1].id && p.previousWeightKg === ordered[i - 1].approvedWeightKg && <line data-growth-segment="true" x1={x(i - 1)} y1={y(i - 1)} x2={x(i)} y2={y(i)} stroke="#60a5fa" strokeWidth="2" />}
      <circle cx={x(i)} cy={y(i)} r="4" fill="#60a5fa"><title>{`${label(p)} · ${p.approvedWeightKg} kg`}</title></circle></g>)}
    <text x="40" y="215">{label(ordered[0])}</text><text x="600" y="215" textAnchor="end">{label(ordered[ordered.length - 1])}</text>
  </svg><p className="muted small">승인된 변경값만 표시합니다. 점 사이의 연결 근거가 없으면 선을 이어 그리지 않습니다.</p></>
}
function SearchResults({ query, onSelect, ...context }: Context & { query: string; onSelect: (value: GrowthExercise) => void }) {
  const { api, scope, period, zone, onInvalid } = context
  const [rows, setRows] = useState<GrowthExercise[]>([]), [next, setNext] = useState<number | null>(null), [busy, setBusy] = useState(true), [issue, setIssue] = useState('')
  const flight = useRef<AbortController | null>(null)
  useEffect(() => {
    const abort = new AbortController(); flight.current = abort
    void api.search(scope, period, zone, query, 0, abort.signal).then(page => { if (!abort.signal.aborted) { setRows(page.exercises); setNext(page.nextOffset) } })
      .catch((error: unknown) => { if (!abort.signal.aborted) { onInvalid(error); setIssue('과거 운동을 불러오지 못했습니다. 다시 검색해 주세요.') } }).finally(() => { if (!abort.signal.aborted) setBusy(false) })
    return () => { abort.abort(); flight.current?.abort() }
  }, [api, scope, period, zone, query, onInvalid])
  async function more() {
    if (busy || next === null) return
    const abort = new AbortController(); flight.current = abort; setBusy(true); setIssue('')
    try { const page = await api.search(scope, period, zone, query, next, abort.signal); if (!abort.signal.aborted) { setRows(values => [...new Map([...values, ...page.exercises].map(e => [e.standardExerciseId, e])).values()]); setNext(page.nextOffset) } }
    catch (error) { if (!abort.signal.aborted) { onInvalid(error); setIssue('다음 운동 목록을 불러오지 못했습니다.') } }
    finally { if (!abort.signal.aborted) setBusy(false) }
  }
  return <div className="stack"><p className="muted small">선택 기간의 최근 수행 종목부터 표시합니다. 삭제된 루틴의 승인 이력도 검색합니다.</p>{issue && <p role="alert">{issue}</p>}
    {!busy && !issue && !rows.length && <p>이 기간의 과거 수행·승인 기록이 없습니다.</p>}{rows.map(e => <button className="outline full" key={e.standardExerciseId} onClick={() => onSelect(e)}>{e.name}{!e.lastPerformedAt && ' · 승인 이력'}</button>)}
    {busy && <p role="status">과거 운동 확인 중…</p>}{next !== null && <button className="outline" disabled={busy} onClick={() => void more()}>운동 더 보기</button>}</div>
}
function History({ standardId, placement, ...context }: Context & { standardId: string; placement: GrowthPlacement }) {
  const { api, scope, period, zone, onInvalid, onOpen } = context
  const [points, setPoints] = useState<GrowthPoint[]>([]), [next, setNext] = useState<number | null>(null), [busy, setBusy] = useState(true), [issue, setIssue] = useState('')
  const flight = useRef<AbortController | null>(null)
  useEffect(() => {
    const abort = new AbortController(); flight.current = abort
    void api.history(scope, standardId, placement, period, zone, 0, abort.signal).then(page => { if (!abort.signal.aborted) { setPoints(page.points); setNext(page.nextOffset) } })
      .catch((error: unknown) => { if (!abort.signal.aborted) { onInvalid(error); setIssue('승인 이력을 불러오지 못했습니다. 배치를 다시 선택해 주세요.') } }).finally(() => { if (!abort.signal.aborted) setBusy(false) })
    return () => { abort.abort(); flight.current?.abort() }
  }, [api, scope, period, zone, standardId, placement, onInvalid])
  async function more() {
    if (busy || next === null) return
    const abort = new AbortController(); flight.current = abort; setBusy(true); setIssue('')
    try { const page = await api.history(scope, standardId, placement, period, zone, next, abort.signal); if (!abort.signal.aborted) { setPoints(values => [...new Map([...values, ...page.points].map(p => [p.id, p])).values()]); setNext(page.nextOffset) } }
    catch (error) { if (!abort.signal.aborted) { onInvalid(error); setIssue('이전 승인 이력을 불러오지 못했습니다.') } }
    finally { if (!abort.signal.aborted) setBusy(false) }
  }
  return <div className="stack">{issue && <p role="alert">{issue}</p>}{busy && <p role="status">승인 이력 확인 중…</p>}{!busy && !issue && <GrowthGraph points={points} zone={zone} />}
    {next !== null && <><p className="muted small">일부 승인 이력입니다. 이전 이력을 더 불러올 수 있습니다.</p><button className="outline" disabled={busy} onClick={() => void more()}>이전 승인 더 보기</button></>}
    <details><summary>승인 변경 내역 {points.length}건</summary>{points.map(p => <div className="statistics-row" key={p.id}><p>{p.occurredAt} · {p.previousWeightKg} → {p.approvedWeightKg} kg · {p.source === 'WORKOUT' ? '운동 중 승인' : '루틴에서 승인'}</p><small>서버 기록 {p.recordedAt}</small>{p.sessionId && <button className="outline" onClick={() => onOpen(p.sessionId!)}>기존 운동 기록 보기</button>}</div>)}</details>
  </div>
}
function Selected({ exercise, ...context }: Context & { exercise: GrowthExercise }) {
  const { api, scope, period, zone, onInvalid } = context
  const [options, setOptions] = useState<GrowthOptions | null>(null), [selected, setSelected] = useState(''), [issue, setIssue] = useState('')
  useEffect(() => {
    const abort = new AbortController()
    void api.options(scope, exercise.standardExerciseId, period, zone, abort.signal).then(value => { if (!abort.signal.aborted) { setOptions(value); setSelected(value.placements[0]?.placementId ?? '') } })
      .catch((error: unknown) => { if (!abort.signal.aborted) { onInvalid(error); setIssue('운동의 승인 배치를 확인하지 못했습니다. 다시 선택해 주세요.') } })
    return () => abort.abort()
  }, [api, scope, period, zone, exercise, onInvalid])
  const current = options?.placements.find(p => p.placementId === selected)
  return <div className="stack"><h3>{exercise.name}</h3><p>승인 중량은 루틴 배치별로 추적합니다. 다른 배치의 기록은 합치지 않습니다.</p>{issue && <p role="alert">{issue}</p>}
    {!options && !issue && <p role="status">승인 배치 확인 중…</p>}{options && !options.placements.length && <p>이 기간의 승인 중량 변경 기록이 없습니다. 최초·현재 중량으로 과거 값을 만들지 않습니다.</p>}
    {options && options.placements.length > 0 && <label>추적할 루틴 배치<select value={selected} onChange={e => setSelected(e.target.value)}>{options.placements.map((p, i) => <option key={p.placementId} value={p.placementId}>{p.routineName} · 배치 {i + 1}{p.deleted && ' · 삭제됨'}</option>)}</select></label>}
    {current && <History key={current.placementId} {...context} standardId={exercise.standardExerciseId} placement={current} />}</div>
}
export function GrowthPanel({ api, scope, refreshKey, onInvalid, onOpen }: Omit<Context, 'period' | 'zone'> & { refreshKey: string }) {
  const [period, setPeriod] = useState<GrowthPeriod>('3'), [query, setQuery] = useState(''), [draft, setDraft] = useState(''), [selected, setSelected] = useState<GrowthExercise | null>(null), [reload, setReload] = useState(0)
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const context = { api, scope, period, zone, onInvalid, onOpen }
  const key = [scope.userId, scope.dataGeneration, period, query, refreshKey, reload].join(':')
  return <div className="stack"><h3>승인 중량 성장 추적</h3><div className="row" aria-label="성장 추적 기간">{(['1', '3', '6', 'all'] as const).map(value => <button className="outline" aria-pressed={period === value} key={value} onClick={() => { setPeriod(value); setSelected(null) }}>{value === 'all' ? '전체' : value + '개월'}</button>)}</div>
    <form className="row" onSubmit={e => { e.preventDefault(); setQuery(draft.trim()); setSelected(null); setReload(n => n + 1) }}><label>과거 운동 검색<input value={draft} maxLength={100} onChange={e => setDraft(e.target.value)} /></label><button className="outline">검색</button></form>
    <p className="muted small">실제 수행 중량과 구분한 승인 변경 기록입니다. 미전송 기록은 포함되지 않습니다.</p>
    {selected ? <><button className="outline" onClick={() => setSelected(null)}>운동 다시 선택</button><Selected key={key + selected.standardExerciseId} {...context} exercise={selected} /></> : <SearchResults key={key} {...context} query={query} onSelect={setSelected} />}</div>
}
