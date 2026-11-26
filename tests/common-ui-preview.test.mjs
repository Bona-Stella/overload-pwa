import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { createReviewFixtureServer } from './fixtures/review-server.mjs'
import { checkFront18Preview } from './fixtures/review/check-front18-preview.mjs'
import { checkControlFoundation } from './fixtures/review/check-control-foundation.mjs'
import { auditMessageDialog } from './fixtures/review/modal-audit.mjs'
import { auditRefreshMotion } from './fixtures/review/refresh-audit.mjs'

async function waitFor(check, label, timeout = 12000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const result = await check()
    if (result) return result
    await delay(40)
  }
  assert.fail('Timed out: ' + label)
}

test('independent common UI preview renders reusable controls and handles interaction', { timeout: 280000 }, async () => {
  const directory = resolve('logs/common-ui-preview')
  await mkdir(directory, { recursive: true })
  const profile = await mkdtemp(resolve(directory, 'browser-'))
  const requests = [], exceptions = [], pending = new Map()
  let vite, chrome, socket, lastId = 0

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++lastId
      pending.set(id, { resolve, reject })
      socket.send(JSON.stringify({ id, method, params }))
    })
  }
  async function evaluate(expression) {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    assert.ok(!response.exceptionDetails, response.exceptionDetails?.exception?.description)
    return response.result.value
  }
  async function click(label, selector = 'button') {
    await waitFor(() => evaluate(`(() => {
      const button = [...document.querySelectorAll(${JSON.stringify(selector)})].find(button => {
        const labelled = button.getAttribute('aria-labelledby')?.split(' ').map(id => document.getElementById(id)?.textContent ?? '').join(' ').trim()
        return !button.disabled && button.getClientRects().length && (button.ariaLabel || labelled || button.innerText.trim()) === ${JSON.stringify(label)}
      })
      if (!button) return false
      button.focus()
      button.click()
      return true
    })()`), label)
  }
  async function key(key, code, windowsVirtualKeyCode) {
    const event = { key, code, windowsVirtualKeyCode }
    await send('Input.dispatchKeyEvent', key === 'Enter'
      ? { ...event, type: 'keyDown', text: '\r' }
      : { ...event, type: 'rawKeyDown' })
    await send('Input.dispatchKeyEvent', { ...event, type: 'keyUp' })
  }
  async function capture(name, selector) {
    if (!process.env.OVERLOAD_CAPTURE_COMMON_UI) return
    if (selector) await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center'})`)
    await delay(200)
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(resolve(directory, name + '.png'), Buffer.from(data, 'base64'))
  }
  const fit = width => evaluate(`document.documentElement.scrollWidth <= ${width}`)
  const modalClosed = () => waitFor(() => evaluate("!document.querySelector('dialog[open]')"), 'dialog closed')
  const status = label => waitFor(() => evaluate(`[...document.querySelectorAll('[role="status"]')].some(e => e.textContent === ${JSON.stringify(label)})`), label)
  const settings = '[data-loading-example]'
  const layout = selector => evaluate(`(() => {
    const area = document.querySelector(${JSON.stringify(selector)})
    const markers = [...area.querySelectorAll('.app-card, ul, li, [class*="skeletonSlot"]')]
    return [area, ...markers, area.closest('section')?.nextElementSibling].filter(Boolean).map(element => {
      const { x, y, width, height } = element.getBoundingClientRect()
      return [x, y + scrollY, width, height]
    })
  })()`)
  const assertLogo = async () => {
    await waitFor(() => evaluate("document.querySelector('header img')?.naturalWidth === 3624"), '4x OVERLOAD image decoded')
    assert.equal(await evaluate(`(() => {
      const img = document.querySelector('header img'), header = img.closest('header')
      const box = img.getBoundingClientRect(), row = header.getBoundingClientRect()
      const title = header.querySelector('h1').getBoundingClientRect()
      return img.alt === 'OVERLOAD' && img.naturalHeight === 428 && !img.closest('a, button') &&
        Math.abs(box.width - Math.min(148, Math.max(112, innerWidth * .35))) < .02 &&
        Math.abs(box.width / box.height - 3624 / 428) < .02 &&
        Math.abs(box.right - row.right) < 1 && title.right < box.left &&
        Math.abs((box.top + box.bottom - row.top - row.bottom) / 2) < 1
    })()`), true, 'logo ratio, bounds and alignment')
  }
  const tags = '[data-routine-tag-list]'
  const search = '[aria-label="운동량 추이 검색 예시"]'
  const longTag = '상체 보조 · 어깨 안정화 운동'
  const measurements = {}
  const clickItem = (selector, title) => waitFor(() => evaluate(`(() => {
    const option = [...document.querySelectorAll(${JSON.stringify(selector + ' [role="option"]:not(:disabled)')})]
      .find(element => element.querySelector('strong')?.textContent === ${JSON.stringify(title)})
    if (!option) return false
    option.focus()
    option.click()
    return true
  })()`), title)

  try {
    const published = process.env.OVERLOAD_COMMON_UI_REVIEW_URL
    if (!published) { vite = await createReviewFixtureServer(); await vite.listen() }
    const url = published ?? ('http://127.0.0.1:' + vite.httpServer.address().port + '/common-ui-preview')
    chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
      '--headless', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
      '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
      '--disable-extensions', '--user-data-dir=' + profile, 'about:blank',
    ], { windowsHide: true, stdio: 'ignore' })
    const port = await waitFor(async () => {
      try { return Number((await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) }
      catch { return false }
    }, 'Chrome')
    const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json()
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
    socket.onmessage = event => {
      const message = JSON.parse(event.data), request = pending.get(message.id)
      if (request) {
        pending.delete(message.id)
        if (message.error) request.reject(Error(message.error.message))
        else request.resolve(message.result)
      }
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails)
      if (message.method === 'Network.requestWillBeSent' && /^\/(api|oauth2|__review(?:-media)?)(?:\/|$)/.test(new URL(message.params.request.url).pathname)) requests.push(message.params.request.url)
    }
    socket.onclose = () => {
      for (const request of pending.values()) request.reject(Error('Chrome closed'))
      pending.clear()
    }
    await send('Runtime.enable')
    await send('Network.enable')
    await send('Page.navigate', { url })
    await waitFor(() => evaluate("document.querySelector('h1')?.textContent === '공통 UI Preview'"), 'preview mounted')

    await send('Emulation.setDeviceMetricsOverride', { width:393,height:852,deviceScaleFactor:1,mobile:true })
    await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
    const tabBar='nav[aria-label="기본 탐색"]'
    const tabPoint = selector => evaluate(`(() => {
      const r=document.querySelector(${JSON.stringify(tabBar+' '+selector)}).getBoundingClientRect()
      return {x:r.x+r.width/2,y:r.y+r.height/2}
    })()`)
    const touchTab = async (x,y) => {
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    }
    await evaluate('scrollTo({top:document.scrollingElement.scrollHeight,behavior:"instant"})')
    await waitFor(()=>evaluate(`document.querySelector(${JSON.stringify(tabBar)}).dataset.collapsed==='true'`),'tabs collapse on scroll')
    await delay(385)
    const compact=await tabPoint('[aria-current="page"]')
    const point={x:compact.x+10,y:compact.y-5}
    await touchTab(point.x,point.y)
    await waitFor(()=>evaluate(`!!document.elementFromPoint(${point.x},${point.y})?.closest('button[data-tab]:not([aria-current])')`),'the same point reveals another action')
    await touchTab(point.x,point.y)
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(tabBar+' [aria-current="page"]')}).dataset.tab`),'settings')
    const homeTab=await tabPoint('[data-tab="home"]')
    assert.ok(Math.hypot(homeTab.x-point.x,homeTab.y-point.y)>24)
    await touchTab(homeTab.x,homeTab.y)
    await waitFor(()=>evaluate(`!!document.querySelector(${JSON.stringify(tabBar+' [data-tab="home"][aria-current="page"]')})`),'separate location can navigate')
    await click('설정',tabBar+' button')
    await evaluate('scrollTo({top:0,behavior:"instant"})')
    await send('Emulation.setTouchEmulationEnabled',{enabled:false})

    for (const width of [320, 375, 393, 430, 1280]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 852, deviceScaleFactor: 1, mobile: width < 500 })
      assert.equal(await fit(width), true)
      await click('미완료 운동 종료')
      assert.equal(await evaluate(`(() => {
        const modal = document.querySelector('dialog[open]')
        if (!modal) return false
        const box = modal.getBoundingClientRect()
        const actions = [...modal.querySelectorAll('button[data-size="modal"]')].map(b => b.getBoundingClientRect())
        const style = getComputedStyle(modal)
        const neutral = getComputedStyle(modal.querySelector('[data-appearance="contrast-outline"]'))
        const warning = getComputedStyle(modal.querySelector('[data-appearance="warning"]'))
        const description = modal.querySelector('[data-dialog-description]')
        const textStyle = getComputedStyle(description)
        const sentences = [...description.childNodes].filter(node => node.nodeType === Node.TEXT_NODE)
        const lines = sentences.map(node => {
          const range = document.createRange(); range.selectNode(node); return range.getClientRects().length
        })
        return innerWidth === ${width} && box.left >= 16 && box.right <= ${width - 16} && box.width <= 340 &&
          style.borderRadius === '5px' && style.borderColor === 'rgb(53, 57, 65)' && style.borderWidth === '1px' &&
          style.backgroundColor === 'rgb(27, 29, 34)' && modal.querySelector('[data-feedback-icon="warning"]') &&
          textStyle.textAlign === 'center' && textStyle.wordBreak === 'keep-all' && textStyle.fontSize === '14px' &&
          textStyle.color === 'rgb(169, 173, 183)' && sentences.map(node => node.textContent).join('|') === '미완료 종목이 있어요.|완료한 기록만 요약에 표시돼요.' &&
          lines.length === 2 && lines.every(count => count === 1) && description.scrollWidth <= description.clientWidth &&
          modal.querySelector('[data-appearance="warning"]').innerText === '운동 종료' &&
          neutral.borderWidth === '2px' && neutral.borderColor === 'rgb(240, 241, 244)' &&
          neutral.borderRadius === '999px' && warning.backgroundColor === 'rgb(214, 188, 101)' &&
          actions.length === 2 && actions.every(a => a.height === 48) && actions[0].width === actions[1].width
      })()`), true, 'modal geometry at ' + width)
      if (width === 393) await capture('393-confirm')
      await click('취소', 'dialog button')
      await modalClosed()
      if (width === 393) {
        await click('삭제 확인')
        await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
        assert.equal(await evaluate("getComputedStyle(document.querySelector('dialog [data-feedback-icon=destructive]')).color"), 'rgb(240, 100, 115)')
        assert.deepEqual(await evaluate(`[...document.querySelectorAll('dialog button[data-size="modal"]')].map(button => {
          const style = getComputedStyle(button)
          return [button.dataset.appearance, style.backgroundColor, style.borderColor, style.color]
        })`), [
          ['contrast-outline', 'rgba(0, 0, 0, 0)', 'rgb(240, 241, 244)', 'rgb(240, 241, 244)'],
          ['danger-primary', 'rgb(168, 49, 67)', 'rgb(168, 49, 67)', 'rgb(240, 241, 244)'],
        ])
        await capture('393-destructive')
        for (let index = 0; index < 3; index++) await key('Tab', 'Tab', 9)
        assert.deepEqual(await evaluate(`[
          document.activeElement.dataset.appearance,
          document.activeElement.matches(':focus-visible'),
          getComputedStyle(document.activeElement).outlineColor,
        ]`), ['danger-primary', true, 'rgb(240, 183, 191)'])
        const target = await evaluate(`(() => {
          const { x, y, width, height } = document.activeElement.getBoundingClientRect()
          return { x: x + width / 2, y: y + height / 2 }
        })()`)
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...target })
        await waitFor(() => evaluate(`(() => {
          const button = document.querySelector('dialog [data-appearance=danger-primary]')
          return button?.matches(':hover') && getComputedStyle(button).backgroundColor === 'rgb(180, 55, 74)'
        })()`), 'destructive action hover color')
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, ...target })
        await waitFor(() => evaluate(`(() => {
          const button = document.querySelector('dialog [data-appearance=danger-primary]')
          return button?.matches(':active') && getComputedStyle(button).backgroundColor === 'rgb(137, 38, 55)'
        })()`), 'destructive action active color')
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, x: 3, y: 3 })
        await send('Emulation.setEmulatedMedia', { features: [] })
        await click('닫기', 'dialog button')
        await modalClosed()
      }
    }

    await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true })
    const dialogs = []
    for (const [label, tone] of [
      ['일반 안내', 'info'], ['성공 모달 디자인 예시', 'success'], ['미완료 운동 종료', 'warning'],
      ['삭제 확인', 'destructive'], ['미저장 변경', 'destructive'], ['단일 안내', 'error'],
      ['저장 결과 미확인', 'recheck'], ['입력 저장 실패', 'critical'], ['저장 처리 중', 'info'],
    ]) {
      await click(label)
      dialogs.push(await auditMessageDialog({ send, evaluate }, `공통 UI / ${label}`, tone))
      if (label === '입력 저장 실패') await capture('modal-audit-common-recovery')
      await click('닫기', 'dialog .icon-button')
      await modalClosed()
    }
    await click('단일 안내')
    assert.equal(await evaluate(`(() => {
      const modal = document.querySelector('dialog[open]')
      return document.getElementById(modal.getAttribute('aria-describedby')).textContent === '잠시 후 다시 시도해 주세요.' &&
        document.activeElement.id === modal.getAttribute('aria-labelledby') &&
        getComputedStyle(document.documentElement).overflowY === 'hidden' &&
        modal.querySelectorAll('button[data-size="modal"]').length === 1 &&
        getComputedStyle(modal.querySelector('[data-feedback-icon=error]')).color === 'rgb(240, 100, 115)' &&
        getComputedStyle(modal.querySelector('[data-appearance=contrast-outline]')).backgroundColor === 'rgba(0, 0, 0, 0)'
    })()`), true)
    await capture('393-alert')
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 3, y: 20, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 3, y: 20, button: 'left', clickCount: 1 })
    assert.equal(await evaluate("!!document.querySelector('dialog[open]')"), true)
    await key('Tab', 'Tab', 9)
    assert.equal(await evaluate("document.activeElement.ariaLabel"), '닫기')
    await key('Escape', 'Escape', 27)
    await modalClosed()
    assert.equal(await evaluate('document.activeElement.innerText'), '단일 안내')
    await click('미저장 변경')
    await waitFor(() => evaluate('!!history.state?.overloadNavigation?.values?.__dialog'), 'history layer')
    await evaluate('history.back()')
    await modalClosed()
    await click('단일 안내')
    await click('확인', 'dialog button')
    await modalClosed()
    await click('성공 모달 디자인 예시')
    assert.equal(await evaluate("getComputedStyle(document.querySelector('dialog [data-feedback-icon=check]')).color"), 'rgb(116, 166, 138)')
    assert.equal(await evaluate("getComputedStyle(document.querySelector('dialog [data-appearance=contrast-outline]')).borderWidth"), '2px')
    await click('확인', 'dialog button')
    await modalClosed()
    await click('저장 결과 미확인')
    assert.deepEqual(await evaluate(`(() => {
      const dialog = document.querySelector('dialog[open]'), primary = dialog.querySelector('[data-appearance=primary]');
      const icon = getComputedStyle(dialog.querySelector('[data-feedback-icon=syncing]'));
      return [dialog.dataset.messageTone, icon.color, icon.animationName, getComputedStyle(primary).backgroundColor, primary.innerText,
        getComputedStyle(dialog.querySelector('[data-appearance=contrast-outline]')).borderWidth];
    })()`), ['recheck', 'rgb(108, 147, 198)', 'none', 'rgb(108, 147, 198)', '다시 확인', '2px'])
    await click('닫기', 'dialog button[data-appearance=contrast-outline]')
    await modalClosed()
    await click('입력 저장 실패')
    assert.equal(await evaluate("getComputedStyle(document.querySelector('dialog [data-feedback-icon=critical]')).color"), 'rgb(240, 100, 115)')
    assert.deepEqual(dialogs.find(({ use }) => use.endsWith('입력 저장 실패')).samples[2].actions.map(action =>
      [action.label, action.background, action.border, action.disabled]), [
      ['닫기', 'rgba(0, 0, 0, 0)', '2px', false], ['다시 저장', 'rgb(240, 241, 244)', '1px', false],
    ])
    await click('닫기', 'dialog button')
    await modalClosed()
    await click('미완료 운동 종료')
    await click('운동 종료', 'dialog button')
    await modalClosed()
    await status('확인 동작이 실행됐어요.')
    await click('알림 닫기')

    await click('삭제 확인')
    const deleteStyle = await evaluate(`(() => {
      const button = document.querySelector('dialog button[data-appearance="danger-primary"]')
      return [getComputedStyle(button).backgroundColor, button.getBoundingClientRect().toJSON()]
    })()`)
    await click('삭제', 'dialog button')
    const deleteButton = `(() => {
      const button = document.querySelector('dialog button[aria-busy="true"]')
      button.click()
      return { disabled:button.disabled, label:button.innerText, opacity:getComputedStyle(button).opacity, spinner:!!button.querySelector('[data-button-spinner]'),
        style:[getComputedStyle(button).backgroundColor, button.getBoundingClientRect().toJSON()] }
    })()`
    assert.deepEqual(await evaluate(deleteButton), { disabled:true, label:'삭제', opacity:'1', spinner:false, style:deleteStyle })
    await waitFor(() => evaluate("!!document.querySelector('dialog button [data-button-spinner]')"), 'delayed delete spinner')
    assert.deepEqual(await evaluate(deleteButton), { disabled:true, label:'삭제 중', opacity:'1', spinner:true, style:deleteStyle })
    await modalClosed()
    await status('삭제 동작이 완료됐어요.')
    await click('알림 닫기')

    await click('저장 처리 중')
    await click('저장', 'dialog button')
    assert.equal(await evaluate("document.querySelector('dialog button[aria-busy=true]').disabled"), true)
    assert.equal(await evaluate("document.querySelector('dialog button[aria-busy=true]').innerText"), '저장')
    assert.equal(await evaluate("document.querySelector('dialog [aria-label=닫기]').disabled && !!document.querySelector('dialog [data-feedback-icon=syncing]')"), true)
    await key('Escape', 'Escape', 27)
    assert.equal(await evaluate("!!document.querySelector('dialog[open]')"), true)
    await waitFor(() => evaluate("!!document.querySelector('dialog button [data-button-spinner]')"), 'delayed save spinner')
    assert.equal(await evaluate("document.querySelector('dialog button[aria-busy=true]').innerText"), '저장 중')
    await modalClosed()
    await status('변경 사항이 저장됐어요.')
    await click('안내')
    assert.equal(await evaluate("!!document.querySelector('[data-tone=info] [data-feedback-icon=info]')"), true)
    await click('경고')
    assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-tone=warning] [data-feedback-icon=warning]')).color"), 'rgb(214, 188, 101)')
    await click('오류')
    assert.equal(await evaluate('document.querySelector(\'[role="alert"]\').textContent'), '저장하지 못했어요.')
    assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-tone=error] [data-feedback-icon=error]')).color"), 'rgb(240, 183, 191)')
    assert.equal(await evaluate("document.querySelectorAll('[data-tone]').length"), 1)
    assert.equal(await evaluate(`(() => {
      const toast = document.querySelector('[data-tone]')
      const nav = document.querySelector('nav[aria-label="기본 탐색"]')
      return toast.getBoundingClientRect().bottom <= nav.getBoundingClientRect().top - 7
    })()`), true)
    await capture('393-toast')
    await click('성공')
    await status('변경 사항이 저장됐어요.')
    assert.equal(await evaluate("!!document.querySelector('[data-tone=success] [data-feedback-icon=check]')"), true)
    await waitFor(() => evaluate("!document.querySelector('[data-tone]')"), 'toast expires', 6500)

    await click('버튼 예시')
    assert.equal(await evaluate("document.querySelector('button[data-size=regular]:disabled').innerText"), '변경 사항 저장')
    assert.equal(await evaluate(`(() => {
      const button = document.querySelector('button[data-appearance="danger-primary"]:disabled')
      if (!button) return false
      button.click()
      return !document.querySelector('dialog[open]') && getComputedStyle(button).backgroundColor === 'rgb(48, 33, 39)'
    })()`), true)
    await capture('393-buttons', 'button[data-size=regular]')
    await click('변경 사항 저장', 'button[data-size=regular]')
    assert.equal(await evaluate("document.querySelector('button[aria-busy=true]').disabled"), true)
    await waitFor(() => evaluate("!!document.querySelector('button [data-button-spinner]')"), 'delayed common spinner')
    await capture('393-loading-button', 'button[aria-busy=true]')
    await waitFor(() => evaluate("!document.querySelector('button[aria-busy=true]')"), 'save completed')
    await click('알림 닫기')
    await click('버튼 예시')

    await click('스켈레톤 표시')
    assert.equal(await evaluate("document.querySelector('[aria-busy=true] > div').getAttribute('aria-hidden')"), 'true')
    assert.equal(await evaluate(`!!document.querySelector('nav[aria-label="기본 탐색"]')`), true)
    await capture('393-skeleton', settings)
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-shape]')).animationName"), 'none')
    assert.equal(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"), true)
    await click('안내')
    assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-tone]')).animationName"), 'none')
    await click('알림 닫기')
    await click('콘텐츠 표시')
    assert.equal(await evaluate("!document.querySelector('[data-shape]') && document.body.innerText.includes('Google')"), true)
    await capture('393-skeleton-loaded', settings)
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })

    await click('검증 예시')
    assert.equal(await evaluate("document.querySelector('form input').hasAttribute('aria-invalid')"), false)
    await click('변경 사항 저장', 'form button')
    assert.equal(await evaluate(`(() => {
      const input = document.querySelector('form input')
      return input === document.activeElement && input.getAttribute('aria-invalid') === 'true' &&
        document.getElementById(input.getAttribute('aria-describedby')).textContent === '루틴 이름을 입력해 주세요.'
    })()`), true)
    assert.deepEqual(await evaluate(`(() => {
      const style = getComputedStyle(document.activeElement)
      return [style.borderColor, style.outlineColor, style.outlineOffset]
    })()`), ['rgb(177, 123, 131)', 'rgb(177, 123, 131)', '-2px'], 'invalid input keeps one error-colored focus indicator')
    await capture('393-field-error', 'form')
    await send('Input.insertText', { text: '나의 루틴' })
    assert.equal(await evaluate("document.querySelector('form input').hasAttribute('aria-invalid')"), false)
    await click('변경 사항 저장', 'form button')
    await status('변경 사항이 저장됐어요.')
    await click('알림 닫기')

    for (const [trigger, title] of [['루틴 없음', '등록된 루틴이 없어요'], ['기록 없음', '아직 운동 기록이 없어요'], ['검색 결과 없음', '검색 결과가 없어요']]) {
      await click(trigger)
      assert.equal(await evaluate(`(() => {
        const heading = [...document.querySelectorAll('h2')].find(e => e.textContent === ${JSON.stringify(title)})
        return !!heading && !heading.parentElement.querySelector('button, a')
      })()`), true)
    }
    await capture('393-empty', '[class*="_empty_"]')

    const refreshExample = '[aria-label="조회 실패·새로고침 예시"]'
    const refreshAction = refreshExample + ' [data-refresh]'
    const commonMotion = {}
    for (const scenario of ['조회 실패', '응답 시간 초과']) {
      await click(scenario, refreshExample + ' button')
      await evaluate(`(() => { const button = document.querySelector(${JSON.stringify(refreshAction)}); button.click(); button.click() })()`)
      await waitFor(() => evaluate(`document.querySelector(${JSON.stringify(refreshAction)}).disabled`), scenario)
      commonMotion[scenario] = await auditRefreshMotion(evaluate, refreshAction)
      await waitFor(() => evaluate(`[...document.querySelectorAll('[role="alert"]')].some(element => element.textContent === '연결할 수 없어요. 다시 시도해 주세요.')`), scenario + ' alert')
      assert.equal(await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(refreshAction + ' svg')})).animationName`), 'none')
      await click('알림 닫기')
    }
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    await click('새로고침', refreshAction)
    commonMotion['실패 후 재시도 · 움직임 줄이기'] = await auditRefreshMotion(evaluate, refreshAction, true)
    await waitFor(() => evaluate(`document.querySelector(${JSON.stringify(refreshExample)}).innerText.includes('운동 기록을 불러왔어요.')`), 'recovered read')
    assert.equal(await evaluate(`!!document.querySelector(${JSON.stringify(refreshAction)})`), false)
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
    if (process.env.OVERLOAD_CAPTURE_COMMON_UI) await writeFile(resolve(directory, 'front18-common-refresh-motion.json'), JSON.stringify(commonMotion, null, 2))

    await click('기본 서브페이지 헤더 보기')
    assert.equal(await evaluate("document.querySelector('header h1')?.textContent"), '계정 설정')
    await assertLogo()
    assert.equal(await evaluate("document.querySelector('header').getBoundingClientRect().height"), 44)
    await capture('393-header-logo', 'header')
    await click('우측 액션형')
    assert.equal(await evaluate("!!document.querySelector('header img')"), false)
    assert.deepEqual(await evaluate(`(() => {
      const style = getComputedStyle(document.querySelector('header button[data-appearance=secondary]'));
      return [style.borderColor, style.borderWidth, style.borderRadius, style.minHeight, style.backgroundColor];
    })()`), ['rgb(53, 57, 65)', '1px', '999px', '36px', 'rgb(37, 40, 46)'])
    await click('편집', 'header button')
    await click('취소', 'header button')
    await capture('393-header', 'header')
    await click('헤더 예시 닫기')
    assert.equal(await evaluate('document.activeElement.innerText'), '우측 액션형')

    await click('상태 표시 예시')
    assert.equal(await evaluate("document.querySelectorAll('[data-kind]').length"), 7)
    assert.equal(await evaluate("document.querySelector('[data-kind=recommendation]').getBoundingClientRect().height"), 22)
    await capture('393-status', '[data-kind=activity]')
    await click('증량 가능')
    assert.match(await evaluate("document.querySelector('dialog[open]').innerText"), /목표 반복을 달성한 검토용 예시/)
    await click('확인', 'dialog button')
    await modalClosed()
    await click('오프라인')
    assert.match(await evaluate("document.querySelector('[data-state=offline]').textContent"), /인터넷 연결이 끊겼어요/)
    await capture('393-offline', '[data-state=offline]')
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
    await click('동기화 중')
    assert.match(await evaluate("document.querySelector('[data-state=syncing]').textContent"), /운동 기록을 동기화하는 중/)
    assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-state=syncing] [data-feedback-icon=syncing]')).animationName !== 'none'"), true)
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    assert.equal(await evaluate("getComputedStyle(document.querySelector('[data-state=syncing] [data-feedback-icon=syncing]')).animationName"), 'none')
    assert.equal(await evaluate("document.querySelector('[data-feedback-icon=upload]').getAttribute('width')"), '20')
    await send('Emulation.setEmulatedMedia', { features: [] })
    await click('정상')
    assert.equal(await evaluate("!document.querySelector('[data-state=offline], [data-state=syncing]')"), true)
    assert.match(await evaluate('document.querySelector("main").innerText'), /최근 운동 기록/)

    assert.deepEqual(await evaluate(`[...document.querySelectorAll('section[aria-label="목록 UI"] button')].map(b => b.innerText)`),
      ['검색 태그 UI', '루틴 태그 선택 목록'])
    await click('검색 태그 UI')
    assert.equal(await evaluate(`document.querySelector('${search} input').value`), '')
    assert.equal(await evaluate(`document.querySelector('${search} [role="group"] [aria-pressed="true"]').innerText`), '전체')
    await capture('393-search-tags', search)
    await click('검색 범위: 운동별', search + ' button')
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${search} [role="option"]')].map(e => e.innerText)`), ['전체', '운동별', '분류별', '근육별'])
    await capture('393-search-scope', search)
    await key('ArrowDown', 'ArrowDown', 40)
    await key('Enter', 'Enter', 13)
    assert.equal(await evaluate(`document.querySelector('${search} [aria-haspopup="listbox"]').ariaLabel`), '검색 범위: 분류별')
    await click('검색 범위: 분류별', search + ' button')
    await key('ArrowUp', 'ArrowUp', 38)
    await key('Enter', 'Enter', 13)
    await click('등', search + ' [role="group"] button')
    assert.equal(await evaluate(`document.querySelector('${search} [role="group"] [aria-pressed="true"]').innerText`), '등')
    assert.equal(await evaluate(`document.querySelector('${search} li strong').innerText`), '랫 풀다운')
    await click(longTag, search + ' [role="group"] button')
    assert.equal(await evaluate(`document.querySelector('${search} [role="group"] [aria-pressed="true"]').innerText`), longTag)
    await capture('393-search-long-tag', search)
    await evaluate(`document.querySelector('${search} input').focus()`)
    assert.deepEqual(await evaluate(`(() => {
      const style = getComputedStyle(document.activeElement)
      return [style.outlineColor, style.outlineStyle, style.outlineOffset]
    })()`), ['rgb(108, 147, 198)', 'solid', '-2px'], 'the searchable text field uses the shared field focus style')
    await send('Input.insertText', { text: '페이스' })
    assert.equal(await evaluate(`document.querySelector('${search} input').value`), '페이스')
    assert.equal(await evaluate(`document.querySelector('${search} li strong').innerText`), '페이스 풀')
    await click('검색어 지우기', search + ' button')
    assert.equal(await evaluate(`document.querySelector('${search} input').value`), '')

    await click('루틴 태그 선택 목록')
    await clickItem(tags, 'PUSH')
    assert.equal(await evaluate(`document.querySelector('${tags} [aria-selected="true"] strong').textContent`), 'PUSH')
    await key('End', 'End', 35)
    assert.equal(await evaluate('document.activeElement.querySelector("strong").textContent'), 'LEGS', 'keyboard skips disabled CARDIO')
    await key('Enter', 'Enter', 13)
    assert.equal(await evaluate(`document.querySelector('${tags} [aria-selected="true"] strong').textContent`), 'LEGS')
    await key('Escape', 'Escape', 27)
    assert.equal(await evaluate('document.activeElement.innerText'), '루틴 태그 선택 목록')
    await click('루틴 태그 선택 목록')
    assert.equal(await evaluate(`document.querySelector('${tags} [aria-selected="true"] strong').textContent`), 'LEGS')
    await clickItem(tags, '미지정')

    await click('긴 제목')
    for (const width of [320, 375, 393, 430, 1280]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 852, deviceScaleFactor: 1, mobile: width < 500 })
      await assertLogo()
      if (width === 320) await capture('320-header-long', 'header')
      await click('콘텐츠 표시')
      const loaded = await layout(settings)
      await click('스켈레톤 표시')
      assert.deepEqual(await layout(settings), loaded, 'account card, row, text and following content geometry at ' + width)
      await click('콘텐츠 표시')
      await click('검색 태그 UI')
      await click(longTag, search + ' [role="group"] button')
      assert.equal(await evaluate(`(() => {
        const strip = document.querySelector('${search} [role="group"]')
        const chip = strip.querySelector('[aria-pressed="true"]')
        return strip.scrollWidth > strip.clientWidth && strip.scrollLeft > 0 &&
          chip.innerText === ${JSON.stringify(longTag)} && chip.clientWidth <= strip.clientWidth
      })()`), true, 'long chip scrolls inside the filter strip at ' + width)
      assert.equal(await fit(width), true, 'search fits ' + width)
      await click('루틴 태그 선택 목록')
      const ready = await layout(tags)
      if (width === 393) await capture('393-routine-tags', tags)
      await click('목록 스켈레톤')
      assert.deepEqual(await layout(tags), ready, 'routine tag geometry at ' + width)
      assert.equal(await evaluate(`!!document.querySelector('${tags} [aria-busy="true"] [inert]')`), true)
      if (width === 393) await capture('393-routine-tags-skeleton', tags)
      measurements[width] = { content: loaded, routineTags: ready }
      await click('빈 목록')
      assert.match(await evaluate(`document.querySelector('${tags}').innerText`), /선택할 루틴 태그가 없어요/)
      await click('목록 표시')
      assert.equal(await fit(width), true, 'expanded examples fit ' + width)
    }
    if (process.env.OVERLOAD_CAPTURE_COMMON_UI) await writeFile(resolve(directory, 'layout-measurements.json'), JSON.stringify(measurements, null, 2))
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
    await send('Page.navigate', { url: url + '?front18=1' })
    const front18 = await checkFront18Preview({ click, evaluate, send, waitFor, modalClosed, capture, dialogs })
    if (process.env.OVERLOAD_CAPTURE_COMMON_UI) {
      await writeFile(resolve(directory, 'front18-measurements.json'), JSON.stringify(front18, null, 2))
      await writeFile(resolve(directory, 'front18-modal-audit.json'), JSON.stringify(dialogs, null, 2))
    }
    await send('Page.navigate', { url: url + '?controls=1' })
    await waitFor(() => evaluate('!!document.querySelector("[data-control-example=weights]")'), 'control foundation mounted')
    const controlFoundation = await checkControlFoundation({ click, evaluate, send, waitFor, modalClosed, capture })
    if (process.env.OVERLOAD_CAPTURE_COMMON_UI) await writeFile(resolve(directory, 'control-foundation.json'), JSON.stringify(controlFoundation, null, 2))
    assert.deepEqual(requests, [])
    assert.deepEqual(exceptions, [])
    assert.equal(await evaluate('indexedDB.databases().then(dbs => dbs.length)'), 0)
  } finally {
    if (socket?.readyState === 1) await send('Browser.close').catch(() => {})
    if (chrome?.exitCode === null) chrome.kill()
    if (chrome) await waitFor(() => chrome.exitCode !== null || chrome.signalCode !== null, 'browser exit')
    await vite?.close()
    assert.equal(dirname(profile), directory)
    assert.match(basename(profile), /^browser-/)
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
