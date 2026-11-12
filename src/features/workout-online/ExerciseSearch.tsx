import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { StandardExercise } from './types.ts'
import { exerciseVariantLabels, searchExercises } from './catalog.ts'
import { ExerciseIcon } from '../../components/ExerciseIcon.tsx'
import { exerciseDescription, exerciseIcon } from './catalog-label.ts'

/** Shared inline catalog list for routine add/change and session additions. */
export function ExerciseSearch({ exercises, onSelect, disabled = false, autoFocus = false, onCancel }: {
  exercises: StandardExercise[]; onSelect: (exercise: StandardExercise) => void; disabled?: boolean; autoFocus?: boolean; onCancel?: () => void
}) {
  const id = useId(), [query, setQuery] = useState(''), input = useRef<HTMLInputElement>(null), list = useRef<HTMLUListElement>(null)
  const results = searchExercises(exercises, query)
  const variants = useMemo(() => exerciseVariantLabels(exercises), [exercises])
  useEffect(() => { if (autoFocus) input.current?.focus() }, [autoFocus])
  return <div className="stack exercise-search" onKeyDown={event => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'Escape' && onCancel) { event.preventDefault(); onCancel() }
    if (event.key === 'Enter' && event.target === input.current) event.preventDefault()
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      const buttons = [...(list.current?.querySelectorAll('button') ?? [])], index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      if (index < 0 && event.key !== 'ArrowDown') return
      event.preventDefault()
      buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
    }
  }}>
    <label htmlFor={id}>표준 운동 검색 · 이름 또는 별칭</label>
    <input id={id} ref={input} type="search" autoComplete="off" disabled={disabled} value={query} placeholder="예: 벤치, barbell" onChange={event => setQuery(event.target.value)} />
    <ul ref={list} aria-label="표준 운동 목록" className="exercise-search-results">
      {results.map(exercise => <li key={exercise.id}><button type="button" disabled={disabled} onClick={() => { onSelect(exercise); setQuery('') }}><ExerciseIcon kind={exerciseIcon(exercise)} /><span><strong>{exercise.name}</strong><small>{variants.has(exercise.id) ? variants.get(exercise.id) + ' · ' : ''}{exerciseDescription(exercise)}</small></span></button></li>)}
    </ul>
    {exercises.length === 0 ? <p role="status">등록된 표준 운동이 없습니다. 카탈로그 등록 후 다시 조회해 주세요.</p> : !results.length && <p role="status">일치하는 운동이 없습니다.</p>}
  </div>
}
