import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

test('workout feedback keeps manual rest silent through queued writes and fits actual title widths', { timeout: 90000 }, async () => {
  const directory = resolve('logs/workout-feedback-ui'), profile = resolve(directory, 'profile-' + crypto.randomUUID())
  await mkdir(profile, { recursive: true })
  const server = await createServer({ configFile: false, envDir: false, cacheDir: resolve(directory,'vite-cache'), plugins: [{ name: 'workout-feedback-only', enforce: 'pre',
    configureServer(vite) { vite.middlewares.use('/boundary', async (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml('/boundary', '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/fixtures/workout-feedback-ui.jsx"></script></body></html>')) }) },
  }, react()], server: { host: '127.0.0.1', port: 0, watch: { ignored: ['**/logs/**'] } }, clearScreen: false })
  let browser, ws, next = 0
  const pending = new Map()
  const wait = async fn => { const until = Date.now() + 12000; while (Date.now() < until) { const r = await fn(); if (r) return r; await new Promise(r => setTimeout(r, 30)) } throw Error('Component DOM transition timeout') }
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++next; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? 'Component error'); return r.result.value }
  try {
    await server.listen()
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`
    browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--enable-smooth-scrolling', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
    const port = await wait(async () => { try { return Number((await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { return false } })
    const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page')
    ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
    ws.onmessage = e => { const m = JSON.parse(e.data), p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result) } }
    ws.onclose = () => { for (const p of pending.values()) p.reject(Error('Browser closed')); pending.clear() }
    await send('Page.enable'); await send('Page.navigate', { url: origin + '/boundary' })


    await wait(()=>evaluate('!!window.feedback?.ready'))
    const click=async text=>{await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled).click()`)}
    const viewport = width => send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true})
    const closeKeyboard = async () => {
      await evaluate(`delete visualViewport.height;delete visualViewport.offsetTop;delete visualViewport.pageTop;visualViewport.dispatchEvent(new Event('resize'))`)
      await wait(() => evaluate(`!document.querySelector('[data-keyboard-open]')`))
    }
    const verifyKeyboardField = async (selector, modal = false) => {
      const previousScroll = await evaluate(`(()=>{
        document.querySelector(${JSON.stringify(selector)}).focus({preventScroll:true})
        Object.defineProperty(visualViewport,'height',{configurable:true,value:260})
        Object.defineProperty(visualViewport,'offsetTop',{configurable:true,value:20})
        Object.defineProperty(visualViewport,'pageTop',{configurable:true,get:()=>scrollY+20})
        visualViewport.dispatchEvent(new Event('resize'))
        return scrollY
      })()`)
      await wait(() => evaluate(`(()=>{
        const input=document.activeElement,vv=visualViewport,r=input.getBoundingClientRect()
        const dialog=input.closest('dialog'),d=dialog?.getBoundingClientRect()
        return input.matches(${JSON.stringify(selector)})&&parseFloat(getComputedStyle(input).fontSize)>=16
          &&vv.scale===1&&r.top>=vv.offsetTop+8&&r.bottom<=vv.offsetTop+vv.height-8
          &&r.left>=0&&r.right<=innerWidth&&(!${modal}||d&&d.top>=vv.offsetTop&&d.bottom<=vv.offsetTop+vv.height)
      })()`)).catch(async error => {
        const geometry = await evaluate(`(()=>{
          const input=document.querySelector(${JSON.stringify(selector)}),vv=visualViewport
          return {focused:document.activeElement===input,font:getComputedStyle(input).fontSize,
            rect:input.getBoundingClientRect().toJSON(),scrollY,scale:vv.scale,inset:vv.offsetTop,height:vv.height,
            keyboard:document.querySelector('.app-shell').dataset.keyboardOpen,clearance:document.querySelector('main').style.getPropertyValue('--editor-keyboard-space')}
        })()`)
        throw new Error(selector + ' keyboard geometry: ' + JSON.stringify(geometry), {cause:error})
      })
      if (modal) {
        assert.equal(await evaluate('scrollY'),previousScroll,'modal keyboard positioning leaves background scroll unchanged')
        assert.equal(await evaluate(`(()=>{
          const dialog=document.activeElement.closest('dialog')
          const confirm=[...dialog.querySelectorAll('button')].find(button=>button.textContent==='확인')
          dialog.scrollTop=dialog.scrollHeight
          const {top,bottom}=confirm.getBoundingClientRect()
          return top>=visualViewport.offsetTop&&bottom<=visualViewport.offsetTop+visualViewport.height
        })()`),true,'the modal confirmation can be reached above the keyboard')
        assert.equal(await evaluate('scrollY'),previousScroll,'scrolling the dialog does not move the background')
      }
    }
    await viewport(320)
    {
      const result = await evaluate(`(async () => {
        const field=document.querySelector('[data-workout-memo]'), vv=visualViewport
        const original=window.scrollTo, calls=[]
        const settle=()=>new Promise(resolve=>setTimeout(resolve,250))
        window.scrollTo=(...args)=>{calls.push(args);original.apply(window,args)}
        try {
          const end=document.scrollingElement.scrollHeight-innerHeight
          original.call(window,0,Math.max(0,end-35))
          field.focus({preventScroll:true})
          // Emulate the native reveal, leaving the field fully visible with only 4px to spare.
          original.call(window,0,end)
          const height=innerHeight-300
          Object.defineProperty(vv,'height',{configurable:true,value:height})
          Object.defineProperty(vv,'offsetTop',{configurable:true,value:field.getBoundingClientRect().bottom+4-height})
          Object.defineProperty(vv,'pageTop',{configurable:true,get:()=>scrollY+vv.offsetTop})
          vv.dispatchEvent(new Event('resize'));await settle()
          const opened=scrollY
          field.blur();delete vv.height;delete vv.offsetTop;delete vv.pageTop;vv.dispatchEvent(new Event('resize'))
          await settle()
          return {calls,opened,closed:scrollY,end}
        } finally { window.scrollTo=original }
      })()`)
      assert.deepEqual(result, {calls:[],opened:result.end,closed:result.end,end:result.end}, 'the app keeps a visible memo in place through dismissal')
    }
    const memoRunway = []
    for (const width of [320, 375, 393, 430]) {
      await viewport(width)
      const reducedMotion = width === 430
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:reducedMotion?'reduce':'no-preference'}]})
      const result = await evaluate(`(async () => {
        const field=document.querySelector('[data-workout-memo]'), frame=field.closest('[data-workout-frame]')
        const page=document.scrollingElement, vv=visualViewport, scroll=window.scrollTo, calls=[]
        const settle=()=>new Promise(resolve=>setTimeout(resolve,260))
        const until=async (condition, label)=>{
          const deadline=performance.now()+2500
          while (!condition()) {
            if (performance.now()>deadline) throw Error('Memo '+label+' timed out at '+scrollY+'px with '+space()+'px reserved')
            await new Promise(requestAnimationFrame)
          }
        }
        const touch=type=>field.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'touch',isPrimary:true}))
        const touchGesture=(type, held)=>{
          const event=new Event(type,{bubbles:true})
          Object.defineProperty(event,'touches',{value:held?[{}]:[]})
          field.dispatchEvent(event)
        }
        const space=()=>parseFloat(frame.style.getPropertyValue('--workout-memo-space'))||0
        const footer=()=>getComputedStyle(frame.querySelector('footer')).display
        const attempts=[]
        try {
          await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
          const ordinaryLimit=page.scrollHeight-page.clientHeight
          const visible=innerHeight/2
          scroll.call(window,0,ordinaryLimit)
          const rect=field.getBoundingClientRect()
          const nativeTarget=Math.round(scrollY+rect.top+rect.height/2-visible/2)
          touch('pointerdown')
          const cancelledSpace=space()
          touch('pointercancel')
          await settle()
          const afterCancel=space()
          for (let attempt=0;attempt<2;attempt++) {
            const firstAttempt=attempt===0
            const manual=firstAttempt && ${width === 375}
            const fastRefocus=firstAttempt && ${width === 393}
            const y=scrollY, top=field.getBoundingClientRect().top, unfocused=document.activeElement!==field
            touch('pointerdown')
            const prepared={pixels:space(),y:scrollY,top:field.getBoundingClientRect().top,focused:document.activeElement===field}
            touch('pointerup')
            field.focus({preventScroll:true})
            // Chrome cannot produce the iPhone keyboard. Replay the native centering
            // move with the real document scroll limit and inspect subsequent app calls.
            scroll.call(window,0,nativeTarget)
            const nativeY=scrollY
            window.scrollTo=(...args)=>{calls.push(args);scroll.apply(window,args)}
            const callStart=calls.length
            Object.defineProperty(vv,'height',{configurable:true,value:visible})
            vv.dispatchEvent(new Event('resize'))
            await settle()
            const opened={y:scrollY,pixels:space(),bottom:field.getBoundingClientRect().bottom,footer:footer()}
            field.blur()
            Object.defineProperty(vv,'height',{configurable:true,value:innerHeight-70})
            vv.dispatchEvent(new Event('resize'))
            await settle()
            const closing={pixels:space(),footer:footer()}
            delete vv.height
            vv.dispatchEvent(new Event('resize'))
            await until(()=>footer()==='grid','footer restoration')
            const restored={y:scrollY,pixels:space()}
            let interrupted
            if (manual) {
              touchGesture('touchstart',true)
              scroll.call(window,0,ordinaryLimit+12)
              await settle()
              interrupted={y:scrollY,pixels:space(),calls:calls.length-callStart}
              scroll.call(window,0,ordinaryLimit-12)
              touchGesture('touchend',false)
            }
            if (fastRefocus) {
              await until(()=>calls.length>callStart,'start of automatic return')
              const beforeRetouch=scrollY
              touch('pointerdown')
              interrupted={beforeRetouch,y:scrollY,pixels:space(),calls:calls.slice(callStart)}
              touch('pointerup')
              field.focus({preventScroll:true})
              scroll.call(window,0,nativeTarget)
              Object.defineProperty(vv,'height',{configurable:true,value:visible})
              vv.dispatchEvent(new Event('resize'))
              await settle()
              interrupted.reopened={y:scrollY,pixels:space(),footer:footer(),calls:calls.length-callStart}
              field.blur()
              delete vv.height
              vv.dispatchEvent(new Event('resize'))
            }
            const positions=[]
            await until(()=>{
              positions.push(scrollY)
              return space()===0
            },'clearance removal')
            attempts.push({y,top,unfocused,prepared,nativeY,opened,closing,restored,interrupted,
              closed:{y:scrollY,pixels:space(),footer:footer()},calls:calls.slice(callStart),positions})
            window.scrollTo=scroll
          }
          return {ordinaryLimit,nativeTarget,visible,attempts,cancelledSpace,afterCancel}
        } finally {
          window.scrollTo=scroll
          delete vv.height
        }
      })()`)
      const [first, second] = result.attempts
      assert.ok(result.nativeTarget > result.ordinaryLimit, 'fixture needs additional scroll range')
      assert.ok(result.cancelledSpace > 0 && result.afterCancel === 0, 'a touch that becomes a gesture releases the preparation')
      for (const attempt of result.attempts) {
        assert.equal(attempt.unfocused,true)
        assert.deepEqual(attempt.prepared,{pixels:first.prepared.pixels,y:attempt.y,top:attempt.top,focused:false}, 'touch adds space before focus without moving the memo or accumulating')
        assert.equal(attempt.nativeY,result.nativeTarget)
        assert.equal(attempt.opened.y,attempt.nativeY)
        assert.equal(attempt.opened.pixels,first.prepared.pixels)
        assert.ok(attempt.opened.bottom <= result.visible)
        assert.deepEqual(attempt.closing,{pixels:first.prepared.pixels,footer:'none'})
        assert.deepEqual(attempt.restored,{y:attempt.nativeY,pixels:first.prepared.pixels}, 'viewport and footer restore before scrolling or removing the space')
        assert.ok(attempt.closed.y<=result.ordinaryLimit && attempt.closed.y>=result.ordinaryLimit-12,
          width+'px ended at '+attempt.closed.y+'px; expected normal limit '+result.ordinaryLimit+'px')
        assert.equal(attempt.closed.pixels,0)
        assert.equal(attempt.closed.footer,'grid')
      }
      assert.equal(second.y,first.closed.y,'refocus starts at the recovered position')
      const returnCall = [{top:result.ordinaryLimit,behavior:reducedMotion?'instant':'smooth'}]
      assert.deepEqual(second.calls,returnCall.map(call=>[call]),'visible memo uses only one scroll, after the keyboard closes')
      assert.ok(second.positions.every((y,index,readings)=>index===0 || y<=readings[index-1]),'automatic return never moves in reverse')
      if (!reducedMotion) assert.ok(second.positions.some(y=>y<second.nativeY && y>result.ordinaryLimit),'smooth return moves through intermediate positions')
      if (width === 375) {
        assert.deepEqual(first.interrupted,{y:result.ordinaryLimit+12,pixels:first.prepared.pixels,calls:0},'a held touch and manual scrolling postpone automatic return')
        assert.deepEqual(first.calls,[],'a manual return into the normal range needs no added scroll')
      } else if (width === 393) {
        assert.equal(first.interrupted.y,first.interrupted.beforeRetouch,'refocus stops the return without jumping')
        assert.deepEqual(first.interrupted.reopened,{y:result.nativeTarget,pixels:first.prepared.pixels,footer:'none',calls:2})
        assert.deepEqual(first.calls,[[returnCall[0]],[{left:0,top:first.interrupted.beforeRetouch,behavior:'instant'}],[returnCall[0]]])
      } else {
        assert.deepEqual(first.calls,returnCall.map(call=>[call]))
      }
      memoRunway.push({ width, ...result })
    }
    await send('Emulation.setEmulatedMedia',{features:[]})
    await viewport(320)
    const memoEntry = await evaluate(`(async()=>{
      const field=document.querySelector('[data-workout-memo]')
      const frame=field.closest('[data-workout-frame]')
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))
      window.scrollTo(0,document.documentElement.scrollHeight-innerHeight)
      const before=scrollY
      const paddingBefore=getComputedStyle(frame).paddingBottom
      field.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))
      field.focus({preventScroll:true})
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))
      return {before,after:scrollY,paddingBefore,paddingAfter:getComputedStyle(frame).paddingBottom}
    })()`)
    assert.ok(memoEntry.before>0)
    assert.ok(Math.abs(memoEntry.after-memoEntry.before)<=1,'memo focus must not shrink the scroll range before the keyboard opens')
    assert.equal(memoEntry.paddingAfter,memoEntry.paddingBefore,'memo focus must keep the measured footer reservation while hiding the footer')
    const workoutFooter='[data-workout-frame] > footer'
    const workoutIdentity=()=>evaluate(`(()=>{
      const {sessionId,currentExerciseId,localRevision}=window.feedback.c.getSnapshot().workout
      return {sessionId,currentExerciseId,localRevision,rest:window.feedback.currentRest()}
    })()`)
    const beforeKeyboard=await workoutIdentity()
    await evaluate(`(async()=>{
      const memo=document.querySelector('[data-workout-memo]')
      memo.blur()
      for (const type of ['pointerdown','pointerup']) memo.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,pointerType:'touch',isPrimary:true}))
      memo.focus({preventScroll:true})
      Object.defineProperty(visualViewport,'height',{configurable:true,value:innerHeight/2})
      visualViewport.dispatchEvent(new Event('resize'))
    })()`)
    await wait(()=>evaluate(`!!document.querySelector('[data-keyboard-open] [data-memo-keyboard-space]')`))
    await evaluate(`document.activeElement.blur();delete visualViewport.height
      visualViewport.dispatchEvent(new Event('resize'));window.feedback.record('chart')`)
    await wait(()=>evaluate(`!document.querySelector('[data-workout-frame]') && !document.querySelector('[data-keyboard-open]')`))
    await evaluate(`window.feedback.record(null)`)
    await wait(()=>evaluate(`!!document.querySelector('[data-workout-memo]')`))
    assert.equal(await evaluate(`!!document.querySelector('[data-memo-keyboard-space]')`),false,'returning to the workout does not reuse the previous screen’s temporary clearance')
    assert.deepEqual(await workoutIdentity(),beforeKeyboard,'leaving during keyboard dismissal preserves the session')
    await verifyKeyboardField('[data-workout-memo]')
    await evaluate(`document.querySelector('button[aria-label="1세트 이번 반복 횟수"]').click()`)
    await click('직접 입력')
    await verifyKeyboardField('dialog[open] input',true)
    assert.equal(await evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(workoutFooter)})).display`),'none')
    const modalPosition = await evaluate('scrollY')
    await click('취소')
    await closeKeyboard()
    await wait(()=>evaluate(`!document.querySelector('dialog[open]')&&document.querySelector(${JSON.stringify(workoutFooter)}).getClientRects().length>0`))
    assert.ok(Math.abs(await evaluate('scrollY - Math.min('+modalPosition+', document.documentElement.scrollHeight-innerHeight)'))<=1,'moving to a numeric input discards the prior memo restoration')
    assert.deepEqual(await workoutIdentity(),beforeKeyboard,'keyboard and cancel retain the workout identity, draft revision and rest state')
    // Start through the real completion UI to unlock audio, then shorten only the fixture clock.
    await click('운동 시작하기')
    await wait(()=>evaluate('document.querySelector(\'[aria-label="1세트 완료"]\')?.disabled === false'))
    await evaluate("document.querySelector('[aria-label=\"1세트 완료\"]').click()")
    await wait(()=>evaluate('!!window.feedback.currentRest()'))
    await evaluate('window.feedback.rest(1)')
    await wait(()=>evaluate('window.feedbackAudio.starts>0'))
    const before=await evaluate('window.feedbackAudio.starts')
    await click('휴식 종료');await click('휴식 종료').catch(()=>{})
    await new Promise(r=>setTimeout(r,350))
    assert.equal(await evaluate('window.feedbackAudio.starts'),before,'manual end cannot create a new 1-second tone')
    assert.equal(await evaluate('window.feedback.currentRest()'),null)
    assert.equal(await evaluate('document.body.textContent.includes("휴식 종료")'),false)
    assert(await evaluate('window.feedbackAudio.stops')>0,'manual end stops an active countdown tone')

    // Persisting an extension and a manual end must serialize, never drop the end or beep later.
    await evaluate('window.feedback.rest(1)');await new Promise(r=>setTimeout(r,80))
    await evaluate('window.feedback.hold()');await click('+30초')
    const prior=await evaluate('window.feedbackAudio.starts')
    await click('휴식 종료')
    await new Promise(r=>setTimeout(r,80))
    assert.equal(await evaluate('document.body.textContent.includes("휴식 종료")'),false,'manual hide is immediate even before durable completion')
    await evaluate('window.feedback.release()')
    await wait(()=>evaluate('window.feedback.currentRest()===null'))
    await new Promise(r=>setTimeout(r,350))
    assert.equal(await evaluate('window.feedbackAudio.starts'),prior,'queued extension cannot revive manual audio')

    await evaluate('window.feedback.rest(2)')
    const automatic=await evaluate('window.feedbackAudio.starts')
    await new Promise(r=>setTimeout(r,2400))
    assert(await evaluate('window.feedbackAudio.starts')>automatic,'automatic countdown still plays existing tones')
    const ended=await evaluate('window.feedbackAudio.starts')
    await new Promise(r=>setTimeout(r,350));assert.equal(await evaluate('window.feedbackAudio.starts'),ended,'automatic expiry does not repeat tones')

    // Model a browser interrupting an already activated context while the page is hidden.
    await evaluate(`(()=>{
      Object.defineProperty(document,'hidden',{configurable:true,value:true})
      window.feedbackAudio.context.state='suspended'
      document.dispatchEvent(new Event('visibilitychange'))
    })()`)
    await evaluate('window.feedback.rest(3)')
    await new Promise(r=>setTimeout(r,350))
    const hiddenAudio=await evaluate('({starts:window.feedbackAudio.starts,resumes:window.feedbackAudio.resumes})')
    assert.equal(hiddenAudio.starts,ended,'background ticks schedule no tones')
    await evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
    assert.equal(await evaluate('window.feedbackAudio.resumes'),hiddenAudio.resumes+1,'foregrounding resumes the existing activated context')
    await wait(()=>evaluate('window.feedbackAudio.starts>'+ended))
    await click('휴식 종료')

    const dimSwitch = '[role="switch"][aria-label="화면 어둡게"]'
    const dimmed = () => evaluate('!!document.querySelector("[data-workout-frame] [data-rest-countdown]")')
    const preference = value => evaluate(`document.querySelector(${JSON.stringify(dimSwitch)})?.getAttribute('aria-checked') === '${value}'`)
    const preferenceIcon = () => evaluate(`(() => {
      const svg = document.querySelector('section[aria-label="화면 어둡게 설정"] h2 svg');
      return [svg.querySelector('path').getAttribute('d'), getComputedStyle(svg).color];
    })()`)
    await evaluate("window.feedback.record('alerts')")
    await wait(() => preference('false'))
    const defaultIcon = await preferenceIcon()
    await evaluate(`document.querySelector(${JSON.stringify(dimSwitch)}).click()`)
    await wait(() => preference('true'))
    const savedIcon = await preferenceIcon()
    await evaluate("window.feedback.record('alerts-other')")
    await wait(() => preference('false'))
    assert.deepEqual(await preferenceIcon(), defaultIcon)
    await evaluate("window.feedback.record('alerts')")
    await wait(() => preference('true'))
    assert.deepEqual(await preferenceIcon(), savedIcon)
    await evaluate("window.feedback.record(null)")
    await wait(() => evaluate('!!document.querySelector("[data-workout-frame]")'))
    await evaluate('window.feedback.rest(12)')
    await wait(dimmed)
    await evaluate('window.feedback.rest(8)')
    await wait(() => evaluate('!!document.querySelector("[data-rest-countdown][data-warning]")'))
    await wait(() => evaluate(`(() => {
      const frame=document.querySelector('[data-workout-frame]'), footer=frame.querySelector('footer'), overlay=frame.querySelector('[data-rest-countdown]').parentElement;
      return !overlay.querySelector('button') && Math.abs(overlay.getBoundingClientRect().bottom-footer.getBoundingClientRect().top)<1;
    })()`))
    await click('+30초')
    await wait(async () => !await dimmed())
    assert.ok(await evaluate('Date.parse(window.feedback.currentRest().endsAt) - Date.now() > 36000'))
    await evaluate('window.feedback.rest(8)'); await wait(dimmed)
    await click('휴식 종료'); await wait(async () => !await dimmed())

    await evaluate("window.feedback.record('alerts')")
    await wait(() => preference('true'))
    await evaluate('document.querySelector(\'[role="switch"][aria-label="화면 깜빡임"]\').click()')
    await evaluate('document.querySelector(\'[role="switch"][aria-label="상단 상태 영역"]\').click()')
    await evaluate("window.feedback.record(null)")
    await wait(() => evaluate('!!document.querySelector("[data-workout-frame]")'))
    await evaluate('window.feedback.rest(4)')
    await wait(() => evaluate('!!document.querySelector("footer [data-flash=true]")'))
    assert.equal(await evaluate(`document.querySelector('[aria-label="운동 시간"]').hasAttribute('data-flash')`), false)
    await click('휴식 종료')

    const fonts=[]
    for(const width of [320,393,1280]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:width<500})
      let button
      for(const name of ['벤치프레스','케이블 오버헤드 트라이셉스 익스텐션','아주 긴 운동 이름 '.repeat(15)]){
        await evaluate(`window.feedback.title(${JSON.stringify(name)})`)
        await new Promise(r=>setTimeout(r,80))
        const box=await evaluate(`(()=>{const h=document.querySelector('[data-workout-frame] h1'),r=document.createRange();r.selectNodeContents(h);const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='종목 보기/변경'),hr=h.getBoundingClientRect(),br=b.getBoundingClientRect();return{font:parseFloat(getComputedStyle(h).fontSize),width:h.clientWidth,textWidth:r.getBoundingClientRect().width,title:h.textContent,ellipsis:getComputedStyle(h).textOverflow,button:[br.left,br.top,br.width,br.height],overlap:hr.right>br.left,overflow:document.documentElement.scrollWidth>innerWidth}})()`)
        assert(box.font>=16&&box.font<=29);assert.equal(box.overlap,false);assert.equal(box.overflow,false);assert.match(box.title,/01\./)
        if(name==='벤치프레스'){button=box.button;assert(box.font>=22)}
        else {assert.deepEqual(box.button,button,'title fit preserves button bounds');if(box.font>16)assert(box.textWidth<=box.width+1);else assert.equal(box.ellipsis,'ellipsis')}
        fonts.push({width,name,font:box.font,available:box.width,rendered:box.textWidth})
      }
      await writeFile(resolve(directory,'workout-feedback-'+width+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
    }

    await wait(()=>evaluate('!!window.progressProbe'))
    await evaluate("window.progressProbe.revision('1')")
    await wait(()=>evaluate('window.progressProbe.queries.length===1'))
    await evaluate("window.progressProbe.revision('2')")
    await wait(()=>evaluate('window.progressProbe.queries.length===2'))
    assert.equal(await evaluate('window.progressProbe.queries[0].signal.aborted'),true)
    await evaluate("window.progressProbe.answer(0,'INCREASE')")
    await new Promise(r=>setTimeout(r,50));assert.equal(await evaluate('document.querySelector("#progress-probe").textContent'),'NONE')
    await evaluate("window.progressProbe.answer(1,'DECREASE')")
    await wait(()=>evaluate('document.querySelector("#progress-probe").textContent==="DECREASE"'))
    await evaluate("window.progressProbe.revision('2')")
    await new Promise(r=>setTimeout(r,50));assert.equal(await evaluate('window.progressProbe.queries.length'),2,'same saved revision does not duplicate requests')
    await evaluate("window.progressProbe.revision('3',false)")
    await wait(()=>evaluate('document.querySelector("#progress-probe").textContent==="NONE"'))
    for(const width of [320,393,1280]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:width<500})
      for(const direction of ['increase','decrease']){
        await evaluate(`window.feedback.advice({direction:${JSON.stringify(direction)},kg:'99999999999999.999999'})`)
        await new Promise(r=>setTimeout(r,80))
        const size=await evaluate(`(()=>{const [a,b]=document.querySelector('footer').children,r=a.getBoundingClientRect(),s=b.getBoundingClientRect();return{card:[r.width,r.height],button:[s.width,s.height],gap:s.top-r.bottom,clipped:a.scrollHeight>a.clientHeight}})()`)
        assert.deepEqual(size.card,size.button,'only a recommendation footer gives both rows the same outer size')
        assert(size.card[1]>=64);assert.equal(size.gap,6);assert.equal(size.clipped,false)
      }
    }

    await evaluate("window.feedback.record('summary')")
    await wait(()=>evaluate('!!document.querySelector("[data-weight-review]")'))
    for(const width of [320,393,1280]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:width<500})
      await new Promise(r=>setTimeout(r,80))
      const values=await evaluate(`(()=>{
        const headings=[...document.querySelectorAll('[aria-label="웨이트 수행"] [class*="recordHead"]')]
        return {overflow:document.documentElement.scrollWidth>innerWidth,
          headings:headings.map(h=>{
            const name=h.firstElementChild.getBoundingClientRect(),total=h.lastElementChild.getBoundingClientRect()
            const row=h.getBoundingClientRect(),goal=h.nextElementSibling.getBoundingClientRect()
            return {fits:total.right<=row.right+.5 && (name.right<=total.left+.5 || name.bottom<=total.top+.5),
              goalBelow:goal.top>=Math.max(name.bottom,total.bottom),
              number:h.querySelector('[class*="number"]').textContent, totals:h.lastElementChild.textContent}
          }),
          counts:[...document.querySelectorAll('[data-weight-review]')].map(r=>r.querySelectorAll('[data-direction]').length)}
      })()`)
      assert.equal(values.overflow,false);assert.deepEqual(values.counts,[4,2,1])
      assert.deepEqual(values.headings.map(h=>h.number),['01','02','03'])
      assert(values.headings.every(h=>h.fits&&h.goalBelow&&/세트 · 총 .*kg/.test(h.totals)))
      await writeFile(resolve(directory,'integrated-record-'+width+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'))
    }
    assert.deepEqual(await evaluate('(()=>{const root=document.querySelector(".app-shell"),font=getComputedStyle(root).fontFamily;return [...root.querySelectorAll("*")].filter(e=>e.getClientRects().length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&getComputedStyle(e).fontFamily!==font).map(e=>e.textContent.slice(0,60))})()'),[],'WEIGHT/CARDIO summary fonts')
    assert.match(await evaluate('document.querySelector(\'[aria-label="유산소 수행"] [class*="cardioTime"]\').textContent'),/수정00:20:30$/,'summary displays the correction badge and rounded seconds')
    assert.match(await evaluate('document.querySelector(\'[aria-label="유산소 수행"]\').textContent'),/자동 기록 00:20:00/)
    await evaluate("window.feedback.record('detail')")
    await wait(()=>evaluate('!!document.querySelector("summary[aria-label=\\\"운동 기록 메뉴\\\"]")'))
    await evaluate('document.querySelector("summary").click()');await click('기록 정정')
    await evaluate('[...document.querySelectorAll("button")].filter(b=>b.textContent==="정정").at(-1).click()')
    await wait(()=>evaluate('!!document.querySelector(".duration-wheels")'))
    const fontAudit=()=>evaluate('(()=>{const root=document.querySelector(".app-shell"),font=getComputedStyle(root).fontFamily;return [...root.querySelectorAll("*")].filter(e=>e.getClientRects().length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&getComputedStyle(e).fontFamily!==font).map(e=>e.textContent.slice(0,60))})()')
    assert.deepEqual(await fontAudit(),[],'correction dialog and dynamic activity text use the app font')
    const duration=()=>evaluate('[...document.querySelectorAll(".duration-wheels > div > div > button")].map(b=>b.textContent)')
    assert.deepEqual(await duration(),['0 시간','20 분','30 초'])
    const setDuration=async(label,value)=>{
      await evaluate('document.querySelector('+JSON.stringify('button[aria-label="'+label+'"]')+').click()')
      await click('직접 입력')
      const direct = 'dialog[open]:not(:has(dialog[open])) input'
      await wait(()=>evaluate(`!!document.querySelector(${JSON.stringify(direct)})`))
      await verifyKeyboardField(direct,true)
      await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(direct)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`)
      await click('확인')
      await closeKeyboard()
    }
    await setDuration('실제 활동 분','21')
    assert.deepEqual(await duration(),['0 시간','21 분','30 초'])
    await click('취소')
    assert.equal(await evaluate('window.feedback.corrections.length'),0)
    await evaluate('[...document.querySelectorAll("button")].filter(b=>b.textContent==="정정").at(-1).click()')
    await wait(()=>evaluate('!!document.querySelector(".duration-wheels")'));assert.deepEqual(await duration(),['0 시간','20 분','30 초'])
    for(const width of [320,375,390,430]){await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);await writeFile(resolve(directory,'duration-wheel-'+width+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))}
    await setDuration('실제 활동 분','21')
    await evaluate('window.confirm=()=>true');await click('변경 저장')
    const correction=await evaluate('window.feedback.corrections[0]')
    assert.equal(correction.cardioCorrections[0].activeMs,1290000)
    assert.equal(correction.cardioCorrections[0].distanceKm,'2.05')
    assert.equal(correction.cardioCorrections[0].measurement.distanceSource,'MANUAL')
    assert.deepEqual(correction.setCorrections,[]);assert.equal('approvalRequests' in correction,false)
    await evaluate("window.feedback.record('growth')")
    await wait(()=>evaluate('!!document.querySelector(".record-search")'))
    assert.equal(await evaluate('document.querySelector(".record-search select")'),null,'growth search has no scope')
    await evaluate('document.querySelector(".search-disclosure").click()')
    await wait(()=>evaluate('!!document.querySelector(".record-search li button")'))
    await viewport(375)
    const searchReveal = await evaluate(`(async()=>{
      const field = document.querySelector('.record-search input'), vv = visualViewport
      field.focus({preventScroll:true})
      const original = window.scrollTo, calls = []
      const initialScroll = scrollY
      const padding = document.body.style.paddingBlock
      document.body.style.paddingBlock = '410px'
      original.call(window,0,scrollY+field.getBoundingClientRect().top-162)
      const y = scrollY, rect = field.getBoundingClientRect()
      // The iPhone log reports pageTop == scrollY while offsetTop is still 330px.
      Object.defineProperty(vv,'height',{configurable:true,value:365})
      Object.defineProperty(vv,'offsetTop',{configurable:true,value:330})
      Object.defineProperty(vv,'pageTop',{configurable:true,get:()=>scrollY})
      window.scrollTo=(...args)=>{calls.push(args);original.apply(window,args)}
      try {
        vv.dispatchEvent(new Event('resize'))
        vv.dispatchEvent(new Event('scroll'))
        await new Promise(r=>setTimeout(r,250))
        return {y,after:scrollY,top:rect.top,bottom:rect.bottom,calls}
      } finally {
        window.scrollTo=original
        document.body.style.paddingBlock=padding
        original.call(window,0,initialScroll)
      }
    })()`)
    assert.ok(searchReveal.y > 1 && searchReveal.top >= 0 && searchReveal.bottom <= 365 && searchReveal.top < 330,JSON.stringify(searchReveal))
    assert.deepEqual(searchReveal.calls,[],'a search already revealed by Safari needs no additional scroll')
    assert.equal(searchReveal.after,searchReveal.y)
    await closeKeyboard()
    const nativeSearchPosition = await evaluate('scrollY')
    const expectedSearchMove = await evaluate('(()=>{const bottom=document.querySelector(".record-search input").getBoundingClientRect().bottom;return bottom>281?bottom-268:0})()')
    await verifyKeyboardField('.record-search input')
    assert.ok(Math.abs(await evaluate('scrollY')-nativeSearchPosition-expectedSearchMove)<=1,'the lower search moves by the hidden distance plus 12px')
    await closeKeyboard()
    const candidate=await evaluate('(()=>{const b=document.querySelector(".record-search li button");b.scrollIntoView({block:"center"});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()')
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...candidate});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...candidate})
    await wait(()=>evaluate('document.querySelectorAll(".growth-event").length===2&&document.querySelectorAll(".recharts-line-curve").length>0'))
    assert.equal(await evaluate('document.querySelector(".search-disclosure").getAttribute("aria-expanded")'),'false','selected result closes the search')
    for(const width of [320,375,393,430]){
     await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true})
     const growth=await evaluate('(()=>{const row=document.querySelector(".growth-event:has([data-direction=decrease])"),badge=row.querySelector("[data-direction=decrease]");return{overflow:document.documentElement.scrollWidth>innerWidth,color:getComputedStyle(badge).color,text:row.textContent,delta:badge.textContent,date:row.querySelector("time").textContent,latest:document.querySelector(".growth-latest").textContent,interactive:row.matches("button")}})()')
     assert.equal(growth.overflow,false);assert.equal(growth.color,'rgb(214, 188, 101)');assert.match(growth.text,/55\.000001kg → 52\.500001kg/);assert.equal(growth.delta,'−2.5kg');assert.match(growth.date,/^2026\.11\.11 · \d{2}시$/);assert.equal(growth.latest,'52.500001kg');assert.equal(growth.interactive,false)
     await writeFile(resolve(directory,'growth-library-'+width+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'))
    }
    await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    assert.equal(await evaluate('document.querySelector(".search-disclosure").getAttribute("aria-expanded")'),'false','screenshots preserve search state')
    await evaluate('document.querySelector(".recharts-line-dots circle").scrollIntoView({block:"center"})')
    await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    const graphPoint=await evaluate('(()=>{const r=document.querySelector(".recharts-line-dots circle").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()')
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...graphPoint})
    await wait(()=>evaluate('document.querySelector(".record-chart-tooltip")?.textContent.includes("55.000001kg")'))
    await evaluate("window.feedback.record('chart')")
    await wait(()=>evaluate('!!document.querySelector("ul.sr-only")'))
    const exact=await evaluate('document.querySelector("ul.sr-only").textContent')
    assert.match(exact,/실제 0: 0kg/);assert.match(exact,/미확인: 확인 불가/);assert.match(exact,/52.500001kg/);assert.match(await evaluate('document.querySelector(".record-chart > p").textContent'),/미확인 · 확인 불가/)
    await wait(()=>evaluate('!!document.querySelector(".record-chart .recharts-surface")'))
    const bar=await evaluate('[...document.querySelectorAll(".recharts-bar-rectangle path")].find(p=>p.getBBox().height>0)?.getAttribute("d")')
    assert.match(bar,/A\s*4[, ]+4/,'both ends use the library radius without changing the values')
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',windowsVirtualKeyCode:9})
    await evaluate('document.querySelector(".record-chart .recharts-surface").focus()')
    const focus=await evaluate('(()=>{const c=getComputedStyle(document.querySelector(".record-chart .recharts-surface"));return{width:c.outlineWidth,color:c.outlineColor}})()')
    assert.equal(focus.width,'2px');assert.equal(focus.color,'rgb(108, 147, 198)')
    const rect=await evaluate('(()=>{const p=[...document.querySelectorAll(".recharts-bar-rectangle path")].find(p=>p.getBBox().height>0);p.scrollIntoView({block:"center"});const r=p.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()')
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...rect});await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...rect});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...rect})
    assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle'),'none','clicked inner Recharts group has no browser outline')
    await wait(()=>evaluate('!!document.querySelector(".record-chart-tooltip")'))
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',windowsVirtualKeyCode:39});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',windowsVirtualKeyCode:39})
    assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineColor'),'rgb(108, 147, 198)','keyboard chart exploration retains accent focus')
    await evaluate("window.feedback.record('frozen')")
    await wait(()=>evaluate('!!document.querySelector(\'[aria-label="당시 중량 검토"]\')'))
    const past=await evaluate('(()=>{const c=document.querySelector(\'[aria-label="당시 중량 검토"]\');return{text:c.textContent,buttons:c.querySelectorAll("button").length,inputs:c.querySelectorAll("input").length}})()')
    assert.equal(past.buttons,0);assert.equal(past.inputs,0);assert.match(past.text,/45kg/);assert.match(past.text,/12회.*12회.*13회/)
    assert.match(await evaluate('document.querySelector(\'[aria-label="웨이트 수행"]\').textContent'),/45kg × 5회/)
    assert.equal(await evaluate('!!document.querySelector(\'summary[aria-label="운동 기록 메뉴"]\')'),true,'record correction menu remains available')
    for(const [kind, selector, width, typed] of [['login','#auth-email',393,'sample@example.invalid'],['otp','#auth-code',430,'123456']]){
      await viewport(width)
      await send('Page.navigate',{url:origin+'/boundary?input='+kind})
      await wait(()=>evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))
      await verifyKeyboardField(selector)
      await send('Input.insertText',{text:typed})
      await closeKeyboard()
      assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`),typed)
    }
    await writeFile(resolve(directory,'feedback-checks.json'),JSON.stringify({manualSilent:true,queuedManualSilent:true,automaticTones:true,fonts,memoRunway},null,2))
  } finally {
    if (ws?.readyState === 1) { try { await send('Browser.close') } catch { /* closed */ } }
    if (browser?.exitCode === null) await new Promise(r => browser.once('exit', r))
    ws?.close(); await server.close()
    const own = relative(directory, profile)
    assert(!isAbsolute(own) && /^profile-[a-f0-9-]+$/.test(own))
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
