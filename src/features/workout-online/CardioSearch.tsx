import { useState } from 'react'
import { ExerciseIcon } from '../../components/ExerciseIcon.tsx'
import { SearchList } from '../../components/SearchList.tsx'
import { searchExercises } from './catalog.ts'
import { cardioCategory, cardioCategoryLabels } from './catalog-label.ts'
import type { CardioActivity } from './types.ts'

const icons = { WALKING: 'walking', RUNNING: 'running', CYCLING: 'cycling', OTHER: 'other' } as const
const tags = [{ id: 'ALL', name: '전체' }, ...Object.entries(cardioCategoryLabels).map(([id, name]) => ({ id, name }))]

export function CardioSearch({ activities, onSelect, onCancel }: {
  activities: CardioActivity[]; onSelect: (activity: CardioActivity) => void; onCancel?: () => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const candidates = filter === 'ALL' ? activities : activities.filter(a => cardioCategory(a) === filter)
  const results = searchExercises(candidates, query, candidates.length)
  return <div className="exercise-search" onKeyDown={event => {
    if (event.key === 'Escape' && !event.nativeEvent.isComposing) onCancel?.()
  }}>
    <SearchList defaultOpen tags={{ label: '유산소 유형', hideLabel: true, options: tags, selected: filter, onSelect: setFilter }}
      query={query} onQuery={setQuery} onClear={() => { setQuery(''); setFilter('ALL') }}
      label="유산소 검색 · 이름 또는 별칭" resultsLabel="표준 유산소 목록"
      issue={!activities.length ? '선택 가능한 표준 유산소 종목이 없습니다.' : undefined}
      options={results.map(activity => {
        const category = cardioCategory(activity)
        return { id: activity.id, name: activity.name, description: cardioCategoryLabels[category], icon: <ExerciseIcon kind={icons[category]} /> }
      })}
      onSelect={id => {
        const activity = results.find(a => a.id === id)
        if (activity) onSelect(activity)
      }} />
  </div>
}
