import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { promisify } from 'node:util'

const docker = promisify(execFile)
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/
const identifier = (scope, value) => createHash('sha256').update(scope + '\0' + value).digest('hex')

/** Prepare only the login issuance budget of the approved, isolated review copy. */
export async function restoredReviewOtp(evidence) {
  const { runId, sourceRun, containerId, database, reviewUserId, reviewEmail } = evidence
  if (evidence.storageMode !== 'persistent-restored-v37' || evidence.migrationEnabled !== false
    || database !== 'overload_v22_isolated' || evidence.containerRunId !== runId
    || ![runId, sourceRun, reviewUserId].every(value => uuid.test(value)) || runId === sourceRun
    || !/^[a-f0-9]{64}$/.test(containerId) || !/^[^\s@]+@[^\s@]+$/.test(reviewEmail)) {
    throw Error('An isolated restored review account is required')
  }
  const { stdout } = await docker('docker', ['inspect', containerId], { windowsHide: true })
  const [container] = JSON.parse(stdout)
  const volume = 'overload-review-restored-' + runId.slice(0, 8) + '-data'
  const ports = container.NetworkSettings.Ports['5432/tcp']
  if (container.Id !== containerId || !container.State.Running
    || container.Config.Labels?.['com.overload.workout-review.run'] !== runId
    || !container.Mounts.some(mount => mount.Name === volume && mount.Destination === '/var/lib/postgresql')
    || ports?.length !== 1 || ports[0].HostIp !== '127.0.0.1' || Number(ports[0].HostPort) !== evidence.databasePort) {
    throw Error('Restored review database ownership mismatch')
  }
  const emailKey = identifier('email', reviewEmail)
  const emailBucket = identifier('request-email', reviewEmail)
  const ipBucket = identifier('request-ip', '127.0.0.1')
  const sql = `BEGIN;
DO $$ BEGIN
  IF current_database() <> 'overload_v22_isolated' OR NOT EXISTS (
    SELECT 1 FROM auth_identities WHERE user_id = '${reviewUserId}' AND provider = 'email' AND issuer = 'overload:email'
      AND encode(sha256(convert_to('email', 'UTF8') || decode('00','hex') || convert_to(subject, 'UTF8')), 'hex') = '${emailKey}'
  ) THEN RAISE EXCEPTION 'Expected restored review identity missing'; END IF;
END $$;
UPDATE email_otp_rate_limits SET hits = 0, window_started_at = CURRENT_TIMESTAMP
 WHERE purpose = 'LOGIN' AND bucket_key IN ('${emailBucket}', '${ipBucket}');
UPDATE email_otp_limits SET last_issued_at = NULL WHERE purpose = 'LOGIN' AND email_key = '${emailKey}';
COMMIT;`
  return async () => {
    await docker('docker', ['exec', containerId, 'psql', '-Xq', '-v', 'ON_ERROR_STOP=1', '-U', 'overload_test', '-d', database, '-c', sql],
      { windowsHide: true, timeout: 5000 })
  }
}
