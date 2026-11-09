import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createServer } from 'vite'

test('isolated HOME and ROUTINE preview shares applied presets, protects drafts and supports mobile layouts', { timeout: 120000 }, async () => {
  const root = resolve('logs/preset-review')
  await mkdir(root, { recursive: true })
  const profile = await mkdtemp(resolve(root, 'browser-'))
  const vite = await createServer({ mode: 'ui-review', server: { port: 0, host: '127.0.0.1', watch: { ignored: ['**/logs/**'] } } })
  let browser, socket, next = 0
  const pending = new Map(), apiRequests = [], errors = [], responses = new Map()
  async function wait(check, label) {
    const deadline = Date.now() + (label === 'home' ? 45000 : 12000)
    while (Date.now() < deadline) {
      const result = await check()
      if (result) return result
      await delay(50)
    }
    assert.fail('Timed out: ' + label)
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++next
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    assert.ok(!response.exceptionDetails, response.exceptionDetails?.exception?.description)
    return response.result.value
  }
  const click = (text, by = 'textContent', selector = 'button') => wait(() => evaluate(
    '(() => { const e = [...document.querySelectorAll(' + JSON.stringify(selector) + ')].find(e => e.getClientRects().length && !e.disabled && (e[' + JSON.stringify(by) + '] ?? "").trim() === ' + JSON.stringify(text) + '); if (!e) return false; e.click(); return true })()'), text)
  const set = (selector, value) => evaluate(
    '(() => { const e = document.querySelector(' + JSON.stringify(selector) + '); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e), "value").set.call(e, ' + JSON.stringify(value) + '); e.dispatchEvent(new Event(e.tagName === "SELECT" ? "change" : "input", {bubbles:true})); })()')
  const body = () => evaluate('document.body.innerText')
  const scenario = 'aside[aria-label="Mock 검토 설정"] label:nth-of-type(1) select'
  const fault = 'aside[aria-label="Mock 검토 설정"] label:nth-of-type(2) select'
  const chooser = '[aria-label="홈"] details'
  const editor = 'form[aria-label="주간 일정 편집"]'
  const preset = number => click(number + '번 프리셋 보기', 'ariaLabel')
  const menu = () => click('주간 루틴 일정 메뉴', 'ariaLabel', 'summary')
  const saveSchedule = async () => { await click('일정 저장'); await click('변경 확인') }
  const verifyWidth = async width => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 852, deviceScaleFactor: 1, mobile: true })
    assert.equal(await evaluate('document.documentElement.scrollWidth <= ' + width), true, 'viewport overflow at ' + width)
  }
  const rowIds = () => evaluate('[...document.querySelectorAll("[data-preset-row]")].map(row => row.dataset.presetRow)')
  const rowTops = () => evaluate('[...document.querySelectorAll("[data-preset-row]")].map(row => row.getBoundingClientRect().top)')
  const drag = async (from, to, { touch = false, cancel = false, during } = {}) => {
    const [start, end] = await evaluate(`[${from}, ${to}].map(index => {
      const handle = document.querySelectorAll('[data-preset-row] [aria-describedby="preset-order-help"]')[index]
      const box = handle.getBoundingClientRect()
      return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
    })`)
    if (touch) {
      await send('Emulation.setTouchEmulationEnabled', { enabled: true })
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] })
      await during?.()
      await send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] })
      await send('Emulation.setTouchEmulationEnabled', { enabled: false })
    } else {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...start, button: 'left', buttons: 1, clickCount: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...end, button: 'left', buttons: 1 })
      await during?.()
      if (cancel) {
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
      }
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...end, button: 'left', clickCount: 1 })
    }
  }
  const verifyLiveMove = (from, to, originalOrder, before) => async () => {
    const direction = Math.sign(to - from)
    await wait(async () => {
      const tops = await rowTops()
      return direction * (tops[from] - before[from]) > 10 && direction * (before[to] - tops[to]) > 10
    }, 'dragged row and adjacent row move before release')
    assert.deepEqual(await rowIds(), originalOrder, 'pointer capture stays on the original row until release')
  }
  try {
    await vite.listen()
    const origin = 'http://127.0.0.1:' + vite.httpServer.address().port
    browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',
      ['--headless', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', '--no-first-run',
        '--disable-background-networking', '--no-proxy-server', '--disable-extensions', '--no-default-browser-check', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
    const port = await wait(async () => {
      try { return Number((await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { return false }
    }, 'Chrome')
    const pages = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()
    const page = pages.find(target => target.type === 'page')
    assert.ok(page)
    assert.equal((await fetch(origin + '/routine-preview')).status, 200)
    socket = new WebSocket(page.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
    socket.onmessage = event => {
      const message = JSON.parse(event.data), request = pending.get(message.id)
      if (request) { pending.delete(message.id); message.error ? request.reject(Error(message.error.message)) : request.resolve(message.result) }
      if (message.method === 'Network.requestWillBeSent') responses.set(message.params.requestId, [message.params.request.url])
      if (message.method === 'Network.responseReceived') responses.get(message.params.requestId)?.push(message.params.response.status)
      if (message.method === 'Network.loadingFailed') responses.get(message.params.requestId)?.push(message.params.errorText)
      if (message.method === 'Network.requestWillBeSent' && new URL(message.params.request.url).pathname.startsWith('/api/')) apiRequests.push(message.params.request.url)
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails)
    }
    socket.onclose = () => { for (const request of pending.values()) request.reject(Error('Chrome closed')); pending.clear() }
    await send('Page.enable'); await send('Network.enable'); await send('Runtime.enable')
    await wait(async () => !(await send('Page.navigate', { url: origin + '/routine-preview?tab=home' })).errorText, 'page navigation')
    await wait(() => evaluate('!!document.querySelector("[data-session-id]")'), 'home')
    assert.match(await body(), /상체 푸시 \+ 러닝/)
    assert.match(await body(), /11\.11 · 상체 푸시 \+ 러닝 · 오늘 예정/)
    assert.equal(await evaluate('document.querySelectorAll("[aria-label=홈] [data-session-id]").length'), 3)
    assert.deepEqual(await evaluate('[...document.querySelectorAll("[aria-label=홈] [data-session-id] [data-state]")].map(e=>e.dataset.state)'), ['complete','incomplete','unknown'])
    await verifyWidth(393); await verifyWidth(320)
    const tuesday = () => evaluate('document.querySelector("button[aria-label^=\'2026-11-10\']").click()')
    await tuesday()
    assert.match(await body(), /11\.10 · 휴식/)
    assert.doesNotMatch(await body(), /당일 배정 확인 불가|확인할 수 있는 계획 없음/)

    await click('루틴')
    assert.equal(await evaluate('document.querySelector("[data-mode=active]").textContent'), '✓진행중')
    await preset(2); await verifyWidth(393); await verifyWidth(320)
    assert.ok(await evaluate(`(() => {
      const status = document.querySelector('[aria-label^="02번 주간 일정으로"]')
      const title = status.parentElement
      const rotation = document.querySelector('[aria-label="자동 순환"]')
      const icon = getComputedStyle(rotation)
      return title.firstElementChild.textContent === '주간 루틴 일정' &&
        status.getBoundingClientRect().right === title.getBoundingClientRect().right &&
        rotation.getBoundingClientRect().top > status.getBoundingClientRect().top &&
        icon.borderTopWidth === '0px' && icon.backgroundColor === 'rgba(0, 0, 0, 0)' &&
        rotation.getBoundingClientRect().width >= 44 &&
        status.querySelector('path').getAttribute('d') === 'M7 7h14m0 0-4-4m4 4-4 4M17 17H3m0 0 4-4m-4 4 4 4'
    })()`))
    const listFilter = '[aria-label="저장된 루틴 필터"]'
    assert.deepEqual(await evaluate(`[...document.querySelector('${listFilter}').options].map(o => o.textContent)`), ['전체', '최신순', '오래된순', '이 일정 배정', '이 일정 미배정'])
    const firstRoutine = () => evaluate('document.querySelector("article button[aria-label$=\'상세\']").ariaLabel')
    await set(listFilter, 'newest'); assert.match(await firstRoutine(), /가벼운 러닝/)
    await set(listFilter, 'oldest'); assert.match(await firstRoutine(), /등과 팔/)
    await set(listFilter, 'assigned'); assert.equal(await evaluate('document.querySelectorAll("article").length'), 2)
    await set(listFilter, 'all')
    await click('세로 일정 보기', 'ariaLabel')
    for (const width of [320, 393]) {
      await verifyWidth(width)
      assert.ok(await evaluate(`[...document.querySelectorAll('[aria-label="세로 주간 일정"] button')].filter(row => row.children.length === 3).every(row => {
        const [day, info, counts] = row.children
        const title = info.querySelector('strong')
        return info.firstElementChild.getBoundingClientRect().left - day.getBoundingClientRect().right >= 10 &&
          title.getBoundingClientRect().right <= counts.getBoundingClientRect().left &&
          getComputedStyle(title).textOverflow === 'ellipsis' && row.getBoundingClientRect().height === 44
      })`))
    }
    await click('가로 일정 보기', 'ariaLabel')
    assert.equal(await evaluate('document.querySelectorAll("[aria-label=\'가로 주간 일정\'] button").length'), 7)
    await click('세로 일정 보기', 'ariaLabel')
    assert.match(await body(), /전환/)
    assert.match(await body(), /01 기본 훈련 주간 · 월·수·금/)
    assert.match(await body(), /02 하체 중심.* · 화/)
    await click('홈')
    assert.match(await evaluate('document.querySelector("[aria-label=홈] h2").innerText'), /상체 푸시/)
    await click('오늘만 다른 루틴 선택', 'textContent', chooser + ' summary')
    const activeFilter = () => evaluate('document.querySelector("[aria-label=\'루틴 일정 필터\'] [aria-pressed=true]").textContent')
    assert.equal(await activeFilter(), '01')
    assert.deepEqual(await evaluate('[...document.querySelectorAll("[aria-label=\'루틴 일정 필터\'] button")].map(b=>b.textContent)'), ['전체', '미배정', '01', '02', '03'])
    assert.equal(await evaluate('!!document.querySelector("[aria-label=홈] details input[type=search]")'), false)
    assert.equal(await evaluate('document.querySelectorAll("[aria-label=홈] details button strong").length'), 1)
    await click('미배정')
    assert.deepEqual(await evaluate('[...document.querySelectorAll("[aria-label=홈] details button strong")].map(e=>e.textContent)'), ['등과 팔 중심 회복 루틴'])
    await click('전체')
    assert.match(await body(), /가벼운 러닝\s*다른 일정 배정/)
    await click('03')
    assert.match(await body(), /가벼운 러닝/)
    assert.match(await evaluate('document.querySelector("[aria-label=홈] h2").innerText'), /상체 푸시/)
    await wait(() => evaluate('document.querySelector("[aria-label=홈] details button strong[title=\'가벼운 러닝\']")?.closest("button").click() || document.querySelector("[aria-label=홈] details button strong[title=\'가벼운 러닝\']") !== null'), 'today only')
    assert.equal(await evaluate('document.querySelector("[aria-label=홈] details").open'), false)
    await click('루틴'); await click('02번 주간 일정으로 즉시 전환', 'ariaLabel')
    await wait(async () => (await body()).includes('진행중'), 'manual activation')
    await click('홈'); await click('오늘만 다른 루틴 선택', 'textContent', chooser + ' summary')
    assert.equal(await activeFilter(), '02')
    await tuesday()
    assert.match(await body(), /11\.10 · 휴식/)
    await click('오늘의 원래 일정으로')
    assert.match(await evaluate('document.querySelector("[aria-label=홈] h2").innerText'), /하체 집중/)
    await click('루틴'); await click('자동 순환', 'ariaLabel')
    await wait(() => evaluate('document.querySelector("button[aria-label=\'자동 순환\']").getAttribute("aria-pressed") === "true"'), 'rotation enabled')
    assert.equal(await evaluate('document.querySelector("[aria-label=\'보기 · 조회 전용\']").textContent'), '보기')
    assert.equal(await evaluate('document.querySelector("[aria-label=\'보기 · 조회 전용\'] svg circle") !== null'), true)
    assert.equal(await evaluate('document.querySelector("[aria-label$=\'즉시 전환\']") === null'), true)
    await menu(); await click('주간 일정 전체 편집'); await verifyWidth(320)
    assert.equal(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="변경사항 저장").disabled'), true)
    await click(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="제외").ariaLabel'), 'ariaLabel')
    assert.match(await body(), /최소 2개/)
    assert.equal(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="변경사항 저장").disabled'), true)
    await evaluate('window.confirm=()=>true'); await click('취소')

    await menu()
    assert.equal(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="현재 보고 있는 일정 삭제").disabled'), true)
    await evaluate('document.querySelector("details[open]").open=false')
    await click('빈 프리셋 추가', 'ariaLabel')
    await wait(() => evaluate('!document.querySelector("[aria-label=\'빈 프리셋 추가\']")'), 'four presets')
    await preset(2)
    await menu(); await click('주간 일정 전체 편집')
    const originalOrder = await rowIds()
    for (const width of [320, 393]) {
      await verifyWidth(width)
      assert.ok(await evaluate(`[...document.querySelectorAll('[data-preset-row]')].every(row => {
        const [badge, info, actions] = [...row.children].map(e=>e.getBoundingClientRect())
        return badge.width === 32 && badge.height === 32 &&
          Math.abs((badge.top + badge.bottom) / 2 - (info.top + info.bottom) / 2) < 1 &&
          info.left - badge.right >= 9 && info.right <= actions.left
      })`))
    }
    const beforeMouse = await rowTops()
    assert.equal(await evaluate('[...document.querySelectorAll("[data-preset-row] button")].some(b=>["↑","↓"].includes(b.textContent))'), false)
    await drag(0, 2)
    assert.deepEqual(await rowIds(), originalOrder, 'drag cannot cross groups')
    await drag(0, 1, { during: verifyLiveMove(0, 1, originalOrder, beforeMouse), cancel: true })
    assert.deepEqual(await rowIds(), originalOrder, 'Escape cancels live move')
    assert.deepEqual(await rowTops(), beforeMouse)
    await drag(0, 1, { during: verifyLiveMove(0, 1, originalOrder, beforeMouse) })
    assert.deepEqual(await rowIds(), [originalOrder[1], originalOrder[0], ...originalOrder.slice(2)])
    await click('취소')
    await menu(); await click('주간 일정 전체 편집'); await verifyWidth(393)
    assert.deepEqual(await rowIds(), originalOrder, 'cancel preserves saved order')
    await drag(2, 3, { touch: true, during: verifyLiveMove(2, 3, originalOrder, await rowTops()) })
    const touchOrder = [...originalOrder.slice(0, 2), originalOrder[3], originalOrder[2]]
    assert.deepEqual(await rowIds(), touchOrder)
    const beforeTouchCancel = await rowTops()
    await drag(3, 2, { touch: true, cancel: true, during: verifyLiveMove(3, 2, touchOrder, beforeTouchCancel) })
    assert.deepEqual(await rowIds(), touchOrder, 'touch cancellation preserves earlier draft moves')
    assert.deepEqual(await rowTops(), beforeTouchCancel)
    await evaluate('document.querySelector("[data-preset-row] [aria-describedby=preset-order-help]").focus()')
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 })
    assert.deepEqual(await rowIds(), [originalOrder[1], originalOrder[0], originalOrder[3], originalOrder[2]])
    await click('변경사항 저장')
    await wait(async () => (await body()).includes('진행중'), 'first included preset reapplied after reorder')
    await click('자동 순환', 'ariaLabel')
    await wait(() => evaluate('document.querySelector("button[aria-label=\'자동 순환\']").getAttribute("aria-pressed") === "false"'), 'rotation disabled')
    assert.match(await body(), /진행중/)
    await click('주간 일정 편집')
    await set('[aria-label="수요일 루틴"]', '')
    const presetSelector = '[aria-label="편집할 주간 일정"]'
    const beforeSwitch = await evaluate('document.querySelector(' + JSON.stringify(presetSelector) + ').value')
    const nextPreset = await evaluate('[...document.querySelector(' + JSON.stringify(presetSelector) + ').options].find(o=>!o.selected).value')
    await evaluate('window.confirm=()=>false')
    await set(presetSelector, nextPreset)
    assert.equal(await evaluate('document.querySelector(' + JSON.stringify(presetSelector) + ').value'), beforeSwitch)
    assert.equal(await evaluate('document.querySelector("[aria-label=\'수요일 루틴\']").value'), '')
    await evaluate('window.confirm=()=>true')
    await set(presetSelector, nextPreset)
    assert.equal(await evaluate('document.querySelector(' + JSON.stringify(presetSelector) + ').value'), nextPreset)
    await click('닫기')

    await set(scenario, 'empty')
    assert.match(await body(), /진행중/)
    assert.match(await body(), /저장된 루틴 0개/)
    await click('자동 순환', 'ariaLabel')
    await wait(async () => (await body()).includes('최소 2개'), 'minimum rotation')
    await menu()
    assert.equal(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="현재 보고 있는 일정 삭제").disabled'), true)
    await evaluate('document.querySelector("details[open]").open=false')
    const createdName = '시연용 새 루틴 ' + 'TEST'.repeat(12)
    await click('+ 새 루틴'); await set('input[placeholder="나의 루틴"]', createdName)
    await click('+ 웨이트 종목 추가')
    await wait(() => evaluate('document.querySelector("[aria-label=\'표준 운동 목록\'] button")?.click() || !!document.querySelector("[aria-label=\'웨이트 1\']")'), 'choose weight')
    await set('[aria-label="웨이트 1"] input[inputmode="decimal"]', '20')
    await click('루틴 저장')
    await wait(async () => (await body()).includes('주간 일정에 배정할까요?'), 'creation notice')
    for (const width of [320, 393]) {
      await verifyWidth(width)
      const buttons = await evaluate(`[...document.querySelectorAll('[aria-label="새 루틴 생성 완료"] button')].map(b=>({ text:b.textContent, height:b.offsetHeight, width:b.offsetWidth, fits:b.scrollWidth <= b.clientWidth }))`)
      assert.deepEqual(buttons.map(b => b.text), ['나중에', '배정하기'])
      assert.ok(buttons.every(b => b.fits && b.height === 44))
      assert.ok(Math.abs(buttons[0].width - buttons[1].width) <= 1)
    }
    await click('배정하기')
    assert.equal(await evaluate('document.querySelector("[aria-label=\'월요일 루틴\']").options[0].textContent'), '✦ 새 루틴 · ' + createdName)
    assert.equal(await evaluate('document.querySelector("[aria-label=\'월요일 루틴\']").value'), '')
    const createdId = await evaluate('document.querySelector("[aria-label=\'월요일 루틴\']").options[0].value')
    await set('[aria-label="월요일 루틴"]', createdId)
    await set('[aria-label="수요일 루틴"]', createdId)
    await click('배정 유무 ▾'); await click('배정 미완료')
    assert.equal(await evaluate('document.querySelector("[aria-label=\'수요일 루틴\']").value'), createdId)
    await set(fault, 'network'); await saveSchedule()
    await wait(async () => (await body()).includes('연결이 끊겼습니다'), 'network error')
    assert.equal(await evaluate('document.querySelector("[aria-label=\'월요일 루틴\']").value'), createdId)
    await set(fault, 'conflict'); await saveSchedule()
    await wait(async () => (await body()).includes('버전이 달라졌습니다'), 'version conflict')
    await verifyWidth(393); await verifyWidth(320)
    await evaluate('window.confirm=()=>false')
    await click('닫기')
    assert.equal(await evaluate('!!document.querySelector(' + JSON.stringify(editor) + ')'), true)
    await evaluate('window.confirm=()=>true')
    await click('최신 일정 다시 열기')
    assert.equal(await evaluate('document.querySelector("[aria-label=\'월요일 루틴\']").value'), '')
    await set('[aria-label="수요일 루틴"]', createdId); await saveSchedule()
    await wait(async () => (await body()).includes('주간 일정 편집') && !(await evaluate('!!document.querySelector(' + JSON.stringify(editor) + ')')), 'schedule saved')
    await click('주간 일정 편집')
    assert.equal(await evaluate('[...document.querySelectorAll("[aria-label=\'월요일 루틴\'] option")].some(o=>o.textContent.startsWith("✦"))'), false)
    await click('닫기')
    await click('홈')
    assert.match(await evaluate('document.querySelector("[aria-label=홈] h2").innerText'), /시연용 새 루틴/)
    await click('루틴'); await click(createdName + ' 상세', 'ariaLabel')
    assert.match(await body(), /기본 훈련 주간 · 수/)
    await click('편집'); await set('input[placeholder="나의 루틴"]', '시연용 수정 루틴'); await click('루틴 저장')
    await wait(async () => (await body()).includes('시연용 수정 루틴'), 'routine edited')
    assert.doesNotMatch(await body(), /새 루틴 생성 완료/)

    await set(scenario, 'normal')
    await click('빈 프리셋 추가', 'ariaLabel')
    await wait(async () => !(await evaluate('!!document.querySelector("button[aria-label=\'빈 프리셋 추가\']")')), 'four presets maximum')
    await menu(); await click('이름 변경')
    await set('dialog input[name="name"]', '테스트 일정 이름'); await click('이름 저장')
    await wait(async () => (await body()).includes('테스트 일정 이름') && !await evaluate('!!document.querySelector("dialog[open]")'), 'renamed')
    await menu(); await click('현재 보고 있는 일정 삭제'); await click('일정 삭제')
    await wait(() => evaluate('!!document.querySelector("button[aria-label=\'빈 프리셋 추가\']")'), 'preset deleted')
    await click('상체 푸시 + 러닝 상세', 'ariaLabel'); await click('삭제'); await click('루틴 삭제')
    await wait(() => evaluate('!document.querySelector("dialog[open]") && !document.querySelector("button[aria-label=\'상체 푸시 + 러닝 상세\']")'), 'routine deleted')
    await preset(2)
    assert.doesNotMatch(await body(), /루틴 확인 필요/)
    await click('홈')
    await evaluate('document.querySelector("button[aria-label^=\'2026-11-09\']").click()')
    assert.match(await body(), /11\.09 · 상체 푸시 \+ 러닝 · 완료/)
    assert.match(await evaluate('document.querySelector("[aria-label=홈] [data-session-id]").innerText'), /상체 푸시/)
    await set(scenario, 'active'); await click('일반 보기')
    assert.equal(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="운동 시작").disabled'), true)
    await click('루틴')
    assert.match(await body(), /조회 전용/)
    assert.equal(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="+ 새 루틴").disabled'), true)
    await click('상체 푸시 + 러닝 상세', 'ariaLabel')
    assert.equal(await evaluate('[...document.querySelectorAll("form button")].find(b=>b.textContent==="삭제").disabled'), true)
    await click('닫기')
    await set(scenario, 'completed')
    assert.match(await body(), /디로딩 완료 당일/)
    await set(scenario, 'unassigned')
    assert.match(await body(), /주간 일정 미배정/)
    await set(scenario, 'read-error'); await click('홈')
    assert.match(await body(), /홈 정보를 불러오지 못했습니다/)
    await click('홈 다시 불러오기')
    assert.match(await body(), /TODAY'S ROUTINE/)
    assert.deepEqual(apiRequests, [])
    assert.deepEqual(errors, [])
    assert.equal(await evaluate('indexedDB.databases().then(dbs => dbs.length)'), 0)
    assert.equal((await fetch(origin + '/api/v1/weekly-schedule')).status, 404)
  } catch (error) {
    if (socket?.readyState === 1) console.error((await body()).slice(0, 1200), errors, [...responses.values()].slice(-25))
    throw error
  } finally {
    if (socket?.readyState === 1) { try { await send('Browser.close') } catch { /* browser exited */ } }
    if (browser?.exitCode === null) browser.kill()
    if (browser) await wait(() => browser.exitCode !== null || browser.signalCode !== null, 'browser exit')
    await vite.close()
    assert.equal(dirname(profile), root)
    assert.match(basename(profile), /^browser-/)
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
