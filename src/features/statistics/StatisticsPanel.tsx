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
import styles from './RecordMain.module.css'
import activityStyles from './Activity.module.css'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { SearchScopePopover } from './SearchScopePopover.tsx'

function RecordMainIcon({ kind }: { kind: 'activity' | 'growth' | 'plan' | 'muscles' | 'clock' | 'weight' | 'footprints' }) {
  const paths = {
    activity: 'M4 20V10h3v10M10.5 20V4h3v16M17 20V7h3v13',
    growth: 'M3 18l6-6 4 3 8-10M15 5h6v6',
    plan: 'M8 3v4m8-4v4M4 10h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2M8 14h1m6 0h1m-8 3h1m6 0h1',
    muscles: 'M12 3v9h9M9 3.5a9 9 0 1 0 11.5 11.5M15 3.5a9 9 0 0 1 5.5 5.5H15z',
    clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    weight: 'M3 9v6m3-8v10m0-5h12m0-5v10m3-8v6',
    footprints: 'M7 2c-2 0-3 2-3 5v3c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2V7c0-3-1-5-3-5ZM5 15h4v3a2 2 0 0 1-4 0ZM17 5c-2 0-3 2-3 5v3c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-3c0-3-1-5-3-5ZM15 18h4v3a2 2 0 0 1-4 0Z',
  }
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>
}

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
    <Card className={styles.weeklySummary}>
      <div className={styles.summaryHeading}><h2>이번 주 요약</h2><span>{data.fromDate.slice(5).replace('-','.')} – {addDays(data.toDateExclusive,-1).slice(5).replace('-','.')}</span></div>
      <div className={styles.achievement}><strong>{format(data.routineAchievementPercent,0)}{data.routineAchievementPercent!==null?'%':''}</strong><span>루틴 달성률{data.routineAchievementPercent===null&&' · 확인 불가'}</span></div>
      <div className={styles.progress} role="progressbar" aria-label="루틴 달성률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.routineAchievementPercent===null?undefined:Number(data.routineAchievementPercent)} aria-valuetext={data.routineAchievementPercent===null?'확인 불가':format(data.routineAchievementPercent,0)+'%'}><span style={{width:(data.routineAchievementPercent??'0')+'%'}} /></div>
      <p className={styles.completion}>계획한 {data.plannedWorkoutDays??'—'}일 중 {format(planning.effectiveWorkoutDays)}일 운동 완료</p>
      <div className={styles.metrics}>
        <div><RecordMainIcon kind="clock" /><strong>미확인</strong><small>총 운동 시간</small></div>
        <div><RecordMainIcon kind="weight" /><strong>{format(data.summary.completedSets)}세트</strong><small>웨이트 세트</small></div>
        <div><RecordMainIcon kind="footprints" /><strong>{durationMinutesLabel(data.cardioActiveMs)}</strong><small>유산소 시간</small></div>
      </div>
    </Card>
    <section className={styles.analysis} aria-label="운동 분석">
      <h2>운동 분석</h2><div className={styles.analysisGrid} aria-label="운동 분석 메뉴">
        {([['activity','운동 현황','운동량과 추이'],['growth','성장 추적','중량과 기록 변화'],['plan','주간 근육 계획','운동 부위별 계획'],['muscles','주간 근육 통계','근육별 운동 분석']] as const).map(([id,label,description])=><button type="button" className={styles.analysisCard} aria-label={label} key={id} onClick={()=>onScreen(id)}><span className={styles.analysisTop}><RecordMainIcon kind={id} /><span aria-hidden="true">↗</span></span><span className={styles.analysisText}><strong>{label}</strong><small>{description}</small></span></button>)}
      </div>
    </section>
  </>
  if (screen === 'muscles') return <WeeklyMuscleStatistics data={data} />
  const achievementRange=periodFor(new Date((achievementAnchor??data.fromDate)+'T12:00:00'),'week',0)
  const sample=preview?.activity
  const sampleAchievement=sample?.period.fromDate===achievementRange.fromDate?sample:undefined
  const sampleCardio=sample?.period.fromDate===range.fromDate&&sample.period.toDateExclusive===range.toDateExclusive?sample.cardio:undefined
  const activeCardioMs=sampleCardio?.activeMs??data.cardioActiveMs
  const cardioTotals=sampleCardio?.totals??planning.cardioByKind
  const weeklyPlanning=achievementPlanning??planning
  const dayPlans=sampleAchievement?.achievement.plannedDays??weeklyPlanning.plannedDays
  const weekDays=Array.from({length:7},(_,i)=>{const date=addDays(achievementRange.fromDate,i);return dayPlans.find(d=>d.date===date)??{date,status:'UNKNOWN' as const,scheduleVersion:null,plan:null,plannedExercises:null,completedExercises:null,effectiveDay:null,selectedSessionId:null,reviewStatus:null,reviewRevision:null}})
  const weekStatistics=weeklyPlanning.statistics
  const plannedDays = sampleAchievement?.achievement.plannedWorkoutDays??(achievementPlanning === null ? null : weekStatistics.plannedWorkoutDays)
  const achievementRate = sampleAchievement?.achievement.routineAchievementPercent??(plannedDays === null ? null : weekStatistics.routineAchievementPercent)
  const completedDays = sampleAchievement?.achievement.effectiveWorkoutDays??weeklyPlanning.effectiveWorkoutDays

  return <>
    <section className={activityStyles.summary} aria-label="운동량 요약">
      <div className={activityStyles.sectionHeading}><h2>운동량 요약</h2><span>선택 기간 전체</span></div>
      <div className={activityStyles.summaryGrid}>
        <Card><span>완료 세트</span><strong>{format(data.summary.completedSets)}<small>세트</small></strong></Card>
        <Card><span>총중량</span><strong>{format(data.summary.volumeLoadKg)}<small>kg</small></strong></Card>
      </div>
    </section>
    <Card className={activityStyles.trend}><div className={activityStyles.sectionHeading}><h2>운동량 추이</h2><span>완료 기록 기준</span></div>
      <div className={`record-tabs ${activityStyles.segment}`}><Button aria-pressed={metric==='sets'} onClick={()=>setMetric('sets')}>세트</Button><Button aria-pressed={metric==='volume'} onClick={()=>setMetric('volume')}>총중량</Button></div>
      <SearchList scopes={[{id:'all',name:'전체'},{id:'exercise',name:'운동별'},{id:'group',name:'분류별'},{id:'muscle',name:'근육별'}]} scope={search.scope}
        renderScope={control=><SearchScopePopover {...control} />}
        onScope={scope=>setSearch({...search,scope,query:'',selected:'',tag:'ALL'},true)} query={search.query} onQuery={query=>setSearch({...search,query},true)}
        tags={search.scope==='exercise'?{label:'운동 부위',options:[{id:'ALL',name:'전체'},...Object.entries(catalogGroups).map(([id,g])=>({id,name:g.label}))],selected:tag,onSelect:tag=>setSearch({...search,tag,selected:'',query:''},true)}:search.scope==='muscle'?{label:'근육 분류',options:[{id:'ALL',name:'전체'},...[...new Set(muscles.map(m=>m.groupCode))].map(id=>({id,name:muscleGroups[id]??id}))],selected:tag,onSelect:tag=>setSearch({...search,tag,selected:'',query:''},true)}:undefined}
        options={options} onSelect={id=>setSearch({...search,selected:id,query:''},true)} selected={selected?.name}
        onClear={()=>setSearch({...search,tag:'ALL',query:'',selected:''},true)} label="운동·분류·근육 검색" />{preview&&<p className="muted small">준비된 합성 마스터 검색 · 후보 검색과 선택 후 통계 조회는 별개입니다.</p>}
      <div className={`record-pair ${activityStyles.chartHeading}`}><span>{selected?.name??'전체 운동'} · 선택한 기간</span><b>{format(values.some(v=>v===null)?null:sumDecimals(values as string[]))}{metric==='sets'?'세트':'kg'}</b></div>
      {!preview&&selected?<p role="status" className="muted small">선택 항목의 날짜별 집계 API 연결이 필요합니다. 전체 추이는 선택 해제 후 확인할 수 있습니다.</p>:<RecordChart data={values.map((v,i)=>({id:String(i),label:labels[i],value:v}))} unit={metric==='sets'?'세트':'kg'} label={(selected?.name??'전체 운동')+' '+(metric==='sets'?'완료 세트':'총중량')+' 추이'}/>}
      <p className="muted small">{metric==='sets'?'세부 근육만 기여 세트 · 분류/전체는 원본 세트':'실제 중량 × 실제 반복 합계 · 기여 계수 미적용'}</p>
    </Card>
    <Card className={activityStyles.achievement}>
      <div className={activityStyles.sectionHeading}><h2>주간 루틴 달성</h2><strong>{achievementRate===null?'—':format(achievementRate,0)+'%'}</strong></div>
      <div className={activityStyles.progress} role="progressbar" aria-label="주간 루틴 달성률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={achievementRate===null?undefined:Number(achievementRate)} aria-valuetext={achievementRate===null?'확인 불가':format(achievementRate,0)+'%'}><span style={{width:(achievementRate??'0')+'%'}} /></div>
      {plannedDays===null?<p className="muted small">주간 계획 운동일과 루틴 달성률은 아직 확인할 수 없습니다.</p>:<div className={activityStyles.achievementSummary}>
        <span>{completedDays===null?`계획 ${plannedDays}일 · 완료일 확인 중`:`계획한 ${plannedDays}일 중 ${format(completedDays)}일 완료`}</span>
        <span>{format(completedDays)} / {plannedDays}일</span>
      </div>}
      {plannedDays!==null&&achievementRate===null&&<p className="muted small">유산소 목표 달성 확인 필요</p>}
      <div className="record-days" data-period="week">{weekDays.map((day,index)=>{
        const session=(sampleAchievement?.evidence??preview?.evidence??evidence).find(s=>s.id===day.selectedSessionId)
        const result=dayStatus(day,day.date,preview?.today??localToday(),session?partialAchievement(session):'unknown')
        const mark=result.kind==='unknown'?(sampleAchievement&&day.reviewStatus!=='PENDING'?'?':'·'):result.kind==='planned'?'·':result.mark
        return <div className="record-day" style={index===0?{gridColumnStart:(dayOfWeek(day.date)+6)%7+1}:undefined} key={day.date} title={day.date+' '+result.label}><span className={activityStyles.weekday}>{weekdays[index]}</span><time>{Number(day.date.slice(8))}</time><strong aria-label={day.date+' '+result.label} data-state={result.kind}>{mark}</strong></div>
      })}</div>
      <p className={`muted small ${activityStyles.legend}`}><span>– 휴식</span><span>· 미수행</span><span>? 미확인</span></p>
    </Card>
    <Card className={activityStyles.cardio}><div className={activityStyles.sectionHeading}><h2>유산소 현황</h2><Button variant="quiet" onClick={()=>setCardioDetail(!cardioDetail)} aria-expanded={cardioDetail}>{cardioDetail?'상세 닫기':'상세 보기 ›'}</Button></div>
      <div className={activityStyles.cardioMetrics}>
        <div><span><RecordMainIcon kind="clock" />누적 유산소 시간</span><strong>{cardioTime(activeCardioMs)}</strong></div>
        <div><span><RecordMainIcon kind="plan" />누적 일수</span><strong>{sampleCardio?sampleCardio.days+'일':'미확인'}</strong></div>
      </div>
      <section className={activityStyles.cardioKinds}><h3>종류별 누적 거리</h3>
        {cardioTotals.map(c=><div className={activityStyles.cardioKind} key={c.kind}><span><ExerciseIcon kind={c.kind==='BIKE'?'cycling':c.kind==='TREADMILL'||c.kind==='OUTDOOR'?'running':'other'} />{cardioKinds[c.kind]??c.kind}</span>
          <strong>{sampleCardio&&<small>{sampleCardio.weekdays.get(c.kind)??'요일 미확인'}</small>}{c.distanceKm!==null?format(c.distanceKm)+' km':'거리 미입력'}</strong></div>)}
        {!cardioTotals.length&&<p className="muted small">선택 기간에 유산소 기록이 없습니다.</p>}
      </section>
      <p className="muted small">{sampleCardio?'UI 검토용 합성 유산소 기록':<>선택 기간 실제 기록 기준 · 계획 외 유산소도 포함{!preview&&'. 미전송 기록은 포함되지 않습니다.'}</>}</p>
      <div className={`stack ${activityStyles.cardioDetails}`} hidden={!cardioDetail}>
        <div className="record-pair"><p className="muted small">{sampleCardio?'시연':'실제'} 누적 {cardioTime(activeCardioMs)}{sampleCardio?' · 계획 없음':plannedMs===null?' · 계획 시간 확인 불가':plannedMs===0n?' · 계획 없음':' / 계획 '+cardioTime(plannedMs.toString())}</p><Button variant="quiet" onClick={onHistory}>운동 이력 ›</Button></div>
        {cardioTotals.map(c=><section key={c.kind}>
          <p className="muted small">{cardioKinds[c.kind]??c.kind} · {cardioTime(c.activeMs)}{c.distanceKm!==null&&' · '+c.distanceKm+' km'}</p>
          <small className="muted">{[
            c.manualDistanceKm!==null?'직접 입력 '+c.manualDistanceKm+' km':null,
            c.calculatedDistanceKm!==null?'계산 거리 '+c.calculatedDistanceKm+' km':null,
            c.unknownSourceDistanceKm!==null?'출처 미확인 '+c.unknownSourceDistanceKm+' km':null,
            c.recordsWithoutDistance!=='0'?'거리 미입력 기록 포함':null,
          ].filter(Boolean).join(' · ')||'거리 미입력'}</small>
        </section>)}
        {cardioDetail&&!sampleCardio&&preview?.sessions.filter(s=>s.workoutDate>=data.fromDate&&s.workoutDate<data.toDateExclusive).flatMap(s=>s.snapshot.state.cardioResults.filter(c=>c.status==='COMPLETED').map(c=><div className="record-pair" key={c.id}><span>{s.workoutDate} · {c.status==='COMPLETED'?cardioTime(String(c.result.activeMs)):''}</span><Button variant="quiet" onClick={()=>onOpen(s.id)}>상세 ›</Button></div>))}
      </div>
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
  const [activityPeriod, setActivityPeriod] = useScreenHistory<PeriodSelection>('activity-period:' + identity + (preview?.activity ? ':sample' : ''), { mode:'week', anchor:preview?.activity?.period.fromDate??preview?.today??localToday() })
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
  return <section className={`stack statistics record-screen ${screen==='summary'?styles.main:''} ${screen==='activity'?activityStyles.page:''}`} aria-label="운동 기록·분석">
    {screen === 'activity' || screen === 'plan' || screen === 'muscles' || screen === 'history' ? <RecordSubpageHeader title={screen==='activity'?'운동 현황':screen==='plan'?'주간 근육 계획':screen==='muscles'?'주간 근육 통계':'전체 운동 이력'} onBack={back} backLabel={initialPreset?'루틴으로':'기록으로'} /> : null}
    {screen === 'activity' && <PeriodControls variant="activity" days={current?.plannedDays} value={activityPeriod} onChange={value => setActivityPeriod(value, true)} />}
    {screen === 'growth' ? <GrowthPanel api={api.growth} scope={scope} refreshKey={refreshKey} onInvalid={onInvalid} onOpen={onOpen} onBack={back} backLabel={initialPreset?'루틴으로':'기록으로'} />
      : screen === 'plan' ? workoutApi ? <WeeklyMusclePlan initialPreset={initialPreset} definitions={definitions} api={workoutApi} scope={scope} schedule={schedule} refreshKey={refreshKey} onInvalid={onInvalid} /> : <p role="status">주간 계획 데이터 연결을 기다리고 있습니다.</p>
      : screen === 'history' ? workoutApi ? <RecordFeed enabled={enabled} cache={recordCache} api={workoutApi} scope={scope} refreshKey={refreshKey} onOpen={onOpen} onInvalid={onInvalid} definitions={definitions} /> : <p>운동 이력 연결 필요</p>
      : <>{state.issue&&<Card><p role="alert">통계를 불러오지 못했습니다. 연결을 확인해 주세요.</p><Button onClick={()=>setReload(n=>n+1)}>다시 조회</Button></Card>}
        {!current&&!display&&<p role="status" className="muted small">통계 불러오는 중…</p>}
        {display&&<div className="stack record-statistics-body" aria-busy={!current}>
          {screen==='activity'&&!current&&<p className="muted small record-data-range">표시 데이터 · {display.statistics.fromDate} ~ {addDays(display.statistics.toDateExclusive,-1)}</p>}
          <StatisticsView achievementPlanning={weekly} achievementAnchor={activityPeriod.anchor} evidence={evidence?.key===evidenceKey?evidence.rows:[]} data={display.statistics} planning={display} screen={screen} onScreen={setScreen} onOpen={onOpen} onHistory={()=>setScreen('history')} definitions={definitions}/>
        </div>}
        {screen === 'summary' && <section className={`recent-records ${styles.recent}`}>{workoutApi ? <RecordFeed enabled={enabled} cache={recordCache} api={workoutApi} scope={scope} refreshKey={refreshKey} onOpen={onOpen} onInvalid={onInvalid} timeZone={schedule?.timeZone} onViewAll={()=>setScreen('history')} recent /> : <><div className={styles.recentHeading}><h2>최근 운동</h2><Button variant="quiet" onClick={() => setScreen('history')}>전체 보기 ›</Button></div><p>최근 7일 데이터 연결 필요</p></>}</section>}</>}
    {preview&&screen!=='plan'&&screen!=='muscles'&&<p className="record-note muted small">합성 목록·통계·날짜 판정 시연입니다. 실제 API·DB 조회와 공식 G4 계산은 수행하지 않습니다.</p>}
  </section>
}
