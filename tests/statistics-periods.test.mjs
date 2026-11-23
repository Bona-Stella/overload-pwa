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
const growthUrl = new URL('../src/features/statistics/GrowthPanel.tsx', import.meta.url).href
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.endsWith('/app/navigation.ts') || specifier === 'react' && [panelUrl, growthUrl].includes(context.parentURL)) return { url: new URL('./fixtures/statistics-panel-hooks.mjs', import.meta.url).href, shortCircuit: true }
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
const { GrowthPanel } = await import(growthUrl)
const { RecordSubpageHeader } = await import('../src/components/RecordSubpageHeader.tsx')
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
  const props = { api, scope: owner, refreshKey: 'home', onOpen() {}, onInvalid: error => invalid.push(error) }
  const panel = mountPanel(StatisticsPanel, props)
  t.after(() => { panel.unmount(); delete globalThis.window })
  let tree = panel.render()
  const view = () => nodes(tree).find(node => node.type === StatisticsView)
  const control = () => nodes(tree).find(node => node.type?.name === 'PeriodControls')?.props
  return {
    panel, requests, invalid, view, control,
    render() { tree = panel.render(); return tree },
    refresh(refreshKey) { props.refreshKey = refreshKey; tree = panel.render() },
    update(changes) { Object.assign(props, changes); tree = panel.render() },
    click(label) {
      const button = nodes(tree).find(node => node.props?.children === label && typeof node.props?.onClick === 'function')
      assert.ok(button, `missing button ${label}`); button.props.onClick(); tree = panel.render()
    },
    back(title) {
      const growth = nodes(tree).find(node => node.type === GrowthPanel)
      const growthView = growth && mountPanel(GrowthPanel, growth.props)
      try {
        const header = nodes(growthView ? growthView.render() : tree).find(node => node.type === RecordSubpageHeader)
        assert.equal(header?.props.title, title)
        const backButton = nodes(RecordSubpageHeader(header.props)).find(node => node.props?.['aria-label'] === '기록으로')
        assert.equal(typeof backButton?.props.onClick, 'function', 'accessible back button')
        backButton.props.onClick()
        tree = panel.render()
      } finally {
        growthView?.unmount()
      }
    },
    open(screen) { assert.ok(view()); view().props.onScreen(screen); tree = panel.render() },
    period(value) {
      assert.ok(control(), 'activity period control'); control().onChange(value); tree = panel.render()
    },
    pressed(label) { return nodes(tree).find(node => node.type === 'button' && node.props.children === label)?.props['aria-pressed'] },
    async respond(count) { requests.filter(r=>!r.settled&&!r.signal.aborted).forEach(r=>r.respond(count)); await flush(); tree = panel.render() },
  }
}
const expected = (mode = 'week', offset = 0) => periodFor(now, mode, offset)
function requested(f, mode = 'week', offset = 0, since = 0) {
  const request = f.requests.slice(since).findLast(r=>JSON.stringify(r.period)===JSON.stringify(expected(mode,offset)))
  assert.ok(request,'requested statistics period '+mode)
  assert.deepEqual(request.period, expected(mode, offset))
  assert.equal(request.userId, scope.userId); assert.equal(request.method, 'GET'); assert.equal(request.body, undefined)
  assert.equal(request.path, '/api/v1/statistics/overview?' + new URLSearchParams(expected(mode, offset)))
}


test('activity period is retained and muscle statistics reuses the matching current week without another request',async t=>{
  const f=setup(t);requested(f);await f.respond(1)
  f.open('activity');await f.respond(2)
  const beforeMonth=f.requests.length
  f.period({mode:'month',anchor:'2026-10-20'});requested(f,'month',-1,beforeMonth);await f.respond(3)
  f.back('운동 현황');await f.respond(4);assert.equal(f.view().props.screen,'summary')
  const beforeMuscles=f.requests.length
  f.open('muscles');assert.equal(f.requests.length,beforeMuscles)
  assert.equal(f.view().props.screen,'muscles')
  assert.equal(f.view().props.data.summary.completedSets,'4')
  assert(!nodes(f.render()).some(n=>n.type?.name==='PeriodControls'))
  f.back('주간 근육 통계');await f.respond(6);assert.equal(f.view().props.screen,'summary')
  const beforeReturn=f.requests.length
  f.open('activity')
  assert.equal(f.requests.slice(beforeReturn).some(request => request.period.fromDate === '2026-10-01'), false)
  assert.equal(f.view().props.data.summary.completedSets,'3')
})

test('first mode switch retains the committed mode and data, then cached switches send no requests', async t => {
  const f = setup(t)
  f.open('activity')
  assert.equal(f.requests.length, 1, 'the initial week shares the summary read and does not preload the month')
  await f.respond(7)
  const week = f.control().value, month = { ...week, mode: 'month' }
  f.period(month)
  assert.deepEqual(f.control().value, week)
  assert.equal(f.control().pendingMode, 'month')
  assert.equal(f.view().props.data.summary.completedSets, '7')
  assert.equal(f.view().props.activityState, undefined)
  assert.equal(f.requests.length, 2, 'only the month needs a read')
  await f.respond(37)
  assert.deepEqual(f.control().value, month)
  assert.equal(f.control().pendingMode, undefined)
  assert.equal(f.view().props.data.summary.completedSets, '37')
  f.period(week)
  assert.equal(f.view().props.data.summary.completedSets, '7')
  f.period(month)
  assert.equal(f.view().props.data.summary.completedSets, '37')
  assert.equal(f.requests.length, 2)
})

test('switching from a month to a new week shares the pending weekly achievement read', async t => {
  const f = setup(t)
  f.open('activity'); await f.respond(7)
  f.period({ ...f.control().value, mode: 'month' }); await f.respond(37)
  const month = { mode: 'month', anchor: '2026-11-20' }, week = { ...month, mode: 'week' }
  const before = f.requests.length
  f.period(month)
  const request = f.requests.at(-1)
  assert.equal(f.requests.length, before + 1)
  f.period(week)
  assert.equal(f.control().pendingMode, 'week')
  assert.deepEqual(f.control().value, month)
  assert.equal(f.view().props.data.summary.completedSets, '37')
  assert.equal(request.signal.aborted, false)
  assert.equal(f.requests.length, before + 1)
  await f.respond(13)
  assert.deepEqual(f.control().value, week)
  assert.equal(f.view().props.data.summary.completedSets, '13')
})

test('failed and canceled mode switches cannot replace the committed period', async t => {
  const f = setup(t)
  f.open('activity'); await f.respond(7)
  const week = f.control().value, month = { ...week, mode: 'month' }
  f.period(month)
  const earlier = f.requests.at(-1)
  f.period(week)
  assert.equal(earlier.signal.aborted, true)
  f.period(month)
  const failed = f.requests.at(-1)
  failed.settled = true; failed.reject(Error('offline')); await flush(); f.render()
  earlier.respond(99); await flush(); f.render()
  assert.deepEqual(f.control().value, week)
  assert.equal(f.control().pendingMode, undefined)
  assert.equal(f.view().props.data.summary.completedSets, '7')
  const beforeRetry = f.requests.length
  f.click('다시 조회')
  assert.equal(f.requests.length, beforeRetry + 1)
  assert.equal(f.control().pendingMode, 'month')
  assert.equal(f.view().props.data.summary.completedSets, '7')
  await f.respond(0)
  assert.deepEqual(f.control().value, month)
  assert.equal(f.view().props.data.summary.completedSets, '0')
})

test('record changes revalidate the current week and revalidate cached months when next selected', async t => {
  const f = setup(t)
  f.open('activity'); await f.respond(7)
  const week = f.control().value, month = { ...week, mode: 'month' }
  f.period(month); await f.respond(37); f.period(week)
  const before = f.requests.length
  f.refresh('records-edited')
  assert.equal(f.requests.length, before + 1)
  assert.equal(f.view().props.data.summary.completedSets, '7')
  await f.respond(8)
  f.period(month)
  assert.equal(f.requests.length, before + 2)
  assert.equal(f.control().pendingMode, undefined)
  assert.equal(f.view().props.data.summary.completedSets, '37')
  await f.respond(38)
  assert.equal(f.view().props.data.summary.completedSets, '38')
})

test('initial schedule metadata after reload does not restart an in-flight month; applied changes and record edits still refresh', async t => {
  const f = setup(t)
  f.update({ dataRevision: 'records-0' })
  f.open('activity'); await f.respond(7)
  const week = f.control().value
  f.period({ ...week, mode: 'month' })
  const inFlight = f.requests.at(-1), count = f.requests.length
  f.update({ schedule: { appliedVersion: '1' }, refreshKey: 'records-0:1' })
  assert.equal(inFlight.signal.aborted, false)
  assert.equal(f.requests.length, count)
  await f.respond(37)
  f.update({ schedule: { appliedVersion: '2' }, refreshKey: 'records-0:2' })
  assert.equal(f.requests.length, count + 2)
  assert.equal(f.view().props.data.summary.completedSets, '37')
  await f.respond(38)
  f.update({ dataRevision: 'records-1', refreshKey: 'records-1:2' })
  assert.equal(f.requests.length, count + 4)
  await f.respond(39)
  assert.equal(f.view().props.data.summary.completedSets, '39')
})
test('calendar period changes abort old reads and late responses cannot replace the selected range',async t=>{
  const f=setup(t);await f.respond(1);f.open('activity');await f.respond(2)
  const committed = f.control().value
  const committedSets = f.view().props.data.summary.completedSets
  f.period({mode:'week',anchor:'2026-10-20'});const earlier=f.requests.at(-1)
  f.period({mode:'month',anchor:'2026-09-20'});const selected=f.requests.findLast(r=>r.period.fromDate==='2026-09-01')
  assert.equal(earlier.signal.aborted,true)
  assert.deepEqual(f.control().value,committed,'dates and chart stay on the same confirmed period while asking for a new one')
  assert.equal(f.view().props.data.summary.completedSets,committedSets,'the prior chart remains present under its own date labels')
  selected.respond(20);await flush();f.render();earlier.respond(99);await flush();f.render()
  assert.deepEqual(f.control().value,{mode:'month',anchor:'2026-09-20'})
  assert.equal(f.view().props.data.summary.completedSets,'20')
  assert.equal(f.view().props.activityState,undefined)
})
test('cold muscle statistics retains the Records menu until the overview settles and cached reentry is immediate',async t=>{
  const f=setup(t)
  const initial=f.requests[0]
  f.open('muscles')
  assert.equal(f.view().props.screen,'summary')
  assert.equal(initial.signal.aborted,false)
  assert(!nodes(f.render()).some(n=>n.type?.name==='StatisticsWait'&&n.props.skeleton))
  await f.respond(2)
  assert.equal(f.view().props.screen,'muscles')
  assert.equal(f.view().props.data.summary.completedSets,'2')
  f.back('주간 근육 통계')
  const previous=f.requests.length
  f.open('muscles')
  assert.equal(f.view().props.screen,'muscles')
  assert.equal(f.requests.length,previous)
})
test('revisiting a period renders its own ready snapshot through refresh and a transient failure',async t=>{
  const f=setup(t);await f.respond(3);f.open('activity')
  f.period({mode:'month',anchor:'2026-10-20'});await f.respond(12)
  f.back('운동 현황')
  assert.equal(f.view().props.data.summary.completedSets,'3')
  f.requests.at(-1).reject(Error('temporary failure'));await flush();f.render()
  assert.equal(f.view().props.data.summary.completedSets,'3')
  assert(nodes(f.render()).some(n=>n.props?.role==='alert'))
  f.open('activity')
  assert.equal(f.view().props.data.summary.completedSets,'12')
})
test('a forbidden revalidation discards previously displayed statistics',async t=>{
  const f=setup(t);await f.respond(3)
  f.open('growth');f.back('성장 추적')
  f.requests.at(-1).reject({ status:403 });await flush();f.render()
  assert.equal(f.view().props.data,null)
  assert(nodes(f.render()).some(n=>n.props?.role==='alert'))
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
  const f=setup(t);await f.respond(1);const count=f.requests.length
  f.open('growth');assert.equal(f.requests.length,count);assert.equal(f.requests.at(-1).signal.aborted,true)
  f.back('성장 추적');requested(f,'week',0,count);await f.respond(2);assert.equal(f.view().props.screen,'summary')
  f.open('plan');assert.equal(f.requests.length,count+1)
  assert.equal(f.requests.at(-1).signal.aborted,true)
  assert(nodes(f.render()).some(n=>n.type===RecordSubpageHeader&&n.props.title==='주간 근육 계획'))
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
  assert.equal(f.invalid.at(-1).code,'OWNER_MISMATCH');assert.equal(f.view().props.data,null)
  f.click('다시 조회');f.requests.at(-1).respond(1,{...scope,dataGeneration:'0'});await flush();f.render()
  assert.equal(f.invalid.at(-1).code,'DATA_GENERATION_MISMATCH')
})
