// Explicit opt-in. Proxies only a verified disposable V15 backend; never the configured developer DB.
import { createServer } from 'vite'
import { readFile, mkdir, writeFile, appendFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const directory=resolve('logs/task-009-5a')
await mkdir(directory,{recursive:true})
const isolated=JSON.parse(await readFile(resolve('../overload-server/build/task-008-1c/ready.json'),'utf8'))
const target=new URL(isolated.backendOrigin)
if(target.hostname!=='127.0.0.1'||!Number(target.port)||['5432','5433'].includes(target.port)||isolated.initialUsers!==0||isolated.migrations!==15)throw Error('Expected disposable V15 backend')
let loseStart=false,startRequests=[],workoutWrites=[]
const audit=resolve(directory,'http.jsonl');await writeFile(audit,'')
let pending=Promise.resolve()
const guard=`for(const method of ['getItem','setItem','removeItem']){const original=Storage.prototype[method];Storage.prototype[method]=function(key,...args){if(key==='overload.core.v1')throw Error('Demo storage forbidden in production test');return original.call(this,key,...args)}}`
const server=await createServer({envDir:false,plugins:[{name:'5a-isolated-fixture',transformIndexHtml:{order:'pre',handler:()=>[{tag:'script',children:guard,injectTo:'head-prepend'}]},configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
  if(!req.url.startsWith('/__fixture/')){next();return}
  const send=value=>{res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value))}
  if(req.url==='/__fixture/otp'){const data=JSON.parse(await readFile(resolve('../overload-server/build/task-008-1c/otp.json'),'utf8'));send({code:data.code});return}
  if(req.url==='/__fixture/5b-result'&&req.method==='POST'){
    const chunks=[];for await(const chunk of req)chunks.push(chunk)
    const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));await mkdir(resolve('logs/task-009-5b'),{recursive:true});await writeFile(resolve('logs/task-009-5b/backend-browser-result.json'),JSON.stringify(data));send({saved:true});return
  }
  if(req.url==='/__fixture/revoke'&&req.method==='POST'){
    const chunks=[];for await(const chunk of req)chunks.push(chunk);const {userId}=JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if(!/^[a-f0-9-]{36}$/.test(userId))throw Error('Invalid fixture owner')
    const id=crypto.randomUUID();await writeFile(resolve('../overload-server/build/task-008-1c/command.json'),JSON.stringify({id,action:'revoke-session',userId}))
    for(let n=0;n<50;n++){try{const result=JSON.parse(await readFile(resolve('../overload-server/build/task-008-1c/result.json'),'utf8'));if(result.id===id){send({ok:result.ok});return}}catch{/* command pending */}await new Promise(r=>setTimeout(r,100))}
    res.statusCode=500;send({ok:false});return
  }
  if(req.url==='/__fixture/lose-next-start'){loseStart=true;send({ready:true});return}
  if(req.url==='/__fixture/summary'){send({startRequests,workoutWrites,pid:process.pid});return}
  res.statusCode=404;send({code:'FIXTURE_NOT_FOUND'})
})}}],server:{host:'127.0.0.1',port:3075,strictPort:true,proxy:{'/api':{target:isolated.backendOrigin,configure(proxy){
  proxy.on('proxyReq',(_proxyReq,request)=>{
    const event={method:request.method,path:request.url,status:null};request.phase5aEvent=event
    if(request.url.startsWith('/api/v1/workout-sessions')&&request.method!=='GET')workoutWrites.push({method:request.method,path:request.url})
    if(request.method==='POST'&&request.url==='/api/v1/workout-sessions'){
      const chunks=[];request.on('data',chunk=>chunks.push(chunk));request.on('end',()=>{try{startRequests.push(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch{/* body incomplete */}})
    }
  })
  proxy.on('proxyRes',(response,request)=>{
    const event=request.phase5aEvent;event.status=response.statusCode;pending=pending.then(()=>appendFile(audit,JSON.stringify(event)+'\n'))
    if(loseStart&&request.method==='POST'&&request.url==='/api/v1/workout-sessions'){
      loseStart=false;response.on('data',()=>{});response.on('end',()=>{});request.socket.destroy()
    }
  })
}}}}})
await server.listen()
await writeFile(resolve(directory,'ready.json'),JSON.stringify({pid:process.pid,frontendOrigin:'http://127.0.0.1:3075',backendOrigin:isolated.backendOrigin}))
console.log('ISOLATED_5A_FRONTEND_READY http://127.0.0.1:3075')
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void server.close().then(()=>pending).then(()=>process.exit(0))})
