import assert from 'node:assert/strict'

export async function verifyRestAlerts({ send, evaluate, wait, click, set, body, verifyWidth, screenshot }) {
  const motion = value => send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value }] })
  await motion('no-preference')
  const press = label => click(label, 'ariaLabel')
  const page = 'section[aria-label="휴식 타이머 알림"]'
  const heads = title => evaluate(`document.querySelector(${JSON.stringify(`[role="switch"][aria-label="${title}"]`)}).getAttribute('aria-checked')`)
  const mock = '[aria-label="미리보기"]'
  const left = async label => wait(async () => (await body()).includes(label), label)
  const advance = async ms => { await evaluate(`window.restAlertTimeOffset += ${ms}`) }
  const dimColor = () => evaluate(`getComputedStyle(document.querySelector('[data-rest-countdown] > strong')).color`)
  const flashState = () => evaluate(`(() => { const preview = document.querySelector('${mock}'); return [...preview.querySelectorAll('div')].filter(e=>['상단','하단'].some(label=>e.firstElementChild?.textContent===label)).map(e=>[e.hasAttribute('data-muted'),!!e.querySelector('[data-flash]')]); })()`)
  const flashed = expected => wait(async () => JSON.stringify(await flashState()) === JSON.stringify(expected), 'selected flash surfaces')
  const tones = () => evaluate('window.reviewTones')
  const cancellations = () => evaluate('window.reviewToneCancels')
  const clickPreview = () => click('알림 미리보기')
  const icon = title => evaluate(`(() => {
    const svg = document.querySelector(${JSON.stringify(`section[aria-label="${title} 설정"] h2 svg`)});
    return { shape: svg.querySelector('path').getAttribute('d'), color: getComputedStyle(svg).color };
  })()`)
  const changedIcon = async (title, before) => {
    const after = await icon(title)
    assert.notEqual(after.shape, before.shape, `${title} changes shape`)
    assert.notEqual(after.color, before.color, `${title} changes color`)
  }
  const sampleButton = (title, playing = false) => `[aria-label="${title} 미리듣기${playing ? ' 중지' : ''}"]`
  const waitSample = (title, playing) => wait(() => evaluate(`document.querySelector(${JSON.stringify(sampleButton(title, playing))})?.querySelector('path').getAttribute('d') === ${JSON.stringify(playing ? 'M9 6v12m6-12v12' : 'm9 6 9 6-9 6Z')}`), `${title} ${playing ? 'playing' : 'ready'}`)
  const observeSampleStart = title => evaluate(`(() => {
    window.reviewSampleGlyph = null;
    const observer = new MutationObserver(() => {
      const glyph = document.querySelector(${JSON.stringify(sampleButton(title, true))})?.querySelector('path').getAttribute('d');
      if (glyph) { window.reviewSampleGlyph = glyph; observer.disconnect(); }
    });
    observer.observe(document.body, {subtree:true, attributes:true, attributeFilter:['aria-label']});
  })()`)
  const actWhilePlaying = (title, nextSelector) => evaluate(`new Promise(resolve => {
    const active = ${JSON.stringify(sampleButton(title, true))};
    const next = ${JSON.stringify(nextSelector)};
    const act = () => {
      if (!document.querySelector(active)) return;
      observer.disconnect();
      document.querySelector(next).click();
      resolve(true);
    };
    const observer = new MutationObserver(act);
    observer.observe(document.body, {subtree:true, attributes:true, attributeFilter:['aria-label']});
    document.querySelector(${JSON.stringify(sampleButton(title))}).click();
    setTimeout(() => { observer.disconnect(); resolve(false); }, 2000);
  })`)
  const listen = async label => {
    const point = await evaluate(`(() => {
      const button=document.querySelector(${JSON.stringify(`button[aria-label="${label}"]`)});
      button.scrollIntoView({block:'center'});
      const r=button.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};
    })()`)
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
  }

  assert.equal(await heads('화면 깜빡임'), 'true')
  const dimOff = await icon('화면 어둡게'), flashOn = await icon('화면 깜빡임')
  await press('화면 어둡게')
  assert.equal(await heads('화면 깜빡임'), 'false')
  await changedIcon('화면 어둡게', dimOff); await changedIcon('화면 깜빡임', flashOn)
  await press('화면 깜빡임')
  assert.equal(await heads('화면 어둡게'), 'false')
  assert.deepEqual(await icon('화면 어둡게'), dimOff)
  assert.deepEqual(await icon('화면 깜빡임'), flashOn)
  await set(`${page} input[type=range]`, '35')
  await left('35%')
  assert.deepEqual(await evaluate(`(()=>{const e=document.querySelector('${page} input[type=range]');return [e.getAttribute('aria-valuetext'),getComputedStyle(e).getPropertyValue('--volume').trim()]})()`), ['35%', '0.35'])
  await observeSampleStart('효과음'); await listen('효과음 미리듣기')
  await wait(async () => await tones() === 1, 'single rest tone')
  await wait(() => evaluate(`window.reviewSampleGlyph === 'M9 6v12m6-12v12'`), 'single tone shows stop glyph')
  await waitSample('효과음', false)
  assert.ok(Math.abs(await evaluate('window.reviewToneGain[0]') - 0.065) < 0.001)
  const middleOff = await icon('중간 알림음')
  await press('중간 알림음')
  await click('20초 전')
  await changedIcon('중간 알림음', middleOff)
  await listen('중간 알림음 미리듣기')
  await wait(async () => await tones() === 4, 'three-beep midpoint sample')
  await waitSample('중간 알림음', true)
  await waitSample('중간 알림음', false)
  assert.deepEqual(await evaluate('window.reviewEndedWhilePlaying.slice(1,3)'), [['중간 알림음 미리듣기 중지'], ['중간 알림음 미리듣기 중지']])
  const gaps = await evaluate('window.reviewToneStarts.slice(1).slice(1).map((time,i)=>time-window.reviewToneStarts[i+1])')
  assert.equal(gaps.length, 2)
  assert.ok(gaps.every(gap => Math.abs(gap - .22) < .02))
  let stopped = await cancellations()
  assert.ok(await actWhilePlaying('중간 알림음', sampleButton('중간 알림음', true)))
  await waitSample('중간 알림음', false)
  assert.ok(await cancellations() >= stopped + 2, 'repeat click cancels scheduled remainder')
  assert.equal(await evaluate('window.reviewLiveTones()'), 0)
  stopped = await cancellations()
  const beforeSwitch = await tones()
  assert.ok(await actWhilePlaying('중간 알림음', sampleButton('효과음')))
  await wait(async () => await tones() === beforeSwitch + 4, 'restart with the other sample')
  assert.ok(await cancellations() >= stopped + 2, 'another sample cancels the former one')
  assert.ok(await evaluate('window.reviewLiveTones()') <= 1)
  await waitSample('효과음', false)
  const beforeRapid = await tones()
  await evaluate(`(() => { const button=document.querySelector(${JSON.stringify(sampleButton('중간 알림음'))}); button.click(); button.click(); button.click(); })()`)
  await wait(async () => await tones() === beforeRapid + 3, 'rapid clicks start only one batch')
  await waitSample('중간 알림음', true)
  await waitSample('중간 알림음', false)
  stopped = await cancellations()
  assert.ok(await actWhilePlaying('중간 알림음', `${page} [aria-label="설정으로"]`))
  await wait(() => evaluate(`!document.querySelector('${page}') && window.reviewLiveTones() === 0`), 'leaving cancels the sample')
  assert.ok(await cancellations() >= stopped + 2)
  await click('휴식 타이머 알림', 'textContent', 'button strong')
  const soundOn = await icon('효과음')
  await press('효과음')
  await changedIcon('효과음', soundOn)
  assert.equal(await heads('중간 알림음'), 'true')
  assert.ok(await evaluate(`!!document.querySelector('${page} input[type=range]')`))
  await press('중간 알림음')
  assert.ok(!await evaluate(`document.querySelector('${page} input[type=range]')`))
  await press('중간 알림음')
  await press('효과음')
  assert.deepEqual(await icon('효과음'), soundOn)
  assert.equal(await heads('중간 알림음'), 'true')
  await left('35%')

  for (const width of [320, 375, 393, 430, 1280]) {
    await verifyWidth(width)
    assert.ok(await evaluate(`(() => {
      const cards=[...document.querySelectorAll('[aria-label="알림 표시 위치"] button')].map(e=>e.getBoundingClientRect());
      const slots=[...document.querySelectorAll('${mock} [class*="previewSurface"]')].map(e=>e.getBoundingClientRect());
      const paired = boxes => boxes.length === 2 && Math.abs(boxes[0].top-boxes[1].top)<1 && Math.abs(boxes[0].height-boxes[1].height)<1 && boxes[0].right<boxes[1].left;
      return paired(cards) && paired(slots);
    })()`), `side-by-side locations and preview at ${width}px`)
  }
  await verifyWidth(393)
  await flashed([[false, false], [false, false]])
  await evaluate('window.scrollTo(0, 0)')
  await screenshot('rest-alert-settings-393')
  await press('하단 휴식 영역')
  await click('3초 전'); await clickPreview(); await left('종료까지 12초')
  await flashed([[false, false], [true, false]])
  await wait(() => evaluate(`document.querySelector('${mock}').getBoundingClientRect().bottom <= document.querySelector('nav[aria-label="기본 탐색"]').getBoundingClientRect().top`), 'inline preview clears fixed navigation')
  await advance(9100); await flashed([[false, true], [true, false]])
  await wait(() => evaluate(`document.querySelector('${mock} [data-flash]')?.getAnimations().length > 0`), 'active flash animation')
  assert.ok(await evaluate(`(() => {
    const node=document.querySelector('${mock} [data-flash]'), animation=node.getAnimations()[0]; animation.pause();
    animation.currentTime=0; const bright=getComputedStyle(node).backgroundColor;
    animation.currentTime=450; const normal=getComputedStyle(node).backgroundColor; return bright!==normal;
  })()`), 'rendered top flash changes the displayed color')
  await motion('reduce')
  assert.deepEqual(await evaluate(`(()=>{const style=getComputedStyle(document.querySelector('${mock} [data-flash]'));return [style.animationName,style.outlineStyle]})()`), ['none', 'solid'])
  await motion('no-preference')
  await clickPreview()
  await flashed([[false, false], [true, false]])

  await press('상단 상태 영역'); await press('하단 휴식 영역')
  await click('5초 전'); await clickPreview(); await left('종료까지 12초')
  await advance(7100); await flashed([[true, false], [false, true]])
  await clickPreview()
  await press('상단 상태 영역')
  await click('10초 전'); await clickPreview(); await left('종료까지 12초')
  await advance(2100); await flashed([[false, true], [false, true]])
  await screenshot('rest-alert-flash-393')
  await clickPreview()
  await press('상단 상태 영역'); await press('하단 휴식 영역')
  await clickPreview(); await left('종료까지 12초')
  await advance(2100); await flashed([[true, false], [true, false]])
  await clickPreview()

  await press('화면 어둡게'); await clickPreview()
  await wait(() => evaluate('document.querySelector("dialog[open] [data-rest-countdown] strong")?.textContent === "12초"'), 'dim preview starts at 12s')
  const normalColor = await dimColor()
  assert.ok(!await evaluate(`document.querySelector('dialog[open]').textContent.includes('+30초') || document.querySelector('dialog[open]').textContent.includes('휴식 종료')`))
  await advance(2100)
  await wait(() => evaluate('document.querySelector("dialog[open] [data-rest-countdown][data-warning] strong")?.textContent === "10초"'), 'dim preview turns yellow at 10s')
  assert.notEqual(await dimColor(), normalColor)
  await screenshot('rest-alert-dim-preview-393')
  await clickPreview()
  await wait(() => evaluate('!document.querySelector("dialog[open]")'), 'dim preview closes')
  const trialTones = await tones()
  await clickPreview()
  await advance(2100)
  await wait(async () => await tones() === trialTones + 3, 'full preview plays the three-beep middle alert at ten seconds')
  await advance(5100)
  await wait(async () => await tones() === trialTones + 4, 'full preview plays the countdown tone at five seconds')
  await advance(5500)
  await wait(() => evaluate('!document.querySelector("dialog[open]")'), 'dim preview ends automatically')
  assert.equal(await tones(), trialTones + 4)
  await left('시연 완료')

  await press('설정으로'); await click('휴식 타이머 알림', 'textContent', 'button strong')
  assert.equal(await heads('화면 어둡게'), 'true')
  assert.equal(await heads('중간 알림음'), 'true')
  await left('35%')
  await click('홈', 'ariaLabel', 'nav button')
  await click('운동 시작'); await click('준비운동 완료'); await click('1세트 완료')
  await wait(() => evaluate('!!document.querySelector("[data-workout-frame] [data-rest-countdown]")'), 'workout uses the same dim preference')
  await advance(2100)
  await wait(() => evaluate('!!document.querySelector("[data-workout-frame] [data-rest-countdown][data-warning]")'), 'workout countdown turns yellow')
  await wait(async () => await tones() === trialTones + 4, 'real rest plays its three-beep midpoint at 10 seconds')
  assert.ok((await evaluate('window.reviewToneGain.slice(-3)')).every(gain => Math.abs(gain - 0.065) < 0.001))
  await wait(() => evaluate(`(() => {
    const frame=document.querySelector('[data-workout-frame]'), overlay=frame.querySelector('[data-rest-countdown]').parentElement, footer=frame.querySelector('footer');
    return !overlay.querySelector('button') && Math.abs(overlay.getBoundingClientRect().bottom-footer.getBoundingClientRect().top)<1
      && [...footer.querySelectorAll('button')].every(b=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))});
  })()`), 'dim layer clears both real footer controls after the footer is measured')
  await screenshot('rest-alert-dim-workout-393')
  await click('+30초')
  await wait(() => evaluate('!document.querySelector("[data-workout-frame] [data-rest-countdown]")'), 'extension removes the dim layer')
  await advance(30000)
  await wait(() => evaluate('!!document.querySelector("[data-workout-frame] [data-rest-countdown]")'), 'dim reappears before natural end')
  await click('휴식 종료')
  await wait(() => evaluate('!document.querySelector("[data-workout-frame] [data-rest-countdown]")'), 'manual end removes dim layer')
  assert.equal(await tones(), trialTones + 4)
  await send('Emulation.setEmulatedMedia', { features: [] })
}
