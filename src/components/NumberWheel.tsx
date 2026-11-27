
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Button } from './ui.tsx'
import { Dialog } from './Dialog.tsx'
import { extendWheelOptions, wheelOptions } from './wheel-options.ts'
import type { WheelAdjust } from './wheel-options.ts'
import styles from './NumberWheel.module.css'
import ui from './ui.module.css'

const rowHeight = 52
type Props = {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean; unit: string
  adjust: WheelAdjust
  validate: (value: string) => string; start: string; stepLabel?: string; plainSteps?: boolean; hideSteps?: boolean
  compactStepper?: boolean; preview?: boolean; inputMode?: 'numeric' | 'decimal' | 'text'
  wheelSeed?: string; validateSelection?: (value: string) => string
  displayValue?: string; formatOption?: (value: string) => string; directHint?: string
  renderValue?: (value: string) => ReactNode
  describeBlank?: boolean
  renderTrigger?: (open: (() => void) | undefined, disabled: boolean | undefined) => React.ReactNode
  suggestion?: string; pending?: boolean; confirmUnchanged?: boolean
}

export function NumberWheel(props: Props) {
  return props.preview ? <NumberWheelControls {...props} onChange={undefined} /> : <EditableNumberWheel {...props} />
}

function EditableNumberWheel(props: Props) {
  const [seed, setSeed] = useState<string | null>(null)
  return <NumberWheelControls {...props} open={() => setSeed(props.wheelSeed ?? (props.value || props.suggestion || props.start))}>
    {seed !== null && <WheelDialog {...props} seed={seed} onClose={() => setSeed(null)} />}
  </NumberWheelControls>
}

function NumberWheelControls({ label, value, onChange, disabled, unit, adjust, stepLabel = '', plainSteps, hideSteps, compactStepper, displayValue, renderValue, describeBlank, suggestion, pending, renderTrigger, open, children }:
  Omit<Props, 'onChange' | 'validate' | 'start'> & { onChange?: Props['onChange']; open?: () => void; children?: React.ReactNode }) {
  const stepValue = value || suggestion || ''
  const unavailable = disabled || pending
  const showSuggestion = !pending && !value && suggestion !== undefined
  const change = (direction: -1 | 1) => {
    const next = adjust(stepValue, direction)
    if (next !== null) onChange?.(next)
  }
  const shownValue = displayValue ?? (value || '입력')
  const display = pending ? <span className={styles.unconfirmed}>확인 중</span> : showSuggestion
    ? <span className={styles.unconfirmed}>{suggestion}<small> {unit} (미정)</small></span>
    : <>{renderValue ? renderValue(shownValue) : shownValue}{(value || displayValue !== undefined) && unit && <small> {unit}</small>}</>
  const description = pending ? '기존 기록 확인 중' : showSuggestion ? suggestion + unit + ' (미정)'
    : describeBlank ? value ? `${displayValue ?? value} ${unit}`.trim() : '미입력' : undefined
  if (renderTrigger) return <>{renderTrigger(open, unavailable)}{children}</>
  return <div className={`${styles.control} ${stepLabel ? styles.weightControl : ''} ${plainSteps ? styles.plainSteps : ''} ${hideSteps ? styles.hideSteps : ''} ${compactStepper ? styles.compactStepper : ''}`} role="group" aria-label={label}>
    {!hideSteps&&<Button shape="control" aria-label={label + ' 감소'} disabled={unavailable || adjust(stepValue, -1) === null} onClick={onChange && (() => change(-1))}>−{stepLabel}</Button>}
    <Button shape="control" className={compactStepper ? styles.valueButton : undefined} aria-label={label} aria-description={description}
      data-wheel-empty={describeBlank && !value || undefined} disabled={unavailable} onClick={open}>
      {display}
    </Button>
    {!hideSteps&&<Button shape="control" aria-label={label + ' 증가'} disabled={unavailable || adjust(stepValue, 1) === null} onClick={onChange && (() => change(1))}>+{stepLabel}</Button>}
    {children}
  </div>
}

function WheelDialog({ label, seed, value, unit, adjust, validate, validateSelection = validate, onChange, suggestion, confirmUnchanged, inputMode, formatOption, directHint, onClose }:
  Pick<Props, 'label' | 'value' | 'unit' | 'adjust' | 'validate' | 'validateSelection' | 'onChange' | 'suggestion' | 'confirmUnchanged' | 'inputMode' | 'formatOption' | 'directHint'> & { seed: string; onClose: () => void }) {
  const [direct, setDirect] = useState(false)
  const [draft, setDraft] = useState(value)
  const [selected, setSelected] = useState(seed)
  const [issue, setIssue] = useState('')
  const [choices, setChoices] = useState(() => wheelOptions(seed, adjust))
  const list = useRef<HTMLDivElement>(null)
  const selectedOption = useRef<HTMLButtonElement>(null)
  const reposition = useRef<{ top?: number; focus: boolean } | null>(null)
  const engaged = useRef(false)
  const touched = useRef(false)
  const initialIndex = useRef(choices.indexOf(seed))
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (list.current && !engaged.current) list.current.scrollTop = initialIndex.current * rowHeight
    })
    return () => cancelAnimationFrame(frame)
  }, [])
  useLayoutEffect(() => {
    const position = reposition.current
    if (!position || !list.current) return
    if (position.top !== undefined) list.current.scrollTop = position.top
    reposition.current = null
    if (position.focus) selectedOption.current?.focus({ preventScroll: true })
  }, [choices, selected])

  function apply(next: string, validator = validate) {
    try { onChange(validator(next)); setIssue(''); return true }
    catch (error) { setIssue(error instanceof Error ? error.message : '입력값을 확인해 주세요.'); return false }
  }
  function centerIndex() {
    return Math.max(0, Math.min(choices.length - 1, Math.round((list.current?.scrollTop ?? 0) / rowHeight)))
  }
  function choose(index: number, direction?: -1 | 1, focus = false, fromScroll = false) {
    if (!list.current || reposition.current) return
    const extension = direction === undefined ? null : extendWheelOptions(choices, adjust, direction)
    const next = extension?.options ?? choices
    const target = index + (extension?.shift ?? 0)
    if (next[target] === undefined) return
    touched.current = true
    engaged.current = true
    const top = fromScroll
      ? extension && list.current.scrollTop + extension.shift * rowHeight
      : target * rowHeight
    if (extension) setChoices(next)
    if (extension || next[target] !== selected && (top != null || focus)) reposition.current = { top: top ?? undefined, focus }
    else if (next[target] === selected) {
      if (top != null) list.current.scrollTop = top
      if (focus) selectedOption.current?.focus({ preventScroll: true })
    }
    setSelected(next[target])
  }
  function confirm() {
    const changed = touched.current
    if ((!changed && !confirmUnchanged) || apply(changed ? choices[centerIndex()] : seed, validateSelection)) onClose()
  }
  function confirmDirect() {
    if (suggestion !== undefined && !value && !draft.trim() || apply(draft)) onClose()
  }

  return <Dialog title={label} surface="wheel" className={styles.dialog} onClose={onClose} dismissOnBackdrop={confirmUnchanged}>
    {direct ? <div className={styles.body} onKeyDown={event => {
      if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
      event.preventDefault()
      event.stopPropagation()
      confirmDirect()
    }}>
      <label className={ui.field}>{label}{unit && !label.endsWith(`(${unit})`) && ` (${unit})`}
        <input className={ui.input} inputMode={inputMode ?? (unit === 'kg' ? 'decimal' : 'numeric')} value={draft} autoFocus onChange={event => setDraft(event.target.value)} />
        {directHint && <small>{directHint}</small>}
      </label>
      {issue && <p className="notice error" role="alert">{issue}</p>}
      <div className={styles.actions}>
        <Button onClick={onClose}>취소</Button>
        <Button variant="primary" onClick={confirmDirect}>확인</Button>
      </div>
    </div> : <div className={styles.body}>
      <div className={styles.viewport}>
        <div className={styles.selection} aria-hidden="true" data-wheel-selection />
        <div className={styles.scroll} role="group" aria-label={label + ' 선택값'} ref={list}
          onPointerDown={() => { engaged.current = true }} onWheel={() => { engaged.current = true }}
          onKeyDown={event => {
            const index = choices.indexOf(selected)
            const destination = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: choices.length - 1 }[event.key]
            if (destination === undefined) return
            event.preventDefault()
            choose(destination, destination < 0 ? -1 : destination >= choices.length ? 1 : undefined, true)
          }}
          onScroll={() => {
            if (!engaged.current || reposition.current) return
            const index = centerIndex()
            const previous = choices.indexOf(selected)
            if (index === previous) return
            const direction = index < 5 && index < previous ? -1 : index >= choices.length - 5 && index > previous ? 1 : undefined
            choose(index, direction, list.current?.contains(document.activeElement), true)
          }}>
          {choices.map((choice, index) => {
            const display = formatOption?.(choice) ?? choice
            return <button key={choice} type="button" aria-pressed={choice === selected} tabIndex={choice === selected ? 0 : -1}
            ref={choice === selected ? selectedOption : undefined} data-distance={Math.min(3, Math.abs(index-choices.indexOf(selected)))}
            style={{ '--digits': display.length } as CSSProperties}
            onClick={() => choose(index, undefined, true)}>{display} {unit && <small>{unit}</small>}</button>
          })}
        </div>
      </div>
      {issue && <p className="notice error" role="alert">{issue}</p>}
      <div className={styles.footer}>
        <div className={styles.actions}>
          <Button onClick={() => {
            const choice = choices[centerIndex()]
            setDraft(!touched.current ? value : validateSelection === validate ? choice : validateSelection(choice))
            setDirect(true); setIssue('')
          }}>직접 입력</Button>
          <Button variant="primary" onClick={confirm}>확인</Button>
        </div>
      </div>
    </div>}
  </Dialog>
}
