import { useState } from 'react'
import { Dialog } from '../../components/Dialog'
import { CardioPlanEditor } from '../routine/CardioPlanEditor'
import { CARDIO_STATUS, addCardio, cardioCounts, cardioElapsed, cancelCardioReview, confirmCardio, editCardioDraft, pauseCardio, reviewCardio, skipCardio, startCardio } from './cardio'
import { completionCounts, formatDuration, navigateExercise } from './model'
import { CardioPlanSummary } from './CardioPlanSummary'
import type { WorkoutState } from './types'

export function SessionCardioAdder({ onUpdate, onClose }: { onUpdate: (transform: (s: WorkoutState) => WorkoutState) => boolean; onClose: () => void }) {
  return <Dialog title="오늘 세션에만 유산소 추가" onClose={onClose}><p className="muted small">원본 루틴은 유지됩니다. 웨이트 뒤에 추가됩니다.</p><CardioPlanEditor onCancel={onClose} onSave={plan => { if (onUpdate(s => addCardio(s, plan))) onClose() }} /></Dialog>
}

export function CardioScreen({ state, now, onUpdate, onExit, onFinish }: { state: WorkoutState; now: number; onUpdate: (transform: (s: WorkoutState) => WorkoutState) => boolean; onExit: () => void; onFinish: () => void }) {
  const [adding, setAdding] = useState(false)
  const [list, setList] = useState(false)
  const session = state.active
  const activity = session?.cardio?.find(a => a.id === session.currentExerciseId)
  if (!session || !activity) return null
  const a = activity
  const elapsed = cardioElapsed(a, now)
  const counts = cardioCounts(session)
  const weights = completionCounts(session)
  const next = session.exercises.find(e => e.sets.some(s => !s.actual)) ?? session.cardio?.find(other => other.id !== a.id && !['completed', 'skipped'].includes(other.status))
  const resolved = ['completed', 'skipped'].includes(a.status)
  const go = (id: string) => { if (onUpdate(s => navigateExercise(s, id))) { setList(false); window.scrollTo(0, 0) } }
  return <>
    <header className="timer-bar"><div><span>전체 운동 시간</span><strong>{formatDuration(now - session.startedAt)}</strong></div><div><span>{CARDIO_STATUS[a.status]}</span><strong>{formatDuration(a.result?.activeMs ?? elapsed)}</strong></div></header>
    <div className="workout-content cardio-content">
      <div className="section-heading"><button className="quiet" onClick={onExit}>‹ 홈</button><span className="muted small">{session.routineName}</span><button className="quiet danger" onClick={onFinish}>운동 종료</button></div>
      <p className="muted small">웨이트 {weights.completed}/{weights.total} 세트 · 유산소 완료 {counts.completed}/{counts.total} 종목</p>
      <div className="exercise-heading"><p className="eyebrow">CARDIO · {(session.cardio?.findIndex(item => item.id === a.id) ?? 0) + 1}</p><h1>{a.plan.name}</h1><p className="badge">{CARDIO_STATUS[a.status]}</p></div>
      <button className="quiet full" onClick={() => setList(true)}>종목 목록</button>
      <section className="card stack"><h2>당시 계획</h2><CardioPlanSummary plan={a.plan} /><p className="small muted">계획값은 실제 수행 기록과 별도로 보존됩니다.</p></section>
      <section className="card cardio-clock"><p>{a.status === 'ready' ? '시작을 눌러야 측정합니다' : '실제 활동 시간 · 일시정지 제외'}</p><strong>{formatDuration(a.result?.activeMs ?? elapsed)}</strong>{elapsed >= a.plan.targetSeconds * 1000 && !resolved && <p className="success-text">목표 시간 도달 · 직접 완료해 주세요.</p>}{a.status === 'paused' && <p className="muted small">재개하기 전까지 활동 시간은 증가하지 않습니다.</p>}</section>
      {a.status === 'review' && <section className="card stack" aria-label="유산소 완료 입력"><h2>완료 기록 확인</h2><p>타이머 자동 기록 {formatDuration(a.accumulatedMs)}</p>
        {['treadmill', 'bike', 'outdoor'].includes(a.plan.kind) && <label>실제 거리 (km) · 선택<input inputMode="decimal" value={a.draft.distance} onChange={e => onUpdate(s => editCardioDraft(s, a.id, { distance: e.target.value }))} placeholder="측정하지 않으면 비워두세요" /></label>}
        <label>평균 심박수 (BPM) · 수동 선택 입력<input inputMode="numeric" value={a.draft.bpm} onChange={e => onUpdate(s => editCardioDraft(s, a.id, { bpm: e.target.value }))} placeholder="측정하지 않으면 비워두세요" /></label>
        <p className="small muted">거리 0.001–1000km · 심박수 정수 20–300 BPM. 측정 기능은 제공하지 않습니다.</p>
        <label className="radio-option"><input type="checkbox" checked={a.draft.correctedSeconds !== null} onChange={e => onUpdate(s => editCardioDraft(s, a.id, { correctedSeconds: e.target.checked ? String(Math.max(1, Math.floor(a.accumulatedMs / 1000))) : null }))} /><span>방치 등으로 실제 시간 정정</span></label>
        {a.draft.correctedSeconds !== null && <label>정정 실제 시간 (초) · 1–86400<input inputMode="numeric" value={a.draft.correctedSeconds} onChange={e => onUpdate(s => editCardioDraft(s, a.id, { correctedSeconds: e.target.value }))} /></label>}
        <button className="quiet" onClick={() => onUpdate(s => cancelCardioReview(s, a.id))}>완료 취소 · 일시정지로 돌아가기</button>
      </section>}
      {a.result && <section className="card stack"><h2>실제 완료 기록</h2><p>{a.result.corrected ? `수동 정정 ${formatDuration(a.result.activeMs)} · 자동 기록 ${formatDuration(a.result.timerMs)}` : `타이머 자동 기록 ${formatDuration(a.result.activeMs)}`}</p><p>실제 거리 {a.result.distance === null ? '미입력' : `${a.result.distance} km`} · 수동 평균 {a.result.bpm === null ? '미입력' : `${a.result.bpm} BPM`}</p></section>}
      {!resolved && <button className="quiet danger full" onClick={() => { if (window.confirm('이 유산소의 활동 시간과 입력을 실제 완료 기록으로 저장하지 않고 건너뛸까요?')) onUpdate(s => skipCardio(s, a.id, Date.now())) }}>이 유산소 건너뛰기</button>}
      <button className="quiet full" onClick={() => setAdding(true)}>현재 세션에서 종목 변경 · 유산소 추가</button>
      <div className="bottom-actions workout-actions">
        {a.status === 'ready' && <button className="primary full" onClick={() => onUpdate(s => startCardio(s, a.id, Date.now()))}>유산소 시작</button>}
        {a.status === 'running' && <div className="row full"><button className="outline" onClick={() => onUpdate(s => pauseCardio(s, a.id, Date.now()))}>일시정지</button><button className="primary" onClick={() => onUpdate(s => reviewCardio(s, a.id, Date.now()))}>유산소 완료</button></div>}
        {a.status === 'paused' && <div className="row full"><button className="outline" onClick={() => onUpdate(s => startCardio(s, a.id, Date.now()))}>재개</button><button className="primary" onClick={() => onUpdate(s => reviewCardio(s, a.id, Date.now()))}>유산소 완료</button></div>}
        {a.status === 'review' && <button className="primary full" onClick={() => onUpdate(s => confirmCardio(s, a.id, Date.now()))}>유산소 기록 확정</button>}
        {resolved && (next ? <button className="primary full" onClick={() => go(next.id)}>다음 종목으로</button> : <><button className="outline full" onClick={() => setAdding(true)}>＋ 유산소 추가</button><button className="primary full" onClick={onFinish}>운동 종료 및 요약</button></>)}
      </div>
    </div>
    {adding && <SessionCardioAdder onUpdate={onUpdate} onClose={() => setAdding(false)} />}
    {list && <Dialog title="이번 운동 종목" onClose={() => setList(false)}><div className="stack">{session.exercises.map(e => <button key={e.id} className="list-button" onClick={() => go(e.id)}>{e.name} · 웨이트</button>)}{session.cardio?.map(e => <button key={e.id} className="list-button" onClick={() => go(e.id)}>{e.plan.name} · {CARDIO_STATUS[e.status]}</button>)}</div></Dialog>}
  </>
}
