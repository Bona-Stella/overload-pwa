// Only the existing disposable Java browser fixture is accepted. Never reads .env.
import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
const isolated = JSON.parse(await readFile(new URL('../../../overload-server/build/task-008-1c/ready.json', import.meta.url), 'utf8'))
if (new URL(isolated.backendOrigin).hostname !== '127.0.0.1' || isolated.initialUsers !== 0 || isolated.migrations !== 17
  || !/^[a-f0-9]{64}$/.test(isolated.containerId)) throw Error('Disposable V17 browser fixture required')
const sql = `BEGIN;
INSERT INTO standard_exercise(id,name) VALUES
('40000000-1111-4222-8333-000000000001','벤치프레스'),
('40000000-1111-4222-8333-000000000002','하이로우'),
('40000000-1111-4222-8333-000000000003','덤벨 벤치프레스') ON CONFLICT DO NOTHING;
INSERT INTO exercise_alias(standard_exercise_id,alias,normalized_alias) VALUES
('40000000-1111-4222-8333-000000000001','Bench Press','bench press'),
('40000000-1111-4222-8333-000000000001','공통 별칭','공통 별칭'),
('40000000-1111-4222-8333-000000000003','공통 별칭','공통 별칭') ON CONFLICT DO NOTHING;
INSERT INTO manufacturer(id,name) VALUES
('80000000-1111-4222-8333-000000000001','파나타'),
('80000000-1111-4222-8333-000000000002','해머스트렝스') ON CONFLICT DO NOTHING;
COMMIT;`
const child = spawn('docker', ['exec', isolated.containerId, 'psql', '-U', 'overload_test', '-d', 'overload_browser_isolated', '-X', '-v', 'ON_ERROR_STOP=1', '-c', sql], { windowsHide: true, stdio: 'inherit' })
const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve) })
if (code !== 0) throw Error('Disposable catalog seeding failed')
