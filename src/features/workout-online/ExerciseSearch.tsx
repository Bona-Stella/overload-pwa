import { useId, useState } from 'react'
import type { StandardExercise } from './types.ts'
import { searchExercises } from './catalog.ts'
import { ExerciseIcon } from '../../components/ExerciseIcon.tsx'
import { exerciseDescription, exerciseIcon } from './catalog-label.ts'

export function ExerciseSearch({ exercises, onSelect, disabled = false }: {
  exercises: StandardExercise[]; onSelect: (exercise: StandardExercise) => void; disabled?: boolean
}) {
  const id = useId(), [query, setQuery] = useState(''), [open, setOpen] = useState(false), [active, setActive] = useState(0)
  const results = searchExercises(exercises, query)
  const choose = (exercise: StandardExercise) => { onSelect(exercise); setQuery(''); setOpen(false); setActive(0) }
  return <div className="stack exercise-search">
    <label htmlFor={id}>표준 운동 검색</label>
    <input id={id} role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={open} aria-controls={id + '-results'}
      aria-activedescendant={open && results[active] ? id + '-' + active : undefined} disabled={disabled} value={query}
      placeholder="운동명 또는 별칭" onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true) }}
      onBlur={event => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setOpen(false) }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setOpen(true)
          setActive(value => results.length ? !open ? (event.key === 'ArrowDown' ? 0 : results.length - 1) : (value + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length : 0)
        }
        if (event.key === 'Enter') { event.preventDefault(); if (open && results[active]) choose(results[active]); else setOpen(true) }
      }} />
    {exercises.length === 0 && <p role="status">등록된 표준 운동이 없습니다. 카탈로그 등록 후 다시 조회해 주세요. 유산소는 추가할 수 있습니다.</p>}
    {open && <ul id={id + '-results'} role="listbox" aria-label="표준 운동 후보" className="exercise-search-results">
      {results.map((exercise, index) => <li key={exercise.id} role="presentation"><button id={id + '-' + index} type="button" role="option"
        aria-selected={index === active} disabled={disabled} onPointerDown={event => { event.preventDefault() }}
        onClick={() => choose(exercise)}><ExerciseIcon kind={exerciseIcon(exercise)} /><span><strong>{exercise.name}</strong><small style={{display:'block'}}>{exerciseDescription(exercise)}</small></span></button></li>)}
    </ul>}
    {open && exercises.length > 0 && results.length === 0 && <p role="status">일치하는 운동이 없습니다.</p>}
  </div>
}
