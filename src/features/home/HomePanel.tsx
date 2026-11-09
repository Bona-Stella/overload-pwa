import type { ReactNode } from 'react'
import { useContext, useEffect, useRef, useState } from 'react'
import { Button, Card, Metadata, StatusNotice } from '../../components/ui.tsx'
import type { AppTab } from '../../app/types.ts'
import type { WorkoutApi } from '../workout-online/api.ts'
import type { Routine, RoutineList, Scope, Session } from '../workout-online/types.ts'
import type { StatisticsApi } from '../statistics/api.ts'
import type { TrainingSchedule } from '../workout-online/useTrainingSchedule.ts'
import { HomeTrainingHeader } from './HomeTrainingHeader.tsx'
import { activeCardio, activeWeights, cardioPlanLabel, dateInZone, dayOfWeek, dayStatus, representativeExercises, weekdays, weekDates } from './model.ts'
import { boundaryError, loadHome } from './load.ts'
import type { HomeData } from './load.ts'
import { HomeReviewContext } from '../../review/context.ts'
import { RecentWorkout } from './RecentWorkout.tsx'
import { DeloadMoon } from '../../components/DeloadMoon.tsx'
import { scheduleRoutineLabel } from './tags.ts'
import { presetNumber } from '../workout-online/preset-schedule.ts'
import type { SchedulePreset } from '../workout-online/preset-schedule.ts'
import routineStyles from '../workout-online/Routine.module.css'
import styles from './Home.module.css'

export function RoutinePlan({ routine }: { routine: Routine }) {
  const weights = activeWeights(routine), cardio = activeCardio(routine)
  return <>
    <div className={styles.planSection}><h3>WEIGHT <span>총 {weights.length}종목</span></h3><ol>{weights.map(p => <li key={p.id}><span title={p.exerciseName}>{p.exerciseName}</span><strong>{p.approvedWeightKg}kg · {p.setCount}세트 · {p.minReps === p.maxReps ? p.minReps : `${p.minReps}~${p.maxReps}`}회</strong></li>)}</ol>{!weights.length && <p className={styles.emptyPlan}>계획된 웨이트 없음</p>}</div>
    <div className={styles.planSection}><h3>CARDIO <span>총 {cardio.length}종목</span></h3><ol>{cardio.map(p => <li key={p.id}><span title={p.plan.name}>{p.plan.name}</span><strong>{cardioPlanLabel(p.plan)}</strong></li>)}</ol>{!cardio.length && <p className={styles.emptyPlan}>유산소 계획 없음</p>}</div>
  </>
}
type Props = {
  scope: Scope; routines: RoutineList['routines']; api: WorkoutApi; training: TrainingSchedule; statistics: StatisticsApi; visit: number;
  refreshKey: string; active: Session | null; attempt: boolean; busy: boolean; localReady: boolean; issue: string | null;
  onStart: (routine: Routine) => Promise<void>; onResume: () => void; onRetry: () => void; onNavigate: (tab: AppTab) => void;
  onOpen: (id: string) => void; onInvalid: (error: unknown) => void
}
export function HomePanel(props: Props) {
  const review = useContext(HomeReviewContext)
  const editingSupported = typeof globalThis.crypto?.randomUUID === 'function' && !!globalThis.navigator?.locks
  const { scope, routines, api, training, statistics, refreshKey } = props
  const { schedule, protection, analysis, refresh } = training
  const [clock, setClock] = useState(() => new Date())
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<{ key: string; data: HomeData | null } | null>(null)
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
  const requestKey = [scope.userId, scope.dataGeneration, summaryKey, schedule?.activeId, activeVersion,
    schedule?.appliedVersion, zone, refreshKey, today, reload].join('|')
  const inputs = useRef({ scope, schedule, clock, zone })
  useEffect(() => { inputs.current = { scope, schedule, clock, zone } }, [scope, schedule, clock, zone])
  useEffect(() => {
    const abort = new AbortController(), current = inputs.current
    if (!current.schedule) return
    void loadHome(current.scope, api, current.schedule, statistics, cache, current.clock, current.zone, abort.signal).then(data => {
      if (!abort.signal.aborted) setResult({ key: requestKey, data })
    }).catch(error => {
      if (abort.signal.aborted) return
      if (boundaryError(error)) invalid.current(error)
      setResult({ key: requestKey, data: null })
    })
    return () => abort.abort()
  }, [requestKey, api, statistics, cache])
  const loading = schedule ? result?.key !== requestKey : training.loading
  const data = loading || !schedule ? null : result?.data
  const protectedView = protection !== null
  const protectionNotice = protection === 'ACTIVE' ? '일반 보기 · 디로딩 진행 중에는 일반 운동과 루틴을 변경할 수 없습니다.'
    : protection === 'COMPLETED' ? '디로딩 완료 당일 · 일반 운동은 다음 날부터 시작할 수 있습니다.' : null
  return <HomeView {...props} data={data} today={today} loading={loading}
    canStart={editingSupported && props.localReady && !training.loading && !training.issue && !training.busy}
    protectedView={protectedView} issue={props.issue ?? training.issue ?? protectionNotice}
    header={<HomeTrainingHeader analysis={analysis} protection={protection} />}
    presetFilter={schedule ? { presets: schedule.presets, activeId: schedule.activeId, visit: props.visit } : undefined}
    showHttpNote={!!review && !editingSupported} onRefresh={() => { refresh(); cache.clear(); setReload(n => n + 1) }} />
}

type HomeViewData = Pick<HomeData, 'summaries' | 'routines' | 'recent' | 'recentRows' | 'recentLimited' | 'recentFailed'> & {
  schedule: Pick<HomeData['schedule'], 'assignments' | 'version'>
  overview: Pick<HomeData['overview'], 'plannedDays'>
}

type HomeViewProps = Pick<Props, 'active' | 'attempt' | 'busy' | 'localReady' | 'issue' | 'onStart' | 'onResume' | 'onRetry' | 'onNavigate' | 'onOpen'> & {
  data?: HomeViewData | null
  today: string
  loading?: boolean
  canStart: boolean
  showHttpNote?: boolean
  header?: ReactNode
  headerActions?: ReactNode
  todayNotice?: string
  hideChooser?: boolean
  onRefresh: () => void
  presetFilter?: { presets: SchedulePreset[]; activeId: string; visit: number }
  protectedView?: boolean
}

export function HomeView(props: HomeViewProps) {
  const { data, today, loading } = props
  const dates = weekDates(today)
  const [override, setOverride] = useState<{ date: string; id: string } | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const chooser = useRef<HTMLDetailsElement>(null)
  const { presetFilter } = props
  const filterContext = presetFilter ? presetFilter.activeId + ':' + presetFilter.visit : ''
  const [filter, setFilter] = useState<{ context: string; value: string } | null>(null)
  const choice = filter?.context === filterContext ? filter.value : null
  const chosenPreset = presetFilter?.presets.find(preset => preset.id === choice)
  const selectedFilter = choice === 'all' || choice === 'unassigned' ? choice : chosenPreset?.id ?? presetFilter?.activeId
  const filteredPreset = presetFilter?.presets.find(preset => preset.id === selectedFilter)
  const assignedIds = new Set(presetFilter?.presets.flatMap(preset => preset.assignments.map(a => a.routineId)))
  const candidates = data?.summaries.filter(routine => selectedFilter === 'unassigned'
    ? !assignedIds.has(routine.id)
    : !filteredPreset || filteredPreset.assignments.some(a => a.routineId === routine.id))
  const chooseFilter = (value: string) => setFilter({ context: filterContext, value })
  const assignment = data?.schedule.assignments.find(a => a.dayOfWeek === dayOfWeek(today))
  const overrideId = override?.date === today && data?.summaries.some(r => r.id === override.id) ? override.id : null
  const chosenId = overrideId ?? assignment?.routineId
  const chosen = chosenId ? data?.routines.get(chosenId) : null
  const selected = dates.includes(selectedDay ?? '') ? selectedDay! : today
  const day = data?.overview.plannedDays.find(d => d.date === selected)
  const status = dayStatus(day, selected, today)
  useEffect(() => { if (override?.date === today && chosen?.id === override.id && chooser.current) chooser.current.open = false }, [override, chosen, today])
  return <section className={styles.home} aria-label="홈">
    <header className={styles.homeHeader}><span className={styles.brand}>OVERLOAD</span>{props.header ?? <span className={styles.headerIcon} title="디로딩 분석 상태 미연동"><DeloadMoon /></span>}</header>
    {props.headerActions}
    {props.issue && <StatusNotice error>{props.issue}</StatusNotice>}
    {loading ? <StatusNotice>오늘의 루틴과 일정을 불러오고 있습니다.</StatusNotice> : !data ? <><StatusNotice error>홈 정보를 불러오지 못했습니다. 연결을 확인한 후 다시 시도하세요.</StatusNotice><Button onClick={props.onRefresh}>홈 다시 불러오기</Button></> : <>
      <Card hero className={styles.today} aria-label="오늘의 루틴">
        <div className={styles.kicker}><span>TODAY'S ROUTINE</span><time dateTime={today}>{today.slice(5).replace('-', '.')} {weekdays[dayOfWeek(today) - 1]}</time></div>
        <h2>{props.todayNotice ?? chosen?.name ?? (chosenId ? '루틴 확인 필요' : data.schedule.version !== '0' ? '오늘은 쉬어가는 날' : '첫 루틴을 준비해 보세요')}</h2>
        {!props.todayNotice && chosen?.tag && <span className={styles.routineTag}>{chosen.tag}</span>}
        {!props.todayNotice && (chosen ? <RoutinePlan routine={chosen} /> : <p className="muted small">{chosenId ? '이 루틴의 최신 구성을 확인하지 못했습니다. 새로고침하거나 다른 루틴을 선택하세요.' : data.schedule.version !== '0' ? '정해진 휴식일입니다. 원하면 오늘만 다른 루틴을 선택할 수 있습니다.' : '루틴 탭에서 운동과 주간 일정을 등록할 수 있습니다.'}</p>)}
      </Card>
      {props.active ? <><StatusNotice>진행 중 · {props.active.initialPlan.routineName}</StatusNotice><Button className={styles.start} variant="primary" disabled={props.busy} onClick={props.onResume}>운동 이어가기</Button></>
        : props.attempt ? <><StatusNotice>시작 결과 확인 필요 · 보존된 같은 요청을 다시 확인합니다.</StatusNotice><Button className={styles.start} variant="primary" disabled={props.busy || !props.localReady} onClick={props.onRetry}>기존 시작 요청 다시 확인</Button></>
          : <Button className={styles.start} variant="primary" disabled={props.busy || !props.canStart || props.protectedView || !chosen || !activeWeights(chosen).length && !activeCardio(chosen).length} onClick={() => { if (chosen) void props.onStart(chosen) }}>운동 시작</Button>}
      {!props.hideChooser && <details className={styles.chooser} ref={chooser}><summary><b>오늘만 다른 루틴 선택</b><span className={styles.plus} aria-hidden="true" /></summary>
        {!data.summaries.length && <><p>아직 루틴이 없습니다.</p><Button onClick={() => props.onNavigate('routines')}>루틴 만들러 가기</Button></>}
        {presetFilter && <div className={styles.choiceFilters} role="group" aria-label="루틴 일정 필터">
          <button type="button" className={routineStyles.chip} aria-pressed={selectedFilter === 'all'} onClick={() => chooseFilter('all')}>전체</button>
          <button type="button" className={routineStyles.chip} aria-pressed={selectedFilter === 'unassigned'} onClick={() => chooseFilter('unassigned')}>미배정</button>
          {presetFilter.presets.map((preset, index) => <button key={preset.id} type="button" className={routineStyles.chip} title={preset.name} aria-label={presetNumber(index) + '번 일정 · ' + preset.name} aria-pressed={selectedFilter === preset.id} onClick={() => chooseFilter(preset.id)}>{presetNumber(index)}</button>)}
        </div>}
        {!!data.summaries.length && !candidates?.length && <p role="status">조건에 맞는 루틴이 없습니다.</p>}
        <div className={styles.choices}>{candidates?.map(r => {
          const detail = data.routines.get(r.id)
          const days = (filteredPreset ?? data.schedule).assignments.filter(a => a.routineId === r.id).map(a => weekdays[a.dayOfWeek - 1]).join('·')
          const assignmentLabel = days || (presetFilter ? assignedIds.has(r.id) ? '다른 일정 배정' : '미배정' : '요일 미지정')
          return <button type="button" key={r.id} aria-pressed={chosenId === r.id} disabled={!detail || props.busy || !!props.active || props.attempt || props.protectedView} onClick={() => setOverride({ date: today, id: r.id })}>
            <span className={styles.choiceTitle}><strong title={r.name}>{r.name}</strong><span>{assignmentLabel}</span></span><small title={detail ? representativeExercises(detail) : ''}>{detail ? representativeExercises(detail) : '구성 조회 실패'}</small>
          </button>
        })}</div>
        {overrideId && <Button variant="quiet" onClick={() => setOverride(null)}>오늘의 원래 일정으로</Button>}
      </details>}
      <Card aria-label="이번 주 일정" className={styles.week}>
        <div className={styles.sectionTitle}><h2>이번 주 일정</h2><span>{dates[0].slice(5).replace('-', '.')} – {dates[6].slice(5).replace('-', '.')}</span></div>
        <div className={styles.days}>{dates.map((date, index) => {
          const planned = data.overview.plannedDays.find(d => d.date === date), state = dayStatus(planned, date, today)
          return <button type="button" key={date} aria-pressed={selected === date} aria-label={`${date} ${weekdays[index]} ${planned?.plan?.name ?? ''} ${state.label}`} aria-current={date === today ? 'date' : undefined} onClick={() => setSelectedDay(date)}>
            <small data-past={date < today}>{date.slice(8)}</small><strong data-status={state.mark === 'X' ? 'missed' : state.kind}>{state.mark}</strong><span data-past={date < today}>{planned?.plan ? scheduleRoutineLabel(planned.plan.name, planned.plan.tag??undefined) : planned?.status === 'REST' ? '휴식' : '미확인'}</span>
          </button>
        })}</div>
        <p className={styles.dayDetail}>{selected.slice(5).replace('-', '.')} · {day?.plan
          ? day.plan.name + ' · ' + (day.status === 'UNVERIFIABLE' || day.status === 'UNKNOWN' ? '수행 확인 불가' : status.label)
          : day?.status === 'REST' || day?.status === 'BEFORE_REGISTRATION' ? status.label
            : '당일 배정 확인 불가' + (day?.status === 'PENDING' ? ' · ' + status.label : '')}
          {day?.selectedSessionId && <Button className={styles.dayLink} variant="quiet" onClick={() => props.onOpen(day.selectedSessionId!)}>기록 ›</Button>}</p>
        <div className={styles.weekFooter}><Button variant="quiet" onClick={() => props.onNavigate('routines')}>주간 일정 관리 ›</Button></div>
      </Card>
      <section aria-label="최근 운동" className={styles.recent}><div className={styles.sectionTitle}><h2>최근 운동</h2><Button variant="quiet" onClick={() => props.onNavigate('history')}>전체 보기 ›</Button></div>
        {!data.recentRows.length && <Card><p>표시할 운동 기록이 없습니다.</p><Metadata>실제 수행이 있는 종료 기록이 표시됩니다.</Metadata></Card>}
        {data.recentRows.map(item => <RecentWorkout key={item.id} row={item} detail={data.recent.get(item.id)} onOpen={props.onOpen} />)}
        {(data.recentLimited || data.recentFailed) && <Metadata>{data.recentLimited ? '최근 60개 종료 기록 범위입니다. 이전 기록은 기록 탭에서 확인하세요.' : '일부 수행 상세를 확인하지 못했습니다. 다시 조회해 주세요.'}</Metadata>}
        <div className={styles.tools}><Metadata>종료 당시 최초 계획 · 현재 유효 수행 기준</Metadata><Button variant="quiet" disabled={loading} onClick={props.onRefresh}>새로고침</Button></div>
        {props.showHttpNote && <p className={styles.httpNote}>HTTP에서는 홈·로그인·기록을 검토할 수 있습니다. 운동 편집은 PC localhost 또는 HTTPS에서, 설치형 PWA는 별도 HTTPS 빌드에서 확인하세요.</p>}
      </section>
    </>}
  </section>
}
