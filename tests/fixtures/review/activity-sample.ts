import { addDays, dayOfWeek, weekdays, weekDates } from '../../../src/features/home/model.ts'
import type { ActivityPreview, RecordPreviewData } from '../../../src/features/statistics/RecordDisplayContext.ts'
import type { PlannedDay } from '../../../src/features/statistics/api.ts'
import type { Routine } from '../../../src/features/workout-online/types.ts'

export function activitySample(fixture: RecordPreviewData, routines: Routine[]): ActivityPreview | undefined {
  const base = fixture.sessions.find(session => session.initialPlan.weightExercises.length >= 2)
  const routine = routines.find(candidate => candidate.id === base?.initialPlan.routineId)
  if (!base || !routine) return

  const start = addDays(weekDates(fixture.today)[0], -7)
  const dates = weekDates(start)
  const weightExercises = base.initialPlan.weightExercises.slice(0, 2)
  const plan = { ...routine, cardioPlacements: [], weightPlacements: weightExercises.map(exercise => ({
    id: exercise.sourcePlacementId, standardExerciseId: exercise.standardExerciseId, exerciseName: exercise.exerciseName,
    manufacturerId: exercise.manufacturerId, loadType: exercise.loadType, setCount: exercise.setCount,
    minReps: exercise.minReps, maxReps: exercise.maxReps, initialWeightKg: exercise.initialWeightKg,
    approvedWeightKg: exercise.approvedWeightKg, deletedAt: null,
  })) }
  const evidence = [2, 1].map((completed, index) => {
    const workoutDate = dates[index]
    const id = `20000000-0000-4000-8000-00000000800${index}`
    const startedAt = workoutDate + 'T10:00:00Z'
    const endedAt = workoutDate + 'T10:42:00Z'
    const exerciseIds = weightExercises.map(exercise => exercise.sessionExerciseId)
    const performedSets = base.snapshot.state.performedSets.filter(set => exerciseIds.slice(0, completed).includes(set.sessionExerciseId))
      .map(set => ({ ...set, completedAt: endedAt }))
    return { ...base, id, workoutDate, startedAt, endedAt, closedAt: endedAt,
      initialPlan: { ...base.initialPlan, weightExercises, cardioActivities: [] },
      snapshot: { ...base.snapshot, state: { ...base.snapshot.state,
        appliedPlan: { ...base.snapshot.state.appliedPlan, weightExercises, cardioActivities: [] },
        sessionExercises: base.snapshot.state.sessionExercises.filter(exercise => exerciseIds.includes(exercise.id)),
        cardioResults: [], performedSets,
      } },
    }
  })
  const planned = (index: number, completed: number, reviewStatus: string, selectedSessionId: string | null): PlannedDay => ({
    date: dates[index], status: 'PLANNED', scheduleVersion: '1', plan, plannedExercises: weightExercises.length,
    completedExercises: completed, effectiveDay: String(completed / weightExercises.length), selectedSessionId, reviewStatus, reviewRevision: '1',
  })
  const rest = (date: string): PlannedDay => ({ date, status: 'REST', scheduleVersion: '1', plan: null, plannedExercises: 0,
    completedExercises: 0, effectiveDay: '0', selectedSessionId: null, reviewStatus: null, reviewRevision: null })
  const plannedDays = [
    planned(0, 2, 'PERFORMED', evidence[0].id), planned(1, 1, 'PERFORMED', evidence[1].id), planned(2, 0, 'MISSED', null), rest(dates[3]),
    planned(4, 0, 'PENDING', null), planned(5, 1, 'PERFORMED', '20000000-0000-4000-8000-000000008002'), rest(dates[6]),
  ]
  const plannedWorkoutDays = plannedDays.filter(day => day.status === 'PLANNED').length
  const effectiveDays = plannedDays.reduce((sum, day) => sum + Number(day.effectiveDay), 0)

  const cardio = [
    { kind: 'TREADMILL', dates: [dates[0], dates[4]], minutes: 60, km: '8', showDates: true },
    { kind: 'BIKE', dates: [dates[1]], minutes: 45, km: '7.5', showDates: true },
    { kind: 'OUTDOOR', dates: [dates[5]], minutes: 35, km: null, showDates: false },
  ]
  return {
    period: { fromDate: start, toDateExclusive: addDays(start, 7) },
    evidence,
    achievement: { plannedDays, plannedWorkoutDays, effectiveWorkoutDays: String(effectiveDays),
      routineAchievementPercent: String(effectiveDays * 100 / plannedWorkoutDays) },
    cardio: {
      activeMs: String(cardio.reduce((sum, row) => sum + row.minutes, 0) * 60_000),
      days: new Set(cardio.flatMap(row => row.dates)).size,
      totals: cardio.map(row => ({ kind: row.kind, activeMs: String(row.minutes * 60_000), distanceKm: row.km,
        manualDistanceKm: row.km, calculatedDistanceKm: null, unknownSourceDistanceKm: null,
        manualRecords: row.km === null ? '0' : String(row.dates.length), calculatedRecords: '0', unknownSourceRecords: '0', recordsWithoutDistance: row.km === null ? String(row.dates.length) : '0',
      })),
      weekdays: new Map(cardio.filter(row => row.showDates).map(row => [row.kind, row.dates.map(date => weekdays[dayOfWeek(date) - 1]).join(' · ')])),
    },
  }
}
