
import type { ReactNode } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import { cardioPlanLabel } from '../home/model.ts'
import { formatDuration } from '../workout/model.ts'
import { distanceLabel } from '../workout-online/cardio-measurement.ts'
import { cardioPhaseLabel } from './types.ts'
import type { ActualCardio, CardioDraft, CardioFocusData } from './types.ts'
import styles from './WorkoutFlow.module.css'

export function CardioActual({ result }: { result: ActualCardio }) {
  return <>
    <p>{result.corrected ? `정정한 활동 시간 ${formatDuration(result.activeMs)} · 자동 기록 ${formatDuration(result.timerMs)}`
      : `실제 활동 시간 ${formatDuration(result.activeMs)}`}</p>
    <p className="muted small">{distanceLabel(result)} · 평균 심박 {result.averageBpm === null ? '미입력' : result.averageBpm + ' BPM'}</p>
    {result.measurement?.actualSpeedKmh != null && <p className="muted small">실제 속도 {result.measurement.actualSpeedKmh} km/h</p>}
  </>
}

export function CardioFocus({ cardio, activeMs, weightProgress, cardioProgress, navigation, issue, editing, editTools, onEdit, onDraft, onCancelReview, onUndo }: {
  cardio: CardioFocusData; activeMs: number; weightProgress: string; cardioProgress: string; navigation: ReactNode; issue: ReactNode
  editing: boolean; editTools: ReactNode; onEdit: () => void; onDraft: (value: Partial<CardioDraft>) => void
  onCancelReview: () => void; onUndo: () => void
}) {
  const { plan, phase, draft, result } = cardio
  const motion = ['TREADMILL', 'BIKE', 'OUTDOOR'].includes(plan.kind)
  return <>
    <section className={styles.focus}>
      <p className="muted small">{weightProgress} · {cardioProgress}</p>
      <p className={styles.eyebrow}>CARDIO</p>
      <h1>{plan.name}</h1><span className={styles.phase}>{cardioPhaseLabel[phase]}</span>
    </section>
    {navigation}
    <Card><h2>당시 계획</h2><p>목표 {cardioPlanLabel(plan)}</p>
      {(plan.inclinePercent !== null || plan.resistance !== null) && <p className="muted small">{plan.inclinePercent !== null ? `경사 ${plan.inclinePercent}%` : `저항 ${plan.resistance}`}</p>}
    </Card>
    <Card hero className={styles.cardioClock}>
      <p>{phase === 'ready' ? '시작을 눌러야 측정합니다' : '실제 활동 시간 · 일시정지 제외'}</p>
      <strong>{formatDuration(result?.activeMs ?? activeMs)}</strong>
      {phase === 'paused' && <small>재개 전까지 활동 시간이 멈춥니다.</small>}
      {!result && activeMs >= plan.targetSeconds * 1000 && <small>목표 시간 도달 · 완료 확인으로 이동할 수 있습니다.</small>}
    </Card>
    {phase === 'review' && <Card>
      <h2>완료 기록 확인</h2><p>타이머 자동 기록 · {formatDuration(activeMs)}</p>
      {motion && <>
        <label>실제 거리 (km, 선택)<input inputMode="decimal" value={draft.distance} onChange={event => onDraft({ distance: event.target.value })} /></label>
        <label>실제 속도 (km/h, 선택)<input inputMode="decimal" value={draft.speed} onChange={event => onDraft({ speed: event.target.value })} /></label>
        <small className="muted">거리를 비우고 속도를 입력하면 활동 시간으로 거리를 계산합니다.</small>
      </>}
      <label>평균 심박수 (BPM, 선택)<input inputMode="numeric" value={draft.bpm} onChange={event => onDraft({ bpm: event.target.value })} /></label>
      <label className={styles.checkbox}><input type="checkbox" checked={draft.correctedSeconds !== null}
        onChange={event => onDraft({ correctedSeconds: event.target.checked ? String(Math.max(1, Math.round(activeMs / 1000))) : null })} />실제 시간 정정</label>
      {draft.correctedSeconds !== null && <label>정정 활동 시간 (초)<input inputMode="numeric" value={draft.correctedSeconds}
        onChange={event => onDraft({ correctedSeconds: event.target.value })} /></label>}
      {issue}
      <Button onClick={onCancelReview}>완료 취소 · 일시정지로 돌아가기</Button>
    </Card>}
    {result && <Card><h2>실제 완료 기록</h2><CardioActual result={result} />
      <Button onClick={onUndo}>유산소 완료 취소</Button></Card>}
    <Button aria-expanded={editing} onClick={onEdit}>{editing ? '임시 편집 닫기' : '현재 세션에서 종목 변경 · 유산소 추가'}</Button>
    {editing && editTools}
  </>
}
