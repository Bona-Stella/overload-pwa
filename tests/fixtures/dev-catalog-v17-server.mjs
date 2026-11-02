// Explicitly authorized personal development target. Never accepts an arbitrary DB/backend.
import { createServer, request } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
export async function devCatalogServer() {
  const ready=JSON.parse(await readFile(resolve('../overload-server/build/catalog-phase-4/ready.json'),'utf8'))
  if(ready.backendOrigin!=='http://127.0.0.1:8080'||ready.database!=='overload_dev'||ready.cluster!=='7701299869222748199'||ready.migrations!==17||ready.profile!=='local'||!ready.realEmailSender)throw Error('Verified local V17 Backend required')
  const origin='http://127.0.0.1:3080',requests=[],fault={snapshotAck:false,finishAck:false,variant:0}
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'}
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,origin)
      if(url.pathname.startsWith('/api/')){
        const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks)
        // Never record OTP, email, Cookie, CSRF or authorization headers.
        const record={method:req.method,path:url.pathname,...(req.method!=='GET'&&url.pathname.includes('/workout-sessions')?{body:body.toString()}: {})};requests.push(record)
        const upstream=request(new URL(req.url,ready.backendOrigin),{method:req.method,headers:req.headers},up=>{
          const output=[];up.on('data',c=>output.push(c));up.on('end',()=>{
            record.status=up.statusCode
            if(up.statusCode>=200&&up.statusCode<300&&(fault.snapshotAck&&url.pathname.endsWith('/snapshot')||fault.finishAck&&url.pathname.endsWith('/finish'))){record.ackHidden=true;res.writeHead(503,{'Content-Type':'application/json'});res.end('{"code":"DEVELOPMENT_TEST_ACK_LOST"}');return}
            const headers={...up.headers};delete headers['content-length'];delete headers['transfer-encoding'];res.writeHead(up.statusCode,headers);res.end(Buffer.concat(output))
          })
        });upstream.on('error',()=>res.destroy());upstream.end(body);return
      }
      const path=['/','/account'].includes(url.pathname)?'/index.html':url.pathname
      if(req.method!=='GET'||path.includes('..')||!(path==='/sw.js'||path==='/index.html'||path==='/manifest.webmanifest'||path==='/favicon.svg'||/^\/(assets|icons)\/[\w.-]+$/.test(path))){res.writeHead(404);res.end();return}
      let content=await readFile(resolve('dist','.'+path))
      if(path==='/sw.js'&&fault.variant)content=Buffer.from(content.toString().replace(/"id":"([a-f0-9]+)"/,'"id":"$1-devtest'+fault.variant+'"'))
      res.writeHead(200,{'Content-Type':mime[extname(path)],'Cache-Control':'no-store',...(path==='/sw.js'?{'Service-Worker-Allowed':'/'}:{})});res.end(content)
    }catch{res.writeHead(404);res.end()}
  })
  return {origin,ready,requests,fault,start:()=>new Promise((r,j)=>{server.once('error',j);server.listen(3080,'127.0.0.1',r)}),stop:()=>new Promise(r=>{server.close(r);server.closeAllConnections()})}
}
