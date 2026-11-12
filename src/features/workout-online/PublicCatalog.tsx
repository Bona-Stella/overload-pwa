import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, Ref } from 'react'
import { ExerciseIcon } from '../../components/ExerciseIcon.tsx'
import { Button, Card, Metadata, StatusNotice } from '../../components/ui.tsx'
import type { WorkoutApi } from './api.ts'
import { browseExercises, catalogGroups, catalogRowGroup, primaryMuscles } from './catalog-browse.ts'
import type { CatalogBrowseExercise, CatalogGroup, CatalogMuscle } from './catalog-browse.ts'
import { groupNames } from './catalog-label.ts'
import { exerciseVariantLabels } from './catalog.ts'
import styles from './PublicCatalog.module.css'

export function CatalogMenu({ open, onOpenChange, children }: {
  open: boolean; onOpenChange: (open: boolean) => void; children: (onBack: () => void) => ReactNode
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(open)
  const titleId = useId()
  const descriptionId = useId()
  useLayoutEffect(() => {
    if (!open && wasOpen.current) trigger.current?.focus()
    wasOpen.current = open
  }, [open])
  return open ? children(() => onOpenChange(false)) : <Card className={styles.menuCard}><button ref={trigger} type="button" className={styles.menuItem}
    aria-labelledby={titleId} aria-describedby={descriptionId} onClick={() => onOpenChange(true)}>
    <span><strong id={titleId}>운동 종목 보기</strong><span id={descriptionId} className={styles.description}>관리자 표준 운동 DB · 조회 전용</span></span>
    <span className={styles.arrow} aria-hidden="true">›</span>
  </button></Card>
}

export function PublicCatalog({ api, userId, onInvalid, onBack }: {
  api: WorkoutApi; userId: string | null; onInvalid: (error: unknown) => void; onBack: () => void
}) {
  const [items, setItems] = useState<CatalogBrowseExercise[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!userId) return
    const abort = new AbortController()
    void api.publicCatalog(userId, abort.signal).then(value => {
      if (!abort.signal.aborted) setItems(value)
    }).catch(error => {
      if (!abort.signal.aborted) { setFailed(true); onInvalid(error) }
    })
    return () => abort.abort()
  }, [api, userId, onInvalid])

  return <CatalogView items={items} failed={failed} onBack={onBack} />
}

function CatalogHeading({ title, backLabel, onBack, headingRef }: {
  title: string; backLabel: string; onBack: () => void; headingRef: Ref<HTMLHeadingElement>
}) {
  return <header className={styles.header}>
    <Button variant="quiet" className={styles.back} aria-label={backLabel} onClick={onBack}><span aria-hidden="true">‹</span> 뒤로</Button>
    <h1 ref={headingRef} tabIndex={-1}>{title}</h1>
  </header>
}

const filters = Object.entries(catalogGroups) as [CatalogGroup, (typeof catalogGroups)[CatalogGroup]][]

export function CatalogView({ items, failed = false, reviewNote, onBack }: {
  items: CatalogBrowseExercise[] | null; failed?: boolean; reviewNote?: string; onBack: () => void
}) {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CatalogGroup | 'ALL'>('ALL')
  const [selected, setSelected] = useState<CatalogBrowseExercise | null>(null)
  const listTitle = useRef<HTMLHeadingElement>(null)
  const detailTitle = useRef<HTMLHeadingElement>(null)
  const selectedRow = useRef<HTMLButtonElement>(null)
  const listScroll = useRef(0)
  const results = useMemo(() => items ? browseExercises(items, query, filter) : [], [items, query, filter])
  const variants = useMemo(() => exerciseVariantLabels(items ?? []), [items])

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
        <div className={styles.search}>
          <label htmlFor={searchId}>표준 운동 검색 · 이름 또는 별칭</label>
          <input id={searchId} type="search" autoComplete="off" placeholder="예: 벤치, barbell" value={query} onChange={event => setQuery(event.target.value)} />
        </div>
        <div className={styles.filters}>
          <p className={styles.filterLabel}>운동 부위</p>
          <div className={styles.filterStrip} role="group" aria-label="운동 부위 필터">
            <button type="button" aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')}><span>전체</span></button>
            {filters.map(([code, { label }]) => <button type="button" key={code} aria-pressed={filter === code} onClick={() => setFilter(code)}><span>{label}</span></button>)}
          </div>
        </div>
        {failed ? <StatusNotice error>운동 정보를 불러오지 못했습니다.</StatusNotice>
          : items === null ? <StatusNotice>운동 정보를 불러오는 중입니다.</StatusNotice>
          : <ul role="list" aria-label="표준 운동 목록" className={styles.results}>{results.map(item => {
            const first = primaryMuscles(item)[0]
            const group = catalogGroups[catalogRowGroup(item, first)]
            return <li key={item.id}>
              <button type="button" className={styles.result} onClick={event => {
                selectedRow.current = event.currentTarget
                listScroll.current = window.scrollY
                setSelected(item)
              }}>
                <ExerciseIcon kind={group.icon} />
                <span className={styles.resultText}><strong>{item.name}</strong>
                  <Metadata>{[group.label, first?.name ?? '등록 정보 없음', variants.get(item.id)].filter(Boolean).join(' · ')}</Metadata>
                </span>
                <span className={styles.arrow} aria-hidden="true">›</span>
              </button>
            </li>
          })}</ul>}
        <p role="status" className={styles.empty}>{!failed && items && !results.length ? '검색 결과가 없습니다.' : ''}</p>
        {reviewNote && <p className={styles.description}>{reviewNote}</p>}
      </Card>
    </div>
    {selected && <div className={styles.screen}>
      <CatalogHeading title="운동 상세" backLabel="운동 목록으로 돌아가기" onBack={() => setSelected(null)} headingRef={detailTitle} />
      <ExerciseDetail exercise={selected} />
      {reviewNote && <p className={styles.description}>{reviewNote}</p>}
    </div>}
  </>
}

function ExerciseDetail({ exercise }: { exercise: CatalogBrowseExercise }) {
  const { name, aliases, pplSplit, frontBackSplit, instructionsKo, equipmentDescription } = exercise
  const steps = instructionsKo?.split(/\r\n|\r|\n/).map(step => step.trim()).filter(Boolean) ?? []
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
      <h2>운동 동작 GIF</h2>
      <div className={styles.gifPlaceholder}><span aria-hidden="true">▧</span><p>GIF를 제공하지 않습니다</p></div>
    </Card>
    <Card className={styles.instructions}>
      <details>
        <summary><span>운동 자세 및 방법</span><span className={styles.chevron} aria-hidden="true" /></summary>
        <div className={styles.steps}>
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

function MuscleCard({ title, role, muscles }: { title: string; role: CatalogMuscle['role']; muscles: CatalogMuscle[] }) {
  return <Card>
    <div className={styles.sectionHeader}><h2>{title}</h2><Metadata>{role}</Metadata></div>
    {muscles.length > 0 ? <ul role="list" className={styles.muscles}>{muscles.map((muscle, index) => <li key={muscle.id}>
      <span className={styles.muscleLabel}><strong>{muscle.name}</strong><Metadata>{groupNames[muscle.groupCode] ?? muscle.groupCode}</Metadata></span>
      {role === 'PRIMARY' && index === 0 && <span className={styles.coreTag}>핵심</span>}
    </li>)}</ul> : <p className={styles.description}>등록된 {title} 정보가 없습니다.</p>}
  </Card>
}
