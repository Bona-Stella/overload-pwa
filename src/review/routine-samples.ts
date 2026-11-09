import { activeCardio, activeWeights, dayOfWeek, weekDates } from '../features/home/model.ts'
import { hasActualPerformance } from '../features/home/achievement.ts'
import type { PlannedDay } from '../features/statistics/api.ts'
import type { PresetSchedule } from '../features/workout-online/preset-schedule.ts'
import type { CardioActivity, Manufacturer, Routine, Scope, Session, StandardExercise } from '../features/workout-online/types.ts'

export const reviewToday = '2026-11-11'
export const scope: Scope = { userId: '10000000-0000-4000-8000-000000000001', dataGeneration: '0' }
const id = (number: number) => '10000000-0000-4000-8000-' + String(number).padStart(12, '0')
export const exercises: StandardExercise[] = [
  { id: id(11), name: '벤치 프레스', aliases: ['bench press'], muscles: [{ id: id(111), groupCode: 'CHEST', name: '가슴', role: 'PRIMARY' }] },
  { id: id(12), name: '바벨 스쿼트', aliases: ['squat'], muscles: [{ id: id(112), groupCode: 'LEGS', name: '대퇴사두근', role: 'PRIMARY' }] },
  { id: id(13), name: '랫 풀다운', aliases: ['lat pulldown'], muscles: [{ id: id(113), groupCode: 'BACK', name: '광배근', role: 'PRIMARY' }] },
]
export const activities: CardioActivity[] = [
  { id: id(14), category: 'RUNNING', name: '러닝머신', kind: 'TREADMILL' },
  { id: id(15), category: 'CYCLING', name: '실내 사이클', kind: 'BIKE' },
]
export const manufacturers: Manufacturer[] = [{ id: id(16), name: '파나타' }, { id: id(17), name: '해머 스트렝스' }]
const cardio = { id: id(41), deletedAt: null, plan: { activityId: activities[0].id, kind: 'TREADMILL', name: '러닝머신',
  targetSeconds: 1200, targetDistanceKm: '2.5', intensity: { mode: 'SPEED', value: '8' }, inclinePercent: null, resistance: null } } as const
const plans = ([
  { ...scope, id: id(21), version: '1', name: '상체 푸시 + 러닝', tag: 'PUSH', createdAt: '2026-11-03T09:00:00Z', weightPlacements: [], cardioPlacements: [cardio] },
  { ...scope, id: id(22), version: '1', name: '하체 집중 · 스쿼트와 보조 운동을 포함한 긴 루틴 이름', tag: 'LEGS', createdAt: '2026-11-02T09:00:00Z', weightPlacements: [], cardioPlacements: [] },
  { ...scope, id: id(23), version: '1', name: '등과 팔 중심 회복 루틴', tag: null, createdAt: '2026-11-01T09:00:00Z', weightPlacements: [], cardioPlacements: [] },
  { ...scope, id: id(24), version: '1', name: '가벼운 러닝', tag: 'CARDIO', createdAt: '2026-11-04T09:00:00Z', weightPlacements: [], cardioPlacements: [{ ...cardio, id: id(42) }] },
] satisfies Routine[]).map((routine, index): Routine => {
  const exercise = exercises[index]
  return { ...routine, weightPlacements: exercise ? [{ id: id(31 + index), standardExerciseId: exercise.id, exerciseName: exercise.name,
    manufacturerId: index === 2 ? manufacturers[0].id : null, loadType: index === 2 ? 'STACK' : 'PLATE',
    setCount: 3, minReps: 8, maxReps: 12, initialWeightKg: '20', approvedWeightKg: '25', deletedAt: null }] : [] }
})

export type Scenario = 'normal' | 'empty' | 'unassigned' | 'rotation' | 'active' | 'completed' | 'analysis-off' | 'loading' | 'read-error'
export const scenarios: Record<Scenario, string> = {
  normal: '다중 일정 · 순환 OFF', empty: '신규 사용자', unassigned: '루틴만 등록됨', rotation: '자동 순환 ON',
  active: '디로딩 진행 중', completed: '디로딩 완료 당일', 'analysis-off': '분석 OFF', loading: '홈 로딩', 'read-error': '홈 조회 실패',
}
export function reviewSample(scenario: Scenario) {
  const fresh = scenario === 'empty' || scenario === 'unassigned'
  const presets: PresetSchedule['presets'] = [
    { id: id(51), name: '기본 훈련 주간', version: fresh ? '0' : '1', included: !fresh,
      assignments: fresh ? [] : [1, 3, 5].map(dayOfWeek => ({ dayOfWeek, routineId: plans[0].id })) },
  ]
  if (!fresh) presets.push(
    { id: id(52), name: '하체 중심과 회복을 함께 구성한 아주 긴 주간 일정 이름', version: '1', included: true,
      assignments: [{ dayOfWeek: 2, routineId: plans[0].id }, { dayOfWeek: 3, routineId: plans[1].id }] },
    { id: id(53), name: '러닝 중심 주간', version: '1', included: false, assignments: [{ dayOfWeek: 3, routineId: plans[3].id }] },
  )
  return {
    schedule: { version: fresh ? '0' : '1', activeId: presets[0].id, autoEnabled: scenario === 'rotation', presets },
    applied: !fresh,
    pastPreset: fresh ? null : presets[0],
    routines: scenario === 'empty' ? [] : structuredClone(plans),
    sessions: fresh ? [] : sampleSessions,
  }
}

function session(routine: Routine, date: string, number: number, result: 'complete' | 'partial' | 'unknown' | 'empty'): Session {
  const startedAt = date + 'T09:00:00Z', endedAt = date + 'T09:40:00Z'
  const weightExercises = activeWeights(routine).map((p, index) => ({ ...p, sessionExerciseId: id(1000 + number * 100 + index), sourcePlacementId: p.id }))
  const cardioActivities = activeCardio(routine).map((p, index) => ({ plan: p.plan, sessionActivityId: id(1500 + number * 100 + index), sourcePlacementId: p.id }))
  return {
    ...scope, id: id(100 + number), status: 'FINISHED', version: '1', startedAt, endedAt, closedAt: endedAt, workoutDate: date,
    startedTimeZone: 'Asia/Seoul', editorDeviceId: id(90), writerEpoch: '0', localRevision: '1',
    lastWorkoutSyncedAt: endedAt, lastSnapshotSavedAt: endedAt, completionAssessment: null, deletedAt: null,
    initialPlan: { schemaVersion: 2, routineId: routine.id, routineName: routine.name, routineVersion: routine.version, weightExercises, cardioActivities },
    snapshot: { approvalResults: [], recordedContexts: [], state: {
      sessionExercises: [
        ...weightExercises.map(p => ({ id: p.sessionExerciseId, kind: 'WEIGHT' as const, standardExerciseId: p.standardExerciseId })),
        ...cardioActivities.map(p => ({ id: p.sessionActivityId, kind: 'CARDIO' as const, standardExerciseId: null })),
      ],
      appliedPlan: { schemaVersion: 2, weightExercises, cardioActivities },
      performedSets: weightExercises.flatMap((p, index) => Array.from({ length: result === 'empty' ? 0 : result === 'partial' ? 1 : p.setCount }, (_, i) => ({
        id: id(2200 + number * 100 + index * 10 + i), ordinal: i + 1, sessionExerciseId: p.sessionExerciseId,
        weightKg: p.approvedWeightKg, reps: p.minReps, completedAt: endedAt, manufacturerId: p.manufacturerId, loadType: p.loadType,
        weightContext: { kind: 'INITIAL_APPROVED' as const, requestId: null },
      }))),
      cardioResults: cardioActivities.flatMap((p, index) => result === 'empty' || result === 'partial' ? [] : [{
        id: id(2600 + number * 100 + index), sessionActivityId: p.sessionActivityId, status: 'COMPLETED' as const, startedAt, occurredAt: endedAt,
        result: { activeMs: 1200000, timerMs: 1200000, corrected: false, distanceKm: '2.6', averageBpm: null,
          measurement: { actualSpeedKmh: result === 'unknown' ? null : '8', distanceSource: 'MANUAL' as const } },
      }]),
      deletedPerformedSetIds: [], deletedCardioResultIds: [], approvalRequests: [],
    } },
  }
}
const confirmedMondaySession = session(plans[0], '2026-11-09', 2, 'complete')
const sampleSessions = [
  session(plans[0], '2026-11-10', 1, 'empty'),
  confirmedMondaySession,
  session(plans[1], '2026-11-06', 3, 'partial'),
  session(plans[3], '2026-11-05', 4, 'unknown'),
]
export type ReviewData = ReturnType<typeof reviewSample>
export function reviewHome({ schedule, routines, sessions, applied, pastPreset }: ReviewData) {
  const active = schedule.presets.find(preset => preset.id === schedule.activeId)!
  const recent = sessions.filter(hasActualPerformance).slice(0, 3)
  const plannedDays = weekDates(reviewToday).map((date): PlannedDay => {
    // Historical evidence is fixed. Editing or switching a preset affects today and future dates.
    const historical = date < reviewToday
    const preset = historical ? pastPreset : applied ? active : null
    const assignment = preset?.assignments.find(a => a.dayOfWeek === dayOfWeek(date))
    const plan = (historical ? plans : routines).find(r => r.id === assignment?.routineId) ?? null
    const confirmed = date === confirmedMondaySession.workoutDate && plan?.id === confirmedMondaySession.initialPlan.routineId &&
      recent.some(s => s.id === confirmedMondaySession.id)
    return { date, plan, status: !preset ? 'BEFORE_REGISTRATION' : plan ? 'PLANNED' : assignment ? 'UNVERIFIABLE' : 'REST',
      scheduleVersion: historical ? pastPreset?.version ?? null : applied ? schedule.version : null,
      plannedExercises: null, completedExercises: null,
      effectiveDay: confirmed ? '1' : null, reviewStatus: confirmed ? 'PERFORMED' : null,
      selectedSessionId: confirmed ? confirmedMondaySession.id : null, reviewRevision: confirmed ? '1' : null }
  })
  return {
    schedule: { assignments: active.assignments, version: applied ? '1' : '0' },
    summaries: routines, routines: new Map(routines.map(r => [r.id, r])), overview: { plannedDays },
    recent: new Map(recent.map(s => [s.id, s])),
    recentRows: recent.map(s => ({ ...s, status: 'FINISHED' as const, closedAt: s.closedAt!, routineName: s.initialPlan.routineName })),
    recentLimited: false, recentFailed: false,
  }
}

export const recoveryRoutine: Routine = {
  ...plans[1], id: id(25), name: '회복 주간 · 가벼운 하체', weightPlacements: plans[1].weightPlacements.map(p => ({ ...p, setCount: 2, approvedWeightKg: '15' })),
}
