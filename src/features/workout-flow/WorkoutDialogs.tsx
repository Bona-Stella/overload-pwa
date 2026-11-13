
import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '../../components/ui.tsx'
import { Dialog } from '../../components/Dialog.tsx'
import { useDragOrder } from '../../components/useDragOrder.ts'
import { CardioPlanFields } from '../workout-online/CardioPlanFields.tsx'
import { cardioPlan, emptyCardio } from '../workout-online/cardio-draft.ts'
import { ExerciseSearch } from '../workout-online/ExerciseSearch.tsx'
import { decimalDraft } from '../workout-online/validation.ts'
import type { CardioActivity, CardioPlan, StandardExercise } from '../workout-online/types.ts'
import { KgWheel } from './WeightFocus.tsx'
import type { WeightFocusData } from './types.ts'
import styles from './WorkoutFlow.module.css'
import orderStyles from '../workout-online/Presets.module.css'

export function ConfirmWorkoutAction({ title, action, message, onClose, onConfirm, saveIssue }: {
  title: string; action: string; message: string; saveIssue?: ReactNode; onClose: () => void; onConfirm: () => void
}) {
  const cancel = useRef<HTMLButtonElement>(null)
  return <Dialog title={title} onClose={onClose} initialFocus={cancel}>
    <div className="stack"><p>{message}</p>{saveIssue}<div className={styles.actions}>
      <button type="button" className="outline" ref={cancel} onClick={onClose}>취소</button><Button variant="primary" onClick={onConfirm}>{action}</Button>
    </div></div>
  </Dialog>
}

export function WeightChange({ weight, progressionAllowed, onSave, onClose, progressionNote, saveIssue }: {
  weight: WeightFocusData; progressionAllowed: boolean
  onSave: (value: string, mode: 'today' | 'progression') => void; onClose: () => void
  progressionNote?: string; saveIssue?: ReactNode
}) {
  const [value, setValue] = useState(weight.working), [mode, setMode] = useState<'today' | 'progression'>('today')
  const [issue, setIssue] = useState('')
  return <Dialog title="중량 변경" onClose={onClose}>
    <div className="stack">
      {saveIssue}
      <p>현재 승인 중량 {weight.approved === null ? '없음' : weight.approved + ' kg'}</p>
      <KgWheel label="변경 중량" value={value} onChange={next => { setValue(next); setIssue('') }} />
      <fieldset className="stack online-fieldset">
        <legend>변경 방식</legend>
        <label className="radio-option"><input type="radio" name="weight-mode" checked={mode === 'today'} onChange={() => setMode('today')} />
          <span><b>오늘만 변경</b><small>이번 운동에 적용하며 기준 기록에서 제외합니다.</small></span></label>
        <label className="radio-option"><input type="radio" name="weight-mode" disabled={!progressionAllowed}
          checked={mode === 'progression'} onChange={() => setMode('progression')} />
          <span><b>진행 중량 변경</b><small>{progressionAllowed ? progressionNote ?? '다음 정상 운동에 적용하는 승인 흐름을 시연합니다.' : '일반 운동의 원본 루틴 종목에서 사용할 수 있습니다.'}</small></span></label>
      </fieldset>
      <p className="muted small">완료한 세트는 보존됩니다.</p>
      {issue && <p role="alert" className="notice error">{issue}</p>}
      <div className={styles.actions}><Button onClick={onClose}>취소</Button><Button variant="primary" onClick={() => {
        try { onSave(decimalDraft(value), mode) }
        catch (error) { setIssue(error instanceof Error ? error.message : '변경 중량을 확인해 주세요.') }
      }}>확인</Button></div>
    </div>
  </Dialog>
}

type ListItem = { id: string; name: string; status: string }
export function ExerciseList({ weights, cardio, current, onClose, onSelect, onApply, saveIssue }: {
  weights: ListItem[]; cardio: ListItem[]; current: string; saveIssue?: ReactNode; onClose: () => void
  onSelect: (id: string) => void; onApply: (order: { weights: string[]; cardio: string[] }) => void
}) {
  const [order, setOrder] = useState(() => ({ weights: weights.map(w => w.id), cardio: cardio.map(c => c.id) }))
  const [moveNotice, setMoveNotice] = useState('')
  const helpId = useId()
  const sorting = useDragOrder<'weights' | 'cardio'>(move)
  const changed = order.weights.some((id, i) => weights[i]?.id !== id) || order.cardio.some((id, i) => cardio[i]?.id !== id)
  function move(kind: 'weights' | 'cardio', id: string, targetId: string, handle: HTMLButtonElement) {
    const from = order[kind].indexOf(id), to = order[kind].indexOf(targetId)
    if (from < 0 || to < 0 || from === to) return
    const next = [...order[kind]]
    const [entry] = next.splice(from, 1)
    next.splice(to, 0, entry)
    setOrder({ ...order, [kind]: next })
    setMoveNotice(`${from + 1}번 종목이 ${to + 1}번으로 이동했습니다.`)
    requestAnimationFrame(() => handle.focus({ preventScroll: true }))
  }
  return <Dialog title="이번 운동 종목" onClose={onClose}>
    <div className="stack">
      {saveIssue}
      <p className="muted small" id={helpId}>핸들을 드래그하거나 위·아래 방향키로 같은 구획 안에서 순서를 바꿀 수 있습니다.</p>
      <p className="sr-only" role="status">{moveNotice}</p>
      {([['weights', weights], ['cardio', cardio]] as const).map(([kind, source]) => {
        const items = order[kind].map(id => source.find(item => item.id === id)!)
        const dragging = sorting.drag?.group === kind
        return items.length > 0 && <section key={kind} data-order-group={kind} data-sorting={dragging}>
          <h3 className={styles.eyebrow}>{kind === 'weights' ? 'WEIGHT' : 'CARDIO'}</h3>
          {items.map((item, index) => <div className={`${orderStyles.orderRow} ${styles.exerciseOrderRow}`} key={item.id}
            data-order-row={item.id} data-workout-row={item.id} data-dragging={dragging && sorting.drag?.from === index}
            style={sorting.rowStyle(kind, index)}>
            <span className={orderStyles.number}>{String(index + 1).padStart(2, '0')}</span>
            <Button className={styles.listSelect} aria-label={item.name} aria-current={item.id === current ? 'step' : undefined}
              aria-disabled={!!sorting.drag} onClick={() => { if (!sorting.drag) onSelect(item.id) }}>
              <span className={orderStyles.orderInfo}><strong title={item.name}>{item.name}</strong><small>{item.status}</small></span>
            </Button>
            <div className={orderStyles.orderActions}>
              <button type="button" className={orderStyles.dragHandle} aria-label={item.name + ' 순서 이동'} aria-describedby={helpId}
                disabled={items.length < 2} {...sorting.handleProps(kind, item.id, order[kind], index)}>
                <span aria-hidden="true">⠿</span>
              </button>
            </div>
          </div>)}
        </section>
      })}
      <div className={styles.actions}>
        <Button onClick={onClose}>목록 닫기</Button>
        <Button variant="primary" disabled={!changed || !!sorting.drag} onClick={() => onApply(order)}>변경하기</Button>
      </div>
    </div>
  </Dialog>
}

export function SessionExerciseSearch({ replace, exercises, onSelect, onClose, saveIssue }: {
  saveIssue?: ReactNode; replace: boolean; exercises: StandardExercise[]; onSelect: (exercise: StandardExercise) => void; onClose: () => void
}) {
  return <Dialog title={replace ? '현재 종목 교체' : '이번 운동에 종목 추가'} onClose={onClose}>
    <div className="stack">
      {saveIssue}
      <p className="muted small">이번 운동에만 적용됩니다.</p>
      <ExerciseSearch exercises={exercises} onSelect={onSelect} />
      <Button onClick={onClose}>취소</Button>
    </div>
  </Dialog>
}

export function AddCardio({ activities, onSave, onClose, saveIssue }: { saveIssue?: ReactNode; activities: CardioActivity[]; onSave: (plan: CardioPlan) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(emptyCardio)
  const [issue, setIssue] = useState('')
  return <Dialog title="이번 운동에 유산소 추가" onClose={onClose}>
    <form className="stack" onSubmit={event => {
      event.preventDefault()
      try {
        if (!draft.standardExerciseId) throw Error('유산소 종목을 선택해 주세요.')
        onSave(cardioPlan(draft))
      } catch (error) { setIssue(error instanceof Error ? error.message : '유산소 계획을 확인해 주세요.') }
    }}>
      {saveIssue}
      <p className="muted small">원본 루틴은 유지됩니다. 유산소는 웨이트 뒤에 추가됩니다.</p>
      <CardioPlanFields value={draft} onChange={next => { setDraft(next); setIssue('') }} activities={activities} />
      {issue && <p role="alert" className="notice error">{issue}</p>}
      <div className={styles.actions}><Button onClick={onClose}>취소</Button><Button variant="primary" type="submit">유산소 추가</Button></div>
    </form>
  </Dialog>
}
