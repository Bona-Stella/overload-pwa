import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../app/AppShell.tsx'
import type { AppTab } from '../app/types.ts'
import { Dialog } from '../components/Dialog.tsx'
import { HomeView, RoutinePlan } from '../features/home/HomePanel.tsx'
import { activeCardio, activeWeights, dayOfWeek } from '../features/home/model.ts'
import { RecentWorkout } from '../features/home/RecentWorkout.tsx'
import { ScheduleEditor } from '../features/statistics/WeeklySchedulePanel.tsx'
import { PresetHeader, PresetMembership, PresetNavigation } from '../features/workout-online/PresetControls.tsx'
import { PresetOrderEditor } from '../features/workout-online/PresetOrderEditor.tsx'
import { presetNumber } from '../features/workout-online/preset-schedule.ts'
import { RoutineCards } from '../features/workout-online/RoutineCards.tsx'
import { RoutineForm } from '../features/workout-online/RoutineForm.tsx'
import type { Routine } from '../features/workout-online/types.ts'
import { newId } from '../id.ts'
import { changedSchedule, mockScheduleWrite, unassignRoutine } from './preset-mock.ts'
import type { ScheduleCommand } from './preset-mock.ts'
import { mockSaveRoutine } from './routine-mock.ts'
import { activities, exercises, manufacturers, recoveryRoutine, reviewHome, reviewSample, reviewToday, scenarios, scope } from './routine-samples.ts'
import type { ReviewData, Scenario } from './routine-samples.ts'
import { ReviewHeader } from './ReviewHeader.tsx'
import styles from './Review.module.css'
import '../features/workout-online/online.css'

type Editor =
  | { type: 'new' }
  | { type: 'edit' | 'detail'; routine: Routine }
  | { type: 'schedule'; id: string; base: ReviewData['schedule']; priorityId?: string }
  | { type: 'order'; base: ReviewData['schedule'] }
type Modal =
  | { type: 'rename' | 'deletePreset' | 'deleteRoutine' | 'record'; id: string }
  | { type: 'start'; routine: Routine }
type Fault = 'none' | 'network' | 'conflict'

export default function RoutinePreview() {
  const [scenario, setScenario] = useState<Scenario>('normal')
  const [tab, setTab] = useState<AppTab>(() => new URLSearchParams(location.search).get('tab') === 'home' ? 'home' : 'routines')
  const [epoch, setEpoch] = useState(0)
  return <Review key={epoch} scenario={scenario} tab={tab} setTab={setTab} reset={next => { setScenario(next); setEpoch(value => value + 1) }} />
}

function Review({ scenario, tab, setTab, reset }: { scenario: Scenario; tab: AppTab; setTab: (tab: AppTab) => void; reset: (scenario: Scenario) => void }) {
  const [data, setData] = useState(() => reviewSample(scenario))
  const { schedule, routines } = data
  const [viewedId, setViewedId] = useState(schedule.activeId)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [modal, setModal] = useState<Modal | null>(null)
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null)
  const [fault, setFault] = useState<Fault>('none')
  const [issue, setIssue] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [normalView, setNormalView] = useState(false)
  const [homeReady, setHomeReady] = useState(scenario !== 'loading' && scenario !== 'read-error')
  const [homeVisit, setHomeVisit] = useState(0)
  const inFlight = useRef(false)
  const protectedView = scenario === 'active' || scenario === 'completed'
  const deloadView = scenario === 'active' && !normalView
  const viewed = schedule.presets.find(preset => preset.id === viewedId) ?? schedule.presets.find(preset => preset.id === schedule.activeId)!
  const details = new Map(routines.map(r => [r.id, { ...r, weightPlacements: activeWeights(r), cardioPlacements: activeCardio(r) }]))
  const home = reviewHome(data)
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
  const navigate = (next: AppTab) => {
    if (next === 'home' && tab !== 'home') setHomeVisit(visit => visit + 1)
    setIssue(null); setTab(next)
    window.scrollTo(0, 0)
  }
  const openSchedule = (priorityId?: string) => {
    setCreated(null); setIssue(null)
    setEditor({ type: 'schedule', id: viewed.id, base: schedule, priorityId })
  }
  const membership = (id: string) => <PresetMembership presets={schedule.presets} routineId={id} />
  const editPreset = editor?.type === 'schedule' ? editor.base.presets.find(p => p.id === editor.id) : undefined
  const scheduleStale = editor?.type === 'schedule' && (editor.base.version !== schedule.version || editPreset?.version !== schedule.presets.find(p => p.id === editor.id)?.version)
  const modalRecord = modal?.type === 'record' ? data.sessions.find(s => s.id === modal.id) : undefined
  const modalPreset = modal?.type === 'rename' || modal?.type === 'deletePreset' ? schedule.presets.find(p => p.id === modal.id) : undefined

  return <AppShell authenticated tab={tab} focused={!!editor} displayTheme={deloadView ? 'deload' : 'normal'} onNavigate={navigate}>
    <aside className={styles.controls} aria-label="Mock 검토 설정">
      <b>UI 검토 · 합성 데이터</b>
      <small>이 화면의 변경은 탭을 새로고침하면 초기화됩니다. 시연 날짜는 11월 11일입니다.</small>
      <label>검토 상태<select value={scenario} disabled={busy || !!editor || !!modal} onChange={e => reset(e.target.value as Scenario)}>
        {Object.entries(scenarios).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <label>다음 저장 테스트<select value={fault} disabled={busy || protectedView || !!modal} onChange={e => setFault(e.target.value as Fault)}>
        <option value="none">정상</option><option value="network">연결 실패</option><option value="conflict">일정 버전 충돌</option>
      </select></label>
    </aside>
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
        busy={busy} active={null} attempt={false} localReady canStart protectedView={protectedView && !deloadView}
        hideChooser={deloadView || scenario === 'completed'}
        issue={scenario === 'completed' ? '디로딩 완료 당일 · 일반 운동은 다음 날부터 시작할 수 있습니다.'
          : scenario === 'active' ? normalView ? '일반 보기 · 디로딩 기간은 계속 진행 중입니다.' : '회복 주간 · 3일차' : null}
        onRefresh={() => setHomeReady(true)} onNavigate={navigate} onStart={async routine => setModal({ type: 'start', routine })}
        onOpen={id => setModal({ type: 'record', id })} onResume={() => {}} onRetry={() => {}} />
    </div>
    {tab === 'routines' && <>
      {protectedView && <p className="notice" role="status">{scenario === 'completed' ? '디로딩 완료 당일' : '디로딩 진행 중'} · 일반 루틴과 주간 일정은 조회 전용입니다.</p>}
      <div hidden={!!editor}>
        {created && <section className="card stack" aria-label="새 루틴 생성 완료">
          <h2>✓ 새 루틴 생성 완료</h2>
          <div className={styles.createdMessage}><p>“{created.name}” 루틴을 만들었습니다.</p><p>주간 일정에 배정할까요?</p></div>
          <div className={styles.createdActions}><button type="button" className="outline" onClick={() => setCreated(null)}>나중에</button>
            <button type="button" className="primary" onClick={() => openSchedule(created.id)}>배정하기</button></div>
        </section>}
        <RoutineCards summaries={routines} details={details} busy={busy} managementBlocked={protectedView}
          week={{ assignments: viewed.assignments, version: viewed.version }}
          presetHeader={viewToggle => <PresetHeader schedule={schedule} viewed={viewed} busy={busy} readOnly={protectedView} viewToggle={viewToggle}
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
      {editor?.type === 'schedule' && editPreset && <ScheduleEditor key={editor.id + ':' + editor.base.version + ':' + editPreset.version} state={editPreset} routines={routines} busy={busy} readOnly={protectedView}
          preset={{ priorityId: editor.priorityId, active: editor.id === schedule.activeId, stale: scheduleStale, controls: leave => <>
            <label>편집할 주간 일정<select aria-label="편집할 주간 일정" value={editor.id} disabled={busy} onChange={event => {
              const nextId = event.target.value
              leave(() => { setIssue(null); setEditor({ ...editor, id: nextId, base: schedule }) })
            }}>{schedule.presets.map((p, index) => <option value={p.id} key={p.id}>{presetNumber(index)} · {p.name}</option>)}</select></label>
            {scheduleStale && <button type="button" className="outline" onClick={() => leave(() => { setIssue(null); setEditor({ ...editor, base: schedule }) })}>최신 일정 다시 열기</button>}
          </> }}
          onCancel={closeEditor} onSave={async assignments => {
            if (await scheduleWrite({ type: 'assign', id: editor.id, version: editPreset.version, assignments }, editor.base)) { setViewedId(editor.id); closeEditor() }
          }} />}
      {editor?.type === 'order' && <PresetOrderEditor key={editor.base.version} schedule={editor.base} stale={editor.base.version !== schedule.version}
        busy={busy} readOnly={protectedView} routineName={routineName} onClose={closeEditor}
        onReload={() => { setIssue(null); setEditor({ type: 'order', base: schedule }) }}
        onSave={async entries => { if (await scheduleWrite({ type: 'rotate', enabled: schedule.autoEnabled, entries }, editor.base)) closeEditor() }} />}
      {editor && (editor.type === 'new' || editor.type === 'edit' || editor.type === 'detail') && <RoutineForm
        key={editor.type} routine={editor.type === 'new' ? null : editor.routine} readOnly={editor.type === 'detail'}
        saveDescription="검토용 루틴을 저장합니다. 기존 배치의 승인 중량은 명시적으로 선택한 경우에만 변경됩니다."
        generation={scope.dataGeneration} exercises={exercises} manufacturers={manufacturers} activities={activities} busy={busy}
        managementBlocked={protectedView} assignments={editor.type !== 'new' && membership(editor.routine.id)}
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
        onClose={closeEditor} onSaved={editor.type === 'new' ? (id, name) => setCreated({ id, name }) : undefined}
        onEdit={editor.type === 'detail' ? () => setEditor({ ...editor, type: 'edit' }) : undefined}
        onDelete={editor.type === 'detail' ? () => setModal({ type: 'deleteRoutine', id: editor.routine.id }) : undefined} />}
    </>}
    {tab === 'history' && <section className="stack"><h2>최근 운동</h2>
      {!home.recentRows.length && <p>표시할 운동 기록이 없습니다.</p>}
      {home.recentRows.map(row => <RecentWorkout key={row.id} row={row} detail={home.recent.get(row.id)} onOpen={id => setModal({ type: 'record', id })} />)}
    </section>}
    {tab === 'settings' && <p className="notice">상단에서 홈·루틴 검토 상태를 선택할 수 있습니다.</p>}
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
    {modal?.type === 'start' && <Dialog title="운동 시작 미리보기" onClose={() => setModal(null)}>
      <h3>{modal.routine.name}</h3><RoutinePlan routine={modal.routine} /><p>Mock에서 운동 계획을 확인합니다.</p>
    </Dialog>}
    {modalRecord && <Dialog title="운동 기록 상세" onClose={() => setModal(null)}>
      <p>{modalRecord.workoutDate} · {modalRecord.initialPlan.routineName}</p>
      <h3>WEIGHT</h3>
      {modalRecord.initialPlan.weightExercises.map(p => <p key={p.sessionExerciseId}>{p.exerciseName} · {modalRecord.snapshot.state.performedSets.filter(s => s.sessionExerciseId === p.sessionExerciseId).length}/{p.setCount}세트</p>)}
      <h3>CARDIO</h3>
      {modalRecord.initialPlan.cardioActivities.map(p => <p key={p.sessionActivityId}>{p.plan.name} · 목표 {p.plan.targetSeconds / 60}분</p>)}
    </Dialog>}
  </AppShell>
}
