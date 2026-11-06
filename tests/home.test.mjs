import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { dateInZone, weekDates, dayStatus, representativeExercises, cardioPlanLabel } from '../src/features/home/model.ts'
import { loadHome } from '../src/features/home/load.ts'
import { routine, scope, OTHER, session } from './fixtures/workout-online-data.mjs'
registerHooks({ load(url, context, next) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default new Proxy({}, {get:(_,key)=>String(key)})', shortCircuit: true }
  if (url.endsWith('.tsx')) return { format: 'module', source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText, shortCircuit: true }
  return next(url, context)
} })
const { RoutinePlan } = await import('../src/features/home/HomePanel.tsx')
const { RecentWorkout } = await import('../src/features/home/RecentWorkout.tsx')
const { ReviewHeader } = await import('../src/review/ReviewHeader.tsx')
const cardio = { kind: 'TREADMILL', name: '러닝머신', targetSeconds: 1200, targetDistanceKm: null, intensity: { mode: 'SPEED', value: '8.123456' }, inclinePercent: null, resistance: null }
test('schedule timezone determines today across local midnight and international date line', () => {
  const instant = new Date('2026-11-01T15:30:00Z')
  assert.equal(dateInZone(instant, 'Asia/Seoul'), '2026-11-02')
  assert.equal(dateInZone(instant, 'America/Los_Angeles'), '2026-11-01')
  assert.equal(dateInZone(new Date('2026-12-31T12:00:00Z'), 'Pacific/Kiritimati'), '2027-01-01')
})
test('Monday-Sunday date arithmetic survives DST and year boundaries', () => {
  assert.deepEqual(weekDates('2027-01-01'), ['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03'])
  assert.deepEqual(weekDates('2026-11-01'), ['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01'])
})
test('past-day marks require server evidence and distinguish partial, missed, unknown and rest', () => {
  const classify = fields => dayStatus({ status: 'PLANNED', effectiveDay: '0', selectedSessionId: null, reviewStatus: 'MISSED', ...fields }, '2026-11-02', '2026-11-05')
  assert.equal(classify({ effectiveDay: '1' }).mark, '✓')
  assert.equal(classify({}).label, '미수행')
  assert.equal(classify({reviewStatus:null}).label, '검사 대기')
  assert.equal(classify({selectedSessionId:OTHER,reviewStatus:'PENDING'}).label, '검사 대기')
  assert.equal(classify({reviewStatus:'PERFORMED'}).label, '계획 미달')
  assert.match(classify({status:'PENDING'}).label, /진행 중/)
  assert.equal(classify({ selectedSessionId: OTHER, reviewStatus:'PERFORMED' }).label, '계획 미달')
  assert.equal(classify({ effectiveDay: '0.5' }).label, '일부 달성')
  for (const status of ['UNKNOWN','UNVERIFIABLE','PENDING']) {
    assert.equal(classify({ status }).mark, '월')
    assert.equal(classify({ status }).kind, 'unknown')
  }
  for (const fields of [{effectiveDay:null},{reviewStatus:null},{reviewStatus:'PENDING'}]) {
    assert.equal(classify(fields).mark,'월')
    assert.equal(classify(fields).kind,'unknown')
  }
  assert.equal(classify({ status: 'REST' }).label, '휴식')
  assert.equal(classify({ status: 'REST' }).mark, '-')
  assert.equal(classify({}).mark, 'X')
  assert.equal(classify({reviewStatus:'PERFORMED'}).mark,'X')
  assert.equal(classify({effectiveDay:'0.5'}).mark,'X')
  assert.equal(classify({status:'BEFORE_REGISTRATION'}).mark,'월')
  assert.equal(classify({ status: 'BEFORE_REGISTRATION' }).label, '일정 등록 전')
  assert.equal(dayStatus({ status: 'PLANNED', effectiveDay: '0' }, '2026-11-06', '2026-11-05').label, '예정')
})
test('weekday occupies the status slot until a server result replaces it, including same-day completion',()=>{
  const planned={status:'PLANNED',effectiveDay:'0',reviewStatus:null}
  const mark=(day,date,today)=>dayStatus(day,date,today).mark
  assert.equal(mark(planned,'2026-11-02','2026-11-02'),'월')
  assert.equal(mark({...planned,effectiveDay:'1',reviewStatus:'PERFORMED'},'2026-11-02','2026-11-02'),'✓')
  assert.equal(mark({...planned,reviewStatus:'MISSED'},'2026-11-02','2026-11-03'),'X')
  assert.equal(mark({...planned,status:'REST'},'2026-11-02','2026-11-02'),'-')
  assert.equal(mark({...planned,status:'REST'},'2026-11-03','2026-11-02'),'-')
  assert.equal(mark({...planned,effectiveDay:'0.5',reviewStatus:'PERFORMED'},'2026-11-02','2026-11-02'),'X')
  assert.equal(mark(planned,'2026-11-03','2026-11-02'),'화')
  assert.equal(mark(planned,'2026-11-04','2026-11-06'),'수')
  for(const status of ['UNKNOWN','PENDING','UNVERIFIABLE'])assert.equal(mark({...planned,status},'2026-11-05','2026-11-06'),'목')
  for(const reviewStatus of ['PENDING','PENDING_ACTIVE','UNKNOWN'])assert.equal(mark({...planned,effectiveDay:'1',reviewStatus},'2026-11-05','2026-11-06'),'목')
  assert.equal(mark(undefined,'2026-11-05','2026-11-06'),'목')
})
test('saved plan strings retain precision and WEIGHT/CARDIO have independent lists and totals', () => {
  const mixed = { ...routine, cardioPlacements: [{ id: OTHER, plan: cardio, deletedAt: null }] }
  const html = renderToStaticMarkup(React.createElement(RoutinePlan, { routine: mixed }))
  assert.match(html, /99999999999999.999999kg/)
  assert.match(html, /3세트 · 6~10회/)
  assert.match(html, /20분 · 8.123456 km\/h/)
  assert.equal((html.match(/<ol>/g) ?? []).length, 2)
  assert.equal((html.match(/총 1종목/g) ?? []).length, 2)
  assert.equal(representativeExercises(mixed), '벤치프레스 · 러닝머신')
  assert.equal(cardioPlanLabel({ ...cardio, intensity: null, targetSeconds: 90, targetDistanceKm: '0' }), '1분 30초 · 0 km')
})
function fixture() {
  const calls = [], schedule = { timeZone: 'Asia/Seoul' }, overview = { statistics: { recentSessions: [{ id: OTHER }] } }
  const api = { async routine(_scope, id) { calls.push(id); return { ...routine, id } }, async detail() { return session({ status: 'FINISHED' }) } }
  const weekly = { async read() { return schedule } }, statistics = { async overview(_scope, period) { calls.push(period); return overview } }
  const summaries = [{ id: routine.id, name: routine.name, version: routine.version }]
  api.routines = async () => ({ ...scope, routines: summaries })
  api.closed = async () => ({ ...scope, sessions: [{ id: OTHER, deletedAt: null }], next: null })
  const cache = new Map(), signal = new AbortController().signal
  return { calls, api, weekly, statistics, summaries, cache, signal, read: () => loadHome(scope, api, weekly, statistics, cache, new Date('2026-11-01T15:30:00Z'), 'America/Los_Angeles', signal) }
}
test('home reads authoritative timezone then overview; successful routine details reused by version', async () => {
  const f = fixture(), first = await f.read()
  assert.deepEqual(f.calls[0], { fromDate: '2026-11-02', toDateExclusive: '2026-11-09' })
  assert.equal(first.routines.get(routine.id).version, routine.version)
  await f.read(); assert.equal(f.calls.filter(x => x === routine.id).length, 1)
  f.summaries[0].version = '9007199254740995'; await f.read()
  assert.equal(f.calls.filter(x => x === routine.id).length, 2)
})
test('individual detail failures do not fabricate plans or zero performed counts', async () => {
  const f = fixture(); f.api.routine = async () => { throw Error('offline') }; f.api.detail = async () => { throw Error('offline') }
  const data = await f.read()
  assert.equal(data.routines.size, 0); assert.deepEqual(data.unavailable, [routine.id]); assert.equal(data.recent.size, 0)
  assert.equal(f.cache.size, 0)
})
test('owner and generation failures abort the home result instead of rendering a partial account', async () => {
  for (const code of ['OWNER_MISMATCH','DATA_GENERATION_MISMATCH']) {
    const f = fixture(); f.api.routine = async () => { throw Object.assign(Error('boundary'), { code }) }
    await assert.rejects(f.read(), { code })
  }
})
test('many routines use at most four concurrent detail reads', async () => {
  const f = fixture(); let active = 0, maximum = 0
  f.summaries.splice(0, 1, ...Array.from({ length: 13 }, (_, i) => ({ id: String(i), version: '1' })))
  f.api.routine = async (_scope, id) => { maximum = Math.max(maximum, ++active); await new Promise(r => setTimeout(r, 3)); --active; return { ...routine, id } }
  const data = await f.read(); assert.equal(data.routines.size, 13); assert.equal(maximum, 4)
})
test('empty plan sections remain visible', () => {
  const html = renderToStaticMarkup(React.createElement(RoutinePlan, { routine }))
  assert.match(html, /CARDIO/); assert.match(html, /총 0종목/); assert.match(html, /유산소 계획 없음/)
})
test('recent row renders exercise achievement, omits absent sections and uses neutral unknown state', () => {
  const s=session({status:'FINISHED'});s.snapshot.state.performedSets=Array.from({length:3},(_,i)=>({id:String(i),sessionExerciseId:s.initialPlan.weightExercises[0].sessionExerciseId}))
  const row={...s,routineName:s.initialPlan.routineName}
  const complete=renderToStaticMarkup(React.createElement(RecentWorkout,{row,detail:s,onOpen(){}}))
  assert.match(complete,/웨이트 1\/1종목 완료/);assert.match(complete,/data-state="complete"/);assert.doesNotMatch(complete,/0\/0|kg|유산소 0/)
  s.snapshot.state.performedSets.pop();assert.match(renderToStaticMarkup(React.createElement(RecentWorkout,{row,detail:s,onOpen(){}})),/data-state="incomplete"/)
  assert.match(renderToStaticMarkup(React.createElement(RecentWorkout,{row,onOpen(){}})),/data-state="unknown"/)
})
test('ON/OFF header reuses official moon mask with no visible sample badge and no week text when off', () => {
  const on=renderToStaticMarkup(React.createElement(ReviewHeader,{analysisOn:true})),off=renderToStaticMarkup(React.createElement(ReviewHeader,{analysisOn:false}))
  assert.match(on,/5.2\/8주/);assert.doesNotMatch(off,/5.2|65%/);assert.doesNotMatch(on,/>시안<|☾|🌙/);assert.match(on,/aria-label="디로딩"/);assert.match(off,/aria-label="디로딩"/)
  const css=readFileSync('src/components/DeloadMoon.module.css','utf8');assert.match(css,/thick_white_crescent_moon.svg/);assert.match(css,/#6C93C6/)
})
