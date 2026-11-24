
import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { DurationWheel } from '../../components/DurationWheel.tsx'
import { Button, Card } from '../../components/ui.tsx'
import { roundedDurationMs } from '../../components/duration.ts'
import { formatDuration } from '../workout/model.ts'
import { distanceLabel, estimatedCardioDistance } from '../workout-online/cardio-measurement.ts'
import { CardioActualFields } from '../workout-online/CardioActualFields.tsx'
import { supportsCardioMotion } from '../workout-online/cardio-draft.ts'
import { cardioPhaseLabel } from './types.ts'
import type { ActualCardio, CardioDraft, CardioFocusData } from './types.ts'
import styles from './WorkoutFlow.module.css'
import cardioStyles from './CardioFocus.module.css'

export function CardioActual({ result }: { result: ActualCardio }) {
  return <div className={styles.cardioActual}>
    <p>{result.corrected ? `정정한 활동 시간 ${formatDuration(result.activeMs)} · 자동 기록 ${formatDuration(result.timerMs)}`
      : `실제 활동 시간 ${formatDuration(result.activeMs)}`}</p>
    <p className="muted small">{distanceLabel(result)} · 평균 심박 {result.averageBpm === null ? '미입력' : result.averageBpm + ' BPM'}</p>
    {result.measurement?.actualSpeedKmh != null && <p className="muted small">실제 속도 {result.measurement.actualSpeedKmh} km/h</p>}
  </div>
}

function CardioReview({ draft, activeMs, plan, estimate, issue, onDraft, onCancel, preview }: {
  draft: CardioDraft; activeMs: number; plan: CardioFocusData['plan']; estimate: boolean; issue: ReactNode
  onDraft: (value: Partial<CardioDraft>) => void; onCancel: () => void; preview: boolean
}) {
  const [seconds, setSeconds] = useState<string | null>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const editorId = useId()
  const motion = supportsCardioMotion(plan.kind)
  const measuredSeconds = String(roundedDurationMs(activeMs))
  const recordMs = draft.correctedSeconds === null ? activeMs : Number(draft.correctedSeconds) * 1000
  const modified = draft.correctedSeconds !== null && Number(draft.correctedSeconds) !== Number(measuredSeconds)
  const closeEditor = () => { setSeconds(null); editButton.current?.focus() }

  return <Card className={cardioStyles.card}>
    <div className={cardioStyles.reviewHeading}>
      <h2>완료 기록 확인</h2>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 4H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2M8 11l1.5 1.5L13 9" />
        <rect x="7" y="2.5" width="6" height="4" rx="1" />
      </svg>
    </div>
    <div className={cardioStyles.recordedTime}>
      <span>실제 활동 시간</span>
      <strong data-modified={modified || undefined}>
        {formatDuration(recordMs)}{modified && <small>수정됨</small>}
      </strong>
      <button ref={editButton} type="button" className={`quiet ${cardioStyles.editTime}`} aria-label="실제 활동 시간 수정"
        aria-expanded={seconds !== null} aria-controls={seconds !== null ? editorId : undefined}
        onClick={preview ? undefined : () => setSeconds(seconds === null ? draft.correctedSeconds ?? measuredSeconds : null)}>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 11.5-1 4.5 4.5-1L16 7.5 12.5 4zM11 5.5 14.5 9" />
        </svg>
      </button>
    </div>
    {seconds !== null && <div id={editorId} className={cardioStyles.timeEditor}>
      <DurationWheel seconds={seconds} onChange={setSeconds} />
      <div className={styles.actions}>
        <Button onClick={closeEditor}>시간 수정 취소</Button>
        <Button variant="primary" onClick={() => {
          const correctedSeconds = seconds === measuredSeconds ? null : seconds
          const correctedMs = correctedSeconds === null ? activeMs : Number(correctedSeconds) * 1000
          onDraft({ correctedSeconds, ...(motion ? estimatedCardioDistance(draft, plan.targetDistanceKm, correctedMs, estimate) : {}) })
          closeEditor()
        }}>시간 적용</Button>
      </div>
    </div>}
    <div className={cardioStyles.measurements}>
      <CardioActualFields draft={draft} activeMs={recordMs} bpm={draft.bpm} motion={motion} incline={plan.kind === 'TREADMILL'}
        onChange={preview ? undefined : onDraft} onBpm={preview ? undefined : bpm => onDraft({ bpm })} />
    </div>
    {issue}
    <div className={cardioStyles.reviewActions}>
      <Button onClick={preview ? undefined : onCancel}>완료 취소 · 일시정지로 돌아가기</Button>
    </div>
  </Card>
}

export function CardioFocus({ cardio, activeMs, estimate = false, navigation, issue, editing, editTools, onEdit, onDraft, onCancelReview, onUndo, preview = false }: {
  cardio: CardioFocusData; activeMs: number; navigation: ReactNode; issue?: ReactNode
  editing: boolean; editTools: ReactNode; onEdit: () => void; onDraft: (value: Partial<CardioDraft>) => void
  onCancelReview: () => void; onUndo: () => void; preview?: boolean; estimate?: boolean
}) {
  const { plan, phase, draft, result } = cardio
  const pace = plan.intensity?.mode === 'PACE'
  const wholeMinutes = plan.targetSeconds % 60 === 0
  const goals = [
    { label: '목표 시간', value: wholeMinutes ? plan.targetSeconds / 60 : plan.targetSeconds, unit: wholeMinutes ? '분' : '초' },
    { label: '목표 거리', value: plan.targetDistanceKm, unit: 'km' },
    { label: pace ? '목표 페이스' : '목표 속도', value: plan.intensity?.value ?? null, unit: pace ? '분/km' : 'km/h' },
  ]
  const measurementStatus = {
    ready: '시작하면 측정이 진행돼요', running: '측정 중', paused: '측정 일시정지',
    review: '측정 종료', completed: '측정 종료', skipped: '미수행 · 명시적으로 건너뜀',
  }[phase]
  return <>
    <header className={cardioStyles.heading}>
      <p>CARDIO</p>
      <span className={cardioStyles.phase} data-phase={phase} role="status">
        {phase === 'paused' ? '일시정지' : phase === 'review' ? '완료 확인' : cardioPhaseLabel[phase]}
      </span>
      <h1>{plan.name}</h1>
    </header>
    {navigation}
    <Card className={cardioStyles.card}>
      <h2>당시 계획</h2>
      <dl className={cardioStyles.goals}>{goals.map(({ label, value, unit }) => <div key={label}>
        <dt>{label}</dt><dd>{value ?? '—'}{value !== null && <small>{unit}</small>}</dd>
      </div>)}</dl>
      {(plan.inclinePercent !== null || plan.resistance !== null) && <small className="muted">{plan.inclinePercent !== null ? `경사 ${plan.inclinePercent}%` : `저항 ${plan.resistance}`}</small>}
    </Card>
    <Card className={`${cardioStyles.card} ${cardioStyles.timer}`}>
      <p>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="10" cy="11.5" r="5.5" /><path d="M8 3h4m-2 5v4m4-5 1-1" />
        </svg>
        {phase === 'ready' || phase === 'skipped' ? '실제 활동 시간' : '실제 활동 시간 · 일시정지 제외'}
      </p>
      <strong>{phase === 'skipped' ? '—' : formatDuration(result?.activeMs ?? activeMs)}</strong>
      <small className={cardioStyles.timerStatus} data-phase={phase}>{measurementStatus}</small>
    </Card>
    {phase === 'review' && <CardioReview key={cardio.id} draft={draft} activeMs={activeMs} plan={plan} estimate={estimate}
      issue={issue} onDraft={onDraft} onCancel={onCancelReview} preview={preview} />}
    {result && <Card className={cardioStyles.card}><h2>실제 완료 기록</h2><CardioActual result={result} />
      <Button onClick={preview ? undefined : onUndo}>유산소 완료 취소</Button></Card>}
    <Button className={`${cardioStyles.editSession} ${styles.editClose}`} aria-expanded={editing} onClick={preview ? undefined : onEdit}>
      {editing ? '편집 닫기' : '운동·세트 편집'}
    </Button>
    {editing && <section aria-label="운동·세트 편집" className="stack">{editTools}</section>}
  </>
}
