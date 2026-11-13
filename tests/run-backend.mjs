import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
const bin = spawnSync('pg_config', ['--bindir'], { encoding: 'utf8' });
if (bin.status !== 0) throw new Error('PostgreSQL tools (pg_config/initdb/psql) are required for this local-only suite');
const directory = [process.env.HUMMUNICATION_POSTGRES_BIN, bin.stdout.trim(), '/opt/homebrew/opt/postgresql@18/bin', '/usr/local/opt/postgresql@18/bin'].find(path => path && existsSync(join(path, 'postgres')));
if (!directory) throw new Error('Set HUMMUNICATION_POSTGRES_BIN to the PostgreSQL server bin directory');
const root = mkdtempSync(join(tmpdir(), 'hummunication-db-'));
const executable = name => join(directory, name);
function run(name, args, input) {
  const result = spawnSync(executable(name), args, { input, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${name} failed: ${result.stderr}`);
  return result;
}
const socket = createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
let started = false;
try {
  run('initdb', ['-D', join(root, 'data'), '-A', 'trust', '--no-locale', '-E', 'UTF8']);
  run('pg_ctl', ['-D', join(root, 'data'), '-l', join(root, 'log'), '-o', `-h 127.0.0.1 -p ${port} -k ${root}`, 'start']);
  started = true;
  run('createdb', ['-h', '127.0.0.1', '-p', String(port), 'hummunication_test']);
  const target = `postgresql://127.0.0.1:${port}/hummunication_test`;
  run('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '--dbname', target], readFileSync(new URL('./setup.sql', import.meta.url), 'utf8'));
  const tested = spawnSync(process.execPath, [new URL('./backend.mjs', import.meta.url).pathname], { stdio: 'inherit', env: { ...process.env, HUMMUNICATION_TEST_DATABASE_URL: target } });
  process.exitCode = tested.status ?? 1;
} finally {
  if (started) run('pg_ctl', ['-D', join(root, 'data'), 'stop', '-m', 'fast']);
  rmSync(root, { recursive: true, force: true });
}
