import {browseExercises,catalogGroups} from '../workout-online/catalog-browse.ts'
import type {CatalogGroup} from '../workout-online/catalog-browse.ts'
import { growthChartData } from './growth-chart.ts'
import type { ReactNode } from 'react'
import { RecordChart } from './RecordChart.tsx'
import { useRecordPreview } from './RecordDisplayContext.ts'
import type { RecordPreviewData } from './RecordDisplayContext.ts'
import { SearchList } from '../../components/SearchList.tsx'
import { ExerciseIcon } from '../../components/ExerciseIcon.tsx'
import { Card, Button } from '../../components/ui.tsx'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { useEffect, useRef, useState } from 'react'
import type { Scope } from '../workout-online/types.ts'
import type { GrowthApi, GrowthExercise, GrowthOptions, GrowthPeriod, GrowthPlacement, GrowthPoint } from './growth.ts'
import styles from './Growth.module.css'

type Context = { controls?:ReactNode; api: GrowthApi; scope: Scope; period: GrowthPeriod; zone: string; onInvalid: (error: unknown) => void; onOpen: (id: string) => void }
const amount = (text: string) => { const [whole, part = ''] = text.split('.'); return BigInt(whole) * 1000000n + BigInt(part.padEnd(6, '0')) }
const periods = ['1', '3', '6', 'all'] as const

function GrowthPeriods({ period, onChange }: { period: GrowthPeriod; onChange: (value: GrowthPeriod) => void }) {
  return <div className={styles.periods} data-period={period} role="group" aria-label="성장 추적 기간">
    {periods.map(value=><Button aria-pressed={period===value} key={value} onClick={()=>onChange(value)}>{value==='all'?'전체':value+'개월'}</Button>)}
  </div>
}

function GrowthDelta({ point, comparison = false }: { point: GrowthPoint; comparison?: boolean }) {
  const delta = amount(point.approvedWeightKg) - amount(point.previousWeightKg)
  if (delta === 0n) return null
  const increase = delta > 0n
  const magnitude = increase ? delta : -delta
  const part = (magnitude % 1000000n).toString().padStart(6, '0').replace(/0+$/, '')
  const label = `${increase?'+':'−'}${magnitude/1000000n}${part?'.'+part:''}kg`
  return <span className={`${styles.delta} ${comparison?styles.comparison:''}`} data-direction={increase?'increase':'decrease'}>
    <strong>{label}</strong>{comparison&&<small>직전 대비</small>}
  </span>
}

function GrowthCount({ count, partial = false }: { count?: number; partial?: boolean }) {
  return <span>{count===undefined?'—':`${partial?'불러온 ':''}${count}건`}</span>
}

function GrowthAnalysis({ controls, latest, count, partial, zone, children }: {
  controls?: ReactNode; latest?: GrowthPoint; count?: number; partial?: boolean; zone: string; children: ReactNode
}) {
  return <Card>
    <div className={styles.heading}><h2>성장 분석</h2><span>공식 승인 중량</span></div>
    {controls}
    <div className={styles.summary}>
      <div className={styles.latestRow}>
        <div className={styles.latest}>
          <span>최신 공식 승인 중량</span>
          <strong className="growth-latest">{latest?<>{latest.approvedWeightKg}<small>kg</small></>:'미확인'}</strong>
          {latest&&<time dateTime={latest.occurredAt}>최근 승인 · {new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',timeZone:zone}).format(new Date(latest.occurredAt))}</time>}
        </div>
        {latest&&<GrowthDelta point={latest} comparison />}
      </div>
      <div className={styles.countRow}>
        <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2" /></svg>승인 중량 변경</span>
        <GrowthCount count={count} partial={partial} />
      </div>
    </div>
    {children}
    <p className="muted small">공식 승인 중량만 성장 그래프에 반영하며 일반 운동 세트와 디로딩 중량은 포함하지 않습니다.</p>
  </Card>
}

function GrowthChartSection({ points, zone }: { points: GrowthPoint[]; zone: string }) {
  return <section className={styles.chart} aria-label="중량 변화 그래프">
    <div className={styles.heading}><h3>중량 변화 그래프</h3>{points.length>0&&<span className={styles.legend}>승인 중량</span>}</div>
    <p className="muted small">공식 승인 기록 기준 · kg</p>
    <div className={`growth-graph ${styles.plot}`}><GrowthGraph points={points} zone={zone} /></div>
  </section>
}

function GrowthHistoryCard({ points, name, zone, onOpen, busy = false, known = true, partial = false }: {
  points: GrowthPoint[]; name: string; zone: string; onOpen: (id: string) => void; busy?: boolean; known?: boolean; partial?: boolean
}) {
  return <Card>
    <div className={styles.heading}><h2>승인 중량 변경 이력</h2><GrowthCount count={known?points.length:undefined} partial={partial} /></div>
    {points.length>0&&<ul className={styles.historyList}>{points.toReversed().map(p=><li key={p.id}><GrowthEvent point={p} name={name} zone={zone} onOpen={onOpen} /></li>)}</ul>}
    {!busy&&!points.length&&<p className="muted small">승인 중량 변경 기록이 없습니다.</p>}
  </Card>
}

export function GrowthGraph({ points, zone }: { points: GrowthPoint[]; zone: string }) {
  if (!points.length) return <p>이 기간의 승인 중량 변경 기록이 없습니다.</p>
  return <><RecordChart data={growthChartData(points,zone)} kind="line" unit="kg" label="승인 중량 변화" timeZone={zone}/>
    <p className="sr-only">승인된 변경값만 표시합니다. 점 사이의 연결 근거가 없으면 선을 이어 그리지 않습니다.</p></>
}
function SearchResults({ query, onQuery, selected, onClear, onSelect, ...context }: Context & { query: string; onQuery:(value:string)=>void; selected?:string; onClear:()=>void; onSelect: (value: GrowthExercise) => void }) {
  const { api, scope, period, zone, onInvalid } = context
  const [tag,setTag]=useState('ALL')
  const [searchOpen,setSearchOpen]=useState(false)
  const [loadedQuery,setLoadedQuery]=useState<string|null>(null)
  const [rows, setRows] = useState<GrowthExercise[]>([]), [next, setNext] = useState<number | null>(null), [busy, setBusy] = useState(true), [issue, setIssue] = useState('')
  const flight = useRef<AbortController | null>(null)
  useEffect(() => {
    if(!searchOpen)return
    const abort = new AbortController(); flight.current = abort
    void Promise.resolve().then(()=>{if(abort.signal.aborted)return null;setBusy(true);setIssue('');return api.search(scope, period, zone, query, 0, abort.signal,tag)}).then(page => { if (page&&!abort.signal.aborted) { setRows(page.exercises); setNext(page.nextOffset);setLoadedQuery(query+'|'+tag) } })
      .catch((error: unknown) => { if (!abort.signal.aborted) { onInvalid(error); setIssue('과거 운동을 불러오지 못했습니다. 다시 검색해 주세요.') } }).finally(() => { if (!abort.signal.aborted) setBusy(false) })
    return () => { abort.abort(); flight.current?.abort() }
  }, [api, scope, period, zone, query, onInvalid,searchOpen,tag])
  async function more() {
    if (busy || next === null) return
    const abort = new AbortController(); flight.current = abort; setBusy(true); setIssue('')
    try { const page = await api.search(scope, period, zone, query, next, abort.signal,tag); if (!abort.signal.aborted) { setRows(values => [...new Map([...values, ...page.exercises].map(e => [e.standardExerciseId, e])).values()]); setNext(page.nextOffset) } }
    catch (error) { if (!abort.signal.aborted) { onInvalid(error); setIssue('다음 운동 목록을 불러오지 못했습니다.') } }
    finally { if (!abort.signal.aborted) setBusy(false) }
  }
  return <div className="stack"><SearchList tags={{label:'운동 부위',options:[{id:'ALL',name:'전체'},...Object.entries(catalogGroups).map(([id,g])=>({id,name:g.label}))],selected:tag,onSelect:tag=>{setTag(tag);onClear()}}} onSearchOpenChange={setSearchOpen} scopes={[{id:'exercise',name:'운동별'}]} scope="exercise" onScope={()=>{}} query={query} onQuery={onQuery} selected={selected} onClear={onClear} label="과거 운동 검색" issue={issue} options={(loadedQuery===query+'|'+tag?rows:[]).map(e=>({id:e.standardExerciseId,exerciseId:e.standardExerciseId,name:e.name,description:e.lastPerformedAt?'완료 웨이트 수행 기록':'공식 승인 중량 변경 이력',icon:<ExerciseIcon kind="other" />}))} onSelect={id=>{const row=rows.find(e=>e.standardExerciseId===id);if(row)onSelect(row)}} resultsFooter={next!==null?<button className="outline full" disabled={busy} onClick={()=>void more()}>운동 더 보기</button>:undefined}/>
    {searchOpen&&busy&&<p role="status">과거 운동 확인 중…</p>}</div>
}
function History({ standardId, placement, exerciseName, ...context }: Context & { standardId: string; placement: GrowthPlacement; exerciseName:string }) {
  const { api, scope, period, zone, onInvalid, onOpen, controls } = context
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
  // History pages arrive latest-first and append older points. Keep the existing event list order.
  const known = points.length>0||!busy&&!issue
  return <><GrowthAnalysis controls={controls} latest={points[0]} count={known?points.length:undefined} partial={next!==null} zone={zone}>
    {issue&&<p role="alert">{issue}</p>}{busy&&<p role="status">승인 이력 확인 중…</p>}
    {!busy&&!issue&&<GrowthChartSection points={points} zone={zone} />}
    {next!==null&&<><p className="muted small">일부 승인 이력입니다. 이전 이력을 더 불러올 수 있습니다.</p><Button disabled={busy} onClick={()=>void more()}>이전 승인 더 보기</Button></>}
  </GrowthAnalysis><GrowthHistoryCard points={points} name={exerciseName} zone={zone} onOpen={onOpen} busy={busy} known={known} partial={next!==null} /></>
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
  const controls = <>{context.controls}{options&&options.placements.length>1&&<label className={styles.placement}>추적할 루틴 배치<select value={selected} onChange={e=>setSelected(e.target.value)}>{options.placements.map((p,i)=><option key={p.placementId} value={p.placementId}>{p.routineName} · 배치 {i+1}{p.deleted?' · 삭제됨':''}</option>)}</select></label>}</>
  if(current)return <History key={current.placementId} {...context} controls={controls} standardId={exercise.standardExerciseId} exerciseName={exercise.name} placement={current} />
  return <GrowthAnalysis controls={issue?undefined:controls} count={options?0:undefined} zone={zone}>
    {issue?<p role="alert">{issue}</p>:options?<p>이 기간의 승인 중량 변경 기록이 없습니다. 최초·현재 중량으로 과거 값을 만들지 않습니다.</p>:<p role="status">승인 배치 확인 중…</p>}
  </GrowthAnalysis>
}
export function GrowthPanel({ api, scope, refreshKey, onInvalid, onOpen, onBack, backLabel }: Omit<Context, 'period' | 'zone'> & { refreshKey: string; onBack?: () => void; backLabel?: string }) {
  const preview=useRecordPreview()
  const [period, setPeriod] = useState<GrowthPeriod>('3'), [query, setQuery] = useState(''), [selected, setSelected] = useState<GrowthExercise | null>(null)
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const controls=<GrowthPeriods period={period} onChange={setPeriod} />
  const context = { api, scope, period, zone, onInvalid, onOpen, controls }
  const key = [scope.userId, scope.dataGeneration, period, refreshKey].join(':')
  return <div className={`stack growth-screen ${styles.screen}`}>
    <RecordSubpageHeader title="성장 추적" onBack={onBack} backLabel={backLabel} />
    {preview?<PreviewGrowth data={preview} onOpen={onOpen} />:<>
      <Card className={styles.searchCard}><h2>분석할 운동</h2><SearchResults key={key} {...context} query={query} onQuery={setQuery} selected={selected?.name} onClear={()=>{setSelected(null);setQuery('')}} onSelect={value=>{setSelected(value);setQuery('')}} /></Card>
      {selected?<Selected key={key+selected.standardExerciseId} {...context} exercise={selected} />:<GrowthAnalysis controls={controls} zone={zone}><p className="muted small">미전송 기록은 포함되지 않습니다.</p></GrowthAnalysis>}
    </>}
  </div>
}

function PreviewGrowth({ data, onOpen }: { data:RecordPreviewData; onOpen:(id:string)=>void }) {
 const [tag,setTag]=useState('ALL')
 const [period,setPeriod]=useState<GrowthPeriod>('3'),[query,setQuery]=useState(''),[selected,setSelected]=useState(data.definitions[0]?.id??'')
 const exercise=data.definitions.find(e=>e.id===selected)
 const from=(()=>{
  if(period==='all')return '0000-01-01'
  const d=new Date(data.today+'T12:00:00Z'),day=d.getUTCDate()
  d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-Number(period))
  d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()))
  return d.toISOString().slice(0,10)
 })()
 const rows=data.growth.filter(p=>p.exerciseId===selected&&p.date>=from)
 const points:GrowthPoint[]=rows.map((p,i)=>({id:p.exerciseId+':'+p.date,approvedWeightKg:p.kg,previousWeightKg:p.previousKg,occurredAt:p.date+'T10:00:00Z',recordedAt:p.date+'T10:00:00Z',source:'WORKOUT',sessionId:p.sessionId,connectFromPrevious:i>0,previousPointId:i?rows[i-1].exerciseId+':'+rows[i-1].date:null}))
 const candidates=browseExercises(data.definitions,query,tag as CatalogGroup|'ALL').filter(e=>data.sessions.some(s=>s.initialPlan.weightExercises.some(w=>w.standardExerciseId===e.id))&&(e.name+' '+e.aliases.join(' ')).toLocaleLowerCase().includes(query.toLocaleLowerCase()))
 return <>
  <Card className={styles.searchCard}><h2>분석할 운동</h2><SearchList tags={{label:'운동 부위',options:[{id:'ALL',name:'전체'},...Object.entries(catalogGroups).map(([id,g])=>({id,name:g.label}))],selected:tag,onSelect:tag=>{setTag(tag);setSelected('');setQuery('')}}} query={query} onQuery={setQuery} selected={exercise?.name} label="과거 운동 검색" options={candidates.map(e=>({id:e.id,exerciseId:e.id,name:e.name,description:(e.muscles??[]).filter(m=>m.role==='PRIMARY').map(m=>m.name).join(' · '),icon:<ExerciseIcon kind={(e.muscles?.[0]?.groupCode.toLowerCase()??'other') as 'chest'} />}))} onSelect={id=>{setSelected(id);setQuery('')}} onClear={()=>{setQuery('');setSelected('')}} /></Card>
  <GrowthAnalysis controls={<GrowthPeriods period={period} onChange={setPeriod} />} latest={points.at(-1)} count={points.length} zone="Asia/Seoul">
    <GrowthChartSection points={points} zone="Asia/Seoul" />
  </GrowthAnalysis>
  <GrowthHistoryCard points={points} name={exercise?.name??'운동'} zone="Asia/Seoul" onOpen={onOpen} />
  <p className="muted small">UI 검토 · 합성 승인 이력 · 실제 API와 영구 저장에 연결하지 않습니다.</p>
 </>
}

function GrowthEvent({point,name,zone,onOpen}:{point:GrowthPoint;name:string;zone:string;onOpen:(id:string)=>void}){
 const Tag=point.sessionId?'button':'div'
 const parts = new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',timeZone:zone}).formatToParts(new Date(point.occurredAt))
 const part = (type: string) => parts.find(p=>p.type===type)?.value
 return <Tag {...(point.sessionId?{type:'button' as const}:{})} className={`growth-event ${styles.event}`} onClick={point.sessionId?()=>onOpen(point.sessionId!):undefined}
  title={name+' · 서버 기록 '+point.recordedAt+' · '+(point.source==='WORKOUT'?'운동 중 승인':'루틴에서 승인')+(point.sessionId?'':' · 연결 운동 기록 없음')}>
  <span className={styles.eventBody}>
    <time dateTime={point.occurredAt}>{part('year')}.{part('month')}.{part('day')} · {part('hour')}시</time>
    <span className={styles.eventValues}><span className={styles.weights}>{point.previousWeightKg}kg → <b>{point.approvedWeightKg}kg</b></span><GrowthDelta point={point} /></span>
  </span>
  <span className={styles.detail} aria-label={point.sessionId?'운동 기록 상세':'연결 운동 기록 없음'}>{point.sessionId?'›':'–'}</span>
 </Tag>
}
