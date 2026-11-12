
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button } from './ui.tsx'
import { Dialog } from './Dialog.tsx'
import styles from './NumberWheel.module.css'

const rowHeight = 52
type Props = {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean; unit: string
  adjust: (value: string, direction: -1 | 1) => string | null
  validate: (value: string) => string; start: string; stepLabel?: string; plainSteps?: boolean
}

export function NumberWheel({ label, value, onChange, disabled, unit, adjust, validate, start, stepLabel = '', plainSteps }: Props) {
  const [seed, setSeed] = useState<string | null>(null)
  const change = (direction: -1 | 1) => {
    const next = adjust(value, direction)
    if (next !== null) onChange(next)
  }
  return <div className={`${styles.control} ${stepLabel ? styles.weightControl : ''} ${plainSteps ? styles.plainSteps : ''}`} role="group" aria-label={label}>
    <Button aria-label={label + ' 감소'} disabled={disabled || adjust(value, -1) === null} onClick={() => change(-1)}>−{stepLabel}</Button>
    <Button aria-label={label} disabled={disabled} onClick={() => setSeed(value || start)}>
      {value || '입력'}{value && <small> {unit}</small>}
    </Button>
    <Button aria-label={label + ' 증가'} disabled={disabled || adjust(value, 1) === null} onClick={() => change(1)}>+{stepLabel}</Button>
    {seed !== null && <WheelDialog label={label} seed={seed} value={value} unit={unit} adjust={adjust}
      validate={validate} onChange={onChange} onClose={() => setSeed(null)} />}
  </div>
}

function WheelDialog({ label, seed, value, unit, adjust, validate, onChange, onClose }: Pick<Props, 'label' | 'value' | 'unit' | 'adjust' | 'validate' | 'onChange'> & { seed: string; onClose: () => void }) {
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
    if (!touched.current || apply(centered())) onClose()
  }

  return <Dialog title={label} onClose={onClose}>
    {direct ? <form className={styles.body} onSubmit={event => {
      event.preventDefault()
      if (apply(draft)) onClose()
    }}>
      <label>{label} ({unit})<input inputMode={unit === 'kg' ? 'decimal' : 'numeric'} value={draft} autoFocus onChange={event => setDraft(event.target.value)} /></label>
      {issue && <p className="notice error" role="alert">{issue}</p>}
      <div className={styles.actions}>
        <Button onClick={onClose}>취소</Button>
        <Button variant="primary" type="submit">확인</Button>
      </div>
    </form> : <div className={styles.body}>
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
          {choices.map((choice, index) => <button key={choice} type="button" aria-pressed={choice === selected}
            style={{ '--digits': choice.length } as CSSProperties}
            onClick={() => choose(index)}>{choice} <small>{unit}</small></button>)}
        </div>
      </div>
      {issue && <p className="notice error" role="alert">{issue}</p>}
      <div className={styles.footer}>
        <div className={styles.actions}>
          <Button onClick={() => { setDraft(touched.current ? centered() : value); setDirect(true); setIssue('') }}>직접 입력</Button>
          <Button variant="primary" onClick={confirm}>확인</Button>
        </div>
      </div>
    </div>}
  </Dialog>
}
