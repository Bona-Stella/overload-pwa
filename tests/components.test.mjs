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
const { RoutineSelectionBadge } = await import('../src/features/routine/RoutineSelectionBadge.tsx')
const { ResumeWorkoutCard } = await import('../src/features/workout/ResumeWorkoutCard.tsx')
const { SettingsScreen } = await import('../src/features/settings/SettingsScreen.tsx')
const { CurrentWeightReview, ProgressChangeHistory } = await import('../src/features/history/ProgressionHistory.tsx')
const { WeightInput } = await import('../src/components/WeightInput.tsx')
const { RepsInput } = await import('../src/components/RepsInput.tsx')
const { CardioPlanEditor } = await import('../src/features/routine/CardioPlanEditor.tsx')
const c = await import('../src/features/workout/cardio.ts')
const { default: App } = await import('../src/App.tsx')
const m = await import('../src/features/workout/model.ts')
const NOW = new Date(2026, 9, 26, 12).getTime()
const noop = () => {}
const props = state => ({ state, now: NOW + 60000, onUpdate: noop, onExit: noop, onFinish: noop, onCreate: () => '' })
const html = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))

const cardioPlan = (kind = 'treadmill') => ({ id: 'cardio-plan', kind, name: c.CARDIO_NAMES[kind], targetSeconds: 60, targetDistance: null, intensity: null, incline: null, resistance: null })
function cardioState() {
  const state = m.createInitialState()
  return m.startWorkout(m.saveRoutine(state, { id: 'cardio', name: '유산소', exercises: [], cardio: [cardioPlan()] }, []), 'cardio', NOW)
}

test('cardio plan inputs show no weight fields and equipment-specific optional settings', () => {
  for (const kind of Object.keys(c.CARDIO_NAMES)) {
    const markup = html(CardioPlanEditor, { plan: cardioPlan(kind), onSave: noop, onCancel: noop })
    assert.match(markup, /목표 시간/)
    assert.doesNotMatch(markup, /본세트|최소 횟수|최초 중량|BPM|칼로리/)
    assert.equal(markup.includes('경사도'), kind === 'treadmill')
    assert.equal(markup.includes('저항 레벨'), kind === 'bike')
    assert.equal(markup.includes('목표 거리'), ['treadmill', 'bike', 'outdoor'].includes(kind))
  }
})

test('cardio-only preparation has explicit start and zero actual time without warmup or weight controls', () => {
  const markup = html(WorkoutScreen, props(cardioState()))
  assert.match(markup, /유산소 시작/)
  assert.match(markup, /시작을 눌러야 측정/)
  assert.match(markup, /00:00:00/)
  assert.doesNotMatch(markup, /준비운동 완료|중량 변경|본세트 기록|휴식 종료|다음 세트 준비/)
})

test('cardio running and review use actual timer and optional results without rest warnings or automatic target completion', () => {
  let state = cardioState()
  const id = state.active.cardio[0].id
  state = c.startCardio(state, id, NOW)
  let markup = html(WorkoutScreen, { ...props(state), now: NOW + 65000 })
  assert.match(markup, /00:01:05/)
  assert.match(markup, /목표 시간 도달/)
  assert.match(markup, /일시정지|유산소 완료/)
  assert.doesNotMatch(markup, /다음 세트 준비|rest-preparation-card|휴식 종료|실제 거리/)
  state = c.reviewCardio(state, id, NOW + 65000)
  markup = html(WorkoutScreen, props(state))
  assert.match(markup, /타이머 자동 기록/)
  assert.match(markup, /실제 거리|수동 선택 입력|방치 등으로 실제 시간 정정|유산소 기록 확정/)
  assert.doesNotMatch(markup, /정정 실제 시간 \(초\)/)
})

test('skipped cardio summary cannot claim full completion and keeps weight volume isolated', () => {
  const state = m.finishWorkout(cardioState(), NOW + 60000, true)
  const markup = html(SessionDetail, { session: state.history[0], saved: true })
  assert.match(markup, /유산소 완료 0\/1 종목/)
  assert.match(markup, /미시작 · 건너뜀/)
  assert.doesNotMatch(markup, /전체 루틴 완료|이 운동의 중량 검토 결과/)
  assert.equal(m.summary(state.history[0], NOW).volume, 0)
})

test('resume exposes persisted cardio review state and timer; weight progress has no persistent cardio add', () => {
  let state = cardioState()
  const id = state.active.cardio[0].id
  state = c.reviewCardio(c.startCardio(state, id, NOW), id, NOW + 10000)
  assert.match(html(ResumeWorkoutCard, { session: state.active, now: NOW + 60000, onResume: noop }), /유산소 완료 확인/)
  assert.match(html(ResumeWorkoutCard, { session: state.active, now: NOW + 60000, onResume: noop }), /00:00:10/)
  assert.doesNotMatch(html(WorkoutScreen, props(m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW)))), /＋ 유산소 추가/)
})

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

test('existing routine editor offers explicit progress editing separately from original weight and keeps Monday-first days', () => {
  const state = m.createInitialState()
  const markup = html(RoutineEditor, { state, routine: state.routines[0], onSave: noop, onCancel: noop, onCreate: () => '' })
  assert.match(markup, /루틴 저장/)
  assert.match(markup, /취소/)
  assert.match(markup, /현재 진행 중량/)
  assert.match(markup, /60 kg/)
  assert.match(markup, /1번 종목 진행 중량 변경/)
  assert.match(markup, /루틴 저장을 눌러 새 중량을 승인/)
  assert.match(markup, /진행 중인 운동은 유지하고 다음 새 운동부터 적용/)
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

test('home has no global header, renders four navigation tabs and does not request Health', t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Home must not request the API') })
  const previous = globalThis.window
  globalThis.window = { localStorage: { getItem: () => null } }
  try {
    const markup = html(App, {})
    assert.match(markup, /기본 탐색/)
    assert.match(markup, /오늘만 다른 루틴 선택/)
    assert.match(markup, /운동 시작/)
    assert.match(markup, /MOCK PROTOTYPE/)
    assert.doesNotMatch(markup, /app-header|brand-mark|Overload 홈/)
    const navigation = markup.slice(markup.indexOf('<nav class="tab-bar"'))
    assert.equal([...navigation.matchAll(/<button(?:\s|>)/g)].length, 4)
    assert.ok(navigation.indexOf('>홈<') < navigation.indexOf('>루틴<'))
    assert.ok(navigation.indexOf('>루틴<') < navigation.indexOf('>기록<'))
    assert.ok(navigation.indexOf('>기록<') < navigation.indexOf('>설정<'))
    assert.equal([...navigation.matchAll(/aria-current="page"/g)].length, 1)
    assert.doesNotMatch(markup, /서버 연결 확인 중/)
    assert.equal(globalThis.fetch.mock.calls.length, 0)
  } finally { globalThis.window = previous }
})

test('routine badge follows selected and scheduled IDs, including return to default and rest days', () => {
  const state = m.createInitialState()
  const schedule = structuredClone(state.schedule)
  const monday = new Date(2026, 9, 26)
  const defaultId = m.selectRoutine(state, monday)?.id
  const labels = ['push', 'pull', 'push', ''].map(id => html(RoutineSelectionBadge, { selectedId: m.selectRoutine(state, monday, id)?.id, defaultId }))
  assert.match(labels[0], /요일 기본 루틴/)
  assert.match(labels[1], /오늘만 선택/)
  assert.match(labels[2], /요일 기본 루틴/)
  assert.match(labels[3], /REST DAY/)
  const sundayDefault = m.selectRoutine(state, new Date(2026, 10, 1))?.id
  assert.match(html(RoutineSelectionBadge, { defaultId: sundayDefault }), /REST DAY/)
  assert.match(html(RoutineSelectionBadge, { selectedId: 'pull', defaultId: sundayDefault }), /오늘만 선택/)
  assert.deepEqual(state.schedule, schedule)
})

test('settings menu exposes only implemented sections and waits to mount Health', t => {
  t.mock.method(globalThis, 'fetch', () => { throw new Error('Menu must not request Health') })
  const markup = html(SettingsScreen, { settings: m.DEFAULT_REST_SETTINGS, onSave: noop })
  assert.match(markup, /설정 메뉴/)
  assert.match(markup, /휴식시간/)
  assert.match(markup, /로컬 저장 안내/)
  assert.match(markup, /서버 연결 진단/)
  assert.doesNotMatch(markup, /로그아웃|디로딩|서버 연결 확인 중/)
  assert.equal(globalThis.fetch.mock.calls.length, 0)
})

const resume = (state, now = NOW + 60000) => html(ResumeWorkoutCard, { session: state.active, now, onResume: noop })
const actions = state => html(WorkoutScreen, props(state)).split('<div class="bottom-actions workout-actions">')[1]
function completeExercise(state, reps = ['10', '10', '10'], exerciseId = state.active.currentExerciseId) {
  const e = state.active.exercises.find(e => e.id === exerciseId)
  for (const [i, set] of e.sets.entries()) {
    state = m.editReps(state, e.id, set.id, reps[i])
    state = m.completeSet(state, e.id, set.id, NOW + 59000)
  }
  return state
}

test('resume card distinguishes warmup and working while preserving elapsed time and completion', () => {
  const state = m.startWorkout(m.createInitialState(), 'push', NOW)
  assert.match(resume(state), /준비운동 중/)
  assert.match(resume(state), /0세트 완료 · 전체 00:01:00/)
  assert.doesNotMatch(resume(state), /남은 휴식|완료 후 경과/)
  assert.match(resume(m.beginWorking(state)), /운동 중/)
})

test('resume derives rest by its deadline, including manual navigation and expiry without writing', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  const e = state.active.exercises[0]
  state = m.editReps(state, e.id, e.sets[0].id, '10')
  state = m.completeSet(state, e.id, e.sets[0].id, NOW + 1000)
  state = m.navigateExercise(state, state.active.exercises[1].id)
  const before = JSON.stringify(state)
  assert.match(resume(state), /휴식 중/)
  assert.match(resume(state), /남은 휴식 00:01:01/)
  assert.match(resume(state, NOW + 70000), /남은 휴식 00:00:51/)
  const expired = resume(state, NOW + 130000)
  assert.match(expired, /운동 중/)
  assert.doesNotMatch(expired, /휴식 중|남은 휴식/)
  assert.equal(JSON.stringify(state), before)
})

test('resume shares transition and legacy timer resolution and prioritizes explicit finish waiting', () => {
  let state = completeExercise(m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW)))
  const e = state.active.exercises[0]
  assert.match(resume(state), /종목 전환 중/)
  assert.match(resume(state), /완료 후 경과 00:00:01/)
  state = m.navigateExercise(state, state.active.exercises[1].id)
  assert.match(resume(state), /완료 후 경과 00:00:01/)
  state.active.timer = { kind: 'rest', exerciseId: e.id, setId: e.sets[2].id, endAt: NOW + 200000 }
  const before = JSON.stringify(state)
  assert.match(resume(state), /종목 전환 중/)
  assert.doesNotMatch(resume(state), /남은 휴식/)
  assert.equal(JSON.stringify(state), before)
  const undone = m.undoSet(state, e.id, e.sets[0].id)
  assert.doesNotMatch(resume(undone), /종목 전환 중|완료 후 경과/)
  for (const next of state.active.exercises.slice(1)) state = completeExercise(state, undefined, next.id)
  assert.match(resume(state), /운동 종료 대기/)
  assert.doesNotMatch(resume(state), /종목 전환 중|휴식 중|완료 후 경과/)
  assert.equal(state.history.length, 0)
})

test('eligible increase appears in fixed actions before next or finish, never during intermediate sets', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  const e = state.active.exercises[0]
  for (const set of e.sets) {
    state = m.editReps(state, e.id, set.id, '10')
    state = m.completeSet(state, e.id, set.id, NOW + 59000)
    if (set.id !== e.sets.at(-1).id) assert.doesNotMatch(actions(state), /증량 가능/)
  }
  const next = actions(state)
  assert.match(next, /증량 가능 · 60kg/)
  assert.ok(next.indexOf('증량 가능') < next.indexOf('다음 종목으로'))
  assert.equal(state.progress[e.id], 60)
  for (const next of state.active.exercises.slice(1)) {
    state = m.navigateExercise(state, next.id)
    state = completeExercise(state)
  }
  const final = actions(state)
  assert.match(final, /증량 가능/)
  assert.ok(final.indexOf('증량 가능') < final.indexOf('운동 종료 및 요약'))
  assert.equal(state.history.length, 0)
})

test('increase banner disappears on undo or missed target and returns only after qualifying re-completion', () => {
  let state = completeExercise(m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW)))
  const e = state.active.exercises[0]
  const set = e.sets[2]
  state = m.undoSet(state, e.id, set.id)
  assert.doesNotMatch(actions(state), /증량 가능/)
  state = m.editReps(state, e.id, set.id, '9')
  state = m.completeSet(state, e.id, set.id, NOW + 59000)
  assert.doesNotMatch(actions(state), /증량 가능/)
  state = m.undoSet(state, e.id, set.id)
  state = m.editReps(state, e.id, set.id, '10')
  state = m.completeSet(state, e.id, set.id, NOW + 59000)
  assert.match(actions(state), /증량 가능/)
})

test('temporary, mixed-weight and expanded session sets cannot falsely show fixed increase advice', () => {
  const start = () => m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  const temporary = completeExercise(m.changeWeight(start(), 'push-bench', 60, 'today'))
  assert.doesNotMatch(actions(temporary), /증량 가능/)
  let mixed = start()
  const first = mixed.active.exercises[0].sets[0]
  mixed = m.editReps(mixed, 'push-bench', first.id, '10')
  mixed = m.completeSet(mixed, 'push-bench', first.id, NOW + 1000)
  mixed = completeExercise(m.changeWeight(mixed, 'push-bench', 62.5, 'progress'))
  assert.doesNotMatch(actions(mixed), /증량 가능/)
  const expanded = completeExercise(m.addSessionSet(start(), 'push-bench'), ['10', '10', '10', '10'])
  assert.doesNotMatch(actions(expanded), /증량 가능/)
})

function withAchievedBenchmark() {
  let state = m.createInitialState()
  state.routines = [{ ...state.routines[0], exercises: [state.routines[0].exercises[0]] }]
  state.schedule = { 1: 'push' }
  state = completeExercise(m.beginWorking(m.startWorkout(state, 'push', NOW)))
  state = m.finishWorkout(state, NOW + 60000)
  return m.beginWorking(m.startWorkout(state, 'push', NOW + 70000))
}

test('next workout shows a nonblocking approved benchmark reminder with an explicit change action, without claiming last workout', () => {
  const state = withAchievedBenchmark()
  const before = structuredClone(state)
  const markup = html(WorkoutScreen, props(state))
  assert.match(markup, /기준 기록 증량 안내/)
  assert.match(markup, /현재 기준 기록에서 증량 조건 달성/)
  assert.match(markup, /승인 60kg · 10\/10\/10회/)
  assert.match(markup, /지금 변경<\/button>/)
  assert.match(markup, /1세트 완료<\/button>/)
  assert.doesNotMatch(markup, /지난 운동에서|<dialog/)
  assert.deepEqual(state, before)
})

test('benchmark reminder keeps approved evidence separate from today-only weight and disappears at a new approved weight', () => {
  let state = m.changeWeight(withAchievedBenchmark(), 'push-bench', 50, 'today')
  let markup = html(WorkoutScreen, props(state))
  assert.match(markup, /오늘만 중량/)
  assert.match(markup, /승인 60kg · 10\/10\/10회/)
  assert.equal(state.progress['push-bench'], 60)
  assert.equal(state.active.exercises[0].weight, 50)
  state = m.changeWeight(state, 'push-bench', 62.5, 'progress')
  markup = html(WorkoutScreen, props(state))
  assert.doesNotMatch(markup, /기준 기록 증량 안내|지금 변경/)
  assert.match(markup, /62\.5/)
})

test('shared weight control exposes direct decimal input and non-submit step buttons with zero and invalid boundaries', () => {
  const markup = html(WeightInput, { label: '중량', value: '61.3', onChange: noop })
  assert.match(markup, /inputMode="decimal"/i)
  assert.match(markup, /중량 직접 입력/)
  assert.match(markup, /<input aria-label="중량"/)
  assert.match(markup, /value="61\.3"/)
  assert.match(markup, /type="button"[^>]*aria-label="중량 2.5kg 감소"/)
  assert.match(markup, /중량 2.5kg 증가/)
  assert.match(markup, /−2\.5/)
  assert.match(markup, /\+2\.5/)
  const zero = html(WeightInput, { label: '중량', value: '0', onChange: noop })
  assert.match(zero, /aria-label="중량 2.5kg 감소" disabled=""/)
  const blank = html(WeightInput, { label: '중량', value: '', onChange: noop })
  assert.equal([...blank.matchAll(/ disabled=""/g)].length, 2)
})

test('history distinguishes then, current and explicit adjustment events while hiding empty sections', () => {
  let state = withAchievedBenchmark()
  const historic = state.history[0]
  const then = html(SessionDetail, { session: historic, saved: true })
  assert.match(then, /이 운동의 중량 검토 결과/)
  assert.match(then, /당시 증량 가능/)
  assert.match(then, /승인 60kg · 10\/10\/10회/)
  assert.match(html(CurrentWeightReview, { state }), /기준 기록: 증량 가능/)
  assert.equal(html(ProgressChangeHistory, { state }), '')
  state = m.saveRoutine(state, state.routines[0], [1], false, { 'push-bench': 62.5 }, NOW)
  assert.equal(html(CurrentWeightReview, { state }), '')
  const events = html(ProgressChangeHistory, { state })
  assert.match(events, /진행 중량 변경 내역/)
  assert.match(events, /60 → 62.5kg/)
  assert.match(events, /증량 완료 \+2.5kg/)
  assert.match(events, /datetime=/i)
  assert.equal(html(SessionDetail, { session: state.history[0], saved: true }), then)
  state = m.saveRoutine(state, state.routines[0], [1], false, { 'push-bench': 57.5 }, NOW + 1000)
  assert.match(html(ProgressChangeHistory, { state }), /감량 완료 −5kg/)
})

test('per-set reps control provides named numeric direct input, draft-only step buttons and disabled completed values', () => {
  const render = (value, disabled = false) => html(RepsInput, { ordinal: 2, value, disabled, onChange: noop })
  const markup = render('11')
  assert.match(markup, /type="text" inputMode="numeric" aria-label="2세트 이번 반복 횟수"/)
  assert.match(markup, /type="button"[^>]*aria-label="2세트 1회 감소"/)
  assert.match(markup, /2세트 1회 증가/)
  assert.match(markup, /value="11"/)
  assert.doesNotMatch(markup, /disabled/)
  assert.match(render('1'), /aria-label="2세트 1회 감소" disabled=""/)
  assert.match(render(String(Number.MAX_SAFE_INTEGER)), /aria-label="2세트 1회 증가" disabled=""/)
  for (const value of ['', '.', '0', '-1', '1.5', '9007199254740992']) assert.equal([...render(value).matchAll(/ disabled=""/g)].length, 2)
  assert.equal([...render('11', true).matchAll(/ disabled=""/g)].length, 3)
})

test('rest readiness follows the saved deadline at 11, 10, 6, 5, 1 and zero seconds without changing data', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  const e = state.active.exercises[0]
  state = m.editReps(state, e.id, e.sets[0].id, '11')
  state = m.completeSet(state, e.id, e.sets[0].id, NOW)
  const endAt = state.active.timer.endAt
  const raw = JSON.stringify(state)
  for (const seconds of [11, 10, 6, 5, 1, 0, -1]) {
    const markup = html(WorkoutScreen, { ...props(state), now: endAt - seconds * 1000 })
    if (seconds > 0 && seconds <= 10) assert.match(markup, /rest-warning[\s\S]*다음 세트 준비/)
    else assert.doesNotMatch(markup, /rest-warning|다음 세트 준비/)
    if (seconds > 0 && seconds <= 5) assert.match(markup, /rest-urgent/)
    else assert.doesNotMatch(markup, /rest-urgent/)
    if (seconds <= 0) assert.match(markup, /휴식 완료/)
    assert.equal(JSON.stringify(state), raw)
  }
  assert.match(html(WorkoutScreen, { ...props(state), now: endAt - 10001 }), /00:00:11/)
  const restored = JSON.parse(raw)
  assert.match(html(WorkoutScreen, { ...props(restored), now: endAt - 5000 }), /rest-urgent/)
  assert.doesNotMatch(html(WorkoutScreen, { ...props(m.adjustRest(state, 30, endAt - 5000)), now: endAt - 5000 }), /rest-warning|rest-urgent|다음 세트 준비/)
  assert.doesNotMatch(html(WorkoutScreen, { ...props(m.adjustRest(state, null, endAt - 5000)), now: endAt - 5000 }), /rest-warning|rest-urgent|다음 세트 준비/)
})

test('rest warning never appears on transition elapsed time or all-complete screens', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  for (const e of state.active.exercises) {
    for (const set of e.sets) {
      state = m.editReps(state, e.id, set.id, '10')
      state = m.completeSet(state, e.id, set.id, NOW)
    }
    const markup = html(WorkoutScreen, { ...props(state), now: NOW + 5000 })
    assert.doesNotMatch(markup, /rest-warning|rest-urgent|다음 세트 준비/)
  }
  assert.match(html(WorkoutScreen, props(state)), /모든 종목 완료/)
})

test('bottom readiness card shares rounded time with the header and precedes both rest actions at every boundary', () => {
  let state = m.beginWorking(m.startWorkout(m.createInitialState(), 'push', NOW))
  const e = state.active.exercises[0]
  state = m.completeSet(m.editReps(state, e.id, e.sets[0].id, '10'), e.id, e.sets[0].id, NOW)
  const deadline = state.active.timer.endAt
  const unchanged = JSON.stringify(state)
  for (const remaining of [11000, 10001, 10000, 6000, 5001, 5000, 1000, 1, 0, -1000]) {
    const markup = html(WorkoutScreen, { ...props(state), now: deadline - remaining })
    const footer = markup.slice(markup.indexOf('class="bottom-actions workout-actions"'))
    const seconds = Math.ceil(remaining / 1000)
    if (remaining > 0 && seconds <= 10) {
      assert.match(footer, /aria-label="휴식 종료 준비"/)
      assert.match(footer, new RegExp(`다음 세트 준비</span><strong>${seconds}<small>초</small>`))
      assert.match(markup.split('</header>')[0], new RegExp(`00:00:${String(seconds).padStart(2, '0')}`))
      assert.match(footer, /휴식 종료 준비[\s\S]*<\/aside><div class="row full"><button[^>]*>휴식 종료<\/button><button[^>]*>＋30초/)
      assert.equal([...markup.matchAll(/다음 세트 준비/g)].length, 1)
      assert.equal(footer.includes('rest-urgent'), seconds <= 5)
    } else assert.doesNotMatch(footer, /rest-preparation-card|휴식 종료 준비/)
    assert.equal(JSON.stringify(state), unchanged)
  }
  const now = deadline - 5000
  const extended = m.adjustRest(state, 30, now)
  assert.doesNotMatch(html(WorkoutScreen, { ...props(extended), now }), /rest-preparation-card/)
  assert.match(html(WorkoutScreen, { ...props(extended), now: extended.active.timer.endAt - 10000 }), /rest-preparation-card/)
  assert.doesNotMatch(html(WorkoutScreen, { ...props(m.adjustRest(state, null, now)), now }), /rest-preparation-card/)
})

test('bottom readiness card stays absent in warmup, idle, other-exercise rest, transition and finish waiting', () => {
  let state = m.startWorkout(m.createInitialState(), 'push', NOW)
  assert.doesNotMatch(html(WorkoutScreen, props(state)), /rest-preparation-card/)
  state = m.beginWorking(state)
  assert.doesNotMatch(html(WorkoutScreen, props(state)), /rest-preparation-card/)
  const e = state.active.exercises[0]
  state = m.completeSet(m.editReps(state, e.id, e.sets[0].id, '10'), e.id, e.sets[0].id, NOW)
  assert.doesNotMatch(html(WorkoutScreen, { ...props(m.navigateExercise(state, state.active.exercises[1].id)), now: state.active.timer.endAt - 5000 }), /rest-preparation-card/)
  for (const exercise of state.active.exercises) {
    for (const set of exercise.sets) {
      state = m.editReps(state, exercise.id, set.id, '10')
      state = m.completeSet(state, exercise.id, set.id, NOW)
    }
    assert.doesNotMatch(html(WorkoutScreen, { ...props(state), now: NOW + 5000 }), /rest-preparation-card/)
  }
})
