import { RefreshButton } from '../../components/common-ui/RefreshButton.tsx'
import { readFailure, readWithDeadline } from '../../app/read-deadline.ts'
import { ContentError, EmptyState } from '../../components/common-ui/ContentFeedback.tsx'
import { FeedbackIcon } from '../../components/common-ui/FeedbackIcon.tsx'
import { Toast } from '../../components/common-ui/Toast.tsx'
import { useReadErrorToast } from '../../components/common-ui/useReadErrorToast.ts'
import {browseExercises,catalogGroups} from '../workout-online/catalog-browse.ts'
import type {CatalogGroup} from '../workout-online/catalog-browse.ts'
import { durationLabel, durationMinutesLabel } from '../../components/duration.ts'
import { RecordChart } from './RecordChart.tsx'
import { ActivityTrendChart } from './ActivityTrendChart.tsx'
import { displayDecimal, sumDecimals } from './display-decimal.ts'
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, Scope, ClosedPage } from '../workout-online/types.ts'
import type { Statistics, StatisticsApi, WeightStats, Overview } from './api.ts'
import { periodFor } from './api.ts'
import type { WorkoutApi } from '../workout-online/api.ts'
import type { StandardExercise } from '../workout-online/types.ts'
import type { LiveSchedule } from './weekly-schedule.ts'
import { SearchList } from '../../components/SearchList.tsx'
import { Button, Card } from '../../components/ui.tsx'
import { navigateBack, useScreenHistory } from '../../app/navigation.ts'
import { RecordFeed } from '../history/RecordFeed.tsx'
import { restoreParentScroll } from '../history/useRecordDetailHistory.ts'
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
import { boundaryError, readAccessDenied } from '../home/load.ts'
import { StatisticsWait } from './StatisticsWait.tsx'

const wordmark = new URL('../../assets/OVERLOAD_white_transparent_4x.png', import.meta.url).href

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
    {!rows.length && <EmptyState embedded icon={<FeedbackIcon name="record" size={24} />} title="선택한 기간에 운동 기록이 없어요" />}
    {rows.map((row, index) => <div className="statistics-row" key={row.key}><div><strong>{row.name}</strong><span>{metric === 'volume' && volumeAvailable ? values[index] === null ? '중량 기록 없음' : `${values[index]} kg` : row.contributionSets === undefined ? `${row.weights.completedSets}세트 · ${row.weights.reps}회`
      : `기여 ${row.contributionSets}세트 · 실제 참여 ${row.weights.completedSets}세트 · ${row.weights.reps}회`}</span></div>
      <RecordChart data={[{id:row.key,label:row.name,value:values[index]}]} kind="horizontal" compact unit={metric==='volume'?'kg':'세트'} label={row.name+' '+(metric==='volume'?'총중량':'세트')}/>
      <small>{row.weights.plannedSets === '0' ? '확인된 계획 없음' : `계획 ${row.weights.plannedSets}세트`}{row.weights.setsWithoutVolume !== '0' && ' · 추가 중량 근거가 없는 맨몸 세트는 총중량에서 제외'}</small></div>)}
  </div>
}

type RecordScreen = 'summary' | 'activity' | 'muscles' | 'growth' | 'plan' | 'history'
function RecordSummary({ data, planning, onScreen }: { data: Statistics | null; planning: Overview | null; onScreen: (screen: RecordScreen) => void }) {
  const format = displayDecimal
  return <>
    <Card className={styles.weeklySummary} aria-busy={!data}>
      <div className={styles.summaryHeading}><h2>이번 주 요약</h2><span>{data && data.fromDate.slice(5).replace('-','.') + ' – ' + addDays(data.toDateExclusive,-1).slice(5).replace('-','.')}</span></div>
      <div className={styles.achievement}><strong>{data && format(data.routineAchievementPercent,0)}{data && data.routineAchievementPercent!==null?'%':''}</strong><span>루틴 달성률{data?.routineAchievementPercent===null&&' · 확인 불가'}</span></div>
      <div className={styles.progress} role="progressbar" aria-label="루틴 달성률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data?.routineAchievementPercent == null ? undefined : Number(data.routineAchievementPercent)} aria-valuetext={data ? data.routineAchievementPercent===null?'확인 불가':format(data.routineAchievementPercent,0)+'%' : undefined}><span style={{width:(data?.routineAchievementPercent??'0')+'%'}} /></div>
      <p className={styles.completion}>{data && planning && ('계획한 ' + (data.plannedWorkoutDays??'—') + '일 중 ' + format(planning.effectiveWorkoutDays) + '일 운동 완료')}</p>
      <div className={styles.metrics}>
        <div><RecordMainIcon kind="clock" /><strong>{data && '미확인'}</strong><small>총 운동 시간</small></div>
        <div><RecordMainIcon kind="weight" /><strong>{data && format(data.summary.completedSets) + '세트'}</strong><small>웨이트 세트</small></div>
        <div><RecordMainIcon kind="footprints" /><strong>{data && durationMinutesLabel(data.cardioActiveMs)}</strong><small>유산소 시간</small></div>
      </div>
    </Card>
    <section className={styles.analysis} aria-label="운동 분석">
      <div className={styles.analysisHeading}>
        <h2>운동 분석</h2>
        <img className={styles.wordmark} src={wordmark} alt="OVERLOAD" width={3624} height={428} />
      </div>
      <div className={styles.analysisGrid} aria-label="운동 분석 메뉴">
        {([['activity','운동 현황','운동량과 추이'],['growth','성장 추적','중량과 기록 변화'],['plan','주간 근육 계획','운동 부위별 계획'],['muscles','주간 근육 통계','근육별 운동 분석']] as const).map(([id,label,description])=><button type="button" className={styles.analysisCard} aria-label={label} key={id} onClick={()=>onScreen(id)}><span className={styles.analysisTop}><RecordMainIcon kind={id} /><span aria-hidden="true">↗</span></span><span className={styles.analysisText}><strong>{label}</strong><small>{description}</small></span></button>)}
      </div>
    </section>
  </>
}

export function StatisticsView({ data, planning, screen, onScreen, onOpen, onHistory, definitions = [], evidence = [], achievementPlanning, achievementAnchor, activityState, identity }: {
  data: Statistics | null; planning: Overview | null; identity?: string; screen: string; onScreen: (screen: RecordScreen) => void; onOpen: (id: string) => void; onHistory: () => void; definitions?: StandardExercise[]; evidence?: Session[]; achievementPlanning?:Overview|null; achievementAnchor?:string
  activityState?: 'loading' | 'error'
}) {
  const preview = useRecordPreview()
  const [cardioDetail,setCardioDetail] = useState(false)
  const [search, setSearch] = useScreenHistory('trend:' + (identity ?? (data?.userId + ':' + data?.dataGeneration)), { scope: 'exercise', query: '', selected: '',tag:'ALL' })
  const [metric, setMetric] = useState<'sets' | 'volume'>('sets')
  if (screen === 'summary') return <RecordSummary data={data} planning={planning} onScreen={onScreen} />
  if (screen === 'muscles') return data ? <WeeklyMuscleStatistics data={data} /> : null
  const muscles = [...new Map([...definitions.flatMap(e => e.muscles ?? []), ...(data?.muscles ?? [])].map(m => [m.id, m])).values()]
  const candidates = [
    ...[...new Map([...definitions, ...(data?.exercises ?? []).map(e => ({id:e.standardExerciseId,name:e.name,aliases:[]}))].map(e => [e.id,e])).values()].map(e => ({ id: 'exercise:' + e.id, exerciseId:e.id, kind: 'exercise', name: e.name, description: e.aliases.join(' · ') || '운동', aliases: e.aliases.join(' '), icon: <ExerciseIcon kind={(definitions.find(d=>d.id===e.id)?.muscles?.[0]?.groupCode.toLowerCase() ?? 'other') as 'chest'} /> })),
    ...Object.entries(muscleGroups).map(([id,name]) => ({ id: 'group:' + id, kind: 'group', name, description: '부위 분류', aliases: '', icon:<ExerciseIcon kind={id.toLowerCase() as 'chest'} /> })),
    ...muscles.map(m => ({ id: 'muscle:' + m.id, kind: 'muscle', name: m.name, description: muscleGroups[m.groupCode] + ' · 세부 근육', aliases: '', icon:<ExerciseIcon kind={m.groupCode.toLowerCase() as 'chest'} /> }))
  ]
  const tag=search.tag??'ALL'
  const matchingExercises=new Set(browseExercises(definitions,'',tag as CatalogGroup|'ALL').map(e=>e.id))
  const options = candidates.filter(c => (search.scope === 'all' || c.kind === search.scope) && (tag==='ALL'||search.scope==='exercise'&&matchingExercises.has(c.id.slice(9))||search.scope==='muscle'&&muscles.some(m=>'muscle:'+m.id===c.id&&m.groupCode===tag)) && (c.name + ' ' + c.aliases).toLocaleLowerCase().includes(search.query.trim().toLocaleLowerCase()))
  const selected = candidates.find(c => c.id === search.selected)
  const plannedMs = planning ? plannedCardioMs(planning) : null
  const format = displayDecimal
  const range = data && {fromDate:data.fromDate,toDateExclusive:data.toDateExclusive}
  const daily = preview && range ? preview.trend(range,search.selected,metric).map(String) : selected ? [] : data?.days.map(d=>metric==='sets'?d.weights.completedSets:d.weights.volumeLoadKg) ?? []
  const monthly = (data?.days.length ?? 0)>7
  const values = monthly ? Array.from({length:Math.ceil(daily.length/7)},(_,i)=>daily.slice(i*7,i*7+7).some(v=>v===null)?null:sumDecimals(daily.slice(i*7,i*7+7) as string[])) : daily
  const labels = monthly ? values.map((_,i)=>(i*7+1)+'–'+Math.min((i+1)*7,daily.length)+'일') : ['월','화','수','목','금','토','일']
  const achievementRange=periodFor(new Date((achievementAnchor??data?.fromDate??localToday())+'T12:00:00'),'week',0)
  const sample=preview?.activity
  const sampleAchievement=sample?.period.fromDate===achievementRange.fromDate?sample:undefined
  const sampleCardio=sample && sample.period.fromDate===range?.fromDate&&sample.period.toDateExclusive===range?.toDateExclusive?sample.cardio:undefined
  const activeCardioMs=sampleCardio?.activeMs??data?.cardioActiveMs
  const cardioTotals=sampleCardio?.totals??planning?.cardioByKind??[]
  const periodLoading = activityState === 'loading'
  const weeklyPlanning=achievementPlanning === undefined ? planning : achievementPlanning
  const dayPlans=sampleAchievement?.achievement.plannedDays??weeklyPlanning?.plannedDays??[]
  const weekDays=Array.from({length:7},(_,i)=>{const date=addDays(achievementRange.fromDate,i);return dayPlans.find(d=>d.date===date)??{date,status:'UNKNOWN' as const,scheduleVersion:null,plan:null,plannedExercises:null,completedExercises:null,effectiveDay:null,selectedSessionId:null,reviewStatus:null,reviewRevision:null}})
  const weekStatistics=weeklyPlanning?.statistics
  const plannedDays = sampleAchievement?.achievement.plannedWorkoutDays??weekStatistics?.plannedWorkoutDays??null
  const achievementRate = sampleAchievement?.achievement.routineAchievementPercent??(plannedDays === null ? null : weekStatistics?.routineAchievementPercent??null)
  const completedDays = sampleAchievement?.achievement.effectiveWorkoutDays??weeklyPlanning?.effectiveWorkoutDays??null

  return <>
    <section className={activityStyles.summary} aria-label="운동량 요약" aria-busy={periodLoading}>
      <div className={activityStyles.sectionHeading}><h2>운동량 요약</h2><span>선택 기간 전체</span></div>
      <div className={activityStyles.summaryGrid}>
        <Card><span>완료 세트</span><strong>{data && <>{format(data.summary.completedSets)}<small>세트</small></>}</strong></Card>
        <Card><span>총중량</span><strong>{data && <>{format(data.summary.volumeLoadKg)}<small>kg</small></>}</strong></Card>
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
      <div className={`record-pair ${activityStyles.chartHeading}`}><span>{selected?.name??'전체 운동'} · 선택한 기간</span><b>{data && (!selected || preview) && format(values.some(v=>v===null)?null:sumDecimals(values as string[])) + (metric==='sets'?'세트':'kg')}</b></div>
      {!preview&&selected ? <p role="status" className="muted small">선택 항목의 날짜별 집계 API 연결이 필요합니다. 전체 추이는 선택 해제 후 확인할 수 있습니다.</p>
        : <div className={activityStyles.chartContent} aria-busy={periodLoading}>
          {data && <ActivityTrendChart data={values.map((value, index) => ({ id: `${data.fromDate}:${data.toDateExclusive}:${index}`, label: labels[index], value }))}
            unit={metric === 'sets' ? '세트' : 'kg'} label={(selected?.name ?? '전체 운동') + ' ' + (metric === 'sets' ? '완료 세트' : '총중량') + ' 추이'} />}
        </div>}
      <p className="muted small">{metric==='sets'?'세부 근육만 기여 세트 · 분류/전체는 원본 세트':'실제 중량 × 실제 반복 합계 · 기여 계수 미적용'}</p>
    </Card>
    <Card className={activityStyles.achievement}>
      <div className={activityStyles.sectionHeading}><h2>주간 루틴 달성</h2><strong>{weeklyPlanning && (achievementRate===null?'—':format(achievementRate,0)+'%')}</strong></div>
      <div className={activityStyles.progress} role="progressbar" aria-label="주간 루틴 달성률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={achievementRate===null?undefined:Number(achievementRate)} aria-valuetext={weeklyPlanning ? achievementRate===null?'확인 불가':format(achievementRate,0)+'%' : undefined}><span style={{width:(achievementRate??'0')+'%'}} /></div>
      <div className={activityStyles.achievementSummarySlot}>
        {weeklyPlanning && (plannedDays===null?<p className="muted small">주간 계획 운동일과 루틴 달성률은 아직 확인할 수 없습니다.</p>:<div className={activityStyles.achievementSummary}>
          <span>{completedDays===null?`계획 ${plannedDays}일 · 완료일 확인 중`:`계획한 ${plannedDays}일 중 ${format(completedDays)}일 완료`}</span>
          <span>{format(completedDays)} / {plannedDays}일</span>
        </div>)}
        {plannedDays!==null&&achievementRate===null&&<p className="muted small">유산소 목표 달성 확인 필요</p>}
      </div>
      <div className="record-days" data-period="week">{weekDays.map((day,index)=>{
        const session=(sampleAchievement?.evidence??preview?.evidence??evidence).find(s=>s.id===day.selectedSessionId)
        const result=dayStatus(day,day.date,preview?.today??localToday(),session?partialAchievement(session):'unknown')
        const mark=result.kind==='unknown'?(sampleAchievement&&day.reviewStatus!=='PENDING'?'?':'·'):result.kind==='planned'?'·':result.mark
        return <div className="record-day" style={index===0?{gridColumnStart:(dayOfWeek(day.date)+6)%7+1}:undefined} key={day.date} title={weeklyPlanning ? day.date+' '+result.label : undefined}><span className={activityStyles.weekday}>{weekdays[index]}</span><time>{Number(day.date.slice(8))}</time><strong aria-label={weeklyPlanning ? day.date+' '+result.label : undefined} data-state={weeklyPlanning ? result.kind : undefined}>{weeklyPlanning && mark}</strong></div>
      })}</div>
      <p className={`muted small ${activityStyles.legend}`}><span>– 휴식</span><span>· 미수행</span><span>? 미확인</span></p>
    </Card>
    <Card className={activityStyles.cardio} aria-busy={periodLoading}><div className={activityStyles.sectionHeading}><h2>유산소 현황</h2><Button variant="quiet" compact onClick={()=>setCardioDetail(!cardioDetail)} aria-expanded={cardioDetail}>{cardioDetail?'상세 닫기':'상세 보기 ›'}</Button></div>
      <div className={activityStyles.cardioMetrics}>
        <div><span><RecordMainIcon kind="clock" />누적 유산소 시간</span><strong>{activeCardioMs !== undefined && cardioTime(activeCardioMs)}</strong></div>
        <div><span><RecordMainIcon kind="plan" />누적 일수</span><strong>{data && (sampleCardio ? sampleCardio.days+'일':'미확인')}</strong></div>
      </div>
      <section className={activityStyles.cardioKinds}><h3>종류별 누적 거리</h3>
        {cardioTotals.map(c=><div className={activityStyles.cardioKind} key={c.kind}><span><ExerciseIcon kind={c.kind==='BIKE'?'cycling':c.kind==='TREADMILL'||c.kind==='OUTDOOR'?'running':'other'} />{cardioKinds[c.kind]??c.kind}</span>
          <strong>{sampleCardio&&<small>{sampleCardio.weekdays.get(c.kind)??'요일 미확인'}</small>}{c.distanceKm!==null?format(c.distanceKm)+' km':'거리 미입력'}</strong></div>)}
        {data&&!cardioTotals.length&&<EmptyState embedded icon={<FeedbackIcon name="record" size={24} />} title="선택한 기간에 유산소 기록이 없어요" />}
      </section>
      <p className="muted small">{sampleCardio?'UI 검토용 합성 유산소 기록':<>선택 기간 실제 기록 기준 · 계획 외 유산소도 포함{!preview&&'. 미전송 기록은 포함되지 않습니다.'}</>}</p>
      <div className={`stack ${activityStyles.cardioDetails}`} hidden={!cardioDetail}>
        <div className="record-pair">{activeCardioMs !== undefined && <p className="muted small">{sampleCardio?'시연':'실제'} 누적 {cardioTime(activeCardioMs)}{sampleCardio?' · 계획 없음':plannedMs===null?' · 계획 시간 확인 불가':plannedMs===0n?' · 계획 없음':' / 계획 '+cardioTime(plannedMs.toString())}</p>}<Button variant="quiet" onClick={onHistory}>운동 이력 ›</Button></div>
        {cardioTotals.map(c=><section key={c.kind}>
          <p className="muted small">{cardioKinds[c.kind]??c.kind} · {cardioTime(c.activeMs)}{c.distanceKm!==null&&' · '+c.distanceKm+' km'}</p>
          <small className="muted">{[
            c.manualDistanceKm!==null?'직접 입력 '+c.manualDistanceKm+' km':null,
            c.calculatedDistanceKm!==null?'계산 거리 '+c.calculatedDistanceKm+' km':null,
            c.unknownSourceDistanceKm!==null?'출처 미확인 '+c.unknownSourceDistanceKm+' km':null,
            c.recordsWithoutDistance!=='0'?'거리 미입력 기록 포함':null,
          ].filter(Boolean).join(' · ')||'거리 미입력'}</small>
        </section>)}
        {data&&cardioDetail&&!sampleCardio&&preview?.sessions.filter(s=>s.workoutDate>=data.fromDate&&s.workoutDate<data.toDateExclusive).flatMap(s=>s.snapshot.state.cardioResults.filter(c=>c.status==='COMPLETED').map(c=><div className="record-pair" key={c.id}><span>{s.workoutDate} · {c.status==='COMPLETED'?cardioTime(String(c.result.activeMs)):''}</span><Button variant="quiet" onClick={()=>onOpen(s.id)}>상세 ›</Button></div>))}
      </div>
    </Card>
  </>
}

export function StatisticsPanel({ api, scope, refreshKey, dataRevision, onOpen, onInvalid, workoutApi, schedule = null, scheduleLoading, scheduleIssue, onRetrySchedule, definitions = [], initialPreset, enabled=true }: { enabled?:boolean;
  api: StatisticsApi; scope: Scope; refreshKey: string; onOpen: (id: string) => void; onInvalid: (error: unknown) => void; workoutApi?: WorkoutApi; schedule?: LiveSchedule | null; definitions?: StandardExercise[]
  recentContent?: ReactNode
  initialPreset?: string
  dataRevision?: string
  scheduleLoading?: boolean
  scheduleIssue?: string
  onRetrySchedule?: () => void
}) {
  const preview = useRecordPreview()
  const [closedPage,setClosedPage]=useState<ClosedPage|null>(null)
  const [recordDetails] = useState(() => new Map<string, Session>())
  const recordCache={page:closedPage,set:setClosedPage,details:recordDetails}
  const identity = scope.userId + ':' + scope.dataGeneration
  const [screen, setScreen] = useScreenHistory<RecordScreen>('records:' + identity + (initialPreset ? ':preset:' + initialPreset : ''), initialPreset ? 'plan' : 'summary')
  const panel = useRef<HTMLElement>(null)
  const [entry, setEntry] = useState<{screen: RecordScreen; scroll: number; presented?: boolean} | null>(null)
  const [planReady, setPlanReady] = useState(false)
  const [retainPlan, setRetainPlan] = useState(screen === 'plan')
  if (screen === 'plan' && !retainPlan) setRetainPlan(true)
  const [activityPeriod, setActivityPeriod] = useScreenHistory<PeriodSelection>('activity-period:' + identity + (preview?.activity ? ':sample' : ''), { mode:'week', anchor:preview?.activity?.period.fromDate??preview?.today??localToday() })
  type Mode = PeriodSelection['mode']
  const inActivity = screen === 'activity'
  const selectionKey = enabled && inActivity ? JSON.stringify([identity, activityPeriod]) : null
  const [queuedPeriod, setQueuedPeriod] = useState<{ origin: string; value: PeriodSelection } | null>(null)
  const pending = queuedPeriod && queuedPeriod.origin === selectionKey ? queuedPeriod.value : null
  if (queuedPeriod && !pending) setQueuedPeriod(null)

  const [overviews, setOverviews] = useState<{ key: string; request: string; data: Overview }[]>([])
  const [failures, setFailures] = useState<Partial<Record<Mode, { request: string; message: string }>>>({})
  const [retryCount, setRetryCount] = useState({ week: 0, month: 0 })
  const invalid = useRef(onInvalid)
  useEffect(() => { invalid.current = onInvalid }, [onInvalid])
  const { userId, dataGeneration } = scope
  const weekAnchor = inActivity ? activityPeriod.anchor : preview?.today ?? localToday()
  const { fromDate: weekFrom, toDateExclusive: weekTo } = selectedPeriod({ mode: 'week', anchor: pending?.mode === 'week' ? pending.anchor : weekAnchor })
  const { fromDate: monthFrom, toDateExclusive: monthTo } = selectedPeriod({ mode: 'month', anchor: pending?.mode === 'month' ? pending.anchor : activityPeriod.anchor })
  const cachedPeriod = (value: PeriodSelection) => {
    const {fromDate, toDateExclusive} = selectedPeriod(value)
    return overviews.find(item => item.key === [identity, fromDate, toDateExclusive].join(':'))?.data ?? null
  }
  const weekKey = [identity, weekFrom, weekTo].join(':')
  const monthKey = [identity, monthFrom, monthTo].join(':')
  const appliedVersion = schedule?.appliedVersion
  const [knownSchedule, setKnownSchedule] = useState({ appliedVersion, changes: 0 })
  const scheduleReceived = appliedVersion !== undefined && appliedVersion !== knownSchedule.appliedVersion
  const scheduleChanges = knownSchedule.changes + Number(scheduleReceived && knownSchedule.appliedVersion !== undefined)
  // The initial schedule GET supplies metadata. Only later applied-version changes invalidate Overview.
  if (scheduleReceived) setKnownSchedule({ appliedVersion, changes: scheduleChanges })
  const overviewRevision = dataRevision === undefined ? refreshKey : JSON.stringify([dataRevision, scheduleChanges])
  const weekRequest = JSON.stringify([weekKey, overviewRevision, retryCount.week])
  const monthRequest = JSON.stringify([monthKey, overviewRevision, retryCount.month])
  // The monthly view still uses the selected anchor's week for routine achievement.
  const readWeek = enabled && !['growth', 'plan', 'history'].includes(screen)
  const readMonth = enabled && inActivity && (activityPeriod.mode === 'month' || pending?.mode === 'month')
  const weekly = cachedPeriod({ mode: 'week', anchor: weekAnchor })
  const monthly = cachedPeriod({ mode: 'month', anchor: activityPeriod.anchor })
  const current = inActivity && activityPeriod.mode === 'month' ? monthly : weekly
  const summaryOverview = cachedPeriod({ mode: 'week', anchor: preview?.today ?? localToday() })
  const failedMode = inActivity ? pending?.mode ?? activityPeriod.mode : 'week'
  const failedRequest = failedMode === 'week' ? weekRequest : monthRequest
  const failure = failures[failedMode]
  const issue = failure?.request === failedRequest
  const refreshing = !!failure && !issue && failure.request.startsWith(failedRequest.slice(0, failedRequest.lastIndexOf(',') + 1))
  const activityState = inActivity && !current ? issue ? 'error' : 'loading' : undefined
  const waitingForScreen = !preview && entry?.screen === screen && !entry.presented && (
    (screen === 'activity' || screen === 'muscles') && !current && !issue ||
    screen === 'plan' && !!workoutApi && (schedule ? !planReady : scheduleLoading)
  )
  if (entry?.screen === screen && !entry.presented && !waitingForScreen) setEntry({ ...entry, presented: true })
  const shown = waitingForScreen ? 'summary' : screen
  const previousScreen = useRef<RecordScreen | null>(null)
  useLayoutEffect(() => {
    const previous = previousScreen.current
    previousScreen.current = shown
    if (previous === shown || !panel.current?.getClientRects().length) return
    if (shown === 'summary' && entry?.screen === previous) return restoreParentScroll(entry.scroll)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [shown, entry])
  const flights = useRef<Partial<Record<Mode, AbortController>>>({})

  const settleOverview = useEffectEvent((mode: Mode, key: string, request: string, result: { data: Overview } | { error: unknown }) => {
    if (mode === 'week' ? !readWeek || request !== weekRequest : !readMonth || request !== monthRequest) return
    if ('error' in result) {
      const { error } = result
      if (boundaryError(error) || readAccessDenied(error)) {
        flights.current.week?.abort()
        flights.current.month?.abort()
        setOverviews([])
        const message = readFailure(error, '운동 통계를 불러오지 못했어요.')
        setFailures({ week: { request: weekRequest, message }, month: { request: monthRequest, message } })
      } else {
        setFailures(previous => ({ ...previous, [mode]: { request, message: readFailure(error, '운동 통계를 불러오지 못했어요.') } }))
      }
      if (boundaryError(error)) onInvalid(error)
      return
    }
    setOverviews(previous => [
      { key, request, data: result.data },
      ...previous.filter(item => item.key !== key && item.key.startsWith(identity + ':')),
    ].slice(0, 4))
    setFailures(previous => previous[mode] ? { ...previous, [mode]: undefined } : previous)
    if (pending?.mode === mode) {
      setQueuedPeriod(null)
      setActivityPeriod(pending, true)
    }
  })
  const requestOverview = useEffectEvent((mode: Mode, fromDate: string, toDateExclusive: string, key: string, request: string) => {
    if (inActivity && overviews.some(item => item.key === key && item.request === request)) return
    const flight = new AbortController()
    flights.current[mode] = flight
    void readWithDeadline(flight.signal, signal => api.overview({ userId, dataGeneration }, { fromDate, toDateExclusive }, signal)).then(data => {
      if (!flight.signal.aborted) settleOverview(mode, key, request, { data })
    }).catch(error => {
      if (!flight.signal.aborted) settleOverview(mode, key, request, { error })
    })
    return () => flight.abort()
  })
  useEffect(() => {
    if (readWeek) return requestOverview('week', weekFrom, weekTo, weekKey, weekRequest)
  }, [api, readWeek, weekFrom, weekTo, weekKey, weekRequest])
  useEffect(() => {
    if (readMonth) return requestOverview('month', monthFrom, monthTo, monthKey, monthRequest)
  }, [api, readMonth, monthFrom, monthTo, monthKey, monthRequest])

  const retry = (mode: Mode) => setRetryCount(previous => ({ ...previous, [mode]: previous[mode] + 1 }))
  function changePeriod(value: PeriodSelection) {
    if (!selectionKey) return
    const samePeriod = value.mode === activityPeriod.mode && value.anchor === activityPeriod.anchor
    if (!samePeriod && !cachedPeriod(value)) {
      setQueuedPeriod({ origin: selectionKey, value })
      const {fromDate, toDateExclusive} = selectedPeriod(value)
      const failed = JSON.stringify([[identity, fromDate, toDateExclusive].join(':'), overviewRevision, retryCount[value.mode]])
      if (failures[value.mode]?.request === failed) retry(value.mode)
      return
    }
    setQueuedPeriod(null)
    setActivityPeriod(value, true)
  }
  const [evidence,setEvidence]=useState<{key:string;weekly:Overview;rows:Session[]}|null>(null)
  const evidenceKey=[identity, weekly?.statistics.fromDate, weekly?.statistics.toDateExclusive].join(':')
  const evidenceIds=JSON.stringify([...new Set(weekly?.plannedDays.flatMap(day => day.effectiveDay === '0' && day.selectedSessionId ? [day.selectedSessionId] : []))])
  useEffect(()=>{
    if(!enabled||!workoutApi||preview||screen!=='activity'||!weekly||evidenceIds==='[]')return
    const abort=new AbortController(),ids:string[]=JSON.parse(evidenceIds)
    let at=0;const rows:Session[]=[]
    void Promise.all(Array.from({length:Math.min(4,ids.length)},async()=>{
      while(at<ids.length&&!abort.signal.aborted){
        try{rows.push(await workoutApi.detail(scope,ids[at++],abort.signal))}
        catch(error){if(!abort.signal.aborted&&error&&typeof error==='object'&&'code' in error&&['OWNER_MISMATCH','DATA_GENERATION_MISMATCH'].includes(String(error.code)))invalid.current(error)}
      }
    })).then(()=>{if(!abort.signal.aborted)setEvidence({key:evidenceKey,weekly,rows})})
    return()=>abort.abort()
  },[workoutApi,preview,screen,weekly,evidenceKey,evidenceIds,scope,enabled])
  const currentEvidence=weekly && evidence?.key === evidenceKey ? evidence : null
  const achievement=preview || !workoutApi || evidenceIds==='[]' ? weekly : currentEvidence?.weekly ?? null
  const back = () => navigateBack(() => setScreen('summary', true))
  function openScreen(next: RecordScreen) {
    if (waitingForScreen && next === screen) return
    if (next !== 'history') setEntry({ screen: next, scroll: window.scrollY ?? 0 })
    if (next === 'plan') setPlanReady(false)
    setScreen(next, waitingForScreen)
  }
  function openRecent(id: string) {
    if (waitingForScreen) setScreen('summary', true)
    onOpen(id)
  }
  const displayed = shown === 'summary' ? summaryOverview : current
  const readIssue = '운동 통계를 불러오지 못했어요.'
  const retryOverview = <RefreshButton loading={refreshing} failure={!displayed && issue ? failure.message : null} onRefresh={() => retry(failedMode)} />
  const feedback = useReadErrorToast(enabled && displayed && issue && (shown === 'summary' || shown === 'activity' || shown === 'muscles') ? failure.message : null)
  return <section ref={panel} className={`stack statistics record-screen ${shown==='summary'?styles.main:''} ${shown==='activity'?activityStyles.page:''}`}
    aria-label="운동 기록·분석" data-tab-overview={shown === 'summary' || undefined}>
    {shown === 'activity' || shown === 'plan' || shown === 'muscles' || shown === 'history' ? <RecordSubpageHeader title={shown==='activity'?'운동 현황':shown==='plan'?'주간 근육 계획':shown==='muscles'?'주간 근육 통계':'전체 운동 이력'} onBack={back} backLabel={initialPreset?'루틴으로':'기록으로'} /> : null}
    {shown === 'activity' && <PeriodControls variant="activity" days={current?.plannedDays} value={activityPeriod} pendingMode={issue ? undefined : pending?.mode} pendingValue={issue ? undefined : pending ?? undefined} onChange={changePeriod} />}
    {shown === 'growth' ? <GrowthPanel api={api.growth} scope={scope} refreshKey={refreshKey} onInvalid={onInvalid} onOpen={onOpen} onBack={back} backLabel={initialPreset?'루틴으로':'기록으로'} />
      : shown === 'plan' ? !workoutApi ? <p role="status">운동 계획 데이터 연결을 기다리고 있습니다.</p>
        : !schedule && scheduleIssue ? <ContentError title={scheduleIssue} action={onRetrySchedule && <RefreshButton loading={scheduleLoading} failure={scheduleIssue} onRefresh={onRetrySchedule} />} /> : null
      : shown === 'history' ? workoutApi ? <RecordFeed enabled={enabled} cache={recordCache} api={workoutApi} scope={scope} refreshKey={refreshKey} onOpen={onOpen} onInvalid={onInvalid} definitions={definitions} /> : <p>운동 이력 연결 필요</p>
      : <>{(displayed || shown === 'summary' || shown === 'activity') ? <div className="stack record-statistics-body" data-activity-state={shown === 'activity' ? activityState : undefined}>
          {shown === 'activity' && activityState === 'loading' && <span role="status" className="sr-only">선택 기간의 운동 통계를 불러오는 중입니다.</span>}
          <StatisticsView achievementPlanning={achievement} achievementAnchor={activityPeriod.anchor} evidence={currentEvidence?.rows} data={displayed?.statistics ?? null} planning={displayed} identity={identity} screen={shown} onScreen={openScreen} onOpen={onOpen} onHistory={()=>setScreen('history')} definitions={definitions} activityState={activityState}/>
        </div> : !issue && !refreshing && <StatisticsWait pending skeleton label="운동 통계를 불러오는 중입니다." />}
        {(issue || refreshing) && (displayed ? retryOverview : <ContentError title={readIssue} action={retryOverview} />)}
        {shown === 'summary' && <section className={`recent-records ${styles.recent}`}>{workoutApi ? <RecordFeed enabled={enabled} cache={recordCache} api={workoutApi} scope={scope} refreshKey={refreshKey} onOpen={openRecent} onInvalid={onInvalid} timeZone={schedule?.timeZone} onViewAll={()=>openScreen('history')} recent /> : <><div className={styles.recentHeading}><h2>최근 운동</h2><Button compact variant="quiet" onClick={() => openScreen('history')}>전체 보기 ›</Button></div><p>최근 7일 데이터 연결 필요</p></>}</section>}</>}
    {retainPlan && workoutApi && <div hidden={shown !== 'plan'} className="statistics-plan">
      <WeeklyMusclePlan initialPreset={initialPreset} definitions={definitions} api={workoutApi} scope={scope} schedule={schedule} refreshKey={refreshKey} onInvalid={onInvalid} active={enabled && screen === 'plan'} onReadSettled={setPlanReady} />
    </div>}
    <StatisticsWait pending={!!waitingForScreen || shown === 'plan' && !schedule && !!scheduleLoading} label="운동 통계를 불러오는 중입니다." />
    <Toast toast={feedback.toast} onDismiss={feedback.dismiss} bottomClearance="var(--tabs-height, 56px)" />
    {preview&&shown!=='plan'&&shown!=='muscles'&&<p className="record-note muted small">합성 목록·통계·날짜 판정 시연입니다. 실제 API·DB 조회와 공식 G4 계산은 수행하지 않습니다.</p>}
  </section>
}
