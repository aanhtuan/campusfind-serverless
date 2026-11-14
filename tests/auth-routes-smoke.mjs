import assert from 'node:assert/strict';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd(), true);
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3100');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Smoke test only permits localhost');
const expectedOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').origin;
async function read(path) {
  return fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
}
for (const path of ['/dashboard', '/items/new', '/my-reports', '/my-claims', '/dashboard/settings', '/claims/new', '/incoming-claims', '/admin']) {
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
assert.equal(browse.status, 200);
assert.equal(browse.headers.get('location'), null);
console.log('PASS: /items browsing is accessible without authentication');
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
for (const [path, heading] of [['/login', 'Chào mừng quay lại'], ['/register', 'Tạo tài khoản'], ['/verify-email', 'Xác minh email']]) {
  const response = await read(path + '?next=https://external.example');
  assert.equal(response.status, 200);
  // Dev may replace the proxy header with no-store, which also forbids caching.
  assert.match(response.headers.get('cache-control'), /(?:^|,)\s*no-store(?:,|$)/);
  const html = await response.text();
  assert.ok(html.includes(heading));
  assert.ok(!/href="https:\/\/external\.example/.test(html));
  assert.ok(html.includes('next=%2Fdashboard'));
  // Fetch observes the pre-hydration HTML. A blocked JS bundle must never
  // allow a native GET form submission containing credentials in the URL.
  assert.match(html, /<form\b[^>]*method="post"/i);
  assert.match(html, /<button\b(?=[^>]*type="submit")(?=[^>]*disabled)[^>]*>/i);
  assert.match(html, /<input\b(?=[^>]*name="email")(?=[^>]*disabled)[^>]*>/i);
  const fields = path === '/register' ? ['displayName', 'email', 'password', 'confirmPassword'] : path === '/login' ? ['email', 'password'] : ['email'];
  for (const field of fields) {
    assert.match(html, new RegExp(`<input\\b(?=[^>]*name="${field}")(?=[^>]*disabled)[^>]*>`, 'i'), `${path}: ${field} must be disabled without hydration`);
  }
  assert.doesNotMatch(html, /\bformmethod\s*=\s*["']?get\b/i, 'No submit control may override the POST fallback with GET');
  console.log(`PASS: ${path} renders anonymous UI with safe links and no-store cache headers`);
}
const approvedProject = process.argv[3];
if (approvedProject) {
  assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, `${approvedProject}.supabase.co`, 'Explicit approved Cloud project must match local configuration');
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  // Entirely synthetic expired claims and an invalid signature. This never
  // reads or revokes a real browser session, JWT or refresh token.
  const access = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: '00000000-0000-4000-8000-000000000001', role: 'authenticated', exp: 1 })}.${Buffer.alloc(32).toString('base64url')}`;
  const session = { access_token: access, refresh_token: '000000000000', expires_at: 1, expires_in: 3600, token_type: 'bearer', user: { id: '00000000-0000-4000-8000-000000000001' } };
  const cookieName = `sb-${approvedProject}-auth-token`;
  const response = await fetch(new URL('/dashboard', base), {
    headers: { Cookie: `${cookieName}=base64-${encode(session)}` },
    redirect: 'manual', signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 307, 'Synthetic expired session with invalid refresh must fail closed');
  const destination = new URL(response.headers.get('location'), base);
  assert.equal(destination.pathname, '/login');
  assert.equal(destination.origin, expectedOrigin);
  assert.match(response.headers.get('cache-control'), /private.*no-store/);
  const deletions = response.headers.getSetCookie();
  assert.ok(deletions.some(value => value.startsWith(`${cookieName}=`) && /max-age=0/i.test(value)), 'Failed refresh must propagate the session-cookie deletion to the redirect');
  console.log('PASS: synthetic expired cookie + nonexistent refresh token rejected; private Login redirect carries cookie deletion');
}
console.log('NOT RUN by this script: valid authenticated sessions, natural JWT expiration or email delivery. Synthetic rejection is narrower evidence.');
