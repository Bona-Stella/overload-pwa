import assert from 'node:assert/strict'
export async function verifySixthUi({go,title,click,set,evaluate,send,wait,width,capture,tab,body,report}){
 const state=()=>evaluate('document.querySelector(".record-search").dataset.searchState')
 const open=()=>evaluate('document.querySelector(".record-search input").click();document.querySelector(".record-search input").focus()')
 const x=()=>evaluate('document.querySelector(".search-disclosure").click()')
 const input=()=>evaluate('document.querySelector(".record-search input").value')
 const settle=()=>evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
 for(const name of ['운동 현황','성장 추적','전체 운동 이력']){
  await go('/routine-preview?tab=history');await tab('기록');await title('운동 기록 분석')
  await click(name==='전체 운동 이력'?'전체 보기 ›':name+' ›');await title(name)
  if(await evaluate('!!document.querySelector(".record-search select")'))await set('.record-search select','exercise');await settle()
  await open();await set('.record-search input','벤치')
  await wait(()=>evaluate('document.querySelectorAll(".record-search li > button:first-child").length>0'),'sixth search results')
  assert.equal(await state(),'EDITING')
  await x();assert.equal(await input(),'');assert.equal(await state(),'EDITING');assert(await evaluate('!!document.querySelector(".record-search ul")'))
  await set('.record-search input','벤치');await settle()
  const selected=await evaluate('document.querySelector(".record-search li > button:first-child strong").textContent')
  await evaluate('document.querySelector(".record-search li > button:first-child").click()');await settle()
  assert.equal(await state(),'SELECTED');assert.equal(await input(),selected)
  assert.equal(await evaluate('!!document.querySelector(".record-search ul,.search-selected")'),false)
  await x();assert.equal(await state(),'IDLE');assert.equal(await input(),'');assert.equal(await evaluate('!!document.querySelector(".record-search ul")'),false)
  await open();await set('.record-search input','벤치');await settle();await evaluate('document.querySelector(".record-search li > button:first-child").click()');await settle()
  await open();await settle();assert.equal(await input(),selected)
  await x();await settle();assert.equal(await state(),'EDITING');assert.equal(await input(),'');assert(await evaluate('!!document.querySelector(".record-search ul")'))
  await evaluate('document.querySelector(".record-search input").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');await settle()
  assert.equal(await input(),selected)
  await open();await settle()
  assert(await evaluate('document.querySelectorAll(".record-search li button[aria-label]").length>0'))
  await evaluate('document.querySelector(".record-search li button[aria-label]").click()');await wait(()=>evaluate('!!document.querySelector(".catalog-detail-page")'),'existing exercise detail dialog')
  assert.match(await body(),/운동 상세/);await evaluate('[...document.querySelectorAll(".catalog-detail-page button")].find(b=>b.getAttribute("aria-label")==="운동 목록으로 돌아가기").click()');await settle()
  await open();await settle()
  for(const w of [320,375,390,430]){
   await width(w,'react')
   const geometry=await evaluate('(()=>{const b=document.querySelector(".search-disclosure"),s=b.querySelector("svg"),br=b.getBoundingClientRect(),sr=s.getBoundingClientRect();return{bw:br.width,bh:br.height,sw:sr.width,sh:sr.height,dx:Math.abs(br.x+br.width/2-sr.x-sr.width/2),dy:Math.abs(br.y+br.height/2-sr.y-sr.height/2)}})()')
   assert.equal(geometry.bw,42);assert.equal(geometry.bh,42);assert.equal(geometry.sw,18);assert.equal(geometry.sh,18);assert(geometry.dx<0.5&&geometry.dy<0.5)
   await capture('sixth-search-'+name,'react',w)
  }
  if(name==='운동 현황'){
   await evaluate('document.querySelector(".record-search input").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');await x();await set('.record-search select','muscle');await settle()
   assert.equal(await evaluate('document.querySelectorAll(".record-search li button[aria-label]").length'),0)
  }
  report.interactions.push('sixth '+name+': IDLE/edit/X/open/select/value/re-edit/X/retain filter/separate detail; 4 widths')
 }
 await go('/routine-preview?tab=history');await tab('기록');await title('운동 기록 분석')
 await wait(()=>evaluate('document.querySelectorAll(".recent-records .session-record-card").length>0'),'cached records')
 const texts=await evaluate('[...document.querySelectorAll(".recent-records .session-record-card time")].map(e=>e.textContent)')
 assert(texts.length);for(const t of texts)assert.match(t,/^\d{2}\.\d{2} [월화수목금토일] \d{2}:\d{2}$/)
 await evaluate('window.__sixthFlickers=[];window.__sixthWatch=new MutationObserver(()=>{if(document.querySelector(".recent-records")&&document.body.innerText.includes("운동 기록을 불러오는 중입니다"))window.__sixthFlickers.push("loading")});window.__sixthWatch.observe(document.body,{subtree:true,childList:true,characterData:true})')
 for(let i=0;i<6;i++){await tab('홈');await tab('기록');await title('운동 기록 분석');assert(await evaluate('document.querySelectorAll(".recent-records .session-record-card").length>0'))}
 assert.deepEqual(await evaluate('window.__sixthWatch.disconnect();window.__sixthFlickers'),[])
 const first=await evaluate('document.querySelector(".recent-records .session-record-card").textContent.trim()')
 await click(first,'.session-record-card');await title('운동 기록 상세')
 for(const w of [320,375,390,430]){await width(w,'react');await capture('sixth-detail-time','react',w)}
 await tab('기록');await click('주간 근육 통계 ›');await title('주간 근육 통계');await click('근육별')
 await wait(()=>evaluate('document.querySelectorAll(".analysis-subtotal").length>0'),'muscle subtotals')
 const sums=await evaluate('[...document.querySelectorAll(".analysis-subtotal")].map(e=>e.textContent)')
 assert(sums.some(s=>/합계.*\d.*\//.test(s)))
 for(const w of [320,375,390,430]){await width(w,'react');await capture('sixth-muscle-subtotals','react',w)}
 await click('총중량');assert.equal(await evaluate('document.querySelectorAll(".analysis-subtotal").length'),0)
 await click('분류별');assert.equal(await evaluate('document.querySelectorAll(".analysis-subtotal").length'),0)
 report.interactions.push('sixth common start timestamps, rapid cached record re-entry without loading, sets-only detailed muscle subtotals; 4 widths')
}
