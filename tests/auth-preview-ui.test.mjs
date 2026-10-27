import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as m from '../src/features/auth-preview/model.ts'

// Same lightweight TSX loader as existing components.test.mjs; no new dependencies.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context) } catch (error) {
      if (!specifier.startsWith('.')) throw error
      for (const extension of ['.ts', '.tsx']) {
        try { return nextResolve(specifier + extension, context) } catch { /* Next supported extension. */ }
      }
      throw error
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: 'export default ""', shortCircuit: true }
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText }
    return nextLoad(url, context)
  },
})
const { AuthScreens } = await import('../src/features/auth-preview/AuthScreens.tsx')
const { AccountScreens } = await import('../src/features/auth-preview/AccountScreens.tsx')
const { default: AuthPreview } = await import('../src/features/auth-preview/AuthPreview.tsx')
const NOW = 1_800_000_000_000
const html = (Component, state) => renderToStaticMarkup(React.createElement(Component, { state, dispatch: () => {}, now: NOW, onLegal: () => {}, onDialog: () => {} }))

test('auth preview entry is clearly marked, separates developer tools and does not mount real workout UI', () => {
  const markup = renderToStaticMarkup(React.createElement(AuthPreview))
  assert.match(markup, /UX PREVIEW/); assert.match(markup, /실제 인증·메일 전송·서버 저장·삭제 없음/)
  assert.match(markup, /개발 전용 · 시나리오 패널/); assert.match(markup, /Google로 계속하기/)
  assert.doesNotMatch(markup, /type="password"|게스트로|Apple로|서버 연결 진단|운동 시작 ↗/)
})

test('code screen supports a single numeric OTP input, paste, expiration, limits and change-address navigation', () => {
  const s = m.scenarioState('codeWrong', NOW)
  const markup = html(AuthScreens, s)
  assert.match(markup, /inputMode="numeric"/); assert.match(markup, /autoComplete="one-time-code"/)
  assert.match(markup, /maxLength="6"/); assert.match(markup, /5:00/); assert.match(markup, /이메일 주소 변경/)
  assert.match(markup, /123456/); assert.match(markup, /실제 이메일은 발송되지 않았습니다/)
  assert.match(html(AuthScreens, m.scenarioState('codeExpired', NOW)), /코드 만료/)
  assert.match(html(AuthScreens, m.scenarioState('codeLimited', NOW)), /재발송 횟수 제한/)
})

test('account UI exposes all actions, nine sync states and separated logout choices without real destructive claims', () => {
  const markup = html(AccountScreens, m.scenarioState('email', NOW))
  for (const label of ['Google 연결', '이메일 인증코드 해제', '운동 데이터 내보내기', '운동 데이터 전체 초기화', '새 루틴으로 시작하기', '회원 탈퇴', '로그아웃', '개인정보 처리방침']) assert.ok(markup.includes(label), label)
  const logout = html(AccountScreens, m.scenarioState('pending', NOW))
  for (const label of ['동기화 후 로그아웃', '로컬 기록 유지하고 로그아웃', '취소', '다른 계정은 이 기록을 보거나 전송할 수 없습니다']) assert.ok(logout.includes(label), label)
  for (const status of Object.keys(m.SYNC_LABELS)) {
    const s = { ...m.scenarioState('email', NOW), screen: 'summary', sync: status }
    assert.ok(html(AccountScreens, s).includes(m.SYNC_LABELS[status][0]))
  }
})

test('every scenario renders and workout expiry preserves explicit set, rest, cardio and finish actions', () => {
  for (const [scenario] of m.SCENARIOS) {
    const s = m.scenarioState(scenario, NOW)
    const Component = ['entry', 'code', 'reauth'].includes(s.screen) ? AuthScreens : AccountScreens
    assert.ok(html(Component, s).length > 100, scenario)
  }
  const workout = html(AccountScreens, m.scenarioState('workout', NOW))
  for (const label of ['운동은 계속할 수 있어요', '가상 세트 완료', '가상 휴식 시작', '가상 유산소 시작', '가상 운동 완료 및 요약']) assert.ok(workout.includes(label), label)
})
