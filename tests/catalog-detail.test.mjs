import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AuthApi } from '../src/features/auth/api.ts'
import { WorkoutApi } from '../src/features/workout-online/api.ts'
import { catalogDetailView } from '../src/features/workout-online/catalog-browse.ts'

const user = '80000000-1111-4222-8333-000000000001'
const id = '2d04629b-b651-811b-8e66-3d56102988a8'
const muscle = n => ({ id: `d3200000-0000-4000-8000-${String(n).padStart(12, '0')}`, groupCode: 'BACK', name: '근육 ' + n })
const detail = () => ({ id, name: '머신 하이 로우', aliases: ['high row'], exerciseType: 'WEIGHT', recordMethod: 'SETS_REPS',
  equipmentDescription: null, jointType: 'COMPOUND', pplSplit: 'PULL', frontBackSplit: 'BACK', selectableForRoutine: true,
  primaryMuscles: [{ ...muscle(2), primaryOrder: 2 }, { ...muscle(1), primaryOrder: 1 }], secondaryMuscles: [muscle(3)],
  instructionSteps: ['1. 첫 단계. 문장 안의 점은 유지합니다.', '두 번째 단계\n같은 단계의 설명입니다.'] })
const signal = new AbortController().signal

test('UUID detail uses only an authenticated exact GET, cookies, no-store and the cancellation signal', async () => {
  const requests = [], wire = detail()
  const auth = new AuthApi(async (path, init) => {
    requests.push({ path, init })
    return new Response(JSON.stringify(wire), { headers: { 'Content-Type': 'application/json' } })
  })
  const api = new WorkoutApi({ workoutRequest: (owner, ...args) => { assert.equal(owner, user); return auth.workoutRequest(...args) } })
  assert.deepEqual(await api.exerciseDetail(user, id, signal), wire)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].path, '/api/v1/standard-exercises/' + id)
  assert.equal(requests[0].init.method, 'GET')
  assert.equal(requests[0].init.credentials, 'include')
  assert.equal(requests[0].init.cache, 'no-store')
  const path = requests[0].path
  for (const [p, method, body] of [[path, 'POST', {}], [path, 'GET', {}], [path + '?q=x', 'GET'], [path + '#x', 'GET'],
    [path + '/media', 'GET'], ['/api/v1/standard-exercises/not-a-uuid', 'GET']]) {
    await assert.rejects(auth.workoutRequest(p, method, body, signal), { code: 'INVALID_REQUEST' })
  }
  await assert.rejects(api.exerciseDetail(user, '../media', signal), { code: 'INVALID_REQUEST' })
  assert.equal(requests.length, 1)
})

test('detail rendering preserves ordered muscles, optional values and native instruction steps without list fallbacks', async () => {
  const wire = detail(), before = structuredClone(wire)
  const api = new WorkoutApi({ workoutRequest: async () => ({ status: 200, data: wire }) })
  const view = catalogDetailView(await api.exerciseDetail(user, id, signal))
  assert.deepEqual(view.muscles.map(m => [m.id, m.role]), [[muscle(1).id, 'PRIMARY'], [muscle(2).id, 'PRIMARY'], [muscle(3).id, 'SECONDARY']])
  assert.deepEqual(view.instructionSteps, wire.instructionSteps)
  assert.equal(view.instructionsKo, null)
  assert.equal(view.pplSplit, 'PULL')
  assert.deepEqual(wire, before)
  Object.assign(wire, { aliases: [], primaryMuscles: [], secondaryMuscles: [], instructionSteps: [],
    equipmentDescription: null, pplSplit: null, frontBackSplit: null, jointType: 'OTHER', selectableForRoutine: false })
  const empty = catalogDetailView(await api.exerciseDetail(user, id, signal))
  assert.deepEqual(empty.muscles, [])
  assert.deepEqual(empty.instructionSteps, [])
  assert.equal(empty.pplSplit, null)
})

test('detail validates the UUID, required nullable fields, enums, unique muscles and PRIMARY order', async () => {
  for (const mutate of [d => { d.id = user }, d => { delete d.equipmentDescription }, d => { d.jointType = 'UNKNOWN' },
    d => { d.instructionSteps = null }, d => { d.primaryMuscles[0].primaryOrder = 0 },
    d => { d.primaryMuscles[0].primaryOrder = 1 }, d => { d.secondaryMuscles.push(muscle(3)) },
    d => { d.pplSplit = 'OTHER' }, d => { d.selectableForRoutine = undefined }]) {
    const wire = detail(); mutate(wire)
    await assert.rejects(new WorkoutApi({ workoutRequest: async () => ({ status: 200, data: wire }) }).exerciseDetail(user, id, signal), { code: 'RESPONSE_INVALID' })
  }
})

test('detail preserves 401, 403, 404 and transport failures instead of using catalog or Mock data', async () => {
  for (const [status, code] of [[401, 'AUTHENTICATION_REQUIRED'], [403, 'ACCESS_DENIED'], [404, 'EXERCISE_NOT_FOUND']]) {
    const auth = new AuthApi(async () => new Response(JSON.stringify({ code }), { status, headers: { 'Content-Type': 'application/json' } }))
    const api = new WorkoutApi({ workoutRequest: (_user, ...args) => auth.workoutRequest(...args) })
    await assert.rejects(api.exerciseDetail(user, id, signal), { status, code })
  }
  const auth = new AuthApi(async () => { throw Error('offline') })
  const api = new WorkoutApi({ workoutRequest: (_user, ...args) => auth.workoutRequest(...args) })
  await assert.rejects(api.exerciseDetail(user, id, signal), { code: 'NETWORK' })
  const abort = new AbortController()
  let cancelled = false
  const pending = new WorkoutApi({ workoutRequest: async (_user, _path, _method, _body, signal) => {
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => { cancelled = true; reject(Error('aborted')) }, { once: true }))
  } }).exerciseDetail(user, id, abort.signal)
  abort.abort(); await assert.rejects(pending, /aborted/); assert.equal(cancelled, true)
})
