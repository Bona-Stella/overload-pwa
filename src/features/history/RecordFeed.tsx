import { iconGlyphs } from '../../components/icons/glyphs.ts'
import { clearClosedRecords, readClosedRecord } from '../workout-online/closed-record-read.ts'
import {recordSummary,recordDuration} from '../workout-online/record-summary.ts'
import {browseExercises,catalogGroups} from '../workout-online/catalog-browse.ts'
import type {CatalogGroup} from '../workout-online/catalog-browse.ts'
import {recordTime} from '../../components/record-time.ts'
import { Fragment, useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import { RefreshButton } from '../../components/common-ui/RefreshButton.tsx'
import { readFailure, readWithDeadline } from '../../app/read-deadline.ts'
import { ContentError, EmptyState } from '../../components/common-ui/ContentFeedback.tsx'
import { FeedbackIcon } from '../../components/common-ui/FeedbackIcon.tsx'
import { Toast } from '../../components/common-ui/Toast.tsx'
import { useReadErrorToast } from '../../components/common-ui/useReadErrorToast.ts'
import { SearchList } from '../../components/SearchList.tsx'
import { useScreenHistory } from '../../app/navigation.ts'
import type { WorkoutApi } from '../workout-online/api.ts'
import type { ClosedPage, Scope, StandardExercise } from '../workout-online/types.ts'
import { boundaryError, readAccessDenied } from '../home/load.ts'
import { addDays } from '../home/model.ts'
import { PeriodControls } from '../statistics/PeriodControls.tsx'
import { selectedPeriod } from '../statistics/period-selection.ts'
import type { PeriodSelection } from '../statistics/period-selection.ts'
import type { RecordRow } from './record-feed.ts'
import { completionDate, recentRecordRows, recordRows, recordWeek } from './record-feed.ts'
import { useRecordPreview } from '../statistics/RecordDisplayContext.ts'
import type { Session } from '../workout-online/types.ts'
import styles from '../statistics/RecordMain.module.css'
import activityStyles from '../statistics/Activity.module.css'
import { SearchScopePopover } from '../statistics/SearchScopePopover.tsx'

function recentDuration(milliseconds: number | null) {
 const value=recordDuration(milliseconds,'minute')
 if(value==='미확인')return value
 const [hours,minutes]=value.split(':').map(Number)
 return [hours?hours+'시간':'',minutes||!hours?minutes+'분':''].filter(Boolean).join(' ')
}

function RecordCardPlaceholder() {
  return <article className={`session-record-card ${styles.recentCard}`} aria-busy="true" aria-label="운동 기록을 확인하는 중입니다.">
   <div className={styles.recentCardHeading} aria-hidden="true"><time className={styles.recordPlaceholder}>00.00 · 월 · 00:00</time><span className={styles.recentStatus}><span className={styles.recordPlaceholder}>전체 완료</span></span><span>{iconGlyphs.next}</span></div>
   <h4 aria-hidden="true"><span className={styles.recordPlaceholder}>운동 루틴</span></h4>
   <div className={styles.recentFacts} aria-hidden="true"><span className={styles.recordPlaceholder}>웨이트 0/0종목 · 총 0분</span></div>
  </article>
}

export function SessionRecordCard({row,session,pending=false,onOpen,timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone}:{row:RecordRow;session?:Session;pending?:boolean;timeZone?:string;onOpen:(id:string)=>void}) {
 const summary=session?recordSummary(session):null,status=summary?.status
 const elapsed=summary?.totalMs??(row.endedAt?Date.parse(row.endedAt)-Date.parse(row.startedAt):null)
 const stamp=recordTime(summary?.startedAt??row.startedAt,session?.startedTimeZone??timeZone,row.workoutDate)
 const date=stamp.replace(/^\d{4}-(\d{2})-(\d{2}) · ([월화수목금토일])요일 · /,'$1.$2 · $3 · ')
 const counts=summary?[summary.hasWeight?'웨이트 '+summary.achievement.weight.completed+'/'+summary.achievement.weight.planned+'종목':null,summary.hasCardio?'유산소 '+summary.achievement.cardio.completed+'/'+summary.achievement.cardio.planned+'종목'+(summary.achievement.cardio.unknown?' · 일부 확인 불가':''):null].filter(Boolean).join(' · '):''
 const label=status?.kind==='complete'?'전체 완료':status?.kind==='partial'?'부분 완료':status?.label
  if (pending) return <RecordCardPlaceholder />
  return <button type="button" className={`session-record-card ${styles.recentCard}`} data-session-id={row.id} data-session-version={summary?.version} onClick={()=>onOpen(row.id)}>
   <div className={styles.recentCardHeading}><time>{session ? date : row.workoutDate.slice(5).replace('-', '.')}</time><span className={`record-card-status ${styles.recentStatus}`} data-state={status?.kind}>{status&&<b aria-hidden="true">{status.mark}</b>}{label}</span><span aria-hidden="true">{iconGlyphs.next}</span></div>
   <h4>{row.routineName}</h4>
   <div className={styles.recentFacts}>{session && <>{counts}{counts&&' · '}<span className="record-durations">총 {recentDuration(elapsed)}</span></>}</div>
  </button>
}

export function RecordFeed({ api, scope, refreshKey, onOpen, onInvalid, recent = false, definitions = [], timeZone, cache, enabled=true, onViewAll }: { enabled?:boolean;api: WorkoutApi; scope: Scope; refreshKey: string; onOpen: (id: string) => void; onInvalid: (error: unknown) => void; recent?: boolean; definitions?: StandardExercise[]; timeZone?: string|null; cache?:{page:ClosedPage|null;set:(page:ClosedPage|null)=>void;details?:Map<string,Session>}; onViewAll?:()=>void }) {
  const preview=useRecordPreview()
  const zone=timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone
  const today = preview?.today??new Intl.DateTimeFormat('sv-SE',{timeZone:zone}).format(new Date()), { userId, dataGeneration } = scope
  const [period, setPeriod] = useScreenHistory<PeriodSelection>('history-month:' + scope.userId + ':' + scope.dataGeneration, { mode: 'month', anchor: today })
  const [search, setSearch] = useScreenHistory('history-search:' + scope.userId + ':' + scope.dataGeneration, { scope: 'routine', query: '', selected: '',tag:'ALL' })
  const [loadedPage, setPage] = useState<ClosedPage | null>(()=>cache?.page??null), [busy, setBusy] = useState(false), [issue, setIssue] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [retryCursor, setRetryCursor] = useState<ClosedPage['next']>(null)
  const page = loadedPage?.userId === userId && loadedPage.dataGeneration === dataGeneration ? loadedPage : null
  const readIssue = '운동 기록을 불러오지 못했어요.'
  const feedback = useReadErrorToast(enabled && page && !busy ? issue : undefined)
  const pageRef=useRef(page),cacheRef=useRef(cache)
  useEffect(()=>{cacheRef.current=cache},[cache])
  const flight = useRef<AbortController | null>(null), failure = useRef(onInvalid)
  useEffect(() => { failure.current = onInvalid }, [onInvalid])
  const load = useCallback(async (cursor: ClosedPage['next'] = null) => {
    if (!enabled || flight.current && !flight.current.signal.aborted) return
    flight.current?.abort(); const abort = new AbortController(); flight.current = abort
    // Publish a manual refresh's busy state in the click update.
    setBusy(true); setLoadingMore(cursor !== null)
    try {
      const next = await readWithDeadline(abort.signal, signal => api.closed({ userId, dataGeneration }, cursor, signal))
      if(!abort.signal.aborted){setIssue(null);const old=pageRef.current,merged=cursor&&old?{...next,sessions:[...old.sessions,...next.sessions.filter(s=>!old.sessions.some(o=>o.id===s.id))]}:next;pageRef.current=merged;setPage(merged);cacheRef.current?.set(merged)}
    } catch (error) {
      if (abort.signal.aborted) return
      if (boundaryError(error) || readAccessDenied(error)) {
        pageRef.current = null; setPage(null); cacheRef.current?.set(null); cacheRef.current?.details?.clear(); clearClosedRecords(api)
        setRetryCursor(null)
      } else {
        setRetryCursor(cursor)
      }
      setIssue(readFailure(error, readIssue))
      if (boundaryError(error)) failure.current(error)
    }
    finally { if (flight.current === abort) { flight.current = null; if (!abort.signal.aborted) { setBusy(false); setLoadingMore(false) } } }
  }, [api, userId, dataGeneration, enabled])
  useEffect(() => { let cancelled = false; void Promise.resolve().then(() => { if (!cancelled) void load() }); return () => { cancelled = true; flight.current?.abort() } }, [load, refreshKey])
  const range = recent ? { fromDate: addDays(today, -6), toDateExclusive: addDays(today, 1) } : selectedPeriod(period)
  const appliedTerm=search.selected||search.query.trim()
  const searching = !recent && !!appliedTerm
  const exerciseSearch = searching && search.scope === 'exercise'
  const source=preview?preview.sessions.map(s=>({...s,routineName:s.initialPlan.routineName,status:s.status==='AUTO_CLOSED'?'AUTO_CLOSED' as const:'FINISHED' as const,closedAt:s.closedAt!})):page?.sessions??[]
  const previewExercises = new Map(preview?.sessions.filter(s => !s.deletedAt).map(s => {
    const snapshot = s.snapshot.state
    const performed = new Set(snapshot.performedSets.filter(set => !snapshot.deletedPerformedSetIds.includes(set.id)).map(set => set.sessionExerciseId))
    const weights = snapshot.sessionExercises.filter(e => performed.has(e.id)).flatMap(e => {
      const name = s.initialPlan.weightExercises.find(w => w.sessionExerciseId === e.id)?.exerciseName
        ?? preview.definitions.find(d => d.id === e.standardExerciseId)?.name
      return name ? [name] : []
    })
    const measured = new Set(snapshot.cardioResults.filter(r => r.status !== 'SKIPPED' && !snapshot.deletedCardioResultIds.includes(r.id)).map(r => r.sessionActivityId))
    const cardio = snapshot.appliedPlan.cardioActivities.filter(a => measured.has(a.sessionActivityId)).map(a => a.plan.name)
    return [s.id, [...weights, ...cardio]]
  }))
  const rows = recent?recentRecordRows(source,today,zone):exerciseSearch && !preview ? [] : recordRows(source, searching ? '0000-01-01' : range.fromDate, searching ? '9999-12-31' : range.toDateExclusive, searching && !exerciseSearch ? appliedTerm : '').filter(row=>!exerciseSearch || previewExercises.get(row.id)?.some(name=>name.toLocaleLowerCase().includes(appliedTerm.toLocaleLowerCase())))
  const options = search.scope === 'exercise'
    ? [...new Set([...previewExercises.values()].flat())].map(name=>({id:name,exerciseId:preview?.definitions.find(e=>e.name===name)?.id,name,description:'실제 수행 운동 · 합성 기록'}))
    : [...new Set(source.map(s => s.routineName))].map(name => ({ id: name, name, description: '루틴명 · 불러온 종료 기록' }))
  const [details, setDetails] = useState(() => new Map<string, Session>())
  const [unavailable, setUnavailable] = useState(() => new Set<string>())
  const savedDetails = cache?.details ?? details
  const matchingDetail = (row: Pick<ClosedPage['sessions'][number], 'id' | 'version'>) => {
    const detail = savedDetails.get(row.id)
    return detail?.userId === userId && detail.dataGeneration === dataGeneration && detail.version === row.version ? detail : undefined
  }
  const existingDetail = useEffectEvent(matchingDetail)
  const detailKey = JSON.stringify(rows.map(({ id, version, status }) => [id, version, status]))
  useEffect(() => {
    if (preview || !enabled || detailKey === '[]') return
    const abort = new AbortController()
    const ids: [string, string, ClosedPage['sessions'][number]['status']][] = JSON.parse(detailKey)
    const missing = ids.filter(([id, version]) => !existingDetail({ id, version }))
    let at = 0
    void Promise.all(Array.from({ length: Math.min(4, missing.length) }, async () => {
      while (at < missing.length && !abort.signal.aborted) {
        const [id, version, status] = missing[at++]
        const key = [userId, dataGeneration, id, version].join(':')
        try {
          const detail = await readWithDeadline(abort.signal, signal => readClosedRecord(api, { userId, dataGeneration }, { id, version, status }, signal))
          if (abort.signal.aborted) return
          if (!detail) { setUnavailable(previous => new Set([...previous, key])); continue }
          cacheRef.current?.details?.set(id, detail)
          setDetails(previous => new Map(previous).set(id, detail))
        } catch (error) {
          if (abort.signal.aborted) return
          if (boundaryError(error)) {
            clearClosedRecords(api)
            cacheRef.current?.details?.clear()
            setDetails(new Map())
            failure.current(error)
            abort.abort()
            return
          }
          if (readAccessDenied(error)) {
            cacheRef.current?.details?.delete(id)
            setDetails(previous => {
              const visible = new Map(previous)
              visible.delete(id)
              return visible
            })
          }
          setUnavailable(previous => new Set([...previous, key]))
        }
      }
    }))
    return () => abort.abort()
  }, [api, userId, dataGeneration, detailKey, refreshKey, preview, enabled])
  const tag=search.tag??'ALL'
  const matchingNames=new Set(browseExercises(preview?.definitions??definitions,'',tag as CatalogGroup|'ALL').map(e=>e.name))
  if(tag==='CARDIO')for(const session of preview?.sessions??[])for(const c of session.initialPlan.cardioActivities)matchingNames.add(c.plan.name)
  const candidates = options.filter(o => (search.scope!=='exercise'||tag==='ALL'||matchingNames.has(o.name))&&o.name.toLocaleLowerCase().includes(search.query.trim().toLocaleLowerCase()))
  const retry = <RefreshButton disabled={!enabled} loading={busy} failure={!page ? issue : null} onRefresh={() => void load(retryCursor)} />
  return <section className={`stack record-feed ${recent?'':activityStyles.page}`} aria-label={recent ? '최근 7일 운동 기록' : '전체 운동 이력'}>
    {recent && <div className={styles.recentHeading}><h2>최근 운동</h2><span className={styles.recentRange}>{range.fromDate.slice(2)} ~ {today.slice(2)}</span>{onViewAll&&<Button compact variant="quiet" onClick={onViewAll}>전체 보기 {iconGlyphs.next}</Button>}</div>}
    {!recent && <><Card className={activityStyles.trend}><PeriodControls variant="activity" value={period} onChange={value => setPeriod(value, true)} monthOnly compact />
      <SearchList scopes={[{ id: 'routine', name: '루틴별' }, { id: 'exercise', name: '운동별' }]} scope={search.scope}
        renderScope={control=><SearchScopePopover {...control} />}
        onScope={value => setSearch({ ...search, scope: value, selected: '',query:'',tag:'ALL' }, true)} loading={!page && !preview && !issue}
        issue={search.scope === 'exercise' && !preview ? '운동별 이력 검색은 서버 연결이 필요해요. 루틴 이름으로 검색해 보세요.' : undefined}
        tags={search.scope==='exercise'&&preview?{label:'운동 부위',options:[{id:'ALL',name:'전체'},...Object.entries(catalogGroups).map(([id,g])=>({id,name:g.label}))],selected:tag,onSelect:tag=>setSearch({...search,tag,selected:'',query:''},true)}:undefined} query={search.query} onQuery={query => setSearch({ ...search, query }, true)} onCloseSearch={()=>{if(search.query!==search.selected)setSearch({...search,query:search.selected},true)}} options={candidates}
        onSelect={id => { const chosen = candidates.find(o => o.id === id); if (chosen) setSearch({ ...search, query: chosen.name, selected: chosen.name },true) }} selected={search.selected}
        onClear={() => setSearch({ ...search, query: '', selected: '' }, true)} /></Card></>}
    {searching && <p role="status" className="muted small">전체 과거 기간 검색 · 월 필터를 적용하지 않습니다.</p>}
    {exerciseSearch && !preview && <EmptyState icon={<FeedbackIcon name="search" size={24} />} title="운동별 검색은 아직 사용할 수 없어요" description="루틴 이름으로 검색해 보세요." />}
    {page?.next && <p className="muted small" role="status">불러온 기록에서 찾고 있어요. 이전 기록을 더 불러올 수 있어요.</p>}
    <div className="stack" aria-busy={!preview && (!page && !issue || busy) || undefined}>
      {!page && !preview && (issue ? <ContentError title={readIssue} action={retry} /> : <RecordCardPlaceholder />)}
      {(!exerciseSearch || !!preview) && (page || preview) && !rows.length && <EmptyState icon={<FeedbackIcon name={searching ? 'search' : 'record'} size={24} />}
        title={searching ? '검색 결과가 없어요' : recent ? '최근 7일간 운동 기록이 없어요' : source.length ? '선택한 기간에 운동 기록이 없어요' : '아직 운동 기록이 없어요'} />}
      {rows.map((row, index) => {
      const week = recordWeek(row.workoutDate), header = !recent && (index === 0 || week.key !== recordWeek(rows[index - 1].workoutDate).key)
      const detail = preview?.sessions.find(s => s.id === row.id) ?? matchingDetail(row)
      const pending = !preview && !detail && !unavailable.has([userId, dataGeneration, row.id, row.version].join(':'))
      return <Fragment key={row.id}>{header && <div className="record-week"><b>{week.title}</b><hr /><span>{week.range}</span></div>}<SessionRecordCard row={recent?{...row,workoutDate:completionDate(row,zone)}:row} session={detail} pending={pending} onOpen={onOpen} timeZone={zone}/></Fragment>
    })}</div>
    {page?.next && <Button loading={loadingMore} disabled={!enabled || busy && !loadingMore} onClick={() => void load(retryCursor ?? page.next)}>이전 기록 더 불러오기</Button>}
    {issue && page && !retryCursor && retry}
    <Toast toast={feedback.toast} onDismiss={feedback.dismiss} bottomClearance="var(--tabs-height, 56px)" />
  </section>
}
