import type { RoutineList } from './types.ts';
const stamp = (value: string) => value.replace(/(?:\.(\d+))?Z$/, (_, fraction = '') => '.' + fraction.padEnd(6, '0') + 'Z');
export function newestRoutines(values: RoutineList['routines']) { return [...values].sort((a, b) => a.createdAt && b.createdAt ? stamp(b.createdAt).localeCompare(stamp(a.createdAt)) || b.id.localeCompare(a.id) : 0); }
