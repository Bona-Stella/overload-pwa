import { partialAchievement } from '../statistics/display-achievement.ts'
import type { ReactNode } from 'react'
import { useContext, useEffect, useRef, useState } from 'react'
import { Button, Card, Metadata } from '../../components/ui.tsx'
import { Toast } from '../../components/common-ui/Toast.tsx'
import { ContentError, EmptyState } from '../../components/common-ui/ContentFeedback.tsx'
import { RefreshButton } from '../../components/common-ui/RefreshButton.tsx'
import { readWithDeadline } from '../../app/read-deadline.ts'
import { FeedbackIcon } from '../../components/common-ui/FeedbackIcon.tsx'
import { useReadErrorToast } from '../../components/common-ui/useReadErrorToast.ts'
import { ConnectedDropdown } from '../../components/common-ui/ConnectedDropdown.tsx'
import dropdown from '../../components/common-ui/ConnectedDropdown.module.css'
import type { AppTab } from '../../app/types.ts'
import type { WorkoutApi } from '../workout-online/api.ts'
import type { OnlineState } from '../workout-online/controller.ts'
import type { Routine, RoutineList, Scope, Session } from '../workout-online/types.ts'
import type { StatisticsApi } from '../statistics/api.ts'
import type { TrainingSchedule } from '../workout-online/useTrainingSchedule.ts'
import { HomeTrainingHeader } from './HomeTrainingHeader.tsx'
import { activeCardio, activeWeights, cardioPlanLabel, dateInZone, dayOfWeek, dayStatus, representativeExercises, weekdays, weekDates } from './model.ts'
import { boundaryError, loadHome, readAccessDenied } from './load.ts'
import type { HomeData, HomePlan, HomeWeek } from './load.ts'
import { loadRecent } from './recent.ts'
import { HomeReviewContext } from '../../app/review-context.ts'
import { useStartupReveal } from '../../app/useStartupReveal.ts'
import { supportsWorkoutEditing } from '../workout-local/lock.ts'
import { RecentWorkout } from './RecentWorkout.tsx'
import { DeloadMoon } from '../../components/DeloadMoon.tsx'
import { scheduleRoutineLabel } from './tags.ts'
import { presetNumber } from '../workout-online/preset-schedule.ts'
import type { SchedulePreset } from '../workout-online/preset-schedule.ts'
import type { ActiveWorkoutProgress, PlanWeight, PlanCardio } from './active-workout.ts'
import { formatDuration } from '../workout/model.ts'
import filterStyles from '../../components/common-ui/FilterTags.module.css'
import optionText from '../../components/common-ui/RoutineOptionText.module.css'
import styles from './Home.module.css'

const wordmark = new URL('../../assets/OVERLOAD_white_transparent_4x.png', import.meta.url).href

function HomeHeader({ children }: { children?: ReactNode }) {
  return <header className={styles.homeHeader}><img className={styles.brand} src={wordmark} alt="OVERLOAD" width={3624} height={428} />{children ?? <span className={styles.headerIcon}><DeloadMoon /></span>}</header>
}

function HomePlaceholder({ area }: { area: 'today' | 'week' | 'recent' | 'chooser' }) {
  return <div className={styles.placeholder} data-loading-skeleton={`home-${area}`} aria-hidden="true"><span />{area === 'today' && <><span /><span /></>}</div>
}

export function HomeStartup({ label = '홈 정보를 확인하는 중입니다.' }: { label?: string }) {
  return <section className={styles.home} aria-label="홈" aria-busy="true">
    <span role="status" className="sr-only">{label}</span>
    <HomeHeader />
    <Card hero className={styles.today} aria-label="오늘의 루틴"><HomePlaceholder area="today" /></Card>
    <HomePlaceholder area="chooser" />
    <Card className={styles.week} aria-label="이번 주 일정"><HomePlaceholder area="week" /></Card>
    <section className={styles.recent} aria-label="최근 운동"><HomePlaceholder area="recent" /></section>
  </section>
}

export function RoutinePlan({ routine }: { routine: Routine }) {
  return <PlanList weights={activeWeights(routine).map(weight => ({ ...weight, weightKg: weight.approvedWeightKg }))} cardio={activeCardio(routine)} />
}
function PlanList({ weights, cardio }: { weights: PlanWeight[]; cardio: PlanCardio[] }) {
  return <>
    <div className={styles.planSection}><h3>WEIGHT <span>총 {weights.length}종목</span></h3><ol>{weights.map(p => <li key={p.id}><span title={p.exerciseName}>{p.exerciseName}</span><strong>{p.weightKg == null ? '중량 미확인' : p.weightKg + 'kg'} · {p.setCount}세트 · {p.minReps === p.maxReps ? p.minReps : `${p.minReps}~${p.maxReps}`}회</strong></li>)}</ol>{!weights.length && <p className={styles.emptyPlan}>계획된 웨이트 없음</p>}</div>
    <div className={styles.planSection}><h3>CARDIO <span>총 {cardio.length}종목</span></h3><ol>{cardio.map(p => <li key={p.id}><span title={p.plan.name}>{p.plan.name}</span><strong>{cardioPlanLabel(p.plan)}</strong></li>)}</ol>{!cardio.length && <p className={styles.emptyPlan}>유산소 계획 없음</p>}</div>
  </>
}
function ActiveRoutine({ routineName, progress, busy, loading, onResume }: {
  routineName: string; progress: ActiveWorkoutProgress; busy: boolean; loading?: boolean; onResume: () => void
}) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const interval = window.setInterval(tick, 1000)
    window.addEventListener('pageshow', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pageshow', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  const plannedSets = progress.weights.reduce((sum, weight) => sum + weight.setCount, 0)
  return <Card hero className={styles.today} aria-label="진행 중인 운동">
    <div className={styles.kicker}><span>진행 중인 운동</span><span className={styles.activeStatus}>{progress.status(now)}</span></div>
    <h2>{routineName}</h2>
    <div className={styles.activeSummary}><span>전체 경과시간 <strong>{formatDuration(Math.max(0, now - progress.startedAt))}</strong></span>
      <span>웨이트 <strong>{progress.completedSets}/{plannedSets}세트</strong></span></div>
    <PlanList weights={progress.weights} cardio={progress.cardio} />
    <Button className={styles.resume} variant="primary" disabled={busy && !loading} loading={loading} onClick={onResume}>운동 이어가기</Button>
  </Card>
}
type Props = {
  readIssue?: string | null
  enabled?: boolean
  startupHome?: boolean
  scope: Scope; routines: RoutineList['routines']; api: WorkoutApi; training: TrainingSchedule; statistics: StatisticsApi; visit: number;
  refreshKey: string; active: Session | null; attempt: boolean; busy: boolean; localReady: boolean; issue: string | null;
  progress?: ActiveWorkoutProgress
  action?: 'start' | 'retry' | 'resume' | null
  startUnconfirmed?: boolean
  startIssueTone?: 'warning'
  onStart: (routine: Routine) => Promise<void>; onResume: () => void; onRetry: () => void; onNavigate: (tab: AppTab) => void;
  onHistory?:()=>void; onOpen: (id: string) => void; onInvalid: (error: unknown) => void
  onRefreshRoutines?: () => void
  routineRefreshes?: OnlineState['routineRefreshes']
  onRetryRoutineRefresh?: (routineId: string) => void
}
export function HomePanel(props: Props) {
  const review = useContext(HomeReviewContext)
  const editingSupported = supportsWorkoutEditing()
  const { scope, routines, api, training, statistics, refreshKey } = props
  const { schedule, protection, analysis, refresh } = training
  const [clock, setClock] = useState(() => new Date())
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<{ key: string; context: string; data: HomePlan } | null>(null)
  const [todayResult, setTodayResult] = useState<typeof result>(null)
  const [weekly, setWeekly] = useState<{ key: string; context: string; data: HomeWeek } | null>(null)
  const [weekFailed, setWeekFailed] = useState<string | null>(null)
  const [recent, setRecent] = useState<{ owner: string; request: string; data?: Awaited<ReturnType<typeof loadRecent>>; failed?: boolean } | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [cache] = useState(() => new Map<string, Routine>())
  const invalid = useRef(props.onInvalid)
  useEffect(() => { invalid.current = props.onInvalid }, [props.onInvalid])
  useEffect(() => {
    const tick = () => setClock(new Date())
    const interval = window.setInterval(tick, 30000)
    window.addEventListener('pageshow', tick); document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(interval); window.removeEventListener('pageshow', tick); document.removeEventListener('visibilitychange', tick) }
  }, [])
  const zone = schedule?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const today = dateInZone(clock, zone)
  const activeVersion = schedule?.presets.find(p => p.id === schedule.activeId)?.version
  const summaryKey = routines.map(r => r.id + ':' + r.version).join(',')
  const owner = scope.userId + ':' + scope.dataGeneration
  const context = [owner, schedule?.activeId, zone, today].join('|')
  const requestKey = [context, summaryKey, activeVersion, schedule?.appliedVersion, refreshKey, reload].join('|')
  const recentRequest = JSON.stringify([refreshKey, reload])
  const inputs = useRef({ scope, schedule, clock, zone, routines })
  useEffect(() => { inputs.current = { scope, schedule, clock, zone, routines } }, [scope, schedule, clock, zone, routines])
  useEffect(() => {
    const abort = new AbortController(), current = inputs.current
    if (props.enabled === false || !current.schedule) return
    const reject = (error: unknown, markFailed: (key: string) => void) => {
      if (abort.signal.aborted) return
      if (boundaryError(error) || readAccessDenied(error)) {
        abort.abort(); cache.clear(); setResult(null); setTodayResult(null); setWeekly(null)
        setFailed(requestKey); setWeekFailed(requestKey)
      } else markFailed(requestKey)
      if (boundaryError(error)) invalid.current(error)
    }
    const currentSchedule = current.schedule
    let planSettled = false, weekSettled = false
    void readWithDeadline(abort.signal, async signal => {
      const reads = loadHome(current.scope, api, current.routines, currentSchedule, statistics, cache, current.clock, current.zone, signal)
      await Promise.allSettled([
        reads.todayPlan.then(data => { if (!signal.aborted) setTodayResult({ key: requestKey, context, data }) }, error => { if (!signal.aborted) reject(error, setFailed) }),
        reads.plan.then(data => { if (!signal.aborted) { setResult({ key: requestKey, context, data }); setFailed(null) } }, error => { if (!signal.aborted) reject(error, setFailed) }).finally(() => { planSettled = !signal.aborted }),
        reads.week.then(data => { if (!signal.aborted) { setWeekly({ key: requestKey, context, data }); setWeekFailed(null) } }, error => { if (!signal.aborted) reject(error, setWeekFailed) }).finally(() => { weekSettled = !signal.aborted }),
      ])
    }).catch(error => { if (!planSettled) reject(error, setFailed); if (!weekSettled) reject(error, setWeekFailed) })
    return () => abort.abort()
  }, [context, requestKey, props.enabled, api, statistics, cache])
  useEffect(() => {
    if (props.enabled === false) return
    const abort = new AbortController()
    void readWithDeadline(abort.signal, signal => loadRecent(api, scope, signal)).then(data => {
      if (!abort.signal.aborted) setRecent({ owner, request: recentRequest, data })
    }).catch(error => {
      if (abort.signal.aborted) return
      if (boundaryError(error)) invalid.current(error)
      setRecent(previous => ({ owner, request: recentRequest, failed: true, data: !readAccessDenied(error) && !boundaryError(error) && previous?.owner === owner ? previous.data : undefined }))
    })
    return () => abort.abort()
  }, [api, scope, owner, recentRequest, props.enabled])
  const refreshFailed = failed === requestKey
  const completePlan = schedule && result?.context === context ? result : null
  const partialPlan = schedule && todayResult?.key === requestKey ? todayResult : null
  const verifiedPlan = completePlan?.key === requestKey ? completePlan : partialPlan
  const plan = completePlan ?? partialPlan
  const loading = !refreshFailed && (schedule ? !verifiedPlan : training.loading)
  const data = plan?.data
  const week = schedule && weekly?.context === context ? weekly.data : null
  const weekUnavailable = weekFailed === requestKey || !schedule && !training.loading
  const recentResult = recent?.owner === owner ? recent : null
  useStartupReveal(!!props.startupHome && props.enabled !== false && !props.busy && !training.loading &&
    (!!data || !loading) && (!!week || weekUnavailable))
  const protectedView = protection === 'ACTIVE' || protection === 'COMPLETED'
  const protectionNotice = protection === 'ACTIVE' ? '일반 보기 · 디로딩 진행 중에는 일반 운동과 루틴을 변경할 수 없습니다.'
    : protection === 'COMPLETED' ? '디로딩 완료 당일 · 일반 운동은 다음 날부터 시작할 수 있습니다.' : null
  const refreshIssue = props.readIssue ?? (schedule ? training.issue : undefined)
    ?? (data && refreshFailed ? '홈을 새로 불러오지 못했어요.' : undefined)
    ?? (week && weekUnavailable ? '이번 주 일정을 새로 불러오지 못했어요.' : undefined)
    ?? (recentResult?.data && (recentResult.failed || recentResult.data.failed) ? '최근 운동을 모두 불러오지 못했어요.' : undefined)
  return <HomeView {...props} localReady={props.localReady && editingSupported}
    data={data} chooserPending={!refreshFailed && completePlan?.key !== requestKey}
    startReadIssue={props.readIssue ?? training.issue ?? (refreshFailed ? '홈의 최신 루틴을 불러오지 못했어요.' : undefined)}
    startChecking={loading || training.loading || training.busy}
    verifiedRoutines={verifiedPlan?.data.routines ?? null}
    week={week ?? undefined} weekFailed={weekUnavailable || !!weekFailed?.startsWith(context + '|')} today={today} loading={loading}
    homeFailed={!!failed?.startsWith(context + '|') || !!training.issue && !data}
    refreshing={props.busy || training.loading || !!schedule && (loading || !weekUnavailable && weekly?.key !== requestKey) || recentResult?.request !== recentRequest}
    recent={recentResult?.data && { recent: recentResult.data.details, recentRows: recentResult.data.rows,
      recentLimited: recentResult.data.limited, recentFailed: recentResult.data.failed }} recentFailed={recentResult?.failed}
    canStart={props.enabled !== false && editingSupported && props.localReady && !loading && !refreshFailed && !props.readIssue && training.canWrite}
    protectedView={protectedView} completeRest={training.completeRest} protectionNotice={protectionNotice} refreshIssue={refreshIssue} feedbackVisible={props.startupHome !== false}
    header={<HomeTrainingHeader analysis={analysis} protection={protection} />}
    presetFilter={schedule ? { presets: schedule.presets, activeId: schedule.activeId, visit: props.visit } : undefined}
    showHttpNote={!!review && !editingSupported} onRefresh={() => {
      refresh()
      cache.clear()
      if (props.onRefreshRoutines) props.onRefreshRoutines()
      else setReload(n => n + 1)
    }} />
}

type HomeViewData = Pick<HomeData, 'summaries' | 'routines'> & Partial<Pick<HomeData, 'recent' | 'recentRows' | 'recentLimited' | 'recentFailed'>> & {
  schedule: Pick<HomeData['schedule'], 'assignments' | 'version'>
  overview?: Pick<HomeData['overview'], 'plannedDays'>
  unavailable?: HomePlan['unavailable']
}

type HomeViewProps = Pick<Props, 'action' | 'attempt' | 'busy' | 'localReady' | 'issue' | 'startUnconfirmed' | 'startIssueTone' | 'onStart' | 'onResume' | 'onRetry' | 'onNavigate' | 'onHistory' | 'onOpen' | 'routineRefreshes' | 'onRetryRoutineRefresh'> & {
  refreshIssue?: string
  protectionNotice?: string | null
  feedbackVisible?: boolean
  active: Pick<Session, 'initialPlan'> | null
  progress?: ActiveWorkoutProgress
  data?: HomeViewData | null
  recent?: Pick<HomeData, 'recent' | 'recentRows' | 'recentLimited' | 'recentFailed'>
  recentFailed?: boolean
  today: string
  loading?: boolean
  homeFailed?: boolean
  refreshing?: boolean
  chooserPending?: boolean
  startReadIssue?: string
  startChecking?: boolean
  verifiedRoutines?: ReadonlyMap<string, Routine> | null
  week?: HomeWeek
  weekFailed?: boolean
  canStart: boolean
  showHttpNote?: boolean
  header?: ReactNode
  headerActions?: ReactNode
  todayNotice?: string
  hideChooser?: boolean
  onRefresh: () => void
  presetFilter?: { presets: SchedulePreset[]; activeId: string; visit: number }
  protectedView?: boolean
  completeRest?: boolean
}

export function HomeView(props: HomeViewProps) {
  const { data, today, loading } = props
  const active = props.progress?.confirmedFinished ? null : props.active
  const dates = weekDates(today)
  const [override, setOverride] = useState<{ date: string; routineId: string | null } | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [datePointer, setDatePointer] = useState<{ date: string | null } | null>(null)
  const dayGrid = useRef<HTMLDivElement>(null)
  const { presetFilter } = props
  const filterContext = presetFilter ? presetFilter.activeId + ':' + presetFilter.visit : ''
  const [filter, setFilter] = useState<{ context: string; value: string } | null>(null)
  const choice = filter?.context === filterContext ? filter.value : null
  const chosenPreset = presetFilter?.presets.find(preset => preset.id === choice)
  const selectedFilter = choice === 'all' || choice === 'unassigned' || choice === 'rest' ? choice : chosenPreset?.id ?? presetFilter?.activeId
  const restFilter = selectedFilter === 'rest'
  const filteredPreset = presetFilter?.presets.find(preset => preset.id === selectedFilter)
  const assignedIds = new Set(presetFilter?.presets.flatMap(preset => preset.assignments.map(a => a.routineId)))
  const candidates = data?.summaries.filter(routine => selectedFilter === 'unassigned'
    ? !assignedIds.has(routine.id)
    : !filteredPreset || filteredPreset.assignments.some(a => a.routineId === routine.id))
  const chooseFilter = (value: string) => setFilter({ context: filterContext, value })
  const assignment = data?.schedule.assignments.find(a => a.dayOfWeek === dayOfWeek(today))
  const temporaryRoutineId = override?.date === today ? override.routineId : undefined
  const restSelected = temporaryRoutineId === null
  const overrideId = temporaryRoutineId && data?.summaries.some(r => r.id === temporaryRoutineId) ? temporaryRoutineId : null
  const chosenId = restSelected ? null : overrideId ?? assignment?.routineId
  const chosen = chosenId ? data?.routines.get(chosenId) : null
  const restDay = restSelected || !chosenId && !!data && data.schedule.version !== '0'
  const hideStartForRest = restDay || props.completeRest
  const showStart = props.attempt || props.action === 'start' || !hideStartForRest && (!!chosenId || !!data && !props.hideChooser)
  const startLabel = props.action === 'retry' ? '확인 중' : hideStartForRest && props.attempt ? '기존 시작 요청 다시 확인'
    : hideStartForRest && props.action === 'start' ? '시작 요청 확인 중' : '운동 시작'
  const chooserLocked = props.busy || !!props.action || !!props.active || props.attempt || props.protectedView
  const routineRefresh = chosenId && !props.active && !props.attempt ? props.routineRefreshes?.get(chosenId) : undefined
  const startable = (detail: Routine | null | undefined) => !!detail && (activeWeights(detail).length > 0 || activeCardio(detail).length > 0)
  const chosenVerified = props.verifiedRoutines === undefined || props.verifiedRoutines?.get(chosen?.id ?? '')?.version === chosen?.version
  const canStart = props.canStart && !chooserLocked && !routineRefresh && chosenVerified && startable(chosen)
  const noUsableRoutine = !!data && !props.chooserPending && ![...data.routines.values()].some(startable)
  const routineReadIssue = data && !props.attempt && !props.protectedView && !!data.unavailable?.length &&
    (chosenId ? !chosen : noUsableRoutine) ? '루틴 구성을 불러오지 못했어요.' : null
  const startNotice = !data || props.attempt || props.protectedView || props.startReadIssue || routineReadIssue ? null
    : props.startChecking || props.chooserPending && !chosen ? '운동 계획을 확인하는 중이에요.'
    : chosen && !startable(chosen) ? '이 루틴에 등록된 운동이 없어요.'
    : noUsableRoutine ? '시작할 수 있는 루틴이 없어요. 루틴 탭에서 운동을 등록해 주세요.'
    : !props.localReady ? '이 환경에서 운동 기록을 저장할 수 있는지 확인해 주세요.' : null
  const selected = dates.includes(selectedDay ?? '') ? selectedDay! : today
  const overview = props.week?.overview ?? data?.overview
  const pointerDateSelected = !!overview && selected === datePointer?.date
  useEffect(() => {
    if (!pointerDateSelected) return
    const dismiss = (event: PointerEvent) => {
      const button = event.target instanceof Element ? event.target.closest('button') : null
      if (!dayGrid.current?.contains(button)) setDatePointer({ date: null })
    }
    document.addEventListener('pointerdown', dismiss, true)
    return () => document.removeEventListener('pointerdown', dismiss, true)
  }, [pointerDateSelected])
  const evidence = props.week?.evidence ?? data?.recent
  const day = overview?.plannedDays.find(d => d.date === selected)
  const selectedEvidence=day?.selectedSessionId?evidence?.get(day.selectedSessionId):undefined
  const status = dayStatus(day, selected, today, selectedEvidence ? partialAchievement(selectedEvidence) : 'unknown')
  const unconfirmed = !!props.issue && (props.startUnconfirmed ?? props.attempt)
  const feedback = useReadErrorToast(props.feedbackVisible !== false
    ? unconfirmed ? '운동이 시작됐는지 확인하지 못했어요.' : props.issue ?? (data && (!routineReadIssue ? props.startReadIssue ?? props.refreshIssue ?? (routineRefresh?.failed ? '최신 루틴을 불러오지 못했어요.' : null) : null))
    : null, unconfirmed || props.issue && props.startIssueTone === 'warning' ? 'warning' : 'error')
  const homeError = !active && !data && (props.homeFailed || !loading)
  const weekError = !overview && props.weekFailed
  const recentError = props.recentFailed && !(props.recent?.recentRows ?? data?.recentRows)
  const refresh = <RefreshButton loading={props.refreshing ?? loading} onRefresh={() => props.onRefresh?.()}
    failure={homeError ? '홈을 불러오지 못했어요.' : weekError && !active ? '이번 주 일정을 불러오지 못했어요.' : recentError ? '최근 운동을 불러오지 못했어요.' : undefined} />
  return <section className={styles.home} aria-label="홈">
    <HomeHeader>{props.header}</HomeHeader>
    {props.headerActions}
    {active && props.progress && <ActiveRoutine routineName={active.initialPlan.routineName} progress={props.progress} busy={props.busy} loading={props.action === 'resume'} onResume={props.onResume} />}
      {!active && <Card hero className={!data || restDay && !props.todayNotice ? styles.today : `${styles.today} ${styles.planCard}`} aria-label="오늘의 루틴" aria-busy={!data && !!loading}>
        {!data ? homeError ? <ContentError embedded title="홈을 불러오지 못했어요." action={refresh} /> : <HomePlaceholder area="today" /> : <>
        <div className={styles.kicker}><span>TODAY'S ROUTINE</span><time dateTime={today}>{today.slice(5).replace('-', '.')} {weekdays[dayOfWeek(today) - 1]}</time></div>
        <h2>{props.todayNotice ?? chosen?.name ?? (restDay ? '오늘은 쉬어가는 날' : chosenId ? '루틴 확인 필요' : '첫 루틴을 준비해 보세요')}</h2>
        {!props.todayNotice && chosen?.tag && <span className={styles.routineTag}>{chosen.tag}</span>}
        {!props.todayNotice && (chosen ? <RoutinePlan routine={chosen} /> : <p className="muted small">{restDay ? '정해진 휴식일입니다. 다른 루틴을 선택할 수 있습니다.' : chosenId ? '이 루틴의 최신 구성을 확인하지 못했습니다. 새로고침하거나 다른 루틴을 선택하세요.' : '루틴 탭에서 운동과 주간 일정을 등록할 수 있습니다.'}</p>)}
        {startNotice && <p className="muted small" role="status">{startNotice}</p>}
        {props.protectionNotice && <p className="muted small">{props.protectionNotice}</p>}
        </>}
      </Card>}
      {!active && routineReadIssue && <ContentError embedded title={routineReadIssue} action={refresh} />}
      {chosenId && routineRefresh ? <RefreshButton className={styles.start} loading={!routineRefresh.failed}
        onRefresh={() => props.onRetryRoutineRefresh?.(chosenId)} />
      : !props.active && showStart && <Button className={styles.start} variant="primary" loading={!!props.action}
        data-click-action={props.attempt ? 'retry-start' : 'start'}
        disabled={!props.action && (props.busy || (props.attempt ? !props.localReady : !canStart))}
        onClick={() => { if (props.attempt) props.onRetry(); else if (chosen) void props.onStart(chosen) }}>
        {startLabel}</Button>}
      {!props.hideChooser && (data ? <ConnectedDropdown label="오늘만 다른 루틴 선택">{close => <div className={styles.chooserContent}>
        {presetFilter && <div className={`${filterStyles.strip} ${styles.choiceFilters}`} role="group" aria-label="루틴 일정 필터">
          <button type="button" aria-pressed={selectedFilter === 'all'} onClick={() => chooseFilter('all')}><span>전체</span></button>
          <button type="button" aria-pressed={selectedFilter === 'unassigned'} onClick={() => chooseFilter('unassigned')}><span>미배정</span></button>
          {presetFilter.presets.map((preset, index) => <button key={preset.id} type="button" title={preset.name} aria-label={presetNumber(index) + '번 일정 · ' + preset.name} aria-pressed={selectedFilter === preset.id} onClick={() => chooseFilter(preset.id)}><span>{presetNumber(index)}</span></button>)}
          <button type="button" aria-pressed={restFilter} onClick={() => chooseFilter('rest')}><span>휴식</span></button>
        </div>}
        {restFilter ? <div className={dropdown.scroll} data-dropdown-scroll role="group" aria-label="선택할 루틴">
          <button className={dropdown.item} data-dropdown-item data-description type="button" aria-pressed={restSelected} disabled={chooserLocked}
            onClick={() => { setOverride({ date: today, routineId: null }); close() }}>
            <span className={styles.choiceTitle}><strong className={optionText.title}>휴식</strong></span><small className={optionText.description}>오늘은 운동하지 않고 쉬어갑니다.</small>
          </button>
        </div> : <>
        {!data.summaries.length && <EmptyState embedded icon={<FeedbackIcon name="routine" size={22} />} title="등록된 루틴이 없어요" action={<Button onClick={() => { close(); props.onNavigate('routines') }}>루틴 만들러 가기</Button>} />}
        {props.chooserPending ? <p role="status">루틴 구성을 확인하는 중입니다.</p> : <>
        {!!data.summaries.length && !candidates?.length && <EmptyState embedded icon={<FeedbackIcon name="search" size={22} />} title="조건에 맞는 루틴이 없어요" />}
        {!!candidates?.length && <div className={dropdown.scroll} data-dropdown-scroll role="group" aria-label="선택할 루틴">{candidates.map(r => {
          const detail = data.routines.get(r.id)
          const days = (filteredPreset ?? data.schedule).assignments.filter(a => a.routineId === r.id).map(a => weekdays[a.dayOfWeek - 1]).join('·')
          const assignmentLabel = days || (presetFilter ? assignedIds.has(r.id) ? '다른 일정 배정' : '미배정' : '요일 미지정')
          return <button className={dropdown.item} data-dropdown-item data-description type="button" key={r.id} aria-pressed={chosenId === r.id} disabled={!startable(detail) || chooserLocked || props.routineRefreshes?.has(r.id)}
            onClick={() => { setOverride({ date: today, routineId: r.id }); close() }}>
            <span className={styles.choiceTitle}><strong className={optionText.title} title={r.name}>{r.name}</strong><span className={optionText.description}>{assignmentLabel}</span></span><small className={optionText.description} title={detail ? representativeExercises(detail) : ''}>{detail ? representativeExercises(detail) : '구성 조회 실패'}</small>
          </button>
        })}</div>}</>}
        </>}
        {(restSelected || overrideId) && <Button variant="quiet" onClick={() => setOverride(null)}>오늘의 원래 일정으로</Button>}
      </div>}</ConnectedDropdown> : <HomePlaceholder area="chooser" />)}
      <Card aria-label="이번 주 일정" className={styles.week} aria-busy={!overview && !props.weekFailed}>
        {!overview ? weekError ? <ContentError embedded title="이번 주 일정을 불러오지 못했어요." action={!homeError && refresh} /> : <HomePlaceholder area="week" /> : <>
        <div className={styles.sectionTitle}><h2>이번 주 일정</h2><span>{dates[0].slice(5).replace('-', '.')} – {dates[6].slice(5).replace('-', '.')}</span></div>
        <div className={`${styles.days} ${styles.dateSelection}`} ref={dayGrid} data-pointer-input={datePointer !== null || undefined} onFocus={event => {
          if (event.target.matches(':focus-visible')) setDatePointer(null)
        }} onKeyDown={() => setDatePointer(null)}>{dates.map((date, index) => {
          const planned = overview.plannedDays.find(d => d.date === date)
          const session = planned?.selectedSessionId ? evidence?.get(planned.selectedSessionId) : undefined
          const state = dayStatus(planned, date, today, session ? partialAchievement(session) : 'unknown')
          return <button type="button" key={date} aria-pressed={selected === date} aria-label={`${date} ${weekdays[index]} ${planned?.plan?.name ?? ''} ${state.label}`} aria-current={date === today ? 'date' : undefined}
            data-pointer-highlight={pointerDateSelected && selected === date && date !== today ? true : undefined} onClick={event => {
              setSelectedDay(date)
              setDatePointer(event.detail > 0 ? { date } : null)
            }}>
            <small data-past={date < today}>{date.slice(8)}</small><strong data-status={state.mark === 'X' ? 'missed' : state.kind}>{state.mark}</strong><span data-past={date < today}>{planned?.plan ? scheduleRoutineLabel(planned.plan.name, planned.plan.tag??undefined) : planned?.status === 'REST' ? '휴식' : '미확인'}</span>
          </button>
        })}</div>
        <p className={styles.dayDetail}>{selected.slice(5).replace('-', '.')} · {day?.plan
          ? day.plan.name + ' · ' + (day.status === 'UNVERIFIABLE' || day.status === 'UNKNOWN' ? '수행 확인 불가' : status.label)
          : day?.status === 'REST' || day?.status === 'BEFORE_REGISTRATION' ? status.label
            : '당일 배정 확인 불가' + (day?.status === 'PENDING' ? ' · ' + status.label : '')}
          {day?.selectedSessionId && <Button className={styles.dayLink} variant="quiet" onClick={() => props.onOpen(day.selectedSessionId!)}>기록 ›</Button>}</p>
        </>}
      </Card>
      <section aria-label="최근 운동" className={styles.recent} aria-busy={!(props.recent?.recentRows ?? data?.recentRows) && !props.recentFailed}><div className={styles.sectionTitle}><h2>최근 운동</h2><Button compact variant="quiet" onClick={() => props.onHistory?props.onHistory():props.onNavigate('history')}>전체 보기 ›</Button></div>
        {!(props.recent?.recentRows ?? data?.recentRows) && !props.recentFailed && <HomePlaceholder area="recent" />}
        {(props.recent?.recentRows ?? data?.recentRows)?.length === 0 && <EmptyState icon={<FeedbackIcon name="record" size={24} />} title="아직 운동 기록이 없어요" />}
        {(props.recent?.recentRows ?? data?.recentRows)?.map(item => <RecentWorkout key={item.id} row={item} detail={(props.recent ?? data)?.recent?.get(item.id)} onOpen={props.onOpen} />)}
        {(props.recent?.recentLimited || data?.recentLimited) && <Metadata>최근 60개 종료 기록 범위입니다. 이전 기록은 기록 탭에서 확인하세요.</Metadata>}
        {recentError && <ContentError title="최근 운동을 불러오지 못했어요." action={!homeError && !weekError && refresh} />}
        {!homeError && !weekError && !recentError && !routineReadIssue && <div className={styles.tools}>{refresh}</div>}
        {props.showHttpNote && <p className={styles.httpNote}>HTTP에서는 홈·로그인·기록을 검토할 수 있습니다. 운동 편집은 PC localhost 또는 HTTPS에서, 설치형 PWA는 별도 HTTPS 빌드에서 확인하세요.</p>}
      </section>
    <Toast toast={feedback.toast} onDismiss={feedback.dismiss} bottomClearance="var(--tabs-height, 56px)" />
  </section>
}
