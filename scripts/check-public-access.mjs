// Usage: node scripts/check-public-access.mjs http://127.0.0.1:3011
import assert from 'node:assert/strict';

const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:3011').origin;
const get = path => fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
const root = await get('/');
assert.ok([307, 308].includes(root.status), `Root returned ${root.status}, expected a redirect`);
assert.equal(new URL(root.headers.get('location'), origin).pathname, '/home');

for (const path of ['/home', '/weekly?step=1', '/weekly?step=2&view=sermon-preview', '/weekly?step=3', '/bulletins?date=2026-11-01']) {
  const response = await get(path);
  assert.equal(response.status, 200, `Anonymous ${path} returned ${response.status}`);
  assert.equal(response.headers.get('location'), null, `${path} redirected unexpectedly`);
}
for (const path of ['/protected', '/home-private', '/weekly/private']) {
  const response = await get(path);
  assert.ok([307, 308].includes(response.status), `${path} no longer requires authentication`);
  assert.equal(new URL(response.headers.get('location'), origin).pathname, '/auth/login');
}
assert.equal((await get('/auth/login')).status, 200);
console.log('PASS: anonymous root/home/weekly/bulletin access, exact public paths, protected route and login page');
