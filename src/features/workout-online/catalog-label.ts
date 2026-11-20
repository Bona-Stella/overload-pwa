import type { CardioActivity, CardioPlan, StandardExercise } from './types.ts';
export const cardioCategoryLabels = { WALKING: '걷기', RUNNING: '달리기', CYCLING: '사이클', OTHER: '기타' } as const
export const cardioCategory = (activity: CardioActivity): CardioActivity['category'] =>
  activity.kind === 'STAIRS' || activity.kind === 'OTHER' ? 'OTHER' : activity.category
export function cardioDescription(plan: Pick<CardioPlan, 'standardExerciseId' | 'activityId'>, activities: CardioActivity[]) {
  if (plan.standardExerciseId) {
    const choice = activities.find(a => a.id === plan.standardExerciseId && (!plan.activityId || a.activityId === plan.activityId))
    return choice ? `${cardioCategoryLabels[cardioCategory(choice)]} · ${choice.name}` : '유산소 분류 미확인'
  }
  // A legacy activity ID can be shared by several standard exercises.
  const activity = plan.activityId && activities.find(a => a.activityId === plan.activityId)
  return activity ? cardioCategoryLabels[cardioCategory(activity)] : '유산소 분류 미확인'
}
export const groupNames: Record<string, string> = { CHEST: '가슴', BACK: '등', SHOULDERS: '어깨', ARMS: '팔', LEGS: '하체', CORE: '코어' };
export function exerciseDescription(e: StandardExercise) { const primary = e.muscles?.filter(m => m.role === 'PRIMARY') ?? []; return primary.length ? [...new Set(primary.map(m => groupNames[m.groupCode] ?? m.groupCode))].join('·') + ' · ' + primary.map(m => m.name).join('·') : '부위·근육 미분류'; }
export function exerciseIcon(e: StandardExercise): 'chest' | 'back' | 'legs' | undefined { const groups = [...new Set(e.muscles?.filter(m => m.role === 'PRIMARY').map(m => m.groupCode) ?? [])]; return groups.length === 1 ? ({ CHEST: 'chest', BACK: 'back', LEGS: 'legs' } as Record<string, 'chest' | 'back' | 'legs'>)[groups[0]] : undefined; }
