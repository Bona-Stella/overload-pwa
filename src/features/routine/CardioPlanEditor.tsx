import { useState } from 'react'
import { CARDIO_NAMES, isCardioPlan, supportsDistance } from '../workout/cardio'
import { newId } from '../workout/model'
import type { CardioKind, CardioPlan } from '../workout/types'

const optional = (value: string) => value.trim() ? Number(value) : null
export function CardioPlanEditor({ plan, onSave, onCancel }: { plan?: CardioPlan; onSave: (plan: CardioPlan) => void; onCancel: () => void }) {
  const [kind, setKind] = useState<CardioKind>(plan?.kind ?? 'treadmill')
  const [name, setName] = useState(plan?.name ?? '')
  const [minutes, setMinutes] = useState(plan ? String(plan.targetSeconds / 60) : '')
  const [distance, setDistance] = useState(plan?.targetDistance === null || !plan ? '' : String(plan.targetDistance))
  const [mode, setMode] = useState<'speed' | 'pace'>(plan?.intensity?.mode ?? 'speed')
  const [intensity, setIntensity] = useState(plan?.intensity ? String(plan.intensity.value) : '')
  const [incline, setIncline] = useState(plan?.incline === null || !plan ? '' : String(plan.incline))
  const [resistance, setResistance] = useState(plan?.resistance === null || !plan ? '' : String(plan.resistance))
  const [error, setError] = useState<string | null>(null)
  function save() {
    const seconds = Number(minutes) * 60
    const result: CardioPlan = { id: plan?.id ?? newId(), kind, name: kind === 'other' ? name.trim() : CARDIO_NAMES[kind], targetSeconds: Math.round(seconds), targetDistance: supportsDistance(kind) ? optional(distance) : null, intensity: supportsDistance(kind) && intensity.trim() ? { mode, value: Number(intensity) } : null, incline: kind === 'treadmill' ? optional(incline) : null, resistance: kind === 'bike' ? optional(resistance) : null }
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 86400 || !isCardioPlan(result)) { setError('종류·이름과 목표 시간을 확인해 주세요. 시간은 1초–24시간, 거리 0.001–1000km, 속도 0.1–100km/h, 페이스 0.1–120분/km, 경사 0–50%, 저항 1–100입니다.'); return }
    onSave(result)
  }
  const derived = Number(intensity)
  return <section className="card stack" aria-label="유산소 계획 입력">
    <h2>{plan ? '유산소 계획 편집' : '유산소 계획 추가'}</h2>
    <label>유산소 종류<select value={kind} onChange={event => { setKind(event.target.value as CardioKind); setIntensity(''); setDistance(''); setIncline(''); setResistance('') }}>{Object.entries(CARDIO_NAMES).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
    {kind === 'other' && <label>유산소 이름<input maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>}
    <label>목표 시간 (분) · 필수<input inputMode="decimal" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="예: 20 또는 2.5" /></label>
    {supportsDistance(kind) && <>
      <label>목표 거리 (km) · 선택<input inputMode="decimal" value={distance} onChange={e => setDistance(e.target.value)} placeholder="측정하지 않으면 비워두세요" /></label>
      <label>계획 강도 입력 방식<select value={mode} onChange={e => { setMode(e.target.value as 'speed' | 'pace'); setIntensity('') }}><option value="speed">설정 속도 (km/h)</option><option value="pace">설정 페이스 (분/km)</option></select></label>
      <label>{mode === 'speed' ? '설정 속도 (km/h)' : '설정 페이스 (분/km, 예: 5.5 = 5분 30초)'} · 선택<input inputMode="decimal" value={intensity} onChange={e => setIntensity(e.target.value)} /></label>
      {Number.isFinite(derived) && derived > 0 && derived >= .1 && derived <= (mode === 'speed' ? 100 : 120) && <p className="muted small">계획 환산 {mode === 'speed' ? `${(60 / derived).toFixed(2)}분/km` : `${(60 / derived).toFixed(2)}km/h`} · 실측 평균이 아닙니다.</p>}
    </>}
    {kind === 'treadmill' && <label>경사도 (%) · 선택<input inputMode="decimal" value={incline} onChange={e => setIncline(e.target.value)} /></label>}
    {kind === 'bike' && <label>저항 레벨 · 선택<input inputMode="decimal" value={resistance} onChange={e => setResistance(e.target.value)} /></label>}
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="row"><button type="button" className="quiet" onClick={onCancel}>계획 편집 취소</button><button type="button" className="primary" onClick={save}>{plan ? '계획 변경 적용' : '유산소 추가'}</button></div>
  </section>
}
