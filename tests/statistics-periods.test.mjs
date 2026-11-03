import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { StatisticsApi, periodFor } from '../src/features/statistics/api.ts'
import { mountPanel } from './fixtures/statistics-panel-hooks.mjs'
import { scope, OTHER } from './fixtures/workout-online-data.mjs'

const panelUrl = new URL('../src/features/statistics/StatisticsPanel.tsx', import.meta.url).href
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'react' && context.parentURL === panelUrl) return { url: new URL('./fixtures/statistics-panel-hooks.mjs', import.meta.url).href, shortCircuit: true }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url.endsWith('.css')) return { format: 'module', source: 'export default ""', shortCircuit: true }
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText }
    return next(url, context)
  },
})
const { StatisticsPanel, StatisticsView } = await import(panelUrl)
const now = new Date(2026, 10, 3, 12)
const flush = () => new Promise(resolve => setImmediate(resolve))
const weights = count => ({ plannedSets: '0', completedSets: String(count), reps: '0', volumeLoadKg: null, setsWithoutVolume: '0' })
function overview(owner, period, count) {
  return { statistics: { ...owner, ...period, planCoverage: 'PARTIAL_SCHEDULE_HISTORY', plannedWorkoutDays: null, routineAchievementPercent: null,
    summary: weights(count), cardioActiveMs: '0', unmappedCompletedSets: '0', days: [], exercises: [], muscles: [], groups: [], cardio: [], recentSessions: [],
  }, effectiveWorkoutDays: null, unknownPlanDays: 1, unverifiableDays: 0, plannedDays: [], cardioByKind: [] }
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  if (!tree || typeof tree !== 'object') return []
  return [tree, ...nodes(tree.props?.children)]
}
function setup(t, owner = scope, freezeTime = true) {
  if (freezeTime) t.mock.timers.enable({ apis: ['Date'], now: now.getTime() })
  const requests = [], invalid = []
  const api = new StatisticsApi({ workoutRequest: (userId, path, method, body, signal) => new Promise((resolve, reject) => {
    const query = new URL(path, 'https://local.invalid').searchParams
    requests.push({ userId, path, method, body, signal, period: Object.fromEntries(query), reject,
      respond(count, responseOwner = owner) { resolve({ status: 200, data: overview(responseOwner, Object.fromEntries(query), count) }) },
    }) })
  })
  const panel = mountPanel(StatisticsPanel, { api, scope: owner, refreshKey: 'home', onOpen() {}, onInvalid: error => invalid.push(error) })
  t.after(() => panel.unmount())
  let tree = panel.render()
  const view = () => nodes(tree).find(node => node.type === StatisticsView)
  return {
    panel, requests, invalid, view,
    render() { tree = panel.render(); return tree },
    click(label) {
      const button = nodes(tree).find(node => node.type === 'button' && node.props.children === label)
      assert.ok(button, `missing button ${label}`); button.props.onClick(); tree = panel.render()
    },
    open(screen) { assert.ok(view()); view().props.onScreen(screen); tree = panel.render() },
    pressed(label) { return nodes(tree).find(node => node.type === 'button' && node.props.children === label)?.props['aria-pressed'] },
    async respond(count) { requests.at(-1).respond(count); await flush(); tree = panel.render() },
  }
}
const expected = (mode = 'week', offset = 0) => periodFor(now, mode, offset)
function requested(f, mode = 'week', offset = 0) {
  const request = f.requests.at(-1)
  assert.deepEqual(request.period, expected(mode, offset))
  assert.equal(request.userId, scope.userId); assert.equal(request.method, 'GET'); assert.equal(request.body, undefined)
  assert.equal(request.path, '/api/v1/statistics/overview?' + new URLSearchParams(expected(mode, offset)))
}

test('activity and muscles keep independent mode/offset through summary navigation and request their own ranges', async t => {
  const f = setup(t)
  requested(f); await f.respond(1)
  f.open('activity'); requested(f); assert.equal(f.pressed('주간'), true); await f.respond(2)
  f.click('이전'); requested(f, 'week', -1); await f.respond(3)
  f.click('월간'); requested(f, 'month', 0); await f.respond(4)
  f.click('이전'); requested(f, 'month', -1); await f.respond(5)
  assert.equal(f.view().props.data.summary.completedSets, '5')
  f.click('이번 주 요약으로'); requested(f); await f.respond(6)
  f.open('muscles'); requested(f); assert.equal(f.pressed('주간'), true); await f.respond(7)
  f.click('다음'); requested(f, 'week', 1); await f.respond(8)
  f.click('월간'); requested(f, 'month', 0); await f.respond(9)
  f.click('다음'); requested(f, 'month', 1); await f.respond(10)
  f.click('이번 주 요약으로'); requested(f); await f.respond(11)
  f.open('activity'); requested(f, 'month', -1); assert.equal(f.pressed('월간'), true); await f.respond(12)
  f.click('주간'); requested(f); await f.respond(13)
  f.click('이번 주 요약으로'); await f.respond(14)
  f.open('muscles'); requested(f, 'month', 1); assert.equal(f.pressed('월간'), true); await f.respond(15)
  assert.equal(f.view().props.screen, 'muscles'); assert.equal(f.view().props.data.summary.completedSets, '15')
  const count = f.requests.length; f.render(); assert.equal(f.requests.length, count)
  assert.throws(() => f.click('연간'), /missing button/) // No unsupported period control.
})

test('period changes abort earlier requests and prevent late responses from replacing the selected range', async t => {
  const f = setup(t); await f.respond(1); f.open('activity'); await f.respond(2)
  f.click('이전'); const earlier = f.requests.at(-1)
  f.click('이전'); const selected = f.requests.at(-1)
  assert.equal(earlier.signal.aborted, true); requested(f, 'week', -2); assert.equal(f.view(), undefined)
  selected.respond(20); await flush(); f.render()
  assert.equal(f.view().props.data.summary.completedSets, '20')
  earlier.respond(99); await flush(); f.render()
  assert.equal(f.view().props.data.summary.completedSets, '20')
  f.click('이전'); const leaving = f.requests.at(-1)
  f.click('이번 주 요약으로'); assert.equal(leaving.signal.aborted, true)
  await f.respond(30); leaving.respond(100); await flush(); f.render()
  assert.equal(f.view().props.screen, 'summary'); assert.equal(f.view().props.data.summary.completedSets, '30')
})

test('refresh and empty/error results retain the selected detail period without duplicate requests', async t => {
  const f = setup(t); await f.respond(1); f.open('muscles'); await f.respond(2)
  f.click('월간'); await f.respond(3); f.click('이전'); await f.respond(0)
  requested(f, 'month', -1); assert.equal(f.view().props.data.summary.completedSets, '0')
  f.click('새로고침'); requested(f, 'month', -1); assert.equal(f.view(), undefined)
  f.requests.at(-1).reject(new Error('network')); await flush()
  assert.ok(nodes(f.render()).some(node => node.props?.role === 'alert'))
  f.click('새로고침'); requested(f, 'month', -1); await f.respond(7)
  assert.equal(f.view().props.data.summary.completedSets, '7')
  const count = f.requests.length; f.click('월간'); requested(f, 'month', 0)
  assert.equal(f.requests.length, count + 1); await f.respond(8)
  f.click('월간'); assert.equal(f.requests.length, count + 1)
})

test('growth navigation cancels overview and does not alter retained activity/muscle periods', async t => {
  const f = setup(t); await f.respond(1); f.open('activity'); await f.respond(2)
  f.click('이전'); await f.respond(3); f.click('이번 주 요약으로'); await f.respond(4)
  const count = f.requests.length, last = f.requests.at(-1)
  f.open('growth'); assert.equal(last.signal.aborted, true); assert.equal(f.requests.length, count)
  f.click('이번 주 요약으로'); requested(f); await f.respond(5)
  f.open('activity'); requested(f, 'week', -1); await f.respond(6)
  f.click('이번 주 요약으로'); await f.respond(7); f.open('muscles'); requested(f)
})

for (const [name, owner] of [['account', { ...scope, userId: OTHER }], ['generation', { ...scope, dataGeneration: '0' }]]) {
  test(`${name} boundary remount cancels old data and starts each detail at the default week`, async t => {
    const old = setup(t); await old.respond(1); old.open('activity'); await old.respond(2); old.click('월간')
    const pending = old.requests.at(-1); old.panel.unmount(); assert.equal(pending.signal.aborted, true)
    const next = setup(t, owner, false); assert.equal(next.requests.at(-1).userId, owner.userId)
    assert.deepEqual(next.requests.at(-1).period, expected()); await next.respond(10)
    pending.respond(99); await flush(); assert.equal(old.panel.lateUpdates, 0)
    next.open('activity'); assert.equal(next.pressed('주간'), true); assert.deepEqual(next.requests.at(-1).period, expected()); await next.respond(11)
    assert.equal(next.view().props.data.userId, owner.userId); assert.equal(next.view().props.data.dataGeneration, owner.dataGeneration)
    next.click('이번 주 요약으로'); await next.respond(12); next.open('muscles'); assert.equal(next.pressed('주간'), true)
  })
}

test('invalid owner/generation responses still invoke the existing invalidation callback', async t => {
  const f = setup(t)
  f.requests.at(-1).respond(1, { ...scope, userId: OTHER }); await flush(); f.render()
  assert.equal(f.invalid.at(-1).code, 'OWNER_MISMATCH'); assert.equal(f.view(), undefined)
  f.click('새로고침'); f.requests.at(-1).respond(1, { ...scope, dataGeneration: '0' }); await flush(); f.render()
  assert.equal(f.invalid.at(-1).code, 'DATA_GENERATION_MISMATCH'); assert.equal(f.view(), undefined)
})
