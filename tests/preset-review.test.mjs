import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createReviewFixtureServer } from './fixtures/review-server.mjs'
import { verifyWorkoutReview } from './fixtures/workout-review-checks.mjs'
import { verifyExerciseSwipe } from './fixtures/workout-swipe-checks.mjs'
import { verifyWorkoutProcess } from './fixtures/workout-process-checks.mjs'

test('isolated HOME, ROUTINE, SETTINGS, CATALOG and WORKOUT previews support their workflows', { timeout: 150000 }, async () => {
  const root = resolve('logs/preset-review')
  await mkdir(root, { recursive: true })
  const profile = await mkdtemp(resolve(root, 'browser-'))
  const vite = await createReviewFixtureServer()
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
  const nav = 'nav[aria-label="기본 탐색"]'
  const navTo = async label => {
    const buttons = nav + ' button:not([inert])'
    if (await evaluate(`document.querySelector('${nav}')?.dataset.collapsed === 'true'`)) {
      await click('하단 메뉴 펼치기', 'ariaLabel', buttons)
    }
    await click(label, 'ariaLabel', buttons)
  }
  const set = (selector, value) => evaluate(
    '(() => { const e = document.querySelector(' + JSON.stringify(selector) + '); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e), "value").set.call(e, ' + JSON.stringify(value) + '); e.dispatchEvent(new Event(e.tagName === "SELECT" ? "change" : "input", {bubbles:true})); })()')
  const body = () => evaluate("document.body?.innerText ?? ''")
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
  const drag = async (from, to, { touch = false, cancel = false, during, rows = '[data-preset-row]', handle = '[aria-describedby="preset-order-help"]' } = {}) => {
    const [start, end] = await evaluate(`[${from}, ${to}].map(index => {
      const handle = document.querySelectorAll(${JSON.stringify(rows + ' ' + handle)})[index]
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
    await vite?.listen()
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
    await send('Page.enable');await send('Page.addScriptToEvaluateOnNewDocument',{source:`{const BaseDate=Date,offset=Date.parse('2026-11-11T03:00:00Z')-BaseDate.now();window.Date=class extends BaseDate{constructor(...args){super(...(args.length?args:[BaseDate.now()+offset]))}static now(){return BaseDate.now()+offset}}}`}); await send('Network.enable'); await send('Runtime.enable')
    await wait(async () => !(await send('Page.navigate', { url: origin + '/routine-preview?tab=home' })).errorText, 'page navigation')
    await wait(() => evaluate('!!document.querySelector("[data-session-id]")'), 'home')
    assert.match(await body(), /상체 푸시 \+ 러닝/)
    assert.match(await body(), /11\.11 · 상체 푸시 \+ 러닝 · 오늘 예정/)
    assert.equal(await evaluate('document.querySelectorAll("[aria-label=홈] [data-session-id]").length'), 3)
    assert.deepEqual(await evaluate('[...document.querySelectorAll("[aria-label=홈] [data-session-id] [data-state]")].map(e=>e.dataset.state)'), ['complete','missed','unknown'])
    const activeTab = label => wait(() => evaluate(`document.querySelector('${nav} [aria-current=page]')?.ariaLabel === ${JSON.stringify(label)}`), 'active tab ' + label)
    const tabIcons = () => evaluate(`[...document.querySelectorAll('${nav} svg')].map(icon => {
      const style = getComputedStyle(icon);
      return [icon.querySelector('path').getAttribute('d'), style.fill, style.stroke, style.strokeWidth];
    })`)
    const outlinePaths = (await tabIcons()).map(([path]) => path)
    const assertTabIcons = async activeIndex => {
      const icons = await tabIcons()
      const inactiveStroke = 'rgb(209, 213, 221)'
      assert.deepEqual(icons.map(([path]) => path), outlinePaths)
      assert.deepEqual(icons.map(([, ...style]) => style), [
        activeIndex === 0 ? ['rgb(0, 0, 0)', 'none', '1.6px'] : ['none', 'rgb(255, 255, 255)', '1.6px'],
        ['none', activeIndex === 1 ? 'rgb(0, 0, 0)' : inactiveStroke, activeIndex === 1 ? '3px' : '1.6px'],
        ['none', activeIndex === 2 ? 'rgb(0, 0, 0)' : inactiveStroke, activeIndex === 2 ? '3px' : '1.6px'],
        activeIndex === 3 ? ['rgb(0, 0, 0)', 'none', '1.6px'] : ['none', inactiveStroke, '1.6px'],
      ])
    }
    const capsuleAligned = () => evaluate(`(() => {
      const bar = document.querySelector('${nav}'), selected = bar.querySelector('[aria-current=page]');
      const indicator = bar.querySelector('[data-tab-indicator]').getBoundingClientRect();
      const button = selected.getBoundingClientRect();
      return Math.abs(indicator.x + indicator.width / 2 - button.x - button.width / 2) < 1;
    })()`)
    await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
    for (const width of [320, 375, 393, 430, 1280]) {
      await verifyWidth(width)
      assert.ok(await evaluate(`(() => {
        const bar = document.querySelector('${nav}'), bounds = bar.querySelector('[data-tab-surface]').getBoundingClientRect();
        const indicator = bar.querySelector('[data-tab-indicator]'), buttons = [...bar.querySelectorAll('button')];
        const rectangles = buttons.map(b => b.getBoundingClientRect());
        return bounds.width === Math.min(innerWidth-24,336) && bounds.height === 56 && bounds.bottom === innerHeight && Math.abs(bounds.left - (innerWidth - bounds.right)) < 1
          && buttons.map(b => b.ariaLabel).join() === '홈,루틴,기록,설정'
          && buttons.every(b => !b.textContent.trim() && b.querySelector('svg[aria-hidden=true]')?.getBoundingClientRect().width === 24)
          && rectangles.every(r => r.height === 46 && Math.abs(rectangles[0].width-r.width) < 1)
          && buttons.filter(b => b.getAttribute('aria-current') === 'page').length === 1
          && getComputedStyle(indicator,'::before').backgroundColor === 'rgb(108, 147, 198)'
          && getComputedStyle(indicator).transitionDuration.split(', ')[0] === '0.2s'
          && getComputedStyle(buttons[1]).backgroundColor === 'rgba(0, 0, 0, 0)';
      })()`), `capsule layout at ${width}px`)
    }
    await assertTabIcons(0)
    await verifyWidth(393)
    assert.equal(await evaluate("getComputedStyle(document.querySelector('main')).paddingBottom"), '72px')
    await send('Emulation.setSafeAreaInsetsOverride',{insets:{bottom:34}})
    await wait(() => evaluate(`innerHeight-document.querySelector('${nav}').getBoundingClientRect().bottom === 34 && getComputedStyle(document.querySelector('main')).paddingBottom === '106px'`), 'single safe-area offset')
    await send('Emulation.setSafeAreaInsetsOverride',{insets:{bottom:0}})
    await evaluate(`document.querySelector('${nav} button').focus()`)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    assert.equal(await evaluate(`document.activeElement.ariaLabel === '루틴' && document.activeElement.matches(':focus-visible') && getComputedStyle(document.activeElement).outlineStyle === 'solid'`), true)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 })
    await activeTab('루틴')
    await assertTabIcons(1)
    await navTo('기록'); await activeTab('기록')
    await assertTabIcons(2)
    await navTo('설정'); await activeTab('설정')
    await assertTabIcons(3)
    await evaluate('history.back()'); await activeTab('기록')
    await evaluate('history.forward()'); await activeTab('설정')
    await wait(capsuleAligned, 'capsule settles after rapid navigation and browser history')
    await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]})
    await navTo('기록'); await activeTab('기록')
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('${nav} [data-tab-indicator]')).transitionDuration`),'0s')
    assert.ok(await capsuleAligned())
    await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
    await navTo('설정'); await activeTab('설정')
    await navTo('홈'); await activeTab('홈')

    const isCollapsed = () => evaluate(`document.querySelector('${nav}').dataset.collapsed === 'true'`)
    const scrollTo = top => evaluate(`new Promise(resolve => { window.scrollTo(0, ${top}); requestAnimationFrame(() => requestAnimationFrame(() => resolve(window.scrollY))) })`)
    const collapsedGeometry = inset => evaluate(`(() => {
      const bar = document.querySelector('${nav}'), bounds = bar.querySelector('[data-tab-surface]').getBoundingClientRect();
      const active = bar.querySelector('button:not([inert])');
      const icon = active.querySelector('svg').getBoundingClientRect();
      return bounds.width === 46 && bounds.height === 46 && bounds.bottom === innerHeight - ${inset}
        && Math.abs(icon.x + icon.width / 2 - innerWidth / 2) < 1 && icon.width === 24 && icon.height === 24
        && Math.abs(icon.y + icon.height / 2 - (bounds.y + 23)) < 1
        && getComputedStyle(document.querySelector('main')).paddingBottom === '${72 + inset}px'
        && getComputedStyle(bar.querySelector('[data-tab-indicator]'), '::before').backgroundColor === 'rgb(94, 130, 177)'
        && active.getBoundingClientRect().width === 46;
    })()`)
    const expansionFrames = () => evaluate(`new Promise(resolve => {
      const bar = document.querySelector('${nav}');
      const indicator = bar.querySelector('[data-tab-indicator]');
      const snapshot = () => ({
        color: getComputedStyle(indicator, '::before').backgroundColor,
        centers: [...bar.querySelectorAll('svg')].map(icon => {
          const bounds = icon.getBoundingClientRect();
          return bounds.x + bounds.width / 2;
        }),
      });
      const observer = new MutationObserver(() => {
        if (bar.dataset.collapsed !== 'false') return;
        observer.disconnect();
        const animations = bar.getAnimations({subtree: true});
        for (const animation of animations) animation.pause();
        const frames = [0, 100, 200, 339, 340].map(time => {
          for (const animation of animations) animation.currentTime = time;
          return snapshot();
        });
        for (const animation of animations) animation.finish();
        resolve([...frames, snapshot()]);
      });
      observer.observe(bar, {attributes: true, attributeFilter: ['data-collapsed']});
      bar.querySelector('button[aria-expanded=false]').click();
    })`)
    await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 540, deviceScaleFactor: 1, mobile: true })
    for (const [index, label] of ['홈', '루틴', '기록', '설정'].entries()) {
      if (index !== 0) await navTo(label)
      await activeTab(label)
      await evaluate('document.activeElement.blur()')
      const inset = index % 2 === 0 ? 0 : 34
      await send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: inset } })
      await scrollTo(0)
      for (const position of [2, 1, 3, 20]) await scrollTo(position)
      assert.equal(await isCollapsed(), false, 'small or reversing scroll stays expanded')
      assert.equal(await scrollTo(64), 64)
      await wait(isCollapsed, label + ' scroll collapse')
      await wait(() => collapsedGeometry(inset), label + ' centered circle')
      assert.deepEqual(await evaluate(`[...document.querySelectorAll('${nav} button:not([inert])')].map(b => b.ariaLabel)`), ['하단 메뉴 펼치기'])
      assert.equal(await evaluate(`document.querySelectorAll('${nav} button[inert][aria-hidden=true]').length`), 3)
      await assertTabIcons(index)

      const historyIndex = await evaluate('history.state.overloadNavigation.index')
      const [start, middle, late, nearEnd, lastFrame, end] = await expansionFrames()
      await activeTab(label)
      assert.equal(start.color, 'rgb(94, 130, 177)')
      assert.equal(end.color, 'rgb(108, 147, 198)')
      assert.notEqual(middle.color, start.color)
      assert.notEqual(middle.color, end.color)
      for (const [i, target] of end.centers.entries()) {
        let previous = start.centers[i]
        assert.ok(Math.abs(previous - 196.5) < .02, 'expansion starts at the center')
        for (const frame of [middle, late, nearEnd, lastFrame, end]) {
          const current = frame.centers[i]
          assert.ok(Math.abs(current - target) <= Math.abs(previous - target) + .01, 'icon moves toward its slot')
          assert.ok(target < 196.5 ? current >= target - .01 : current <= target + .01, 'icon stays within its final slot center')
          previous = current
        }
        assert.ok(Math.abs(nearEnd.centers[i] - target) < .02, 'icon is already approaching rest in the penultimate frame')
        assert.equal(lastFrame.centers[i], target, 'last animated and settled slot centers match')
      }
      assert.equal(await evaluate('history.state.overloadNavigation.index'), historyIndex)
      assert.equal(await evaluate('window.scrollY'), 64)
      assert.equal(await isCollapsed(), false, 'manual expansion waits for new scrolling')
      await scrollTo(100)
      await wait(isCollapsed, label + ' renewed down scroll')
      await scrollTo(70)
      await activeTab(label)
      await scrollTo(0)
    }
    await send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: 0 } })
    await navTo('홈'); await activeTab('홈'); await verifyWidth(320)
    const tuesday = () => evaluate('document.querySelector("button[aria-label^=\'2026-11-10\']").click()')
    await tuesday()
    assert.match(await body(), /11\.10 · 휴식/)
    assert.doesNotMatch(await body(), /당일 배정 확인 불가|확인할 수 있는 계획 없음/)

    await navTo('루틴')
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
    await navTo('홈')
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
    await navTo('루틴'); await click('02번 주간 일정으로 즉시 전환', 'ariaLabel')
    await wait(async () => (await body()).includes('진행중'), 'manual activation')
    await navTo('홈'); await click('오늘만 다른 루틴 선택', 'textContent', chooser + ' summary')
    assert.equal(await activeFilter(), '02')
    await tuesday()
    assert.match(await body(), /11\.10 · 휴식/)
    await click('오늘의 원래 일정으로')
    assert.match(await evaluate('document.querySelector("[aria-label=홈] h2").innerText'), /하체 집중/)
    await navTo('루틴'); await click('자동 순환', 'ariaLabel')
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
    await click('설정 중량', 'ariaLabel'); await click('직접 입력'); await set('dialog[open] input', '20'); await click('확인', 'textContent', 'dialog[open] button')
    await click('+ 유산소 종목 추가'); await click('달리기')
    await click('러닝머신', 'textContent', '[aria-label="표준 유산소 목록"] strong')
    await click('추가 목표 설정', 'textContent', '[aria-label="유산소 1"] summary')
    const cardioFields = '[aria-label="유산소 1"] input'
    for (const [label,value] of [['목표 시간 (분)','20'],['목표 거리 (km)','2.5'],['목표 속도 (km/h)','8'],['목표 경사도 (%)','0']]) await set(`${cardioFields}[aria-label="${label}"]`,value)
    await click('추가 목표 설정', 'textContent', '[aria-label="유산소 1"] summary')
    await set(fault, 'network'); await click('루틴 생성')
    await wait(async () => (await body()).includes('연결이 끊겼습니다'), 'routine creation failure')
    assert.equal(await evaluate(`document.querySelector('form[aria-label="루틴 생성"] input[placeholder="나의 루틴"]').value`),createdName)
    assert.doesNotMatch(await body(), /새 루틴 생성 완료/)
    await click('고정된 저장 요청 다시 확인')
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
    await navTo('홈')
    assert.match(await evaluate('document.querySelector("[aria-label=홈] h2").innerText'), /시연용 새 루틴/)
    await navTo('루틴'); await click(createdName + ' 상세', 'ariaLabel')
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('[aria-label="루틴 상세"] [aria-label="주간 일정 배정"] li')].map(row=>[...row.children].map(cell=>cell.textContent))`),[['01','기본 훈련 주간','수']])
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('[aria-label="루틴 상세"] [aria-label="유산소 1"] dd')].map(cell=>cell.textContent.trim())`),['20 분','2.5 km','8 km/h','0 %'])
    await click('편집'); await set('input[placeholder="나의 루틴"]', '시연용 수정 루틴')
    await set(fault, 'network'); await click('변경 사항 저장')
    await wait(async () => (await body()).includes('연결이 끊겼습니다'), 'routine save failure')
    assert.equal(await evaluate(`document.querySelector('form[aria-label="루틴 편집"] input[placeholder="나의 루틴"]').value`), '시연용 수정 루틴')
    await click('고정된 저장 요청 다시 확인')
    await wait(async () => (await body()).includes('시연용 수정 루틴'), 'routine edited')
    assert.doesNotMatch(await body(), /새 루틴 생성 완료/)

    await set(scenario, 'normal')
    await click('빈 프리셋 추가', 'ariaLabel')
    await wait(async () => !(await evaluate('!!document.querySelector("button[aria-label=\'빈 프리셋 추가\']")')), 'four presets maximum')
    await send('Emulation.setDeviceMetricsOverride', {width:393,height:400,deviceScaleFactor:1,mobile:true})
    await menu(); await click('이름 변경')
    assert.equal(await evaluate(`document.activeElement.matches('dialog [data-dialog-heading]')`),true,'rename waits for the user to focus the input')
    assert.ok(await evaluate('document.documentElement.scrollHeight > innerHeight'),'fixture has a scrollable background')
    const renamePageScroll = await evaluate('scrollY')
    await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:4,y:200,deltaY:210,deltaX:0})
    await new Promise(r=>setTimeout(r,230))
    assert.equal(await evaluate('scrollY'),renamePageScroll,'modal backdrop does not scroll the document')
    await verifyWidth(393)
    await set('dialog input[name="name"]', '테스트 일정 이름'); await click('이름 저장')
    await wait(async () => (await body()).includes('테스트 일정 이름') && !await evaluate('!!document.querySelector("dialog[open]")'), 'renamed')
    await menu(); await click('현재 보고 있는 일정 삭제'); await click('일정 삭제')
    await wait(() => evaluate('!!document.querySelector("button[aria-label=\'빈 프리셋 추가\']")'), 'preset deleted')
    await click('상체 푸시 + 러닝 상세', 'ariaLabel')
    await click('루틴 삭제'); await click('취소', 'textContent', 'dialog[open] button')
    assert.match(await body(), /루틴 상세/)
    await click('루틴 삭제'); await click('루틴 삭제', 'textContent', 'dialog[open] button')
    await wait(() => evaluate('!document.querySelector("dialog[open]") && !document.querySelector("button[aria-label=\'상체 푸시 + 러닝 상세\']")'), 'routine deleted')
    await preset(2)
    assert.doesNotMatch(await body(), /루틴 확인 필요/)
    await navTo('홈')
    await evaluate('document.querySelector("button[aria-label^=\'2026-11-09\']").click()')
    assert.match(await body(), /11\.09 · 상체 푸시 \+ 러닝 · 완료/)
    assert.match(await evaluate('document.querySelector("[aria-label=홈] [data-session-id]").innerText'), /상체 푸시/)
    await set(scenario, 'active'); await click('일반 보기')
    assert.equal(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="운동 시작").disabled'), true)
    await navTo('루틴')
    assert.match(await body(), /조회 전용/)
    assert.equal(await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="+ 새 루틴").disabled'), true)
    await click('상체 푸시 + 러닝 상세', 'ariaLabel')
    assert.equal(await evaluate(`[...document.querySelectorAll('[aria-label="루틴 상세"] button')].find(b=>b.textContent.trim()==="루틴 삭제").disabled`), true)
    await click('루틴 목록으로', 'ariaLabel')
    await set(scenario, 'completed')
    assert.match(await body(), /디로딩 완료 당일/)
    await set(scenario, 'unassigned')
    assert.match(await body(), /주간 일정 미배정/)
    await set(scenario, 'read-error'); await navTo('홈')
    assert.match(await body(), /홈 정보를 불러오지 못했습니다/)
    await click('홈 다시 불러오기')
    assert.match(await body(), /TODAY'S ROUTINE/)

    await send('Page.navigate', { url: origin + '/routine-preview?tab=settings' })
    const settingsPage = 'section[aria-label="설정"]'
    const settingsItem = 'button[aria-labelledby][aria-describedby]'
    await wait(() => evaluate(`!!document.querySelector('${settingsPage}')`), 'full settings')
    assert.equal(await evaluate(`document.querySelectorAll('${settingsPage} h1, ${settingsPage} h2').length`), 0)
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${settingsPage} button strong, ${settingsPage} summary strong')].map(e => e.textContent)`),
      ['내 계정', '세트 사이 휴식', '휴식 타이머 알림', '유산소 거리 자동 추정', '운동 종목 보기', '디로딩 설정', '운동 데이터 상태',
        '운동 데이터 내보내기', '앱 설치 · 오프라인 준비', '전체 운동 데이터 초기화', '회원 탈퇴'])
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${settingsPage} button:disabled strong')].map(e => e.textContent)`),
      ['디로딩 설정', '운동 데이터 상태', '운동 데이터 내보내기', '전체 운동 데이터 초기화', '회원 탈퇴'])
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('nav[aria-label="기본 탐색"] button')].map(e => e.ariaLabel)`),
      ['홈', '루틴', '기록', '설정'])
    for (const width of [320, 393]) {
      await verifyWidth(width)
      assert.ok(await evaluate(`(() => {
        window.scrollTo(0, document.documentElement.scrollHeight)
        const last = document.querySelector('${settingsPage} > button')
        return window.scrollY > 0 && last.textContent === '로그아웃' &&
          last.getBoundingClientRect().bottom <= document.querySelector('nav').getBoundingClientRect().top
      })()`))
    }
    await click('로그아웃')
    assert.equal(await evaluate('document.querySelector("dialog[open] button.danger").disabled'), true)
    await click('취소')
    await click('앱 설치 · 오프라인 준비', 'textContent', 'summary strong')
    assert.match(await body(), /검토용 설치 안내/)
    await click('앱 설치 · 오프라인 준비', 'textContent', 'summary strong')
    await click('내 계정', 'ariaLabel', settingsPage + ' button')
    assert.match(await body(), /대표 재인증 이메일/)
    const accountPage = 'section[aria-label="계정 설정"]'
    for (const width of [320, 375, 393, 430, 1280]) {
      await verifyWidth(width)
      assert.ok(await evaluate(`(() => {
        const account = document.querySelector('${accountPage}')
        const bounds = account.getBoundingClientRect()
        return bounds.left >= 0 && bounds.right <= innerWidth &&
          [...account.querySelectorAll('.app-card')].every(card => card.scrollWidth <= card.clientWidth && getComputedStyle(card).borderRadius === '5px')
      })()`), 'account detail fits ' + width)
    }
    assert.match(await body(), /이메일 로그인.*연결됨.*Google 로그인.*미연결/s)
    await set('main label select', 'both')
    assert.match(await body(), /이메일 로그인.*연결됨.*Google 로그인.*연결됨/s)
    await set('main label select', 'google')
    assert.match(await body(), /이메일 로그인.*미연결.*Google 로그인.*연결됨/s)
    await set('main label select', 'email')
    await click('로그인된 기기 관리', 'ariaLabel', accountPage + ' button')
    const devicesPage = 'section[aria-label="로그인된 기기"]'
    const devicesMode = devicesPage + ' select'
    assert.match(await body(), /검토용 예시.*접속 현황.*3대.*2대.*1대.*iPhone 15 Pro.*iPad Pro.*MacBook Air/s)
    for (const width of [320, 375, 393, 430, 1280]) {
      await verifyWidth(width)
      assert.ok(await evaluate(`[...document.querySelectorAll('${devicesPage} .app-card')].every(card => card.scrollWidth <= card.clientWidth && getComputedStyle(card).borderRadius === '5px')`),
        'devices detail fits ' + width)
    }
    await set(devicesMode, 'here')
    assert.match(await body(), /이 기기에서 운동 진행 중/)
    await set(devicesMode, 'elsewhere')
    assert.match(await body(), /현재 운동은 읽기 전용.*iPad Pro.*운동 진행 중/s)
    await click('iPad Pro · 이 기기 로그아웃', 'ariaLabel', devicesPage + ' button')
    assert.match(await body(), /로그아웃 확인.*iPad Pro.*운동 진행 중인 기기가 포함되어 있어요/s)
    await click('취소', 'textContent', 'dialog button')
    await click('모든 기기에서 로그아웃', 'textContent', devicesPage + ' button')
    assert.match(await body(), /현재 기기도 로그아웃 대상에 포함됩니다/)
    await click('시안 확인', 'textContent', 'dialog button')
    assert.match(await body(), /iPad Pro.*MacBook Air/s)
    await click('다른 기기 모두 로그아웃', 'textContent', devicesPage + ' button')
    assert.match(await body(), /이 기기의 로그인 상태는 유지됩니다/)
    await click('취소', 'textContent', 'dialog button')
    await set(devicesMode, 'only')
    assert.match(await body(), /다른 기기에 로그인되어 있지 않습니다/)
    assert.ok(await evaluate(`[...document.querySelectorAll('${devicesPage} button')].find(b=>b.textContent==='다른 기기 모두 로그아웃').disabled`))
    for (const [mode, message] of [
      ['unknown', /현재 접속한 기기를 확인할 수 없습니다/],
      ['empty', /로그인된 기기가 없습니다/],
      ['loading', /로그인된 기기를 확인하고 있어요/],
      ['error', /로그인된 기기 정보를 불러오지 못했습니다/],
      ['unsupported', /현재 서버에서 로그인된 기기 조회를 지원하지 않습니다/],
    ]) {
      await set(devicesMode, mode)
      assert.match(await body(), message)
    }
    await click('계정 설정으로', 'ariaLabel', devicesPage + ' button')
    await wait(() => evaluate(`Boolean(document.querySelector('${accountPage}'))`), 'account restored after devices')
    assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), '로그인된 기기 관리')
    await click('로그인된 기기 관리', 'ariaLabel', accountPage + ' button')
    await evaluate('history.back()')
    await wait(() => evaluate(`Boolean(document.querySelector('${accountPage}'))`), 'browser back restores account')
    await verifyWidth(393)
    await click('설정으로', 'ariaLabel')
    assert.equal(await evaluate('document.activeElement.querySelector("strong").textContent'), '내 계정')
    await navTo('루틴'); await set(fault, 'network'); await navTo('설정')
    await click('세트 사이 휴식', 'textContent', settingsItem + ' strong')
    assert.match(await body(), /검토용 예시 휴식 시간입니다/)
    const restPage = 'section[aria-label="세트 사이 휴식"]'
    const restSeconds = restPage + ' [name="restLowSeconds"]'
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${restPage} dt, ${restPage} dd strong')].map(e => e.textContent)`),
      ['1~10회', '180초', '11~12회', '120초', '13회 이상', '90초'])
    const cardAction = restPage + ' form .app-card > div:first-child > button'
    assert.equal(await evaluate(`document.querySelectorAll('${restPage} header img[alt="OVERLOAD"]').length`), 0)
    assert.equal(await evaluate(`document.querySelectorAll('${restPage} header button').length`), 1)
    const actionStyle = () => evaluate(`(() => { const b = document.querySelector('${cardAction}'), r = b.getBoundingClientRect(), s = getComputedStyle(b);
      return [r.width,r.height,s.backgroundColor,s.borderColor,s.borderRadius,s.padding] })()`)
    const editStyle = await actionStyle()
    await click('편집', 'textContent', cardAction)
    assert.deepEqual(await actionStyle(), editStyle)
    assert.equal(await evaluate(`document.querySelector('${cardAction}').matches(':focus-visible')`), false)
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
    assert.equal(await evaluate(`document.activeElement === document.querySelector('${cardAction}') && getComputedStyle(document.activeElement).outlineStyle === 'solid'`), true)
    for (const width of [320, 375, 393, 430, 1280]) {
      await verifyWidth(width)
      const layout = await evaluate(`(() => {
        const page = document.querySelector('${restPage}'), inputs = [...page.querySelectorAll('input[inputmode="numeric"]')];
        const firstRow = inputs[0].parentElement, headings = [...firstRow.previousElementSibling.children];
        const centers = headings.map(e => (e.getBoundingClientRect().left + e.getBoundingClientRect().right) / 2);
        const centered = inputs.every(input => [...input.parentElement.children].slice(0, 3).every((cell, column) => {
          const {left,right} = cell.getBoundingClientRect();
          return Math.abs((left+right)/2-centers[column]) < .5 && getComputedStyle(cell).textAlign === 'center';
        }));
        const geometry = cell => { const s = getComputedStyle(cell); return [s.height,s.border,s.borderRadius,s.fontSize,s.padding]; };
        const lastBound = inputs[2].previousElementSibling, lastBoundStyle = getComputedStyle(lastBound);
        const numericStyle = getComputedStyle(inputs[2]);
        const remove = [...page.querySelectorAll('button[aria-label$="구간 삭제"]')];
        const save = page.querySelector('[type=submit]'), saveStyle = getComputedStyle(save);
        return {centered, labels:headings.map(e=>e.textContent), inputGeometry:[geometry(lastBound),geometry(inputs[2])],
          lastBound:[lastBound.textContent,lastBound.tagName,lastBound.tabIndex,lastBound.isContentEditable,lastBoundStyle.cursor],
          mutedBound:lastBoundStyle.backgroundColor !== numericStyle.backgroundColor && lastBoundStyle.color !== numericStyle.color,
          readOnly:page.querySelectorAll('input[readonly]').length,
          deleteColumn:remove.every((e,i)=>e.disabled && e.getBoundingClientRect().left >= inputs[i].getBoundingClientRect().right
            && Math.abs(e.getBoundingClientRect().left-remove[0].getBoundingClientRect().left)<.5),
          addDisabled:[...page.querySelectorAll('button')].find(e=>e.textContent==='+ 구간 추가').disabled,
          saveHeight:save.getBoundingClientRect().height, saveColors:[saveStyle.backgroundColor,saveStyle.color],
          labelGap:firstRow.firstElementChild.getBoundingClientRect().top-firstRow.previousElementSibling.getBoundingClientRect().bottom};
      })()`)
      assert.ok(layout.centered && layout.deleteColumn && layout.addDisabled, `column alignment at ${width}`)
      assert.deepEqual(layout.labels, ['시작 세트', '끝 세트', '휴식 (초)'])
      assert.deepEqual(layout.inputGeometry[0], layout.inputGeometry[1], `cell dimensions at ${width}`)
      assert.deepEqual(layout.lastBound, ['이상', 'SPAN', -1, false, 'default'])
      assert.ok(layout.mutedBound, `inactive surface at ${width}`)
      assert.equal(layout.readOnly, 5)
      assert.equal(layout.saveHeight, 48)
      assert.deepEqual(layout.saveColors, ['rgb(240, 241, 244)', 'rgb(17, 18, 22)'])
      assert.ok(layout.labelGap <= 12)
    }
    await verifyWidth(393)
    const boundSelector = `${restPage} [aria-label="13회 이상 시작 세트"] + span`
    const boundCenter = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(boundSelector)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...boundCenter, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...boundCenter, button: 'left', clickCount: 1 })
    assert.equal(await evaluate(`document.activeElement.matches('input, [contenteditable="true"]') || document.activeElement === document.querySelector(${JSON.stringify(boundSelector)})`), false)
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(boundSelector)}).textContent`), '이상')
    await evaluate(`(() => {
      document.querySelector(${JSON.stringify(restSeconds)}).focus();
      const viewport = window.visualViewport;
      Object.defineProperty(viewport, 'height', {configurable:true, value:innerHeight-280});
      viewport.dispatchEvent(new Event('resize'));
    })()`)
    await wait(() => evaluate(`!document.querySelector('${nav}') && !!document.querySelector(${JSON.stringify(restSeconds)})`), 'keyboard hides capsule without leaving edit')
    await evaluate(`delete window.visualViewport.height; window.visualViewport.dispatchEvent(new Event('resize'))`)
    await activeTab('설정')
    for (const invalid of ['', '0', '2.5', '2147483648']) {
      await set(restSeconds, invalid); await click('변경 사항 저장', 'textContent', restPage + ' button')
      assert.equal(await evaluate(`document.querySelector(${JSON.stringify(restSeconds)}).getAttribute('aria-invalid')`), 'true')
      assert.match(await body(), /1~10회 휴식 시간은/)
    }
    await set(restSeconds, '185')
    await evaluate('window.restConfirms = 0; window.confirm = () => { window.restConfirms++; return false }')
    await click('취소', 'textContent', cardAction)
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(restSeconds)}).value`), '185')
    await navTo('홈')
    assert.equal(await evaluate('window.restConfirms'), 2)
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(restSeconds)}).value`), '185')
    await evaluate('window.confirm = () => true')
    await click('취소', 'textContent', cardAction)
    assert.match(await body(), /180초/)
    await click('편집', 'textContent', cardAction); await set(restSeconds, '185')
    await click('변경 사항 저장', 'textContent', restPage + ' button')
    assert.match(await body(), /연결을 확인하지 못했습니다. 입력을 유지/)
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(restSeconds)}).value`), '185')
    await click('변경 사항 저장', 'textContent', restPage + ' button')
    assert.match(await body(), /185초\s*\(3분 5초\)/)
    await click('설정으로', 'ariaLabel', restPage + ' button')
    await click('운동 종목 보기', 'textContent', settingsItem + ' strong')
    assert.equal(await evaluate('document.activeElement.textContent'), '운동 종목 보기')
    const group = '.exercise-search [aria-label="운동 부위 필터"]'
    const list = '[aria-label="표준 운동 목록"]'
    const names = () => evaluate(`[...document.querySelectorAll('${list} strong')].map(row => row.textContent)`)
    const query = '.exercise-search input[type="search"]'
    const parts = ['전체', '가슴', '등', '어깨', '팔', '하체', '코어', '유산소', '기타']
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${group} button')].map(b=>b.textContent)`),parts)
    assert.equal(await evaluate('document.querySelectorAll(".exercise-search select").length'),0)
    await evaluate('document.querySelector(".exercise-search .search-disclosure").click()')
    assert.equal((await names()).length,0)
    assert.equal(await evaluate('document.querySelectorAll(".exercise-search [role=group]").length'),0)
    await evaluate('document.querySelector(".exercise-search input").click()')
    assert.equal((await names()).length,12)
    for(const width of [320,375,390,430])await verifyWidth(width)
    for(const part of parts.slice(1)){
      await click(part,'textContent',group+' button');assert.ok((await names()).length>0)
    }
    assert.match(await evaluate(`document.querySelector('${list} button').textContent`),/ETC.*손목 스트레칭/)
    await set(query,'ＬＡＴ　PullDown')
    assert.match(await body(),/검색 후보가 없습니다/)
    await click('등','textContent',group+' button')
    assert.deepEqual(await names(),['랫 풀다운'])
    const press = async key => {
      const code = key === 'Enter' ? 13 : 9
      const event = { key, code: key, windowsVirtualKeyCode: code }
      await send('Input.dispatchKeyEvent', key === 'Enter' ? { ...event, type: 'keyDown', text: '\r' } : { ...event, type: 'rawKeyDown' })
      await send('Input.dispatchKeyEvent', { ...event, type: 'keyUp' })
    }
    await evaluate(`document.querySelector('${list} button').focus()`)
    await press('Enter')
    await wait(async () => (await body()).includes('GIF를 제공하지 않습니다'), 'exercise detail')
    assert.equal(await evaluate('document.activeElement.textContent'), '운동 상세')
    assert.deepEqual(await evaluate('[...document.querySelectorAll("main h2")].filter(e => e.getClientRects().length).map(e => e.textContent)'),
      ['랫 풀다운', '동작 시연', '주요 자극 근육', '보조 자극 근육'])
    assert.match(await body(), /PULL.*후면.*조회 전용/s)
    assert.match(await body(), /광배근.*등.*핵심.*대원근.*보조 자극 근육.*상완이두근.*팔.*능형근/s)
    assert.equal((await body()).match(/핵심/g).length, 1)
    assert.doesNotMatch(await body(), /기구에 앉아/)
    await press('Tab')
    assert.equal(await evaluate('document.activeElement.tagName'), 'SUMMARY')
    await press('Enter')
    assert.deepEqual(await evaluate('[...document.querySelectorAll("details[open] ol li")].map(e => e.textContent)'), [
      '기구에 앉아 허벅지 패드를 체형에 맞게 조절합니다.', '바를 잡고 가슴 방향으로 천천히 당깁니다.', '팔을 천천히 펴면서 시작 자세로 돌아옵니다.',
    ])
    await press('Enter')
    assert.doesNotMatch(await body(), /기구에 앉아/)
    await click('운동 목록으로 돌아가기', 'ariaLabel')
    assert.equal(await evaluate(`document.activeElement === document.querySelector('${list} button')`), true)
    assert.equal(await evaluate(`document.querySelector('${query}').value`), 'ＬＡＴ　PullDown')
    await set(query, 'HIGH ROW')
    assert.deepEqual(await names(), ['머신 하이 로우'])
    await click('머신 하이 로우', 'textContent', list + ' strong')
    assert.equal(await evaluate('document.activeElement.textContent'), '운동 상세')
    assert.match(await body(), /PULL.*후면.*조회 전용/s)
    assert.match(await body(), /능형근.*핵심.*중부승모근.*보조 자극 근육.*광배근.*후면삼각근.*상완이두근/s)
    assert.equal((await body()).match(/핵심/g).length, 1)
    assert.match(await body(), /GIF를 제공하지 않습니다/)
    assert.doesNotMatch(await body(), /약 30~45도/)
    await click('운동 자세 및 방법', 'textContent', 'summary')
    assert.equal(await evaluate('document.querySelectorAll("details[open] ol li").length'), 4)
    assert.match(await body(), /사용자 확인 기반 한국어 초안.*실제 상세 API 응답이 아닙니다/s)
    assert.match(await body(), /약 30~45도/)
    await verifyWidth(320); await verifyWidth(393)
    await click('운동 자세 및 방법', 'textContent', 'summary')
    assert.doesNotMatch(await body(), /약 30~45도/)
    await click('운동 목록으로 돌아가기', 'ariaLabel')
    assert.equal(await evaluate(`document.querySelector('${query}').value`), 'HIGH ROW')
    assert.equal(await evaluate(`document.querySelector('${group} [aria-pressed=true]').textContent`),'등')
    await click('어깨','textContent',group+' button')
    await set(query, '와이드 로우')
    assert.deepEqual(await names(), ['체스트 서포티드 와이드 그립 시티드 케이블 로우'])
    await click('등','textContent',group+' button')
    assert.equal((await names()).length, 1)
    await click('체스트 서포티드 와이드 그립 시티드 케이블 로우', 'textContent', list + ' strong')
    await verifyWidth(320); await verifyWidth(393)
    assert.match(await body(), /chest supported seated cable row/)
    assert.doesNotMatch(await body(), /PULL|전면|후면\s*조회 전용/)
    await click('운동 자세 및 방법', 'textContent', 'summary')
    assert.match(await body(), /등록된 운동 방법 정보가 없습니다/)
    await click('운동 목록으로 돌아가기', 'ariaLabel')
    await set(query, '')
    await click('유산소','textContent',group+' button')
    await click('걷기', 'textContent', list + ' strong')
    assert.match(await body(), /등록된 주요 자극 근육 정보가 없습니다.*등록된 보조 자극 근육 정보가 없습니다/s)
    await click('운동 목록으로 돌아가기', 'ariaLabel')
    await click('설정으로 돌아가기', 'ariaLabel')
    await wait(() => evaluate(`document.activeElement.matches('${settingsItem}')`), 'settings focus restored')
    assert.equal(await evaluate(`document.querySelector('${settingsPage}').hidden`), false)
    assert.equal(await evaluate('document.activeElement.querySelector("strong").textContent'), '운동 종목 보기')
    await send('Page.navigate', { url: origin + '/routine-preview?tab=history&record-loading=1' })
    await wait(() => evaluate('!!document.querySelector(".record-statistics-body .app-card[aria-busy=true]")'), 'first records shell')
    for (const width of [320, 375, 393, 430]) {
      await verifyWidth(width)
      assert.equal(await evaluate('!document.querySelector("[data-loading-skeleton=summary]") && !!document.querySelector(`[aria-label="운동 분석 메뉴"]`)'), true)
    }
    await wait(() => evaluate('!!document.querySelector(".record-statistics-body .app-card[aria-busy=false]")'), 'first record data')
    await evaluate('window.reviewRecordCards=document.querySelector(".record-statistics-body"); void 0')
    for (const tab of ['홈','루틴','설정']) {
      await navTo(tab); await activeTab(tab); await navTo('기록'); await activeTab('기록')
      assert.equal(await evaluate('document.querySelector(".record-statistics-body")===window.reviewRecordCards && !document.querySelector("[data-loading-skeleton=summary]")'), true)
    }
    await evaluate('history.back()'); await activeTab('설정')
    await evaluate('history.forward()'); await activeTab('기록')
    assert.equal(await evaluate('document.querySelector(".record-statistics-body")===window.reviewRecordCards'), true)
    await verifyWorkoutReview({ origin, send, evaluate, wait, click, set, body, verifyWidth, drag })
    await verifyExerciseSwipe({ origin, send, evaluate, wait, click, set, verifyWidth })
    await verifyWorkoutProcess({ origin, send, evaluate, wait, click, verifyWidth })
    assert.deepEqual(apiRequests, [])
    assert.deepEqual(errors, [])
    assert.equal(await evaluate('indexedDB.databases().then(dbs => dbs.length)'), 0)
    assert.equal((await fetch(origin + '/api/v1/weekly-schedule')).status, 404)
  } catch (error) {
    if (socket?.readyState === 1) {
      const pageText = await evaluate('document.body?.innerText ?? ""').catch(() => '')
      console.error(pageText.slice(0, 1200), errors, [...responses.values()].slice(-25))
    }
    throw error
  } finally {
    if (socket?.readyState === 1) { try { await send('Browser.close') } catch { /* browser exited */ } }
    if (browser?.exitCode === null) browser.kill()
    if (browser) await wait(() => browser.exitCode !== null || browser.signalCode !== null, 'browser exit')
    await vite?.close()
    assert.equal(dirname(profile), root)
    assert.match(basename(profile), /^browser-/)
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
