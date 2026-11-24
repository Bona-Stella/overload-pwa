import { useState } from 'react'
import { ClosedWorkout } from '../../../src/features/workout-online/ClosedWorkout.tsx'
import { WorkoutApi } from '../../../src/features/workout-online/api.ts'
import { LocalStoreError } from '../../../src/features/workout-online/storage.ts'
import type { ClosedDisplay } from '../../../src/features/workout-online/closed-controller.ts'
import type { ClosedWrite } from '../../../src/features/workout-online/closed-model.ts'
import type { ChangeEvents, RecordEdit, Recovery, Scope, Session } from '../../../src/features/workout-online/types.ts'
import { createLocalWorkout } from '../../../src/features/workout-local/model.ts'
import { exercises, manufacturers, reviewSample } from './routine-samples.ts'
import { reviewRest } from './workout-model.ts'
import { processWeightReview } from './process-weight-review.ts'

export type RecordExample = 'correction' | 'recovery' | 'delete' | 'delete-local' | 'delete-conflict' | 'delete-success' | 'delete-busy' | 'summary-failed'

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export function Front18Record({ example, session, onBack }: { example?: RecordExample; session?: Session; onBack: () => void }) {
  const [fixture] = useState(() => {
    const original = structuredClone(session ?? reviewSample('normal').sessions[1])
    const local = createLocalWorkout(original, reviewRest)
    local.snapshot.performedSets = local.snapshot.performedSets.slice(-1)
    let remote = structuredClone(original)
    if (!session) remote.snapshot.state.performedSets.pop()
    const initial = remote
    const review = processWeightReview(original, !!session)
    let summaryFailed = example === 'summary-failed'
    let firstWrite = true
    let localFailed = example === 'delete-local'
    let pending: ClosedWrite | null = null
    const events: ChangeEvents['events'] = []
    const response = () => ({ userId: remote.userId, dataGeneration: remote.dataGeneration, sessionId: remote.id, version: remote.version })
    const unavailable = async () => { await sleep(500); throw new TypeError('Preview response unavailable') }
    const commit = () => {
      remote = { ...remote, version: String(BigInt(remote.version) + 1n) }
      return { ...response(), status: remote.status, changed: true, deletedAt: remote.deletedAt, changeEventIds: [], recoveredIds: [], alreadyPresentIds: [] }
    }
    const loseFirstResponse = () => { if (!firstWrite) return false; firstWrite = false; return true }
    const api = Object.assign(new WorkoutApi({ workoutRequest: unavailable }), {
      detail: async () => structuredClone(remote),
      assessment: async () => {
        if (summaryFailed) { summaryFailed = false; return unavailable() }
        return { ...response(), completionAssessment: remote.completionAssessment, currentAssessment: { state: 'EVALUATED', evaluation: null }, weightReview: null }
      },
      changes: async () => ({ ...response(), events: structuredClone(events) }),
      ...review,
      records: async (_scope: Scope, _id: string, body: RecordEdit) => {
        if (loseFirstResponse()) return unavailable()
        const state = remote.snapshot.state
        state.performedSets = state.performedSets.filter(set => !body.deletedPerformedSetIds.includes(set.id)).map(set => {
          const correction = body.setCorrections.find(value => value.id === set.id)
          return correction ? { ...set, ...correction } : set
        })
        state.cardioResults = state.cardioResults.filter(cardio => !body.deletedCardioResultIds.includes(cardio.id)).map(cardio => {
          const correction = body.cardioCorrections.find(value => value.id === cardio.id)
          return correction && cardio.result ? { ...cardio, result: { ...cardio.result, ...correction } } : cardio
        })
        return commit()
      },
      recover: async (_scope: Scope, _id: string, body: Recovery) => {
        if (loseFirstResponse()) return unavailable()
        remote.snapshot.state.performedSets.push(...body.performedSets)
        remote.snapshot.state.cardioResults.push(...body.cardioResults)
        return commit()
      },
      deleteSession: async () => {
        if (example === 'delete-busy') await sleep(4000)
        if (example === 'delete-conflict') { commit(); throw { status: 409 } }
        if (example === 'delete' && loseFirstResponse()) return unavailable()
        remote = { ...remote, deletedAt: new Date().toISOString() }
        return commit()
      },
    }) as WorkoutApi
    const persistence = {
      acquire: async () => ({ held: () => true, release: () => {} }),
      store: {
        deviceId: async () => remote.editorDeviceId, localCopies: async () => session ? [] : [structuredClone(local)],
        saveSession: async () => {}, closedWrite: async () => pending && structuredClone(pending),
        saveClosedWrite: async (value: ClosedWrite) => {
          if (localFailed) { localFailed = false; throw new LocalStoreError() }
          pending = structuredClone(value)
        },
        openLocal: async () => structuredClone(local), readLocal: async () => structuredClone(local),
        saveLocal: async () => {}, saveSyncLocal: async () => {},
      },
    }
    return { initial, api, persistence, cache: new Map<string, ClosedDisplay>() }
  })
  return <ClosedWorkout api={fixture.api} persistence={fixture.persistence} scope={fixture.initial} recordId={fixture.initial.id}
    session={fixture.initial} cache={fixture.cache} authorized={() => true} accountReady summary={!!session || example === 'summary-failed'}
    definitions={exercises} manufacturers={manufacturers} onServer={() => {}} onRoutineApproved={() => {}}
    onBack={onBack} backLabel={session ? '운동 검수로 돌아가기' : '검수 분류로 돌아가기'} />
}
