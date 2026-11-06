import { useState } from 'react';
import { ExerciseIcon } from '../../components/ExerciseIcon.tsx';
import type { CardioActivity, CardioPlan } from './types.ts';
import type { CardioDraft } from './cardio-draft.ts';
import styles from './Routine.module.css';
/** Controlled draft shared by routine and session callers. No persistence or timer ownership. */
export function CardioPlanFields({ value, onChange, activities, disabled = false }: {
    value: CardioDraft;
    onChange: (v: CardioDraft) => void;
    activities: CardioActivity[];
    disabled?: boolean;
}) {
    const [category, setCategory] = useState<CardioActivity['category'] | null>(() => activities.find(a => a.id === value.activityId)?.category ?? null);
    const patch = (v: Partial<CardioDraft>) => onChange({ ...value, ...v });
    const motion = ['TREADMILL', 'BIKE', 'OUTDOOR'].includes(value.kind);
    return <fieldset disabled={disabled} className="stack online-fieldset"><div className={styles.categories}>{([['RUNNING', '달리기', 'running'], ['WALKING', '걷기', 'walking'], ['CYCLING', '사이클', 'cycling']] as const).map(([key, label, icon]) => <button type="button" key={key} aria-pressed={category === key} onClick={() => setCategory(key)}><ExerciseIcon kind={icon}/>{label}</button>)}</div>
    {category && <label>세부 유산소 종목<select value={value.activityId ?? ''} onChange={e => { const a = activities.find(a => a.id === e.target.value); if (a)
        onChange({ ...value, activityId: a.id, kind: a.kind, name: a.name, distance: ['TREADMILL', 'BIKE', 'OUTDOOR'].includes(a.kind) ? value.distance : '', intensity: ['TREADMILL', 'BIKE', 'OUTDOOR'].includes(a.kind) ? value.intensity : '', incline: a.kind === 'TREADMILL' ? value.incline : '', resistance: a.kind === 'BIKE' ? value.resistance : '' }); }}><option value="">종목 선택</option>{activities.filter(a => a.category === category).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
    {!value.activityId && <><p className="muted small">기존 미분류 계획은 종류와 이름을 그대로 보존합니다. 새 종목은 위 카탈로그에서 선택하세요.</p><label>유산소 종류<select value={value.kind} onChange={e => patch({ kind: e.target.value as CardioPlan['kind'] })}>{['TREADMILL', 'BIKE', 'OUTDOOR', 'STAIRS', 'OTHER'].map(k => <option key={k}>{k}</option>)}</select></label><label>유산소 이름<input value={value.name} onChange={e => patch({ name: e.target.value })}/></label></>}
    {value.activityId && <strong>{value.name}</strong>}
    <label>목표 시간 (분) · 필수<input inputMode="decimal" value={value.minutes ?? (value.seconds ? String(Number(value.seconds) / 60) : '')} onChange={e => patch({ minutes: e.target.value })}/></label>
    {motion && <><label>목표 거리 (km, 선택)<input inputMode="decimal" value={value.distance} onChange={e => patch({ distance: e.target.value })}/></label><label>강도 단위<select value={value.intensityMode} onChange={e => patch({ intensityMode: e.target.value as 'SPEED' | 'PACE' })}><option value="SPEED">속도 (km/h)</option><option value="PACE">페이스 (분/km)</option></select></label><label>목표 강도 (선택)<input inputMode="decimal" value={value.intensity} onChange={e => patch({ intensity: e.target.value })}/></label></>}
    {value.kind === 'TREADMILL' && <label>경사 (%, 선택)<input inputMode="decimal" value={value.incline} onChange={e => patch({ incline: e.target.value })}/></label>}{value.kind === 'BIKE' && <label>저항 (선택)<input inputMode="decimal" value={value.resistance} onChange={e => patch({ resistance: e.target.value })}/></label>}
  </fieldset>;
}
