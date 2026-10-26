import { useState } from 'react'
import { DAYS, WEEKDAY_ORDER, moveItem, newId, validateRoutine } from '../workout/model'
import type { Routine, RoutineExercise, WorkoutState } from '../workout/types'
import { ExercisePicker } from './ExercisePicker'

type DraftExercise = { id: string; exerciseId: string; setCount: string; minReps: string; maxReps: string; initialWeight: string }
const numeric = (value: string) => value.trim() === '' ? NaN : Number(value)

export function RoutineEditor({ state, routine, onSave, onCancel, onCreate }: { state: WorkoutState; routine: Routine; onSave: (routine: Routine, days: number[]) => void; onCancel: () => void; onCreate: (name: string) => string }) {
  const [name, setName] = useState(routine.name)
  const [days, setDays] = useState<number[]>(Object.entries(state.schedule).filter(([, id]) => id === routine.id).map(([day]) => Number(day)))
  const [exercises, setExercises] = useState<DraftExercise[]>(routine.exercises.map(e => ({ ...e, setCount: String(e.setCount), minReps: String(e.minReps), maxReps: String(e.maxReps), initialWeight: String(e.initialWeight) })))
  const [picker, setPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  function change(id: string, field: keyof Pick<RoutineExercise, 'setCount' | 'minReps' | 'maxReps' | 'initialWeight'>, value: string) {
    setExercises(current => current.map(e => e.id === id ? { ...e, [field]: value } : e))
  }
  function save() {
    const result: Routine = { id: routine.id, name, exercises: exercises.map(e => ({ ...e, setCount: numeric(e.setCount), minReps: numeric(e.minReps), maxReps: numeric(e.maxReps), initialWeight: numeric(e.initialWeight) })) }
    const issue = validateRoutine(result)
    if (issue) setError(issue)
    else onSave(result, days)
  }
  return <form onSubmit={event => { event.preventDefault(); save() }} noValidate>
    <div className="section-heading"><div><p className="eyebrow">ROUTINE EDITOR</p><h1>{routine.name ? '루틴 편집' : '새 루틴'}</h1></div><button type="button" className="quiet" onClick={onCancel}>취소</button></div>
    <section className="card stack"><label>루틴 이름<input value={name} onChange={e => setName(e.target.value)} placeholder="나의 루틴" /></label>
      <div><p className="field-label">운동 요일 <span className="muted">· 복수 선택 가능</span></p><div className="week">{WEEKDAY_ORDER.map(day => <button type="button" key={day} aria-pressed={days.includes(day)} onClick={() => setDays(current => current.includes(day) ? current.filter(d => d !== day) : [...current, day])}>{DAYS[day]}</button>)}</div></div>
      <p className="muted small">요일을 선택하지 않아도 저장할 수 있습니다. 세트 수나 목표 범위를 바꾸면 새로운 기준 기록으로 비교합니다.</p>
    </section>
    {exercises.map((e, i) => <section className="card stack" key={e.id}>
      <div className="section-heading"><h2><span className="index">{String(i + 1).padStart(2, '0')}</span>{state.definitions.find(d => d.id === e.exerciseId)?.name}</h2></div>
      <div className="form-grid">{([['setCount', '본세트 수'], ['minReps', '최소 횟수'], ['maxReps', '최대 횟수']] as const).map(([field, title]) => <label key={field}>{title}<input inputMode="numeric" value={e[field]} onChange={event => change(e.id, field, event.target.value)} /></label>)}
        {state.progress[e.id] === undefined && <label>최초 중량 (kg)<input inputMode="decimal" value={e.initialWeight} onChange={event => change(e.id, 'initialWeight', event.target.value)} /></label>}
      </div>
      {state.progress[e.id] !== undefined && <div className="notice"><p>현재 진행 중량: <strong>{state.progress[e.id]} kg</strong></p><p className="small muted">승인된 중량입니다. 변경하려면 운동 화면의 중량 변경에서 오늘만 변경 / 진행 중량 변경을 확인해 주세요.</p></div>}
      <div className="row"><button type="button" className="quiet" aria-label={`${i + 1}번 종목 위로`} disabled={i === 0} onClick={() => setExercises(moveItem(exercises, i, -1))}>↑ 위로</button><button type="button" className="quiet" aria-label={`${i + 1}번 종목 아래로`} disabled={i === exercises.length - 1} onClick={() => setExercises(moveItem(exercises, i, 1))}>↓ 아래로</button><button type="button" className="danger quiet" onClick={() => setExercises(exercises.filter(item => item.id !== e.id))}>제거</button></div>
    </section>)}
    <button type="button" className="outline full" onClick={() => setPicker(!picker)}>{picker ? '종목 선택 닫기' : '＋ 운동 종목 추가'}</button>
    {picker && <ExercisePicker definitions={state.definitions} onCreate={onCreate} onSelect={exerciseId => { setExercises([...exercises, { id: newId(), exerciseId, setCount: '3', minReps: '6', maxReps: '10', initialWeight: '' }]); setPicker(false) }} />}
    {error && <p role="alert" className="notice error">{error}</p>}
    <div className="bottom-actions"><button type="button" className="quiet" onClick={onCancel}>취소</button><button type="submit" className="primary">루틴 저장</button></div>
  </form>
}
