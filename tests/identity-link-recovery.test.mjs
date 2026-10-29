import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AuthApi } from '../src/features/auth/api.ts'
import { AuthController } from '../src/features/auth/controller.ts'

const USER='10000000-1111-4222-8333-000000000001',OTHER='20000000-1111-4222-8333-000000000002'
const EMAIL={id:'30000000-1111-4222-8333-000000000003',provider:'email'},GOOGLE={id:'40000000-1111-4222-8333-000000000004',provider:'google'}
// In-memory HTTP contract, never a real user/session. Trace deliberately excludes bodies/headers.
function fixture({post='ok',read='ok',failures=Infinity,readPath='identities'}={}) {
  let linked=false,user=USER,reads=0,release,changedOnce=false
  const trace=[]
  const api=new AuthApi(async(path,init)=>{
    const event={order:trace.length+1,method:init.method,path,status:null};trace.push(event)
    const respond=(body,status=200)=>{event.status=status;return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})}
    if(linked&&path.endsWith('/'+readPath)&&reads++<failures&&read!=='ok'){
      if(read==='network'){event.reason='simulated-network';throw new TypeError('isolated fault')}
      return respond({code:read==='403'?'ACCESS_DENIED':'SERVICE_UNAVAILABLE'},Number(read))
    }
    if(path.endsWith('/session')){
      if(linked&&post==='changed-once'&&!changedOnce){changedOnce=true;return respond({userId:OTHER})}
      return user?respond({userId:user}):respond({code:'AUTHENTICATION_REQUIRED'},401)
    }
    if(path.endsWith('/csrf'))return respond({headerName:'X-CSRF-TOKEN',token:'fixture-only'})
    if(path.endsWith('/contact'))return respond({status:'VERIFIED',maskedEmail:'a***@***'})
    if(path.endsWith('/identities')){
      return respond({identities:linked&&post!=='ghost'?[GOOGLE,EMAIL]:[GOOGLE]})
    }
    if(path.endsWith('/email/link')){
      if(post==='rejected')return respond({code:'EMAIL_OWNERSHIP_PROOF_REQUIRED'},403)
      linked=true
      if(post==='held')await new Promise(resolve=>{release=resolve})
      if(post==='lost'){event.reason='simulated-response-loss';throw new TypeError('isolated fault')}
      if(post==='changed')user=OTHER
      if(post==='expired')user=null
      return respond({status:post==='already'?'ALREADY_LINKED':'LINKED',identity:post==='mismatch'?{...EMAIL,id:GOOGLE.id}:EMAIL},post==='already'?200:201)
    }
    throw Error('Unexpected fixture route')
  })
  const controller=new AuthController(api,()=>1_800_000_000_000,()=>{throw Error('No external navigation')},()=>{})
  return {controller,trace,linked:()=>linked,setUser:value=>user=value,release:()=>release(),ready:()=>Boolean(release),allowReads:()=>{read='ok'}}
}
async function open(f){await f.controller.start('account')}
const writes=f=>f.trace.filter(x=>x.method==='POST')

test('A: 201 plus authoritative read shows completion and exactly one write',async()=>{
  const f=fixture();await open(f);await f.controller.linkEmail()
  const s=f.controller.getSnapshot();assert.equal(s.issue,null);assert.match(s.notice,/연결했습니다/);assert.equal(s.userId,USER);assert.equal(writes(f).length,1)
  assert.deepEqual(s.account.identities,[GOOGLE,EMAIL])
})
for(const read of ['503','network','403'])test(`B/C/E: acknowledged 201 then transient ${read} is reconciled by read only`,async()=>{
  const f=fixture({read,failures:1});await open(f);await f.controller.linkEmail()
  const s=f.controller.getSnapshot();assert.equal(s.issue,null);assert.match(s.notice,/연결했습니다/);assert.equal(writes(f).length,1);assert.equal(s.userId,USER)
  assert.equal(f.trace.filter(x=>x.path.endsWith('/identities')&&x.method==='GET').length,4)
})
for(const read of ['503','network','403'])test(`B/C/E: acknowledged 201 then persistent ${read} does not claim LINK failed`,async()=>{
  const f=fixture({read});await open(f);await f.controller.linkEmail()
  const s=f.controller.getSnapshot();assert.equal(s.issue.code,'EMAIL_LINK_STATUS_UNCONFIRMED');assert.match(s.issue.message,/연결 요청은 처리됐지만.*연결 상태를 다시 확인/)
  assert.equal(s.account.loaded,false);assert.deepEqual(s.account.identities,[]);assert.equal(f.linked(),true);assert.equal(writes(f).length,1)
  f.allowReads();await f.controller.openAccount();assert.equal(f.controller.getSnapshot().issue,null);assert.equal(f.controller.getSnapshot().account.identities.length,2);assert.equal(writes(f).length,1)
})
test('D: POST response lost after commit confirms current EMAIL state without claiming a new LINK receipt',async()=>{
  const f=fixture({post:'lost'});await open(f);await f.controller.linkEmail()
  const s=f.controller.getSnapshot();assert.equal(s.issue,null);assert.match(s.notice,/현재 이메일 로그인.*확인/);assert.doesNotMatch(s.notice,/연결했습니다/);assert.equal(writes(f).length,1);assert.equal(s.userId,USER)
})
test('D: lost POST and failed GET remain unconfirmed, recover with GET only',async()=>{
  const f=fixture({post:'lost',read:'network'});await open(f);await f.controller.linkEmail()
  const s=f.controller.getSnapshot();assert.equal(s.issue.code,'EMAIL_LINK_STATUS_UNCONFIRMED');assert.match(s.issue.message,/결과를 확인하지 못했습니다/);assert.equal(s.account.loaded,false);assert.equal(s.notice,'');assert.equal(writes(f).length,1)
  f.allowReads();await f.controller.openAccount();assert.equal(f.controller.getSnapshot().account.identities.length,2);assert.equal(writes(f).length,1)
})
for(const post of ['changed','expired'])test(`F: ${post} session after 201 never shows success or another user's identities`,async()=>{
  const f=fixture({post});await open(f);await f.controller.linkEmail()
  const s=f.controller.getSnapshot();assert.equal(s.status,post==='expired'?'anonymous':'unavailable');assert.equal(s.notice,'');assert.deepEqual(s.account.identities,[]);assert.equal(writes(f).length,1)
})
for(const changed of [false,true])test(`F/G/H: double start, rapid clicks and route resume${changed?' with account change':''} never replay POST`,async()=>{
  const f=fixture({post:'held'});await Promise.all([f.controller.start('account'),f.controller.start('account')])
  const pending=f.controller.linkEmail();for(let turn=0;turn<50&&!f.ready();turn++)await new Promise(resolve=>setImmediate(resolve));assert.equal(f.ready(),true)
  await Promise.all(Array.from({length:12},()=>f.controller.linkEmail()))
  await f.controller.resume('account');if(changed)f.setUser(OTHER);f.release();await pending
  const s=f.controller.getSnapshot();assert.equal(writes(f).length,1);assert.equal(s.notice,'');assert.equal(s.pending,null);assert.equal(s.account.unlink,null)
  assert.equal(s.userId,changed?OTHER:USER)
})
test('reload after committed response loss reads server state without writing',async()=>{
  const f=fixture({post:'lost'});await open(f);await f.controller.linkEmail();await f.controller.resume('account')
  assert.equal(f.controller.getSnapshot().account.identities.length,2);assert.equal(writes(f).length,1);assert.equal(f.controller.getSnapshot().notice,'')
})
test('explicit proof rejection remains rejection and cannot become inferred success',async()=>{
  const f=fixture({post:'rejected'});await open(f);await f.controller.linkEmail()
  assert.equal(f.controller.getSnapshot().issue.code,'EMAIL_OWNERSHIP_PROOF_REQUIRED');assert.equal(f.linked(),false);assert.equal(writes(f).length,1)
})
for(const readPath of ['contact','session'])test(`201 followed by transient ${readPath} GET failure recovers without replay`,async()=>{
  const f=fixture({readPath,read:'503',failures:1});await open(f);await f.controller.linkEmail()
  assert.equal(f.controller.getSnapshot().issue,null);assert.match(f.controller.getSnapshot().notice,/연결했습니다/);assert.equal(writes(f).length,1)
})
test('a transient 401 owner failure cannot be replaced by success on a later GET',async()=>{
  const f=fixture({readPath:'session',read:'401',failures:1});await open(f);await f.controller.linkEmail()
  assert.equal(f.controller.getSnapshot().status,'anonymous');assert.equal(f.controller.getSnapshot().notice,'')
  assert.equal(writes(f).length,1)
})
test('even a single different owner response stops recovery before any later GET could hide it',async()=>{
  const f=fixture({post:'changed-once'});await open(f);await f.controller.linkEmail()
  assert.equal(f.controller.getSnapshot().issue.code,'SESSION_CHANGED');assert.equal(f.controller.getSnapshot().notice,'');assert.equal(f.controller.getSnapshot().account.loaded,false);assert.equal(writes(f).length,1)
})
for(const post of ['ghost','mismatch'])test(`201 with ${post} readback cannot be reported as confirmed`,async()=>{
  const f=fixture({post});await open(f);await f.controller.linkEmail()
  assert.equal(f.controller.getSnapshot().issue.code,'EMAIL_LINK_STATUS_UNCONFIRMED');assert.equal(f.controller.getSnapshot().notice,'');assert.equal(writes(f).length,1)
})
test('200 ALREADY_LINKED recovers from a failed follow-up without a second POST',async()=>{
  const f=fixture({post:'already',read:'503',failures:1});await open(f);await f.controller.linkEmail()
  assert.equal(f.controller.getSnapshot().issue,null);assert.match(f.controller.getSnapshot().notice,/이미 같은 계정/);assert.equal(writes(f).length,1)
})
