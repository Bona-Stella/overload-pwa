import type { CardioResult, ChangeEvents, ClosedResolution, PerformedSet, RecordEdit, Recovery, Scope, Session } from './types.ts'
import type { LocalWorkout } from '../workout-local/types.ts'
import { resolutionFact } from '../workout-local/sync-state.ts'
import { decimalDraft } from './validation.ts'

export type ClosedWrite = Scope & { sessionId: string; requestJson: string; status: 'PENDING' | 'CONFIRMED' | 'REVIEWED'; ack?: unknown } & (
  { kind: 'records'; body: RecordEdit } | { kind: 'recovery'; body: Recovery } | { kind: 'delete'; body: { dataGeneration: string; expectedVersion: string } } | { kind: 'approval'; body: ClosedResolution })
type RecordValue = PerformedSet | CardioResult
export type RecoveryRow = { kind: 'SET' | 'CARDIO'; record: RecordValue; state: 'PRESENT' | 'CANDIDATE' | 'VALUE_CONFLICT' | 'DELETED' | 'SLOT_CONFLICT' | 'UNVERIFIED' | 'UNAVAILABLE'; selectable: boolean }
export const RECOVERY_LABEL = { PRESENT: '이미 서버에 저장됨', CANDIDATE: '서버에 없는 복구 후보', VALUE_CONFLICT: '동일 기록의 값 충돌', DELETED: '삭제되거나 이 기기에서 취소된 기록', SLOT_CONFLICT: '같은 세트 또는 유산소 활동 충돌', UNVERIFIED: '승인 문맥 확인 불가', UNAVAILABLE: '종목·시각·원본 확인 필요' }
const context = (v: PerformedSet['weightContext']) => [v.kind, v.requestId]
const measurement = (r: CardioResult) => r.result?.measurement === undefined ? null : [r.result.measurement.actualSpeedKmh, r.result.measurement.distanceSource]
export function sameRecord(a: RecordValue, b: RecordValue, claim?: PerformedSet['weightContext']) {
  if ('ordinal' in a && 'ordinal' in b) return JSON.stringify([a.id, a.sessionExerciseId, a.ordinal, decimalDraft(a.weightKg), a.reps, Date.parse(a.completedAt), context(a.weightContext), a.manufacturerId, a.loadType, a.bodyweightLoad ?? null])
    === JSON.stringify([b.id, b.sessionExerciseId, b.ordinal, decimalDraft(b.weightKg), b.reps, Date.parse(b.completedAt), context(claim ?? b.weightContext), b.manufacturerId, b.loadType, b.bodyweightLoad ?? null])
  if ('status' in a && 'status' in b) return JSON.stringify([a.id, a.sessionActivityId, a.status, a.startedAt && Date.parse(a.startedAt), Date.parse(a.occurredAt), a.result && [a.result.timerMs, a.result.activeMs, a.result.corrected, a.result.distanceKm, a.result.averageBpm, measurement(a)]])
    === JSON.stringify([b.id, b.sessionActivityId, b.status, b.startedAt && Date.parse(b.startedAt), Date.parse(b.occurredAt), b.result && [b.result.timerMs, b.result.activeMs, b.result.corrected, b.result.distanceKm, b.result.averageBpm, measurement(b)]])
  return false
}
export function recoveryRows(local: LocalWorkout, server: Session, changes: ChangeEvents): RecoveryRow[] {
  const source = [...local.snapshot.performedSets, ...local.snapshot.cardioResults, ...local.cancelled.sets, ...local.cancelled.cardio]
  return source.map(record => {
    const weight = 'ordinal' in record, kind = weight ? 'SET' : 'CARDIO'
    const deleted = weight ? server.snapshot.state.deletedPerformedSetIds : server.snapshot.state.deletedCardioResultIds
    const records = weight ? server.snapshot.state.performedSets : server.snapshot.state.cardioResults
    const existing = records.find(x => x.id === record.id)
    const cancelled = [...local.cancelled.sets, ...local.cancelled.cardio].some(x => x.id === record.id)
    const claim = changes.events.find(e => e.recordId === record.id && e.changeKind === 'RECOVERED')?.changeContext?.claimedWeightContext as PerformedSet['weightContext'] | undefined
    let state: RecoveryRow['state'] = 'CANDIDATE'
    if (deleted.includes(record.id) || cancelled) state = 'DELETED'
    else if (existing) state = sameRecord(record, existing, claim) ? 'PRESENT' : 'VALUE_CONFLICT'
    else if (weight ? server.snapshot.state.performedSets.some(s => s.sessionExerciseId === record.sessionExerciseId && s.ordinal === record.ordinal)
      : server.snapshot.state.cardioResults.some(s => s.sessionActivityId === record.sessionActivityId)) state = 'SLOT_CONFLICT'
    else if (server.deletedAt || server.status === 'ACTIVE' || !server.snapshot.state.sessionExercises.some(e => e.id === (weight ? record.sessionExerciseId : record.sessionActivityId))
      || Date.parse(weight ? record.completedAt : record.occurredAt) < Date.parse(server.startedAt)
      || server.endedAt && Date.parse(weight ? record.completedAt : record.occurredAt) > Date.parse(server.endedAt)
      || !weight && record.status !== 'COMPLETED'
      || BigInt(local.writerEpoch) > BigInt(server.writerEpoch) || local.writerEpoch === server.writerEpoch && local.editorDeviceId !== server.editorDeviceId) state = 'UNAVAILABLE'
    else if (weight) {
      const c = record.weightContext
      if (c.kind === 'UNVERIFIED' || c.kind === 'INITIAL_APPROVED' && !server.initialPlan.weightExercises.some(e => e.sessionExerciseId === record.sessionExerciseId)
        || c.kind === 'APPROVAL_REQUEST') state = 'UNVERIFIED' // The read DTO cannot prove whether a request was created before closure. Server recovery decides.
    }
    return { kind, record, state, selectable: state === 'CANDIDATE' || state === 'UNVERIFIED' }
  })
}
/** Confirm a lost online response using preserved server facts, never by raising expectedVersion. */
export function closedWriteFact(write: ClosedWrite, server: Session, changes: ChangeEvents) {
  if (write.kind === 'approval') return resolutionFact(write.body, server)
  const events = changes.events.filter(e => e.changeContext?.sessionVersion === (BigInt(write.body.expectedVersion) + 1n).toString())
  if (write.kind === 'delete') return !!server.deletedAt && events.some(e => e.recordKind === 'SESSION' && e.changeKind === 'DELETED')
  if (write.kind === 'recovery') return [...write.body.performedSets, ...write.body.cardioResults].every(record => {
    const event = events.find(e => e.recordId === record.id && e.changeKind === 'RECOVERED')
    if (event?.after) return sameRecord(record, event.after as RecordValue, event.changeContext?.claimedWeightContext as PerformedSet['weightContext'] | undefined)
    const current = [...server.snapshot.state.performedSets, ...server.snapshot.state.cardioResults].find(x => x.id === record.id)
    return !!current && sameRecord(record, current) // Already present needs no new write or resurrection.
  })
  const b = write.body
  const corrected = (items: (RecordEdit['setCorrections'][number] | RecordEdit['cardioCorrections'][number])[], kind: 'SET' | 'CARDIO') => items.every(c => events.some(e => e.recordKind === kind && e.recordId === c.id && e.changeKind === 'CORRECTED' && e.after
    && Object.entries(c).every(([key, value]) => JSON.stringify(e.after![key]) === JSON.stringify(value))))
  const deleted = (ids: string[], kind: 'SET' | 'CARDIO') => ids.every(id => events.some(e => e.recordKind === kind && e.recordId === id && e.changeKind === 'DELETED'))
  return corrected(b.setCorrections, 'SET') && corrected(b.cardioCorrections, 'CARDIO') && deleted(b.deletedPerformedSetIds, 'SET') && deleted(b.deletedCardioResultIds, 'CARDIO')
}
