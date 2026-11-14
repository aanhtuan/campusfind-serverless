import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { parseWorkflowRequest, actionFields, campusLocations } = require('../supabase/functions/_shared/validation.ts');
const ID = '10000000-0000-4000-8000-000000000001';
const REQUEST = '10000000-0000-4000-8000-000000000002';
const now = Date.parse('2026-11-05T00:00:00Z');
const submit = { action: 'submit_claim', data: { item_id: ID, request_id: REQUEST, proof_text: ' Unique identifying ownership evidence ' } };
test('claim validation normalizes private evidence and retains stable idempotency key', () => {
  assert.deepEqual(parseWorkflowRequest(submit), { ...submit, data: { ...submit.data, proof_text: submit.data.proof_text.trim() } });
});
test('every operation rejects actor, role, status and unknown fields', () => {
  for (const action of Object.keys(actionFields)) for (const field of ['actor_id', 'reporter_id', 'claimant_id', 'role', 'status']) assert.throws(() => parseWorkflowRequest({ action, data: { [field]: ID } }), /fields/);
});
test('prototype names, arrays, missing fields and null input are rejected', () => {
  for (const value of [null, [], {}, { action: '__proto__', data: {} }, { action: 'constructor', data: {} }, { ...submit, extra: 1 }, { action: 'submit_claim', data: [] }, { action: 'cancel_claim', data: {} }]) assert.throws(() => parseWorkflowRequest(value));
});
test('evidence bounds and record IDs fail before any transport call', () => {
  for (const proof_text of ['', 'x'.repeat(19), 'x'.repeat(5001), null]) assert.throws(() => parseWorkflowRequest({ ...submit, data: { ...submit.data, proof_text } }));
  for (const item_id of ['../claims', ID + '?select=*', null, 1]) assert.throws(() => parseWorkflowRequest({ ...submit, data: { ...submit.data, item_id } }));
});
test('review accepts only existing terminal decisions', () => {
  for (const decision of ['APPROVED', 'REJECTED']) assert.equal(parseWorkflowRequest({ action: 'review_claim', data: { claim_id: ID, decision } }).data.decision, decision);
  for (const decision of ['PENDING', 'CANCELLED', 'RESOLVED', 'ADMIN']) assert.throws(() => parseWorkflowRequest({ action: 'review_claim', data: { claim_id: ID, decision } }));
});
test('handover requires approved campus meeting point, explicit zone and bounded future time', () => {
  const proposal = { action: 'propose_handover', data: { claim_id: ID, revision: 0, location: campusLocations[0], meeting_at: '2026-11-06T10:00:00+07:00' } };
  assert.equal(parseWorkflowRequest(proposal, now).data.location, campusLocations[0]);
  for (const invalid of [{ location: 'Private apartment' }, { meeting_at: '2026-11-06T10:00' }, { meeting_at: '2026-11-04T10:00:00Z' }, { meeting_at: '2027-12-01T10:00:00Z' }, { revision: -1 }, { revision: '1' }, { revision: 1.5 }]) assert.throws(() => parseWorkflowRequest({ ...proposal, data: { ...proposal.data, ...invalid } }, now));
});
test('contact needs explicit consent and valid chosen value; account identity is never a field', () => {
  const request = { action: 'share_contact', data: { claim_id: ID, consent: true, kind: 'EMAIL', value: ' member@example.invalid ' } };
  assert.equal(parseWorkflowRequest(request).data.value, 'member@example.invalid');
  for (const invalid of [{ consent: false }, { consent: 'true' }, { value: 'x\ny@example.invalid' }, { kind: 'PHONE', value: 'abc123' }, { kind: 'ACCOUNT_EMAIL' }, { value: 'x'.repeat(255) }]) assert.throws(() => parseWorkflowRequest({ ...request, data: { ...request.data, ...invalid } }));
  assert.equal(parseWorkflowRequest({ ...request, data: { ...request.data, kind: 'PHONE', value: '+84 123 456 789' } }).data.kind, 'PHONE');
});
test('operational issue accepts structured categories only, not private narrative', () => {
  assert.equal(parseWorkflowRequest({ action: 'open_issue', data: { claim_id: ID, category: 'MISSED_MEETING' } }).action, 'open_issue');
  assert.throws(() => parseWorkflowRequest({ action: 'open_issue', data: { claim_id: ID, category: 'My private proof' } }));
  assert.throws(() => parseWorkflowRequest({ action: 'open_issue', data: { claim_id: ID, category: 'SAFETY_CONCERN', evidence: 'private' } }));
});
const { runWorkflow, listClaims, getClaim, claimCoordination } = require('../src/features/workflow/services.ts');
const { createClient } = require('@supabase/supabase-js');
function queryFixture(response = [], status = 200) {
  const calls = [];
  const client = createClient('http://127.0.0.1:9999', 'sb_publishable_offline_fixture', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, options) => {
    calls.push({ url: new URL(String(input)), options });
    return new Response(JSON.stringify(response), { status, headers: { 'content-type': 'application/json' } });
  } } });
  return { client, calls };
}
test('My claims and Incoming claims constrain verified participant and bounded pagination', async () => {
  for (const incoming of [false, true]) {
    const { client, calls } = queryFixture(Array(21).fill({ id: ID }));
    const result = await listClaims(client, ID, incoming, 2);
    const parameters = calls[0].url.searchParams;
    assert.equal(parameters.get(incoming ? 'items.reporter_id' : 'claimant_id'), 'eq.' + ID);
    assert.equal(parameters.get('offset'), '20'); assert.equal(parameters.get('limit'), '21');
    assert.equal(parameters.get('order'), 'created_at.desc,id.desc');
    assert.equal(result.claims.length, 20); assert.equal(result.hasNext, true);
  }
});
test('claim detail rejects invalid UUID without transport, treats hidden claims as absent', async () => {
  const { client, calls } = queryFixture();
  assert.equal(await getClaim(client, '../claims'), null); assert.equal(calls.length, 0);
  assert.equal(await getClaim(client, ID), null); assert.equal(calls[0].url.searchParams.get('id'), 'eq.' + ID);
});
test('coordination scopes all three private queries to the claim and sanitizes database failures', async () => {
  const { client, calls } = queryFixture();
  await claimCoordination(client, ID);
  assert.equal(calls.length, 3);
  for (const call of calls) assert.equal(call.url.searchParams.get('claim_id'), 'eq.' + ID);
  const failed = queryFixture({ message: 'private provider diagnostic' }, 500);
  await assert.rejects(claimCoordination(failed.client, ID), /could not be loaded/);
});
test('workflow client checks verified session and sends only validated allowlisted body', async () => {
  let invoked;
  const client = { auth: { getUser: async () => ({ data: { user: { id: ID } } }) }, functions: { invoke: async (name, options) => { invoked = { name, options }; return { data: { id: REQUEST } }; } } };
  assert.equal(await runWorkflow(client, submit), REQUEST);
  assert.equal(invoked.name, 'workflow'); assert.deepEqual(invoked.options.body, parseWorkflowRequest(submit));
  invoked = null;
  client.auth.getUser = async () => ({ data: { user: null }, error: new Error('private') });
  await assert.rejects(runWorkflow(client, submit), /session/); assert.equal(invoked, null);
});
test('invalid workflow input never reaches authentication or function transport', async () => {
  const client = { auth: { getUser: () => { throw new Error('should not run'); } } };
  await assert.rejects(runWorkflow(client, { action: 'review_claim', data: { claim_id: ID, decision: 'RESOLVED' } }), /Choose approve/);
});
test('ambiguous function failure is not automatically retried and does not leak provider details', async () => {
  let calls = 0;
  const client = { auth: { getUser: async () => ({ data: { user: { id: ID } } }) }, functions: { invoke: async () => { calls++; return { error: new Error('private provider diagnostic') }; } } };
  await assert.rejects(runWorkflow(client, submit), error => /Reload your records/.test(error.message) && !error.message.includes('private provider'));
  assert.equal(calls, 1);
});

test('LOST response and owner evidence are bounded, private, actor-free operations', () => {
  for (const action of ['submit_found_response', 'submit_owner_proof']) {
    const data = action === 'submit_found_response' ? { item_id: ID, request_id: REQUEST, proof_text: ' Private details on held object ' } : { claim_id: ID, proof_text: ' Private owner identifying detail ' };
    assert.equal(parseWorkflowRequest({action, data}).data.proof_text, data.proof_text.trim());
    for (const proof_text of ['short', 'x'.repeat(5001), null]) assert.throws(() => parseWorkflowRequest({ action, data: { ...data, proof_text } }));
    assert.throws(() => parseWorkflowRequest({ action, data: { ...data, ownership_verified_at: 'now' } }));
  }
  for (const decision of ['APPROVED', 'REJECTED']) assert.equal(parseWorkflowRequest({ action: 'verify_owner', data: { claim_id: ID, decision } }).data.decision, decision);
  assert.throws(() => parseWorkflowRequest({ action: 'verify_owner', data: { claim_id: ID, decision: 'RESOLVED' } }));
});
const { participants } = require('../src/features/workflow/participants.ts');
test('custody roles reverse for LOST without changing stable record identities', () => {
  const claim = { claimant_id: REQUEST, items: { reporter_id: ID, type: 'FOUND' }, ownership_verified_at: null };
  assert.deepEqual(participants(claim), { lost: false, holderId: ID, ownerId: REQUEST, verified: true });
  claim.items.type = 'LOST';
  assert.deepEqual(participants(claim), { lost: true, holderId: REQUEST, ownerId: ID, verified: false });
  claim.ownership_verified_at = '2026-11-09T00:00:00Z';
  assert.equal(participants(claim).verified, true);
});
