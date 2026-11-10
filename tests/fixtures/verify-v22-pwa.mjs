// Real production app and current isolated Backend via the V22 test launcher. Only the test proxy may discard genuine responses.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { launchV22Browser, waitFor } from './v22-browser.mjs'

const run = process.argv[2], mode = process.argv[3] ?? 'sync', attempt = crypto.randomUUID()
assert(['sync', 'boundaries'].includes(mode))
const d = await launchV22Browser(run, '.', { workerDiagnostics: true, shortProfile: true })
const { evidence: verified, proxy } = d
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const note = (name, evidence = {}) => { d.notes.push({ name, result: 'PASS', ...evidence }); console.log('PASS ' + name) }
const dbRead = `(async()=>{const name='overload.workout.v1';if(!(await indexedDB.databases()).some(x=>x.name===name))return {workouts:[],version:null};
  const db=await new Promise((r,j)=>{const q=indexedDB.open(name);q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)});
  try{return await new Promise((r,j)=>{const tx=db.transaction(['localWorkouts','meta','sessionCopies'],'readonly');
    const w=tx.objectStore('localWorkouts').getAll(),p=tx.objectStore('meta').get('offlineResume'),c=tx.objectStore('sessionCopies').getAll();
    tx.oncomplete=()=>r({workouts:w.result,permit:p.result,copies:c.result,version:db.version,fence:JSON.parse(localStorage.getItem('overload.offline.access.v1'))});tx.onabort=()=>j(tx.error)})}finally{db.close()}})()`
const saved = () => d.evaluate(dbRead)
const workout = async id => (await saved()).workouts.find(w => w.sessionId === id)
const detail = async id => { const value = await d.api('GET', '/api/v1/workout-sessions/' + id); assert.equal(value.status, 200); return value.body }
const textHas = value => d.evaluate(`document.body.innerText.includes(${JSON.stringify(value)})`)
const selector = css => d.evaluate(`!!document.querySelector(${JSON.stringify(css)})`)
const statsCount = () => d.evaluate('document.querySelectorAll(".statistics").length')
const issued = new Map()
async function login(account) {
  await waitFor(() => selector('#auth-email'), 'login UI')
  await d.input('#auth-email', `${mode}-${account}-${attempt}@example.invalid`)
  await waitFor(() => Date.now() >= (issued.get(account) ?? 0) + 61000, 'real email cooldown', 90000)
  await waitFor(() => d.evaluate('!document.getElementById("auth-email").form.querySelector("button[type=submit]").disabled'), 'normal OTP submit', 90000)
  const marker = d.requests.length; await d.click('이메일로 계속하기')
  await waitFor(() => d.requests.slice(marker).some(r => r.path.endsWith('/email-otp/request') && r.status === 202), 'OTP issuance')
  issued.set(account, Date.now())
  const challenge = await d.responseForLast('/api/v1/auth/email-otp/request')
  let message = await d.control('otp', { issuanceId: challenge.challengeId }); await d.input('#auth-code', message.code); message = null
  await d.click('코드 확인'); await waitFor(() => selector('.workout-online'), 'authenticated workspace')
  const session = await d.api('GET', '/api/v1/auth/session'); assert.equal(session.status, 200); return session.body
}
async function prepare(name) {
  const routines = (await d.api('GET', '/api/v1/routines')).body
  const routine = await d.api('POST', '/api/v1/routines', { id: crypto.randomUUID(), name, dataGeneration: routines.dataGeneration,
    weightPlacements: [{ id: crypto.randomUUID(), standardExerciseId: verified.catalog.bodyweightExerciseId, manufacturerId: null, loadType: 'BODYWEIGHT', setCount: 3, minReps: 2, maxReps: 4, initialWeightKg: '80' }],
    cardioPlacements: [{ id: crypto.randomUUID(), plan: { kind: 'OUTDOOR', name: 'V22 PWA cardio', standardExerciseId: verified.catalog.cardioExerciseId,
      activityId: verified.catalog.cardioActivityId, targetSeconds: 60, targetDistanceKm: null, intensity: null, inclinePercent: null, resistance: null } }],
  })
  assert.equal(routine.status, 201); return routine.body
}
async function start(routine) {
  await d.click('루틴', 'nav');
  await d.click('다시 조회', '.workout-online')
  await waitFor(() => d.evaluate(`(() => {
    const button = [...document.querySelectorAll('button[aria-label]')]
      .find(item => item.getAttribute('aria-label') === ${JSON.stringify(routine.name + ' 상세')} && !item.disabled)
    if (!button) return false
    button.click()
    return true
  })()`), 'saved routine card')
  await d.click('온라인으로 운동 시작')
  await waitFor(() => selector('.local-workout input'), 'active local editor')
  const server = (await d.api('GET', '/api/v1/workout-sessions/active')).body.session
  const cardio = server.initialPlan.cardioActivities[0]
  assert.equal(cardio.plan.standardExerciseId, verified.catalog.cardioExerciseId)
  assert.equal(cardio.plan.activityId, verified.catalog.cardioActivityId)
  assert.equal(server.snapshot.state.sessionExercises.find(item => item.id === cardio.sessionActivityId).standardExerciseId,
    verified.catalog.cardioExerciseId)
  await waitFor(async () => { const x = await saved(); return x.version === 3 && x.workouts.some(w => w.sessionId === server.id && w.schemaVersion === 2) && x.permit?.sessionId === server.id && x.fence?.allowed && x.permit.nonce === x.fence.nonce }, 'durable IDB3/schema2 offline permit')
  return server
}
async function setDraft(n, reps, extra) {
  await d.input(`input[aria-label="${n}세트 이번 반복 횟수"]`, String(reps))
  if (extra !== undefined) await d.input(`input[aria-label="${n}세트 추가 중량 kg"]`, extra)
}
async function complete(n) {
  if (await textHas('휴식 종료')) await d.click('휴식 종료', '.local-workout')
  await waitFor(() => d.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(`button[aria-label="${n}세트 완료"]`)});if(!b||b.disabled)return false;b.click();return true})()`), 'set completion')
}
const reload = async () => { const before = await d.evaluate('performance.timeOrigin'); await d.send('Page.reload'); await waitFor(async () => { try { return (await d.evaluate('performance.timeOrigin')) !== before } catch { return false } }, 'new document') }
async function coldResume(name) {
  await waitFor(() => textHas('이 기기의 운동 이어가기'), 'offline consent')
  assert.equal(await d.evaluate('navigator.onLine'), false); assert.equal(await textHas(name), false)
  assert.equal(await textHas('로그인되었습니다.'), false); assert.equal(await selector('.statistics'), false)
  await d.click('이 기기의 운동 이어가기'); await waitFor(() => selector('.local-workout input'), 'offline local editor')
}
async function online() {
  await d.setOffline(false)
  // The real online event may already have started reauthentication.
  await d.evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='로그인 상태 다시 확인'&&!b.disabled);b?.click()})()`)
}
const outage = label => waitFor(() => textHas('연결을 확인해 주세요'), label)
async function retryWrite() {
  if (await textHas('연결을 확인해 주세요')) await d.click('로그인 상태 다시 확인')
  else await d.click('서버 저장 상태 다시 확인', '.local-workout')
}
async function logout() {
  await d.click('설정', 'nav')
  await d.click('로그아웃'); await d.click('로그아웃 확인'); await waitFor(() => selector('#auth-email'), 'logout UI')
  assert.equal(await statsCount(), 0); assert.equal(await selector('.local-workout, .workout-online'), false)
}
const docker = promisify(execFile)
async function commitProof(id) {
  assert.match(id, /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/)
  const label = await docker('docker', ['container', 'inspect', verified.containerId, '--format', '{{index .Config.Labels "com.overload.verification.run"}}'], { windowsHide: true })
  assert.equal(label.stdout.trim(), run)
  const sql = `SELECT json_build_object('version',version::text,'revision',local_revision::text,'hash',last_snapshot_hash,'status',status,'endedAt',ended_at,'sets',(SELECT count(*) FROM performed_sets WHERE session_id=s.id),'cardio',(SELECT count(*) FROM cardio_results WHERE session_id=s.id),'changes',(SELECT count(*) FROM record_change_events WHERE session_id=s.id)) FROM workout_sessions s WHERE id='${id}'::uuid`
  const result = await docker('docker', ['exec', verified.containerId, 'psql', '-U', 'overload_test', '-d', 'overload_v22_isolated', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', sql], { windowsHide: true })
  return JSON.parse(result.stdout.trim())
}
async function shellProof() {
  assert.equal(await d.evaluate('isSecureContext'), true)
  await waitFor(() => d.evaluate('(async()=>(await navigator.serviceWorker.getRegistration())?.active?.state==="activated")()'), 'SW activation')
  await reload(); await waitFor(() => d.evaluate('!!navigator.serviceWorker.controller'), 'controlled production page')
  const manifest = await d.send('Page.getAppManifest'); assert.equal(manifest.errors.length, 0)
  const install = await d.send('Page.getInstallabilityErrors')
  const expected = JSON.parse((await readFile('dist/sw.js', 'utf8')).split('\n').find(line => line.startsWith('const shell = ')).slice('const shell = '.length))
  const cached = await d.evaluate(`(async()=>{const keys=await caches.keys();const rows=[];for(const key of keys){const c=await caches.open(key);for(const req of await c.keys()){
    const bytes=await(await c.match(req)).arrayBuffer(), digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');rows.push({key,path:new URL(req.url).pathname,sha256:digest})}}return rows})()`)
  assert(cached.every(x => x.key === 'overload-static-shell-v1-' + expected.id))
  assert.deepEqual(cached.map(({ path, sha256 }) => ({ path, sha256 })).sort((a, b) => a.path.localeCompare(b.path)), expected.assets.slice().sort((a, b) => a.path.localeCompare(b.path)))
  note('Secure production SW active/controlling; Cache Storage exactly matches verified static asset hashes', { cacheEntries: cached.length, shell: expected.id, installabilityErrors: install.installabilityErrors.length })
}

async function synchronization() {
  const a = await login('a'), routine = await prepare('V22 offline A'), server = await start(routine), id = server.id
  await shellProof(); await waitFor(() => selector('.local-workout input'), 'reloaded editor')
  const firstTab = await d.openSecondTab()
  await waitFor(() => textHas('이 탭은 읽기 전용입니다'), 'same-profile second tab lock')
  assert.equal(await d.evaluate('document.querySelector(".local-workout input[aria-label]").disabled'), true)
  await d.closeTabAndSelect(firstTab); assert.equal(await d.evaluate('document.querySelector(".local-workout input[aria-label]").disabled'), false)
  note('Second Chrome tab is read-only while first owns the editor lock')
  const baseline = await commitProof(id)
  proxy.fault.beforeSnapshot = true
  await setDraft(1, 2, '5.123456'); await complete(1)
  const fixed = await waitFor(async () => (await workout(id))?.pendingSnapshot, 'frozen snapshot')
  await waitFor(() => proxy.records.some(r => r.failure === 'BEFORE_UPSTREAM'), 'request blocked before upstream')
  await outage('retryable connection failure')
  assert.deepEqual(await commitProof(id), baseline)
  assert(proxy.records.filter(r => r.failure === 'BEFORE_UPSTREAM').every(r => !r.forwarded && r.requestSha256 === sha(fixed.requestJson)))
  note('Before-upstream network failure leaves committed DB unchanged and retains frozen JSON', { revision: fixed.request.localRevision, requestSha256: sha(fixed.requestJson) })
  proxy.fault.beforeSnapshot = false; proxy.fault.dropSnapshot = true
  const snapPath = '/api/v1/workout-sessions/' + id + '/snapshot'
  await retryWrite()
  await waitFor(() => proxy.records.some(r => r.path === snapPath && r.failure === 'AFTER_BACKEND_200' && r.ack.duplicate === false), 'server committed snapshot before ACK loss')
  await outage('snapshot ACK loss recognized')
  const accepted = await commitProof(id); assert.equal(accepted.sets, 1); assert.equal(accepted.revision, fixed.request.localRevision); assert.match(accepted.hash, /^[a-f0-9]{64}$/)
  assert.equal((await workout(id)).pendingSnapshot.requestJson, fixed.requestJson)
  const retryMark = proxy.records.length; await retryWrite()
  await waitFor(() => proxy.records.slice(retryMark).some(r => r.path === snapPath && r.ack?.duplicate && r.failure === 'AFTER_BACKEND_200'), 'real duplicate ACK also discarded')
  await outage('uncertain request preserved')
  assert.deepEqual(await commitProof(id), accepted)
  assert(proxy.records.filter(r => r.path === snapPath).every(r => r.requestSha256 === sha(fixed.requestJson)))
  note('Snapshot ACK lost after actual commit; same wire bytes and canonical DB hash, revision, version, and rows across retries', { committed: accepted, requestSha256: sha(fixed.requestJson) })
  await d.setOffline(true); assert.equal(await d.evaluate('navigator.onLine'), false)
  assert.equal(await d.evaluate('fetch("/api/v1/auth/session",{cache:"no-store"}).then(()=>false,()=>true)'), true)
  await setDraft(2, 3, '0'); await complete(2)
  await waitFor(async () => (await workout(id)).snapshot.performedSets.length === 2, 'offline second set committed locally')
  await setDraft(3, 4)
  await waitFor(async () => Object.values((await workout(id)).drafts).some(v => v.reps === '4'), 'offline draft committed')
  const beforeRestart = await workout(id), beforeWrites = proxy.records.length
  assert.equal(beforeRestart.pendingSnapshot.requestJson, fixed.requestJson); assert.deepEqual(await commitProof(id), accepted)
  await reload(); await coldResume(routine.name)
  assert.equal(await d.evaluate('document.querySelector(\'input[aria-label="3세트 이번 반복 횟수"]\').value'), '4')
  await d.restartBrowser(); await coldResume(routine.name)
  assert.equal(new Set(d.browserPids).size, 2)
  assert.equal(JSON.stringify(await workout(id)), JSON.stringify(beforeRestart))
  assert.equal(proxy.records.length, beforeWrites)
  note('Offline cached shell, explicit consent, reload and full Chrome restart restore exact DB3/schema2 document', { revision: beforeRestart.localRevision, frozenSha256: sha(fixed.requestJson) })
  await complete(3); await waitFor(async () => (await workout(id)).snapshot.performedSets.length === 3, 'third set committed offline')
  await d.click('종목 목록', '.local-workout'); await d.click('V22 PWA cardio · 유산소'); await d.click('유산소 시작', '.local-workout')
  await d.labelInput('실제 속도 km/h', '7.2', '.local-workout')
  const timer = await waitFor(async () => Object.values((await workout(id)).timers).find(t => t.runningSince && t.speed === '7.2'), 'durable offline timer')
  await d.restartBrowser(); await coldResume(routine.name)
  assert.deepEqual(Object.values((await workout(id)).timers).find(t => t.runningSince), timer)
  await d.evaluate('document.querySelector(".local-workout input[type=checkbox]").click()')
  await d.labelInput('정정 활동 시간 초', '60', '.local-workout'); await d.click('유산소 완료 기록 확인', '.local-workout'); await d.click('유산소 기록 완료', '.local-workout')
  const local = await waitFor(async () => { const w = await workout(id); return w.snapshot.cardioResults.length === 1 && w })
  const byOrdinal = local.snapshot.performedSets.slice().sort((x, y) => x.ordinal - y.ordinal)
  assert.equal(byOrdinal[0].bodyweightLoad.additionalWeightKg, '5.123456'); assert.equal(byOrdinal[1].bodyweightLoad.additionalWeightKg, '0'); assert(!('bodyweightLoad' in byOrdinal[2]))
  assert.equal(local.snapshot.cardioResults[0].result.distanceKm, '0.12'); assert.equal(local.snapshot.cardioResults[0].result.measurement.distanceSource, 'CALCULATED')
  assert.equal(local.pendingSnapshot.requestJson, fixed.requestJson); assert.equal(proxy.records.length, beforeWrites)
  note('Offline set zero/omission/precision and cardio timer restart preserve original IDs and measurement')
  proxy.fault.dropSnapshot = false; await online()
  await waitFor(async () => { const w = await workout(id); return w?.syncState === 'CLEAN' && !w.pendingSnapshot && w.serverRevision === local.localRevision }, 'all snapshot ACKs committed locally')
  const synced = await workout(id), stored = await detail(id)
  assert.equal(synced.lastAck.acceptedLocalRevision, local.localRevision)
  assert(Object.values(synced.presence).every(p => p === 'SERVER_CONFIRMED'))
  assert.deepEqual(stored.initialPlan, server.initialPlan); assert.equal(stored.snapshot.state.performedSets.length, 3); assert.equal(stored.snapshot.state.cardioResults.length, 1)
  assert.deepEqual(stored.snapshot.state.performedSets.map(s => s.id).sort(), byOrdinal.map(s => s.id).sort())
  assert(proxy.records.some(r => r.path === snapPath && r.requestSha256 === sha(fixed.requestJson) && r.ack?.duplicate === true && !r.failure))
  const snapshotCount = proxy.records.length; await d.click('서버 저장 상태 다시 확인', '.local-workout'); await waitFor(() => textHas('서버에 저장됨'), 'clean UI')
  assert.equal(proxy.records.length, snapshotCount)
  note('Reconnect replays exact frozen snapshot, saves new revision once, clears pending state and stops writes', { committed: await commitProof(id) })
  const invalidCsrf = await d.api('PUT', snapPath, fixed.request, false); assert.equal(invalidCsrf.status, 403)
  const wrongGeneration = await d.api('PUT', snapPath, { ...fixed.request, dataGeneration: String(BigInt(server.dataGeneration) + 1n) }); assert.equal(wrongGeneration.status, 409); assert.equal(wrongGeneration.body.code, 'DATA_GENERATION_MISMATCH')
  note('Real authenticated API rejects missing CSRF and wrong generation')
  await d.setOffline(true); await d.click('운동 종료', '.local-workout'); await d.click('이 시각으로 운동 종료 확인')
  const intent = await waitFor(async () => (await workout(id)).finish, 'offline FINISH intent'); assert.equal(intent.requestJson, undefined)
  await d.restartBrowser(); await waitFor(() => textHas('이 기기의 운동 이어가기'), 'offline FINISH cold consent'); await d.click('이 기기의 운동 이어가기')
  assert.equal((await workout(id)).finish.endedAt, intent.endedAt)
  proxy.fault.dropFinish = true; await online()
  const finishPath = '/api/v1/workout-sessions/' + id + '/finish'
  await waitFor(() => proxy.records.some(r => r.path === finishPath && r.ack?.duplicate === false && r.failure === 'AFTER_BACKEND_200'), 'actual FINISH committed without browser ACK')
  await outage('FINISH ACK uncertainty')
  const closing = (await workout(id)).finish, closedProof = await commitProof(id)
  assert.equal(closedProof.status, 'FINISHED'); assert.equal(closedProof.sets, 3); assert.equal(closedProof.cardio, 1); assert(!closing.ack); assert.equal(closing.endedAt, intent.endedAt)
  const fixedFinish = sha(closing.requestJson); proxy.fault.dropFinish = false
  await retryWrite()
  await waitFor(() => selector('.workout-online'), 'authenticated after FINISH ACK loss')
  let historyOpened = false
  await waitFor(async () => {
    if ((await workout(id)).finish?.ack) return true
    const action = await d.evaluate(`(() => {
      const visible = button => !button.disabled && button.getClientRects().length > 0
      const confirm = [...document.querySelectorAll('.closed-workout button')].find(
        button => visible(button) && button.textContent.trim() === '미확인 종료 요청 결과 확인')
      if (confirm) { confirm.click(); return 'confirm' }
      const historyTab = [...document.querySelectorAll('nav button')].find(
        button => visible(button) && button.textContent.trim() === '기록' && button.getAttribute('aria-current') !== 'page')
      if (historyTab) { historyTab.click(); return 'navigate' }
      if (!${historyOpened} && !document.querySelector('.closed-workout')) {
        const record = [...document.querySelectorAll('section[aria-label="종료 운동 이력"] button')].find(
          button => visible(button) && button.textContent.includes('V22 offline A'))
        if (record) { record.click(); return 'history' }
      }
    })()`)
    if (action === 'history') historyOpened = true
    return action === 'confirm'
  }, 'wait for automatic ACK or explicit closed-record recovery')
  await waitFor(async () => (await workout(id)).finish?.ack?.duplicate === true, 'duplicate FINISH ACK durably accepted')
  assert.deepEqual(await commitProof(id), closedProof)
  const final = await workout(id); assert.equal(final.syncState, 'CLEAN'); assert.equal(final.serverRevision, final.finish.ack.acceptedLocalRevision)
  assert(proxy.records.filter(r => r.path === finishPath).every(r => r.requestSha256 === fixedFinish))
  await waitFor(() => selector('.closed-workout'), 'closed UI after confirmed FINISH'); assert.equal(await statsCount(), 1)
  const finalWrites = proxy.records.length
  await reload()
  await d.click('기록', 'nav')
  await waitFor(() => textHas('통계·추적'), 'visible statistics after FINISH reload')
  assert.equal(proxy.records.length, finalWrites)
  note('Offline FINISH intent survives restart; real commit then lost ACK, exact duplicate replay, immutable DB and final local ACK', { committed: closedProof, requestSha256: fixedFinish })
  const fromDate = server.workoutDate
  const toDateExclusive = new Date(Date.parse(fromDate + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10)
  const overview = await d.api('GET', '/api/v1/statistics/overview?' + new URLSearchParams({ fromDate, toDateExclusive }))
  assert.equal(overview.status, 200)
  const stats = overview.body.statistics
  assert.equal(stats.summary.completedSets, '3')
  assert.deepEqual(stats.groupActuals, [{ groupCode: 'ARMS', completedSets: '3' }, { groupCode: 'CHEST', completedSets: '3' }])
  assert.equal(stats.muscles.find(muscle => muscle.role === 'SECONDARY').contributionSets, '1.5')
  await d.click('근육별 통계', '.statistics')
  await waitFor(() => textHas('부위별 실제 완료 세트'), 'muscle statistics')
  await d.evaluate(`[...document.querySelectorAll('.statistics summary')].find(item => item.textContent.startsWith('보조근 참여')).click()`)
  await waitFor(() => textHas('기여 1.5세트 · 실제 참여 3세트'), 'separate exact contribution and actual count')
  note('Real Backend and PWA show secondary 1.5 contribution and three actual completed sets separately')
  assert.equal(a.userId, final.userId)
  // Explicit clearing is an online closed-record operation, never an offline edit.
  const sealed = await detail(id), cardio = sealed.snapshot.state.cardioResults[0], weight = sealed.snapshot.state.performedSets.find(s => s.ordinal === 1)
  const base = { dataGeneration: sealed.dataGeneration, expectedVersion: sealed.version, setCorrections: [], cardioCorrections: [], deletedPerformedSetIds: [], deletedCardioResultIds: [] }
  const correction = { id: cardio.id, activeMs: cardio.result.activeMs, corrected: cardio.result.corrected, distanceKm: cardio.result.distanceKm, averageBpm: 120 }
  const legacy = await d.api('PATCH', '/api/v1/workout-sessions/' + id + '/records', { ...base, cardioCorrections: [correction] })
  assert.equal(legacy.status, 200)
  const unchangedMeasurement = (await detail(id)).snapshot.state.cardioResults[0].result.measurement
  assert.deepEqual(unchangedMeasurement, cardio.result.measurement)
  const removed = await d.api('PATCH', '/api/v1/workout-sessions/' + id + '/records', { ...base, expectedVersion: legacy.body.version,
    setCorrections: [{ id: weight.id, weightKg: weight.weightKg, reps: weight.reps, bodyweightLoad: { additionalWeightKg: null } }],
    cardioCorrections: [{ ...correction, distanceKm: null, measurement: { actualSpeedKmh: null, distanceSource: null } }],
  })
  assert.equal(removed.status, 200)
  const edited = await detail(id)
  assert.equal(edited.snapshot.state.performedSets.find(s => s.id === weight.id).bodyweightLoad.additionalWeightKg, null)
  assert.deepEqual(edited.snapshot.state.cardioResults[0].result.measurement, { actualSpeedKmh: null, distanceSource: null })
  assert.equal(edited.snapshot.state.cardioResults[0].result.distanceKm, null)
  assert.deepEqual(edited.initialPlan, sealed.initialPlan); assert.deepEqual(edited.completionAssessment, sealed.completionAssessment)
  assert.equal((await commitProof(id)).hash, closedProof.hash)
  note('Online closed-record API preserves omitted cardio measurement and stores explicit null clearing without rewriting sealed FINISH', { kind: 'BROWSER_API' })
}

async function boundaries() {
  const a = await login('a'), routine = await prepare('V22 private offline A'), server = await start(routine), id = server.id
  await shellProof(); await waitFor(() => selector('.local-workout input'), 'A editor')
  proxy.fault.beforeSnapshot = true
  await setDraft(1, 2, '0'); await complete(1)
  const frozen = await waitFor(async () => (await workout(id)).pendingSnapshot, 'A fixed request before send')
  await outage('A connection failed before upstream'); proxy.fault.beforeSnapshot = false
  await d.setOffline(true); assert.equal(await textHas('온라인으로 운동 시작'), false)
  await setDraft(2, 3); await complete(2)
  const original = await waitFor(async () => { const w = await workout(id); return w.snapshot.performedSets.length === 2 && w }, 'offline A record')
  assert.equal(original.syncState, 'UNKNOWN'); assert.equal(original.pendingSnapshot.requestJson, frozen.requestJson); assert.equal((await commitProof(id)).sets, 0)
  assert((await d.control('expire-session', { userId: a.userId })).expired > 0)
  const boundaryMark = proxy.records.length; await online()
  await waitFor(async () => !(await saved()).permit && await textHas('로그인'), 'revoked offline permit on real 401')
  assert.equal((await d.api('GET', '/api/v1/auth/session')).status, 401)
  assert.equal(proxy.records.length, boundaryMark); assert.equal((await commitProof(id)).sets, 0)
  await d.setOffline(true); await d.restartBrowser(); await waitFor(() => textHas('연결을 확인해 주세요'), 'expired offline cold start')
  assert.equal(await textHas('이 기기의 운동 이어가기'), false); assert.equal(await textHas(routine.name), false); assert.equal(await statsCount(), 0)
  assert.equal(JSON.stringify(await workout(id)), JSON.stringify(original))
  assert.equal((await saved()).fence.allowed, false)
  note('Offline expiry then real 401 revokes cold access without sending or erasing A fixed request or newer offline facts')
  await online(); await waitFor(() => selector('#auth-email'), 'anonymous after reconnect')
  const b = await login('b'); assert.notEqual(b.userId, a.userId)
  await waitFor(() => selector('#statistics-title'), 'B statistics'); assert.equal(await statsCount(), 1); assert.equal(await textHas(routine.name), false)
  assert.equal(await selector('.local-workout'), false); assert.equal((await d.api('GET', '/api/v1/workout-sessions/' + id)).status, 404)
  assert.equal(proxy.records.length, boundaryMark); assert.equal(JSON.stringify(await workout(id)), JSON.stringify(original))
  await logout(); assert.equal(await statsCount(), 0); assert(!(await saved()).permit)
  note('B does not see, retag, or transmit A local work; logout clears protected DOM and permit')
  await login('a'); await waitFor(async () => (await workout(id)).syncState === 'CLEAN' && (await detail(id)).snapshot.state.performedSets.length === 2, 'only A resumes and syncs own records')
  assert.deepEqual((await detail(id)).snapshot.state.performedSets.map(s => s.id).sort(), original.snapshot.performedSets.map(s => s.id).sort())
  assert(proxy.records.slice(boundaryMark).some(r => r.status === 200 && r.requestSha256 === sha(frozen.requestJson)))
  note('Same-account reauthentication verifies namespace before replaying exact fixed A bytes and original UUIDs', { requestSha256: sha(frozen.requestJson) })
  const takeover = await d.api('POST', '/api/v1/workout-sessions/' + id + '/takeover', { dataGeneration: server.dataGeneration, editorDeviceId: crypto.randomUUID(), expectedWriterEpoch: server.writerEpoch })
  assert.equal(takeover.status, 200)
  await setDraft(3, 4); await complete(3)
  await waitFor(() => proxy.records.some(r => r.path.endsWith('/snapshot') && r.status === 409), 'real old-epoch 409')
  const blocked = await workout(id); assert.equal(blocked.snapshot.performedSets.length, 3); assert(blocked.pendingSnapshot?.requestJson)
  const proof = await commitProof(id); assert.equal(proof.sets, 2); assert.equal(proof.revision, '0')
  note('Actual server takeover rejects old writer 409 and retains unsent local source without merge', { committed: proof })
}

try {
  await waitFor(() => selector('#auth-email'), 'fresh anonymous profile')
  assert.equal((await saved()).workouts.length, 0); note('Independent Chrome profile has no previous workout data')
  await (mode === 'sync' ? synchronization() : boundaries())
  console.log('V22_PWA_' + mode.toUpperCase() + '_PASS')
} catch (error) {
  d.notes.push({ name: mode, result: 'FAIL', error: error.message }); throw error
} finally {
  await writeFile(resolve(d.directory, `pwa-${mode}-${attempt}.json`), JSON.stringify({ run, mode, browserPids: d.browserPids, notes: d.notes, writes: proxy.records }, null, 2))
  await d.close()
}
