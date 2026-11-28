import segmented from '../../components/common-ui/SegmentedControl.module.css'
import { iconGlyphs } from '../../components/icons/glyphs.ts'
import { Icon } from '../../components/icons/Icon.tsx'
import { weightHistory } from '../../components/icons/record.tsx'
import { DropdownField } from '../../components/common-ui/SelectDropdown.tsx'
import {browseExercises,catalogGroups} from '../workout-online/catalog-browse.ts'
import type {CatalogGroup} from '../workout-online/catalog-browse.ts'
import { growthChartData } from './growth-chart.ts'
import type { ReactNode } from 'react'
import { RecordChart } from './RecordChart.tsx'
import { useRecordPreview } from './RecordDisplayContext.ts'
import type { RecordPreviewData } from './RecordDisplayContext.ts'
import { SearchList } from '../../components/SearchList.tsx'
import { RefreshButton } from '../../components/common-ui/RefreshButton.tsx'
import { readFailure, readWithDeadline } from '../../app/read-deadline.ts'
import { ContentError, EmptyState } from '../../components/common-ui/ContentFeedback.tsx'
import { FeedbackIcon } from '../../components/common-ui/FeedbackIcon.tsx'
import { Toast } from '../../components/common-ui/Toast.tsx'
import { useReadErrorToast } from '../../components/common-ui/useReadErrorToast.ts'
import { ExerciseIcon } from '../../components/ExerciseIcon.tsx'
import { Card, Button } from '../../components/ui.tsx'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { Scope } from '../workout-online/types.ts'
import type { GrowthApi, GrowthExercise, GrowthOptions, GrowthPeriod, GrowthPlacement, GrowthPoint } from './growth.ts'
import { boundaryError, readAccessDenied } from '../home/load.ts'
import { StatisticsWait } from './StatisticsWait.tsx'
import styles from './Growth.module.css'

type Context = { api: GrowthApi; scope: Scope; period: GrowthPeriod; zone: string; refreshKey: string; onInvalid: (error: unknown) => void; onOpen: (id: string) => void }
const amount = (text: string) => { const [whole, part = ''] = text.split('.'); return BigInt(whole) * 1000000n + BigInt(part.padEnd(6, '0')) }
const periods = ['1', '3', '6', 'all'] as const

function GrowthPeriods({ period, onChange }: { period: GrowthPeriod; onChange: (value: GrowthPeriod) => void }) {
  return <div className={segmented.segment} data-options="four" data-period={period} role="group" aria-label="성장 추적 기간">
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
  return <span>{count===undefined?'':`${partial?'불러온 ':''}${count}건`}</span>
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
          <strong className="growth-latest">{latest?<>{latest.approvedWeightKg}<small>kg</small></>:count !== undefined && '미확인'}</strong>
          {latest&&<time dateTime={latest.occurredAt}>최근 승인 · {new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',timeZone:zone}).format(new Date(latest.occurredAt))}</time>}
        </div>
        {latest&&<GrowthDelta point={latest} comparison />}
      </div>
      <div className={styles.countRow}>
        <span><Icon icon={weightHistory} />승인 중량 변경</span>
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

function GrowthHistoryCard({ points, name, zone, onOpen, partial = false }: {
  points: GrowthPoint[]; name: string; zone: string; onOpen: (id: string) => void; partial?: boolean
}) {
  return <Card className={styles.historyCard}>
    <div className={styles.heading}><h2>승인 중량 변경 이력</h2><GrowthCount count={points.length} partial={partial} /></div>
    {points.length>0&&<ul className={styles.historyList}>{points.toReversed().map(p=><li key={p.id}><GrowthEvent point={p} name={name} zone={zone} onOpen={onOpen} /></li>)}</ul>}
  </Card>
}

export function GrowthGraph({ points, zone }: { points: GrowthPoint[]; zone: string }) {
  if (!points.length) return <EmptyState embedded icon={<FeedbackIcon name="record" size={24} />} title="선택한 기간에 승인 중량 변경 기록이 없어요" />
  return <><RecordChart data={growthChartData(points,zone)} kind="line" unit="kg" label="승인 중량 변화" timeZone={zone}/>
    <p className="sr-only">승인된 변경값만 표시합니다. 점 사이의 연결 근거가 없으면 선을 이어 그리지 않습니다.</p></>
}
function SearchResults({ query, onQuery, selected, onClear, onSelect, ...context }: Context & { query: string; onQuery:(value:string)=>void; selected?:string; onClear:()=>void; onSelect: (value: GrowthExercise) => void }) {
  const { api, scope, period, zone, onInvalid, refreshKey } = context
  const [tag,setTag]=useState('ALL')
  const [searchOpen,setSearchOpen]=useState(false)
  const [retry, retrySearch] = useState(0)
  const queryKey = JSON.stringify([period, refreshKey, query, tag, retry])
  const [loadedQuery,setLoadedQuery]=useState<string|null>(null)
  const [rows, setRows] = useState<GrowthExercise[]>([]), [next, setNext] = useState<number | null>(null), [busy, setBusy] = useState(true), [issue, setIssue] = useState('')
  const flight = useRef<AbortController | null>(null)
  useEffect(() => {
    if(!searchOpen)return
    const abort = new AbortController(); flight.current = abort
    void Promise.resolve().then(()=>{if(abort.signal.aborted)return null;setBusy(true);return readWithDeadline(abort.signal, signal => api.search(scope, period, zone, query, 0, signal,tag))}).then(page => { if (page&&!abort.signal.aborted) { setIssue(''); setRows(page.exercises); setNext(page.nextOffset);setLoadedQuery(queryKey) } })
      .catch((error: unknown) => {
        if (abort.signal.aborted) return
        if (readAccessDenied(error) || boundaryError(error)) { setRows([]); setLoadedQuery(null); setNext(null) }
        onInvalid(error); setIssue(readFailure(error, '과거 운동을 불러오지 못했어요.'))
      }).finally(() => { if (!abort.signal.aborted) setBusy(false) })
    return () => { abort.abort(); flight.current?.abort() }
  }, [api, scope, period, zone, query, onInvalid,searchOpen,tag,queryKey])
  async function more() {
    if (busy || next === null) return
    const abort = new AbortController(); flight.current = abort; setBusy(true)
    try { const page = await api.search(scope, period, zone, query, next, abort.signal,tag); if (!abort.signal.aborted) { setIssue(''); setRows(values => [...new Map([...values, ...page.exercises].map(e => [e.standardExerciseId, e])).values()]); setNext(page.nextOffset) } }
    catch (error) { if (!abort.signal.aborted) { onInvalid(error); setIssue('운동을 더 불러오지 못했어요.') } }
    finally { if (!abort.signal.aborted) setBusy(false) }
  }
  const pending = loadedQuery !== queryKey
  const recorded = rows.filter(exercise => exercise.lastPerformedAt !== null)
  // The server orders performed exercises first. Approval-only rows mark the end of the performed list.
  const hasMoreRecords = next !== null && recorded.length === rows.length
  const feedback = useReadErrorToast(searchOpen && recorded.length && !busy ? issue : null)
  return <div className="stack"><SearchList tags={{label:'운동 부위',options:[{id:'ALL',name:'전체'},...Object.entries(catalogGroups).map(([id,g])=>({id,name:g.label}))],selected:tag,onSelect:setTag}}
    onSearchOpenChange={setSearchOpen} query={query} onQuery={onQuery} selected={selected} onClear={onClear} label="과거 운동 검색" issue={issue}
    loading={pending} resultsPending={pending && rows.length > 0}
    options={recorded.map(e=>({id:e.standardExerciseId,exerciseId:e.standardExerciseId,name:e.name,description:'완료 웨이트 수행 기록',icon:<ExerciseIcon kind="other" />}))}
    emptyTitle="선택 기간에 일치하는 수행 기록이 없어요"
    onSelect={id=>{const row=recorded.find(e=>e.standardExerciseId===id);if(row&&!pending)onSelect(row)}}
    resultsFooter={issue
      ? <RefreshButton loading={busy} failure={!recorded.length ? issue : null} onRefresh={() => { if (pending || next === null) retrySearch(value => value + 1); else void more() }} />
      : hasMoreRecords && <Button disabled={busy || pending} onClick={() => void more()}>운동 더 보기</Button>} />
    <Toast toast={feedback.toast} onDismiss={feedback.dismiss} bottomClearance="var(--tabs-height, 56px)" />
  </div>
}

type GrowthSelection = {
  request: string; optionKey: string; options: GrowthOptions; placement?: GrowthPlacement;
  period: GrowthPeriod; points: GrowthPoint[]; next: number | null; moreBusy?: boolean; moreIssue?: string
}

function Selected({ exercise, api, scope, period, zone, onInvalid, onOpen, onPeriod, refreshKey }: Context & {
  exercise: GrowthExercise; onPeriod: (value: GrowthPeriod) => void
}) {
  const [view, setView] = useState<GrowthSelection | null>(null)
  const [placementId, setPlacementId] = useState('')
  const [failure, setFailure] = useState<{ selection: string; retry: number; message: string } | null>(null)
  const [retry, setRetry] = useState(0)
  const flight = useRef<AbortController | null>(null)
  const { userId, dataGeneration } = scope
  const standardId = exercise.standardExerciseId
  const optionKey = JSON.stringify([userId, dataGeneration, standardId, period, zone, refreshKey])
  const selection = JSON.stringify([optionKey, placementId])
  const request = JSON.stringify([selection, retry])
  const previous = useEffectEvent(() => view)
  const settled = view?.request === request
  const failedSelection = failure?.selection === selection ? failure : null
  const pending = !settled && failedSelection?.retry !== retry

  useEffect(() => {
    const prior = previous()
    if (prior?.request === request) return () => flight.current?.abort()
    const abort = new AbortController()
    flight.current = abort
    const owner = { userId, dataGeneration }
    void readWithDeadline(abort.signal, async signal => {
      const options = prior?.optionKey === optionKey ? prior.options : await api.options(owner, standardId, period, zone, signal)
      signal.throwIfAborted()
      const preferred = placementId || prior?.placement?.placementId
      const placement = options.placements.find(item => item.placementId === preferred) ?? options.placements[0]
      const history = placement && await api.history(owner, standardId, placement, period, zone, 0, signal)
      if (!signal.aborted) {
        setView({ request, optionKey, options, placement, period, points: history?.points ?? [], next: history?.nextOffset ?? null })
        setFailure(null)
      }
    }).catch(error => {
      if (abort.signal.aborted) return
      if (readAccessDenied(error) || boundaryError(error)) setView(null)
      onInvalid(error)
      setFailure({ selection, retry, message: readFailure(error, '승인 이력을 불러오지 못했어요.') })
    })
    return () => { abort.abort(); flight.current?.abort() }
  }, [api, userId, dataGeneration, standardId, period, zone, optionKey, placementId, selection, retry, request, onInvalid])

  async function more() {
    if (!settled || !view?.placement || view.next === null || view.moreBusy) return
    const abort = new AbortController()
    flight.current = abort
    setView({ ...view, moreBusy: true })
    try {
      const page = await api.history(scope, standardId, view.placement, view.period, zone, view.next, abort.signal)
      if (!abort.signal.aborted) {
        const points = [...new Map([...view.points, ...page.points].map(point => [point.id, point])).values()]
        setView({ ...view, points, next: page.nextOffset, moreBusy: false, moreIssue: undefined })
      }
    } catch (error) {
      if (abort.signal.aborted) return
      if (readAccessDenied(error) || boundaryError(error)) {
        setView(null)
        setFailure({ selection, retry, message: readFailure(error, '승인 이력을 불러오지 못했어요.') })
      } else setView({ ...view, moreBusy: false, moreIssue: '이전 승인 이력을 불러오지 못했습니다.' })
      onInvalid(error)
    }
  }

  const controls = <>
    <GrowthPeriods period={view?.period ?? period} onChange={onPeriod} />
    {view && view.options.placements.length > 1 && <DropdownField label="추적할 루틴 배치" className={styles.placement} value={view.placement?.placementId}
      options={view.options.placements.map((item, index) => ({ id: item.placementId,
        name: `${item.routineName} · 배치 ${index + 1}${item.deleted ? ' · 삭제됨' : ''}` }))} onChange={setPlacementId} />}
  </>
  const readIssue = '승인 이력을 불러오지 못했어요.'
  const feedback = useReadErrorToast(view && (failedSelection && !pending ? failedSelection.message : !view.moreBusy ? view.moreIssue : null))
  const tryAgain = <RefreshButton loading={pending} failure={!view ? failedSelection?.message : null} onRefresh={() => setRetry(value => value + 1)} />
  return <>
    <GrowthAnalysis controls={controls} latest={view?.points[0]} count={view?.points.length} partial={view?.next != null} zone={zone}>
      {view?.placement ? <GrowthChartSection points={view.points} zone={zone} />
        : view ? <GrowthGraph points={view.points} zone={zone} />
          : failedSelection && <ContentError embedded title={readIssue} action={tryAgain} />}
      {view?.next != null && <><p className="muted small">일부 승인 이력입니다. 이전 이력을 더 불러올 수 있습니다.</p>
        {view.moreIssue ? <RefreshButton disabled={pending || !!failedSelection} loading={view.moreBusy} onRefresh={() => void more()} />
          : <Button disabled={pending || !!failedSelection} loading={view.moreBusy} onClick={() => void more()}>이전 승인 더 보기</Button>}</>}
    </GrowthAnalysis>
    {view?.placement && <GrowthHistoryCard points={view.points} name={exercise.name} zone={zone} onOpen={onOpen} partial={view.next !== null} />}
    {failedSelection && view && tryAgain}
    <StatisticsWait pending={pending && !view && !failedSelection} label="승인 이력을 불러오는 중입니다." />
    <Toast toast={feedback.toast} onDismiss={feedback.dismiss} bottomClearance="var(--tabs-height, 56px)" />
  </>
}
export function GrowthPanel({ api, scope, refreshKey, onInvalid, onOpen, onBack, backLabel }: Omit<Context, 'period' | 'zone'> & { onBack?: () => void; backLabel?: string }) {
  const preview=useRecordPreview()
  const [period, setPeriod] = useState<GrowthPeriod>('3'), [query, setQuery] = useState(''), [selected, setSelected] = useState<GrowthExercise | null>(null)
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const controls=<GrowthPeriods period={period} onChange={setPeriod} />
  const context = { api, scope, period, zone, onInvalid, onOpen, refreshKey }
  const key = [scope.userId, scope.dataGeneration].join(':')
  return <div className={`stack growth-screen ${styles.screen}`}>
    <RecordSubpageHeader title="성장 추적" onBack={onBack} backLabel={backLabel} />
    {preview?<PreviewGrowth data={preview} onOpen={onOpen} />:<>
      <Card className={styles.searchCard}><h2>분석할 운동</h2><SearchResults key={key} {...context} query={query} onQuery={setQuery} selected={selected?.name} onClear={()=>{setSelected(null);setQuery('')}} onSelect={value=>{setSelected(value);setQuery('')}} /></Card>
      {selected?<Selected key={key+selected.standardExerciseId} {...context} exercise={selected} onPeriod={setPeriod} />:<GrowthAnalysis controls={controls} zone={zone}><EmptyState embedded icon={<FeedbackIcon name="search" size={24} />} title="분석할 운동을 선택해 주세요" /></GrowthAnalysis>}
    </>}
  </div>
}

function PreviewGrowth({ data, onOpen }: { data:RecordPreviewData; onOpen:(id:string)=>void }) {
 const [tag,setTag]=useState('ALL')
 const [period,setPeriod]=useState<GrowthPeriod>('3'),[query,setQuery]=useState('')
 const from=(()=>{
  if(period==='all')return '0000-01-01'
  const d=new Date(data.today+'T12:00:00Z'),day=d.getUTCDate()
  d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-Number(period))
  d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()))
  return d.toISOString().slice(0,10)
 })()
 const recordedIds = new Set(data.sessions.filter(s => s.status !== 'ACTIVE' && !s.deletedAt && s.workoutDate >= from).flatMap(s => {
  const snapshot = s.snapshot.state
  const performed = new Set(snapshot.performedSets.filter(set => !snapshot.deletedPerformedSetIds.includes(set.id)).map(set => set.sessionExerciseId))
  return snapshot.sessionExercises.filter(e => performed.has(e.id)).map(e => e.standardExerciseId)
 }))
 const [selected,setSelected]=useState(data.definitions.find(e=>recordedIds.has(e.id))?.id??'')
 const exercise=data.definitions.find(e=>e.id===selected)
 const rows=data.growth.filter(p=>p.exerciseId===selected&&p.date>=from)
 const points:GrowthPoint[]=rows.map((p,i)=>({id:p.exerciseId+':'+p.date,approvedWeightKg:p.kg,previousWeightKg:p.previousKg,occurredAt:p.date+'T10:00:00Z',recordedAt:p.date+'T10:00:00Z',source:'WORKOUT',sessionId:p.sessionId,connectFromPrevious:i>0,previousPointId:i?rows[i-1].exerciseId+':'+rows[i-1].date:null}))
 const candidates=browseExercises(data.definitions,query,tag as CatalogGroup|'ALL').filter(e=>recordedIds.has(e.id))
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
    <span className={styles.eventValues}><span className={styles.weights}>{point.previousWeightKg}kg {iconGlyphs.forward} <b>{point.approvedWeightKg}kg</b></span><GrowthDelta point={point} /></span>
  </span>
  <span className={styles.detail} aria-label={point.sessionId?'운동 기록 상세':'연결 운동 기록 없음'}>{point.sessionId?iconGlyphs.next:'–'}</span>
 </Tag>
}
