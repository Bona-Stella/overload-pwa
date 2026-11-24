
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button } from './ui.tsx'
import { Dialog } from './Dialog.tsx'
import styles from './NumberWheel.module.css'

const rowHeight = 52
type Props = {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean; unit: string
  adjust: (value: string, direction: -1 | 1) => string | null
  validate: (value: string) => string; start: string; stepLabel?: string; plainSteps?: boolean; hideSteps?: boolean
  compactStepper?: boolean; stepAdjust?: Props['adjust']; preview?: boolean
  suggestion?: string; pending?: boolean; confirmUnchanged?: boolean
}

export function NumberWheel(props: Props) {
  return props.preview ? <NumberWheelControls {...props} onChange={undefined} /> : <EditableNumberWheel {...props} />
}

function EditableNumberWheel(props: Props) {
  const [seed, setSeed] = useState<string | null>(null)
  return <NumberWheelControls {...props} open={() => setSeed(props.value || props.suggestion || props.start)}>
    {seed !== null && <WheelDialog {...props} seed={seed} onClose={() => setSeed(null)} />}
  </NumberWheelControls>
}

function NumberWheelControls({ label, value, onChange, disabled, unit, adjust, stepLabel = '', plainSteps, hideSteps, compactStepper, stepAdjust = adjust, suggestion, pending, open, children }:
  Omit<Props, 'onChange' | 'validate' | 'start'> & { onChange?: Props['onChange']; open?: () => void; children?: React.ReactNode }) {
  const stepValue = value || suggestion || ''
  const unavailable = disabled || pending
  const showSuggestion = !pending && !value && suggestion !== undefined
  const change = (direction: -1 | 1) => {
    const next = stepAdjust(stepValue, direction)
    if (next !== null) onChange?.(next)
  }
  const display = pending ? <span className={styles.unconfirmed}>확인 중</span> : showSuggestion
    ? <span className={styles.unconfirmed}>{suggestion}<small> {unit} (미정)</small></span>
    : <>{value || '입력'}{value && <small> {unit}</small>}</>
  const description = pending ? '기존 기록 확인 중' : showSuggestion ? suggestion + unit + ' (미정)' : undefined
  return <div className={`${styles.control} ${stepLabel ? styles.weightControl : ''} ${plainSteps ? styles.plainSteps : ''} ${hideSteps ? styles.hideSteps : ''} ${compactStepper ? styles.compactStepper : ''}`} role="group" aria-label={label}>
    {!hideSteps&&<Button shape="control" aria-label={label + ' 감소'} disabled={unavailable || stepAdjust(stepValue, -1) === null} onClick={onChange && (() => change(-1))}>−{stepLabel}</Button>}
    <Button shape="control" className={compactStepper ? styles.valueButton : undefined} aria-label={label} aria-description={description} disabled={unavailable} onClick={open}>
      {compactStepper ? <><span>{display}</span><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg></> : display}
    </Button>
    {!hideSteps&&<Button shape="control" aria-label={label + ' 증가'} disabled={unavailable || stepAdjust(stepValue, 1) === null} onClick={onChange && (() => change(1))}>+{stepLabel}</Button>}
    {children}
  </div>
}

function WheelDialog({ label, seed, value, unit, adjust, validate, onChange, suggestion, confirmUnchanged, onClose }:
  Pick<Props, 'label' | 'value' | 'unit' | 'adjust' | 'validate' | 'onChange' | 'suggestion' | 'confirmUnchanged'> & { seed: string; onClose: () => void }) {
  const [direct, setDirect] = useState(false)
  const [draft, setDraft] = useState(value)
  const [selected, setSelected] = useState(seed)
  const [issue, setIssue] = useState('')
  const [choices] = useState(() => {
    const items = [seed]
    for (const direction of [-1, 1] as const) {
      let last = seed
      for (let i = 0; i < 30; i++) {
        const next = adjust(last, direction)
        if (next === null) break
        if (direction < 0) items.unshift(next)
        else items.push(next)
        last = next
      }
    }
    return items
  })
  const list = useRef<HTMLDivElement>(null)
  const engaged = useRef(false)
  const touched = useRef(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!direct && list.current) list.current.scrollTop = choices.indexOf(seed) * rowHeight
      engaged.current = false
    })
    return () => cancelAnimationFrame(frame)
  }, [choices, direct, seed])

  function apply(next: string) {
    try { onChange(validate(next)); setIssue(''); return true }
    catch (error) { setIssue(error instanceof Error ? error.message : '입력값을 확인해 주세요.'); return false }
  }
  function centered() {
    const index = Math.round((list.current?.scrollTop ?? 0) / rowHeight)
    return choices[Math.max(0, Math.min(choices.length - 1, index))]
  }
  function choose(index: number) {
    const next = choices[index]
    if (next === undefined || !list.current) return
    touched.current = true
    engaged.current = true
    list.current.scrollTop = index * rowHeight
    setSelected(next)
  }
  function confirm() {
    const changed = touched.current
    if ((!changed && !confirmUnchanged) || apply(changed ? centered() : seed)) onClose()
  }
  function confirmDirect() {
    if (suggestion !== undefined && !value && !draft.trim() || apply(draft)) onClose()
  }

  return <Dialog title={label} onClose={onClose} dismissOnBackdrop={confirmUnchanged}>
    {direct ? <div className={styles.body} onKeyDown={event => {
      if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
      event.preventDefault()
      event.stopPropagation()
      confirmDirect()
    }}>
      <label>{label} ({unit})<input inputMode={unit === 'kg' ? 'decimal' : 'numeric'} value={draft} autoFocus onChange={event => setDraft(event.target.value)} /></label>
      {issue && <p className="notice error" role="alert">{issue}</p>}
      <div className={styles.actions}>
        <Button shape="control" onClick={onClose}>취소</Button>
        <Button shape="control" variant="primary" onClick={confirmDirect}>확인</Button>
      </div>
    </div> : <div className={styles.body}>
      <div className={styles.viewport}>
        <div className={styles.selection} aria-hidden="true" data-wheel-selection />
        <div className={styles.scroll} aria-label={label + ' 선택값'} ref={list}
          onPointerDown={() => { engaged.current = true }} onWheel={() => { engaged.current = true }}
          onKeyDown={event => {
            const index = choices.indexOf(selected)
            const destination = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: choices.length - 1 }[event.key]
            if (destination === undefined) return
            event.preventDefault()
            choose(destination)
          }}
          onScroll={() => {
            if (!engaged.current) return
            touched.current = true
            const next = centered()
            setSelected(next)
          }}>
          {choices.map((choice, index) => <button key={choice} type="button" aria-pressed={choice === selected} data-distance={Math.min(3, Math.abs(index-choices.indexOf(selected)))}
            style={{ '--digits': choice.length } as CSSProperties}
            onClick={() => choose(index)}>{choice} <small>{unit}</small></button>)}
        </div>
      </div>
      {issue && <p className="notice error" role="alert">{issue}</p>}
      <div className={styles.footer}>
        <div className={styles.actions}>
          <Button shape="control" onClick={() => { setDraft(touched.current ? centered() : value); setDirect(true); setIssue('') }}>직접 입력</Button>
          <Button shape="control" variant="primary" onClick={confirm}>확인</Button>
        </div>
      </div>
    </div>}
  </Dialog>
}
