import { useRef, useState } from 'react'
import { SearchList } from '../../../src/components/SearchList.tsx'
import { Card } from '../../../src/components/ui.tsx'
import { ActionButton } from '../../../src/components/common-ui/ActionButton.tsx'
import { RoutineTagList } from '../../../src/components/common-ui/RoutineTagList.tsx'
import activityStyles from '../../../src/features/statistics/Activity.module.css'
import { SearchScopePopover } from '../../../src/features/statistics/SearchScopePopover.tsx'
import { catalogGroups } from '../../../src/features/workout-online/catalog-browse.ts'
import styles from './CommonUiPreview.module.css'

const scopes = [
  { id: 'all', name: '전체' },
  { id: 'exercise', name: '운동별' },
  { id: 'group', name: '분류별' },
  { id: 'muscle', name: '근육별' },
]
const groups = Object.entries(catalogGroups).map(([id, { label }]) => ({ id, name: label }))
const exerciseTags = [
  { id: 'ALL', name: '전체' },
  ...groups,
  { id: 'stability', name: '상체 보조 · 어깨 안정화 운동' },
]
const muscleTags = [{ id: 'ALL', name: '전체' }, ...groups.filter(group => ['CHEST', 'BACK', 'SHOULDERS'].includes(group.id))]
const exercises = [
  { id: 'bench', name: '벤치 프레스', group: 'CHEST', description: '가슴 · 대흉근' },
  { id: 'pull', name: '랫 풀다운', group: 'BACK', description: '등 · 광배근' },
  { id: 'press', name: '숄더 프레스', group: 'SHOULDERS', description: '어깨 · 삼각근' },
  { id: 'face-pull', name: '페이스 풀', group: 'stability', description: '상체 안정화 · 후면 삼각근' },
]
const muscles = [
  { id: 'pectorals', name: '대흉근', group: 'CHEST', description: '가슴 · 주요 자극 근육' },
  { id: 'latissimus', name: '광배근', group: 'BACK', description: '등 · 주요 자극 근육' },
  { id: 'deltoid', name: '삼각근', group: 'SHOULDERS', description: '어깨 · 주요 자극 근육' },
]
const categories = groups.map(group => ({ ...group, group: group.id, description: '운동 분류' }))

const routineTags = [
  { id: '', title: '미지정', description: '분류 태그 없이 루틴 이름 사용' },
  { id: 'PUSH', title: 'PUSH', description: '가슴·어깨·삼두 중심의 밀기 운동' },
  { id: 'PULL', title: 'PULL', description: '등·이두 중심의 당기기 운동' },
  { id: 'LEGS', title: 'LEGS', description: '다리 근육을 집중적으로 훈련하는 루틴' },
  { id: 'CARDIO', title: 'CARDIO', description: '유산소 운동 중심', disabled: true },
]

function TrendSearchExample() {
  const [scope, setScope] = useState('exercise')
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('ALL')
  const [selected, setSelected] = useState('')
  const needle = query.trim().toLowerCase()
  const candidates = scope === 'exercise' ? exercises : scope === 'muscle' ? muscles
    : scope === 'group' ? categories : [...exercises, ...categories, ...muscles]
  const options = candidates.filter(candidate => (tag === 'ALL' || candidate.group === tag)
    && (candidate.name + ' ' + candidate.description).toLowerCase().includes(needle))

  const clear = () => { setTag('ALL'); setQuery(''); setSelected('') }
  const selectTag = (id: string) => { setTag(id); setQuery(''); setSelected('') }

  return <div className={activityStyles.page}>
    <Card className={activityStyles.trend} aria-label="운동량 추이 검색 예시">
      <div className={activityStyles.sectionHeading}><h2>운동량 추이</h2><span>완료 기록 기준</span></div>
      <SearchList
        defaultOpen scopes={scopes} scope={scope} onScope={id => { setScope(id); clear() }}
        renderScope={control => <SearchScopePopover {...control} />}
        query={query} onQuery={setQuery} selected={selected} onClear={clear}
        label="운동·분류·근육 검색"
        tags={scope === 'exercise' ? { label: '운동 부위', options: exerciseTags, selected: tag, onSelect: selectTag }
          : scope === 'muscle' ? { label: '근육 분류', options: muscleTags, selected: tag, onSelect: selectTag } : undefined}
        options={options} onSelect={id => {
          const candidate = options.find(option => option.id === id)
          if (candidate) { setSelected(candidate.name); setQuery('') }
        }}
      />
    </Card>
  </div>
}

export function TagPickerExamples() {
  const [example, setExample] = useState<'search' | 'routine' | null>(null)
  const [state, setState] = useState<'ready' | 'loading' | 'empty'>('ready')
  const [selected, setSelected] = useState('')
  const routineTrigger = useRef<HTMLButtonElement>(null)

  return <section className={styles.section} aria-label="목록 UI">
    <h2>목록 UI</h2>
    <div className={styles.controls}>
      <ActionButton size="small" aria-pressed={example === 'search'} onClick={() => setExample('search')}>검색 태그 UI</ActionButton>
      <ActionButton size="small" aria-pressed={example === 'routine'} onClick={event => {
        routineTrigger.current = event.currentTarget
        setExample('routine')
        setState('ready')
      }}>루틴 태그 선택 목록</ActionButton>
    </div>
    {example === 'search' && <TrendSearchExample />}
    {example === 'routine' && <>
      <div className={styles.controls}>
        <ActionButton size="small" aria-pressed={state === 'ready'} onClick={() => setState('ready')}>목록 표시</ActionButton>
        <ActionButton size="small" aria-pressed={state === 'loading'} onClick={() => setState('loading')}>목록 스켈레톤</ActionButton>
        <ActionButton size="small" aria-pressed={state === 'empty'} onClick={() => setState('empty')}>빈 목록</ActionButton>
      </div>
      <RoutineTagList label="루틴 태그 선택" options={state === 'empty' ? [] : routineTags}
        selectedId={selected} onSelect={setSelected} loading={state === 'loading'}
        onCancel={() => { setExample(null); routineTrigger.current?.focus() }} />
    </>}
  </section>
}
