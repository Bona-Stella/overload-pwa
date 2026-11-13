import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import type { CatalogExercise, StandardExercise } from './types.ts'
import { browseExercises, catalogGroups, catalogRowGroup, primaryMuscles } from './catalog-browse.ts'
import type { CatalogGroup } from './catalog-browse.ts'
import { ExerciseIcon } from '../../components/ExerciseIcon.tsx'
import { Metadata, StatusNotice } from '../../components/ui.tsx'
import styles from './PublicCatalog.module.css'

type SearchExercise = StandardExercise & { exerciseType?: CatalogExercise['exerciseType'] }
const filters = Object.entries(catalogGroups) as [CatalogGroup, (typeof catalogGroups)[CatalogGroup]][]

/** The approved catalog search, primary filters and rows shared by browsing and selection. */
export function ExerciseSearch<T extends SearchExercise>({ exercises, onSelect, disabled = false, autoFocus = false, onCancel, loading = false, failed = false, resetOnSelect = true }: {
  exercises: T[]; onSelect: (exercise: T, event: MouseEvent<HTMLButtonElement>) => void; disabled?: boolean; autoFocus?: boolean; onCancel?: () => void
  loading?: boolean; failed?: boolean; resetOnSelect?: boolean
}) {
  const id = useId(), [query, setQuery] = useState(''), [filter, setFilter] = useState<CatalogGroup | 'ALL'>('ALL')
  const input = useRef<HTMLInputElement>(null), list = useRef<HTMLUListElement>(null)
  const results = useMemo(() => browseExercises(exercises, query, filter), [exercises, query, filter])
  useEffect(() => { if (autoFocus) input.current?.focus() }, [autoFocus])
  return <div className={styles.searchList + ' exercise-search'} onKeyDown={event => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'Escape' && onCancel) { event.preventDefault(); onCancel() }
    if (event.key === 'Enter' && event.target === input.current) event.preventDefault()
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      const buttons = [...(list.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
      if (index < 0 && event.key !== 'ArrowDown') return
      event.preventDefault()
      buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
    }
  }}>
    <div className={styles.search}>
      <label htmlFor={id}>표준 운동 검색 · 이름 또는 별칭</label>
      <input id={id} ref={input} type="search" autoComplete="off" disabled={disabled} value={query} placeholder="예: 벤치, barbell" onChange={event => setQuery(event.target.value)} />
    </div>
    <div className={styles.filters}>
      <p className={styles.filterLabel}>운동 부위</p>
      <div className={styles.filterStrip} role="group" aria-label="운동 부위 필터">
        <button type="button" disabled={disabled} aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')}><span>전체</span></button>
        {filters.map(([code, { label }]) => <button type="button" key={code} disabled={disabled} aria-pressed={filter === code} onClick={() => setFilter(code)}><span>{label}</span></button>)}
      </div>
    </div>
    {failed ? <StatusNotice error>운동 정보를 불러오지 못했습니다.</StatusNotice> : loading ? <StatusNotice>운동 정보를 불러오는 중입니다.</StatusNotice>
      : <ul ref={list} role="list" aria-label="표준 운동 목록" className={styles.results}>{results.map(exercise => {
        const first = primaryMuscles(exercise)[0], group = catalogGroups[catalogRowGroup(exercise, first)]
        return <li key={exercise.id}><button type="button" className={styles.result} disabled={disabled} onClick={event => {
          onSelect(exercise, event); if (resetOnSelect) setQuery('')
        }}><ExerciseIcon kind={group.icon} /><span className={styles.resultText}><strong>{exercise.name}</strong>
          <Metadata>{group.label} · {first?.name ?? '등록 정보 없음'}</Metadata></span><span className={styles.arrow} aria-hidden="true">›</span>
        </button></li>
      })}</ul>}
    <p role="status" className={styles.empty}>{!loading && !failed && !exercises.length ? '등록된 표준 운동이 없습니다. 카탈로그 등록 후 다시 조회해 주세요.'
      : !loading && !failed && !results.length ? '검색 결과가 없습니다.' : ''}</p>
  </div>
}
