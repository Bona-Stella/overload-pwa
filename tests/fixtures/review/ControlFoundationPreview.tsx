import { useState } from 'react'
import { AppShell } from '../../../src/app/AppShell.tsx'
import { Button, Card, Field } from '../../../src/components/ui.tsx'
import { Dialog } from '../../../src/components/Dialog.tsx'
import { RecordSubpageHeader } from '../../../src/components/RecordSubpageHeader.tsx'
import { SearchList } from '../../../src/components/SearchList.tsx'
import ui from '../../../src/components/ui.module.css'
import { RestSettings, RestTimeColumns } from '../../../src/features/settings/RestSettings.tsx'
import { PeriodControls } from '../../../src/features/statistics/PeriodControls.tsx'
import type { PeriodSelection } from '../../../src/features/statistics/period-selection.ts'
import activity from '../../../src/features/statistics/Activity.module.css'
import { KgWheel } from '../../../src/features/workout-flow/WeightFocus.tsx'
import { RecordedRepsField, WeightWheelField } from '../../../src/features/workout-flow/WeightWheelFields.tsx'
import { CardioNumberField } from '../../../src/features/workout-online/CardioNumberField.tsx'
import { CardioPlanFields } from '../../../src/features/workout-online/CardioPlanFields.tsx'
import { CardioActualFields } from '../../../src/features/workout-online/CardioActualFields.tsx'
import { NumberWheel } from '../../../src/components/NumberWheel.tsx'
import numeric from '../../../src/components/NumberWheel.module.css'
import { RoutineTargetFields } from '../../../src/features/workout-online/RoutineForm.tsx'
import { emptyCardio } from '../../../src/features/workout-online/cardio-draft.ts'
import '../../../src/features/statistics/statistics.css'

const exercises = [{ id: 'bench', name: '벤치 프레스', description: '가슴' }, { id: 'squat', name: '스쿼트', description: '하체' }]
const tags = [{ id: 'all', name: '전체' }, { id: 'bench', name: '가슴' }, { id: 'squat', name: '하체' }]
const fourRestBands = [
  { label: '1~5회', seconds: 180 }, { label: '6~10회', seconds: 150 },
  { label: '11~12회', seconds: 120 }, { label: '13회 이상', seconds: 90 },
]

function ExampleRange({ label, unit, initial }: { label: string; unit: string; initial: readonly [string, string] }) {
  const [range, setRange] = useState(initial)
  return <>{(['최소', '최대'] as const).map((side, index) => <div className={numeric.field} key={side}>
    <span>{side} {label} · 선택</span>
    <NumberWheel label={`${side} ${label}`} value={range[index]} displayValue={range[index] || '0'} unit={unit} start="0" hideSteps describeBlank
      adjust={(current, direction) => {
        const next = Number(current) + direction
        return Number.isSafeInteger(next) && next >= 0 ? String(next) : null
      }} validate={value => {
        const next = value.trim()
        if (!next || next === '0') return ''
        if (!/^\d+$/.test(next) || !Number.isSafeInteger(Number(next))) throw Error('정수를 입력해 주세요.')
        const other = range[1 - index]
        if (other && (index === 0 ? Number(next) > Number(other) : Number(next) < Number(other))) throw Error('최소값은 최대값 이하여야 합니다.')
        return String(Number(next))
      }} onChange={next => setRange(index === 0 ? [next, range[1]] : [range[0], next])} />
  </div>)}</>
}

function FutureGoalsPreview() {
  const [bike, setBike] = useState(false)
  const [running, setRunning] = useState({ ...emptyCardio(), kind: 'TREADMILL' as const, name: '러닝머신', seconds: '150', intensity: '8', incline: '3.5' })
  const [cycling, setCycling] = useState({ ...emptyCardio(), kind: 'BIKE' as const, name: '실내 사이클', seconds: '300', intensity: '18', resistance: '7.5' })
  const plan = bike ? cycling : running
  return <>
    <p className="muted small">목표 심박수·케이던스는 합성 예시입니다. 서버에 저장되지 않습니다.</p>
    <label>예시 운동<select value={plan.kind} onChange={event => setBike(event.target.value === 'BIKE')}>
      <option value="TREADMILL">러닝머신</option><option value="BIKE">실내 사이클</option>
    </select></label>
    <CardioPlanFields key={plan.kind} value={plan} onChange={value => bike
      ? setCycling({ ...value, kind: 'BIKE' }) : setRunning({ ...value, kind: 'TREADMILL' })}
      previewGoals={<><ExampleRange label="심박수" unit="BPM" initial={['130', '150']} />
        <ExampleRange label="케이던스" unit={bike ? 'RPM' : 'SPM'} initial={bike ? ['70', '90'] : ['160', '180']} /></>} />
  </>
}

function WeightRolloutPreview() {
  const [weight, setWeight] = useState('52.3')
  const [reps, setReps] = useState('10')
  const [additional, setAdditional] = useState('')
  const [activeApproval, setActiveApproval] = useState('57.123456')
  const [closedApproval, setClosedApproval] = useState('')
  return <Card data-control-example="weight-rollout">
    <h2>기록 정정과 재승인</h2>
    <p className="muted small">합성 예시 · 휠에서 고른 값은 화면의 초안에만 반영돼요.</p>
    <WeightWheelField label="실제 중량" value={weight} onChange={setWeight} loadType="PLATE" />
    <RecordedRepsField value={reps} onChange={setReps} />
    <WeightWheelField label="추가 중량" value={additional} onChange={setAdditional} loadType="BODYWEIGHT" optional />
    <WeightWheelField label="지금 다시 승인할 중량" value={activeApproval} onChange={setActiveApproval} loadType="STACK" />
    <WeightWheelField label="지금 재승인할 중량" value={closedApproval} onChange={setClosedApproval} loadType="DUMBBELL" />
  </Card>
}

export default function ControlFoundationPreview() {
  const [message, setMessage] = useState(false)
  const [metric, setMetric] = useState('sets')
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('all')
  const [selected, setSelected] = useState<string>()
  const [targets, setTargets] = useState({ setCount: '3', minReps: '6', maxReps: '10' })
  const [period, setPeriod] = useState<PeriodSelection>({ mode: 'week', anchor: '2026-11-26' })
  const [plate, setPlate] = useState('52.3')
  const [dumbbell, setDumbbell] = useState('12.3')
  const [distance, setDistance] = useState('5.123')
  const [rest, setRest] = useState({ restLowSeconds: 180, restMediumSeconds: 120, restHighSeconds: 90 })
  const [plan, setPlan] = useState({ ...emptyCardio(), kind: 'TREADMILL' as const, name: '러닝머신', seconds: '150', distance: '5.123', intensity: '8.125' })
  const [bpm, setBpm] = useState('130')
  const [future, setFuture] = useState(false)
  const back = () => { location.href = location.pathname }
  return <AppShell authenticated focused tab="settings" onNavigate={back}>
    <RecordSubpageHeader title="버튼·입력 검수" backLabel="공통 UI Preview" onBack={back} />
    <div className="stack">
      <Card data-control-example="actions">
        <h2>일반·소형 버튼</h2>
        <div className="row"><Button variant="primary" onClick={() => setMessage(true)}>확인</Button><Button onClick={() => setMessage(true)}>취소</Button></div>
        <div className="section-heading"><h3>최근 운동</h3><Button compact onClick={() => setMessage(true)}>전체 보기 ›</Button></div>
      </Card>
      <Card className={activity.page} data-control-example="selection">
        <h2>기간·분할 선택</h2>
        <PeriodControls value={period} onChange={setPeriod} variant="activity" compact />
        <div className={activity.segment}><Button aria-pressed={metric === 'sets'} onClick={() => setMetric('sets')}>세트</Button><Button aria-pressed={metric === 'volume'} onClick={() => setMetric('volume')}>총중량</Button></div>
      </Card>
      <Card data-control-example="fields">
        <h2>입력·검색</h2>
        <Field label="루틴 이름"><input className={ui.input} placeholder="나의 루틴" /></Field>
        <CardioNumberField label="실제 거리 (km)" value={distance} onChange={setDistance} />
        <SearchList query={query} onQuery={setQuery} label="운동 검색" selected={selected}
          tags={{ label: '운동 부위', options: tags, selected: tag, onSelect: setTag }}
          options={exercises.filter(e => (tag === 'all' || e.id === tag) && e.name.includes(query))}
          onSelect={id => setSelected(exercises.find(e => e.id === id)?.name)}
          onClear={() => { setQuery(''); setSelected(undefined) }} />
      </Card>
      <Card data-control-example="weights">
        <h2>세트·중량</h2>
        <RoutineTargetFields value={targets} onChange={changes => setTargets({ ...targets, ...changes })} />
        <KgWheel label="원판식 중량" value={plate} step={2.5} onChange={setPlate} />
        <KgWheel label="덤벨 중량" value={dumbbell} step={1} compact onChange={setDumbbell} />
      </Card>
      <WeightRolloutPreview />
      <Card data-control-example="cardio">
        <h2>유산소 목표</h2>
        <CardioPlanFields value={plan} onChange={next => setPlan({ ...next, kind: 'TREADMILL' })} />
      </Card>
      <Card data-control-example="cardio-actual">
        <h2>실제 유산소 기록</h2>
        <CardioActualFields draft={{ distance: '', speed: '' }} bpm={bpm} activeMs={150000} motion={false} incline={false} onBpm={setBpm} />
      </Card>
      <Card data-control-example="future-goals">
        <details onToggle={event => setFuture(event.currentTarget.open)}>
          <summary>미지원 목표 범위 · Preview</summary>
          {future && <FutureGoalsPreview />}
        </details>
      </Card>
      <RestSettings settings={rest} review onBack={back} onRequest={async next => { if (next) setRest(next); return null }} />
      <Card data-control-example="rest-four">
        <h2>휴식 설정 · 4열 표시 예시</h2>
        <RestTimeColumns entries={fourRestBands} />
      </Card>
    </div>
    {message && <Dialog title="변경 사항을 확인할까요?" tone="info" onClose={() => setMessage(false)}>
      <p>버튼과 닫기 동작을 확인하는 예시입니다.</p>
      <div className="row"><Button variant="neutral" onClick={() => setMessage(false)}>취소</Button><Button variant="primary" onClick={() => setMessage(false)}>확인</Button></div>
    </Dialog>}
  </AppShell>
}
