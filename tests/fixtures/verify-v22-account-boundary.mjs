// Focused real-production reproduction. A nonzero exit preserves the product defect; no response is mocked.
import assert from 'node:assert/strict'
import { launchV22Browser, waitFor } from './v22-browser.mjs'
const run = process.argv[2], d = await launchV22Browser(run)
const attempt = crypto.randomUUID()
const authenticated = () => d.evaluate('!!document.querySelector(".workout-online")')
async function login(suffix) {
  const marker = d.requests.length
  await waitFor(() => d.evaluate('!!document.querySelector("#auth-email")'), 'login screen')
  await d.input('#auth-email', 'boundary-' + suffix + '-' + attempt + '@example.invalid')
  // The real UI retains its OTP resend cooldown after logout; do not bypass it.
  await waitFor(() => d.evaluate('!document.getElementById("auth-email").form.querySelector("button[type=submit]").disabled'), 'normal OTP cooldown', 90000)
  await d.click('이메일로 계속하기')
  await waitFor(() => d.requests.slice(marker).some(r => r.path.endsWith('/email-otp/request') && r.status === 202), 'fake delivery')
  const issuance = await d.responseForLast('/api/v1/auth/email-otp/request')
  let delivery = await d.control('otp', { issuanceId: issuance.challengeId })
  await d.input('#auth-code', delivery.code); delivery = null
  await d.click('코드 확인'); await waitFor(authenticated, 'authenticated UI')
}
try {
  await login('a')
  await d.click('새 루틴 만들기')
  await d.labelInput('루틴 이름', 'V22 boundary-only routine', 'form.online-routine')
  await d.input('input[role=combobox]', 'synthetic weight')
  await d.evaluate('document.querySelector("[role=option]").click()')
  for (const label of ['세트 수', '최소 반복', '최대 반복']) await d.labelInput(label, '1', 'form.online-routine')
  await d.labelInput('최초 중량', '10', 'form.online-routine')
  await d.click('루틴 저장'); await waitFor(() => d.evaluate('!document.querySelector("form.online-routine")'), 'saved routine')
  await d.click('온라인으로 운동 시작')
  await waitFor(() => d.evaluate('!!document.querySelector(".local-workout input")'), 'set UI')
  const active = (await d.api('GET', '/api/v1/workout-sessions/active')).body.session
  await d.input('input[aria-label="1세트 이번 반복 횟수"]', '1')
  await d.click('완료', '.local-workout')
  await d.click('운동 종료', '.local-workout'); await d.click('이 시각으로 운동 종료 확인')
  await waitFor(async () => (await d.api('GET', '/api/v1/workout-sessions/' + active.id)).body.status === 'FINISHED', 'finished backend')
  await d.click('다시 조회', '.workout-online')
  await waitFor(() => d.evaluate('!!document.querySelector(".closed-workout")'), 'closed UI')
  const count = await d.evaluate('document.querySelectorAll("#statistics-title").length')
  await d.click('로그아웃'); await d.click('로그아웃 확인')
  await waitFor(() => d.evaluate('!!document.querySelector("#auth-email")'), 'logged out')
  assert.equal((await d.api('GET', '/api/v1/routines')).status, 401)
  const afterLogout = await d.evaluate('document.querySelectorAll("#statistics-title").length')
  d.notes.push({ name: 'Statistics DOM after finish and logout', kind: 'UI', result: count === 1 && afterLogout === 0 ? 'PASS' : 'FAIL', count, afterLogout })
  await login('b')
  const fresh = (await d.api('GET', '/api/v1/routines')).body
  assert.equal(fresh.routines.length, 0)
  const staleVisible = await d.evaluate('Array.from(document.querySelectorAll(".statistics")).some(e=>e.innerText.includes("1\\n완료 웨이트 세트"))')
  d.notes.push({ name: 'Real UI account boundary', kind: 'UI', result: count === 1 && afterLogout === 0 && !staleVisible ? 'PASS' : 'FAIL', count, afterLogout, previousAccountCountVisibleInB: staleVisible })
  console.log(JSON.stringify(d.notes.at(-1)))
  if (count !== 1 || afterLogout !== 0 || staleVisible) process.exitCode = 1
} finally { await d.close() }
