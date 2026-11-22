import assert from 'node:assert/strict'

export async function verifyFifthUi({go,title,click,set,evaluate,send,wait,width,capture,tab,body,report}){
 const byLabel=label=>label==='검색 목록 닫기'?evaluate('document.querySelector(".record-search input").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))'):label==='검색 목록 열기'?evaluate('document.querySelector(".record-search input").click();document.querySelector(".record-search input").focus()'):evaluate('document.querySelector('+JSON.stringify('button[aria-label="'+label+'"]')+').click()')
 await go('/routine-preview?tab=history&review=approval');await title('운동 기록 요약')
 for(const w of [320,375,390,430]){
  await width(w,'react')
  const sizes=await evaluate('[...document.querySelectorAll(".approval-toolbar button,.approval-item > button")].map(b=>{const c=getComputedStyle(b);return [b.getBoundingClientRect().height,c.padding,c.fontSize,c.fontWeight,c.borderTopWidth,c.borderRadius]})')
  assert(sizes.length>1);for(const size of sizes)assert.deepEqual(size,sizes[0])
 }
 await click('홈으로 돌아가기');assert(await evaluate('!!document.querySelector("section[aria-label=홈]")'))
 for(const w of [320,375,390,430]){
  await width(w,'react')
  const icons=await evaluate('[...document.querySelectorAll("section[aria-label=홈] [class*=recordFacts] img,section[aria-label=홈] [class*=recordState]")].map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,fit:e.tagName==="IMG"?getComputedStyle(e).objectFit:"contain"}))')
  assert(icons.length);for(const icon of icons){assert.equal(icon.w,18);assert.equal(icon.h,18);assert.equal(icon.fit,'contain')}
 }
 await tab('기록');await click('운동 현황 ›');await title('운동 현황')
 for(const w of [320,375,390,430]){
  await width(w,'react')
  const before=await evaluate('(()=>{const s=document.querySelector(".record-search"),input=s.querySelector("input"),select=s.querySelector(":is(select,button[aria-haspopup=listbox])"),b=s.querySelector(".search-disclosure"),r=b.getBoundingClientRect();return {input:input.getBoundingClientRect().width,scope:select.getBoundingClientRect().width,outer:!input.parentElement.parentElement.contains(b),size:[r.width,r.height],height:[input.getBoundingClientRect().height,select.getBoundingClientRect().height],top:[r.top,input.getBoundingClientRect().top],expanded:b.getAttribute("aria-expanded")}})()')
  assert(before.outer);assert.deepEqual(before.size,[42,42]);assert.deepEqual(before.height,[42,42]);assert.equal(before.top[0],before.top[1]);assert.equal(before.expanded,'false');assert(before.scope>0)
  await capture('fifth-search-closed','react',w)
  await evaluate('document.querySelector(".record-search input").click();document.querySelector(".record-search input").focus()')
  const after=await evaluate('(()=>{const s=document.querySelector(".record-search");return {width:s.querySelector("input").getBoundingClientRect().width,scope:s.querySelector(":is(select,button[aria-haspopup=listbox])")?.getBoundingClientRect().width??0,expanded:s.querySelector("button.search-disclosure").getAttribute("aria-expanded")}})()')
  assert(after.width>before.input+70);assert.equal(after.scope,0);assert.equal(after.expanded,'true')
  await capture('fifth-search-expanded','react',w);await byLabel('검색 목록 닫기')
  const position=await evaluate('(()=>{const b=document.querySelector(".search-disclosure");b.scrollIntoView({block:"center"});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()')
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...position});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...position})
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".search-disclosure")).outlineStyle'),'none')
  await byLabel('검색 목록 닫기')
 }
 for(const scope of ['all','exercise','group','muscle']){
  await set('.record-search select',scope);await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');await wait(()=>evaluate('document.querySelectorAll(".record-search li button").length>0'),'scope opens '+scope)
  await evaluate('document.querySelector(".record-search li button").click()')
  const selected=await wait(()=>evaluate('document.querySelector(".record-search input")?.value'),'selected filter '+scope)
  await byLabel('검색 목록 열기');await byLabel('검색 목록 닫기')
  assert.equal(await evaluate('document.querySelector(".record-search input").value'),selected)
  await byLabel('선택 해제')
 }
 await byLabel('달력 열기')
 const marks=await evaluate('[...document.querySelectorAll(".record-calendar-grid small[data-state=complete]")].map(e=>({text:e.textContent,color:getComputedStyle(e).color}))')
 assert(marks.length>0);assert(marks.every(m=>m.text==='✓'&&m.color==='rgb(116, 166, 138)'))
 await click('닫기');assert.doesNotMatch(await body(),/선택 기간 갱신 중/)
 await tab('기록');await click('주간 근육 계획 ›');await title('주간 근육 계획');await click('근육별')
 if(await evaluate('document.querySelector("[role=switch]").getAttribute("aria-checked")==="false"'))await evaluate('document.querySelector("[role=switch]").click()')
 for(const w of [320,375,390,430]){
  await width(w,'react')
  const gauges=await evaluate('[...document.querySelectorAll(".analysis-row")].map(e=>{const track=e.querySelector(".record-gauge-track"),fill=track.firstElementChild,guide=e.querySelector(".record-gauge-guide"),r=track.getBoundingClientRect();return {value:Number(e.querySelector(".record-chart li").textContent.split(": ")[1].split("세트")[0]),track:r.width,fill:fill.getBoundingClientRect().width,height:r.height,radius:getComputedStyle(track).borderRadius,fillRadius:getComputedStyle(fill).borderRadius,guide:guide.textContent,left:guide.getBoundingClientRect().x+guide.getBoundingClientRect().width/2-r.x}})')
  assert(gauges.length>=12);assert(gauges.some(g=>g.value===0));assert(gauges.some(g=>g.value>0))
  for(const g of gauges){assert(g.track>0);assert.equal(g.height,8);assert.equal(g.radius,'4px');assert.equal(g.fillRadius,'4px');assert.equal(g.guide,'▼');assert(Math.abs(g.left-g.track/3)<1);g.value===0?assert.equal(g.fill,0):assert(g.fill>0)}
  await capture('fifth-plan-gauges','react',w)
 }
 await tab('기록');await click('성장 추적 ›');await title('성장 추적')
 for(const w of [320,375,390,430]){
  await width(w,'react');const size=await evaluate('(()=>{const input=document.querySelector(".record-search input");return{height:input.getBoundingClientRect().height,value:input.value,extra:!!document.querySelector(".search-selected")}})()');assert.equal(size.height,42);assert(size.value);assert.equal(size.extra,false);await capture('fifth-growth-selection','react',w)
 }
 report.interactions.push('fifth UI: external 42px search, scope collapse/input expansion, all scopes/filter retention, trusted pointer focus, compact selection, identical review buttons, home CTA, green calendar checks, rounded 0/nonzero tracks and guide positions at 320/375/390/430')
}
