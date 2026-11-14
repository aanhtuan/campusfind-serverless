# CampusFind MVP audit — 2026-11-05

Baseline: `origin/main` / `9b0790953cc54a56ff41d636f3294cd6a7593bf9`, fetched before implementation. Clean detached checkout, then dedicated branch `feat/complete-campusfind-mvp`. Other worktrees are preserved. This is the **before implementation** matrix; see `mvp-completion.md` for final evidence.

| Feature | Current status verified in source | Missing work | Priority |
| --- | --- | --- | --- |
| Authentication | Registration/login/verification/logout, verified SSR identity, protected session boundary; native form credential fix merged | Extend protected routes; retain hosted acceptance gaps | P0 |
| Reporting | Owner-scoped create/edit/history, three private photos, in-tab compensation | Durable orphan discovery; controlled resolution/closure | P1 |
| Discovery | Active text listing/detail, filters, bounded pagination, member-only photos | Eligible claim action, integrated navigation | P1 |
| Claims | Private table, immutable evidence trigger, unique active claim constraints; `/my-claims` empty | Submit/review evidence, cancel, list/detail/history | P0 |
| Claim review | No endpoint or UI; direct client writes denied | Atomic item-first locking, one approval, competing rejections | P0 |
| Handover | Absent | Private arrangement, proposal/version/accept/change, optional consent-based contact | P0 |
| Return confirmation | Absent; status grants correctly deny clients | Separate participant confirmations; atomic completion; dispute recovery | P0 |
| Admin | Role stored in own profile; no admin UI | Minimal role-checked aggregate overview and issue triage without evidence/contact | P1 |
| Cloud deployment | Local configuration and Cloud setup docs; no deployed workflow | Edge function/config/runbook; local evidence and explicit deployment gate | P1 |

## Dependencies and boundaries

Read application routes, feature services, SSR/proxy clients, both migrations, SQL tests, concurrency script, project scope, database/RLS design, Auth security/final reviews and reporting/discovery reviews. Prior reports describe historical snapshots; the credential fix is present on this baseline.

`items` is public text for OPEN/IN_PROGRESS; terminal history is reporter-only. `claims` permits participant SELECT, no client writes, with one APPROVED/item and one active claimant/item. Claim trigger locks the parent item, freezes identity/evidence, permits only PENDING to terminal decisions. Item status grants are backend-only. Image metadata has three slots; Storage is private and owner-scoped, with no upsert.

Approval cannot safely be implemented as separate HTTP updates. New workflow RPCs must lock item before claim/handover rows and recheck state. Private-schema implementation functions will perform explicit `auth.uid()` authorization; narrowly scoped public invoker wrappers are the Data API surface. No actor ID or role comes from the request. ADMIN receives no implicit private-data rights.

Minimum additions: handovers (one per approved claim, revisioned proposal and separate confirmations), optional participant-owned consent/contact rows, operational issues with separately permitted admin-safe summaries. Preserve existing migrations, tables, claim statuses, Storage model and Auth behavior. New versioned migration only; no hosted SQL, fixtures, settings, deploy or Git publication authorized.

A successful local/mock check is not hosted acceptance. Initial local Docker desktop socket is unavailable and system Docker socket denies access; rootless Podman is available and will be evaluated for disposable database execution.
