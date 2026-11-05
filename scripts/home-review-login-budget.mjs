// Explicit test-fixture cleanup after repeated browser checks. Never called by the app or login proxy.
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { verifyV22Ownership } from '../tests/fixtures/v22-environment.mjs'

const { runId } = JSON.parse(await readFile('logs/home-review/current.json','utf8'))
if (!/^[0-9a-f-]{36}$/.test(runId)) throw Error('Review UUID required')
const evidence=JSON.parse(await readFile(resolve('../overload-server/build/verification-v22',runId,'home-review.json'),'utf8'))
if (evidence.database!=='overload_v22_isolated' || !evidence.freshDatabase || evidence.reviewEmail!==`home-${runId.slice(0,8)}@example.test` || !/^[a-f0-9]{64}$/.test(evidence.containerId)) throw Error('Prepared review account only')
await verifyV22Ownership(evidence)
const labels=JSON.parse(execFileSync('docker',['inspect','--format','{{json .Config.Labels}}',evidence.containerId],{encoding:'utf8',windowsHide:true}))
if (labels['com.overload.verification.run']!==runId) throw Error('Container ownership mismatch')
const key=scope=>createHash('sha256').update(scope+'\0'+evidence.reviewEmail).digest('hex')
const sql=`BEGIN;
DO $$ BEGIN IF current_database()<>'overload_v22_isolated' THEN RAISE EXCEPTION 'Review DB required'; END IF; END $$;
UPDATE email_otp_rate_limits SET hits=0,window_started_at=CURRENT_TIMESTAMP WHERE purpose='LOGIN' AND bucket_key='${key('request-email')}';
UPDATE email_otp_limits SET last_issued_at=NULL WHERE purpose='LOGIN' AND email_key='${key('email')}';
COMMIT;`
execFileSync('docker',['exec','-i',evidence.containerId,'psql','-X','-v','ON_ERROR_STOP=1','-U','overload_test','-d','overload_v22_isolated'],{input:sql,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']})
console.log('Prepared only this isolated review email request budget. OTP verification/failure limits, IP limits, sessions and workout data are unchanged.')
