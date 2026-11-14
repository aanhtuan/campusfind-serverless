# CampusFind

A serverless lost and found MVP for a single university campus. Next.js 16 App Router / React / TypeScript / Tailwind render the application; Supabase provides Auth, PostgreSQL with RLS, private Storage and a workflow Edge Function. Vercel is the intended frontend host.

The local implementation connects **Authentication → Reporting → Discovery → Ownership claim → Reporter review → Handover arrangement → Two-sided return confirmation → Resolution → Closure**. Implementation and local verification are separate from Cloud release: the two workflow migrations and `workflow` function were activated on the development Cloud project with explicit approval on 2026-11-09. Three-identity checks use the local frontend against hosted Supabase; Vercel frontend deployment and public registration/email acceptance remain NOT RUN. Account names, stable account codes and role-aware handover progress are now shown throughout the signed-in UI; the scoped read-only identity RPC was activated separately with approval. See [account roles and verification](docs/account-roles.md). See [the hosted demo and scenario report](docs/hosted-demo-verification.md). See the [LOST finder-response flow](docs/lost-finder-workflow.md), [current integration report](docs/mvp-integration.md) and [original completion/evidence report](docs/mvp-completion.md).

## Local setup

Node.js 22+ (`.nvmrc`) and npm:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Configure the exact project's `NEXT_PUBLIC_SUPABASE_URL`, modern `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and trusted `NEXT_PUBLIC_SITE_URL` in ignored `.env.local`. Never put a secret/service-role key, database password, access token or user credential in NEXT_PUBLIC variables. Rebuild/restart after public env changes. The landing page/build can run without live Supabase configuration; protected features require configured Auth, schema and workflow function.

For a fully isolated loopback stack with disposable test users, use the [local reproduction and deployment runbook](docs/mvp-deployment.md). This avoids mutating Cloud. Do not run fixtures against the hosted development project without separate approval.

## Features

| Area | Entry points |
| --- | --- |
| Accounts | `/login`, `/register`, `/verify-email`, `/dashboard`, logout |
| Public discovery | `/items`, `/items/[id]`; active text, LOST/FOUND/category/location/title filters, pagination |
| Reporting | `/items/new`, `/my-reports`, own detail/edit; up to three registered private photos, staged upload recovery |
| Claims and finder responses | FOUND → ownership claim; LOST → private finder response, owner evidence and holder verification; preview, cancel, history in `/my-claims` |
| Review and return | `/incoming-claims`, `/claims/[id]`; atomic review, proposal/revision/accept/change, optional consented contact, separate confirmations, operational issues |
| Completion | Both matched FOUND and LOST resolve after two confirmations; independently recovered LOST can resolve without an approved response; reporter closes completed record |
| Minimal Admin | Database ADMIN only: `/admin`, aggregate counts and structured issue acknowledgement; no blanket evidence/contact access |

Photos require a verified member session. Evidence, handovers and contact are participant-only; ADMIN has no unrestricted private-data policy. Account role comes from database profiles and cannot be self-assigned through registration metadata. See [architecture, data model and operation contract](docs/mvp-workflow.md).

## Validation

```sh
npm run lint
npm run typecheck
npm run build
npm run test:auth
npm run test:reports
npm run test:search
npm run test:claims
npm run test:handover
npm run test:supabase-config
```

`test:claims` and `test:handover` currently run the shared 16-case workflow validation/client suite; count it once. Real database/RLS/concurrency tests and the local Auth/Storage/Edge/browser flows are separate checks. See [reproduction commands](docs/mvp-deployment.md), [test results and limitations](docs/mvp-completion.md), and [initial audit](docs/mvp-audit.md). Production preview: `npm run build`, then `npm run start`. The dev/build scripts retain webpack and local system fonts.

## Structure

```text
src/app/                  Public routes and protected member/admin pages
src/features/auth/        Verified SSR identity, login and session boundary
src/features/reports/     Owner-scoped forms, metadata and private photos
src/features/discovery/   Public active text queries and member photo access
src/features/workflow/    Private claims, return coordination, status controls
src/lib/supabase/         Request/browser clients and cookie/session handling
supabase/migrations/      Versioned schema, grants, guards, policies and RPCs
supabase/functions/       Authenticated workflow Edge Function and shared validation
supabase/tests/           Real local pgTAP and concurrent transaction tests
scripts/                  Explicitly gated loopback fixture/browser runners
```

## Release and Git control

Work from the latest fetched `origin/main` on dedicated `feat/`, `fix/`, `chore/`, `test/` or `docs/` branches. The current integration uses `feat/integrate-campusfind-mvp`, based on `768365c` (the Vietnamese UI redesign). Preserve unrelated worktrees/local changes; review the exact diff before staging. Commit, push, PR, merge, hosted migrations/settings/fixtures and deployment require explicit authorization. Never force push or commit `.env.local`, private keys, tokens, caches or generated build output.

Cloud release uses the existing Supabase development project plus Vercel, with no new paid service or separate backend. [Deployment preparation](docs/mvp-deployment.md) specifies ordering, environment scopes, Auth redirects, the migration/function gate and hosted acceptance. Do not treat a local PASS as hosted E2E or a production-readiness claim.

## Historical design and reviews

[Project scope](docs/project-scope.md), [database foundation](docs/database-design.md), [original RLS review](docs/rls-security.md), [authentication design](docs/authentication-foundation.md), [Auth final review](docs/task03b3-final-review.md), [credential form fix](docs/task04c-auth-form-security-review.md), [reporting review](docs/task04a-implementation-review.md), [discovery review](docs/task04b-search-review.md), [Cloud setup](docs/supabase-cloud-setup.md). Historical reports retain the evidence and limitations of their original snapshots; current scope and results are in the MVP documents above.

## Source consolidation

See [the November 14 consolidation audit](docs/source-consolidation-2026-11-14.md) for worktree provenance, current checks and delivery boundaries. Run `npm test` for every application unit suite. Historical QA and deployment reports describe their dated snapshots.
