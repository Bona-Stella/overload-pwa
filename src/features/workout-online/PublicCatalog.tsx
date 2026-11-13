import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import { ReviewExerciseMediaContext } from '../../review/context.ts'
import { Button, Card, Metadata, StatusNotice } from '../../components/ui.tsx'
import type { WorkoutApi } from './api.ts'
import { catalogDetailView, primaryMuscles } from './catalog-browse.ts'
import type { CatalogBrowseExercise, CatalogMuscle } from './catalog-browse.ts'
import { groupNames } from './catalog-label.ts'
import { ExerciseSearch } from './ExerciseSearch.tsx'
import styles from './PublicCatalog.module.css'

export function PublicCatalog({ api, userId, onInvalid, onBack }: {
  api: WorkoutApi; userId: string | null; onInvalid: (error: unknown) => void; onBack: () => void
}) {
  const mediaSources = useContext(ReviewExerciseMediaContext)
  const [result, setResult] = useState<{ userId: string; items: CatalogBrowseExercise[] | null; failed: boolean } | null>(null)
  const invalidate = useCallback((error: unknown) => {
    if (error && typeof error === 'object' && 'code' in error
      && ['DATA_GENERATION_MISMATCH', 'OWNER_MISMATCH', 'SESSION_CHANGED'].includes(String(error.code))) onInvalid(error)
  }, [onInvalid])
  useEffect(() => {
    if (!userId) return
    const abort = new AbortController()
    void api.publicCatalog(userId, abort.signal).then(value => {
      if (!abort.signal.aborted) setResult({ userId, items: value, failed: false })
    }).catch(error => {
      if (!abort.signal.aborted) { setResult({ userId, items: null, failed: true }); invalidate(error) }
    })
    return () => abort.abort()
  }, [api, userId, invalidate])

  const loadDetail = useCallback(async (id: string, signal: AbortSignal) => {
    try { return catalogDetailView(await api.exerciseDetail(userId ?? '', id, signal)) }
    catch (error) { if (!signal.aborted) invalidate(error); throw error }
  }, [api, userId, invalidate])
  const current = result?.userId === userId ? result : null
  return <CatalogView key={userId} items={current?.items ?? null} failed={current?.failed} loadDetail={loadDetail} mediaSources={mediaSources} onBack={onBack} />
}

function CatalogHeading({ title, backLabel, onBack, headingRef }: {
  title: string; backLabel: string; onBack: () => void; headingRef: Ref<HTMLHeadingElement>
}) {
  return <header className={styles.header}>
    <Button variant="quiet" className={styles.back} aria-label={backLabel} onClick={onBack}><span aria-hidden="true">‹</span> 뒤로</Button>
    <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
  </header>
}

type DetailLoader = (id: string, signal: AbortSignal) => Promise<CatalogBrowseExercise>

export function CatalogView({ items, failed = false, reviewNote, instructionNotes, mediaSources, loadDetail, onBack }: {
  items: CatalogBrowseExercise[] | null; failed?: boolean; reviewNote?: string
  instructionNotes?: Readonly<Record<string, string>>; mediaSources?: Readonly<Record<string, string>>; loadDetail?: DetailLoader; onBack: () => void
}) {
  const [selected, setSelected] = useState<CatalogBrowseExercise | null>(null)
  const listTitle = useRef<HTMLHeadingElement>(null)
  const detailTitle = useRef<HTMLHeadingElement>(null)
  const selectedRow = useRef<HTMLButtonElement>(null)
  const listScroll = useRef(0)

  useLayoutEffect(() => {
    if (selected) {
      detailTitle.current?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
    } else if (selectedRow.current?.isConnected) {
      selectedRow.current.focus({ preventScroll: true })
      window.scrollTo(0, listScroll.current)
    } else {
      listTitle.current?.focus({ preventScroll: true })
      window.scrollTo(0, 0)
    }
  }, [selected])

  return <>
    <div className={styles.screen} hidden={!!selected}>
      <CatalogHeading title="운동 종목 보기" backLabel="설정으로 돌아가기" onBack={onBack} headingRef={listTitle} />
      <Card className={styles.catalogCard}>
        <div className={styles.sectionHeader}><h2>표준 운동 DB</h2><span className={styles.tag}>조회 전용</span></div>
        <p className={styles.description}>등록·편집·삭제는 관리자가 수행합니다. 사용자는 이름·별칭으로 검색하고 정보를 확인합니다.</p>
        <ExerciseSearch exercises={items ?? []} loading={items === null && !failed} failed={failed} resetOnSelect={false}
          onSelect={(item, event) => { selectedRow.current = event.currentTarget; listScroll.current = window.scrollY; setSelected(item) }} />
        {reviewNote && <p className={styles.description}>{reviewNote}</p>}
      </Card>
    </div>
    {selected && <div className={styles.screen}>
      <CatalogHeading title="운동 상세" backLabel="운동 목록으로 돌아가기" onBack={() => setSelected(null)} headingRef={detailTitle} />
      <SelectedExercise key={selected.id} exercise={selected} loadDetail={loadDetail} instructionNote={instructionNotes?.[selected.id]} mediaSource={mediaSources?.[selected.id]} />
      {reviewNote && <p className={styles.description}>{reviewNote}</p>}
    </div>}
  </>
}

function SelectedExercise({ exercise, loadDetail, instructionNote, mediaSource }: {
  exercise: CatalogBrowseExercise; loadDetail?: DetailLoader; instructionNote?: string; mediaSource?: string
}) {
  const [result, setResult] = useState<{ detail?: CatalogBrowseExercise; error?: unknown } | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!loadDetail) return
    const abort = new AbortController()
    void loadDetail(exercise.id, abort.signal).then(detail => {
      if (!abort.signal.aborted) setResult({ detail })
    }).catch(error => { if (!abort.signal.aborted) setResult({ error }) })
    return () => abort.abort()
  }, [exercise.id, loadDetail, attempt])
  if (!loadDetail) return <ExerciseDetail exercise={exercise} instructionNote={instructionNote} mediaSource={mediaSource} />
  if (result?.detail) return <ExerciseDetail exercise={result.detail} mediaSource={mediaSource} protectedMedia />
  if (!result) return <StatusNotice>운동 정보를 불러오는 중입니다.</StatusNotice>
  const status = result.error && typeof result.error === 'object' && 'status' in result.error ? result.error.status : null
  return <Card><StatusNotice error>{status === 404 ? '운동 정보를 찾을 수 없습니다.'
    : status === 403 ? '운동 정보를 조회할 권한이 없습니다.' : '운동 정보를 불러오지 못했습니다.'}</StatusNotice>
    <Button variant="quiet" onClick={() => { setResult(null); setAttempt(value => value + 1) }}>다시 조회</Button></Card>
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
