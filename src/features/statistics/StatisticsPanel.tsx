import {browseExercises,catalogGroups} from '../workout-online/catalog-browse.ts'
import type {CatalogGroup} from '../workout-online/catalog-browse.ts'
import { durationLabel, durationMinutesLabel } from '../../components/duration.ts'
import { RecordChart } from './RecordChart.tsx'
import { displayDecimal, sumDecimals } from './display-decimal.ts'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, Scope, ClosedPage } from '../workout-online/types.ts'
import type { Statistics, StatisticsApi, WeightStats, Overview } from './api.ts'
import { periodFor } from './api.ts'
import type { WorkoutApi } from '../workout-online/api.ts'
import type { StandardExercise } from '../workout-online/types.ts'
import type { LiveSchedule } from './weekly-schedule.ts'
import { SearchList } from '../../components/SearchList.tsx'
import { Button, Card } from '../../components/ui.tsx'
import { useScreenHistory } from '../../app/navigation.ts'
import { RecordFeed } from '../history/RecordFeed.tsx'
import { WeeklyMusclePlan, WeeklyMuscleStatistics } from './MuscleAnalysis.tsx'
import { muscleGroups } from './muscle-analysis.ts'
import { PeriodControls } from './PeriodControls.tsx'
import { localToday, selectedPeriod } from './period-selection.ts'
import type { PeriodSelection } from './period-selection.ts'
import { addDays, dayOfWeek, weekdays, dayStatus } from '../home/model.ts'
import { partialAchievement } from './display-achievement.ts'
import { useRecordPreview } from './RecordDisplayContext.ts'
import { ExerciseIcon } from '../../components/ExerciseIcon.tsx'
import './statistics.css'
import { GrowthPanel } from './GrowthPanel.tsx'

const cardioKinds: Record<string, string> = { TREADMILL: '러닝머신', BIKE: '자전거', OUTDOOR: '야외 운동', STAIRS: '계단', OTHER: '기타', UNCLASSIFIED: '미분류' }
const cardioTime = durationLabel
function plannedCardioMs(planning: Overview) {
  if (planning.statistics.planCoverage !== 'FULL_SCHEDULE_HISTORY') return null
  let total = 0n
  for (const day of planning.plannedDays) {
    if (day.status === 'REST' || day.status === 'BEFORE_REGISTRATION') continue
    if (day.status === 'UNKNOWN' || day.plan === null) return null
    for (const activity of day.plan.cardioPlacements) total += BigInt(activity.plan.targetSeconds) * 1000n
  }
  return total
}
type Row = { key: string; name: string; weights: WeightStats; contributionSets?: string }
export function WeightChart({ rows }: { rows: Row[] }) {
  const [metric, setMetric] = useState<'sets' | 'volume'>('sets')
  const volumeAvailable = rows.some(r => r.weights.volumeLoadKg !== null)
  const hasContribution = rows.some(r => r.contributionSets !== undefined)
  const values = rows.map(r => metric === 'volume' && volumeAvailable ? r.weights.volumeLoadKg : r.contributionSets ?? r.weights.completedSets)
  return <div className="stack">{volumeAvailable && <div className="row" aria-label="집계 항목"><button className="outline" aria-pressed={metric === 'sets'} onClick={() => setMetric('sets')}>{hasContribution ? '기여 세트' : '세트 수'}</button><button className="outline" aria-pressed={metric === 'volume'} onClick={() => setMetric('volume')}>총중량</button></div>}
    {!rows.length && <p className="muted">해당 기간의 기록이 없습니다.</p>}
    {rows.map((row, index) => <div className="statistics-row" key={row.key}><div><strong>{row.name}</strong><span>{metric === 'volume' && volumeAvailable ? values[index] === null ? '중량 기록 없음' : `${values[index]} kg` : row.contributionSets === undefined ? `${row.weights.completedSets}세트 · ${row.weights.reps}회`
      : `기여 ${row.contributionSets}세트 · 실제 참여 ${row.weights.completedSets}세트 · ${row.weights.reps}회`}</span></div>
      <RecordChart data={[{id:row.key,label:row.name,value:values[index]}]} kind="horizontal" compact unit={metric==='volume'?'kg':'세트'} label={row.name+' '+(metric==='volume'?'총중량':'세트')}/>
      <small>{row.weights.plannedSets === '0' ? '확인된 계획 없음' : `계획 ${row.weights.plannedSets}세트`}{row.weights.setsWithoutVolume !== '0' && ' · 추가 중량 근거가 없는 맨몸 세트는 총중량에서 제외'}</small></div>)}
  </div>
}

type RecordScreen = 'summary' | 'activity' | 'muscles' | 'growth' | 'plan' | 'history'
export function StatisticsView({ data, planning, screen, onScreen, onOpen, onHistory, definitions = [], evidence = [], achievementPlanning, achievementAnchor }: {
  data: Statistics; planning: Overview; screen: string; onScreen: (screen: RecordScreen) => void; onOpen: (id: string) => void; onHistory: () => void; definitions?: StandardExercise[]; evidence?: Session[]; achievementPlanning?:Overview|null; achievementAnchor?:string
}) {
  const preview = useRecordPreview()
  const [cardioDetail,setCardioDetail] = useState(false)
  const [search, setSearch] = useScreenHistory('trend:' + data.userId + ':' + data.dataGeneration, { scope: 'exercise', query: '', selected: '',tag:'ALL' })
  const [metric, setMetric] = useState<'sets' | 'volume'>('sets')
  const muscles = [...new Map([...definitions.flatMap(e => e.muscles ?? []), ...data.muscles].map(m => [m.id, m])).values()]
  const candidates = [
    ...[...new Map([...definitions, ...data.exercises.map(e => ({id:e.standardExerciseId,name:e.name,aliases:[]}))].map(e => [e.id,e])).values()].map(e => ({ id: 'exercise:' + e.id, exerciseId:e.id, kind: 'exercise', name: e.name, description: e.aliases.join(' · ') || '운동', aliases: e.aliases.join(' '), icon: <ExerciseIcon kind={(definitions.find(d=>d.id===e.id)?.muscles?.[0]?.groupCode.toLowerCase() ?? 'other') as 'chest'} /> })),
    ...Object.entries(muscleGroups).map(([id,name]) => ({ id: 'group:' + id, kind: 'group', name, description: '부위 분류', aliases: '', icon:<ExerciseIcon kind={id.toLowerCase() as 'chest'} /> })),
    ...muscles.map(m => ({ id: 'muscle:' + m.id, kind: 'muscle', name: m.name, description: muscleGroups[m.groupCode] + ' · 세부 근육', aliases: '', icon:<ExerciseIcon kind={m.groupCode.toLowerCase() as 'chest'} /> }))
  ]
  const tag=search.tag??'ALL'
  const matchingExercises=new Set(browseExercises(definitions,'',tag as CatalogGroup|'ALL').map(e=>e.id))
  const options = candidates.filter(c => (search.scope === 'all' || c.kind === search.scope) && (tag==='ALL'||search.scope==='exercise'&&matchingExercises.has(c.id.slice(9))||search.scope==='muscle'&&muscles.some(m=>'muscle:'+m.id===c.id&&m.groupCode===tag)) && (c.name + ' ' + c.aliases).toLocaleLowerCase().includes(search.query.trim().toLocaleLowerCase()))
  const selected = candidates.find(c => c.id === search.selected)
  const plannedMs = screen === 'activity' ? plannedCardioMs(planning) : null
  const format = displayDecimal
  const range = {fromDate:data.fromDate,toDateExclusive:data.toDateExclusive}
  const daily = preview ? preview.trend(range,search.selected,metric).map(String) : selected ? [] : data.days.map(d=>metric==='sets'?d.weights.completedSets:d.weights.volumeLoadKg)
  const monthly = data.days.length>7
  const values = monthly ? Array.from({length:Math.ceil(daily.length/7)},(_,i)=>daily.slice(i*7,i*7+7).some(v=>v===null)?null:sumDecimals(daily.slice(i*7,i*7+7) as string[])) : daily
  const labels = monthly ? values.map((_,i)=>(i*7+1)+'–'+Math.min((i+1)*7,daily.length)+'일') : ['월','화','수','목','금','토','일']
  if (screen === 'summary') return <>
    <div className="section-heading"><h1>운동 기록 분석</h1></div><p className="muted small record-week-label">이번 주 · {data.fromDate} ~ {addDays(data.toDateExclusive,-1)}</p>
    <Card><h2>이번 주 요약</h2><div className="statistics-summary">
      <div><small>계획 대비 운동일</small><strong>{format(planning.effectiveWorkoutDays)} / {data.plannedWorkoutDays??'—'}일</strong></div>
      <div><small>완료 웨이트 세트</small><strong>{format(data.summary.completedSets)}세트</strong></div>
      <div><small>루틴 달성률</small><strong>{format(data.routineAchievementPercent,0)}{data.routineAchievementPercent!==null?'%':' · 확인 불가'}</strong></div>
      <div><small>유산소 운동 시간</small><strong>{durationMinutesLabel(data.cardioActiveMs)}</strong></div>
    </div><p className="record-note muted small">계획을 확인할 수 없는 경우 운동일/달성률은 ‘— · 확인 불가’로 표시합니다. 미동기화 원본은 포함하지 않습니다.</p></Card>
    <Card><h2>운동 분석</h2><div className="record-menu" aria-label="운동 분석 메뉴">
      {([['activity','운동 현황'],['growth','성장 추적'],['plan','주간 근육 계획'],['muscles','주간 근육 통계']] as const).map(([id,label])=><button type="button" className="outline" key={id} onClick={()=>onScreen(id)}>{label} ›</button>)}
    </div></Card>
  </>
  if (screen === 'muscles') return <WeeklyMuscleStatistics data={data} />
  const achievementRange=periodFor(new Date((achievementAnchor??data.fromDate)+'T12:00:00'),'week',0)
  const weeklyPlanning=achievementPlanning??planning
  const weekDays=Array.from({length:7},(_,i)=>{const date=addDays(achievementRange.fromDate,i);return weeklyPlanning.plannedDays.find(d=>d.date===date)??{date,status:'UNKNOWN' as const,scheduleVersion:null,plan:null,plannedExercises:null,completedExercises:null,effectiveDay:null,selectedSessionId:null,reviewStatus:null,reviewRevision:null}})
  const weekStatistics=weeklyPlanning.statistics

  return <>
    <Card><h2>운동량 요약 · 전체</h2><div className="statistics-summary"><div><small>완료 세트</small><strong>{format(data.summary.completedSets)}세트</strong></div><div><small>총중량 · 중량×반복</small><strong>{format(data.summary.volumeLoadKg)}kg</strong></div></div><p className="muted small">선택 기간 전체 · 아래 검색 선택과 독립{preview?' · 합성 데이터':''}</p></Card>
    <Card><div className="section-heading"><h2>운동량 추이</h2><span className="muted small">완료 기록 기준</span></div>
      <SearchList scopes={[{id:'all',name:'전체'},{id:'exercise',name:'운동별'},{id:'group',name:'분류별'},{id:'muscle',name:'근육별'}]} scope={search.scope}
        onScope={scope=>setSearch({...search,scope,query:'',selected:'',tag:'ALL'},true)} query={search.query} onQuery={query=>setSearch({...search,query},true)}
        tags={search.scope==='exercise'?{label:'운동 부위',options:[{id:'ALL',name:'전체'},...Object.entries(catalogGroups).map(([id,g])=>({id,name:g.label}))],selected:tag,onSelect:tag=>setSearch({...search,tag,selected:'',query:''},true)}:search.scope==='muscle'?{label:'근육 분류',options:[{id:'ALL',name:'전체'},...[...new Set(muscles.map(m=>m.groupCode))].map(id=>({id,name:muscleGroups[id]??id}))],selected:tag,onSelect:tag=>setSearch({...search,tag,selected:'',query:''},true)}:undefined}
        options={options} onSelect={id=>setSearch({...search,selected:id,query:''},true)} selected={selected?.name}
        onClear={()=>setSearch({...search,tag:'ALL',query:'',selected:''},true)} label="운동·분류·근육 검색" />{preview&&<p className="muted small">준비된 합성 마스터 검색 · 후보 검색과 선택 후 통계 조회는 별개입니다.</p>}
      <div className="record-tabs"><Button aria-pressed={metric==='sets'} onClick={()=>setMetric('sets')}>세트</Button><Button aria-pressed={metric==='volume'} onClick={()=>setMetric('volume')}>총중량</Button></div>
      <div className="record-pair"><span>{selected?.name??'전체 운동'} · 선택한 기간</span><b>{format(values.some(v=>v===null)?null:sumDecimals(values as string[]))}{metric==='sets'?'세트':'kg'}</b></div>
      {!preview&&selected?<p role="status" className="muted small">선택 항목의 날짜별 집계 API 연결이 필요합니다. 전체 추이는 선택 해제 후 확인할 수 있습니다.</p>:<RecordChart data={values.map((v,i)=>({id:String(i),label:labels[i],value:v}))} unit={metric==='sets'?'세트':'kg'} label={(selected?.name??'전체 운동')+' '+(metric==='sets'?'완료 세트':'총중량')+' 추이'}/>}
      <p className="muted small">{metric==='sets'?'세부 근육만 기여 세트 · 분류/전체는 원본 세트':'실제 중량 × 실제 반복 합계 · 기여 계수 미적용'}</p>
    </Card>
    <Card><h2>예정일 · 운동 달성</h2><div className="record-days" data-period="week"><div className="record-weekday-head" aria-hidden="true">{weekdays.map(day=><span key={day}>{day}</span>)}</div>{weekDays.map((day,index)=>{
      const session=(preview?.evidence??evidence).find(s=>s.id===day.selectedSessionId)
      const result=dayStatus(day,day.date,preview?.today??localToday(),session?partialAchievement(session):'unknown')
      return <div className="record-day" style={index===0?{gridColumnStart:(dayOfWeek(day.date)+6)%7+1}:undefined} key={day.date} title={day.date+' '+result.label}><time>{Number(day.date.slice(8))}</time><strong aria-label={day.date+' '+result.label} data-state={result.kind}>{result.kind==='unknown'||result.kind==='planned'?'·':result.mark}</strong></div>
    })}</div><p className="muted small">✓ 전체 완료 · △ 부분 달성 · × 기준 미달 · – 휴식 · · 미래/검사 대기 · ? 확인 불가</p>
      {achievementPlanning===null||weekStatistics.plannedWorkoutDays===null?<p className="muted small">주간 계획 운동일과 루틴 달성률은 아직 확인할 수 없습니다.</p>:<p className="muted small">계획 대비 운동일 {weeklyPlanning.effectiveWorkoutDays===null?'확인 중':format(weeklyPlanning.effectiveWorkoutDays)} / {weekStatistics.plannedWorkoutDays}일 · {weekStatistics.routineAchievementPercent===null?'유산소 목표 달성 확인 필요':'공식 루틴 달성률 '+format(weekStatistics.routineAchievementPercent,0)+'%'}</p>}
      <p className="muted small">△는 날짜 표시용 분류입니다. 공식 루틴 달성률·유효 운동일·G4 산식은 변경하지 않습니다.</p>
    </Card>
    <Card><div className="section-heading"><h2>유산소 현황</h2><Button variant="quiet" onClick={()=>setCardioDetail(!cardioDetail)}>{cardioDetail?'상세 닫기':'상세 보기 ›'}</Button></div>
      <div className="record-pair"><span>누적 실제 시간</span><b>{cardioTime(data.cardioActiveMs)}</b></div>
      {planning.cardioByKind.map(c=><p className="muted small" key={c.kind}>{cardioKinds[c.kind]??c.kind} {c.distanceKm!==null?format(c.distanceKm)+'km':'거리 미입력'} · {[c.calculatedDistanceKm!==null?'계산 거리 '+format(c.calculatedDistanceKm)+'km (실제 속도×시간)':null,c.manualDistanceKm!==null?'직접 입력 '+format(c.manualDistanceKm)+'km':null,c.unknownSourceDistanceKm!==null?'출처 미확인 '+format(c.unknownSourceDistanceKm)+'km':null].filter(Boolean).join(' / ')||'거리 미입력'}</p>)}
      {!planning.cardioByKind.length&&<p className="muted small">선택 기간에 유산소 기록이 없습니다.</p>}
      <p className="muted small">실제 완료 기준 · 계획 목표와 구분</p>{!preview&&<><p className="muted small">실제 누적 {cardioTime(data.cardioActiveMs)}{plannedMs===null?' · 계획 시간 확인 불가':plannedMs===0n?' · 계획 없음':' / 계획 '+cardioTime(plannedMs.toString())}</p>{planning.cardioByKind.map(c=><section key={c.kind}><p className="muted small">{cardioKinds[c.kind]??c.kind} · {cardioTime(c.activeMs)}{c.distanceKm!==null&&' · '+c.distanceKm+' km'}</p><small>{c.manualDistanceKm!==null&&'직접 입력 '+c.manualDistanceKm+' km · '}{c.calculatedDistanceKm!==null&&'계산 거리 '+c.calculatedDistanceKm+' km · '}{c.unknownSourceDistanceKm!==null&&'출처 미확인 '+c.unknownSourceDistanceKm+' km · '}{c.recordsWithoutDistance!=='0'&&'거리 미입력 기록 포함'}</small></section>)}<p className="muted small">선택 기간 전체의 누적 시간입니다. 실제 시간에는 계획 외 유산소도 포함됩니다. 미전송 기록은 포함되지 않습니다.</p><Button variant="quiet" onClick={onHistory}>유산소 수행 기록 보기 ›</Button></>}
      {cardioDetail&&<div className="stack"><p className="muted small">{plannedMs===null?'계획 시간 확인 불가':'계획 '+cardioTime(plannedMs.toString())} · 종류별 거리는 합산하지 않습니다.</p>{preview?.sessions.filter(s=>s.workoutDate>=data.fromDate&&s.workoutDate<data.toDateExclusive).flatMap(s=>s.snapshot.state.cardioResults.filter(c=>c.status==='COMPLETED').map(c=><div className="record-pair" key={c.id}><span>{s.workoutDate} · {c.status==='COMPLETED'?cardioTime(String(c.result.activeMs)):''}</span><Button variant="quiet" onClick={()=>onOpen(s.id)}>상세 ›</Button></div>))}<Button variant="quiet" onClick={onHistory}>유산소 수행 기록 보기 ›</Button></div>}
    </Card>
  </>
}

export function StatisticsPanel({ api, scope, refreshKey, onOpen, onInvalid, workoutApi, schedule = null, definitions = [], initialPreset, enabled=true }: { enabled?:boolean;
  api: StatisticsApi; scope: Scope; refreshKey: string; onOpen: (id: string) => void; onInvalid: (error: unknown) => void; workoutApi?: WorkoutApi; schedule?: LiveSchedule | null; definitions?: StandardExercise[]
  recentContent?: ReactNode
  initialPreset?: string
}) {
  const preview = useRecordPreview()
  const [closedPage,setClosedPage]=useState<ClosedPage|null>(null)
  const recordCache={page:closedPage,set:setClosedPage}
  const identity = scope.userId + ':' + scope.dataGeneration
  const [screen, setScreen] = useScreenHistory<RecordScreen>('records:' + identity + (initialPreset ? ':preset:' + initialPreset : ''), initialPreset ? 'plan' : 'summary')
  useEffect(() => { window.scrollTo?.(0,0) }, [screen])
  const [activityPeriod, setActivityPeriod] = useScreenHistory<PeriodSelection>('activity-period:' + identity, { mode:'week', anchor:preview?.today??localToday() })
  const [state, setState] = useState<{ data: Overview | null; issue: boolean }>({ data:null, issue:false })
  const [reload, setReload] = useState(0), invalid = useRef(onInvalid)
  useEffect(() => { invalid.current = onInvalid }, [onInvalid])
  const range = screen === 'activity' ? selectedPeriod(activityPeriod) : periodFor(new Date((preview?.today??localToday())+'T12:00:00'), 'week', 0)
  const { fromDate, toDateExclusive } = range
  useEffect(() => {
    if (!enabled||['growth','plan','history'].includes(screen)) return
    const abort = new AbortController()
    void api.overview(scope, { fromDate, toDateExclusive }, abort.signal).then(data => {
      if (!abort.signal.aborted) setState({ data, issue:false })
    }).catch(error => {
      if (!abort.signal.aborted) { if (error && typeof error === 'object' && 'code' in error && ['OWNER_MISMATCH','DATA_GENERATION_MISMATCH'].includes(String(error.code))) invalid.current(error); setState(previous=>({ data:previous.data, issue:true })) }
    })
    return () => abort.abort()
  }, [api, scope, scope.userId, scope.dataGeneration, fromDate, toDateExclusive, refreshKey, reload, screen, enabled])
  const current = state.data?.statistics.userId===scope.userId&&state.data.statistics.dataGeneration===scope.dataGeneration&&state.data.statistics.fromDate === fromDate && state.data.statistics.toDateExclusive === toDateExclusive ? state.data : null
  const display=current??(screen==='activity'&&state.data?.statistics.userId===scope.userId&&state.data.statistics.dataGeneration===scope.dataGeneration?state.data:null)
  const weekRange=periodFor(new Date(activityPeriod.anchor+'T12:00:00'),'week',0)
  const weekFrom=weekRange.fromDate,weekTo=weekRange.toDateExclusive
  const [weekLoaded,setWeekLoaded]=useState<Overview|null>(null)
  useEffect(()=>{
    if(!enabled||screen!=='activity'||activityPeriod.mode!=='month')return
    const abort=new AbortController()
    void api.overview({userId:scope.userId,dataGeneration:scope.dataGeneration},{fromDate:weekFrom,toDateExclusive:weekTo},abort.signal).then(data=>{if(!abort.signal.aborted)setWeekLoaded(data)}).catch(error=>{if(!abort.signal.aborted&&error&&typeof error==='object'&&'code' in error&&['OWNER_MISMATCH','DATA_GENERATION_MISMATCH'].includes(String(error.code)))invalid.current(error)})
    return()=>abort.abort()
  },[api,scope,scope.userId,scope.dataGeneration,screen,activityPeriod.mode,weekFrom,weekTo,refreshKey,reload,enabled])
  const weekly=current&&activityPeriod.mode==='week'?current:weekLoaded?.statistics.userId===scope.userId&&weekLoaded.statistics.dataGeneration===scope.dataGeneration&&weekLoaded.statistics.fromDate===weekFrom&&weekLoaded.statistics.toDateExclusive===weekTo?weekLoaded:null
  const [evidence,setEvidence]=useState<{key:string;rows:Session[]}|null>(null)
  const evidenceKey=[identity,weekFrom,weekTo].join(':')
  useEffect(()=>{
    if(!workoutApi||preview||screen!=='activity'||!weekly)return
    const abort=new AbortController(),ids=[...new Set(weekly.plannedDays.flatMap(d=>d.selectedSessionId?[d.selectedSessionId]:[]))]
    let at=0;const rows:Session[]=[]
    void Promise.all(Array.from({length:Math.min(4,ids.length)},async()=>{
      while(at<ids.length&&!abort.signal.aborted){
        try{rows.push(await workoutApi.detail(scope,ids[at++],abort.signal))}
        catch(error){if(!abort.signal.aborted&&error&&typeof error==='object'&&'code' in error&&['OWNER_MISMATCH','DATA_GENERATION_MISMATCH'].includes(String(error.code)))invalid.current(error)}
      }
    })).then(()=>{if(!abort.signal.aborted)setEvidence({key:evidenceKey,rows})})
    return()=>abort.abort()
  },[workoutApi,preview,screen,weekly,evidenceKey,scope])
  const back = () => { if (window.history.state?.overloadNavigation?.index > 0) window.history.back(); else setScreen('summary', true) }
  return <section className="stack statistics record-screen" aria-label="운동 기록·분석">
    {screen !== 'summary' && <div className="record-back"><Button variant="quiet" onClick={back}>{initialPreset?'‹ 루틴으로':'‹ 기록으로'}</Button><span className="muted small">기록 · 분석</span></div>}
    {screen === 'activity' && <><h1>운동 현황</h1><PeriodControls days={current?.plannedDays} value={activityPeriod} onChange={value => setActivityPeriod(value, true)} /></>}
    {screen === 'growth' ? <GrowthPanel api={api.growth} scope={scope} refreshKey={refreshKey} onInvalid={onInvalid} onOpen={onOpen} />
      : screen === 'plan' ? workoutApi ? <WeeklyMusclePlan initialPreset={initialPreset} definitions={definitions} api={workoutApi} scope={scope} schedule={schedule} refreshKey={refreshKey} onInvalid={onInvalid} /> : <p role="status">주간 계획 데이터 연결을 기다리고 있습니다.</p>
      : screen === 'history' ? workoutApi ? <RecordFeed enabled={enabled} cache={recordCache} api={workoutApi} scope={scope} refreshKey={refreshKey} onOpen={onOpen} onInvalid={onInvalid} definitions={definitions} /> : <p>운동 이력 연결 필요</p>
      : <>{state.issue&&<Card><p role="alert">통계를 불러오지 못했습니다. 연결을 확인해 주세요.</p><Button onClick={()=>setReload(n=>n+1)}>다시 조회</Button></Card>}
        {!current&&!display&&<p role="status" className="muted small">통계 불러오는 중…</p>}
        {display&&<div className="stack record-statistics-body" aria-busy={!current}>{screen==='activity'&&<p className="muted small record-data-range">표시 데이터 · {display.statistics.fromDate} ~ {addDays(display.statistics.toDateExclusive,-1)}</p>}<StatisticsView achievementPlanning={weekly} achievementAnchor={activityPeriod.anchor} evidence={evidence?.key===evidenceKey?evidence.rows:[]} data={display.statistics} planning={display} screen={screen} onScreen={setScreen} onOpen={onOpen} onHistory={()=>setScreen('history')} definitions={definitions}/></div>}
        {screen === 'summary' && <Card className="recent-records"><div className="section-heading"><h2>최근 운동 기록</h2><Button variant="quiet" onClick={() => setScreen('history')}>전체 보기 ›</Button></div>{workoutApi ? <RecordFeed enabled={enabled} cache={recordCache} api={workoutApi} scope={scope} refreshKey={refreshKey} onOpen={onOpen} onInvalid={onInvalid} timeZone={schedule?.timeZone} recent /> : <p>최근 7일 데이터 연결 필요</p>}</Card>}</>}
    {preview&&screen!=='plan'&&screen!=='muscles'&&<p className="record-note muted small">합성 목록·통계·날짜 판정 시연입니다. 실제 API·DB 조회와 공식 G4 계산은 수행하지 않습니다.</p>}
  </section>
}
