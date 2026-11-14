# LOST finder response and two-direction return — 2026-11-09

> Update 2026-11-09: the approved Cloud activation and retained multi-user demo are now recorded in [hosted-demo-verification.md](hosted-demo-verification.md). Statements below about pending Cloud work describe the earlier local snapshot.

Implemented locally in `/home/atuna/campusfind-serverless` on the existing `feat/integrate-campusfind-mvp` branch. Existing uncommitted integration work, original migrations, `.env.local` and the separate `0614` worktree are preserved. No Git publication or hosted change is included.

## Business interaction

1. A posts a LOST item. B, who may hold it, opens its public detail and chooses **Tôi có thể đã nhặt được đồ này**.
2. B previews and submits a private description of the item and finding circumstances, keeping distinctive details for ownership verification. The response is visible only to B and reporter A. B may cancel while pending.
3. A opens incoming responses and chooses **Có thể là đồ của tôi**, or rejects a mismatch. Selection reserves one response; competing pending responses are rejected atomically. It does not verify ownership. The item remains OPEN during verification and can receive later queued responses.
4. A previews and sends private ownership evidence to selected holder B. It is immutable after submission. Unrelated accounts, competing responders and unrelated ADMIN cannot read it. A cannot verify their own evidence; B cannot submit it as A.
5. B compares the private evidence with the physical object. A matching decision persists holder verification, rejects later queued responses and sets the item IN_PROGRESS in one transaction. On mismatch the selected response becomes REJECTED and the item remains OPEN. Either party can withdraw an unverified selection, preserving its private history. Verification is not automated ownership proof; physical checks remain the holder's responsibility.
6. Verified parties use the existing campus proposal/revision/accept/change, explicitly consented/revocable contact and structured issue/resumption flow. These operations are blocked before verification. Pre-verification contact rows cannot be created.
7. B sees **Xác nhận đã giao đồ**; A sees **Xác nhận đã nhận đồ**. Each confirms only their own side. One confirmation leaves IN_PROGRESS; both atomically resolve. A can close the completed report. Both retain their private response/evidence history; resolved and closed items leave public discovery.

FOUND retains the inverse custody roles: reporter holds/delivers, claimant owns/receives. `participants.ts` resolves these roles centrally while database confirmation columns keep stable reporter/claimant identities. Independent LOST recovery remains available without a selected response and rejects pending responses; it cannot bypass an ongoing selected match.

## Database and interface

New additive migration: `supabase/migrations/20261109154529_lost_finder_response.sql`, generated with pinned CLI `migration new`. It adds nullable `owner_proof_text`, `owner_proof_submitted_at`, `ownership_verified_at` to existing RLS-protected claims. Existing participant SELECT policy and denied direct client writes are retained. No new public proof endpoint or secret is introduced.

New actions: `submit_found_response`, `submit_owner_proof`, `verify_owner`, `withdraw_match`, through the same JWT-authenticated Edge Function and public SECURITY INVOKER RPC. The private guarded entry uses an empty search path, verified actor/state checks and consistent item → claim locking. Its base implementation is not executable by members, so callers cannot bypass verification using a direct private-function call. Original migration files are unchanged.

Navigation, new/detail/list forms, report management and discovery guidance distinguish both directions. Evidence preview, Vietnamese labels, mobile layout and existing session/hydration protections remain. Owner proof stays in private history after verification or rejection. No image attachment or chat feature was added to finder responses; public report photos remain available through the existing private Storage flow.

## Validation

| Check | Final result | Evidence |
| --- | --- | --- |
| Lint, TypeScript, production webpack build | PASS | `/tmp/campusfind-lost-{lint,types,build}.log`; copied application uses loopback public environment, original Cloud env untouched |
| Node tests | PASS: 108 unique | Auth 32, reports 24, discovery 31, workflow 16, config 5; includes direction-specific actor/validation checks |
| Fresh migration application | PASS | All four migrations applied in sequence to a new disposable Docker Desktop project, no schema reset or remote link |
| SQL/pgTAP | PASS: 340 assertions | Final review 90, LOST response 59, security 75, existing workflow 116; tests roll back |
| Concurrent transactions | PASS: 15 groups | Existing 8 + LOST 7; selection, immutable evidence, duplicate verification, proposals/confirmations, recovery/response and verification/withdrawal races |
| Real local Auth/Edge/RPC/Storage | PASS: 17 groups | `/tmp/campusfind-lost-api.log`; full FOUND and LOST flows, mismatch, withdrawal/reselection and forbidden calls |
| Real production browser workflow | PASS: 12 groups | `/tmp/campusfind-lost-browser.log`; four isolated identities, FOUND regression and LOST finder response → owner proof → holder verification → meeting → correct delivery/receipt buttons → resolution/history |
| Mobile inspection | PASS | 390×844, screenshots reviewed and no horizontal overflow; `/tmp/campusfind-lost-browser-evidence/mobile-lost-owner-verification.png`, `mobile-lost-return-resolved.png` |
| Local database advisors | PASS | No issues at warning/error levels; `/tmp/campusfind-lost-advisors.log` |
| Hosted deployment and acceptance | NOT RUN | No hosted migration/function, Auth setting, test identity/data or Vercel operation |

All API/browser users, reports, claims, photos and handover fixtures are scoped to generated disposable IDs and cleaned by the runners. Database suites roll back. Test-only production app and Supabase processes are stopped after verification; no existing application or unrelated container is reset. Runtime credentials and environment files are excluded from Git.

Hosted migration/function deployment, hosted users/data, hosted cross-user acceptance and Vercel deployment require the original explicit approval. Local PASS does not establish hosted readiness. The frontend now requires both pending migrations and the current shared Edge validator before hosted workflow use.

## Remaining scope

No known local blocking defect remains after these checks. Finder responses currently contain private text, without attachments, automatic matching or chat. The holder performs physical ownership checks. Dispute adjudication/reassignment and notifications beyond the visible incoming/history screens remain outside this increment. The older completion/integration reports describe their original snapshots; this report and `mvp-workflow.md` describe both directions.
