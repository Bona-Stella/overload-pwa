import assert from 'node:assert/strict'

const widths = [320, 375, 393, 430, 1280]

export async function checkControlFoundation({ click, evaluate, send, waitFor, modalClosed, capture }) {
  const dimensions = []
  const press = async (key, windowsVirtualKeyCode) => {
    const event = { key, code: key, windowsVirtualKeyCode }
    await send('Input.dispatchKeyEvent', { ...event, type: 'rawKeyDown' })
    await send('Input.dispatchKeyEvent', { ...event, type: 'keyUp' })
  }
  const selector = 'dialog[open] button[aria-pressed="true"]'
  const dialog = 'dialog[open] button'
  const open = async label => {
    await click(label)
    await waitFor(() => evaluate('!!document.querySelector("[data-wheel-selection]")'), label)
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
  }
  const selected = () => evaluate(`document.querySelector(${JSON.stringify(selector)})?.innerText.trim()`)

  for (const width of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 852, deviceScaleFactor: 1, mobile: width < 500 })
    await send('Emulation.setTouchEmulationEnabled', { enabled: width < 500, maxTouchPoints: 1 })
    await evaluate(`document.querySelector('[data-control-example="fields"] input[type="search"]').click()`)
    await waitFor(() => evaluate(`!!document.querySelector('[aria-label="운동 부위 필터"]')`), 'search filters open')
    const searchOpen = await evaluate(`(() => {
      const card = document.querySelector('[data-control-example="fields"]');
      const close = card.querySelector('.search-disclosure');
      return { closeRadius: getComputedStyle(close).borderRadius,
        filters: [...card.querySelectorAll('[aria-label="운동 부위 필터"] button')].map(button => {
          const surface = button.firstElementChild;
          return { hit: button.getBoundingClientRect().height, height: surface.getBoundingClientRect().height,
            radius: getComputedStyle(surface).borderRadius };
        }) };
    })()`)
    await evaluate(`document.querySelector('[data-control-example="fields"] .search-disclosure').click()`)
    await waitFor(() => evaluate(`!document.querySelector('[aria-label="운동 부위 필터"]')`), 'search filters close')
    if (width === 393) {
      const point = await evaluate(`(() => {
        const button = document.querySelector('button[aria-label="본세트"]')
        button.scrollIntoView({ block: 'center' })
        const r = button.getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      })()`)
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await waitFor(() => evaluate('!!document.querySelector("[data-wheel-selection]")'), 'touch opens the set wheel')
    } else await open('본세트')
    const sample = await evaluate(`(() => {
      const read = e => {
        const r = e.getBoundingClientRect(), s = getComputedStyle(e);
        return { width: r.width, height: r.height, radius: s.borderRadius, border: s.borderTopWidth,
          padding: [s.paddingLeft, s.paddingRight], background: s.backgroundColor, top: r.top };
      };
      const actions = document.querySelector('[data-control-example="actions"]');
      const weight = document.querySelector('[data-control-example="weights"]');
      const rest = document.querySelector('[data-control-example="rest-four"] dl');
      const fieldCard = document.querySelector('[data-control-example="fields"]');
      const wheel = document.querySelector('dialog[open]');
      const segment = document.querySelector('[data-control-example="selection"] [aria-pressed="true"]').parentElement;
      const weightControls = [...weight.querySelectorAll('button')].filter(button => !button.closest('dialog'));
      return { width: innerWidth, pageWidth: document.documentElement.scrollWidth,
        ordinary: [...actions.querySelectorAll('.row button')].map(read),
        compact: [read(actions.querySelector('[data-button-size="compact"]')), read(actions.querySelector('[data-compact-surface]'))],
        targets: weightControls.slice(0,3).map(read),
        weight: weightControls.slice(3,6).map(read),
        back: read(document.querySelector('button[aria-label="공통 UI Preview"]')),
        period: [...document.querySelectorAll('[data-control-example="selection"] .record-period-row button')].map(read),
        fields: [...fieldCard.querySelectorAll('input:not([type="search"])')].map(read),
        search: read(fieldCard.querySelector('input[type="search"]')),
        searchButton: read(fieldCard.querySelector('.search-disclosure')),
        segment: [read(segment), ...[...segment.children].map(read)],
        rest: [...rest.children].map(read),
        wheel: read(wheel), selection: read(wheel.querySelector('[data-wheel-selection]')),
        actions: [...wheel.querySelectorAll('button[data-action-shape="pill"]')].map(read) };
    })()`)
    assert.equal(sample.width, width)
    assert.ok(sample.pageWidth <= width)
    assert.ok(sample.ordinary.every(action => action.height === 48 && action.radius === '999px' && action.padding.join() === '16px,16px'), JSON.stringify(sample.ordinary))
    assert.deepEqual(sample.compact.map(({ height }) => height), [48, 30])
    assert.ok([...sample.targets, ...sample.weight].every(({ height, border, background }) => height === 48 && border === '0px' && background === 'rgba(0, 0, 0, 0)'), JSON.stringify({ targets: sample.targets, weight: sample.weight }))
    assert.ok(sample.targets.every(({ width }) => Math.abs(width - sample.targets[0].width) < .1))
    assert.equal(sample.search.height, 44)
    assert.equal(sample.search.radius, '999px')
    assert.equal(sample.searchButton.radius, '50%')
    assert.equal(searchOpen.closeRadius, '50%')
    assert.equal(sample.fields.length, 2)
    assert.ok(sample.fields.every(({ height, radius, padding }) => height === 48 && radius === '5px' && padding[0] === '12px'))
    assert.ok(sample.period.every(({ width, height, radius }) => width === 44 && height === 44 && radius === '5px'))
    assert.ok(sample.back.height >= 44 && sample.back.width >= 44 && sample.back.border === '0px')
    assert.equal(searchOpen.filters.length, 3)
    assert.ok(searchOpen.filters.every(({ hit, height, radius }) => hit >= 44 && height === 36 && radius === '999px'))
    assert.ok(sample.segment.every(({ height, radius }) => height === 48 && radius === '999px'))
    assert.equal(sample.rest.length, 4)
    assert.equal(new Set(sample.rest.map(({ top }) => top)).size, 1)
    assert.deepEqual([sample.wheel.radius, sample.selection.height, sample.selection.border], ['5px', 52, '0px'])
    assert.equal(sample.actions.length, 2)
    assert.ok(sample.actions.every(action => action.height === 48 && action.radius === '999px' && action.width === sample.actions[0].width))
    dimensions.push({ ...sample, searchOpen })
    if (width === 393) await capture('5-3-wheel-393', 'dialog[open]')
    await press('Escape', 27)
    await modalClosed()
    if (width === 393) await capture('5-3-controls-393', '[data-control-example="weights"]')
    if (width === 320) await capture('5-3-rest-four-320', '[data-control-example="rest-four"]')
  }

  await open('본세트')
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  for (let index = 0; index < 65; index++) await press('ArrowDown', 40)
  assert.equal(await selected(), '68 세트')
  assert.equal(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(selector)})`), true)
  const tabStops = 'dialog[open] button[aria-pressed][tabindex="0"]'
  assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(tabStops)}).length`), 1)
  assert.ok(await evaluate('document.querySelectorAll("dialog[open] button[aria-pressed]").length <= 61'))
  await press('Escape', 27)
  await modalClosed()
  assert.match(await evaluate('document.activeElement.textContent'), /^3/)

  await open('본세트')
  const point = await evaluate(`(() => {
    const r = document.querySelector('[data-wheel-selection]').getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })()`)
  for (let index = 0; index < 5; index++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', ...point, deltaX: 0, deltaY: 572 })
    await new Promise(resolve => setTimeout(resolve, 160))
  }
  const scrolled = Number.parseInt(await selected(), 10)
  assert.ok(scrolled > 33, `mouse scrolled beyond the initial seed range to ${scrolled}`)
  await press('Escape', 27)
  await modalClosed()

  await open('원판식 중량')
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  await press('ArrowDown', 40)
  assert.equal(await selected(), '54.8 kg')
  await click('확인', dialog)
  await modalClosed()
  await click('원판식 중량 증가')
  assert.match(await evaluate('document.querySelector(\'button[aria-label="원판식 중량"]\').textContent'), /57\.3/)

  await open('덤벨 중량')
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  await press('ArrowDown', 40)
  assert.equal(await selected(), '13.3 kg')
  await press('Escape', 27)
  await modalClosed()
  await click('덤벨 중량 증가')
  assert.match(await evaluate('document.querySelector(\'button[aria-label="덤벨 중량"]\').textContent'), /13\.3/)

  const goalValue = label => evaluate(`document.querySelector('button[aria-label="${label} 수정"]').previousElementSibling.textContent`)
  const directDraft = () => evaluate(`document.querySelector('dialog[open] input').value`)
  const direct = async value => {
    await click('직접 입력', dialog)
    await evaluate(`(() => {
      const input = document.querySelector('dialog[open] input');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`)
    await click('확인', dialog)
  }

  await open('목표 거리 수정')
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  for (let index = 0; index < 10; index++) await press('ArrowDown', 40)
  assert.equal(await selected(), '6.1 km')
  await press('Escape', 27)
  await modalClosed()
  assert.equal(await goalValue('목표 거리'), '5.1 km')
  await open('목표 거리 수정')
  await click('확인', dialog)
  await modalClosed()
  assert.equal(await goalValue('목표 거리'), '5.1 km')
  await open('목표 거리 수정')
  await click('직접 입력', dialog)
  assert.equal(await directDraft(), '5.123', 'an untouched rounded selection does not overwrite precise data')
  await evaluate(`(() => {
    const input = document.querySelector('dialog[open] input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '0'); input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
  await click('확인', dialog)
  assert.match(await evaluate('document.querySelector("dialog[open] [role=alert]").textContent'), /0\.001~1000/)
  await evaluate(`(() => {
    const input = document.querySelector('dialog[open] input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, ''); input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
  await click('확인', dialog)
  await modalClosed()
  assert.equal(await goalValue('목표 거리'), '0.0 km')
  await open('목표 거리 수정')
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  for (const expected of ['0.1 km','0.2 km','0.3 km']) {
    await press('ArrowDown', 40)
    assert.equal(await selected(), expected)
  }
  await click('확인', dialog)
  await modalClosed()
  assert.equal(await goalValue('목표 거리'), '0.3 km')
  await open('목표 거리 수정')
  await direct('5.123456')
  await modalClosed()
  assert.equal(await goalValue('목표 거리'), '5.1 km')
  await open('목표 거리 수정')
  await click('직접 입력', dialog)
  assert.equal(await directDraft(), '5.123456')
  await press('Escape', 27)
  await modalClosed()
  await open('목표 거리 수정')
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  await press('Home', 36)
  assert.equal(await selected(), '2.1 km')
  await press('Escape', 27)
  await modalClosed()

  await open('목표 속도 (km/h)')
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  await press('ArrowDown', 40)
  assert.equal(await selected(), '8.2 km/h')
  await click('확인', dialog)
  await modalClosed()

  assert.equal(await goalValue('목표 시간'), '00:02:30')
  assert.equal(await evaluate(`!!document.querySelector('button[aria-label="목표 시간 (초)"]')`), false)
  await click('목표 시간 수정')
  await open('목표 시간 (초)')
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  await press('ArrowDown', 40)
  assert.equal(await selected(), '31 초')
  await click('확인', dialog)
  await modalClosed()
  assert.equal(await goalValue('목표 시간'), '00:02:30')
  await click('시간 수정 취소')
  await click('목표 시간 수정')
  await open('목표 시간 (초)')
  assert.equal(await selected(), '30 초')
  await direct('31')
  await modalClosed()
  await click('시간 적용')
  assert.equal(await goalValue('목표 시간'), '00:02:31')
  const focusSelection = () => evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`)
  const goalCard = '[data-control-example="cardio"]'
  const goalButton = label => `button[aria-label="${label}"]`
  const valueOf = label => evaluate(`document.querySelector(${JSON.stringify(goalButton(label))}).textContent.trim()`)
  const startPace = async () => { await open('목표 페이스 (분/km)'); await focusSelection() }
  const geometry = []
  for (const width of widths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 852, deviceScaleFactor: 1, mobile: width < 500 })
    await click('목표 시간 수정', goalCard + ' button')
    const layout = await evaluate(`(() => {
      const base = document.querySelector('[data-control-example="cardio"]');
      const speed = base.querySelector('[aria-label="목표 속도 (km/h)"] > button');
      const incline = base.querySelector('[aria-label="목표 경사도 (%)"] > button');
      const group = base.querySelector('[aria-label="강도 단위"]');
      const r = e => e.getBoundingClientRect();
      const present = e => {
        const s=getComputedStyle(e), b=r(e), range=document.createRange();range.selectNodeContents(e);
        const text=range.getBoundingClientRect();
        return {box:[b.x,b.y,b.width,b.height], svg:e.querySelectorAll('svg').length, text:[text.width,text.height],
          centered:Math.abs(text.left+text.width/2-b.left-b.width/2)<1, padding:s.paddingInline, wraps: e.scrollWidth>e.clientWidth,
          line:s.lineHeight,border:s.borderTopWidth,background:s.backgroundColor,radius:s.borderRadius};
      };
      const buttons = labels => labels.map(label=>present(document.querySelector('button[aria-label="'+label+'"]')));
      return {width:innerWidth,pageWidth:document.documentElement.scrollWidth,
        targets:buttons(['본세트','최소 반복','최대 반복','덤벨 중량']),
        time:buttons(['목표 시간 (시)','목표 시간 (분)','목표 시간 (초)']),
        distance:[r(base.querySelector('button[aria-label="목표 거리 수정"]').parentElement).width, r(base.querySelector('button[aria-label="목표 시간 수정"]').parentElement).width],
        extra:[present(speed),present(incline)],labels:[speed,incline].map(b=>b.parentElement.previousElementSibling.textContent),
        tabs:[...group.children].map(e=>({label:e.textContent,pressed:e.ariaPressed,...present(e)})),
        trackRadius:getComputedStyle(group).borderRadius,highlight:r(group).height-parseFloat(getComputedStyle(group,'::before').top)-parseFloat(getComputedStyle(group,'::before').bottom)};
    })()`)
    assert.equal(layout.width, width)
    assert.ok(layout.pageWidth <= width)
    assert.ok([...layout.targets,...layout.time,...layout.extra].every(x=>x.box[3]===48 && x.svg===0 && x.centered && !x.wraps && x.border==='0px' && x.background==='rgba(0, 0, 0, 0)'), JSON.stringify(layout))
    assert.equal(layout.distance[0],layout.distance[1])
    assert.equal(layout.extra[0].box[1],layout.extra[1].box[1])
    assert.ok(Math.abs(layout.extra[0].box[2]-layout.extra[1].box[2])<.1)
    assert.deepEqual(layout.labels,['목표 속도 · 선택','목표 경사도 · 선택'])
    assert.deepEqual(layout.tabs.map(x=>x.label),['속도 (km/h)','페이스 (분/km)'])
    assert.deepEqual(layout.tabs.map(x=>x.pressed),['true','false'])
    assert.ok(layout.tabs.every(x=>x.box[3]===48 && !x.wraps && x.centered && x.radius==='999px' && x.text[1]<24))
    assert.ok(Math.abs(layout.tabs[0].box[2]-layout.tabs[1].box[2])<.1)
    assert.equal(layout.trackRadius,'999px')
    assert.equal(layout.highlight,40)
    geometry.push(layout)
    await click('시간 수정 취소', goalCard+' button')
    if (width === 320 || width === 393) await capture(`speed-layout-${width}`,goalCard)
  }
  await send('Emulation.setDeviceMetricsOverride', {width:393,height:852,deviceScaleFactor:1,mobile:true})
  await click('페이스 (분/km)', goalCard+' button')
  assert.equal(await evaluate(`!!document.querySelector('${goalButton('목표 속도 (km/h)')}')`),false)
  assert.equal(await valueOf('목표 페이스 (분/km)'), '7:19 분/km', '8.2 km/h converts using the existing policy')
  await click('속도 (km/h)', goalCard+' button')
  assert.equal(await valueOf('목표 속도 (km/h)'), '8.2 km/h')
  await click('페이스 (분/km)', goalCard+' button')
  await startPace(); await direct('6:45'); await modalClosed()
  await capture('pace-layout-393',goalCard)
  await startPace()
  const forward = [await selected()]
  for (let index=0; index<3; index++) { await press('ArrowDown',40); forward.push(await selected()) }
  assert.deepEqual(forward,['6:45 분/km','6:50 분/km','6:55 분/km','7:00 분/km'])
  await capture('pace-boundary-393','dialog[open]')
  const reverse = []
  for (let index=0; index<2; index++) { await press('ArrowUp',38); reverse.push(await selected()) }
  assert.deepEqual(reverse,['6:55 분/km','6:50 분/km'])
  assert.equal(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(selector)})`),true)
  await press('Escape',27); await modalClosed()
  assert.equal(await valueOf('목표 페이스 (분/km)'),'6:45 분/km')
  assert.equal(await evaluate('document.activeElement.ariaLabel'),'목표 페이스 (분/km)')
  await startPace(); await direct('6.512345'); await modalClosed()
  await startPace(); await click('확인',dialog); await modalClosed()
  await startPace(); await click('직접 입력',dialog)
  assert.equal(await directDraft(),'6.512345')
  await press('Escape',27); await modalClosed()
  await startPace(); await direct(''); await modalClosed()
  assert.equal(await valueOf('목표 페이스 (분/km)'),'0:00 분/km')
  assert.equal(await evaluate(`document.querySelector('${goalButton('목표 페이스 (분/km)')}').dataset.wheelEmpty`),'true')
  await startPace()
  const mousePoint = await evaluate(`(() => {const r = document.querySelector('[data-wheel-selection]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  for (let index=0; index<5; index++) {
    await send('Input.dispatchMouseEvent',{type:'mouseWheel',...mousePoint,deltaX:0,deltaY:624})
    await new Promise(resolve=>setTimeout(resolve,130))
  }
  const paceAfterScroll = await selected()
  assert.ok(Number(paceAfterScroll.split(':')[0])>=3, paceAfterScroll)
  assert.ok(await evaluate(`document.querySelectorAll('dialog[open] button[aria-pressed]').length <= 61`))
  await press('Escape',27); await modalClosed()

  const incline = '목표 경사도 (%)'
  assert.equal(await valueOf(incline),'0.0 %')
  assert.equal(await evaluate(`document.querySelector('${goalButton(incline)}').dataset.wheelEmpty`),'true')
  await open(incline); await click('0.0 %',dialog); await click('확인',dialog); await modalClosed()
  assert.equal(await evaluate(`document.querySelector('${goalButton(incline)}').hasAttribute('data-wheel-empty')`),false)
  await open(incline); await direct('3.512345'); await modalClosed()
  await open(incline); await focusSelection(); await press('ArrowDown',40)
  assert.equal(await selected(),'3.6 %'); await press('ArrowUp',38); assert.equal(await selected(),'3.5 %')
  await capture('incline-wheel-393','dialog[open]')
  await press('Escape',27); await modalClosed()
  assert.equal(await valueOf(incline),'3.5 %')
  await open(incline); await click('확인',dialog); await modalClosed()
  await open(incline); await click('직접 입력',dialog)
  assert.equal(await directDraft(),'3.512345')
  await press('Escape',27); await modalClosed()
  await open(incline); await direct(''); await modalClosed()
  assert.equal(await evaluate(`document.querySelector('${goalButton(incline)}').dataset.wheelEmpty`),'true')

  const bpm = '평균 심박수 (BPM)'
  await open(bpm); await focusSelection(); await press('ArrowDown',40); assert.equal(await selected(),'131 BPM')
  await press('ArrowUp',38); assert.equal(await selected(),'130 BPM')
  await press('Escape',27); await modalClosed(); assert.equal(await valueOf(bpm),'130 BPM')
  await open(bpm); await direct('301')
  assert.match(await evaluate(`document.querySelector('dialog[open] [role="alert"]').textContent`),/20~300 BPM/)
  await press('Escape',27); await modalClosed()
  await open(bpm); await direct(''); await modalClosed(); assert.equal(await valueOf(bpm),'0 BPM')

  const future = '[data-control-example="future-goals"]'
  await evaluate(`document.querySelector('${future} > details').open=true`)
  await waitFor(()=>evaluate(`!!document.querySelector('${future} select')`),'future goals')
  const range = () => evaluate(`Array.from(document.querySelectorAll('${future} button[aria-label^="최소"],${future} button[aria-label^="최대"]'), b=>({value:b.textContent.trim(),x:b.getBoundingClientRect().x,y:b.getBoundingClientRect().y,width:b.getBoundingClientRect().width}))`)
  const running = await range()
  assert.deepEqual(running.map(x=>x.value),['130 BPM','150 BPM','160 SPM','180 SPM'])
  assert.equal(running[0].y,running[1].y);assert.equal(running[2].y,running[3].y)
  await capture('future-goals-393',future)
  await open('최소 심박수'); await focusSelection(); await press('ArrowDown',40)
  assert.equal(await selected(),'131 BPM')
  await click('확인',dialog); await modalClosed()
  assert.equal(await valueOf('최소 심박수'),'131 BPM')
  await open('최대 심박수'); await direct('130')
  assert.match(await evaluate(`document.querySelector('dialog[open] [role="alert"]').textContent`),/최소값은 최대값 이하여야/)
  await press('Escape',27); await modalClosed()
  await evaluate(`(() => {const input=document.querySelector('${future} select'); input.value='BIKE'; input.dispatchEvent(new Event('change',{bubbles:true}));})()`)
  await waitFor(()=>evaluate(`!!document.querySelector('${future} ${goalButton('목표 저항')}')`),'bike resistance')
  const cycling = await range()
  assert.deepEqual(cycling.map(x=>x.value),['130 BPM','150 BPM','70 RPM','90 RPM'])
  assert.equal(await evaluate(`!!document.querySelector('${future} ${goalButton(incline)}')`), false)
  await open('목표 저항'); await focusSelection(); assert.equal(await selected(),'8')
  await press('ArrowDown',40); assert.equal(await selected(),'9')
  await press('ArrowUp',38); assert.equal(await selected(),'8')
  await press('Escape',27); await modalClosed(); assert.equal(await valueOf('목표 저항'),'8')
  await open('목표 저항'); await click('직접 입력',dialog)
  assert.equal(await directDraft(),'7.5')
  await press('Escape',27); await modalClosed()
  await open('목표 저항'); await direct('7.123456'); await modalClosed(); assert.equal(await valueOf('목표 저항'),'7')
  await open('목표 저항'); await click('직접 입력',dialog)
  assert.equal(await directDraft(),'7.123456')
  await press('Escape',27); await modalClosed()
  await open('목표 저항'); await direct(''); await modalClosed(); assert.equal(await valueOf('목표 저항'),'0')

  const rollout = [
    ['실제 중량', '52.3 kg', '54.8 kg'],
    ['실제 반복 횟수', '10 회', '11 회'],
    ['추가 중량', '0 kg', '1 kg'],
    ['지금 다시 승인할 중량', '57.123456 kg', '59.623456 kg'],
    ['지금 재승인할 중량', '0 kg', '1 kg'],
  ]
  for (const [label, initial, next] of rollout) {
    await open(label); await focusSelection()
    assert.equal(await selected(), initial)
    await press('ArrowDown', 40)
    assert.equal(await selected(), next)
    await press('Escape', 27); await modalClosed()
    assert.equal(await evaluate('document.activeElement.ariaLabel'), label)
    await open(label); await focusSelection(); assert.equal(await selected(), initial)
    if (label === '실제 중량') await capture('record-weight-wheel-393', 'dialog[open]')
    await press('ArrowDown', 40); await click('확인', dialog); await modalClosed()
    assert.equal(await valueOf(label), next)
  }
  await open('추가 중량'); await direct('0'); await modalClosed()
  assert.equal(await valueOf('추가 중량'), '0 kg')
  await open('추가 중량'); await direct(''); await modalClosed()
  assert.equal(await valueOf('추가 중량'), '입력')
  await open('실제 반복 횟수'); await direct('0')
  assert.match(await evaluate(`document.querySelector('dialog[open] [role="alert"]').textContent`), /숫자/)
  await press('Escape', 27); await modalClosed()
  assert.equal(await valueOf('실제 반복 횟수'), '11 회')
  return { dimensions, geometry, pace: { forward, reverse, paceAfterScroll }, futureGoals: { running, cycling }, weightRollout: rollout }
}
