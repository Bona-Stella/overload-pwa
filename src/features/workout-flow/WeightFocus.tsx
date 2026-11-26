
import { useId, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Button, Card, Help } from '../../components/ui.tsx'
import { CircleCheck } from '../../components/common-ui/CircleCheck.tsx'
import { NumberWheel } from '../../components/NumberWheel.tsx'
import { adjustRepsDraft, suggestedReps } from '../workout/reps.ts'
import { halfWeight } from '../workout/weight.ts'
import { adjust } from '../workout-online/cardio-draft.ts'
import { countDraft, decimalDraft } from '../workout-online/validation.ts'
import { LOAD_LABELS } from '../workout-online/equipment.ts'
import { EquipmentFields } from '../workout-online/EquipmentFields.tsx'
import type { Equipment, Manufacturer } from '../workout-online/types.ts'
import type { SetDraft, WeightFocusData } from './types.ts'
import styles from './WorkoutFlow.module.css'
import { useFitWorkoutTitle } from './useFitWorkoutTitle.ts'

function adjustKg(value: string, direction: -1 | 1, step?: 1 | 2.5) {
  try {
    const next = adjust(value, direction, step)
    return next === value || !value && direction < 0 ? null : next
  } catch { return null }
}
function adjustReps(value: string, direction: -1 | 1) {
  if (!value || value === '0') return direction > 0 ? '1' : null
  const next = adjustRepsDraft(value, direction)
  return next !== null && Number(next) <= 2147483647 ? next : null
}
export function KgWheel({ label, value, onChange, step = 2.5, compact = false, preview }: {
  label: string; value: string; onChange: (value: string) => void; step?: 1 | 2.5; compact?: boolean; preview?: boolean
}) {
  return <NumberWheel preview={preview} label={label} value={value} onChange={onChange} unit="kg" start="0"
    adjust={(value, direction) => adjustKg(value, direction, step)} validate={value => value.trim() ? decimalDraft(value) : ''}
    stepLabel={compact ? '' : String(step)} compactStepper={compact} />
}

export function WeightFocus({ weight, position, description, manufacturers, progressNote, issue, preparing, resting, completionProtected, editing, editTools, referenceNoteBelowControls = false,
  onDraft, onComplete, onUndo, onExcludeSet, onAddSet, onWeight, onEdit, onMemo, onList, onEnd, workingRef, memoNote, approvalNote, additionalInput = false, memoContent, memoOpen = true, onMemoToggle, preview = false }: {
  weight: WeightFocusData; position: number; description: string; manufacturers: Manufacturer[]; progressNote?: string
  issue?: ReactNode; preparing?: boolean; resting: boolean; completionProtected?: boolean; editing: boolean; editTools: ReactNode
  onDraft: (id: number, draft: Partial<SetDraft>) => void; onComplete: (id: number) => void
  onUndo: (id: number) => void; onExcludeSet: (id: number) => void
  onAddSet: () => void; workingRef?: RefObject<HTMLElement | null>
  onWeight: () => void; onEdit: () => void; onMemo: (memo: string) => void
  onList: () => void; onEnd: () => void
  memoContent?: ReactNode; memoNote?: string; approvalNote?: string; additionalInput?: boolean; preview?: boolean
  memoOpen?: boolean; onMemoToggle?: () => void; referenceNoteBelowControls?: boolean
}) {
  const completed = weight.sets.filter(s => s.result).length
  const count = weight.plannedCount ?? weight.sets.length
  const repsSuggestion = suggestedReps(weight.min, weight.max)
  const noPreviousRecord = !weight.sets.some(set => !set.result && (set.previous || set.repsPending))
  const referenceNote = weight.sets.some(set => !set.result) && noPreviousRecord &&
    <p className="muted small">비교 가능한 기준이 없습니다. 이번 반복 횟수를 직접 입력해 주세요.</p>
  const title = `${String(position).padStart(2, '0')}. ${weight.name}`
  const titleRef = useFitWorkoutTitle(title, !preview)
  const manufacturer = manufacturers.find(m => m.id === weight.manufacturerId)
  const plateWeight = preparing && weight.loadType === 'PLATE' ? halfWeight(weight.working) : null
  const memoId = useId()
  const memo = memoContent ?? <><label>기구 세팅 메모<textarea data-workout-memo={preview ? undefined : ''} rows={2} value={weight.memo} readOnly={preview}
    onChange={preview ? undefined : event => onMemo(event.target.value)} placeholder="예: 의자 높이 3" /></label>
    <small className="muted">{memoNote ?? '검토 세션에서 메모를 확인할 수 있습니다.'}</small></>
  return <>
    <section className={styles.focus}>
      <p className={styles.eyebrow}>WEIGHT</p>
      <div className={styles.focusTitle}>
        <h1 ref={titleRef} className={styles.exerciseTitle} title={title} aria-label={title}>{title}</h1>
        <Button compact className={styles.listTrigger} onClick={preview ? undefined : onList}>종목 보기/변경</Button>
      </div>
      <p className="muted small">{description}</p>
      {progressNote && <p className="muted small">{progressNote}</p>}
    </section>
    <Card hero className={styles.working} ref={workingRef} aria-label="진행 중량">
      <div className={styles.workingHead}>
        <span className={styles.workingLabel}>진행 중량 · 잠금</span>
        {plateWeight !== null && <span className={`${styles.workingLabel} ${styles.plateLabel}`}>한쪽 원판</span>}
        <Button compact variant="quiet" className={styles.weightChange} onClick={preview ? undefined : onWeight}>중량 변경</Button>
      </div>
      <div className={styles.workingValues}>
        <strong>{weight.working || '—'} <small>kg</small></strong>
        <p className="muted small">승인 중량 {weight.approved === null ? '없음' : weight.approved + ' kg'}
          {weight.mode === 'today' && weight.working && ' · 오늘만 적용'}
          {weight.mode === 'progression' && (' · ' + (approvalNote ?? '진행 중량 변경 시연'))}</p>
      </div>
      {plateWeight !== null && <div className={`${styles.workingValues} ${styles.plateSide}`}>
        <strong>{plateWeight} <small>kg</small></strong>
      </div>}
      <div className={styles.equipment} aria-label="현재 장비"><span>{manufacturer?.name ?? '제조사 미지정'}</span><span>{weight.loadType ? LOAD_LABELS[weight.loadType] : '부하 미지정'}</span></div>
    </Card>
    {!referenceNoteBelowControls && referenceNote}
    <Card className={styles.sets}>
      <div className={styles.setsHeading}><h2>세트 기록</h2><span>{weight.min}–{weight.max}회 × {count}세트</span><b>{completed}/{count}{completed >= count ? ' 완료' : ''}</b></div>
      <progress className={styles.setProgress} aria-label="현재 종목 세트 진행률" value={completed} max={count} />
      {issue}
      <div role="table" aria-label="세트별 기존 기록과 이번 기록">
        <div role="row" className={styles.setHead}>
          <span role="columnheader">세트</span><span role="columnheader">기존 기록</span><span role="columnheader">이번 기록</span><span role="columnheader">상태</span>
        </div>
        {weight.sets.map(set => {
          const ordinal = set.id
          const result = set.result
          return <div key={set.id} role="row" className={styles.setRow} data-done={!!result || undefined}>
            <b role="cell">{String(ordinal).padStart(2, '0')}</b>
            <span role="cell" className={styles.prior}>{set.previous ? set.previous.reps + '회' : '—'}</span>
            <div role="cell" className={styles.setValues}>{result ? <strong>{result.reps}회</strong> :
              <NumberWheel preview={preview} label={`${ordinal}세트 이번 반복 횟수`} value={set.draft.reps}
                onChange={reps => onDraft(set.id, { reps })} unit="회" start="0" suggestion={repsSuggestion} pending={set.repsPending} confirmUnchanged plainSteps
                adjust={adjustReps} validate={value => value.trim() ? String(countDraft(value)) : ''} />
            }
              {additionalInput && weight.loadType === 'BODYWEIGHT' && (result
                ? <small>{result.additionalKg === null ? '추가 부하 미기록' : `추가 ${result.additionalKg}kg`}</small>
                : <><KgWheel preview={preview} label={`${ordinal}세트 추가 중량 kg`} step={1} value={set.draft.additional} onChange={additional => onDraft(set.id, { additional })} />
                  <small className="muted">선택 입력 · 체중은 포함하지 않습니다.</small></>)}
            </div>
            <div role="cell" className={styles.checkCell} data-completion-protected={!result && completionProtected || undefined}>
              <CircleCheck label={`${ordinal}세트 ${result ? '완료 취소' : '완료'}`} checked={!!result}
                disabled={!result && (resting || completionProtected)} onClick={preview ? undefined : () => result ? onUndo(set.id) : onComplete(set.id)} />
            </div>
            {editing && <div className={styles.setActions}>
              {set === weight.sets.at(-1) && <Button onClick={onAddSet}>+ 세트 추가</Button>}
              <Button disabled={!!result || count === 1} title={result ? '완료를 취소한 뒤 제외할 수 있습니다.' : undefined}
                onClick={() => onExcludeSet(set.id)}>{ordinal}세트 제외</Button>
            </div>}
          </div>
        })}
      </div>
    </Card>
    {weight.sets.length < count && <p className="muted small">입력할 세트 주변 20개와 완료 기록을 표시합니다. 전체 {count}세트 계획은 유지됩니다.</p>}
    {!editing && <Button aria-expanded={false} onClick={preview ? undefined : onEdit}>운동·세트 편집</Button>}
    {editing && <section aria-label="운동·세트 편집" className="stack">{editTools}</section>}
    <section className={styles.memoSection} data-workout-memo-card={weight.id}>
      {onMemoToggle && <Button shape="control" variant="quiet" className={styles.memoToggle} aria-expanded={memoOpen} aria-controls={memoId} onClick={preview ? undefined : onMemoToggle}>
        기구 세팅 메모
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
      </Button>}
      {onMemoToggle ? <div id={memoId} hidden={!memoOpen}>{memo}</div> : memo}
    </section>
    <Button className={styles.endWorkout} onClick={preview ? undefined : onEnd}>운동 종료</Button>
    {referenceNoteBelowControls && referenceNote}
  </>
}

export function EquipmentEditor({ equipment, manufacturers, onApply }: {
  equipment: Equipment; manufacturers: Manufacturer[]; onApply: (value: Equipment) => void | Promise<boolean>
}) {
  const [draft, setDraft] = useState<Equipment>(() => ({
    manufacturerId: equipment.manufacturerId, loadType: equipment.loadType,
  }))
  return <Card>
    <div className={styles.headingRow}><h2>현재 세션의 장비 설정</h2>
      <Help label="장비 변경 범위">이후 세트에 적용됩니다. 완료 당시 장비와 원본 루틴은 보존합니다.</Help></div>
    <EquipmentFields value={draft} onChange={setDraft} manufacturers={manufacturers} />
    <Button onClick={() => void onApply(draft)}>오늘만 장비 변경 적용</Button>
  </Card>
}
