# Task 06A — preflight and deployment status

Status: **preflight PASS; authenticated dashboard inspection complete; Cloud deployment NOT RUN pending explicit Cloud approvals.** No Vercel project, environment, deployment or Supabase configuration has been created/changed by this task.

## Verified source

- GitHub main: `9b0790953cc54a56ff41d636f3294cd6a7593bf9`.
- PR #6 security, #7 Reporting, #8 Search and #9 Auth form remediation: verified merged through GitHub metadata and local main history.
- Isolated branch: `chore/vercel-initial-deployment` at `/home/atuna/.codex/worktrees/vercel-initial-deployment/campusfind-serverless`.
- Next.js, direct @next/env and eslint-config-next: 16.4.3. Node requirement: 22+, .nvmrc 22; planned Vercel setting 22.x.
- No existing local Vercel link or vercel.json was found. Vercel CLI was not available on PATH at preflight. This does not prove that no Cloud project exists.
- Existing worktrees and local modifications are preserved, including the user's root next.config.ts and generated next-env.d.ts files in other worktrees.

## Current-baseline validation

| Check | Actual result |
| --- | --- |
| npm ci | PASS, exit 0 |
| npm run lint | PASS |
| npm run build | PASS, webpack, Next.js 16.4.3 |
| npm run typecheck | PASS after build |
| npm run test:auth | PASS, 32/32 |
| npm run test:reports | PASS, 22/22 |
| npm run test:search | PASS, 31/31 |
| npm run test:supabase-config | PASS, 5/5 |
| npm audit --omit=dev | PASS, zero findings |
| git diff --check | PASS, including proposed documentation through an external temporary index |
| GitHub Actions on deployment branch | NOT RUN; no source publication |

These checks were rerun on this baseline. The isolated preflight build has no deployed environment values and does not establish runtime connectivity, Auth redirects or hosted acceptance. No localhost or guessed domain was configured as a production deployment origin. Build-time Vercel values are still pending review and approval.

## Supabase read-only evidence

The connector verified campusfind-dev, reference `gxbpprhivyxmtcqibncf`, Sydney/ap-southeast-2, status ACTIVE_HEALTHY and PostgreSQL 17.11.0.003. A valid modern publishable key is available; no complete key value or environment export is included in this report.

Read-only metadata queries verified RLS enabled on profiles/items/item_images/claims and the item-images bucket still private, limited to 5 MiB and JPEG/PNG/WebP. There are currently zero OPEN/IN_PROGRESS reports. This privileged metadata query establishes project/database connectivity and configuration only; it is not anonymous Data API, cross-user RLS or positive hosted Reporting/Search/Storage acceptance.

The security advisor reports an existing WARN: leaked-password protection disabled. No setting was changed. That feature requires Supabase Pro or above according to its current documentation; no plan purchase or upgrade is proposed. [Remediation reference](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Authenticated dashboard inspection now verifies Site URL `http://localhost:3000` and exactly one Redirect URL, `http://localhost:3000/**`. Email confirmation is enabled, email authentication is enabled, and anonymous sign-in is disabled. The Confirm sign up preview links to `{{ .ConfirmationURL }}`. The dashboard states default templates are in use and custom SMTP is required to edit them. These are current UI observations, not values inferred from local config.toml. No email was sent and no setting was saved.

The existing PKCE callback flow is compatible with this default template: signup/resend generates the trusted origin plus `/auth/callback?next=%2Fdashboard` for the default destination. `/auth/confirm` remains available for supported token-hash links, but the observed template does not require changing to that flow. No template, SMTP or Auth provider change is proposed. Once the actual stable domain is verified, propose changing Site URL to that HTTPS origin and retaining the existing localhost redirect while adding only the scoped production callback entry. That domain-specific change requires its own approval; no unrestricted preview/global wildcard is proposed.

## Vercel inspection / required decision

The user confirmed sign-in to both dashboards. Vercel identifies the signed-in account as `nguyenanhtuan13022005-5305`, active scope **Atunas** (`atunas`), plan **Hobby**. Its project overview shows “Deploy your first project” and no projects, so there is no existing CampusFind project to duplicate in this scope. Account Authentication explicitly shows “Connect your GitHub account”; GitHub is not linked to this Vercel account and repository access has not been granted/verified there. No connection or permission change was made.

The Import screen requires a Git provider and also exposes “Create an empty project.” No Create/Connect/Deploy operation has been invoked. There are no existing project settings or assigned deployment domains to inspect. A stable production origin must be read from the actual project's Domains configuration after approved project creation, rather than guessed from the desired name. No site-origin value will be configured or built before that verification. If the empty-project flow would initiate a deployment, stop before its final action and request the deployment-specific approval instead.

Intended project: campusfind; repository aanhtuan/campusfind-serverless; framework Next.js; repository root; npm ci; npm run build with webpack; Node 22.x; production branch main; existing Hobby/free scope only. Account/team and plan are now verified; the real domain remains unassigned until approved project setup. Three public variable names are planned: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and NEXT_PUBLIC_SITE_URL. Values/scopes will be reviewed without exposing credentials.

Vercel's documented first-deployment behavior conflicts with a literal Preview-first sequence for a new project: the first attempt targets Production even with --target=preview. If the actual project has no deployment history, a separately approved exception/staged initial deployment procedure is required. No bootstrap, failed dummy deployment, automatic domain assignment or promotion has been attempted. See the deployment guide for the proposed staged alternative and its approval boundary.

## Infrastructure and acceptance matrix

| Component / evidence | Status |
| --- | --- |
| Patched integrated main / local essential checks | PASS |
| Supabase project health and metadata connectivity | PASS, read-only administrative connector |
| Vercel account/team/plan and project-existence review | PASS: Atunas/Hobby; no project; GitHub not linked |
| Stable domain and actual project build settings | NOT RUN: project does not yet exist |
| Hosted Auth URL/template read-back | PASS: localhost:3000; one localhost redirect; default ConfirmationURL; confirmation enabled |
| Cloud mutation approvals | PENDING: specific empty-project-only approval proposed below |
| Preview deployment ID / URL / timestamp | NOT RUN; none created |
| Production deployment ID / URL / timestamp | NOT RUN; none created |
| Public deployed route / runtime / HTTPS checks | NOT RUN |
| Deployed verified-user login/session/logout | NOT RUN |
| Hosted Reporting / Search / private-photo acceptance | NOT RUN; no fixture approval or active reports |
| Deployed cookie attributes / cache isolation | NOT RUN |
| Deployed mobile viewport / real-device checks | NOT RUN / NOT RUN |
| Claims, Return workflows and Edge Functions | NOT IMPLEMENTED in this MVP increment |
| Human password rotation after the earlier incident | UNCONFIRMED |

Source review confirms the existing proxy verifies getUser, preserves cookies and adds Secure on HTTPS refresh responses; private/no-store protections and the form remediation are present. The browser SDK uses browser-readable SameSite=Lax cookies and has no explicit Secure override in its browser factory. Inspect actual HTTPS cookie attributes before Production acceptance; this pending item is not marked PASS. No Auth redesign or speculative cookie patch is included.

## Prepared repository changes / next steps

Only two documentation files are proposed: docs/vercel-deployment.md and this report. No application code, dependencies, migration, RLS/Storage policy, Auth setting or vercel.json change is currently necessary for the reviewed platform configuration. No CI workflow is imported from the old Auth worktree. Main currently has no GitHub Actions workflow; initial checks are manual, and CI automation remains a separately reviewable improvement.

The complete patch and exact file manifest are in `/tmp/campusfind-task06a-review/`. The real index remains empty; no commit, push, PR or merge is authorized by this task without separate approval.

## Exact approval proposal — stage A, no deployment

| Item | Confirmed state / requested scope |
| --- | --- |
| Vercel account/team | nguyenanhtuan13022005-5305 / Atunas (atunas) |
| Plan/cost | Hobby; existing free scope only; no paid integration, plan, domain purchase or billing change |
| Project | Create one empty project named campusfind in Atunas; stop if a matching project appears or creation implies deployment |
| Eventual source | aanhtuan/campusfind-serverless, main, 9b0790953cc54a56ff41d636f3294cd6a7593bf9 |
| Framework/build target | Next.js, Node 22.x, repository root, npm ci, npm run build retaining webpack |
| Actual domain | None assigned/verified yet; read actual Domains information after creating the empty project |
| Environment plan | NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for Production and Preview; NEXT_PUBLIC_SITE_URL from the verified stable HTTPS origin, scoped explicitly before any build |
| Supabase now | Site URL localhost:3000; localhost:3000/** retained; confirmation enabled; default ConfirmationURL template |
| Auth change proposal | After domain verification, present exact new Site URL and scoped callback entry for separate approval; templates/providers/confirmation unchanged |
| First application deployment | Production per Vercel's first-deployment rule, not Preview; no deployment included in stage A |
| Cloud mutation requested now | Create the empty campusfind project only; inspect assigned/available Vercel domain and settings |
| Deferred actions | GitHub connection/repository access, project build-setting writes, environment changes, Supabase Auth updates and first deployment all await the next exact proposal/approval |

Stage A resolves the dependency between creating a project and discovering its actual domain without guessing a build-time trusted origin or accidentally importing/deploying Production. If a free Vercel-generated domain needs a separate assignment, present that exact domain before adding it. Do not buy a domain. Merely creating an empty project does not make its first application deployment a Preview.

After stage A, present actual project ID/domain plus exact environment/Auth changes and the GitHub repository permission scope. Prefer an explicitly approved initial staged Production build with automatic production-domain assignment disabled, if the actual controls permit it. Then perform real Preview/read-only review and obtain separate public Production promotion approval. A normal dashboard Git import can initiate Production and must never be treated as a harmless Preview operation.

No deployments or Cloud writes were executed in this inspection. The preflight tests were not repeated because application source/configuration did not change. Two screenshots outside source record the Atunas/Hobby empty project overview and current Supabase URL configuration. GitHub authentication/consent must be handled without reading or exporting credentials, with repository permissions kept to CampusFind.

Hosted fixtures and emails require their own approval, and password rotation remains a human confirmation item. Local build and metadata checks are not a hosted Reporting/Search/Storage PASS.
