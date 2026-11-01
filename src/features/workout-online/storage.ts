import type { Scope, Session, Start } from './types.ts'
import { counter, object, session, uuid, instant } from './validation.ts'
import type { LocalKey, LocalWorkout, RestPolicy } from '../workout-local/types.ts'
import { localKey } from '../workout-local/types.ts'
import { createLocalWorkout } from '../workout-local/model.ts'
import { localWorkout } from '../workout-local/validation.ts'
import type { ClosedWrite } from './closed-model.ts'
import { offlinePermit } from '../workout-local/offline-access.ts'
import type { OfflinePermit } from '../workout-local/offline-access.ts'

export const DATABASE_NAME = 'overload.workout.v1'
export type StartAttempt = Scope & { request: Start; requestJson: string }
export type SessionCopy = Scope & { editorDeviceId: string; writerEpoch: string; sessionId: string; server: Session }
export class LocalStoreError extends Error {
  constructor() { super('이 기기에 저장하지 못했습니다. 저장소 설정과 여유 공간을 확인한 뒤 다시 시도해 주세요.'); this.name = 'LocalStoreError' }
}
export class LocalWriteBlocked extends Error {
  constructor() { super('편집권 또는 저장 기준이 변경되었습니다. 로컬 원본은 보존했습니다. 현재 세션을 다시 확인해 주세요.'); this.name = 'LocalWriteBlocked' }
}
const scopeKey = (scope: Scope) => [scope.userId, scope.dataGeneration]
const request = <T>(value: IDBRequest<T>) => new Promise<T>((resolve, reject) => { value.onsuccess = () => resolve(value.result); value.onerror = () => reject(new LocalStoreError()) })
export function isAttempt(value: unknown, scope: Scope): value is StartAttempt {
  if (!object(value) || value.userId !== scope.userId || value.dataGeneration !== scope.dataGeneration || !object(value.request)) return false
  const r = value.request
  return uuid(r.id) && uuid(r.routineId) && uuid(r.editorDeviceId) && r.dataGeneration === scope.dataGeneration && instant(r.startedAt)
    && typeof r.workoutDate === 'string' && typeof r.startedTimeZone === 'string' && value.requestJson === JSON.stringify(r)
}

/** START recovery, server copies, and one complete local workout document per writer epoch. */
export class WorkoutStore {
  private connection: Promise<IDBDatabase> | null = null
  private readonly factory: IDBFactory
  private readonly randomId: () => string
  private readonly databaseName: string
  constructor(factory: IDBFactory = globalThis.indexedDB, randomId = () => crypto.randomUUID(), databaseName = DATABASE_NAME) {
    this.factory = factory; this.randomId = randomId; this.databaseName = databaseName
  }
  private open(): Promise<IDBDatabase> {
    if (!this.connection) this.connection = new Promise<IDBDatabase>((resolve, reject) => {
      if (!this.factory) { reject(new LocalStoreError()); return }
      const opening = this.factory.open(this.databaseName, 2)
      let failed = false
      opening.onupgradeneeded = event => {
        const db = opening.result
        if (event.oldVersion < 1) {
          db.createObjectStore('meta')
          db.createObjectStore('startAttempts', { keyPath: ['userId', 'dataGeneration'] })
          db.createObjectStore('sessionCopies', { keyPath: ['userId', 'dataGeneration', 'sessionId', 'editorDeviceId', 'writerEpoch'] }).createIndex('scope', ['userId', 'dataGeneration'])
        }
        if (event.oldVersion < 2) db.createObjectStore('localWorkouts', { keyPath: ['userId', 'dataGeneration', 'sessionId', 'editorDeviceId', 'writerEpoch'] })
      }
      opening.onerror = opening.onblocked = () => { failed = true; reject(new LocalStoreError()) }
      opening.onsuccess = () => {
        const db = opening.result
        if (failed) { db.close(); return }
        db.onversionchange = () => { db.close(); this.connection = null }
        resolve(db)
      }
    }).catch(error => { this.connection = null; throw error instanceof LocalStoreError ? error : new LocalStoreError() })
    return this.connection
  }
  private async run<T>(stores: string[], mode: IDBTransactionMode, action: (tx: IDBTransaction) => Promise<T>): Promise<T> {
    let tx: IDBTransaction | undefined
    try {
      tx = (await this.open()).transaction(stores, mode)
      const done = new Promise<void>((resolve, reject) => { tx!.oncomplete = () => resolve(); tx!.onabort = () => reject(new LocalStoreError()); tx!.onerror = () => { /* abort determines transaction outcome */ } })
      // Attach the rejection handler before issuing work: request errors also abort their transaction.
      const outcome = done.catch(() => { throw new LocalStoreError() })
      try { const result = await action(tx); await outcome; return result }
      catch (error) { try { tx.abort() } catch { /* already aborted/committed */ } await outcome.catch(() => {}); throw error }
    } catch (error) { throw error instanceof LocalWriteBlocked ? error : new LocalStoreError() }
  }
  deviceId() {
    return this.run(['meta'], 'readwrite', async tx => {
      const store = tx.objectStore('meta'), existing: unknown = await request(store.get('editorDeviceId'))
      if (existing !== undefined) { if (!uuid(existing)) throw new LocalStoreError(); return existing }
      const id = this.randomId(); if (!uuid(id)) throw new LocalStoreError()
      await request(store.put(id, 'editorDeviceId')); return id
    })
  }
  clearOfflinePermit() {
    return this.run(['meta'], 'readwrite', async tx => { await request(tx.objectStore('meta').delete('offlineResume')) })
  }
  private async offlineDocument(tx: IDBTransaction, permit: OfflinePermit) {
    const device: unknown = await request(tx.objectStore('meta').get('editorDeviceId'))
    const workout: unknown = await request(tx.objectStore('localWorkouts').get(localKey(permit)))
    if (device !== permit.editorDeviceId || !localWorkout(workout) || workout.finish?.ack) return null
    const copies: SessionCopy[] = await request(tx.objectStore('sessionCopies').index('scope').getAll(scopeKey(permit)))
    const latest = copies.filter(x => x.sessionId === permit.sessionId).sort((a, b) => BigInt(a.server.version) > BigInt(b.server.version) ? -1 : 1)[0]?.server
    if (!session(latest) || latest.status !== 'ACTIVE' || latest.deletedAt || latest.userId !== permit.userId || latest.dataGeneration !== permit.dataGeneration
      || latest.editorDeviceId !== permit.editorDeviceId || latest.writerEpoch !== permit.writerEpoch || JSON.stringify(localKey(workout)) !== JSON.stringify(localKey(permit))
      || JSON.stringify(latest.initialPlan) !== JSON.stringify(workout.initialPlan) || latest.startedAt !== workout.startedAt) return null
    return { permit, workout, server: latest }
  }
  offlineSource() {
    return this.run(['meta', 'localWorkouts', 'sessionCopies'], 'readonly', async tx => {
      const permit: unknown = await request(tx.objectStore('meta').get('offlineResume'))
      return offlinePermit(permit) ? this.offlineDocument(tx, permit) : null
    })
  }
  saveOfflinePermit(permit: OfflinePermit, allowed: () => boolean) {
    return this.run(['meta', 'localWorkouts', 'sessionCopies'], 'readwrite', async tx => {
      if (!offlinePermit(permit) || !allowed() || !await this.offlineDocument(tx, permit) || !allowed()) throw new LocalWriteBlocked()
      await request(tx.objectStore('meta').put(permit, 'offlineResume'))
      if (!allowed()) throw new LocalWriteBlocked()
    })
  }
  attempt(scope: Scope) {
    return this.run(['startAttempts'], 'readonly', async tx => {
      const value: unknown = await request(tx.objectStore('startAttempts').get(scopeKey(scope)))
      if (value === undefined) return null
      if (!isAttempt(value, scope)) throw new LocalStoreError()
      return value
    })
  }
  prepareStart(scope: Scope, body: Start) {
    return this.run(['startAttempts'], 'readwrite', async tx => {
      const store = tx.objectStore('startAttempts'), existing: unknown = await request(store.get(scopeKey(scope)))
      if (existing !== undefined) { if (!isAttempt(existing, scope)) throw new LocalStoreError(); return existing }
      const value = { ...scope, request: body, requestJson: JSON.stringify(body) }
      if (!uuid(scope.userId) || !counter(scope.dataGeneration) || !isAttempt(value, scope)) throw new LocalStoreError()
      await request(store.add(value)); return value
    })
  }
  saveSession(scope: Scope, value: Session, attemptId?: string) {
    if (!session(value) || value.userId !== scope.userId || value.dataGeneration !== scope.dataGeneration) return Promise.reject(new LocalStoreError())
    return this.run(['sessionCopies', 'startAttempts', 'meta'], 'readwrite', async tx => {
      const store = tx.objectStore('sessionCopies'), key = [...scopeKey(scope), value.id, value.editorDeviceId, value.writerEpoch]
      const previous: SessionCopy | undefined = await request(store.get(key))
      if (!previous || BigInt(previous.server.version) <= BigInt(value.version)) {
        await request(store.put({ ...scope, sessionId: value.id, editorDeviceId: value.editorDeviceId, writerEpoch: value.writerEpoch, server: value } satisfies SessionCopy))
      }
      if (attemptId) {
        const attempts = tx.objectStore('startAttempts'), attempt: unknown = await request(attempts.get(scopeKey(scope)))
        if (isAttempt(attempt, scope) && attempt.request.id === attemptId) await request(attempts.delete(scopeKey(scope)))
      }
      const meta = tx.objectStore('meta'), takeoverKey = ['takeover', ...scopeKey(scope), value.id, value.editorDeviceId]
      const pending: unknown = await request(meta.get(takeoverKey))
      if (object(pending) && object(pending.request) && counter(pending.request.expectedWriterEpoch)
        && BigInt(value.writerEpoch) === BigInt(pending.request.expectedWriterEpoch) + 1n) await request(meta.delete(takeoverKey))
    })
  }
  prepareTakeover(scope: Scope, sessionId: string, editorDeviceId: string, expectedWriterEpoch: string) {
    return this.run(['meta'], 'readwrite', async tx => {
      const store = tx.objectStore('meta'), key = ['takeover', ...scopeKey(scope), sessionId, editorDeviceId]
      const existing: unknown = await request(store.get(key))
      if (existing !== undefined && !(object(existing) && existing.rejectedAtEpoch === expectedWriterEpoch)) {
        if (!object(existing) || !object(existing.request) || existing.request.dataGeneration !== scope.dataGeneration || existing.request.editorDeviceId !== editorDeviceId
          || !counter(existing.request.expectedWriterEpoch) || existing.requestJson !== JSON.stringify(existing.request)) throw new LocalStoreError()
        return existing as { request: { dataGeneration: string; editorDeviceId: string; expectedWriterEpoch: string }; requestJson: string }
      }
      const body = { dataGeneration: scope.dataGeneration, editorDeviceId, expectedWriterEpoch }
      if (!uuid(sessionId) || !uuid(editorDeviceId) || !counter(expectedWriterEpoch)) throw new LocalStoreError()
      const value = { request: body, requestJson: JSON.stringify(body) }; await request(store.put(value, key)); return value
    })
  }
  rejectTakeover(scope: Scope, sessionId: string, editorDeviceId: string, requestJson: string, current: Session) {
    return this.run(['meta'], 'readwrite', async tx => {
      const store = tx.objectStore('meta'), key = ['takeover', ...scopeKey(scope), sessionId, editorDeviceId]
      const previous: unknown = await request(store.get(key))
      if (!object(previous) || !object(previous.request) || previous.requestJson !== requestJson || !counter(previous.request.expectedWriterEpoch)
        || current.userId !== scope.userId || current.dataGeneration !== scope.dataGeneration || current.id !== sessionId) throw new LocalWriteBlocked()
      const expected = BigInt(previous.request.expectedWriterEpoch), actual = BigInt(current.writerEpoch)
      if (actual > expected && (actual !== expected + 1n || current.editorDeviceId !== editorDeviceId)) {
        await request(store.put({ ...previous, rejectedAtEpoch: current.writerEpoch }, key))
      }
    })
  }
  copies(scope: Scope) {
    return this.run(['sessionCopies'], 'readonly', async tx => {
      const values: unknown[] = await request(tx.objectStore('sessionCopies').index('scope').getAll(scopeKey(scope)))
      if (!values.every(x => object(x) && x.userId === scope.userId && x.dataGeneration === scope.dataGeneration && session(x.server)
        && x.server.userId === scope.userId && x.server.dataGeneration === scope.dataGeneration && x.sessionId === x.server.id && x.writerEpoch === x.server.writerEpoch && x.editorDeviceId === x.server.editorDeviceId)) throw new LocalStoreError()
      return values as SessionCopy[]
    })
  }
  readLocal(key: LocalKey) {
    return this.run(['localWorkouts'], 'readonly', async tx => {
      const value: unknown = await request(tx.objectStore('localWorkouts').get(localKey(key)))
      if (value === undefined) return null
      if (!localWorkout(value) || JSON.stringify(localKey(value)) !== JSON.stringify(localKey(key))) throw new LocalStoreError()
      return value
    })
  }
  localCopies(scope: Scope, sessionId: string) {
    return this.run(['localWorkouts'], 'readonly', async tx => {
      const values: unknown[] = await request(tx.objectStore('localWorkouts').getAll(IDBKeyRange.bound([...scopeKey(scope), sessionId], [...scopeKey(scope), sessionId, []])))
      if (!values.every(x => localWorkout(x) && x.userId === scope.userId && x.dataGeneration === scope.dataGeneration && x.sessionId === sessionId)) throw new LocalStoreError()
      return values as LocalWorkout[]
    })
  }
  closedWrite(scope: Scope, sessionId: string) {
    return this.run(['meta'], 'readonly', async tx => {
      const value: unknown = await request(tx.objectStore('meta').get(['closedWrite', ...scopeKey(scope), sessionId]))
      if (value === undefined) return null
      if (!object(value) || value.userId !== scope.userId || value.dataGeneration !== scope.dataGeneration || value.sessionId !== sessionId
        || !['records','recovery','delete','approval'].includes(String(value.kind)) || !['PENDING','CONFIRMED','REVIEWED'].includes(String(value.status))
        || !object(value.body) || value.body.dataGeneration !== scope.dataGeneration || !counter(value.body.expectedVersion) || value.requestJson !== JSON.stringify(value.body)) throw new LocalStoreError()
      return value as ClosedWrite
    })
  }
  saveClosedWrite(value: ClosedWrite, previous: ClosedWrite | null, canWrite: () => boolean) {
    return this.run(['meta'], 'readwrite', async tx => {
      if (!canWrite()) throw new LocalWriteBlocked()
      const store = tx.objectStore('meta'), key = ['closedWrite', ...scopeKey(value), value.sessionId]
      const existing: unknown = await request(store.get(key))
      if (JSON.stringify(existing ?? null) !== JSON.stringify(previous) || value.body.dataGeneration !== value.dataGeneration || value.requestJson !== JSON.stringify(value.body)) throw new LocalWriteBlocked()
      if (previous?.status === 'PENDING' && (previous.requestJson !== value.requestJson || previous.kind !== value.kind)) throw new LocalWriteBlocked()
      await request(store.put(value, key)); if (!canWrite()) throw new LocalWriteBlocked()
    })
  }
  private async checkWriter(tx: IDBTransaction, key: LocalKey, revision: string, finish = false) {
    const copies: SessionCopy[] = await request(tx.objectStore('sessionCopies').index('scope').getAll(scopeKey(key)))
    const same = copies.filter(x => x.sessionId === key.sessionId).sort((a, b) => BigInt(a.server.version) > BigInt(b.server.version) ? -1 : 1)
    const latest = same[0]?.server
    if (!latest || latest.status !== 'ACTIVE' && !(finish && latest.status === 'FINISHED') || latest.deletedAt || latest.editorDeviceId !== key.editorDeviceId || latest.writerEpoch !== key.writerEpoch || BigInt(latest.localRevision) > BigInt(revision)) throw new LocalWriteBlocked()
  }
  openLocal(server: Session, policy: RestPolicy, canWrite: () => boolean) {
    const key = { userId: server.userId, dataGeneration: server.dataGeneration, sessionId: server.id, editorDeviceId: server.editorDeviceId, writerEpoch: server.writerEpoch }
    return this.run(['localWorkouts', 'sessionCopies'], 'readwrite', async tx => {
      if (!canWrite()) throw new LocalWriteBlocked()
      const store = tx.objectStore('localWorkouts'), previous: unknown = await request(store.get(localKey(key)))
      if (previous !== undefined) {
        if (!localWorkout(previous)) throw new LocalStoreError()
        if (JSON.stringify(previous.initialPlan) !== JSON.stringify(server.initialPlan) || previous.startedAt !== server.startedAt) throw new LocalWriteBlocked()
        await this.checkWriter(tx, key, previous.finish?.request?.localRevision ?? (previous.pendingSnapshot && !previous.pendingSnapshot.rejected ? previous.pendingSnapshot.request.localRevision : previous.serverRevision), !!previous.finish?.request && !previous.finish.ack)
        return previous
      }
      await this.checkWriter(tx, key, server.localRevision)
      const value = createLocalWorkout(server, policy)
      if (!canWrite() || !localWorkout(value)) throw new LocalWriteBlocked()
      await request(store.add(value)); return value
    })
  }
  saveLocal(value: LocalWorkout, expectedEditVersion: string, canWrite: () => boolean) {
    return this.persistLocal(value, expectedEditVersion, canWrite, false)
  }
  saveSyncLocal(value: LocalWorkout, expectedEditVersion: string, canWrite: () => boolean) {
    return this.persistLocal(value, expectedEditVersion, canWrite, true)
  }
  private persistLocal(value: LocalWorkout, expectedEditVersion: string, canWrite: () => boolean, sync: boolean) {
    if (!localWorkout(value)) return Promise.reject(new LocalStoreError())
    return this.run(['localWorkouts', 'sessionCopies'], 'readwrite', async tx => {
      if (!canWrite()) throw new LocalWriteBlocked()
      const store = tx.objectStore('localWorkouts'), previous: unknown = await request(store.get(localKey(value)))
      if (!localWorkout(previous) || previous.editVersion !== expectedEditVersion || BigInt(value.editVersion) !== BigInt(expectedEditVersion) + 1n
        || JSON.stringify(previous.initialPlan) !== JSON.stringify(value.initialPlan) || value.startedAt !== previous.startedAt
        || !sync && !!previous.finish
        || previous.finish && (value.finish?.endedAt !== previous.finish.endedAt || JSON.stringify(value.finish?.snapshot) !== JSON.stringify(previous.finish.snapshot)
          || previous.finish.requestJson && value.finish?.requestJson !== previous.finish.requestJson)
        || !sync && (value.serverRevision !== previous.serverRevision || value.serverVersion !== previous.serverVersion
          || JSON.stringify(value.pendingSnapshot) !== JSON.stringify(previous.pendingSnapshot) || JSON.stringify(value.pendingResolution) !== JSON.stringify(previous.pendingResolution))) throw new LocalWriteBlocked()
      const snapshotChanged = JSON.stringify(value.snapshot) !== JSON.stringify(previous.snapshot)
      const meaningful = snapshotChanged || !previous.finish && !!value.finish
      if (BigInt(value.localRevision) !== BigInt(previous.localRevision) + (meaningful ? 1n : 0n)
        || meaningful && value.syncState === 'CLEAN') throw new LocalWriteBlocked()
      const bound = previous.finish?.request?.localRevision ?? (previous.pendingSnapshot && !previous.pendingSnapshot.rejected ? previous.pendingSnapshot.request.localRevision : previous.serverRevision)
      await this.checkWriter(tx, value, bound, sync && !!previous.finish?.request && !previous.finish.ack)
      if (BigInt(value.serverRevision) < BigInt(previous.serverRevision) || BigInt(value.serverVersion) < BigInt(previous.serverVersion) || BigInt(value.localRevision) < BigInt(value.serverRevision)) throw new LocalWriteBlocked()
      if (!canWrite()) throw new LocalWriteBlocked()
      await request(store.put(value))
      if (!canWrite()) throw new LocalWriteBlocked()
    })
  }
  async close() { const db = await this.connection; db?.close(); this.connection = null }
}
