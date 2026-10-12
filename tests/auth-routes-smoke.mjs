import assert from 'node:assert/strict';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd(), true);
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3100');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Smoke test only permits localhost');
const expectedOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').origin;
async function read(path) {
  return fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
}
for (const path of ['/dashboard', '/items/new', '/my-reports', '/my-claims', '/dashboard/settings']) {
  const response = await read(path + '?page=2');
  assert.equal(response.status, 307, path);
  const destination = new URL(response.headers.get('location'), base);
  assert.equal(destination.origin, expectedOrigin);
  assert.equal(destination.pathname, '/login');
  assert.equal(destination.searchParams.get('next'), path + '?page=2');
  assert.match(response.headers.get('cache-control'), /private.*no-store/);
  console.log(`PASS: anonymous local ${path} protected`);
}
for (const path of ['/', '/login']) {
  const response = await read(path);
  assert.equal(response.status, 200, path);
  console.log(`PASS: local ${path} accessible`);
}
const browse = await read('/items');
assert.ok([200, 404].includes(browse.status)); // Browsing UI is not implemented.
assert.equal(browse.headers.get('location'), null);
console.log('PASS: /items is not auth-redirected (browsing UI remains unimplemented)');
for (const path of ['/auth/confirm?token_hash=short&type=recovery', '/auth/callback?code=short']) {
  const response = await read(path);
  assert.equal(response.status, 303);
  const destination = new URL(response.headers.get('location'), base);
  assert.equal(destination.pathname, '/login');
  assert.equal(destination.origin, expectedOrigin);
  assert.ok(!response.headers.get('location').includes('short'));
  assert.match(response.headers.get('cache-control'), /private.*no-store/);
  console.log('PASS: malformed local callback rejected without credentials in redirect');
}
for (const [path, heading] of [['/login', 'Welcome back'], ['/register', 'Create your account'], ['/verify-email', 'Verify your email']]) {
  const response = await read(path + '?next=https://external.example');
  assert.equal(response.status, 200);
  // Dev may replace the proxy header with no-store, which also forbids caching.
  assert.match(response.headers.get('cache-control'), /(?:^|,)\s*no-store(?:,|$)/);
  const html = await response.text();
  assert.ok(html.includes(heading));
  assert.ok(!/href="https:\/\/external\.example/.test(html));
  assert.ok(html.includes('next=%2Fdashboard'));
  console.log(`PASS: ${path} renders anonymous UI with safe links and no-store cache headers`);
}
console.log('NOT RUN: hosted Auth/session/email HTTP flows; these localhost GET requests have no Auth session');
