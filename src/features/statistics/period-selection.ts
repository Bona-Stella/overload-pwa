import { periodFor } from './api.ts'
import type { Period } from './api.ts'
export type PeriodSelection = { mode: 'week' | 'month'; anchor: string }
export const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const selectedPeriod = (selection: PeriodSelection): Period => periodFor(new Date(selection.anchor + 'T12:00:00'), selection.mode, 0)
