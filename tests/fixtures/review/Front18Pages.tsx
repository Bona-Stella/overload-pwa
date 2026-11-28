import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { HomePanel } from '../../../src/features/home/HomePanel.tsx'
import { RecordFeed } from '../../../src/features/history/RecordFeed.tsx'
import { GrowthPanel } from '../../../src/features/statistics/GrowthPanel.tsx'
import { RestSettings } from '../../../src/features/settings/RestSettings.tsx'
import { WorkspaceView } from '../../../src/features/workout-online/WorkoutWorkspace.tsx'
import { onlineIssue, WorkoutOnlineController } from '../../../src/features/workout-online/controller.ts'
import { WorkoutApiError } from '../../../src/features/workout-online/api.ts'
import { useRoutineEditorRoutes } from '../../../src/features/workout-online/useRoutineEditorRoutes.ts'
import { useTrainingSchedule } from '../../../src/features/workout-online/useTrainingSchedule.ts'
import { SearchExerciseDetails } from '../../../src/components/SearchExerciseDetails.tsx'
import { Button } from '../../../src/components/ui.tsx'
import { CatalogView } from '../../../src/features/workout-online/PublicCatalog.tsx'
import type { AuthState } from '../../../src/features/auth/controller.ts'
import { emptyAccount } from '../../../src/features/auth/account.ts'
import { useScreenHistory } from '../../../src/app/navigation.ts'
import { activities, exercises, scope } from './routine-samples.ts'
import { catalogSamples } from './catalog-samples.ts'
import { createPageExample, ignore, sleep } from './front18-pages.ts'
import { useReviewRecovery } from './review-read.ts'
import type { ReadExample } from './front18-pages.ts'
import styles from './CommonUiPreview.module.css'

export type PageExample = 'home' | 'routine' | 'schedule' | 'records' | 'growth' | 'rest' | 'catalog'
const authenticated: AuthState = { status: 'authenticated', userId: scope.userId, pending: null, challenge: null,
  resendAt: 0, verifyAt: 0, issue: null, notice: '', updatedAt: 0, accountOpen: false, account: emptyAccount() }

type Props = { page: PageExample; openWorkout: () => void; onBack: () => void }

export function Front18Page(props: Props) {
  const [setup, setSetup] = useState({ attempt: 0, schedule: 'normal' as ReadExample })
  return <PageExampleView key={setup.attempt} {...props} initialSchedule={setup.schedule}
    reset={schedule => setSetup(previous => ({ attempt: previous.attempt + 1, schedule }))} />
}

function PageExampleView({ page, openWorkout, onBack, initialSchedule, reset }: Props & { initialSchedule: ReadExample; reset: (mode: ReadExample) => void }) {
  const [fixture] = useState(() => createPageExample(initialSchedule))
  const [controller] = useState(() => new WorkoutOnlineController(fixture.api, fixture.store))
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot)
  const [revision, setRevision] = useState(0)
  const training = useTrainingSchedule(fixture.transport, scope, String(revision), ignore)
  const routes = useRoutineEditorRoutes(scope)
  const [, selectPlan] = useScreenHistory<string | null>('routine-plan:' + scope.userId + ':' + scope.dataGeneration, null)
  const [readsCleared, setReadsCleared] = useState(0)
  const [recent, setRecent] = useState(true)
  const [catalogMode, setCatalogMode] = useState<'normal' | 'empty' | 'failed' | 'retained'>('normal')
  const catalogRead = useReviewRecovery()
  const showCatalog = (mode: typeof catalogMode) => { catalogRead.cancel(); setCatalogMode(mode) }
  const [homeBusy, setHomeBusy] = useState(false)
  const [homeIssue, setHomeIssue] = useState<string | null>(null)
  const [homeAttempt, setHomeAttempt] = useState(false)
  const homeFlight = useRef(false)
  const [homeFault, setHomeFault] = useState<'none' | 'fail' | 'unknown' | 'version'>('none')
  useEffect(() => controller.connect({ getSnapshot: () => authenticated, subscribe: () => ignore }), [controller, readsCleared])

  function read(key: string, mode: ReadExample, initial = false) {
    fixture.setRead(key, mode)
    if (key === 'routines') {
      if (initial) setReadsCleared(value => value + 1)
      else void controller.refresh()
    } else setRevision(value => value + 1)
  }
  const scheduleEditor = (type: 'assign' | 'order') => {
    selectPlan(null, true)
    routes.setEditorRoute(null, true)
    routes.setScheduleRoute(type === 'assign' ? { type, id: fixture.presetId } : { type })
  }
  const plan = () => { routes.setScheduleRoute(null, true); routes.setEditorRoute(null, true); selectPlan(fixture.presetId) }
  async function start() {
    if (homeFlight.current) return
    homeFlight.current = true
    setHomeBusy(true); setHomeIssue(null)
    await sleep(650)
    homeFlight.current = false
    setHomeBusy(false)
    if (homeAttempt) { setHomeAttempt(false); return }
    if (homeFault === 'none') { openWorkout(); return }
    if (homeFault === 'unknown') setHomeAttempt(true)
    setHomeIssue(homeFault === 'version' ? '루틴이 변경됐어요. 다시 확인해 주세요.'
      : onlineIssue(new WorkoutApiError(homeFault === 'unknown' ? 'RESPONSE_INVALID' : 'CLOCK_CONTEXT_INVALID')))
    setHomeFault('none')
  }
  if (page === 'catalog') return <>
    <details open className="card" data-front18-tools><summary>상태 전환 · 운동 종목</summary><div className={styles.controls}>
      <Button onClick={() => showCatalog('normal')}>정상 운동 목록</Button>
      <Button onClick={() => showCatalog('empty')}>빈 운동 목록</Button>
      <Button onClick={() => showCatalog('failed')}>데이터 없는 운동 목록 조회 실패</Button>
      <Button onClick={() => showCatalog('retained')}>기존 운동 목록 재조회 실패</Button>
    </div></details>
    <CatalogView items={catalogMode === 'failed' ? null : catalogMode === 'empty' ? [] : catalogSamples}
      failed={catalogMode === 'failed' || catalogMode === 'retained'} refreshing={catalogRead.pending}
      onRetry={() => catalogRead.recover(() => setCatalogMode('normal'))} onBack={onBack} />
  </>
  const updateRecords = (mode: ReadExample, initial = false) => {
    if (initial) setReadsCleared(value => value + 1)
    read('records', mode)
  }
  return <>
    <details open className="card" data-front18-tools><summary>상태 전환 · {page === 'home' ? '홈' : page === 'routine' ? '루틴' : page === 'rest' ? '휴식 설정' : page === 'growth' ? '성장 추적' : page === 'records' ? '기록' : '주간 일정·계획 분석'}</summary>
      <div className={styles.controls}>
    {page === 'home' && <>
          <Button onClick={() => read('schedule', 'normal')}>정상 데이터 · 재조회</Button>
          <Button onClick={() => reset('delayed')}>최초 홈 로딩</Button>
          <Button onClick={() => read('schedule', 'delayed')}>홈 조회 3.6초 지연</Button>
          <Button onClick={() => read('schedule', 'failed')}>기존 홈 데이터 조회 실패</Button>
          <Button onClick={() => setHomeFault('fail')}>다음 운동 시작 실패</Button>
          <Button onClick={() => setHomeFault('version')}>다음 운동 시작에서 루틴 버전 변경</Button>
          <Button onClick={() => setHomeFault('unknown')}>다음 운동 시작 결과 미확인</Button>
        </>}
        {page === 'routine' && <>
          <Button onClick={() => read('routines', 'normal')}>정상 루틴 목록</Button>
          <Button onClick={() => read('routines', 'delayed', true)}>최초 루틴 조회 지연</Button>
          <Button onClick={() => read('details', 'delayed')}>종목 요약 조회 지연</Button>
          <Button onClick={() => read('routines', 'empty')}>빈 루틴 목록</Button>
          <Button onClick={() => read('routines', 'failed')}>기존 루틴 데이터 조회 실패</Button>
          <Button onClick={() => read('routines', 'failed', true)}>데이터 없는 루틴 조회 실패</Button>
          <Button onClick={() => { fixture.setRead('details', 'normal'); void controller.refresh() }}>루틴 조회 복구</Button>
          <Button onClick={() => routes.setEditorRoute({ id: 'new', readOnly: false })}>루틴 생성 · 저장·폐기</Button>
          <Button onClick={() => routes.setEditorRoute({ id: fixture.first.id, readOnly: false })}>루틴 편집 · 저장·폐기</Button>
          <Button onClick={() => routes.setEditorRoute({ id: fixture.first.id, readOnly: true })}>루틴 상세 · 삭제 확인</Button>
          <Button onClick={() => fixture.setWrite('routines', 'failed')}>다음 루틴 쓰기 실패</Button>
        <Button onClick={() => fixture.setWrite('routines', 'unknown')}>다음 루틴 저장 결과 미확인</Button>
        </>}
        {page === 'schedule' && <>
          <Button onClick={() => scheduleEditor('assign')}>주간 일정 배정·편집</Button>
          <Button onClick={() => scheduleEditor('order')}>주간 일정 전체 편집</Button>
          <Button onClick={plan}>계획 분석</Button>
          <Button onClick={() => read('schedule', 'delayed')}>일정 조회 지연</Button>
          <Button onClick={() => read('schedule', 'failed')}>일정 조회 실패 · 쓰기 차단</Button>
          <Button onClick={() => reset('failed')}>데이터 없는 일정 조회 실패</Button>
          <Button onClick={() => fixture.setWrite('schedule', 'conflict')}>다음 일정 저장 충돌</Button>
          <Button onClick={() => fixture.setWrite('schedule', 'failed')}>다음 일정 저장 실패</Button>
          <Button onClick={() => fixture.setWrite('schedule', 'unknown')}>다음 일정 저장 결과 미확인</Button>
          <Button onClick={() => { fixture.setRead('details', 'failed'); selectPlan(fixture.presetId) }}>계획 분석 루틴 조회 실패</Button>
          <Button onClick={() => { fixture.setRead('details', 'failed'); fixture.updateRoutineVersion(); void controller.refresh() }}>기존 계획 유지 · 조회 오류</Button>
          <Button onClick={() => { fixture.setRead('details', 'normal'); read('schedule', 'normal') }}>일정·계획 조회 복구</Button>
        </>}
        {page === 'records' && <>
          <Button onClick={() => { setRecent(true); updateRecords('normal') }}>정상 최근 기록</Button>
          <Button onClick={() => { setRecent(false); updateRecords('normal') }}>전체 운동 이력</Button>
          <Button onClick={() => updateRecords('delayed', true)}>최초 기록 조회 지연</Button>
          <Button onClick={() => updateRecords('empty')}>빈 기록 목록</Button>
          <Button onClick={() => updateRecords('delayed')}>기존 기록 유지 · 재조회 지연</Button>
          <Button onClick={() => updateRecords('failed')}>기존 기록 조회 실패</Button>
          <Button onClick={() => updateRecords('failed', true)}>데이터 없는 기록 조회 실패</Button>
          <Button onClick={() => fixture.setRecordRefresh('timeout')}>다음 새로고침 시간 초과 예약</Button>
          <Button onClick={() => fixture.setRecordRefresh('delayed')}>다음 새로고침 성공 예약</Button>
          <Button onClick={() => fixture.setRecordRefresh('failed')}>다음 새로고침 실패 예약</Button>
        </>}
        {page === 'growth' && <>
          <Button onClick={() => read('growthSearch', 'delayed')}>성장 추적 검색 지연</Button>
          <Button onClick={() => read('growthSearch', 'failed')}>검색 실패</Button>
          <Button onClick={() => read('growthDetails', 'delayed')}>기간 갱신 지연 · 이전 그래프 유지</Button>
          <Button onClick={() => read('growthDetails', 'failed')}>기간·배치 조회 실패</Button>
          <Button onClick={() => { fixture.setRead('growthSearch', 'normal'); read('growthDetails', 'normal') }}>검색·기간 갱신 복구</Button>
        </>}
        {page === 'rest' && <>
          <Button onClick={() => fixture.setWrite('rest', 'failed')}>다음 휴식 설정 저장 실패</Button>
          <Button onClick={() => fixture.setWrite('rest', 'conflict')}>다음 휴식 설정 충돌</Button>
        </>}
        <Button onClick={onBack}>검수 분류로 돌아가기</Button>
      </div>
      {page === 'home' && <p>시작 상태를 선택한 뒤 홈에서 ‘운동 시작’을 눌러 보세요.</p>}
      {page === 'routine' && <p>저장 오류는 편집 화면에서 이름을 바꾸고 저장해 확인해요.</p>}
      {page === 'schedule' && <p>저장 상태를 선택한 뒤 일정 편집 화면에서 요일 배정을 바꾸고 저장하세요. 최신 일정 확인 전 변경사항을 버릴지 선택할 수 있어요.</p>}
      {page === 'growth' && <p>검색 오류는 검색창을 열고, 기간 오류는 운동을 선택한 뒤 기간을 바꿔 확인하세요.</p>}
      {page === 'records' && <p>기록 조회 실패를 선택한 다음 원하는 새로고침 상태를 예약하고 화면의 ‘새로고침’을 누르세요.</p>}
      {page === 'rest' && <p>저장 상태를 선택한 뒤 휴식 시간을 바꾸고 ‘변경 사항 저장’을 누르세요.</p>}
    </details>
    {page === 'home' && <HomePanel scope={scope} routines={state.data?.routines ?? fixture.routines()} api={fixture.api} training={training}
      statistics={fixture.statistics} visit={1} refreshKey={String(revision)} active={null} attempt={homeAttempt} busy={homeBusy}
      localReady issue={homeIssue} action={homeBusy ? homeAttempt ? 'retry' : 'start' : null} onStart={start} onResume={openWorkout} onRetry={() => void start()}
      onNavigate={ignore} onOpen={ignore} onInvalid={ignore} />}
    {(page === 'routine' || page === 'schedule') && <SearchExerciseDetails preview={catalogSamples}>
      <WorkspaceView state={state} controller={controller} api={fixture.api} training={training} enabled activities={activities} routes={routes} />
    </SearchExerciseDetails>}
    {page === 'records' && <RecordFeed key={readsCleared} api={fixture.api} scope={scope} recent={recent} definitions={exercises}
      refreshKey={String(revision)} onOpen={ignore} onInvalid={ignore} onViewAll={() => setRecent(false)} />}
    {page === 'growth' && <GrowthPanel api={fixture.growth} scope={scope} onBack={onBack} onInvalid={ignore} onOpen={ignore} refreshKey={String(revision)} />}
    {page === 'rest' && <RestSettings settings={state.data?.settings} onBack={onBack} onRequest={controller.requestRestSettings} busy={state.busy} review />}
  </>
}
