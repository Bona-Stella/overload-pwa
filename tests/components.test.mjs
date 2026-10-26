import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { registerHooks } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Use the existing compiler and React server renderer, without adding a test framework.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context) }
    catch (error) {
      if (!specifier.startsWith('.')) throw error
      for (const extension of ['.ts', '.tsx']) {
        try { return nextResolve(specifier + extension, context) } catch { /* Try the next existing source extension. */ }
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
const { WorkoutScreen } = await import('../src/features/workout/WorkoutScreen.tsx')
const { SessionDetail } = await import('../src/features/history/SessionDetail.tsx')
const { RoutineEditor } = await import('../src/features/routine/RoutineEditor.tsx')
const { default: App } = await import('../src/App.tsx')
const m = await import('../src/features/workout/model.ts')
const NOW = new Date(2026, 9, 26, 12).getTime()
const noop = () => {}
const props = state => ({ state, now: NOW + 60000, onUpdate: noop, onExit: noop, onFinish: noop, onCreate: () => '' })
const html = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))

test('warmup renders total elapsed time and one preparation action without any set inputs', () => {
  const markup = html(WorkoutScreen, props(m.startWorkout(m.createInitialState(), 'push', NOW)))
  assert.match(markup, /00:01:00/)
  assert.match(markup, /준비운동 완료/)
  assert.match(markup, /세트 기록 없음/)
  assert.doesNotMatch(markup, /<input/)
  assert.doesNotMatch(markup, /기본 탐색/)
})

test('working screen focuses one exercise, with blank reps, explicit benchmarks and editable memo', () => {
  const state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  const markup = html(WorkoutScreen, props(state))
  assert.match(markup, /바벨 벤치프레스/)
  assert.doesNotMatch(markup, /인클라인 덤벨 프레스/)
  assert.match(markup, /기준 기록/)
  assert.match(markup, /이번 기록/)
  assert.match(markup, /기구 세팅 메모/)
  assert.match(markup, /value=""/)
})

test('rest controls and next exercise action appear after the final set', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  const exercise = state.active.exercises[0]
  for (const set of exercise.sets) {
    state = m.editReps(state, exercise.id, set.id, '10')
    state = m.completeSet(state, exercise.id, set.id, NOW + 59000)
  }
  const markup = html(WorkoutScreen, props(state))
  assert.match(markup, /남은 휴식/)
  assert.match(markup, /휴식 종료/)
  assert.match(markup, /＋30초/)
  assert.match(markup, /다음 종목으로/)
  assert.match(markup, /중량 증가를 고려/)
})

test('summary keeps the actual second-set number after incomplete sets are excluded', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  const exercise = state.active.exercises[0]
  state = m.editReps(state, exercise.id, exercise.sets[1].id, '8')
  state = m.completeSet(state, exercise.id, exercise.sets[1].id, NOW + 1000)
  state = m.finishWorkout(state, NOW + 60000, true)
  const markup = html(SessionDetail, { session: state.history[0], saved: true })
  assert.match(markup, /2세트/)
  assert.match(markup, /60 kg × 8회/)
  assert.match(markup, /480/)
  assert.match(markup, /서버 동기화 미지원/)
})

test('routine editor provides save, cancel, original and approved weights and multi-day selection', () => {
  const state = m.createInitialState()
  const markup = html(RoutineEditor, { state, routine: state.routines[0], onSave: noop, onCancel: noop, onCreate: () => '' })
  assert.match(markup, /루틴 저장/)
  assert.match(markup, /취소/)
  assert.match(markup, /현재 승인 진행 중량/)
  assert.match(markup, /최초 중량/)
  assert.match(markup, /aria-pressed="true"/)
})

test('home renders three navigation tabs and allows starting without sending a Health request', t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Home must not request the API') })
  const previous = globalThis.window
  globalThis.window = { localStorage: { getItem: () => null } }
  try {
    const markup = html(App, {})
    assert.match(markup, /기본 탐색/)
    assert.match(markup, /오늘만 다른 루틴 선택/)
    assert.match(markup, /운동 시작/)
    assert.match(markup, /MOCK PROTOTYPE/)
    assert.doesNotMatch(markup, /서버 연결 확인 중/)
    assert.equal(globalThis.fetch.mock.calls.length, 0)
  } finally { globalThis.window = previous }
})
