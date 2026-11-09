import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AuthApi } from '../src/features/auth/api.ts'
import { AuthController } from '../src/features/auth/controller.ts'
import { StatisticsApi } from '../src/features/statistics/api.ts'
import { WeeklyScheduleApi } from '../src/features/statistics/weekly-schedule.ts'
import { USER, OTHER, ROUTINE, EXERCISE, PLACEMENT, scope } from './fixtures/workout-online-data.mjs'

const csrf = { headerName: 'X-CSRF-TOKEN', token: 'test-csrf-only' }
const period = { fromDate: '2026-10-26', toDateExclusive: '2026-11-02' }
const zone = 'Asia/Seoul'
const signal = () => new AbortController().signal
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } })
const preset = { id: ROUTINE, displayOrder: 1, presetVersion: '0', rotationIncluded: false, assignments: [] }
const schedule = () => ({ dataGeneration: scope.dataGeneration, stateVersion: '0', activePresetId: ROUTINE, autoEnabled: false,
  timeZone: zone, appliedAt: null, appliedScheduleVersion: null, nextRotationAt: null, presets: [preset] })
const envelope = () => ({ ...scope, period: '3', range: { fromDate: '2026-08-03', toDateExclusive: '2026-11-04', timeZone: zone } })
const placement = { routineId: ROUTINE, placementId: PLACEMENT, routineName: '운동 루틴', deleted: false, lastApprovalAt: '2026-11-01T00:00:00Z' }
const overview = () => ({ statistics: {
  ...scope, ...period, planCoverage: 'PARTIAL_SCHEDULE_HISTORY', plannedWorkoutDays: null, routineAchievementPercent: null,
  summary: { plannedSets: '0', completedSets: '0', reps: '0', volumeLoadKg: null, setsWithoutVolume: '0' },
  cardioActiveMs: '0', unmappedCompletedSets: '0', days: [], exercises: [], muscles: [], groups: [], cardio: [], recentSessions: [],
}, effectiveWorkoutDays: null, unknownPlanDays: 7, unverifiableDays: 0, plannedDays: [], cardioByKind: [] })

// Only the network is substituted: feature API -> AuthController -> AuthApi -> fetch.
async function connected(handler, { userId = USER, boundary } = {}) {
  const calls = []
  const api = new AuthApi(async (path, init) => {
    calls.push({ path, init })
    if (path === '/api/v1/auth/session') return userId ? json({ userId }) : json({ code: 'AUTHENTICATION_REQUIRED' }, 401)
    if (path === '/api/v1/auth/csrf') return json(csrf)
    return handler(path, init)
  })
  const controller = new AuthController(api, undefined, () => {}, () => {}, boundary)
  await controller.start()
  return { api, controller, calls, statistics: new StatisticsApi(controller), weekly: new WeeklyScheduleApi(controller), setUser: value => { userId = value } }
}

test('overview reaches real authenticated transport with its date query and credential/cache policy', async () => {
  const expected = overview(), f = await connected(() => json(expected))
  assert.deepEqual(await f.statistics.overview(scope, period, signal()), expected)
  const { path, init } = f.calls.at(-1)
  assert.equal(path, '/api/v1/statistics/overview?' + new URLSearchParams(period))
  assert.equal(init.method, 'GET'); assert.equal(init.body, undefined)
  assert.equal(init.credentials, 'include'); assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error')
  assert.equal(init.headers.Accept, 'application/json'); assert.equal(init.headers[csrf.headerName], undefined)
})

test('all growth routes traverse real transport without changing encoded search, timezone, IDs or pagination', async () => {
  const query = '벤치 + /?#% Ω', f = await connected(path => {
    const url = new URL(path, 'https://local.invalid')
    assert.equal(url.searchParams.get('period'), '3'); assert.equal(url.searchParams.get('timeZone'), zone)
    if (url.pathname.endsWith('/placements/' + PLACEMENT)) return json({ ...envelope(), standardExerciseId: EXERCISE, placement, offset: 100, points: [], nextOffset: null })
    if (url.pathname.endsWith('/' + EXERCISE)) return json({ ...envelope(), standardExerciseId: EXERCISE, name: '벤치프레스', placements: [placement] })
    return json({ ...envelope(), query, offset: 50, exercises: [], nextOffset: null })
  })
  const growth = f.statistics.growth
  assert.equal((await growth.search(scope, '3', zone, query, 50, signal())).query, query)
  assert.equal(f.calls.at(-1).path, '/api/v1/statistics/growth/exercises?' + new URLSearchParams({ period: '3', timeZone: zone, q: query, offset: '50' }))
  assert.deepEqual((await growth.options(scope, EXERCISE, '3', zone, signal())).placements, [placement])
  assert.equal(f.calls.at(-1).path, `/api/v1/statistics/growth/exercises/${EXERCISE}?` + new URLSearchParams({ period: '3', timeZone: zone }))
  assert.deepEqual((await growth.history(scope, EXERCISE, placement, '3', zone, 100, signal())).points, [])
  assert.equal(f.calls.at(-1).path, `/api/v1/statistics/growth/exercises/${EXERCISE}/placements/${PLACEMENT}?` + new URLSearchParams({ period: '3', timeZone: zone, offset: '100' }))
  for (const { init } of f.calls.slice(2)) { assert.equal(init.method, 'GET'); assert.equal(init.body, undefined); assert.equal(init.credentials, 'include') }
})

test('V30 schedule uses queryless reads, separate versioned writes, and full server responses', async () => {
  const assignments = [{ dayOfWeek: 2, routineId: ROUTINE }]
  const saved = { ...schedule(), stateVersion: '1', appliedScheduleVersion: '1', appliedAt: '2026-11-06T00:00:00Z',
    presets: [{ ...preset, presetVersion: '1', assignments }] }
  const f = await connected((_path, init) => json(init.method === 'PUT' ? saved : schedule()))
  const base = await f.weekly.read(scope, signal())
  assert.deepEqual(f.calls.slice(-3).map(call => call.path), ['/api/v1/auth/session', '/api/v1/weekly-schedule', '/api/v1/auth/session'])
  const result = await f.weekly.write(scope, base, { type: 'assign', id: ROUTINE, version: '0', assignments }, signal())
  assert.equal(result.activeId, ROUTINE)
  assert.deepEqual(result.presets[0].assignments, assignments)
  const { path, init } = f.calls.at(-2)
  assert.equal(path, '/api/v1/weekly-schedule/presets/' + ROUTINE + '/assignments')
  assert.equal(init.method, 'PUT')
  assert.equal(init.headers[csrf.headerName], csrf.token)
  assert.equal(init.credentials, 'include')
  assert.equal(init.cache, 'no-store')
  assert.deepEqual(JSON.parse(init.body), { dataGeneration: scope.dataGeneration, expectedStateVersion: '0',
    expectedPresetVersion: '0', timeZone: zone, assignments })
})

test('new schedule write requires CSRF and clears a rejected token without replaying the write', async () => {
  const calls = [], api = new AuthApi(async (path, init) => {
    calls.push({ path, init })
    return path === '/api/v1/auth/csrf' ? json(csrf) : json({ code: 'CSRF_INVALID' }, 403)
  })
  await assert.rejects(api.workoutRequest('/api/v1/weekly-schedule/rotation', 'PUT', {}, signal()), { code: 'CSRF_INVALID', status: 403 })
  assert.equal(calls.length, 0)
  await api.refreshCsrf()
  await assert.rejects(api.workoutRequest('/api/v1/weekly-schedule/rotation', 'PUT', {}, signal()), { code: 'CSRF_INVALID', status: 403 })
  assert.equal(calls.at(-1).init.headers[csrf.headerName], csrf.token)
  await assert.rejects(api.workoutRequest('/api/v1/weekly-schedule/rotation', 'PUT', {}, signal()), { code: 'CSRF_INVALID', status: 403 })
  assert.equal(calls.length, 2)
})

test('preset rename sends only the name and expected versions and requires the confirmed name', async () => {
  const before = { ...schedule(), presets: [{ ...preset, name: '01 주간 일정' }] }
  const after = { ...before, presets: [{ ...preset, name: '전신 일정 🏋', presetVersion: '1' }] }
  let confirmed = after
  const f = await connected((_path, init) => json(init.method === 'PUT' ? confirmed : before))
  const base = await f.weekly.read(scope, signal())
  const command = { type: 'rename', id: ROUTINE, name: '　전신 일정 🏋  ' }
  assert.equal(base.renameSupported, true)
  const result = await f.weekly.write(scope, base, command, signal())
  assert.deepEqual(result.presets[0], { ...base.presets[0], name: '전신 일정 🏋', version: '1' })
  assert.equal(result.version, base.version)
  const { path, init } = f.calls.at(-2)
  assert.equal(path, '/api/v1/weekly-schedule/presets/' + ROUTINE + '/name')
  assert.equal(init.headers[csrf.headerName], csrf.token)
  assert.deepEqual(JSON.parse(init.body), {
    dataGeneration: scope.dataGeneration, expectedStateVersion: '0', expectedPresetVersion: '0', name: '전신 일정 🏋',
  })
  for (const invalid of ['　 ', '가'.repeat(101), 'A\nB']) {
    await assert.rejects(f.weekly.write(scope, base, { ...command, name: invalid }, signal()), { code: 'INVALID_REQUEST' })
  }
  confirmed = before
  await assert.rejects(f.weekly.write(scope, base, command, signal()), { code: 'RESPONSE_INVALID' })
  const previous = await connected(() => json(schedule()))
  const old = await previous.weekly.read(scope, signal())
  assert.equal(old.renameSupported, false)
  assert.equal(old.presets[0].name, '01 주간 일정')
  await assert.rejects(previous.weekly.write(scope, old, command, signal()), { code: 'INVALID_REQUEST' })
})

test('new transport allowlist rejects retired, unknown, malformed and wrong-method requests before fetch', async () => {
  const calls = [], api = new AuthApi(async path => { calls.push(path); return json(csrf) })
  await api.refreshCsrf(); calls.length = 0
  const overviewPath = '/api/v1/statistics/overview?fromDate=2026-10-26&toDateExclusive=2026-11-02'
  const growth = '/api/v1/statistics/growth/exercises', query = '?period=3&timeZone=Asia%2FSeoul'
  const reads = [overviewPath, growth + query, `${growth}/${EXERCISE}${query}`, `${growth}/${EXERCISE}/placements/${PLACEMENT}${query}`,
    '/api/v1/weekly-schedule', '/api/v1/deload-analysis', '/api/v1/deload-periods/current']
  const invalid = [
    ...['/api/v1/exercises', `/api/v1/exercises/${EXERCISE}`, '/api/v1/exercises?q=bench', '/api/v1/statistics', '/api/v1/statistics/other', '/api/v1/users', '/api/v1/weekly-schedule/other',
      '/api/v1/weekly-schedule?timeZone=Asia%2FSeoul', '/api/v1/weekly-schedule/history?beforeVersion=2', '/api/v1/statistics/overview', growth + '/', growth + '/not-a-uuid' + query,
      `${growth}/${EXERCISE}/placements/not-a-uuid${query}`, `${growth}/${EXERCISE}/placements/${PLACEMENT}/extra${query}`,
      overviewPath + '&userId=' + USER, overviewPath + '&fromDate=2026-10-26', overviewPath + '#fragment', overviewPath + '#',
      '/api/v1/statistics/overview/?fromDate=2026-10-26&toDateExclusive=2026-11-02', '/api/v1/weekly-schedule?timeZone=UTC&timeZone=Asia%2FSeoul',
      growth + query + '&dataGeneration=0', `${growth}/${EXERCISE}${query}&offset=0`,
      'https://untrusted.test' + overviewPath, '//untrusted.test' + overviewPath, '/api/v1/other/../statistics/overview?fromDate=2026-10-26&toDateExclusive=2026-11-02',
      '/api/v1/statistics\\overview?fromDate=2026-10-26&toDateExclusive=2026-11-02', overviewPath + '\n',
    ].map(path => [path, 'GET', undefined]),
    ...reads.flatMap(path => ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'get'].map(method => [path, method, {}])),
    ...['POST', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(method => ['/api/v1/weekly-schedule', method, {}]),
    ['/api/v1/weekly-schedule?timeZone=UTC', 'PUT', {}], ['/api/v1/weekly-schedule/rotation', 'PUT', undefined],
    ...['GET', 'PATCH', 'DELETE'].map(method => ['/api/v1/weekly-schedule/presets/' + ROUTINE + '/name', method, {}]),
    ...reads.map(path => [path, 'GET', {}]),
  ]
  for (const [path, method, body] of invalid) await assert.rejects(api.workoutRequest(path, method, body, signal()), { code: 'INVALID_REQUEST', status: 400 }, `${method} ${path}`)
  assert.equal(calls.length, 0)
})

for (const kind of ['overview', 'growth', 'schedule']) {
  test(`${kind} keeps response validation and owner/generation fences through real transport`, async () => {
    const valid = kind === 'overview' ? overview() : kind === 'growth' ? { ...envelope(), query: '', offset: 0, exercises: [], nextOffset: null } : schedule()
    const read = f => kind === 'overview' ? f.statistics.overview(scope, period, signal()) : kind === 'growth' ? f.statistics.growth.search(scope, '3', zone, '', 0, signal()) : f.weekly.read(scope, signal())
    for (const [patch, code] of [[{ userId: OTHER }, 'OWNER_MISMATCH'], [{ dataGeneration: '0' }, 'DATA_GENERATION_MISMATCH']]) {
      if (kind === 'schedule' && code === 'OWNER_MISMATCH') continue
      const data = structuredClone(valid)
      Object.assign(kind === 'overview' ? data.statistics : data, patch)
      const f = await connected(() => json(data))
      await assert.rejects(read(f), { code })
    }
    const malformed = await connected(() => json({}))
    await assert.rejects(read(malformed), { code: 'RESPONSE_INVALID' })
    const html = await connected(() => json(valid, 200, { 'Content-Type': 'text/html' }))
    await assert.rejects(read(html), { code: 'RESPONSE_INVALID' })
    const brokenJson = await connected(() => new Response('{', { headers: { 'Content-Type': 'application/json' } }))
    await assert.rejects(read(brokenJson), { code: 'RESPONSE_INVALID' })
  })
}

test('statistics 401 crosses the existing session boundary and blocks further authenticated requests', async () => {
  let denied = 0
  const f = await connected(() => json({ code: 'AUTHENTICATION_REQUIRED' }, 401), { boundary: { identity: async () => {}, deny: async () => { denied++ } } })
  await assert.rejects(f.statistics.overview(scope, period, signal()), { code: 'AUTHENTICATION_REQUIRED', status: 401 })
  assert.equal(denied, 1); assert.equal(f.controller.getSnapshot().status, 'unavailable')
  const count = f.calls.length
  await assert.rejects(f.weekly.read(scope, signal()), { code: 'REQUEST_SUPERSEDED' })
  assert.equal(f.calls.length, count)
})

test('anonymous and offline states cannot send statistics or schedule requests', async () => {
  const anonymous = await connected(() => { throw new Error('must not send') }, { userId: null })
  const count = anonymous.calls.length
  await assert.rejects(anonymous.statistics.overview(scope, period, signal()), { code: 'REQUEST_SUPERSEDED' })
  await assert.rejects(anonymous.weekly.write(scope, {version:'0',timeZone:zone}, {type:'add'}, signal()), { code: 'REQUEST_SUPERSEDED' })
  assert.equal(anonymous.calls.length, count)
  const offline = await connected(() => { throw new TypeError('offline') })
  await assert.rejects(offline.statistics.overview(scope, period, signal()), { code: 'NETWORK' })
  assert.equal(offline.controller.getSnapshot().offlineNetworkFailure, true)
  const offlineCount = offline.calls.length
  await assert.rejects(offline.weekly.read(scope, signal()), { code: 'NETWORK' })
  await assert.rejects(offline.weekly.write(scope, {version:'0',timeZone:zone}, {type:'add'}, signal()), { code: 'NETWORK' })
  assert.equal(offline.calls.length, offlineCount)
})

test('weekly write detects an account change before sending and server conflicts retain their error codes', async () => {
  const changed = await connected(() => { throw new Error('must not send') })
  changed.setUser(OTHER)
  await assert.rejects(changed.weekly.write(scope, {version:'0',timeZone:zone}, {type:'add'}, signal()), { code: 'SESSION_CHANGED', status: 409 })
  assert.equal(changed.calls.filter(c => c.init.method === 'POST').length, 0)
  const conflict = await connected(() => json({ code: 'VERSION_CONFLICT' }, 409))
  await assert.rejects(conflict.weekly.write(scope, {version:'0',timeZone:zone}, {type:'add'}, signal()), { code: 'VERSION_CONFLICT', status: 409 })
  assert.equal(conflict.calls.filter(c => c.init.method === 'POST').length, 1)
})

test('aborting a real statistics request propagates cancellation and rejects the obsolete response', async () => {
  let networkSignal
  const f = await connected((_path, init) => new Promise((_resolve, reject) => {
    networkSignal = init.signal
    init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  }))
  const controller = new AbortController(), request = f.statistics.overview(scope, period, controller.signal)
  assert.ok(networkSignal); controller.abort()
  await assert.rejects(request, { code: 'REQUEST_SUPERSEDED' })
  assert.equal(networkSignal.aborted, true)
})

test('account restoration supersedes an already pending growth response', async () => {
  let resolve
  const f = await connected(() => new Promise(r => { resolve = r }))
  const request = f.statistics.growth.search(scope, '3', zone, '', 0, signal())
  f.setUser(OTHER); await f.controller.resume()
  resolve(json({ ...envelope(), query: '', offset: 0, exercises: [], nextOffset: null }))
  await assert.rejects(request, { code: 'REQUEST_SUPERSEDED' })
  assert.equal(f.controller.getSnapshot().userId, OTHER)
})
