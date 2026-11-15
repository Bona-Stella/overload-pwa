import { RecordChart } from './RecordChart.tsx'
import { sumDecimals, displayDecimal } from './display-decimal.ts'
import { useEffect, useState } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import type { WorkoutApi } from '../workout-online/api.ts'
import type { Routine, Scope, StandardExercise, StandardExerciseDetail } from '../workout-online/types.ts'
import type { LiveSchedule } from './weekly-schedule.ts'
import { actualAnalysis, muscleGroups, plannedAnalysis, muscleSubtotal } from './muscle-analysis.ts'
import type { AnalysisData, AnalysisRow } from './muscle-analysis.ts'
import type { Statistics } from './api.ts'
import { boundaryError } from '../home/load.ts'
import { useScreenHistory } from '../../app/navigation.ts'
import { useRecordPreview } from './RecordDisplayContext.ts'
import './statistics.css'

function AnalysisRows({ rows, plan, metric, showAll }: { rows: AnalysisRow[]; plan: boolean; metric: string; showAll: boolean }) {
  const visible = rows.filter(row => plan ? showAll || row.planned !== '0' : row.actual !== '0' || row.planned !== '0')
  const max = Math.max(1, ...visible.flatMap(row => plan ? [Number(row.planned)] : metric === 'volume' ? [Number(row.volume)] : [Number(row.actual),Number(row.planned)]))
  return <>{visible.map(row => {
    const value = plan ? row.planned : metric === 'volume' ? row.volume : row.actual
    const maximum = plan && row.maximum !== undefined ? row.maximum : max
    return <div className="statistics-row analysis-row" key={row.id}>
      <div><strong>{row.name}</strong><span>{value===null?'확인 필요':!plan&&metric==='volume'?displayDecimal(value)+'kg':value}{plan?row.maximum!==undefined?' / '+row.maximum+'세트':'세트':metric==='sets'?row.planned!==null?' / '+row.planned+'세트':row.planState==='none'?' / —세트':' / 당시 계획 확인 필요':''}</span></div>
      <RecordChart data={[{id:row.id,label:row.name,value}]} kind="horizontal" compact unit={!plan&&metric==='volume'?'kg':'세트'} label={row.name+' '+(plan?'계획':'실제')} maximum={maximum} guide={plan?row.minimum:undefined}/>
    </div>
  })}{!visible.length && <p className="muted">표시할 항목이 없습니다.</p>}</>
}

export function MuscleAnalysisView({ data, plan, presets = [], selected, onSelect, stateKey = 'isolated' }: { data: AnalysisData; plan: boolean; presets?: { id: string; name: string }[]; selected?: string; onSelect?: (id: string) => void; stateKey?: string }) {
  const [view, setView] = useScreenHistory('muscle-view:' + stateKey, { tab:'groups', showAll:false, metric:'sets' })
  const { tab, showAll, metric } = view
  return <section className="stack muscle-analysis" aria-label={plan ? '주간 근육 계획' : '주간 근육 통계'}>
    <div className="section-heading"><h1>{plan ? '주간 근육 계획' : '주간 근육 통계'}</h1>{plan && <label className="analysis-toggle">전체 보기<button type="button" role="switch" aria-label="전체 보기" aria-checked={showAll} onClick={() => setView({ ...view, showAll:!showAll }, true)}><i /></button></label>}</div>
    <Card className="analysis-controls">{plan && <label>분석 대상 프리셋<select value={selected} onChange={e => onSelect?.(e.target.value)}>{presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
      <div className="record-tabs"><Button aria-pressed={tab === 'groups'} onClick={() => setView({ ...view, tab:'groups' }, true)}>분류별</Button><Button aria-pressed={tab === 'muscles'} onClick={() => setView({ ...view, tab:'muscles' }, true)}>근육별</Button></div>
      {!plan && <div className="record-tabs"><Button aria-pressed={metric === 'sets'} onClick={() => setView({ ...view, metric:'sets' }, true)}>세트</Button><Button aria-pressed={metric === 'volume'} onClick={() => setView({ ...view, metric:'volume' }, true)}>총중량</Button></div>}
    </Card>
    <p className="muted small">{plan ? '현재 월~일 반복 계획 · 권장 범위는 참고 정보입니다.' : '이번 주 월~일 · 실제 수행 / 당시 계획'}</p>
    {tab === 'groups' ? <>{[[data.frontBack, '전면 / 후면'], [data.ppl, 'PPL'], [data.groups, '부위']] .map(([rows, title]) => <Card key={String(title)}><h2>{String(title)}</h2><AnalysisRows rows={rows as AnalysisRow[]} plan={plan} metric={metric} showAll={showAll} /></Card>)}</>
      : <Card>{Object.entries(muscleGroups).filter(([code]) => data.muscles.some(m=>m.group===code && (plan ? showAll || m.planned!=='0' : m.actual!=='0' || m.planned!=='0'))).map(([code, label]) => <section key={code}><div className="analysis-group"><h2>{label}</h2><hr />{(plan||metric==='sets')&&<span className="analysis-subtotal">{!plan?'합계 '+muscleSubtotal(data.muscles.filter(m=>m.group===code)):data.muscles.filter(m=>m.group===code).some(m=>m.planned===null)?'합계 확인 불가':'합계 '+displayDecimal(sumDecimals(data.muscles.filter(m=>m.group===code).map(m=>m.planned??'0')))+'세트'}</span>}</div><AnalysisRows rows={data.muscles.filter(m => m.group === code)} plan={plan} metric={metric} showAll={showAll} /></section>)}</Card>}
    {data.issues.map(issue => <p className="record-note muted small" role="status" key={issue}>{issue}</p>)}
  </section>
}

export function WeeklyMusclePlan({ api, scope, schedule, initialPreset, refreshKey, onInvalid, definitions = [] }: { api: WorkoutApi; scope: Scope; schedule: LiveSchedule | null | undefined; initialPreset?: string; refreshKey: string; onInvalid: (error: unknown) => void; definitions?: StandardExercise[] }) {
  const preview = useRecordPreview()
  const stateKey = scope.userId + ':' + scope.dataGeneration + ':plan:' + (initialPreset ?? 'records')
  const [selected, setSelected] = useScreenHistory(stateKey, initialPreset ?? schedule?.activeId ?? '')
  const preset = schedule?.presets.find(p => p.id === selected) ?? schedule?.presets.find(p => p.id === schedule.activeId)
  const [loaded, setLoaded] = useState<{ key: string; routines: Map<string, Routine>; catalog: StandardExerciseDetail[] } | null>(null)
  const [issue, setIssue] = useState(false), [reload, setReload] = useState(0)
  const ids = JSON.stringify([...new Set(preset?.assignments.map(a => a.routineId) ?? [])])
  const key = [scope.userId, scope.dataGeneration, ids, refreshKey, reload].join(':')
  useEffect(() => {
    if (preview) return
    const abort = new AbortController()
    const routineIds: string[] = JSON.parse(ids)
    void (async () => {
      const routines = new Map<string, Routine>()
      for (const id of routineIds) routines.set(id, await api.routine({ userId:scope.userId, dataGeneration:scope.dataGeneration }, id, abort.signal))
      const exercises = [...new Set([...routines.values()].flatMap(r => r.weightPlacements.filter(p => !p.deletedAt).map(p => p.standardExerciseId)))]
      const catalog: StandardExerciseDetail[] = []; let index = 0
      await Promise.all(Array.from({ length: Math.min(4, exercises.length) }, async () => {
        while (index < exercises.length && !abort.signal.aborted) catalog.push(await api.exerciseDetail(scope.userId, exercises[index++], abort.signal))
      }))
      if (!abort.signal.aborted) { setLoaded({ key, routines, catalog }); setIssue(false) }
    })().catch(error => { if (!abort.signal.aborted) { setIssue(true); if (boundaryError(error)) onInvalid(error) } })
    return () => abort.abort()
  }, [api, scope.userId, scope.dataGeneration, ids, key, onInvalid, preview])
  if (!preset) return <Card><p>분석할 주간 프리셋이 없습니다.</p></Card>
  if (issue && loaded?.key !== key) return <Card><p role="alert">계획을 조회하지 못했습니다. 0세트로 표시하지 않습니다.</p><Button onClick={() => { setIssue(false); setReload(n => n + 1) }}>다시 조회</Button></Card>
  const data = preview ? preview.plan(preset.id) : loaded?.key === key ? plannedAnalysis(preset, loaded.routines, loaded.catalog, definitions.flatMap(e => e.muscles ?? [])) : null
  return <>{!data && <p role="status">현재 계획과 검수 분류를 확인 중입니다.</p>}<MuscleAnalysisView stateKey={stateKey} data={data ?? { muscles: [], frontBack: [], ppl: [], groups: [], total: '—', issues: [] }} plan presets={schedule!.presets} selected={preset.id} onSelect={id => setSelected(id,true)} /></>
}

export function WeeklyMuscleStatistics({ data }: { data: Statistics }) { const preview=useRecordPreview(); return <MuscleAnalysisView stateKey={data.userId + ':' + data.dataGeneration + ':actual'} data={preview?.actual??actualAnalysis(data)} plan={false} /> }
