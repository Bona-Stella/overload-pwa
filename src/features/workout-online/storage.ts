import type { Scope, Session, Start } from './types.ts'
import { counter, object, session, uuid, instant } from './validation.ts'

export const DATABASE_NAME = 'overload.workout.v1'
export type StartAttempt = Scope & { request: Start; requestJson: string }
export type SessionCopy = Scope & { editorDeviceId: string; writerEpoch: string; sessionId: string; server: Session }
export class LocalStoreError extends Error {
  constructor() { super('이 기기에 저장하지 못했습니다. 저장소 설정과 여유 공간을 확인한 뒤 다시 시도해 주세요.'); this.name = 'LocalStoreError' }
}
const scopeKey = (scope: Scope) => [scope.userId, scope.dataGeneration]
const request = <T>(value: IDBRequest<T>) => new Promise<T>((resolve, reject) => { value.onsuccess = () => resolve(value.result); value.onerror = () => reject(new LocalStoreError()) })
export function isAttempt(value: unknown, scope: Scope): value is StartAttempt {
  if (!object(value) || value.userId !== scope.userId || value.dataGeneration !== scope.dataGeneration || !object(value.request)) return false
  const r = value.request
  return uuid(r.id) && uuid(r.routineId) && uuid(r.editorDeviceId) && r.dataGeneration === scope.dataGeneration && instant(r.startedAt)
    && typeof r.workoutDate === 'string' && typeof r.startedTimeZone === 'string' && value.requestJson === JSON.stringify(r)
}

/** Only START recovery metadata and server copies. No input drafts, timers or snapshot queue in 5A. */
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
      const opening = this.factory.open(this.databaseName, 1)
      let failed = false
      opening.onupgradeneeded = () => {
        const db = opening.result
        db.createObjectStore('meta')
        db.createObjectStore('startAttempts', { keyPath: ['userId', 'dataGeneration'] })
        db.createObjectStore('sessionCopies', { keyPath: ['userId', 'dataGeneration', 'sessionId', 'editorDeviceId', 'writerEpoch'] }).createIndex('scope', ['userId', 'dataGeneration'])
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
    } catch { throw new LocalStoreError() }
  }
  deviceId() {
    return this.run(['meta'], 'readwrite', async tx => {
      const store = tx.objectStore('meta'), existing: unknown = await request(store.get('editorDeviceId'))
      if (existing !== undefined) { if (!uuid(existing)) throw new LocalStoreError(); return existing }
      const id = this.randomId(); if (!uuid(id)) throw new LocalStoreError()
      await request(store.put(id, 'editorDeviceId')); return id
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
    return this.run(['sessionCopies', 'startAttempts'], 'readwrite', async tx => {
      const store = tx.objectStore('sessionCopies'), key = [...scopeKey(scope), value.id, value.editorDeviceId, value.writerEpoch]
      const previous: SessionCopy | undefined = await request(store.get(key))
      if (!previous || BigInt(previous.server.version) <= BigInt(value.version)) {
        await request(store.put({ ...scope, sessionId: value.id, editorDeviceId: value.editorDeviceId, writerEpoch: value.writerEpoch, server: value } satisfies SessionCopy))
      }
      if (attemptId) {
        const attempts = tx.objectStore('startAttempts'), attempt: unknown = await request(attempts.get(scopeKey(scope)))
        if (isAttempt(attempt, scope) && attempt.request.id === attemptId) await request(attempts.delete(scopeKey(scope)))
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
  async close() { const db = await this.connection; db?.close(); this.connection = null }
}
