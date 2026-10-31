// Uses the preinstalled Edge executable, isolated from the user's browser profile and tabs.
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const directory=resolve('logs/task-009-5b')
await mkdir(directory,{recursive:true})
const executable='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const runId=crypto.randomUUID()
const backend=process.argv.includes('--backend'), marker=backend?'BACKEND_BROWSER_SUITE_PASS':'BROWSER_SUITE_PASS'
const visual=process.argv.includes('--visual'), width=process.argv.includes('--320')?320:390
const reportFile=backend?'backend-browser-result.json':'browser-result.json'
const url=backend?'http://127.0.0.1:3075/tests/fixtures/task-009-5b-backend.html?runId=':'http://127.0.0.1:3076/tests/fixtures/task-009-5b-indexeddb.html?auto=suite&runId='
const args=['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-popup-blocking',
  '--user-data-dir='+resolve(directory,backend?'backend-browser-profile':'browser-profile',runId),
  ...(visual?['--window-size='+width+',1200','--hide-scrollbars','--virtual-time-budget=3000','--screenshot='+resolve(directory,'mobile-'+width+'.png'),'http://127.0.0.1:3076/tests/fixtures/task-009-5b-preview.html?width='+width]:[url+runId])]
const child=spawn(executable,args,{windowsHide:true,stdio:['ignore','pipe','pipe']})
console.log('ISOLATED_HEADLESS_EDGE_PID '+child.pid)
let output='',errors=''
child.stdout.on('data',chunk=>output+=chunk)
child.stderr.on('data',chunk=>errors+=chunk)
let result='Browser test timed out'
try{
  if(visual){
    await new Promise((done,reject)=>{child.once('exit',done);child.once('error',reject)})
    const bytes=await readFile(resolve(directory,'mobile-'+width+'.png'));if(bytes.length<1000)throw Error('Screenshot missing');result=marker+' screenshot '+width+'px'
  }else{
  const deadline=Date.now()+(backend?300000:60000)
  while(Date.now()<deadline){
    try{const report=JSON.parse(await readFile(resolve(directory,reportFile),'utf8'));if(report.runId===runId){result=report.result;break}}catch{/* report not ready */}
    await new Promise(done=>setTimeout(done,200))
  }
  }
}finally{
  const cleanup=spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'})
  await new Promise(done=>cleanup.once('exit',done))
  await writeFile(resolve(directory,'browser-stderr.log'),errors);await writeFile(resolve(directory,'browser-stdout.log'),output)
}
console.log(result)
if(!result.includes(marker))process.exitCode=1
