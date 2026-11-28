import type { LocalWorkout } from './types.ts'
import { weightDone } from './model.ts'

export function allExercisesResolved({ snapshot }: LocalWorkout) {
  const { weightExercises, cardioActivities } = snapshot.appliedPlan
  return weightExercises.length + cardioActivities.length > 0
    && weightExercises.every(e => weightDone(snapshot, e.sessionExerciseId))
    && cardioActivities.every(a => snapshot.cardioResults.some(r => r.sessionActivityId === a.sessionActivityId))
}

function restoredPause(workout: LocalWorkout) {
  if (!allExercisesResolved(workout)) return undefined
  const { performedSets, cardioResults } = workout.snapshot
  const lastSet = performedSets.reduce((latest, set) => Math.max(latest, Date.parse(set.completedAt)), Date.parse(workout.startedAt))
  return cardioResults.reduce((latest, result) => Math.max(latest, Date.parse(result.occurredAt)), lastSet)
}

/** Kept with the local workout, outside the authoritative FINISH snapshot. */
export function updateSessionClock(previous: LocalWorkout, next: LocalWorkout, at: number) {
  const before = previous.sessionClock
  const pause = before ? before.pausedAt : restoredPause(previous)
  const waitingMs = before?.waitingMs ?? 0
  if (allExercisesResolved(next)) {
    next.sessionClock = { waitingMs, pausedAt: pause ?? at }
  } else if (pause !== undefined) {
    next.sessionClock = { waitingMs: waitingMs + Math.max(0, at - pause) }
  }
}

export function sessionElapsed(workout: LocalWorkout, now: number) {
  const clock = workout.sessionClock
  const pausedAt = clock ? clock.pausedAt : restoredPause(workout)
  const end = workout.finish ? Date.parse(workout.finish.endedAt) : now
  return Math.max(0, Math.min(end, pausedAt ?? end) - Date.parse(workout.startedAt) - (clock?.waitingMs ?? 0))
}
