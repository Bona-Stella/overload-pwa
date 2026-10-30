import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { WorkoutReadApi, WorkoutReadError } from '../src/features/workout-read/api.ts'
import { WorkoutReadController, workoutReadIssue } from '../src/features/workout-read/controller.ts'
import { AuthController } from '../src/features/auth/controller.ts'

const A = '10000000-1111-4222-8333-000000000001', B = '30000000-1111-4222-8333-000000000003'
const ID = '20000000-1111-4222-8333-000000000002', REQUEST = '40000000-1111-4222-8333-000000000004'
const exercises = (userId = A, dataGeneration = '0') => ({ userId, dataGeneration, exercises: [{ id: ID, name: '  벤치프레스 Ω  ' }] })
const settings = (userId = A, dataGeneration = '0') => ({ userId, dataGeneration, restLowSeconds: 17, restMediumSeconds: 29, restHighSeconds: 43 })
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'X-Request-ID': REQUEST, ...headers } })
const gate = () => { let resolve, reject; const promise = new Promise((ok, fail) => { resolve = ok; reject = fail }); return { promise, resolve, reject } }
const tick = () => new Promise(resolve => setImmediate(resolve))
const signal = () => new AbortController().signal

function authFixture() {
  const base = new AuthController().getSnapshot()
  let state = { ...base, status: 'authenticated', userId: A }, restores = 0
  const listeners = new Set()
  const auth = {
    getSnapshot: () => state,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    restore: async () => { restores++; auth.update({ pending: 'restore' }); await tick(); auth.update({ pending: null }) },
    update: patch => { state = { ...state, ...patch }; listeners.forEach(listener => listener()) },
  }
  return { auth, restores: () => restores, listeners }
}

test('two fixed credentialed GETs preserve original UUID/name and edited values without sending owner inputs', async () => {
  const calls = []
  const api = new WorkoutReadApi(async (path, options) => { calls.push([path, options]); return json(path.endsWith('exercises') ? exercises() : settings()) })
  assert.deepEqual(await api.exercises(A, signal()), exercises())
  assert.deepEqual(await api.settings(A, signal()), settings())
  assert.deepEqual(calls.map(([path]) => path), ['/api/v1/exercises', '/api/v1/workout-settings'])
  for (const [, options] of calls) {
    assert.equal(options.method, 'GET'); assert.equal(options.credentials, 'include'); assert.equal(options.cache, 'no-store'); assert.equal(options.redirect, 'error')
    assert.deepEqual(options.headers, { Accept: 'application/json' }); assert.equal(options.body, undefined); assert.ok(options.signal instanceof AbortSignal)
  }
})

test('default fetch is unbound and no browser persistence is consulted', async t => {
  for (const name of ['localStorage', 'sessionStorage', 'indexedDB']) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, { configurable: true, get() { throw Error('demo storage touched') } })
    t.after(() => { if (original) Object.defineProperty(globalThis, name, original); else Reflect.deleteProperty(globalThis, name) })
  }
  t.mock.method(globalThis, 'fetch', function (path) { assert.ok(!(this instanceof WorkoutReadApi)); return Promise.resolve(json(path.endsWith('exercises') ? exercises() : settings())) })
  assert.deepEqual(await new WorkoutReadApi().exercises(A, signal()), exercises())
})

test('large and maximal BIGINT generations remain strings while invalid counters are rejected', async () => {
  for (const counter of ['0', '9007199254740993', '9223372036854775807']) {
    const api = new WorkoutReadApi(async path => json(path.endsWith('exercises') ? exercises(A, counter) : settings(A, counter)))
    assert.equal((await api.exercises(A, signal())).dataGeneration, counter)
    assert.equal((await api.settings(A, signal())).dataGeneration, counter)
  }
  for (const counter of [0, 9007199254740992, '-1', '01', '1.0', '1e3', '', '9223372036854775808', '1'.repeat(100)]) {
    await assert.rejects(new WorkoutReadApi(async () => json(exercises(A, counter))).exercises(A, signal()), error => error.code === 'RESPONSE_INVALID' && error.status === 200)
  }
})

test('wrong owners on either API never become current-user data', async () => {
  for (const endpoint of ['exercises', 'settings']) {
    const api = new WorkoutReadApi(async () => json(endpoint === 'exercises' ? exercises(B) : settings(B)))
    await assert.rejects(api[endpoint](A, signal()), error => error.code === 'OWNER_MISMATCH' && error.requestId === REQUEST)
  }
})

test('empty exercises are valid; duplicate UUIDs, invalid names and malformed lists are not', async () => {
  const empty = { ...exercises(), exercises: [] }
  assert.deepEqual(await new WorkoutReadApi(async () => json(empty)).exercises(A, signal()), empty)
  for (const items of [null, {}, [{ id: 'bad', name: 'x' }], [{ id: ID, name: null }], [{ id: ID, name: '  ' }], [{ id: ID, name: 'x' }, { id: ID.toUpperCase(), name: 'y' }]]) {
    await assert.rejects(new WorkoutReadApi(async () => json({ ...exercises(), exercises: items })).exercises(A, signal()), WorkoutReadError)
  }
})

test('rest settings validate every required positive PostgreSQL INTEGER without defaults', async () => {
  for (const field of ['restLowSeconds', 'restMediumSeconds', 'restHighSeconds']) {
    for (const value of [undefined, null, '180', 0, -1, 1.2, 2147483648]) {
      await assert.rejects(new WorkoutReadApi(async () => json({ ...settings(), [field]: value })).settings(A, signal()), error => error.code === 'RESPONSE_INVALID')
    }
  }
  const maximum = { ...settings(), restLowSeconds: 2147483647 }
  assert.deepEqual(await new WorkoutReadApi(async () => json(maximum)).settings(A, signal()), maximum)
})

for (const status of [400, 401, 403, 500, 503]) {
  test(`HTTP ${status} survives empty, HTML, invalid JSON and unsafe error bodies`, async () => {
    for (const body of ['', '<html>private SQL and email</html>', '{broken', JSON.stringify({ code: '<unsafe>' })]) {
      const api = new WorkoutReadApi(async () => new Response(body, { status, headers: { 'X-Request-ID': REQUEST } }))
      await assert.rejects(api.exercises(A, signal()), error => {
        assert.equal(error.status, status); assert.equal(error.requestId, REQUEST); assert.equal(error.code, 'REQUEST_FAILED')
        assert.doesNotMatch(workoutReadIssue(error).message, /private SQL|email|<html>/); return true
      })
    }
  })
}

test('code-only error and safe Request ID are supported without accepting arbitrary diagnostic text', async () => {
  await assert.rejects(new WorkoutReadApi(async () => json({ code: 'WORKOUT_SETTINGS_MISSING' }, 500)).settings(A, signal()), error => {
    assert.equal(error.code, 'WORKOUT_SETTINGS_MISSING'); assert.equal(error.requestId, REQUEST); assert.match(workoutReadIssue(error).message, /휴식 설정/); return true
  })
  await assert.rejects(new WorkoutReadApi(async () => json({}, 503, { 'X-Request-ID': 'private <html>' })).exercises(A, signal()), error => error.status === 503 && error.requestId === null)
})

test('invalid success bodies, unexpected successful statuses and wrong media types are contract errors', async () => {
  for (const response of [new Response(''), new Response('<html>'), new Response(null, { status: 204 }), json(exercises(), 201), json(null), json(exercises(), 200, { 'Content-Type': 'text/html' })]) {
    await assert.rejects(new WorkoutReadApi(async () => response).exercises(A, signal()), error => error.code === 'RESPONSE_INVALID' && error.status === response.status)
  }
  const future = { ...exercises(), futureField: 'ignored' }
  assert.deepEqual(await new WorkoutReadApi(async () => json(future)).exercises(A, signal()), exercises())
})

test('network, timeout and caller cancellation are distinct safe errors', async () => {
  await assert.rejects(new WorkoutReadApi(async () => { throw Error('private detail') }).exercises(A, signal()), error => error.code === 'NETWORK' && error.status === 0 && !error.message.includes('private'))
  const pendingFetch = (_, options) => new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('cancelled', 'AbortError'))
    if (options.signal.aborted) abort(); else options.signal.addEventListener('abort', abort, { once: true })
  })
  await assert.rejects(new WorkoutReadApi(pendingFetch, 5).exercises(A, signal()), error => error.code === 'TIMEOUT')
  const caller = new AbortController(), promise = new WorkoutReadApi(pendingFetch).settings(A, caller.signal)
  caller.abort()
  await assert.rejects(promise, error => error.code === 'CANCELLED')
})

test('generation mismatch retries one pair and commits only a consistent pair', async () => {
  let count = 0
  const api = { exercises: async () => exercises(A, String(++count)), settings: async () => settings(A, '2') }
  const { auth } = authFixture(), controller = new WorkoutReadController(api), observed = []
  const unsubscribe = controller.subscribe(() => observed.push(controller.getSnapshot()))
  const disconnect = controller.connect(auth)
  await tick()
  assert.equal(count, 2); assert.equal(controller.getSnapshot().status, 'ready'); assert.equal(controller.getSnapshot().data.dataGeneration, '2')
  assert.ok(observed.filter(state => state.status === 'ready').every(state => state.data.dataGeneration === state.data.settings.dataGeneration))
  disconnect(); unsubscribe()
})

test('persistent mismatch stops after four GETs in a sync-check state; only explicit refresh retries', async () => {
  let calls = 0
  const api = { exercises: async () => { calls++; return exercises(A, '1') }, settings: async () => { calls++; return settings(A, '2') } }
  const { auth } = authFixture(), controller = new WorkoutReadController(api), disconnect = controller.connect(auth)
  await tick(); await tick()
  assert.equal(calls, 4); assert.equal(controller.getSnapshot().status, 'sync-check'); assert.equal(controller.getSnapshot().data, null)
  await controller.refresh(); assert.equal(calls, 8)
  disconnect()
})

test('an error on either GET never exposes a partial successful pair and 503 never restores authentication', async () => {
  const { auth, restores } = authFixture()
  for (const side of ['exercises', 'settings']) {
    const api = { exercises: async () => exercises(), settings: async () => settings(), [side]: async () => { throw new WorkoutReadError('WORKOUT_DATA_UNAVAILABLE', 503) } }
    const controller = new WorkoutReadController(api), disconnect = controller.connect(auth)
    await tick(); assert.equal(controller.getSnapshot().status, 'error'); assert.equal(controller.getSnapshot().issue.status, 503); assert.equal(controller.getSnapshot().data, null)
    disconnect()
  }
  assert.equal(restores(), 0)
})

test('401 takes priority over concurrent 503, rechecks once and never auto-loops on the same account', async () => {
  const { auth, restores } = authFixture(); let calls = 0
  const controller = new WorkoutReadController({ exercises: async () => { calls++; throw new WorkoutReadError('UNAVAILABLE', 503) }, settings: async () => { calls++; throw new WorkoutReadError('AUTHENTICATION_REQUIRED', 401) } })
  const disconnect = controller.connect(auth)
  await tick(); await tick(); await tick()
  assert.equal(restores(), 1); assert.equal(calls, 2); assert.equal(controller.getSnapshot().issue.status, 401)
  await controller.refresh(); await tick(); assert.equal(restores(), 2); assert.equal(calls, 4)
  disconnect()
})

for (const outcome of ['success', '401', '503', 'network']) {
  test(`late ${outcome} from account A cannot change account B or trigger session restoration`, async () => {
    const old = gate(), signals = []
    const api = {
      exercises: (owner, signal) => { signals.push(signal); return owner === A ? old.promise : Promise.resolve(exercises(B)) },
      settings: async owner => settings(owner),
    }
    const { auth, restores } = authFixture(), controller = new WorkoutReadController(api), disconnect = controller.connect(auth)
    auth.update({ pending: 'logout' })
    assert.equal(controller.getSnapshot().data, null); assert.ok(signals[0].aborted)
    auth.update({ status: 'anonymous', userId: null, pending: null })
    auth.update({ status: 'authenticated', userId: B })
    await tick(); assert.equal(controller.getSnapshot().userId, B)
    if (outcome === 'success') old.resolve(exercises(A))
    else old.reject(outcome === 'network' ? Error('late network') : new WorkoutReadError('REQUEST_FAILED', Number(outcome)))
    await tick(); assert.equal(controller.getSnapshot().status, 'ready'); assert.equal(controller.getSnapshot().userId, B); assert.equal(restores(), 0)
    disconnect()
  })
}

test('same-user logout/relogin and explicit refresh discard prior request generations even when abort is ignored', async () => {
  const pending = [], api = { exercises: () => { const item = gate(); pending.push(item); return item.promise }, settings: async () => settings() }
  const { auth } = authFixture(), controller = new WorkoutReadController(api), disconnect = controller.connect(auth)
  auth.update({ pending: 'logout' }); auth.update({ status: 'anonymous', userId: null, pending: null }); auth.update({ status: 'authenticated', userId: A })
  const latest = controller.refresh()
  pending[2].resolve({ ...exercises(), exercises: [] }); await latest
  pending[0].resolve(exercises()); pending[1].reject(new WorkoutReadError('AUTHENTICATION_REQUIRED', 401)); await tick()
  assert.deepEqual(controller.getSnapshot().data.exercises, [])
  disconnect()
})

test('disconnect aborts and clears data; reconnect works under StrictMode effect cleanup', async () => {
  const pending = gate(); let captured
  const { auth, listeners } = authFixture(), controller = new WorkoutReadController({ exercises: (_, signal) => { captured = signal; return pending.promise }, settings: async () => settings() })
  const first = controller.connect(auth); first()
  assert.equal(listeners.size, 0); assert.ok(captured.aborted); assert.equal(controller.getSnapshot().data, null)
  const second = controller.connect(auth); pending.resolve(exercises()); await tick()
  assert.equal(controller.getSnapshot().status, 'ready'); second(); assert.equal(listeners.size, 0)
})

test('actual AuthController logout clears workout data before its HTTP request finishes', async () => {
  const stopped = gate(); let session = { userId: A }
  const auth = new AuthController({ session: async () => session, refreshCsrf: async () => {}, logout: async () => { await stopped.promise; session = null } })
  await auth.start()
  const controller = new WorkoutReadController({ exercises: async () => exercises(), settings: async () => settings() }), disconnect = controller.connect(auth)
  await tick(); assert.equal(controller.getSnapshot().status, 'ready')
  const loggingOut = auth.logout()
  assert.equal(auth.getSnapshot().pending, 'logout'); assert.equal(controller.getSnapshot().data, null)
  stopped.resolve(); await loggingOut; assert.equal(auth.getSnapshot().status, 'anonymous'); disconnect()
})

test('read-only feature has no demo-model or browser-storage dependency', () => {
  for (const file of ['api.ts', 'controller.ts', 'WorkoutOverview.tsx']) {
    const source = readFileSync(new URL(`../src/features/workout-read/${file}`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|overload\.core|useWorkout|from ['"]\.\.\/workout\/|method: ['"](?:POST|PATCH|DELETE)/)
  }
})
