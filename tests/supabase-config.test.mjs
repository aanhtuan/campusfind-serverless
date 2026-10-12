import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePublicSupabaseConfig } from '../src/lib/supabase/config.ts';
const valid = { NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' };
test('missing configuration fails without leaking values', () => {
  for (const env of [{}, { NEXT_PUBLIC_SUPABASE_URL: valid.NEXT_PUBLIC_SUPABASE_URL }, { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: valid.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }]) {
    assert.throws(() => parsePublicSupabaseConfig(env), /Set NEXT_PUBLIC_SUPABASE/);
  }
});
test('public configuration accepts cloud HTTPS and local HTTP', () => {
  assert.equal(parsePublicSupabaseConfig(valid).url, valid.NEXT_PUBLIC_SUPABASE_URL);
  assert.equal(parsePublicSupabaseConfig({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321/' }).url, 'http://127.0.0.1:54321');
});
test('invalid, insecure and credential-bearing origins fail', () => {
  for (const url of ['invalid', 'http://example.supabase.co', 'https://user:password@example.supabase.co', 'https://example.supabase.co/rest/v1', 'https://example.supabase.co?token=secret', 'https://example.supabase.co#secret', 'https://your-project-ref.supabase.co']) {
    assert.throws(() => parsePublicSupabaseConfig({ ...valid, NEXT_PUBLIC_SUPABASE_URL: url }));
  }
});
test('secret, legacy JWT and placeholder keys are rejected without echoing keys', () => {
  for (const key of ['sb_secret_sensitive', 'eyJhbGciOiJIUzI1NiJ9.secret', 'your-supabase-publishable-key', 'sb_publishable_REPLACE_ME']) {
    assert.throws(() => parsePublicSupabaseConfig({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }), error => !error.message.includes(key));
  }
});

test('connectivity command rejects missing configuration before HTTP', async () => {
  const { spawnSync } = await import('node:child_process');
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const cwd = mkdtempSync(join(tmpdir(), 'campusfind-config-'));
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_SUPABASE_URL;
  delete env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    const run = spawnSync(process.execPath, ['--experimental-strip-types', fileURLToPath(new URL('../scripts/check-supabase-cloud.mjs', import.meta.url)), '--confirm-development-project'], { cwd, env, encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
