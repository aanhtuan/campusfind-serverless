import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { getPublicSupabaseConfig } from '../src/lib/supabase/config.ts';

nextEnv.loadEnvConfig(process.cwd(), true);
let failed = false;
function result(name, pass) {
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`);
  if (!pass) failed = true;
}
try {
  const { url, publishableKey } = getPublicSupabaseConfig();
  if (!process.argv.includes('--confirm-development-project')) {
    throw new Error('Confirm that .env.local targets campusfind-dev with --confirm-development-project.');
  }
  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
  });
  const read = await client.from('items').select('id,status').limit(5);
  result('Cloud Data API and anonymous items SELECT', !read.error && Array.isArray(read.data));
  if (read.error) console.log(`Data API error code: ${read.error.code ?? 'unavailable'}`);
  if (!read.error) {
    result('Returned items respect public status visibility', read.data.every(row => ['OPEN', 'IN_PROGRESS'].includes(row.status)));
    if (!read.data.length) console.log('NOT RUN: nonempty public/private fixture visibility (items result is empty)');
  }
  for (const table of ['profiles', 'item_images', 'claims']) {
    const readPrivate = await client.from(table).select('id').limit(1);
    result(`Anonymous ${table} SELECT denied by grants`, readPrivate.error?.code === '42501');
  }
  // Required NOT NULL fields deliberately null: even if grants regress, these
  // probes cannot create rows. Only privilege denial counts as PASS.
  const probes = {
    profiles: { id: null },
    items: { reporter_id: null, type: 'LOST', title: 'Connectivity probe', category: 'test', location: 'test', event_date: '2026-01-01' },
    item_images: { item_id: null, storage_path: 'invalid' },
    claims: { item_id: null, claimant_id: null, proof_text: null },
  };
  for (const [table, row] of Object.entries(probes)) {
    const write = await client.from(table).insert(row);
    result(`Anonymous ${table} INSERT denied by grants`, write.error?.code === '42501');
  }
  console.log('NOT RUN: authenticated RLS, Auth/Storage HTTP end-to-end, hosted metadata verification');
  process.exitCode = failed ? 1 : 0;
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : 'Connectivity check failed'}`);
  process.exitCode = 1;
}
