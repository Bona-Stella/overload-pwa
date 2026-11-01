// Explicit disposable V15 backend only. Does not load developer environment files.
import { createServer } from 'vite'
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
const finishPhase=process.argv.includes('--finish'),port=finishPhase?3078:3077
const directory=resolve(finishPhase?'logs/task-009-5d':'logs/task-009-5c');await mkdir(directory,{recursive:true})
const isolated=JSON.parse(await readFile(resolve('../overload-server/build/task-008-1c/ready.json'),'utf8')),origin=new URL(isolated.backendOrigin)
if(origin.hostname!=='127.0.0.1'||!Number(origin.port)||['5432','5433'].includes(origin.port)||isolated.initialUsers!==0||isolated.migrations!==15||!/^[a-f0-9]{64}$/.test(isolated.containerId))throw Error('Expected disposable V15 fixture')
let drops=0,resolutionDrops=0,takeoverDrops=0,finishDrops=0,closedDrops=0,delay=0,closedDelay=0,mismatch=false
const snapshots=[],resolutions=[],takeovers=[],finishes=[],closedWrites=[],requests=[]
const readJson=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return JSON.parse(Buffer.concat(chunks).toString())}
const command=async body=>{
  const id=crypto.randomUUID();await writeFile(resolve('../overload-server/build/task-008-1c/command.json'),JSON.stringify({id,...body}))
  for(let n=0;n<100;n++){try{const r=JSON.parse(await readFile(resolve('../overload-server/build/task-008-1c/result.json'),'utf8'));if(r.id===id)return{ok:r.ok}}catch{/* pending */}await new Promise(r=>setTimeout(r,50))}throw Error('fixture command timeout')
}
const guard=`for(const method of ['getItem','setItem','removeItem']){const original=Storage.prototype[method];Storage.prototype[method]=function(key,...args){if(key==='overload.core.v1')throw Error('Demo storage forbidden');return original.call(this,key,...args)}}`
const server=await createServer({envDir:false,plugins:[{name:'5c-fixture',transformIndexHtml:{order:'pre',handler:()=>[{tag:'script',children:guard,injectTo:'head-prepend'}]},configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
  if(!req.url.startsWith('/__fixture/')){next();return}
  const send=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value))}
  try{
    if(req.url==='/__fixture/otp'){send({code:JSON.parse(await readFile(resolve('../overload-server/build/task-008-1c/otp.json'),'utf8')).code});return}
    if(req.url==='/__fixture/summary'){send({snapshots,resolutions,takeovers,finishes,closedWrites,requests});return}
    if(req.url==='/__fixture/result'){const result=await readJson(req);await writeFile(resolve(directory,result.kind==='edge'?'edge-browser-result.json':'browser-result.json'),JSON.stringify(result));send({ok:true});return}
    if(req.url==='/__fixture/checkpoint'){await writeFile(resolve(directory,'checkpoint.json'),JSON.stringify(await readJson(req)));send({ok:true});return}
    if(req.url==='/__fixture/trace'){await appendFile(resolve(directory,'trace.jsonl'),JSON.stringify(await readJson(req))+'\n');send({ok:true});return}
    if(req.url==='/__fixture/fault'){const b=await readJson(req);drops=b.drops??0;resolutionDrops=b.resolutionDrops??0;takeoverDrops=b.takeoverDrops??0;finishDrops=b.finishDrops??0;closedDrops=b.closedDrops??0;delay=b.delay??0;closedDelay=b.closedDelay??0;mismatch=b.mismatch??false;send({ok:true});return}
    if(req.url==='/__fixture/revoke'){const b=await readJson(req);if(!/^[0-9a-f-]{36}$/.test(b.userId))throw Error('fixture owner');send(await command({action:'revoke-session',userId:b.userId}));return}
    if(req.url==='/__fixture/expire'){
      const b=await readJson(req);if(!/^[0-9a-f-]{36}$/.test(b.sessionId))throw Error('fixture session')
      const sql="UPDATE workout_sessions SET last_workout_synced_at=clock_timestamp()-interval '25 hours' WHERE id='"+b.sessionId+"'::uuid AND status='ACTIVE'"
      const child=spawn('docker',['exec',isolated.containerId,'psql','-U','overload_test','-d','overload_browser_isolated','-X','-v','ON_ERROR_STOP=1','-c',sql],{windowsHide:true,stdio:['ignore','pipe','pipe']})
      let output='';child.stdout.on('data',c=>output+=c);const code=await new Promise((done,reject)=>{child.once('error',reject);child.once('exit',done)})
      if(code!==0||!output.includes('UPDATE 1'))throw Error('fixture expiry update failed');send({ok:true});return
    }
    res.statusCode=404;send({error:'fixture missing'})
  }catch(error){res.statusCode=500;send({error:error.message})}
})}}],server:{host:'127.0.0.1',port,strictPort:true,watch:{ignored:['**/logs/**']},proxy:{'/api':{target:isolated.backendOrigin,selfHandleResponse:true,configure(proxy){
  proxy.on('proxyReq',(_out,req)=>{
    requests.push({method:req.method,path:req.url});if(req.method==='GET')return
    const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>{const text=Buffer.concat(chunks).toString();if(req.url.endsWith('/snapshot'))snapshots.push(text);if(req.url.endsWith('/approval-resolutions'))resolutions.push(text);if(req.url.endsWith('/takeover'))takeovers.push(text);if(req.url.endsWith('/finish'))finishes.push(text);if(/\/(records|recoveries|closed-approval-resolutions)$/.test(req.url)||req.method==='DELETE'&&/workout-sessions/.test(req.url))closedWrites.push({method:req.method,path:req.url,body:text})})
  })
  proxy.on('proxyRes',(up,req,res)=>{const chunks=[];up.on('data',c=>chunks.push(c));up.on('end',async()=>{
    const drop=req.url.endsWith('/snapshot')&&drops-->0||req.url.endsWith('/approval-resolutions')&&resolutionDrops-->0||req.url.endsWith('/takeover')&&takeoverDrops-->0||req.url.endsWith('/finish')&&finishDrops-->0||req.method!=='GET'&&/\/(records|recoveries|closed-approval-resolutions)$/.test(req.url)&&closedDrops-->0
    let body=Buffer.concat(chunks)
    if(mismatch&&req.method==='GET'&&/^\/api\/v1\/workout-sessions\/[0-9a-f-]+$/.test(req.url)){mismatch=false;const value=JSON.parse(body);value.dataGeneration=(BigInt(value.dataGeneration)+1n).toString();body=Buffer.from(JSON.stringify(value))}
    if(req.url.endsWith('/snapshot')&&delay){const ms=delay;delay=0;await new Promise(r=>setTimeout(r,ms))}
    if(req.method!=='GET'&&/\/(records|recoveries|closed-approval-resolutions)$/.test(req.url)&&closedDelay){const ms=closedDelay;closedDelay=0;await new Promise(r=>setTimeout(r,ms))}
    if(drop){res.destroy();return}
    const headers={...up.headers};delete headers['content-length'];delete headers['transfer-encoding'];res.writeHead(up.statusCode,headers);res.end(body)
    await appendFile(resolve(directory,'http.jsonl'),JSON.stringify({method:req.method,path:req.url,status:up.statusCode})+'\n')
  })})
}}}}})
await server.listen();await writeFile(resolve(directory,'ready.json'),JSON.stringify({pid:process.pid,frontendOrigin:'http://127.0.0.1:'+port,backendOrigin:isolated.backendOrigin,containerId:isolated.containerId}))
console.log('ISOLATED_FRONTEND_READY http://127.0.0.1:'+port+' pid='+process.pid)
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>void server.close().then(()=>process.exit(0)))
