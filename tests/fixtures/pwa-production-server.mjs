// Disposable test host only. Serves the real dist bytes and proxies a verified isolated V17 fixture.
import { createServer, request } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
export async function productionServer() {
  const isolated=JSON.parse(await readFile(resolve('../overload-server/build/task-008-1c/ready.json'),'utf8'))
  if(new URL(isolated.backendOrigin).hostname!=='127.0.0.1'||isolated.initialUsers!==0||isolated.migrations!==17||!/^[a-f0-9]{64}$/.test(isolated.containerId))throw Error('Disposable V17 backend required')
  const requests=[],fault={dropSnapshot:0,variant:0,generation:null},origin='http://127.0.0.1:3080'
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'}
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,origin)
      if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/oauth2/')){
        const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks)
        const record={method:req.method,path:url.pathname,body:req.method==='GET'||!url.pathname.includes('workout-sessions')?undefined:body.toString()};requests.push(record)
        const upstream=request(new URL(req.url,isolated.backendOrigin),{method:req.method,headers:req.headers},up=>{
          const output=[];up.on('data',chunk=>output.push(chunk));up.on('end',()=>{
            record.status=up.statusCode
            if(url.pathname.endsWith('/snapshot')&&fault.dropSnapshot>0){fault.dropSnapshot--;res.destroy();return}
            const headers={...up.headers};delete headers['content-length'];delete headers['transfer-encoding']
            let content=Buffer.concat(output)
            if(fault.generation&&req.method==='GET'&&['/api/v1/routines','/api/v1/workout-settings','/api/v1/workout-sessions/active'].includes(url.pathname)&&up.statusCode===200){
              const value=JSON.parse(content);value.dataGeneration=fault.generation
              if(value.routines)value.routines=[]
              if(value.exercises)value.exercises=[]
              if('session' in value)value.session=null
              content=Buffer.from(JSON.stringify(value))
            }
            res.writeHead(up.statusCode,headers);res.end(content)
          })
        });upstream.on('error',()=>{res.destroy()});upstream.end(body);return
      }
      const path=['/','/account'].includes(url.pathname)?'/index.html':url.pathname
      if(req.method!=='GET'||path.includes('..')||!(path==='/sw.js'||path==='/index.html'||path==='/manifest.webmanifest'||path==='/favicon.svg'||/^\/(assets|icons)\/[\w.-]+$/.test(path))){res.writeHead(404);res.end();return}
      let content=await readFile(resolve('dist','.'+path))
      if(path==='/sw.js'&&fault.variant)content=Buffer.from(content.toString().replace(/"id":"([a-f0-9]+)"/,'"id":"$1-test'+fault.variant+'"'))
      res.writeHead(200,{'Content-Type':mime[extname(path)],'Cache-Control':'no-store',...(path==='/sw.js'?{'Service-Worker-Allowed':'/'}:{})});res.end(content)
    }catch{res.writeHead(404);res.end()}
  })
  const start=()=>new Promise((done,reject)=>{server.once('error',reject);server.listen(3080,'127.0.0.1',done)})
  const stop=()=>new Promise(done=>{server.close(done);server.closeAllConnections()})
  return{start,stop,requests,fault,origin,isolated}
}
