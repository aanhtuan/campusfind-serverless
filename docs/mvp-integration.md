# Current Vietnamese UI integration — 2026-11-05

> Historical integration snapshot from November 5. LOST finder responses were added on November 9; see [current LOST workflow](lost-finder-workflow.md).

## Delivered source and active app

Integrated into `/home/atuna/campusfind-serverless`, branch `feat/integrate-campusfind-mvp`, based on fetched `origin/main` commit `768365c69b7aa73e8704b9fffb29d5e38accc6f9` (Vietnamese soft neo-brutalism UI). The existing development server on port 3000 uses this checkout and reloads these changes. No commit, push, PR, merge or Cloud mutation was performed. The original `0614` implementation worktree remains separate and preserved.

The current landing page, report/discovery layouts, header/footer, photo manager and protected layout are retained. Claim, reviewer, handover, return and admin screens now use Vietnamese labels and matching cards. Header links include incoming claims and database-role-checked admin navigation; logout works across member pages. FOUND detail provides a sign-in, submit, follow-up or owner-review entry according to the verified user and existing claim. LOST reports do not offer an ownership claim. The obsolete “Claim in next version” notice is removed. `IN_PROGRESS` displays “Đang bàn giao”.

The new source includes private evidence preview/submission/cancellation, atomic reviewer decisions, private versioned meeting arrangements, optional consented/revocable contact, separate return confirmations, issue acknowledgement and joint resumption, owner closure, independent LOST resolution and staged-upload recovery. See [architecture/workflow](mvp-workflow.md), [original feature matrix](mvp-completion.md) and [current exact file manifest](mvp-files.md).

## Repeated integration validation

| Check | Result | Scope/evidence |
| --- | --- | --- |
| ESLint and TypeScript | PASS | `npm run lint`, `npm run typecheck`; zero warnings/errors |
| Production webpack build | PASS | Same integration sources, separate copied app with loopback public environment; `/tmp/campusfind-integration-build.log` |
| Node suites | PASS: 106 unique tests | Auth 32, reports 24, search 31, workflow 14, Supabase config 5; workflow suite counted once |
| Fresh local migrations | PASS | All three applied to a named disposable Docker Desktop stack; no hosted migration |
| pgTAP | PASS: 278 assertions | final review 89, security 75, workflow 114; transactions rolled back |
| Concurrent transactions | PASS: 8 groups | Photo cap, duplicate claims, competing decisions, closure race, revision race, atomic confirmations |
| Auth → Edge → RPC → Storage | PASS: 14 API groups | Real isolated local services, synthetic users, scoped cleanup; `/tmp/campusfind-integration-api.log` |
| Production browser interaction | PASS: 9 groups | Four independent accounts including explicit local ADMIN; mobile claim, private isolation, review, meeting, consent/revoke, issue/resume, network recovery, two confirmations, history/closure; `/tmp/campusfind-integration-browser.log` |
| Mobile visual inspection | PASS | 390×844, no horizontal overflow; screenshots under `/tmp/campusfind-integration-browser-evidence` |
| Local database advisors | PASS | No warnings/errors; `/tmp/campusfind-integration-advisors.log` |
| Production dependency audit | PASS | Zero vulnerabilities in `npm audit --omit=dev` |
| Active port 3000 read-only smoke | PASS | Existing public LOST detail HTTP 200, obsolete notice absent; anonymous `/incoming-claims` redirects to login. No eligible public FOUND item existed for live Cloud CTA verification. |
| Hosted workflow acceptance / deployment | NOT RUN | Hosted schema/function deployment and fixture creation are separately gated |

Browser validation first exposed a translated meeting-option value regression. Explicit canonical option values fixed it; production build and all 9 browser groups then passed. Docker Desktop initially denied `/tmp` function mounts; disposable stack preparation now defaults to `~/.cache/campusfind-tests`, with `LOCAL_SUPABASE_WORKDIR_ROOT` override. API/browser runners support explicit Docker or Podman, default Docker. No global Docker settings or permissions were changed by this integration.

## Remaining release boundary

The actual checkout's existing `.env.local` still points to `campusfind-dev` (`gxbpprhivyxmtcqibncf`) and was preserved. The read-only Cloud snapshot contains only the two foundation migrations and no Edge Functions. Therefore source integration at port 3000 does **not** make hosted claim mutations operational yet.

Required reviewed artifacts are exactly:

- `supabase/migrations/20261105065313_claims_handover_workflow.sql` (additive workflow schema, guards, RLS and transactional RPCs).
- `supabase/functions/workflow/index.ts` plus `_shared/validation.ts` (caller-authenticated mutations, JWT verification enabled).

The original request explicitly requires approval before hosted migration/function deployment, hosted test identities/data and Vercel deployment. Those actions remain NOT RUN. See [ordered deployment and recovery procedure](mvp-deployment.md). No Vercel project, domain, Auth setting or hosted role was changed. Local test identities and records were cleaned; production dependency audit does not assess dev-only dependency risks.

Outstanding severity: no known local critical/high defects after these checks; high release dependency is the unapplied Cloud migration/function, medium is unexecuted hosted cross-user acceptance and operator provisioning. Full dependency audit previously reported dev-only moderate findings; no dependency upgrade is included in this integration.
