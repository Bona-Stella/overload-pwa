import { routineTags } from '../home/tags.ts'
import type { RoutineTag } from '../home/tags.ts'
import { DropdownField } from '../../components/common-ui/SelectDropdown.tsx'
import styles from './Routine.module.css'

const tagDescriptions = ['가슴·어깨·삼두 중심의 밀기 운동', '등·이두 중심의 당기기 운동', '다리 근육을 집중적으로 훈련하는 루틴', '신체 전면 근육 중심', '신체 후면 근육 중심', '상체와 하체를 고르게 구성하는 전신 루틴', '상·하체 분할에서 상체 전반을 담당', '상·하체 분할에서 하체 전반을 담당', '유산소 운동 중심', '특정 부위나 분할에 얽매이지 않은 자유 구성'];
const options = [{ id: '', name: '미지정', description: '분류 태그 없이 루틴 이름 사용' },
  ...routineTags.map((tag, index) => ({ id: tag, name: tag, description: tagDescriptions[index] }))]

export function TagPicker({ value, onChange, readOnly = false }: {
  value: RoutineTag | ''
  onChange: (value: RoutineTag | '') => void
  readOnly?: boolean
}) {
  return <DropdownField label="루틴 태그" caption="루틴 태그 · 선택" className={styles.tagField} value={value} options={options}
    disabled={readOnly} onChange={tag => onChange(tag as RoutineTag | '')} />
}
