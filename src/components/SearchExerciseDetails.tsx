import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CatalogDetail } from '../features/workout-online/PublicCatalog.tsx'
import { catalogDetailView } from '../features/workout-online/catalog-browse.ts'
import type { CatalogBrowseExercise } from '../features/workout-online/catalog-browse.ts'
import type { WorkoutApi } from '../features/workout-online/api.ts'
import { boundaryError } from '../features/home/load.ts'
import { useDetailReturn } from '../features/history/useRecordDetailHistory.ts'
import { navigateBack, useScreenHistory } from '../app/navigation.ts'
import { usePageRead } from '../app/usePageRead.ts'
import { readFailure } from '../app/read-deadline.ts'
import { useSuccessToast } from './common-ui/useSuccessToast.ts'
import { Toast } from './common-ui/Toast.tsx'
import { SearchDetailContext as Context } from './search-detail-context.ts'

/** Prepare the existing catalog detail while keeping the underlying search visible. */
export function SearchExerciseDetails({ children, api, userId, preview = [], enabled = true, onInvalid }: {
  children: ReactNode; api?: WorkoutApi; userId?: string; preview?: CatalogBrowseExercise[]
  enabled?: boolean; onInvalid?: (error: unknown) => void
}) {
  const owner = userId ?? 'preview'
  const [stored, setSelected] = useScreenHistory<{ id: string; name: string } | null>('exercise-detail:' + owner, null)
  const selected = enabled ? stored : null
  const [cache, setCache] = useState(() => ({ owner, details: new Map<string, CatalogBrowseExercise>() }))
  if (cache.owner !== owner) setCache({ owner, details: new Map() })
  const details = cache.details
  const [prepared, setPrepared] = useState<{ owner: string; detail: CatalogBrowseExercise }>()
  const heading = useRef<HTMLHeadingElement>(null)
  const remember = useDetailReturn(selected?.id, owner)
  const pageRead = usePageRead(enabled && !selected)
  const feedback = useSuccessToast(enabled && !selected ? owner : null)
  useLayoutEffect(() => {
    if (selected) heading.current?.focus({ preventScroll: true })
  }, [selected])
  const loadDetail = useCallback(async (id: string, signal: AbortSignal) => {
    try { return catalogDetailView(await api!.exerciseDetail(userId!, id, signal)) }
    catch (error) {
      if (!signal.aborted && boundaryError(error)) onInvalid?.(error)
      throw error
    }
  }, [api, userId, onInvalid])
  const sample = selected ? preview.find(item => item.id === selected.id || item.name === selected.name) : undefined
  const seed: CatalogBrowseExercise = sample ?? {
    id: selected?.id ?? '', name: selected?.name ?? '', aliases: [], exerciseType: 'WEIGHT',
    recordMethod: 'SETS_REPS', instructionsKo: null, equipmentDescription: null,
  }
  const detail = prepared?.owner === owner && prepared.detail.id === selected?.id ? prepared.detail : undefined
  return <Context value={(option, trigger) => {
    const id = option.exerciseId
    if (!id || !enabled) return
    pageRead.cancel()
    feedback.clear()
    remember(trigger)
    const route = { id, name: option.name }
    if (!api || !userId || details.has(id)) {
      setPrepared(undefined)
      setSelected(route)
      return
    }
    void pageRead.read(signal => loadDetail(id, signal), result => {
      details.set(id, result)
      setPrepared({ owner, detail: result })
      setSelected(route)
    }, error => feedback.show(readFailure(error, '운동 정보를 불러오지 못했어요.'), 'error'))
  }}>
    <div data-exercise-detail-source hidden={!!selected} style={selected ? undefined : { display: 'contents' }}>{children}</div>
    {selected && <CatalogDetail exercise={seed} headingRef={heading} onBack={() => navigateBack(() => setSelected(null, true))}
      loadDetail={api && userId ? loadDetail : undefined} detailCache={details} prepared={detail} />}
    <Toast toast={feedback.toast} onDismiss={feedback.dismiss} bottomClearance="var(--tabs-height, 56px)" />
  </Context>
}
