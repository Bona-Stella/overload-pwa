import type { StandardExercise } from './types.ts'

export function normalizeSearch(value: string) {
  return value.normalize('NFKC').replace(/[\p{White_Space}\uFEFF]+/gu, ' ').trim().toLowerCase()
}
export function searchExercises<T extends Pick<StandardExercise, 'id' | 'name' | 'aliases'>>(exercises: T[], query: string) {
  const normalized = normalizeSearch(query), seen = new Set<string>()
  return exercises.filter(exercise => {
    if (seen.has(exercise.id) || ![exercise.name, ...exercise.aliases].some(name => normalizeSearch(name).includes(normalized))) return false
    seen.add(exercise.id)
    return true
  }).slice(0, 20)
}
