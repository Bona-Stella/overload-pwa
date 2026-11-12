import type { StandardExercise } from './types.ts'

export function normalizeSearch(value: string) {
  return value.normalize('NFKC').replace(/[\p{White_Space}\uFEFF]+/gu, '').toLowerCase()
}
export function searchExercises<T extends Pick<StandardExercise, 'id' | 'name' | 'aliases'>>(exercises: T[], query: string) {
  const normalized = normalizeSearch(query), seen = new Set<string>()
  return exercises.filter(exercise => {
    if (seen.has(exercise.id) || ![exercise.name, ...exercise.aliases].some(name => normalizeSearch(name).includes(normalized))) return false
    seen.add(exercise.id)
    return true
  }).slice(0, 20)
}

export function exerciseVariantLabels(exercises: Pick<StandardExercise, 'id' | 'name' | 'aliases'>[]) {
  const groups = new Map<string, typeof exercises>()
  for (const exercise of exercises) {
    const name = normalizeSearch(exercise.name)
    const group = groups.get(name)
    if (group) group.push(exercise)
    else groups.set(name, [exercise])
  }

  const labels = new Map<string, string>()
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const aliasSets = group.map(exercise => new Set(exercise.aliases.map(normalizeSearch)))
    for (const [index, exercise] of group.entries()) {
      const candidates = exercise.aliases.filter(alias => {
        const name = normalizeSearch(alias)
        return name !== normalizeSearch(exercise.name) && !aliasSets.some((aliases, i) => i !== index && aliases.has(name))
      })
      labels.set(exercise.id, candidates.find(alias => /[가-힣]/u.test(alias)) ?? candidates[0] ?? exercise.id)
    }
  }
  return labels
}
