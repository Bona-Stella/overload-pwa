import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'

export async function verifyWorkoutProcess({ origin, send, evaluate, wait, click, verifyWidth }) {
  const footer = '[data-workout-frame] footer button'
  const frame = '[data-workout-frame]:not([hidden])'
  const memo = '[data-swipe-current] [data-workout-memo-card] button[aria-expanded]'
  const activeCard = '[aria-label="진행 중인 운동"]'
  const rgb = hex => 'rgb(' + hex.slice(1).match(/../g).map(value => parseInt(value, 16)).join(', ') + ')'
  const action = label => click(label, 'textContent', footer)
  const text = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent`)
  const clock = '[data-workout-frame] [aria-label="운동 시간"]'
  const timerHeading = () => text(clock + ' > div:last-child small')
  const timer = () => text(clock + ' > div:last-child strong')
  const expectTitle = title => wait(async () => (await text(frame + ' h1'))?.endsWith(title), title)
  const heading = label => wait(() => evaluate(`Array.from(document.querySelectorAll('h1')).some(e=>e.textContent===${JSON.stringify(label)})`), label)
  const scrollWorkout = async position => {
    await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 520, deviceScaleFactor: 1, mobile: true })
    const offsets = await evaluate(`(async () => {
      await new Promise(resolve => requestAnimationFrame(resolve))
      const root = document.scrollingElement, limit = root.scrollHeight - root.clientHeight
      root.scrollTo({ top: limit * ${position}, behavior: 'instant' })
      return [root.scrollTop, limit]
    })()`)
    if (position) assert.ok(offsets[0] > 0, 'the active workout is actually scrolled before FINISH')
    assert.ok(Math.abs(offsets[0] - offsets[1] * position) < 1)
  }
  const summaryAtTop = () => wait(() => evaluate(`(() => {
    const title = [...document.querySelectorAll('h1')].find(h => h.textContent === '운동 기록 요약')
    return !!title && document.scrollingElement.scrollTop === 0 && title.getBoundingClientRect().top >= 0
  })()`), 'the mounted workout summary starts at the top')
  const reviewCard = '[aria-label="중량 검토 카드"]'
  const summary = async (sets, cardioCount, recommendation = false) => {
    await heading('운동 기록 요약')
    await wait(() => evaluate("!document.body.innerText.includes('당시 중량 검토 확인 중…')"), 'review lookup settled')
    assert.equal(!!await text(reviewCard), recommendation)
    assert.equal(await evaluate("[...document.querySelectorAll('h2, button, a')].some(e => e.textContent.trim() === '운동 기록 상세')"), false)
    if (!recommendation) {
      assert.equal(await evaluate("[...document.querySelectorAll('h2, [role=status], [role=alert]')].some(e => !e.closest('[aria-label=\"당시 중량 검토\"]') && e.textContent.includes('중량 검토'))"), false)
      assert.doesNotMatch(await text('article'), /저장된 종료 당시 중량 권고가 없습니다/)
    }
    const view = '[aria-label="웨이트 수행"]'
    assert.equal(!!await text(view), sets)
    const cardio = await text('[aria-label="유산소 수행"]')
    if (cardioCount === null) assert.equal(cardio, undefined)
    else assert.match(cardio, new RegExp('총 ' + cardioCount + '종목'))
    assert.equal(await text(frame), undefined)
  }
  const homeStatus = async label => {
    await evaluate('history.back()')
    await wait(async () => (await text(activeCard))?.includes(label), label)
    assert.equal(await text('[aria-label="오늘의 루틴"]'), undefined)
    assert.match(await text(activeCard), /웨이트.*\/4세트/)
    await click('운동 이어가기')
  }

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })
  await send('Page.navigate', { url: origin + '/rest-audio-preview?process=1' })
  await wait(async () => (await text('[aria-label="오늘의 루틴"]'))?.includes('TODAY\'S ROUTINE'), 'idle home')
  await click('운동 시작')
  await wait(async () => (await text(clock))?.includes('준비운동'), 'warmup')
  await homeStatus('준비운동 중')
  await action('준비운동 완료')
  await expectTitle('벤치 프레스')
  assert.equal(await timerHeading(), '종목 준비')
  await wait(async () => /^00:00:0[1-9]$/.test(await timer()), 'warmup completion starts the first preparation clock')
  assert.equal(await evaluate(`document.querySelector('${memo}').ariaExpanded`), 'true')
  for (const width of [320, 375, 393, 430]) {
    await verifyWidth(width)
    const layout = await evaluate(`(() => {
      const bar = document.querySelector('${clock}')
      const header = bar.parentElement.getBoundingClientRect()
      const footer = document.querySelector('${frame} footer')
      return { width: header.width, footer: footer.getBoundingClientRect().width, widths: [...bar.children].map(e => e.clientWidth),
        border: ['Top', 'Right', 'Bottom', 'Left'].map(side => getComputedStyle(bar)['border' + side + 'Width']),
        inner: [...bar.children].map(e => getComputedStyle(e).borderLeftWidth),
        rounded: [bar, document.querySelector('${frame} [aria-label="진행 중량"]'), footer.querySelector('button')].map(e => getComputedStyle(e).borderRadius) }
    })()`)
    assert.equal(layout.width, width)
    assert.equal(layout.width, layout.footer)
    assert.ok(Math.max(...layout.widths) - Math.min(...layout.widths) <= 2)
    assert.deepEqual(layout.border, ['0px', '0px', '1px', '0px'])
    assert.deepEqual(layout.inner, ['0px', '1px', '1px'])
    assert.deepEqual(layout.rounded, ['0px', '5px', '5px'])
  }
  await action('운동 시작하기')
  await wait(async () => await timerHeading() === 'WEIGHT 수행', 'started weight')
  assert.equal(await evaluate(`document.querySelector('${memo}').ariaExpanded`), 'false')
  await homeStatus('벤치 프레스 · 0/3세트')
  await action('1세트 완료')
  await wait(async () => await timerHeading() === '휴식 시간', 'rest')
  const completed = await evaluate(`(() => {
    const row = document.querySelector('${frame} [role="row"][data-done]');
    const value = row.querySelector('[data-set-input] [data-wheel-readout] [data-numeric-value="confirmed"]');
    return [getComputedStyle(value).color, getComputedStyle(row.querySelector('b')).color,
      getComputedStyle(row.querySelector('button span')).color, getComputedStyle(row).getPropertyValue('--text-primary').trim(),
      getComputedStyle(row).getPropertyValue('--status-done').trim()];
  })()`)
  assert.deepEqual(completed.slice(0, 3), [rgb(completed[3]), rgb(completed[3]), rgb(completed[4])])
  await homeStatus('1/3세트 · 휴식 중')
  await scrollWorkout(0.5)
  const restBeforeBackground = await timer()
  const resumedInPlace = await evaluate(`(() => {
    const workout = document.querySelector('${frame}'), historyEntry = history.state, scroll = scrollY
    const set = workout.querySelector('[role="row"][data-done]').textContent
    const markVisibility = () => document.dispatchEvent(new Event('visibilitychange'))
    window.reviewOriginalNow = Date.now
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    markVisibility()
    Date.now = () => window.reviewOriginalNow() + 3500
    Reflect.deleteProperty(document, 'visibilityState')
    markVisibility()
    return document.querySelector('${frame}') === workout && history.state === historyEntry && scrollY === scroll
      && workout.querySelectorAll('[role="row"][data-done]').length === 1
      && workout.querySelector('[role="row"][data-done]').textContent === set
  })()`)
  assert.equal(resumedInPlace, true, 'visibility return keeps the workout, completed input, scroll and History entry')
  await wait(async () => (await timer()) < restBeforeBackground, 'rest clock reflects elapsed time while hidden')
  await evaluate("Date.now = () => window.reviewOriginalNow() + 6500")
  await wait(() => evaluate(`document.querySelector('${clock}[data-flash]') && !!document.querySelector('${frame} footer [data-flash]')`), 'both rest alerts')
  const animation = await wait(() => evaluate(`(() => {
    const alerts = ['${clock}[data-flash]', '${frame} footer [data-flash]'].map(selector => {
      const element = document.querySelector(selector)
      if (!element) return null
      const style = getComputedStyle(element)
      const animation = element.getAnimations().find(item => item.animationName === style.animationName)
      return animation?.startTime != null ? [style.animationName, style.animationDuration, style.animationTimingFunction, animation.startTime,
        style.getPropertyValue('--rest-flash-on').trim()] : null
    })
    return alerts.every(Boolean) ? alerts : false
  })()`), 'shared rest animation')
  assert.deepEqual(animation[0].slice(0, 4), animation[1].slice(0, 4))
  assert.equal(animation[0][1], '1s')
  assert.match(animation[0][2], /^(steps\(1\)|step-end)$/)
  assert.notEqual(animation[0][4], animation[1][4])
  await action('+30초')
  await wait(async () => (await timer()) >= '00:00:30', 'extended rest')
  // Let the existing wall-clock timer expire without waiting 40 seconds in this browser suite.
  await evaluate("Date.now = () => window.reviewOriginalNow() + 45000")
  await wait(async () => await timerHeading() === 'WEIGHT 수행', 'natural end resumes weight')
  await action('2세트 완료')
  await action('휴식 종료')
  await action('3세트 완료')
  await expectTitle('바벨 스쿼트')
  assert.equal(await timerHeading(), '종목 준비')
  assert.equal(await evaluate(`document.querySelector('${memo}').ariaExpanded`), 'true')
  await homeStatus('바벨 스쿼트 · 시작 전')
  await click('운동·세트 편집')
  await wait(async () => (await text(frame + ' footer')) === '편집 닫기', 'editing label')
  const colors = await evaluate(`(() => {
    const close = document.querySelector('${footer}')
    return [getComputedStyle(close).color, getComputedStyle(close).getPropertyValue('--text-primary').trim(),
      getComputedStyle(close).getPropertyValue('--status-danger-text').trim()]
  })()`)
  assert.equal(colors[0], rgb(colors[1]))
  assert.notEqual(colors[0], rgb(colors[2]))
  await action('편집 닫기')
  await action('운동 시작하기')
  await action('1세트 완료')
  await wait(async () => (await text(frame + ' footer'))?.includes('남은 유산소 건너뛰고 종료'), 'weight/cardio choice')
  await expectTitle('바벨 스쿼트')
  await delay(1100)
  await action('다음 종목으로')
  await expectTitle('러닝머신')
  assert.equal(await timerHeading(), '종목 준비')
  assert.notEqual(await timer(), '00:00:00', 'cardio preparation starts at weight completion, before manual navigation')
  await homeStatus('러닝머신 · 준비 중')
  await action('운동 시작하기')
  await homeStatus('러닝머신 · 진행 중')
  await delay(80)
  await action('일시정지')
  await action('재개')
  await action('유산소 완료')
  await action('유산소 기록 확정')
  await wait(async () => (await text(clock))?.includes('모든 종목 완료'), 'last cardio completed without ending the session')
  await scrollWorkout(0.5)
  await action('운동 종료 및 요약')
  await summary(true, '1/1')
  await summaryAtTop()
  await evaluate("document.scrollingElement.scrollTo({top: 140, behavior: 'instant'})")
  await delay(100)
  assert.equal(await evaluate('document.scrollingElement.scrollTop'), 140, 'scrolling the summary does not trigger another reset')
  await evaluate(`(() => {
    const root = document.scrollingElement
    const scrollTo = root.scrollTo
    window.summaryTopResets = 0
    root.scrollTo = function (options) {
      if (options?.top === 0) window.summaryTopResets++
      return scrollTo.call(this, options)
    }
  })()`)
  await evaluate('history.back()')
  await wait(async () => (await text('[aria-label="오늘의 루틴"]'))?.includes("TODAY'S ROUTINE"), 'finished home')
  assert.equal(await text(activeCard), undefined)
  await evaluate('history.forward()')
  await summary(true, '1/1')
  await delay(100)
  assert.equal(await evaluate('window.summaryTopResets'), 0, 'history revisits do not run the first-entry scroll reset')
  await click('홈으로 돌아가기')
  await wait(async () => !!await text('[aria-label="오늘의 루틴"]'), 'summary footer returns home')
  assert.equal(await text(activeCard), undefined)

  const startPlan = async query => {
    await send('Page.navigate', { url: origin + '/rest-audio-preview?process=1&' + query })
    await wait(() => evaluate(`location.search.includes(${JSON.stringify(query)})`), 'new plan')
    await click('운동 시작')
  }
  const completeWeights = async () => {
    await action('준비운동 완료')
    await action('운동 시작하기')
    for (const ordinal of [1, 2, 3]) {
      await action(ordinal + '세트 완료')
      if (ordinal !== 3) await action('휴식 종료')
    }
    await expectTitle('바벨 스쿼트')
    await action('운동 시작하기')
    await action('1세트 완료')
  }
  await startPlan('case=skip')
  await completeWeights()
  await scrollWorkout(1)
  await action('남은 유산소 건너뛰고 종료')
  await summary(true, '0/1')
  await summaryAtTop()
  await startPlan('plan=weight&review=1')
  await completeWeights()
  await scrollWorkout(0)
  await action('운동 종료 및 요약')
  await summary(true, null, true)
  await summaryAtTop()
  assert.match(await text(reviewCard), /벤치 프레스.*kg.*→.*kg.*3\/3세트/s)
  assert.equal(await evaluate(`!!document.querySelector('${reviewCard} input[type="checkbox"]:checked')`), true)
  await click('전체 승인', 'textContent', reviewCard + ' button')
  await click('시연 확인', 'textContent', 'dialog[open] button')
  await wait(() => evaluate(`!document.querySelector('dialog[open], ${reviewCard}')`), 'approved candidate disappears')
  await summary(true, null)
  assert.match(await text('[aria-label="당시 중량 검토"]'), /25kg → 30kg.*증량 완료/s)
  await startPlan('plan=cardio')
  await expectTitle('러닝머신')
  const completeCardio = async () => {
    await action('운동 시작하기')
    await delay(70)
    await action('유산소 완료')
    await action('유산소 기록 확정')
  }
  await completeCardio()
  await expectTitle('실내 사이클')
  assert.equal(await timerHeading(), '종목 준비')
  await completeCardio()
  await action('운동 종료 및 요약')
  await summary(false, '2/2')
  await summaryAtTop()
  await startPlan('case=early')
  await action('준비운동 완료')
  await action('운동 시작하기')
  await action('1세트 완료')
  await scrollWorkout(1)
  await click('운동 종료', 'textContent', frame + ' button')
  await click('운동 종료', 'textContent', 'dialog[open] button')
  await summary(true, '0/1')
  await summaryAtTop()
}
