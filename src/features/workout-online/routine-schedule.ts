import type { Assignment } from '../statistics/weekly-schedule.ts'
export const dayNames = ['월', '화', '수', '목', '금', '토', '일']
export const sameAssignments = (a: Assignment[], b: Assignment[]) =>
  JSON.stringify([...a].sort((x, y) => x.dayOfWeek - y.dayOfWeek)) === JSON.stringify([...b].sort((x, y) => x.dayOfWeek - y.dayOfWeek))
