// Usage: node scripts/check-public-access.mjs http://127.0.0.1:3011
// Auth screens are public; every workspace screen requires a verified session.
import assert from 'node:assert/strict';

const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:3011').origin;
const get = path => fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
for (const path of ['/', '/home', '/weekly?step=1', '/weekly?step=2&view=sermon-preview', '/weekly?step=3', '/bulletins?date=2035-01-07', '/protected', '/home-private', '/weekly/private', '/auth/private']) {
  const response = await get(path);
  assert.ok([307, 308].includes(response.status), `${path} no longer requires authentication`);
  const target = new URL(response.headers.get('location'), origin);
  assert.equal(target.pathname, '/auth/login');
  assert.equal(target.searchParams.get('reason'), 'required');
  if (path.startsWith('/weekly?')) assert.equal(target.searchParams.get('next'), path);
}
for (const path of ['/auth/login', '/auth/forgot-password', '/auth/update-password', '/auth/error']) assert.equal((await get(path)).status, 200, path);
const cron = await get('/api/cron/photos');
assert.equal(cron.status, 401);
assert.equal((await cron.json()).error.code, 'UNAUTHORIZED');
const api = await get('/api/private');
assert.equal(api.status, 401);
assert.equal((await api.json()).error.code, 'UNAUTHORIZED');
assert.equal((await get('/fonts/suit/SUIT-Variable.woff2')).status, 200, 'Static fonts must stay available on the login page');
console.log('PASS: every workspace page requires login, safe return URLs, public auth screens, typed missing-token API errors and static font access');
