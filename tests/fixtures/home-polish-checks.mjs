// Read-only workout verification: actual API records, no START/FINISH/correction/cleanup writes.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { sessionAchievement } from '../../src/features/home/achievement.ts'

const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')
export async function runHomePolish(d){
  const {send,evaluate,click,api,screenshot,wait,passed,directory,requests}=d
  const get=async path=>{const r=await api('GET',path);assert.equal(r.status,200);return r.body}
  const files=['Overload_Weight_Badge_OnePlate.svg','Overload_Weight_Badge_32.png']
  const source=await readFile('docs/product/assets/exercise-icons/'+files[0],'utf8')
  const assets=Object.fromEntries(await Promise.all(files.map(async name=>[name,createHash('sha256').update(await readFile('docs/product/assets/exercise-icons/'+name)).digest('hex')])))
  await send('Page.navigate',{url:'http://127.0.0.1:3000/'})
  await wait(()=>evaluate(`(()=>{if(document.querySelectorAll('nav button').length===4)return true;const b=[...document.querySelectorAll('[aria-label="검토용 로그인"] button')].find(b=>b.textContent==='검토 계정으로 로그인'&&!b.disabled);b?.click();return false})()`),'normal OTP/session login',95000)
  await wait(()=>evaluate(`!!document.querySelector('[aria-label="오늘의 루틴"]')&&document.querySelectorAll('[data-session-id]').length===3`),'actual home')
  const baseline=[],routines=await get('/api/v1/routines'),details=[]
  for(const r of routines.routines)details.push(await get('/api/v1/routines/'+r.id))
  const schedulePath='/api/v1/weekly-schedule?timeZone=Asia%2FSeoul',schedule=await get(schedulePath),active=await get('/api/v1/workout-sessions/active')
  let cursor=null
  for(let page=0;page<3;page++){
    const list=await get('/api/v1/workout-sessions/closed?'+new URLSearchParams({limit:'20',...(cursor||{})}))
    for(const row of list.sessions)baseline.push({id:row.id,hash:hash(await get('/api/v1/workout-sessions/'+row.id))})
    cursor=list.next;if(!cursor)break
  }
  assert.equal(cursor,null)
  const mixed=details.find(r=>r.weightPlacements.some(w=>!w.deletedAt)&&r.cardioPlacements.some(c=>!c.deletedAt))
  assert(mixed)
  await evaluate(`document.querySelector('[aria-label="홈"] details').open=true`)
  await evaluate(`(()=>{const b=[...document.querySelectorAll('[aria-label="홈"] details button[aria-pressed]')].find(b=>b.querySelector('strong').title===${JSON.stringify(mixed.name)});b.click()})()`)
  await wait(()=>evaluate(`document.querySelector('[aria-label="오늘의 루틴"] h2').textContent===${JSON.stringify(mixed.name)}&&!document.querySelector('[aria-label="홈"] details').open`),'today-only selection closes after render')
  const separator=await evaluate(`(()=>{const card=document.querySelector('[aria-label="오늘의 루틴"]'),sections=[...card.querySelectorAll('h3')].map(h=>h.parentElement);return sections.map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {border:s.borderTop,color:s.borderTopColor,thickness:s.borderTopWidth,x:r.x,width:r.width,margin:s.marginTop,padding:s.paddingTop}})})()`)
  assert.equal(separator.length,2);assert.deepEqual(separator[0],separator[1]);assert.equal(separator[0].thickness,'1px')
  const iconGeometry=await evaluate(`(async()=>{await Promise.all([...document.querySelectorAll('[data-session-id] img')].map(i=>i.decode()));const row=document.querySelector('[data-session-id]'),groups=[...row.querySelectorAll('span[aria-label]')];return groups.map(e=>{const i=e.querySelector('img'),a=i.getBoundingClientRect(),b=e.getBoundingClientRect();return {label:e.getAttribute('aria-label'),width:a.width,height:a.height,centerDifference:(a.y+a.height/2)-(b.y+b.height/2),gap:getComputedStyle(e).gap,loaded:i.complete&&i.naturalWidth>0}})})()`)
  assert.equal(iconGeometry.length,2)
  for(const icon of iconGeometry){assert.equal(icon.width,18);assert.equal(icon.height,18);assert.equal(icon.gap,'5px');assert.equal(icon.loaded,true);assert(Math.abs(icon.centerDifference)<.5)}
  const geometry=await evaluate(`(()=>{const r=document.querySelector('[data-session-id]'),g=r.querySelector('span[aria-label]').parentElement;return {groupsGap:getComputedStyle(g).gap,rowGap:getComputedStyle(r).gap,height:r.getBoundingClientRect().height,font:getComputedStyle(g).fontSize}})()`)
  assert.equal(geometry.groupsGap,'8px');assert.equal(geometry.rowGap,'6px');assert(geometry.height<=46);assert.equal(geometry.font,'13px')
  const officialShapes=await evaluate(`(async()=>{const img=document.querySelector('[data-session-id] img'),parse=s=>{const doc=new DOMParser().parseFromString(s,'image/svg+xml');return [...doc.querySelectorAll('radialGradient,stop,circle,g,rect')].map(e=>({tag:e.localName,attributes:[...e.attributes].map(a=>[a.name,a.value]).sort((a,b)=>a[0].localeCompare(b[0]))}))};return JSON.stringify(parse(await(await fetch(img.src)).text()))===JSON.stringify(parse(${JSON.stringify(source)}))})()`)
  assert.equal(officialShapes,true,'Rendered SVG preserves the original gradient, circle and dumbbell geometry')
  const rows=await evaluate(`[...document.querySelectorAll('[data-session-id]')].map(e=>({id:e.dataset.sessionId,state:e.querySelector('[data-state]').dataset.state,label:e.getAttribute('aria-label')}))`)
  for(const row of rows){const detail=await get('/api/v1/workout-sessions/'+row.id);assert.equal(row.state,sessionAchievement(detail).state)}
  assert(rows.some(r=>r.state==='complete'&&r.label.includes('웨이트 2/2')&&r.label.includes('유산소 1/1')))
  for(const width of [393,320]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:852,deviceScaleFactor:1,mobile:true})
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true)
    assert.equal(await evaluate(`[...document.querySelectorAll('[data-session-id]')].every(e=>e.scrollWidth<=e.clientWidth)`),true)
    await screenshot('home-'+width);await screenshot('today-card-'+width,'[aria-label="오늘의 루틴"]');await screenshot('recent-'+width,'[aria-label="최근 운동"]')
  }
  await send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true})
  await evaluate(`document.querySelector('[data-session-id]').click()`)
  await wait(()=>evaluate(`!!document.querySelector('.closed-workout')&&document.querySelector('.closed-workout').getClientRects().length>0`),'existing record detail')
  await click('홈')
  await wait(()=>evaluate(`!!document.querySelector('[aria-label="홈"] details')&&!!document.querySelector('[aria-label="오늘의 루틴"]')`),'home render after history navigation')
  // Empty-section policy: actual unassigned home has no divider; choose each saved plan without writes.
  for(const routine of details){
    await evaluate(`document.querySelector('[aria-label="홈"] details').open=true`)
    await evaluate(`(()=>{const b=[...document.querySelectorAll('[aria-label="홈"] details button[aria-pressed]')].find(b=>b.querySelector('strong').title===${JSON.stringify(routine.name)});b.click()})()`)
    await wait(()=>evaluate(`document.querySelector('[aria-label="오늘의 루틴"] h2').textContent===${JSON.stringify(routine.name)}`),'existing plan choice')
    assert.equal(await evaluate(`document.querySelectorAll('[aria-label="오늘의 루틴"] h3').length`),2)
  }
  await send('Page.navigate',{url:'http://127.0.0.1:3000/__review/wireframe'})
  await wait(()=>evaluate(`!!document.querySelector('.v12-home-card')`),'official HTML')
  assert.equal(await evaluate(`document.querySelectorAll('.v12-home-card .v9-card-separator').length`),2)
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.v12-achievement')).gap`),'5px')
  assert.equal(await evaluate(`document.querySelector('.v12-achievement img').getAttribute('src')`),'assets/exercise-icons/Overload_Weight_Badge_OnePlate.svg')
  assert.deepEqual(await get('/api/v1/routines'),routines);for(const r of details)assert.deepEqual(await get('/api/v1/routines/'+r.id),r)
  assert.deepEqual(await get(schedulePath),schedule);assert.deepEqual(await get('/api/v1/workout-sessions/active'),active)
  for(const record of baseline)assert.equal(hash(await get('/api/v1/workout-sessions/'+record.id)),record.hash)
  passed.push('Shared 1px title/WEIGHT and WEIGHT/CARDIO dividers, matching color/width/insets; existing empty sections retained')
  passed.push('Official unmodified SVG geometry rendered, weight/running 18px centered, icon gap5px/group8px/row6px and46px cards')
  passed.push('Actual InitialPlan achievement and mixed running record retained, auto-close/detail navigation; 393/320 without overflow')
  passed.push('All baseline sessions/routines/current and pending schedule unchanged; no workout write requests')
  // Authentication may POST normally; workout data must remain read-only in this check.
  assert.equal(requests.some(r=>/^\/api\/v1\/(workout-sessions|routines|weekly-schedule|statistics)(\/|$)/.test(r.path)&&r.method!=='GET'),false)
  await writeFile(resolve(directory,'polish-result.json'),JSON.stringify({passed,separator,iconGeometry,geometry,assets,officialShapes,rows,preservedSessionIds:baseline.map(r=>r.id),realIPhone:false},null,2))
  console.log(JSON.stringify({passed,screenshots:directory},null,2))
}
