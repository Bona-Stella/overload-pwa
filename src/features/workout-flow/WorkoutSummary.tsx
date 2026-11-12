
import { Button, Card } from '../../components/ui.tsx'
import { cardioPlanLabel } from '../home/model.ts'
import { formatDuration } from '../workout/model.ts'
import { equipmentLabel } from '../workout-online/equipment.ts'
import type { Manufacturer } from '../workout-online/types.ts'
import { CardioActual } from './CardioFocus.tsx'
import type { CardioFocusData, SetResult, WeightAdvice } from './types.ts'
import styles from './WorkoutFlow.module.css'

type WeightSummary = {
  id: string; name: string; planned?: number; goal?: string
  results: { id: number; result: SetResult; volume: number | null }[]
  advice: WeightAdvice
}

const formatKg = (number: number) => number.toLocaleString('ko-KR', { maximumFractionDigits: 6 }) + 'kg'

export function WorkoutSummary({ routine, date, elapsed, deload, weights, cardio, manufacturers, plannedSets, whole, onBack }: {
  routine: string; date: string; elapsed: number; deload: boolean; weights: WeightSummary[]
  cardio: (CardioFocusData & { added: boolean })[]; manufacturers: Manufacturer[]; plannedSets: number; whole: boolean; onBack: () => void
}) {
  const results = weights.flatMap(weight => weight.results)
  const volume = results.reduce((sum, set) => sum + (set.volume ?? 0), 0)
  const unknown = results.filter(set => set.volume === null).length
  return <article className={styles.summary}>
    <Button variant="quiet" onClick={onBack}>‹ 기록으로</Button>
    <Card hero>
      {deload && <p className={styles.eyebrow}>DELOAD</p>}
      <h1>운동 기록 요약</h1><p>{date} · {routine}</p>
      {whole && <b className={styles.doneText}>전체 루틴 완료</b>}
      <dl className={styles.metrics}>
        <div><dt>전체 운동 시간</dt><dd>{formatDuration(elapsed)}</dd></div>
        <div><dt>완료 세트</dt><dd>{results.length}/{plannedSets}</dd></div>
        <div><dt>총 볼륨</dt><dd>{unknown && unknown === results.length ? '미확인' : formatKg(volume)}</dd></div>
      </dl>
      {unknown > 0 && <small>볼륨 미확인 {unknown}세트</small>}
      <p className="muted small">합성 데이터 · 이 탭에서만 확인할 수 있는 시연 결과입니다.</p>
    </Card>
    <Card>
      <h2>운동 수행</h2>
      {weights.length > 0 && <section aria-label="웨이트 수행">
        <h3 className={styles.eyebrow}>WEIGHT</h3>
        {weights.map(weight => {
          const known = weight.results.filter(set => set.volume !== null)
          return <section className={styles.recordItem} key={weight.id}>
            <div className={styles.recordHead}><div><h4>{weight.name}</h4><small className="muted">{weight.goal ?? '세션에서 추가'}</small></div>
              <b>{weight.planned === undefined ? `${weight.results.length}세트` : `${weight.results.length}/${weight.planned}세트`}
                {' · '}{known.length || !weight.results.length ? '총 ' + formatKg(known.reduce((sum, set) => sum + (set.volume ?? 0), 0)) : '볼륨 미확인'}</b></div>
            {weight.results.map(({ id, result, volume }) => <div key={id} className={styles.recordSet}>
              <div><strong>{result.loadType === 'BODYWEIGHT' ? result.additionalKg === null ? '맨몸' : `추가 ${result.additionalKg}kg` : result.kg + 'kg'} × {result.reps}회</strong>
                <small>{equipmentLabel(result, manufacturers)}</small></div>
              <span>{volume === null ? '미확인' : formatKg(volume)}</span>
            </div>)}
            {!weight.results.length && <p className="muted small">완료한 세트 없음</p>}
          </section>
        })}
      </section>}
      {cardio.length > 0 && <section aria-label="유산소 수행">
        <h3 className={styles.eyebrow}>CARDIO</h3>
        {cardio.map(item => <section className={styles.recordItem} key={item.id}>
          <h4>{item.plan.name}{item.added && <small className="muted"> · 세션에서 추가</small>}</h4>
          <p className="muted small">목표 {cardioPlanLabel(item.plan)}</p>
          {item.result ? <CardioActual result={item.result} /> : <p className="muted small">{item.phase === 'ready' ? '미시작' : '미완료 · 건너뜀'}</p>}
        </section>)}
      </section>}
    </Card>
    {weights.length > 0 && <Card><h2>이 운동의 중량 검토 결과</h2>
      {weights.map(weight => <div className={styles.recordItem} key={weight.id}><h4>{weight.name}</h4>
        <p>{weight.advice.text}{weight.advice.kg && ` · ${weight.advice.kg}kg`}</p>
        {weight.advice.reps && <small className="muted">수행 {weight.advice.reps}회 · {weight.goal}</small>}
      </div>)}
    </Card>}
    <Button onClick={onBack}>기록으로 돌아가기</Button>
  </article>
}
