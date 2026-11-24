
import { suggestedApproval } from '../workout-online/approval-weight.ts'
import type { LoadType } from '../workout-online/types.ts'
import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import type { RepeatPointerGuard } from '../../components/repeatPointerGuard.ts'
import { formatDuration } from '../workout/model.ts'
import { ExerciseSwipe } from './ExerciseSwipe.tsx'
import type { ExerciseSwipeOptions } from './ExerciseSwipe.tsx'
import { WorkoutSaveLabel } from './WorkoutSaveLabel.tsx'
import type { WorkoutSaveStatus } from '../workout-local/save-status.ts'
import styles from './WorkoutFlow.module.css'

type Step = { id: string; name: string }
type Navigation = { previous?: Step; next?: Step; onGo: (id: string) => void }
export type ExerciseScrollPosition = { exerciseId: string; top: number }

function measureWorkoutFrame(frame: HTMLElement, clock: HTMLElement | null, footer: HTMLElement | null) {
  const clockHeight = clock?.getBoundingClientRect().height
  const footerHeight = footer?.getBoundingClientRect().height
  if (clockHeight && frame.style.getPropertyValue('--workout-clock-height') !== clockHeight + 'px') {
    frame.style.setProperty('--workout-clock-height', clockHeight + 'px')
  }
  // Keep the last reservation while the keyboard temporarily hides the footer.
  if (footerHeight || !footer) {
    const height = (footerHeight ?? 0) + 'px'
    if (frame.style.getPropertyValue('--workout-footer-height') !== height) frame.style.setProperty('--workout-footer-height', height)
  }
}

export function WorkoutFrame({ routine, deload, elapsed, position, count, timerHeading = '휴식 시간', timerLabel, timer, flash, dim, children, actions, actionsBlocked, footerGuard, onHome, backLabel = '홈', onEnd, onRestInteraction, clockRef, navigation, swipe, reviewNote, hidden, cardioFocus, exerciseScroll, feedback, dataStatus, syncing, onDataStatusDetails }: {
  routine: string; deload: boolean; elapsed: number; position: number; count: number
  timerHeading?: string; timerLabel: string; timer?: number; flash?: boolean; dim?: number; children: ReactNode; actions?: ReactNode; actionsBlocked?: boolean
  footerGuard?: RepeatPointerGuard
  feedback?: ReactNode
  onHome: () => void; backLabel?: string; onEnd: () => void; onRestInteraction?: () => void
  clockRef?: RefObject<HTMLDivElement | null>
  navigation?: Navigation; swipe?: ExerciseSwipeOptions; reviewNote?: ReactNode; hidden?: boolean; cardioFocus?: boolean
  dataStatus?: WorkoutSaveStatus; syncing?: boolean; onDataStatusDetails?: () => void
  exerciseScroll?: ExerciseScrollPosition | null
}) {
  const root = useRef<HTMLDivElement>(null)
  const ownClock = useRef<HTMLDivElement>(null)
  const footer = useRef<HTMLElement>(null)
  const appliedScroll = useRef<ExerciseScrollPosition | null>(null)
  const hasActions = !!actions
  const timeBar = clockRef ?? ownClock
  const currentExercise = swipe?.currentId
  useLayoutEffect(() => {
    const frame = root.current, dock = timeBar.current, actionBar = footer.current
    if (!frame || !dock) return
    const observer = new ResizeObserver(() => measureWorkoutFrame(frame, dock, actionBar))
    observer.observe(dock)
    if (actionBar) observer.observe(actionBar)
    return () => observer.disconnect()
  }, [timeBar, hasActions])
  // Read the committed rows before paint and before restoring the next exercise's scroll position.
  useLayoutEffect(() => {
    if (root.current) measureWorkoutFrame(root.current, timeBar.current, footer.current)
  }, [timeBar, actions, cardioFocus, hidden])
  useLayoutEffect(() => {
    if (!exerciseScroll || exerciseScroll.exerciseId !== currentExercise || appliedScroll.current === exerciseScroll) return
    appliedScroll.current = exerciseScroll
    const frame = root.current, page = document.scrollingElement
    if (!frame?.getClientRects().length || !page || frame.closest('[data-keyboard-open]') ||
      document.activeElement?.matches('input, textarea, select, [contenteditable]')) return
    // The browser can follow the old bottom edge when the new exercise is taller.
    const limit = Math.max(0, page.scrollHeight - page.clientHeight)
    const target = Math.max(0, Math.min(exerciseScroll.top, limit))
    if (Math.abs(page.scrollTop - target) >= 1) page.scrollTo({ top: target, behavior: 'instant' })
  }, [currentExercise, exerciseScroll])

  return <div className={styles.flow} ref={root} hidden={hidden} onClickCapture={onRestInteraction} data-workout-frame data-fixed-actions={hasActions || undefined}
    data-weight-focus={!!navigation || undefined} data-cardio-focus={cardioFocus || undefined}>
    <div className={styles.clockDock} ref={timeBar} data-keyboard-header>
      <div className={`${styles.clock} ${styles.restFlash}`} data-flash={flash || undefined} aria-label="운동 시간">
        <div><small>전체 운동 시간</small><strong>{formatDuration(elapsed)}</strong></div>
        <div className={styles.clockProgress}>{dataStatus ? <WorkoutSaveLabel status={dataStatus} syncing={syncing} onDetails={onDataStatusDetails} /> : <small>운동 진행</small>}
          <strong>{position ? `현재 ${position} / ${count}종목` : '준비운동'}</strong>
          <div className={styles.segments} aria-hidden="true">{Array.from({ length: count }, (_, i) =>
            <span key={i} data-filled={i < position || undefined} />)}</div>
        </div>
        <div><small>{timerHeading}</small><strong data-time={timer !== undefined || undefined}>{timer === undefined ? timerLabel : formatDuration(timer)}</strong></div>
      </div>
    </div>
    <header className={styles.topNav} data-exercise-navigation={!!navigation || undefined} aria-label={navigation ? '운동 종목 이동' : undefined}>
      {navigation ? <Button shape="control" variant="quiet" aria-label={navigation.previous ? '이전 운동 · ' + navigation.previous.name : '이전 운동'} disabled={!navigation.previous} onClick={() => navigation.previous && navigation.onGo(navigation.previous.id)}>
        ‹ 이전<small title={navigation.previous?.name}>{navigation.previous?.name ?? '첫 종목'}</small>
      </Button> : <Button shape="control" variant="quiet" onClick={onHome}>‹ {backLabel}</Button>}
      <strong title={routine} aria-label={routine}>{deload && <small className={styles.eyebrow}>DELOAD</small>}<span>{routine}</span></strong>
      {navigation ? <Button shape="control" variant="quiet" aria-label={navigation.next ? '다음 운동 · ' + navigation.next.name : '다음 운동'} disabled={!navigation.next} onClick={() => navigation.next && navigation.onGo(navigation.next.id)}>
        다음 ›<small title={navigation.next?.name}>{navigation.next?.name ?? '마지막 종목'}</small>
      </Button> : <Button variant="quiet" onClick={onEnd}>종료</Button>}
    </header>
    {reviewNote}
    {swipe ? <ExerciseSwipe options={swipe} cardio={cardioFocus}>{children}</ExerciseSwipe> : children}
    {dim !== undefined && <div className={styles.restDimmer}><RestCountdown seconds={dim} /></div>}
    {hasActions && <footer className={styles.footer} ref={footer} inert={actionsBlocked}
      onPointerDownCapture={footerGuard?.pointerDown} onPointerCancelCapture={footerGuard?.pointerCancel}
      onClickCapture={footerGuard?.blocksClick}>{actions}</footer>}
    {feedback}
  </div>
}

export function Warmup({ next }: { next: { name: string; target: string; equipment?: string } }) {
  return <>
    <Card hero className={styles.warmup}>
      <span aria-hidden="true" className={styles.warmupMark}>↗</span>
      <p className={styles.eyebrow}>준비운동</p>
      <h1>몸을 깨우는 시간.</h1>
      <p className="muted">스트레칭과 워밍업으로<br />자유롭게 준비하세요.</p>
      <small>세트 기록 없음</small>
    </Card>
    <Card>
      <p className={styles.eyebrow}>다음 운동</p><strong>{next.name}</strong>
      <p className="muted">{next.target}</p>
      {next.equipment && <p className="muted small">{next.equipment}</p>}
    </Card>
  </>
}

export function ExerciseNavigation({ previous, next, onList, onGo, preview = false }: {
  previous?: Step; next?: Step; onList: () => void; onGo: (id: string) => void; preview?: boolean
}) {
  return <nav className={styles.exerciseNav} aria-label="운동 종목 이동">
    <Button shape="control" variant="quiet" disabled={!previous} onClick={preview ? undefined : () => previous && onGo(previous.id)}>‹ 이전{previous && <small title={previous.name}>{previous.name}</small>}</Button>
    <Button onClick={preview ? undefined : onList}>종목 목록</Button>
    <Button shape="control" variant="quiet" disabled={!next} onClick={preview ? undefined : () => next && onGo(next.id)}>다음 ›{next && <small title={next.name}>{next.name}</small>}</Button>
  </nav>
}

export function WeightRecommendation({ direction, kg, provisional = false, loadType = null, source = 'current', onDismiss }: {
  direction: 'increase' | 'decrease'; kg?: string; provisional?: boolean; loadType?: LoadType | null; source?: 'current' | 'benchmark'; onDismiss?: () => void
}) {
  return <div className={styles.recommendation} data-direction={direction} role="status" aria-label={provisional ? '진행 중 잠정 중량 검토' : undefined}
    title={provisional ? '현재 종목의 서버 저장 수행 기준 잠정 안내입니다. 공식 평가는 운동 종료 후 전체 계획을 기준으로 다시 계산합니다.' : undefined}>
    <div><b>{direction === 'increase' ? '증량 가능' : '감량 검토'}{kg && ` · ${kg}kg → ${suggestedApproval(kg, direction, loadType)}kg`}</b>
    <small>{source === 'benchmark' ? '이전 유효 기준 기록' : direction === 'increase' ? '중량 증가를 고려해 보세요.' : '중량 감소를 고려해 보세요.'}</small></div>
    {onDismiss && <Button shape="control" variant="quiet" aria-label="중량 안내 숨기기" onClick={onDismiss}>×</Button>}
  </div>
}

export function RestCountdown({ seconds }: { seconds: number }) {
  return <div className={styles.restCountdown} data-rest-countdown data-warning={seconds <= 10 || undefined}>
    <span>남은 휴식 시간</span><strong>{seconds}<small>초</small></strong>
  </div>
}

export function RestActions({ remaining, flash, onEnd, onExtend, disabled }: {
  remaining: number; flash?: boolean; onEnd: () => void; onExtend: () => void; disabled?: boolean
}) {
  const [mouseHover, setMouseHover] = useState(false)
  return <>
    {remaining > 0 && remaining <= 10 && <div className={`${styles.prepare} ${styles.restFlashBar}`} data-flash={flash || undefined}>
      <b>다음 세트 준비</b><strong>{remaining}초</strong>
    </div>}
    <div className={styles.actions}>
      <Button shape="control" variant="primary" className={styles.restEnd} data-mouse-hover={mouseHover || undefined} pending={disabled}
        onPointerMove={event => { if (event.pointerType === 'mouse') setMouseHover(true) }}
        onPointerLeave={() => setMouseHover(false)} onClick={onEnd}>휴식 종료</Button>
      <Button shape="control" pending={disabled} onClick={onExtend}>+30초</Button>
    </div>
  </>
}
