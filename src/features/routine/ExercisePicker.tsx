import { useState } from 'react'
import type { ExerciseDefinition } from '../workout/types'

export function ExercisePicker({ definitions, onSelect, onCreate }: { definitions: ExerciseDefinition[]; onSelect: (id: string) => void; onCreate: (name: string) => string }) {
  const [query, setQuery] = useState('')
  const filtered = definitions.filter(d => d.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <section className="picker card">
    <label>종목 검색 / 사용자 종목 이름<input value={query} onChange={e => setQuery(e.target.value)} placeholder="예: 벤치프레스" /></label>
    <div className="picker-results">{filtered.map(d => <button type="button" className="list-button" key={d.id} onClick={() => onSelect(d.id)}>{d.name}<span aria-hidden="true">＋</span></button>)}</div>
    {!filtered.length && <p className="muted">검색 결과가 없습니다.</p>}
    <button type="button" disabled={!query.trim()} onClick={() => { const id = onCreate(query.trim()); if (id) { onSelect(id); setQuery('') } }}>사용자 종목 추가{query.trim() ? `: ${query.trim()}` : ''}</button>
  </section>
}
