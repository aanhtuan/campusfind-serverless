import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

// Load the actual TS helpers under Node without application aliases/framework
// compilation. npm typecheck separately checks their types. No hosted calls.
const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const source = readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  module._compile(output.outputText, filename);
};
const { NextRequest, NextResponse } = require('next/server');
const { safeReturnPath, isProtectedPath, getAppOrigin } = require('../src/features/auth/navigation.ts');
const { parseConfirmation, parseCodeCallback } = require('../src/features/auth/callback-validation.ts');
const { createAuthService } = require('../src/features/auth/services.ts');
const { createResponseAdapter } = require('../src/lib/supabase/response-client.ts');
const { updateSession } = require('../src/lib/supabase/proxy.ts');
const { handleAuthCallback } = require('../src/features/auth/callback-handler.ts');
process.env.NEXT_PUBLIC_SITE_URL = 'https://campusfind.example';
const token = 'a'.repeat(64);
const request = path => new NextRequest('https://campusfind.example' + path);
const user = { id: 'verified-user' };
function factory(auth) {
  return req => {
    const adapter = createResponseAdapter(req);
    return { client: { auth }, apply: adapter.apply };
  };
}
function isPrivate(response) {
  assert.match(response.headers.get('cache-control'), /private.*no-store/);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
}

test('safe return destinations preserve local paths/query and remove fragments', () => {
  assert.equal(safeReturnPath('/my-reports?page=2#secret'), '/my-reports?page=2');
  assert.equal(safeReturnPath('/items/abc'), '/items/abc');
  assert.equal(safeReturnPath('/'), '/');
});
test('reject absolute/protocol-relative/control/backslash/encoded/dot-segment redirects', () => {
  for (const path of ['https://evil.example', '//evil.example', '/\\evil.example', '/%2f%2fevil.example', '/%252f%252fevil.example', '/dashboard\n', '/dashboard/../login', '/auth/confirm', '/login', 'javascript:alert(1)', '/dashboard\x00', '/unknown']) {
    assert.equal(safeReturnPath(path), '/dashboard', path);
  }
});
test('protected routes use segment boundaries and keep browsing/landing public', () => {
  for (const path of ['/dashboard', '/dashboard/settings', '/items/new', '/my-reports', '/my-claims/x']) assert.equal(isProtectedPath(path), true);
  for (const path of ['/', '/items', '/items/123', '/items/newly', '/dashboarding', '/login']) assert.equal(isProtectedPath(path), false);
});
test('trusted site origin rejects credentials, external HTTP and paths', () => {
  const saved = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    for (const origin of ['https://user:pass@example.com', 'http://external.example', 'https://example.com/path', 'https://example.com?token=x']) {
      process.env.NEXT_PUBLIC_SITE_URL = origin; assert.throws(getAppOrigin);
    }
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'; assert.equal(getAppOrigin(), 'http://localhost:3000');
  } finally { process.env.NEXT_PUBLIC_SITE_URL = saved; }
});
test('email confirmation accepts only supported types and sanitized destinations', () => {
  assert.deepEqual(parseConfirmation(new URLSearchParams({ token_hash: token, type: 'email', next: '//evil.example' })), { token_hash: token, type: 'email', next: '/dashboard' });
  assert.equal(parseConfirmation(new URLSearchParams({ token_hash: token, type: 'signup' })).type, 'signup');
});
test('confirmation rejects missing/malformed/duplicate/unintended OTP inputs', () => {
  for (const params of ['', `token_hash=${token}&type=recovery`, 'token_hash=short&type=email', `token_hash=${token}&type=email&type=signup`, `token_hash=${token}&token_hash=${token}&type=email`, `token_hash=${token}&type=email&next=/&next=/items`, `token_hash=${token}&type=email&code=${token}`, `token_hash=${token}&type=email&error=failed`]) assert.equal(parseConfirmation(new URLSearchParams(params)), null);
});
test('code callback validation rejects ambiguous/error/token-hash payloads', () => {
  assert.equal(parseCodeCallback(new URLSearchParams({ code: token, next: '/items/new' })).next, '/items/new');
  for (const params of ['', 'code=short', `code=${token}&code=${token}`, `code=${token}&token_hash=${token}`, `code=${token}&error_description=private`, `code=${token}&next=/&next=/items`]) assert.equal(parseCodeCallback(new URLSearchParams(params)), null);
});
test('response adapter updates request cookies and preserves HttpOnly/options/cache on redirects', () => {
  const req = request('/dashboard');
  const adapter = createResponseAdapter(req);
  adapter.cookies.setAll([{ name: 'session', value: 'test-only', options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' } }], { 'Cache-Control': 'private, no-store', Pragma: 'no-cache', Expires: '0' });
  assert.equal(req.cookies.get('session').value, 'test-only');
  const res = adapter.apply(NextResponse.redirect('https://campusfind.example/login'));
  assert.equal(res.cookies.get('session').httpOnly, true);
  assert.equal(res.cookies.get('session').secure, true);
  assert.equal(res.cookies.get('session').sameSite, 'lax');
  isPrivate(res);
});
test('successive cookie batches retain all chunks and deletion updates', () => {
  const adapter = createResponseAdapter(request('/dashboard'));
  adapter.cookies.setAll([{ name: 'session.0', value: 'a', options: { path: '/' } }], { Expires: '0' });
  adapter.cookies.setAll([{ name: 'session.1', value: 'b', options: { path: '/' } }, { name: 'old', value: '', options: { path: '/', maxAge: 0 } }], {});
  const res = adapter.apply(NextResponse.next());
  assert.equal(res.cookies.getAll().length, 3);
  assert.equal(res.cookies.get('old').maxAge, 0);
  assert.equal(res.headers.get('expires'), '0');
});
test('response adapters are request-scoped without shared cookies', () => {
  const first = createResponseAdapter(request('/dashboard')); const second = createResponseAdapter(request('/dashboard'));
  first.cookies.setAll([{ name: 'first', value: 'a', options: {} }], {});
  assert.equal(second.apply(NextResponse.next()).cookies.getAll().length, 0);
});
test('anonymous users redirect with safe return to every protected root', async () => {
  for (const path of ['/dashboard', '/items/new', '/my-reports', '/my-claims']) {
    const res = await updateSession(request(path + '?page=2'), factory({ getUser: async () => ({ data: { user: null }, error: null }) }));
    assert.equal(res.status, 307);
    const destination = new URL(res.headers.get('location'));
    assert.equal(destination.origin, 'https://campusfind.example');
    assert.equal(destination.pathname, '/login');
    assert.equal(destination.searchParams.get('next'), path + '?page=2'); isPrivate(res);
  }
});
test('verified user proceeds; cookie-only session data is never consulted', async () => {
  let called = 0;
  const res = await updateSession(request('/dashboard'), factory({ getUser: async () => { called++; return { data: { user }, error: null }; }, getSession: () => { throw new Error('must not trust cookie session'); } }));
  assert.equal(called, 1); assert.equal(res.status, 200); isPrivate(res);
});
test('expired/error/throwing verification fails closed', async () => {
  for (const getUser of [async () => ({ data: { user }, error: { message: 'private' } }), async () => { throw new Error('private credential'); }]) {
    const res = await updateSession(request('/my-claims'), factory({ getUser })); assert.equal(res.status, 307); assert.ok(!res.headers.get('location').includes('private'));
  }
});
test('proxy passes refreshed cookies to downstream request and browser', async () => {
  const req = request('/dashboard');
  const res = await updateSession(req, req => {
    const adapter = createResponseAdapter(req);
    return { client: { auth: { getUser: async () => {
      adapter.cookies.setAll([{ name: 'refreshed', value: 'test-only', options: { path: '/', httpOnly: true } }], {});
      return { data: { user }, error: null };
    } } }, apply: adapter.apply };
  });
  assert.equal(res.cookies.get('refreshed').value, 'test-only');
  assert.match(res.headers.get('x-middleware-request-cookie'), /refreshed=test-only/);
});
test('failed refresh deletions propagate on the login redirect', async () => {
  const res = await updateSession(request('/dashboard'), req => {
    const adapter = createResponseAdapter(req);
    return { client: { auth: { getUser: async () => {
      adapter.cookies.setAll([{ name: 'expired', value: '', options: { maxAge: 0, path: '/' } }], {});
      return { data: { user: null }, error: {} };
    } } }, apply: adapter.apply };
  });
  assert.equal(res.status, 307); assert.equal(res.cookies.get('expired').maxAge, 0); isPrivate(res);
});
test('public routes survive anonymous/missing config; protected missing config is 503', async () => {
  const missing = () => { throw new Error('config missing'); };
  assert.equal((await updateSession(request('/items'), missing)).status, 200);
  assert.equal((await updateSession(request('/dashboard'), missing)).status, 503);
  assert.equal((await updateSession(request('/items'), factory({ getUser: async () => ({ data: { user: null }, error: null }) }))).status, 200);
});
test('invalid callback never contacts provider and strips all sensitive query values', async () => {
  const res = await handleAuthCallback(request('/auth/confirm?token_hash=short&type=recovery'), 'confirm', () => { throw new Error('must not call'); });
  assert.equal(res.status, 303); assert.ok(!res.headers.get('location').includes('token_hash')); isPrivate(res);
});
test('confirmation verifies OTP AND identity before redirecting, preserving cookies', async () => {
  let verified;
  const res = await handleAuthCallback(request(`/auth/confirm?token_hash=${token}&type=email&next=/my-reports`), 'confirm', req => {
    const adapter = createResponseAdapter(req);
    return { client: { auth: { verifyOtp: async args => { verified = args; adapter.cookies.setAll([{ name: 'confirmed', value: 'test-only', options: { path: '/' } }], {}); return { error: null }; }, getUser: async () => ({ data: { user }, error: null }) } }, apply: adapter.apply };
  });
  assert.deepEqual(verified, { token_hash: token, type: 'email' }); assert.equal(res.headers.get('location'), 'https://campusfind.example/my-reports'); assert.equal(res.cookies.get('confirmed').value, 'test-only'); isPrivate(res);
});
test('provider failure or missing verified identity never grants callback success', async () => {
  for (const auth of [{ verifyOtp: async () => ({ error: { message: token } }) }, { verifyOtp: async () => ({ error: null }), getUser: async () => ({ data: { user: null }, error: null }) }]) {
    const res = await handleAuthCallback(request(`/auth/confirm?token_hash=${token}&type=email`), 'confirm', factory(auth));
    assert.equal(new URL(res.headers.get('location')).pathname, '/login'); assert.ok(!res.headers.get('location').includes(token));
  }
});
test('PKCE code is exchanged and callback uses configured origin over spoofed Host', async () => {
  let received;
  const req = new NextRequest(`https://evil.example/auth/callback?code=${token}&next=//evil.example`);
  const res = await handleAuthCallback(req, 'code', factory({ exchangeCodeForSession: async code => { received = code; return { error: null }; }, getUser: async () => ({ data: { user }, error: null }) }));
  assert.equal(received, token); assert.equal(res.headers.get('location'), 'https://campusfind.example/dashboard');
});
test('signUp excludes user-controlled role/id/metadata and uses trusted email URL', async () => {
  let args;
  const service = createAuthService({ auth: { signUp: async input => { args = input; return { error: null }; } } });
  assert.deepEqual(await service.signUp({ email: ' a@example.invalid ', password: 'test-only', role: 'ADMIN', user_id: 'spoof', options: { data: { role: 'ADMIN' } } }, '//evil.example'), { ok: true });
  assert.deepEqual(Object.keys(args).sort(), ['email', 'options', 'password']);
  assert.equal(args.email, 'a@example.invalid'); assert.equal(args.options.data, undefined);
  const callback = new URL(args.options.emailRedirectTo); assert.equal(callback.origin, 'https://campusfind.example'); assert.equal(callback.pathname, '/auth/callback'); assert.equal(callback.searchParams.get('next'), '/dashboard');
});
test('auth operations hide provider credentials/errors and do not return sessions', async () => {
  const service = createAuthService({ auth: { signInWithPassword: async () => ({ error: { message: token } }), signUp: async () => { throw new Error(token); }, resend: async () => ({ error: { message: token } }) } });
  for (const result of [await service.signInWithPassword({ email: 'x', password: 'test-only' }), await service.signUp({ email: 'x', password: 'test-only' }), await service.resendVerificationEmail('x')]) { assert.equal(result.ok, false); assert.ok(!JSON.stringify(result).includes(token)); }
});
test('signOut uses local scope, resend uses signup and current user is verified remotely', async () => {
  let scope, resend;
  const service = createAuthService({ auth: { signOut: async input => { scope = input; return { error: null }; }, resend: async input => { resend = input; return { error: null }; }, getUser: async () => ({ data: { user }, error: null }), getSession: () => { throw new Error('not allowed'); } } });
  assert.deepEqual(await service.signOut(), { ok: true }); assert.deepEqual(scope, { scope: 'local' });
  assert.deepEqual(await service.resendVerificationEmail(' a@example.invalid ', '/my-claims'), { ok: true }); assert.equal(resend.type, 'signup'); assert.equal(resend.email, 'a@example.invalid');
  assert.equal(await service.getCurrentUser(), user);
});

test('invalid trusted-origin configuration fails closed without redirecting externally', async () => {
  const saved = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://user:password@evil.example';
    const proxy = await updateSession(request('/dashboard'), factory({ getUser: async () => ({ data: { user: null }, error: null }) }));
    assert.equal(proxy.status, 503); isPrivate(proxy);
    const callback = await handleAuthCallback(request('/auth/confirm'), 'confirm');
    assert.equal(callback.status, 503); isPrivate(callback);
  } finally { process.env.NEXT_PUBLIC_SITE_URL = saved; }
});

const { loginSchema, registerSchema, displayNameSchema } = require('../src/features/auth/validation.ts');
const { initializeProfileName } = require('../src/features/auth/profile.ts');
test('registration validates email, trimmed name, password bounds and confirmation', () => {
  const input = { email: ' test@example.invalid ', displayName: ' Campus Test ', password: 'test-only-passphrase', confirmPassword: 'test-only-passphrase' };
  assert.equal(registerSchema.parse(input).displayName, 'Campus Test');
  for (const override of [{ email: 'invalid' }, { displayName: ' ' }, { displayName: 'x'.repeat(101) }, { password: 'short' }, { password: 'x'.repeat(129) }, { confirmPassword: 'different' }]) assert.equal(registerSchema.safeParse({ ...input, ...override }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'test@example.invalid', password: '' }).success, false);
});
test('signup forwards only a validated display name and cannot forward ADMIN metadata', async () => {
  let input;
  const service = createAuthService({ auth: { signUp: async args => { input = args; return { error: null }; } } });
  await service.signUp({ email: 'test@example.invalid', password: 'test-only-passphrase', displayName: ' Campus Test ', role: 'ADMIN', data: { role: 'ADMIN' } });
  assert.deepEqual(input.options.data, { display_name: 'Campus Test' });
  input = undefined;
  assert.equal((await service.signUp({ email: 'test@example.invalid', password: 'test-only', displayName: ' ' })).ok, false);
  assert.equal(input, undefined);
});
test('profile name initializes only verified identity and only when existing name is null', async () => {
  const calls = [];
  const client = { from: table => { calls.push(table); return { update: values => { calls.push(values); return { eq: (column, id) => { calls.push([column, id]); return { is: async (column, value) => { calls.push([column, value]); return { error: null }; } }; } }; } }; } };
  await initializeProfileName(client, { id: 'verified', user_metadata: { display_name: ' Test ', role: 'ADMIN', id: 'spoof' } });
  assert.deepEqual(calls, ['profiles', { display_name: 'Test' }, ['id', 'verified'], ['display_name', null]]);
  calls.length = 0;
  await initializeProfileName(client, { id: 'verified', user_metadata: { display_name: ' ' } });
  assert.equal(calls.length, 0);
  assert.equal(displayNameSchema.safeParse(undefined).success, false);
});

const { createSessionMonitor } = require('../src/features/auth/session-monitor.ts');
function monitorFixture(verify) {
  const events = [];
  const monitor = createSessionMonitor({ expectedUserId: 'user-a', verify, onPending: () => events.push('hidden'), onVerified: () => events.push('visible'), onSignedOut: () => events.push('login'), onIdentityChanged: () => events.push('reload') });
  return { monitor, events };
}
test('protected UI verifies identity before displaying data and rejects changed account', async () => {
  const current = monitorFixture(async () => 'user-a');
  await current.monitor.check(); assert.deepEqual(current.events, ['hidden', 'visible']);
  const changed = monitorFixture(async () => 'user-b');
  await changed.monitor.check(); assert.deepEqual(changed.events, ['hidden', 'reload']);
});
test('cross-tab SIGNED_OUT immediately hides stale data and discards pending success', async () => {
  let complete;
  const fixture = monitorFixture(() => new Promise(resolve => { complete = resolve; }));
  const pending = fixture.monitor.check(); fixture.monitor.event('SIGNED_OUT'); complete('user-a'); await pending;
  assert.deepEqual(fixture.events, ['hidden', 'hidden', 'login']);
});
test('session verification exceptions fail closed and disposal ignores pending responses', async () => {
  const error = monitorFixture(async () => { throw new Error('provider failure'); });
  await error.monitor.check(); assert.deepEqual(error.events, ['hidden', 'login']);
  let complete;
  const fixture = monitorFixture(() => new Promise(resolve => { complete = resolve; }));
  const pending = fixture.monitor.check(); fixture.monitor.dispose(); complete('user-a'); await pending;
  assert.deepEqual(fixture.events, ['hidden']);
});
test('back/focus suspension hides data and late checks cannot restore an obsolete identity', async () => {
  const resolvers = [];
  const fixture = monitorFixture(() => new Promise(resolve => resolvers.push(resolve)));
  const first = fixture.monitor.check(); fixture.monitor.suspend(); const second = fixture.monitor.check();
  resolvers[1](null); await second; resolvers[0]('user-a'); await first;
  assert.deepEqual(fixture.events, ['hidden', 'hidden', 'hidden', 'login']);
});
test('SIGNED_IN schedules verification outside callback and cleanup cancels it', async () => {
  let calls = 0;
  const fixture = monitorFixture(async () => { calls++; return 'user-a'; });
  fixture.monitor.event('SIGNED_IN'); assert.equal(calls, 0);
  await new Promise(resolve => setTimeout(resolve, 10)); assert.equal(calls, 1);
  fixture.monitor.event('SIGNED_IN'); fixture.monitor.dispose();
  await new Promise(resolve => setTimeout(resolve, 10)); assert.equal(calls, 1);
});
