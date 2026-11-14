# Task 03B-4 — Post-merge authentication hosted acceptance

## Resumed review — 2026-10-31, current checkpoint

This section supersedes the earlier checkpoint retained below. **Cross-user RLS and the core authenticated browser tests PASS. Final acceptance remains BLOCKED** by the unmerged production dependency patch. Natural expiration and unapproved/unavailable email edges remain NOT RUN. Password rotation after the local credential exposure below has been recommended and is not confirmed. No Git publishing is authorized.

### Git and CI

Fresh fetch still places origin/main at a3f91c3 (PR #5 merged), with next@16.4.0. GitHub search found no security PR for fix/nextjs-security. Its separately reviewed two-file dependency patch is still uncommitted in its own worktree; it was not duplicated into this branch. Production audit here remains 1 Critical, full audit 17 (16 Moderate + 1 Critical). The separate security worktree's production audit was verified clean in Task 03B-SEC, but that is not a clean audit for this branch.

The existing CI was retained. Its production audit now uses `npm audit --omit=dev` without a severity threshold, so every production finding fails the gate. YAML review verifies Node 22, npm ci, lint, auth/config tests, production build, typecheck, contents:read, disabled checkout credential persistence, synthetic public fixtures, no secrets, no deploys and no continue-on-error. A bounded local production HTTP step reuses test:auth-routes, checks the POST/pre-hydration boundary and diagnostics 404, and stops its server on exit. It does not opt into Cloud tests. Remote workflow execution remains NOT RUN. Once the security patch is approved, published and merged, the likely integration is a reviewed `git merge --ff-only origin/main`: this branch has no new commits and its current uncommitted changes do not touch the security patch's package files. Recheck status and snapshots before taking that step; no merge was attempted here.

### Hosted progress

The human entered account credentials directly, approved creating one disposable dev account B and sending one confirmation email, and approved local-scope logout of the A test session. Cloud now has two confirmed USER accounts. The second account uses the same display name as A; tests identify them by distinct verified UUIDs and account creation order, not by name. No password, JWT, refresh token or confirmation code is included in committed/review evidence.

| Check | Current result | Evidence |
| --- | --- | --- |
| A valid login, verified identity and USER profile | PASS | Real browser Dashboard plus existing harness using getUser and own-id SELECT. |
| A protected route and reload persistence | PASS | Dashboard remained visible as USER after full reload and verification; my-reports opened in another tab. |
| A role/id grants | PASS | Impossible-row probes rejected with 42501. |
| A explicit refresh and identity preservation | PASS | Existing hosted harness. |
| A valid-session concurrency | PASS | Four cookie-authenticated Dashboard requests, no-store. |
| A approved logout, multi-tab and Browser Back | PASS | Login after local signout; second protected tab automatically redirected; Back returned Login; subsequent my-claims request was rejected. |
| B confirmed identity and own USER profile | PASS | Confirmed normal getUser identity distinct from A; authenticated own-profile SELECT. |
| B explicit refresh and valid-session concurrency | PASS | Existing hosted harness, four no-store Dashboard requests. |
| B requests during explicit renewal | PASS | refreshSession and four Dashboard requests launched together; all no-store, verified identity unchanged. Initially valid access tokens. |
| B cannot read A | PASS | Normal public client SELECT returned zero rows without provider error. |
| B cannot update A | PASS | PATCH of the exact existing name returned zero rows; target fingerprint unchanged. |
| B cannot update role/id/created_at/updated_at | PASS | Four impossible-row probes each rejected with 42501; B own snapshot unchanged. |
| A cannot read/update B; A timestamp grants | PASS | Confirmed normal identity distinct from B; SELECT/PATCH zero rows; role/id/created_at/updated_at probes reject with 42501; own snapshot unchanged. Human A login succeeded after the origin/hydration fix. |
| Missing/invalid/forged JWT and nonexistent refresh token | PASS | Six real Cloud public-key checks. |
| Failed refresh through the app | PASS | Synthetic expired cookie plus nonexistent refresh token; real local proxy/Cloud path redirects to Login with cookie deletion and private/no-store. Does not use/revoke a real session. |
| Natural expiration / simultaneous expired-token refresh | NOT RUN | Fresh sessions with SDK renewal; no Cloud lifetime changes or forced revocation. Explicit renewal overlap is narrower evidence. |
| Real revoked refresh-token replay | NOT RUN | No actual JWT/refresh token extracted for replay. Browser logout evidence is separate. |
| B registration + confirmation | PASS | Human registration, confirmed account count increased from one to two, successful callback redirect and verified normal account. |
| Resend / duplicate signup / reused or expired link / hosted token-hash flow | NOT RUN | One signup email authorized; no further email requests, account creation or real links consumed by the agent. Observed B callback was the PKCE code path. |

Cross-user state fingerprints before/after B→A and A→B are equal for both rows (including timestamps); see resumed evidence `rls-snapshots.json`. All ten mandatory RLS acceptance requirements now PASS: both own reads; both denied peer reads; both denied peer updates; both denied ADMIN-column probes; protected-column denials; unauthenticated private-profile denial. Administrative reads only establish fixture identity/state; user-level authorization checks run through the browser public client. No service-role credentials are used in those checks. The existing development harness was extended with a peer UUID/name input, stop-on-first-failure RLS checks and a separate explicit-renewal concurrency action. No replacement harness or Authentication UI redesign was created.

### Reproduced security defect and targeted fix

The human could not log in on 127.0.0.1 because Next dev blocked assets from that origin. With JavaScript unavailable, the old form's default GET submission put email/password in the URL and dev request log. A diagnostic tool read inadvertently surfaced that query before the sanitizer covered the password field. The secret values are deliberately absent from this report and evidence. The human was informed and advised to rotate the exposed password themselves. No password reset, account change or session revocation was performed by the agent. Historical browser/tool output cannot be claimed erased; credential rotation remains a human remediation item.

Targeted changes: allow only the exact 127.0.0.1 dev hostname; suppress incoming dev logs for auth forms and confirmation callbacks; keep form inputs and submit disabled until client hydration; use POST as a fallback. useSyncExternalStore provides false during server rendering/hydration and true in the hydrated client. Services, authorization decisions and database policies are unchanged. The loopback Sign in button was verified enabled after hydration. HTTP smoke verifies raw pre-hydration HTML uses POST and disables email/submit. Human A login then succeeded on 127.0.0.1, followed by successful authenticated RLS checks. A public dev asset returns 200 for the explicit loopback Origin and 403 for an unapproved external Origin. Other worktrees' next.config.ts / next-env.d.ts edits remain unchanged.

### Local verification and remaining work

Fresh npm ci, lint, 32 auth tests, 5 config tests, typecheck, public Cloud negatives and development/production route smoke PASS. Post-fix production HTTP smoke includes POST/disabled hydration checks and diagnostics 404. **The final production build compiled but exited 1 due to the Next 16.4.0 security guard: FAIL, not a successful build.** Older retry successes do not supersede this final gate result. Production/full dependency audits remain FAIL until the separate patch is integrated. No security gate was disabled. Remote CI and the combined patched-dependency integration baseline are NOT RUN; earlier Task 03B-SEC results do not establish the combined baseline after these source changes.

Remaining: security patch approval/integration, clean combined build/audit/CI, human password rotation, and any separately approved email or natural-expiry follow-up. No account or user data was deleted. No migration, Cloud configuration, deployment, commit, push, PR, merge or develop synchronization was performed.

### Current review artifacts and delivery proposal

Sanitized resumed evidence: `docs/evidence/task03b4/resumed-20261031/` (results.json, RLS directions/snapshots, A/B hosted harness results, audit JSON, local test output, dev-origin check and incident summary). The original evidence folder is preserved as historical evidence. RLS snapshot equality is recorded without profile contents, user emails or UUIDs in the delivery evidence.

Implementation changes: `.github/workflows/ci.yml`, `next.config.ts`, `src/features/auth/auth-form.tsx`, `src/features/auth/development-validation.tsx`, `tests/auth-public-cloud.mjs`, `tests/auth-routes-smoke.mjs`, plus this report and sanitized evidence. Dependency manifests, migrations and the service/session authorization implementation are unchanged. Form changes are the necessary security regression fix discovered during acceptance, not an Authentication UI rebuild.

Complete current diff including untracked files: `/tmp/campusfind-task03b4-resume/full-review.diff`. Exact manifest: `/tmp/campusfind-task03b4-resume/files.txt`. Proposed PR body: `/tmp/campusfind-task03b4-resume/pr-description.md`. These are opened in VS Code before requesting publishing approval. Credential-pattern/public-key exclusion scans pass for the review artifacts; this does not erase the disclosed historical runtime/tool-log exposure. No files are staged.

Proposed commit: `test(auth): complete hosted authentication validation and CI`. Source `test/auth-hosted-e2e`, target `main`. Any progress PR should remain Draft while the production dependency/build/CI blocker remains. Security patch publishing requires its own explicit approval; none is inferred here. Full Task 03B-4 acceptance is **NOT ACCEPTED** at this checkpoint despite passing core hosted/RLS checks.

---

## Earlier checkpoint (historical)

Review date: 2026-10-31 (Asia/Ho_Chi_Minh). Repository: `aanhtuan/campusfind-serverless`.

## Acceptance recommendation

**NOT ACCEPTED for complete hosted authentication acceptance.** Cross-user RLS and the authenticated harness require human participation; current production dependency audit also fails. This checkpoint does not demonstrate a defect in the implemented login or RLS. It does demonstrate a dependency security blocker and incomplete high-priority evidence.

No commit, staging, push, PR, merge, deployment, migration, Cloud configuration change, account creation, email sending, account deletion or session revocation was performed. Authentication UI and implementation are unchanged.

## Git preparation and preservation

- Fetched origin successfully. Latest `origin/main` is `a3f91c31235b2102fea2e3dbebbc9af4f3f59de2`, the PR #5 merge. Ancestry check succeeded.
- Created `test/auth-hosted-e2e` from that exact remote tip in `/home/atuna/.codex/worktrees/7fb9/campusfind-serverless`. Initial worktree was clean and detached at the same merge.
- Main checkout `/home/atuna/campusfind-serverless` remains on `main` at `1df5608`; its existing `next.config.ts` modification is preserved.
- Existing `/home/atuna/.codex/worktrees/e40f/campusfind-serverless` remains on `feat/authentication` at `c065176`; its existing `next-env.d.ts` modification is preserved.
- No reset, forced checkout, stash, develop synchronization or modification to other branches. Fetch updated remote references only. `origin/develop` remains `8b8347c`.
- Ignored `.env.local` in this worktree contains only the existing public development configuration plus `NEXT_PUBLIC_SITE_URL=http://localhost:3200`. Source env file was not changed; no account password, service-role key or JWT was copied or logged.

## Hosted test matrix — fresh results only

Target verified through Supabase connector: **campusfind-dev**, project `gxbpprhivyxmtcqibncf`, `ACTIVE_HEALTHY`. Public tests call the real HTTPS project URL and enforce the explicitly supplied project ref.

| Test | Status | Evidence / limit |
| --- | --- | --- |
| Valid user login | NOT RUN | No credentials available to this run. Historical PASS in Task 03B-3 is not a current retest. Human login page is open on localhost:3200. |
| Own profile read using valid user | NOT RUN | Existing `/auth/validation` harness requires human login. |
| Authenticated protected-column permissions | NOT RUN | Harness probes role/id with impossible `id IS NULL` filter. Cloud grants review below is separate evidence. |
| Explicit session refresh | NOT RUN | Harness already calls real `refreshSession()` followed by verified `getUser()`. No authenticated session supplied. |
| Parallel authenticated requests | NOT RUN | Harness already makes four cookie-authenticated Dashboard requests. No session supplied. Does not test simultaneous expired-token refresh. |
| Anonymous protected routes | PASS | Five protected paths returned HTTP 307 to Login with safe next and private/no-store on local dev; production smoke also passes. This uses the actual Next app but is not a deployed-web-host test. |
| Authenticated protected route | NOT RUN | Needs real cookie-authenticated browser session. |
| Logout and browser/session invalidation | NOT RUN | No current test session. Do not revoke any pre-existing human session. Application uses local-scope logout. |
| Missing JWT / profiles | PASS | Real Cloud HTTP 401. |
| Missing JWT / identity | PASS | Real Cloud HTTP 401. |
| Malformed JWT / profiles | PASS | Real Cloud HTTP 401. |
| Forged JWT signature / profiles | PASS | Synthetic authenticated claim with invalid signature: HTTP 401. No actual JWT recorded. |
| Malformed JWT / identity | PASS | Real Cloud HTTP 403. |
| Invalid refresh token | PASS | Synthetic nonexistent token: HTTP 400, `refresh_token_not_found`, no access/refresh token issued. |
| Revoked real refresh session | NOT RUN | No disposable session available. No revocation performed. Invalid-token rejection is narrower evidence. |
| Natural access-token expiration | NOT RUN | No authenticated session available to age safely. No JWT expiry changes. |
| Concurrent refresh at expiration | NOT RUN | Requires an authenticated session and expiration; valid parallel requests cannot establish this. |
| Production diagnostics restriction | PASS | Local production `/auth/validation` HTTP 404. |

Raw redacted Cloud results: `docs/evidence/task03b4/public-cloud.txt`. Six checks pass. The new refresh test initially used an invalid token shape and then the SDK error-field convention; those harness assertions were corrected using a synthetic GoTrue-shaped token and HTTP `error_code`. Final run exits zero; no application fix was required.

## Cross-user RLS evidence

Read-only administrative metadata inspection found **one account, one confirmed account**. No personal identifiers were selected. No second account exists in this project at this checkpoint. Human approval was requested before any account creation or verification email; no approval has been received.

| Requirement | Status | Reason |
| --- | --- | --- |
| A reads A profile | NOT RUN | Human login required. |
| A cannot read B private profile | NOT RUN | B unavailable. |
| A cannot modify B profile | NOT RUN | B unavailable. |
| B cannot read A private profile | NOT RUN | B unavailable. |
| Normal users cannot elevate role to ADMIN | NOT RUN | Authenticated PATCH not executed; reviewed column grants deny role UPDATE. |
| Client cannot modify protected fields | NOT RUN | Authenticated PATCH not executed; reviewed grants deny id/role/timestamps UPDATE. |

Cloud metadata evidence (read-only connector; **not** a service-role client acceptance test):

```text
public.profiles: relrowsecurity=true; relforcerowsecurity=false
profiles_read_own: SELECT TO authenticated USING (id = (select auth.uid()))
profiles_edit_name: UPDATE TO authenticated
  USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()))
authenticated SELECT: id, display_name, role, created_at, updated_at
authenticated UPDATE: display_name only
anon profile column grants: none
auth.users counts: total=1, confirmed=1
```

RLS and column privileges appear consistent with the intended ownership model. Database owners can bypass non-forced RLS; metadata inspection therefore cannot substitute for requests from two real normal users. No `SET ROLE` simulation or privileged query is reported as a cross-user PASS.

After approval and a verified B account: use public SDK clients for both sessions; verify each is a confirmed, distinct USER and can read its own profile. A→B and B→A SELECT must return no rows. For A→B UPDATE, submit B's existing display_name with `return=representation`; expect zero rows (or an explicit permission denial), then have B confirm the profile fields/timestamp are unchanged. A write unexpectedly allowed by regressed RLS can still update `updated_at`; stop and report that failure without automatic cleanup. The user explicitly authorized cross-user modification tests, but no such writes are executed at this checkpoint. Test role/id/timestamp grants with the existing impossible-row probes so a grant regression cannot modify a real account. Do not delete either user or any user data.

## Session and email boundaries

The existing harness and server code were reviewed without rebuilding authentication. Explicit refresh must preserve the verified user identity. Four successful parallel requests only establish valid-session concurrency. Logout should use a session created specifically for this acceptance run, with `scope: local`; testing must not invalidate other active sessions.

Supabase access JWTs can remain usable until expiration after logout. Refresh-token revocation and clearing browser cookies are separate checks from immediate Data API rejection of a previously issued JWT. Verify and document both outcomes rather than assuming logout revokes an access JWT immediately. [Supabase session documentation](https://supabase.com/docs/guides/auth/sessions), [signout scopes](https://supabase.com/docs/guides/auth/signout).

| Email edge | Review | Hosted status |
| --- | --- | --- |
| Resend confirmation | Service uses signup resend, generic failure message, trusted callback URL. | NOT RUN: approval required before email. |
| Duplicate registration | Generic signup response prevents directly displaying provider detail. Actual response depends on provider confirmation configuration. | NOT RUN: can send email; approval required. |
| Reused real confirmation link | Callback rejects provider errors before granting a session and verifies identity after success. | NOT RUN: no approved real link available. |
| Expired real confirmation link | Same fail-closed callback; malformed local callback smoke is narrower. | NOT RUN: no expired real link available. |
| Token-hash confirmation | Route validates input then calls verifyOtp and verifies getUser; unit test PASS with mocked provider. | NOT RUN hosted: no real token-hash link supplied. |

No emails were sent. No expiry, JWT lifetime, SMTP, redirect allowlist or other Cloud setting changed. No hosted Vercel URL was supplied and no deployment was performed: app-route checks here run localhost against real Supabase when authenticated, not a claimed deployed-web E2E.

## Dependency audit — refreshed, not the historical five

Lockfile and package versions were not modified. `npm ci` succeeds on Node 22.23.1 / npm 10.9.8. Current full audit: **17 findings (16 Moderate, 1 Critical)**; production-only audit: **1 Critical**. Both security acceptance checks FAIL. Full machine-readable audit snapshots and dependency tree are in the evidence folder.

The old five High findings were one propagated braces advisory through `braces → micromatch → fast-glob → @next/eslint-plugin-next → eslint-config-next`. The [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) was withdrawn on 2026-10-23 as not practically exploitable. It no longer appears in the current audit. Registry checks still show braces 3.0.3 and micromatch 4.0.8; fast-glob 3.3.3 retains the micromatch/braces chain. Updating fast-glob alone was never a verified fix for that withdrawn advisory. eslint-config-next 16.4.3 is available as a compatible patch but is not established to fix the current lint dependency chain.

Current risks:

- **Production next@16.4.0, Critical aggregate:** audit lists SVG image optimization RCE, App Router Server Actions DoS, and `use cache` typed-array RCE advisories. Available npm patch recommendation is **next@16.4.3**, compatible with the current major version. Review aligned `@next/env` / `eslint-config-next` patch updates and rerun checks in a separate dependency change. No exploit was attempted; the audit is dependency exposure evidence, not proof the app exposes every vulnerable feature. [Image optimization advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Server Actions advisory](https://github.com/advisories/GHSA-p3m5-59mp-jv5r), [typed-array advisory](https://github.com/advisories/GHSA-673q-mjm6-r5xr).
- **Development minimatch chain, 16 Moderate aggregate findings:** installed minimatch 3.x and 10.x propagate through ESLint / TypeScript ESLint / React and import plugins. [Advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249) identifies glob amplification DoS; fixed minimatch starts at 11.0.1, latest checked 11.0.3. This is a major change from installed parent ranges (`^3` / `^10`); no compatible in-range patch was established. Risk is tooling CPU/memory exhaustion on attacker-controlled patterns. Do not force an override across major APIs. Latest ESLint 10.14.0 is a major upgrade from the repository's ^9 range and is not applied.
- npm proposes incompatible downgrades (eslint 4.0.0 / eslint-config-next 12.0.4) for parts of the chain. Those recommendations were rejected; no `npm audit fix --force`, downgrade or speculative override was run.

## Local validation and CI review

| Check | Result |
| --- | --- |
| npm ci | PASS; audit findings reported separately |
| npm run lint | PASS |
| npm run test:auth | PASS: 32/32 |
| npm run test:supabase-config | PASS: 5/5 |
| npm run typecheck | PASS |
| npm run build | PASS on retry; first build compiled but exited 1 for Next's security advisory notice. Fresh CI may also stop there until patched. |
| Development anonymous route smoke | PASS: 13 checks |
| Production anonymous route smoke | PASS: 13 checks |
| Development diagnostics unavailable in production | PASS: HTTP 404 |
| Hosted public-key negative tests | PASS: 6 checks |
| Full dependency audit | FAIL: 17 findings |
| Production dependency audit | FAIL: 1 Critical |
| Workflow executed on GitHub | NOT RUN: no publishing authorized |

No existing workflows were present at origin/main. Prepared `.github/workflows/ci.yml` with read-only contents permission, disabled checkout credential persistence, Node 22, timeout/concurrency cancellation and synthetic public config fixtures. It installs with npm ci, lints, runs auth/config tests, builds, typechecks generated route types, and audits production dependencies. It has no secrets, account credentials, hosted tests, migrations or deploy steps. Build precedes explicit typecheck because it generates Next route types. Production audit runs even if earlier steps fail, unless cancelled. No continue-on-error or security bypass is used. **The workflow is a proposed gate; current dependencies do not pass it.**

## Review artifacts and next action

All new changes are limited to the Cloud negative test, proposed CI, this review and sanitized evidence. Complete patch including untracked files: `/tmp/campusfind-task03b4/full-review.diff`; manifest: `/tmp/campusfind-task03b4/files.txt`. The patch includes the entire workflow diff before any publishing. Review those files and the evidence folder in VS Code.

Human participation is needed to proceed with high-priority hosted acceptance: sign into the existing A account at `http://localhost:3200/login?next=%2Fauth%2Fvalidation`; then run the existing authenticated checks. A second confirmed development account requires approval to create and send verification email. Email-edge testing needs its own bounded approval and usable links. No elapsed wait is treated as approval.

After these hosted gaps and the production dependency blocker are addressed, reassess acceptance. Commit, push and PR creation remain subject to explicit authorization; this report does not request or imply automatic publishing.
