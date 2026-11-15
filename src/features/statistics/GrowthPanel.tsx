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
import { useEffect, useRef, useState } from 'react'
import type { Scope } from '../workout-online/types.ts'
import type { GrowthApi, GrowthExercise, GrowthOptions, GrowthPeriod, GrowthPlacement, GrowthPoint } from './growth.ts'

type Context = { controls?:ReactNode; api: GrowthApi; scope: Scope; period: GrowthPeriod; zone: string; onInvalid: (error: unknown) => void; onOpen: (id: string) => void }
const amount = (text: string) => { const [whole, part = ''] = text.split('.'); return BigInt(whole) * 1000000n + BigInt(part.padEnd(6, '0')) }
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
    {searchOpen&&busy&&<p role="status">과거 운동 확인 중…</p>}<p className="muted small">선택 기간의 최근 수행 종목부터 표시합니다. 삭제된 루틴의 승인 이력도 검색합니다.</p></div>
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
  return <><Card><h2>기간</h2>{controls}<b>공식 승인 중량 (kg)</b>{issue&&<p role="alert">{issue}</p>}{busy&&<p role="status">승인 이력 확인 중…</p>}{!busy&&!issue&&<div className="growth-graph"><GrowthGraph points={points} zone={zone} /></div>}{next!==null&&<><p className="muted small">일부 승인 이력입니다. 이전 이력을 더 불러올 수 있습니다.</p><Button disabled={busy} onClick={()=>void more()}>이전 승인 더 보기</Button></>}</Card>
   <Card><h2>승인 중량 변경 이력</h2>{points.toReversed().map(p=><GrowthEvent key={p.id} point={p} name={exerciseName} zone={zone} onOpen={onOpen}/>)}{!busy&&!points.length&&<p className="muted small">승인 중량 변경 기록이 없습니다.</p>}<p className="muted small">디로딩 중량·일반 세트 수행 중량은 공식 승인 성장선에 포함하지 않습니다.</p></Card></>
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
  return <div className="stack">{issue&&<Card><p role="alert">{issue}</p></Card>}
    {!options&&!issue&&<Card><h2>기간</h2>{context.controls}<p role="status">승인 배치 확인 중…</p></Card>}
    {options&&!options.placements.length&&<Card><h2>기간</h2>{context.controls}<p>이 기간의 승인 중량 변경 기록이 없습니다. 최초·현재 중량으로 과거 값을 만들지 않습니다.</p></Card>}
    {options&&options.placements.length>1&&<label>추적할 루틴 배치<select value={selected} onChange={e=>setSelected(e.target.value)}>{options.placements.map((p,i)=><option key={p.placementId} value={p.placementId}>{p.routineName} · 배치 {i+1}{p.deleted?' · 삭제됨':''}</option>)}</select></label>}
    {current&&<History key={current.placementId} {...context} standardId={exercise.standardExerciseId} exerciseName={exercise.name} placement={current} />}</div>
}
export function GrowthPanel({ api, scope, refreshKey, onInvalid, onOpen }: Omit<Context, 'period' | 'zone'> & { refreshKey: string }) {
  const preview=useRecordPreview()
  const [period, setPeriod] = useState<GrowthPeriod>('3'), [query, setQuery] = useState(''), [selected, setSelected] = useState<GrowthExercise | null>(null)
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const controls=<div className="record-tabs" aria-label="성장 추적 기간">{(['1','3','6','all'] as const).map(value=><Button aria-pressed={period===value} key={value} onClick={()=>setPeriod(value)}>{value==='all'?'전체':value+'개월'}</Button>)}</div>
  const context = { api, scope, period, zone, onInvalid, onOpen, controls }
  const key = [scope.userId, scope.dataGeneration, period, refreshKey].join(':')
  if(preview) return <PreviewGrowth data={preview} onOpen={onOpen} />
  return <div className="stack growth-screen"><h1>성장 추적</h1><Card><h2>운동 종목 선택</h2><SearchResults key={key} {...context} query={query} onQuery={setQuery} selected={selected?.name} onClear={()=>{setSelected(null);setQuery('')}} onSelect={value=>{setSelected(value);setQuery('')}} /><p className="muted small">현재 루틴에서 빠졌거나 비활성화된 종목도 해당 기록이 있으면 조회할 수 있습니다.</p></Card>
    {selected?<Selected key={key+selected.standardExerciseId} {...context} exercise={selected} />:<Card><h2>기간</h2>{controls}<p className="muted small">실제 수행 중량과 구분한 승인 변경 기록입니다. 미전송 기록은 포함되지 않습니다.</p></Card>}</div>
}

function PreviewGrowth({ data, onOpen }: { data:RecordPreviewData; onOpen:(id:string)=>void }) {
 const [tag,setTag]=useState('ALL')
 const [period,setPeriod]=useState('3'),[query,setQuery]=useState(''),[selected,setSelected]=useState(data.definitions[0]?.id??'')
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
 return <div className="stack growth-screen"><h1>성장 추적</h1>
  <Card><h2>운동 종목 선택</h2><SearchList tags={{label:'운동 부위',options:[{id:'ALL',name:'전체'},...Object.entries(catalogGroups).map(([id,g])=>({id,name:g.label}))],selected:tag,onSelect:tag=>{setTag(tag);setSelected('');setQuery('')}}} query={query} onQuery={setQuery} selected={exercise?.name} label="과거 운동 검색" options={candidates.map(e=>({id:e.id,exerciseId:e.id,name:e.name,description:(e.muscles??[]).filter(m=>m.role==='PRIMARY').map(m=>m.name).join(' · '),icon:<ExerciseIcon kind={(e.muscles?.[0]?.groupCode.toLowerCase()??'other') as 'chest'} />}))} onSelect={id=>{setSelected(id);setQuery('')}} onClear={()=>{setQuery('');setSelected('')}} />
   <p className="muted small">현재 루틴에서 빠졌거나 비활성화된 종목도 해당 기록이 있으면 조회할 수 있습니다.</p></Card>
  <Card><h2>기간</h2><div className="record-tabs">{['1','3','6','all'].map(p=><Button key={p} aria-pressed={p===period} onClick={()=>setPeriod(p)}>{p==='all'?'전체':p+'개월'}</Button>)}</div><b>공식 승인 중량 (kg)</b>{rows.length>0&&<strong className="growth-latest">{rows.at(-1)!.kg}kg</strong>}<div className="growth-graph"><GrowthGraph points={points} zone="Asia/Seoul" /></div></Card>
  <Card><h2>승인 중량 변경 이력</h2>{points.toReversed().map(p=><GrowthEvent key={p.id} point={p} name={exercise?.name??'운동'} zone="Asia/Seoul" onOpen={onOpen}/>)}{!rows.length&&<p className="muted small">승인 중량 변경 기록이 없습니다.</p>}<p className="muted small">디로딩 중량·일반 세트 수행 중량은 공식 승인 성장선에 포함하지 않음.</p></Card>
  <p className="muted small">UI 검토 · 합성 승인 이력 · 실제 API와 영구 저장에 연결하지 않습니다.</p>
 </div>
}

function GrowthEvent({point,name,zone,onOpen}:{point:GrowthPoint;name:string;zone:string;onOpen:(id:string)=>void}){
 const direction=amount(point.approvedWeightKg)>amount(point.previousWeightKg)?'increase':amount(point.approvedWeightKg)<amount(point.previousWeightKg)?'decrease':'same'
 const Tag=point.sessionId?'button':'div'
 return <Tag {...(point.sessionId?{type:'button' as const}:{})} className="growth-event" data-direction={direction} onClick={point.sessionId?()=>onOpen(point.sessionId!):undefined}
  title={name+' · 서버 기록 '+point.recordedAt+' · '+(point.source==='WORKOUT'?'운동 중 승인':'루틴에서 승인')+(point.sessionId?'':' · 연결 운동 기록 없음')}>
  <time dateTime={point.occurredAt}>{new Intl.DateTimeFormat('en-US',{month:'numeric',day:'numeric',timeZone:zone}).format(new Date(point.occurredAt))}</time><strong title={name}>{name}</strong>
  <span className="growth-weights">{point.previousWeightKg}kg → <b className="growth-after" data-approval-direction={direction}>{point.approvedWeightKg}kg</b></span>
  <span className="growth-detail" aria-label={point.sessionId?'운동 기록 상세':'연결 운동 기록 없음'}>{point.sessionId?'›':'–'}</span>
 </Tag>
}
