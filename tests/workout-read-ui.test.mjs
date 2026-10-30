import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AuthController } from '../src/features/auth/controller.ts'
import { workoutReadIssue } from '../src/features/workout-read/controller.ts'
import { WorkoutReadError } from '../src/features/workout-read/api.ts'

// Existing TypeScript + SSR test approach; browser interactions are checked separately.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context) } catch (error) {
      if (!specifier.startsWith('.')) throw error
      for (const extension of ['.ts', '.tsx']) { try { return nextResolve(specifier + extension, context) } catch { /* Existing TSX resolution. */ } }
      throw error
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: 'export default ""', shortCircuit: true }
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText }
    return nextLoad(url, context)
  },
})
const { WorkoutReadView, WorkoutOverview } = await import('../src/features/workout-read/WorkoutOverview.tsx')
const { AuthContext } = await import('../src/features/auth/context.ts')
const owner = '10000000-1111-4222-8333-000000000001'
const ready = { status: 'ready', userId: owner, issue: null, data: { userId: owner, dataGeneration: '9007199254740993', exercises: [{ id: '20000000-1111-4222-8333-000000000002', name: '  벤치프레스 Ω  ' }], settings: { userId: owner, dataGeneration: '9007199254740993', restLowSeconds: 17, restMediumSeconds: 29, restHighSeconds: 43 } } }
const render = state => renderToStaticMarkup(React.createElement(WorkoutReadView, { state, onRefresh() {}, onCheckSession() {} }))

test('read-only screen shows exact names, edited rest seconds and approved repetition bands', () => {
  const html = render(ready)
  for (const text of ['내 운동 정보', '조회 전용', '  벤치프레스 Ω  ', '≤10회', '11~12회', '≥13회', '>17<', '>29<', '>43<', '아직 지원하지 않습니다', '운동 정보 새로고침']) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /운동 시작|편집<|저장<|≤8|9~12|10000000-1111|9007199254740993/)
})

test('zero exercises is normal while actual settings remain visible', () => {
  const html = render({ ...ready, data: { ...ready.data, exercises: [] } })
  assert.match(html, /저장된 운동 종목이 없습니다/); assert.match(html, /세트 사이 휴식/); assert.match(html, />17</)
  assert.doesNotMatch(html, /role="alert"|기본 종목 생성/)
})

test('server-provided exercise names are escaped as text, not interpreted as HTML', () => {
  const html = render({ ...ready, data: { ...ready.data, exercises: [{ id: 'safe-key', name: '<img src=x onerror=alert(1)>' }] } })
  assert.match(html, /&lt;img/); assert.doesNotMatch(html, /<img/)
})

test('loading and persistent generation mismatch never show a partial list or default settings', () => {
  const loading = render({ status: 'loading', userId: owner, data: null, issue: null })
  assert.match(loading, /role="status"/); assert.match(loading, /disabled=""/); assert.doesNotMatch(loading, /벤치프레스|180|120|90/)
  const mismatch = render({ status: 'sync-check', userId: owner, data: null, issue: workoutReadIssue(new WorkoutReadError('GENERATION_MISMATCH')) })
  assert.match(mismatch, /동기화 확인/); assert.match(mismatch, /다시 조회/); assert.doesNotMatch(mismatch, /벤치프레스|세트 사이 휴식/)
})

test('errors distinguish permission, contract, missing settings and unavailable service without deletion or logout advice', () => {
  for (const [status, code, message] of [[400, 'INVALID_REQUEST', '규약'], [403, 'ACCESS_DENIED', '접근할 권한'], [500, 'WORKOUT_SETTINGS_MISSING', '휴식 설정'], [500, 'WORKOUT_DATA_READ_FAILED', '조회하지 못했습니다'], [503, 'WORKOUT_DATA_UNAVAILABLE', '일시적으로']]) {
    const html = render({ status: 'error', userId: owner, data: null, issue: workoutReadIssue(new WorkoutReadError(code, status)) })
    assert.ok(html.includes(message)); assert.doesNotMatch(html, /로그아웃|삭제해|데이터 초기화|180|120|90/)
  }
})

test('401 and owner mismatch offer existing session confirmation; safe Request ID is shown', () => {
  for (const [status, code] of [[401, 'AUTHENTICATION_REQUIRED'], [200, 'OWNER_MISMATCH']]) {
    const html = render({ status: 'error', userId: owner, data: null, issue: workoutReadIssue(new WorkoutReadError(code, status, '40000000-1111-4222-8333-000000000004')) })
    assert.match(html, /로그인 상태 다시 확인/); assert.match(html, /문의용 요청 ID/)
  }
})

test('auth render guard hides workout view immediately during logout and restoration', () => {
  for (const pending of ['logout', 'restore']) {
    const state = { ...new AuthController().getSnapshot(), status: 'authenticated', userId: owner, pending }
    const html = renderToStaticMarkup(React.createElement(AuthContext, { value: { state, controller: new AuthController() } }, React.createElement(WorkoutOverview)))
    assert.match(html, pending === 'logout' ? /로그아웃을 확인/ : /로그인 상태를 확인/)
    assert.doesNotMatch(html, /운동 종목|세트 사이 휴식|벤치프레스/)
  }
})
