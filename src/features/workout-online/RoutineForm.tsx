import { useState } from 'react'
import type { CardioPlan, CreateRoutine, Manufacturer, StandardExercise, Routine, UpdateRoutine } from './types.ts'
import { countDraft, decimalDraft, name as validName } from './validation.ts'
import type { WorkoutOnlineController } from './controller.ts'
import { ExerciseSearch } from './ExerciseSearch.tsx'
import { EquipmentFields } from './EquipmentFields.tsx'

import { newWeights, updatedWeights } from './routine-weights.ts'
import type { WeightDraft } from './routine-weights.ts'
type CardioDraft = { id: string; existing: boolean; restore?: boolean; kind: CardioPlan['kind']; name: string; seconds: string; distance: string;
  intensityMode: 'SPEED' | 'PACE'; intensity: string; incline: string; resistance: string }
const optional = (value: string) => value.trim() === '' ? null : decimalDraft(value)
const inRange = (value: string | null, min: string, max: string) => {
  const units = (v: string) => { const [whole, fraction = ''] = v.split('.'); return BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0')) }
  return value === null || units(value) >= units(min) && units(value) <= units(max)
}
function cardioPlan(draft: CardioDraft): CardioPlan {
  const targetSeconds = countDraft(draft.seconds)
  const targetDistanceKm = optional(draft.distance), inclinePercent = optional(draft.incline), resistance = optional(draft.resistance), intensity = optional(draft.intensity)
  if (!validName(draft.name) || draft.name.length > 100 || targetSeconds > 86400) throw new Error('유산소 이름과 1~86400초의 목표 시간을 확인해 주세요.')
  if (!inRange(targetDistanceKm, '0.001', '1000') || !inRange(inclinePercent, '0', '50') || !inRange(resistance, '1', '100')
    || !inRange(intensity, '0.1', draft.intensityMode === 'SPEED' ? '100' : '120')) throw new Error('유산소 선택값의 허용 범위를 확인해 주세요.')
  if (!['TREADMILL', 'BIKE', 'OUTDOOR'].includes(draft.kind) && (targetDistanceKm !== null || intensity !== null)
    || draft.kind !== 'TREADMILL' && inclinePercent !== null || draft.kind !== 'BIKE' && resistance !== null) throw new Error('이 유산소 종류에 사용할 수 없는 선택값을 비워 주세요.')
  return { kind: draft.kind, name: draft.name, targetSeconds, targetDistanceKm, intensity: intensity === null ? null : { mode: draft.intensityMode, value: intensity }, inclinePercent, resistance }
}
export function RoutineForm({ routine, generation, exercises, manufacturers = [], busy, controller, onClose }: {
  routine: Routine | null; generation: string; exercises: StandardExercise[]; manufacturers?: Manufacturer[]; busy: boolean; controller: WorkoutOnlineController; onClose: () => void
}) {
  const [id] = useState(() => routine?.id ?? crypto.randomUUID())
  const [name, setName] = useState(routine?.name ?? '')
  const [weights, setWeights] = useState<WeightDraft[]>(() => routine?.weightPlacements.map(p => ({ id: p.id, standardExerciseId: p.standardExerciseId, exerciseName: p.exerciseName, manufacturerId: p.manufacturerId, loadType: p.loadType,
    setCount: String(p.setCount), minReps: String(p.minReps), maxReps: String(p.maxReps), initialWeightKg: p.initialWeightKg, approvedWeightKg: p.approvedWeightKg, approve: false, nextWeightKg: p.approvedWeightKg })) ?? [])
  const [cardio, setCardio] = useState<CardioDraft[]>(() => routine?.cardioPlacements.map(p => ({ id: p.id, existing: true, kind: p.plan.kind, name: p.plan.name,
    seconds: String(p.plan.targetSeconds), distance: p.plan.targetDistanceKm ?? '', intensityMode: p.plan.intensity?.mode ?? 'SPEED', intensity: p.plan.intensity?.value ?? '', incline: p.plan.inclinePercent ?? '', resistance: p.plan.resistance ?? '' })) ?? [])
  const [removed, setRemoved] = useState<Routine | null>(null)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState<CreateRoutine | UpdateRoutine | null>(null)
  const changeWeight = (id: string, patch: Partial<WeightDraft>) => setWeights(values => values.map(value => value.id === id ? { ...value, ...patch } : value))
  const changeCardio = (id: string, patch: Partial<CardioDraft>) => setCardio(values => values.map(value => value.id === id ? { ...value, ...patch } : value))
  async function save() {
    try {
      let body = submitted
      if (!body) {
        if (!validName(name) || weights.length + cardio.length === 0) throw new Error('루틴 이름과 한 개 이상의 운동을 입력해 주세요.')
        const weightPlacements = newWeights(weights)
        const cardioPlacements = cardio.map(c => ({ id: c.id, plan: cardioPlan(c) }))
        body = routine ? { dataGeneration: generation, expectedVersion: routine.version, name,
          weightPlacements: updatedWeights(weights),
          cardioPlacements: cardioPlacements.map(c => ({ ...c, mode: cardio.find(x => x.id === c.id)!.restore ? 'RESTORE' as const : cardio.find(x => x.id === c.id)!.existing ? 'EXISTING' as const : 'NEW' as const })),
          weightApprovals: weights.filter(w => w.approve && w.approvedWeightKg !== null).map(w => ({ placementId: w.id, nextApprovedWeightKg: decimalDraft(w.nextWeightKg), occurredAt: new Date().toISOString() })) }
          : { id, dataGeneration: generation, name, weightPlacements, cardioPlacements }
        setSubmitted(body)
      }
      setError('')
      if (await controller.saveRoutine(body, routine?.id)) onClose()
    } catch (error) { setError(error instanceof Error ? error.message : '입력값을 확인해 주세요.') }
  }
  return <form className="stack online-routine" noValidate onSubmit={event => { event.preventDefault(); void save() }}>
    <div className="section-heading"><h2>{routine ? '루틴 편집' : '새 루틴'}</h2><button type="button" className="quiet" disabled={busy} onClick={onClose}>닫기</button></div>
    <p className="muted small">온라인에서 저장합니다. 기존 배치의 승인 중량은 아래에서 명시적으로 선택한 경우에만 변경됩니다. 진행 중인 운동의 시작 계획은 유지됩니다.</p>
    <fieldset disabled={busy || submitted !== null} className="stack online-fieldset">
      {routine && <button type="button" className="outline" onClick={() => void controller.removedRoutine().then(value => { if (value) { if (value.version !== routine.version) setError('루틴이 변경되었습니다. 닫은 뒤 최신 루틴을 다시 조회해 주세요.'); else setRemoved(value) } })}>제거한 배치 조회</button>}
      {removed?.weightPlacements.filter(p => !weights.some(w => w.id === p.id)).map(p => <button type="button" className="outline" key={p.id} onClick={() => setWeights(values => [...values, { ...p, restore: true, standardExerciseId: p.standardExerciseId, setCount: String(p.setCount), minReps: String(p.minReps), maxReps: String(p.maxReps), approve: false, nextWeightKg: p.approvedWeightKg }])}>{p.exerciseName} 배치 복원</button>)}
      {removed?.cardioPlacements.filter(p => !cardio.some(c => c.id === p.id)).map(p => <button type="button" className="outline" key={p.id} onClick={() => setCardio(values => [...values, { id: p.id, existing: true, restore: true, kind: p.plan.kind, name: p.plan.name, seconds: String(p.plan.targetSeconds), distance: p.plan.targetDistanceKm ?? '', intensityMode: p.plan.intensity?.mode ?? 'SPEED', intensity: p.plan.intensity?.value ?? '', incline: p.plan.inclinePercent ?? '', resistance: p.plan.resistance ?? '' }])}>{p.plan.name} 배치 복원</button>)}
      <label>루틴 이름<input value={name} onChange={e => setName(e.target.value)} /></label>
      {weights.map((w, index) => <section className="card stack" key={w.id} aria-label={`웨이트 ${index + 1}`}>
        <div className="section-heading"><h3>{index + 1}. {w.exerciseName}</h3><button type="button" className="quiet danger" onClick={() => setWeights(values => values.filter(x => x.id !== w.id))}>배치 제거</button></div>
        <EquipmentFields value={w} manufacturers={manufacturers} onChange={value => changeWeight(w.id, value)} />
        <div className="form-grid">{([['setCount', '세트 수'], ['minReps', '최소 반복'], ['maxReps', '최대 반복']] as const).map(([key, label]) => <label key={key}>{label}<input inputMode="numeric" value={w[key]} onChange={e => changeWeight(w.id, { [key]: e.target.value })} /></label>)}</div>
        {w.approvedWeightKg === null ? <label>최초 중량 (kg)<input inputMode="decimal" value={w.initialWeightKg} onChange={e => changeWeight(w.id, { initialWeightKg: e.target.value })} /></label>
          : <><p>최초 {w.initialWeightKg} kg · 현재 승인 {w.approvedWeightKg} kg</p><label className="online-check"><input type="checkbox" checked={w.approve} onChange={e => changeWeight(w.id, { approve: e.target.checked })} />루틴 저장으로 새 중량 승인</label>
            {w.approve && <label>새 승인 중량 (kg)<input inputMode="decimal" value={w.nextWeightKg} onChange={e => changeWeight(w.id, { nextWeightKg: e.target.value })} /></label>}</>}
      </section>)}
      <section className="card stack"><ExerciseSearch exercises={exercises} onSelect={exercise => {
        setWeights(values => [...values, { id: crypto.randomUUID(), standardExerciseId: exercise.id, exerciseName: exercise.name, manufacturerId: null, loadType: null, setCount: '3', minReps: '6', maxReps: '10', initialWeightKg: '', approvedWeightKg: null, approve: false, nextWeightKg: '' }])
      }} /></section>
      {cardio.map((c, index) => <section className="card stack" key={c.id} aria-label={`유산소 ${index + 1}`}>
        <div className="section-heading"><h3>유산소 {index + 1}</h3><button type="button" className="quiet danger" onClick={() => setCardio(values => values.filter(x => x.id !== c.id))}>유산소 제거</button></div>
        <label>종류<select value={c.kind} onChange={e => changeCardio(c.id, { kind: e.target.value as CardioPlan['kind'] })}>{([['TREADMILL', '러닝머신'], ['BIKE', '실내 자전거'], ['OUTDOOR', '야외'], ['STAIRS', '계단'], ['OTHER', '기타']] as const).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>유산소 이름<input value={c.name} onChange={e => changeCardio(c.id, { name: e.target.value })} /></label><label>목표 시간 (초)<input inputMode="numeric" value={c.seconds} onChange={e => changeCardio(c.id, { seconds: e.target.value })} /></label>
        <label>목표 거리 (km, 선택)<input inputMode="decimal" value={c.distance} onChange={e => changeCardio(c.id, { distance: e.target.value })} /></label>
        <label>강도 단위<select value={c.intensityMode} onChange={e => changeCardio(c.id, { intensityMode: e.target.value as 'SPEED' | 'PACE' })}><option value="SPEED">속도 (km/h)</option><option value="PACE">페이스 (분/km)</option></select></label>
        <label>목표 강도 (선택)<input inputMode="decimal" value={c.intensity} onChange={e => changeCardio(c.id, { intensity: e.target.value })} /></label>
        <label>경사 (%, 러닝머신만)<input inputMode="decimal" value={c.incline} onChange={e => changeCardio(c.id, { incline: e.target.value })} /></label>
        <label>저항 (자전거만)<input inputMode="decimal" value={c.resistance} onChange={e => changeCardio(c.id, { resistance: e.target.value })} /></label>
      </section>)}
      <button type="button" className="outline" onClick={() => setCardio(values => [...values, { id: crypto.randomUUID(), existing: false, kind: 'TREADMILL', name: '', seconds: '', distance: '', intensityMode: 'SPEED', intensity: '', incline: '', resistance: '' }])}>유산소 추가</button>
    </fieldset>
    {error && <p className="notice error" role="alert">{error}</p>}
    {submitted && <p className="muted small">제출 내용을 고정했습니다. 응답이 확인되지 않았다면 같은 내용으로 확인하거나, 닫은 뒤 서버의 최신 루틴을 조회해 주세요.</p>}
    <button className="primary full" disabled={busy}>{busy ? '서버 확인 중…' : submitted ? '고정된 저장 요청 다시 확인' : '루틴 저장'}</button>
  </form>
}
