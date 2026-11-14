# Deployment preparation and approval gate

> Update 2026-11-09: the approved Cloud activation and retained multi-user demo are now recorded in [hosted-demo-verification.md](hosted-demo-verification.md). Statements below about pending Cloud work describe the earlier local snapshot.

Prepared locally; **no hosted migration, Auth setting change, function deployment, Cloud fixture, Vercel project/deployment or Git publication was performed.** Local evidence is in `mvp-completion.md` and the current `lost-finder-workflow.md`.

## Read-only Cloud snapshot (2026-11-05)

Supabase MCP lists `campusfind-dev`, project `gxbpprhivyxmtcqibncf`, region `ap-southeast-2`, ACTIVE_HEALTHY, PostgreSQL `17.11.0.003`. Migration history contains only `20261012000100_application_schema` and `20261012000200_private_image_storage`. Edge Functions list is empty. The new workflow is therefore not available on that hosted database yet. No Cloud SQL was executed for this work.

## Configuration to review before approval

| Runtime | Variable / setting | Purpose |
| --- | --- | --- |
| Next.js, build and runtime | `NEXT_PUBLIC_SUPABASE_URL` | Exact existing project's HTTPS origin |
| Next.js, build and runtime | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Modern public key, never secret/service_role |
| Next.js, build and runtime | `NEXT_PUBLIC_SITE_URL` | Actual trusted HTTPS app origin; set after the deployment domain is known |
| Edge Function | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Supabase-provided runtime defaults, caller-scoped client |
| Function configuration | `[functions.workflow] verify_jwt = true` | Platform JWT check plus live `getUser` inside handler |
| Data API | Exposed schemas `public`; private schema excluded | Explicit grants and RLS protect application tables |
| Storage | `item-images` private, 5 MiB, JPEG/PNG/WebP | Preserve existing policies and three registered image slots |
| Auth | Site URL, allowed callback/confirm redirects, email templates | Match the actual app origin; no guessed domain or wildcard production redirects |

The read-only Cloud snapshot above is historical, not a recheck on November 9. The LOST increment performed no hosted operation.

No new frontend secret is needed. Next.js uses Node 22+, `npm ci`, `npm run build`; Vercel's Next.js detection is sufficient, with no custom server or additional paid service. Preview and Production require their own reviewed environment scope. First deployment to a newly created Vercel project may become Production: inspect current account/team, project existence, billing plan, Git integration and target before approving creation or deploying. Never infer these from old reports.

## Ordered, separately authorized release procedure

1. Review local diff, migration, RPC privileges, test results and outstanding acceptance gaps. Approve Git commit/publication separately; no force push or automatic merge.
2. Recheck exact Supabase development project, migration history, health/advisors and a backup/recovery plan. Review migration dry run using the **pinned CLI 2.120.0**; discover exact command flags with `--help`. CLI v3 changed defaults; do not silently upgrade it as part of this release.
3. Obtain explicit authorization for applying **the two new versioned migrations, in order** to `campusfind-dev`. Do not rewrite already-applied migrations or run a remote reset. New tables/RPCs are additive. Apply `20261105065313_claims_handover_workflow.sql`, then `20261109154529_lost_finder_response.sql`; deploy the current shared validator/function only after both. Apply the approved migration before releasing UI that depends on it, then verify grants, search paths, exposed schemas and RLS.
4. Obtain explicit authorization to deploy `supabase/functions/workflow` (shared validation bundled), keeping platform JWT verification and live Auth verification. Pin npm Supabase dependency as in source. Inspect sanitized logs and validate missing/invalid JWT rejection before positive tests.
5. Obtain explicit authorization for hosted test identities/data/email operations. Run A/B successful return and C/admin isolation on real hosted Auth → Edge → RPC → Storage. Record rows/statuses, negative results and cleanup only exact fixtures. Local pgtap/API/browser tests do not satisfy this gate.
6. Review Vercel account/team/plan, intended project, branch and environment scope. Obtain explicit deploy/project-creation approval. Set the public Supabase settings; discover the actual generated domain, then approve trusted site origin and Auth redirect/template updates as needed. Rebuild after changing NEXT_PUBLIC variables.
7. Validate actual deployed browser login/verification/logout, two-user return, private photo access, mobile display, refresh persistence, terminal discovery exclusion and unauthorized mutations. Scan errors without logging credentials, proof or contacts. Only then consider promotion/release approval.

Do not insert ADMIN through signup metadata. If an admin is required for demo, approve a specific existing verified account and a narrowly scoped operator-only role update; verify ordinary users cannot perform it. No account or role change is included here.

## Rollback

Preserve the old frontend deployment for rollback. The additive migration can remain in place if UI/function publication is rolled back; avoid destructive down migrations or deleting claims/handovers. Disable further release activity, inspect sanitized errors, and prepare a new forward migration when necessary. Changes involving approved claims/confirmed returns require data review; do not silently reset them.

## Local reproduction without Cloud writes

```sh
npm ci
npm run lint
npm run test:auth
npm run test:reports
npm run test:search
npm run test:claims
npm run test:handover
npm run test:supabase-config
npm run build
npm run typecheck
node scripts/prepare-mvp-local.mjs --confirm-disposable-local
```

The preparation command prints a new temporary `workdir`, loopback URL and `container`. It creates the work directory under `~/.cache/campusfind-tests` (override with `LOCAL_SUPABASE_WORKDIR_ROOT`); this avoids Docker Desktop mounts from an unshared `/tmp`. It copies versioned migrations/functions into a separate project `campusfind-mvp-*` on ports 55420–55423. Change `LOCAL_SUPABASE_BASE_PORT` if occupied. Start with the pinned CLI: `npx --no-install supabase start --workdir <printed-workdir> -x studio,postgres-meta,imgproxy,supavisor`. This starts only the disposable local project and applies migrations there; it never links Cloud. Docker must be available. Rootless Podman can expose its Docker-compatible socket and supply `DOCKER_HOST` for this command; do not change the global Docker context or unrelated containers.

Run SQL tests:

```sh
python3 scripts/test-database-local.py --confirm-disposable-local --runtime podman --container <printed-container>
python3 supabase/tests/concurrency.py --confirm-disposable-local --runtime podman --container <printed-container>
python3 supabase/tests/workflow-concurrency.py --confirm-disposable-local --runtime podman --container <printed-container>
```

For real local HTTP tests, use the local stack's own status/config in process environment, without printing keys. Supply `LOCAL_SUPABASE_URL`, `LOCAL_SUPABASE_PUBLISHABLE_KEY`, `LOCAL_SUPABASE_SECRET_KEY` and `LOCAL_SUPABASE_CONTAINER`; then `npm run test:workflow:local`. Optionally provide `LOCAL_SUPABASE_JWT_SECRET` from the disposable local status to exercise a correctly signed synthetic expired JWT; if omitted, that expiry case is skipped. The script rejects non-loopback origins and unexpected containers, creates only disposable local users/reports, exercises real Auth/Storage/Edge/RPC and removes exact fixtures via the local container. This privileged key exists only in the local test process; it is never a NEXT_PUBLIC setting or part of the application.

For browser tests, configure the Next build/runtime with the loopback URL/public key and a matching local `NEXT_PUBLIC_SITE_URL`, start on that site origin, and run `npm run test:workflow:browser` with the same local test environment and `LOCAL_APP_URL`. Playwright uses the installed Chromium (or `LOCAL_CHROMIUM_PATH`). No existing browser profile is used; isolated contexts test reporter, claimant, outsider and an explicitly provisioned local-only ADMIN. Do not point this fixture runner at a hosted server.

Stop only the named disposable stack when finished. Test sources roll back SQL suites and explicitly clean API/browser fixtures; no broad Cloud cleanup or database reset is needed.

## Official references checked

- [Supabase database functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Edge authentication](https://supabase.com/docs/guides/functions/auth)
- [Supabase CLI v3 change](https://supabase.com/changelog/supabase-cli-v3) (keep this repository's v2 pin)
- Installed Next.js 16.4.3 guides for Server/Client Components, mutations, route handlers and error handling.
