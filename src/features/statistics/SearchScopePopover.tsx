import type { SearchScopeControl } from '../../components/SearchList.tsx'
import { SelectDropdown } from '../../components/common-ui/SelectDropdown.tsx'

export function SearchScopePopover({ options, value, disabled, onOpen, onChange }: SearchScopeControl) {
  return <SelectDropdown label="검색 범위" variant="scope" options={options} value={value} disabled={disabled}
    onOpen={onOpen} onChange={onChange} />
}
