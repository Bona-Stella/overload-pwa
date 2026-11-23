import { count } from '../workout-online/validation.ts'

export function suggestedReps(min: unknown, max: unknown): string {
  return String(count(min) && count(max) && min <= max ? Math.round((min + max) / 2) : 0)
}

export function validReps(value: string): number | null {
  const reps = value.trim() ? Number(value) : NaN
  return Number.isSafeInteger(reps) && reps >= 1 ? reps : null
}

export function adjustRepsDraft(value: string, direction: -1 | 1): string | null {
  const reps = validReps(value)
  if (reps === null) return null
  const next = reps + direction
  return Number.isSafeInteger(next) && next >= 1 ? String(next) : null
}
