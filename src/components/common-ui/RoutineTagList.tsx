import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { SkeletonRegion, SkeletonSlot } from './ContentFeedback'
import styles from './RoutineTagList.module.css'

type RoutineTagOption = {
  id: string
  title: string
  description?: string
  disabled?: boolean
}

type RoutineTagListProps = {
  label: string
  options: readonly RoutineTagOption[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCancel?: () => void
  loading?: boolean
  emptyLabel?: string
}

function moveFocus(event: KeyboardEvent<HTMLUListElement>) {
  if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
  const current = buttons.findIndex(button => button === event.target)
  if (current < 0) return
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
    : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
  event.preventDefault()
  buttons[next].focus()
}

export function RoutineTagList({ label, options, selectedId, onSelect, onCancel, loading = false,
  emptyLabel = '선택할 루틴 태그가 없어요.' }: RoutineTagListProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const entry = options.find(option => option.id === focusedId && !option.disabled)
    ?? options.find(option => option.id === selectedId && !option.disabled)
    ?? options.find(option => !option.disabled)

  return <div data-routine-tag-list>
    <SkeletonRegion loading={loading} loadingLabel={label + ' 불러오는 중'}>
      {options.length > 0 ? <ul role="listbox" aria-label={label} className={styles.list} onKeyDown={event => {
        if (event.key === 'Escape' && onCancel) {
          event.preventDefault()
          event.stopPropagation()
          onCancel()
        } else {
          moveFocus(event)
        }
      }} onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusedId(null)
      }}>
        {options.map(option => <li key={option.id} role="presentation">
          <button type="button" role="option" aria-selected={selectedId === option.id}
            tabIndex={option === entry ? 0 : -1} className={styles.row} disabled={loading || option.disabled}
            onFocus={() => setFocusedId(option.id)} onClick={() => onSelect(option.id)}>
            <SkeletonSlot loading={loading}><strong>{option.title}</strong></SkeletonSlot>
            {option.description && <SkeletonSlot loading={loading} placeholderWidth="92%"><small>{option.description}</small></SkeletonSlot>}
          </button>
        </li>)}
      </ul> : !loading && <p role="status" className={styles.empty}>{emptyLabel}</p>}
    </SkeletonRegion>
  </div>
}
