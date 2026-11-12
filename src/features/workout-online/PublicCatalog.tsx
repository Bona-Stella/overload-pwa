import { useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/ui.tsx'
import type { WorkoutApi } from './api.ts'
import { exerciseVariantLabels, searchExercises } from './catalog.ts'
import type { CatalogExercise } from './types.ts'

export function PublicCatalog({ api, userId, onInvalid }: {
  api: WorkoutApi; userId: string; onInvalid: (error: unknown) => void
}) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<CatalogExercise[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const abort = new AbortController()
    void api.publicCatalog(userId, abort.signal).then(value => {
      if (!abort.signal.aborted) setItems(value)
    }).catch(error => {
      if (!abort.signal.aborted) { setFailed(true); onInvalid(error) }
    })
    return () => abort.abort()
  }, [api, userId, onInvalid])
  const results = items ? searchExercises(items, query) : []
  const variants = useMemo(() => exerciseVariantLabels(items ?? []), [items])
  return <Card><h2>표준 운동 카탈로그</h2>
    <label>운동 이름 또는 별칭 검색<input value={query} onChange={event => setQuery(event.target.value)} /></label>
    {failed ? <p role="status">운동 정보를 불러오지 못했습니다.</p>
      : items === null ? <p role="status">운동 정보를 불러오는 중입니다.</p>
      : results.length === 0 ? <p role="status">일치하는 운동이 없습니다.</p>
      : <ul>{results.map(item => <li key={item.id}><details><summary>{item.name}{variants.has(item.id) ? ' · ' + variants.get(item.id) : ''}</summary>
        {item.aliases.length > 0 && <p>{item.aliases.join(' · ')}</p>}
        {item.equipmentDescription && <p>{item.equipmentDescription}</p>}
        {item.instructionsKo && <p>{item.instructionsKo}</p>}
      </details></li>)}</ul>}
  </Card>
}
