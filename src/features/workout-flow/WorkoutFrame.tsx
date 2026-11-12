
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import { formatDuration } from '../workout/model.ts'
import styles from './WorkoutFlow.module.css'

type Step = { id: string; name: string }
type Navigation = { previous?: Step; next?: Step; onGo: (id: string) => void }

export function WorkoutFrame({ routine, deload, elapsed, position, count, timerHeading = '휴식 시간', timerLabel, timer, flash, children, actions, onHome, onEnd, clockRef, navigation, reviewNote }: {
  routine: string; deload: boolean; elapsed: number; position: number; count: number
  timerHeading?: string; timerLabel: string; timer?: number; flash?: boolean; children: ReactNode; actions?: ReactNode
  onHome: () => void; onEnd: () => void
  clockRef?: RefObject<HTMLDivElement | null>
  navigation?: Navigation; reviewNote?: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const ownClock = useRef<HTMLDivElement>(null)
  const footer = useRef<HTMLElement>(null)
  const restoreScroll = useRef<{ left: number; top: number } | null>(null)
  const [memoActive, setMemoActive] = useState(false)
  const hasActions = !!actions
  const timeBar = clockRef ?? ownClock
  useLayoutEffect(() => {
    const dock = timeBar.current
    if (!dock) return
    const measure = () => {
      root.current?.style.setProperty('--workout-clock-height', dock.getBoundingClientRect().height + 'px')
      const height = footer.current?.getBoundingClientRect().height
      if (height) root.current?.style.setProperty('--workout-footer-height', height + 'px')
      else if (!footer.current) root.current?.style.setProperty('--workout-footer-height', '0px')
    }
    measure()
    if (!memoActive) root.current?.style.removeProperty('--workout-memo-space')
    if (!memoActive && restoreScroll.current) {
      const position = restoreScroll.current
      restoreScroll.current = null
      const page = document.scrollingElement
      const maxScroll = page ? Math.max(0, page.scrollHeight - page.clientHeight) : position.top
      window.scrollTo({ left: position.left, top: Math.min(position.top, maxScroll), behavior: 'instant' })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(dock)
    if (footer.current) observer.observe(footer.current)
    return () => observer.disconnect()
  }, [timeBar, memoActive, hasActions])
  useEffect(() => {
    const viewport = window.visualViewport
    const container = root.current
    if (!container) return
    let memo: HTMLTextAreaElement | null = null
    let editing = false
    let userControlled = false
    let entryScroll: { left: number; top: number } | null = null
    let entryMemoId: string | null = null
    let settledSize: { width: number; height: number } | null = null
    let memoSpace = 0
    let settleTimer: ReturnType<typeof setTimeout>
    const layoutHeight = () => Math.max(window.innerHeight, document.documentElement.clientHeight)
    const size = () => ({ width: document.documentElement.clientWidth, height: viewport?.height ?? window.innerHeight })
    const occlusion = () => viewport ? Math.max(0, layoutHeight() - viewport.height) : 0
    const inset = () => viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0
    const writeInset = () => document.documentElement.style.setProperty('--keyboard-inset', inset() + 'px')
    const reserve = (height: number) => {
      if (Math.abs(height - memoSpace) < 1) return
      memoSpace = height
      container.style.setProperty('--workout-memo-space', height + 'px')
    }
    const settle = () => {
      const currentSize = size()
      const closed = occlusion() <= 2 && inset() <= 2
      if (!memo) {
        if (!closed) return
        editing = false
        const currentMemoId = container.querySelector('[data-workout-memo-card]')?.getAttribute('data-workout-memo-card')
        // A user's new position takes priority over the saved entry position.
        restoreScroll.current = !userControlled && currentMemoId === entryMemoId ? entryScroll : null
        entryScroll = null
        memoSpace = 0
        settledSize = null
        document.documentElement.style.setProperty('--keyboard-inset', '0px')
        setMemoActive(false)
        return
      }
      if (document.activeElement !== memo) return
      if (closed && settledSize) {
        reserve(0)
        if (userControlled) entryScroll = { left: window.scrollX, top: window.scrollY }
        userControlled = false
        settledSize = currentSize
        return
      }
      const rotated = settledSize && Math.abs(currentSize.width - settledSize.width) > 2
      // Safari toolbar height changes during a drag are not a new alignment request.
      // Once the user takes over, only rotation or a fresh focus may reposition the page.
      if (userControlled && settledSize && !rotated) {
        if (closed) reserve(0)
        return
      }
      // Keyboard space depends on height, never on the viewport's pan offset.
      // Keep it stable until genuine geometry change or completed keyboard dismissal.
      reserve(closed ? 0 : Math.max(memoSpace, occlusion()))
      const mayAlign = !userControlled || !!rotated
      settledSize = currentSize
      if (!mayAlign) return
      const card = memo.closest<HTMLElement>('[data-workout-memo-card]')
      if (!card) return
      const delta = () => {
        const rect = card.getBoundingClientRect()
        const top = Math.max(viewport?.offsetTop ?? 0, timeBar.current?.getBoundingClientRect().bottom ?? 0) + 8
        const bottom = (viewport ? viewport.offsetTop + viewport.height : window.innerHeight) - 48
        // On very small viewports, preserve the label and input before the supporting note.
        const target = rect.height > bottom - top ? memo!.parentElement!.getBoundingClientRect() : rect
        return target.height > bottom - top ? target.top - top
          : target.bottom > bottom ? target.bottom - bottom : target.top < top ? target.top - top : 0
      }
      const page = document.scrollingElement
      if (!page) return
      const missing = Math.max(0, window.scrollY + delta() - (page.scrollHeight - page.clientHeight))
      if (missing > 1) reserve(memoSpace + missing)
      const target = Math.max(0, Math.min(window.scrollY + delta(), page.scrollHeight - page.clientHeight))
      if (Math.abs(target - window.scrollY) > 1) window.scrollTo({ top: target, behavior: 'instant' })
    }
    // One quiet-period job owns opening, real geometry changes, and closing.
    const schedule = () => {
      clearTimeout(settleTimer)
      if (editing) settleTimer = setTimeout(settle, 160)
    }
    const resize = () => {
      if (!editing) { writeInset(); return }
      if (!memo) { schedule(); return }
      const next = size()
      const changed = !settledSize || Math.abs(next.width - settledSize.width) > 2 || Math.abs(next.height - settledSize.height) > 2
      if (changed) schedule()
    }
    const scroll = () => {
      if (!editing) { writeInset(); return }
      // Do not change document height or re-align on a Safari viewport pan.
      if (!memo || !settledSize && !userControlled) schedule()
    }
    const focus = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLTextAreaElement) || !event.target.matches('[data-workout-memo]')) return
      if (!editing) entryMemoId = event.target.closest('[data-workout-memo-card]')?.getAttribute('data-workout-memo-card') ?? null
      if (!editing && !entryScroll) entryScroll = { left: window.scrollX, top: window.scrollY }
      memo = event.target
      editing = true
      userControlled = false
      settledSize = null
      setMemoActive(true)
      schedule()
    }
    const blur = (event: FocusEvent) => {
      if (event.target !== memo) return
      memo = null
      schedule()
    }
    const userScroll = () => {
      if (!editing) return
      userControlled = true
      schedule()
    }
    const pointerMove = (event: PointerEvent) => { if (event.buttons) userScroll() }
    // Capture the entry before Safari's native focus scroll.
    const remember = () => {
      if (!editing) entryScroll = { left: window.scrollX, top: window.scrollY }
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') remember()
      else if (['PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) userScroll()
    }
    resize()
    container.addEventListener('pointerdown', remember, true)
    container.addEventListener('keydown', keydown, true)
    container.addEventListener('focusin', focus)
    container.addEventListener('focusout', blur)
    viewport?.addEventListener('resize', resize)
    viewport?.addEventListener('scroll', scroll)
    window.addEventListener('resize', resize)
    window.addEventListener('wheel', userScroll, { passive: true })
    window.addEventListener('touchmove', userScroll, { passive: true })
    window.addEventListener('pointermove', pointerMove, { passive: true })
    return () => {
      clearTimeout(settleTimer)
      container.removeEventListener('pointerdown', remember, true)
      container.removeEventListener('keydown', keydown, true)
      container.removeEventListener('focusin', focus)
      container.removeEventListener('focusout', blur)
      viewport?.removeEventListener('resize', resize)
      viewport?.removeEventListener('scroll', scroll)
      window.removeEventListener('resize', resize)
      window.removeEventListener('wheel', userScroll)
      window.removeEventListener('touchmove', userScroll)
      window.removeEventListener('pointermove', pointerMove)
      container.style.removeProperty('--workout-memo-space')
      document.documentElement.style.removeProperty('--keyboard-inset')
    }
  }, [timeBar])

  return <div className={styles.flow} ref={root} data-workout-frame data-fixed-actions={hasActions || undefined} data-weight-focus={!!navigation || undefined} data-memo-active={memoActive || undefined}>
    <div className={styles.clockDock} ref={timeBar}>
      <div className={styles.clock} data-flash={flash || undefined} aria-label="운동 시간">
        <div><small>전체 운동 시간</small><strong>{formatDuration(elapsed)}</strong></div>
        <div><small>운동 진행</small><strong>{position ? `현재 ${position} / ${count}종목` : '준비운동'}</strong>
          <div className={styles.segments} aria-hidden="true">{Array.from({ length: count }, (_, i) =>
            <span key={i} data-filled={i < position || undefined} />)}</div>
        </div>
        <div><small>{timerHeading}</small><strong data-time={timer !== undefined || undefined}>{timer === undefined ? timerLabel : formatDuration(timer)}</strong></div>
      </div>
    </div>
    <header className={styles.topNav} data-exercise-navigation={!!navigation || undefined} aria-label={navigation ? '운동 종목 이동' : undefined}>
      {navigation ? <Button variant="quiet" aria-label={navigation.previous ? '이전 운동 · ' + navigation.previous.name : '이전 운동'} disabled={!navigation.previous} onClick={() => navigation.previous && navigation.onGo(navigation.previous.id)}>
        ‹ 이전<small title={navigation.previous?.name}>{navigation.previous?.name ?? '첫 종목'}</small>
      </Button> : <Button variant="quiet" onClick={onHome}>‹ 홈</Button>}
      <strong title={routine} aria-label={routine}>{deload && <small className={styles.eyebrow}>DELOAD</small>}<span>{routine}</span></strong>
      {navigation ? <Button variant="quiet" aria-label={navigation.next ? '다음 운동 · ' + navigation.next.name : '다음 운동'} disabled={!navigation.next} onClick={() => navigation.next && navigation.onGo(navigation.next.id)}>
        다음 ›<small title={navigation.next?.name}>{navigation.next?.name ?? '마지막 종목'}</small>
      </Button> : <Button variant="quiet" onClick={onEnd}>종료</Button>}
    </header>
    {reviewNote}
    {children}
    {hasActions && <footer className={styles.footer} ref={footer} hidden={memoActive}>{actions}</footer>}
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

export function ExerciseNavigation({ previous, next, onList, onGo }: {
  previous?: Step; next?: Step; onList: () => void; onGo: (id: string) => void
}) {
  return <nav className={styles.exerciseNav} aria-label="운동 종목 이동">
    <Button variant="quiet" disabled={!previous} onClick={() => previous && onGo(previous.id)}>‹ 이전{previous && <small title={previous.name}>{previous.name}</small>}</Button>
    <Button onClick={onList}>종목 목록</Button>
    <Button variant="quiet" disabled={!next} onClick={() => next && onGo(next.id)}>다음 ›{next && <small title={next.name}>{next.name}</small>}</Button>
  </nav>
}

export function WeightRecommendation({ direction, kg }: { direction: 'increase' | 'decrease'; kg?: string }) {
  return <div className={styles.recommendation} data-direction={direction} role="status">
    <b>{direction === 'increase' ? '증량 가능' : '감량 검토'}{kg && ` · ${kg}kg`}</b>
    <small>{direction === 'increase' ? '중량 증가를 고려해 보세요.' : '중량 감소를 고려해 보세요.'}</small>
  </div>
}

export function RestActions({ remaining, onEnd, onExtend }: { remaining: number; onEnd: () => void; onExtend: () => void }) {
  return <>
    {remaining <= 10 && <div className={styles.prepare} data-urgent={remaining <= 5 || undefined}>
      <b>다음 세트 준비</b><strong>{remaining}초</strong>
    </div>}
    <div className={`${styles.actions} ${styles.restActions}`}><Button variant="primary" onClick={onEnd}>휴식 종료</Button><Button onClick={onExtend}>+30초</Button></div>
  </>
}
