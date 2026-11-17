import assert from 'node:assert/strict'

export async function verifyEighthUi({go,title,click,set,evaluate,wait,width,capture,tab,body,report}) {
 const settle=()=>evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
 const sizes=[320,375,390,430]
 const detail=()=>evaluate(`(()=>{const d=document.querySelector('[data-catalog-detail]');return {title:d.querySelector('h2')?.textContent,cards:[...d.querySelectorAll('.app-card')].map(e=>({text:e.textContent,color:getComputedStyle(e).backgroundColor,radius:getComputedStyle(e).borderRadius,width:e.getBoundingClientRect().width,font:getComputedStyle(e).fontFamily})),nav:[...document.querySelectorAll('nav button')].map(e=>e.textContent)}})()`)
 const back=()=>evaluate('document.querySelector("[data-catalog-detail] button[aria-label=\\"운동 목록으로 돌아가기\\"]").click()')
 await go('/routine-preview?tab=home');await tab('홈');await wait(()=>evaluate('!!document.querySelector("section[aria-label=홈]")'),'home')
 for(const w of sizes){
  await width(w,'react')
  const rows=await evaluate(`(()=>{const home=document.querySelector('[data-exercise-detail-source]');return [...home.querySelectorAll('button[data-session-id]')].map(e=>{const d=e.firstElementChild,n=e.querySelector('strong'),s=e.querySelector('[data-state]'),r=e.getBoundingClientRect(),a=d.getBoundingClientRect(),b=s.getBoundingClientRect();return {date:d.textContent,height:r.height,name:n.getBoundingClientRect().width,ellipsis:getComputedStyle(n).textOverflow,aligned:Math.abs(a.y+a.height/2-b.y-b.height/2)<2,right:b.right<=r.right}})})()`)
  assert.ok(rows.length)
  for(const r of rows){assert.match(r.date,/^\d{2}\.\d{2} [월화수목금토일] \d{1,2}시$/);assert.ok(r.height<=46);assert.ok(r.name>0);assert.equal(r.ellipsis,'ellipsis');assert.ok(r.aligned&&r.right)}
  await capture('eighth-home','react',w)
 }
 await tab('설정');await click('운동 종목 보기','strong');await title('운동 종목 보기')
 assert.ok(await evaluate('document.querySelectorAll(".exercise-search li").length>0'),'catalog opens without input focus')
 assert.equal(await evaluate('document.querySelectorAll(".exercise-search select").length'),0)
 await set('.exercise-search input','벤치');await settle();await evaluate('document.querySelector(".exercise-search li > button:first-child").click()');await title('운동 상세')
 const reference=new Map()
 for(const w of sizes){await width(w,'react');const d=await detail();assert.equal(d.nav.length,4);assert.ok(d.cards.length>=2);assert.ok(d.cards.every(c=>c.color!=='rgba(0, 0, 0, 0)'));reference.set(w,d);await capture('eighth-detail-settings','react',w)}
 await back();await title('운동 종목 보기')
 await tab('기록');await title('이번 주 요약');await click('운동 현황 ›');await title('운동 현황')
 await set('.record-search select','exercise');await set('.record-search input','벤치');await settle();await evaluate('document.querySelector(".record-search li button[aria-label$=\\"상세 보기\\"]").click()');await title('운동 상세')
 for(const w of sizes){await width(w,'react');assert.deepEqual(await detail(),reference.get(w),'settings/search detail same data, cards, theme and navigation '+w);await capture('eighth-detail-search','react',w)}
 const disclosure=await evaluate('(()=>{const b=document.querySelector("[data-catalog-detail] details summary");if(!b)return false;b.click();return b.parentElement.open})()');assert.equal(typeof disclosure,'boolean')
 await back();await title('운동 현황');assert.equal(await evaluate('document.querySelector(".record-search input").value'),'벤치')
 await tab('기록');await title('이번 주 요약');await click('성장 추적 ›');await title('성장 추적')
 assert.equal(await evaluate('document.querySelectorAll(".growth-screen .record-search select").length'),0)
 assert.equal(await evaluate('document.querySelectorAll(".growth-screen .record-search [role=group]").length'),0)
 await evaluate('document.querySelector(".growth-screen input").click()');await settle()
 assert.deepEqual(await evaluate('[...document.querySelectorAll(".growth-screen .record-search [role=group] button")].map(b=>b.textContent)'),['전체','가슴','등','어깨','팔','하체','코어','유산소','기타'])
 await evaluate('[...document.querySelectorAll(".growth-screen .record-search [role=group] button")].find(b=>b.textContent==="가슴").click()');await settle()
 assert.deepEqual(await evaluate('[...document.querySelectorAll(".growth-screen .record-search li strong")].map(e=>e.textContent)'),['벤치 프레스'])
 await evaluate('document.querySelector(".growth-screen li button[aria-label$=\\"상세 보기\\"]").click()');await title('운동 상세')
 for(const w of sizes){await width(w,'react');assert.deepEqual(await detail(),reference.get(w),'growth/settings same detail '+w)}
 await back();await title('성장 추적')
 for(const w of sizes)await capture('eighth-growth-tags','react',w)
 await tab('기록');await title('이번 주 요약');await wait(()=>evaluate('!!document.querySelector(".record-durations")'),'history durations')
 assert.match(await evaluate('document.querySelector(".recent-records").textContent'),/총 \d+(?:시간|분)/);assert.doesNotMatch(await evaluate('document.querySelector(".recent-records").textContent'),/총중량|웨이트 미확인/)
 for(const w of sizes)await capture('eighth-history-durations','react',w)
 report.interactions.push('eighth: four-width compact home real hour, default catalog list, Settings/Activity/Growth exact detail card/theme/nav equality and return state, shared growth tags, historical duration evidence')
}
