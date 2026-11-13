
import type { ReactNode } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import { cardioPlanLabel } from '../home/model.ts'
import { formatDuration } from '../workout/model.ts'
import { equipmentLabel } from '../workout-online/equipment.ts'
import type { Manufacturer } from '../workout-online/types.ts'
import { CardioActual } from './CardioFocus.tsx'
import type { CardioFocusData, SetResult } from './types.ts'
import styles from './WorkoutFlow.module.css'

export type CardioSummary = Omit<CardioFocusData, 'plan'> & { plan?: CardioFocusData['plan']; added: boolean }
export type WeightSummary = {
  id: string; name: string; planned?: number; goal?: string; referenceKg?: string | null
  results: { id: number; result: SetResult; volume: number | string | null }[]
  review?: { direction: 'increase' | 'decrease'; referenceKg: string; planned: number; completed: number; incomplete: boolean;
    sets: { id: string; reps: number; contributes: boolean }[] }
}

const micros = (value: number | string) => {
  const [whole, fraction = ''] = String(value).split('.')
  return BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0').slice(0, 6))
}
const sumVolume = (results: WeightSummary['results']) => results.reduce((sum, set) => sum + micros(set.volume ?? 0), 0n)
const formatKg = (value: bigint) => {
  const fraction = String(value % 1000000n).padStart(6, '0').replace(/0+$/, '')
  return (value / 1000000n).toLocaleString('ko-KR') + (fraction ? '.' + fraction : '') + 'kg'
}

export function WorkoutSummary({ routine, date, elapsed, deload, weights, cardio, manufacturers, plannedSets, whole, onBack, dataNote, detail = false, recordMenu, children, reviewState = 'ready', reviewIssue, timing, reviewUnavailable = 0 }: {
  routine: string; date: string; elapsed?: number; deload: boolean; weights: WeightSummary[]; dataNote?: string
  timing?: { start: string; end: string }; detail?: boolean; recordMenu?: ReactNode; children?: ReactNode; reviewState?: 'ready' | 'unavailable'; reviewIssue?: string; reviewUnavailable?: number
  cardio: CardioSummary[]; manufacturers: Manufacturer[]; plannedSets: number; whole: boolean; onBack: () => void
}) {
  const results = weights.flatMap(weight => weight.results)
  const volume = sumVolume(results)
  const unknown = results.filter(set => set.volume === null).length
  const reviews = weights.filter(w => !!w.review)
  const weekday = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T12:00:00Z').toLocaleDateString('ko-KR', { weekday: 'long', timeZone: 'UTC' }) : ''
  return <article className={styles.summary}>
    <Button variant="quiet" onClick={onBack}>‹ 기록으로</Button>
    <Card hero>
      {deload && <p className={styles.eyebrow}>DELOAD</p>}
      <div className={styles.headingRow}><h1>{detail ? '운동 기록 상세' : '운동 기록 요약'}</h1>{recordMenu}</div><p>{date}{weekday && ' · ' + weekday} · {routine}</p>
      {whole && <b className={styles.doneText}>전체 루틴 완료</b>}
      <dl className={styles.metrics}>
        <div><dt>전체 운동 시간</dt><dd>{elapsed === undefined ? '실제 종료 시각 없음' : formatDuration(elapsed)}</dd></div>
        <div><dt>완료 세트</dt><dd>{results.length}/{plannedSets}</dd></div>
        <div><dt>총 볼륨</dt><dd>{unknown && unknown === results.length ? '미확인' : formatKg(volume)}</dd></div>
      </dl>
      {timing && <dl className={styles.recordTimes}><div><dt>운동 시작</dt><dd>{timing.start}</dd></div><div><dt>운동 종료</dt><dd>{timing.end}</dd></div></dl>}
      {unknown > 0 && <small>볼륨 미확인 {unknown}세트</small>}
      <p className="muted small">{dataNote ?? '합성 데이터 · 이 탭에서만 확인할 수 있는 시연 결과입니다.'}</p>
    </Card>
    {weights.length > 0 && <Card>
      <h2>이번 운동의 중량 검토</h2>
      {deload ? <p className="muted small">디로딩 운동 · 검토 제외</p> : reviewIssue ? <p role="alert">{reviewIssue}</p> : reviewState !== 'ready' ? <p role="status">중량 검토 결과를 확인하지 못했습니다. 기록을 다시 조회해 주세요.</p>
        : reviews.length === 0 && reviewUnavailable > 0 ? <p className="muted small">수행·승인 정보가 부족해 중량을 검토할 수 없습니다.</p> : reviews.length === 0 ? <p className="muted small">이번 운동은 중량 변경 검토 대상이 없습니다.</p>
        : reviews.map(weight => {
          const review = weight.review!
          return <section className={styles.recordItem} key={weight.id} data-weight-review={review.direction}>
            <div className={styles.weightReviewHead}><h3>{weight.name}</h3>
              <span>기존 {review.referenceKg}kg <b data-direction={review.direction} role="img" aria-label={review.direction === 'increase' ? '증량 검토' : '감량 검토'}>{review.direction === 'increase' ? '↑' : '↓'}</b></span></div>
            <div className={styles.reviewValues}><span data-incomplete={review.incomplete || undefined}>{review.completed}/{review.planned}세트</span>
              <span>{review.sets.length ? review.sets.map((set, i) => <span key={set.id}>{i > 0 && ' / '}<span data-direction={set.contributes ? review.direction : undefined}>{set.reps}회</span></span>) : '완료한 세트 없음'}</span></div>
          </section>
        })}
    </Card>}
    {(weights.length > 0 || cardio.length > 0) && <Card className={styles.performance}>
      {weights.length > 0 && <section aria-label="웨이트 수행">
        <h3 className={styles.eyebrow}>WEIGHT</h3>
        {weights.map(weight => {
          const known = weight.results.filter(set => set.volume !== null)
          return <section className={styles.recordItem} key={weight.id}>
            <div className={styles.recordHead}><h4>{weight.name}</h4>
              <b>{weight.planned === undefined ? `${weight.results.length}세트` : `${weight.results.length}/${weight.planned}세트`}
                {' · '}{known.length || !weight.results.length ? '총 ' + formatKg(sumVolume(known)) : '볼륨 미확인'}</b></div>
            <p className={styles.recordGoal}>{weight.referenceKg == null ? '기준 미지정' : '기준 ' + weight.referenceKg + 'kg'} · {weight.goal ?? '세션에서 추가'}</p>
            {weight.results.map(({ id, result, volume }) => <div key={id} className={styles.recordSet}>
              <div><strong>{result.loadType === 'BODYWEIGHT' ? result.additionalKg === null ? '맨몸' : `추가 ${result.additionalKg}kg` : result.kg + 'kg'} × {result.reps}회</strong>
                <small>{equipmentLabel(result, manufacturers)}</small></div>
              <span>{volume === null ? '미확인' : formatKg(micros(volume))}</span>
            </div>)}
            {!weight.results.length && <p className="muted small">완료한 세트 없음</p>}
          </section>
        })}
      </section>}
      {cardio.length > 0 && <section aria-label="유산소 수행">
        <h3 className={styles.eyebrow}>CARDIO</h3>
        {cardio.map(item => <section className={styles.recordItem} key={item.id}>
          <h4>{item.plan?.name ?? '운동 정보 확인 필요'}{item.added && <small className="muted"> · 세션에서 추가</small>}</h4>
          <p className="muted small">{item.plan ? '목표 ' + cardioPlanLabel(item.plan) : '계획 정보 확인 필요'}</p>
          {item.result ? <CardioActual result={item.result} /> : <p className="muted small">{item.phase === 'ready' ? '미시작' : '미완료 · 건너뜀'}</p>}
        </section>)}
      </section>}
    </Card>}
    {children}
    <Button onClick={onBack}>기록으로 돌아가기</Button>
  </article>
}
