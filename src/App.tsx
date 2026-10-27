import { useEffect, useState } from 'react'
import { RoutineEditor } from './features/routine/RoutineEditor'
import { RoutineSelectionBadge } from './features/routine/RoutineSelectionBadge'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { SessionDetail } from './features/history/SessionDetail'
import { CurrentWeightReview, ProgressChangeHistory } from './features/history/ProgressionHistory'
import { WorkoutScreen } from './features/workout/WorkoutScreen'
import { ResumeWorkoutCard } from './features/workout/ResumeWorkoutCard'
import { DAYS, WEEKDAY_ORDER, completionCounts, deleteRoutine, finishWorkout, formatDuration, hasIncompleteSets, localDate, newId, saveRoutine, scheduleConflicts, selectRoutine, startWorkout, summary } from './features/workout/model'
import { useWorkout } from './features/workout/useWorkout'
import type { Routine, WorkoutState } from './features/workout/types'
import './App.css'
import { Dialog } from './components/Dialog'
import { cardioCounts, reviewCardio } from './features/workout/cardio'
import { beginWorking, navigateExercise } from './features/workout/model'
import { CardioPlanSummary } from './features/workout/CardioPlanSummary'

type Screen = 'home' | 'routines' | 'history' | 'settings' | 'workout'

function App() {
  const { state, update, error: storageError, blocked, retry, retryLabel } = useWorkout()
  const [screen, setScreen] = useState<Screen>('home')
  const [now, setNow] = useState(() => Date.now())
  const [override, setOverride] = useState<{ date: string; id: string } | null>(null)
  const [editor, setEditor] = useState<Routine | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    const refresh = () => setNow(Date.now())
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(interval); window.removeEventListener('pageshow', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    // Safari may keep the layout viewport tall while its keyboard covers the bottom.
    const resize = () => document.documentElement.style.setProperty('--keyboard-inset', `${Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)}px`)
    resize()
    viewport.addEventListener('resize', resize)
    viewport.addEventListener('scroll', resize)
    return () => {
      viewport.removeEventListener('resize', resize)
      viewport.removeEventListener('scroll', resize)
      document.documentElement.style.removeProperty('--keyboard-inset')
    }
  }, [])
  function run(transform: (s: WorkoutState) => WorkoutState): boolean {
    try { setMessage(null); return update(transform) }
    catch (error) { setMessage(error instanceof Error ? error.message : '입력을 확인하고 다시 시도해 주세요.'); return false }
  }
  function navigate(next: Screen) { setScreen(next); setEditor(null); setDetailId(null); setMessage(null); window.scrollTo(0, 0) }
  function createDefinition(name: string): string {
    const existing = state.definitions.find(d => d.name.toLocaleLowerCase() === name.toLocaleLowerCase())
    if (existing) return existing.id
    const id = newId()
    return run(s => ({ ...s, definitions: [...s.definitions, { id, name }] })) ? id : ''
  }
  function save(routine: Routine, days: number[], progressWeights: Record<string, number>) {
    const conflicts = scheduleConflicts(state, routine.id, days)
    if (conflicts.length && !window.confirm(`${conflicts.map(d => DAYS[d]).join('·')}요일에 지정된 루틴을 이 루틴으로 교체할까요?`)) return
    if (run(s => saveRoutine(s, routine, days, conflicts.length > 0, progressWeights))) setEditor(null)
  }
  function finish() {
    if (!state.active) return
    if (state.active.cardio?.some(a => !['completed', 'skipped'].includes(a.status))) { setFinishOpen(true); return }
    if (hasIncompleteSets(state.active) && !window.confirm('미완료 세트가 남아 있습니다. 완료한 본세트만 기록하고 운동을 종료할까요?')) return
    finishConfirmed()
  }
  function finishConfirmed() {
    if (!state.active) return
    const id = state.active.id
    if (run(s => finishWorkout(s, Date.now(), true))) { setFinishOpen(false); navigate('history'); setDetailId(id) }
  }
  const today = new Date(now)
  const date = localDate(today)
  const defaultRoutine = selectRoutine(state, today)
  const routine = selectRoutine(state, today, override?.date === date ? override.id : undefined)
  const detail = state.history.find(s => s.id === detailId)
  const workout = screen === 'workout' && state.active !== null
  const totalSets = routine?.exercises.reduce((sum, e) => sum + e.setCount, 0) ?? 0
  return <div className={`app-shell ${workout ? 'in-workout' : ''}`}>
    <main className={workout ? 'workout-main' : 'page'}>
      {(storageError || message) && <div className="notice error global-notice" role="alert"><p>{storageError ?? message}</p>{storageError && !blocked && <button className="outline" onClick={retry}>{retryLabel}</button>}</div>}
      <fieldset className="app-controls" disabled={blocked}>
      {workout ? <WorkoutScreen state={state} now={now} onUpdate={run} onExit={() => navigate('home')} onFinish={finish} onCreate={createDefinition} /> : editor ? <RoutineEditor key={editor.id} state={state} routine={editor} onSave={save} onCancel={() => setEditor(null)} onCreate={createDefinition} /> : screen === 'settings' ? <SettingsScreen settings={state.restSettings} onSave={settings => run(s => ({ ...s, restSettings: settings }))} /> : screen === 'routines' ? <>
        <div className="section-heading"><div><p className="eyebrow">YOUR TRAINING PLAN</p><h1>나의 루틴</h1></div><button className="primary" onClick={() => setEditor({ id: newId(), name: '', exercises: [] })}>＋ 새 루틴</button></div>
        <p className="muted intro">다음 운동을 위한 준비. 나에게 맞는 순서로.</p>
        {!state.routines.length && <section className="card empty">아직 루틴이 없습니다. 첫 루틴을 만들어 보세요.</section>}
        {state.routines.map((r, i) => <section key={r.id} className="card routine-card"><p className="eyebrow">ROUTINE {String(i + 1).padStart(2, '0')}</p><h2>{r.name}</h2><p className="muted small">{Object.entries(state.schedule).filter(([, id]) => id === r.id).map(([d]) => DAYS[Number(d)]).join(' · ') || '요일 미지정'} · 웨이트 {r.exercises.length}종목 · {r.exercises.reduce((sum, e) => sum + e.setCount, 0)}본세트 · 유산소 {r.cardio?.length ?? 0}종목</p><p className="routine-names">{[...r.exercises.map(e => state.definitions.find(d => d.id === e.exerciseId)?.name), ...(r.cardio ?? []).map(a => a.name)].join(' / ')}</p><div className="row"><button className="outline" onClick={() => setEditor(r)}>편집</button><button className="quiet danger" onClick={() => { if (window.confirm(`“${r.name}” 루틴을 삭제할까요? 과거 기록과 진행 중 운동은 유지됩니다.`)) run(s => deleteRoutine(s, r.id)) }}>삭제</button></div></section>)}
      </> : screen === 'history' ? detail ? <><button className="quiet" onClick={() => setDetailId(null)}>‹ 기록 목록</button><SessionDetail session={detail} saved={!storageError} /></> : <>
        <p className="eyebrow">EVERY SESSION COUNTS</p><h1>쌓여가는 기록</h1><p className="muted intro">완료한 세트 그대로, 당신의 운동 이력.</p>
        {!state.history.length && !state.progressChanges?.length && <section className="card empty"><span aria-hidden="true">↗</span><h2>첫 기록을 기다리고 있어요.</h2><p>홈에서 운동을 시작해 보세요.</p></section>}
        {state.history.map(s => { const result = summary(s, now); const completion = completionCounts(s); return <button className="card history-card" key={s.id} onClick={() => setDetailId(s.id)}><span className="muted small">{s.date}</span><strong>{s.routineName}</strong><span className="muted">완료 {result.sets}{completion.total === null ? '' : `/${completion.total}`} 본세트 · {result.volume.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} kg · {formatDuration(result.elapsed)}</span><span className="muted small">유산소 완료 {cardioCounts(s).completed}/{cardioCounts(s).total} 종목{!completion.allComplete && ' · 부분 운동'}</span><span className="history-arrow" aria-hidden="true">↗</span></button> })}
        <CurrentWeightReview state={state} /><ProgressChangeHistory state={state} />
      </> : <>
        {state.active && <ResumeWorkoutCard session={state.active} now={now} onResume={() => navigate('workout')} />}
        <div className={`home-greeting ${state.active ? 'compact' : ''}`}><p className="eyebrow">{today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</p><h1>오늘의 한 세트가<br />내일의 나를 바꿉니다<span className="brand-dot">.</span></h1><p className="muted">꾸준함을 기록하고, 나만의 속도로 성장하세요.</p></div>
        <section className="today-card"><div className="section-heading"><p className="eyebrow">TODAY’S ROUTINE</p><RoutineSelectionBadge selectedId={routine?.id} defaultId={defaultRoutine?.id} /></div><h2>{routine?.name ?? '충분한 휴식도 운동의 일부.'}</h2><p className="muted">{routine ? `웨이트 ${routine.exercises.length}개 종목 · ${totalSets}본세트 · 유산소 ${routine.cardio?.length ?? 0}종목` : '오늘은 예정된 루틴이 없는 날입니다.'}</p>
          {routine && <div className="today-exercises">{routine.exercises.map((e, i) => <div key={e.id}><span className="index">{String(i + 1).padStart(2, '0')}</span><span>{state.definitions.find(d => d.id === e.exerciseId)?.name}<small>{e.setCount}세트 · {e.minReps}–{e.maxReps}회</small></span><span className="muted">{state.progress[e.id] ?? e.initialWeight}<small> kg</small></span></div>)}</div>}
          {routine?.cardio?.map((plan, i) => <div className="card stack" key={plan.id}><h3>유산소 {i + 1} · {plan.name}</h3><CardioPlanSummary plan={plan} /></div>)}
          <button className="primary full" disabled={!routine || !!state.active} onClick={() => { if (routine && run(s => startWorkout(s, routine.id, Date.now()))) navigate('workout') }}>{state.active ? '진행 중인 운동을 이어가세요' : '운동 시작 ↗'}</button>
          <label className="routine-select"><span>오늘만 다른 루틴 선택</span><select aria-label="오늘만 다른 루틴 선택" value={routine?.id ?? ''} onChange={event => setOverride({ date, id: event.target.value })}><option value="">루틴 선택</option>{state.routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        </section>
        {routine && <CurrentWeightReview state={state} routineId={routine.id} />}
        <section className="card"><div className="section-heading"><h2>이번 주 일정</h2><span className="muted small">WEEKLY PLAN</span></div><div className="week schedule">{WEEKDAY_ORDER.map(day => <div key={day} className={day === today.getDay() ? 'today' : ''}><span>{DAYS[day]}</span><strong>{state.schedule[day] ? '●' : '—'}</strong><small>{state.routines.find(r => r.id === state.schedule[day])?.name.split(' ')[0] ?? '휴식'}</small></div>)}</div></section>
        <div className="section-heading"><h2>최근 운동</h2><button className="quiet" onClick={() => navigate('history')}>전체 보기 →</button></div>
        {state.history[0] ? <button className="card full recent" onClick={() => { navigate('history'); setDetailId(state.history[0].id) }}><span>{state.history[0].routineName}</span><span className="muted small">{state.history[0].date} ↗</span></button> : <p className="muted empty-inline">아직 완료한 운동이 없습니다. 오늘부터 시작해 보세요.</p>}
        <p className="local-label">MOCK PROTOTYPE · 이 기기에만 저장 · 서버 동기화 미지원</p>
      </>}
      </fieldset>
      {finishOpen && state.active && <Dialog title="미완료 유산소가 있습니다" onClose={() => setFinishOpen(false)}><div className="stack"><p>완료를 확정한 웨이트와 유산소만 저장됩니다. 나머지는 미완료 또는 미시작으로 남습니다.</p>{state.active.cardio?.filter(a => !['completed', 'skipped'].includes(a.status)).map(a => <button key={a.id} className="outline" onClick={() => { const transform = (s: WorkoutState) => navigateExercise(a.status === 'running' || a.status === 'paused' ? reviewCardio(s, a.id, Date.now()) : s, a.id); if (run(s => transform(s.active?.phase === 'warmup' ? beginWorking(s) : s))) { setFinishOpen(false); setScreen('workout') } }}>{a.plan.name} · {a.status === 'ready' ? '준비 화면으로' : '기록하고 완료'}</button>)}<button className="primary" onClick={finishConfirmed}>미완료 유산소 건너뛰고 종료</button><button className="quiet" onClick={() => setFinishOpen(false)}>계속 운동</button></div></Dialog>}
    </main>
    {!workout && !editor && <nav className="tab-bar" aria-label="기본 탐색">{([['home', '홈', '⌂'], ['routines', '루틴', '▤'], ['history', '기록', '◷'], ['settings', '설정', '⚙']] as const).map(([tab, label, icon]) => <button key={tab} aria-current={screen === tab ? 'page' : undefined} onClick={() => navigate(tab)}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav>}
  </div>
}

export default App
