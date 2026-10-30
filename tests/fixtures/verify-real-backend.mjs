// Opt-in audit verifier. Run after the real browser flow; this does not make HTTP or DB requests.
import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const runtime = resolve('logs/task-008-1c')
const backend = resolve('../overload-server/build/task-008-1c')
const evidence = resolve('docs/tasks/evidence/task-008-1c')
const snapshot = async name => JSON.parse(await readFile(resolve(backend, `${name}.json`), 'utf8')).snapshot
const events = (await readFile(resolve(runtime, 'http.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).sort((a, b) => a.sequence - b.sequence)
const seed = await snapshot('a-seed'), edited = await snapshot('a-after-edit')
const reloaded = await snapshot('a-after-reload'), missing = await snapshot('a-missing-after-get')
const loggedOut = await snapshot('after-a-logout'), activeB = await snapshot('b-active')
const revoked = await snapshot('b-revoked'), relogin = await snapshot('a-relogin'), final = await snapshot('final')
const ownerA = seed.users[0].id, ownerB = activeB.users.find(user => user.id !== ownerA).id
const owned = (rows, owner) => rows.filter(row => row.user_id === owner)
const checks = []
function check(name, run) { run(); checks.push({ name, result: 'PASS' }) }
function get(path, userId, occurrence = 0) {
  const found = events.filter(event => event.path === path && event.status === 200 && event.body?.userId === userId)[occurrence]
  assert.ok(found, `Missing successful ${path}`)
  return found
}
check('real PostgreSQL seed: 20 exercises and 1 settings row', () => {
  assert.equal(seed.users.length, 1); assert.equal(seed.exercises.length, 20); assert.equal(seed.settings.length, 1)
  assert.deepEqual(seed.settings.map(row => [row.rest_low_seconds, row.rest_medium_seconds, row.rest_high_seconds]), [[180, 120, 90]])
  assert.deepEqual(get('/api/v1/exercises', ownerA).body.exercises, seed.exercises.map(row => ({ id: row.id, name: row.name })))
})
check('every successful workout response matches the authenticated session owner and generation string', () => {
  let owner
  for (const event of events) {
    if (event.path === '/api/v1/auth/session') owner = event.status === 200 ? event.body.userId : undefined
    if (event.status === 200 && ['/api/v1/exercises', '/api/v1/workout-settings'].includes(event.path)) {
      assert.equal(event.body.userId, owner); assert.equal(event.body.dataGeneration, '0')
      assert.equal(typeof event.body.dataGeneration, 'string'); assert.equal(event.sentSessionCookie, true)
      if (event.path.endsWith('/exercises')) assert.equal(event.body.exercises.length, 20)
    }
  }
})
check('stored edits survive reload and relogin with identical UUIDs and timestamps', () => {
  assert.deepEqual(reloaded.exercises, edited.exercises); assert.deepEqual(reloaded.settings, edited.settings)
  assert.deepEqual(owned(relogin.exercises, ownerA), edited.exercises)
  assert.deepEqual(owned(relogin.settings, ownerA), edited.settings)
  const lastExercises = events.filter(event => event.path === '/api/v1/exercises' && event.status === 200).at(-1).body.exercises
  assert.deepEqual(lastExercises, edited.exercises.map(row => ({ id: row.id, name: row.name })))
})
check('A and B have disjoint UUIDs and independent stored settings', () => {
  const aIds = new Set(owned(activeB.exercises, ownerA).map(row => row.id))
  const bRows = owned(activeB.exercises, ownerB)
  assert.equal(bRows.length, 20); assert.ok(bRows.every(row => !aIds.has(row.id) && row.name !== '격리 검증 A 전용 종목'))
  assert.deepEqual(owned(activeB.settings, ownerB).map(row => [row.rest_low_seconds, row.rest_medium_seconds, row.rest_high_seconds]), [[180, 120, 90]])
  const lastSettings = events.filter(event => event.path === '/api/v1/workout-settings' && event.status === 200).at(-1).body
  assert.deepEqual([lastSettings.restLowSeconds, lastSettings.restMediumSeconds, lastSettings.restHighSeconds], [17, 29, 43])
})
check('actual missing settings is 500 without read-time repair', () => {
  assert.equal(missing.settings.length, 0)
  assert.ok(events.some(event => event.status === 500 && event.body?.code === 'WORKOUT_SETTINGS_MISSING'))
})
check('actual disconnected PostgreSQL read is 503 with a successful later retry', () => {
  const failure = events.find(event => event.status === 503 && event.body?.code === 'WORKOUT_DATA_UNAVAILABLE')
  assert.ok(failure)
  assert.ok(events.some(event => event.sequence > failure.sequence && event.path === failure.path && event.status === 200))
})
check('OTP rejection, three real successful logins, and session rotation', () => {
  const verify = events.filter(event => event.path === '/api/v1/auth/email-otp/verify')
  assert.equal(verify.filter(event => event.status === 401).length, 1)
  assert.equal(verify.filter(event => event.status === 204).length, 3)
  for (const event of verify.filter(event => event.status === 204)) {
    const cookie = event.setCookies.find(cookie => cookie.name === 'SESSION')
    assert.ok(cookie.cookieSha256); assert.notEqual(cookie.cookieSha256, event.cookieSha256)
    for (const attribute of ['HttpOnly', 'SameSite=Lax', 'Path=/']) assert.ok(cookie.attributes.includes(attribute))
    const lifetime = Number(cookie.attributes.find(value => value.startsWith('Max-Age=')).split('=')[1])
    assert.ok(lifetime > 7775900 && lifetime <= 7776000)
  }
})
check('actual request cookies match JDBC session rows for A and B', () => {
  for (const [state, owner] of [[seed, ownerA], [activeB, ownerB], [relogin, ownerA]]) {
    const session = state.sessions.find(session => session.userId === owner)
    assert.ok(session)
    assert.ok(events.some(event => event.path === '/api/v1/exercises' && event.body?.userId === owner && event.cookieSha256 === session.cookieSha256))
  }
})
check('logout and server-side revocation leave no authenticated JDBC session', () => {
  assert.equal(loggedOut.sessions.filter(session => session.userId).length, 0)
  assert.equal(revoked.sessions.filter(session => session.userId).length, 0)
  assert.equal(final.sessions.filter(session => session.userId).length, 0)
  for (const path of ['/api/v1/exercises', '/api/v1/workout-settings']) assert.ok(events.some(event => event.path === path && event.status === 401))
  assert.equal(events.filter(event => event.path === '/api/v1/auth/logout' && event.status === 204).length, 2)
})
check('all actual responses carry unique UUID request IDs and security/cache headers', () => {
  assert.equal(events.length, 52)
  assert.equal(new Set(events.map(event => event.requestId)).size, events.length)
  for (const event of events) {
    assert.match(event.requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    assert.ok(event.cacheControl.includes('no-store')); assert.equal(event.nosniff, 'nosniff'); assert.equal(event.frameOptions, 'DENY')
  }
})
check('final data preserved without duplicate provisioning or workout writes', () => {
  assert.equal(final.users.length, 2); assert.equal(final.exercises.length, 40); assert.equal(final.settings.length, 2)
  assert.equal(final.identities.length, 2)
  assert.deepEqual(final.exercises, activeB.exercises); assert.deepEqual(final.settings, activeB.settings)
  assert.ok(events.every(event => event.method === 'GET' || event.path.startsWith('/api/v1/auth/')))
})
// Exclude session cookie hashes as well as all OTP/CSRF bodies and request bodies from retained evidence.
const sanitized = events.map(event => ({
  ...Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'cookieSha256' && key !== 'setCookies')),
  setCookies: event.setCookies.map(({ name, attributes }) => ({ name, attributes })),
}))
await mkdir(evidence, { recursive: true })
await writeFile(resolve(evidence, 'actual-http.json'), JSON.stringify({ source: 'real Spring Boot HTTP through passive Vite proxy; disposable PostgreSQL 18.6', checks, events: sanitized }, null, 2) + '\n')
console.log(JSON.stringify({ actualHttpResponses: events.length, auditChecksPassed: checks.length, retainedCookieValues: false }))
