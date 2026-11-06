// Explicit test-fixture cleanup after repeated browser checks. Never called by the app or login proxy.
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { verifyV22Ownership } from '../tests/fixtures/v22-environment.mjs'

const { runId } = JSON.parse(await readFile('logs/home-review/current.json','utf8'))
if (!/^[0-9a-f-]{36}$/.test(runId)) throw Error('Review UUID required')
const evidence=JSON.parse(await readFile(resolve('../overload-server/build/verification-v22',runId,'home-review.json'),'utf8'))
const persistent=evidence.storageMode==='persistent-restored'&&!evidence.freshDatabase
const sourceRun=persistent?evidence.sourceRun:runId
if(!/^[0-9a-f-]{36}$/.test(sourceRun)||evidence.database!=='overload_v22_isolated'||(!evidence.freshDatabase&&!persistent)||evidence.reviewEmail!==`home-${sourceRun.slice(0,8)}@example.test`||!/^[a-f0-9]{64}$/.test(evidence.containerId))throw Error('Prepared review account only')
if(persistent){const pointer=JSON.parse(await readFile('.local-backups/home-review/current.json','utf8'));const archive=JSON.parse(await readFile(resolve('.local-backups/home-review',pointer.sourceRun,'archive.json'),'utf8'));if(archive.sourceRun!==sourceRun||archive.resumeRun!==runId||archive.containerId!==evidence.containerId||archive.reviewEmail!==evidence.reviewEmail)throw Error('Preserved archive mismatch')}
await verifyV22Ownership(evidence)
const labels=JSON.parse(execFileSync('docker',['inspect','--format','{{json .Config.Labels}}',evidence.containerId],{encoding:'utf8',windowsHide:true}))
if ((persistent?labels['com.overload.home-review.preserved']!==sourceRun:labels['com.overload.verification.run']!==runId)) throw Error('Container ownership mismatch')
const key=scope=>createHash('sha256').update(scope+'\0'+evidence.reviewEmail).digest('hex')
const loopback=process.argv.includes('--include-isolated-loopback-request-budget')
const loopbackKey=createHash('sha256').update('request-ip\0'+'127.0.0.1').digest('hex')
const sql=`BEGIN;
DO $$ BEGIN IF current_database()<>'overload_v22_isolated' THEN RAISE EXCEPTION 'Review DB required'; END IF; END $$;
UPDATE email_otp_rate_limits SET hits=0,window_started_at=CURRENT_TIMESTAMP WHERE purpose='LOGIN' AND bucket_key='${key('request-email')}';
UPDATE email_otp_limits SET last_issued_at=NULL WHERE purpose='LOGIN' AND email_key='${key('email')}';
${loopback?`UPDATE email_otp_rate_limits SET hits=0,window_started_at=CURRENT_TIMESTAMP WHERE purpose='LOGIN' AND bucket_key='${loopbackKey}';`:''}
COMMIT;`
execFileSync('docker',['exec','-i',evidence.containerId,'psql','-X','-v','ON_ERROR_STOP=1','-U','overload_test','-d','overload_v22_isolated'],{input:sql,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']})
console.log(loopback?'Prepared this isolated review email and explicit localhost request-fixture budgets. OTP verification/failure limits, sessions and workout data are unchanged.':'Prepared only this isolated review email request budget. OTP verification/failure limits, IP limits, sessions and workout data are unchanged.')
