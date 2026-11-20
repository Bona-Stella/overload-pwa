import type { ReactNode } from 'react'
import { RecordSubpageHeader } from '../../components/RecordSubpageHeader.tsx'
import { Button, Card } from '../../components/ui.tsx'
import { activeCardio, activeWeights, dateInZone } from '../home/model.ts'
import { cardioDescription, exerciseDescription } from './catalog-label.ts'
import { CombinationMemo } from './CombinationMemo.tsx'
import { LOAD_LABELS } from './equipment.ts'
import { routinePresetEntries } from './preset-schedule.ts'
import type { SchedulePreset } from './preset-schedule.ts'
import { dayNames } from './routine-schedule.ts'
import type { CardioActivity, Manufacturer, Routine, StandardExercise } from './types.ts'
import styles from './RoutineDetail.module.css'

type Metric = { label: string; value: string | number | null; unit?: string }

function Metrics({ values }: { values: Metric[] }) {
  return <dl className={styles.metrics} style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
    {values.map(({ label, value, unit }) => <div key={label}>
      <dt>{label}</dt>
      <dd data-missing={value == null || undefined}>{value ?? '—'}{value != null && unit && <> <small>{unit}</small></>}</dd>
    </div>)}
  </dl>
}

function ExerciseHeading({ index, name }: { index: number; name: string }) {
  return <h3 className={styles.exerciseHeading}>
    <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
    <span className={styles.truncate} title={name}>{name}</span>
  </h3>
}

export function RoutineDetail({ routine, exercises, activities, manufacturers, presets, scheduleLoading, timeZone, managementBlocked, onBack, onEdit, onDelete, start }: {
  routine: Routine; exercises: StandardExercise[]; activities: CardioActivity[]; manufacturers: Manufacturer[]; presets?: SchedulePreset[]
  scheduleLoading?: boolean; timeZone?: string; managementBlocked: boolean
  onBack: () => void; onEdit: () => void; onDelete: () => void; start?: ReactNode
}) {
  const weights = activeWeights(routine)
  const cardio = activeCardio(routine)
  const entries = presets && routinePresetEntries(presets, routine.id)
  const created = routine.createdAt ? new Date(routine.createdAt) : null
  return <section className={styles.detail} aria-label="루틴 상세">
    <RecordSubpageHeader title="루틴 상세" onBack={onBack} backLabel="루틴 목록으로"
      action={<Button className={styles.edit} disabled={managementBlocked} onClick={onEdit}>편집</Button>} />
    <Card hero className={styles.summary}>
      <div className={styles.identity}>
        <div className={styles.routineTitle}>
          {routine.tag && <span className={styles.tag}>{routine.tag}</span>}
          <h2 title={routine.name}>{routine.name}</h2>
        </div>
        {created && Number.isFinite(created.getTime()) && <p className={styles.date}>
          생성 · <time dateTime={routine.createdAt!}>{dateInZone(created, timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone).replaceAll('-', '.')}</time>
        </p>}
      </div>
      <Metrics values={[
        { label: '웨이트', value: weights.length, unit: '종목' },
        { label: '총 본세트', value: weights.reduce((sum, placement) => sum + placement.setCount, 0), unit: '세트' },
        { label: '유산소', value: cardio.length, unit: '종목' },
      ]} />
    </Card>
    <section className={styles.group} aria-label="WEIGHT">
      <div className={styles.groupHeading}><h2>WEIGHT</h2><span>총 {weights.length}종목</span></div>
      {!weights.length && <p className={styles.empty}>등록된 웨이트 종목 없음</p>}
      {weights.map((placement, index) => {
        const definition = exercises.find(exercise => exercise.id === placement.standardExerciseId)
        const muscle = definition ? exerciseDescription(definition) : '부위·근육 미분류'
        const manufacturer = placement.manufacturerId && (manufacturers.find(item => item.id === placement.manufacturerId)?.name ?? '현재 목록에 없는 제조사')
        const equipment = [placement.loadType && LOAD_LABELS[placement.loadType], manufacturer].filter(Boolean).join(' · ')
        return <Card key={placement.id} className={styles.exercise} aria-label={`웨이트 ${index + 1}`}>
          <ExerciseHeading index={index} name={placement.exerciseName} />
          <div className={styles.metadata}>
            <span title={muscle}>{muscle}</span>
            {equipment && <span title={equipment}>{equipment}</span>}
          </div>
          <Metrics values={[
            { label: '승인 중량', value: placement.approvedWeightKg, unit: 'kg' },
            { label: '본세트', value: placement.setCount },
            { label: '최소 반복', value: placement.minReps },
            { label: '최대 반복', value: placement.maxReps },
          ]} />
          <CombinationMemo exerciseId={placement.standardExerciseId} equipment={placement} readOnly className={styles.memo} />
        </Card>
      })}
    </section>
    <section className={styles.group} aria-label="CARDIO">
      <div className={styles.groupHeading}><h2>CARDIO</h2><span>총 {cardio.length}종목</span></div>
      {!cardio.length && <p className={styles.empty}>등록된 유산소 계획 없음</p>}
      {cardio.map(({ id, plan }, index) => {
        const description = cardioDescription(plan, activities)
        const wholeMinutes = plan.targetSeconds % 60 === 0
        const pace = plan.intensity?.mode === 'PACE'
        return <Card key={id} className={styles.exercise} aria-label={`유산소 ${index + 1}`}>
          <ExerciseHeading index={index} name={plan.name} />
          <div className={styles.metadata}><span title={description}>{description}</span></div>
          <Metrics values={[
            { label: '목표 시간', value: wholeMinutes ? plan.targetSeconds / 60 : plan.targetSeconds, unit: wholeMinutes ? '분' : '초' },
            { label: '목표 거리', value: plan.targetDistanceKm, unit: 'km' },
            { label: pace ? '목표 페이스' : '목표 속도', value: plan.intensity?.value ?? null, unit: pace ? '분/km' : 'km/h' },
            plan.kind === 'BIKE' ? { label: '저항', value: plan.resistance } : { label: '경사도', value: plan.inclinePercent, unit: '%' },
          ]} />
        </Card>
      })}
    </section>
    <section className={styles.group} aria-label="주간 일정 배정">
      <div className={styles.groupHeading}><h2>WEEKLY SCHEDULE</h2>{entries && <span>총 {entries.length}개 일정</span>}</div>
      {entries?.length ? <Card className={styles.schedule}>
        <ol>{entries.map(({ preset, number, days }) => <li key={preset.id}>
          <span className={styles.number}>{number}</span>
          <span className={styles.truncate} title={preset.name}>{preset.name}</span>
          <span className={styles.weekdays} aria-label="배정 요일">
            {days.toSorted((a, b) => a - b).map(day => <span key={day}>{dayNames[day - 1]}</span>)}
          </span>
        </li>)}</ol>
      </Card> : <p className={styles.empty} aria-busy={!entries && scheduleLoading}>{entries ? '배정된 주간 일정 없음' : scheduleLoading ? '' : '주간 일정을 확인하지 못했습니다.'}</p>}
    </section>
    <div className={styles.actions}>
      {start}
      <Button variant="danger" className={styles.delete} disabled={managementBlocked} onClick={onDelete}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 7h14m-9 0V4h4v3m-7 0 1 13h8l1-13m-6 3v7m3-7v7" /></svg>
        루틴 삭제
      </Button>
    </div>
  </section>
}
