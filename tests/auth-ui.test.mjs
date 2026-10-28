import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AuthController } from '../src/features/auth/controller.ts'

registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context) } catch (error) {
      if (!specifier.startsWith('.')) throw error
      for (const extension of ['.ts', '.tsx']) { try { return nextResolve(specifier + extension, context) } catch { /* Try supported extension. */ } }
      throw error
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: 'export default ""', shortCircuit: true }
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText }
    return nextLoad(url, context)
  },
})
const { LoginScreens } = await import('../src/features/auth/LoginScreens.tsx')
const { AuthApp } = await import('../src/features/auth/AuthApp.tsx')
const { AuthContext } = await import('../src/features/auth/context.ts')
const NOW = 1_800_000_000_000
const controller = new AuthController()
const initial = { status: 'anonymous', userId: null, pending: null, challenge: null, resendAt: 0, issue: null, notice: '' }
const render = state => renderToStaticMarkup(React.createElement(AuthContext, { value: { state, controller } }, React.createElement(AuthApp)))
const login = state => renderToStaticMarkup(React.createElement(LoginScreens, { state, controller, now: NOW, onLegal: () => {} }))

test('approved login layout keeps wordmark, headline, Google-first and labeled email form', () => {
  const html = login(initial)
  for (const label of ['OVERLOAD', '꾸준히 쌓은 나의 기록', '어디서든 이어서', 'Google로 계속하기', '또는 이메일로', '이메일로 계속하기']) assert.ok(html.includes(label), label)
  assert.ok(html.indexOf('Google로 계속하기') < html.indexOf('auth-email'))
  assert.match(html, /type="email"/); assert.match(html, /autoComplete="email"/)
  assert.doesNotMatch(html, /가상 계정|프리뷰 전용 코드|123456|Apple로|게스트로|type="password"/)
})
test('OTP uses one numeric/autofill field, explicit resend and server-authoritative timing hint', () => {
  const state = { ...initial, resendAt: NOW + 60_000, challenge: { id: 'test', email: 'athlete@example.test', expiresAt: NOW + 300_000 } }
  const html = login(state)
  for (const part of ['inputMode="numeric"', 'autoComplete="one-time-code"', 'maxLength="6"', '5:00', '60초 후 재발송', '이메일 주소 변경', '서버 확인이 기준']) assert.ok(html.includes(part), part)
  assert.match(login({ ...state, challenge: { ...state.challenge, expiresAt: NOW } }), /코드 만료/)
  assert.match(login({ ...state, pending: 'request' }), /인증코드를 보내는 중/)
})
test('a stale interval tick cannot display 5:01 or a spurious 61-second resend delay', () => {
  const html = login({ ...initial, updatedAt: NOW + 500, resendAt: NOW + 60_500, challenge: { id: 'test', email: 'athlete@example.test', expiresAt: NOW + 300_500 } })
  assert.match(html, /5:00/); assert.match(html, /60초 후 재발송/); assert.doesNotMatch(html, /5:01|61초 후/)
})
test('unaccepted requests never present an active code lifetime or enabled verification input', () => {
  const html = login({ ...initial, challenge: { id: null, email: 'athlete@example.test', expiresAt: NOW + 300_000 } })
  assert.match(html, /발송 완료 후 5분간 유효/); assert.doesNotMatch(html, /유효시간 5:00/)
  assert.match(html, /disabled=""/)
})
test('verification Retry-After disables code input and shows a separate verification wait', () => {
  const html = login({ ...initial, verifyAt: NOW + 120_000, challenge: { id: 'test', email: 'athlete@example.test', expiresAt: NOW + 300_000 } })
  assert.match(html, /120초 후 코드 확인/); assert.match(html, /disabled=""/)
})
test('authenticated UI is separated from demo data and identity-management preview actions', () => {
  const html = render({ ...initial, status: 'authenticated', userId: 'a-private-user' })
  assert.match(html, /로그인되었습니다/); assert.match(html, /기존 데모 기록은 계정 데이터가 아니며 서버로 전송되지 않습니다/)
  assert.doesNotMatch(html, /a-private-user|Google 연결|이메일 인증코드 해제|나의 루틴|최근 운동|운동 시작 ↗/)
})
test('initial checking, connection failure, processing and logged-out states stay distinct', () => {
  assert.match(render({ ...initial, status: 'checking' }), /로그인 상태를/)
  const offline = render({ ...initial, status: 'unavailable', userId: 'known-user', issue: { message: '연결 실패', code: 'NETWORK' } })
  assert.match(offline, /로그인 상태 다시 확인/); assert.doesNotMatch(offline, /Google로 계속하기|로그아웃했습니다|known-user/)
  assert.match(render({ ...initial, notice: '로그아웃했습니다.' }), /로그아웃했습니다/)
  assert.match(login({ ...initial, pending: 'google' }), /Google로 이동 중/)
})
test('layout geometry follows the approved mock while current app colors take priority', () => {
  const mock = readFileSync(new URL('../src/features/auth-preview/auth-preview.css', import.meta.url), 'utf8')
  const real = readFileSync(new URL('../src/features/auth/auth.css', import.meta.url), 'utf8')
  const block = (css, selector) => css.slice(css.indexOf(selector)).split('{')[1].split('}')[0].trim()
  for (const [before, after] of [['.preview-wordmark {', '.auth-wordmark {'], ['.preview-entry-heading {', '.auth-entry-heading {'], ['.preview-entry h1 {', '.auth-entry h1 {'], ['.preview-google {', '.auth-google {'], ['.preview-code {', '.auth-code {']]) assert.equal(block(real, after), block(mock, before))
  assert.doesNotMatch(real, /--blue\s*:|#d93b40|#fa696d/)
  assert.match(real, /#68a2ff/)
})
