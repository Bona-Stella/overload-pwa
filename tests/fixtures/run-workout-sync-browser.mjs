import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const directory=resolve('logs/task-009-5c');await mkdir(directory,{recursive:true})
const edge=process.argv.includes('--edge'),runId=crypto.randomUUID(),args=[
  '--headless','--remote-debugging-port=0','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-popup-blocking',
  '--user-data-dir='+resolve(directory,'browser-profile',runId),'http://127.0.0.1:3077/tests/fixtures/task-009-5c-sync.html?runId='+runId+(edge?'&edge=1':''),
]
let errors='',result='Browser test timed out',child
const start=()=>{child=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[...args.slice(0,-1),'--new-window',args.at(-1)+'&restart='+Date.now()],{windowsHide:true,stdio:['ignore','pipe','pipe']});console.log('ISOLATED_5C_EDGE_PID '+child.pid);child.stderr.on('data',c=>errors+=c);child.stdout.on('data',()=>{})}
const stop=async()=>{const cleanup=spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});await new Promise(done=>cleanup.once('exit',done))}
start();const crashed=new Set()
try{
  const deadline=Date.now()+480000
  while(Date.now()<deadline){
    try{const report=JSON.parse(await readFile(resolve(directory,edge?'edge-browser-result.json':'browser-result.json'),'utf8'));if(report.runId===runId){result=report.result;break}}catch{/* report pending */}
    try{const point=JSON.parse(await readFile(resolve(directory,'checkpoint.json'),'utf8'));if(point.runId===runId&&!crashed.has(point.phase)){
      crashed.add(point.phase);console.log('FORCE_PROCESS_EXIT checkpoint='+point.phase);await stop();await new Promise(done=>setTimeout(done,300));start()
    }}catch{/* checkpoint pending */}
    await new Promise(done=>setTimeout(done,200))
  }
}finally{
  await stop()
  await writeFile(resolve(directory,'browser-stderr.log'),errors)
}
console.log(result);console.log('FORCED_RESTARTS '+crashed.size);if(!result.includes('SYNC_BROWSER_SUITE_PASS')||crashed.size!==(edge?0:3))process.exitCode=1
