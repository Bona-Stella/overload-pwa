// Standalone real-browser storage tests. No .env loading, database, backend, or API forwarding.
import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const directory=resolve('logs/task-009-5b');await mkdir(directory,{recursive:true})
const server=await createServer({envDir:false,plugins:[{name:'5b-report',configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
  if(req.url!=='/__fixture/5b-result'||req.method!=='POST'){next();return}
  const chunks=[];for await(const chunk of req)chunks.push(chunk)
  const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));await writeFile(resolve(directory,'browser-result.json'),JSON.stringify(data))
  res.setHeader('Content-Type','application/json');res.end('{"saved":true}')
})}}],server:{host:'127.0.0.1',port:3076,strictPort:true,watch:{ignored:['**/logs/**']}}})
await server.listen()
console.log(`LOCAL_5B_BROWSER_READY http://127.0.0.1:3076 pid=${process.pid}`)
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>void server.close().then(()=>process.exit(0)))
