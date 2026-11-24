export class WorkoutActionError extends Error {}

export type WorkoutActionFailure = {
  kind: 'action' | 'storage' | 'blocked'
  message: string
}
