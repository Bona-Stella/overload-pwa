import { chooseDropdown } from './dropdown-driver.mjs'

import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { verifyRestAlerts } from './rest-alert-review-checks.mjs'

export async function verifyWorkoutReview({ origin, send, evaluate, wait, click, set, body, verifyWidth, drag }) {
  const scenario = 'aside[aria-label="Mock 검토 설정"] label:nth-of-type(1) select'
  const dialog = 'dialog[open]:not(:has(dialog[open]))'
  const dialogClick = label => click(label, 'textContent', dialog + ' button')
  const press = label => click(label, 'ariaLabel')
  const dragExercise = (from, to, options = {}) => drag(from, to, {
    ...options, rows: '[data-workout-row]', handle: 'button[aria-describedby]',
  })
  const currentRowNumber = () => evaluate(`String(Number(document.querySelector('dialog[open] [aria-current=step]').closest('[data-workout-row]').firstElementChild.textContent))`)
  const openList = async () => {
    const weight = await evaluate(`[...document.querySelectorAll('button')].some(b => b.textContent === '종목 보기/변경')`)
    await click(weight ? '종목 보기/변경' : '종목 목록')
  }
  const currentPosition = () => evaluate(`document.querySelector('[aria-label="운동 시간"]').children[1].querySelector('strong').textContent`)
  const applyDisabled = () => evaluate(`[...document.querySelectorAll('dialog[open] button')].find(b => b.textContent === '변경하기').disabled`)
  const has = text => wait(async () => (await body()).includes(text), text)
  const notOpen = () => wait(() => evaluate('!document.querySelector("dialog[open]")'), 'dialog dismissed')
  const displayedTitle = () => evaluate('document.querySelector("main h1").textContent')
  const title = async () => (await displayedTitle()).replace(/^\d+\. /, '')
  const verifyEndClearance = async () => {
    const scroll = await evaluate('window.scrollY')
    await evaluate('window.scrollTo(0, document.documentElement.scrollHeight)')
    await wait(() => evaluate(`(() => {
      const end = [...document.querySelectorAll('button')].find(b => b.textContent === '운동 종료')
      return Math.abs(document.querySelector('footer').getBoundingClientRect().top - end.getBoundingClientRect().bottom - 8) < 1
    })()`), 'last button clears measured footer by 8px')
    await screenshot('fourth-end-gap-320')
    await evaluate(`window.scrollTo(0, ${scroll})`)
  }
  const labelInput = async (label, value) => {
    await evaluate(`(() => {
      document.querySelector('[data-workout-test-input]')?.removeAttribute('data-workout-test-input')
      const label = [...document.querySelectorAll('label')].find(e => e.getClientRects().length && e.textContent.trim().startsWith(${JSON.stringify(label)}))
      label.querySelector('input, select').setAttribute('data-workout-test-input', 'yes')
    })()`)
    await set('[data-workout-test-input]', value)
  }
  const editPlanTime = async (minutes, seconds = null) => {
    await press('목표 시간 수정')
    for (const [unit, value] of [['분', minutes], ['초', seconds]]) {
      if (value === null) continue
      await press(`목표 시간 (${unit})`)
      await dialogClick('직접 입력')
      await set(dialog + ' input', value)
      await dialogClick('확인')
    }
    await dialogClick('시간 적용')
  }
  const outputDirectory = 'logs/workout-review'
  const screenshot = async label => {
    if (!process.env.OVERLOAD_WORKOUT_SCREENSHOTS) return
    await mkdir(outputDirectory, { recursive: true })
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(outputDirectory + '/' + label + '.png', Buffer.from(data, 'base64'))
  }
  const layoutMeasurements = []
  const verifyFrameClearance = async label => {
    const scroll = await evaluate('window.scrollY')
    await wait(() => evaluate(`(() => {
      const frame = document.querySelector('[data-workout-frame]'), footer = frame.querySelector('footer')
      return Math.abs(parseFloat(getComputedStyle(frame).paddingBottom) - footer.getBoundingClientRect().height - 8) < 1
    })()`), 'all workout screens reserve actual footer height')
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => { window.scrollTo(0, document.documentElement.scrollHeight); resolve() })))')
    const metrics = await evaluate(`(() => {
      const frame = document.querySelector('[data-workout-frame]'), footer = frame.querySelector('footer')
      const page = document.scrollingElement, rect = footer.getBoundingClientRect()
      return { width: innerWidth, footer: rect.height, reserved: parseFloat(getComputedStyle(frame).paddingBottom),
        parentPadding: getComputedStyle(frame.parentElement).paddingBottom, margin: getComputedStyle(frame).marginBottom,
        gap: rect.top - footer.previousElementSibling.getBoundingClientRect().bottom,
        maxScroll: page.scrollHeight - page.clientHeight, windowScrollOwner: page === document.documentElement,
        footerBottom: rect.bottom, viewportBottom: innerHeight }
    })()`)
    assert.equal(metrics.windowScrollOwner, true)
    assert.equal(metrics.parentPadding, '0px')
    assert.equal(metrics.margin, '0px')
    assert.ok(metrics.gap >= 7, label + ' last content clears footer')
    if (metrics.maxScroll > 0) assert.ok(Math.abs(metrics.gap - 8) < 1, label + ' no extra scroll tail')
    assert.ok(Math.abs(metrics.footerBottom - metrics.viewportBottom) < 1, 'fixed buttons retain viewport position')
    layoutMeasurements.push({ label, ...metrics })
    await screenshot('final-bottom-' + label + '-' + metrics.width)
    await evaluate(`window.scrollTo(0, ${scroll})`)
  }
  const verifyFrameLayouts = async label => {
    const widthBefore = await evaluate('innerWidth')
    for (const width of [320, 393]) { await verifyWidth(width); await verifyFrameClearance(label) }
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
    await verifyFrameClearance(label)
    await verifyWidth(widthBefore)
  }
  const verifyMemoEditing = async (width, keyboard) => {
    await send('Emulation.setFocusEmulationEnabled', { enabled: true })
    const footerGeometry = () => evaluate(`(() => {
      const footer = document.querySelector('footer'), rect = footer.getBoundingClientRect(), css = getComputedStyle(footer)
      return [rect.width, rect.height, css.padding, css.gap, css.bottom,
        getComputedStyle(document.querySelector('[data-weight-focus]')).paddingBottom]
    })()`)
    const footerHidden = `(() => {
      const footer = document.querySelector('footer')
      return getComputedStyle(footer).display === 'none' && footer.getClientRects().length === 0
    })()`
    const hidden = () => evaluate(footerHidden)
    const baseline = await footerGeometry()
    assert.ok(baseline[1] > 44)
    const focusMemo = () => evaluate(`(() => {
      const field = document.querySelector('[data-workout-memo]')
      field.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      field.focus()
    })()`)
    await evaluate('window.scrollTo(0, Math.max(0, document.documentElement.scrollHeight - innerHeight - 12))')
    const entryScroll = await evaluate('window.scrollY')
    assert.ok(entryScroll > 0, 'enter from a real nonzero scroll position')
    if (keyboard) {
      const focusedScroll = await evaluate(`(async () => {
        const field = document.querySelector('[data-workout-memo]');
        field.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        field.focus({ preventScroll: true });
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        return scrollY;
      })()`)
      assert.ok(Math.abs(focusedScroll - entryScroll) <= 1, 'hiding the footer does not clamp the page before the keyboard opens')
    }
    await focusMemo()
    await wait(hidden, 'memo focus completely hides footer')
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-weight-focus]')).paddingBottom`), baseline[5])
    let memoValue = '시트 높이 3 · 메모 검토 ' + width
    await set('[data-workout-memo]', memoValue)
    if (keyboard) {
      // Synthetic VisualViewport geometry exercises keyboard transitions, not an iPhone keyboard.
      await evaluate(`(() => {
        const viewport = window.visualViewport
        window.memoViewportTest = { height: viewport.height, offsetTop: 0, fullHeight: viewport.height, scrollCalls: [], nativeScrollTo: window.scrollTo }
        window.scrollTo = function(...args) {
          window.memoViewportTest.scrollCalls.push(args)
          return window.memoViewportTest.nativeScrollTo.apply(window, args)
        }
        for (const key of ['height', 'offsetTop']) Object.defineProperty(viewport, key, {
          configurable: true, get: () => window.memoViewportTest[key],
        })
        Object.defineProperty(viewport, 'pageTop', { configurable: true, get: () => window.scrollY + viewport.offsetTop })
      })()`)
      try {
        for (let cycle = 0; cycle < 4; cycle++) {
          if (cycle) {
            await focusMemo()
          }
          if (cycle === 2) {
            await send('Emulation.setDeviceMetricsOverride', { width, height: 732, deviceScaleFactor: 1, mobile: true })
            await evaluate(`window.memoViewportTest.fullHeight = window.innerHeight`)
          }
          const openingCalls = await evaluate('window.memoViewportTest.scrollCalls.length')
          await evaluate(`(() => {
            window.memoViewportTest.height = ${cycle === 2 ? '280' : 'window.memoViewportTest.fullHeight - 300'}
            window.memoViewportTest.offsetTop = ${width === 393 ? 40 : 0}
            window.visualViewport.dispatchEvent(new Event('resize'))
          })()`)
          if (cycle === 3) {
            const callsBeforeUser = await evaluate('window.memoViewportTest.scrollCalls.length')
            await evaluate(`document.querySelector('[data-workout-memo]').dispatchEvent(new Event('touchmove', { bubbles: true })); window.scrollBy(0, -32)`)
            const requested = await evaluate('window.scrollY')
            await delay(240)
            assert.equal(await evaluate('window.scrollY'), requested, 'touch cancels pending opening correction')
            assert.equal(await evaluate('window.memoViewportTest.scrollCalls.length'), callsBeforeUser)
          } else await wait(() => evaluate(`(() => {
            const rect = document.querySelector('[data-workout-memo]').getBoundingClientRect()
            const viewport = window.visualViewport
            return rect.bottom <= viewport.offsetTop + viewport.height + 1 &&
              rect.top >= Math.max(viewport.offsetTop, document.querySelector('[aria-label="운동 시간"]').parentElement.getBoundingClientRect().bottom) - 1
          })()`), 'memo input clears the header and simulated keyboard')
          assert.equal(await hidden(), true)
          await delay(200)
          assert.ok(await evaluate('window.memoViewportTest.scrollCalls.length') - openingCalls <= 1,'one memo placement per opening')
          assert.ok(await evaluate(`parseFloat(getComputedStyle(document.querySelector('[data-weight-focus]')).paddingBottom)`) >= parseFloat(baseline[5]), 'keyboard positioning retains the measured footer reserve')
          if (cycle === 0) {
            const longMemo = '\n' + '긴 메모 입력과 운동 상태 보존을 확인합니다. '.repeat(25)
            await evaluate(`(() => { const field = document.querySelector('[data-workout-memo]'); field.setSelectionRange(field.value.length, field.value.length) })()`)
            await send('Input.insertText', { text: longMemo })
            memoValue += longMemo
            assert.equal(await evaluate(`document.querySelector('[data-workout-memo]').value`), memoValue)
            const stableScroll = await evaluate('window.scrollY')
            await evaluate(`window.visualViewport.dispatchEvent(new Event('resize')); window.visualViewport.dispatchEvent(new Event('resize'))`)
            await delay(200)
            assert.equal(await evaluate('window.scrollY'), stableScroll, 'visible card does not keep scrolling on unchanged viewport')
            await evaluate(`window.memoViewportTest.height-=32; window.visualViewport.dispatchEvent(new Event('resize'))`)
            await delay(210)
            assert.equal(await evaluate('window.scrollY'),stableScroll,'a late viewport step does not trigger a second app correction')
            await evaluate(`window.memoViewportTest.height+=32; window.visualViewport.dispatchEvent(new Event('resize'))`)
            await screenshot('final-memo-card-viewport-simulated-' + width)
            await evaluate(`window.scrollBy(0, -24); window.visualViewport.dispatchEvent(new Event('scroll'))`)
            const scroll = await evaluate('window.scrollY')
            await delay(240)
            assert.equal(await evaluate('window.scrollY'), scroll, 'user scroll does not trigger repeated reveal')
            const beforePan = await evaluate(`({ padding: getComputedStyle(document.querySelector('[data-workout-frame]')).paddingBottom, height: document.documentElement.scrollHeight })`)
            const scrollCalls = await evaluate('window.memoViewportTest.scrollCalls.length')
            await evaluate(`(() => {
              document.querySelector('[data-workout-memo]').dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -80 }))
              window.scrollBy(0, -80)
              window.memoViewportTest.offsetTop += 24
              window.memoViewportTest.height -= 2
              window.visualViewport.dispatchEvent(new Event('scroll'))
              window.visualViewport.dispatchEvent(new Event('resize'))
            })()`)
            const requestedScroll = await evaluate('window.scrollY')
            await delay(260)
            const afterPan = await evaluate(`({ padding: getComputedStyle(document.querySelector('[data-workout-frame]')).paddingBottom, height: document.documentElement.scrollHeight, scroll: window.scrollY })`)
            assert.equal(afterPan.padding, beforePan.padding, 'viewport panning must not mutate memo scroll space')
            assert.equal(afterPan.scroll, requestedScroll, 'manual scroll with viewport resize must not snap back')
            assert.equal(await evaluate('window.memoViewportTest.scrollCalls.length'), scrollCalls, 'no application correction after manual pan')
            for (const [offset, jitter, distance] of [[65, 1, 36], [12, -1, -48], [90, 0, 24], [40, 96, -24]]) {
              await evaluate(`(() => {
                document.querySelector('[data-workout-memo]').dispatchEvent(new Event('touchmove', { bubbles: true }))
                window.scrollBy(0, ${distance})
                window.memoViewportTest.offsetTop = ${offset}
                window.memoViewportTest.height = window.memoViewportTest.fullHeight - 300 + ${jitter}
                window.visualViewport.dispatchEvent(new Event('scroll'))
                window.visualViewport.dispatchEvent(new Event('resize'))
              })()`)
              const userPosition = await evaluate('window.scrollY')
              await delay(220)
              assert.equal(await evaluate('window.scrollY'), userPosition, 'alternating touch pan keeps user position')
              assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-workout-frame]')).paddingBottom`), beforePan.padding)
              assert.equal(await evaluate('document.documentElement.scrollHeight'), beforePan.height, 'pan does not change document height')
              assert.equal(await evaluate('window.memoViewportTest.scrollCalls.length'), scrollCalls)
            }
            await screenshot('memo-user-pan-stable-' + width)
            for (const rotatedWidth of [width === 320 ? 393 : 320, width]) {
              await send('Emulation.setDeviceMetricsOverride', { width: rotatedWidth, height: 852, deviceScaleFactor: 1, mobile: true })
              await wait(() => evaluate(`(() => {
                const card = document.querySelector('[data-workout-memo]').getBoundingClientRect()
                const viewport = window.visualViewport
                return card.top >= Math.max(viewport.offsetTop, document.querySelector('[aria-label="운동 시간"]').parentElement.getBoundingClientRect().bottom) - 1 &&
                  card.bottom <= viewport.offsetTop + viewport.height + 1
              })()`), 'rotation may realign the field after manual takeover')
            }
          }
          if (cycle === 1) {
            await evaluate(`window.memoViewportTest.height = window.memoViewportTest.fullHeight; window.memoViewportTest.offsetTop = 0; window.visualViewport.dispatchEvent(new Event('resize'))`)
            await delay(200)
            assert.equal(await hidden(), true, 'closing keyboard alone keeps focused memo protected')
          }
          if (cycle === 3) {
            await evaluate(`window.memoViewportTest.height = window.memoViewportTest.fullHeight; window.memoViewportTest.offsetTop = 0; window.visualViewport.dispatchEvent(new Event('resize'))`)
            await wait(() => evaluate(`!document.querySelector('[data-keyboard-open]') && getComputedStyle(document.querySelector('[data-workout-frame]')).paddingBottom === ${JSON.stringify(baseline[5])}`), 'focused keyboard dismissal releases only the temporary space')
            await evaluate(`window.memoViewportTest.height = window.memoViewportTest.fullHeight - 300; window.visualViewport.dispatchEvent(new Event('resize'))`)
            await wait(() => evaluate(`(() => {
              const field = document.querySelector('[data-workout-memo]').getBoundingClientRect()
              return !!document.querySelector('[data-keyboard-open]') && field.bottom <= window.visualViewport.height + 1
            })()`), 'keyboard reopens without a second focus event')
          }
          const beforeCloseScroll = await evaluate('window.scrollY')
          const closingCalls = await evaluate('window.memoViewportTest.scrollCalls.length')
          await evaluate(`document.querySelector('[data-workout-memo]').blur()`)
          await delay(200)
          if (cycle !== 1) {
            assert.equal(await hidden(), true, 'blur before keyboard dismissal must not flash footer')
            await evaluate(`window.memoViewportTest.height = window.memoViewportTest.fullHeight - 70; window.memoViewportTest.offsetTop = 0; window.visualViewport.dispatchEvent(new Event('resize'))`)
            await delay(200)
            assert.equal(await hidden(), true, 'partially closed keyboard still hides footer')
          }
          const hiddenAtDismissal = await evaluate(`(() => {
            window.memoViewportTest.height = window.memoViewportTest.fullHeight
            window.memoViewportTest.offsetTop = 0
            window.visualViewport.dispatchEvent(new Event('resize'))
            return ${footerHidden}
          })()`)
          if (cycle !== 1) assert.equal(hiddenAtDismissal, true, 'footer waits for settled dismissal')
          await wait(async () => !(await hidden()), 'footer restored after blur and keyboard dismissal')
          assert.deepEqual(await footerGeometry(), baseline, 'footer dimensions and reserved space restored')
          const expectedScroll = await evaluate(`Math.min(${beforeCloseScroll}, document.documentElement.scrollHeight - innerHeight)`)
          assert.ok(Math.abs(await evaluate('window.scrollY') - expectedScroll) < 1, 'dismissal keeps the current position within the document range')
          assert.equal(await evaluate('window.memoViewportTest.scrollCalls.length'),closingCalls,'dismissal does not scroll back to the memo entry position')
          await delay(180)
          assert.ok(Math.abs(await evaluate('window.scrollY') - expectedScroll) < 1, 'restored position remains stable')
          assert.equal(await evaluate(`document.querySelector('[data-workout-memo]').value`), memoValue)
          assert.equal(await displayedTitle(), '01. 벤치 프레스')
          assert.equal(await evaluate(`document.querySelector('[data-workout-frame]').style.getPropertyValue('--editor-keyboard-space')`), '', 'keyboard-only reserve removed')
        }
      } finally {
        await evaluate(`(() => {
          document.querySelector('[data-workout-memo]').blur()
          delete window.visualViewport.height; delete window.visualViewport.offsetTop; delete window.visualViewport.pageTop
          window.scrollTo = window.memoViewportTest.nativeScrollTo
          delete window.memoViewportTest
          window.visualViewport.dispatchEvent(new Event('resize'))
        })()`)
        await send('Emulation.setDeviceMetricsOverride', { width, height: 852, deviceScaleFactor: 1, mobile: true })
      }
    } else {
      await screenshot('fifth-memo-focus-desktop')
      const desktopScroll = await evaluate('window.scrollY')
      await evaluate(`document.querySelector('[data-workout-memo]').blur()`)
      await wait(async () => !(await hidden()), 'desktop memo blur restores footer')
      assert.deepEqual(await footerGeometry(), baseline)
      assert.ok(Math.abs(await evaluate('window.scrollY') - desktopScroll) < 1, 'desktop blur leaves the current scroll position intact')
      assert.equal(await evaluate(`document.querySelector('[data-workout-memo]').value`), '시트 높이 3 · 메모 검토 ' + width)
    }
    await wait(async () => !(await hidden()), 'memo test restores footer')
    await set('[data-workout-memo]', '')
  }
  const setRep = async (ordinal, value) => {
    const label = ordinal + '세트 이번 반복 횟수'
    await press(label)
    await dialogClick('직접 입력')
    await labelInput(label + ' (회)', value)
    await dialogClick('확인')
    await notOpen()
  }
  const rowContains = (ordinal, text) => evaluate(`[...document.querySelectorAll('[role=row]')][${ordinal}].innerText.includes(${JSON.stringify(text)})`)
  const timer = () => evaluate('[...document.querySelectorAll("strong")].find(e => e.previousElementSibling?.textContent === "실제 활동 시간 · 일시정지 제외")?.textContent')
  const choose = async name => {
    await set('.exercise-search input', name)
    await click(name, 'textContent', dialog + ' ul[aria-label="표준 운동 목록"] strong')
    await notOpen()
  }

  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.reviewStorage = [];
    for (const key of ['open', 'deleteDatabase']) {
      const original = IDBFactory.prototype[key];
      IDBFactory.prototype[key] = function(...args) { window.reviewStorage.push(key); return original.apply(this, args); };
    }
    const originalNow = Date.now.bind(Date);
    window.restAlertTimeOffset = 0;
    Date.now = () => originalNow() + window.restAlertTimeOffset;
    window.reviewTones = 0;
    window.reviewToneGain = [];
    window.reviewToneStarts = [];
    const activeTones = new Set();
    window.reviewToneCancels = 0;
    window.reviewLiveTones = () => activeTones.size;
    window.reviewEndedWhilePlaying = [];
    const gain = AudioParam.prototype.setValueAtTime;
    AudioParam.prototype.setValueAtTime = function(value,...args) { window.reviewToneGain.push(value); return gain.call(this,value,...args); };
    const tone = OscillatorNode.prototype.start, stopTone = OscillatorNode.prototype.stop;
    OscillatorNode.prototype.start = function(...args) {
      window.reviewTones++; window.reviewToneStarts.push(args[0]); activeTones.add(this);
      this.addEventListener('ended', () => {
        if (activeTones.delete(this)) {
          window.reviewEndedWhilePlaying.push([...document.querySelectorAll('button[aria-label$="미리듣기 중지"]')].map(b=>b.ariaLabel));
        }
      }, {once:true});
      return tone.apply(this, args);
    };
    OscillatorNode.prototype.stop = function(...args) {
      if (!args.length && activeTones.delete(this)) window.reviewToneCancels++;
      return stopTone.apply(this, args);
    };
  ` })
  await send('Page.navigate', { url: origin + '/routine-preview?tab=home&review=workout' })
  await has('웨이트 + 러닝')
  await verifyWidth(393)
  await click('설정', 'ariaLabel', 'nav button')
  await click('휴식 타이머 알림', 'textContent', 'button strong')
  await verifyRestAlerts({ send, evaluate, wait, click, set, body, verifyWidth, screenshot })
  await send('Page.navigate', { url: origin + '/routine-preview?tab=home&review=workout' })
  await has('웨이트 + 러닝')
  await click('운동 시작')
  await has('세트 기록 없음')
  assert.match(await body(), /25kg · 8–12회 × 3세트.*제조사 미지정 · 원판식/s)
  assert.equal(await evaluate(`document.querySelector('[aria-label="운동 시간"]').parentElement.getBoundingClientRect().top`), 0)
  const initialClockTop = await evaluate(`document.querySelector('[aria-label="운동 시간"]').getBoundingClientRect().top`)
  assert.equal(initialClockTop, 0)
  assert.equal(await evaluate(`!!document.querySelector('nav[aria-label="기본 탐색"]')`), false)
  await screenshot('warmup-393')
  await verifyFrameLayouts('warmup')
  await click('준비운동 완료')
  assert.equal(await title(), '벤치 프레스')
  assert.equal(await displayedTitle(), '01. 벤치 프레스')
  await verifyWidth(320)
  await screenshot('weight-320')
  await verifyWidth(393)
  await screenshot('feedback-weight-393')
  await verifyWidth(320)
  assert.equal(await evaluate('document.querySelectorAll("[data-filled=true]").length'), 1)
  assert.deepEqual(await evaluate(`(() => {
    const bar = document.querySelector('[aria-label="운동 시간"]')
    const columns = [...bar.children].map(e => e.getBoundingClientRect().width)
    const nav = bar.parentElement.nextElementSibling
    const title = nav.querySelector('strong').getBoundingClientRect()
    const rect = nav.getBoundingClientRect()
    return [Math.abs(columns[0] - columns[1]) <= 1, Math.abs(columns[2] - columns[1]) <= 1,
      Math.abs(title.x + title.width / 2 - rect.x - rect.width / 2) < 1,
      bar.children[1].querySelectorAll('div').length === 1 &&
        bar.children[0].querySelectorAll('div').length === 0 && bar.children[2].querySelectorAll('div').length === 0,
      getComputedStyle(nav.querySelector('strong')).fontSize,
      getComputedStyle(nav.querySelector('button')).fontSize,
      nav.getBoundingClientRect().top - bar.getBoundingClientRect().bottom]
  })()`), [true, true, true, true, '15px', '13px', 12])
  assert.doesNotMatch(await evaluate('document.querySelector("[role=table]").innerText'), /kg|제조사|원판식/)
  assert.equal(await evaluate(`(() => {
    const card = document.querySelector('[aria-label="진행 중량"]')
    return Math.abs(card.querySelector('button').getBoundingClientRect().right -
      card.querySelector('[aria-label="현재 장비"]').getBoundingClientRect().right) < 1
  })()`), true)
  assert.deepEqual(await evaluate(`(() => {
    const buttons = [...document.querySelectorAll('button')]
    const end = buttons.find(b => b.textContent === '운동 종료')
    const edit = buttons.find(b => b.textContent === '운동·세트 편집')
    const endStyle = getComputedStyle(end), editStyle = getComputedStyle(edit)
    return [endStyle.color, endStyle.backgroundColor === editStyle.backgroundColor,
      endStyle.borderColor === endStyle.color, end.getBoundingClientRect().height === edit.getBoundingClientRect().height,
      end.getBoundingClientRect().width === edit.getBoundingClientRect().width, endStyle.borderTopWidth]
  })()`), ['rgb(240, 183, 191)', true, true, true, true, '2px'])
  assert.deepEqual(await evaluate(`(() => {
    const card = document.querySelector('[aria-label="진행 중량"]')
    const heading = document.querySelector('[role=table]').parentElement.firstElementChild
    const fields = [...heading.children]
    const controls = [...document.querySelector('[aria-label="1세트 이번 반복 횟수"]').children]
    return [getComputedStyle(card).paddingTop, getComputedStyle(card).rowGap,
      card.getBoundingClientRect().height < 124,
      fields.map(e => getComputedStyle(e).fontSize),
      fields.every(e => e.scrollWidth <= e.clientWidth && e.getBoundingClientRect().height < 23),
      controls.map(e => getComputedStyle(e).borderTopWidth),
      controls.every(e => e.getBoundingClientRect().height >= 44 && e.getBoundingClientRect().width >= 44)]
  })()`), ['12px', '4px', true, ['13px', '13px', '13px'], true, ['0px', '0px', '0px'], true])
  await press('1세트 이번 반복 횟수 증가')
  assert.equal(await evaluate(`document.querySelector('[aria-label="1세트 이번 반복 횟수"] > button:nth-child(2)').textContent`), '9 회')
  await press('1세트 이번 반복 횟수 감소')
  await verifyEndClearance()
  await verifyFrameClearance('weight')
  await verifyMemoEditing(320, true)
  await verifyEndClearance()
  await verifyWidth(393)
  await verifyMemoEditing(393, true)
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  await verifyMemoEditing(1280, false)
  await verifyWidth(320)
  await verifyEndClearance()
  await evaluate(`(() => {
    const field = document.querySelector('[data-workout-memo]')
    field.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); field.focus()
  })()`)
  await wait(() => evaluate('getComputedStyle(document.querySelector("footer")).display==="none"'), 'memo protected before navigation')
  const navigationTop = await evaluate(`(() => {
    const next = document.querySelector('[data-exercise-navigation] button:last-child')
    const top = window.scrollY
    next.focus({ preventScroll: true }); next.click()
    return top
  })()`)
  await wait(() => evaluate('getComputedStyle(document.querySelector("footer")).display!=="none"'), 'footer restored after leaving memo exercise')
  await delay(180)
  assert.equal(await currentPosition(), '현재 2 / 3종목')
  await wait(() => evaluate(`(() => {
    const page = document.scrollingElement
    return !document.querySelector('[data-memo-keyboard-space]') &&
      Math.abs(window.scrollY - Math.min(${navigationTop}, page.scrollHeight - page.clientHeight)) <= 1
  })()`), 'memo space clears and navigation keeps the reachable scroll position')
  await press('이전 운동 · 벤치 프레스')
  assert.equal(await displayedTitle(), '01. 벤치 프레스')
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === '운동 종료').scrollIntoView({block:'center'})`)
  await screenshot('third-end-button-320')
  await evaluate('window.scrollTo(0, 0)')
  await press('1세트 이번 반복 횟수')
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('dialog[open] button')].map(b => b.textContent.trim()).filter(t => ['직접 입력', '확인', '돌아가기'].includes(t))`), ['직접 입력', '확인'])
  await dialogClick('9 회')
  assert.equal(await evaluate(`document.querySelector('[aria-label="1세트 이번 반복 횟수"] > button:nth-child(2)').textContent`), '8 회')
  await screenshot('third-reps-wheel-320')
  await click('닫기', 'ariaLabel', dialog + ' button')
  assert.equal(await evaluate(`document.querySelector('[aria-label="1세트 이번 반복 횟수"] > button:nth-child(2)').textContent`), '8 회')
  await press('1세트 이번 반복 횟수')
  await dialogClick('9 회')
  await dialogClick('확인')
  assert.equal(await evaluate(`document.querySelector('[aria-label="1세트 이번 반복 횟수"] > button:nth-child(2)').textContent`), '9 회')
  await setRep(1, '8')
  assert.equal(await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(b => b.textContent === '운동 종료')
    return button.previousElementSibling.querySelector('textarea') !== null
  })()`), true)
  await evaluate('window.scrollTo(0, 420)')
  await wait(() => evaluate(`Math.abs(document.querySelector('[aria-label="운동 시간"]').parentElement.getBoundingClientRect().top) < 1`), 'sticky time bar')
  assert.equal(await evaluate(`document.querySelector('[aria-label="운동 시간"]').getBoundingClientRect().top`), initialClockTop)
  await screenshot('feedback-sticky-320')

  // A trusted click enables Web Audio on browsers with gesture-gated playback.
  const position = await evaluate(`(() => {
    const button = [...document.querySelectorAll('footer button')].find(e => e.textContent === '1세트 완료')
    const rect = button.getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  })()`)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...position, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...position, button: 'left', clickCount: 1 })
  await has('남은 휴식')
  assert.equal(await evaluate(`document.querySelector('[aria-label="운동 시간"]').lastElementChild.children.length`), 2)
  assert.equal(await evaluate(`document.querySelector('[aria-label="운동 시간"]').lastElementChild.firstElementChild.textContent`), '남은 휴식')
  await wait(() => evaluate(`(() => {
    const header = document.querySelector('[aria-label="운동 시간"]').parentElement.getBoundingClientRect()
    const weight = document.querySelector('[aria-label="진행 중량"]').getBoundingClientRect()
    const page = document.scrollingElement
    const target = Math.max(0, Math.min(window.scrollY + weight.top - header.bottom - 8, page.scrollHeight - page.clientHeight))
    return Math.abs(window.scrollY - target) < 2 && weight.top >= header.bottom + 6
  })()`), 'completed set scrolls weight card below sticky header')
  assert.equal(await evaluate('document.querySelector(\'[aria-label="2세트 완료"]\').disabled'), true)
  await openList()
  assert.equal(await applyDisabled(), true)
  assert.equal(await evaluate(`[...document.querySelectorAll('dialog[open] button')].some(b => ['↑', '↓'].includes(b.textContent.trim()))`), false)
  const originalIds = await evaluate(`[...document.querySelectorAll('[data-workout-row]')].map(r => r.dataset.workoutRow)`)
  const originalTops = await evaluate(`[...document.querySelectorAll('[data-workout-row]')].map(r => r.getBoundingClientRect().top)`)
  await dragExercise(0, 1, { during: async () => {
    await wait(() => evaluate(`(() => {
      const rows = [...document.querySelectorAll('[data-workout-row]')]
      return rows[0].getBoundingClientRect().top > ${originalTops[0]} + 10 &&
        rows[1].getBoundingClientRect().top < ${originalTops[1]} - 10
    })()`), 'live exercise drag and insertion space')
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('[data-workout-row]')].map(r => r.dataset.workoutRow)`), originalIds)
    assert.equal(await currentPosition(), '현재 1 / 3종목')
    assert.equal(await displayedTitle(), '01. 벤치 프레스')
    await screenshot('third-drag-active-320')
  } })
  assert.equal(await applyDisabled(), false)
  assert.equal(await currentPosition(), '현재 1 / 3종목')
  await dialogClick('목록 닫기')
  assert.equal(await currentPosition(), '현재 1 / 3종목')
  assert.equal(await displayedTitle(), '01. 벤치 프레스')
  await openList()
  assert.equal(await applyDisabled(), true)
  assert.equal(await currentRowNumber(), '1')
  const scrollBeforeTouch = await evaluate('window.scrollY')
  await dragExercise(0, 1, { touch: true })
  assert.equal(await evaluate('window.scrollY'), scrollBeforeTouch)
  await click('닫기', 'ariaLabel', dialog + ' button')
  await openList()
  assert.equal(await applyDisabled(), true)
  await dragExercise(0, 1, { cancel: true })
  assert.equal(await applyDisabled(), true)
  assert.equal(await evaluate('document.querySelectorAll("dialog[open]").length'), 1)
  await dragExercise(0, 1, { touch: true, cancel: true })
  assert.equal(await applyDisabled(), true)
  await dragExercise(0, 2)
  assert.equal(await applyDisabled(), true, 'weight cannot move to cardio')
  assert.equal(await evaluate(`(() => {
    const title = [...document.querySelectorAll('[data-workout-row] strong')][1]
    return title.scrollWidth > title.clientWidth && title.title === title.textContent &&
      getComputedStyle(title).textOverflow === 'ellipsis'
  })()`), true)
  await dragExercise(0, 1)
  await dragExercise(1, 0)
  assert.equal(await applyDisabled(), true)
  await dragExercise(0, 1)
  await dialogClick('변경하기')
  await notOpen()
  assert.equal(await title(), '벤치 프레스')
  assert.equal(await currentPosition(), '현재 2 / 3종목')
  assert.equal(await displayedTitle(), '02. 벤치 프레스')
  assert.equal(await evaluate('document.querySelectorAll("[data-filled=true]").length'), 2)
  assert.equal(await rowContains(1, '8회'), true)
  assert.match(await evaluate(`document.querySelector('[aria-label="진행 중량"]').innerText`), /25/)
  assert.equal(await evaluate(`document.querySelector('[data-exercise-navigation] button:last-child').getAttribute('aria-label')`), '다음 운동 · 러닝머신')
  const previousName = await evaluate(`document.querySelector('[data-exercise-navigation] button:first-child small').textContent`)
  await screenshot('second-order-applied-320')
  await openList()
  assert.equal(await currentRowNumber(), '2')
  assert.match(await evaluate(`document.querySelector('dialog[open] [aria-current=step]').textContent`), /1\/3세트 완료/)
  await click(previousName, 'textContent', dialog + ' strong')
  assert.equal(await currentPosition(), '현재 1 / 3종목')
  await press('다음 운동 · 벤치 프레스')
  assert.equal(await title(), '벤치 프레스')
  assert.equal(await displayedTitle(), '02. 벤치 프레스')
  assert.equal(await currentPosition(), '현재 2 / 3종목')
  await openList()
  await dragExercise(1, 0)
  await dialogClick('변경하기')
  assert.equal(await currentPosition(), '현재 1 / 3종목')
  assert.equal(await displayedTitle(), '01. 벤치 프레스')
  await has('남은 휴식')
  await click('+30초')
  assert.match(await body(), /00:00:(3[0-9]|4[0-2])/)
  await click('휴식 종료')
  await has('휴식 없음')
  await press('1세트 완료 취소')
  await dialogClick('취소')
  await notOpen()
  assert.equal(await rowContains(1, '8회'), true)
  await press('1세트 완료 취소')
  await dialogClick('완료 취소 확인')
  await notOpen()
  await click('1세트 완료')
  await has('다음 세트 준비')
  await wait(() => evaluate('!!document.querySelector("[data-flash=true]")'), 'rest flash')
  await screenshot('rest-320')
  await verifyEndClearance()
  await verifyFrameLayouts('rest')
  assert.deepEqual(await evaluate(`(() => {
    const footer = document.querySelector('footer')
    const rows = [...footer.children].map(e => e.getBoundingClientRect())
    const buttons = [...footer.querySelectorAll('button')].map(e => e.getBoundingClientRect())
    return [Math.abs(rows[0].width - rows[1].width) < 1, Math.abs(rows[0].left - rows[1].left) < 1,
      Math.abs(buttons[0].width - buttons[1].width) < 1, buttons[0].height === buttons[1].height,
      rows[0].height === buttons[0].height, buttons[0].height]
  })()`), [true, true, true, true, true, 50])
  await wait(() => evaluate('window.reviewTones > 0'), 'rest sound')
  await has('휴식 없음')
  assert.ok((await evaluate('window.reviewTones')) <= 5)

  await click('중량 변경')
  await press('변경 중량 증가')
  await dialogClick('확인')
  await has('승인 중량 25 kg · 오늘만 적용')
  assert.equal(await rowContains(1, '8회'), true)
  await click('중량 변경')
  await press('변경 중량 증가')
  await evaluate('document.querySelectorAll("dialog[open] input[type=radio]")[1].click()')
  await dialogClick('확인')
  await has('승인 중량 30 kg · 진행 중량 변경 시연')
  await click('중량 변경')
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('dialog[open] [aria-label="변경 중량"] > button')].map(b => b.textContent)`), ['−2.5', '30 kg', '+2.5'])
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('dialog[open] [aria-label="변경 중량"] > button')].map(b => getComputedStyle(b).borderTopWidth)`), ['0px', '0px', '0px'])
  await press('변경 중량')
  await verifyWidth(320)
  const selectionTop = await evaluate('document.querySelector("[data-wheel-selection]").getBoundingClientRect().top')
  const wheelPoint = await evaluate(`(() => {
    const rect = document.querySelector('[aria-label="변경 중량 선택값"]').getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  })()`)
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...wheelPoint, deltaX: 0, deltaY: 52 })
  await wait(() => evaluate(`document.querySelector('dialog[open] [aria-pressed=true]')?.textContent.trim() === '32.5 kg'`), 'wheel scroll selection')
  assert.ok(Math.abs(await evaluate('document.querySelector("[data-wheel-selection]").getBoundingClientRect().top') - selectionTop) < 1)
  assert.equal(await evaluate(`document.querySelector('[aria-label="변경 중량"] > button:nth-child(2)').textContent`), '30 kg')
  await screenshot('feedback-weight-wheel-320')
  assert.deepEqual(await evaluate(`(() => {
    const buttons = [...document.querySelectorAll('dialog[open]')].at(-1).querySelectorAll('button')
    const direct = [...buttons].find(b => b.textContent === '직접 입력').getBoundingClientRect()
    const confirm = [...buttons].find(b => b.textContent === '확인').getBoundingClientRect()
    return [Math.abs(direct.width - confirm.width) < 1, direct.height === confirm.height]
  })()`), [true, true])
  await click('닫기', 'ariaLabel', dialog + ' button')
  assert.equal(await evaluate(`document.querySelector('[aria-label="변경 중량"] > button:nth-child(2)').textContent`), '30 kg')
  await press('변경 중량')
  await dialogClick('35 kg')
  await dialogClick('확인')
  assert.equal(await evaluate(`document.querySelector('[aria-label="변경 중량"] > button:nth-child(2)').textContent`), '35 kg')
  await press('변경 중량')
  await dialogClick('직접 입력')
  await labelInput('변경 중량 (kg)', '52.3')
  await dialogClick('확인')
  assert.equal(await evaluate('document.querySelector("dialog[open]").getAttribute("aria-labelledby") === document.activeElement.closest("dialog").getAttribute("aria-labelledby")'), true)
  await press('변경 중량')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  assert.equal(await evaluate('document.querySelectorAll("dialog[open]").length'), 1)
  assert.equal(await evaluate('document.querySelector(\'[aria-label="변경 중량"] > button:nth-child(2)\').textContent'), '52.3 kg')
  await dialogClick('취소')
  await notOpen()

  await click('운동·세트 편집')
  await verifyEndClearance()
  await verifyFrameLayouts('set-edit')
  await chooseDropdown(evaluate, '[data-swipe-current] [data-dropdown-label="제조사 · 선택"]', '10000000-0000-4000-8000-000000000017')
  await chooseDropdown(evaluate, '[data-swipe-current] [data-dropdown-label="부하 방식 · 선택"]', 'STACK')
  await click('오늘만 장비 변경 적용')
  assert.equal(await rowContains(1, '원판식'), false)
  assert.equal(await evaluate(`document.querySelector('[aria-label="현재 장비"]').textContent`), '해머 스트렝스핀·스택식')
  await click('+ 세트 추가')
  await has('8–12회 × 4세트')
  const editGeometry = await evaluate(`(() => {
    const buttons = [...document.querySelectorAll('[role=row]')].at(-1).querySelectorAll('button')
    const add = [...buttons].find(b => b.textContent === '+ 세트 추가').getBoundingClientRect()
    const remove = [...buttons].find(b => b.textContent === '4세트 제외').getBoundingClientRect()
    return [Math.abs(add.width - remove.width) < 1, add.height === remove.height,
      document.querySelectorAll('[aria-label$="이번 중량"]').length,
      [...document.querySelectorAll('footer button')].map(b => b.textContent)]
  })()`)
  assert.deepEqual(editGeometry, [true, true, 0, ['편집 닫기']])
  await screenshot('feedback-edit-320')
  await click('4세트 제외')
  await has('8–12회 × 3세트')
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].find(e => e.textContent === '현재 종목 교체').disabled`), true)
  await click('편집 닫기')
  await setRep(2, '9')
  await openList()
  await click('러닝머신', 'textContent', dialog + ' strong')
  await click('‹ 홈')
  await click('운동 이어가기')
  await openList()
  await click('벤치 프레스', 'textContent', dialog + ' strong')
  assert.equal(await rowContains(2, '9 회'), true)
  await click('2세트 완료')
  assert.equal(await rowContains(2, '해머 스트렝스 · 핀·스택식'), false)
  await click('휴식 종료')
  await click('운동·세트 편집')
  await setRep(3, '8')
  await press('3세트 완료')
  await click('오늘만 장비 변경 적용')
  assert.equal(await rowContains(3, '8회'), true)
  await click('편집 닫기')
  assert.equal(await evaluate(`document.querySelector('[aria-label="운동 시간"]').lastElementChild.innerText`), '이전 종목 완료\n완료')
  await click('다음 종목으로')
  assert.match(await title(), /레그 컬/)
  assert.equal(await evaluate(`(() => {
    const title = document.querySelector('main h1')
    return title.scrollWidth > title.clientWidth && title.title === title.textContent &&
      getComputedStyle(title).textOverflow === 'ellipsis'
  })()`), true)
  await verifyWidth(320)
  await click('1세트 완료')
  await has('중량과 반복 횟수를 확인해 주세요.')
  await openList()
  const longName = await title()
  assert.equal(await currentRowNumber(), '2')
  // The pointer reorder is covered above. Exercise the keyboard path for the current long-name row.
  await evaluate(`(() => {
    const row = document.querySelector('dialog[open] [aria-current="step"]').closest('[data-workout-row]')
    row.querySelector('button[aria-describedby]').focus({ preventScroll: true })
  })()`)
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38 })
  await wait(async () => await currentRowNumber() === '1', 'keyboard moved the current exercise up')
  await dialogClick('변경하기')
  assert.equal(await evaluate('document.querySelectorAll("[data-filled=true]").length'), 1)
  await click('운동·세트 편집')
  await click('현재 종목 교체')
  await dialogClick('취소')
  assert.equal(await title(), longName)
  await click('현재 종목 교체')
  await choose('바벨 스쿼트')
  assert.equal(await title(), '바벨 스쿼트')
  assert.match(await evaluate(`document.querySelector('[aria-label="진행 중량"]').innerText`), /25/)
  await click('현재 종목 교체')
  await choose('랫 풀다운')
  assert.equal(await title(), '랫 풀다운')
  await has('승인 중량 없음')
  assert.equal(await evaluate(`document.querySelector('[aria-label="1세트 이번 중량"]')`), null)
  assert.match(await evaluate(`document.querySelector('[aria-label="진행 중량"]').innerText`), /—/)
  await click('중량 변경')
  await press('변경 중량')
  await dialogClick('확인')
  assert.equal(await evaluate(`document.querySelector('[aria-label="변경 중량"] > button:nth-child(2)').textContent`), '입력')
  await click('닫기', 'ariaLabel', dialog + ' button')
  const firstRepsText = () => evaluate(`document.querySelector('[aria-label="1세트 이번 반복 횟수"] > button:nth-child(2)').textContent`)
  assert.equal(await firstRepsText(), '8 회 (미정)')
  const repetitions = () => evaluate(`(() => {
    const button=document.querySelector('[aria-label="1세트 이번 반복 횟수"] > button:nth-child(2)')
    const value=button.querySelector('span')??button, unit=value.querySelector('small')
    const numberStyle=getComputedStyle(value),unitStyle=getComputedStyle(unit)
    return {font:[numberStyle.fontSize,numberStyle.fontWeight],unit:[unitStyle.fontSize,unitStyle.fontWeight],
      text:unit.textContent,color:numberStyle.color,unitColor:unitStyle.color}
  })()`)
  const suggested = await repetitions()
  assert.equal(suggested.text,' 회 (미정)')
  assert.equal(suggested.color,suggested.unitColor)
  await press('1세트 이번 반복 횟수')
  assert.equal(await evaluate(`document.querySelector('dialog[open] button[aria-pressed="true"]').textContent`), '8 회')
  await click('닫기', 'ariaLabel', dialog + ' button')
  assert.equal(await firstRepsText(), '8 회 (미정)')
  await press('1세트 이번 반복 횟수')
  await dialogClick('확인')
  assert.equal(await firstRepsText(), '8 회')
  const actual = await repetitions()
  assert.deepEqual([suggested.font,suggested.unit],[actual.font,actual.unit])
  assert.notEqual(suggested.color,actual.color)
  assert.equal(await evaluate(`document.querySelector('[aria-label="2세트 이번 반복 횟수"] > button:nth-child(2)').textContent`), '8 회 (미정)')
  await click('+ 다음 종목 추가')
  await choose('벤치 프레스')
  await click('현재 종목 제외')
  await dialogClick('종목 제외')
  await notOpen()
  await openList()
  await click('벤치 프레스', 'textContent', dialog + ' strong')
  await click('운동·세트 편집')
  await click('+ 유산소 추가')
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('dialog[open][data-editor-dialog]')).paddingBottom`), '16px')
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('dialog[open] form')).paddingBottom`), '0px')
  await dialogClick('걷기')
  await click('야외 걷기', 'textContent', dialog + ' [aria-label="표준 유산소 목록"] strong')
  const widthBeforeCardio = await evaluate('innerWidth')
  await verifyWidth(393)
  await click('추가 목표 설정', 'textContent', dialog + ' summary')
  await dialogClick('페이스 (분/km)')
  await press('목표 페이스 (분/km)')
  await dialogClick('직접 입력')
  const cardioKeyboard = await evaluate(`(async()=>{
    const dialog=document.querySelector(${JSON.stringify(dialog)}),field=dialog.querySelector('input'), vv=visualViewport;
    const page=scrollY;
    let pan=0;
    Object.defineProperty(vv,'offsetTop',{configurable:true,get:()=>pan+70});
    Object.defineProperty(vv,'pageTop',{configurable:true,get:()=>scrollY+pan});
    const resize=height=>{Object.defineProperty(vv,'height',{configurable:true,value:height});vv.dispatchEvent(new Event('resize'))};
    const settle=()=>new Promise(resolve=>setTimeout(resolve,310));
    field.focus({preventScroll:true});resize(410);await settle();
    const originalTop=dialog.getBoundingClientRect().top;
    pan=56;vv.dispatchEvent(new Event('scroll'));await settle();
    const pannedTop=dialog.getBoundingClientRect().top;
    pan=0;vv.dispatchEvent(new Event('scroll'));await settle();
    const first=field.getBoundingClientRect().bottom;
    resize(first-34);await settle();
    const result={originalTop,pannedTop,first,floor:vv.height,bottom:field.getBoundingClientRect().bottom,before:page,after:scrollY,modalScroll:dialog.scrollTop};
    dialog.scrollTop=0;
    resize(innerHeight);resize(result.floor);await settle();
    result.reopened=field.getBoundingClientRect().bottom<=vv.height+1;
    field.blur();delete vv.height;delete vv.offsetTop;delete vv.pageTop;vv.dispatchEvent(new Event('resize'));await settle();
    return result;
  })()`)
  assert.ok(cardioKeyboard.originalTop===12 && cardioKeyboard.pannedTop===68, 'modal follows the actual client viewport across pan-only events '+JSON.stringify(cardioKeyboard))
  assert.ok(cardioKeyboard.bottom<=cardioKeyboard.floor+1, 'cardio goal above the expanded keyboard '+JSON.stringify(cardioKeyboard))
  assert.ok(cardioKeyboard.modalScroll>0 && cardioKeyboard.reopened)
  assert.equal(cardioKeyboard.after,cardioKeyboard.before)
  await dialogClick('취소')
  await dialogClick('속도 (km/h)')
  await click('추가 목표 설정', 'textContent', dialog + ' summary')
  for (const width of [320, 375, 393, 430]) {
    await verifyWidth(width)
    const layout = await evaluate(`(() => {
      const modal = document.querySelector('dialog[open]')
      const card = modal.querySelector('.app-card')
      const name = card.querySelector('h3')
      const number = card.querySelector('b')
      const original = name.textContent
      name.textContent = original.repeat(30)
      const change = card.querySelector('button')
      const bounds = change.getBoundingClientRect(), title = name.getBoundingClientRect(), ordinal = number.getBoundingClientRect()
      const time = card.querySelector('button[aria-label="목표 시간 수정"]')
      const fields = time.closest('div[role]') ?? time.parentElement.parentElement.parentElement
      const result = {
        change: [change.textContent, bounds.width, bounds.height, getComputedStyle(change).borderRadius],
        number: [number.textContent, getComputedStyle(number).fontSize],
        aligned: ordinal.right <= title.left && ordinal.top < title.bottom && ordinal.bottom > title.top &&
          title.top < bounds.bottom && title.bottom > bounds.top && title.right <= bounds.left,
        ellipsis: name.scrollWidth > name.clientWidth && getComputedStyle(name).textOverflow === 'ellipsis',
        time: time.previousElementSibling.textContent,
        fits: card.scrollWidth <= card.clientWidth && modal.scrollWidth <= modal.clientWidth,
        divider: getComputedStyle(fields).borderTopWidth,
        routineActions: [...card.querySelectorAll('button')].filter(b => /위로|아래로|삭제/.test(b.textContent)).length
      }
      name.textContent = original
      return result
    })()`)
    assert.deepEqual(layout.change, ['변경', 78, 32, '999px'])
    assert.deepEqual(layout.number, ['02', '13px'])
    assert.ok(layout.aligned && layout.ellipsis && layout.fits, 'cardio modal layout at ' + width)
    assert.equal(layout.time, '00:00:00')
    assert.equal(layout.divider, '1px')
    assert.equal(layout.routineActions, 0)
  }
  await verifyWidth(widthBeforeCardio)
  await editPlanTime('2', '30')
  await press('목표 거리 수정')
  await dialogClick('직접 입력')
  await set(dialog + ' input', '0.2')
  await dialogClick('확인')
  await dialogClick('변경')
  await dialogClick('걷기')
  await click('야외 걷기', 'textContent', dialog + ' [aria-label="표준 유산소 목록"] strong')
  assert.equal(await evaluate(`document.querySelector('dialog[open] button[aria-label="목표 시간 수정"]').previousElementSibling.textContent`), '00:02:30')
  assert.match(await evaluate(`document.querySelector('dialog[open] button[aria-label="목표 거리 수정"]').previousElementSibling.textContent`), /0\.2/)
  await dialogClick('유산소 추가')
  await notOpen()

  await openList()
  await click('러닝머신', 'textContent', dialog + ' strong')
  await verifyFrameLayouts('cardio-ready')
  await verifyWidth(393)
  await click('유산소 시작')
  await verifyFrameLayouts('cardio-running')
  await delay(1200)
  await click('일시정지')
  await verifyFrameLayouts('cardio-paused')
  const paused = await timer()
  await delay(1100)
  assert.equal(await timer(), paused)
  assert.notEqual(paused, '00:00:00')
  await click('재개')
  await click('유산소 완료')
  await verifyFrameLayouts('cardio-review')
  assert.deepEqual(await evaluate('(()=>{const root=document.querySelector(".app-shell"),font=getComputedStyle(root).fontFamily;return [...root.querySelectorAll("*")].filter(e=>e.getClientRects().length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&getComputedStyle(e).fontFamily!==font).map(e=>e.textContent.slice(0,60))})()'),[],'cardio plan, goals, timer, pause and completion review fonts')
  await press('평균 심박수 (BPM)')
  await dialogClick('직접 입력'); await set('dialog[open] input', '301'); await dialogClick('확인')
  await has('평균 심박수는 20~300 BPM')
  await set('dialog[open] input', '120'); await dialogClick('확인'); await notOpen()
  await press('실제 거리 수정');await dialogClick('직접 입력');await set('dialog[open] input','0.012');await dialogClick('확인');await notOpen()
  await click('완료 취소 · 일시정지로 돌아가기')
  await click('유산소 완료')
  assert.equal(await evaluate(`document.querySelector('button[aria-label="평균 심박수 (BPM)"]').textContent.trim()`), '120 BPM')
  await press('실제 활동 시간 수정')
  assert.equal(await evaluate(`!!document.querySelector('button[aria-label="실제 활동 시간 수정"]').parentElement.querySelector('strong [data-modified]')`), false)
  await press('실제 활동 초');await dialogClick('직접 입력');await set('dialog[open] input','35');await dialogClick('확인')
  assert.equal(await evaluate(`!!document.querySelector('button[aria-label="실제 활동 시간 수정"]').parentElement.querySelector('strong [data-modified]')`), false)
  await click('시간 적용')
  assert.equal(await evaluate(`document.querySelector('button[aria-label="실제 활동 시간 수정"]').parentElement.querySelector('strong [data-modified]').textContent`),'00:00:35')
  await screenshot('cardio-review-393')
  await click('유산소 기록 확정')
  await has('실제 완료 기록')
  assert.equal(await evaluate(`document.querySelector('[aria-label="실제 완료 기록"] dd [data-modified]').textContent`),'00:00:35')
  assert.deepEqual(await evaluate('(()=>{const root=document.querySelector(".app-shell"),font=getComputedStyle(root).fontFamily;return [...root.querySelectorAll("*")].filter(e=>e.getClientRects().length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&getComputedStyle(e).fontFamily!==font).map(e=>e.textContent.slice(0,60))})()'),[],'dynamic corrected and completed activity fonts')
  await verifyFrameLayouts('cardio-completed')
  await click('유산소 완료 취소')
  await dialogClick('유산소 완료 취소 확인')
  await has('측정 일시정지')
  await click('유산소 완료')
  await click('유산소 기록 확정')

  await click('종료')
  await dialogClick('운동 종료')
  await has('운동 기록 요약')
  assert.match(await body(), /전체 운동 시간.*완료 세트.*총 \d+\/\d+세트 · 총 [\d,]+kg/s)
  assert.match(await body(), /기록 보존 안내.*합성 수행/s)
  assert.equal(await evaluate('!!document.querySelector(\'article header button[aria-label="홈으로"]\')'),true)
  assert.doesNotMatch(await body(), /운동 수행\n|기록 정정·복구 및 서버 평가 상세/)
  assert.equal(await evaluate('!!document.querySelector(\'[aria-label="웨이트 수행"]\')'),true)
  assert.equal(await evaluate('!!document.querySelector(\'[aria-label="유산소 수행"]\')'),true)
  assert.doesNotMatch(await body(), /저장 완료|서버 동기화 완료/)
  await verifyWidth(320)
  await screenshot('record-320')
  assert.equal(await evaluate(`document.querySelector('[data-workout-frame], footer')`), null)
  assert.equal(await evaluate(`document.documentElement.style.getPropertyValue('--keyboard-inset')`), '')
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('article')).paddingBottom`), '0px')
  await evaluate('window.scrollTo(0, document.documentElement.scrollHeight)')
  assert.equal(await evaluate(`(() => {
    const last = document.querySelector('article').lastElementChild.getBoundingClientRect()
    return last.bottom <= document.querySelector('nav[aria-label="기본 탐색"]').getBoundingClientRect().top - 8
  })()`), true, 'summary has only normal navigation clearance')
  const resultEntry = await evaluate('history.state.overloadNavigation.index')
  await evaluate('history.back()')
  await wait(()=>evaluate('!!document.querySelector("section[aria-label=홈]")'),'completed workout back to home')
  assert.equal(await evaluate('!!document.querySelector("[data-workout-frame]")'), false)
  assert.equal(await evaluate('history.state.overloadNavigation.index'), resultEntry - 1)
  await evaluate('history.forward()');await has('운동 기록 요약')
  assert.equal(await evaluate('history.state.overloadNavigation.index'), resultEntry)
  await click('홈으로 돌아가기');await wait(()=>evaluate('!!document.querySelector("section[aria-label=홈]")'),'finished CTA home');await click('기록', 'ariaLabel', 'nav button')
  await wait(()=>evaluate('!!document.querySelector(".recent-records .session-record-card")'),'recent record card')
  await evaluate('document.querySelector(".recent-records .session-record-card").click()')
  await has('운동 기록 상세')
  assert.equal(await evaluate('!!document.querySelector(\'[aria-label="중량 검토 카드"]\')'),false,'historical records never expose actionable weight approval')

  await click('홈', 'ariaLabel', 'nav button')
  await set(scenario, 'workout-weight')
  await click('운동 시작')
  await click('준비운동 완료')
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
  await screenshot('weight-desktop')
  await verifyFrameClearance('weight')
  for (let ordinal = 1; ordinal <= 3; ordinal++) {
    await setRep(ordinal, '12')
    await click(ordinal + '세트 완료')
    if (ordinal !== 3) await click('휴식 종료')
  }
  const recommendationBox = () => evaluate(`(() => {
    const advice = document.querySelector('[data-direction]')
    const button = document.querySelector('footer > button')
    const rect = advice.getBoundingClientRect()
    const css = getComputedStyle(advice)
    return { height: rect.height, width: rect.width, padding: css.padding,
      aligned: Math.abs(rect.width - button.getBoundingClientRect().width) < 1,
      direction: advice.dataset.direction, color: css.color }
  })()`)
  const increase = await recommendationBox()
  assert.doesNotMatch(await body(), /비교 가능한 기준이 없습니다/)
  assert.equal(increase.aligned, true)
  assert.equal(increase.direction, 'increase')
  assert.equal(increase.color, 'rgb(116, 166, 138)')
  await screenshot('feedback-increase-desktop')
  assert.match(await body(),/25kg → 30kg/)
  await press('중량 안내 숨기기')
  assert.equal(await evaluate('!!document.querySelector("footer [data-direction]")'),false)
  await evaluate('document.querySelector("[data-exercise-navigation] button:last-child").click()');await evaluate('document.querySelector("[data-exercise-navigation] button:first-child").click()')
  assert.equal(await evaluate('!!document.querySelector("footer [data-direction]")'),false,'hidden state survives exercise navigation')
  await click('다음 종목으로')
  await press('1세트 이번 반복 횟수 증가')
  assert.equal(await firstRepsText(), '9 회')
  for (let ordinal = 1; ordinal <= 3; ordinal++) {
    await setRep(ordinal, '1')
    await click(ordinal + '세트 완료')
    if (ordinal !== 3) await click('휴식 종료')
  }
  const decrease = await recommendationBox()
  assert.deepEqual([decrease.height, decrease.width, decrease.padding, decrease.aligned],
    [increase.height, increase.width, increase.padding, true])
  assert.equal(decrease.direction, 'decrease')
  assert.equal(decrease.color, 'rgb(214, 188, 101)')
  await screenshot('feedback-decrease-desktop')
  await click('운동 종료 및 요약')
  await has('전체 루틴 완료')
  assert.equal(await evaluate('!!document.querySelector("dialog[open]")'), false)
  assert.match(await body(),/중량 변경 검토 사항/,'banner dismissal leaves end review intact')
  await click('홈', 'ariaLabel', 'nav button')
  await click('운동 시작');await click('준비운동 완료')
  await has('이전 유효 기준 기록');assert.match(await body(),/25kg → 30kg/)
  assert.match(await evaluate('document.querySelector("[role=table]").parentElement.textContent'),/0\/3/)
  for(const w of [320,375,390,430]){await verifyWidth(w);await verifyFrameClearance('benchmark')}
  await click('운동 종료');await dialogClick('운동 종료');await has('운동 기록 요약');await click('홈', 'ariaLabel', 'nav button')
  await set(scenario, 'workout-edited')
  await has('진행 중인 운동')
  assert(await evaluate(`(() => {
    const card = document.querySelector('[aria-label="진행 중인 운동"]')
    const { top, bottom } = card.getBoundingClientRect()
    const resume = card.lastElementChild
    return resume.textContent === '운동 이어가기' &&
      Math.abs(card.firstElementChild.getBoundingClientRect().top - top - 17) <= 1 &&
      Math.abs(bottom - resume.getBoundingClientRect().bottom - 17) <= 1
  })()`))
  await click('운동 이어가기')
  await has('승인 중량 25 kg · 오늘만 적용')
  assert.equal(await rowContains(1, '원판식'), false)
  assert.match(await body(), /해머 스트렝스/)
  await openList()
  await click('러닝머신', 'textContent', dialog + ' strong')
  await click('‹ 홈')
  await click('검토 초기화')
  await set(scenario, 'workout-rest-day')
  assert.equal(await evaluate(`!!document.querySelector('[aria-label="홈"] [data-click-action="start"]')`), false)
  await has('정해진 휴식일입니다. 다른 루틴을 선택할 수 있습니다.')
  await set(scenario, 'active')
  await click('운동 시작')
  await click('준비운동 완료')
  await has('디로딩 목표 15kg · 원본 목표 25kg')
  await click('중량 변경')
  assert.equal(await evaluate('document.querySelectorAll("dialog[open] input[type=radio]")[1].disabled'), true)
  await dialogClick('취소')
  await click('운동 종료')
  await has('운동 기록 요약')
  assert.doesNotMatch(await body(), /중량 변경 검토 사항|디로딩 운동 · 검토 제외/)
  assert.equal(await evaluate('!!document.querySelector(\'[aria-label="웨이트 수행"]\')'),true)

  await click('홈', 'ariaLabel', 'nav button')
  await set(scenario, 'workout-weight')
  await click('운동 시작')
  await click('준비운동 완료')
  await click('운동·세트 편집')
  const openCardio = async (number, type, name) => {
    await click('+ 유산소 추가')
    await dialogClick(type)
    await click(name, 'textContent', dialog + ' [aria-label="표준 유산소 목록"] strong')
    assert.equal(await evaluate("document.querySelector('dialog[open] .app-card b').textContent"), number)
  }
  const saveCardio = async () => {
    await editPlanTime('2')
    await dialogClick('유산소 추가')
    await notOpen()
  }
  const cardioNames = () => evaluate(`[...document.querySelectorAll('dialog[open] [data-order-group="cardio"] strong')].map(name => name.textContent)`)
  await openCardio('01', '달리기', '러닝머신')
  await saveCardio()
  await openCardio('02', '걷기', '야외 걷기')
  await saveCardio()
  await openCardio('03', '사이클', '실내 사이클')
  await dialogClick('취소')
  await openList()
  assert.deepEqual(await cardioNames(), ['러닝머신', '야외 걷기'])
  await dialogClick('목록 닫기')
  await openCardio('03', '사이클', '실내 사이클')
  await saveCardio()
  await openList()
  assert.deepEqual(await cardioNames(), ['러닝머신', '야외 걷기', '실내 사이클'])
  await drag(2, 0, { rows: '[data-order-group="cardio"] [data-workout-row]', handle: 'button[aria-describedby]' })
  await dialogClick('변경하기')
  await openList()
  assert.deepEqual(await cardioNames(), ['실내 사이클', '러닝머신', '야외 걷기'])
  await click('러닝머신', 'textContent', dialog + ' strong')
  await click('운동·세트 편집')
  await click('현재 종목 제외')
  await dialogClick('종목 제외')
  await notOpen()
  await click('운동·세트 편집')
  await openCardio('03', '달리기', '러닝머신')
  await saveCardio()
  await openList()
  assert.deepEqual(await cardioNames(), ['실내 사이클', '야외 걷기', '러닝머신'])
  await dialogClick('목록 닫기')

  assert.deepEqual(await evaluate('window.reviewStorage'), [])
  if (process.env.OVERLOAD_WORKOUT_SCREENSHOTS) await writeFile('logs/workout-review/final-layout-metrics.json', JSON.stringify(layoutMeasurements, null, 2))
}
