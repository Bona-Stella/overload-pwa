
import type { ReactNode } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import { roundedDurationMs } from '../../components/duration.ts'
import { formatDuration } from '../workout/model.ts'
import { calculatedSpeed, cardioMotionValue, distanceSourceLabel, estimatedCardioDistance } from '../workout-online/cardio-measurement.ts'
import { CardioTimeField } from '../workout-online/CardioTimeField.tsx'
import { CardioValue } from './CardioValueRow.tsx'
import { CardioActualFields } from '../workout-online/CardioActualFields.tsx'
import { cardioGoalValues, supportsCardioMotion } from '../workout-online/cardio-draft.ts'
import { cardioPhaseLabel } from './types.ts'
import type { ActualCardio, CardioDraft, CardioFocusData } from './types.ts'
import styles from './WorkoutFlow.module.css'
import cardioStyles from './CardioFocus.module.css'

export function CardioActual({ result, heading: Heading = 'h2', children }: {
  result: ActualCardio; heading?: 'h2' | 'h5'; children?: ReactNode
}) {
  const speed = result.measurement?.actualSpeedKmh ?? null
  return <Card className={cardioStyles.card}>
    <Heading>실제 완료 기록</Heading>
    <dl className={`${cardioStyles.goals} ${cardioStyles.actualGrid}`} aria-label="실제 완료 기록">
      <div><dt>실제 활동 시간</dt>
        <dd><CardioValue modified={result.corrected}>{formatDuration(result.activeMs)}</CardioValue></dd>
        {result.corrected && <small>자동 기록 {formatDuration(result.timerMs)}</small>}
      </div>
      <div><dt>실제 거리</dt>
        <dd>{result.distanceKm === null ? <span data-numeric-value="empty" aria-label="미입력">—</span> : <>{cardioMotionValue(result.distanceKm)}<small>km</small></>}</dd>
        {result.distanceKm !== null && <small>{distanceSourceLabel(result.measurement?.distanceSource)}</small>}
      </div>
      <div><dt>평균 속도</dt><dd>{speed === null ? <span data-numeric-value="empty" aria-label="미입력">—</span> : <>{cardioMotionValue(speed)}<small>km/h</small></>}</dd></div>
      <div><dt>평균 심박수</dt><dd>{result.averageBpm === null ? <span data-numeric-value="empty" aria-label="미입력">—</span> : <>{result.averageBpm}<small>BPM</small></>}</dd></div>
    </dl>
    {children}
  </Card>
}

function CardioReview({ draft, activeMs, plan, previous, estimate, issue, onDraft, onCancel, preview }: {
  draft: CardioDraft; activeMs: number; plan: CardioFocusData['plan']; estimate: boolean; issue: ReactNode
  onDraft: (value: Partial<CardioDraft>) => void; onCancel: () => void; preview: boolean
  previous?: ActualCardio
}) {
  const motion = supportsCardioMotion(plan.kind)
  const measuredSeconds = String(roundedDurationMs(activeMs))
  const recordMs = draft.correctedSeconds === null ? activeMs : Number(draft.correctedSeconds) * 1000
  const modified = draft.correctedSeconds !== null && Number(draft.correctedSeconds) !== Number(measuredSeconds)
  const estimated = estimatedCardioDistance(draft, plan.targetDistanceKm, recordMs, estimate)
  const pastDistance = previous?.distanceKm
  const initial = {
    distance: pastDistance && Number(pastDistance) >= .001 && Number(pastDistance) <= 1000 ? pastDistance : estimated.distance,
    speed: previous?.measurement?.actualSpeedKmh ?? (plan.intensity?.mode === 'SPEED' ? plan.intensity.value
      : estimated.distance ? calculatedSpeed(estimated.distance, recordMs) : undefined),
    bpm: previous?.averageBpm == null ? undefined : String(previous.averageBpm),
  }

  return <Card className={cardioStyles.card}>
    <div className={cardioStyles.reviewHeading}>
      <h2>완료 기록 확인</h2>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 4H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2M8 11l1.5 1.5L13 9" />
        <rect x="7" y="2.5" width="6" height="4" rx="1" />
      </svg>
    </div>
    <CardioActualFields draft={draft} activeMs={recordMs} bpm={draft.bpm} bpmConfirmed={draft.bpmConfirmed} initial={initial}
      motion={motion} incline={plan.kind === 'TREADMILL'} disabled={preview} onChange={onDraft} onBpm={bpm => onDraft({ bpm, bpmConfirmed: true })}
      time={<CardioTimeField label="실제 활동 시간" seconds={draft.correctedSeconds ?? measuredSeconds}
        displayMs={recordMs} modified={modified} disabled={preview} onChange={seconds => {
          const correctedSeconds = seconds === measuredSeconds ? null : seconds
          const correctedMs = correctedSeconds === null ? activeMs : Number(correctedSeconds) * 1000
          onDraft({ correctedSeconds, ...(motion ? estimatedCardioDistance(draft, plan.targetDistanceKm, correctedMs, estimate) : {}) })
        }} />} />
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
      <dl className={cardioStyles.goals}>{cardioGoalValues(plan).map(({ label, value, unit }) => <div key={label}>
        <dt>{label}</dt><dd>{value ?? '—'}{value !== null && unit && <small>{unit}</small>}</dd>
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
    {phase === 'review' && <CardioReview key={cardio.id} draft={draft} activeMs={activeMs} plan={plan} previous={cardio.previous} estimate={estimate}
      issue={issue} onDraft={onDraft} onCancel={onCancelReview} preview={preview} />}
    {result && <CardioActual result={result}>
      <Button onClick={preview ? undefined : onUndo}>유산소 완료 취소</Button>
    </CardioActual>}
    <Button className={styles.editClose} aria-expanded={editing} onClick={preview ? undefined : onEdit}>
      {editing ? '편집 닫기' : '운동·세트 편집'}
    </Button>
    {editing && <section aria-label="운동·세트 편집" className="stack">{editTools}</section>}
  </>
}
