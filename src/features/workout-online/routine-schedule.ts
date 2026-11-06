import type { Assignment, WeeklySchedule, WeeklyScheduleApi } from '../statistics/weekly-schedule.ts';
import type { Scope } from './types.ts';
export const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
export const plannedAssignments = (state: WeeklySchedule) => state.assignments;
export const sameAssignments = (a: Assignment[], b: Assignment[]) => JSON.stringify([...a].sort((x, y) => x.dayOfWeek - y.dayOfWeek)) === JSON.stringify([...b].sort((x, y) => x.dayOfWeek - y.dayOfWeek));
export function routineAssignments(base: Assignment[], id: string, days: number[]): Assignment[] {
    return [...base.filter(a => a.routineId !== id && !days.includes(a.dayOfWeek)), ...days.map(dayOfWeek => ({ dayOfWeek, routineId: id }))].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}
/** Re-read before each attempt. A changed version never silently rebases the user's decisions. */
export async function saveSchedule(api: WeeklyScheduleApi, scope: Scope, base: WeeklySchedule, desired: Assignment[], signal: AbortSignal) {
    const latest = await api.read(scope, base.timeZone, signal);
    if (latest.version !== '0' && sameAssignments(plannedAssignments(latest), desired) && latest.timeZone === base.timeZone && (latest.version === base.version || BigInt(latest.version) === BigInt(base.version) + 1n && latest.appliedAt !== null && (base.appliedAt === null || latest.appliedAt >= base.appliedAt)))
        return latest;
    if (latest.version !== base.version || latest.timeZone !== base.timeZone)
        throw new Error('일정이 다른 화면에서 변경되었습니다. 루틴은 저장되어 있습니다. 편집을 닫고 최신 일정을 조회한 뒤 요일과 교체 대상을 다시 확인해 주세요.');
    return api.save(scope, base, desired, signal);
}
