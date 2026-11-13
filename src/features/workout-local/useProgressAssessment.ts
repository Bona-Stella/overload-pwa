import { useEffect, useState } from 'react'
import type { WorkoutApi } from '../workout-online/api.ts'
import type { ProgressAssessment } from '../workout-online/types.ts'
import type { LocalWorkout } from './types.ts'

/** Read only server-confirmed facts; stale/dirty revisions cannot show a recommendation. */
export function useProgressAssessment(workout: LocalWorkout | null, api?: Pick<WorkoutApi, 'progressAssessment'>) {
  const [result, setResult] = useState<{ key: string; value?: ProgressAssessment; failed?: boolean } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const { userId, dataGeneration, sessionId, writerEpoch, localRevision, serverVersion } = workout ?? {}
  const confirmed = !!workout && workout.syncState === 'CLEAN' && !workout.finish && workout.localRevision === workout.serverRevision
  const completed = !!workout?.initialPlan.weightExercises.some(p => workout.snapshot.performedSets.filter(s => s.sessionExerciseId === p.sessionExerciseId).length >= p.setCount)
  const key = confirmed && completed && api ? [userId, dataGeneration, sessionId, writerEpoch, localRevision, serverVersion].join(':') : null
  useEffect(() => {
    if (!key || !api || !userId || !dataGeneration || !sessionId) return
    const abort = new AbortController()
    void api.progressAssessment({ userId, dataGeneration }, sessionId, abort.signal).then(value => {
      if (!abort.signal.aborted && value.writerEpoch === writerEpoch && value.localRevision === localRevision && value.version === serverVersion)
        setResult({ key, value })
    }).catch(() => { if (!abort.signal.aborted) setResult({ key, failed: true }) })
    return () => abort.abort()
  }, [api, key, userId, dataGeneration, sessionId, writerEpoch, localRevision, serverVersion, attempt])
  const current = key && result?.key === key ? result : null
  return { value: current?.value, failed: !!current?.failed, retry: () => setAttempt(v => v + 1) }
}
