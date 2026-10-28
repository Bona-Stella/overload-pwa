import assert from 'node:assert/strict'
import { test } from 'node:test'
import { AuthApi, AuthError } from '../src/features/auth/api.ts'
import { AuthController, returnFlow } from '../src/features/auth/controller.ts'

const USER='10000000-1111-4222-8333-000000000001', OTHER='20000000-1111-4222-8333-000000000002'
const ID='30000000-1111-4222-8333-000000000003', CANDIDATE='40000000-1111-4222-8333-000000000004', CHALLENGE='50000000-1111-4222-8333-000000000005'
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...headers}})
const gate=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve}}
function fake(providers=['google'], initialContact={status:'VERIFIED',maskedEmail:'a***@***'}) {
  let now=1_800_000_000_000, session={userId:USER}, contact=initialContact
  const calls=[],routes=[]
  const api={
    session:async()=>{calls.push('session');return session}, refreshCsrf:async()=>{calls.push('csrf')},clearCsrf:()=>{calls.push('clear-csrf')},
    identities:async()=>{calls.push('identities');return providers.map((provider,i)=>({provider,id:i?CANDIDATE:ID}))},contact:async()=>{calls.push('contact');return contact},
    requestEmailProof:async candidate=>{calls.push(['request',candidate]);return CHALLENGE},
    verifyEmailProof:async(...args)=>{calls.push(['verify',...args]);contact={status:'VERIFIED',maskedEmail:'a***@***'}},
    cancelRegistration:async()=>{calls.push('cancel');contact={status:'REQUIRED'}},
    contactForm:async identity=>{calls.push(['form',identity]);return {identityId:identity,csrf:'fixture-csrf'}},
    logout:async()=>{calls.push('logout');session=null},
  }
  const controller=new AuthController(api,()=>now,()=>{throw Error('No navigation expected')},path=>routes.push(path))
  return {api,controller,calls,routes,advance:ms=>now+=ms,setSession:value=>session=value,setContact:value=>contact=value}
}
async function open(f){await f.controller.start();await f.controller.openAccount()}

test('API projects only identity kinds and rejects malformed/duplicate identities',async()=>{
  const api=new AuthApi(async()=>json({identities:[{id:ID,provider:'google',email:'private@example.test',sub:'secret'}]}))
  assert.deepEqual(await api.identities(),[{id:ID,provider:'google'}])
  for(const identities of [[{id:ID,provider:'unknown'}],[{id:'bad',provider:'email'}],[{id:ID,provider:'email'},{id:ID,provider:'email'}]])
    await assert.rejects(new AuthApi(async()=>json({identities})).identities(),e=>e.code==='RESPONSE_INVALID')
})
test('contact API accepts only the masked server contract, stripping raw extra claims',async()=>{
  for(const contact of [{status:'VERIFIED',maskedEmail:'a***@***'},{status:'REQUIRED'},{status:'REQUIRED',candidate:{id:CANDIDATE,maskedEmail:'g***@***'}}])
    assert.deepEqual(await new AuthApi(async()=>json({...contact,email:'private@example.test',sub:'hidden'})).contact(),contact)
  for(const contact of [{status:'VERIFIED',maskedEmail:'private@example.test'},{status:'UNVERIFIED'},{status:'REQUIRED',candidate:{id:'invalid',maskedEmail:'g***@***'}}])
    await assert.rejects(new AuthApi(async()=>json(contact)).contact(),e=>e.code==='RESPONSE_INVALID')
})
test('common and enrollment API bodies never contain recipient, userId or login identity',async()=>{
  const calls=[];let csrf=0
  const api=new AuthApi(async(path,init)=>{calls.push([path,init]);if(path.endsWith('/csrf'))return json({headerName:'X-CSRF-TOKEN',token:`new-${++csrf}`});assert.equal(init.headers['X-CSRF-TOKEN'],`new-${csrf}`);return path.endsWith('/request')?json({status:'ACCEPTED',challengeId:CHALLENGE},202):new Response(null,{status:204})})
  await api.requestEmailProof();await api.verifyEmailProof(CHALLENGE,'012345');await api.requestEmailProof(CANDIDATE);await api.verifyEmailProof(CHALLENGE,'012345',CANDIDATE);await api.cancelRegistration()
  const writes=calls.filter(([,init])=>init.method==='POST').map(([path,init])=>[path,JSON.parse(init.body)])
  assert.deepEqual(writes,[['/api/v1/auth/reauth/email/request',{}],['/api/v1/auth/reauth/email/verify',{challengeId:CHALLENGE,code:'012345'}],['/api/v1/auth/reauth/email/registration/request',{candidateId:CANDIDATE}],['/api/v1/auth/reauth/email/registration/verify',{challengeId:CHALLENGE,code:'012345',candidateId:CANDIDATE}],['/api/v1/auth/reauth/email/registration/cancel',{}]])
  assert.equal(csrf,3)
})
test('Google-contact prepares only fixed form fields using a fresh CSRF without OAuth fetch',async()=>{
  const paths=[];const api=new AuthApi(async path=>{paths.push(path);return json({headerName:'X-CSRF-TOKEN',token:'form-csrf'})})
  assert.deepEqual(await api.contactForm(ID),{identityId:ID,csrf:'form-csrf'});assert.deepEqual(paths,['/api/v1/auth/csrf'])
  await assert.rejects(api.contactForm('private@example.test'),e=>e.code==='INVALID_REQUEST')
})
for(const providers of [['email'],['google'],['email','google'],[]])test(`authenticated account lookup supports ${providers.join('+')||'empty'} identities without inferring recent proof`,async()=>{
  const f=fake(providers);await open(f);const s=f.controller.getSnapshot()
  assert.equal(s.accountOpen,true);assert.deepEqual(s.account.identities.map(x=>x.provider),providers);assert.equal(s.account.contact.status,'VERIFIED');assert.equal(s.account.confirmedAt,null)
  assert.deepEqual(f.routes,['/account']);assert.equal(f.calls.filter(x=>Array.isArray(x)&&x[0]==='request').length,0)
})
test('anonymous account access cannot read data or send a proof email',async()=>{
  const f=fake();f.setSession(null);await f.controller.start('account');await f.controller.openAccount();await f.controller.requestEmailProof()
  assert.equal(f.controller.getSnapshot().status,'anonymous');assert.equal(f.controller.getSnapshot().accountOpen,false);assert.ok(!f.calls.includes('identities'))
})
test('EMAIL-only REQUIRED has no fabricated registration endpoint and cannot send',async()=>{
  const f=fake(['email'],{status:'REQUIRED'});await open(f);await f.controller.prepareGoogleContact();await f.controller.requestEmailProof()
  assert.equal(f.controller.getSnapshot().account.form,null);assert.equal(f.calls.filter(Array.isArray).length,0)
})
test('Google-only REQUIRED first confirms its existing identity; navigation is explicit and cancel clears candidate',async()=>{
  const f=fake(['google'],{status:'REQUIRED'});await open(f);await f.controller.prepareGoogleContact()
  assert.deepEqual(f.controller.getSnapshot().account.form,{identityId:ID,csrf:'fixture-csrf'});assert.equal(f.controller.beginContactNavigation(),true);assert.equal(f.controller.beginContactNavigation(),false)
  await f.controller.resume('contact-complete');assert.equal(f.controller.getSnapshot().issue.code,'CONTACT_NOT_CONFIRMED');assert.equal(f.controller.getSnapshot().account.form,null)
  f.setContact({status:'REQUIRED',candidate:{id:CANDIDATE,maskedEmail:'g***@***'}});await f.controller.openAccount();await f.controller.cancelRegistration()
  assert.deepEqual(f.controller.getSnapshot().account.contact,{status:'REQUIRED'});assert.equal(f.controller.getSnapshot().account.challenge,null)
})
test('contact callback path never grants registration/recent proof and failures remain explicit',async()=>{
  assert.equal(returnFlow('/account/contact/complete'),'contact-complete');assert.equal(returnFlow('/account/contact/failed'),'contact-failed')
  const f=fake(['google'],{status:'REQUIRED',candidate:{id:CANDIDATE,maskedEmail:'g***@***'}});await f.controller.start('contact-complete')
  assert.equal(f.controller.getSnapshot().account.contact.status,'REQUIRED');assert.equal(f.controller.getSnapshot().account.confirmedAt,null)
  const failed=fake(['google'],{status:'REQUIRED'});await failed.controller.start('contact-failed');assert.equal(failed.controller.getSnapshot().issue.code,'GOOGLE_CONTACT_FAILED')
  const anonymous=fake();anonymous.setSession(null);await anonymous.controller.start('contact-complete');assert.equal(anonymous.controller.getSnapshot().status,'anonymous')
})
for(const enrollment of [false,true])test(`${enrollment?'CONTACT_ENROLL':'REAUTH'} verifies existing UUID, refreshes CSRF and re-reads VERIFIED contact`,async()=>{
  const f=fake(['google'],enrollment?{status:'REQUIRED',candidate:{id:CANDIDATE,maskedEmail:'g***@***'}}:undefined);await open(f)
  await f.controller.requestEmailProof();assert.equal(f.controller.getSnapshot().account.challenge.candidateId,enrollment?CANDIDATE:undefined)
  await f.controller.verifyEmailProof('012345');const s=f.controller.getSnapshot()
  assert.equal(s.status,'authenticated');assert.equal(s.userId,USER);assert.equal(s.account.challenge,null);assert.equal(s.account.contact.status,'VERIFIED');assert.notEqual(s.account.confirmedAt,null)
  const call=f.calls.find(x=>Array.isArray(x)&&x[0]==='verify');assert.deepEqual(call,['verify',CHALLENGE,'012345',enrollment?CANDIDATE:undefined])
  assert.equal(f.calls.slice(f.calls.indexOf(call)+1).includes('csrf'),true)
})
test('duplicate request, cancel and route re-entry preserve resend delay; no automatic send',async()=>{
  const f=fake();await open(f);const hold=gate();let sends=0
  f.api.requestEmailProof=async()=>{sends++;await hold.promise;return CHALLENGE}
  const task=f.controller.requestEmailProof();await Promise.resolve();await f.controller.requestEmailProof();hold.resolve();await task
  f.controller.clearAccountCode();f.controller.closeAccount();await f.controller.openAccount();await f.controller.requestEmailProof();assert.equal(sends,1)
  f.advance(60_001);assert.equal(sends,1);await f.controller.requestEmailProof();assert.equal(sends,2)
})
for(const error of [new AuthError('OTP_RATE_LIMITED',429,120),new AuthError('OTP_UNAVAILABLE',503),new AuthError('NETWORK'),new AuthError('CSRF_INVALID',403)])test(`request failure ${error.code} keeps authentication and never retries`,async()=>{
  const f=fake();await open(f);let sends=0;f.api.requestEmailProof=async()=>{sends++;throw error}
  await f.controller.requestEmailProof();await f.controller.requestEmailProof();assert.equal(sends,1);assert.equal(f.controller.getSnapshot().status,'authenticated');assert.equal(f.controller.getSnapshot().account.challenge,null);assert.equal(f.controller.getSnapshot().issue.code,error.code)
  if(error.status===429){f.advance(60_001);await f.controller.requestEmailProof();assert.equal(sends,1)}
})
test('wrong OTP is not logout; 5-minute expiration and 429 block verification and resend',async()=>{
  const f=fake();await open(f);await f.controller.requestEmailProof();let verifies=0
  f.api.verifyEmailProof=async()=>{verifies++;throw new AuthError('OTP_INVALID',401)}
  await f.controller.verifyEmailProof('000000');assert.equal(f.controller.getSnapshot().status,'authenticated');assert.equal(f.controller.getSnapshot().account.confirmedAt,null)
  f.api.verifyEmailProof=async()=>{verifies++;throw new AuthError('OTP_RATE_LIMITED',429,120)}
  await f.controller.verifyEmailProof('000000');await f.controller.verifyEmailProof('000000');assert.equal(verifies,2)
  f.advance(120_000);f.api.verifyEmailProof=async()=>{verifies++};f.advance(180_000);await f.controller.verifyEmailProof('000000');assert.equal(verifies,2);assert.equal(f.controller.getSnapshot().issue.code,'CODE_EXPIRED')
})
for(const error of [new AuthError('NETWORK'),new AuthError('TIMEOUT'),new AuthError('OTP_UNAVAILABLE',503)])test(`uncertain verify ${error.code} clears proof and requires read-only recovery`,async()=>{
  const f=fake();await open(f);await f.controller.requestEmailProof();let verifies=0
  f.api.verifyEmailProof=async()=>{verifies++;throw error};await f.controller.verifyEmailProof('000000');await f.controller.verifyEmailProof('000000')
  assert.equal(verifies,1);assert.equal(f.controller.getSnapshot().status,'unavailable');assert.equal(f.controller.getSnapshot().account.challenge,null)
  await f.controller.restore('account');assert.equal(f.controller.getSnapshot().status,'authenticated');assert.equal(f.controller.getSnapshot().account.confirmedAt,null)
})
test('rotated session returning a different UUID never reports OTP success or mixes account data',async()=>{
  const f=fake();await open(f);await f.controller.requestEmailProof();f.api.verifyEmailProof=async()=>f.setSession({userId:OTHER})
  await f.controller.verifyEmailProof('000000');assert.equal(f.controller.getSnapshot().status,'unavailable');assert.equal(f.controller.getSnapshot().account.loaded,false);assert.equal(f.controller.getSnapshot().account.confirmedAt,null);assert.equal(f.controller.getSnapshot().issue.code,'SESSION_CHANGED')
})
test('session changes before a write or during account reads reject stale account state',async()=>{
  const f=fake();await open(f);f.setSession({userId:OTHER});await f.controller.requestEmailProof();assert.equal(f.calls.filter(Array.isArray).length,0);assert.equal(f.controller.getSnapshot().status,'unavailable')
  const next=fake();await next.controller.start();next.api.contact=async()=>{next.setSession({userId:OTHER});return {status:'VERIFIED',maskedEmail:'b***@***'}}
  await next.controller.openAccount();assert.equal(next.controller.getSnapshot().account.loaded,false)
})
test('account query network failures are distinct from anonymous; 401 expires the account',async()=>{
  const f=fake();await f.controller.start();f.api.contact=async()=>{throw new AuthError('NETWORK')};await f.controller.openAccount()
  assert.equal(f.controller.getSnapshot().status,'authenticated');assert.equal(f.controller.getSnapshot().account.loaded,false)
  f.api.contact=async()=>{throw new AuthError('AUTHENTICATION_REQUIRED',401)};await f.controller.openAccount();assert.equal(f.controller.getSnapshot().status,'anonymous');assert.equal(f.controller.getSnapshot().userId,null)
})
test('back/bfcache invalidates in-flight account results, then restores without replaying a write',async()=>{
  const f=fake();await open(f);const hold=gate();let sends=0
  f.api.requestEmailProof=async()=>{sends++;await hold.promise;return CHALLENGE}
  const request=f.controller.requestEmailProof();for(let i=0;i<12;i++)await Promise.resolve()
  await f.controller.resume('account');hold.resolve();await request
  assert.equal(sends,1);assert.equal(f.controller.getSnapshot().account.challenge,null);assert.equal(f.controller.getSnapshot().account.confirmedAt,null);assert.equal(f.controller.getSnapshot().status,'authenticated')
})
test('logout and fresh restoration clear account and recent OTP feedback without browser storage',async()=>{
  const f=fake();await open(f);await f.controller.requestEmailProof();await f.controller.verifyEmailProof('012345')
  await f.controller.restore('account');assert.equal(f.controller.getSnapshot().account.confirmedAt,null)
  await f.controller.requestEmailProof();await f.controller.logout();const s=f.controller.getSnapshot();assert.equal(s.account.loaded,false);assert.equal(s.account.challenge,null);assert.equal(s.account.form,null);assert.equal(s.accountOpen,false)
})
test('refreshing account data does not add duplicate navigation entries',async()=>{
  const f=fake();await open(f);await f.controller.openAccount();assert.deepEqual(f.routes,['/account'])
  f.controller.closeAccount();await f.controller.openAccount();assert.deepEqual(f.routes,['/account','/','/account'])
})
test('bodyless session 401 clears cached CSRF before a later explicit write',async()=>{
  let gets=0
  const api=new AuthApi(async(path)=>{
    if(path.endsWith('/csrf')){gets++;return json({headerName:'X-CSRF-TOKEN',token:'fake-token'})}
    if(path.endsWith('/session'))return new Response(null,{status:401})
    return json({status:'ACCEPTED',challengeId:CHALLENGE},202)
  })
  await api.refreshCsrf();assert.equal(await api.session(),null);await api.requestEmailProof();assert.equal(gets,2)
})
test('post-consumption CSRF read failure cannot turn a consumed OTP into a second verification',async()=>{
  const f=fake();await open(f);await f.controller.requestEmailProof();let verified=0
  f.api.verifyEmailProof=async()=>{verified++;f.api.refreshCsrf=async()=>{throw new AuthError('NETWORK')}}
  await f.controller.verifyEmailProof('012345');await f.controller.verifyEmailProof('012345')
  assert.equal(verified,1);assert.equal(f.controller.getSnapshot().status,'unavailable');assert.equal(f.controller.getSnapshot().account.challenge,null)
})
test('account/contact/proof operations never access browser persistent storage or demo data',async()=>{
  const saved=new Map(['localStorage','sessionStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
  for(const key of saved.keys())Object.defineProperty(globalThis,key,{configurable:true,get(){throw Error('Account flow must not access persistent storage')}})
  try{
    const f=fake(['google'],{status:'REQUIRED',candidate:{id:CANDIDATE,maskedEmail:'g***@***'}})
    await f.controller.start('contact-complete');await f.controller.requestEmailProof();await f.controller.verifyEmailProof('012345')
    await f.controller.resume('account');await f.controller.logout()
    assert.equal(f.controller.getSnapshot().status,'anonymous')
  }finally{for(const [key,descriptor] of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}}
})
