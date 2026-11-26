import type { ComponentProps } from 'react'
import { ConnectedDropdown } from './ConnectedDropdown.tsx'
import optionText from './RoutineOptionText.module.css'
import styles from './ConnectedDropdown.module.css'

export type DropdownOption = {
  id: string
  name: string
  description?: string
  disabled?: boolean
}

export function SelectDropdown({ label, options, value, onChange, disabled, variant = 'value', className, onOpen, placeholder, selected }: {
  label: string
  options: DropdownOption[]
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  variant?: 'value' | 'filter' | 'scope'
  className?: string
  onOpen?: () => void
  placeholder?: string
  selected?: boolean
}) {
  const current = options.find(option => option.id === value)?.name
  return <ConnectedDropdown label={label} value={current ?? placeholder ?? label} disabled={disabled}
    variant={variant} selectedValue={value} className={className} onOpen={onOpen} selected={selected}>
    {close => <div className={styles.scroll} data-dropdown-scroll role="listbox" aria-label={label}>
      {options.map(option => <button key={option.id} type="button" role="option" className={styles.item} data-dropdown-item
        data-value={option.id} aria-selected={value === option.id} data-description={!!option.description || undefined} disabled={option.disabled}
        onClick={() => { close(); if (option.id !== value) onChange(option.id) }}>
        {option.description ? <><strong className={optionText.title}>{option.name}</strong><small className={optionText.description}>{option.description}</small></> : option.name}
      </button>)}
      {!options.length && <p className={styles.empty} role="status">선택할 항목이 없어요.</p>}
    </div>}
  </ConnectedDropdown>
}

export function DropdownField({ className, caption, ...props }: ComponentProps<typeof SelectDropdown> & { caption?: string }) {
  return <div className={[styles.field, className].filter(Boolean).join(' ')}>
    <span>{caption ?? props.label}</span>
    <SelectDropdown {...props} />
  </div>
}

