import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import { getPublicSupabaseConfig } from '../src/lib/supabase/config.ts';
nextEnv.loadEnvConfig(process.cwd(), true);
const { url, publishableKey } = getPublicSupabaseConfig();
const projectRef = process.argv[2];
assert.ok(projectRef && new URL(url).hostname === `${projectRef}.supabase.co`, 'Supply the approved development project ref explicitly');
for (const [name, authorization, path] of [
  ['Missing JWT cannot read private profiles', null, '/rest/v1/profiles?select=id&limit=1'],
  ['Invalid JWT cannot read private profiles', 'Bearer invalid-test-fixture', '/rest/v1/profiles?select=id&limit=1'],
  ['Invalid JWT cannot verify identity', 'Bearer invalid-test-fixture', '/auth/v1/user'],
]) {
  const headers = { apikey: publishableKey };
  if (authorization) headers.Authorization = authorization;
  const response = await fetch(new URL(path, url), { headers, signal: AbortSignal.timeout(15000) });
  assert.ok([401, 403].includes(response.status), `${name}: expected denial, got HTTP ${response.status}`);
  console.log(`PASS: ${name} (HTTP ${response.status})`);
}
console.log('Read-only hosted public-key HTTP checks; no credentials, accounts or data mutations.');
