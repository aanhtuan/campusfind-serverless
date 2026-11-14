import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import { getPublicSupabaseConfig } from '../src/lib/supabase/config.ts';
nextEnv.loadEnvConfig(process.cwd(), true);
const { url, publishableKey } = getPublicSupabaseConfig();
const projectRef = process.argv[2];
assert.ok(projectRef && new URL(url).hostname === `${projectRef}.supabase.co`, 'Supply the approved development project ref explicitly');
// Public synthetic claims with a deliberately invalid signature. No real JWT.
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const forgedJwt = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role: 'authenticated', sub: '00000000-0000-4000-8000-000000000001', exp: Math.floor(Date.now() / 1000) + 60 })}.${Buffer.alloc(32).toString('base64url')}`;
for (const [name, authorization, path] of [
  ['Missing JWT cannot read private profiles', null, '/rest/v1/profiles?select=id&limit=1'],
  ['Missing JWT cannot verify identity', null, '/auth/v1/user'],
  ['Invalid JWT cannot read private profiles', 'Bearer invalid-test-fixture', '/rest/v1/profiles?select=id&limit=1'],
  ['Forged JWT cannot read private profiles', `Bearer ${forgedJwt}`, '/rest/v1/profiles?select=id&limit=1'],
  ['Invalid JWT cannot verify identity', 'Bearer invalid-test-fixture', '/auth/v1/user'],
]) {
  const headers = { apikey: publishableKey };
  if (authorization) headers.Authorization = authorization;
  const response = await fetch(new URL(path, url), { headers, signal: AbortSignal.timeout(15000) });
  assert.ok([401, 403].includes(response.status), `${name}: expected denial, got HTTP ${response.status}`);
  console.log(`PASS: ${name} (HTTP ${response.status})`);
}
// One invalid refresh attempt. Does not create or revoke any real session.
const refresh = await fetch(new URL('/auth/v1/token?grant_type=refresh_token', url), {
  method: 'POST',
  headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token: '000000000000' }),
  signal: AbortSignal.timeout(15000),
});
const refreshBody = await refresh.json();
assert.equal(refresh.status, 400, 'Invalid refresh token must be rejected');
// GoTrue HTTP uses error_code; SDK AuthApiError normalizes that field to code.
assert.equal(refreshBody.error_code, 'refresh_token_not_found', 'Must be an invalid-session rejection, not a rate limit or configuration failure');
assert.ok(!refreshBody.access_token && !refreshBody.refresh_token, 'No session issued');
console.log('PASS: invalid refresh token rejected; no session issued (HTTP 400)');
console.log('Hosted public-key checks; no real credentials, account creation, email, data mutations or session revocation. Invalid refresh rejection does not prove revoked-session handling.');
