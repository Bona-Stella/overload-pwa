import type { CardioPlan } from './types.ts';
import { countDraft, decimalDraft, name as validName } from './validation.ts';
export type CardioDraft = {
    activityId?: string;
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
export const draftCardio = (p: CardioPlan): CardioDraft => ({ ...emptyCardio(), ...(p.activityId ? { activityId: p.activityId } : {}), kind: p.kind, name: p.name, seconds: String(p.targetSeconds), distance: p.targetDistanceKm ?? '', intensityMode: p.intensity?.mode ?? 'SPEED', intensity: p.intensity?.value ?? '', incline: p.inclinePercent ?? '', resistance: p.resistance ?? '' });
export function cardioPlan(d: CardioDraft): CardioPlan {
    let seconds = d.seconds;
    if (d.minutes !== undefined) {
        const [w, f = ''] = decimalDraft(d.minutes).split('.'), units = BigInt(w) * 1000000n + BigInt(f.padEnd(6, '0'));
        if (units * 60n % 1000000n)
            throw new Error('목표 시간은 정수 초로 변환 가능한 분 값을 입력해 주세요.');
        seconds = String(units * 60n / 1000000n);
    }
    const targetSeconds = countDraft(seconds), opt = (s: string) => s.trim() ? decimalDraft(s) : null;
    const range = (s: string | null, min: number, max: number) => s === null || Number(s) >= min && Number(s) <= max;
    const motion = ['TREADMILL', 'BIKE', 'OUTDOOR'].includes(d.kind);
    const targetDistanceKm = motion ? opt(d.distance) : null, intensity = motion ? opt(d.intensity) : null, inclinePercent = d.kind === 'TREADMILL' ? opt(d.incline) : null, resistance = d.kind === 'BIKE' ? opt(d.resistance) : null;
    if (!validName(d.name) || d.name.length > 100 || targetSeconds > 86400 || !range(targetDistanceKm, .001, 1000) || !range(intensity, .1, d.intensityMode === 'SPEED' ? 100 : 120) || !range(inclinePercent, 0, 50) || !range(resistance, 1, 100))
        throw new Error('유산소 이름·시간 및 선택값의 허용 범위를 확인해 주세요.');
    return { ...(d.activityId ? { activityId: d.activityId } : {}), kind: d.kind, name: d.name, targetSeconds, targetDistanceKm, intensity: intensity === null ? null : { mode: d.intensityMode, value: intensity }, inclinePercent, resistance };
}
export function adjust(value: string, direction: -1 | 1) { const [w, f = ''] = decimalDraft(value || '0').split('.'); const units = BigInt(w) * 1000000n + BigInt(f.padEnd(6, '0')) + BigInt(direction) * 2500000n; if (units < 0n)
    return '0'; return decimalDraft(String(units / 1000000n) + '.' + String(units % 1000000n).padStart(6, '0')); }
