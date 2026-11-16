import {recordSummary,recordDuration,recordKg} from '../workout-online/record-summary.ts'
import {browseExercises,catalogGroups} from '../workout-online/catalog-browse.ts'
import type {CatalogGroup} from '../workout-online/catalog-browse.ts'
import {recordTime} from '../../components/record-time.ts'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import { SearchList } from '../../components/SearchList.tsx'
import { useScreenHistory } from '../../app/navigation.ts'
import type { WorkoutApi } from '../workout-online/api.ts'
import type { ClosedPage, Scope, StandardExercise } from '../workout-online/types.ts'
import { boundaryError } from '../home/load.ts'
import { addDays } from '../home/model.ts'
import { PeriodControls } from '../statistics/PeriodControls.tsx'
import { selectedPeriod } from '../statistics/period-selection.ts'
import type { PeriodSelection } from '../statistics/period-selection.ts'
import type { RecordRow } from './record-feed.ts'
import { completionDate, recentRecordRows, recordRows, recordWeek } from './record-feed.ts'
import { useRecordPreview } from '../statistics/RecordDisplayContext.ts'
import type { Session } from '../workout-online/types.ts'

export function SessionRecordCard({row,session,onOpen,timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone,recent=false}:{row:RecordRow;session?:Session;timeZone?:string;recent?:boolean;onOpen:(id:string)=>void}) {
 const summary=session?recordSummary(session):null,status=summary?.status
 const elapsed=summary?.totalMs??(row.endedAt?Date.parse(row.endedAt)-Date.parse(row.startedAt):null)
 const stamp=recordTime(summary?.startedAt??row.startedAt,session?.startedTimeZone??timeZone,row.workoutDate)
 const date=recent?stamp.replace(/^\d{4}-(\d{2})-(\d{2}) · ([월화수목금토일])요일 · /,'$1.$2 $3 '):stamp
 const counts=summary?[summary.hasWeight?'웨이트 '+summary.achievement.weight.completed+'/'+summary.achievement.weight.planned+'종목':null,summary.hasCardio?'유산소 '+summary.achievement.cardio.completed+'/'+summary.achievement.cardio.planned+'종목'+(summary.achievement.cardio.unknown?' · 일부 확인 불가':''):null].filter(Boolean).join(' · '):'종목 완료 수 · 상세 조회 필요'
 const totals=summary?[summary.hasWeight?'총 '+summary.completedSets+'세트':null,summary.hasCardio?summary.distanceKm===null?'거리 미입력':summary.distanceKm+'km'+(summary.unknownDistance?' · 일부 거리 미입력':''):null].filter(Boolean).join(' · '):''
 const volume=summary?.hasWeight?<span>총중량 {recordKg(summary.volumeKg)}{summary.volumeKg!==null&&summary.unknownVolume?' + 미확인':''}</span>:null
 return <button type="button" className="session-record-card" data-session-id={row.id} data-session-version={summary?.version} onClick={()=>onOpen(row.id)}>
  <div className="record-card-heading"><time>{date}</time><span className="record-card-status" aria-label={status?.label??'달성 확인 중'} title={status?.label} data-state={status?.kind??'unknown'}>{status?<b aria-hidden="true">{status.mark}</b>:'?'}</span><span aria-hidden="true">›</span></div><h4>{summary?.routineName??row.routineName}</h4>
  <div className="record-exercise-line muted small"><span>{counts}</span>{recent&&<span>{totals}</span>}</div>
  {recent?<div className="record-pair small"><span className="record-durations">총 운동 {recordDuration(elapsed,'minute')}{summary?.hasWeight&&<> · 웨이트 {recordDuration(summary.weightMs,'minute')}</>}{summary?.hasCardio&&<> · 유산소 {recordDuration(summary.cardioMs,'minute')}</>}</span>{volume}</div>
   :<><div className="record-pair record-total"><strong>총 운동 {recordDuration(elapsed)}</strong>{volume&&<strong>{volume}</strong>}</div><div className="record-pair muted small record-type-times">{summary?.hasWeight&&<span>웨이트 {recordDuration(summary.weightMs)}</span>}{summary?.hasCardio&&<span>유산소 {recordDuration(summary.cardioMs)}</span>}</div></>}
 </button>
}

export function RecordFeed({ api, scope, refreshKey, onOpen, onInvalid, recent = false, definitions = [], timeZone, cache, enabled=true }: { enabled?:boolean;api: WorkoutApi; scope: Scope; refreshKey: string; onOpen: (id: string) => void; onInvalid: (error: unknown) => void; recent?: boolean; definitions?: StandardExercise[]; timeZone?: string|null; cache?:{page:ClosedPage|null;set:(page:ClosedPage)=>void} }) {
  const preview=useRecordPreview()
  const zone=timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone
  const today = preview?.today??new Intl.DateTimeFormat('sv-SE',{timeZone:zone}).format(new Date()), { userId, dataGeneration } = scope
  const [period, setPeriod] = useScreenHistory<PeriodSelection>('history-month:' + scope.userId + ':' + scope.dataGeneration, { mode: 'month', anchor: today })
  const [search, setSearch] = useScreenHistory('history-search:' + scope.userId + ':' + scope.dataGeneration, { scope: 'routine', query: '', selected: '',tag:'ALL' })
  const [page, setPage] = useState<ClosedPage | null>(()=>cache?.page??null), [busy, setBusy] = useState(false), [issue, setIssue] = useState(false)
  const pageRef=useRef(page),cacheRef=useRef(cache)
  useEffect(()=>{cacheRef.current=cache},[cache])
  const flight = useRef<AbortController | null>(null), failure = useRef(onInvalid)
  useEffect(() => { failure.current = onInvalid }, [onInvalid])
  const load = useCallback(async (cursor: ClosedPage['next'] = null) => {
    if(!enabled)return
    flight.current?.abort(); const abort = new AbortController(); flight.current = abort
    await Promise.resolve(); if (abort.signal.aborted) return
    setBusy(true); setIssue(false)
    try {
      const next = await api.closed(scope, cursor, abort.signal)
      if(!abort.signal.aborted){const old=pageRef.current,merged=cursor&&old?{...next,sessions:[...old.sessions,...next.sessions.filter(s=>!old.sessions.some(o=>o.id===s.id))]}:next;pageRef.current=merged;setPage(merged);cacheRef.current?.set(merged)}
    } catch (error) { if (!abort.signal.aborted) { setIssue(true); if (boundaryError(error)) failure.current(error) } }
    finally { if (!abort.signal.aborted) setBusy(false) }
  }, [api, scope, enabled])
  useEffect(() => { let cancelled = false; void Promise.resolve().then(() => { if (!cancelled) void load() }); return () => { cancelled = true; flight.current?.abort() } }, [load, refreshKey])
  const range = recent ? { fromDate: addDays(today, -6), toDateExclusive: addDays(today, 1) } : selectedPeriod(period)
  const appliedTerm=search.selected||search.query.trim()
  const searching = !recent && !!appliedTerm
  const exerciseSearch = searching && search.scope === 'exercise'
  const source=preview?preview.sessions.map(s=>({...s,routineName:s.initialPlan.routineName,status:s.status==='AUTO_CLOSED'?'AUTO_CLOSED' as const:'FINISHED' as const,closedAt:s.closedAt!})):page?.sessions??[]
  const rows = recent?recentRecordRows(source,today,zone):exerciseSearch && !preview ? [] : recordRows(source, searching ? '0000-01-01' : range.fromDate, searching ? '9999-12-31' : range.toDateExclusive, searching && !exerciseSearch ? appliedTerm : '').filter(row=>!exerciseSearch || !!preview?.sessions.find(s=>s.id===row.id && [...s.initialPlan.weightExercises.map(e=>e.exerciseName),...s.initialPlan.cardioActivities.map(c=>c.plan.name)].some(name=>name.toLocaleLowerCase().includes(appliedTerm.toLocaleLowerCase()))))
  const options = search.scope === 'exercise' ? (preview ? [...new Set(preview.sessions.flatMap(s=>[...s.initialPlan.weightExercises.map(e=>e.exerciseName),...s.initialPlan.cardioActivities.map(c=>c.plan.name)]))].map(name=>({id:name,exerciseId:preview.definitions.find(e=>e.name===name)?.id,name,description:'실제 세션 포함 운동 · 합성 기록'})) : definitions.map(e => ({ id: e.id, exerciseId:e.id, name: e.name, description: '실제 포함 운동 검색 · 서버 연결 대기' })))
    : [...new Set(source.map(s => s.routineName))].map(name => ({ id: name, name, description: '루틴명 · 불러온 종료 기록' }))
  const [details,setDetails]=useState<{key:string;rows:Map<string,Session>}|null>(null)
  const detailIds=JSON.stringify(rows.map(r=>r.id)),detailKey=JSON.stringify([userId,dataGeneration,refreshKey,rows.map(r=>[r.id,r.version])])
  useEffect(()=>{
    if(preview||!enabled)return
    const abort=new AbortController(),ids:string[]=JSON.parse(detailIds),loaded=new Map<string,Session>()
    let at=0
    void Promise.all(Array.from({length:Math.min(4,ids.length)},async()=>{
      while(at<ids.length&&!abort.signal.aborted){
        const id=ids[at++]
        try{loaded.set(id,await api.detail(scope,id,abort.signal))}
        catch(error){if(!abort.signal.aborted&&boundaryError(error))failure.current(error)}
      }
    })).then(()=>{if(!abort.signal.aborted)setDetails({key:detailKey,rows:loaded})})
    return()=>abort.abort()
  },[api,scope,detailIds,detailKey,preview,enabled])
  const tag=search.tag??'ALL'
  const matchingNames=new Set(browseExercises(preview?.definitions??definitions,'',tag as CatalogGroup|'ALL').map(e=>e.name))
  if(tag==='CARDIO')for(const session of preview?.sessions??[])for(const c of session.initialPlan.cardioActivities)matchingNames.add(c.plan.name)
  const candidates = options.filter(o => (search.scope!=='exercise'||tag==='ALL'||matchingNames.has(o.name))&&o.name.toLocaleLowerCase().includes(search.query.trim().toLocaleLowerCase()))
  return <section className="stack record-feed" aria-label={recent ? '최근 7일 운동 기록' : '전체 운동 이력'}>
    {recent && <p className="muted small">{range.fromDate} ~ {today} · 오늘 포함 최근 7일{preview?' · 합성 완료 기록':''}</p>}
    {!recent && <><h1 id="workout-history-title">전체 운동 이력</h1><Card><PeriodControls value={period} onChange={value => setPeriod(value, true)} monthOnly compact />
      <SearchList scopes={[{ id: 'routine', name: '루틴별' }, { id: 'exercise', name: '운동별' }]} scope={search.scope}
        onScope={value => setSearch({ ...search, scope: value, selected: '',query:'',tag:'ALL' }, true)}
        tags={search.scope==='exercise'?{label:'운동 부위',options:[{id:'ALL',name:'전체'},...Object.entries(catalogGroups).map(([id,g])=>({id,name:g.label}))],selected:tag,onSelect:tag=>setSearch({...search,tag,selected:'',query:''},true)}:undefined} query={search.query} onQuery={query => setSearch({ ...search, query }, true)} onCloseSearch={()=>{if(search.query!==search.selected)setSearch({...search,query:search.selected},true)}} options={candidates}
        onSelect={id => { const chosen = candidates.find(o => o.id === id); if (chosen) setSearch({ ...search, query: chosen.name, selected: chosen.name },true) }} selected={search.selected}
        onClear={() => setSearch({ ...search, query: '', selected: '' }, true)} /></Card></>}
    {searching && <p role="status" className="muted small">전체 과거 기간 검색 · 월 필터를 적용하지 않습니다.</p>}
    {exerciseSearch && !preview && <p className="notice" role="status">실제 세션에 포함된 운동명으로 검색하는 기능은 서버 연결을 기다리고 있습니다. 루틴별 검색은 불러온 기록에서 사용할 수 있습니다.</p>}
    {issue && <p role="alert">기록을 조회하지 못했습니다. 표시된 목록이 최신인지 확인할 수 없습니다.</p>}
    {busy && !page && !preview && <p role="status">운동 기록을 불러오는 중입니다.</p>}
    {page?.next && <p className="muted small" role="status">불러온 기록만 표시합니다. 기간·전체 검색 결과가 완전하지 않을 수 있습니다. 이전 기록을 더 불러올 수 있습니다.</p>}
    {!busy && !issue && (!exerciseSearch || !!preview) && page && !rows.length && <p>{page.next ? '불러온 기록에서 조건에 맞는 운동을 찾지 못했습니다.' : recent ? '최근 7일 운동 기록이 없습니다.' : '조건에 맞는 운동 기록이 없습니다.'}</p>}
    <div className="stack">{rows.map((row, index) => {
      const week = recordWeek(row.workoutDate), header = !recent && (index === 0 || week.key !== recordWeek(rows[index - 1].workoutDate).key)
      return <Fragment key={row.id}>{header && <div className="record-week"><b>{week.title}</b><hr /><span>{week.range}</span></div>}<SessionRecordCard row={recent?{...row,workoutDate:completionDate(row,zone)}:row} session={preview?.sessions.find(s=>s.id===row.id)??(details?.key===detailKey?details.rows.get(row.id):undefined)} onOpen={onOpen} timeZone={zone} recent={recent}/></Fragment>
    })}</div>
    {page?.next && <Button disabled={busy} onClick={() => void load(page.next)}>이전 기록 더 불러오기</Button>}
    {issue && <Button disabled={busy} onClick={() => void load()}>다시 조회</Button>}
  </section>
}
