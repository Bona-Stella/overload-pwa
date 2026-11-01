import type { ActiveResolution, ApprovalRequest, FinishAck, Resolution, Session, SnapshotAck, SnapshotRequest } from '../workout-online/types.ts'
import type { LocalWorkout } from './types.ts'
import { decimalDraft } from '../workout-online/validation.ts'
import { increment } from './model.ts'

export class SyncStateConflict extends Error {
  constructor(message = '서버 상태 확인이 필요합니다. 이 기기의 기록은 보존했습니다.') { super(message); this.name = 'SyncStateConflict' }
}
export function assertWriter(w: LocalWorkout, server: Session) {
  if (server.userId !== w.userId || server.dataGeneration !== w.dataGeneration || server.id !== w.sessionId) throw new SyncStateConflict('계정 또는 운동 데이터가 변경되었습니다. 이전 기록은 보존했습니다.')
  if (server.writerEpoch !== w.writerEpoch || server.editorDeviceId !== w.editorDeviceId) throw new SyncStateConflict('다른 기기에서 편집 중입니다. 이 기기의 미전송 기록은 보존했습니다.')
  if (server.status !== 'ACTIVE' || server.deletedAt) throw new SyncStateConflict(server.status === 'AUTO_CLOSED' ? '서버가 마지막 저장 기록으로 운동을 자동 종료했습니다. 미전송 원본은 이 기기에 보존했습니다.' : '서버에서 종료되거나 삭제된 운동입니다. 로컬 원본은 보존했습니다.')
}
export function sealSnapshot(w: LocalWorkout) {
  if (w.pendingSnapshot && !w.pendingSnapshot.rejected || w.pendingResolution && !w.pendingResolution.rejected) throw new SyncStateConflict()
  if (BigInt(w.localRevision) <= BigInt(w.serverRevision)) return
  if (Object.values(w.presence).some(x => x === 'UNKNOWN')) throw new SyncStateConflict('이전 수행의 서버 반영 여부를 먼저 확인해 주세요. 원본을 유지합니다.')
  const performedSets = w.snapshot.performedSets.map(s => {
    if (s.weightContext.kind === 'UNVERIFIED') throw new SyncStateConflict('확인되지 않은 수행 문맥은 자동으로 전송하지 않습니다.')
    return { ...structuredClone(s), weightContext: s.weightContext }
  })
  const request: SnapshotRequest = { dataGeneration: w.dataGeneration, editorDeviceId: w.editorDeviceId, writerEpoch: w.writerEpoch,
    localRevision: w.localRevision, snapshot: { ...structuredClone(w.snapshot), performedSets } }
  const records = [...request.snapshot.performedSets, ...request.snapshot.cardioResults]
  const localOnlyIds = records.filter(r => w.presence[r.id] === 'LOCAL_ONLY').map(r => r.id)
  w.pendingSnapshot = { request, requestJson: JSON.stringify(request), localOnlyIds }
  for (const r of records) if (w.presence[r.id] !== 'SERVER_CONFIRMED') w.presence[r.id] = 'UNKNOWN'
  w.syncState = 'UNKNOWN'
}
export function intendFinish(w: LocalWorkout, now: number) {
  if (w.finish) return
  if (!Number.isSafeInteger(now) || now < Date.parse(w.startedAt) || w.snapshot.performedSets.some(s => Date.parse(s.completedAt) > now)
    || w.snapshot.cardioResults.some(s => Date.parse(s.occurredAt) > now)) throw new SyncStateConflict('기기 시각과 마지막 수행 시각을 확인해 주세요. 종료 시각을 자동 보정하지 않습니다.')
  w.finish = { endedAt: new Date(now).toISOString(), snapshot: structuredClone(w.snapshot) }
}
export function sealFinish(w: LocalWorkout) {
  if (!w.finish || w.finish.request) return
  if (w.pendingSnapshot && !w.pendingSnapshot.rejected || w.pendingResolution && !w.pendingResolution.rejected) throw new SyncStateConflict('앞선 저장 결과를 먼저 확인해 주세요.')
  // Reuse V13 validation/normalization without issuing an intermediate PUT or inventing a revision.
  const copy = structuredClone(w)
  if (Object.values(copy.presence).some(x => x === 'UNKNOWN') || copy.snapshot.performedSets.some(s => s.weightContext.kind === 'UNVERIFIED')) throw new SyncStateConflict()
  const request = { dataGeneration: w.dataGeneration, editorDeviceId: w.editorDeviceId, writerEpoch: w.writerEpoch, localRevision: w.localRevision,
    snapshot: copy.snapshot as SnapshotRequest['snapshot'], endedAt: w.finish.endedAt }
  w.finish.request = request; w.finish.requestJson = JSON.stringify(request)
  for (const record of [...request.snapshot.performedSets, ...request.snapshot.cardioResults]) if (w.presence[record.id] !== 'SERVER_CONFIRMED') w.presence[record.id] = 'UNKNOWN'
}
export function acceptFinish(w: LocalWorkout, ack: FinishAck) {
  const request = w.finish?.request
  if (!request || ack.userId !== w.userId || ack.dataGeneration !== w.dataGeneration || ack.sessionId !== w.sessionId || ack.writerEpoch !== w.writerEpoch
    || ack.acceptedLocalRevision !== request.localRevision || Date.parse(ack.endedAt) !== Date.parse(request.endedAt) || ack.status !== 'FINISHED'
    || BigInt(ack.currentVersion) < BigInt(ack.version) || request.localRevision !== w.localRevision) throw new SyncStateConflict()
  for (const r of [...request.snapshot.performedSets, ...request.snapshot.cardioResults]) w.presence[r.id] = 'SERVER_CONFIRMED'
  w.confirmedDeletedSetIds = [...new Set([...(w.confirmedDeletedSetIds ?? []), ...request.snapshot.deletedPerformedSetIds])]
  w.confirmedDeletedCardioIds = [...new Set([...(w.confirmedDeletedCardioIds ?? []), ...request.snapshot.deletedCardioResultIds])]
  w.serverRevision = ack.acceptedLocalRevision
  if (BigInt(ack.currentVersion) > BigInt(w.serverVersion)) w.serverVersion = ack.currentVersion
  w.approvalResults = structuredClone(ack.approvalResults); w.finish!.ack = structuredClone(ack); w.syncState = 'CLEAN'
}
export function acceptSnapshot(w: LocalWorkout, ack: SnapshotAck) {
  const pending = w.pendingSnapshot
  if (!pending || ack.userId !== w.userId || ack.dataGeneration !== w.dataGeneration || ack.sessionId !== w.sessionId
    || ack.writerEpoch !== w.writerEpoch || ack.acceptedLocalRevision !== pending.request.localRevision || BigInt(ack.version) < BigInt(w.serverVersion)) throw new SyncStateConflict()
  for (const r of [...pending.request.snapshot.performedSets, ...pending.request.snapshot.cardioResults]) w.presence[r.id] = 'SERVER_CONFIRMED'
  w.confirmedDeletedSetIds = [...new Set([...(w.confirmedDeletedSetIds ?? []), ...pending.request.snapshot.deletedPerformedSetIds])]
  w.confirmedDeletedCardioIds = [...new Set([...(w.confirmedDeletedCardioIds ?? []), ...pending.request.snapshot.deletedCardioResultIds])]
  w.serverRevision = ack.acceptedLocalRevision; w.serverVersion = ack.version
  w.approvalResults = structuredClone(ack.approvalResults); w.lastAck = structuredClone(ack); w.pendingSnapshot = null
  w.syncState = w.localRevision === ack.acceptedLocalRevision ? 'CLEAN' : 'UNSENT'
}
/** A lower GET is not proof of failed delivery. Only an ACK accepts a frozen snapshot. */
export function observeServer(w: LocalWorkout, server: Session) {
  assertWriter(w, server)
  if (BigInt(server.localRevision) > BigInt(w.serverRevision) && server.localRevision !== w.pendingSnapshot?.request.localRevision) throw new SyncStateConflict()
  if (BigInt(server.version) < BigInt(w.serverVersion)) return
  // Recording contexts are immutable server facts; do not infer them from current routine weight.
  w.recordedContexts = structuredClone(server.snapshot.recordedContexts)
  if (server.localRevision === w.serverRevision && !w.pendingResolution) {
    w.approvalResults = structuredClone(server.snapshot.approvalResults)
    w.serverVersion = server.version
  }
}
export function rejectSnapshot(w: LocalWorkout) {
  const pending = w.pendingSnapshot
  if (!pending) return
  pending.rejected = true
  // Only an authoritative validation rejection proves these newly sealed IDs were never applied.
  for (const id of pending.localOnlyIds) if (w.presence[id] === 'UNKNOWN') w.presence[id] = 'LOCAL_ONLY'
  w.snapshot.deletedPerformedSetIds = w.snapshot.deletedPerformedSetIds.filter(id => w.presence[id] !== 'LOCAL_ONLY')
  w.snapshot.deletedCardioResultIds = w.snapshot.deletedCardioResultIds.filter(id => w.presence[id] !== 'LOCAL_ONLY')
  w.syncState = 'UNSENT'
}
export function makeResolution(w: LocalWorkout, server: Session, exerciseId: string, pendingIds: string[], decision: 'KEEP_CURRENT' | 'REAPPROVE',
  nextWeight: string, routine: { version: string; approvedWeight: string } | null, now: number, randomId = () => crypto.randomUUID()): ActiveResolution {
  assertWriter(w, server)
  if (w.pendingSnapshot && !w.pendingSnapshot.rejected || w.localRevision !== server.localRevision) throw new SyncStateConflict('먼저 현재 운동 기록을 서버에 저장해 주세요.')
  const actual = server.snapshot.approvalResults.filter(r => r.sessionExerciseId === exerciseId && r.status === 'PENDING').map(r => r.id).sort()
  if (!actual.length || JSON.stringify(actual) !== JSON.stringify([...pendingIds].sort())) throw new SyncStateConflict('승인 상태가 바뀌었습니다. 다시 확인한 뒤 선택해 주세요.')
  const common = { dataGeneration: w.dataGeneration, editorDeviceId: w.editorDeviceId, writerEpoch: w.writerEpoch, expectedSessionVersion: server.version,
    expectedLocalRevision: server.localRevision, sessionExerciseId: exerciseId, pendingRequestIds: [...pendingIds], occurredAt: new Date(now).toISOString() }
  if (decision === 'KEEP_CURRENT') return { ...common, decision, newApprovalRequest: null }
  if (!routine) throw new SyncStateConflict('원래 루틴 배치를 확인할 수 없습니다. 현재 중량 유지만 선택할 수 있습니다.')
  const sequence = server.snapshot.state.approvalRequests.filter(r => r.sessionExerciseId === exerciseId).reduce((max, r) => BigInt(r.sequence) > BigInt(max) ? r.sequence : max, '0')
  return { ...common, decision, newApprovalRequest: { id: randomId(), sequence: increment(sequence), expectedRoutineVersion: routine.version,
    previousApprovedWeightKg: routine.approvedWeight, nextApprovedWeightKg: decimalDraft(nextWeight) } }
}
export function resolutionFact(request: Resolution, server: Session) {
  const results = server.snapshot.approvalResults
  const matched = request.pendingRequestIds.every(id => results.some(r => r.id === id && r.sessionExerciseId === request.sessionExerciseId && r.status === 'NOT_APPLIED'
    && r.reason === (request.decision === 'KEEP_CURRENT' ? 'KEPT_CURRENT' : 'REAPPROVED') && r.resolvedAt !== null
    && r.resolvedByRequestId === (request.newApprovalRequest?.id ?? null)))
  if (!matched) return false
  if (request.decision === 'KEEP_CURRENT') return true
  const next = request.newApprovalRequest
  const stored = server.snapshot.state.approvalRequests.find(r => r.id === next.id)
  const expected: ApprovalRequest = { ...next, sessionExerciseId: request.sessionExerciseId, previousRequestId: null, occurredAt: request.occurredAt }
  return !!stored && Object.entries(expected).every(([key, value]) => stored[key as keyof ApprovalRequest] === value)
}
export function acceptResolution(w: LocalWorkout, server: Session) {
  assertWriter(w, server)
  const pending = w.pendingResolution
  if (!pending || !resolutionFact(pending.request, server)) throw new SyncStateConflict()
  for (const request of server.snapshot.state.approvalRequests) {
    if (!w.snapshot.approvalRequests.some(r => r.id === request.id)) w.snapshot.approvalRequests.push(structuredClone(request))
  }
  if (pending.request.decision === 'REAPPROVE' && JSON.stringify(w.weights[pending.request.sessionExerciseId]) === JSON.stringify(pending.workingBefore)) {
    const id = pending.request.sessionExerciseId, approval = pending.request.newApprovalRequest
    w.weights[id] = { value: approval.nextApprovedWeightKg, context: { kind: 'APPROVAL_REQUEST', requestId: approval.id } }
    for (const [key, draft] of Object.entries(w.drafts)) if (key.startsWith(id + ':') && draft.weight === pending.workingBefore?.value
      && !w.snapshot.performedSets.some(s => s.sessionExerciseId === id && key === `${id}:${s.ordinal}`)) draft.weight = approval.nextApprovedWeightKg
  }
  w.approvalResults = structuredClone(server.snapshot.approvalResults); w.recordedContexts = structuredClone(server.snapshot.recordedContexts)
  w.serverVersion = server.version; w.pendingResolution = null
}
