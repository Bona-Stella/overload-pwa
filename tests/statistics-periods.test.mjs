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
    if (specifier.endsWith('/app/navigation.ts') || specifier === 'react' && context.parentURL === panelUrl) return { url: new URL('./fixtures/statistics-panel-hooks.mjs', import.meta.url).href, shortCircuit: true }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url.endsWith('/RecordDisplayContext.ts')) return {format:'module',source:'export const useRecordPreview=()=>null',shortCircuit:true}
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
    summary: weights(count), cardioActiveMs: '0', unmappedCompletedSets: '0', days: [], exercises: [], muscles: [], groups: [], groupActuals: [], cardio: [], recentSessions: [],
  }, effectiveWorkoutDays: null, unknownPlanDays: 1, unverifiableDays: 0, plannedDays: [], cardioByKind: [] }
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  if (!tree || typeof tree !== 'object') return []
  return [tree, ...nodes(tree.props?.children)]
}
function setup(t, owner = scope, freezeTime = true) {
  globalThis.window = { history:{state:null}, scrollTo() {} }
  if (freezeTime) t.mock.timers.enable({ apis: ['Date'], now: now.getTime() })
  const requests = [], invalid = []
  const api = new StatisticsApi({ workoutRequest: (userId, path, method, body, signal) => new Promise((resolve, reject) => {
    const query = new URL(path, 'https://local.invalid').searchParams
    requests.push({ userId, path, method, body, signal, period: Object.fromEntries(query), reject,
      respond(count, responseOwner = owner) { this.settled=true; resolve({ status: 200, data: overview(responseOwner, Object.fromEntries(query), count) }) },
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
      const button = nodes(tree).find(node => node.props?.children === label && typeof node.props?.onClick === 'function')
      assert.ok(button, `missing button ${label}`); button.props.onClick(); tree = panel.render()
    },
    open(screen) { assert.ok(view()); view().props.onScreen(screen); tree = panel.render() },
    period(value) {
      const control=nodes(tree).find(n=>n.type?.name==='PeriodControls')
      assert.ok(control,'activity period control');control.props.onChange(value);tree=panel.render()
    },
    pressed(label) { return nodes(tree).find(node => node.type === 'button' && node.props.children === label)?.props['aria-pressed'] },
    async respond(count) { requests.filter(r=>!r.settled&&!r.signal.aborted).forEach(r=>r.respond(count)); await flush(); tree = panel.render() },
  }
}
const expected = (mode = 'week', offset = 0) => periodFor(now, mode, offset)
function requested(f, mode = 'week', offset = 0) {
  const request = f.requests.findLast(r=>JSON.stringify(r.period)===JSON.stringify(expected(mode,offset)))
  assert.ok(request,'requested statistics period '+mode)
  assert.deepEqual(request.period, expected(mode, offset))
  assert.equal(request.userId, scope.userId); assert.equal(request.method, 'GET'); assert.equal(request.body, undefined)
  assert.equal(request.path, '/api/v1/statistics/overview?' + new URLSearchParams(expected(mode, offset)))
}


test('activity period is retained but muscle statistics always requests the current week with no controls',async t=>{
  globalThis.window={history:{state:null}}
  const f=setup(t);requested(f);await f.respond(1)
  f.open('activity');await f.respond(2)
  f.period({mode:'month',anchor:'2026-10-20'});requested(f,'month',-1);await f.respond(3)
  f.click('‹ 기록으로');await f.respond(4)
  f.open('muscles');requested(f);await f.respond(5)
  assert(!nodes(f.render()).some(n=>n.type?.name==='PeriodControls'))
  f.click('‹ 기록으로');await f.respond(6);f.open('activity');requested(f,'month',-1)
  await f.respond(7);assert.equal(f.view().props.data.summary.completedSets,'7')
  delete globalThis.window
})
test('calendar period changes abort old reads and late responses cannot replace the selected range',async t=>{
  const f=setup(t);await f.respond(1);f.open('activity');await f.respond(2)
  f.period({mode:'week',anchor:'2026-10-20'});const earlier=f.requests.at(-1)
  f.period({mode:'month',anchor:'2026-09-20'});const selected=f.requests.findLast(r=>r.period.fromDate==='2026-09-01')
  assert.equal(earlier.signal.aborted,true);assert.equal(f.view().props.data.summary.completedSets,'2')
  assert(nodes(f.render()).some(n=>n.props?.['aria-busy']===true))
  selected.respond(20);await flush();f.render();earlier.respond(99);await flush();f.render()
  assert.equal(f.view().props.data.summary.completedSets,'20')
})
test('failed requests offer a retry and retain the selected activity period',async t=>{
  const f=setup(t);await f.respond(1);f.open('activity');await f.respond(2)
  f.period({mode:'month',anchor:'2026-10-20'})
  f.requests.findLast(r=>r.period.fromDate==='2026-10-01').reject(Error('offline'));await flush()
  assert(nodes(f.render()).some(n=>n.props?.role==='alert'))
  f.click('다시 조회');requested(f,'month',-1);await f.respond(0)
  assert.equal(f.view().props.data.summary.completedSets,'0')
})
test('growth and plan screens stop overview reads',async t=>{
  globalThis.window={history:{state:null}}
  const f=setup(t);await f.respond(1);const count=f.requests.length
  f.open('growth');assert.equal(f.requests.length,count);assert.equal(f.requests.at(-1).signal.aborted,true)
  f.click('‹ 기록으로');await f.respond(2);f.open('plan');assert.equal(f.requests.length,count+1)
  delete globalThis.window
})
for(const [name,owner] of [['account',{...scope,userId:OTHER}],['generation',{...scope,dataGeneration:'0'}]]){
  test(name+' boundary aborts old data and starts a fresh period',async t=>{
    const old=setup(t);await old.respond(1);old.open('activity');await old.respond(2)
    old.period({mode:'month',anchor:'2026-10-20'});const pending=old.requests.at(-1);old.panel.unmount()
    assert.equal(pending.signal.aborted,true)
    const next=setup(t,owner,false);assert.deepEqual(next.requests.at(-1).period,expected());await next.respond(10)
    pending.respond(99);await flush();assert.equal(old.panel.lateUpdates,0)
    assert.equal(next.view().props.data.userId,owner.userId)
  })
}
test('owner and generation validation still invalidates the current account scope',async t=>{
  const f=setup(t);f.requests.at(-1).respond(1,{...scope,userId:OTHER});await flush();f.render()
  assert.equal(f.invalid.at(-1).code,'OWNER_MISMATCH');assert.equal(f.view(),undefined)
  f.click('다시 조회');f.requests.at(-1).respond(1,{...scope,dataGeneration:'0'});await flush();f.render()
  assert.equal(f.invalid.at(-1).code,'DATA_GENERATION_MISMATCH')
})
