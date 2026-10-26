import { useEffect, useState } from 'react'
import HealthPanel from './features/health/HealthPanel'
import { RoutineEditor } from './features/routine/RoutineEditor'
import { SessionDetail } from './features/history/SessionDetail'
import { WorkoutScreen } from './features/workout/WorkoutScreen'
import { DAYS, WEEKDAY_ORDER, completionCounts, deleteRoutine, finishWorkout, formatDuration, hasIncompleteSets, localDate, newId, saveRoutine, scheduleConflicts, selectRoutine, startWorkout, summary } from './features/workout/model'
import { useWorkout } from './features/workout/useWorkout'
import type { RestSettings, Routine, WorkoutState } from './features/workout/types'
import './App.css'

type Screen = 'home' | 'routines' | 'history' | 'settings' | 'workout'

function App() {
  const { state, update, error: storageError, blocked, retry } = useWorkout()
  const [screen, setScreen] = useState<Screen>('home')
  const [now, setNow] = useState(() => Date.now())
  const [override, setOverride] = useState<{ date: string; id: string } | null>(null)
  const [editor, setEditor] = useState<Routine | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
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
  function save(routine: Routine, days: number[]) {
    const conflicts = scheduleConflicts(state, routine.id, days)
    if (conflicts.length && !window.confirm(`${conflicts.map(d => DAYS[d]).join('·')}요일에 지정된 루틴을 이 루틴으로 교체할까요?`)) return
    if (run(s => saveRoutine(s, routine, days, conflicts.length > 0))) setEditor(null)
  }
  function finish() {
    if (!state.active) return
    if (hasIncompleteSets(state.active) && !window.confirm('미완료 세트가 남아 있습니다. 완료한 본세트만 기록하고 운동을 종료할까요?')) return
    const id = state.active.id
    if (run(s => finishWorkout(s, Date.now(), true))) { navigate('history'); setDetailId(id) }
  }
  const today = new Date(now)
  const date = localDate(today)
  const routine = selectRoutine(state, today, override?.date === date ? override.id : undefined)
  const detail = state.history.find(s => s.id === detailId)
  const workout = screen === 'workout' && state.active !== null
  const activeSummary = state.active ? summary(state.active, now) : null
  const totalSets = routine?.exercises.reduce((sum, e) => sum + e.setCount, 0) ?? 0
  return <div className={`app-shell ${workout ? 'in-workout' : ''}`}>
    {!workout && <header className="app-header"><button className="brand" onClick={() => navigate('home')} aria-label="Overload 홈"><span className="brand-mark" aria-hidden="true">↗</span> OVERLOAD<span className="brand-dot">.</span></button><button className="icon-button" onClick={() => navigate('settings')} aria-label="설정">⚙</button></header>}
    <main className={workout ? 'workout-main' : 'page'}>
      {(storageError || message) && <div className="notice error global-notice" role="alert"><p>{storageError ?? message}</p>{storageError && !blocked && <button className="outline" onClick={retry}>다시 저장</button>}</div>}
      <fieldset className="app-controls" disabled={blocked}>
      {workout ? <WorkoutScreen state={state} now={now} onUpdate={run} onExit={() => navigate('home')} onFinish={finish} onCreate={createDefinition} /> : editor ? <RoutineEditor key={editor.id} state={state} routine={editor} onSave={save} onCancel={() => setEditor(null)} onCreate={createDefinition} /> : screen === 'settings' ? <Settings settings={state.restSettings} onSave={settings => run(s => ({ ...s, restSettings: settings }))} /> : screen === 'routines' ? <>
        <div className="section-heading"><div><p className="eyebrow">YOUR TRAINING PLAN</p><h1>나의 루틴</h1></div><button className="primary" onClick={() => setEditor({ id: newId(), name: '', exercises: [] })}>＋ 새 루틴</button></div>
        <p className="muted intro">다음 운동을 위한 준비. 나에게 맞는 순서로.</p>
        {!state.routines.length && <section className="card empty">아직 루틴이 없습니다. 첫 루틴을 만들어 보세요.</section>}
        {state.routines.map((r, i) => <section key={r.id} className="card routine-card"><p className="eyebrow">ROUTINE {String(i + 1).padStart(2, '0')}</p><h2>{r.name}</h2><p className="muted small">{Object.entries(state.schedule).filter(([, id]) => id === r.id).map(([d]) => DAYS[Number(d)]).join(' · ') || '요일 미지정'} · {r.exercises.length}종목 · {r.exercises.reduce((sum, e) => sum + e.setCount, 0)}본세트</p><p className="routine-names">{r.exercises.map(e => state.definitions.find(d => d.id === e.exerciseId)?.name).join(' / ')}</p><div className="row"><button className="outline" onClick={() => setEditor(r)}>편집</button><button className="quiet danger" onClick={() => { if (window.confirm(`“${r.name}” 루틴을 삭제할까요? 과거 기록과 진행 중 운동은 유지됩니다.`)) run(s => deleteRoutine(s, r.id)) }}>삭제</button></div></section>)}
      </> : screen === 'history' ? detail ? <><button className="quiet" onClick={() => setDetailId(null)}>‹ 기록 목록</button><SessionDetail session={detail} saved={!storageError} /></> : <>
        <p className="eyebrow">EVERY SESSION COUNTS</p><h1>쌓여가는 기록</h1><p className="muted intro">완료한 세트 그대로, 당신의 운동 이력.</p>
        {!state.history.length && <section className="card empty"><span aria-hidden="true">↗</span><h2>첫 기록을 기다리고 있어요.</h2><p>홈에서 운동을 시작해 보세요.</p></section>}
        {state.history.map(s => { const result = summary(s, now); const completion = completionCounts(s); return <button className="card history-card" key={s.id} onClick={() => setDetailId(s.id)}><span className="muted small">{s.date}</span><strong>{s.routineName}</strong><span className="muted">완료 {result.sets}{completion.total === null ? '' : `/${completion.total}`} 본세트 · {result.volume.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} kg · {formatDuration(result.elapsed)}</span><span className="history-arrow" aria-hidden="true">↗</span></button> })}
      </> : <>
        {state.active && <section className="card resume-card"><span className="badge">진행 중인 운동</span><h2>{state.active.routineName}</h2><p className="muted">{state.active.phase === 'warmup' ? '워밍업 중' : `${activeSummary?.sets}세트 완료`} · {formatDuration(activeSummary?.elapsed ?? 0)}</p><button className="primary full" onClick={() => navigate('workout')}>운동 이어하기 →</button></section>}
        <div className={`home-greeting ${state.active ? 'compact' : ''}`}><p className="eyebrow">{today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</p><h1>오늘의 한 세트가<br />내일의 나를 바꿉니다<span className="brand-dot">.</span></h1><p className="muted">꾸준함을 기록하고, 나만의 속도로 성장하세요.</p></div>
        <section className="today-card"><div className="section-heading"><p className="eyebrow">TODAY’S ROUTINE</p><span className="badge">{override?.date === date ? '오늘만 선택' : routine ? '요일 기본 루틴' : 'REST DAY'}</span></div><h2>{routine?.name ?? '충분한 휴식도 운동의 일부.'}</h2><p className="muted">{routine ? `${routine.exercises.length}개 종목 · ${totalSets}본세트` : '오늘은 예정된 루틴이 없는 날입니다.'}</p>
          {routine && <div className="today-exercises">{routine.exercises.map((e, i) => <div key={e.id}><span className="index">{String(i + 1).padStart(2, '0')}</span><span>{state.definitions.find(d => d.id === e.exerciseId)?.name}<small>{e.setCount}세트 · {e.minReps}–{e.maxReps}회</small></span><span className="muted">{state.progress[e.id] ?? e.initialWeight}<small> kg</small></span></div>)}</div>}
          <button className="primary full" disabled={!routine || !!state.active} onClick={() => { if (routine && run(s => startWorkout(s, routine.id, Date.now()))) navigate('workout') }}>{state.active ? '진행 중인 운동을 이어가세요' : '운동 시작 ↗'}</button>
          <label className="routine-select"><span>오늘만 다른 루틴 선택</span><select aria-label="오늘만 다른 루틴 선택" value={routine?.id ?? ''} onChange={event => setOverride({ date, id: event.target.value })}><option value="">루틴 선택</option>{state.routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
        </section>
        <section className="card"><div className="section-heading"><h2>이번 주 일정</h2><span className="muted small">WEEKLY PLAN</span></div><div className="week schedule">{WEEKDAY_ORDER.map(day => <div key={day} className={day === today.getDay() ? 'today' : ''}><span>{DAYS[day]}</span><strong>{state.schedule[day] ? '●' : '—'}</strong><small>{state.routines.find(r => r.id === state.schedule[day])?.name.split(' ')[0] ?? '휴식'}</small></div>)}</div></section>
        <div className="section-heading"><h2>최근 운동</h2><button className="quiet" onClick={() => navigate('history')}>전체 보기 →</button></div>
        {state.history[0] ? <button className="card full recent" onClick={() => { navigate('history'); setDetailId(state.history[0].id) }}><span>{state.history[0].routineName}</span><span className="muted small">{state.history[0].date} ↗</span></button> : <p className="muted empty-inline">아직 완료한 운동이 없습니다. 오늘부터 시작해 보세요.</p>}
        <p className="local-label">MOCK PROTOTYPE · 이 기기에만 저장 · 서버 동기화 미지원</p>
      </>}
      </fieldset>
    </main>
    {!workout && !editor && <nav className="tab-bar" aria-label="기본 탐색">{([['home', '홈', '⌂'], ['routines', '루틴', '▤'], ['history', '기록', '◷']] as const).map(([tab, label, icon]) => <button key={tab} aria-current={screen === tab ? 'page' : undefined} onClick={() => navigate(tab)}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav>}
  </div>
}

function Settings({ settings, onSave }: { settings: RestSettings; onSave: (settings: RestSettings) => boolean }) {
  const [draft, setDraft] = useState({ low: String(settings.low), medium: String(settings.medium), high: String(settings.high) })
  const [message, setMessage] = useState('')
  const [health, setHealth] = useState(false)
  return <><p className="eyebrow">MAKE IT YOURS</p><h1>설정</h1><form className="card stack" noValidate onSubmit={event => {
    event.preventDefault()
    const value = { low: Number(draft.low), medium: Number(draft.medium), high: Number(draft.high) }
    if (Object.values(value).some(v => !Number.isSafeInteger(v) || v <= 0)) setMessage('휴식시간은 1초 이상의 정수로 입력해 주세요.')
    else if (onSave(value)) setMessage('예시 휴식시간 설정을 적용했습니다.')
  }}><h2>목표 상한별 휴식시간</h2><p className="muted small">시연용 예시 기본값입니다. 목표 반복 횟수 상한에 따라 자동 적용됩니다.</p>{([['low', '상한 8회 이하'], ['medium', '상한 9–12회'], ['high', '상한 13회 이상']] as const).map(([key, label]) => <label key={key}>{label} (초)<input inputMode="numeric" value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}<button type="submit" className="primary">설정 저장</button>{message && <p role="status">{message}</p>}</form><section className="card stack"><h2>이 프로토타입의 저장 방식</h2><p className="muted">운동 기록은 현재 브라우저의 로컬 저장소에 보관됩니다. 브라우저 데이터를 삭제하면 사라질 수 있습니다. 서버 동기화, 백업, PWA 설치 지원은 아직 구현하지 않았습니다.</p></section><button className="outline full" onClick={() => setHealth(!health)}>{health ? '서버 진단 닫기' : '서버 연결 진단 열기'}</button>{health && <HealthPanel />}</>
}
export default App
