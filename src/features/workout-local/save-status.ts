import type { EditorState } from './controller.ts'
import type { LocalWorkout } from './types.ts'

export type WorkoutSaveStatus = 'saved' | 'saving' | 'waiting' | 'failed'

export function hasPendingWorkoutSave(workout: LocalWorkout | null) {
  return !!workout && (workout.syncState !== 'CLEAN' || workout.localRevision !== workout.serverRevision ||
    !!workout.pendingSnapshot || !!workout.pendingResolution || !!workout.finish && !workout.finish.ack)
}

export function workoutSaveStatus(state: EditorState, finishing: boolean): WorkoutSaveStatus {
  const { workout, pending, issue, unsavedDrafts, syncIssue, syncStatus } = state
  if (issue || (unsavedDrafts && pending === 0)) return 'failed'
  // A durable FINISH acknowledgement also survives a failed follow-up detail read.
  if (workout?.finish?.ack) return 'saved'
  if (syncIssue && syncStatus !== 'READ' || syncStatus === 'CHECK' || syncStatus === 'OTHER' || workout?.pendingSnapshot?.rejected || workout?.pendingResolution?.rejected) return 'failed'
  if (finishing || pending > 0 || syncStatus === 'SENDING') return 'saving'
  if (hasPendingWorkoutSave(workout)) return 'waiting'
  return 'saved'
}
