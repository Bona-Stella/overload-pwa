import {settleWeightClock,resumeWeightClock,weightVisibility,recoverWeightClock} from './weight-timing.ts'
import { LocalStoreError, LocalWriteBlocked, WorkoutStore } from '../workout-online/storage.ts'
import type { Session } from '../workout-online/types.ts'
import { applyLocalChange, editDraft, emptyTimer, migrateRest } from './model.ts'
import { intendFinish } from './sync-state.ts'
import { acquireEditor } from './lock.ts'
import type { EditorLease } from './lock.ts'
import type { CardioTimer, LocalKey, LocalWorkout, RestPolicy, SetDraft } from './types.ts'
import { WorkoutSynchronizer } from './sync.ts'
import type { SyncOptions, SyncStatus } from './sync.ts'
import { WorkoutActionError } from './action-error.ts'
import type { WorkoutActionFailure } from './action-error.ts'

type Store = Pick<WorkoutStore, 'openLocal' | 'readLocal' | 'saveLocal'> & Partial<Pick<WorkoutStore, 'saveSyncLocal' | 'saveSession'>>
export type EditorState = { workout: LocalWorkout | null; writable: boolean; loading: boolean; pending: number; issue: string | null;
  drafts: Record<string, SetDraft>; cardioDrafts: Record<string, Partial<CardioTimer>>; memos: Record<string, string>; unsavedDrafts: boolean; syncStatus?: SyncStatus; syncIssue?: string | null }
type DraftCollections = Pick<EditorState, 'drafts' | 'cardioDrafts' | 'memos'>
type DraftPatch = Partial<DraftCollections & Pick<EditorState, 'unsavedDrafts'>>
type DraftWrite = { queued?: DraftPatch; committed: () => DraftPatch | undefined }
type OnActionFailure = (failure: WorkoutActionFailure) => void
/** Serial local transactions. Completion UI only observes committed documents; the sender follows durable changes. */
export class LocalWorkoutController {
  private state: EditorState = { workout: null, writable: false, loading: true, pending: 0, issue: null, drafts: {}, cardioDrafts: {}, memos: {}, unsavedDrafts: false }
  private listeners = new Set<() => void>()
  private lease: EditorLease | null = null
  private stopped = false
  private tail: Promise<unknown> = Promise.resolve()
  private readonly store: Store
  private readonly authorized: () => boolean
  private readonly acquire: typeof acquireEditor
  private draftSerial = 0
  private generation = 0
  private opening: Promise<unknown> = Promise.resolve()
  private readonly syncOptions?: SyncOptions
  private synchronizer: WorkoutSynchronizer | null = null
  constructor(store: Store, authorized: () => boolean, acquire = acquireEditor, sync?: SyncOptions) { this.store = store; this.authorized = authorized; this.acquire = acquire; this.syncOptions = sync }
  getSnapshot = () => this.state
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  private set(patch: Partial<EditorState>) { if (this.stopped) return; this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()) }
  private allowed = () => !this.stopped && !!this.lease?.held() && this.authorized()
  async open(server: Session, policy: RestPolicy) {
    const generation = ++this.generation
    this.stopped = false
    const previousOpening = this.opening
    let opened!: () => void
    this.opening = new Promise<void>(resolve => { opened = resolve })
    await previousOpening
    if (generation !== this.generation || this.stopped) { opened(); return }
    const key: LocalKey = { userId: server.userId, dataGeneration: server.dataGeneration, sessionId: server.id, editorDeviceId: server.editorDeviceId, writerEpoch: server.writerEpoch }
    try {
      const lease = await this.acquire(key)
      if (this.stopped || generation !== this.generation) { lease?.release(); return }
      this.lease = lease
      if (!lease || !this.authorized()) {
        lease?.release()
        this.set({ workout: await this.store.readLocal(key), loading: false, issue: '다른 탭이 운동을 편집 중이거나 이 환경이 편집 잠금을 지원하지 않습니다. 이 탭은 읽기 전용입니다.' }); return
      }
      let workout = await this.store.openLocal(server, policy, this.allowed)
      if (workout.weightClock || workout.rest !== undefined) {
        const next = applyLocalChange(workout, w => { migrateRest(w); recoverWeightClock(w, Date.now()) }, true)
        await this.store.saveLocal(next, workout.editVersion, this.allowed)
        workout = next
      }
      if (generation === this.generation) this.set({ workout, loading: false, writable: this.allowed(), issue: null })
      if (generation === this.generation && this.syncOptions && this.allowed()) {
        this.synchronizer?.stop()
        this.synchronizer = new WorkoutSynchronizer(this.syncOptions, {
          read: () => this.state.workout, allowed: () => generation === this.generation && this.allowed(),
          mutate: fn => this.update(fn, true), saveServer: s => this.store.saveSession!(s, s),
          block: () => { this.lease?.release(); this.lease = null; this.set({ writable: false }) },
          status: (syncStatus, issue) => { if (generation === this.generation) this.set({ syncStatus, syncIssue: issue ?? null, ...(syncStatus === 'OTHER' ? { writable: false } : {}) }) },
        })
        void this.synchronizer.retry()
      }
    } catch (error) { if (generation === this.generation) { this.set({ loading: false, writable: false, issue: error instanceof Error ? error.message : new LocalStoreError().message }); this.lease?.release() } }
    finally {
      opened()
    }
  }
  change = (transform: (workout: LocalWorkout, now: number) => void): Promise<boolean> => {
    return this.update(transform, false, Date.now())
  }
  private update(transform: (workout: LocalWorkout, now: number) => void, sync: boolean, at?: number, draft?: DraftWrite, onFailure?: OnActionFailure): Promise<boolean> {
    const blocked = () => {
      onFailure?.({ kind: 'blocked', message: '편집 상태가 변경되었습니다. 운동을 다시 확인해 주세요.' })
      return false
    }
    if (!this.allowed() || !this.state.writable) return Promise.resolve(blocked())
    const generation = this.generation
    const allowed = () => generation === this.generation && this.allowed()
    let counted = !onFailure
    if (counted) this.set({ pending: this.state.pending + 1, ...draft?.queued })
    const operation = this.tail.then(async () => {
      if (!allowed() || !this.state.workout || !this.state.writable || !sync && this.state.workout.finish) return blocked()
      const previous = this.state.workout, now = at ?? Date.now()
      let next: LocalWorkout
      try {
        next = applyLocalChange(previous, w => {
          if (!sync) settleWeightClock(w, now)
          transform(w, now)
          if (!sync) resumeWeightClock(w, now)
        }, !sync)
      } catch (error) {
        const message = error instanceof WorkoutActionError ? error.message : '현재 운동 상태를 확인한 뒤 다시 시도해 주세요.'
        if (draft) this.set({ issue: message })
        onFailure?.({ kind: 'action', message })
        return false
      }
      if (!counted) { counted = true; this.set({ pending: this.state.pending + 1 }) }
      try {
        if (sync) {
          if (!this.store.saveSyncLocal || !this.store.saveSession) throw new LocalStoreError()
          await this.store.saveSyncLocal(next, previous.editVersion, allowed)
        } else await this.store.saveLocal(next, previous.editVersion, allowed)
        if (!allowed()) return blocked()
        this.set({ workout: next, issue: null, ...draft?.committed() })
        if (!sync && (next.localRevision !== previous.localRevision || !previous.finish && next.finish)) this.synchronizer?.request()
        return true
      } catch (error) {
        if (error instanceof LocalWriteBlocked) { this.lease?.release(); this.lease = null }
        const message = error instanceof LocalWriteBlocked || error instanceof LocalStoreError ? error.message : new LocalStoreError().message
        this.set({ issue: message,
          ...(error instanceof LocalWriteBlocked ? { writable: false } : {}) })
        onFailure?.({ kind: 'storage', message })
        return false
      }
    }).finally(() => { if (counted) this.set({ pending: Math.max(0, this.state.pending - 1) }) })
    this.tail = operation; return operation
  }
  private saveDraft<K extends keyof DraftCollections>(collection: K, key: string, value: DraftCollections[K][string],
    transform: (workout: LocalWorkout) => void) {
    if (!this.allowed() || !this.state.writable || this.state.workout?.finish) return
    this.draftSerial++
    void this.update(transform, false, Date.now(), {
      queued: { [collection]: { ...this.state[collection], [key]: value }, unsavedDrafts: true },
      committed: () => {
        // An older commit must leave the newest optimistic value in place.
        if (this.state[collection][key] !== value) return
        const remaining = { ...this.state[collection] }
        delete remaining[key]
        const outstanding = { ...this.state, [collection]: remaining }
        const { drafts, cardioDrafts, memos } = outstanding
        return { [collection]: remaining, unsavedDrafts: Object.keys(drafts).length + Object.keys(cardioDrafts).length + Object.keys(memos).length > 0 }
      },
    })
  }
  draft(id: string, ordinal: number, value: SetDraft) {
    this.saveDraft('drafts', `${id}:${ordinal}`, value, workout => editDraft(workout, id, ordinal, value))
  }
  cardioDraft(id: string, patch: Pick<Partial<CardioTimer>, 'distance' | 'distanceSource' | 'speed' | 'speedSource' | 'bpm' | 'correctedSeconds'>) {
    const value = { ...this.state.cardioDrafts[id], ...patch }
    this.saveDraft('cardioDrafts', id, value, workout => {
      workout.timers[id] = { ...(workout.timers[id] ?? emptyTimer()), ...value }
    })
  }
  memo(id: string, value: string) {
    this.saveDraft('memos', id, value, w => {
      if (!w.snapshot.appliedPlan.weightExercises.some(e => e.sessionExerciseId === id)) throw new Error('현재 종목을 확인해 주세요.')
      w.equipmentMemos = { ...w.equipmentMemos, [id]: value }
    })
  }
  async retryDrafts() {
    const drafts = { ...this.state.drafts }, cardioDrafts = { ...this.state.cardioDrafts }, memos = { ...this.state.memos }, serial = this.draftSerial
    return this.update(workout => {
      for (const [key, value] of Object.entries(drafts)) { const at = key.lastIndexOf(':'); editDraft(workout, key.slice(0, at), Number(key.slice(at + 1)), value) }
      for (const [id, value] of Object.entries(cardioDrafts)) workout.timers[id] = { ...(workout.timers[id] ?? emptyTimer()), ...value }
      workout.equipmentMemos = { ...workout.equipmentMemos, ...memos }
    }, false, Date.now(), {
      committed: () => this.draftSerial === serial ? { drafts: {}, cardioDrafts: {}, memos: {}, unsavedDrafts: false } : undefined,
    })
  }
  async complete(transform: (workout: LocalWorkout, now: number) => void, onFailure?: OnActionFailure) {
    // A failed draft must never silently complete using the older persisted input.
    await this.tail
    if (this.state.unsavedDrafts && !await this.retryDrafts()) {
      onFailure?.({ kind: 'storage', message: '입력값을 이 기기에 보존하지 못했습니다. 저장 상태를 열어 다시 확인해 주세요.' })
      return false
    }
    return this.update(transform, false, Date.now(), undefined, onFailure)
  }
  observeWeightVisibility=(visible:boolean,now=Date.now())=>this.update(w=>weightVisibility(w,visible,now),false,now)
  async settled() { await this.tail }
  flushDrafts = async () => { await this.tail; return !this.state.unsavedDrafts || this.retryDrafts() }
  retrySync = () => this.synchronizer?.retry()
  finish = async (now: number, onFailure?: OnActionFailure) => {
    if (this.state.workout?.finish) { await this.retrySync(); return false }
    if (!await this.flushDrafts()) {
      onFailure?.({ kind: 'storage', message: '입력값을 이 기기에 보존하지 못했습니다. 저장 상태를 열어 다시 확인해 주세요.' })
      return false
    }
    return this.update(w => intendFinish(w, now), false, now, undefined, onFailure)
  }
  async syncSettled() { await this.synchronizer?.settled(); await this.tail }
  resolveApproval = (exerciseId: string, ids: string[], decision: 'KEEP_CURRENT' | 'REAPPROVE', nextWeight: string) => this.synchronizer?.resolve(exerciseId, ids, decision, nextWeight)
  isStopped() { return this.stopped }
  stop() { this.stopped = true; this.generation++; this.synchronizer?.stop(); this.synchronizer = null; this.lease?.release(); this.lease = null }
}
