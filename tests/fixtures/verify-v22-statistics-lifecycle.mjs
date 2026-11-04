// Online regression only. All product UI and API responses are real; OTP is memory-only FakeSender delivery.
import assert from 'node:assert/strict'
import { launchV22Browser, waitFor } from './v22-browser.mjs'
const d = await launchV22Browser(process.argv[2]), attempt = crypto.randomUUID()
const lastIssued = new Map()
const count = () => d.evaluate('document.querySelectorAll(".statistics").length')
const note = name => { d.notes.push({ name, result: 'PASS', kind: 'UI_AND_BACKEND' }); console.log('PASS ' + name) }
const single = async expected => { await waitFor(async () => (await count()) === 1 && (await d.text('.statistics')).includes(expected), 'one current statistics panel'); assert((await d.evaluate('document.querySelectorAll("#statistics-title").length')) <= 1) }
async function login(account) {
  await waitFor(() => d.evaluate('!!document.querySelector("#auth-email")'), 'login screen')
  await d.input('#auth-email', `lifecycle-${account}-${attempt}@example.invalid`)
  // Page reload resets client countdown state; the real server's per-email 60s guard still applies.
  await waitFor(() => Date.now() >= (lastIssued.get(account) ?? 0) + 61000, 'server email issuance interval', 90000)
  await waitFor(() => d.evaluate('!document.getElementById("auth-email").form.querySelector("button[type=submit]").disabled'), 'real OTP cooldown', 90000)
  const marker = d.requests.length
  await d.click('이메일로 계속하기')
  await waitFor(() => d.requests.slice(marker).some(r => r.path.endsWith('/email-otp/request') && r.status === 202), 'OTP issuance')
  lastIssued.set(account, Date.now())
  const issuance = await d.responseForLast('/api/v1/auth/email-otp/request')
  let delivery = await d.control('otp', { issuanceId: issuance.challengeId })
  await d.input('#auth-code', delivery.code); delivery = null
  await d.click('코드 확인'); await waitFor(() => d.evaluate('!!document.querySelector(".workout-online")'), 'authenticated workspace')
  return (await d.api('GET', '/api/v1/auth/session')).body
}
async function logout() {
  await d.click('로그아웃'); await d.click('로그아웃 확인')
  await waitFor(() => d.evaluate('!!document.querySelector("#auth-email")'), 'logout complete')
  assert.equal(await count(), 0); assert.equal(await d.evaluate('document.querySelectorAll(".workout-online").length'), 0)
  assert.equal((await d.api('GET', '/api/v1/routines')).status, 401)
}
try {
  const a = await login('a')
  await single('0\n완료 웨이트 세트')
  await d.click('새 루틴 만들기'); await d.labelInput('루틴 이름', 'V22 lifecycle A routine', 'form.online-routine')
  await d.input('input[role=combobox]', 'synthetic weight'); await d.evaluate('document.querySelector("[role=option]").click()')
  await d.labelInput('세트 수', '1', 'form.online-routine')
  for (const label of ['최소 반복', '최대 반복']) await d.labelInput(label, '2', 'form.online-routine')
  await d.labelInput('최초 중량', '10', 'form.online-routine')
  await d.click('유산소 추가'); await d.labelInput('유산소 이름', 'V22 lifecycle cardio', 'form.online-routine'); await d.labelInput('목표 시간', '120', 'form.online-routine')
  await d.click('루틴 저장'); await waitFor(() => d.evaluate('!document.querySelector("form.online-routine")'), 'routine saved')
  const routines = (await d.api('GET', '/api/v1/routines')).body, rid = routines.routines[0].id
  const day = await d.evaluate('new Date().getDay()'), weekday = ['일', '월', '화', '수', '목', '금', '토'][day]
  await d.click('주간 일정 편집'); await d.input(`select[aria-label="${weekday}요일 루틴"]`, rid); await d.click('일정 예약 저장')
  await waitFor(() => d.evaluate('!document.querySelector("[aria-labelledby=weekly-schedule-title] form")'), 'schedule saved')
  const sessions = []
  for (let i = 0; i < 3; i++) {
    await d.click('V22 lifecycle A routine', '.workout-online')
    await d.click('온라인으로 운동 시작'); await waitFor(() => d.evaluate('!!document.querySelector(".local-workout input")'), 'set input')
    assert.equal(await count(), 0, 'ACTIVE must remove every statistics panel')
    const active = (await d.api('GET', '/api/v1/workout-sessions/active')).body.session
    await d.input('input[aria-label="1세트 이번 반복 횟수"]', '2'); await d.click('완료', '.local-workout')
    if (i === 0) {
      await d.click('종목 목록', '.local-workout'); await d.click('V22 lifecycle cardio · 유산소')
      await d.click('유산소 시작', '.local-workout'); await d.labelInput('실제 속도 km/h', '6', '.local-workout')
      await d.evaluate('document.querySelector(".local-workout input[type=checkbox]").click()')
      await d.labelInput('정정 활동 시간 초', '60', '.local-workout'); await d.click('유산소 완료 기록 확인', '.local-workout'); await d.click('유산소 기록 완료', '.local-workout')
    }
    await d.click('운동 종료', '.local-workout'); await d.click('이 시각으로 운동 종료 확인')
    await waitFor(async () => (await d.api('GET', '/api/v1/workout-sessions/' + active.id)).body.status === 'FINISHED', 'FINISH backend')
    sessions.push((await d.api('GET', '/api/v1/workout-sessions/' + active.id)).body)
    await d.click('다시 조회', '.workout-online'); await single(`${i + 1}\n완료 웨이트 세트`)
  }
  note('Three real UI START/FINISH cycles: ACTIVE 0 panels, FINISH 1 panel; A has 3 sets / 6 reps')
  await d.send('Page.reload'); await single('3\n완료 웨이트 세트'); note('Reload retains exactly one A statistics instance')
  const overview = d.requests.filter(r => r.path.endsWith('/statistics/overview')).at(-1)
  const range = new URLSearchParams(overview.query), from = range.get('fromDate'), to = range.get('toDateExclusive')
  await d.click('운동 현황', '.statistics'); await single('실제 누적 1분 / 계획 2분')
  await d.click('이전', '.statistics'); await single('계획 시간 확인 불가')
  const previous = (await d.text('.statistics')).match(/\d{4}-\d{2}-\d{2} ~ \d{4}-\d{2}-\d{2}/)[0]
  await d.click('이번 주 요약으로', '.statistics'); await d.click('근육별 통계', '.statistics'); await single(from)
  assert.equal(await d.evaluate('document.querySelector(".statistics button[aria-pressed=true]").textContent'), '주간')
  await d.click('월간', '.statistics'); await single('주동근 세트')
  const month = (await d.text('.statistics')).match(/\d{4}-\d{2}-\d{2} ~ \d{4}-\d{2}-\d{2}/)[0]
  await d.click('이번 주 요약으로', '.statistics'); await d.click('운동 현황', '.statistics'); await single(previous)
  await d.click('이번 주 요약으로', '.statistics'); await d.click('근육별 통계', '.statistics'); await single(month)
  note('E01 independent activity previous-week / muscles month periods and real API requests')
  await d.click('이번 주 요약으로', '.statistics'); await d.click('주간 일정 편집'); await d.input(`select[aria-label="${weekday}요일 루틴"]`, ''); await d.click('일정 예약 저장')
  await waitFor(() => d.evaluate('!document.querySelector("[aria-labelledby=weekly-schedule-title] form")'), 'rest reserved')
  await d.click('운동 현황', '.statistics'); await d.click('다음', '.statistics'); await single('실제 누적 1분 / 계획 2분')
  await d.click('다음', '.statistics'); await single('실제 누적 0분 · 계획 없음')
  await d.click('월간', '.statistics'); await single('계획 시간 확인 불가'); note('E02 known actual/plan, zero/no-plan and month unknown coverage preserved')
  await d.click('이번 주 요약으로', '.statistics'); await d.click('V22 lifecycle A routine', '.workout-online'); await d.click('이 루틴 편집')
  await d.evaluate('document.querySelector("form.online-routine input[type=checkbox]").click()'); await d.labelInput('새 승인 중량', '12', 'form.online-routine'); await d.click('루틴 저장')
  await waitFor(() => d.evaluate('!document.querySelector("form.online-routine")'), 'approval saved')
  await d.click('성장 추적', '.statistics'); await d.click('V22 synthetic weight', '.statistics'); await single('승인 변경 내역 1건'); note('Real growth search/options/history still display the explicit approval')
  const preserved = (await d.api('GET', '/api/v1/workout-sessions/' + sessions[0].id)).body
  assert.deepEqual(preserved.initialPlan, sessions[0].initialPlan); assert.deepEqual(preserved.completionAssessment, sessions[0].completionAssessment)
  await d.click('이번 주 요약으로', '.statistics')
  const delayed = d.requests.length
  await d.send('Network.emulateNetworkConditions', { offline: false, latency: 1000, downloadThroughput: -1, uploadThroughput: -1 })
  await d.click('새로고침', '.statistics'); await waitFor(() => d.requests.slice(delayed).some(r => r.path.endsWith('/statistics/overview')), 'in-flight overview')
  await logout(); assert(d.requests.slice(delayed).some(r => r.path.endsWith('/statistics/overview') && r.canceled))
  await d.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  note('Logout removes all protected DOM and aborts the real delayed A overview')
  const b = await login('b'); assert.notEqual(b.userId, a.userId)
  const bData = await d.api('GET', `/api/v1/statistics/overview?fromDate=${from}&toDateExclusive=${to}`)
  assert.equal(bData.body.statistics.summary.completedSets, '0'); assert.equal(bData.body.statistics.cardioActiveMs, '0')
  await single('0\n완료 웨이트 세트'); assert(!(await d.text('body')).includes('V22 lifecycle A routine'))
  await d.click('운동 현황', '.statistics'); await single('실제 누적 0분 · 계획 시간 확인 불가')
  assert(!(await d.text('.statistics')).includes('3세트 · 6회')); await d.click('이번 주 요약으로', '.statistics'); await d.click('새로고침', '.statistics'); await single('0\n완료 웨이트 세트')
  await d.send('Page.reload'); await single('0\n완료 웨이트 세트'); note('B API and every visible statistics panel stay zero through navigation/refresh/reload')
  await logout(); await login('a'); await single('3\n완료 웨이트 세트'); note('A normal re-login restores A data in exactly one panel')
  const expired = await d.control('expire-session', { userId: a.userId }); assert(expired.expired > 0)
  await d.click('다시 조회', '.workout-online'); await waitFor(async () => (await count()) === 0 && (await d.text('body')).includes('로그인이 만료되거나 세션이 변경됐습니다'), 'expired boundary')
  assert.equal((await d.api('GET', '/api/v1/routines')).status, 401)
  await d.click('로그인 상태 다시 확인'); await waitFor(() => d.evaluate('!!document.querySelector("#auth-email")'), 'expired login'); assert.equal(await count(), 0)
  note('Real JDBC session expiry removes protected statistics and workspace, including after explicit recheck')
} catch (error) {
  d.notes.push({ name: 'Lifecycle regression', result: 'FAIL', error: error.message }); throw error
} finally { await d.close() }
