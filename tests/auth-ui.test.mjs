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
const { AccountSettings } = await import('../src/features/auth/AccountSettings.tsx')
const { emptyAccount } = await import('../src/features/auth/account.ts')
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

const accountHtml = (patch = {}, statePatch = {}) => renderToStaticMarkup(React.createElement(AccountSettings, { state: { ...initial, status: 'authenticated', updatedAt: NOW, accountOpen: true, account: { ...emptyAccount(), loaded: true, ...patch }, ...statePatch }, controller, now: NOW }))
const ID='30000000-1111-4222-8333-000000000003'
for (const providers of [['email'], ['google'], ['email','google'], []]) test(`account read-only UI: ${providers.join('+') || 'no identities'}`, () => {
  const html=accountHtml({ identities: providers.map(provider => ({ id: ID, provider })), contact: { status: 'VERIFIED', maskedEmail: 'a***@***' } })
  assert.match(html,/계정 설정|로그인 수단/);assert.match(html,/a\*\*\*@\*\*\*/);assert.doesNotMatch(html,new RegExp(ID))
  assert.doesNotMatch(html,/로그인 수단 연결|Google 연결|이메일 연결|해제 버튼|issuer|sub=/)
  assert.match(html,/최근 이메일 OTP 검증은 이 화면에서 확인되지 않았습니다/)
  if(!providers.length)assert.match(html,/연결된 로그인 수단을 확인할 수 없습니다/)
})
test('REQUIRED with EMAIL-only explains normal OTP login instead of inventing an address-registration form',()=>{
  const html=accountHtml({identities:[{id:ID,provider:'email'}],contact:{status:'REQUIRED'}})
  assert.match(html,/이메일 OTP로 다시 로그인/);assert.doesNotMatch(html,/type="email"|Google로 등록 이메일 확인|이메일로 재인증/)
})
test('Google contact uses a fixed CSRF-protected POST form with hidden internal identity only',()=>{
  const html=accountHtml({identities:[{id:ID,provider:'google'}],contact:{status:'REQUIRED'},form:{identityId:ID,csrf:'fake-form-csrf'}})
  assert.match(html,/action="\/oauth2\/contact\/google" method="post"/);assert.match(html,/type="hidden" name="_csrf"/);assert.match(html,/type="hidden" name="identityId"/)
  assert.doesNotMatch(html,/type="email"|\/oauth2\/link\/|\/oauth2\/reauth\/|Google 비밀번호 재인증을 강제합니다/)
})
test('candidate UI remains REQUIRED until OTP success and uses only masked address',()=>{
  const html=accountHtml({identities:[{id:ID,provider:'google'}],contact:{status:'REQUIRED',candidate:{id:ID,maskedEmail:'g***@***'}}})
  assert.match(html,/후보 이메일로 등록 코드 요청|아직 등록되지 않았습니다|대표 이메일 등록 취소/);assert.doesNotMatch(html,/등록 완료 · VERIFIED|type="email"/)
})
test('proof OTP field, local expiration, resend wait and verification budget are visible',()=>{
  const account={identities:[{id:ID,provider:'google'}],contact:{status:'VERIFIED',maskedEmail:'g***@***'},challenge:{id:ID,expiresAt:NOW+300_000},resendAt:NOW+60_000}
  const html=accountHtml(account)
  for(const text of ['autoComplete="one-time-code"','inputMode="numeric"','maxLength="6"','5:00','최대 5회 오답','60초 후 요청 가능'])assert.ok(html.includes(text),text)
  assert.match(accountHtml({...account,verifyAt:NOW+120_000}),/120초 후 코드 확인/)
  assert.match(accountHtml({...account,challenge:{id:ID,expiresAt:NOW}}),/코드 만료/)
})
test('recent OTP feedback lasts through the ten-minute boundary but never claims server authorization',()=>{
  assert.match(accountHtml({confirmedAt:NOW-600_000}),/이 화면에서 OTP 검증을 완료했습니다/)
  assert.match(accountHtml({confirmedAt:NOW-600_001}),/최근 이메일 OTP 검증은 이 화면에서 확인되지 않았습니다/)
})
test('account loading and retryable lookup failure are distinct and contain no private identifiers',()=>{
  assert.match(accountHtml({loaded:false},{pending:'account'}),/계정 정보를 확인하고 있어요/)
  assert.match(accountHtml({loaded:false}),/계정 정보를 불러오지 못했습니다|계정 정보 다시 확인/)
})

test('identity management keeps VERIFIED contact separate and offers explicit actions without raw identifiers',()=>{
  const html=accountHtml({identities:[{id:ID,provider:'google'}],contact:{status:'VERIFIED',maskedEmail:'g***@***'}})
  for(const label of ['이메일 로그인 연결','Google 로그인 추가 연결','Google 로그인 해제','대표 재인증 이메일과 로그인 수단은 별도','서버가 최종 검사'])assert.ok(html.includes(label),label)
  assert.doesNotMatch(html,new RegExp(ID));assert.doesNotMatch(html,/type="email"/)
})
test('Google LINK renders fixed form POST containing only CSRF and never identityId or returnUrl',()=>{
  const html=accountHtml({identities:[{id:ID,provider:'email'}],contact:{status:'VERIFIED',maskedEmail:'e***@***'},linkForm:{csrf:'test-only-csrf'}})
  assert.match(html,/action="\/oauth2\/link\/google" method="post"/);assert.match(html,/type="hidden" name="_csrf"/)
  assert.doesNotMatch(html,/name="identityId"|name="next"|name="returnUrl"/)
})
for(const provider of ['email','google'])test(`${provider} unlink confirmation explains new account, sessions, contact preservation, and explicit final action`,()=>{
  const html=accountHtml({identities:[{id:ID,provider}],contact:{status:'VERIFIED',maskedEmail:'a***@***'},unlink:{userId:'private-user',identity:{id:ID,provider}}})
  for(const label of ['로그인 수단 해제 최종 확인','해제 취소','새 계정이 생성될 수','다른 기기에서 로그인한 세션은 즉시 모두 로그아웃되지','대표 재인증 이메일과 운동 기록은 유지'])assert.ok(html.includes(label),label)
  assert.doesNotMatch(html,/private-user/);assert.doesNotMatch(html,new RegExp(ID))
})
test('multiple same-provider identities expose neither guessed addresses nor an arbitrary unlink button',()=>{
  const html=accountHtml({identities:[{id:ID,provider:'google'},{id:'50000000-1111-4222-8333-000000000005',provider:'google'}],contact:{status:'VERIFIED',maskedEmail:'g***@***'}})
  assert.match(html,/2개 연결됨|개별 계정을 구별할 수 없어/);assert.doesNotMatch(html,/Google 로그인 해제|sub=|example\.test/)
})
test('server proof refusal links to the existing email reauthentication section without adding a second OTP form',()=>{
  const html=accountHtml({identities:[{id:ID,provider:'google'}],contact:{status:'VERIFIED',maskedEmail:'g***@***'}},{issue:{code:'EMAIL_OWNERSHIP_PROOF_REQUIRED',message:'재인증 필요'}})
  assert.match(html,/href="#account-email-proof"/);assert.match(html,/id="account-email-proof"/);assert.equal((html.match(/>이메일로 재인증</g)||[]).length,1)
})
