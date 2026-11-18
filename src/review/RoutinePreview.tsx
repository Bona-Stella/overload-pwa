import {SearchExerciseDetails} from '../components/SearchExerciseDetails.tsx'
import {catalogSamples} from './catalog-samples.ts'
import { CombinationMemoProvider } from '../features/workout-online/CombinationMemo.tsx'
import { reviewRecordSession } from './record-data.ts'
import { hasActualPerformance } from '../features/home/achievement.ts'
import { RecordPreview } from './RecordPreview.tsx'
import { useScreenHistory, useNavigationGuard, navigateTabRoot } from '../app/navigation.ts'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell } from '../app/AppShell.tsx'
import type { AppTab } from '../app/types.ts'
import { Dialog } from '../components/Dialog.tsx'
import { Button } from '../components/ui.tsx'
import { HomeView } from '../features/home/HomePanel.tsx'
import { activeCardio, activeWeights, dayOfWeek } from '../features/home/model.ts'
import { PresetAssignmentEditor } from '../features/statistics/WeeklySchedulePanel.tsx'
import { PresetHeader, PresetMembership, PresetNavigation, RoutineCreatedNotice } from '../features/workout-online/PresetControls.tsx'
import { PresetOrderEditor } from '../features/workout-online/PresetOrderEditor.tsx'
import { RoutineCards } from '../features/workout-online/RoutineCards.tsx'
import { RoutineDetail } from '../features/workout-online/RoutineDetail.tsx'
import { RoutineForm } from '../features/workout-online/RoutineForm.tsx'
import type { Routine } from '../features/workout-online/types.ts'
import { defaultRestAlerts } from '../features/workout-flow/rest-alerts.ts'
import { newId } from '../id.ts'
import { changedSchedule, mockScheduleWrite, unassignRoutine } from './preset-mock.ts'
import type { ScheduleCommand } from './preset-mock.ts'
import { mockSaveRoutine } from './routine-mock.ts'
import { activities, exercises, manufacturers, recoveryRoutine, reviewHome, reviewSample, reviewToday, scenarios, scope } from './routine-samples.ts'
import type { ReviewData, Scenario } from './routine-samples.ts'
import { ReviewHeader } from './ReviewHeader.tsx'
import { SettingsReview } from './SettingsReview.tsx'
import { WorkoutReview } from './WorkoutReview.tsx'
import { WorkoutRecordReview } from './WorkoutRecordReview.tsx'
import { WorkoutResumeDetails } from './WorkoutResumeDetails.tsx'
import { useRestAudio } from './useRestAudio.ts'
import { captureReview, startReview } from './workout-model.ts'
import type { ReviewRecord, ReviewSession } from './workout-model.ts'
import { completedReview, editedSession, workoutSample, workoutScenarios } from './workout-samples.ts'
import type { WorkoutScenario } from './workout-samples.ts'
import styles from './Review.module.css'
import '../features/workout-online/online.css'

type Editor =
  | { type: 'new' }
  | { type: 'edit' | 'detail'; routine: Routine }
  | { type: 'schedule'; id: string; base: ReviewData['schedule']; priorityId?: string }
  | { type: 'order'; base: ReviewData['schedule'] }
type Modal = { type: 'rename' | 'deletePreset' | 'deleteRoutine' | 'record'; id: string }
type Fault = 'none' | 'network' | 'conflict'
type ReviewScenario = Scenario | WorkoutScenario
const isWorkoutScenario = (scenario: ReviewScenario): scenario is WorkoutScenario => Object.hasOwn(workoutScenarios, scenario)

export default function RoutinePreview() {
  const [scenario, setScenario] = useState<ReviewScenario>(() =>
    new URLSearchParams(location.search).get('review') === 'approval' ? 'workout-complete' : new URLSearchParams(location.search).get('review') === 'workout' ? 'workout-mixed' : 'normal')
  const [initialTab] = useState<AppTab>(() => {
    const requested = new URLSearchParams(location.search).get('tab')
    return requested === 'home' || requested === 'settings' || requested === 'history' ? requested : 'routines'
  })
  const [tab] = useScreenHistory<AppTab>('review-tab', initialTab)
  const [epoch, setEpoch] = useState(0)
  return <CombinationMemoProvider key={epoch}><Review key={epoch} scenario={scenario} tab={tab} reset={next => { setScenario(next); setEpoch(value => value + 1) }} /></CombinationMemoProvider>
}

function ReviewShell({children,...props}:React.ComponentProps<typeof AppShell>){return <AppShell {...props}><SearchExerciseDetails preview={catalogSamples}>{children}</SearchExerciseDetails></AppShell>}

function Review({ scenario, tab, reset }: { scenario: ReviewScenario; tab: AppTab; reset: (scenario: ReviewScenario) => void }) {
  const [data, setData] = useState(() => isWorkoutScenario(scenario) ? workoutSample(scenario) : reviewSample(scenario))
  const { schedule, routines } = data
  const [viewedId, setViewedId] = useState(schedule.activeId)
  const [planPreset] = useScreenHistory<string|null>('routine-plan:review',null)
  const [editorRoute,setEditorRoute]=useScreenHistory<{type:Editor['type'];id?:string}|null>('routine-editor:review',null)
  const [editorData,setEditorData]=useState<Editor|null>(null)
  const editor:Editor|null=(()=>{
    if(!editorRoute)return null
    const id=editorData&&('routine' in editorData?editorData.routine.id:'id' in editorData?editorData.id:undefined)
    if(editorData?.type===editorRoute.type&&id===editorRoute.id)return editorData
    if(editorRoute.type==='new')return {type:'new'}
    if(editorRoute.type==='order')return {type:'order',base:schedule}
    if(editorRoute.type==='schedule')return {type:'schedule',id:editorRoute.id??schedule.activeId,base:schedule}
    const routine=routines.find(r=>r.id===editorRoute.id)
    return routine?{type:editorRoute.type,routine}:null
  })()
  const setEditor=(next:Editor|null)=>{
    setEditorData(next)
    setEditorRoute(next?{type:next.type,...('routine' in next?{id:next.routine.id}:'id' in next?{id:next.id}:{})}:null,next===null)
  }
  const [modal, setModal] = useState<Modal | null>(null)
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null)
  const [fault, setFault] = useState<Fault>('none')
  const [issue, setIssue] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [normalView, setNormalView] = useState(false)
  const [homeReady, setHomeReady] = useState(scenario !== 'loading' && scenario !== 'read-error')
  const [homeVisit, setHomeVisit] = useState(0)
  const [session, setSession] = useState<ReviewSession | null>(() => scenario === 'workout-edited' ? editedSession(data) : null)
  const [workoutOpen, setWorkoutOpen] = useState(false)
  const [hiddenRecommendations,setHiddenRecommendations]=useState<Set<string>>(()=>new Set())
  const [records, setRecords] = useState<ReviewRecord[]>(()=>scenario==='workout-complete'?[completedReview(data)]:[])
  const [recordId, setRecordId] = useState<string | null>(()=>records[0]?.session.id??null)
  const [immediateSummary,setImmediateSummary]=useState(scenario==='workout-complete')
  const [alerts, setAlerts] = useState(defaultRestAlerts)
  const audio = useRestAudio(alerts.sound, alerts.volume)
  const [shortRest, setShortRest] = useState(() => isWorkoutScenario(scenario) || scenario === 'active')
  const inFlight = useRef(false)
  const restExit = useRef<(() => boolean) | null>(null)
  const registerRestExit = useCallback((guard: (() => boolean) | null) => { restExit.current = guard }, [])
  useNavigationGuard(useCallback(() => restExit.current?.() ?? true, []))
  const protectedView = scenario === 'active' || scenario === 'completed'
  const deloadView = scenario === 'active' && !normalView
  const viewed = schedule.presets.find(preset => preset.id === viewedId) ?? schedule.presets.find(preset => preset.id === schedule.activeId)!
  const details = new Map(routines.map(r => [r.id, { ...r, weightPlacements: activeWeights(r), cardioPlacements: activeCardio(r) }]))
  const home = reviewHome(data)
  if(records.length){
    const extra=records.map(reviewRecordSession),details=new Map([...home.recent,...extra.map(s=>[s.id,s] as const)])
    const rows=[...new Map([...home.recentRows,...extra.map(s=>({...s,routineName:s.initialPlan.routineName,status:'FINISHED' as const,closedAt:s.closedAt!}))].map(r=>[r.id,r])).values()]
      .filter(r=>!r.deletedAt&&(!details.has(r.id)||hasActualPerformance(details.get(r.id)!)))
      .toSorted((a,b)=>(b.endedAt??b.closedAt).localeCompare(a.endedAt??a.closedAt)||b.id.localeCompare(a.id)).slice(0,3)
    home.recentRows=rows;home.recent=new Map(rows.flatMap(r=>details.has(r.id)?[[r.id,details.get(r.id)!] as const]:[]))
  }
  const recoveryHome = deloadView ? reviewHome({ ...data, sessions: [], pastPreset: null, routines: [recoveryRoutine],
    schedule: { ...schedule, presets: [{ ...viewed, id: schedule.activeId, assignments: [{ dayOfWeek: dayOfWeek(reviewToday), routineId: recoveryRoutine.id }] }] },
  }) : null
  const routineName = (id: string) => details.get(id)?.name ?? '루틴 확인 필요'
  useEffect(() => {
    if (scenario !== 'loading') return
    const timer = window.setTimeout(() => setHomeReady(true), 1600)
    return () => window.clearTimeout(timer)
  }, [scenario])

  async function write(change: () => ReviewData) {
    if (inFlight.current || protectedView) return false
    inFlight.current = true
    setBusy(true); setIssue(null)
    try {
      await new Promise(resolve => window.setTimeout(resolve, 200))
      setFault('none')
      if (fault === 'network') throw Error('연결이 끊겼습니다. 변경 초안을 유지했습니다. 다시 시도해 주세요.')
      if (fault === 'conflict') {
        setData({ ...data, schedule: changedSchedule(schedule) })
        throw Error('다른 변경으로 일정 버전이 달라졌습니다. 최신 상태를 확인한 뒤 다시 시도해 주세요.')
      }
      setData(change())
      return true
    } catch (error) {
      setIssue(error instanceof Error ? error.message : '변경을 저장하지 못했습니다.')
      return false
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  async function scheduleWrite(command: ScheduleCommand, base = schedule) {
    return write(() => {
      const next = mockScheduleWrite(schedule, base.version, command, protectedView)
      const applied = data.applied || command.type === 'activate' || command.type === 'rotate' && command.enabled ||
        command.type === 'assign' && command.id === schedule.activeId
      return { ...data, schedule: !data.applied && applied && next.version === schedule.version ? changedSchedule(next) : next, applied }
    })
  }

  useEffect(() => { window.scrollTo(0, 0) }, [editor?.type])

  const closeEditor = () => { setEditor(null); setIssue(null) }
  const navigate = (next: AppTab, target?:'history') => {
    if (restExit.current?.() === false) return
    if (next === 'home' && tab !== 'home') setHomeVisit(visit => visit + 1)
    setIssue(null); setRecordId(null); setImmediateSummary(false); setEditor(null); navigateTabRoot('review-tab', next,target?{['records:'+scope.userId+':'+scope.dataGeneration]:target}:{})
    window.scrollTo(0, 0)
  }
  const openSchedule = (priorityId?: string) => {
    setCreated(null); setIssue(null)
    setEditor({ type: 'schedule', id: viewed.id, base: schedule, priorityId })
  }
  const membership = (id: string) => <PresetMembership presets={schedule.presets} routineId={id} />
  const editPreset = editor?.type === 'schedule' ? editor.base.presets.find(p => p.id === editor.id) : undefined
  const modalRecord = modal?.type === 'record' ? data.sessions.find(s => s.id === modal.id) : undefined
  const modalPreset = modal?.type === 'rename' || modal?.type === 'deletePreset' ? schedule.presets.find(p => p.id === modal.id) : undefined
  const reviewRecord = records.find(record => record.session.id === recordId)

  const start = async (routine: Routine) => {
    try {
      setSession(startReview(routine, deloadView, Date.now(), data.sessions))
      audio.unlock()
      setWorkoutOpen(true); setIssue(null); window.scrollTo(0, 0)
    } catch (error) { setIssue(error instanceof Error ? error.message : '검토용 운동을 시작할 수 없습니다.') }
  }

  if (workoutOpen && session) return <ReviewShell authenticated tab="home" focused displayTheme={session.deload ? 'deload' : 'normal'} onNavigate={navigate}>
    <WorkoutReview hiddenRecommendations={hiddenRecommendations} onDismissRecommendation={key=>setHiddenRecommendations(ids=>new Set(ids).add(key))} records={records} session={session} onChange={setSession} history={data.sessions} alerts={alerts} shortRest={shortRest} audio={audio}
      onHome={() => { setWorkoutOpen(false); navigate('home') }}
      onEnd={endedAt => {
        setRecords(previous => [captureReview(session,endedAt,reviewToday), ...previous]); setSession(null); setWorkoutOpen(false)
        navigate('history'); setRecordId(session.id); setImmediateSummary(true)
      }} />
  </ReviewShell>

  if (tab === 'history' && reviewRecord) return <ReviewShell authenticated tab={tab} onNavigate={navigate}
    displayTheme={reviewRecord.session.deload ? 'deload' : 'normal'}>
    <WorkoutRecordReview onPreviewApprove={async choices=>{setRecords(previous=>previous.map(r=>r.session.id!==reviewRecord.session.id?r:{...r,judgments:r.judgments?.map(w=>{const choice=choices.find(c=>c.id===w.id);return choice&&w.review?{...w,review:{...w.review,previewApproval:{nextWeightKg:choice.nextKg,occurredAt:new Date().toISOString()}}}:w})}));return true}} detail={!immediateSummary} record={reviewRecord} onBack={() => navigate(immediateSummary?'home':'history')} />
  </ReviewShell>

  return <ReviewShell authenticated tab={tab} focused={!!editor} displayTheme={tab !== 'settings' && deloadView ? 'deload' : 'normal'} onNavigate={navigate}>
    {tab !== 'settings' && <aside className={styles.controls + (tab === 'history' ? ' record-review-banner' : '')} aria-label="Mock 검토 설정">
      <b>UI 검토 · 합성 데이터</b>
      <small>이 화면의 변경은 탭을 새로고침하면 초기화됩니다. 시연 날짜는 {reviewToday}입니다.</small>
      <label>검토 상태<select value={scenario} disabled={busy || !!editor || !!modal} onChange={e => reset(e.target.value as ReviewScenario)}>
        <optgroup label="운동하기">{Object.entries(workoutScenarios).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</optgroup>
        <optgroup label="홈·루틴">{Object.entries(scenarios).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</optgroup>
      </select></label>
      <label>다음 저장 테스트<select value={fault} disabled={busy || protectedView || !!modal} onChange={e => setFault(e.target.value as Fault)}>
        <option value="none">정상</option><option value="network">연결 실패</option><option value="conflict">일정 버전 충돌</option>
      </select></label>
      {tab === 'home' && <label>휴식 검토<select value={shortRest ? 'short' : 'actual'} onChange={event => setShortRest(event.target.value === 'short')}>
        <option value="short">12초 · 종료 알림 시연</option><option value="actual">반복 목표별 180 / 120 / 90초</option>
      </select></label>}
      {tab === 'home' && <Button disabled={busy || !!modal} onClick={() => reset(scenario)}>검토 초기화</Button>}
    </aside>}
    {issue && <p className="notice error" role="alert">{issue}</p>}
    {busy && <p className="notice" role="status">Mock 응답을 확인하고 있습니다…</p>}
    <div hidden={tab !== 'home' || !!editor}>
      <HomeView data={homeReady ? recoveryHome ?? home : null} today={reviewToday} loading={scenario === 'loading' && !homeReady}
        header={scenario === 'active' ? <ReviewHeader period="active" /> : scenario === 'completed' ? <ReviewHeader period="completed" /> : <ReviewHeader
          analysisOn={scenario !== 'analysis-off'} initial={scenario === 'empty' || scenario === 'unassigned'}
          unconfirmed={homeReady ? undefined : scenario === 'loading' ? '분석 확인 중' : '분석 미확인'} />}
        headerActions={scenario === 'active' && <button type="button" className="outline full" onClick={() => setNormalView(value => !value)}>{normalView ? '디로딩 복귀' : '일반 보기'}</button>}
        todayNotice={scenario === 'completed' ? '오늘은 회복 마무리' : undefined}
        presetFilter={{ presets: schedule.presets, activeId: schedule.activeId, visit: homeVisit }}
        busy={busy} active={session} attempt={false} localReady canStart protectedView={protectedView && !deloadView}
        resumeDetails={session && tab === 'home' && <WorkoutResumeDetails session={session} />}
        hideChooser={deloadView || scenario === 'completed'}
        issue={scenario === 'completed' ? '디로딩 완료 당일 · 일반 운동은 다음 날부터 시작할 수 있습니다.'
          : scenario === 'active' ? normalView ? '일반 보기 · 디로딩 기간은 계속 진행 중입니다.' : '회복 주간 · 3일차' : null}
        onRefresh={() => setHomeReady(true)} onHistory={()=>navigate('history','history')} onNavigate={navigate} onStart={start}
        onOpen={id => setModal({ type: 'record', id })} onResume={() => { audio.unlock(); setWorkoutOpen(true); window.scrollTo(0, 0) }} onRetry={() => {}} />
    </div>
    {tab === 'routines' && <>
      {protectedView && <p className="notice" role="status">{scenario === 'completed' ? '디로딩 완료 당일' : '디로딩 진행 중'} · 일반 루틴과 주간 일정은 조회 전용입니다.</p>}
      <div hidden={!!editor}>
        {created && <RoutineCreatedNotice name={created.name} onLater={() => setCreated(null)} onAssign={() => openSchedule(created.id)} />}
        <RoutineCards summaries={routines} details={details} busy={busy} managementBlocked={protectedView}
          week={{ assignments: viewed.assignments, version: viewed.version }}
          presetHeader={viewToggle => <PresetHeader schedule={schedule} viewed={viewed} busy={busy} readOnly={protectedView} viewToggle={viewToggle}
            onPlan={() => { navigateTabRoot('review-tab','history',{'routine-plan:review':viewed.id}); window.scrollTo(0,0) }}
            onActivate={() => void scheduleWrite({ type: 'activate', id: viewed.id })}
            onToggle={() => void scheduleWrite({ type: 'rotate', enabled: !schedule.autoEnabled, entries: schedule.presets })}
            onRename={() => setModal({ type: 'rename', id: viewed.id })}
            onOrganize={() => { setIssue(null); setEditor({ type: 'order', base: schedule }) }}
            onDelete={() => setModal({ type: 'deletePreset', id: viewed.id })} />}
          schedule={<button type="button" className="outline full" disabled={busy || protectedView} onClick={() => openSchedule()}>주간 일정 편집</button>}
          presetNavigation={<PresetNavigation schedule={schedule} viewed={viewed} busy={busy} readOnly={protectedView}
            onView={id => { setViewedId(id); setIssue(null) }}
            onAdd={async () => { const id = newId(); if (await scheduleWrite({ type: 'add', id })) setViewedId(id) }} />}
          presetAssignments={membership}
          onNew={() => { setCreated(null); setIssue(null); setEditor({ type: 'new' }) }}
          onSelect={id => { setIssue(null); setEditor({ type: 'detail', routine: details.get(id)! }) }}
          onEdit={id => { setIssue(null); setEditor({ type: 'edit', routine: details.get(id)! }) }}
          onDelete={id => setModal({ type: 'deleteRoutine', id })} />
      </div>
      {editor?.type === 'schedule' && editPreset && <PresetAssignmentEditor base={editor.base} current={schedule} id={editor.id}
        priorityId={editor.priorityId} routines={routines} busy={busy} readOnly={protectedView}
        onSelect={id => { setIssue(null); setEditor({ ...editor, id, base: schedule }) }}
        onReload={() => { setIssue(null); setEditor({ ...editor, base: schedule }) }}
        onClose={closeEditor} onSave={async assignments => {
          if (await scheduleWrite({ type: 'assign', id: editor.id, version: editPreset.version, assignments }, editor.base)) { setViewedId(editor.id); closeEditor() }
        }} />}
      {editor?.type === 'order' && <PresetOrderEditor key={editor.base.version} schedule={editor.base} stale={editor.base.version !== schedule.version}
        busy={busy} readOnly={protectedView} routineName={routineName} onClose={closeEditor}
        onReload={() => { setIssue(null); setEditor({ type: 'order', base: schedule }) }}
        onSave={async entries => { if (await scheduleWrite({ type: 'rotate', enabled: schedule.autoEnabled, entries }, editor.base)) closeEditor() }} />}
      {editor?.type === 'detail' && <RoutineDetail routine={editor.routine} exercises={exercises} activities={activities} manufacturers={manufacturers}
        presets={schedule.presets} managementBlocked={busy || protectedView} onBack={closeEditor}
        onEdit={() => setEditor({ ...editor, type: 'edit' })}
        onDelete={() => setModal({ type: 'deleteRoutine', id: editor.routine.id })} />}
      {editor && (editor.type === 'new' || editor.type === 'edit') && <RoutineForm
        key={editor.type} routine={editor.type === 'new' ? null : editor.routine}
        generation={scope.dataGeneration} exercises={exercises} manufacturers={manufacturers} activities={activities} busy={busy}
        managementBlocked={protectedView}
        controller={{
          saveRoutine: (body, id) => write(() => {
            const saved = mockSaveRoutine(body, routines.find(r => r.id === id))
            return { ...data, routines: [...routines.filter(r => r.id !== saved.id), saved] }
          }),
          removedRoutine: async () => {
            if (editor.type !== 'edit') return null
            const saved = routines.find(r => r.id === editor.routine.id)
            return saved ? { ...saved, weightPlacements: saved.weightPlacements.filter(p => p.deletedAt), cardioPlacements: saved.cardioPlacements.filter(p => p.deletedAt) } : null
          },
          invalidateScope: () => {},
        }}
        onClose={closeEditor} onSaved={editor.type === 'new' ? (id, name) => setCreated({ id, name }) : undefined} />}
    </>}
    {tab === 'history' && <RecordPreview days={home.overview.plannedDays} initialPreset={planPreset??undefined} routines={routines} schedule={schedule} sessions={data.sessions} records={records} onReviewRecord={id=>{setImmediateSummary(false);setRecordId(id);window.scrollTo(0,0)}} />}
    {tab === 'settings' && <SettingsReview alerts={alerts} onAlerts={setAlerts} onRestExitGuard={registerRestExit} takeRestSaveFailure={() => {
      if (fault !== 'network') return false
      setFault('none')
      return true
    }} />}
    {modal?.type === 'rename' && modalPreset && <Dialog title="주간 일정 이름 변경" onClose={() => !busy && setModal(null)}>
      <form className="stack" onSubmit={async event => {
        event.preventDefault()
        const name = String(new FormData(event.currentTarget).get('name')).trim()
        if (!name) { setIssue('주간 일정 이름을 입력해 주세요.'); return }
        if (await scheduleWrite({ type: 'rename', id: modal.id, name })) setModal(null)
      }}><label>일정 이름<input name="name" defaultValue={modalPreset.name} required maxLength={80} disabled={busy} /></label>
        {issue && <p role="alert">{issue}</p>}<button className="primary" disabled={busy}>이름 저장</button>
      </form>
    </Dialog>}
    {modal?.type === 'deletePreset' && modalPreset && <Dialog title="주간 일정 삭제" onClose={() => !busy && setModal(null)}>
      <p>“{modalPreset.name}” 일정을 삭제할까요? 이 일정에 저장된 요일 배정이 사라집니다.</p>
      {issue && <p role="alert">{issue}</p>}
      <div className="row"><button type="button" disabled={busy} onClick={() => setModal(null)}>취소</button>
        <button type="button" className="danger" disabled={busy} onClick={async () => {
          if (await scheduleWrite({ type: 'delete', id: modal.id })) setModal(null)
        }}>일정 삭제</button></div>
    </Dialog>}
    {modal?.type === 'deleteRoutine' && <Dialog title="루틴 삭제" onClose={() => !busy && setModal(null)}>
      <p>“{routineName(modal.id)}” 루틴을 삭제하면 모든 주간 일정에서 배정이 해제됩니다. 과거 운동 기록과 당시 계획은 보존됩니다.</p>
      {issue && <p role="alert">{issue}</p>}
      <div className="row"><button type="button" disabled={busy} onClick={() => setModal(null)}>취소</button>
        <button type="button" className="danger" disabled={busy || protectedView} onClick={async () => {
          if (await write(() => ({ ...data, routines: routines.filter(r => r.id !== modal.id), schedule: unassignRoutine(schedule, modal.id) }))) {
            if (created?.id === modal.id) setCreated(null)
            setModal(null); closeEditor()
          }
        }}>루틴 삭제</button></div>
    </Dialog>}
    {modalRecord && <Dialog title="운동 기록 상세" onClose={() => setModal(null)}>
      <p>{modalRecord.workoutDate} · {modalRecord.initialPlan.routineName}</p>
      <h3>WEIGHT</h3>
      {modalRecord.initialPlan.weightExercises.map(p => <p key={p.sessionExerciseId}>{p.exerciseName} · {modalRecord.snapshot.state.performedSets.filter(s => s.sessionExerciseId === p.sessionExerciseId).length}/{p.setCount}세트</p>)}
      <h3>CARDIO</h3>
      {modalRecord.initialPlan.cardioActivities.map(p => <p key={p.sessionActivityId}>{p.plan.name} · 목표 {p.plan.targetSeconds / 60}분</p>)}
    </Dialog>}
  </ReviewShell>
}
