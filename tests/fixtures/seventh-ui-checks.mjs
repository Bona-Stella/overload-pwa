import assert from 'node:assert/strict'
export async function verifySeventhUi({go,title,click,set,evaluate,send,wait,width,capture,tab,body,report}){
 const settle=()=>evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
 const tag=async name=>{await evaluate('(()=>{const g=document.querySelector("[aria-label=\\"운동 부위 필터\\"]")??document.querySelector("[aria-label=\\"근육 분류 필터\\"]");[...g.querySelectorAll("button")].find(b=>b.textContent==='+JSON.stringify(name)+').click()})()');await settle()}
 const names=()=>evaluate('[...document.querySelectorAll(".record-search li > button:first-child strong")].map(e=>e.textContent)')
 await go('/routine-preview?tab=history');await tab('기록');await title('이번 주 요약');await click('운동 현황 ›');await title('운동 현황')
 await set('.record-search select','exercise');await settle()
 assert.deepEqual(await evaluate('[...document.querySelectorAll(".record-search [role=group] button")].map(b=>b.textContent)'),['전체','가슴','등','어깨','팔','하체','코어','유산소','기타'])
 await tag('가슴');assert.deepEqual(await names(),['벤치 프레스','인클라인 덤벨 프레스'])
 await evaluate('document.querySelector(".record-search li > button:first-child").click()');await settle()
 await set('.record-search select','muscle');await settle();assert.equal(await evaluate('document.querySelector(".record-search input").value'),'')
 await tag('등');assert.deepEqual((await names()).sort(),['광배근','승모근'].sort());assert.equal(await evaluate('document.querySelectorAll(".record-search li button[aria-label]").length'),0)
 await set('.record-search select','group');await settle();assert.equal(await evaluate('document.querySelectorAll(".record-search [role=group]").length'),0)
 await set('.record-search select','exercise');await settle()
 for(const w of [320,375,390,430]){
  await width(w,'react')
  const g=await evaluate('(()=>{const g=document.querySelector(".record-search [role=group]"),r=g.getBoundingClientRect(),s=g.querySelector("span");return{w:g.clientWidth,scroll:g.scrollWidth,x:r.x+r.width/2,y:r.y+r.height/2,height:s.getBoundingClientRect().height,radius:getComputedStyle(s).borderRadius,wrap:getComputedStyle(g).flexWrap,overflow:getComputedStyle(g).overflowX}})()')
  assert(g.scroll>g.w);assert.equal(g.height,27);assert.equal(g.radius,'999px');assert.equal(g.wrap,'nowrap');assert.equal(g.overflow,'auto')
  await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:g.x,y:g.y,deltaX:500,deltaY:0});await wait(()=>evaluate('document.querySelector(".record-search [role=group]").scrollLeft>0'),'horizontal tag scroll')
  await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:g.x,y:g.y,deltaX:-1000,deltaY:0})
  await capture('seventh-tags','react',w)
 }
 await tab('기록');await title('이번 주 요약')
 await wait(()=>evaluate('document.querySelectorAll(".recent-records .session-record-card").length>0'),'record cards')
 assert.match(await evaluate('document.querySelector(".recent-records .session-record-card").textContent'),/웨이트 3종목 · 유산소 1종목/)
 for(const w of [320,375,390,430]){
  await width(w,'react')
  assert(await evaluate('(()=>{const c=document.querySelector(".session-record-card"),t=c.querySelector("time").getBoundingClientRect(),s=c.querySelector(".record-card-status").getBoundingClientRect();return t.right<=s.left&&Math.abs(t.y+t.height/2-s.y-s.height/2)<1})()'))
  await capture('seventh-recent-counts','react',w)
 }
 const first=await evaluate('document.querySelector(".session-record-card").textContent.trim()');await click(first,'.session-record-card');await title('운동 기록 상세')
 for(const w of [320,375,390,430]){
  await width(w,'react')
  assert(await evaluate('(()=>{const h=document.querySelector("article h1"),d=h.parentElement.querySelector("p"),a=h.getBoundingClientRect(),b=d.getBoundingClientRect();return (innerWidth<=360?b.top>=a.bottom:b.left>=a.right&&Math.abs(a.y+a.height/2-b.y-b.height/2)<1)&&b.right<=innerWidth})()'))
  assert.match(await evaluate('document.querySelector("article h1").parentElement.querySelector("p").textContent'),/\d{2}\/\d{2} · [월화수목금토일] · \d{2}:\d{2}/)
  await capture('seventh-detail-header','react',w)
 }
 await tab('설정');await click('운동 종목 보기','strong');await title('운동 종목 보기')
 assert.equal(await evaluate('document.querySelectorAll(".exercise-search select").length'),0)
 await evaluate('document.querySelector(".exercise-search input").click()');await settle()
 for(const w of [320,375,390,430]){await width(w,'react');await capture('seventh-catalog-tags','react',w)}
 await evaluate('document.querySelector(".exercise-search li > button:first-child").click()');await title('운동 상세');assert.equal(await evaluate('!!document.querySelector("dialog[open]")'),false)
 report.interactions.push('seventh: original 27px pill tags and real horizontal wheel scrolling, independent exercise/muscle scope filters, row/detail separation, completed/initial exercise counts, right-edge status, same-row compact header time, catalog search without selector; four widths')
}
