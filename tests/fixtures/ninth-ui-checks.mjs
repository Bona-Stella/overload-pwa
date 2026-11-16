import assert from 'node:assert/strict'
export async function verifyNinthUi({go,title,click,set,evaluate,send,wait,width,capture,tab,body,report}) {
 const settle=()=>evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
 const pointer=async selector=>{
  const p=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(!e)throw Error("Missing pointer target");e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()')
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});await settle()
 }
 for(const screen of ['운동 현황','성장 추적','전체 운동 이력','운동 종목 보기']){
  await go('/routine-preview?tab=history')
  if(screen==='운동 종목 보기'){await tab('설정');await click('운동 종목 보기','strong')}
  else{await tab('기록');await title('운동 기록 분석');await click(screen==='전체 운동 이력'?'전체 보기 ›':screen+' ›')}
  await title(screen)
  if(screen==='운동 종목 보기')assert.equal(await evaluate('document.querySelectorAll(".record-search [role=group]").length'),1)
  else assert.equal(await evaluate('document.querySelectorAll(".record-search [role=group]").length'),0)
  if(await evaluate('!!document.querySelector(".record-search select")'))await set('.record-search select','exercise')
  await pointer('.record-search input');await set('.record-search input','벤치');await settle()
  await pointer('.search-disclosure')
  assert.equal(await evaluate('document.querySelector(".record-search input").value'),'')
  assert.equal(await evaluate('document.querySelector(".record-search").dataset.searchState'),'EDITING')
  assert.equal(await evaluate('document.activeElement===document.querySelector(".record-search input")'),true)
  assert.equal(await evaluate('document.querySelectorAll(".record-search [role=group],.record-search ul").length'),2)
  await pointer('.search-disclosure')
  assert.equal(await evaluate('document.querySelector(".record-search").dataset.searchState'),'IDLE')
  assert.equal(await evaluate('document.querySelectorAll(".record-search [role=group],.record-search ul").length'),0)
  assert.equal(await evaluate('document.activeElement===document.querySelector(".record-search input")'),false)
  await pointer('.record-search input');await set('.record-search input','벤치');await settle()
  const name=await evaluate('document.querySelector(".record-search li strong").textContent')
  if(screen!=='운동 종목 보기'){
   await pointer('.record-search li > button:first-child')
   assert.equal(await evaluate('document.querySelector(".record-search input").value'),name)
   assert.equal(await evaluate('document.querySelectorAll(".record-search [role=group],.record-search ul").length'),0)
   await pointer('.search-disclosure')
   assert.equal(await evaluate('document.querySelector(".record-search input").value'),'')
   assert.equal(await evaluate('document.querySelectorAll(".record-search [role=group],.record-search ul").length'),0)
  }
  for(const w of [320,375,390,430])await capture('ninth-search-'+screen,'react',w)
 }
 await go('/routine-preview?tab=history');await tab('기록');await title('운동 기록 분석')
 await wait(()=>evaluate('document.querySelectorAll(".recent-records .session-record-card").length>1'),'recent cards')
 const rows=await evaluate('[...document.querySelectorAll(".session-record-card")].map(e=>({id:e.dataset.sessionId,name:e.querySelector("h4").textContent,time:e.querySelector(".record-durations").textContent,text:e.textContent}))')
 assert(rows.every(r=>!/(?:\d{2}:){2}\d{2}/.test(r.time)))
 const cardioOnly=rows.find(r=>r.name==='아침 유산소');assert(cardioOnly);assert.doesNotMatch(cardioOnly.text,/웨이트|총중량|세트/)
 for(const w of [320,375,390,430])await capture('ninth-recent','react',w)
 await click('전체 보기 ›');await title('전체 운동 이력')
 const cards=await evaluate('[...document.querySelectorAll(".session-record-card")].map(e=>({id:e.dataset.sessionId,name:e.querySelector("h4").textContent,total:!!e.querySelector(".record-total"),types:!!e.querySelector(".record-type-times")}))')
 for(const row of rows){const card=cards.find(c=>c.id===row.id);assert(card);assert.equal(card.name,row.name);assert(card.total&&card.types)}
 for(const w of [320,375,390,430])await capture('ninth-full-history','react',w)
 const partial=await evaluate('document.querySelector(".session-record-card:has([data-state=partial])")?.dataset.sessionId')
 assert(partial);await pointer('.session-record-card[data-session-id="'+partial+'"]');await title('운동 기록 상세')
 assert.doesNotMatch(await body(),/부분 달성 판정 원인|판정 원인/)
 assert(await evaluate('document.querySelectorAll("[data-achievement=partial]").length>0'))
 for(const w of [320,375,390,430]){
  await width(w,'react')
  const columns=await evaluate('(()=>{const c=document.querySelector("[aria-label=\\"운동 기록 요약\\"]");return {sections:c.children.length,values:c.querySelectorAll("strong").length,widths:[...c.children].map(e=>e.getBoundingClientRect().width),badge:!!document.querySelector("article [data-state=partial]")}})()')
  assert.equal(columns.sections,3);assert.equal(columns.values,6);assert(columns.widths.every(n=>n>0));assert(columns.badge)
  await capture('ninth-detail-partial','react',w)
 }
 report.interactions.push('ninth: real pointer X nonempty/empty/selected and input blur; shared tag visibility on all four searches; recent HH:MM and conditional cardio-only facts; same IDs/names across history; two time rows; three-column six-fact detail and only actual partial reasons; four widths')
}
