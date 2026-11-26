import type { Equipment, Manufacturer } from './types.ts'
import { loadType } from './validation.ts'
import { LOAD_LABELS } from './equipment.ts'
import { DropdownField } from '../../components/common-ui/SelectDropdown.tsx'

const unspecified = { id: '', name: '미지정' }
const loadOptions = [unspecified, ...Object.entries(LOAD_LABELS).map(([id, name]) => ({ id, name }))]

export function EquipmentFields({ value, manufacturers, onChange, disabled = false }: {
  value: Equipment; manufacturers: Manufacturer[]; onChange: (value: Equipment) => void; disabled?: boolean
}) {
  const manufacturerOptions = [unspecified, ...manufacturers]
  if (value.manufacturerId && !manufacturers.some(item => item.id === value.manufacturerId)) {
    manufacturerOptions.splice(1, 0, { id: value.manufacturerId, name: '현재 목록에 없는 제조사' })
  }
  return <div className="form-grid">
    <DropdownField label="제조사 · 선택" disabled={disabled} value={value.manufacturerId ?? ''}
      options={manufacturerOptions} onChange={id => onChange({ ...value, manufacturerId: id || null })} />
    <DropdownField label="부하 방식 · 선택" disabled={disabled} value={value.loadType ?? ''}
      options={loadOptions} onChange={code => onChange({ ...value, loadType: loadType(code) ? code : null })} />
  </div>
}
