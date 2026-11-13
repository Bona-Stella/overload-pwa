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
    browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless', '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
    const port = await wait(async () => { try { return Number((await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]) } catch { return false } })
    const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page')
    ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
    ws.onmessage = e => { const m = JSON.parse(e.data), p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result) } }
    ws.onclose = () => { for (const p of pending.values()) p.reject(Error('Browser closed')); pending.clear() }
    await send('Page.enable'); await send('Page.navigate', { url: origin + '/boundary' })


    await wait(()=>evaluate('!!window.feedback?.ready'))
    const click=async text=>{await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled).click()`)}
    // Start through the real completion UI to unlock audio, then shorten only the fixture clock.
    await evaluate("document.querySelector('[aria-label=\"1세트 완료\"]').click()")
    await wait(()=>evaluate('!!window.feedback.c.getSnapshot().workout.rest'))
    await evaluate('window.feedback.rest(1)')
    await wait(()=>evaluate('window.feedbackAudio.starts>0'))
    const before=await evaluate('window.feedbackAudio.starts')
    await click('휴식 종료');await click('휴식 종료').catch(()=>{})
    await new Promise(r=>setTimeout(r,350))
    assert.equal(await evaluate('window.feedbackAudio.starts'),before,'manual end cannot create a new 1-second tone')
    assert.equal(await evaluate('window.feedback.c.getSnapshot().workout.rest'),null)
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
    await wait(()=>evaluate('window.feedback.c.getSnapshot().workout.rest===null'))
    await new Promise(r=>setTimeout(r,350))
    assert.equal(await evaluate('window.feedbackAudio.starts'),prior,'queued extension cannot revive manual audio')

    await evaluate('window.feedback.rest(2)')
    const automatic=await evaluate('window.feedbackAudio.starts')
    await new Promise(r=>setTimeout(r,2400))
    assert(await evaluate('window.feedbackAudio.starts')>automatic,'automatic countdown still plays existing tones')
    const ended=await evaluate('window.feedbackAudio.starts')
    await new Promise(r=>setTimeout(r,350));assert.equal(await evaluate('window.feedbackAudio.starts'),ended,'automatic expiry does not repeat tones')

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
      const values=await evaluate(`(()=>{const heads=[...document.querySelectorAll('[class*="recordHead"]')];return{overflow:document.documentElement.scrollWidth>innerWidth,headings:heads.map(h=>{const a=getComputedStyle(h.firstElementChild),b=getComputedStyle(h.lastElementChild),r=h.firstElementChild.getBoundingClientRect(),g=h.nextElementSibling.getBoundingClientRect();return{font:a.fontSize===b.fontSize,weight:a.fontWeight===b.fontWeight,nowrap:b.whiteSpace,gap:g.top-r.bottom,margin:a.marginTop,total:h.lastElementChild.textContent}}),counts:[...document.querySelectorAll('[data-weight-review]')].map(r=>r.querySelectorAll('[data-direction]').length)}})()`)
      assert.equal(values.overflow,false);assert.deepEqual(values.counts,[4,2,1])
      assert(values.headings.every(h=>h.font&&h.weight&&h.nowrap==='nowrap'&&h.margin==='0px'&&h.gap<=4&&h.gap>=0))
      await writeFile(resolve(directory,'integrated-record-'+width+'.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'))
    }
    await writeFile(resolve(directory,'feedback-checks.json'),JSON.stringify({manualSilent:true,queuedManualSilent:true,automaticTones:true,fonts},null,2))
  } finally {
    if (ws?.readyState === 1) { try { await send('Browser.close') } catch { /* closed */ } }
    if (browser?.exitCode === null) await new Promise(r => browser.once('exit', r))
    ws?.close(); await server.close()
    const own = relative(directory, profile)
    assert(!isAbsolute(own) && /^profile-[a-f0-9-]+$/.test(own))
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
})
