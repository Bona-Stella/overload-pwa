import type { ClosedPage } from '../workout-online/types.ts'
import { addDays, dayOfWeek } from '../home/model.ts'

export type RecordRow = ClosedPage['sessions'][number]
export function recordWeek(date: string) {
  const start = addDays(date, 1 - dayOfWeek(date)), end = addDays(start, 6)
  const d = new Date(start + 'T12:00:00Z'), first = `${start.slice(0, 7)}-01`
  const firstMonday = addDays(first, (8 - dayOfWeek(first)) % 7)
  const week = Math.floor((Date.parse(start) - Date.parse(firstMonday)) / 604800000) + 1
  return { key: start, title: `${d.getUTCMonth() + 1}월 ${week}주차`, range: `${Number(start.slice(5,7))}/${Number(start.slice(8))}~${Number(end.slice(5,7))}/${Number(end.slice(8))}`, start, end }
}
export function recordRows(rows: RecordRow[], from: string, to: string, query = '') {
  const needle = query.trim().toLocaleLowerCase()
  return rows.filter(s => !s.deletedAt && (needle ? s.routineName.toLocaleLowerCase().includes(needle) : s.workoutDate >= from && s.workoutDate < to))
    .toSorted((a, b) => (b.endedAt ?? b.closedAt).localeCompare(a.endedAt ?? a.closedAt) || b.id.localeCompare(a.id))
}

/** Recent feed uses the completion date in the schedule's zone, not the START date. */
export function completionDate(row: RecordRow, timeZone: string) {
  const stamp=row.endedAt??row.closedAt
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(stamp))
  const part=(type:string)=>parts.find(p=>p.type===type)!.value
  return part('year')+'-'+part('month')+'-'+part('day')
}
export function recentRecordRows(rows: RecordRow[], today: string, timeZone: string) {
  const from=addDays(today,-6),to=addDays(today,1)
  return rows.filter(row=>!row.deletedAt&&completionDate(row,timeZone)>=from&&completionDate(row,timeZone)<to)
    .toSorted((a,b)=>(b.endedAt??b.closedAt).localeCompare(a.endedAt??a.closedAt)||b.id.localeCompare(a.id))
}
