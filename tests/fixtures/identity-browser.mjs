// Test-only loopback fixture. No database, external OAuth, email sender, or real credentials.
// Run: node tests/fixtures/identity-browser.mjs; open http://localhost:18081/ then stop with Ctrl+C.
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const root=fileURLToPath(new URL('../../',import.meta.url))
const EMAIL={id:'30000000-1111-4222-8333-000000000003',provider:'email'}
const GOOGLE={id:'40000000-1111-4222-8333-000000000004',provider:'google'}
const SECOND={id:'50000000-1111-4222-8333-000000000005',provider:'google'}
const USER='10000000-1111-4222-8333-000000000001',CHALLENGE='60000000-1111-4222-8333-000000000006'
const modes=['google-only','email-only','mixed','required','ambiguous','proof-required','conflict','last','csrf','uncertain','link-expired']
let mode='mixed',identities=[EMAIL,GOOGLE],verified=true,proof=true,loggedIn=true,token='fixture-csrf',writes=0,mails=0,events=[]
const reset=value=>{mode=value;identities=value==='google-only'?[GOOGLE]:['email-only','last','proof-required','link-expired'].includes(value)?[EMAIL]:value==='ambiguous'?[EMAIL,GOOGLE,SECOND]:[EMAIL,GOOGLE];verified=value!=='required';proof=value!=='proof-required';loggedIn=true;token='fixture-csrf';writes=0;mails=0;events=[]}
const backend=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost:18081'),path=url.pathname
  const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(data===null?'':JSON.stringify(data))}
  const redirect=to=>{res.writeHead(302,{Location:to,'Cache-Control':'no-store'});res.end()}
  if(path==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<h1>Isolated identity UI fixture</h1>'+modes.map(x=>'<p><a href="/reset?mode='+x+'">'+x+'</a></p>').join(''));return}
  if(path==='/reset'&&modes.includes(url.searchParams.get('mode'))){reset(url.searchParams.get('mode'));res.setHeader('Set-Cookie','SESSION=isolated-fixture; HttpOnly; SameSite=Lax; Path=/');redirect('http://localhost:3000/account');return}
  if(path==='/summary'){json({mode,writes,mails,events});return}
  let body='';for await(const chunk of req)body+=chunk
  const form=new URLSearchParams(body)
  events.push({method:req.method,path})
  if(path==='/api/v1/auth/session'){json(loggedIn?{userId:USER}:{code:'AUTHENTICATION_REQUIRED'},loggedIn?200:401);return}
  if(path==='/api/v1/auth/csrf'){json({headerName:'X-CSRF-TOKEN',token});return}
  if(!loggedIn){json({code:'AUTHENTICATION_REQUIRED'},401);return}
  if(path==='/authorize'){
    if(mode==='link-expired'||!proof){redirect('http://localhost:3000/account/link/failed');return}
    if(!identities.some(x=>x.provider==='google'))identities.push(GOOGLE)
    redirect('http://localhost:3000/account/link/complete');return
  }
  if(req.method==='POST'&&req.headers['x-csrf-token']!==token&&form.get('_csrf')!==token){json({code:'CSRF_INVALID'},403);return}
  if(path==='/api/v1/auth/identities'&&req.method==='GET'){json({identities});return}
  if(path==='/api/v1/auth/reauth/email/contact'){json(verified?{status:'VERIFIED',maskedEmail:'a***@***'}:{status:'REQUIRED'});return}
  if(path==='/api/v1/auth/reauth/email/request'){mails++;json({status:'ACCEPTED',challengeId:CHALLENGE},202);return}
  if(path==='/api/v1/auth/reauth/email/verify'){proof=true;token='fixture-rotated';json(null,204);return}
  if(path==='/api/v1/auth/logout'){loggedIn=false;json(null,204);return}
  if(path==='/oauth2/link/google'){
    if(req.method!=='POST'){json({code:'METHOD_NOT_ALLOWED'},405);return}
    writes++;if(!proof){redirect('http://localhost:3000/account/link/failed');return}redirect('http://localhost:18081/authorize');return
  }
  if(path.startsWith('/api/v1/auth/identities/')&&req.method==='POST'){
    writes++
    if(!proof){json({code:'EMAIL_OWNERSHIP_PROOF_REQUIRED'},403);return}
    if(mode==='conflict'){json({code:'IDENTITY_ALREADY_OWNED'},409);return}
    if(mode==='csrf'){json({code:'CSRF_INVALID'},403);return}
    if(path.endsWith('/link')){const exists=identities.some(x=>x.id===EMAIL.id);if(!exists)identities.push(EMAIL);if(mode==='uncertain'){res.destroy();return}json({status:exists?'ALREADY_LINKED':'LINKED',identity:EMAIL},exists?200:201);return}
    if(path.endsWith('/unlink')){
      if(identities.length===1){json({code:'LAST_LOGIN_IDENTITY'},409);return}
      const id=JSON.parse(body).identityId;identities=identities.filter(x=>x.id!==id);json(null,204);return
    }
  }
  json({code:'NOT_FOUND'},404)
})
await new Promise(resolve=>backend.listen(18081,'127.0.0.1',resolve))
const vite=await createServer({root,configFile:false,envDir:false,plugins:[react()],logLevel:'silent',cacheDir:root+'.cache/identity-browser',server:{host:'127.0.0.1',port:3000,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:18081'},'/oauth2/link/google':{target:'http://127.0.0.1:18081'}}}})
await vite.listen()
console.log('Isolated identity fixture ready; PID '+process.pid)
let stopping=false
const stop=async()=>{if(stopping)return;stopping=true;await vite.close();backend.close(()=>process.exit(0))}
process.on('SIGINT',stop);process.on('SIGTERM',stop)
