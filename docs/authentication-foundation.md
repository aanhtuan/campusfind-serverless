# Task 03B-1 — Supabase authentication foundation

Date: 13 October 2026. Task branch: feat/authentication. Base: origin/main at 6bc4fbc (Task 03A PR #4 integrated). Origin/develop remains eight commits behind main and is not synchronized. The older feature/auth branch and the separate main checkout's next.config.ts modification are preserved.

## Scope and architecture

This task implements authentication infrastructure only. Browser/server clients use the public publishable key and the installed @supabase/ssr 0.12.7, supabase-js 2.117.3 and Next.js 16.4.0. Existing database migrations, RLS and the Auth profile trigger are unchanged. There are no privileged keys, profile inserts/role updates, Reporting/Search/Claims workflows or Edge Functions here.

- `src/lib/supabase/client.ts`: existing browser client, preserved. It uses SSR cookie/PKCE storage.
- `server.ts`: new client per render, awaits cookies(). Default render adapter reads cookies; proxy owns response writes. Auth mutations must not use this read-only adapter.
- `response-client.ts`: new request client and response adapter per invocation. SDK setAll updates request cookies so downstream components see refreshed values. Pending cookie chunks/deletions and SDK cache headers are accumulated and copied onto the final response, including redirects. No earlier/stale response is returned.
- `src/proxy.ts` and `lib/supabase/proxy.ts`: Next.js 16 proxy integration. getUser() verifies against Supabase Auth and triggers SSR refresh when necessary. It does not authorize from getSession(), parsed JWT data, request user IDs or metadata. Verification errors fail closed on protected routes.
- `src/features/auth/services.ts`: client-injected signUp, signInWithPassword, signOut (local scope), getCurrentUser and resendVerificationEmail. It forwards only email/password and approved redirect options. It does not return session tokens or provider error details. Signup/resend do not reveal returned users, and UI must use neutral verification messaging. Config/provider failures produce generic messages, without logs.
- `features/auth/server.ts`: server-only getCurrentUser and requireUser for Server Components. requireUser independently verifies identity even when a proxy check has occurred. Do not use this helper with a caller-supplied return destination without the same safe-return validation.
- `callback-validation.ts` and `callback-handler.ts`: strict callback parameter validation followed by actual SDK verification/exchange and getUser identity check. No token/code is trusted merely because it is well-formed.

The main landing page remains static and does not require Auth configuration. No server client, response adapter or user is shared between requests. Proxy matches the four protected groups, items browsing paths, login and auth callbacks; it deliberately does not process every static asset or landing request. Extend this allowlist and add server checks when later modules expose authenticated routes.

## Routes and safe navigation

Protected roots: `/dashboard`, `/items/new`, `/my-reports`, `/my-claims`, including descendants. Anonymous/error sessions receive 307 redirects to configured `/login?next=<safe-local-path>`. Protected pages also call requireUser and are force-dynamic. They are title-only shells with no business data. `/login` is a minimal placeholder, not a functional form; `/items` remains public but its browsing UI is not implemented.

Safe return paths are restricted to landing, items and the protected groups. Absolute/protocol-relative URLs, backslashes, control characters, encoded path delimiters, dot segments and login/auth destinations are rejected in favor of `/dashboard`. Fragments are removed. Route matching uses segment boundaries. Request Host/X-Forwarded-Host are never used to choose auth redirect or email origins. All failures strip original callback credentials from redirect URLs.

Set `NEXT_PUBLIC_SITE_URL` to a trusted origin, without path/query/credentials; HTTPS outside HTTP localhost. The value is public, not a secret. Development defaults to localhost:3000; production requires explicit configuration. Public env changes require restart/rebuild. In this worktree only the missing site-origin line was appended to ignored .env.local; its existing public Supabase configuration was retained. Missing Supabase configuration fails protected proxy requests with 503, while public paths remain accessible. Missing/invalid trusted-origin config fails redirects/callbacks with 503, not an external fallback.

## Cookies, verification and caching

Adapter preserves cookie options, including HttpOnly if supplied. Secure is used for HTTPS requests and SameSite=Lax permits email-link navigation. @supabase/ssr's default cookie configuration has HttpOnly=false because its browser client needs to read/write session cookies. Forcing HttpOnly globally would break this mixed browser/server integration. A future exclusively server-mediated/BFF flow could choose a different model after review; this task does not claim browser cookies are HttpOnly. Avoid XSS through normal React escaping and review rich-content rendering/security headers when adding UI.

Auth-sensitive proxy/callback responses explicitly set Cache-Control private/no-store, Pragma no-cache, Expires 0 and Referrer-Policy no-referrer. All SDK cookie chunks, expiration/deletion options and cache headers survive redirects. Protected pages, login and callbacks are dynamic. Do not wrap verified-user/session reads in global caches, use ISR on authenticated pages, or cache Set-Cookie responses in a CDN. User data access still needs database RLS; route guards are not object authorization.

getUser() is used for fresh verified Auth identity rather than solely trusting locally verified JWT claims; this costs an Auth request when a session exists. Expired refresh failures can clear cookies through SDK setAll; those deletions propagate on redirects. Provider/network failures are treated as unauthenticated. The default read-only render client follows the proxy model; a token expiring between proxy and render may require a subsequent refreshed request. Concurrent refresh, revocation timing and cross-tab/logout behavior require real integration tests. Signout revokes local session refresh, not every previously issued access JWT immediately; token expiry/verification semantics remain Supabase's.

## Email confirmation and callback setup — approval required

No hosted Auth setting, email template, SMTP resource or schema was changed. Before real email tests, inspect/approve:

1. Hosted Auth email confirmation remains enabled. Site URL matches NEXT_PUBLIC_SITE_URL.
2. Redirect allowlist includes the intended localhost/development origins and `/auth/callback` with next query values. Development can use the documented localhost wildcard; use tightly scoped known URLs in deployment, not arbitrary external domains or broad production wildcards.
3. Services send emailRedirectTo to the trusted `/auth/callback?next=<safe-path>`. The standard PKCE email redirect produces `code`; GET `/auth/callback` exchanges it using the browser's verifier cookie, verifies the user, writes cookies and redirects. Opening a PKCE email in a different browser/device without its verifier cannot work; show a neutral retry message in Task 03B-2.
4. Optional token-hash template supports cross-browser confirmation via GET `/auth/confirm`. A baseline template can use:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">Confirm email</a>
```

This token-hash template deliberately uses a fixed safe destination. Services remain configured for the default PKCE callback. Dynamic return destinations for the token-hash template need a coordinated template/service change in Task 03B-2; do not append token_hash to the current /auth/callback URL because that handler accepts code only.

The implemented token handler accepts only type=email or signup, never recovery/email_change/magiclink workflows. Both handlers reject duplicated credentials/next, missing/malformed values, provider error envelopes and mixed token/code inputs. Supabase verifyOtp/exchangeCodeForSession makes the authoritative validation; getUser must succeed before any success redirect. Error responses contain only the fixed reason confirmation_failed. Tokens are not logged by application code. Platform/proxy access logs can capture incoming query credentials, so configure redaction before production; never paste callback URLs containing live codes into reports.

Email delivery/rate limits, recipient restrictions, SMTP and abuse controls (resend throttling/CAPTCHA) require reviewed development testing and later production planning. No signup endpoint, server action or POST handler is exposed by this foundation. Task 03B-2 must choose browser operations or response-aware Route Handlers; any new server mutation endpoint must add CSRF/origin checks and rate limiting.

## USER role invariant

SignUp accepts no client identity, role or metadata. The existing campusfind_private.create_user_profile trigger inserts literal USER, ignoring editable metadata, and clients cannot update role. No migration/function/grant changed here. New-user USER/profile behavior is inherited from Task 02B's tested SQL; a real hosted signup/profile check was NOT RUN in this task and is required in Task 03B-2. Application role data must not be substituted for verified identity or grant blanket RLS bypass.

## Tests and limitations

Automated local tests exercise the actual TypeScript helpers through a test-only TypeScript transpilation hook; npm typecheck separately validates types. Providers are injected mocks, not live Supabase. Tests cover safe destinations, callback validation, cookie/header propagation, independent requests, expired/error sessions, public/protected routing and operations that omit ADMIN metadata/hide provider errors. Local production HTTP smoke tests make anonymous GET requests only, with no Auth cookies/accounts; malformed callback fixtures never reach OTP/code exchange.

Hosted signup/login/logout/resend/confirmation/real token refresh, authenticated RLS, cross-browser/email flows, account enumeration/rate-limit behavior and full UI are NOT RUN. Do not interpret mock success or local anonymous route behavior as hosted Auth success. The previous Task 03A Cloud API checks are different evidence and were not rerun here.

```sh
npm run test:auth
npm run test:supabase-config
npm run lint
npm run typecheck
npm run build
git diff --check
# Separate terminal:
npm run start -- --port 3100
# Another terminal:
npm run test:auth-routes -- http://127.0.0.1:3100
```

## Sources and next task

[Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [advanced SSR cookie guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide), [verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp), [Next.js 16 Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), [NextResponse](https://nextjs.org/docs/app/api-reference/functions/next-response). Installed SDK cookie types/options were inspected, including the setAll cache-header argument.

Recommend Task 03B-2: Authentication UI and end-to-end integration testing. Add forms/feedback/logout/verification screens; review hosted redirect/template settings with approval; use dedicated dev accounts to verify real HTTP, USER profile creation, cookie refresh/cache isolation, safe redirects, expiration and RLS. Do not implement business modules in that task.

## Final local validation record

| Check | Result |
| --- | --- |
| ESLint | PASS |
| TypeScript | PASS |
| Production build | PASS, proxy and dynamic protected/callback routes recognized |
| Auth helper tests | PASS, 24 provider-mocked local tests |
| Existing configuration tests | PASS, 5 tests |
| Local production HTTP smoke | PASS, 10 cases, anonymous localhost GETs |
| Whitespace and credential exclusion inspection | PASS |
| Hosted Auth HTTP/email/refresh/new USER profile | NOT RUN |

The earlier lint failure from using an HTML anchor for the landing link was corrected to Next Link. A missing trusted-origin case was added and now returns 503 safely. No current failing local check remains. Node's existing module-type inference warning in configuration tests is non-failing.

## Change manifest and review boundary

Modified: .env.example, README.md, package.json, src/lib/supabase/server.ts.

New: src/proxy.ts; lib/supabase/proxy.ts and response-client.ts; features/auth/navigation.ts, services.ts, server.ts, callback-validation.ts, callback-handler.ts; app/auth/confirm/route.ts and auth/callback/route.ts; app/login/page.tsx; app/(protected)/dashboard, items/new, my-reports and my-claims page.tsx files; tests/auth-foundation.test.mjs and auth-routes-smoke.mjs; this document. Paths under lib/features/app are within src.

The browser client, database migrations, profile trigger, other branch histories and main-checkout next.config.ts are unchanged. The ignored .env.local site-origin addition is local configuration only and excluded from the review patch. No commit/push/PR/merge/deploy/hosted configuration or database operation was performed. Complete diff is opened in VS Code; stop here for human review.

## Task 03B-2 continuation

The placeholder UI and metadata-free signup description above record Task 03B-1. The local continuation now adds real forms/dashboard, validated display_name metadata only, own-profile name initialization, and Register/Verify proxy coverage. See [authentication-ui.md](authentication-ui.md) for the current review, 27 helper tests, 13 local HTTP cases and outstanding hosted approval boundary.
