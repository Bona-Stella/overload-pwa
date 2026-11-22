import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

test('workout feedback keeps manual rest silent through queued writes and fits actual title widths', { timeout: 120000 }, async t => {
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
        const space=()=>parseFloat(frame.style.getPropertyValue('--memo-keyboard-space'))||0
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
    const plate = () => evaluate(`(() => {
      const card = document.querySelector('[aria-label="진행 중량"]')
      const label = [...card.querySelectorAll('span')].find(e => e.textContent === '한쪽 원판')
      return label ? card.querySelectorAll('strong')[1].textContent : null
    })()`)
    for (const [loadType, value] of [[null, '17.5'], ['STACK', '17.5'], ['DUMBBELL', '17.5'], ['BODYWEIGHT', '17.5'], ['PLATE', null]]) {
      assert.equal(await evaluate('window.feedback.plateSetup(...'+JSON.stringify([loadType,value])+')'),true)
      assert.equal(await plate(),null)
    }
    assert.equal(await evaluate('window.feedback.plateSetup("PLATE","17.5")'),true)
    assert.equal(await plate(),'8.75 kg','preparation uses the applied weight and ignores the different approved weight')
    await click('기구 세팅 메모')
    assert.equal(await plate(),'8.75 kg','closing the memo does not hide the prepared plate weight')
    await click('기구 세팅 메모')
    // Start through the real completion UI to unlock audio, then shorten only the fixture clock.
    await click('운동 시작하기')
    await wait(()=>evaluate('document.querySelector(\'[aria-label="1세트 완료"]\')?.disabled === false'))
    assert.deepEqual(await evaluate(`(()=>{
      const button=document.querySelector('[aria-label="1세트 완료"]'), mark=button.firstElementChild
      const {width,height}=button.getBoundingClientRect(), circle=mark.getBoundingClientRect()
      return [width,height,circle.width,circle.height,getComputedStyle(mark).fontSize]
    })()`),[44,44,21,21,'14px'],'the shared set completion check keeps its original size')
    assert.equal(await plate(),null,'the exercise start clears the plate weight')
    const memoExpansion=()=>evaluate(`document.querySelector('[data-workout-memo-card] button').getAttribute('aria-expanded')`)
    await wait(async()=>await memoExpansion()==='false')
    await click('기구 세팅 메모')
    assert.equal(await memoExpansion(),'true')
    assert.equal(await plate(),null,'reopening the memo cannot restore the plate weight')
    await click('기구 세팅 메모')
    await evaluate("document.querySelector('[aria-label=\"1세트 완료\"]').click()")
    await wait(()=>evaluate('!!window.feedback.currentRest()'))
    assert.equal(await plate(),null,'the plate weight stays hidden during rest')
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
    assert.equal(await evaluate('[...document.querySelectorAll("footer button")].find(b=>b.textContent==="휴식 종료")?.disabled'),true,
      'the resting action stays in place and blocks repeat input until the queued writes complete')
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

    const setSwitch = (label, enabled) => evaluate(`(() => {
      const control = document.querySelector(${JSON.stringify(`[role="switch"][aria-label="${label}"]`)})
      if (control.getAttribute('aria-checked') !== '${enabled}') control.click()
    })()`)
    const openAlerts = async () => {
      await evaluate("window.feedback.record('alerts')")
      await wait(() => evaluate('!!document.querySelector(\'[aria-label="휴식 테스트"][role="switch"]\')'))
    }
    const openWorkout = async () => {
      await evaluate('window.feedback.record(null)')
      await wait(() => evaluate('!!document.querySelector("[data-workout-frame]")'))
    }
    const unlock = () => evaluate('document.querySelector(\'[aria-label="운동 시간"]\').click()')
    await openAlerts()
    await setSwitch('중간 알림음', true)
    await openWorkout()
    const tones = () => evaluate('window.feedbackAudio.starts')
    const moveTo = seconds => evaluate(`window.feedbackNow=Date.parse(window.feedback.currentRest().endsAt)-${seconds * 1000}`)
    const showsRest = seconds => evaluate(`document.querySelector('[aria-label="운동 시간"] [data-time]')?.textContent==='00:${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}'`)
    await evaluate('window.feedbackRealNow=Date.now;window.feedbackNow=Date.now();Date.now=()=>window.feedbackNow')
    await evaluate('window.feedback.rest(10,10)')
    await wait(() => showsRest(10))
    await unlock()
    const beforeMiddle = await tones()
    await new Promise(r => setTimeout(r, 300))
    assert.equal(await tones(), beforeMiddle, 'a rest starting at ten seconds never crosses the boundary')
    await click('휴식 종료')
    await wait(() => evaluate('window.feedback.currentRest()===null'))
    await evaluate('window.feedbackNow+=50;window.feedback.rest(11,10)')
    await wait(() => showsRest(11))
    await evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
    await moveTo(9.75)
    await wait(() => showsRest(10))
    await evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
    await new Promise(r => setTimeout(r, 300))
    assert.equal(await tones(), beforeMiddle, 'returning in the missed midpoint second does not play it')

    await click('+30초')
    await wait(() => showsRest(40))
    await moveTo(9.75)
    await wait(async () => await tones() === beforeMiddle + 3)
    await click('+30초')
    await wait(() => showsRest(40))
    const storedRest = await evaluate('window.feedback.currentRest()')
    await openAlerts()
    await setSwitch('휴식 테스트', true)
    await openWorkout()
    await wait(() => showsRest(40))
    assert.deepEqual(await evaluate('window.feedback.currentRest()'), storedRest)
    await unlock()
    await moveTo(9.75)
    await wait(() => showsRest(10))
    assert.equal(await tones(), beforeMiddle + 3, 'the extended rest retains its played midpoint across remount')

    await moveTo(4.75)
    await wait(async () => await tones() === beforeMiddle + 4)
    await evaluate('document.querySelector(\'[aria-label="1세트 완료 취소"]\').click()')
    await evaluate('window.feedback.hold()')
    await click('완료 취소 확인')
    await wait(() => evaluate('!document.querySelector("[data-workout-frame] footer [data-flash]")'))
    await moveTo(3.75)
    await new Promise(r => setTimeout(r, 300))
    assert.equal(await tones(), beforeMiddle + 4, 'undo silences the rest before the write settles')
    await evaluate('window.feedback.release()')
    await wait(() => evaluate('window.feedback.currentRest()===null'))
    await evaluate('document.querySelector(\'[aria-label="1세트 완료"]\').click()')
    await wait(() => showsRest(12))
    const testRest = await evaluate('window.feedback.currentRest()')
    assert.equal(testRest.seconds, 12)
    await openAlerts()
    await setSwitch('휴식 테스트', false)
    await setSwitch('효과음', false)
    await openWorkout()
    assert.deepEqual(await evaluate('window.feedback.currentRest()'), testRest)
    await wait(() => showsRest(12))
    await unlock()
    await moveTo(9.75)
    await wait(async () => await tones() === beforeMiddle + 7)
    const stopsBefore = await evaluate('window.feedbackAudio.stops')
    await click('휴식 종료')
    await wait(() => evaluate('window.feedback.currentRest()===null'))
    assert.equal(await evaluate('window.feedbackAudio.stops'), stopsBefore + 3, 'manual end cancels the three scheduled tones')
    await evaluate('document.querySelector(\'[aria-label="1세트 완료 취소"]\').click()')
    await click('완료 취소 확인')
    await wait(() => evaluate('!!document.querySelector(\'[aria-label="1세트 완료"]\')'))
    await evaluate('window.feedbackNow+=50;document.querySelector(\'[aria-label="1세트 완료"]\').click()')
    await wait(() => evaluate('window.feedback.currentRest()?.seconds===180'))
    await moveTo(29.75)
    await wait(async () => await tones() === beforeMiddle + 10)
    await moveTo(4.75)
    await wait(() => showsRest('05'))
    assert.equal(await tones(), beforeMiddle + 10, 'middle-only mode stays silent during the final countdown')
    await click('휴식 종료')
    await wait(() => evaluate('window.feedback.currentRest()===null'))
    for (const [duration, middleAt, enabled] of [[120, 20, true], [120, 30, true], [180, 60, true], [12, 10, false], [120, 30, false]]) {
      await openAlerts()
      await setSwitch('중간 알림음', enabled)
      await openWorkout()
      await evaluate(`window.feedbackNow+=50;window.feedback.rest(${duration},${middleAt})`)
      await wait(() => showsRest(duration))
      await unlock()
      const before = await tones()
      await moveTo(middleAt + 0.75)
      await wait(() => showsRest(middleAt + 1))
      await moveTo(middleAt - 0.25)
      await wait(() => showsRest(middleAt))
      await evaluate('window.feedbackNow+=50')
      await new Promise(r => setTimeout(r, 300))
      assert.equal(await tones(), before + (enabled ? 3 : 0), `${duration}-second rest at ${middleAt} seconds`)
      if (middleAt !== 10) {
        await moveTo(10.75)
        await wait(() => showsRest(11))
        await moveTo(9.75)
        await wait(() => showsRest(10))
        assert.equal(await tones(), before + (enabled ? 3 : 0), 'normal rest stays silent at ten seconds')
      }
      await click('휴식 종료')
      await wait(() => evaluate('window.feedback.currentRest()===null'))
    }
    const flashes = scope => evaluate(`Array.from(document.querySelectorAll(${JSON.stringify(scope + ' [data-flash]')}), element => getComputedStyle(element).animationName)`)
    for (const [visual, sound] of [[true, true], [true, false], [false, true], [false, false]]) {
      await evaluate("window.feedback.record('alerts')")
      await wait(() => evaluate('!!document.querySelector(\'[aria-label="효과음"][role="switch"]\')'))
      await setSwitch('화면 깜빡임', visual)
      if (visual) await setSwitch('상단 상태 영역', true)
      await setSwitch('효과음', sound)
      await setSwitch('중간 알림음', false)
      await evaluate('window.feedbackNow+=1000')
      const beforePreview = await tones()
      await click('알림 미리보기')
      if (visual) await evaluate('window.feedbackNow+=2100')
      await wait(() => evaluate('document.querySelector(\'[aria-label="미리보기"]\')?.textContent.includes("종료까지 5초")'))
      await new Promise(r => setTimeout(r, 150))
      const previewFlashes = await flashes('[aria-label="미리보기"]')
      assert.equal(previewFlashes.length, visual ? 2 : 0)
      assert.equal(await tones() - beforePreview, sound ? 1 : 0)
      await click('미리보기 종료')
      await evaluate("window.feedback.record(null)")
      await wait(() => evaluate('!!document.querySelector("[data-workout-frame]")'))
      const beforeWorkout = await tones()
      await evaluate('window.feedback.rest(5)')
      await wait(() => showsRest('05'))
      await evaluate('document.querySelector(\'[aria-label="운동 시간"]\').click()')
      // The real view reads its existing clock. Move within the same second after the unlock gesture.
      await evaluate('window.feedbackNow+=50')
      await new Promise(r => setTimeout(r, 300))
      assert.deepEqual(await flashes('[data-workout-frame]'), previewFlashes)
      assert.equal(await tones() - beforeWorkout, sound ? 1 : 0)
      await click('휴식 종료')
      await wait(() => evaluate('window.feedback.currentRest()===null'))
    }
    await evaluate('window.feedbackClockOffset=window.feedbackNow-window.feedbackRealNow();Date.now=()=>window.feedbackRealNow()+window.feedbackClockOffset')

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
      assert.equal(values.overflow,false);assert.deepEqual(values.counts,[3,1,0])
      assert.deepEqual(values.headings.map(h=>h.number),['01','02','03'])
      assert(values.headings.every(h=>h.fits&&h.goalBelow&&/세트 · 총 .*kg/.test(h.totals)))
      await writeFile(resolve(directory,'integrated-record-'+width+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'))
    }
    assert.deepEqual(await evaluate('(()=>{const root=document.querySelector(".app-shell"),font=getComputedStyle(root).fontFamily;return [...root.querySelectorAll("*")].filter(e=>e.getClientRects().length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&getComputedStyle(e).fontFamily!==font).map(e=>e.textContent.slice(0,60))})()'),[],'WEIGHT/CARDIO summary fonts')
    assert.match(await evaluate('document.querySelector(\'[aria-label="유산소 수행"] [class*="cardioTime"]\').textContent'),/수정00:20:30$/,'summary displays the correction badge and rounded seconds')
    assert.match(await evaluate('document.querySelector(\'[aria-label="유산소 수행"]\').textContent'),/자동 기록 00:20:00/)
    await evaluate("window.feedback.record('detail')")
    const recordMenu = 'summary[aria-label="운동 기록 메뉴"]'
    const menuAction = expression => evaluate(`(menu=>{${expression}})(document.querySelector(${JSON.stringify(recordMenu)}))`)
    await wait(()=>menuAction('return !!menu'))
    for (const width of [320,375,393,430,1280]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:width<500})
      await wait(()=>evaluate('innerWidth==='+width))
      const rows = await menuAction(`
        window.scrollTo(0,0)
        const row=menu.parentElement.parentElement.parentElement, [date,status]=row.children
        const icon=menu.firstElementChild, divider=row.parentElement.nextElementSibling
        const dateText=date.firstChild, statusText=status.lastChild, bounds=e=>e.getBoundingClientRect()
        const dateValue=dateText.data, statusValue=statusText.data
        const center=box=>(box.top+box.bottom)/2
        try {
          return ['전체 완료','부분 완료','기준 미달'].map(text=>{
            dateText.data='11.22 · 일 · 07:45:30–23:50:10'
            statusText.data=text
            const [d,s,i,t,line]=[date,status,icon,menu,divider].map(bounds)
            const card=bounds(divider.parentElement)
            return {
              gap:Math.round(t.left-s.right), iconEnd:Math.abs(i.right-line.right),
              centerDifference:Math.max(Math.abs(center(d)-center(i)),Math.abs(center(s)-center(i))),
              target:[t.width,t.height], dateFits:d.right<=s.left+.5,
              insideCard:t.right<=card.right&&t.top>=card.top&&t.bottom<=card.bottom,
              hittable:document.elementFromPoint(t.right-1,t.bottom-1)===menu,
              overflow:document.documentElement.scrollWidth>innerWidth,
            }
          })
        } finally { dateText.data=dateValue;statusText.data=statusValue }
      `)
      for (const row of rows) {
        assert.equal(row.gap,6)
        assert.ok(row.iconEnd<.5 && row.centerDifference<.5 && row.dateFits && row.insideCard && row.hittable && !row.overflow, JSON.stringify({width,row}))
        assert.deepEqual(row.target,[44,44])
      }
    }
    await viewport(393)
    const popup = await menuAction(`
      menu.click()
      const target=menu.getBoundingClientRect(), pane=menu.nextElementSibling.getBoundingClientRect()
      return { inside:pane.left>=0&&pane.right<=innerWidth, anchored:Math.abs(pane.top-target.bottom)<.5&&Math.abs(pane.right-target.right)<.5,
        actions:[...menu.nextElementSibling.querySelectorAll('button')].map(b=>b.textContent) }
    `)
    assert.deepEqual(popup,{inside:true,anchored:true,actions:['기록 정정','누락 수행 복구','기록 전체 삭제','평가 변경 이력']})
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'})
    assert.ok(await menuAction('return !menu.parentElement.open&&document.activeElement===menu'))
    await menuAction("menu.click(); document.querySelector('h1').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))")
    assert.ok(await menuAction('return !menu.parentElement.open'))
    await menuAction('menu.click()');await click('기록 정정')
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
    const openSavedReview = async mode => {
      await evaluate(`window.feedback.record(${JSON.stringify('saved-review:'+mode)})`)
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
      await wait(()=>evaluate('!document.querySelector(\'[data-loading-skeleton="row"]\')'))
    }
    const approvedCard = '[aria-label="당시 중량 검토"]'
    const verifyCompactHistory = async () => {
      for (const width of [320,375,393,430,1280]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:width<500})
        await wait(()=>evaluate('innerWidth==='+width))
        const layout=await evaluate(`(() => {
          const record=document.querySelector('${approvedCard}'), details=record.closest('details'), card=details.parentElement
          const [heading,body]=details.children, css=e=>getComputedStyle(e), box=e=>e.getBoundingClientRect()
          const rows=[...record.querySelectorAll('.approval-review-row')]
          const weights=rows.map(row=>{
            const values=row.querySelector('.approval-values'), [old,arrow,result]=values.children
            const [current,direction]=result.children
            return {
              type:[old,arrow,current,direction,row.querySelector('h3'),row.lastElementChild.firstElementChild].map(e=>css(e).fontSize),
              weight:[old,arrow,current,direction].map(e=>css(e).fontWeight),
              colors:[old,arrow,current,direction].map(e=>css(e).color),
              state:result.dataset.approvalDirection,
            }
          })
          const spacing=[css(card).paddingTop,css(heading).paddingTop,css(body).paddingTop,css(body).paddingBottom,
            css(rows[0]).paddingTop,css(rows.at(-1)).paddingBottom]
          const opened=box(card).height
          heading.click()
          const closed=box(card).height, target=box(heading).height
          heading.click()
          const headingStyle=css(heading.querySelector('h2'))
          return {weights,spacing,opened,closed,target,reopened:box(card).height, heading:[headingStyle.fontSize,headingStyle.fontWeight,headingStyle.lineHeight,headingStyle.color],
            separated:rows.slice(1).every((row,i)=>box(row).top-box(rows[i]).bottom>=6), fits:document.documentElement.scrollWidth<=innerWidth}
        })()`)
        assert.deepEqual(layout.heading,['16px','700','22.4px','rgb(240, 241, 244)'])
        assert.deepEqual(layout.spacing,['0px','8px','0px','8px','8px','0px'])
        assert.ok(layout.target>=44 && layout.closed===layout.target+2 && layout.opened>layout.closed)
        assert.ok(layout.reopened===layout.opened && layout.separated && layout.fits)
        for (const row of layout.weights) {
          assert.deepEqual(row.type,['11px','11px','13px','11px','14px','12px'])
          assert.deepEqual(row.weight,['400','400','700','700'])
          assert.equal(row.colors[0],row.colors[1])
          assert.deepEqual(row.colors.slice(2),Array(2).fill(row.state==='increase'?'rgb(116, 166, 138)':'rgb(214, 188, 101)'))
        }
      }
      await viewport(393)
    }
    await openSavedReview('empty')
    assert.doesNotMatch(await evaluate('document.querySelector("main").innerText'),/중량 변경 승인 이력|당시 중량 판정|판정 근거 부족/)
    await openSavedReview('candidate')
    assert.match(await evaluate('document.querySelector("main").innerText'),/중량 변경 승인 이력/)
    assert.match(await evaluate('document.querySelector(\'[aria-label="당시 중량 검토"]\').textContent'),/45kg → 50kg.*미승인/)
    assert.doesNotMatch(await evaluate('document.querySelector("main").innerText'),/표시하면 안 되는|판정 근거 부족/)
    await verifyCompactHistory()
    await openSavedReview('legacy-event')
    const legacy = await evaluate('document.querySelector("main").textContent')
    assert.match(legacy,/45kg → 50kg/)
    assert.match(legacy,/운동 중 승인.*증량 완료/)
    await openSavedReview('failure')
    assert.match(await evaluate('document.querySelector(\'[role="alert"]\').textContent'),/승인 이력을 조회하지 못했습니다/)
    await click('다시 조회')
    await wait(()=>evaluate('!document.querySelector(\'[role="alert"], [data-loading-skeleton="row"]\')'))
    assert.doesNotMatch(await evaluate('document.querySelector("main").innerText'),/중량 변경 승인 이력|판정 근거 부족/)
    const reviewCard = '[aria-label="중량 검토 카드"]'
    const counts = () => evaluate(`[${JSON.stringify(reviewCard)},${JSON.stringify(approvedCard)}].map(s=>document.querySelector(s)?.querySelectorAll('[data-weight-review]').length??0)`)
    const expectCounts = async (pending,approved) => {
      await wait(async()=>String(await counts())===String([pending,approved]))
      assert.deepEqual(await counts(),[pending,approved])
    }
    const selectOnlyFirst = async () => {
      await wait(()=>evaluate(`!!document.querySelector('${reviewCard} input:not(:disabled)')`))
      await evaluate(`[...document.querySelectorAll('${reviewCard} input')].forEach((input,index)=>{if(input.checked!==(index===0))input.click()})`)
    }
    const approveButton = () => evaluate(`(()=>{const b=document.querySelector('${reviewCard} .approval-toolbar button');return [b.textContent,b.disabled]})()`)
    const checkedCount = () => evaluate(`document.querySelectorAll('${reviewCard} input:checked').length`)
    await evaluate("window.feedback.record('approval-summary:empty')")
    await wait(()=>evaluate('window.feedback.approvalNetwork?.reads>0'))
    await expectCounts(0,0)
    await evaluate("window.feedback.record('approval-summary:active')")
    await expectCounts(3,0)
    assert.deepEqual(await approveButton(),['전체 승인',false])
    assert.equal(await checkedCount(),3)
    assert.equal(await evaluate(`document.querySelectorAll('${reviewCard} .approval-toolbar button').length`),1)
    for(const direction of ['increase','decrease']) {
      const colors=await evaluate(`(()=>{
        const row=document.querySelector('${reviewCard} .approval-values [data-approval-direction="${direction}"]')
        return [...row.children].map(e=>getComputedStyle(e).color)
      })()`)
      const expected=direction==='increase'?'rgb(116, 166, 138)':'rgb(214, 188, 101)'
      assert.deepEqual(colors,[expected,expected])
    }
    await selectOnlyFirst()
    await click('무게 수정'); await click('−2.5'); await click('확인')
    const draft = () => evaluate(`document.querySelector('${reviewCard} [data-weight-review=increase] .approval-values strong').textContent`)
    assert.equal(await draft(),'47.5kg')
    assert.equal(await checkedCount(),1)
    const confirmedVersions = () => evaluate('window.feedback.approvalNetwork.confirmedRoutineVersions')
    await click('선택 승인'); await click('취소')
    assert.equal(await evaluate('window.feedback.approvalNetwork.posts'),0)
    assert.equal(await draft(),'47.5kg')
    await evaluate('window.feedback.approvalNetwork.rejectPost=true')
    await click('선택 승인'); await click('승인 확인')
    await wait(()=>evaluate('!!document.querySelector("dialog[open] [role=alert]")'))
    await expectCounts(3,0)
    assert.equal(await draft(),'47.5kg')
    assert.equal(await evaluate('window.feedback.approvalNetwork.posts'),1)
    assert.deepEqual(await confirmedVersions(),[])
    await click('취소')
    await evaluate('Object.assign(window.feedback.approvalNetwork,{rejectPost:false,failAfterPost:true,holdPost:true})')
    await click('선택 승인'); await click('승인 확인')
    await wait(()=>evaluate('!!window.feedback.approvalNetwork.resumePost'))
    assert.deepEqual(await approveButton(),['선택 승인 처리 중…',true])
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('${reviewCard} .approval-toolbar button')).backgroundColor`),'rgba(0, 0, 0, 0)')
    await evaluate('[...document.querySelectorAll("dialog[open] button")].find(b=>b.textContent==="저장 확인 중…").click()')
    assert.equal(await evaluate('window.feedback.approvalNetwork.posts'),2)
    await evaluate('window.feedback.approvalNetwork.holdPost=false;window.feedback.approvalNetwork.resumePost()')
    await wait(()=>evaluate('document.querySelector("dialog[open] [role=alert]")?.textContent.includes("서버가 승인 요청을 수락했습니다")'))
    await expectCounts(3,0)
    assert.equal(await draft(),'47.5kg')
    assert.deepEqual(await confirmedVersions(),[])
    assert.ok(await evaluate('[...document.querySelectorAll("dialog[open] button")].some(b=>b.textContent==="승인 확인"&&b.disabled)'))
    await click('취소')
    await evaluate('Object.assign(window.feedback.approvalNetwork,{failAfterPost:false,failReads:false})')
    await click('다시 조회')
    await expectCounts(2,1)
    assert.equal(await checkedCount(),0)
    assert.deepEqual(await approveButton(),['선택 승인',true])
    assert.equal(await evaluate('window.feedback.approvalNetwork.posts'),2)
    assert.deepEqual(await confirmedVersions(),['1'])
    const historyText = () => evaluate(`document.querySelector('${approvedCard}').textContent`)
    assert.match(await historyText(),/45kg → 47\.5kg.*증량 완료/)
    assert.doesNotMatch(await historyText(),/미승인|50kg/)
    const toggleHistory = () => evaluate(`document.querySelector('${approvedCard}').closest('details').querySelector('summary').click()`)
    const historyOpen = () => evaluate(`document.querySelector('${approvedCard}').closest('details').open`)
    await toggleHistory();assert.equal(await historyOpen(),false)
    await toggleHistory();assert.equal(await historyOpen(),true)
    for (const [target,pending,approved] of [['선택 승인',1,2],['전체 승인',0,3]]) {
      if(pending===0)await evaluate('window.feedback.approvalNetwork.losePostResponse=true')
      await selectOnlyFirst()
      await click(target); await click('승인 확인')
      await expectCounts(pending,approved)
      assert.equal((await confirmedVersions()).at(-1),String(approved))
      if (pending===1) {
        for(const width of [320,375,393,430,1280]) {
          await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:width<500})
          const compact=await evaluate(`(()=>{
            const card=document.querySelector('${reviewCard}'), header=card.querySelector('.approval-toolbar'), row=card.querySelector('.approval-review-row')
            const control=header.querySelector('button'), heading=header.querySelector('h2'), historyHeading=document.querySelector('${approvedCard}').closest('details').querySelector('h2')
            const box=e=>e.getBoundingClientRect(), styles=e=>getComputedStyle(e)
            return {stylesMatch:['fontSize','fontWeight','lineHeight','color'].every(key=>styles(heading)[key]===styles(historyHeading)[key]),
              touching:box(heading).right>box(control).left+.5, overflow:document.documentElement.scrollWidth>innerWidth,
              spacing:[styles(card).paddingTop,styles(card).paddingBottom,box(header).height,box(row).top-box(header).bottom,styles(row).paddingTop,box(card).bottom-box(row).bottom]}
          })()`)
          assert.deepEqual(compact,{stylesMatch:true,touching:false,overflow:false,spacing:['8px','8px',44,6,'4px',9]},'single review row at '+width)
        }
        await viewport(393)
      }
    }
    assert.match(await historyText(),/감량 완료/)
    await verifyCompactHistory()
    assert.equal(await evaluate('window.feedback.approvalNetwork.posts'),4)
    assert.deepEqual(await confirmedVersions(),['1','2','3'])
    for(const [kind, selector, width, typed] of [['login','#auth-email',393,'sample@example.invalid'],['otp','#auth-code',430,'123456']]){
      await viewport(width)
      await send('Page.navigate',{url:origin+'/boundary?input='+kind})
      await wait(()=>evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))
      await verifyKeyboardField(selector)
      await send('Input.insertText',{text:typed})
      await closeKeyboard()
      assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`),typed)
    }
    const restSafetyGeometry = []
    await t.test('rest controls keep the original hit areas and only intentional completion sends a snapshot', async () => {
      const run = (fn, ...args) => evaluate('(' + fn + ')(...' + JSON.stringify(args) + ')')
      const action = label => run(label => {
        const button = [...document.querySelectorAll('[data-workout-frame] footer button')].find(element => element.textContent.trim() === label)
        if (!button) return null
        const { x, y, width, height } = button.getBoundingClientRect()
        const css = getComputedStyle(button)
        return { x, y, width, height, disabled: button.disabled, opacity: css.opacity, filter: css.filter,
          hovered: button.matches(':hover'), cursor: css.cursor, busy: button.getAttribute('aria-busy'),
          appearance: [css.backgroundColor, css.color, css.padding, css.borderRadius],
          footerWidth: button.closest('footer').clientWidth }
      }, label)
      const ready = async label => wait(async () => { const button = await action(label); return button && !button.disabled && button })
      const point = ({ x, y, width, height }) => ({ x: Math.round(x + width / 2), y: Math.round(y + height / 2) })
      const pick = async label => point(await ready(label))
      const watchTransition = label => run(label => {
        window.setShownAt = undefined
        window.restTransitionFrames = []
        const findButton = () => [...document.querySelectorAll('footer button')].find(button => button.textContent.trim() === label)
        const finishFrame = () => {
          const button = findButton()
          if (!button) return
          const inline = document.querySelector(`button[aria-label="${label}"]`)
          const css = getComputedStyle(button)
          const footer = button.closest('footer')
          const {x,y,width,height} = button.getBoundingClientRect()
          window.restTransitionFrames.push({ disabled:button.disabled, hovered:button.matches(':hover'),
            filter:css.filter, cursor:css.cursor, opacity:css.opacity, background:css.backgroundColor, color:css.color,
            padding:css.padding, radius:css.borderRadius, busy:button.getAttribute('aria-busy'), text:button.textContent.trim(),
            rect:[x,y,width,height],
            footer:[footer.clientWidth,footer.clientHeight,footer.children.length],
            inlineOpacity:inline && getComputedStyle(inline).opacity })
          if (button.disabled) requestAnimationFrame(finishFrame)
        }
        const observer = new MutationObserver(() => {
          if (!findButton()?.disabled) return
          window.setShownAt = performance.now()
          observer.disconnect()
          finishFrame()
        })
        observer.observe(document.body, { childList: true, attributes: true, subtree: true })
      }, label)
      const afterAppearance = ms => run(ms => new Promise(resolve => setTimeout(resolve, Math.max(0, window.setShownAt + ms - performance.now()))), ms)
      const checkAppearance = ({hovered,filter,cursor,...appearance}) => {
        assert.equal(filter,hovered ? 'brightness(1.13)' : 'none')
        assert.equal(cursor,'pointer')
        return appearance
      }
      const checkFrames = async label => {
        const frames = await wait(async () => {
          const frames = await run(() => window.restTransitionFrames)
          return frames.at(-1)?.disabled === false && frames
        })
        assert.ok(frames.some(frame => frame.disabled))
        const settled = checkAppearance(frames.at(-1))
        for (const frame of frames) {
          const appearance = checkAppearance(frame)
          assert.deepEqual(appearance,{...settled,disabled:frame.disabled})
          assert.equal(frame.inlineOpacity,'1')
          assert.equal(frame.busy,null)
          assert.equal(frame.text,label)
        }
      }
      const key = async (key, code, windowsVirtualKeyCode) => {
        const event = { key, code, windowsVirtualKeyCode }
        await send('Input.dispatchKeyEvent', key === 'Enter' ? { ...event, type:'keyDown', text:'\r' } : { ...event, type:'rawKeyDown' })
        await send('Input.dispatchKeyEvent', { ...event, type:'keyUp' })
      }
      const snap = () => run(() => ({
        local: window.restSafety.local().snapshot.performedSets.map(set => set.ordinal),
        remote: window.restSafety.server().snapshot.state.performedSets.map(set => set.ordinal),
        requests: window.restSafety.requests.map(body => body.snapshot.performedSets.map(set => set.ordinal)),
      }))
      for (const width of [320,375,393,430,1280]) {
        const mobile = width < 500
        await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile})
        await send('Emulation.setTouchEmulationEnabled',{enabled:mobile,maxTouchPoints:1})
        const press = (p, down) => mobile
          ? send('Input.dispatchTouchEvent',{type:down?'touchStart':'touchEnd',touchPoints:down?[p]:[]})
          : send('Input.dispatchMouseEvent',{type:down?'mousePressed':'mouseReleased',button:'left',clickCount:1,...p})
        const tap = async p => { await press(p,true); await press(p,false) }
        await send('Page.navigate',{url:origin+'/boundary?input=rest-safety'})
        const initial = await ready('1세트 완료')
        if (!mobile) await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point(initial)})
        const first = await ready('1세트 완료')
        const originalPlan = await run(() => window.restSafety.local().initialPlan)
        await tap(point(first))
        const rest = await ready('휴식 종료')
        const extension = await ready('+30초')
        assert.equal(rest.y + rest.height, first.y + first.height)
        assert.equal(extension.y, rest.y)
        assert.equal(rest.height, extension.height)
        for (const rect of [rest,extension,first]) {
          assert.ok(rect.height>=44 && rect.width>=44 && rect.x>=0 && rect.x+rect.width<=width)
        }
        assert.ok(Math.abs(rest.width - extension.width) <= 1)
        assert.ok(extension.x - (rest.x + rest.width) > 0)
        assert.equal(rest.x, first.x)
        assert.equal(extension.x + extension.width, first.x + first.width)
        restSafetyGeometry.push({width,rest,extension,completion:first})
        await wait(async () => (await snap()).remote.length===1)
        await evaluate('window.restSafety.controller.syncSettled()')
        const firstSnapshot = await snap()
        assert.deepEqual(firstSnapshot,{local:[1],remote:[1],requests:[[1]]})
        const oldRest = point(rest), oldExtension = point(extension)
        if (!mobile) await send('Input.dispatchMouseEvent',{type:'mouseMoved',...oldRest})
        await watchTransition('2세트 완료')
        if (width===393) {
          await evaluate('window.restSafety.hold(true)')
          await tap(oldRest)
          await wait(async () => (await action('휴식 종료'))?.disabled)
          await tap(oldRest); await tap(point(first))
          assert.deepEqual(await snap(),firstSnapshot)
          await evaluate('window.restSafety.release()')
          await ready('휴식 종료')
          assert.equal(await evaluate('!!window.restSafety.controller.getSnapshot().issue'),true)
          assert.equal(await action('2세트 완료'),null)
          assert.deepEqual(await snap(),firstSnapshot)

          await evaluate('window.restSafety.hold()')
          await tap(oldRest)
          await wait(async () => (await action('휴식 종료'))?.disabled)
          await new Promise(resolve => setTimeout(resolve, 320))
          await evaluate('window.restSafety.expire()')
          await tap(oldRest); await tap(point(first))
          assert.equal((await action('휴식 종료')).disabled,true)
          assert.equal(await action('2세트 완료'),null)
          assert.deepEqual(await snap(),firstSnapshot)
          await evaluate('window.restSafety.release()')
        } else {
          await tap(oldRest)
          await tap(oldRest)
        }
        await wait(() => evaluate('window.setShownAt'))
        const second = await action('2세트 완료')
        assert.deepEqual(checkAppearance(second),{...checkAppearance(first),disabled:true})
        assert.deepEqual(await run((...points)=>points.map(({x,y})=>document.elementFromPoint(x,y)?.closest('button')?.textContent??null),oldRest,oldExtension),['2세트 완료','2세트 완료'])
        await afterAppearance(35); await tap(oldRest)
        await afterAppearance(width === 1280 ? 124 : 145); await tap(oldRest)
        if (width === 393) {
          assert.equal(await evaluate(`(() => {
            const inline = document.querySelector('button[aria-label="2세트 완료"]')
            inline.focus(); inline.click()
            return inline.disabled && document.activeElement !== inline
          })()`), true)
          await key(' ', 'Space', 32)
          await afterAppearance(210); await press(oldExtension,true)
          await ready('2세트 완료'); await press(oldExtension,false)
        }
        assert.deepEqual(checkAppearance(await ready('2세트 완료')),checkAppearance(first))
        await checkFrames('2세트 완료')
        await evaluate('window.restSafety.controller.syncSettled()')
        assert.deepEqual(await snap(),firstSnapshot,'inputs during the guard are discarded, including a press lifted after enabling')
        if (width === 1280) {
          await run(() => [...document.querySelectorAll('footer button')].find(button => button.textContent === '2세트 완료').focus())
          await key('Enter','Enter',13)
        } else await tap(point(second))
        await wait(async () => (await snap()).remote.length===2)
        await evaluate('window.restSafety.controller.syncSettled()')
        const secondSnapshot = await snap()
        assert.deepEqual(secondSnapshot,{local:[1,2],remote:[1,2],requests:[[1],[1,2]]})
        if (width===393) {
          const prior = await pick('휴식 종료')
          await watchTransition('3세트 완료')
          await press(prior,true)
          await evaluate('window.restSafety.expire()')
          await wait(() => evaluate('window.setShownAt'))
          await press(prior,false)
          await afterAppearance(125)
          await tap(prior)
          await ready('3세트 완료')
          await checkFrames('3세트 완료')
          assert.deepEqual(await snap(),secondSnapshot,'expiry does not accept a spanning touch or a fast fresh touch')
          await click('운동 종료')
          await wait(()=>evaluate('!!document.querySelector("dialog[open]")'))
          await click('취소')
          assert.equal(await evaluate('!!window.restSafety.local().finish'),false)
          await evaluate('window.restSafety.offline()')
          await tap(await pick('3세트 완료'))
          await wait(async () => (await snap()).local.length===3)
          assert.deepEqual(await snap(),{...secondSnapshot,local:[1,2,3]})
          await evaluate('window.restSafety.reopen()')
          await ready('운동 종료 및 요약')
          assert.deepEqual(await run(()=>window.restSafety.local().initialPlan),originalPlan)
          assert.deepEqual(await snap(),{...secondSnapshot,local:[1,2,3]})
          await evaluate('window.restSafety.online(); window.restSafety.controller.retrySync()')
          await wait(async () => (await snap()).remote.length===3)
          await evaluate('window.restSafety.controller.syncSettled()')
          assert.deepEqual(await snap(),{local:[1,2,3],remote:[1,2,3],requests:[[1],[1,2],[1,2,3]]})
        }
      }
    })
    await writeFile(resolve(directory,'feedback-checks.json'),JSON.stringify({manualSilent:true,queuedManualSilent:true,automaticTones:true,fonts,memoRunway,restSafetyGeometry},null,2))
  } finally {
    if (ws?.readyState === 1) { try { await send('Browser.close') } catch { /* closed */ } }
    if (browser?.exitCode === null) await new Promise(r => browser.once('exit', r))
    ws?.close(); await server.close()
    const own = relative(directory, profile)
    assert(!isAbsolute(own) && /^profile-[a-f0-9-]+$/.test(own))
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
