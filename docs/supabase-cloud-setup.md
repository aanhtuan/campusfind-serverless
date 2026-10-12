# Supabase Cloud development setup — Task 03A

## Current status and boundaries

Local code prepared from `origin/main` at `143a96d` (PR #2 and #3 present). On 13 October 2026 the human approved Cloud creation and, separately, both hosted migrations after preflight. `campusfind-dev` is Healthy in the CampusFind Free organization, NANO compute, actual region Sydney (`ap-southeast-2`). Project ref: `gxbpprhivyxmtcqibncf`; URL: `https://gxbpprhivyxmtcqibncf.supabase.co`.

CLI 2.120.0 was authenticated through the signed-in Dashboard's interactive verification flow and linked to this ref. No database password was needed for CLI linking/push. URL and publishable key are configured only in ignored `.env.local`; no secret/password/token is in tracked files. Data API was enabled and automatic table grants disabled in the project creation form. Both versioned migrations are applied and history matches the repository. No database reset, seed, Vault update or production operation occurred.

The existing separate main checkout has a user modification to `next.config.ts`; preserve it. `develop` is six commits behind this foundation. Do not start integration from the old develop or synchronize it implicitly. Task branch: `chore/supabase-cloud-setup`. No Git publishing is authorized.

## Create and confirm the development project

In [Supabase Dashboard](https://supabase.com/dashboard), the human signs in and selects a **Free** organization. Prepare a project named **campusfind-dev**. Select a region near campus users, normally Singapore for Vietnam if available; confirm residency requirements before choosing. Check plan and region in the actual form. Do not upgrade, add paid resources or use a production project.

The human creates/stores the database password using a password manager, never chat, tracked files or command-line arguments. Project creation is a Cloud resource action and needs explicit approval before submitting. If campusfind-dev already exists, inspect its identity, region, plan and existing data before proceeding. Its display name is not its unique project reference.

Obtain the Project URL and the **Publishable** key from project connection/API settings. Never copy a secret or legacy service_role key into public env variables. A Dashboard login does not log the CLI in.

## Environment and clients

```sh
cp .env.example .env.local
# Edit .env.local locally using your editor; do not paste values into chat.
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL` to the HTTPS project origin and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to its `sb_publishable_...` key. The values are public and bundled into browser code. `.env.local` is ignored, but never commit it. Restart development after editing; rebuild when changing build-time public env for production preview. The landing page/build do not invoke Supabase and still work without configuration.

- `src/lib/supabase/config.ts` validates config lazily, rejects missing/placeholder/secret/legacy JWT keys and credential-bearing URLs, and does not print values in errors.
- `client.ts` provides the browser SSR client.
- `server.ts` awaits Next.js 16 `cookies()` and creates a new client per request. Its default cookie adapter is read-only and fails clearly if a session write is attempted. Auth handlers must supply a response-aware adapter that writes cookies **and** the headers delivered by SSR `setAll`. Never share the server client between requests.

Task 03B must add the Next.js proxy/session refresh integration, cache protections and verified identity handling before using these helpers for authenticated routes. This task does not claim complete session support or generate guessed database types. Generate reviewed types from the verified schema later.

## Authenticate and link CLI

Use the pinned CLI through npm, in this task worktree. The human authenticates interactively in their terminal with `npx --no-install supabase login`; do not supply tokens via command arguments, chat or tracked env. Use the browser/device flow if offered. If the installed CLI asks for a personal access token, the human enters it directly in the private prompt. Avoid debug logs containing connection information.

```sh
npx --no-install supabase --version
npx --no-install supabase projects list
npx --no-install supabase link --project-ref <CONFIRMED_DEV_PROJECT_REF>
npx --no-install supabase migration list --linked
npx --no-install supabase db push --linked --dry-run --skip-vault
```

Confirm the ref is campusfind-dev before linking and before any remote command. CLI cache under `supabase/.temp` is ignored. Local `config.toml` project_id remains `campusfind-task02b` so existing local fixtures/tests remain valid; it is not the Cloud display name or ref. Do not run `supabase config push`: local settings must not overwrite Cloud Auth/API settings. Check Dashboard Data API exposes public, not campusfind_private.

## Migration approval gate

Inspect existing remote tables, policies, migration history and bucket first. `db push --dry-run` is a preview, not proof of compatibility. Stop on collisions/history drift; do not reset, repair history, use include-all, drop objects or delete remote data automatically.

The two repository migrations will:

1. `20261012000100`: create internal schema, four application tables, primary/foreign/check/unique constraints and indexes; create guarded trigger functions, an Auth profile trigger, explicit table/column grants and RLS policies. Existing Auth users receive USER profiles through the migration backfill. Clients cannot write claims or protected profile/item columns.
2. `20261012000200`: insert private `item-images` bucket (5 MiB per object; JPEG/PNG/WebP) and three authenticated Storage ownership policies. No physical uploads or deletions occur. A pre-existing bucket with the same ID is a collision to inspect, not permission to overwrite it.

These change the hosted database and authorization. Review the exact SQL, confirmed dev ref and dry-run pending list; obtain explicit approval **before** running:

```sh
# Only AFTER approval for this confirmed development project:
npx --no-install supabase db push --linked --skip-vault
npx --no-install supabase migration list --linked
```

No seed, custom role deployment, Vault update or config deployment is requested. Never run db reset (local or remote) in this task. Each migration is transactional but a two-migration deployment is not one transaction; if the second fails, inspect partial history and report it without destructive recovery.

## Verify the hosted database after approval

Open Dashboard Table Editor and confirm profiles/items/item_images/claims and RLS. Execute `supabase/verification/cloud-development.sql` in the confirmed dev project's SQL Editor. It uses one SELECT returning aggregated metadata only (CLI query otherwise displays only the final result of multiple SELECT statements). Compare all definitions/effective privileges with repository SQL, including all Storage policies (additional permissive policies can widen access).

Expected: two migration versions `20261012000100`, `20261012000200`; four RLS-enabled tables and four primary keys; five FKs (profiles→auth.users, items→profiles, images→items, claims→items/profiles); registered image-slot uniqueness; both partial claim indexes; guarded functions and triggers. Bucket public=false, limit=5242880, MIME JPEG/PNG/WebP. Anon has only items SELECT; authenticated protected columns/claim writes denied. Check every returned privilege, not only named policies. Supabase-owned extra indexes may exist.

Missing metadata/table errors mean FAIL, not an empty successful result. Record actual outputs and comparisons; the SQL script is an inspection aid, not an automatic PASS assertion. Schema inspection uses Dashboard owner access; application connectivity checks below use only the public key without a user session.

## Connectivity and validation

```sh
npm run test:supabase-config
npm run check:supabase-cloud -- --confirm-development-project
npm run lint
npm run typecheck
npm run build
git diff --check
```

The connectivity script loads ignored .env.local using Next's env loader, uses a fresh supabase-js client without persisted sessions, and applies a 15-second timeout per request. It checks anonymous items SELECT, statuses of returned rows, private-table SELECT denial and INSERT denial for all four tables. INSERT probes have required NOT NULL columns set to null, so even regressed grants cannot insert data; **only** error code 42501 counts as PASS, not FK/check/NOT NULL failures. These verify anonymous grants, not authenticated RLS predicates or full write workflows. No service-role credentials are used. It prints no keys or row data.

An empty items response verifies endpoint/schema/SELECT access only. Public-versus-private fixture visibility remains NOT RUN until reviewed dev fixtures exist. No fixture is automatically inserted. Auth signup/login, Storage uploads/downloads/signed URLs and hosted SQL/concurrency suites are separate checks; do not claim them passed from this script. Never run Task 02B disposable-local concurrency/fixture tests against hosted data.

## Troubleshooting

- Missing/placeholder config: edit .env.local and restart. Config tests run offline; do not need credentials.
- Secret/legacy key rejected: select the modern Publishable key in Dashboard. Do not weaken validation to accept service_role.
- DNS/timeout: check project URL, project availability and network. Check whether a Free project is paused.
- Invalid API key/401: check public key belongs to the same project; do not replace it with a privileged key.
- 42P01/PGRST205: table/migration/schema-cache missing; inspect migration history and Data API schemas. Do not reset.
- Items SELECT permission denied: compare effective grants and RLS using read-only SQL.
- Anonymous write returns another error: mark FAIL and review grants. Constraint rejection alone is insufficient evidence of authorization.
- CLI access/pooler failure: authenticate separately, confirm ref and interactive DB password, inspect CLI guidance for network access; never paste credentials into logs.
- Server cookie write error: use a response-aware adapter and implement verified session refresh in Task 03B; do not silently suppress failed session writes.

## Sources

[Supabase SSR client guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [CLI workflow](https://supabase.com/docs/guides/local-development/cli-workflows), [migrations](https://supabase.com/docs/guides/deployment/database-migrations). Installed @supabase/ssr types and CLI 2.120.0 help were also inspected, including the cache-header argument and --skip-vault flag.

## Local validation record — 13 October 2026

- PASS: lint, typecheck, webpack production build, tracked/new-file whitespace checks.
- PASS: five configuration tests, including the actual CLI command's missing-env failure before network access.
- PASS: production dependency audit, zero vulnerabilities. Full install audit still reports the five previously documented development-tool findings.
- PASS: Cloud connectivity, hosted migration history, schema/RLS/effective grants/private bucket metadata inspection.
- NOT RUN: nonempty public/private fixtures, authenticated RLS HTTP, Auth/Storage HTTP end-to-end, hosted SQL/concurrency suites and Studio runtime.
- No migration files modified; no database reset; no commit, push, PR or merge. Hosted development migrations were applied only after explicit approval.

Build and subprocess tests required execution outside the restricted sandbox; reruns passed. Node emits a module-type inference warning when importing config.ts directly for scripts/tests; it does not affect test/build success.

## Hosted execution record — 13 October 2026

- Preflight: zero public tables, no campusfind_private schema, no item-images bucket, zero Auth users; no remote migration versions. Dry-run listed exactly the two repository migrations.
- Applied `db push --linked --skip-vault --yes` to the confirmed ref. Versions `20261012000100` and `20261012000200` both match local/remote migration list.
- Read-only metadata inspection: four RLS tables, 4 PKs, 5 FKs, 23 constraints, 14 indexes, 13 policies (10 application + 3 Storage), 84 effective column-grant rows and 12 table-grant rows checked against migrations; 5 internal function ACL/search_path records and 8 triggers checked. Only create_user_profile is SECURITY DEFINER; clients/service_role have no internal function EXECUTE. Anon/authenticated do not bypass RLS; service_role is the trusted bypass role.
- Private item-images bucket: public=false, 5242880-byte per-file cap, image/jpeg, image/png, image/webp. No physical file operations tested.
- Public HTTP tests: items SELECT PASS; private-table SELECT denial 3/3 PASS; anonymous INSERT denial 4/4 PASS (42501). No rows returned; nonempty status visibility remains NOT RUN. Script's hosted metadata NOT RUN line refers only to that script; the separate CLI metadata inspection above passed.
- Final lint/typecheck/build and five configuration tests PASS with .env.local configured. Existing main-checkout next.config.ts edit preserved.
- Task 03B remains responsible for complete cookie/session refresh, verified identity, auth UI/routes and authenticated API tests. No Claims workflow implemented.

For this installed CLI, the interactive login flow needs text/non-agent mode:

```sh
npx --no-install supabase login --no-browser --output-format text --agent no
# Open the displayed login URL using your already authenticated Dashboard;
# enter its verification code directly into the CLI prompt, never into docs/chat.
npx --no-install supabase db query --linked --file supabase/verification/cloud-development.sql --output-format json --agent no
```

CLI login credentials remain in the CLI's local credential store, outside Git. Do not include login links/codes or that store in review artifacts.
