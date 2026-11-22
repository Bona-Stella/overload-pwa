import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Dialog } from '../../components/Dialog.tsx'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { Button, Card, StatusNotice } from '../../components/ui.tsx'
import { RestCountdown } from '../workout-flow/WorkoutFrame.tsx'
import { REST_MIDDLE_SECONDS, restAlertVisual, restPreviewSeconds } from '../workout-flow/rest-alerts.ts'
import type { RestAlerts } from '../workout-flow/rest-alerts.ts'
import { useRestAudio, useRestTimerAudio } from '../workout-flow/useRestAudio.ts'
import flow from '../workout-flow/WorkoutFlow.module.css'
import styles from './RestAlertSettings.module.css'

const inactiveIcons = { dim: 'dimOff', flash: 'flashOff', sound: 'soundOff', middle: 'middleOff' } as const
type AlertIcon = keyof typeof inactiveIcons
type IconName = AlertIcon | typeof inactiveIcons[AlertIcon] | 'quiet' | 'play' | 'pause'

function Icon({ name }: { name: IconName }) {
  if (name === 'dim' || name === 'dimOff') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden="true">
    {name === 'dim' && <path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" />}
    <circle cx="12" cy="12" r="9" /><path d="M12 3v18" />
  </svg>
  const paths = {
    flash: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    flashOff: 'M12 4h.01M12 20h.01M4 12h.01M20 12h.01M6.3 6.3h.01m11.4 11.4h.01m-11.42 0h.01M17.7 6.3h.01M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    sound: 'm11 5-5 4H3v6h3l5 4ZM15 9a4 4 0 0 1 0 6m3-9a8 8 0 0 1 0 12',
    soundOff: 'm11 5-5 4H3v6h3l5 4Zm5 4 6 6m0-6-6 6',
    quiet: 'm11 5-5 4H3v6h3l5 4ZM16 11a2 2 0 0 1 0 2',
    middle: 'M6 9a6 6 0 0 1 12 0c0 4 1 5 2 6H4c1-1 2-2 2-6Zm4 10a2 2 0 0 0 4 0M3.5 5.5 2 8m18.5-2.5L22 8',
    middleOff: 'm3 3 18 18M9 4a6 6 0 0 1 9 5c0 2.3.3 3.6.8 4.5M6 8c0 4-1 6-2 7h11m-5 4a2 2 0 0 0 4 0',
    play: 'm9 6 9 6-9 6Z',
    pause: 'M9 6v12m6-12v12',
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

function SwitchMark({ on }: { on: boolean }) {
  return <span className={styles.switchMark} data-on={on || undefined} aria-hidden="true"><span />{on ? 'ON' : 'OFF'}</span>
}

function AlertSection({ title, icon, checked, locked, onToggle, onPlay, playing, playDisabled, children }: {
  title: string; icon?: AlertIcon; checked: boolean; locked: boolean; onToggle: () => void
  onPlay?: () => void; playing?: boolean; playDisabled?: boolean; children?: ReactNode
}) {
  return <section className={styles.setting} aria-label={`${title} 설정`}>
    <div className={styles.settingHeading}>
      <h2 data-on={checked || undefined}>{icon && <Icon name={checked ? icon : inactiveIcons[icon]} />}{title}</h2>
      {onPlay && <Button variant="quiet" className={styles.sample} aria-label={`${title} 미리듣기${playing ? ' 중지' : ''}`}
        disabled={locked || playDisabled} onClick={onPlay}><Icon name={playing ? 'pause' : 'play'} /></Button>}
      <Button className={styles.switch} role="switch" aria-label={title} aria-checked={checked} disabled={locked} onClick={onToggle}><SwitchMark on={checked} /></Button>
    </div>
    {children}
  </section>
}

function Times<T extends number>({ label, options, selected, disabled, onSelect }: {
  label: string; options: readonly T[]; selected: T; disabled: boolean; onSelect: (value: T) => void
}) {
  return <div className={styles.field}>
    <span>{label}</span>
    <div className={styles.segments} role="group" aria-label={label}>
      {options.map(value => <Button variant="quiet" key={value} aria-pressed={selected === value} disabled={disabled} onClick={() => onSelect(value)}>{value}초 전</Button>)}
    </div>
  </div>
}

function LocationChoice({ location, selected, disabled, onToggle }: {
  location: 'top' | 'bottom'; selected: boolean; disabled: boolean; onToggle: () => void
}) {
  const title = location === 'top' ? '상단 상태 영역' : '하단 휴식 영역'
  return <Button className={styles.location} role="switch" aria-label={title} aria-checked={selected} disabled={disabled} onClick={onToggle}>
    <span className={styles.locationHeading}>{title}<SwitchMark on={selected} /></span>
    <span className={styles.locationDiagram} data-location={location} aria-hidden="true"><i />{location === 'top' && <><i /><i /></>}</span>
  </Button>
}

function FlashPreview({ alerts, seconds, running }: { alerts: RestAlerts; seconds: number; running: boolean }) {
  const visual = restAlertVisual(alerts, running ? seconds : 0)
  return <div className={styles.previewPair}>
    <div className={styles.previewSlot} data-muted={!alerts.top || undefined}>
      <div className={styles.slotLabel}>상단<i aria-hidden="true" /></div>
      <div className={`${styles.previewSurface} ${flow.restFlash}`} data-flash={visual.top || undefined}>
        <div className={styles.mockClock}><i /><i /><strong>00:{String(seconds).padStart(2, '0')}</strong></div>
        <span className={styles.progressStub} aria-hidden="true" />
      </div>
    </div>
    <div className={styles.previewSlot} data-muted={!alerts.bottom || undefined}>
      <div className={styles.slotLabel}>하단<i aria-hidden="true" /></div>
      <div className={styles.previewSurface}>
        <div className={`${styles.mockPrepare} ${flow.restFlashBar}`} data-flash={visual.bottom || undefined}><b>다음 세트 준비</b><strong>{seconds}초</strong></div>
      </div>
    </div>
  </div>
}

export function RestAlertSettings({ alerts, onChange, onBack, review = false }: {
  alerts: RestAlerts; onChange: (next: RestAlerts) => boolean | void; onBack: () => void; review?: boolean
}) {
  const [run, setRun] = useState<{ ends: number; alerts: RestAlerts } | null>(null)
  const previewAlerts = run?.alerts ?? alerts
  const audio = useRestAudio(previewAlerts.sound || previewAlerts.middle, previewAlerts.volume)
  const { stop, unlock, sample } = audio
  const title = useRef<HTMLHeadingElement>(null)
  const preview = useRef<HTMLElement>(null)
  const [seconds, setSeconds] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [saveIssue, setSaveIssue] = useState(false)
  const [playIssue, setPlayIssue] = useState(false)
  const [playingSample, setPlayingSample] = useState<1 | 3 | null>(null)
  const sampleRequest = useRef<{ count: 1 | 3 } | null>(null)
  const running = run !== null
  const dim = alerts.visual === 'dim'
  const flash = alerts.visual === 'flash'
  const previewDim = previewAlerts.visual === 'dim'
  const previewFlash = previewAlerts.visual === 'flash'
  useRestTimerAudio(audio, { id: running ? 'preview' : null, ends: run?.ends, remaining: seconds, countdown: previewAlerts.sound })

  useLayoutEffect(() => { title.current?.focus({ preventScroll: true }); window.scrollTo(0, 0) }, [])
  useEffect(() => () => { sampleRequest.current = null }, [])
  useEffect(() => {
    if (!run) return
    const { ends } = run
    const tick = () => {
      const left = ends - Date.now()
      setSeconds(Math.max(0, Math.ceil(left / 1000)))
      if (left < -400) { stop(); setCompleted(true); setRun(null) }
    }
    const timer = window.setInterval(tick, 80)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('pageshow', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('pageshow', tick)
    }
  }, [run, stop])
  useEffect(() => {
    if (running && !previewDim) preview.current?.scrollIntoView({ block: 'nearest' })
  }, [running, previewDim])

  const stopSample = () => {
    sampleRequest.current = null
    stop()
    setPlayingSample(null)
  }
  const update = (patch: Partial<RestAlerts>) => {
    stopSample()
    setCompleted(false)
    setPlayIssue(false)
    setSaveIssue(onChange({ ...alerts, ...patch }) === false)
  }
  const playSample = async (count: 1 | 3) => {
    if (sampleRequest.current?.count === count) { stopSample(); return }
    const request = { count }
    sampleRequest.current = request
    setPlayingSample(null)
    setPlayIssue(false)
    const result = await sample(count, () => {
      if (sampleRequest.current === request) setPlayingSample(count)
    })
    if (sampleRequest.current !== request) return
    sampleRequest.current = null
    setPlayingSample(null)
    if (result === 'unavailable') setPlayIssue(true)
  }
  const start = () => {
    if (running) return
    stopSample()
    if (alerts.sound && alerts.volume) void unlock()
    const duration = restPreviewSeconds(alerts)
    setPlayIssue(false); setCompleted(false); setSeconds(duration); setRun({ ends: Date.now() + duration * 1000, alerts })
  }
  const close = () => { stop(); setRun(null); setCompleted(false) }
  const text = running ? `종료까지 ${seconds}초` : completed ? '시연 완료' : '시연 준비'

  return <section className={styles.page} aria-label="휴식 타이머 알림">
    <RecordSubpageHeader title="휴식 타이머 알림" onBack={onBack} backLabel="설정으로" headingRef={title} />
    <Card className={styles.card}>
      <AlertSection title="화면 어둡게" icon="dim" checked={dim} locked={running} onToggle={() => update({ visual: dim ? 'off' : 'dim' })}>
        {dim && <p>휴식 종료 12초 전부터 화면을 어둡게 하고 남은 시간을 크게 보여줘요.</p>}
      </AlertSection>
      <AlertSection title="화면 깜빡임" icon="flash" checked={flash} locked={running} onToggle={() => update({ visual: flash ? 'off' : 'flash' })}>
        {flash && <>
          <p>휴식 종료 전, 선택한 운동 화면 영역을 깜빡여 알려줘요.</p>
          <div className={styles.field}>
            <span>알림 표시 위치</span>
            <div className={styles.locationPair} role="group" aria-label="알림 표시 위치">
              <LocationChoice location="top" selected={alerts.top} disabled={running} onToggle={() => update({ top: !alerts.top })} />
              <LocationChoice location="bottom" selected={alerts.bottom} disabled={running} onToggle={() => update({ bottom: !alerts.bottom })} />
            </div>
          </div>
          <Times label="깜빡임 시작 시점" options={[3, 5, 10] as const} selected={alerts.threshold} disabled={running} onSelect={threshold => update({ threshold })} />
        </>}
      </AlertSection>
      <AlertSection title="효과음" icon="sound" checked={alerts.sound} locked={running} onToggle={() => update({ sound: !alerts.sound })}
        onPlay={() => void playSample(1)} playing={playingSample === 1} playDisabled={!alerts.sound || !alerts.volume}>
        {(alerts.sound || alerts.middle) &&
          <label className={styles.volume}>
            <span>효과음 볼륨 <strong aria-hidden="true">{alerts.volume}%</strong></span>
            <span><Icon name="quiet" /><input type="range" aria-label="효과음 볼륨" aria-valuetext={`${alerts.volume}%`} min={0} max={100} step={5}
              value={alerts.volume} disabled={running} style={{ '--volume': alerts.volume / 100 } as CSSProperties}
              onChange={event => update({ volume: Number(event.target.value) })} /><Icon name="sound" /></span>
          </label>}
        {alerts.sound && <p>휴식 종료 전 마지막 5초에 효과음이 재생돼요.</p>}
      </AlertSection>
      <AlertSection title="중간 알림음" icon="middle" checked={alerts.middle} locked={running} onToggle={() => update({ middle: !alerts.middle })}
        onPlay={() => void playSample(3)} playing={playingSample === 3} playDisabled={!(alerts.sound || alerts.middle) || !alerts.volume}>
        {alerts.middle && <p>휴식 종료 {REST_MIDDLE_SECONDS}초 전에 알림음이 세 번 울려요.</p>}
      </AlertSection>
      <AlertSection title="휴식 테스트" checked={alerts.testMode} locked={running} onToggle={() => update({ testMode: !alerts.testMode })}>
        <p>켜면 실제 운동의 휴식 시간이 12초로 적용됩니다.</p>
      </AlertSection>
    </Card>
    {saveIssue && <StatusNotice error>이 브라우저에 알림 설정을 저장하지 못했어요.</StatusNotice>}
    <Button className={styles.previewButton} aria-disabled={running} onClick={start}><Icon name="play" />알림 미리보기</Button>
    {playIssue && <StatusNotice>이 브라우저에서 효과음을 재생하지 못했어요.</StatusNotice>}
    {(previewFlash || running && !previewDim || completed) && <Card ref={preview} className={styles.preview} aria-label="미리보기">
      <div className={styles.previewHeading}><h2>미리보기</h2><span>{text}</span></div>
      {previewFlash && <FlashPreview alerts={previewAlerts} seconds={running || completed ? seconds : previewAlerts.threshold} running={running} />}
      {running && !previewDim && <Button onClick={close}>미리보기 종료</Button>}
    </Card>}
    <p className={styles.note}>실제 효과음 크기는 기기 음량과 브라우저 환경의 영향을 받을 수 있어요.</p>
    <p className={styles.note}>{review ? 'UI 검토용 설정입니다.' : '알림 설정은 이 브라우저에 저장돼요.'}</p>
    {running && previewDim && <div className={styles.dimPreview}>
      <Dialog title="화면 어둡게 미리보기" onClose={close}><RestCountdown seconds={seconds} /></Dialog>
    </div>}
  </section>
}
