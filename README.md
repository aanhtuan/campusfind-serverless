# CampusFind

A serverless lost and found management system for university campuses.
Task 01 provides the application foundation; Task 02B adds locally verified database migrations and RLS. Task 03A connects the Cloud development foundation. Task 03B-1 adds SSR authentication infrastructure and protected route shells. Business workflows and deployment remain pending.

## Stack

- Next.js App Router and React, with strict TypeScript
- Tailwind CSS and shadcn/ui conventions (local Button component, `components.json`, and `cn` helper)
- Supabase PostgreSQL, Auth, and Storage; `@supabase/supabase-js` and `@supabase/ssr` are installed
- Supabase Edge Functions (Deno + TypeScript) planned for later server-side workflows
- Vercel as the planned hosting platform

## Local setup

Use Node.js 22 or newer and npm. `.nvmrc` selects Node.js 22.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The landing page runs without environment variables or a live Supabase project.

For Supabase development, copy the example:

```sh
cp .env.example .env.local
```

Replace `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` with your project's public configuration. The example contains placeholders only. These variables are browser-visible; never place a secret key, service-role key, password, or token in them. `.env.local` is ignored by Git. Browser/server clients now validate configuration when called. Use a modern `sb_publishable_...` key. Full Cloud setup, CLI linking and the hosted migration approval gate are documented in [Supabase Cloud setup](docs/supabase-cloud-setup.md).

## Checks and production preview

```sh
npm run lint
npm run typecheck
npm run build
npm run start
```

Development and production builds use webpack with Tailwind’s PostCSS plugin for compatibility with restricted worker environments.

`npm run start` serves the built application at http://localhost:3000. Builds use system fonts and require no live Supabase credentials or font downloads.

## Dependency audit note

At foundation validation, `npm audit --omit=dev` reports zero vulnerabilities. The full audit reports five high-severity findings in the development-only ESLint → fast-glob → micromatch → braces chain. The registry currently has no patched braces release; npm suggests downgrading `eslint-config-next` to 14, which is incompatible with this Next.js 16 foundation. Track the upstream fix and rerun the full audit when updating tooling.

## Layout

```text
src/
  app/             App Router pages, root layout, and global styles
  components/ui/   Reusable UI primitives
  features/        Future auth, items, and claims modules
  lib/             Shared utilities and Supabase client infrastructure
  types/           Future cross-module contracts and generated database types
docs/
  project-scope.md  MVP modules, boundaries, and acceptance criteria
```

Use `@/*` to import from `src/*`. Keep domain code in its feature and promote code to shared folders only when needed across modules. The UI foundation follows [shadcn/ui's manual setup](https://ui.shadcn.com/docs/installation/manual). Future Supabase integration should follow the [official SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## Git workflow

- `main`: stable releases; do not commit foundation or feature work directly here.
- `develop`: integration branch and pull request target for Task 01.
- `chore/project-foundation`: this foundation, branched from `develop`.
- Existing `feature/auth`, `feature/reporting`, `feature/search`, and `feature/claims` branches are preserved. Reporting and search belong to one MVP module.

Use conventional prefixes `feat/`, `fix/`, `chore/`, `refactor/`, `test/` or `docs/` for future tasks.

`develop` has not yet been synchronized with the merged foundation. Until synchronization is explicitly approved, start dedicated work from the latest `origin/main`. Implement locally, show the full diff in VS Code, and obtain separate approval before commit, push, PR or merge:

```sh
git fetch origin
git switch -c chore/your-task origin/main
# Make and validate the changes.
npm run lint
npm run typecheck
npm run build
# Only after explicit approval to commit/push:
git add <reviewed-files>
git commit -m "feat: describe your change"
git push -u origin chore/your-task
```

Select the agreed PR target after branch synchronization; create a PR and merge only after explicit approval. Avoid force pushes and do not reset shared history. Never commit credentials or generated build output. Dependency versions are locked in `package-lock.json`; use `npm ci` for reproducible installs.

## Supabase development validation

```sh
npm run test:supabase-config
# After configuring the confirmed Cloud development project:
npm run check:supabase-cloud -- --confirm-development-project
```

Hosted migrations require explicit approval after reviewing the target and dry-run. No automatic Cloud setup, database reset or production mutation occurs. See [Cloud setup and troubleshooting](docs/supabase-cloud-setup.md) and [database security review](docs/security-review-task02b.md).

## Next task

Complete Task 03B authentication acceptance: finish the outstanding hosted tests documented in the final review before final acceptance or business modules. The [authentication foundation](docs/authentication-foundation.md) documents the current helpers, proxy, configuration and limitations. See [MVP scope](docs/project-scope.md).

## Authentication foundation

Set `NEXT_PUBLIC_SITE_URL` in ignored `.env.local` to the trusted application origin (local development: `http://localhost:3000`). Restart/rebuild after public env changes. Auth redirects and email links use this configuration rather than request Host headers.

```sh
npm run test:auth
# Optional local production HTTP smoke test (separate terminal):
npm run build
npm run start -- --port 3100
# Another terminal; localhost only:
npm run test:auth-routes -- http://127.0.0.1:3100
```

Login, registration, email verification and logout UI are implemented. The protected business pages remain placeholders. Hosted Auth settings/templates require separate approval. See [authentication design and email setup](docs/authentication-foundation.md).

Authentication UI is available at `/login`, `/register` and `/verify-email`;
`/dashboard` requires a verified Supabase session and reads the user's own profile.
See [Authentication UI review](docs/authentication-ui.md) for setup, current Cloud
redirect requirements, test results and the approval gate for hosted test accounts.
See [Task 03B-3 final review](docs/task03b3-final-review.md) for current hosted evidence and tests still NOT RUN. Local tests are not hosted proof.


For read-only development Cloud checks (public key only):

```sh
npm run test:auth-public-cloud -- gxbpprhivyxmtcqibncf
```

With `npm run dev`, an existing authenticated development user can visit
`/auth/validation` and run the explicit refresh, own-profile, protected-column
permission and concurrent-request checks. Column probes use an impossible
`id IS NULL` filter and never match a row. The page is unavailable in production.
It does not test cross-user RLS or naturally expired sessions. Never paste
passwords, JWTs or secret keys into reports or commit `.env.local`.
