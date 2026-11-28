import { Icon } from '../../components/icons/Icon.tsx'
import { restBandDelete, restBandInfo } from '../../components/icons/settings.tsx'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { CSSProperties } from 'react'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { Button, Card } from '../../components/ui.tsx'
import { RefreshButton } from '../../components/common-ui/RefreshButton.tsx'
import { ContentError } from '../../components/common-ui/ContentFeedback.tsx'
import { Toast } from '../../components/common-ui/Toast.tsx'
import { useSuccessToast } from '../../components/common-ui/useSuccessToast.ts'
import { LoadingSkeleton } from '../../components/LoadingSkeleton.tsx'
import { useConfirmation } from '../../components/useConfirmation.tsx'
import type { RestPolicy } from '../workout-local/types.ts'
import { countDraft } from '../workout-online/validation.ts'
import styles from './RestSettings.module.css'
import workoutStyles from '../workout-flow/WorkoutFlow.module.css'

type Band = keyof RestPolicy
type Draft = Record<Band, string>
type SaveIssue = { message: string; conflict?: boolean; tone?: 'warning' | 'error' }
export type RestExitGuard = (duringTraversal?: boolean) => boolean | Promise<boolean>

const bands = [
  { field: 'restLowSeconds', start: 1, end: 10, label: '1~10회' },
  { field: 'restMediumSeconds', start: 11, end: 12, label: '11~12회' },
  { field: 'restHighSeconds', start: 13, end: '이상', label: '13회 이상' },
] as const

export function RestTimeColumns({ entries }: { entries: readonly { label: string; seconds: number }[] }) {
  return <dl className={`${workoutStyles.recordColumns} ${styles.times}`} aria-label="반복 구간별 휴식"
    style={{ '--record-columns': entries.length } as CSSProperties}>
    {entries.map(({ label, seconds }) => <div key={label} className={styles.readRow}>
      <dt>{label}</dt><dd><strong aria-label={`${seconds}초`}>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</strong></dd>
    </div>)}
  </dl>
}

export function RestSettings({ settings, onBack, onRequest, onExitGuard, busy = false, hidden = false, review = false, loadIssue, onRetry }: {
  settings?: RestPolicy
  onBack: (canLeave?: RestExitGuard) => void
  onRequest: (values: RestPolicy | null) => Promise<SaveIssue | null>
  onExitGuard?: (guard: RestExitGuard | null) => void
  busy?: boolean
  hidden?: boolean
  review?: boolean
  loadIssue?: string | null
  onRetry?: () => void
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const pending = useRef(false)
  const hint = useId()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [invalid, setInvalid] = useState<Band | null>(null)
  const feedback = useSuccessToast(hidden ? null : 'rest-settings')
  const [reloading, setReloading] = useState(false)
  const [refreshed, setRefreshed] = useState(false)
  const [saving, setSaving] = useState(false)
  const dirty = !!draft && !!settings && bands.some(({ field }) => draft[field] !== String(settings[field]))
  const [confirm, confirmation] = useConfirmation()
  const canLeave = useCallback<RestExitGuard>((duringTraversal = false) => !pending.current && (!dirty || confirm({
    title: '휴식 시간 변경을 버릴까요?', description: <p>이미 저장한 휴식 시간은 유지돼요.</p>,
    confirmLabel: '버리기', destructive: true, duringTraversal,
  })), [confirm, dirty])

  useLayoutEffect(() => {
    if (!hidden) { heading.current?.focus({ preventScroll: true }); window.scrollTo(0, 0) }
  }, [hidden])
  useEffect(() => {
    if (hidden || !draft || !onExitGuard) return
    onExitGuard(canLeave)
    return () => onExitGuard(null)
  }, [hidden, draft, canLeave, onExitGuard])

  const toggleEdit = async () => {
    if (draft && !await canLeave()) return
    setDraft(!draft && settings ? {
      restLowSeconds: String(settings.restLowSeconds),
      restMediumSeconds: String(settings.restMediumSeconds),
      restHighSeconds: String(settings.restHighSeconds),
    } : null)
    feedback.clear()
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
        catch {
          setInvalid(field)
          feedback.show(`${label} 휴식 시간을 1초 이상으로 입력해 주세요.`, 'warning')
          event.currentTarget.querySelector<HTMLInputElement>(`[name="${field}"]`)?.focus()
          return
        }
      }
    }
    setInvalid(null)
    feedback.clear()
    setRefreshed(false)
    pending.current = true
    setSaving(true)
    try {
      const failure = await onRequest(values)
      if (failure) {
        feedback.show(failure.message, failure.tone ?? (failure.conflict ? 'warning' : 'error'))
        if (failure.conflict) setReloading(true)
      } else if (reloading) {
        setReloading(false)
        setRefreshed(true)
        feedback.show('최신 설정을 불러왔어요. 입력한 값을 확인해 주세요.', 'info')
      } else { setDraft(null); feedback.show('휴식 시간을 저장했어요.') }
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return <section className={styles.page} hidden={hidden} aria-label="세트 사이 휴식">
    <RecordSubpageHeader title="세트 사이 휴식" backLabel="설정으로" headingRef={heading} backDisabled={saving}
      onBack={async () => { if (onExitGuard) onBack(canLeave); else if (await canLeave()) onBack() }} />
    {settings ? <form className={styles.form} onSubmit={event => void submit(event)} aria-busy={saving}>
      <Card className={styles.card}>
        <div className={styles.cardHeading}>
          <div className={styles.cardTitle}>
            <h2>반복 구간별 휴식 시간</h2>
            <p>{refreshed ? `최신 저장값은 ${bands.map(({ field }) => `${settings[field]}초`).join(' · ')}예요.` : draft ? '구간별 휴식 시간을 수정할 수 있어요.' : '목표 반복 횟수에 따른 휴식 기준'}</p>
          </div>
          <Button compact className={styles.cardAction} disabled={busy && !saving} pending={saving} onClick={toggleEdit}>{draft ? '취소' : '편집'}</Button>
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
                if (invalid === field) { setInvalid(null); feedback.clear() }
              }} />
            <Button shape="control" variant="quiet" className={styles.remove} aria-label={`${label} 구간 삭제`} aria-describedby={hint} disabled>
              <Icon icon={restBandDelete} />
            </Button>
          </div>)}
          <Button className={styles.add} aria-describedby={hint} disabled>+ 구간 추가</Button>
          <p className={styles.hint} id={hint}>
            <Icon icon={restBandInfo} />
            <span>반복 구간은 1회부터 이어지며, 마지막은 ‘이상’으로 표시돼요. 각 구간의 휴식 시간만 수정할 수 있어요.</span>
          </p>
        </> : <RestTimeColumns entries={bands.map(({ field, label }) => ({ label, seconds: settings[field] }))} />}
      </Card>
      {draft && <>
        <Button type="submit" className={styles.save} disabled={busy && !saving} loading={saving}>
          {reloading ? '최신 설정 확인' : '변경 사항 저장'}
        </Button>
      </>}
    </form> : loadIssue ? <ContentError title="휴식 설정을 불러오지 못했어요." action={onRetry && <RefreshButton loading={busy} onRefresh={onRetry} failure={loadIssue} />} /> : <LoadingSkeleton layout="settings" label="휴식 설정을 불러오고 있어요." />}
    {review && <p className="muted small">검토용 예시 휴식 시간입니다.</p>}
    {confirmation}
    <Toast toast={feedback.toast} onDismiss={feedback.dismiss} bottomClearance="var(--tabs-height, 56px)" />
  </section>
}
