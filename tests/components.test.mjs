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

test('final completion keeps its records visible and offers next exercise with elapsed time instead of rest', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  const exercise = state.active.exercises[0]
  for (const set of exercise.sets) {
    state = m.editReps(state, exercise.id, set.id, '10')
    state = m.completeSet(state, exercise.id, set.id, NOW + 59000)
    if (set.id !== exercise.sets.at(-1).id) {
      const markup = html(WorkoutScreen, props(state))
      assert.match(markup, /남은 휴식/)
      assert.match(markup, /휴식 종료/)
      assert.match(markup, /＋30초/)
    }
  }
  const markup = html(WorkoutScreen, props(state))
  assert.match(markup, /바벨 벤치프레스/)
  assert.match(markup, /다음 종목으로<\/button>/)
  assert.doesNotMatch(markup, /인클라인 덤벨 프레스/)
  assert.match(markup, /이전 종목 완료 후/)
  assert.match(markup, /00:00:01/)
  assert.doesNotMatch(markup, /남은 휴식|휴식 종료|＋30초/)
  assert.match(markup, /중량 증가를 고려/)
  assert.match(markup, /1세트 완료 취소/)
  const moved = html(WorkoutScreen, props(m.navigateExercise(state, state.active.exercises[1].id)))
  assert.match(moved, /인클라인 덤벨 프레스/)
  assert.match(moved, /이전 종목 완료 후/)
  assert.match(moved, /00:00:01/)
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
  assert.match(markup, /운동 기록 저장 완료/)
  assert.match(markup, /완료 1\/9 본세트/)
  assert.doesNotMatch(markup, /WORKOUT COMPLETE|전체 루틴 완료/)
})

test('finishing only the first exercise shows 3/9 and does not claim the full routine was completed', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  const exercise = state.active.exercises[0]
  for (const set of exercise.sets) {
    state = m.editReps(state, exercise.id, set.id, '10')
    state = m.completeSet(state, exercise.id, set.id, NOW + 59000)
  }
  const finished = m.finishWorkout(state, NOW + 60000, true)
  const markup = html(SessionDetail, { session: finished.history[0], saved: true })
  assert.match(markup, /완료 3\/9 본세트/)
  assert.match(markup, /완료한 세트 없음/)
  assert.doesNotMatch(markup, /WORKOUT COMPLETE|전체 루틴 완료/)
})

test('existing routine editor shows read-only progress weight and Monday-first days', () => {
  const state = m.createInitialState()
  const markup = html(RoutineEditor, { state, routine: state.routines[0], onSave: noop, onCancel: noop, onCreate: () => '' })
  assert.match(markup, /루틴 저장/)
  assert.match(markup, /취소/)
  assert.match(markup, /현재 진행 중량/)
  assert.match(markup, /60 kg/)
  assert.doesNotMatch(markup, /최초 중량/)
  assert.match(markup, /aria-pressed="true"/)
  assert.deepEqual([...markup.matchAll(/aria-pressed="(?:true|false)"[^>]*>(.)<\/button>/g)].map(match => match[1]), ['월', '화', '수', '목', '금', '토', '일'])
})

test('new routine exercises still offer initial weight input', () => {
  const state = m.createInitialState()
  const routine = { id: 'new', name: '', exercises: [{ ...state.routines[0].exercises[0], id: 'new-placement' }] }
  const markup = html(RoutineEditor, { state, routine, onSave: noop, onCancel: noop, onCreate: () => '' })
  assert.match(markup, /최초 중량 \(kg\)/)
  assert.doesNotMatch(markup, /현재 진행 중량/)
})

test('all complete screen offers explicit finish and can reopen completed sets without timers', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  for (const e of state.active.exercises) for (const set of e.sets) {
    state = m.editReps(state, e.id, set.id, '8')
    state = m.completeSet(state, e.id, set.id, NOW + 59000)
  }
  const markup = html(WorkoutScreen, props(state))
  assert.match(markup, /모든 종목 완료/)
  assert.match(markup, /class="primary full">운동 종료 및 요약<\/button>/)
  assert.match(markup, /종목 목록/)
  assert.match(markup, /완료 취소/)
  assert.doesNotMatch(markup, /이전 종목 완료 후|휴식 종료|＋30초/)
  const finished = m.finishWorkout(state, NOW + 60000)
  assert.match(html(SessionDetail, { session: finished.history[0], saved: true }), /전체 루틴 완료 · 완료 9\/9 본세트/)
  state = m.undoSet(state, state.active.exercises[2].id, state.active.exercises[2].sets[0].id)
  state = m.navigateExercise(state, state.active.exercises[2].id)
  const undone = html(WorkoutScreen, props(state))
  assert.doesNotMatch(undone, /모든 종목 완료/)
  assert.match(undone, /class="primary full">1세트 완료<\/button>/)
})

test('restored legacy final-set rest renders elapsed time and next action without any rest controls', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  const e = state.active.exercises[0]
  for (const set of e.sets) {
    state = m.editReps(state, e.id, set.id, '8')
    state = m.completeSet(state, e.id, set.id, NOW + 59000)
  }
  state.active.timer = { kind: 'rest', exerciseId: e.id, setId: e.sets[2].id, endAt: NOW + 200000 }
  const markup = html(WorkoutScreen, props(state))
  assert.match(markup, /이전 종목 완료 후/)
  assert.match(markup, /00:00:01/)
  assert.match(markup, /다음 종목으로<\/button>/)
  assert.match(markup, /바벨 벤치프레스/)
  assert.doesNotMatch(markup, /남은 휴식|휴식 종료|＋30초/)
  assert.equal(state.active.timer.kind, 'rest')
})

test('legacy all-complete rest is hidden and unknown history plans use neutral text', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  state.active.exercises = [state.active.exercises[0]]
  for (const set of state.active.exercises[0].sets) {
    state = m.editReps(state, 'push-bench', set.id, '8')
    state = m.completeSet(state, 'push-bench', set.id, NOW + 59000)
  }
  state.active.timer = { kind: 'rest', exerciseId: 'push-bench', setId: state.active.exercises[0].sets[2].id, endAt: NOW + 200000 }
  assert.doesNotMatch(html(WorkoutScreen, props(state)), /남은 휴식|휴식 종료/)
  const finished = m.finishWorkout(state, NOW + 60000)
  delete finished.history[0].exercises[0].plannedSetCount
  finished.history[0].exercises[0].structureModified = true
  const markup = html(SessionDetail, { session: finished.history[0], saved: true })
  assert.match(markup, /당시 계획 수 미확인/)
  assert.doesNotMatch(markup, /전체 루틴 완료/)
  assert.doesNotMatch(html(SessionDetail, { session: finished.history[0], saved: false }), /운동 기록 저장 완료/)
})

test('active home leads with resume before greeting and disables new workout creation', () => {
  const state = m.startWorkout(m.createInitialState(), 'push', NOW)
  const previous = globalThis.window
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(state) } }
  try {
    const markup = html(App, {})
    assert.ok(markup.indexOf('resume-card') < markup.indexOf('home-greeting'))
    assert.match(markup, /운동 이어하기/)
    assert.match(markup, /disabled="">진행 중인 운동을 이어가세요/)
  } finally { globalThis.window = previous }
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
