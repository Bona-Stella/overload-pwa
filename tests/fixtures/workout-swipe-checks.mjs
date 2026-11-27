import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'

export async function verifyExerciseSwipe({ origin, send, evaluate, wait, click, set, verifyWidth }) {
  const slide = '[data-exercise-swipe]'
  const track = '[data-swipe-track]'
  const current = '[data-swipe-current]'
  const move = (type, x, y) => send('Input.dispatchTouchEvent', {
    type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }],
  })
  const position = () => evaluate('document.querySelector(\'[aria-label="운동 시간"]\').children[1].querySelector("strong").textContent')
  const show = async (number, name, total = 3) => {
    await wait(async () => (await position()) === `현재 ${number} / ${total}종목`, name)
    assert.match(await evaluate(`document.querySelector('${current} h1').textContent`), new RegExp(name))
  }
  const offset = () => evaluate(`parseFloat(document.querySelector('${track}').style.getPropertyValue('--exercise-swipe-offset') || '0')`)
  const settle = () => wait(async () => await offset() === 0 &&
    await evaluate(`!document.querySelector('${slide}').hasAttribute('data-swiping')`), 'exercise swipe settled')
  const point = (distance = 0) => evaluate(`(() => {
    const title = document.querySelector('${current} h1').getBoundingClientRect()
    const panel = document.querySelector('${slide}').getBoundingClientRect()
    const header = document.querySelector('[data-keyboard-header]').getBoundingClientRect()
    const top = Math.ceil(Math.max(panel.top, header.bottom))
    const contentPoint = (x, y) => {
      const el = document.elementFromPoint(x, y)
      return el?.closest('${current}') && !el.closest('button,input,textarea,label,a,select,summary,[role=button]')
    }
    const center = Math.round(panel.left + panel.width / 2)
    const titleY = Math.round(title.top + 10)
    if (title.top >= top && titleY < innerHeight && contentPoint(center, titleY)) return { x: center, y: titleY, width: panel.width }
    const fractions = ${distance} < 0 ? [0.42, 0.65, 0.8, 0.5, 0.93] : [0.35, 0.2, 0.5, 0.1]
    const footer = document.querySelector('[data-workout-frame] > footer')?.getBoundingClientRect()
    for (let y = top + 22; y < Math.min(panel.bottom, footer?.top ?? innerHeight) - 18; y += 8) {
      for (const fraction of fractions) {
        const x = Math.round(panel.left + panel.width * fraction)
        const clear = [[0, 0], [-18, 0], [18, 0], [0, -18], [0, 18]].every(([dx, dy]) => contentPoint(x + dx, y + dy))
        if (clear && x + ${distance} > 0 && x + ${distance} < innerWidth) return { x, y, width: panel.width }
      }
    }
    throw Error('No visible exercise content for drag')
  })()`)
  const drag = async (distance, { from, yDistance = 0, end = 'touchEnd', pause = 130, during, landingOffset } = {}) => {
    if (!from) await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    const { x, y } = from ?? await point(distance)
    await move('touchStart', x, y)
    await move('touchMove', x + distance, y + yDistance)
    if (during) {
      await wait(async () => await offset() === distance, 'page follows the finger at full width')
      await during()
    }
    if (pause) await delay(pause)
    await move(end)
    if (landingOffset !== undefined) {
      await wait(async () => await offset() === landingOffset, 'transition lands one page width plus 24px away')
    }
    await settle()
  }
  const historyEntry = () => evaluate('JSON.stringify([history.length, history.state])')
  const memo = '[data-workout-memo]'
  const fixedLeft = () => evaluate(`[...document.querySelectorAll('[data-keyboard-header], [data-workout-frame] > footer')].map(e => e.getBoundingClientRect().left)`)
  const scroll = () => evaluate('window.scrollY')
  const verifyScroll = before => wait(() => evaluate(`(() => {
    const page = document.scrollingElement
    return Math.abs(window.scrollY - Math.min(${before}, page.scrollHeight - page.clientHeight)) <= 1
  })()`), 'exercise switch retains the scroll position or clamps to the new maximum')
  const signature = selector => evaluate(`(() => {
    const pane = document.querySelector(${JSON.stringify(selector)}), rect = pane.getBoundingClientRect()
    return { text: pane.textContent.replace(/\\s+/g, ' ').trim(), width: rect.width, height: rect.height,
      layout: [...pane.querySelectorAll('h1, h2, .app-card')].map(node => {
        const box = node.getBoundingClientRect()
        return [box.width, box.height, Math.round(box.top - rect.top), getComputedStyle(node).fontSize]
      }),
      fields: [...pane.querySelectorAll('input, textarea')].map(field => [field.value, field.placeholder]),
    }
  })()`)
  const pageGeometry = direction => evaluate(`(() => {
    const viewport = document.querySelector('${slide}')
    const current = document.querySelector('${track}')
    const bounds = current.getBoundingClientRect(), preview = current.querySelector('[data-swipe-preview="${direction}"]')?.getBoundingClientRect()
    return {
      width: bounds.width, cardWidth: current.querySelector('[data-swipe-current] [aria-label="진행 중량"]').getBoundingClientRect().width,
      offset: bounds.left - viewport.getBoundingClientRect().left,
      previewWidth: preview?.width,
      gap: preview && ('${direction}' === 'next' ? preview.left - bounds.right : bounds.left - preview.right),
      background: getComputedStyle(viewport).backgroundColor,
    }
  })()`)

  try {
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
    await send('Page.navigate', { url: origin + '/rest-audio-preview?swipe=1' })
    await click('준비운동 완료')
    await show(1, '벤치 프레스')
    const start = await historyEntry()
    for (const width of [320, 375, 393, 430]) {
      await verifyWidth(width)
      const fullWidth = await evaluate(`document.querySelector('${slide}').clientWidth`)
      const distance = Math.ceil(fullWidth * 0.35) + 1
      const moveOnePage = async (direction, sign) => {
        const before = await pageGeometry(direction)
        const y = await scroll()
        let destination
        await drag(sign * distance, { landingOffset: sign * (fullWidth + 24), during: async () => {
          const moving = await pageGeometry(direction)
          assert.equal(moving.width, before.width)
          assert.equal(moving.cardWidth, before.cardWidth)
          assert.ok(Math.abs(moving.previewWidth - before.width) < 0.5)
          assert.ok(Math.abs(moving.gap - 24) < 0.5, 'the pages have a 24px gap during the drag')
          assert.equal(moving.background, 'rgb(17, 18, 22)')
          assert.equal(await scroll(), y)
          destination = await signature('[data-swipe-preview]')
        } })
        const after = await pageGeometry(direction)
        assert.equal(after.width, before.width)
        assert.equal(after.cardWidth, before.cardWidth)
        assert.ok(Math.abs(after.offset) < 0.5, 'the new page aligns with the viewport')
        assert.deepEqual(await signature(current), destination, 'preview and settled editor show identical content and geometry')
        await verifyScroll(y)
      }
      await moveOnePage('next', -1)
      await show(2, '바벨 스쿼트')
      await moveOnePage('previous', 1)
      await show(1, '벤치 프레스')
    }

    await evaluate('window.scrollBy(0, 55)')
    const scrollBeforeDrag = await evaluate('window.scrollY')
    const { x, y } = await point()
    const ends = await fixedLeft()
    await move('touchStart', x, y)
    await move('touchMove', x - 32, y)
    await wait(async () => await offset() === -32, 'content follows the finger')
    assert.equal(await evaluate('window.scrollY'), scrollBeforeDrag)
    assert.deepEqual(await fixedLeft(), ends)
    assert.equal(await evaluate(`document.querySelector('${slide}').dataset.swiping`), 'next')
    assert.equal(await evaluate(`document.querySelector('[data-swipe-preview="next"]').inert`), true)
    assert.equal(await evaluate(`document.querySelector('[data-swipe-preview] textarea').readOnly`), true)
    await evaluate(`document.querySelector('[data-swipe-preview] button[aria-label="1세트 이번 반복 횟수"]').click()`)
    assert.equal(await evaluate('!!document.querySelector("dialog[open]")'), false)
    assert.ok(await evaluate(`Math.abs(document.querySelector('${track}').getBoundingClientRect().left - document.querySelector('${slide}').getBoundingClientRect().left + 32) < 1`))
    await show(1, '벤치 프레스')
    await move('touchMove', x - 69, y)
    await wait(async () => await offset() === -69, 'larger drag distance')
    await delay(150)
    assert.equal(await offset(), -69)
    await move('touchMove', x - 20, y)
    await wait(async () => await offset() === -20, 'drag direction reverses')
    await delay(130)
    await move('touchEnd')
    await settle()
    await show(1, '벤치 프레스')
    assert.ok(Math.abs((await pageGeometry('next')).offset) < 0.5, 'cancel returns to the original alignment')
    assert.equal(await evaluate('window.scrollY'), scrollBeforeDrag, 'cancel preserves the scrolled position')
    await drag(155)
    await show(1, '벤치 프레스')
    await drag(-160, { end: 'touchCancel' })
    await show(1, '벤치 프레스')

    await drag(-50, { pause: 0 })
    await show(2, '바벨 스쿼트')
    const edge = await point()
    await drag(150, { from: { x: 20, y: edge.y } })
    await show(2, '바벨 스쿼트')
    await drag(-150, { from: { x: 410, y: edge.y } })
    await show(2, '바벨 스쿼트')
    const beforeCardio = await scroll()
    let cardioPreview
    await drag(-176, { during: async () => { cardioPreview = await signature('[data-swipe-preview]') } })
    await show(3, '러닝머신')
    assert.deepEqual(await signature(current), cardioPreview)
    await verifyScroll(beforeCardio)
    await drag(-175)
    await show(3, '러닝머신')
    assert.equal(await historyEntry(), start, 'exercise gestures leave browser History intact')

    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
    await drag(174)
    await show(2, '바벨 스쿼트')
    await send('Emulation.setEmulatedMedia', { features: [] })
    await click('이전 운동 · 벤치 프레스', 'ariaLabel')
    await show(1, '벤치 프레스')

    await set(memo, '의자 높이 3')
    await evaluate(`document.querySelector('${memo}').focus({preventScroll:true})`)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('${memo}')).fontSize`), '16px')
    assert.equal(await evaluate('!!document.querySelector("[data-workout-frame] > footer").getClientRects().length'), false)
    await drag(-172)
    await show(1, '벤치 프레스')
    await evaluate(`document.querySelector('${memo}').blur(); window.scrollTo(0, 0)`)
    await wait(() => evaluate('!!document.querySelector("[data-workout-frame] > footer").getClientRects().length'), 'footer returns after memo blur')

    await drag(0, { yDistance: -120 })
    await wait(() => evaluate('scrollY > 0'), 'vertical drag still scrolls')
    await show(1, '벤치 프레스')
    await evaluate('window.scrollTo(0, 0)')
    const behindDialog = await point()
    await click('중량 변경')
    await wait(() => evaluate('!!document.querySelector("dialog[open]")'), 'weight dialog')
    await drag(-172, { from: behindDialog })
    await show(1, '벤치 프레스')
    assert.equal(await evaluate('!!document.querySelector("dialog[open]")'), true)
    await click('닫기', 'ariaLabel', 'dialog[open] button')
    await wait(() => evaluate('!document.querySelector("dialog[open]")'), 'dialog closed')

    await click('운동 시작하기', 'textContent', '[data-workout-frame] footer button')
    await click('기구 세팅 메모', 'textContent', '[data-swipe-current] button[aria-expanded]')
    await click('1세트 완료', 'textContent', '[data-workout-frame] footer button')
    await wait(() => evaluate('document.querySelector("[data-keyboard-header]").textContent.includes("휴식 시간")'), 'rest timer starts')
    await evaluate('window.scrollTo(0, 0)')
    const rest = () => evaluate('document.querySelector("[data-keyboard-header] [data-time]")?.textContent')
    const before = await rest()
    await drag(-173)
    await show(2, '바벨 스쿼트')
    assert.equal(await evaluate('document.querySelector("[data-keyboard-header] [aria-label=\'운동 시간\'] > div:last-child small").textContent'), '종목 준비')
    assert.match(await rest(), /^\d{2}:\d{2}:\d{2}$/, 'the unstarted exercise displays preparation time independently of the former rest')
    await drag(173)
    await show(1, '벤치 프레스')
    assert.equal(await evaluate(`document.querySelector('${memo}').value`), '의자 높이 3')
    assert.equal(await evaluate(`!!document.querySelector('[aria-label="1세트 완료 취소"]')`), true)
    assert.ok(await rest() <= before)
    await click('휴식 종료')
    await wait(() => evaluate('document.querySelector("[data-keyboard-header]").textContent.includes("WEIGHT 수행")'), 'existing end-rest action resumes weight time')

    // The signed-in workout uses this same frame without the diagnostic banner.
    await evaluate("document.querySelector('.demo-banner').style.display = 'none'")
    for (const width of [320, 375, 393, 430]) {
      await verifyWidth(width)
      const buttonScroll = await scroll()
      await click('다음 운동 · 바벨 스쿼트', 'ariaLabel')
      await show(2, '바벨 스쿼트')
      await verifyScroll(buttonScroll)
      const distance = Math.ceil((await point()).width * 0.42)
      await evaluate('window.scrollBy(0, 50)')
      assert.ok(await evaluate('window.scrollY') >= 49, 'the new transition starts below the workout header')
      const swipeScroll = await scroll()
      await drag(distance)
      await show(1, '벤치 프레스')
      await verifyScroll(swipeScroll)
    }

    await send('Page.navigate', { url: origin + '/rest-audio-preview?swipe=1&matrix=1' })
    await click('준비운동 완료')
    await show(1, '벤치 프레스', 4)
    const transition = async (sign, number, title) => {
      const y = await scroll()
      const distance = Math.ceil((await point()).width * 0.42) * sign
      let destination
      await drag(distance, { during: async () => {
        assert.equal(await scroll(), y)
        destination = await signature('[data-swipe-preview]')
      } })
      await show(number, title, 4)
      await verifyScroll(y)
      assert.deepEqual(await signature(current), destination)
      assert.equal(await evaluate('document.querySelectorAll("[data-swipe-preview]").length'), 0)
    }
    await evaluate('window.scrollTo(0, document.scrollingElement.scrollHeight)')
    const longExerciseBottom = await scroll()
    await transition(-1, 2, '바벨 스쿼트')
    assert.ok(await scroll() < longExerciseBottom, 'the shorter weight screen clamps to its own bottom')
    assert.equal(await evaluate(`document.querySelectorAll('${current} button[data-done], ${current} [aria-label$="세트 완료"]').length`), 7)
    await transition(-1, 3, '러닝머신')
    await transition(-1, 4, '실내 사이클')
    await click('운동 시작하기', 'textContent', '[data-workout-frame] footer button')
    await delay(1100)
    await click('유산소 완료', 'textContent', '[data-workout-frame] footer button')
    const distanceEdit = `${current} button[aria-label="실제 거리 수정"]`
    await click('실제 거리 수정', 'ariaLabel', distanceEdit)
    await click('직접 입력', 'textContent', 'dialog[open] button')
    await set('dialog[open] input[inputmode="decimal"]', '2.1')
    await click('확인', 'textContent', 'dialog[open] button')
    await transition(1, 3, '러닝머신')
    await transition(-1, 4, '실내 사이클')
    assert.equal(await evaluate(`document.querySelector('${distanceEdit}').previousElementSibling.textContent.trim()`), '2.1 km')
    await transition(1, 3, '러닝머신')
    await transition(1, 2, '바벨 스쿼트')
  } finally {
    await send('Emulation.setEmulatedMedia', { features: [] })
    await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  }
}
