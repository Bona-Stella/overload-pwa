import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { WeightInput } from '../../components/WeightInput'
import { RepsInput } from '../../components/RepsInput'
import { ExercisePicker } from '../routine/ExercisePicker'
import { addSessionExercise, addSessionSet, adjustRest, beginWorking, changeWeight, completeSet, editReps, formatDuration, hasIncompleteSets, increaseBenchmark, navigateExercise, nextIncompleteExercise, recommendation, removeSessionExercise, removeSessionSet, reorderSessionExercise, resolveWorkoutTimer, undoSet } from './model'
import type { WorkoutState } from './types'

type Props = { state: WorkoutState; now: number; onUpdate: (transform: (s: WorkoutState) => WorkoutState) => boolean; onExit: () => void; onFinish: () => void; onCreate: (name: string) => string }

export function WorkoutScreen({ state, now, onUpdate, onExit, onFinish, onCreate }: Props) {
  const [weightOpen, setWeightOpen] = useState(false)
  const [weight, setWeight] = useState('')
  const [mode, setMode] = useState<'today' | 'progress'>('today')
  const [weightError, setWeightError] = useState<string | null>(null)
  const [edit, setEdit] = useState(false)
  const [list, setList] = useState(false)
  const [picker, setPicker] = useState<'add' | 'replace' | null>(null)
  const session = state.active
  if (!session) return null
  const exercise = session.exercises.find(e => e.id === session.currentExerciseId)
  if (!exercise) return null
  const index = session.exercises.findIndex(e => e.id === exercise.id)
  const allDone = !hasIncompleteSets(session)
  const resolvedTimer = resolveWorkoutTimer(session)
  const timer = resolvedTimer?.kind === 'rest' && resolvedTimer.exerciseId !== exercise.id ? null : resolvedTimer
  const resting = timer?.kind === 'rest' && timer.endAt > now && timer.exerciseId === exercise.id
  const restRemaining = resting && timer?.kind === 'rest' ? Math.ceil((timer.endAt - now) / 1000) : 0
  const restWarning = session.phase === 'working' && restRemaining > 0 && restRemaining <= 10
  const restUrgent = restWarning && restRemaining <= 5
  const done = exercise.sets.every(s => s.actual)
  const nextExercise = nextIncompleteExercise(session, exercise.id)
  const nextSet = exercise.sets.find(s => !s.actual)
  const advice = recommendation(exercise)
  const increaseReady = done && advice === 'increase'
  const achievedBenchmark = increaseBenchmark(state, session.routineId, exercise)
  const completedCount = session.exercises.flatMap(e => e.sets).filter(s => s.actual).length
  const totalCount = session.exercises.reduce((sum, e) => sum + e.sets.length, 0)
  const currentExerciseId = exercise.id

  function go(id: string) { if (onUpdate(s => navigateExercise(s, id))) { setList(false); setEdit(false); window.scrollTo(0, 0) } }
  function recordSet(setId: string) {
    const willCompleteExercise = exercise?.sets.filter(s => !s.actual).length === 1
    if (onUpdate(s => completeSet(s, currentExerciseId, setId, Date.now())) && willCompleteExercise) {
      setEdit(false)
      window.scrollTo(0, 0)
    }
  }
  function applyWeight() {
    const value = weight.trim() ? Number(weight) : NaN
    if (!Number.isFinite(value) || value < 0) { setWeightError('0 이상의 중량을 입력해 주세요.'); return }
    if (onUpdate(s => changeWeight(s, currentExerciseId, value, mode))) setWeightOpen(false)
    else setWeightError('중량 변경을 반영하지 못했습니다. 저장소 상태를 확인하고 다시 승인해 주세요.')
  }

  return <>
    <header className="timer-bar">
      <div><span>전체 운동 시간</span><strong>{formatDuration(now - session.startedAt)}</strong></div>
      <div className={resting ? `rest-clock${restWarning ? ' rest-warning' : ''}${restUrgent ? ' rest-urgent' : ''}` : ''}><span>{session.phase === 'warmup' ? '준비 중' : allDone ? '모든 종목 완료' : resting ? '남은 휴식' : timer?.kind === 'transition' ? '이전 종목 완료 후' : timer?.kind === 'rest' ? '휴식 완료' : '휴식 없음'}</span><strong>{resting ? formatDuration(restRemaining * 1000) : timer?.kind === 'transition' ? formatDuration(now - timer.since) : '—'}</strong></div>
    </header>
    <div className="workout-content">
      <div className="section-heading"><button className="quiet" onClick={onExit}>‹ 홈</button><span className="muted small">{session.routineName}</span><button className="quiet danger" onClick={onFinish}>운동 종료</button></div>
      {session.phase === 'warmup' ? <>
        <section className="warmup-hero"><span className="orbit" aria-hidden="true">↗</span><p className="eyebrow">BEFORE YOU LIFT</p><h1>몸을 깨우는 시간.</h1><p>스트레칭 & 워밍업<br />자유롭게 준비하세요.</p><span className="badge">세트 기록 없음</span></section>
        <section className="card"><p className="eyebrow">UP NEXT · 01</p><h2>{exercise.name}</h2><p className="muted">{exercise.minReps}–{exercise.maxReps}회 × {exercise.sets.length}본세트</p></section>
        <div className="bottom-actions"><button className="primary full" onClick={() => onUpdate(beginWorking)}>준비운동 완료 →</button></div>
      </> : <>
        <div className="progress-caption"><span>{String(index + 1).padStart(2, '0')} / {String(session.exercises.length).padStart(2, '0')} 종목</span><span>{completedCount} / {totalCount} 세트 완료</span></div>
        <progress value={completedCount} max={totalCount} aria-label="전체 세트 진행" />
        {allDone && <p className="notice success" role="status">모든 종목 완료 · 기록을 확인하고 운동 종료를 눌러 저장해 주세요.</p>}
        <div className="exercise-heading" aria-live="polite"><p className="eyebrow">FOCUS ON THIS SET</p><h1>{exercise.name}</h1><p className="muted">목표 {exercise.minReps}–{exercise.maxReps}회 × {exercise.sets.length}본세트</p></div>
        <div className="exercise-navigation"><button className="quiet" disabled={index === 0} onClick={() => go(session.exercises[index - 1].id)}>‹ 이전</button><button className="quiet" onClick={() => setList(true)}>종목 목록</button><button className="quiet" disabled={index === session.exercises.length - 1} onClick={() => go(session.exercises[index + 1].id)}>다음 ›</button></div>
        <section className="card weight-card"><div><p className="muted small">{exercise.temporaryWeight ? '오늘만 중량' : '진행 중량 · 잠금'}</p><strong>{exercise.weight}<small> kg</small></strong><p className="muted small">승인 중량 {exercise.approvedWeight} kg</p></div><button className="outline" onClick={() => { setWeight(String(exercise.weight)); setMode('today'); setWeightError(null); setWeightOpen(true) }}>중량 변경</button></section>
        {achievedBenchmark && <aside className="notice benchmark-advice" aria-label="기준 기록 증량 안내"><div><p>현재 기준 기록에서 증량 조건 달성</p><p className="small muted">승인 {exercise.approvedWeight}kg · {achievedBenchmark.reps.join('/')}회</p></div><button className="outline" onClick={() => { setWeight(String(exercise.approvedWeight)); setMode('progress'); setWeightError(null); setWeightOpen(true) }}>지금 변경</button></aside>}
        {!exercise.benchmark && <p className="hint">비교 가능한 기준이 없습니다. 이번 반복 횟수를 직접 입력해 주세요.</p>}
        <section className="sets-card card" aria-label="본세트 기록">
          <div className="set-row set-header"><span>세트</span><span>기준 기록</span><span>이번 기록</span><span>상태</span></div>
          {exercise.sets.map((set, i) => <div key={set.id}>
            <div className={`set-row ${set.actual ? 'completed' : nextSet?.id === set.id ? 'current' : ''}`}>
              <span className="set-number">{String(set.ordinal).padStart(2, '0')}</span><span className="benchmark">{exercise.benchmark?.[i] ?? '—'}<small> 회</small></span>
              <RepsInput ordinal={set.ordinal} value={set.reps} disabled={!!set.actual} onChange={value => onUpdate(s => editReps(s, exercise.id, set.id, value))} />
              <button className={set.actual ? 'set-check checked' : 'set-check'} disabled={!set.actual && resting} aria-label={`${set.ordinal}세트 ${set.actual ? '완료 취소' : '완료'}`} onClick={() => { if (set.actual) { if (window.confirm('이 세트의 완료를 취소하고 수정할까요?')) onUpdate(s => undoSet(s, exercise.id, set.id)) } else recordSet(set.id) }}>{set.actual ? '✓ 완료' : '완료'}</button>
            </div>
            {set.actual && set.actual.weight !== exercise.weight && <p className="small muted actual-note">실제 완료 중량 {set.actual.weight} kg</p>}
            {edit && <button className="quiet danger full" disabled={!!set.actual || exercise.sets.length <= 1} onClick={() => onUpdate(s => removeSessionSet(s, exercise.id, set.id))}>{set.ordinal}세트 제외{set.actual ? ' · 완료 기록 보호' : ''}</button>}
          </div>)}
        </section>
        {advice && <p className={`notice ${advice === 'increase' ? 'success' : 'warning'}`}>{advice === 'increase' ? '목표 달성! 중량 증가를 고려해 보세요.' : '목표 하한 미달 · 중량 감소를 고려해 보세요.'}<br /><span className="small">중량은 직접 확인하기 전까지 유지됩니다.</span></p>}
        <button className="quiet full" onClick={() => setEdit(!edit)}>{edit ? '임시 편집 닫기' : '현재 세션에서 세트 / 종목 변경'}</button>
        {edit && <section className="card stack"><p className="small muted">현재 운동에만 적용됩니다. 완료 기록을 먼저 취소해야 해당 세트나 종목을 제외할 수 있습니다.</p><button className="outline" onClick={() => onUpdate(s => addSessionSet(s, exercise.id))}>＋ 본세트 추가</button><button className="outline" onClick={() => setPicker('add')}>＋ 종목 추가</button><button className="quiet" disabled={exercise.sets.some(s => s.actual)} onClick={() => setPicker('replace')}>현재 종목 교체</button><button className="quiet danger" disabled={exercise.sets.some(s => s.actual) || session.exercises.length <= 1} onClick={() => { if (window.confirm('현재 종목을 이번 운동에서만 제외할까요?')) onUpdate(s => removeSessionExercise(s, exercise.id)) }}>현재 종목 제외</button></section>}
        <section className="card memo-card"><label>기구 세팅 메모<textarea value={state.memos[exercise.exerciseId] ?? ''} placeholder="예: 의자 높이 3 · 그립 눈금 2" onChange={event => onUpdate(s => ({ ...s, memos: { ...s.memos, [exercise.exerciseId]: event.target.value } }))} rows={3} /></label><p className="small muted">이 종목의 기본 메모로 다음 운동에도 유지됩니다.</p></section>
        <div className="bottom-actions workout-actions">
          {restWarning && <aside className={`rest-preparation-card${restUrgent ? ' rest-urgent' : ''}`} role="status" aria-label="휴식 종료 준비"><span>다음 세트 준비</span><strong>{restRemaining}<small>초</small></strong></aside>}
          {increaseReady && <p className="increase-banner" role="status"><strong>증량 가능 · {exercise.approvedWeight}kg</strong><span>다음 운동에서 중량 증가를 고려해 보세요.</span></p>}
          {allDone ? <button className="primary full" onClick={onFinish}>운동 종료 및 요약</button> : resting ? <div className="row full"><button className="primary" onClick={() => onUpdate(s => adjustRest(s, null, Date.now()))}>휴식 종료</button><button className="outline" onClick={() => onUpdate(s => adjustRest(s, 30, Date.now()))}>＋30초</button></div> : nextSet ? <button key={nextSet.id} className="primary full" onClick={() => recordSet(nextSet.id)}>{nextSet.ordinal}세트 완료</button> : !increaseReady && <p className="success-text">이 종목의 본세트를 모두 완료했어요.</p>}
          {done && !allDone && nextExercise && <button className="primary full" onClick={() => go(nextExercise.id)}>다음 종목으로</button>}
        </div>
      </>}
    </div>
    {weightOpen && <Dialog title="중량 변경" onClose={() => setWeightOpen(false)}><div className="stack"><p className="muted">현재 승인 중량 {exercise.approvedWeight} kg</p><WeightInput label="변경 중량 (kg)" value={weight} onChange={setWeight} /><label className="radio-option"><input type="radio" checked={mode === 'today'} onChange={() => setMode('today')} name="weight-mode" /><span>오늘만 변경<small>이번 운동에만 적용, 기준 기록 제외</small></span></label><label className="radio-option"><input type="radio" checked={mode === 'progress'} onChange={() => setMode('progress')} name="weight-mode" /><span>진행 중량 변경<small>다음 정상 운동에도 적용</small></span></label><p className="small muted">완료한 기록은 보존됩니다. 비교 기준이 없는 중량에서는 미완료 세트의 횟수를 직접 입력합니다.</p>{weightError && <p role="alert" className="notice error">{weightError}</p>}<button className="primary" onClick={applyWeight}>{weight || '—'} kg · {mode === 'today' ? '오늘만 변경' : '진행 중량 변경'} 확인</button></div></Dialog>}
    {list && <Dialog title="이번 운동 종목" onClose={() => setList(false)}><div className="stack">{session.exercises.map((e, i) => <div className="session-list-item" key={e.id}><button className="list-button" aria-current={e.id === exercise.id ? 'step' : undefined} onClick={() => go(e.id)}><span>{i + 1}. {e.name}<small>{e.sets.filter(s => s.actual).length}/{e.sets.length} 완료</small></span></button><div className="row"><button className="icon-button" aria-label={`${e.name} 위로`} disabled={i === 0} onClick={() => onUpdate(s => reorderSessionExercise(s, e.id, -1))}>↑</button><button className="icon-button" aria-label={`${e.name} 아래로`} disabled={i === session.exercises.length - 1} onClick={() => onUpdate(s => reorderSessionExercise(s, e.id, 1))}>↓</button></div></div>)}</div></Dialog>}
    {picker && <Dialog title={picker === 'add' ? '이번 운동에 종목 추가' : '현재 종목 교체'} onClose={() => setPicker(null)}><ExercisePicker definitions={state.definitions} onCreate={onCreate} onSelect={id => { onUpdate(s => {
      let next = addSessionExercise(s, id)
      if (picker === 'replace') {
        const added = next.active?.exercises.at(-1)
        next = removeSessionExercise(next, exercise.id)
        if (added) next = navigateExercise(next, added.id)
      }
      return next
    }); setPicker(null) }} /></Dialog>}
  </>
}
