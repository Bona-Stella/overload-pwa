import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { Button, Card, StatusNotice } from '../../components/ui.tsx'
import type { RestPolicy } from '../workout-local/types.ts'
import { countDraft } from '../workout-online/validation.ts'
import styles from './RestSettings.module.css'

type Band = keyof RestPolicy
type Draft = Record<Band, string>
type SaveIssue = { message: string; conflict?: boolean }
type ExitGuard = (guard: (() => boolean) | null) => void

const bands = [
  { field: 'restLowSeconds', start: 1, end: 10, label: '1~10회' },
  { field: 'restMediumSeconds', start: 11, end: 12, label: '11~12회' },
  { field: 'restHighSeconds', start: 13, end: '이상', label: '13회 이상' },
] as const

function minutes(seconds: number) {
  const remaining = seconds % 60
  return `${Math.floor(seconds / 60)}분${remaining ? ` ${remaining}초` : ''}`
}

export function RestSettings({ settings, onBack, onRequest, onExitGuard, busy = false, hidden = false, review = false, loadIssue }: {
  settings?: RestPolicy
  onBack: (canLeave?: () => boolean) => void
  onRequest: (values: RestPolicy | null) => Promise<SaveIssue | null>
  onExitGuard?: ExitGuard
  busy?: boolean
  hidden?: boolean
  review?: boolean
  loadIssue?: string | null
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const pending = useRef(false)
  const hint = useId()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [invalid, setInvalid] = useState<Band | null>(null)
  const [issue, setIssue] = useState<string | null>(null)
  const [reloading, setReloading] = useState(false)
  const [refreshed, setRefreshed] = useState(false)
  const [saving, setSaving] = useState(false)
  const dirty = !!draft && !!settings && bands.some(({ field }) => draft[field] !== String(settings[field]))
  const canLeave = useCallback(() => !pending.current && (!dirty || window.confirm('수정한 휴식 시간을 버릴까요?')), [dirty])

  useLayoutEffect(() => {
    if (!hidden) { heading.current?.focus({ preventScroll: true }); window.scrollTo(0, 0) }
  }, [hidden])
  useEffect(() => {
    if (hidden || !draft || !onExitGuard) return
    onExitGuard(canLeave)
    return () => onExitGuard(null)
  }, [hidden, draft, canLeave, onExitGuard])

  const toggleEdit = () => {
    if (draft && !canLeave()) return
    setDraft(!draft && settings ? {
      restLowSeconds: String(settings.restLowSeconds),
      restMediumSeconds: String(settings.restMediumSeconds),
      restHighSeconds: String(settings.restHighSeconds),
    } : null)
    setIssue(null)
    setInvalid(null)
    setReloading(false)
    setRefreshed(false)
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft || busy || pending.current) return
    let values: RestPolicy | null = null
    if (!reloading) {
      values = { restLowSeconds: 0, restMediumSeconds: 0, restHighSeconds: 0 }
      for (const { field, label } of bands) {
        try { values[field] = countDraft(draft[field]) }
        catch (error) {
          setInvalid(field)
          setIssue(`${label} 휴식 시간은 ${(error as Error).message}`)
          event.currentTarget.querySelector<HTMLInputElement>(`[name="${field}"]`)?.focus()
          return
        }
      }
    }
    setInvalid(null)
    setIssue(null)
    setRefreshed(false)
    pending.current = true
    setSaving(true)
    try {
      const failure = await onRequest(values)
      if (failure) {
        setIssue(failure.message)
        if (failure.conflict) setReloading(true)
      } else if (reloading) {
        setReloading(false)
        setRefreshed(true)
      } else setDraft(null)
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return <section className={styles.page} hidden={hidden} aria-label="세트 사이 휴식">
    <RecordSubpageHeader title="세트 사이 휴식" backLabel="설정으로" headingRef={heading} backDisabled={saving}
      onBack={() => { if (onExitGuard) onBack(canLeave); else if (canLeave()) onBack() }} />
    {settings ? <form className={styles.form} onSubmit={event => void submit(event)} aria-busy={saving}>
      <Card className={styles.card}>
        <div className={styles.cardHeading}>
          <div className={styles.cardTitle}>
            <h2>반복 구간별 휴식 시간</h2>
            <p>{draft ? '구간별 휴식 시간을 수정할 수 있어요.' : '목표 반복 횟수에 따른 휴식 기준'}</p>
          </div>
          <Button className={styles.cardAction} disabled={busy || saving} onClick={toggleEdit}>{draft ? '취소' : '편집'}</Button>
        </div>
        {draft ? <>
          <div className={`${styles.columns} ${styles.labels}`} aria-hidden="true"><span>시작 세트</span><span>끝 세트</span><span>휴식 (초)</span></div>
          {bands.map(({ field, start, end, label }) => <div key={field} className={`${styles.columns} ${styles.editRow}`}>
            <input aria-label={`${label} 시작 세트`} value={start} readOnly tabIndex={-1} />
            {end === '이상' ? <span className={styles.unbounded}>{end}</span>
              : <input aria-label={`${label} 끝 세트`} value={end} readOnly tabIndex={-1} />}
            <input aria-label={`${label} 휴식 (초)`} aria-describedby={hint} aria-invalid={invalid === field || undefined}
              name={field} inputMode="numeric" autoComplete="off" value={draft[field]} readOnly={saving}
              onChange={event => {
                setDraft({ ...draft, [field]: event.target.value })
                if (invalid === field) { setInvalid(null); setIssue(null) }
              }} />
            <Button variant="quiet" className={styles.remove} aria-label={`${label} 구간 삭제`} aria-describedby={hint} disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 7h14M9 7V4h6v3m2 0-1 13H8L7 7m3 4v5m4-5v5" />
              </svg>
            </Button>
          </div>)}
          <Button className={styles.add} aria-describedby={hint} disabled>+ 구간 추가</Button>
          <p className={styles.hint} id={hint}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" />
            </svg>
            <span>반복 구간은 1회부터 이어지며, 마지막은 ‘이상’으로 표시돼요. 각 구간의 휴식 시간만 수정할 수 있어요.</span>
          </p>
        </> : <dl className={styles.times}>
          {bands.map(({ field, label }) => <div key={field} className={styles.readRow}>
            <dt>{label}</dt><dd><strong>{settings[field]}초</strong>{settings[field] >= 60 && <small>({minutes(settings[field])})</small>}</dd>
          </div>)}
        </dl>}
      </Card>
      {draft && <>
        {issue && <StatusNotice error>{issue}</StatusNotice>}
        {refreshed && <StatusNotice>최신 저장값은 {bands.map(({ field }) => `${settings[field]}초`).join(' · ')}입니다. 입력한 값을 확인한 뒤 다시 저장해 주세요.</StatusNotice>}
        <Button type="submit" className={styles.save} disabled={busy} loading={saving}>
          {reloading ? '최신 설정 다시 확인' : '변경 사항 저장'}
        </Button>
      </>}
    </form> : loadIssue ? <StatusNotice error>{loadIssue}</StatusNotice> : <div aria-busy="true" />}
    {review && <p className="muted small">검토용 예시 휴식 시간입니다.</p>}
  </section>
}
