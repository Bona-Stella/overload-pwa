// Manual, local-only lifecycle. No container/volume deletion, schema reset or automatic startup.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { execFileSync, spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { createHash, randomUUID, randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { verifyV22Ownership } from '../tests/fixtures/v22-environment.mjs'

const root=resolve('.local-backups/home-review'),pointer=resolve(root,'current.json')
const action=process.argv[2]??'status'
const docker=args=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:16*1024*1024}).trim()
const inspect=id=>JSON.parse(docker(['inspect',id]))[0]
const json=async path=>JSON.parse(await readFile(path,'utf8'))
const sha=async path=>createHash('sha256').update(await readFile(path)).digest('hex')
const fail=message=>{throw Error(message)}
const ensure=(value,message)=>{if(!value)fail(message)}
const sql=(id,query)=>docker(['exec',id,'psql','-X','-qAt','-U','overload_test','-d','overload_v22_isolated','-v','ON_ERROR_STOP=1','-c',query])
async function current(){const p=await json(pointer);ensure(/^[-a-f0-9]{36}$/.test(p.sourceRun),'Invalid source run');const c=await json(resolve(root,p.sourceRun,'archive.json'));ensure(c.sourceRun===p.sourceRun&&c.database==='overload_v22_isolated','Invalid archive');return c}
function auditQuery(tables){
  for(const table of tables)ensure(/^[a-z_]+$/.test(table),'Unexpected table name')
  return `SELECT json_build_object('tables',json_build_array(${tables.map(t=>`json_build_object('table','${t}','count',(SELECT count(*) FROM public.${t}),'sha256',(SELECT encode(sha256(convert_to(COALESCE(string_agg(md5(to_jsonb(r)::text),'' ORDER BY md5(to_jsonb(r)::text)),''),'UTF8')),'hex') FROM public.${t} r))`).join(',')}),'domain',json_build_object('routines',(SELECT count(*) FROM routines),'sessions',(SELECT count(*) FROM workout_sessions),'undeletedSessions',(SELECT count(*) FROM workout_sessions WHERE deleted_at IS NULL),'activeSessions',(SELECT count(*) FROM workout_sessions WHERE status='ACTIVE'),'performedSets',(SELECT count(*) FROM performed_sets),'cardioResults',(SELECT count(*) FROM cardio_results),'migrations',(SELECT count(*) FROM flyway_schema_history WHERE success)));`
}
async function verify(c,compareContents=false){
  ensure(await sha(c.dumpPath)===c.dumpSha256,'Backup checksum mismatch')
  const i=inspect(c.containerId)
  ensure(i.Config.Labels['com.overload.home-review.preserved']===c.sourceRun,'Wrong preserved container')
  ensure(!i.HostConfig.AutoRemove&&!i.HostConfig.Tmpfs?.['/var/lib/postgresql']&&i.HostConfig.RestartPolicy.Name==='no','Unsafe preserved storage/lifecycle')
  ensure(i.Mounts.some(m=>m.Type==='volume'&&m.Name===c.volumeName&&m.Destination==='/var/lib/postgresql'),'Persistent data volume missing')
  if(i.State.Running&&compareContents){const a=JSON.parse(sql(c.containerId,auditQuery(c.tables)));ensure(JSON.stringify(a)===JSON.stringify(await json(c.auditPath)),'Restored database differs from backup snapshot')}
  return i
}
if(action==='prepare'){
  await mkdir(root,{recursive:true});try{await access(pointer);fail('Archive already exists; use status/verify, never overwrite it')}catch(e){if(e.code!=='ENOENT')throw e}
  const {runId}=await json('logs/home-review/current.json')
  ensure(/^[a-f0-9-]{36}$/.test(runId),'Invalid live review run')
  const e=await json(resolve('../overload-server/build/verification-v22',runId,'home-review.json'))
  await verifyV22Ownership(e)
  ensure(e.database==='overload_v22_isolated'&&![5432,5433].includes(e.databasePort),'Isolated source DB required')
  const source=inspect(e.containerId)
  ensure(source.State.Running&&source.Config.Labels['com.overload.verification.run']===runId,'Source container identity mismatch')
  const directory=resolve(root,runId);await mkdir(directory,{recursive:false})
  const dumpPath=resolve(directory,'review.dump'),auditPath=resolve(directory,'snapshot-audit.json')
  const tables=sql(e.containerId,"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").split('\n').filter(Boolean)
  const query=auditQuery(tables)
  // Export one repeatable-read snapshot; pg_dump and row fingerprints see exactly the same data.
  const session=spawn('docker',['exec','-i',e.containerId,'psql','-X','-qAt','-U','overload_test','-d',e.database,'-v','ON_ERROR_STOP=1'],{windowsHide:true,stdio:['pipe','pipe','pipe']})
  const lines=createInterface({input:session.stdout})[Symbol.asyncIterator]();let error='';session.stderr.on('data',b=>error+=b)
  const ended=new Promise((r,j)=>{session.once('error',j);session.once('exit',code=>code===0?r():j(Error('Snapshot transaction failed: '+error)))})
  let audit
  try{
    session.stdin.write('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_export_snapshot();\n')
    const snapshot=(await lines.next()).value;ensure(/^[A-F0-9-]+$/i.test(snapshot),'Invalid exported snapshot')
    session.stdin.write(query+'\n');audit=JSON.parse((await lines.next()).value)
    docker(['exec',e.containerId,'pg_dump','-U','overload_test','-d',e.database,'--format=custom','--no-owner','--no-acl','--snapshot='+snapshot,'--file=/tmp/home-review-preserved.dump'])
  }finally{session.stdin.end('ROLLBACK;\n\\q\n');await ended}
  docker(['cp',e.containerId+':/tmp/home-review-preserved.dump',dumpPath]);await writeFile(auditPath,JSON.stringify(audit,null,2))
  const volumeName='overload-home-review-'+runId.slice(0,8),containerName=volumeName,databasePassword=randomUUID(),otpHmacKey=randomBytes(32).toString('base64')
  const envPath=resolve(directory,'database.env');await writeFile(envPath,`POSTGRES_USER=overload_test\nPOSTGRES_PASSWORD=${databasePassword}\nPOSTGRES_DB=${e.database}\n`,{flag:'wx'})
  ensure(!docker(['volume','ls','--format','{{.Name}}']).split('\n').includes(volumeName),'Never reuse an existing volume during restore verification')
  ensure(!docker(['ps','-a','--filter','name=^/'+containerName+'$','--format','{{.ID}}']),'Never replace an existing container')
  docker(['volume','create','--label','com.overload.home-review.preserved='+runId,volumeName])
  const containerId=docker(['run','-d','--name',containerName,'--restart=no','--label','com.overload.home-review.preserved='+runId,'--mount',`type=volume,source=${volumeName},target=/var/lib/postgresql`,'-p','127.0.0.1::5432','--env-file',envPath,source.Image])
  const deadline=Date.now()+60000;while(true){try{if(sql(containerId,'SELECT 1')==='1')break}catch{ }ensure(Date.now()<deadline,'Restore container readiness timeout');await new Promise(r=>setTimeout(r,250))}
  docker(['cp',dumpPath,containerId+':/tmp/home-review.dump'])
  docker(['exec',containerId,'pg_restore','-U','overload_test','-d',e.database,'--exit-on-error','--no-owner','--no-privileges','/tmp/home-review.dump'])
  const restored=JSON.parse(sql(containerId,query));ensure(JSON.stringify(restored)===JSON.stringify(audit),'Full restore fingerprint mismatch')
  const i=inspect(containerId),databasePort=Number(i.NetworkSettings.Ports['5432/tcp'][0].HostPort)
  const c={sourceRun:runId,sourceContainerId:e.containerId,sourceBackendPid:e.backendPid,sourceBackendOrigin:e.backendOrigin,sourceControlOrigin:e.browserControlOrigin,sourceInboxOrigin:e.inboxOrigin,sourceTestcontainersSession:source.Config.Labels['org.testcontainers.sessionId'],database:e.database,containerId,containerName,volumeName,volumeMountpoint:JSON.parse(docker(['volume','inspect',volumeName]))[0].Mountpoint,imageId:source.Image,databasePort,databasePassword,otpHmacKey,reviewEmail:e.reviewEmail,directory,dumpPath,dumpSha256:await sha(dumpPath),auditPath,tables,verifiedAt:new Date().toISOString(),resumeRun:randomUUID(),startupPolicy:'MANUAL_AFTER_T02B_FIRST_UI_ONLY'}
  await writeFile(resolve(directory,'source-evidence.json'),JSON.stringify(e,null,2));await writeFile(resolve(directory,'archive.json'),JSON.stringify(c,null,2),{flag:'wx'})
  await writeFile(pointer,JSON.stringify({sourceRun:runId},null,2),{flag:'wx'});await verify(c,true)
  console.log(JSON.stringify({backup:dumpPath,sha256:c.dumpSha256,restore:'ALL_TABLE_COUNTS_AND_FINGERPRINTS_MATCH',domain:audit.domain,volume:volumeName,container:containerName,databasePort,startupPolicy:c.startupPolicy},null,2))
}else if(action==='verify'||action==='status'){
  const c=await current(),i=await verify(c,action==='verify');console.log(JSON.stringify({backup:c.dumpPath,sha256:c.dumpSha256,container:c.containerName,running:i.State.Running,volume:c.volumeName,startupPolicy:c.startupPolicy},null,2))
}else if(action==='start-db'){
  ensure(process.argv.includes('--after-t02b-first-ui'),'T02-B first UI must be complete; explicit --after-t02b-first-ui required')
  const c=await current(),i=await verify(c);if(!i.State.Running)docker(['start',c.containerId]);const ready=Date.now()+60000;while(true){try{if(sql(c.containerId,'SELECT 1')==='1')break}catch{ }ensure(Date.now()<ready,'Preserved DB readiness timeout');await new Promise(r=>setTimeout(r,250))}const updated=inspect(c.containerId);c.databasePort=Number(updated.NetworkSettings.Ports['5432/tcp'][0].HostPort);await writeFile(resolve(c.directory,'archive.json'),JSON.stringify(c,null,2));console.log('Started only the existing preserved DB. No seed/restore/reset executed.')
}else if(action==='stop-legacy'){
  const c=await current();await verify(c)
  const e=await json(resolve('../overload-server/build/verification-v22',c.sourceRun,'home-review.json'));await verifyV22Ownership(e)
  ensure(inspect(c.sourceContainerId).Config.Labels['com.overload.verification.run']===c.sourceRun,'Legacy container mismatch')
  // Stop the front end through its existing Vite close path; never call the disposing Stop action.
  const front=await(await fetch('http://127.0.0.1:3000/__home_review')).json();ensure(front.runId===c.sourceRun,'Frontend mismatch')
  const response=await fetch('http://127.0.0.1:3000/__review/shutdown',{method:'POST',headers:{'X-Review-Run':c.sourceRun}})
  if(response.status!==204){
    // The already-running pre-archive Vite process has no shutdown endpoint. Enable its local
    // Node inspector once, verify the script identity, then invoke its EXISTING SIGINT handler.
    let targets;try{targets=await(await fetch('http://127.0.0.1:9229/json/list',{signal:AbortSignal.timeout(500)})).json()}catch{ }
    if(!targets)process._debugProcess(front.pid)
    const until=Date.now()+10000
    while(!targets){try{targets=await(await fetch('http://127.0.0.1:9229/json/list')).json()}catch{ensure(Date.now()<until,'Node inspector did not open');await new Promise(r=>setTimeout(r,100))}}
    const target=targets.find(t=>t.type==='node'&&t.title==='scripts/home-review-server.mjs');ensure(target,'Wrong inspector target')
    const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j})
    const identity=new Promise((r,j)=>{ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id===1)m.error?j(Error('Inspector identity failed')):r(m.result.result.value)}})
    ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:'({pid:process.pid,script:process.argv[1]})',returnByValue:true}}))
    const actual=await identity
    if(actual.pid!==front.pid||resolve(actual.script)!==resolve('scripts/home-review-server.mjs')){ws.close();fail('Leave an unrelated inspector untouched')}
    ws.send(JSON.stringify({id:2,method:'Runtime.evaluate',params:{expression:"process.emit('SIGINT')"}}));await new Promise(r=>setTimeout(r,500));ws.close()
  }
  const java=process.env.REVIEW_JAVA_HOME??'C:/Users/Home/.jdks/temurin-25.0.5',server=resolve('../overload-server'),directory=resolve(server,'build/verification-v22',c.sourceRun)
  const classes=resolve(server,'build/review-shutdown-agent');await mkdir(classes,{recursive:true})
  execFileSync(resolve(java,'bin/javac.exe'),['--add-modules','jdk.attach','-d',classes,resolve(server,'scripts/ReviewShutdownAgent.java')],{windowsHide:true})
  const manifest=resolve(classes,'MANIFEST.MF'),jar=resolve(classes,'review-shutdown.jar');await writeFile(manifest,'Manifest-Version: 1.0\nAgent-Class: ReviewShutdownAgent\nCan-Redefine-Classes: true\n\n')
  execFileSync(resolve(java,'bin/jar.exe'),['--create','--file',jar,'--manifest',manifest,'-C',classes,'ReviewShutdownAgent.class'],{windowsHide:true})
  const ryuks=docker(['ps','--filter','name=testcontainers-ryuk-'+c.sourceTestcontainersSession,'--format','{{.ID}}']).split('\n').filter(Boolean)
  ensure(ryuks.length===1,'Exact original Ryuk required')
  // This auxiliary has no user DB; stopping it prevents its label-based automatic disposal.
  // Do not let the garbage collector run a final prune while exiting. Only this data-less
  // auxiliary is killed; Vite, Spring and both PostgreSQL servers shut down normally.
  docker(['stop','--signal','SIGKILL','--timeout','1',ryuks[0]])
  await writeFile(resolve(directory,'preserve-review-db'),c.sourceRun,{flag:'wx'})
  const patchedClass=resolve(server,'build/classes/java/test/com/overload/testfixture/V22BrowserEnvironment.class')
  execFileSync(resolve(java,'bin/java.exe'),['--add-modules','jdk.attach','-cp',classes,'ReviewShutdownAgent',String(c.sourceBackendPid),jar,[c.sourceRun,c.sourceContainerId,patchedClass,directory].join('|')],{windowsHide:true,timeout:30000})
  const until=Date.now()+30000
  while(true){let live=true;try{process.kill(c.sourceBackendPid,0)}catch{live=false}if(!live)break;ensure(Date.now()<until,'Legacy JVM did not finish normal shutdown');await new Promise(r=>setTimeout(r,250))}
  ensure((await readFile(resolve(directory,'preserve-agent-ready'),'utf8')).trim()===c.sourceRun,'Guarded shutdown proof missing')
  docker(['stop','--timeout','30',c.sourceContainerId]);ensure(!inspect(c.sourceContainerId).State.Running,'Legacy DB did not stop')
  console.log('Original Vite and JVM closed normally; original PostgreSQL container retained and stopped. Verified durable copy remains intact.')
}else if(action==='stop-db'){
  const c=await current();await verify(c);docker(['stop','--timeout','30',c.containerId]);await verify(c);console.log('Preserved PostgreSQL stopped; named volume and Windows dump retained.')
}else fail('Use prepare | verify | status | start-db --after-t02b-first-ui | stop-legacy | stop-db')
