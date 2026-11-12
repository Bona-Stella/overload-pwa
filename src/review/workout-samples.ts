
import { dayOfWeek } from '../features/home/model.ts'
import type { CardioActivity, Equipment, StandardExercise, WeightPlacement } from '../features/workout-online/types.ts'
import { exercises, manufacturers, reviewSample, reviewToday } from './routine-samples.ts'
import { addSet, changeWeight, finishSet, startReview } from './workout-model.ts'

const longExercise: StandardExercise = {
  id: '20100000-0000-4000-8000-000000000001',
  name: '시티드 머신 레그 컬 · 한쪽씩 천천히 수행하는 하체 보조 운동',
  aliases: ['레그 컬', 'leg curl'],
  muscles: [{ id: '20100000-0000-4000-8000-000000000002', name: '햄스트링', groupCode: 'LEGS', role: 'PRIMARY' }],
}
export const sessionExercises = [...exercises, longExercise]
export const sessionActivities: CardioActivity[] = [{
  id: '20100000-0000-4000-8000-000000000003', activityId: '20100000-0000-4000-8000-000000000004',
  name: '야외 걷기', aliases: ['walking'], category: 'WALKING', kind: 'OUTDOOR',
}]

export function exerciseEquipment(exercise: StandardExercise): Equipment {
  if (exercise.id === exercises[0].id || exercise.id === exercises[1].id) return { manufacturerId: null, loadType: 'PLATE' }
  if (exercise.id === exercises[2].id) return { manufacturerId: manufacturers[0].id, loadType: 'STACK' }
  return { manufacturerId: null, loadType: 'STACK' }
}

export const workoutScenarios = {
  'workout-mixed': '운동 검토 · 웨이트 + 유산소',
  'workout-weight': '운동 검토 · 웨이트만',
  'workout-edited': '운동 검토 · 장비·세트 편집 후 이어가기',
  'workout-rest-day': '운동 검토 · 휴식일',
}
export type WorkoutScenario = keyof typeof workoutScenarios

export function workoutSample(scenario: WorkoutScenario) {
  const data = reviewSample('normal')
  if (scenario === 'workout-rest-day') {
    const active = data.schedule.presets[0]
    active.assignments = active.assignments.filter(a => a.dayOfWeek !== dayOfWeek(reviewToday))
    return data
  }
  const routine = data.routines[0]
  const first = routine.weightPlacements[0]
  const second: WeightPlacement = {
    ...first, id: '20100000-0000-4000-8000-000000000005',
    standardExerciseId: longExercise.id, exerciseName: longExercise.name, setCount: 3, minReps: 6, maxReps: 10,
    initialWeightKg: '15', approvedWeightKg: '20', loadType: 'STACK', manufacturerId: manufacturers[0].id,
  }
  if (scenario === 'workout-weight') {
    routine.name = '웨이트 집중'
    routine.cardioPlacements = []
  } else routine.name = '웨이트 + 러닝'
  routine.weightPlacements.push(second)
  return data
}

export function editedSession(data: ReturnType<typeof workoutSample>) {
  const at = Date.now()
  const session = startReview(data.routines[0], false, at - 90000, data.sessions)
  const weight = session.weights[0], set = weight.sets[0]
  const completed = finishSet({ ...session, warmup: false }, weight, set, at - 20000, true)
  completed.weights[0] = addSet(changeWeight({ ...completed.weights[0], manufacturerId: manufacturers[1].id, loadType: 'STACK' }, '22.5', 'today'))
  return completed
}
