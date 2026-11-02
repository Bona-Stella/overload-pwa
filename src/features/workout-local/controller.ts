import { LocalStoreError, LocalWriteBlocked, WorkoutStore } from '../workout-online/storage.ts'
import type { Session } from '../workout-online/types.ts'
import { applyLocalChange, editDraft, emptyTimer } from './model.ts'
import { intendFinish } from './sync-state.ts'
import { acquireEditor } from './lock.ts'
import type { EditorLease } from './lock.ts'
import type { CardioTimer, LocalKey, LocalWorkout, RestPolicy, SetDraft } from './types.ts'
import { WorkoutSynchronizer } from './sync.ts'
import type { SyncOptions, SyncStatus } from './sync.ts'

type Store = Pick<WorkoutStore, 'openLocal' | 'readLocal' | 'saveLocal'> & Partial<Pick<WorkoutStore, 'saveSyncLocal' | 'saveSession'>>
export type EditorState = { workout: LocalWorkout | null; writable: boolean; loading: boolean; pending: number; issue: string | null;
  drafts: Record<string, SetDraft>; cardioDrafts: Record<string, Partial<CardioTimer>>; unsavedDrafts: boolean; syncStatus?: SyncStatus; syncIssue?: string | null }
/** Serial local transactions. Completion UI only observes committed documents; the sender follows durable changes. */
export class LocalWorkoutController {
  private state: EditorState = { workout: null, writable: false, loading: true, pending: 0, issue: null, drafts: {}, cardioDrafts: {}, unsavedDrafts: false }
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
      const workout = await this.store.openLocal(server, policy, this.allowed)
      if (generation === this.generation) this.set({ workout, loading: false, writable: this.allowed() })
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
    finally { opened() }
  }
  change = (transform: (workout: LocalWorkout) => void): Promise<boolean> => {
    return this.update(transform, false)
  }
  private update(transform: (workout: LocalWorkout) => void, sync: boolean): Promise<boolean> {
    if (!this.allowed() || !this.state.writable) return Promise.resolve(false)
    const generation = this.generation
    const allowed = () => generation === this.generation && this.allowed()
    this.set({ pending: this.state.pending + 1 })
    const operation = this.tail.then(async () => {
      if (!allowed() || !this.state.workout || !this.state.writable || !sync && this.state.workout.finish) return false
      try {
        const previous = this.state.workout, next = applyLocalChange(previous, transform)
        if (sync) {
          if (!this.store.saveSyncLocal || !this.store.saveSession) throw new LocalStoreError()
          await this.store.saveSyncLocal(next, previous.editVersion, allowed)
        } else await this.store.saveLocal(next, previous.editVersion, allowed)
        if (!allowed()) return false
        this.set({ workout: next, issue: null })
        if (!sync && (next.localRevision !== previous.localRevision || !previous.finish && next.finish)) this.synchronizer?.request()
        return true
      } catch (error) {
        if (error instanceof LocalWriteBlocked) { this.lease?.release(); this.lease = null }
        this.set({ issue: error instanceof Error ? error.message : new LocalStoreError().message,
          ...(error instanceof LocalWriteBlocked ? { writable: false } : {}) })
        return false
      }
    }).finally(() => this.set({ pending: Math.max(0, this.state.pending - 1) }))
    this.tail = operation; return operation
  }
  draft(id: string, ordinal: number, value: SetDraft) {
    if (!this.allowed() || !this.state.writable || this.state.workout?.finish) return
    const key = `${id}:${ordinal}`; this.draftSerial++
    this.set({ drafts: { ...this.state.drafts, [key]: value }, unsavedDrafts: true })
    void this.change(workout => editDraft(workout, id, ordinal, value)).then(saved => {
      if (saved && this.state.drafts[key] === value) {
        const drafts = { ...this.state.drafts }; delete drafts[key]
        this.set({ drafts, unsavedDrafts: Object.keys(drafts).length + Object.keys(this.state.cardioDrafts).length > 0 })
      }
    })
  }
  cardioDraft(id: string, patch: Pick<Partial<CardioTimer>, 'distance' | 'speed' | 'bpm' | 'correctedSeconds'>) {
    if (!this.allowed() || !this.state.writable || this.state.workout?.finish) return
    this.draftSerial++
    const value = { ...this.state.cardioDrafts[id], ...patch }
    this.set({ cardioDrafts: { ...this.state.cardioDrafts, [id]: value }, unsavedDrafts: true })
    void this.change(workout => { workout.timers[id] = { ...(workout.timers[id] ?? emptyTimer()), ...value } }).then(saved => {
      if (saved && this.state.cardioDrafts[id] === value) {
        const cardioDrafts = { ...this.state.cardioDrafts }; delete cardioDrafts[id]
        this.set({ cardioDrafts, unsavedDrafts: Object.keys(cardioDrafts).length + Object.keys(this.state.drafts).length > 0 })
      }
    })
  }
  async retryDrafts() {
    const drafts = { ...this.state.drafts }, cardioDrafts = { ...this.state.cardioDrafts }, serial = this.draftSerial
    const saved = await this.change(workout => {
      for (const [key, value] of Object.entries(drafts)) { const at = key.lastIndexOf(':'); editDraft(workout, key.slice(0, at), Number(key.slice(at + 1)), value) }
      for (const [id, value] of Object.entries(cardioDrafts)) workout.timers[id] = { ...(workout.timers[id] ?? emptyTimer()), ...value }
    })
    if (saved && this.draftSerial === serial) this.set({ drafts: {}, cardioDrafts: {}, unsavedDrafts: false })
    return saved
  }
  async complete(transform: (workout: LocalWorkout) => void) {
    // A failed draft must never silently complete using the older persisted input.
    await this.tail
    if (this.state.unsavedDrafts && !await this.retryDrafts()) return false
    return this.change(transform)
  }
  async settled() { await this.tail }
  flushDrafts = async () => { await this.tail; return !this.state.unsavedDrafts || this.retryDrafts() }
  retrySync = () => this.synchronizer?.retry()
  finish = async (now: number) => {
    if (this.state.workout?.finish) { await this.retrySync(); return false }
    if (!await this.flushDrafts()) return false
    return this.change(w => intendFinish(w, now))
  }
  async syncSettled() { await this.synchronizer?.settled(); await this.tail }
  resolveApproval = (exerciseId: string, ids: string[], decision: 'KEEP_CURRENT' | 'REAPPROVE', nextWeight: string) => this.synchronizer?.resolve(exerciseId, ids, decision, nextWeight)
  isStopped() { return this.stopped }
  stop() { this.stopped = true; this.generation++; this.synchronizer?.stop(); this.synchronizer = null; this.lease?.release(); this.lease = null }
}
