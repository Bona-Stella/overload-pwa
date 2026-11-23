import { RecordChart } from './RecordChart.tsx'
import { sumDecimals, displayDecimal } from './display-decimal.ts'
import { useEffect, useLayoutEffect, useState } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import type { WorkoutApi } from '../workout-online/api.ts'
import type { Routine, Scope, StandardExercise, StandardExerciseDetail } from '../workout-online/types.ts'
import type { LiveSchedule } from './weekly-schedule.ts'
import { StatisticsWait } from './StatisticsWait.tsx'
import { actualAnalysis, muscleGroups, plannedAnalysis, muscleSubtotal } from './muscle-analysis.ts'
import type { AnalysisData, AnalysisRow } from './muscle-analysis.ts'
import type { Statistics } from './api.ts'
import { boundaryError, readAccessDenied } from '../home/load.ts'
import { addDays } from '../home/model.ts'
import { useScreenHistory } from '../../app/navigation.ts'
import { useRecordPreview } from './RecordDisplayContext.ts'
import './statistics.css'
import planStyles from './WeeklyMusclePlan.module.css'
import statisticsStyles from './WeeklyMuscleStatistics.module.css'

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

export function MuscleAnalysisView({ data, plan, presets = [], selected, onSelect, stateKey = 'isolated', period, loading = false }: { data: AnalysisData | null; plan: boolean; presets?: { id: string; name: string }[]; selected?: string; onSelect?: (id: string) => void; stateKey?: string; period?: { fromDate: string; toDateExclusive: string }; loading?: boolean }) {
  const [view, setView] = useScreenHistory('muscle-view:' + stateKey, { tab:'groups', showAll:false, metric:'sets' })
  const { tab, showAll, metric } = view
  if (plan) return <section className={`stack muscle-analysis ${planStyles.page}`} aria-label="주간 근육 계획">
    <Card className={planStyles.controls}>
      <label>분석 대상 프리셋<select value={selected} onChange={e => onSelect?.(e.target.value)}>{presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <div className={planStyles.segment} aria-label="계획 보기">
        <Button aria-pressed={tab==='groups'} onClick={()=>setView({...view,tab:'groups'},true)}>분류별</Button>
        <Button aria-pressed={tab==='muscles'} onClick={()=>setView({...view,tab:'muscles'},true)}>근육별</Button>
      </div>
    </Card>
    <Card className={planStyles.summary} aria-label="주간 계획 요약" aria-busy={loading}>
      <div><span>계획 세트</span><strong>{data && (data.total==='—'?'미확인':<>{displayDecimal(data.total)}<small>세트</small></>)}</strong></div>
      <div><span>운동 예정일</span><strong>{data && '미확인'}</strong></div>
    </Card>
    <div className={planStyles.distributionHeading}>
      <h2>계획 세트 분포</h2>
      <label className={`analysis-toggle ${planStyles.toggle}`}>0세트 포함<button type="button" role="switch" aria-label="0세트 포함" aria-checked={showAll} onClick={()=>setView({...view,showAll:!showAll},true)}><i /></button></label>
    </div>
    <Card className={planStyles.distribution} aria-label="계획 세트 분포" aria-busy={loading}>
      {data && (tab==='groups'?([[data.frontBack,'전면 / 후면'],[data.ppl,'PPL'],[data.groups,'신체 부위']] as const).map(([rows,title])=><section className={planStyles.group} key={title}>
        <div className={`analysis-group ${planStyles.groupHeading}`}><h2>{title}</h2><hr /><span className="analysis-subtotal">{data.total==='—'||!rows.length||rows.some(row=>row.planned===null)?'합계 확인 불가':'합계 '+displayDecimal(data.total)+'세트'}</span></div>
        <AnalysisRows rows={rows} plan metric={metric} showAll={showAll} />
      </section>):Object.entries(muscleGroups).filter(([code])=>data.muscles.some(m=>m.group===code&&(showAll||m.planned!=='0'))).map(([code,label])=><section className={planStyles.group} key={code}>
        <div className={`analysis-group ${planStyles.groupHeading}`}><h2>{label}</h2><hr /><span className="analysis-subtotal">{data.muscles.filter(m=>m.group===code).some(m=>m.planned===null)?'합계 확인 불가':'합계 '+displayDecimal(sumDecimals(data.muscles.filter(m=>m.group===code).map(m=>m.planned??'0')))+'세트'}</span></div>
        <AnalysisRows rows={data.muscles.filter(m=>m.group===code)} plan metric={metric} showAll={showAll} />
      </section>))}
    </Card>
    <div className={planStyles.notes}>
      <p>{tab==='groups'?'전면/후면, PPL, 신체 부위는 같은 계획의 서로 다른 분류입니다. 그룹 간 세트를 합산하지 않습니다.':'세부 근육의 기여 세트와 기존 기준을 표시합니다. 권장 범위는 참고 정보입니다.'}</p>
      {!!data?.issues.length&&<p role="status">{data.issues.join(' ')}</p>}
    </div>
  </section>
  if (!data) return null
  return <section className={`stack muscle-analysis ${planStyles.page} ${statisticsStyles.page}`} aria-label="주간 근육 통계">
    <div className={statisticsStyles.period} aria-label="이번 주 조회 기간">
      <span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>{period ? <><time dateTime={period.fromDate}>{period.fromDate.slice(5).replace('-','.')}</time><span aria-hidden="true">–</span><time dateTime={addDays(period.toDateExclusive,-1)}>{addDays(period.toDateExclusive,-1).slice(5).replace('-','.')}</time></> : '기간 미확인'}</span>
      <small>이번 주</small>
    </div>
    <Card className={statisticsStyles.controls}>
      <div><span className={statisticsStyles.controlLabel}>분석 기준</span><div className={planStyles.segment} aria-label="분석 기준"><Button aria-pressed={tab === 'groups'} onClick={() => setView({ ...view, tab:'groups' }, true)}>분류별</Button><Button aria-pressed={tab === 'muscles'} onClick={() => setView({ ...view, tab:'muscles' }, true)}>근육별</Button></div></div>
      <div><span className={statisticsStyles.controlLabel}>측정 지표</span><div className={planStyles.segment} aria-label="측정 지표"><Button aria-pressed={metric === 'sets'} onClick={() => setView({ ...view, metric:'sets' }, true)}>세트</Button><Button aria-pressed={metric === 'volume'} onClick={() => setView({ ...view, metric:'volume' }, true)}>총중량</Button></div></div>
    </Card>
    <Card className={statisticsStyles.achievement} aria-label="주간 세트 달성">
      <div><h2>주간 세트 달성</h2><strong>미확인</strong></div>
      {/* The existing analysis has no weekly set target or achievement rate. */}
      <div><span className={statisticsStyles.track} role="progressbar" aria-label="주간 세트 달성률" aria-valuetext="당시 계획과 달성률 미확인"/><span>{data.total==='—'?'미확인':displayDecimal(data.total)} / 미확인 세트</span></div>
    </Card>
    <div className={planStyles.distributionHeading}><h2>{tab==='groups'?'분류별':'근육별'} 달성 현황</h2></div>
    <Card className={planStyles.distribution} aria-label={tab==='groups'?'분류별 달성 현황':'근육별 달성 현황'}>
      {tab==='groups'?([[data.frontBack,'전면 / 후면'],[data.ppl,'PPL'],[data.groups,'신체 부위']] as const).map(([rows,title])=><section className={planStyles.group} key={title}>
        <div className={`analysis-group ${planStyles.groupHeading}`}><h2>{title}</h2><hr />{metric==='sets'&&<span>합계 확인 불가</span>}</div>
        <AnalysisRows rows={rows} plan={false} metric={metric} showAll={showAll} />
      </section>):Object.entries(muscleGroups).filter(([code])=>data.muscles.some(m=>m.group===code&&(m.actual!=='0'||m.planned!=='0'))).map(([code,label])=><section className={planStyles.group} key={code}>
        <div className={`analysis-group ${planStyles.groupHeading}`}><h2>{label}</h2><hr />{metric==='sets'&&<span className="analysis-subtotal">합계 {muscleSubtotal(data.muscles.filter(m=>m.group===code))}</span>}</div>
        <AnalysisRows rows={data.muscles.filter(m=>m.group===code)} plan={false} metric={metric} showAll={showAll} />
      </section>)}
    </Card>
    <div className={planStyles.notes}>
      <p role="status">주간 전체 당시 계획 세트와 세트 달성률은 확인할 수 없습니다.</p>
      {data.issues.map(issue=><p role="status" key={issue}>{issue}</p>)}
    </div>
  </section>
}


type SchedulePreset = LiveSchedule['presets'][number]
type PlanSource = { key: string; routines: Map<string, Routine>; catalog: StandardExerciseDetail[] }

export function WeeklyMusclePlan({ api, scope, schedule, initialPreset, refreshKey, onInvalid, definitions = [], active = true, onReadSettled }: { api: WorkoutApi; scope: Scope; schedule: LiveSchedule | null | undefined; initialPreset?: string; refreshKey: string; onInvalid: (error: unknown) => void; definitions?: StandardExercise[]; active?: boolean; onReadSettled?: (ready: boolean) => void }) {
  const preview = useRecordPreview()
  const { userId, dataGeneration } = scope
  const stateKey = userId + ':' + dataGeneration + ':plan:' + (initialPreset ?? 'records')
  const [selected, setSelected] = useScreenHistory(stateKey, initialPreset ?? schedule?.activeId ?? '')
  const presets = schedule?.presets ?? []
  const preset = presets.find(p => p.id === selected) ?? presets.find(p => p.id === schedule?.activeId)
  const presetId = preset?.id
  const [loaded, setLoaded] = useState(() => new Map<string, PlanSource>())
  const [shownId, setShownId] = useState<string>()
  const [issue, setIssue] = useState<string | null>(null)
  const [reload, setReload] = useState(0)
  const ids = JSON.stringify([...new Set(preset?.assignments.map(a => a.routineId) ?? [])])
  const sourceKey = (value?: SchedulePreset) => JSON.stringify([stateKey, refreshKey, value?.id, value?.version, value?.assignments.map(a => a.routineId)])
  const key = sourceKey(preset)
  const current = presetId ? loaded.get(presetId) : null
  const confirmed = current?.key === key ? current : null
  const failed = issue === key
  const ready = !!schedule && (!!preview || !preset || !!confirmed || failed)
  if ((preview || confirmed) && presetId !== shownId) setShownId(presetId)

  useLayoutEffect(() => { if (active) onReadSettled?.(ready) }, [active, onReadSettled, ready])
  useEffect(() => {
    if (!active || preview || !presetId || confirmed) return
    const abort = new AbortController()
    const routineIds: string[] = JSON.parse(ids)
    void (async () => {
      const routines = new Map(await Promise.all(routineIds.map(async id => [id, await api.routine({ userId, dataGeneration }, id, abort.signal)] as const)))
      const exercises = [...new Set([...routines.values()].flatMap(r => r.weightPlacements.filter(p => !p.deletedAt).map(p => p.standardExerciseId)))]
      const catalog: StandardExerciseDetail[] = []; let index = 0
      await Promise.all(Array.from({ length: Math.min(4, exercises.length) }, async () => {
        while (index < exercises.length && !abort.signal.aborted) catalog.push(await api.exerciseDetail(userId, exercises[index++], abort.signal))
      }))
      if (!abort.signal.aborted) { setLoaded(previous => new Map([...previous, [presetId, { key, routines, catalog }]])); setIssue(null) }
    })().catch(error => {
      if (abort.signal.aborted) return
      setIssue(key)
      if (readAccessDenied(error) || boundaryError(error)) setLoaded(new Map())
      if (boundaryError(error)) onInvalid(error)
    })
    return () => abort.abort()
  }, [active, api, userId, dataGeneration, ids, key, onInvalid, preview, presetId, confirmed, reload])

  if (!schedule) return null
  if (!preset) return <Card><p>분석할 주간 프리셋이 없습니다.</p></Card>
  const previous = presets.find(p => p.id === shownId)
  const previousSource = previous && loaded.get(previous.id)
  const keepPrevious = !!previous && previousSource?.key === sourceKey(previous)
  const displayed = preview || confirmed || !keepPrevious ? preset : previous
  const source = confirmed ?? (keepPrevious ? previousSource : null)
  const data = preview ? preview.plan(displayed.id) : source ? plannedAnalysis(displayed, source.routines, source.catalog, definitions.flatMap(e => e.muscles ?? [])) : null
  return <>
    {(data || failed) && <MuscleAnalysisView stateKey={stateKey} data={data} plan presets={presets} selected={displayed.id} onSelect={id => setSelected(id,true)} />}
    {failed && <Card><p role="alert">계획을 조회하지 못했습니다.</p><Button onClick={() => { setIssue(null); setReload(n => n + 1) }}>다시 조회</Button></Card>}
    <StatisticsWait pending={active && !ready} label="주간 근육 계획을 불러오는 중입니다." />
  </>
}

export function WeeklyMuscleStatistics({ data }: { data: Statistics }) { const preview=useRecordPreview(); return <MuscleAnalysisView stateKey={data.userId + ':' + data.dataGeneration + ':actual'} data={preview?.actual??actualAnalysis(data)} plan={false} period={data} /> }
