import { WorkoutStore } from '../workout-online/storage.ts'
import { OfflineAccess } from './offline-access.ts'

// Shared permission boundary only; workout editing remains exclusively in LocalWorkoutController.
export const offlineStore = new WorkoutStore()
export const offlineAccess = new OfflineAccess(offlineStore)
