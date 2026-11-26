import type { CardioActivity, CardioPlan } from './types.ts';
import { countDraft, decimalDraft, name as validName } from './validation.ts';
export type CardioDraft = {
    activityId?: string;
    standardExerciseId?: string;
    minutes?: string;
    kind: CardioPlan['kind'];
    name: string;
    seconds: string;
    distance: string;
    intensityMode: 'SPEED' | 'PACE';
    intensity: string;
    incline: string;
    resistance: string;
};
export const emptyCardio = (): CardioDraft => ({ kind: 'OTHER', name: '', seconds: '', distance: '', intensityMode: 'SPEED', intensity: '', incline: '', resistance: '' });
export const draftCardio = (p: CardioPlan): CardioDraft => ({ ...emptyCardio(), ...(p.activityId ? { activityId: p.activityId } : {}), ...(p.standardExerciseId ? { standardExerciseId: p.standardExerciseId } : {}), kind: p.kind, name: p.name, seconds: String(p.targetSeconds), distance: p.targetDistanceKm ?? '', intensityMode: p.intensity?.mode ?? 'SPEED', intensity: p.intensity?.value ?? '', incline: p.inclinePercent ?? '', resistance: p.resistance ?? '' });
export const supportsCardioMotion = (kind: CardioPlan['kind']) => kind === 'TREADMILL' || kind === 'BIKE' || kind === 'OUTDOOR'

export const cardioWheelBounds = {
    distance: { min: '0.001', max: '1000' },
    speed: { min: '0.1', max: '100' },
    pace: { min: '0.1', max: '120' },
    incline: { min: '0', max: '50' },
    resistance: { min: '1', max: '100' },
} as const

export function cardioWheelValue(value: string, field: keyof typeof cardioWheelBounds) {
    if (!value.trim()) return ''
    const number = decimalDraft(value)
    const { min, max } = cardioWheelBounds[field]
    if (Number(number) < Number(min) || Number(number) > Number(max)) {
        throw Error(`${min}~${max} 범위로 입력해 주세요.`)
    }
    return number
}

export function adjustCardioWheel(value: string, direction: -1 | 1, field: 'distance' | 'speed' | 'incline' | 'resistance') {
    const scale = field === 'resistance' ? 1 : 10
    const next = Math.round(Number(value) * scale) + direction
    return next >= 0 && next <= Number(cardioWheelBounds[field].max) * scale ? (next / scale).toFixed(scale === 1 ? 0 : 1) : null
}

export function paceLabel(seconds: number) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// The API stores decimal minutes with up to six fractional digits.
export function paceFromSeconds(seconds: string) {
    return seconds === '0' ? '' : cardioWheelValue((Number(seconds) / 60).toFixed(6), 'pace')
}

export function paceDirectValue(value: string) {
    const input = value.trim()
    if (!input.includes(':')) return cardioWheelValue(input, 'pace')
    const clock = /^(\d+):([0-5]\d)$/.exec(input)
    if (!clock) throw Error('분:초 형식으로 입력해 주세요.')
    const seconds = Number(clock[1]) * 60 + Number(clock[2])
    if (seconds < 6 || seconds > 7200) throw Error('0:06~120:00 범위로 입력해 주세요.')
    return paceFromSeconds(String(seconds))
}

export function adjustPaceWheel(value: string, direction: -1 | 1) {
    const seconds = Number(value)
    const next = seconds === 0 && direction === 1 ? 10 : seconds === 10 && direction === -1 ? 0 : seconds + direction * 5
    return next >= 0 && next <= 7200 ? String(next) : null
}

export function cardioSecondsFromMinutes(minutes: string) {
    return minutes.trim() ? String(Math.round(Number(decimalDraft(minutes)) * 60)) : ''
}

export function selectCardio(value: CardioDraft, activity: CardioActivity): CardioDraft {
    if (value.standardExerciseId === activity.id && value.activityId === activity.activityId) return value
    const motion = supportsCardioMotion(activity.kind)
    return { ...value, standardExerciseId: activity.id, activityId: activity.activityId, kind: activity.kind, name: activity.name,
        distance: motion ? value.distance : '', intensity: motion ? value.intensity : '',
        intensityMode: motion ? value.intensityMode : 'SPEED',
        incline: activity.kind === 'TREADMILL' ? value.incline : '', resistance: activity.kind === 'BIKE' ? value.resistance : '' }
}

export function parseCardioPlan(d: CardioDraft): Omit<CardioPlan, 'targetSeconds'> & { targetSeconds: number | null } {
    let seconds = d.seconds;
    if (d.minutes !== undefined) {
        seconds = cardioSecondsFromMinutes(d.minutes);
    }
    const targetSeconds = seconds ? countDraft(seconds) : null, opt = (s: string) => s.trim() ? decimalDraft(s) : null;
    const range = (s: string | null, min: number, max: number) => s === null || Number(s) >= min && Number(s) <= max;
    const motion = supportsCardioMotion(d.kind);
    const targetDistanceKm = motion ? opt(d.distance) : null, intensity = motion ? opt(d.intensity) : null, inclinePercent = d.kind === 'TREADMILL' ? opt(d.incline) : null, resistance = d.kind === 'BIKE' ? opt(d.resistance) : null;
    if (!validName(d.name) || d.name.length > 100 || (targetSeconds ?? 0) > 86400 || !range(targetDistanceKm, .001, 1000) || !range(intensity, .1, d.intensityMode === 'SPEED' ? 100 : 120) || !range(inclinePercent, 0, 50) || !range(resistance, 1, 100))
        throw new Error('유산소 이름·시간 및 선택값의 허용 범위를 확인해 주세요.');
    return { ...(d.activityId ? { activityId: d.activityId } : {}), ...(d.standardExerciseId ? { standardExerciseId: d.standardExerciseId } : {}), kind: d.kind, name: d.name, targetSeconds, targetDistanceKm, intensity: intensity === null ? null : { mode: d.intensityMode, value: intensity }, inclinePercent, resistance };
}
export const missingCardioTime = '유산소 목표 시간을 입력해 주세요.'
export function cardioPlan(d: CardioDraft): CardioPlan {
    const plan = parseCardioPlan(d)
    if (plan.targetSeconds === null) throw new Error(`${d.name} · ${missingCardioTime}`)
    return { ...plan, targetSeconds: plan.targetSeconds }
}
export function adjust(value: string, direction: -1 | 1, step: 1 | 2.5 = 2.5) { const [w, f = ''] = decimalDraft(value || '0').split('.'); const units = BigInt(w) * 1000000n + BigInt(f.padEnd(6, '0')) + BigInt(direction) * (step === 1 ? 1000000n : 2500000n); if (units < 0n)
    return '0'; return decimalDraft(String(units / 1000000n) + '.' + String(units % 1000000n).padStart(6, '0')); }
