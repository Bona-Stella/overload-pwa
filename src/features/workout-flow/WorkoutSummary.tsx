import {compactRecordTime} from '../../components/record-time.ts'
import {recordDuration,recordKg} from '../workout-online/record-summary.ts'
import type {RecordSummary} from '../workout-online/record-summary.ts'

import type { ReactNode } from 'react'
import { useLayoutEffect } from 'react'
import { Button, Card } from '../../components/ui.tsx'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { distanceLabel } from '../workout-online/cardio-measurement.ts'
import { cardioPlanLabel } from '../home/model.ts'
import { formatDuration } from '../workout/model.ts'
import { equipmentLabel } from '../workout-online/equipment.ts'
import { WeightReview } from './WeightReview.tsx'
import type { LoadType, Manufacturer } from '../workout-online/types.ts'
import type { CardioFocusData, SetResult } from './types.ts'
import styles from './WorkoutFlow.module.css'
import detailStyles from './WorkoutRecordDetail.module.css'

export type CardioSummary = Omit<CardioFocusData, 'plan'> & { plan?: CardioFocusData['plan']; added: boolean }
export type WeightSummary = {
  id: string; name: string; loadType?: LoadType | null; planned?: number; goal?: string; referenceKg?: string | null
  results: { id: number; result: SetResult; volume: number | string | null }[]
  review?: { direction: 'increase' | 'decrease'; referenceKg: string; planned: number; completed: number; incomplete: boolean; recommendedKg?:string; previewApproval?:{nextWeightKg:string;occurredAt:string}; approval?:{previousWeightKg:string;nextWeightKg:string;occurredAt:string;source:string};
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

export function WorkoutSummary({ routine, date, recordTime, elapsed, deload, weights, cardio, manufacturers, plannedSets, whole, onBack, backLabel, dataNote, detail = false, recordMenu, children, reviewState = 'ready', reviewIssue, timing, reviewExcluded = false, previewApproval = false, historicalWeights = [], onPreviewApprove, reviewContent, recordFacts, recordRange, achievementReasons = {}, takeInitialScroll }: {
  recordFacts?:RecordSummary;recordRange?:string;achievementReasons?:Record<string,string[]>
  routine: string; date: string; recordTime?:string; elapsed?: number; deload: boolean; weights: WeightSummary[]; dataNote?: string
  onPreviewApprove?:(choices:{id:string;nextKg:string}[])=>Promise<boolean>;reviewContent?:ReactNode; historicalWeights?: WeightSummary[]; previewApproval?: boolean; reviewExcluded?: boolean; timing?: { start: string; end: string }; detail?: boolean; recordMenu?: ReactNode; children?: ReactNode; reviewState?: 'ready' | 'unavailable'; reviewIssue?: string
  cardio: CardioSummary[]; manufacturers: Manufacturer[]; plannedSets: number; whole: boolean; onBack: () => void; backLabel?: string
  takeInitialScroll?: () => boolean
}) {
  useLayoutEffect(() => {
    if (detail || !takeInitialScroll) return
    // The confirmation dialog's history entry can restore scroll during the transition.
    const frame = requestAnimationFrame(() => {
      if (takeInitialScroll()) document.scrollingElement?.scrollTo({ top: 0, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [detail, takeInitialScroll])
  const results = weights.flatMap(weight => weight.results)
  const volume = sumVolume(results)
  const unknown = results.filter(set => set.volume === null).length
  const reviews = weights.filter(w => !!w.review)
  const weekday = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T12:00:00Z').toLocaleDateString('ko-KR', { weekday: 'long', timeZone: 'UTC' }) : ''
  const dateLabel = (recordRange ?? compactRecordTime(recordTime ?? date + (weekday ? ' · ' + weekday : ''))).replaceAll('/', '.')
  const completedCardio = cardio.filter(item => item.phase === 'completed').length
  const cardioCount = `${completedCardio}/${cardio.length}`
  const weightVolume = unknown && unknown === results.length ? '미확인' : formatKg(volume)
  const returnLabel = backLabel ?? (detail ? '기록으로' : '홈으로')
  return <article className={`${styles.summary} ${detailStyles.detail}`}>
    <RecordSubpageHeader title={detail ? '운동 기록 상세' : '운동 기록 요약'} onBack={onBack} backLabel={returnLabel} />
    <Card hero className={styles.summaryHeader}>
      {deload && <p className={styles.eyebrow}>DELOAD</p>}
      <div className={detailStyles.summaryTop}>
        <p className={`${styles.recordDate} ${detailStyles.date}`}>{dateLabel}</p>
        {detail && recordFacts && <span className={detailStyles.status} data-state={recordFacts.status.kind}><b aria-hidden="true">{recordFacts.status.mark}</b>{recordFacts.status.kind==='complete'?'전체 완료':recordFacts.status.kind==='partial'?'부분 완료':recordFacts.status.label}</span>}
        {!detail && whole && <span className={detailStyles.status} data-state="complete"><b aria-hidden="true">✓</b>전체 루틴 완료</span>}
        {recordMenu && <div className={detailStyles.menu}>{recordMenu}</div>}
      </div>
      <h2 className={`${styles.recordRoutine} ${detailStyles.routine}`} title={routine}>{routine}</h2>
      {detail && recordFacts ? <div className={styles.recordColumns} aria-label="운동 기록 요약">
        <section><h3>전체</h3><strong>{recordFacts.totalMs===null?'–':recordDuration(recordFacts.totalMs)}</strong><small>전체 경과 시간</small><strong>{recordFacts.inactiveMs===null?'–':recordDuration(recordFacts.inactiveMs)}</strong><small>비수행 시간</small></section>
        <section><h3>웨이트</h3><strong>{recordFacts.weightMs===null?'–':recordDuration(recordFacts.weightMs)}</strong><small>수행 시간</small><strong>{recordFacts.achievement.weight.completed}/{recordFacts.achievement.weight.planned}</strong><small>수행/계획 종목</small></section>
        <section><h3>유산소</h3><strong>{recordFacts.cardioMs===null?'–':recordDuration(recordFacts.cardioMs)}</strong><small>수행 시간</small><strong>{recordFacts.achievement.cardio.completed}{recordFacts.achievement.cardio.unknown?'+?':''}/{recordFacts.achievement.cardio.planned}</strong><small>수행/계획 종목</small></section>
      </div> : !detail ? <div className={styles.recordColumns} aria-label="운동 기록 요약">
        <section><h3>전체</h3><strong>{elapsed === undefined ? '–' : formatDuration(elapsed)}</strong><small>전체 운동 시간</small>
          <strong>{recordFacts?.inactiveMs == null ? '–' : recordDuration(recordFacts.inactiveMs)}</strong><small>비수행 시간</small></section>
        <section><h3>웨이트</h3><strong>{!weights.length || recordFacts?.weightMs == null ? '–' : recordDuration(recordFacts.weightMs)}</strong><small>수행 시간</small>
          <strong>{results.length}/{plannedSets}</strong><small>완료 세트</small></section>
        <section><h3>유산소</h3><strong>{!completedCardio || recordFacts?.cardioMs == null ? '–' : recordDuration(recordFacts.cardioMs)}</strong><small>수행 시간</small>
          <strong>{cardio.length ? cardioCount : '–'}</strong><small>완료/전체 종목</small></section>
      </div> : <dl className={styles.metrics}>
        <div><dt>전체 운동 시간</dt><dd>{elapsed === undefined ? '실제 종료 시각 없음' : formatDuration(elapsed)}</dd></div>
        <div><dt>완료 세트</dt><dd>{results.length}/{plannedSets}</dd></div>
        <div><dt>총 볼륨</dt><dd>{weightVolume}</dd></div>
      </dl>}
      {recordFacts?.timingIssue&&<p className="notice" role="status">{recordFacts.timingIssue}</p>}
      {!detail&&timing && <dl className={styles.recordTimes}><div><dt>운동 시작</dt><dd>{timing.start}</dd></div><div><dt>운동 종료</dt><dd>{timing.end}</dd></div></dl>}
      {unknown > 0 && <small>볼륨 미확인 {unknown}세트</small>}
    </Card>
    {detail?(reviewContent!==undefined||historicalWeights.length>0)&&<Card className={detailStyles.review}>
      <details open><summary><h2>중량 변경 승인 이력</h2><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
        <div>{reviewContent??<WeightReview weights={historicalWeights} readOnly preview={previewApproval}/>}</div>
      </details>
    </Card>:reviewContent}
    {reviewContent===undefined && !detail && !deload && !reviewExcluded && (reviewIssue
      ? <p role="alert">{reviewIssue}</p>
      : reviewState === 'ready' && reviews.length > 0 && <WeightReview key={JSON.stringify(reviews)} weights={reviews} preview={previewApproval} onApprove={onPreviewApprove} />)}
    {(weights.length > 0 || cardio.length > 0) && <Card className={styles.performance}>
      {weights.length > 0 && <section aria-label="웨이트 수행">
        <div className={styles.performanceHeading}><h3 className={styles.eyebrow}>WEIGHT</h3><hr/>
          {detail ? recordFacts && <b>총 {recordFacts.completedSets}/{recordFacts.plannedSets}세트 · 총 {recordKg(recordFacts.volumeKg)}</b>
            : <b>총 {results.length}/{plannedSets}세트 · {weightVolume === '미확인' ? '볼륨 미확인' : '총 ' + weightVolume}</b>}</div>
        {weights.map((weight,index) => {
          const known = weight.results.filter(set => set.volume !== null)
          return <section className={styles.recordItem} data-achievement={detail&&achievementReasons[weight.id]?.length?recordFacts?.status.kind:undefined} key={weight.id}>
            <div className={styles.recordHead}><h4><span className={detailStyles.number}>{String(index+1).padStart(2,'0')}</span>{weight.name}</h4>
              <b>{weight.planned === undefined ? `${weight.results.length}세트` : `${weight.results.length}/${weight.planned}세트`}
                {' · '}{known.length || !weight.results.length ? '총 ' + formatKg(sumVolume(known)) : '볼륨 미확인'}</b></div>
            <p className={styles.recordGoal}>{weight.referenceKg == null ? '기준 미지정' : '기준 ' + weight.referenceKg + 'kg'} · {weight.goal ?? '세션에서 추가'}</p>
            {weight.results.map(({ id, result, volume }) => <div key={id} className={styles.recordSet}>
              <div><strong>{result.loadType === 'BODYWEIGHT' ? result.additionalKg === null ? '맨몸' : `추가 ${result.additionalKg}kg` : result.kg + 'kg'} × {result.reps}회</strong></div>
              <small>{equipmentLabel(result, manufacturers)}</small>
              <span>{volume === null ? '미확인' : formatKg(micros(volume))}</span>
            </div>)}
            {detail&&achievementReasons[weight.id]?.map(reason=><p className={styles.achievementReason} key={reason}>{recordFacts?.status.mark} {reason}</p>)}
            {!weight.results.length && <p className="muted small">완료한 세트 없음</p>}
          </section>
        })}
      </section>}
      {cardio.length > 0 && <section aria-label="유산소 수행">
        <div className={styles.performanceHeading}><h3 className={styles.eyebrow}>CARDIO</h3><hr/>
          {detail ? recordFacts && <b>총 {recordFacts.achievement.cardio.completed}/{recordFacts.achievement.cardio.planned}종목</b> : <b>총 {cardioCount}종목</b>}</div>
        {cardio.map((item,index) => <section className={styles.recordItem} data-achievement={detail&&achievementReasons[item.id]?.length?recordFacts?.status.kind:undefined} key={item.id}>
          <div className={detailStyles.cardioHeading}><h4><span className={detailStyles.number}>{String(index+1).padStart(2,'0')}</span>{item.plan?.name ?? '운동 정보 확인 필요'}{item.added&&<small className="muted"> · 세션에서 추가</small>}</h4>
            {item.result&&<strong className={detailStyles.cardioTime}>
              {!detail && <span className="sr-only">실제 활동 시간 </span>}
              {item.result.corrected&&<span className={detailStyles.corrected}>수정</span>}{formatDuration(item.result.activeMs)}
            </strong>}
          </div>
          <p className="muted small">{item.plan ? '목표 ' + cardioPlanLabel(item.plan) : '계획 정보 확인 필요'}</p>
          {detail&&achievementReasons[item.id]?.map(reason=><p className={styles.achievementReason} key={reason}>{recordFacts?.status.mark} {reason}</p>)}
          {item.result ? <div className={detailStyles.cardioActual}>
            {item.result.corrected&&<p className="muted small">자동 기록 {formatDuration(item.result.timerMs)}</p>}
            {detail ? <p>{distanceLabel(item.result)} · 평균 심박 {item.result.averageBpm===null?'미입력':item.result.averageBpm+' BPM'}</p>
              : (item.result.distanceKm !== null || item.result.averageBpm !== null) && <p>
                {item.result.distanceKm !== null && distanceLabel(item.result)}
                {item.result.distanceKm !== null && item.result.averageBpm !== null && ' · '}
                {item.result.averageBpm !== null && `평균 심박 ${item.result.averageBpm} BPM`}
              </p>}
            {item.result.measurement?.actualSpeedKmh!=null&&<p>{`${detail ? '실제 속도' : '실제 평균 속도'} ${item.result.measurement.actualSpeedKmh} km/h`}</p>}
          </div> : <p className="muted small">{item.phase === 'ready' ? '미시작' : '미완료 · 건너뜀'}</p>}
        </section>)}
      </section>}
    </Card>}
    {children}
    <Card className={detailStyles.preservation}><h2>기록 보존 안내</h2><p className="muted small">{dataNote??'합성 데이터 · 이 탭에서만 확인할 수 있는 시연 결과입니다.'}</p></Card>
    <Button className={detail ? detailStyles.returnButton : undefined} onClick={onBack}>{returnLabel} 돌아가기</Button>
  </article>
}
