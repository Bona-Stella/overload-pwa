import { chooseDropdown, dropdownOptions, openDropdown } from './fixtures/dropdown-driver.mjs'
import assert from 'node:assert/strict'
import { auditMessageDialog } from './fixtures/review/modal-audit.mjs'
import { test } from 'node:test'
import { spawn } from 'node:child_process'
import { chromeExecutable } from './fixtures/chrome-executable.mjs'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

test('routine UI preserves individual edits and supports weekly views, compact cards, independent filters and atomic schedule editing', { timeout: 90000 }, async () => {
  const directory = resolve('logs/routine-ui'), profile = resolve(directory, 'profile-' + crypto.randomUUID())
  await mkdir(profile, { recursive: true })
  const server = await createServer({ configFile: false, envDir: false, cacheDir: resolve(directory,'vite-cache'), plugins: [{ name: 'routine-component-only', enforce: 'pre',
    configureServer(vite) { vite.middlewares.use('/boundary', async (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml('/boundary', '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/routine-ui.jsx"></script></body></html>')) }) },
  }, react()], server: { host: '127.0.0.1', port: 0, hmr: false, ws: false, watch: { ignored: ['**/logs/**'] } }, clearScreen: false })
  let browser, ws, next = 0
  const pending = new Map()
  const wait = async fn => { const until = Date.now() + 12000; while (Date.now() < until) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 30)) } throw Error('Component DOM transition timeout') }
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? 'Component error'); return r.result.value }
  try {
    await server.listen()
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`
    browser = spawn(chromeExecutable(), ['--headless', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
    const port = await wait(async () => { try { return Number((await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { return false } })
    const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page')
    ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
    ws.onmessage = e => { const m = JSON.parse(e.data), p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result) } }
    ws.onclose = () => { for (const p of pending.values()) p.reject(Error('Browser closed')); pending.clear() }
    await send('Page.enable'); await send('Page.navigate', { url: origin + '/boundary' })

    await wait(()=>evaluate('!!window.ui'),'fixture loaded')
    const click=async text=>{await evaluate(`[...(Array.from(document.querySelectorAll('dialog[open]')).at(-1)??document).querySelectorAll('button,summary')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled).click()`);await new Promise(r=>setTimeout(r,80))}
    const dialogText = () => evaluate('document.querySelector("dialog[open]")?.textContent')
    const input=async(selector,value)=>{
      if (selector.includes('data-dropdown-label')) await chooseDropdown(evaluate, selector, value)
      else await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const p=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}))})()`)
      await new Promise(r=>setTimeout(r,80))
    }
    const verifyLayout=async(name,width)=>{
      await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true});await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
      assert.equal(await evaluate(`document.documentElement.scrollWidth<=${width}`),true,name+' overflow')
      if(name.startsWith('exercise-')&&await evaluate(`!!document.querySelector('input[type="search"]')`))await searchVisible()
    }
    const tap=async selector=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch'}));e.click()})()`);await new Promise(r=>setTimeout(r,80))}
    const searchVisible=async()=>{
      await tap('input[type="search"]')
      assert.equal(await evaluate(`document.activeElement===document.querySelector('input[type="search"]')`),true,'search receives focus')
      assert.equal(await evaluate(`(()=>{const search=document.querySelector('input[type="search"]'),header=search.form.querySelector('header'),r=search.getBoundingClientRect();return r.top>=(header?.getBoundingClientRect().bottom??0)&&r.bottom<innerHeight})()`),true,'search input is visible below the edit header')
      assert.equal(await evaluate(`(()=>{const search=document.querySelector('input[type="search"]'),footer=search.form.querySelector('footer');return !footer||search.getBoundingClientRect().bottom<=(getComputedStyle(footer).visibility==='hidden'?innerHeight:footer.getBoundingClientRect().top)})()`),true,'save button cannot overlay search')
    }
    const identityMatches=async()=>{
      const value=await evaluate(`(()=>{const controls=[document.querySelector('input[placeholder="나의 루틴"]'),document.querySelector('[data-dropdown-label="루틴 태그"]')];return controls.map(e=>{const s=getComputedStyle(e.tagName==='BUTTON'?e.firstElementChild:e),l=getComputedStyle(e.closest('label')??e.parentElement.parentElement);return ['height','padding','fontSize','color','backgroundColor','borderColor','borderWidth','borderRadius'].map(k=>s[k]).concat(['fontSize','color','gap'].map(k=>l[k]))})})()`)
      assert.equal(value[0][2],'16px','the editable name avoids Safari focus zoom')
      assert.equal(value[1][2],'14px','the tag button keeps its typography')
      assert.deepEqual([value[0][0], value[0][1], value[0][7], value[0][10]], ['48px', '8px 12px', '5px', '4px'])
      assert.deepEqual([value[1][0], value[1][7]], ['48px', '5px'], 'the tag selector uses the approved connected geometry')
      assert.deepEqual(value[0].slice(3,7), value[1].slice(3,7), 'name and tag retain the same colors and field border width')
    }

    const viewport = width => send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true})
    const verifyScrollBoundary = async selector => {
      const target = await evaluate(`(()=>{
        const e=document.querySelector(${JSON.stringify(selector)});
        if (e.scrollHeight<=e.clientHeight) e.style.maxHeight='70px';
        e.scrollIntoView({block:'center'});e.scrollTop=e.scrollHeight;
        const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
        return {x,y,page:scrollY,overflow:e.scrollHeight>e.clientHeight,hit:e.contains(document.elementFromPoint(x,y))};
      })()`)
      assert.ok(target.overflow && target.hit, 'the nested scroll area receives the wheel input')
      await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:target.x,y:target.y,deltaX:0,deltaY:160})
      await new Promise(r=>setTimeout(r,140))
      assert.equal(await evaluate('scrollY'),target.page,'wheel input at the nested boundary stays inside the control')
      await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.style.removeProperty('max-height');e.scrollTop=0})()`)
    }
    const closeKeyboard = async () => {
      await evaluate(`(()=>{document.activeElement.blur();delete visualViewport.height;delete visualViewport.offsetTop;delete visualViewport.pageTop;visualViewport.dispatchEvent(new Event('resize'))})()`)
      await wait(() => evaluate(`[...document.querySelectorAll('form footer')].some(e=>e.getClientRects().length&&getComputedStyle(e).visibility==='visible')`))
    }
    const keyboardField = async (selector, { manual = false, fits = false, grows = false } = {}) => {
      await evaluate(`(()=>{
        const e=document.querySelector(${JSON.stringify(selector)}), vv=visualViewport;
        e.focus({preventScroll:true});
        if (!e.closest('dialog') && !${fits}) window.scrollTo(0,Math.max(0,scrollY+e.getBoundingClientRect().top-680));
        else if (${fits}) window.scrollTo(0,0);
        window.keyboardEntryScroll=scrollY;
        Object.defineProperty(vv,'height',{configurable:true,value:innerHeight-140});
        Object.defineProperty(vv,'offsetTop',{configurable:true,value:18});
        Object.defineProperty(vv,'pageTop',{configurable:true,get:()=>scrollY+vv.offsetTop});
        vv.dispatchEvent(new Event('resize'));
        Object.defineProperty(vv,'height',{configurable:true,value:innerHeight-390});
        vv.dispatchEvent(new Event('resize'));
      })()`)
      await wait(() => evaluate(`(()=>{
        const e=document.activeElement,d=e.closest('dialog'),f=e.closest('form'),r=e.getBoundingClientRect(),vv=visualViewport;
        const top=Math.max(vv.offsetTop,d?d.getBoundingClientRect().top:f.querySelector('header').getBoundingClientRect().bottom);
        return e.matches(${JSON.stringify(selector)})&&parseFloat(getComputedStyle(e).fontSize)>=16
          &&getComputedStyle(f.querySelector('footer')).visibility==='hidden'&&vv.scale===1
          &&r.top>=top-1&&r.bottom<=vv.offsetTop+vv.height+1&&r.left>=0&&r.right<=innerWidth
          &&(!d||d.getBoundingClientRect().bottom<=vv.offsetTop+vv.height);
      })()`))
      await new Promise(r=>setTimeout(r,180))
      if (fits) assert.equal(await evaluate('scrollY===window.keyboardEntryScroll'),true,'a visible field stays in place')
      if (grows) {
        const beforeResize = await evaluate('scrollY')
        await evaluate(`(()=>{const vv=visualViewport,r=document.activeElement.getBoundingClientRect();
          const at=y=>new Touch({identifier:1,target:document.activeElement,clientX:100,clientY:y});
          document.activeElement.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[at(100)]}));
          document.activeElement.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',buttons:1,bubbles:true}));
          document.activeElement.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,touches:[at(103)]}));
          document.activeElement.dispatchEvent(new TouchEvent('touchend',{bubbles:true}));
          Object.defineProperty(vv,'height',{configurable:true,value:r.bottom-vv.offsetTop-35});
          vv.dispatchEvent(new Event('resize'));vv.dispatchEvent(new Event('resize'))})()`)
        await new Promise(r=>setTimeout(r,390))
        const geometry=await evaluate(`({bottom:document.activeElement.getBoundingClientRect().bottom,floor:visualViewport.offsetTop+visualViewport.height,y:scrollY})`)
        assert.ok(geometry.bottom<=geometry.floor+1,'search after a second keyboard resize '+JSON.stringify(geometry))
        assert.ok(geometry.y > beforeResize && geometry.y - beforeResize <= 48, 'search moves only the occluded distance plus margin')
        await evaluate(`visualViewport.dispatchEvent(new Event('resize'))`)
        await new Promise(r=>setTimeout(r,220))
        assert.equal(await evaluate('scrollY'),geometry.y,'duplicate viewport notification does not move the search again')
      }
      if (manual) {
        const entry = await evaluate('({scroll:scrollY,value:document.activeElement.value})')
        await send('Input.insertText',{text:'메모'})
        await new Promise(r=>setTimeout(r,180))
        assert.equal(await evaluate('scrollY'),entry.scroll,'typing does not realign the field')
        await evaluate(`(()=>{const e=document.activeElement;Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,${JSON.stringify(entry.value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`)
        await evaluate(`window.dispatchEvent(new WheelEvent('wheel'));window.scrollTo(0,scrollY-180);
          window.manualKeyboardScroll=scrollY;Object.defineProperty(visualViewport,'height',{configurable:true,value:innerHeight-415});
          visualViewport.dispatchEvent(new Event('resize'))`)
        await new Promise(r=>setTimeout(r,180))
        assert.equal(await evaluate('scrollY===window.manualKeyboardScroll'),true,'manual scroll is not overridden by viewport changes')
      }
      await closeKeyboard()
      assert.equal(await evaluate(`!document.querySelector('[data-edit-keyboard]')&&[...document.forms].every(f=>!f.style.getPropertyValue('--editor-keyboard-space'))`),true)
    }
    const verifyRoutineMemo = async mode => {
      for (const width of [320,375,393,430]) {
        await viewport(width)
        if (width === 393) {
          const visibleMemo = await evaluate(`(async()=>{
            const memo=document.querySelector('[data-keyboard-editor] textarea'),page=document.scrollingElement;
            window.scrollTo(0,scrollY+memo.getBoundingClientRect().top-165);
            const y=scrollY,limit=page.scrollHeight;
            memo.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,isPrimary:true,pointerType:'touch',pointerId:3}));
            memo.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,isPrimary:true,pointerType:'touch',pointerId:3}));
            memo.focus({preventScroll:true});
            Object.defineProperty(visualViewport,'height',{configurable:true,value:390});
            visualViewport.dispatchEvent(new Event('resize'));await new Promise(r=>setTimeout(r,230));
            return {sameScroll:scrollY===y,sameRange:page.scrollHeight===limit,bottom:memo.getBoundingClientRect().bottom};
          })()`)
          assert.ok(visibleMemo.sameScroll&&visibleMemo.sameRange&&visibleMemo.bottom<=390, mode+' already visible memo stays in place')
          await closeKeyboard()
        }
        const opening = await evaluate(`(async()=>{
          const form=document.querySelector('[data-keyboard-editor]'), fields=form.querySelectorAll('textarea');
          const memo=fields[fields.length-1],page=document.scrollingElement,vv=visualViewport;
          const scroll=window.scrollTo.bind(window),ordinary=page.scrollHeight-page.clientHeight,visible=innerHeight/2-20;
          scroll(0,ordinary);
          const before=memo.getBoundingClientRect(),nativeTarget=Math.round(scrollY+before.top+before.height/2-visible/2);
          const touch=type=>memo.dispatchEvent(new PointerEvent(type,{bubbles:true,isPrimary:true,pointerType:'touch',pointerId:3}));
          const resize=height=>{Object.defineProperty(vv,'height',{configurable:true,value:height});vv.dispatchEvent(new Event('resize'))};
          const calls=[];
          window.scrollTo=(...args)=>{calls.push(args);scroll(...args)};
          window.routineMemoTest={memo,page,form,scroll,resize,touch,calls,ordinary,visible};
          touch('pointerdown');const prepared=page.scrollHeight-page.clientHeight;
          const beforeFocus={y:scrollY,top:memo.getBoundingClientRect().top};
          touch('pointerup');memo.focus({preventScroll:true});
          scroll(0,nativeTarget);const nativeY=scrollY;
          resize(innerHeight-145);resize(visible+45);resize(visible);
          await new Promise(r=>setTimeout(r,260));
          const first={y:scrollY,bottom:memo.getBoundingClientRect().bottom,calls:calls.length};
          resize(360);await new Promise(r=>setTimeout(r,260));
          return {ordinary,prepared,nativeTarget,nativeY,beforeFocus,beforeTop:before.top,y:scrollY,
            bottom:memo.getBoundingClientRect().bottom,visible:vv.height,calls:calls.length,height:before.height,first};
        })()`)
        assert.ok(opening.nativeTarget>opening.ordinary,mode+' bottom memo needs room before focus '+JSON.stringify(opening))
        assert.ok(opening.prepared>=opening.nativeTarget && opening.nativeY===opening.nativeTarget,
          mode+' can reach native keyboard position on the first tap '+JSON.stringify(opening))
        assert.deepEqual(opening.beforeFocus,{y:opening.ordinary,top:opening.beforeTop})
        assert.ok(opening.bottom<=opening.visible && opening.calls===0,mode+' native placement is left alone '+JSON.stringify(opening))

        const text='윗줄\n'+ '가운데 메모\n'.repeat(32)+'마지막 줄'
        await send('Input.insertText',{text:'첫 줄'})
        await evaluate(`routineMemoTest.memo.select()`)
        await send('Input.insertText',{text})
        await evaluate(`routineMemoTest.memo.setSelectionRange(5,5)`)
        await send('Input.insertText',{text:'수정'})
        const typing=await evaluate(`(()=>{const {memo,calls}=routineMemoTest;
          return {value:memo.value,caret:memo.selectionStart,height:memo.getBoundingClientRect().height,
            content:memo.scrollHeight,client:memo.clientHeight,top:memo.getBoundingClientRect().top,bottom:memo.getBoundingClientRect().bottom,y:scrollY,calls:calls.length};})()`)
        assert.equal(typing.value,text.slice(0,5)+'수정'+text.slice(5))
        assert.equal(typing.caret,7)
        assert.ok(typing.content>typing.client && typing.height===opening.height && typing.bottom<=opening.visible)
        assert.equal(typing.y,opening.y,'typing grows only the internal text scroll range')
        assert.equal(typing.calls,0,'typing and caret movement do not scroll the page from app code')

        await evaluate(`(()=>{const {memo,visible,resize,touch,scroll}=routineMemoTest;
          const other=memo.form.querySelector('input[placeholder="나의 루틴"]');
          other.focus({preventScroll:true});touch('pointerdown');touch('pointerup');memo.focus({preventScroll:true});
          resize(innerHeight);resize(visible);
          window.dispatchEvent(new WheelEvent('wheel'));scroll(0,Math.max(0,scrollY-26));
          window.routineMemoTest.manual=scrollY;visualViewport.dispatchEvent(new Event('scroll'));})()`)
        await new Promise(r=>setTimeout(r,260))
        assert.equal(await evaluate('scrollY===routineMemoTest.manual&&routineMemoTest.memo.selectionStart===7'),true)
        await evaluate(`(()=>{const {memo,resize}=routineMemoTest;
          Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(memo,'');
          memo.dispatchEvent(new Event('input',{bubbles:true}));memo.blur();resize(innerHeight-45);})()`)
        await new Promise(r=>setTimeout(r,220))
        assert.equal(await evaluate(`getComputedStyle(routineMemoTest.form.querySelector('footer')).visibility`),'hidden')
        await evaluate(`delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'))`)
        await wait(()=>evaluate(`!routineMemoTest.form.hasAttribute('data-memo-keyboard-space')&&
          getComputedStyle(routineMemoTest.form.querySelector('footer')).visibility==='visible'`))
        const closed=await evaluate(`(()=>{const {page,calls,scroll}=routineMemoTest;
          const result={y:scrollY,limit:page.scrollHeight-page.clientHeight,calls:calls.length};
          window.scrollTo=scroll;delete window.routineMemoTest;return result;})()`)
        assert.equal(closed.limit,opening.ordinary,'closing releases only temporary clearance')
        assert.ok(closed.y<=closed.limit&&closed.y>0)
      }
    }
    const cardPosition = label => evaluate(`(()=>{const card=document.querySelector('form section[aria-label="${label}"]'),header=card.closest('form').querySelector('header')
      return {gap:card.getBoundingClientRect().top-header.getBoundingClientRect().bottom,headerTop:header.getBoundingClientRect().top,
        title:card.querySelector('h3').textContent,editingInput:document.activeElement.matches('input,textarea,select')}
    })()`)
    const assertAligned = async (label, title, behavior) => {
      const position = await wait(async()=>{const position=await cardPosition(label);return Math.abs(position.gap-8)<1&&Math.abs(position.headerTop)<1&&position})
      assert.equal(position.title,title)
      assert.equal(position.editingInput,false,'new fields do not receive focus')
      const scroll = await evaluate('window.addedCardScrolls.at(-1)')
      assert.equal(scroll.behavior,behavior)
      if (behavior==='instant') assert.ok(Math.abs(scroll.actual-scroll.top)<1,'reduced motion reaches the target immediately')
    }
    await evaluate(`(()=>{const root=document.scrollingElement,scrollTo=root.scrollTo.bind(root);window.addedCardScrolls=[]
      root.scrollTo=options=>{scrollTo(options);window.addedCardScrolls.push({...options,actual:root.scrollTop})}
    })()`)

    assert.doesNotMatch(await evaluate('document.querySelector("form").textContent'),/운동 요일/)
    await identityMatches()
    await viewport(375)
    await keyboardField('[aria-label="웨이트 2"] textarea',{manual:true})
    await verifyRoutineMemo('edit')
    await viewport(375)
    await evaluate(`document.querySelector('[data-dropdown-label="루틴 태그"]').click()`)
    assert.equal(await evaluate(`document.querySelectorAll('[role="listbox"][aria-label="루틴 태그"] [role="option"]').length`),11)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[role="listbox"][aria-label="루틴 태그"]')).overscrollBehaviorY`),'contain')
    await verifyScrollBoundary('[role="listbox"][aria-label="루틴 태그"]')
    const officialTags=JSON.parse((await readFile(resolve('docs/product/Overload_UI_Baseline_Wireframe_v0.9.html'),'utf8')).match(/const routineTagDescriptions=(\[.*\]);/)[1])
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[role="listbox"][aria-label="루틴 태그"] [role="option"]')).slice(1).map(b=>[b.querySelector('strong').textContent,b.querySelector('small').textContent])`),officialTags,'tag descriptions reuse the official metadata verbatim')
    await verifyLayout('routine-edit-tags-393',393);await verifyLayout('routine-edit-tags-320',320)
    await evaluate(`document.querySelector('h2').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`)
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="루틴 태그"]').getAttribute('aria-expanded')`),'false')
    const setting = index => `[aria-label="웨이트 ${index}"] button[aria-label^="설정 중량"]`
    for (const index of [1,2]) {
      const group = `[aria-label="웨이트 ${index}"] [role="group"][aria-label="설정 중량"]`
      assert.match(await evaluate(`document.querySelector('${group}').parentElement.textContent`),/2\.5kg 단위/)
      await tap(setting(index)+'[aria-label$=" 증가"]')
      assert.equal(await evaluate(`document.querySelector('${group} button[aria-label="설정 중량"]').textContent.trim()`),index===1?'27.5 kg':'32.5 kg')
      await tap(setting(index)+'[aria-label$=" 감소"]')
    }
    await tap(setting(1)+'[aria-label="설정 중량"]')
    await tap('dialog[open] button[aria-pressed="false"][data-distance="1"]:has(+ button[aria-pressed="true"])')
    await click('확인')
    assert.equal(await evaluate(`document.querySelector('${setting(1)}[aria-label="설정 중량"]').textContent.trim()`),'22.5 kg')
    await tap(setting(1)+'[aria-label$=" 증가"]')
    const oldFirst=await evaluate(`document.querySelector('[aria-label="웨이트 1"]').textContent`)
    await evaluate(`document.querySelector('[aria-label="웨이트 1"] button').click()`);await new Promise(r=>setTimeout(r,80))
    await searchVisible()
    assert.equal(await evaluate(`document.querySelectorAll('[aria-label="표준 운동 목록"] li > button:first-child').length`),2,'catalog list opens on the shared input control')
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[aria-label="표준 운동 목록"]')).overscrollBehaviorY`),'contain')
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[aria-label="표준 운동 목록"] li > button:first-child')).backgroundColor`),'rgba(0, 0, 0, 0)','results are inline rows, not autocomplete cards')
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[aria-label="표준 운동 목록"] li > button:first-child')).borderRadius`),'5px','the picker retains inline catalog rows with the new shared radius')
    assert.match(await evaluate(`document.querySelector('[aria-label="표준 운동 목록"] li > button:first-child').textContent`),/벤치프레스.*가슴.*대흉근/)
    assert.equal(await evaluate(`document.querySelector('[aria-label="표준 운동 목록"] img').width`),32)
    assert.equal(await evaluate(`document.querySelectorAll('[role="combobox"],[role="listbox"],[role="option"]').length`),0,'no autocomplete popup is rendered')
    await verifyScrollBoundary('[aria-label="표준 운동 목록"]')
    await verifyLayout('exercise-change-list-393',393);await verifyLayout('exercise-change-list-320',320)
    await click('종목 선택 닫기');assert.equal(await evaluate(`document.querySelector('[aria-label="웨이트 1"]').textContent`),oldFirst)
    await evaluate(`document.querySelector('[aria-label="웨이트 1"] button').click()`);await new Promise(r=>setTimeout(r,80))
    await searchVisible();await evaluate(`document.querySelector('[aria-label="표준 운동 목록"] li > button:first-child').click()`);await new Promise(r=>setTimeout(r,80))
    assert.equal(await evaluate(`document.querySelector('[aria-label="웨이트 1"]').textContent`),oldFirst,'reselecting the same exercise preserves original approvals and inputs')
    await evaluate(`document.querySelector('[aria-label="웨이트 1"] button').click()`);await new Promise(r=>setTimeout(r,80))
    await input('input[type="search"]','squat')
    await searchVisible();await evaluate(`document.querySelector('[aria-label="표준 운동 목록"] li > button:first-child').click()`);await new Promise(r=>setTimeout(r,80))
    assert.match(await evaluate(`document.querySelector('[aria-label="웨이트 1"] h3').textContent`),/바벨 스쿼트/)
    assert.equal(await evaluate('window.addedCardScrolls.length'),0,'changing an exercise does not align a card')
    assert.equal(await evaluate(`document.querySelector('[aria-label="웨이트 1"] button[aria-label="설정 중량"]').textContent.trim()`),'입력','new exercise does not inherit an approved weight')
    assert.equal(await evaluate(`document.querySelector('[aria-label="웨이트 1"] button[aria-label="본세트"]').textContent.trim()`),'3 세트')
    const wheel = async (section,value) => { await evaluate(`document.querySelector('${section} button[aria-label="설정 중량"]').click()`);await click('직접 입력');await input('dialog[open] input',value);await click('확인') }
    await viewport(320)
    await tap(setting(1)+'[aria-label="설정 중량"]')
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('dialog [aria-label="설정 중량 선택값"]')).overscrollBehaviorY`),'contain')
    await verifyScrollBoundary('dialog [aria-label="설정 중량 선택값"]')
    await click('직접 입력')
    await keyboardField('dialog[open] input')
    await click('취소')
    await wheel('[aria-label="웨이트 1"]','40.000001')
    await viewport(320)
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})
    await click('+ 웨이트 종목 추가');await searchVisible();await input('input[type="search"]','bench')
    await evaluate(`(()=>{const viewport=window.visualViewport;Object.defineProperty(viewport,'height',{configurable:true,value:innerHeight-280});viewport.dispatchEvent(new Event('resize'))})()`)
    await tap('[aria-label="표준 운동 목록"] li > button:first-child')
    assert.equal(await evaluate(`document.querySelectorAll('form section[aria-label^="웨이트 "]').length`),3)
    assert.equal(await evaluate('window.addedCardScrolls.length'),0,'card scroll waits for the keyboard to close')
    await evaluate(`delete window.visualViewport.height;window.visualViewport.dispatchEvent(new Event('resize'))`)
    await assertAligned('웨이트 3','벤치프레스','instant')
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
    await input('[aria-label="웨이트 3"] button[data-dropdown-label="부하 방식 · 선택"]','DUMBBELL')
    await wheel('[aria-label="웨이트 3"]','2.500001');await tap(setting(3)+'[aria-label$=" 증가"]')
    assert.equal(await evaluate(`document.querySelector('${setting(3)}[aria-label="설정 중량"]').textContent.trim()`),'3.500001 kg')
    await evaluate(`[...document.querySelectorAll('[aria-label="웨이트 3"] button')].find(b=>b.textContent==='삭제').click()`);await new Promise(r=>setTimeout(r,80))
    await input('[data-dropdown-label="루틴 태그"]','PUSH')
    await evaluate(`[...document.querySelector('[aria-label="웨이트 2"]').querySelectorAll('button')].find(b=>b.textContent.includes('위로')).click()`);await new Promise(r=>setTimeout(r,80))
    assert.equal(await evaluate('window.addedCardScrolls.length'),1,'delete and reorder do not align cards')
    await click('+ 웨이트 종목 추가');await click('종목 선택 닫기')
    assert.equal(await evaluate('window.addedCardScrolls.length'),1,'cancelled weight selection does not align a card')
    await viewport(375)
    await click('+ 유산소 종목 추가');await click('달리기');await tap('[aria-label="표준 유산소 목록"] li > button')
    await assertAligned('유산소 1','러닝머신','smooth')
    await viewport(430)
    await click('+ 유산소 종목 추가')
    await click('유산소 종목 선택 닫기')
    assert.equal(await evaluate(`!!document.querySelector('[aria-label="유산소 종목 추가 선택"]')`),false,'cancelled cardio selection removes the incomplete picker')
    assert.equal(await evaluate('window.addedCardScrolls.length'),2,'cancelled cardio selection does not align a card')
    await click('+ 유산소 종목 추가');await click('달리기');await tap('[aria-label="표준 유산소 목록"] li > button')
    await assertAligned('유산소 2','러닝머신','smooth')
    await tap('[aria-label="유산소 2"] button.danger')
    await tap('[aria-label="유산소 1"] button[aria-label="목표 시간 수정"]')
    for (const [unit,value] of [['분','2'],['초','30']]) {
      await tap(`button[aria-label="목표 시간 (${unit})"]`)
      await click('직접 입력','dialog[open] button'); await input('dialog[open] input',value); await click('확인','dialog[open] button')
    }
    await click('시간 적용')
    for (const width of [320,375,393,430]) {
      await verifyLayout('routine-edit-'+width,width)
      const layout = await evaluate(`(()=>{const form=document.querySelector('form[aria-label="루틴 편집"]'),cards=['웨이트 1','유산소 1'].map(label=>form.querySelector('section[aria-label="'+label+'"]'))
        const actions=cards.flatMap(card=>[card.querySelector('button[aria-expanded]'),card.querySelector('button.danger')])
        const sizes=actions.map(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return [r.width,r.height,s.borderRadius,s.alignItems,s.justifyContent]})
        const footer=[...form.querySelectorAll('footer button')].map(b=>[b.offsetWidth,b.offsetHeight,b.scrollWidth<=b.clientWidth,b.textContent.trim()])
        return {sizes,footer,colors:actions.map(b=>getComputedStyle(b).color)}
      })()`)
      assert.deepEqual(layout.sizes,Array.from({length:4},()=>[78,32,'999px','center','center']))
      assert.deepEqual(layout.colors.filter((_,index)=>index%2===1),['rgb(240, 183, 191)','rgb(240, 183, 191)'])
      assert.deepEqual(layout.footer,[[layout.footer[0][0],48,true,'취소'],[layout.footer[0][0],48,true,'변경 사항 저장']])
    }
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false})
    const desktop = await evaluate(`(()=>{const footer=document.querySelector('form footer'),r=footer.getBoundingClientRect(),b=footer.querySelector('button').getBoundingClientRect();return {position:getComputedStyle(footer).position,width:r.width,bottom:r.bottom,height:b.height}})()`)
    assert.deepEqual(desktop,{position:'fixed',width:520,bottom:900,height:48})
    await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true})
    const keyboard = await evaluate(`(()=>{const input=document.querySelector('form[aria-label="루틴 편집"] input[placeholder="나의 루틴"]'),footer=input.form.querySelector('footer'),viewport=window.visualViewport;
      input.focus();Object.defineProperty(viewport,'height',{configurable:true,value:innerHeight-280});viewport.dispatchEvent(new Event('resize'));
      const result={focused:document.activeElement===input,scale:viewport.scale,inset:innerHeight-viewport.height,hidden:getComputedStyle(footer).visibility==='hidden'};
      delete viewport.height;input.blur();viewport.dispatchEvent(new Event('resize'));return result
    })()`)
    assert.ok(keyboard.focused && keyboard.hidden,JSON.stringify(keyboard))
    await wait(() => evaluate(`getComputedStyle(document.querySelector('form footer')).visibility==='visible'`))
    const maxReps = async value => {
      await tap('[aria-label="웨이트 1"] button[aria-label="최대 반복"]')
      await click('직접 입력')
      await input('dialog[open] input', value)
      await click('확인')
    }
    await maxReps('2')
    await click('변경 사항 저장')
    assert.match(await evaluate(`document.querySelector('form [role="alert"]').textContent`),/최소 반복 수는 최대 반복 수를 넘을 수 없습니다/)
    await maxReps('10')
    await tap(setting(1)+'[aria-label$=" 증가"]')
    await click('변경 사항 저장');assert.equal(await evaluate('window.ui.saved.length'),0)
    assert.match(await dialogText(),/새 중량을 승인/)
    await auditMessageDialog({ send, evaluate }, '루틴 저장과 새 중량 승인', 'info')
    await click('취소')
    await click('변경 사항 저장');await click('승인하고 저장');assert.equal(await evaluate('window.ui.saved.length'),1)
    assert.equal(await evaluate('window.ui.saved[0].cardioPlacements[0].plan.targetSeconds'),150)
    assert.equal(await evaluate('window.ui.saved[0].cardioPlacements[0].plan.activityId'),'ca000000-0000-4000-8000-000000000001')
    assert.equal(await evaluate('window.ui.saved[0].cardioPlacements[0].plan.standardExerciseId'),'ca000000-0000-4000-8000-000000000011')
    assert.equal(await evaluate('window.ui.saved[0].weightPlacements[0].id'),await evaluate('window.ui.secondId'))
    assert.equal(await evaluate('window.ui.saved[0].weightPlacements[1].mode'),'NEW')
    assert.equal(await evaluate('window.ui.saved[0].weightPlacements[1].standardExerciseId'),'40000000-1111-4222-8333-000000000002')
    assert.equal(await evaluate('window.ui.saved[0].weightPlacements[1].initialWeightKg'),'40.000001')
    assert.deepEqual(await evaluate('window.ui.saved[0].weightApprovals.map(a=>[a.placementId,a.nextApprovedWeightKg])'),[[await evaluate('window.ui.secondId'),'32.5']],'only the explicitly changed existing placement is approved')
    assert.equal(await evaluate('window.ui.saved[0].tag'),'PUSH');assert.equal(await evaluate('window.ui.closed'),1)
    await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true})
    assert.equal(await evaluate('document.documentElement.scrollWidth<=393'),true)
    await send('Emulation.setDeviceMetricsOverride',{width:320,height:852,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth<=320'),true)
    assert.equal(await evaluate('window.ui.scheduleCalls'),0,'routine save leaves all schedule assignments intact')
    await evaluate(`import('/tests/fixtures/routine-list-ui.jsx')`)
    await wait(()=>evaluate(`document.querySelectorAll('article[aria-label$="루틴 카드"]').length===3`))
    const cardNames=()=>evaluate(`Array.from(document.querySelectorAll('article[aria-label$="루틴 카드"]')).map(e=>e.getAttribute('aria-label'))`)

    const original=await evaluate('JSON.stringify(window.listUi.calendar())')
    assert.equal(await evaluate(`document.querySelectorAll('[aria-label="가로 주간 일정"] button').length`),7)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('[aria-label="가로 주간 일정"]')).gridTemplateColumns.split(' ').length`),7)
    const positions=await evaluate(`Array.from(document.querySelectorAll('[aria-label="가로 주간 일정"] > button')).map(b=>b.getBoundingClientRect().top)`)
    assert(positions.every(top=>top===positions[0]),'horizontal mode consists of seven tiles in one row')
    assert.doesNotMatch(await evaluate(`document.querySelector('[aria-label="가로 주간 일정"]').textContent`),/WEIGHT|CARDIO.*외|벤치프레스|러닝머신|외 \d|\d+\/\d+/)
    assert.equal(await evaluate(`document.querySelectorAll('[aria-label="가로 주간 일정"] img,[aria-label="가로 주간 일정"] [aria-label$="종목"]').length`),0,'overview tiles contain no exercise icons/counts')
    assert.equal(await evaluate(`document.querySelectorAll('button[data-dropdown-label="저장된 루틴 필터"]').length`),1)
    assert.deepEqual((await dropdownOptions(evaluate, '[data-dropdown-label="저장된 루틴 필터"]')).map(o=>o.name),['전체','최신순','오래된순','이 일정 배정','이 일정 미배정'])
    assert.equal(await evaluate(`document.querySelectorAll('[aria-label="루틴 정렬"],[aria-label="루틴 배정 필터"]').length`),0)
    assert.match(await evaluate(`document.querySelector('article[aria-label^="상체 PUSH"]').textContent`),/ROUTINE.*PUSH.*월·금/)
    assert.equal(await evaluate(`document.querySelector('article[aria-label^="상체 PUSH"] button[aria-label$="상세"]').textContent.includes('월·금')`),false)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('article[aria-label^="상체 PUSH"]')).borderColor`),await evaluate(`getComputedStyle(document.querySelector('article[aria-label^="태그 없는"]')).borderColor`))
    assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('article[aria-label^="상체 PUSH"]')).backgroundImage`),await evaluate(`getComputedStyle(document.querySelector('article[aria-label^="태그 없는"]')).backgroundImage`))
    assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('article[aria-label^="상체 PUSH"] > div > span')).color`),await evaluate(`getComputedStyle(document.querySelector('article[aria-label^="태그 없는"] > div > span')).color`))
    assert.match((await cardNames())[0],/달리기/)
    assert.match(await evaluate(`document.querySelector('article[aria-label^="상체 PUSH"]').textContent`),/벤치프레스 외 2/)
    assert.doesNotMatch(await evaluate(`document.querySelector('article[aria-label^="상체 PUSH"]').textContent`),/데드리프트/,'cards must not expand the entire exercise list')
    await verifyLayout('list-horizontal-393',393);await verifyLayout('list-horizontal-320',320)
    await tap('[aria-label="세로 일정 보기"]')
    assert.equal(await evaluate(`document.querySelectorAll('[aria-label="세로 주간 일정"] button').length`),7)
    assert.equal(await evaluate(`document.querySelector('[aria-label="세로 주간 일정"] button:nth-of-type(2)').getBoundingClientRect().top>document.querySelector('[aria-label="세로 주간 일정"] button').getBoundingClientRect().top`),true)
    assert.match(await evaluate(`document.querySelector('[aria-label="세로 주간 일정"] button').getAttribute('aria-label')`),/PUSH.*웨이트 3종목.*유산소 2종목/)
    assert.doesNotMatch(await evaluate(`document.querySelector('[aria-label="세로 주간 일정"]').textContent`),/WEIGHT|벤치프레스|러닝머신|외 \d|\d+\/\d+/)
    assert.equal(await evaluate(`document.querySelector('[aria-label="세로 주간 일정"] [aria-label="웨이트 3종목"]').textContent`),'3')
    assert.equal(await evaluate(`document.querySelector('[aria-label="세로 주간 일정"] [aria-label="유산소 2종목"]').textContent`),'2')
    assert.equal(await evaluate(`document.querySelector('[aria-label="세로 주간 일정"] img').src`),await evaluate(`import('/src/components/AchievementIcon.tsx').then(m=>m.AchievementIcon({kind:'weight'}).props.src)`))
    await verifyLayout('list-vertical-393',393);await verifyLayout('list-vertical-320',320)
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('[aria-label="세로 주간 일정"] > button')).every(row=>{const b=row.getBoundingClientRect(),parts=Array.from(row.children).map(e=>e.getBoundingClientRect());return b.height<=46&&parts.every(r=>r.left>=b.left&&r.right<=b.right&&r.height<=b.height)})`),true,'each vertical row keeps its icons/counts inside one compact line')
    assert.equal(await evaluate(`document.querySelector('[aria-label="세로 주간 일정"] button:nth-of-type(3)').querySelectorAll('img').length`),1)
    await tap('[aria-label="세로 주간 일정"] button')
    assert.equal((await cardNames()).length,1)
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="저장된 루틴 필터"]').disabled`),true)
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="저장된 루틴 필터"]').textContent.trim()`),'월요일')
    await verifyLayout('weekday-filter-393',393)
    await tap('[aria-label="세로 주간 일정"] button:nth-of-type(3)');assert.match((await cardNames())[0],/달리기/)
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="저장된 루틴 필터"]').textContent.trim()`),'수요일')
    await tap('[aria-label="세로 주간 일정"] button:nth-of-type(2)');assert.equal((await cardNames()).length,0)
    assert.match(await evaluate('document.body.textContent'),/화요일에 배정된 루틴이 없어요/)
    await tap('[aria-label="세로 주간 일정"] button:nth-of-type(2)');assert.equal((await cardNames()).length,3)
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="저장된 루틴 필터"]').disabled`),false)
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="저장된 루틴 필터"]').dataset.value`),'all')
    await input('[data-dropdown-label="저장된 루틴 필터"]','assigned');assert.equal((await cardNames()).length,2);assert.match((await cardNames())[0],/달리기/)
    await input('[data-dropdown-label="저장된 루틴 필터"]','oldest');assert.match((await cardNames())[0],/상체 PUSH/);assert.equal((await cardNames()).length,3)
    await input('[data-dropdown-label="저장된 루틴 필터"]','newest');assert.match((await cardNames())[0],/달리기/)
    await input('[data-dropdown-label="저장된 루틴 필터"]','all');assert.equal((await cardNames()).length,3);assert.match((await cardNames())[0],/달리기/)
    assert.equal(await evaluate('JSON.stringify(window.listUi.calendar())'),original,'view, sorting and filters never write assignments')
    await tap('[aria-label="가로 일정 보기"]')
    await input('[data-dropdown-label="저장된 루틴 필터"]','unassigned')
    await tap('[aria-label="가로 주간 일정"] button');assert.match((await cardNames())[0],/상체 PUSH/)
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="저장된 루틴 필터"]').disabled`),true)
    await tap('[aria-label="가로 주간 일정"] button');assert.equal((await cardNames()).length,3)
    await verifyLayout('routine-cards-filter-393',393)
    const createForm = 'form[aria-label="루틴 생성"]'
    const nameInput = 'input[placeholder="나의 루틴"]'
    const createCancel = createForm+' footer button:first-child'
    const empty = kind => evaluate(`[...document.querySelectorAll('${createForm} .app-card')].find(e=>e.textContent.includes('등록된 ${kind} 운동이 없어요'))?.textContent??null`)
    await click('+ 새 루틴');await wait(()=>evaluate(`!!document.querySelector('${createForm}')`))
    assert.equal(await evaluate(`document.querySelector('${createForm} h1').textContent`),'루틴 생성')
    assert.equal(await evaluate(`document.querySelector('${nameInput}').value`),'')
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="루틴 태그"]').getAttribute('data-value')`),'')
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${createForm} h3')].map(h=>h.textContent)`),['WEIGHT 총 0종목','CARDIO 총 0종목'])
    assert.equal(await evaluate(`[...document.querySelectorAll('${createForm} .app-card')].every(e=>getComputedStyle(e).borderTopStyle==='dashed'&&e.offsetHeight===78&&e.querySelectorAll('button,input').length===0)`),true)
    assert.doesNotMatch(await evaluate(`document.querySelector('${createForm}').textContent`),/제거한 종목 복원|새 승인 중량/)
    for (const width of [320,375,393,430]) {
      await viewport(width)
      assert.equal(await evaluate(`document.documentElement.scrollWidth<=${width}`),true)
      const buttons = await evaluate(`[...document.querySelectorAll('${createForm} footer button')].map(b=>[b.textContent,b.offsetWidth,b.offsetHeight,b.scrollWidth<=b.clientWidth])`)
      assert.deepEqual(buttons,[['취소',buttons[0][1],48,true],['루틴 생성',buttons[0][1],48,true]])
    }
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false})
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=1280&&document.querySelector('${createForm} footer').offsetWidth===520`),true)
    await viewport(393)
    await keyboardField(nameInput,{fits:true})
    assert.equal(await evaluate(`(()=>{const input=document.querySelector('${nameInput}'),footer=input.form.querySelector('footer'),viewport=window.visualViewport
      input.focus();Object.defineProperty(viewport,'height',{configurable:true,value:innerHeight-280});viewport.dispatchEvent(new Event('resize'))
      const hidden=getComputedStyle(footer).visibility==='hidden'
      delete viewport.height;input.blur();viewport.dispatchEvent(new Event('resize'))
      return hidden
    })()`),true,'creation footer follows the shared keyboard behavior')
    await wait(() => evaluate(`getComputedStyle(document.querySelector('${createForm} footer')).visibility==='visible'`))
    await click('루틴 생성')
    assert.match(await evaluate(`document.querySelector('${createForm} [role="alert"]').textContent`),/루틴 이름과 한 개 이상의 운동/)
    assert.equal(await evaluate('window.listUi.routineWrites.length'),0)
    await tap(createCancel)
    assert.equal(await dialogText(),undefined,'clean create can close without a discard prompt')
    await click('+ 새 루틴')
    await identityMatches()
    await input('[data-dropdown-label="루틴 태그"]','PUSH')
    await input('[data-dropdown-label="루틴 태그"]','');assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="루틴 태그"]').getAttribute('data-value')`),'')
    await input('[data-dropdown-label="루틴 태그"]','PULL')
    await evaluate(`document.querySelector('[data-dropdown-label="루틴 태그"]').click()`)
    assert.equal(await evaluate(`document.querySelectorAll('[role="listbox"][aria-label="루틴 태그"] [role="option"]').length`),11)
    assert.match(await evaluate(`document.querySelector('[role="listbox"][aria-label="루틴 태그"]').textContent`),/가슴·어깨·삼두中心|가슴·어깨·삼두 중심/)
    await verifyLayout('routine-create-tags-393',393);await verifyLayout('routine-create-tags-320',320)
    await evaluate(`document.querySelector('h2').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`)
    await evaluate(`window.nativePickerMedia=matchMedia;window.matchMedia=query=>query==='(pointer: coarse)'?{matches:true}:nativePickerMedia(query)`)
    await click('+ 웨이트 종목 추가')
    assert.equal(await evaluate(`document.activeElement.matches('input[type="search"]')`),false,'touch opens the picker without taking keyboard focus')
    assert.equal(await evaluate(`document.querySelectorAll('[aria-label="표준 운동 목록"] li').length`),1,'touch shows the existing exercise list before the search field receives focus')
    await evaluate(`window.matchMedia=nativePickerMedia;delete window.nativePickerMedia;document.querySelector('input[type="search"]').focus({preventScroll:true})`)
    await searchVisible();assert.equal(await evaluate(`document.querySelectorAll('[aria-label="표준 운동 목록"] li > button:first-child').length`),1)
    await searchVisible()
    await verifyLayout('exercise-add-list-393',393);await verifyLayout('exercise-add-list-320',320)
    await keyboardField('input[type="search"]',{grows:true})
    await tap('[aria-label="표준 운동 목록"] li > button:first-child')
    await assertAligned('웨이트 1','벤치프레스','smooth')
    assert.equal(await empty('웨이트'),null)
    const weightCard = '[aria-label="웨이트 1"]'
    assert.equal(await evaluate(`document.querySelectorAll('${weightCard} button:not([data-dropdown-label])').length`),10,'one change, three targets, three weight controls and three bottom actions')
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${weightCard} [data-dropdown-label]')].map(el=>el.dataset.dropdownLabel)`),['제조사 · 선택','부하 방식 · 선택'])
    for (const label of ['제조사 · 선택','부하 방식 · 선택']) {
      const control = `${weightCard} [data-dropdown-label="${label}"]`
      assert.equal((await dropdownOptions(evaluate, control, { keepOpen: true })).filter(option => option.selected).length,1)
      assert.equal(await evaluate(`!!document.getElementById(document.querySelector(${JSON.stringify(control)}).getAttribute('aria-controls')).querySelector('input')`),false)
      await tap(control)
    }
    const actions = await evaluate(`[...document.querySelectorAll('${weightCard} button[aria-expanded]:not([data-dropdown-label]),${weightCard} button.danger')].map(b=>[b.offsetWidth,b.offsetHeight])`)
    assert.deepEqual(actions,[[78,32],[78,32]])
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('${weightCard} h3')).fontSize`),'17px')
    assert.equal(await evaluate(`[...document.querySelectorAll('${weightCard} > div:last-child button')].slice(0,2).every(b=>b.disabled)`),true)
    const createDraft=await evaluate(`document.querySelector('[aria-label="웨이트 1"]').textContent`)
    await tap('[aria-label="웨이트 1"] button');await searchVisible();await click('종목 선택 닫기')
    assert.equal(await evaluate(`document.querySelector('[aria-label="웨이트 1"]').textContent`),createDraft,'creation change/cancel preserves its draft')
    await verifyLayout('weight-card-actions-393',393);await verifyLayout('weight-card-actions-320',320)
    await input(weightCard+' button[data-dropdown-label="부하 방식 · 선택"]','PLATE')
    await tap(setting(1)+'[aria-label$=" 증가"]')
    assert.equal(await evaluate(`document.querySelector('${setting(1)}[aria-label="설정 중량"]').textContent.trim()`),'2.5 kg')
    await click('+ 웨이트 종목 추가');await searchVisible();await tap('[aria-label="표준 운동 목록"] li > button:first-child')
    await assertAligned('웨이트 2','벤치프레스','smooth')
    await verifyRoutineMemo('create')
    await viewport(393)
    const moveUp = '[aria-label="웨이트 2"] > div:last-child button:first-child'
    await tap(moveUp)
    assert.match(await evaluate(`document.querySelector('[aria-label="웨이트 2"]').textContent`),/2\.5 kg/)
    await tap('[aria-label="웨이트 2"] button.danger');await tap('[aria-label="웨이트 1"] button.danger')
    assert.match(await empty('웨이트'),/없어요/)
    await click('+ 유산소 종목 추가')
    assert.match(await empty('유산소'),/없어요/)
    assert.equal(await evaluate(`!!document.querySelector('[aria-label="유산소 1"],[aria-label="유산소 종목 추가 선택"] input[inputmode="decimal"]')`),false)
    await click('유산소 종목 선택 닫기')
    assert.equal(await evaluate(`!!document.querySelector('[aria-label="유산소 종목 추가 선택"]')`),false)
    const cardioCard = '[aria-label="유산소 1"]'
    for (const width of [375,393,430]) {
      await viewport(width)
      await click('+ 유산소 종목 추가')
      if (width === 430) await keyboardField('[aria-label="유산소 종목 추가 선택"] input')
      await click('달리기');await tap('[aria-label="표준 유산소 목록"] li > button')
      await assertAligned('유산소 1','러닝머신','smooth')
      assert.equal(await empty('유산소'),null)
      assert.match(await evaluate(`document.querySelector('${cardioCard} h3').nextElementSibling.textContent`),/달리기 · 러닝머신/)
      assert.equal(await evaluate(`document.querySelectorAll('${cardioCard} button[aria-label^="목표"]').length`),2)
      assert.match(await evaluate(`document.querySelector('${cardioCard}').textContent`),/목표 시간 · 필수00:00:00/)
      assert.doesNotMatch(await evaluate(`document.querySelector('${cardioCard}').textContent`),/분으로 직접 입력/)
      await click('추가 목표 설정')
      assert.equal(await evaluate(`document.querySelectorAll('${cardioCard} button[aria-label^="목표"]').length`),4)
      assert.equal(await evaluate(`document.querySelector('${cardioCard} button[aria-label="목표 경사도 (%)"]').getClientRects().length`),1)
      await click('추가 목표 설정')
      await tap(cardioCard+' button.danger')
      assert.match(await empty('유산소'),/없어요/)
    }
    await input(nameInput,'작성 중인 새 루틴')
    await tap(createCancel)
    assert.match(await dialogText(),/루틴 변경을 버릴까요/)
    await click('취소')
    assert.equal(await evaluate(`document.querySelector('${nameInput}').value`),'작성 중인 새 루틴')
    await tap(createCancel)
    await click('버리기','dialog[open] button')
    assert.equal(await evaluate('window.listUi.routineWrites.length'),0)
    await tap('article[aria-label^="상체 PUSH"] button[aria-haspopup=menu]');await tap('header')
    assert.equal(await evaluate(`document.querySelectorAll('article [data-dropdown=action][data-open=true]').length`),0,'outside touch closes the menu')
    await tap('article[aria-label^="상체 PUSH"] button[aria-haspopup=menu]');await evaluate(`document.dispatchEvent(new Event('scroll'))`)
    assert.equal(await evaluate(`document.querySelectorAll('article [data-dropdown=action][data-open=true]').length`),1,'scroll repositions the open menu')
    await tap('article[aria-label^="달리기"] button[aria-haspopup=menu]')
    assert.equal(await evaluate(`document.querySelectorAll('article [data-dropdown=action][data-open=true]').length`),1)
    assert.equal(await evaluate(`document.querySelector('article[aria-label^="달리기"] button[aria-haspopup=menu]').ariaExpanded==='true'`),true)
    const listRadius = await evaluate(`getComputedStyle(document.querySelector('article[aria-label^="상체 PUSH"]')).borderRadius`)
    await evaluate(`window.routineFrames=[];window.watchRoutines=true;requestAnimationFrame(function sample(){
      if(!window.watchRoutines)return;
      const detail=!!document.querySelector('section[aria-label="루틴 상세"]')?.getClientRects().length;
      const edit=!!document.querySelector('form[aria-label="루틴 편집"]')?.getClientRects().length;
      window.routineFrames.push({focused:detail||edit,list:!!document.querySelector('article[aria-label^="상체 PUSH"]')?.getClientRects().length,
        tabs:!!document.querySelector('nav[aria-label="기본 탐색"]'),padding:getComputedStyle(document.querySelector('main')).paddingBottom});
      requestAnimationFrame(sample);
    })`)
    await tap('article[aria-label^="상체 PUSH"] button[aria-label$="상세"]')
    assert.equal(await evaluate(`document.querySelectorAll('article [data-dropdown=action][data-open=true]').length`),0,'another card selection closes the menu')
    assert.equal(await evaluate('window.listUi.selected.length'),0,'opening a routine does not block on selecting it for a write')
    const detail = 'section[aria-label="루틴 상세"]'
    const closeDetail = async () => {
      await wait(() => evaluate(`!!document.querySelector('${detail}')?.getClientRects().length`), 'routine detail restored')
      const index = await evaluate('history.state.overloadNavigation.index')
      await tap(detail + ' button[aria-label="루틴 목록으로"]')
      await wait(() => evaluate(`!document.querySelector('${detail}') && !!document.querySelector('article[aria-label^="상체 PUSH"]')?.getClientRects().length`), 'routine list restored')
      assert.equal(await evaluate('history.state.overloadNavigation.index'), index - 1)
    }
    await wait(()=>evaluate(`!!document.querySelector('${detail}')`))
    assert.equal(await evaluate(`document.querySelector('${detail}').querySelectorAll('form, input, select, textarea').length`),0)
    assert.doesNotMatch(await evaluate(`document.querySelector('${detail}').textContent`),/루틴 저장|제거한 배치|새 중량 승인|종목 추가|↑ 위로|↓ 아래로/)
    assert.equal(await evaluate(`document.querySelector('article').getClientRects().length`),0,'detail uses a separate screen')
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${detail} > section[aria-label]')].map(e=>e.getAttribute('aria-label'))`),['WEIGHT','CARDIO','주간 일정 배정'])
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${detail} header button')].map(b=>b.ariaLabel||b.textContent)`),['루틴 목록으로','편집'])
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${detail} dl')].map(e=>e.children.length)`),[3,4,4,4,4,4])
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${detail} .app-card')].map(e=>getComputedStyle(e).borderRadius)`),Array(7).fill(listRadius))
    const labels = await evaluate(`['웨이트 1','유산소 1'].map(label=>{const h=document.querySelector('${detail} [aria-label="'+label+'"] h3'),m=h.nextElementSibling.firstElementChild,s=getComputedStyle(m)
      return {font:getComputedStyle(h).fontSize,classification:m.textContent,style:[s.fontSize,s.color],gap:m.parentElement.getBoundingClientRect().top-h.getBoundingClientRect().bottom}
    })`)
    assert.equal(labels[0].font,'17px')
    assert.equal(labels[1].font,labels[0].font)
    assert.equal(labels[1].classification,'달리기 · 러닝머신')
    assert.deepEqual(labels[1].style,labels[0].style)
    assert.equal(labels[1].gap,labels[0].gap)
    for (const width of [320, 375, 393, 430]) {
      await verifyLayout('routine-detail-'+width,width)
      assert.equal(await evaluate(`(()=>{const time=document.querySelector('${detail} time'),date=time.parentElement,title=date.previousElementSibling,card=date.closest('.app-card')
        return title.getBoundingClientRect().right <= date.getBoundingClientRect().left && date.getBoundingClientRect().right < card.getBoundingClientRect().right &&
          date.scrollWidth === date.clientWidth && Math.abs(date.getBoundingClientRect().top-title.getBoundingClientRect().top) < 8
      })()`),true,'date stays to the right of the name at '+width)
    }
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false})
    assert.equal(await evaluate(`document.querySelector('${detail}').getBoundingClientRect().width<=520 && document.documentElement.scrollWidth<=1280`),true,'desktop app frame')
    await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true})
    assert.equal(await evaluate(`(()=>{const b=document.querySelector('${detail} > div:last-child > button:last-child');return b.textContent.trim()==='루틴 삭제' && b.offsetHeight>=44 && getComputedStyle(b).position==='static' && !document.querySelector('nav')})()`),true)
    const deletedBeforeCancel=await evaluate('window.listUi.deleted.length')
    await click('루틴 삭제')
    assert.equal(await evaluate('window.listUi.deleted.length'),deletedBeforeCancel)
    assert.match(await dialogText(),/삭제[\s\S]*기존 운동 기록은 유지/)
    assert.equal(await evaluate('document.activeElement.textContent.trim()'),'취소')
    await click('취소')
    assert.equal(await evaluate(`!!document.querySelector('${detail}')`),true,'cancel keeps the detail')
    const beforeReadonly=await evaluate('window.listUi.routineWrites.length')
    await evaluate(`document.querySelector('${detail}').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`)
    assert.equal(await evaluate('window.listUi.routineWrites.length'),beforeReadonly,'detail cannot save even on explicit submit')
    await evaluate('window.listUi.setActive(true)');await new Promise(r=>setTimeout(r,80))
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='운동 시작').disabled`),true)
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('${detail} button')].filter(b=>['편집','루틴 삭제'].includes(b.textContent.trim())).map(b=>b.disabled)`),[true,true])
    await evaluate('window.listUi.setActive(false);window.listUi.setAttempt(true)');await new Promise(r=>setTimeout(r,80))
    assert.equal(await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent==='운동 시작'&&!b.disabled)`),true)
    await evaluate('window.listUi.setAttempt(false)');await new Promise(r=>setTimeout(r,80))
    await click('운동 시작')
    assert.deepEqual(await evaluate('window.listUi.started'),[await evaluate('window.listUi.ids[0]')])
    await click('편집');await wait(()=>evaluate(`!!document.querySelector('form[aria-label="루틴 편집"]')`))
    assert.match(await evaluate(`document.querySelector('input[placeholder="나의 루틴"]').value`),/상체 PUSH/)
    assert.equal(await evaluate(`document.querySelector('input[placeholder="나의 루틴"]').matches(':disabled')`),false)
    const editForm = 'form[aria-label="루틴 편집"]'
    const editBack = editForm+' button[aria-label="루틴 상세로"]'
    const cancelEdit = editForm+' footer button:first-child'
    await tap(cancelEdit)
    assert.equal(await evaluate(`!!document.querySelector('${editForm}')`),false)
    assert.equal(await dialogText(),undefined,'unchanged cancel returns without confirmation')
    await closeDetail()
    await evaluate('new Promise(requestAnimationFrame)')
    const routineFrames = await evaluate('window.watchRoutines=false;window.routineFrames')
    assert.ok(routineFrames.some(frame=>frame.focused)&&routineFrames.some(frame=>frame.list))
    assert.ok(routineFrames.every(frame=>(!frame.focused||!frame.tabs)&&(!frame.list||frame.tabs)))
    await tap('article[aria-label^="상체 PUSH"] button[aria-label$="상세"]')
    await click('편집')
    await input('input[placeholder="나의 루틴"]','미저장 편집값')
    await tap(cancelEdit)
    assert.match(await dialogText(),/루틴 변경을 버릴까요/)
    await click('취소')
    assert.equal(await evaluate(`document.querySelector('input[placeholder="나의 루틴"]').value`),'미저장 편집값')
    await tap(editBack)
    assert.match(await dialogText(),/루틴 변경을 버릴까요/)
    await evaluate('history.back()')
    await wait(async()=>!await dialogText())
    assert.equal(await evaluate(`document.querySelector('input[placeholder="나의 루틴"]').value`),'미저장 편집값')
    await tap(cancelEdit)
    await click('버리기','dialog[open] button')
    assert.equal(await evaluate(`!!document.querySelector('${editForm}')`),false)
    assert.equal(await evaluate('window.listUi.routineWrites.length'),beforeReadonly,'cancel never submits draft changes')
    assert.doesNotMatch(await evaluate('document.body.innerText'),/미저장 편집값/)
    await closeDetail()
    await tap('article[aria-label^="달리기"] button[aria-label$="상세"]')
    assert.match(await evaluate(`document.querySelector('${detail}').textContent`),/WEIGHT.*총 0종목.*등록된 웨이트 종목 없음.*CARDIO.*총 1종목/)
    await click('편집')
    await viewport(393)
    await click('+ 웨이트 종목 추가');await searchVisible();await tap('[aria-label="표준 운동 목록"] li > button:first-child')
    await assertAligned('웨이트 1','벤치프레스','smooth')
    await tap(cancelEdit)
    await click('버리기','dialog[open] button')
    await closeDetail()
    await tap('article[aria-label^="태그 없는"] button[aria-label$="상세"]')
    assert.match(await evaluate(`document.querySelector('${detail}').textContent`),/CARDIO.*총 0종목.*등록된 유산소 계획 없음.*총 0개 일정.*배정된 주간 일정 없음/)
    await closeDetail()
    await evaluate('window.listUi.staleSelection()');await new Promise(r=>setTimeout(r,80))
    assert.doesNotMatch(await evaluate(`document.querySelector('article[aria-label^="상체 PUSH"]').textContent`),/STALE EXERCISE/,'an older selected detail must not replace the current card preview')
    const routineSummary = 'article[aria-label^="상체 PUSH"] button[aria-haspopup=menu]'
    await tap(routineSummary)
    await evaluate(`document.querySelector('${routineSummary}').focus()`)
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'})
    assert.equal(await evaluate(`document.querySelector('article[aria-label^="상체 PUSH"] button[aria-haspopup=menu]').ariaExpanded==='true'`),false)
    assert.equal(await evaluate(`document.activeElement.matches('article button[aria-haspopup=menu]')`),true)
    const summaryStyle = () => evaluate(`(() => {
      const summary = document.querySelector('${routineSummary}'), style = getComputedStyle(summary)
      return [summary === document.activeElement, style.outlineStyle, style.webkitTapHighlightColor]
    })()`)
    assert.deepEqual(await summaryStyle(), [true, 'solid', 'rgba(0, 0, 0, 0)'])
    const menuPoint = await evaluate(`(() => {
      const summary = document.querySelector('${routineSummary}')
      summary.scrollIntoView({ block: 'center', behavior: 'instant' })
      const { x, y, width, height } = summary.getBoundingClientRect()
      return { x: x + width / 2, y: y + height / 2 }
    })()`)
    await send('Emulation.setTouchEmulationEnabled', { enabled: true })
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [menuPoint] })
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    assert.equal(await evaluate(`document.querySelector('${routineSummary}').ariaExpanded === 'true'`), true)
    assert.deepEqual(await summaryStyle(), [true, 'none', 'rgba(0, 0, 0, 0)'], 'touching the focused menu hides its ring without blurring it')
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' })
    assert.deepEqual(await summaryStyle(), [true, 'solid', 'rgba(0, 0, 0, 0)'], 'returning to the keyboard restores the menu focus ring')
    const routineMenuCard = 'article[aria-label^="상체 PUSH"]'
    for (const width of [393,1280]) {
      const mobile = width < 500
      await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile})
      await send('Emulation.setTouchEmulationEnabled',{enabled:mobile})
      await evaluate(`document.querySelector('${routineMenuCard}').scrollIntoView({block:'center',behavior:'instant'})`)
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
      await tap(routineMenuCard+' button[aria-haspopup=menu]')
      const point = await evaluate(`(()=>{
        const card=document.querySelector('${routineMenuCard}')
        const action=card.querySelector('[role=menu] button:last-child').getBoundingClientRect()
        const link=card.querySelector('button[aria-label$="상세"]').getBoundingClientRect()
        return {x:Math.round((Math.max(action.left,link.left)+Math.min(action.right,link.right))/2),
          y:Math.round((Math.max(action.top,link.top)+Math.min(action.bottom,link.bottom))/2)}
      })()`)
      const tapAt = async ({x,y}) => {
        if (mobile) {
          await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]})
          await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
        } else {
          await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',x,y,clickCount:1})
          await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',x,y,clickCount:1})
        }
      }
      const count = await evaluate('window.listUi.deleted.length')
      await tapAt(point)
      await wait(()=>evaluate(`document.querySelector('${routineMenuCard} button[aria-haspopup=menu]').ariaExpanded==='false'`))
      await click('취소')
      assert.equal(await evaluate(`document.elementFromPoint(${point.x},${point.y})?.closest('button')?.matches('[aria-label$="상세"]')`),true)
      await new Promise(resolve=>setTimeout(resolve,55))
      await tapAt(point)
      assert.equal(await evaluate(`!!document.querySelector('${detail}')`),false,'a distinct second press must not open the routine')
      await new Promise(resolve=>setTimeout(resolve,300))
      assert.equal(await evaluate(`!!document.querySelector('${detail}')`),false,'a discarded click is not replayed')
      await tapAt(point)
      await wait(()=>evaluate(`!!document.querySelector('${detail}')`))
      assert.equal(await evaluate('window.listUi.deleted.length'),count)
      await closeDetail()
    }
    // Keep the action trigger and expanded tabs visible together at the top of the routine list.
    await send('Emulation.setDeviceMetricsOverride',{width:393,height:1100,deviceScaleFactor:1,mobile:true})
    await send('Emulation.setTouchEmulationEnabled',{enabled:false})
    const selectedBeforeMenuAction=await evaluate('window.listUi.selected.length')
    await evaluate('window.scrollTo(0,0)')
    await wait(()=>evaluate('!!document.querySelector("nav button[data-tab=home]:not([inert])")'))
    await new Promise(resolve=>setTimeout(resolve,360))
    const homeTab=await evaluate('document.querySelector("nav button[data-tab=home]").getBoundingClientRect().toJSON()')
    assert.equal(await evaluate(`(() => { const trigger=document.querySelector('article[aria-label^="상체 PUSH"] button[aria-haspopup=menu]'); const {x,y,width,height}=trigger.getBoundingClientRect(); return trigger.contains(document.elementFromPoint(x+width/2,y+height/2)) })()`),true,'edit menu starts within the visible list')
    await tap(routineSummary)
    const routineEditAction = routineMenuCard + ' [role=menu] button:first-child'
    await evaluate(`document.addEventListener('pointerdown', event => {
      if (event.target.matches(${JSON.stringify(routineEditAction)})) {
        document.querySelector('nav button[data-tab=home]').focus({preventScroll:true});
      }
    }, {once:true})`)
    await tap(routineEditAction)
    await wait(()=>evaluate(`document.querySelector('form input[placeholder="나의 루틴"]')!==null`))
    await identityMatches()
    await evaluate(`document.querySelector('[data-dropdown-label="루틴 태그"]').click()`)
    assert.equal(await evaluate(`document.querySelectorAll('[role="listbox"][aria-label="루틴 태그"] [role="option"]').length`),11,'creation and editing reuse exactly the same descriptive dropdown')
    await evaluate(`document.querySelector('[data-dropdown-label="루틴 태그"]').click()`)
    assert.equal(await evaluate('window.listUi.selected.length'),selectedBeforeMenuAction,'edit uses the scoped routine and opens only the editor')
    const cancelRect=await evaluate(`document.querySelector('${cancelEdit}').getBoundingClientRect().toJSON()`)
    const left=Math.max(homeTab.left,cancelRect.left), right=Math.min(homeTab.right,cancelRect.right)
    const top=Math.max(homeTab.top,cancelRect.top), bottom=Math.min(homeTab.bottom,cancelRect.bottom)
    assert.ok(left<right&&top<bottom)
    const overlap={x:Math.round((left+right)/2),y:Math.round((top+bottom)/2)}
    const touchAt=async point=>{
      await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]})
      await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    }
    await send('Emulation.setTouchEmulationEnabled',{enabled:true})
    await touchAt(overlap)
    await wait(()=>evaluate(`!document.querySelector('${editForm}')&&!!document.querySelector('nav')`),'routine tabs restored')
    assert.equal(await evaluate(`document.elementFromPoint(${overlap.x},${overlap.y}).closest('button')?.dataset.tab`),'home')
    await touchAt(overlap)
    assert.equal(await evaluate('document.querySelector("nav button[aria-current=page]")?.dataset.tab'),'routines','the rapid second tap must not leave the routine list')
    await new Promise(resolve=>setTimeout(resolve,300))
    await touchAt(overlap)
    await wait(()=>evaluate('document.querySelector("nav button[aria-current=page]")?.dataset.tab==="home"'),'deliberate tab tap works after guard')
    await send('Emulation.setTouchEmulationEnabled',{enabled:false})
    await viewport(393)
    await evaluate('window.listUi.showRoutines()')
    await wait(()=>evaluate('document.querySelector("nav button[aria-current=page]")?.dataset.tab==="routines"'))
    await tap('article[aria-label^="상체 PUSH"] button[aria-haspopup=menu]');await tap('article[aria-label^="상체 PUSH"] [role=menu] button:last-child')
    await click('삭제','dialog[open] button')
    assert.equal(await evaluate('window.listUi.deleted.at(-1)'),await evaluate('window.listUi.ids[0]'))
    assert.equal(await evaluate('window.listUi.selected.length'),selectedBeforeMenuAction+1,'delete verifies once without a bubbling card-detail selection')
    assert.equal(await evaluate('document.querySelectorAll("[data-tone=success]").length'),1)
    const routineLayout = () => evaluate(`(() => { const r = document.querySelector('.workout-online').getBoundingClientRect(); return [r.y,r.height,scrollY] })()`)
    const withToast = await routineLayout()
    await tap('button[aria-label="알림 닫기"]')
    assert.deepEqual(await routineLayout(),withToast,'a toast has no effect on page height or scroll')
    await click('주간 일정 편집')
    await wait(()=>evaluate(`!!document.querySelector('form[aria-label="주간 일정 편집"]')`))
    assert.equal(await evaluate(`document.querySelectorAll('form button[data-dropdown-label$="요일 루틴"]').length`),7)
    assert.equal(await evaluate(`document.querySelector('article').getClientRects().length`),0,'weekly editing is a separate view')
    await tap('[data-dropdown-label="월요일 루틴"]')
    assert.deepEqual(await evaluate(`(() => {
      const button=document.querySelector('[data-dropdown-label="월요일 루틴"]'), panel=document.getElementById(button.getAttribute('aria-controls'));
      return [panel.querySelector('input')===null,panel.querySelectorAll('[aria-selected=true]').length,panel.contains(document.activeElement)];
    })()`),[true,1,false],'weekday opening shows just one selected value and leaves focus outside the list')
    await tap('[data-dropdown-label="월요일 루틴"]')
    const third=await evaluate('window.listUi.ids[2]'), first=await evaluate('window.listUi.ids[0]')
    const measureCandidates=()=>evaluate(`Array.from(document.querySelectorAll('button[data-dropdown-label$="요일 루틴"]')).map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().top+scrollY,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,text:e.textContent.trim()}))`)
    await input('[data-dropdown-label="월요일 루틴"]',third);await input('[data-dropdown-label="화요일 루틴"]',third);await input('[data-dropdown-label="수요일 루틴"]','')
    for(const width of [393,320]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true})
      await click('전체 보기')
      const baseline=await measureCandidates()
      const stable=async name=>assert.deepEqual(await measureCandidates(),baseline,name+' preserves all seven row bounds and selected option labels')
      const controls=await evaluate(`Array.from(document.querySelectorAll('[aria-label="루틴 후보 필터"] > div > button,[aria-label="루틴 후보 필터"] > button')).map(e=>({top:e.getBoundingClientRect().top,width:e.getBoundingClientRect().width,scroll:e.scrollWidth,client:e.clientWidth}))`)
      assert.equal(controls.length,3);assert(controls.every(c=>Math.abs(c.top-controls[0].top)<1&&c.scroll<=c.client),'three controls stay on one row without clipped text')
      assert(baseline.every(row=>row.width===baseline[0].width),'all seven weekday controls have identical available width')
      await verifyLayout('candidate-default-'+width,width)
      await tap('[data-dropdown-label="배정 유무"]');await stable('assignment-open')
      await verifyLayout('candidate-assignment-'+width,width)
      await click('배정 미완료');await stable('unassigned')
      assert.equal((await dropdownOptions(evaluate, '[data-dropdown-label="목요일 루틴"]')).some(o=>o.id===third),true)
      await tap('[data-dropdown-label="태그"]');await stable('tag-open')
      assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[role="listbox"][aria-label="태그"] button')).map(b=>b.textContent)`),['PUSH','CARDIO'])
      await verifyLayout('candidate-tags-'+width,width)
      await click('PUSH');await stable('push')
      assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="태그"]').getAttribute('aria-label')`),'태그: PUSH')
      assert.doesNotMatch(await evaluate(`document.querySelector('[data-dropdown-label="태그"]').textContent`),/태그[: ·]/)
      assert.equal(await evaluate(`document.querySelector('[role="listbox"][aria-label="태그"]')`),null)
      await verifyLayout('candidate-selected-'+width,width)
      assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="월요일 루틴"]').dataset.value`),third)
      assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="금요일 루틴"]').dataset.value`),first)
      assert.equal((await dropdownOptions(evaluate, '[data-dropdown-label="목요일 루틴"]')).filter(o=>o.id).length,1)
      await tap('[data-dropdown-label="배정 유무"]');await click('배정 완료');await stable('assigned')
      assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="태그"]').getAttribute('aria-label')`),'태그')
      await click('전체 보기');await stable('reset')
      assert.equal(await evaluate(`document.querySelectorAll('[aria-label="루틴 후보 필터"] button[aria-pressed="true"]').length`),1)
    }
    await verifyLayout('schedule-editor-393',393);await verifyLayout('schedule-editor-320',320)
    assert.equal(await evaluate('window.listUi.requests.filter(r=>r.method==="PUT").length'),0)
    await evaluate('window.listUi.setActive(true)');await new Promise(r=>setTimeout(r,80))
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="월요일 루틴"]').matches(':disabled')`),true)
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="월요일 루틴"]').dataset.value`),third)
    await evaluate('window.listUi.setActive(false)');await new Promise(r=>setTimeout(r,80))
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="월요일 루틴"]').matches(':disabled')`),false)
    await evaluate('window.listUi.activeError=true');await click('일정 저장');await click('저장','dialog[open] button')
    assert.match(await evaluate(`document.querySelector('[role="alert"]').textContent`),/진행 중인 운동/)
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="월요일 루틴"]').dataset.value`),third)
    await evaluate('window.listUi.activeError=false;window.listUi.versionConflict=true');await click('일정 저장');await click('저장','dialog[open] button')
    await wait(()=>evaluate(`document.querySelector('[data-tone=warning]')?.textContent.includes('일정이 변경됐어요')`))
    await click('최신 일정 확인')
    await wait(()=>evaluate(`!document.querySelector('[data-tone=warning]')`))
    await wait(()=>evaluate(`!![...document.querySelectorAll('form[aria-label="주간 일정 편집"] button')].find(b=>b.textContent==='일정 저장'&&!b.disabled)`))
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="월요일 루틴"]').dataset.value`),third)
    await evaluate('window.listUi.versionConflict=false;window.listUi.loseAck=true');await click('일정 저장');await click('저장','dialog[open] button')
    await wait(()=>evaluate(`document.querySelector('[data-tone=warning]')?.textContent.includes('일정 저장 결과를 확인하지 못했어요')`))
    const written=await evaluate('window.listUi.requests.filter(r=>r.method==="PUT").length')
    await wait(()=>evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent==='최신 일정 확인')`))
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="월요일 루틴"]').dataset.value`),third)
    await click('최신 일정 확인');await wait(()=>evaluate('!!document.querySelector("dialog[open]")'));await click('버리기','dialog[open] button');await click('닫기')
    assert.equal(await evaluate('window.listUi.requests.filter(r=>r.method==="PUT").length'),written,'lost ACK recovery must not send another PUT')
    assert.deepEqual(await evaluate('window.listUi.calendar().assignments'),[{dayOfWeek:1,routineId:third},{dayOfWeek:2,routineId:third},{dayOfWeek:5,routineId:first}])
    await evaluate('window.listUi.showHome()');await wait(()=>evaluate(`!!document.querySelector('[aria-label="홈"] [aria-label="이번 주 일정"] button')`))
    assert.match(await evaluate(`document.querySelectorAll('[aria-label="홈"] [aria-label="이번 주 일정"] button')[1].getAttribute('aria-label')`),/태그 없는/)
    assert.doesNotMatch(await evaluate(`document.querySelector('[aria-label="홈"] [aria-label="이번 주 일정"]').textContent`),/\?/)
    assert.doesNotMatch(await evaluate(`Array.from(document.querySelectorAll('[aria-label="홈"] [aria-label="이번 주 일정"] button > strong')).map(e=>e.textContent).join('')`),/[?·△×]/)
    await verifyLayout('home-week-393',393);await verifyLayout('home-week-320',320)
    const firstMark=()=>evaluate(`document.querySelector('[aria-label="홈"] [aria-label="이번 주 일정"] button > strong')?.textContent`)
    for(const [state,mark]of [['pending','월'],['completed','✓'],['partial','월'],['missed','×'],['rest','–']]){
      await evaluate(`window.listUi.setHomeReview(${JSON.stringify(state)})`);await wait(async()=>await firstMark()===mark)
      await verifyLayout('home-week-'+state+'-393',393);await verifyLayout('home-week-'+state+'-320',320)
    }
    const homeStart = '[aria-label="홈"] button[data-click-action="start"]'
    const todayChooser = '[data-dropdown-label="오늘만 다른 루틴 선택"]'
    const assertRestStart = async () => {
      await wait(() => evaluate(`document.querySelector('[aria-label="오늘의 루틴"] h2')?.textContent==='오늘은 쉬어가는 날'`))
      assert.equal(await evaluate(`document.querySelector('${homeStart}')`),null)
      assert.equal(await evaluate(`(() => {
        const today=document.querySelector('[aria-label="오늘의 루틴"]'), chooser=today.nextElementSibling
        return (chooser.matches('${todayChooser}') || !!chooser.querySelector('${todayChooser}')) &&
          Math.abs(chooser.getBoundingClientRect().top-today.getBoundingClientRect().bottom-parseFloat(getComputedStyle(today.parentElement).rowGap))<1
      })()`),true,'rest keeps a single layout gap before the routine chooser')
    }
    const assignments = await evaluate('window.listUi.calendar().assignments')
    await evaluate('window.listUi.setHomeSchedule([])')
    await assertRestStart()
    await openDropdown(evaluate, todayChooser)
    await tap('[aria-label="루틴 일정 필터"] button:first-child')
    await wait(() => evaluate(`!!document.querySelector('[aria-label="선택할 루틴"] button:not(:disabled)')`))
    await tap('[aria-label="선택할 루틴"] button:not(:disabled)')
    await wait(() => evaluate(`!!document.querySelector('${homeStart}:enabled')`))
    await openDropdown(evaluate, todayChooser)
    await click('오늘의 원래 일정으로')
    await assertRestStart()
    await evaluate(`window.listUi.setHomeSchedule([{dayOfWeek:window.listUi.todayWeekday(),routineId:${JSON.stringify(first)}}])`)
    await wait(() => evaluate(`!!document.querySelector('${homeStart}:enabled')`))
    await openDropdown(evaluate, todayChooser)
    await tap('[aria-label="루틴 일정 필터"] button:last-child')
    await tap('[aria-label="선택할 루틴"] button')
    await assertRestStart()
    await openDropdown(evaluate, todayChooser)
    await click('오늘의 원래 일정으로')
    await wait(() => evaluate(`!!document.querySelector('${homeStart}:enabled')`))
    await evaluate("window.listUi.deloadPeriod={status:'ACTIVE',method:'KEEP',currentMethod:'REST'};window.listUi.refresh()")
    await wait(() => evaluate(`document.querySelector('[aria-label="오늘의 루틴"]').textContent.includes('디로딩 진행 중에는')`))
    assert.equal(await evaluate(`document.querySelector('${homeStart}')`),null,'current complete rest overrides the ordinary scheduled routine')
    await evaluate("window.listUi.deloadPeriod={status:'ACTIVE',method:'REST',currentMethod:'KEEP'};window.listUi.refresh()")
    await wait(() => evaluate(`!!document.querySelector('${homeStart}:disabled')`))
    await evaluate(`window.listUi.deloadPeriod=null;window.listUi.setHomeSchedule(${JSON.stringify(assignments)})`)
    await evaluate('window.listUi.showRoutines()');await wait(()=>evaluate(`document.querySelector('[aria-label="가로 주간 일정"] button:nth-child(2) > span').title.includes('태그 없는')`))
    await evaluate('window.listUi.setActive(true)');await new Promise(r=>setTimeout(r,80))
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='주간 일정 편집').disabled`),true)
    await evaluate('window.listUi.setActive(false);window.listUi.setAttempt(true)');await new Promise(r=>setTimeout(r,80))
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='주간 일정 편집').disabled`),true)
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='+ 새 루틴').disabled`),true)
    await tap('article button[aria-haspopup=menu]')
    assert.equal(await evaluate(`document.querySelector('article [role=menu] button').disabled`),true)
    assert.equal(await evaluate(`document.querySelector('article button[aria-label$="상세"]').disabled`),false,'pending writes must not block reading routine details')
    await evaluate('window.listUi.setAttempt(false)');await new Promise(r=>setTimeout(r,80))
    const workspace = '.workout-online[aria-label="루틴"]'
    assert.equal(await evaluate(`document.querySelector('${workspace} > .section-heading')`),null,'the accessible routine region has no normal refresh row')
    await click('주간 일정 편집')
    await input('[data-dropdown-label="월요일 루틴"]',first)
    const retrySchedule = 'form[aria-label="주간 일정 편집"] button[data-refresh]'
    const canSaveSchedule = () => evaluate(`document.querySelector('form[aria-label="주간 일정 편집"] button.primary')?.disabled === false`)
    const canRetrySchedule = () => evaluate(`document.querySelector('${retrySchedule}')?.disabled === false`)
    const scheduleGeometry = () => evaluate(`(() => {
      const form=document.querySelector('form[aria-label="주간 일정 편집"]');
      return [form.firstElementChild.getBoundingClientRect().y, form.querySelector('fieldset').getBoundingClientRect().y, scrollY];
    })()`)
    const geometryBeforeError = await scheduleGeometry()
    assert.equal(await canSaveSchedule(),true)
    await evaluate('window.listUi.scheduleReadError=true;window.listUi.refresh()')
    await wait(canRetrySchedule)
    assert.equal(await canSaveSchedule(),false)
    assert.deepEqual(await scheduleGeometry(),geometryBeforeError,'the schedule header, fields, and scroll stay fixed during read failure')
    assert.equal(await evaluate(`document.querySelectorAll('${workspace} [data-tone="error"]').length`),1)
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="월요일 루틴"]').dataset.value`),first)
    await evaluate('window.listUi.scheduleReadError=false')
    await tap(retrySchedule)
    await wait(async()=>!await canRetrySchedule() && await canSaveSchedule())
    assert.deepEqual(await scheduleGeometry(),geometryBeforeError,'recovery keeps the same form geometry')
    assert.equal(await evaluate(`document.querySelector('[data-dropdown-label="월요일 루틴"]').dataset.value`),first)
    for(const day of ['월','화','수','목','금','토','일'])await input(`[data-dropdown-label="${day}요일 루틴"]`,'')
    const beforeRest=await evaluate('window.listUi.requests.filter(r=>r.method==="PUT").length')
    await click('일정 저장');await click('저장','dialog[open] button');await wait(()=>evaluate(`!document.querySelector('form[aria-label="주간 일정 편집"]')`))
    assert.equal(await evaluate('window.listUi.requests.filter(r=>r.method==="PUT").length'),beforeRest+1,'all seven rest choices save in one PUT')
    assert.deepEqual(await evaluate('window.listUi.calendar().assignments'),[])
    const registered=await evaluate('window.listUi.calendar().version')
    await click('주간 일정 편집')
    assert.equal(await evaluate(`document.querySelector('form[aria-label="주간 일정 편집"] button[type=submit], form[aria-label="주간 일정 편집"] > button.primary').disabled`),true)
    await click('닫기')
    assert.equal(await evaluate('window.listUi.calendar().version'),registered)
    assert.equal(await evaluate('window.listUi.requests.filter(r=>r.method==="PUT").length'),beforeRest+1,'registered no-op needs no extra PUT')
    await evaluate('window.listUi.holdRead=true;window.listUi.refresh()');await wait(()=>evaluate('typeof window.listUi.releaseRead==="function"'))
    await evaluate('window.listUi.useUnregistered()');await wait(()=>evaluate(`document.querySelector('[aria-label="가로 주간 일정"]').textContent.includes('휴식')`))
    await evaluate('window.listUi.releaseRead()');await new Promise(r=>setTimeout(r,100))
    assert.match(await evaluate(`document.querySelector('[aria-label="가로 주간 일정"]').textContent`),/월휴식화휴식수휴식목휴식금휴식토휴식일휴식/,'late reads cannot restore an older schedule')
    await click('주간 일정 편집');await click('일정 저장');await click('저장','dialog[open] button');await wait(()=>evaluate(`!document.querySelector('form[aria-label="주간 일정 편집"]')`))
    assert.equal(await evaluate('window.listUi.calendar().version'),'1')
    await wait(()=>evaluate(`document.querySelector('[aria-label="가로 주간 일정"]').textContent.includes('휴식')`))


  } finally {
    if (ws?.readyState === 1) { try { await send('Browser.close') } catch { /* closed */ } }
    if (browser?.exitCode === null) await new Promise(r => browser.once('exit', r))
    ws?.close(); await server.close()
    const own = relative(directory, profile)
    assert(!isAbsolute(own) && /^profile-[a-f0-9-]+$/.test(own))
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
