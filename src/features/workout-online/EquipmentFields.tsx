import type { Equipment, Manufacturer } from './types.ts'
import { loadType } from './validation.ts'

import { LOAD_LABELS } from './equipment.ts'

export function EquipmentFields({ value, manufacturers, onChange, disabled = false }: {
  value: Equipment; manufacturers: Manufacturer[]; onChange: (value: Equipment) => void; disabled?: boolean
}) {
  return <div className="form-grid">
    <label>제조사 · 선택<select disabled={disabled} value={value.manufacturerId ?? ''} onChange={event => onChange({ ...value, manufacturerId: event.target.value || null })}>
      <option value="">미지정</option>
      {value.manufacturerId && !manufacturers.some(m => m.id === value.manufacturerId) && <option value={value.manufacturerId}>현재 목록에 없는 제조사</option>}
      {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
    </select></label>
    <label>부하 방식 · 선택<select disabled={disabled} value={value.loadType ?? ''} onChange={event => { const code = event.target.value; onChange({ ...value, loadType: loadType(code) ? code : null }) }}>
      <option value="">미지정</option>{Object.entries(LOAD_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
    </select></label>
  </div>
}
