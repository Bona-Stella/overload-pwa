import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import * as m from '../src/features/auth-preview/model.ts'

const NOW = 1_800_000_000_000
const reduce = m.previewReducer
const field = (s, key, value) => reduce(s, { type: 'field', field: key, value })
function emailVerify(s, context = 'signin') {
  s = reduce(s, { type: 'send', context, now: NOW })
  s = reduce(s, { type: 'sent', now: NOW })
  return reduce(field(s, 'code', m.TEST_CODE), { type: 'verify', now: NOW + 1 })
}
function sensitive(s, intent) {
  return emailVerify(reduce(s, { type: 'sensitive', intent }), 'reauth')
}

test('existing email login and new signup share entry; nickname is optional and consent is explicit', () => {
  let s = emailVerify(m.createPreview())
  assert.equal(s.owner, 'a'); assert.equal(s.screen, 'home'); assert.equal(s.auth, 'active')
  s = emailVerify(m.scenarioState('new', NOW))
  assert.equal(s.screen, 'signup'); assert.equal(s.owner, null)
  assert.equal(reduce(s, { type: 'signup' }).owner, null)
  s = reduce(reduce(s, { type: 'accept', value: true }), { type: 'signup' })
  assert.equal(s.owner, 'new'); assert.equal(s.accounts.new.nickname, ''); assert.equal(s.accounts.new.emailLinked, true)
  s = emailVerify(reduce(s, { type: 'logout' }))
  assert.equal(s.owner, 'new'); assert.equal(s.screen, 'home')
})

test('invalid email, sending state, exact five-minute expiration and a fresh resend are enforced', () => {
  let s = reduce(field(m.createPreview(), 'email', 'invalid'), { type: 'send', now: NOW })
  assert.equal(s.screen, 'entry'); assert.match(s.message, /이메일/)
  s = reduce(m.createPreview(), { type: 'send', now: NOW })
  assert.equal(s.codeStatus, 'sending')
  assert.deepEqual(reduce(s, { type: 'send', now: NOW }), s)
  assert.equal(reduce(field(s, 'code', m.TEST_CODE), { type: 'verify', now: NOW }).owner, null)
  s = reduce(s, { type: 'sent', now: NOW })
  assert.equal(s.expiresAt - NOW, 300000)
  assert.match(reduce(field(s, 'code', m.TEST_CODE), { type: 'verify', now: NOW + m.CODE_LIFETIME }).message, /만료/)
  assert.match(reduce(s, { type: 'send', now: NOW + 29999 }).message, /대기/)
  s = reduce(s, { type: 'send', now: NOW + 30000 })
  s = reduce(s, { type: 'sent', now: NOW + 30000 })
  assert.equal(s.expiresAt, NOW + 330000); assert.equal(s.sends, 2)
})

test('wrong codes retain address, block after five tries; resend cap and paste normalization work', () => {
  let s = m.scenarioState('codeWrong', NOW)
  for (let i = 0; i < 5; i++) s = reduce(s, { type: 'verify', now: NOW })
  assert.equal(s.attempts, 5); assert.equal(s.email, 'athlete@overload.example')
  assert.equal(reduce(field(s, 'code', m.TEST_CODE), { type: 'verify', now: NOW }).owner, null)
  assert.equal(field(s, 'code', '12 34-56').code, m.TEST_CODE)
  s = m.scenarioState('codeLimited', NOW)
  assert.match(reduce(s, { type: 'send', now: NOW + 60000 }).message, /횟수/)
})

test('Google succeeds only for a linked fixture and new Google signup needs the signup step', () => {
  let s = reduce(m.scenarioState('both', NOW), { type: 'logout' })
  s = reduce(s, { type: 'google', context: 'signin' })
  assert.equal(reduce(s, { type: 'googleResult', result: 'success' }).owner, 'a')
  for (const result of ['cancel', 'failed']) {
    const next = reduce(s, { type: 'googleResult', result })
    assert.equal(next.owner, null); assert.equal(next.screen, 'entry'); assert.ok(next.message)
  }
  s = reduce(reduce(m.createPreview(), { type: 'google', context: 'signin' }), { type: 'googleResult', result: 'success' })
  assert.equal(s.screen, 'conflict'); assert.equal(s.accounts.a.googleLinked, false)
  s = reduce(reduce(m.scenarioState('new', NOW), { type: 'google', context: 'signin' }), { type: 'googleResult', result: 'success' })
  assert.equal(s.screen, 'signup')
  s = reduce(reduce(s, { type: 'accept', value: true }), { type: 'signup' })
  assert.equal(s.accounts.new.googleLinked, true); assert.equal(s.accounts.new.emailLinked, false)
})

test('Google link requires existing-account reauthentication and a second provider verification', () => {
  let s = m.scenarioState('email', NOW)
  assert.equal(reduce(s, { type: 'confirm' }).accounts.a.googleLinked, false)
  s = sensitive(s, 'linkGoogle')
  assert.equal(s.screen, 'confirm'); assert.equal(s.accounts.a.googleLinked, false)
  s = reduce(s, { type: 'confirm' })
  assert.equal(s.screen, 'google')
  s = reduce(s, { type: 'googleResult', result: 'success' })
  assert.equal(s.accounts.a.googleLinked, true); assert.equal(s.screen, 'settings')
  assert.equal(s.verifiedFor, null)
})

test('Google-only account can reauthenticate with Google then verify and link an email', () => {
  let s = reduce(m.scenarioState('google', NOW), { type: 'sensitive', intent: 'linkEmail' })
  s = reduce(reduce(s, { type: 'google', context: 'reauth' }), { type: 'googleResult', result: 'success' })
  s = reduce(s, { type: 'confirm' })
  s = emailVerify(field(s, 'email', 'linked@overload.example'), 'linkEmail')
  assert.equal(s.accounts.a.emailLinked, true); assert.equal(s.accounts.a.googleLinked, true)
  assert.equal(s.accounts.a.email, 'linked@overload.example')
})

test('all three link conflicts preserve both independent accounts, regardless of matching email', () => {
  for (const scenario of ['sameEmail', 'googleOwned', 'twoAccounts']) {
    let s = m.scenarioState(scenario, NOW)
    const original = structuredClone(s.accounts)
    s = reduce(sensitive(s, 'linkGoogle'), { type: 'confirm' })
    s = reduce(s, { type: 'googleResult', result: 'success' })
    assert.equal(s.screen, 'conflict'); assert.deepEqual(s.accounts, original); assert.ok(s.message)
  }
})

test('failed reauthentication cannot reach link confirmation or mutate any account', () => {
  let s = reduce(m.scenarioState('email', NOW), { type: 'sensitive', intent: 'linkGoogle' })
  const original = structuredClone(s.accounts)
  s = reduce(s, { type: 'send', context: 'reauth', now: NOW })
  s = reduce(s, { type: 'sent', now: NOW })
  s = reduce(field(s, 'code', '000000'), { type: 'verify', now: NOW })
  s = reduce(s, { type: 'confirm' })
  assert.equal(s.verifiedFor, null); assert.deepEqual(s.accounts, original)
})

test('last login method cannot be unlinked, while either of two methods can be removed', () => {
  let s = sensitive(m.scenarioState('email', NOW), 'unlinkEmail')
  s = reduce(s, { type: 'confirm' })
  assert.match(s.message, /마지막/); assert.equal(s.accounts.a.emailLinked, true)
  for (const method of ['Google', 'Email']) {
    s = reduce(sensitive(m.scenarioState('both', NOW), `unlink${method}`), { type: 'confirm' })
    assert.equal(s.accounts.a[method.toLowerCase() + 'Linked'], false)
    assert.equal(s.accounts.a[method === 'Google' ? 'emailLinked' : 'googleLinked'], true)
  }
})

test('restoration is manual and expiry does not interrupt workout operations or duplicate completion', () => {
  assert.equal(m.scenarioState('restored', NOW).auth, 'restored')
  let s = m.scenarioState('workout', NOW)
  s = reduce(s, { type: 'workout', action: 'set' }); assert.equal(s.workout.sets, 2)
  s = reduce(s, { type: 'workout', action: 'pause' }); assert.equal(s.workout.paused, true)
  s = reduce(s, { type: 'workout', action: 'cardio' }); assert.equal(s.workout.cardio, true)
  s = reduce(s, { type: 'workout', action: 'finish' })
  assert.equal(s.sync, 'reauth'); assert.equal(s.accounts.a.pending, 1)
  assert.deepEqual(reduce(s, { type: 'workout', action: 'finish' }), s)
  s = reduce(s, { type: 'navigate', screen: 'home' })
  assert.equal(s.accounts.a.pending, 1)
  s = emailVerify(reduce(s, { type: 'sync' }), 'reauth')
  assert.equal(s.owner, 'a'); assert.equal(s.sync, 'pending')
  s = reduce(reduce(s, { type: 'sync' }), { type: 'syncResult', success: true })
  assert.equal(s.sync, 'synced'); assert.equal(s.accounts.a.pending, 0)
})

test('sync before logout waits for success; failure retains original data and current account', () => {
  const original = m.scenarioState('pending', NOW)
  let s = reduce(original, { type: 'sync', logout: true })
  assert.equal(s.owner, 'a'); assert.equal(s.sync, 'syncing')
  s = reduce(s, { type: 'syncResult', success: false })
  assert.equal(s.owner, 'a'); assert.equal(s.screen, 'logout'); assert.deepEqual(s.accounts, original.accounts)
  s = reduce(reduce(s, { type: 'sync', logout: true }), { type: 'syncResult', success: true })
  assert.equal(s.owner, null); assert.equal(s.accounts.a.pending, 0); assert.equal(s.screen, 'entry')
})

test('expired sync-then-logout preserves intention through reauthentication', () => {
  let s = reduce(m.scenarioState('expired', NOW), { type: 'sync', logout: true })
  s = emailVerify(s, 'reauth'); assert.equal(s.screen, 'logout')
  s = reduce(reduce(s, { type: 'sync', logout: true }), { type: 'syncResult', success: true })
  assert.equal(s.owner, null); assert.equal(s.accounts.a.pending, 0)
})

test('retained records stay inaccessible after logout and another account cannot view or sync them', () => {
  let s = reduce(m.scenarioState('pending', NOW), { type: 'logout', keep: true })
  const original = structuredClone(s.accounts.a)
  assert.equal(m.visibleAccount(s), null)
  assert.deepEqual(reduce(s, { type: 'sync' }).accounts.a, original)
  s = emailVerify(reduce(s, { type: 'identity', owner: 'b' }))
  assert.equal(s.owner, 'b'); assert.equal(m.visibleAccount(s).history.length, 1)
  assert.ok(m.visibleAccount(s).history.every(record => !record.includes('기록 A')))
  s = reduce(reduce(s, { type: 'sync' }), { type: 'syncResult', success: true })
  assert.deepEqual(s.accounts.a, original)
  s = emailVerify(reduce(reduce(s, { type: 'logout' }), { type: 'identity', owner: 'a' }))
  assert.equal(s.accounts.a.pending, 2); assert.equal(s.sync, 'pending')
})

test('offline, record conflict, reset generation and local failure never report server success', () => {
  for (const scenario of ['offline', 'conflict', 'resetBlocked', 'localFailed']) {
    const original = m.scenarioState(scenario, NOW)
    let s = reduce(original, { type: 'sync' })
    s = reduce(s, { type: 'syncResult', success: true })
    assert.equal(s.sync, scenario); assert.deepEqual(s.accounts, original.accounts)
  }
  const s = reduce(m.scenarioState('offline', NOW), { type: 'networkRestored' })
  assert.equal(s.sync, 'pending')
})

test('reset and withdrawal need reauthentication plus typed final confirmation; fresh routine keeps history', () => {
  for (const intent of ['reset', 'withdraw']) {
    let s = m.scenarioState('both', NOW)
    const original = structuredClone(s.accounts)
    s = reduce(s, { type: 'sensitive', intent })
    assert.deepEqual(reduce(s, { type: 'confirm' }).accounts, original)
    s = emailVerify(s, 'reauth')
    assert.deepEqual(reduce(s, { type: 'confirm' }).accounts, original)
    s = reduce(field(s, 'confirmation', intent === 'reset' ? '초기화' : '탈퇴'), { type: 'confirm' })
    assert.equal(s.screen, 'done'); assert.equal(s.accounts.a.history.length, 0); assert.equal(s.accounts.a.pending, 0)
    assert.deepEqual(s.accounts.b, original.b); assert.equal(s.sync, 'resetBlocked')
    assert.equal(s.owner, intent === 'reset' ? 'a' : null)
    assert.equal(s.accounts.a.emailLinked, intent === 'reset'); assert.equal(s.accounts.a.googleLinked, intent === 'reset'); assert.equal(s.accounts.a.deleted, intent === 'withdraw')
  }
  const initial = m.scenarioState('email', NOW)
  const s = reduce(initial, { type: 'newRoutine' })
  assert.deepEqual(s.accounts.a.history, initial.accounts.a.history); assert.equal(s.accounts.a.routines, 4)
  const profile = reduce(field(s, 'nickname', ''), { type: 'saveNickname' })
  assert.equal(profile.accounts.a.nickname, ''); assert.deepEqual(profile.accounts.a.history, s.accounts.a.history)
})

test('all developer scenarios are independent and preview modules have no persistence, network or workout-model dependency', () => {
  for (const [scenario] of m.SCENARIOS) {
    const s = m.scenarioState(scenario, NOW)
    assert.ok(s.screen); assert.ok(m.SYNC_LABELS[s.sync]); assert.notEqual(s.accounts, m.createPreview().accounts)
  }
  for (const filename of readdirSync(new URL('../src/features/auth-preview/', import.meta.url)).filter(name => /\.(ts|tsx)$/.test(name))) {
    const source = readFileSync(new URL(`../src/features/auth-preview/${filename}`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|document\.cookie|features\/workout|\.\.\/workout/)
  }
})

test('a newly expired confirmation loses reauthentication proof and canceling logout cancels its delayed intention', () => {
  let s = sensitive(m.scenarioState('email', NOW), 'reset')
  s = field(s, 'confirmation', '초기화')
  const original = structuredClone(s.accounts)
  s = reduce(s, { type: 'expire' })
  assert.equal(s.verifiedFor, null); assert.equal(s.screen, 'reauth')
  assert.deepEqual(reduce(s, { type: 'confirm' }).accounts, original)
  s = reduce(m.scenarioState('expired', NOW), { type: 'sync', logout: true })
  s = reduce(s, { type: 'navigate', screen: 'settings' })
  assert.equal(s.logoutAfterSync, false)
})
