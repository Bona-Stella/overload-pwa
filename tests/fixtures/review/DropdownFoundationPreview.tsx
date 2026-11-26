import { useState } from 'react'
import { AppShell } from '../../../src/app/AppShell.tsx'
import { ActionMenu } from '../../../src/components/common-ui/ActionMenu.tsx'
import { ConnectedDropdown } from '../../../src/components/common-ui/ConnectedDropdown.tsx'
import { DropdownField, SelectDropdown } from '../../../src/components/common-ui/SelectDropdown.tsx'
import { ContentError } from '../../../src/components/common-ui/ContentFeedback.tsx'
import { RefreshButton } from '../../../src/components/common-ui/RefreshButton.tsx'
import { Card, Button } from '../../../src/components/ui.tsx'
import { useConfirmation } from '../../../src/components/useConfirmation.tsx'
import { CardioSearch } from '../../../src/features/workout-online/CardioSearch.tsx'
import { EquipmentFields } from '../../../src/features/workout-online/EquipmentFields.tsx'
import type { Equipment } from '../../../src/features/workout-online/types.ts'
import { TagPicker } from '../../../src/features/workout-online/TagPicker.tsx'
import type { RoutineTag } from '../../../src/features/home/tags.ts'
import { activities } from './routine-samples.ts'
import styles from '../../../src/components/common-ui/ConnectedDropdown.module.css'
import filterTags from '../../../src/components/common-ui/FilterTags.module.css'
import preview from './CommonUiPreview.module.css'

const makers = [
  { id: 'hammer', name: 'Hammer Strength' }, { id: 'life', name: 'Life Fitness' },
  ...Array.from({ length: 15 }, (_, index) => ({ id: `maker-${index}`, name: `검수용 제조사 ${index + 1}` })),
]
const routines = [
  { id: '', name: '휴식' }, { id: 'upper', name: '상체 푸시', description: '벤치 프레스 · 케이블 페이스 풀' },
  { id: 'lower', name: '하체 운동과 회복을 함께 구성하는 긴 루틴 이름', description: '스쿼트 · 루마니안 데드리프트' },
  { id: 'locked', name: '선택할 수 없는 루틴', description: '루틴 구성을 확인하는 중이에요.', disabled: true },
  ...Array.from({ length: 15 }, (_, index) => ({ id: `routine-${index}`, name: `주간 루틴 ${index + 1}`, description: '보조 종목을 포함한 합성 검수 데이터' })),
]
const filters = [{ id: 'all', name: '전체' }, { id: 'assigned', name: '배정 완료' }, { id: 'unassigned', name: '배정 미완료' }]

export default function DropdownFoundationPreview() {
  const [equipment, setEquipment] = useState<Equipment>({ manufacturerId: 'hammer', loadType: 'PLATE' })
  const [tag, setTag] = useState<RoutineTag | ''>('')
  const [day, setDay] = useState('upper')
  const [filter, setFilter] = useState('all')
  const [home, setHome] = useState('upper')
  const [homeFilter, setHomeFilter] = useState('전체')
  const [action, setAction] = useState('')
  const [failed, setFailed] = useState(false)
  const [ask, confirmation] = useConfirmation()
  return <AppShell authenticated tab="routines" onNavigate={() => {}}>
    <div className={preview.intro}><h1>드롭다운·검색·메뉴 검수</h1>
      <p>이 페이지의 조작은 합성 예시 값에만 적용됩니다.</p>
      <a href={location.pathname}>공통 UI Preview</a>
    </div>
    <Card aria-label="제조사와 부하 방식 선택">
      <EquipmentFields value={equipment} manufacturers={makers} onChange={setEquipment} />
      <TagPicker value={tag} onChange={setTag} />
    </Card>
    <Card aria-label="콘텐츠 펼침">
      <ConnectedDropdown label="오늘만 다른 루틴 선택">{close => <>
        <div className={filterTags.strip} role="group" aria-label="검수 루틴 필터">
          {['전체', '미배정', '01', '02', '03', '04', '휴식'].map(name =>
            <button key={name} type="button" aria-pressed={homeFilter === name} onClick={() => setHomeFilter(name)}><span>{name}</span></button>)}
        </div>
        <div className={styles.scroll} data-dropdown-scroll aria-label="검수 루틴 목록">
          {(homeFilter === '휴식' ? routines.slice(0, 1) : routines).map(routine =>
            <button key={routine.id} type="button" className={styles.item} data-dropdown-item data-description={!!routine.description || undefined}
              disabled={routine.disabled} aria-pressed={home === routine.id} onClick={() => { setHome(routine.id); close() }}>
              <strong>{routine.name}</strong>{routine.description && <small>{routine.description}</small>}
            </button>)}
        </div>
      </>}</ConnectedDropdown>
    </Card>
    <Card aria-label="유산소 검색 예시">
      <h2>유산소 종목 검색</h2>
      <CardioSearch activities={activities} onSelect={item => setAction(item.name)} />
    </Card>
    <Card aria-label="필터와 액션 메뉴">
      <div className="row">
        <SelectDropdown label="배정 유무" variant="filter" options={filters} value={filter} onChange={setFilter} />
        <ActionMenu label="검수 액션 메뉴" actions={[
          { label: '이름 변경', run: () => setAction('이름 변경') },
          { label: '편집할 수 없는 일정', disabled: true },
          { label: '삭제', danger: true, run: async () => {
            if (await ask({ title: '검수 일정을 삭제할까요?', description: <p>합성 예시만 변경합니다.</p>, confirmLabel: '삭제', destructive: true })) setAction('삭제')
          } },
        ]} />
      </div>
      {action && <p role="status">{action}</p>}
    </Card>
    <Card aria-label="가용 공간과 오류 상태">
      <DropdownField label="일요일 루틴" options={routines} value={day} onChange={setDay} disabled={failed} />
      {failed ? <ContentError embedded title="루틴을 불러오지 못했어요." action={<RefreshButton onRefresh={() => setFailed(false)} />} />
        : <Button onClick={() => setFailed(true)}>조회 실패 보기</Button>}
    </Card>
    {confirmation}
  </AppShell>
}
