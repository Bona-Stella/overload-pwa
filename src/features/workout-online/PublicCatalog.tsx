import { usePageRead } from '../../app/usePageRead.ts'
import { useSuccessToast } from '../../components/common-ui/useSuccessToast.ts'
import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { navigateBack, useScreenHistory } from '../../app/navigation.ts'
import type { Ref } from 'react'
import { ReviewExerciseMediaContext } from '../../app/review-context.ts'
import { Button, Card, Metadata } from '../../components/ui.tsx'
import { RefreshButton } from '../../components/common-ui/RefreshButton.tsx'
import { readFailure, readWithDeadline } from '../../app/read-deadline.ts'
import { ContentError } from '../../components/common-ui/ContentFeedback.tsx'
import { Toast } from '../../components/common-ui/Toast.tsx'
import { useReadErrorToast } from '../../components/common-ui/useReadErrorToast.ts'
import { LoadingSkeleton } from '../../components/LoadingSkeleton.tsx'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import type { CatalogExercise } from './types.ts'
import type { WorkoutApi } from './api.ts'
import { catalogDetailView, primaryMuscles } from './catalog-browse.ts'
import type { CatalogBrowseExercise, CatalogMuscle } from './catalog-browse.ts'
import { groupNames } from './catalog-label.ts'
import { ExerciseSearch } from './ExerciseSearch.tsx'
import styles from './PublicCatalog.module.css'

export function PublicCatalog({ api, userId, onInvalid, onBack, active = true, enabled = true, prefetched }: {
  api: WorkoutApi; userId: string | null; onInvalid: (error: unknown) => void; onBack: () => void
  active?: boolean; enabled?: boolean; prefetched?: CatalogExercise[]
}) {
  const mediaSources = useContext(ReviewExerciseMediaContext)
  const [details] = useState(() => new Map<string, CatalogBrowseExercise>())
  const [retry, setRetry] = useState(0)
  const usedPrefetch = useRef<CatalogExercise[] | undefined>(undefined)
  const [result, setResult] = useState<{ userId: string; items: CatalogBrowseExercise[] | null; failed: boolean; request: number; message?: string } | null>(null)
  const invalidate = useCallback((error: unknown) => {
    if (error && typeof error === 'object' && 'code' in error
      && ['DATA_GENERATION_MISMATCH', 'OWNER_MISMATCH', 'SESSION_CHANGED'].includes(String(error.code))) onInvalid(error)
  }, [onInvalid])
  useEffect(() => {
    if (!active || !enabled || !userId) return
    if (prefetched && usedPrefetch.current !== prefetched && retry === 0) {
      usedPrefetch.current = prefetched
      return
    }
    const abort = new AbortController()
    void readWithDeadline(abort.signal, signal => api.publicCatalog(userId, signal)).then(value => {
      if (!abort.signal.aborted) setResult({ userId, items: value, failed: false, request: retry })
    }).catch(error => {
      if (!abort.signal.aborted) {
        const denied = error && typeof error === 'object' && 'status' in error && [401, 403, 404, 409].includes(Number(error.status))
        if (denied) details.clear()
        setResult(previous => ({ userId, items: !denied && previous?.userId === userId ? previous.items : null, failed: true, request: retry, message: readFailure(error, '운동 목록을 불러오지 못했어요.') }))
        invalidate(error)
      }
    })
    return () => abort.abort()
  }, [api, userId, invalidate, active, enabled, details, retry, prefetched])

  const loadDetail = useCallback(async (id: string, signal: AbortSignal) => {
    try { return catalogDetailView(await api.exerciseDetail(userId ?? '', id, signal)) }
    catch (error) { if (!signal.aborted) invalidate(error); throw error }
  }, [api, userId, invalidate])
  const current = result?.userId === userId ? result : null
  if (!active) return null
  return <CatalogView key={userId} items={current ? current.items : prefetched ?? null} failed={current?.failed} message={current?.message} refreshing={!!current && current.request !== retry} loadDetail={loadDetail} detailCache={details}
    onRetry={() => setRetry(value => value + 1)} mediaSources={mediaSources} onBack={onBack} historyScope={userId ?? 'unavailable'} />
}

function CatalogHeading({ title, backLabel, onBack, headingRef }: {
  title: string; backLabel: string; onBack: () => void; headingRef: Ref<HTMLHeadingElement>
}) {
  return <header className={styles.header}>
    <Button shape="control" variant="quiet" className={styles.back} aria-label={backLabel} onClick={onBack}><span aria-hidden="true">‹</span> 뒤로</Button>
    <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
  </header>
}

type DetailLoader = (id: string, signal: AbortSignal) => Promise<CatalogBrowseExercise>

export function CatalogView({ items, failed = false, message, refreshing = false, reviewNote, instructionNotes, mediaSources, loadDetail, detailCache, onRetry, onBack, historyScope = 'review' }: {
  items: CatalogBrowseExercise[] | null; failed?: boolean; message?: string; refreshing?: boolean; reviewNote?: string
  instructionNotes?: Readonly<Record<string, string>>; mediaSources?: Readonly<Record<string, string>>; loadDetail?: DetailLoader; onBack: () => void; historyScope?: string
  detailCache?: Map<string, CatalogBrowseExercise>; onRetry?: () => void
}) {
  const [selectedId, setSelected] = useScreenHistory<string | null>('exercise-detail:catalog:' + historyScope, null)
  const selected = items?.find(item => item.id === selectedId)
  const back = () => navigateBack(() => setSelected(null, true))
  const listTitle = useRef<HTMLHeadingElement>(null)
  const detailTitle = useRef<HTMLHeadingElement>(null)
  const selectedRow = useRef<HTMLButtonElement>(null)
  const [prepared, setPrepared] = useState<CatalogBrowseExercise>()
  const pageRead = usePageRead(!selectedId)
  const openFeedback = useSuccessToast(!selectedId ? historyScope : null)
  function openDetail(item: CatalogBrowseExercise, trigger: HTMLButtonElement) {
    pageRead.cancel()
    openFeedback.clear()
    selectedRow.current = trigger
    listScroll.current = window.scrollY
    const cached = detailCache?.get(item.id)
    if (!loadDetail || cached) { setPrepared(undefined); setSelected(item.id); return }
    void pageRead.read(signal => loadDetail(item.id, signal), detail => {
      detailCache?.set(item.id, detail)
      setPrepared(detail)
      setSelected(item.id)
    }, error => openFeedback.show(readFailure(error, '운동 정보를 불러오지 못했어요.'), 'error'))
  }
  const listScroll = useRef(0)
  const readIssue = '운동 목록을 불러오지 못했어요.'
  const feedback = useReadErrorToast(!selectedId && failed && items && !refreshing ? message ?? readIssue : null)
  const retry = onRetry && <RefreshButton onRefresh={onRetry} loading={refreshing} failure={!items && failed ? message ?? readIssue : null} />

  useLayoutEffect(() => {
    if (selectedId) {
      detailTitle.current?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
    } else if (selectedRow.current?.isConnected) {
      selectedRow.current.focus({ preventScroll: true })
      window.scrollTo(0, listScroll.current)
    } else {
      listTitle.current?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
    }
  }, [selectedId])

  return <>
    <div className={`${styles.screen} ${styles.catalogList}`} hidden={!!selectedId}>
      <RecordSubpageHeader title="운동 종목 보기" backLabel="설정으로 돌아가기" onBack={onBack} headingRef={listTitle} />
      <Card className={styles.catalogCard}>
        <div className={styles.sectionHeader}><h2>표준 운동</h2><span className={styles.tag}>조회 전용</span></div>
        {items === null ? failed ? <ContentError embedded title={readIssue} action={retry} /> : <LoadingSkeleton layout="row" label="운동 목록을 불러오고 있어요." /> :
          <ExerciseSearch exercises={items} resetOnSelect={false} defaultOpen
            onSelect={(item, event) => openDetail(item, event.currentTarget)} />}
        {failed && items && retry}
        {reviewNote && <p className={styles.description}>{reviewNote}</p>}
      </Card>
    </div>
    <Toast toast={openFeedback.toast} onDismiss={openFeedback.dismiss} bottomClearance="var(--tabs-height, 56px)" />
    {selected ? <CatalogDetail exercise={selected} onBack={back} headingRef={detailTitle} prepared={prepared?.id === selected.id ? prepared : undefined} loadDetail={loadDetail} detailCache={detailCache} instructionNote={instructionNotes?.[selected.id]} mediaSource={mediaSources?.[selected.id]} reviewNote={reviewNote}/>
      : selectedId && <div className={styles.screen}><CatalogHeading title="운동 상세" backLabel="운동 목록으로 돌아가기" onBack={back} headingRef={detailTitle} />
        {items === null && !failed ? <LoadingSkeleton layout="detail" label="운동 정보를 불러오고 있어요." /> : <ContentError title="운동 정보를 찾을 수 없어요." action={failed ? retry : undefined} />}</div>}
    <Toast toast={feedback.toast} onDismiss={feedback.dismiss} bottomClearance="var(--tabs-height, 56px)" />
  </>
}

/** The existing standard catalog detail page, also used by search-result navigation. */
export function CatalogDetail({exercise,onBack,headingRef,loadDetail,detailCache,instructionNote,mediaSource,reviewNote,prepared}:{exercise:CatalogBrowseExercise;onBack:()=>void;headingRef:Ref<HTMLHeadingElement>;loadDetail?:DetailLoader;detailCache?:Map<string,CatalogBrowseExercise>;instructionNote?:string;mediaSource?:string;reviewNote?:string;prepared?:CatalogBrowseExercise}){
 return <div className={styles.screen+" catalog-detail-page"} data-catalog-detail><CatalogHeading title="운동 상세" backLabel="운동 목록으로 돌아가기" onBack={onBack} headingRef={headingRef}/><SelectedExercise key={exercise.id} exercise={exercise} prepared={prepared} loadDetail={loadDetail} detailCache={detailCache} instructionNote={instructionNote} mediaSource={mediaSource}/>{reviewNote&&<p className={styles.description}>{reviewNote}</p>}</div>
}

export function SelectedExercise({ exercise, loadDetail, detailCache, instructionNote, mediaSource, prepared }: {
  prepared?: CatalogBrowseExercise; exercise: CatalogBrowseExercise; loadDetail?: DetailLoader; instructionNote?: string; mediaSource?: string
  detailCache?: Map<string, CatalogBrowseExercise>
}) {
  const [result, setResult] = useState<{ detail?: CatalogBrowseExercise; error?: unknown } | null>(() => {
    const detail = prepared ?? detailCache?.get(exercise.id)
    return detail ? { detail } : null
  })
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState(0)
  const refreshing = attempt !== settled
  const status = result?.error && typeof result.error === 'object' && 'status' in result.error ? result.error.status : null
  const message = status === 404 ? '운동 정보를 찾을 수 없어요.' : status === 403 ? '이 운동 정보를 볼 권한이 없어요.' : readFailure(result?.error, '운동 정보를 불러오지 못했어요.')
  const feedback = useReadErrorToast(result?.detail && result.error && !refreshing ? message : null)
  useEffect(() => {
    if (!loadDetail || prepared && attempt === 0) return
    const abort = new AbortController()
    void readWithDeadline(abort.signal, signal => loadDetail(exercise.id, signal)).then(detail => {
      if (abort.signal.aborted) return
      detailCache?.set(exercise.id, detail)
      setResult({ detail }); setSettled(attempt)
    }).catch(error => {
      if (abort.signal.aborted) return
      const denied = error && [401, 403, 404, 409].includes(Number(error.status))
      if (denied) detailCache?.delete(exercise.id)
      setResult(previous => ({ detail: denied ? undefined : previous?.detail, error })); setSettled(attempt)
    })
    return () => abort.abort()
  }, [exercise.id, loadDetail, attempt, detailCache, prepared])
  if (!loadDetail) return <ExerciseDetail exercise={exercise} instructionNote={instructionNote} mediaSource={mediaSource} />
  if (result?.detail && !result.error) return <ExerciseDetail exercise={result.detail} mediaSource={mediaSource} protectedMedia />
  if (!result) return <LoadingSkeleton layout="detail" label="운동 정보를 불러오는 중입니다." />
  const retry = <RefreshButton loading={refreshing} failure={!result.detail ? message : null} onRefresh={() => setAttempt(value => value + 1)} />
  return result.detail ? <><ExerciseDetail exercise={result.detail} mediaSource={mediaSource} protectedMedia />{retry}
    <Toast toast={feedback.toast} onDismiss={feedback.dismiss} bottomClearance="var(--tabs-height, 56px)" /></> : <ContentError title={message} action={retry} />
}

function ExerciseDetail({ exercise, instructionNote, mediaSource, protectedMedia = false }: {
  exercise: CatalogBrowseExercise; instructionNote?: string; mediaSource?: string; protectedMedia?: boolean
}) {
  const { name, aliases, pplSplit, frontBackSplit, instructionsKo, equipmentDescription } = exercise
  const steps = exercise.instructionSteps ?? instructionsKo?.split(/\r\n|\r|\n/).map(step => step.trim()).filter(Boolean) ?? []
  return <>
    <Card>
      <div className={styles.detailHeader}>
        <div><p className={styles.eyebrow}>STANDARD EXERCISE</p><h2>{name}</h2></div>
        <div className={styles.tags}>
          {pplSplit && <span className={styles.tag}>{pplSplit}</span>}
          {frontBackSplit && <span className={styles.tag}>{frontBackSplit === 'FRONT' ? '전면' : '후면'}</span>}
          <span className={styles.tag}>조회 전용</span>
        </div>
      </div>
      {aliases.length > 0 && <p className={styles.aliases}>별칭 · {aliases.join(', ')}</p>}
    </Card>
    <Card>
      <h2>동작 시연</h2>
      <ExerciseGif key={exercise.id + ':' + mediaSource} source={mediaSource} name={name} protectedMedia={protectedMedia} />
    </Card>
    <Card className={styles.instructions}>
      <details>
        <summary><span>운동 자세 및 방법</span><span className={styles.chevron} aria-hidden="true" /></summary>
        <div className={styles.steps}>
          {instructionNote && <p className={styles.description}>{instructionNote}</p>}
          {steps.length > 0 ? <ol>{steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
            : <p className={styles.description}>등록된 운동 방법 정보가 없습니다.</p>}
          {equipmentDescription && <p className={styles.description}>기구 설명 · {equipmentDescription}</p>}
        </div>
      </details>
    </Card>
    <MuscleCard title="주요 자극 근육" role="PRIMARY" muscles={primaryMuscles(exercise)} />
    <MuscleCard title="보조 자극 근육" role="SECONDARY" muscles={exercise.muscles?.filter(muscle => muscle.role === 'SECONDARY') ?? []} />
  </>
}

function ExerciseGif({ source, name, protectedMedia }: { source?: string; name: string; protectedMedia: boolean }) {
  const [loaded, setLoaded] = useState(false)
  return <>
    <div className={styles.gifPlaceholder}>
      {source && <img className={styles.gifImage} src={source} width={180} height={180} alt={name + ' 운동 동작'}
        hidden={!loaded} onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} />}
      {!loaded && <><span aria-hidden="true">▧</span><p>GIF를 제공하지 않습니다</p></>}
    </div>
    {source && (protectedMedia ? loaded && <p className={styles.description}>동작 시연 제공 · AscendAPI</p>
      : <p className={styles.description}>개발용 미디어 시연</p>)}
  </>
}

function MuscleCard({ title, role, muscles }: { title: string; role: CatalogMuscle['role']; muscles: CatalogMuscle[] }) {
  return <Card>
    <div className={styles.sectionHeader}><h2>{title}</h2><Metadata>{role}</Metadata></div>
    {muscles.length > 0 ? <ul role="list" className={styles.muscles}>{muscles.map((muscle, index) => <li key={muscle.id}>
      <span className={styles.muscleLabel}><strong>{muscle.name}</strong><Metadata>{groupNames[muscle.groupCode] ?? muscle.groupCode}</Metadata></span>
      {role === 'PRIMARY' && index === 0 && <span className={styles.coreTag}>핵심</span>}
    </li>)}</ul> : <p className={styles.description}>등록된 {title} 정보가 없습니다.</p>}
  </Card>
}
