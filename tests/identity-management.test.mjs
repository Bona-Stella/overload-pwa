import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AuthApi, AuthError } from '../src/features/auth/api.ts'
import { AuthController, returnFlow } from '../src/features/auth/controller.ts'

const USER='10000000-1111-4222-8333-000000000001',OTHER='20000000-1111-4222-8333-000000000002'
const EMAIL={id:'30000000-1111-4222-8333-000000000003',provider:'email'},GOOGLE={id:'40000000-1111-4222-8333-000000000004',provider:'google'}
const SECOND={id:'50000000-1111-4222-8333-000000000005',provider:'google'},CHALLENGE='60000000-1111-4222-8333-000000000006'
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})
function fake(identities=[GOOGLE],contact={status:'VERIFIED',maskedEmail:'a***@***'}) {
  let session={userId:USER},now=1_800_000_000_000,list=[...identities]
  const calls=[]
  const api={
    session:async()=>{calls.push('session');return session},refreshCsrf:async()=>{calls.push('csrf')},clearCsrf:()=>calls.push('clear-csrf'),
    identities:async()=>{calls.push('identities');return [...list]},contact:async()=>{calls.push('contact');return contact},
    linkEmail:async()=>{calls.push('link');const exists=list.some(x=>x.id===EMAIL.id);if(!exists)list.push(EMAIL);return {status:exists?'ALREADY_LINKED':'LINKED',identity:EMAIL}},
    unlinkIdentity:async identity=>{calls.push(['unlink',identity]);list=list.filter(x=>x.id!==identity.id)},
    googleLinkForm:async()=>{calls.push('link-form');return {csrf:'test-csrf'}},
    requestEmailProof:async()=>{calls.push('mail');return CHALLENGE},verifyEmailProof:async()=>{calls.push('otp')},
    logout:async()=>{session=null;calls.push('logout')},
  }
  const controller=new AuthController(api,()=>now,()=>{throw Error('OAuth must use form')},()=>{})
  return {api,controller,calls,setSession:x=>session=x,setIdentities:x=>list=x,advance:x=>now+=x}
}
async function open(f){await f.controller.start();await f.controller.openAccount()}
test('EMAIL link validates 201/200 contract, posts empty body with CSRF, and strips extra personal fields',async()=>{
  for(const [status,value] of [[201,'LINKED'],[200,'ALREADY_LINKED']]) {
    const calls=[];const api=new AuthApi(async(path,init)=>{calls.push([path,init]);return path.endsWith('/csrf')?json({headerName:'X-CSRF-TOKEN',token:'test-token'}):json({status:value,identity:{...EMAIL,email:'fake@example.test',sub:'fixture'}},status)})
    assert.deepEqual(await api.linkEmail(),{status:value,identity:EMAIL})
    assert.equal(calls[1][1].method,'POST');assert.equal(calls[1][1].headers['X-CSRF-TOKEN'],'test-token');assert.equal(calls[1][1].body,'{}')
  }
})
test('EMAIL link rejects mismatched status/provider and invalid identity responses',async()=>{
  for(const [status,value,identity] of [[200,'LINKED',EMAIL],[201,'ALREADY_LINKED',EMAIL],[201,'LINKED',GOOGLE],[201,'LINKED',{...EMAIL,id:'bad'}]]) {
    const api=new AuthApi(async path=>path.endsWith('/csrf')?json({headerName:'X-CSRF-TOKEN',token:'test'}):json({status:value,identity},status))
    await assert.rejects(api.linkEmail(),e=>e.code==='RESPONSE_INVALID')
  }
})
test('UNLINK sends internal identity only to fixed provider route; arbitrary provider/id rejected before network',async()=>{
  const calls=[];const api=new AuthApi(async(path,init)=>{calls.push([path,init]);return path.endsWith('/csrf')?json({headerName:'X-CSRF-TOKEN',token:'test'}):new Response(null,{status:204})})
  for(const identity of [EMAIL,GOOGLE])await api.unlinkIdentity(identity)
  assert.deepEqual(calls.filter(([,x])=>x.method==='POST').map(([path,x])=>[path,JSON.parse(x.body)]),[EMAIL,GOOGLE].map(x=>[`/api/v1/auth/identities/${x.provider}/unlink`,{identityId:x.id}]))
  for(const identity of [{...EMAIL,id:'invalid'},{...EMAIL,provider:'../google'}])await assert.rejects(api.unlinkIdentity(identity),e=>e.code==='INVALID_REQUEST')
  assert.equal(calls.length,3)
})
test('Google LINK form preparation only fetches fresh CSRF, never fetches OAuth start',async()=>{
  const calls=[];const api=new AuthApi(async path=>{calls.push(path);return json({headerName:'X-CSRF-TOKEN',token:'form-token'})})
  assert.deepEqual(await api.googleLinkForm(),{csrf:'form-token'});assert.deepEqual(calls,['/api/v1/auth/csrf'])
})
for(const providers of [[EMAIL],[GOOGLE],[EMAIL,GOOGLE]])test(`EMAIL link readback preserves UUID/contact for ${providers.map(x=>x.provider).join('+')}`,async()=>{
  const f=fake(providers);await open(f);await f.controller.linkEmail();const s=f.controller.getSnapshot()
  assert.equal(s.userId,USER);assert.equal(s.account.contact.maskedEmail,'a***@***');assert.equal(s.account.identities.filter(x=>x.provider==='email').length,1)
  assert.match(s.notice,providers.includes(EMAIL)?/이미 같은 계정/:/연결했습니다/);assert.ok(!f.calls.includes('mail'))
})
test('VERIFIED alone never creates EMAIL identity and REQUIRED blocks mutation without sending mail',async()=>{
  const f=fake();await open(f);assert.deepEqual(f.controller.getSnapshot().account.identities,[GOOGLE]);assert.equal(f.controller.getSnapshot().account.confirmedAt,null)
  const missing=fake([GOOGLE],{status:'REQUIRED'});await open(missing);await missing.controller.linkEmail();await missing.controller.prepareGoogleLink()
  assert.equal(missing.controller.getSnapshot().issue.code,'REAUTH_EMAIL_REQUIRED');assert.ok(!missing.calls.includes('link'));assert.ok(!missing.calls.includes('mail'))
})
test('server proof refusal uses existing REAUTH; completing OTP never automatically replays LINK',async()=>{
  const f=fake();await open(f);const success=f.api.linkEmail;let attempts=0
  f.api.linkEmail=async()=>{attempts++;throw new AuthError('EMAIL_OWNERSHIP_PROOF_REQUIRED',403)}
  await f.controller.linkEmail();assert.equal(f.controller.getSnapshot().issue.code,'EMAIL_OWNERSHIP_PROOF_REQUIRED');assert.ok(!f.calls.includes('mail'))
  await f.controller.requestEmailProof();await f.controller.verifyEmailProof('012345');assert.equal(attempts,1)
  f.api.linkEmail=success;await f.controller.linkEmail();assert.match(f.controller.getSnapshot().notice,/연결했습니다/)
})
test('EMAIL ownership conflict explains separate accounts and never merges',async()=>{
  const f=fake();await open(f);f.api.linkEmail=async()=>{throw new AuthError('IDENTITY_ALREADY_OWNED',409)}
  await f.controller.linkEmail();assert.match(f.controller.getSnapshot().issue.message,/이 이메일 로그인.*다른 계정.*자동으로 합쳐지지/);assert.deepEqual(f.controller.getSnapshot().account.identities,[GOOGLE])
})
for(const target of [EMAIL,GOOGLE])test(`${target.provider} UNLINK requires explicit final confirmation, preserves representative contact`,async()=>{
  const f=fake([EMAIL,GOOGLE]);await open(f);f.controller.selectUnlink(target);assert.ok(f.controller.getSnapshot().account.unlink);assert.equal(f.calls.filter(Array.isArray).length,0)
  f.controller.cancelIdentityChange();await f.controller.confirmUnlink();assert.equal(f.calls.filter(Array.isArray).length,0)
  f.controller.selectUnlink(target);await f.controller.confirmUnlink();assert.equal(f.calls.filter(Array.isArray).length,1)
  const s=f.controller.getSnapshot();assert.equal(s.userId,USER);assert.equal(s.account.contact.status,'VERIFIED');assert.ok(!s.account.identities.some(x=>x.id===target.id));assert.match(s.notice,/대표 재인증 이메일은 유지/)
})
test('last usable identity is judged by server, not client count or guessed provider readiness',async()=>{
  const f=fake([EMAIL]);await open(f);f.api.unlinkIdentity=async()=>{throw new AuthError('LAST_LOGIN_IDENTITY',409)}
  f.controller.selectUnlink(EMAIL);await f.controller.confirmUnlink();assert.equal(f.controller.getSnapshot().issue.code,'LAST_LOGIN_IDENTITY');assert.deepEqual(f.controller.getSnapshot().account.identities,[EMAIL])
})
test('ambiguous same-provider identities cannot pick a UUID arbitrarily',async()=>{
  const f=fake([EMAIL,GOOGLE,SECOND]);await open(f);f.controller.selectUnlink(GOOGLE);await f.controller.confirmUnlink();assert.equal(f.controller.getSnapshot().issue.code,'IDENTITY_AMBIGUOUS');assert.equal(f.calls.filter(Array.isArray).length,0)
  f.controller.selectUnlink(EMAIL);f.setIdentities([EMAIL,{...EMAIL,id:SECOND.id},GOOGLE]);await f.controller.confirmUnlink();assert.equal(f.controller.getSnapshot().issue.code,'IDENTITY_AMBIGUOUS');assert.equal(f.calls.filter(Array.isArray).length,0)
})
test('target removed by another operation is rechecked before UNLINK',async()=>{
  const f=fake([EMAIL,GOOGLE]);await open(f);f.controller.selectUnlink(EMAIL);f.setIdentities([GOOGLE]);await f.controller.confirmUnlink()
  assert.equal(f.controller.getSnapshot().issue.code,'IDENTITY_NOT_FOUND');assert.equal(f.calls.filter(Array.isArray).length,0)
})
test('session changes before UNLINK cannot apply pending target to another account',async()=>{
  const f=fake([EMAIL,GOOGLE]);await open(f);f.controller.selectUnlink(EMAIL);f.setSession({userId:OTHER});await f.controller.confirmUnlink()
  assert.equal(f.controller.getSnapshot().status,'unavailable');assert.equal(f.calls.filter(Array.isArray).length,0);assert.equal(f.controller.getSnapshot().account.unlink,null)
})
test('different UUID after successful response is rejected without reporting success',async()=>{
  const f=fake();await open(f);f.api.linkEmail=async()=>{f.setSession({userId:OTHER});return {status:'LINKED',identity:EMAIL}}
  await f.controller.linkEmail();assert.equal(f.controller.getSnapshot().status,'unavailable');assert.equal(f.controller.getSnapshot().account.loaded,false);assert.equal(f.controller.getSnapshot().notice,'')
})
for(const error of [new AuthError('AUTHENTICATION_REQUIRED',401),new AuthError('CSRF_INVALID',403),new AuthError('EMAIL_OWNERSHIP_PROOF_REQUIRED',403),new AuthError('IDENTITY_NOT_FOUND',404),new AuthError('LAST_LOGIN_IDENTITY',409),new AuthError('IDENTITY_CHANGE_SUPERSEDED',409),new AuthError('IDENTITY_CHANGE_UNAVAILABLE',503)])test(`mutation error ${error.code} never replays write`,async()=>{
  const f=fake([EMAIL,GOOGLE]);await open(f);let writes=0;f.api.unlinkIdentity=async()=>{writes++;throw error};f.controller.selectUnlink(EMAIL);await f.controller.confirmUnlink();await f.controller.confirmUnlink()
  assert.equal(writes,1);assert.equal(f.controller.getSnapshot().issue.code,error.code);assert.equal(f.controller.getSnapshot().account.unlink,null)
})
for(const error of [new AuthError('NETWORK'),new AuthError('TIMEOUT'),new AuthError('RESPONSE_INVALID'),new AuthError('IDENTITY_CHANGE_UNAVAILABLE',503)])test(`uncertain ${error.code} rereads actual state without claiming mutation success`,async()=>{
  const f=fake();await open(f);let writes=0;const count=f.calls.filter(x=>x==='identities').length
  f.api.linkEmail=async()=>{writes++;f.setIdentities([EMAIL,GOOGLE]);throw error};await f.controller.linkEmail()
  assert.equal(writes,1);assert.ok(f.calls.filter(x=>x==='identities').length>count);assert.equal(f.controller.getSnapshot().account.identities.length,2);assert.match(f.controller.getSnapshot().notice,/현재 이메일 로그인 연결 상태.*자동 재실행하지/);assert.doesNotMatch(f.controller.getSnapshot().notice,/연결했습니다/);assert.equal(f.controller.getSnapshot().issue,null)
})
test('uncertain write followed by failed GET hides stale account data',async()=>{
  const f=fake();await open(f);f.api.linkEmail=async()=>{f.api.identities=async()=>{throw new AuthError('NETWORK')};throw new AuthError('TIMEOUT')}
  await f.controller.linkEmail();assert.equal(f.controller.getSnapshot().account.loaded,false);assert.deepEqual(f.controller.getSnapshot().account.identities,[]);assert.equal(f.controller.getSnapshot().notice,'')
})
test('204 response without actual deletion is not shown as success',async()=>{
  const f=fake([EMAIL,GOOGLE]);await open(f);f.api.unlinkIdentity=async()=>{};f.controller.selectUnlink(EMAIL);await f.controller.confirmUnlink();assert.equal(f.controller.getSnapshot().issue.code,'RESPONSE_INVALID');assert.match(f.controller.getSnapshot().notice,/불확실/)
})
test('Google LINK form requires explicit submit; bfcache resume clears navigation and confirmation',async()=>{
  const f=fake([EMAIL]);await open(f);await f.controller.prepareGoogleLink();assert.deepEqual(f.controller.getSnapshot().account.linkForm,{csrf:'test-csrf'});assert.equal(f.calls.filter(x=>x==='link-form').length,1)
  assert.equal(f.controller.beginLinkNavigation(),true);assert.equal(f.controller.beginLinkNavigation(),false)
  await f.controller.resume('account');assert.equal(f.controller.getSnapshot().account.linkForm,null);assert.equal(f.controller.getSnapshot().pending,null)
})
test('Google complete path rereads session/identities and does not infer a new link from URL',async()=>{
  assert.equal(returnFlow('/account/link/complete'),'link-complete');assert.equal(returnFlow('/account/link/failed'),'link-failed')
  for(const identities of [[EMAIL],[EMAIL,GOOGLE]]) {
    const f=fake(identities);await f.controller.start('link-complete');assert.equal(f.controller.getSnapshot().accountOpen,true);assert.ok(f.calls.includes('identities'))
    if(identities.length===1)assert.equal(f.controller.getSnapshot().issue.code,'GOOGLE_LINK_NOT_CONFIRMED')
    else assert.match(f.controller.getSnapshot().notice,/현재 Google.*다시 확인/)
    assert.ok(!f.calls.includes('link-form'));assert.ok(!f.calls.includes('mail'))
  }
})
test('Google failed callback is generic for cancellation/conflict/expiry and never claims specific HTTP cause',async()=>{
  const f=fake([EMAIL,GOOGLE]);await f.controller.start('link-failed');assert.equal(f.controller.getSnapshot().issue.code,'GOOGLE_LINK_FAILED');assert.match(f.controller.getSnapshot().issue.message,/취소·충돌/);assert.ok(!f.controller.getSnapshot().notice)
})
test('anonymous Google LINK return never reports success and displays a safe failure or login requirement',async()=>{
  for(const flow of ['link-complete','link-failed']) {
    const f=fake();f.setSession(null);await f.controller.start(flow)
    assert.equal(f.controller.getSnapshot().status,'anonymous');assert.equal(f.controller.getSnapshot().accountOpen,false)
    assert.equal(f.controller.getSnapshot().issue.code,flow==='link-complete'?'AUTHENTICATION_REQUIRED':'GOOGLE_LINK_FAILED')
    assert.ok(!f.calls.includes('identities'));assert.equal(f.controller.getSnapshot().notice,'')
  }
})
test('duplicate LINK clicks and route resume during request cannot replay mutation or retain pending confirmation',async()=>{
  const f=fake();await open(f);let release,writes=0;const hold=new Promise(r=>release=r)
  f.api.linkEmail=async()=>{writes++;await hold;f.setIdentities([EMAIL,GOOGLE]);return {status:'LINKED',identity:EMAIL}}
  const pending=f.controller.linkEmail();for(let i=0;i<20;i++)await Promise.resolve();await f.controller.linkEmail();await f.controller.resume('account');release();await pending
  assert.equal(writes,1);assert.equal(f.controller.getSnapshot().account.unlink,null);assert.equal(f.controller.getSnapshot().notice,'')
})
test('logout/restoration clear LINK form and UNLINK intent without persistent auth storage',async()=>{
  const descriptors=new Map(['localStorage','sessionStorage'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]))
  for(const k of descriptors.keys())Object.defineProperty(globalThis,k,{configurable:true,get(){throw Error('No auth storage')}})
  try {
    const f=fake([EMAIL,GOOGLE]);await open(f);await f.controller.prepareGoogleLink();f.controller.selectUnlink(EMAIL);await f.controller.resume('account');assert.equal(f.controller.getSnapshot().account.unlink,null)
    await f.controller.linkEmail();await f.controller.logout();assert.equal(f.controller.getSnapshot().account.linkForm,null);assert.equal(f.controller.getSnapshot().status,'anonymous')
  }finally{for(const [k,d] of descriptors)if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k]}
})
