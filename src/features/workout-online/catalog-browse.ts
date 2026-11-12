import { groupNames } from './catalog-label.ts'
import { searchExercises } from './catalog.ts'
import type { CatalogExercise, StandardExercise } from './types.ts'

export const catalogGroups = {
  CHEST: { label: groupNames.CHEST, icon: 'chest' },
  BACK: { label: groupNames.BACK, icon: 'back' },
  SHOULDERS: { label: groupNames.SHOULDERS, icon: 'shoulders' },
  ARMS: { label: groupNames.ARMS, icon: 'arms' },
  LEGS: { label: groupNames.LEGS, icon: 'legs' },
  CORE: { label: groupNames.CORE, icon: 'core' },
  CARDIO: { label: '유산소', icon: 'walking' },
  OTHER: { label: '기타', icon: 'other' },
} as const

export type CatalogGroup = keyof typeof catalogGroups
export type CatalogMuscle = NonNullable<StandardExercise['muscles']>[number]
export type CatalogBrowseExercise = CatalogExercise & {
  pplSplit?: 'PUSH' | 'PULL' | 'LEGS' | null
  frontBackSplit?: 'FRONT' | 'BACK' | null
}

export function primaryMuscles(exercise: CatalogExercise) {
  return exercise.muscles?.filter(muscle => muscle.role === 'PRIMARY') ?? []
}

export function catalogRowGroup(exercise: CatalogExercise, primary?: CatalogMuscle): CatalogGroup {
  if (exercise.exerciseType === 'CARDIO') return 'CARDIO'
  const group = primary?.groupCode
  return group && Object.hasOwn(groupNames, group) ? group as CatalogGroup : 'OTHER'
}

export function browseExercises<T extends CatalogExercise>(items: T[], query: string, filter: CatalogGroup | 'ALL') {
  const candidates = filter === 'ALL' ? items : items.filter(item => {
    const primary = primaryMuscles(item)
    if (filter === 'CARDIO') return item.exerciseType === 'CARDIO'
    if (filter === 'OTHER') {
      return item.exerciseType !== 'CARDIO' && !primary.some(muscle => Object.hasOwn(groupNames, muscle.groupCode))
    }
    return primary.some(muscle => muscle.groupCode === filter)
  })
  return searchExercises(candidates, query, candidates.length)
}
