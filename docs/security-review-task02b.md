# Task 02B — Final security and architecture review

Date: 12 October 2026. Branch: `feat/database-architecture`. Base: `1df5608`.

## Recommendation

**PASS for Task 02B's database architecture, local migrations and RLS scope.** No Critical/High exploitable client-authorization defect was found in the reviewed application SQL. This is a recommendation to review/publish the schema work after explicit approval, not approval to enable production Auth/Storage/claim workflows. The Medium integration dependencies below must be addressed before those workflows accept real users.

No SQL migration change was necessary after inspection and negative testing. The review added a second test suite (85 assertions), updated validation documentation and created this report. Nothing was staged, committed, pushed, merged, published as a PR or deployed remotely.

## Findings and concerns

Severity describes impact if the relevant capability is exposed. Dependencies explicitly deferred by Task 02B are not treated as currently exploitable client bypasses.

### F1 — Medium: upload objects are not limited by the three metadata slots

- Reference: `supabase/migrations/20261012000200_private_image_storage.sql:9–16`; `supabase/tests/database/final-review.test.sql:85`.
- Explanation: a reporter can insert a Storage object at a valid owned path without registering `item_images`. The maximum of three metadata records is enforced correctly, but it is not an object count or per-user byte quota. Registration failure/deletion can leave orphaned uploads. A single-object 5 MiB limit does not cap total usage.
- Evidence: the new SQL regression test positively demonstrates an unregistered own-path object insert and proves other users cannot read it. This is metadata/policy evidence; no physical file was uploaded.
- Recommended fix: before opening upload capability, implement trusted upload reservation/orchestration, per-user/report quotas, compensation, and scheduled orphan cleanup. Reserve/check metadata before signing uploads and account for in-flight uploads/deletions; simply adding an EXISTS check does not make separate Storage/metadata operations atomic. Use the Storage API for physical deletions.
- Status: documented future upload-workflow dependency. Not a bypass of item ownership or the registered-image limit.

### F2 — Medium: service-role grants do not authenticate a human approver

- Reference: `supabase/migrations/20261012000100_application_schema.sql:131–164,193–194`; `docs/database-design.md:127` (status-workflow section).
- Explanation: the service role can read private claims and execute valid status changes irrespective of a human JWT. The guards validate state, FOUND/non-self rules and uniqueness, not whether the request came from the reporter. A later backend that trusts a caller-supplied actor ID or performs claim/item updates in separate HTTP requests would violate authorization/atomicity requirements.
- Recommended fix: future Edge Functions must validate the session, derive the actor from verified Auth, require the reporter for approve/reject and claimant for cancel, and call a narrowly granted transaction/RPC that locks the item before claim rows and updates related state atomically. Add adversarial API tests. Never expose the service key or a generic privileged proxy. [Supabase documents the service-role RLS bypass](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Status: explicit later-task dependency. No client claim writes, approval RPC or Edge Function is exposed by Task 02B. Concurrent approved/active constraints and closure serialization are tested.

### F3 — Medium: Auth/Storage API integration is not verified

- Reference: `supabase/tests/database/security.test.sql:114–117`; `supabase/tests/database/final-review.test.sql:80–89`; `supabase/config.toml:38–42`.
- Explanation: SQL SET ROLE/JWT-context tests verify database authorization, but not gateway JWT validation, real signup events, Storage owner_id population, MIME/size checks, upload compensation or signed URL expiry. The Storage DELETE test deliberately simulates the Storage API transaction flag on rolled-back SQL metadata. It does not prove an HTTP upload/delete path works.
- Recommended fix: in Supabase Development Setup and Authentication, start the API services and test real signup/login, expired/malformed tokens and unauthenticated requests. In the upload task, test physical uploads, ownership, MIME/size rejection, failed registration, deletions and signed URLs with two users.
- Status: NOT RUN, a release validation gate. The reported SQL PASS does not cover these operations.

### F4 — Low: SECURITY DEFINER owner has more privilege than its body requires

- Reference: `supabase/migrations/20261012000100_application_schema.sql:72–81,224–225`.
- Explanation: the profile-creation function is owned by the migration owner (`postgres` in the local database), which bypasses RLS. The current function is narrow: literal USER role, one schema-qualified INSERT, empty search_path, no dynamic SQL, no client schema/EXECUTE grants. No input-driven escalation path was found. A future expanded body would inherit this powerful owner.
- Recommended fix: preserve the narrow function and review any body/owner change. Consider a dedicated NOLOGIN/NOBYPASSRLS owner with only the required profile INSERT columns and a specific insertion policy when hosted role-management requirements are agreed. Such a role must be provisioned reproducibly and must not be inherited by client roles. Do not broaden EXECUTE or expose the internal schema.
- Status: defense-in-depth recommendation, not a demonstrated vulnerability; 85 added review assertions include function ACL/search_path checks.

### F5 — Low: authenticated account does not prove campus membership

- Reference: `supabase/config.toml:42`; `supabase/migrations/20261012000100_application_schema.sql:209–212`.
- Explanation: signup is configured locally and any authenticated UUID with a profile can create a report. Application ADMIN is correctly not an RLS bypass. University affiliation, verification and campus isolation are not represented in this task's four-table schema.
- Recommended fix: agree on a single-campus eligibility policy and enforce verified membership through Auth configuration/hooks or a later reviewed membership model before opening member features. Do not trust editable raw_user_meta_data for affiliation or roles.
- Status: product/access-design dependency, not a violation of the current authenticated-only reporting rule.

## Security checks that passed

- Effective grants (including inherited/table-wide grants) prohibit every protected item/profile column and client-provided image slot/id/timestamps.
- anon/authenticated are non-login, non-superuser, non-BYPASSRLS roles and do not inherit service_role.
- All four application tables have RLS enabled. Claims have no anon SELECT and no authenticated INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER/REFERENCES rights.
- ADMIN outsider cannot read private evidence, edit someone else's item, change role or approve directly. Missing JWT identity cannot obtain private profile/claim access or spoof the reporter.
- Reporter/item identity and type are immutable; only permitted fields are client-editable.
- Image metadata ownership and Storage path/owner_id checks reject cross-user or invalid paths. Private/unregistered/terminal-report images are hidden from non-owners as designed; client overwrites/moves are rejected.
- Claimants and reporters retain private evidence access; unrelated users, including ADMIN, have no evidence access. Service-role/owner access is an explicit trusted backend boundary.
- Exactly one function is SECURITY DEFINER, all five internal functions pin an empty search_path, and effective EXECUTE/USAGE privileges are denied to anon/authenticated/service_role.
- Uniqueness, FK, CHECK and transition constraints apply even when the service role bypasses RLS.

## Reproducibility and test results

The task-specific local project is `campusfind-task02b`, PostgreSQL 17, CLI 2.120.0. No hosted project is linked. Before reset, a live count confirmed zero rows across Auth users, four application tables and Storage objects. `supabase db reset --local` then recreated the database and successfully replayed both migrations in order.

| Check | Final result |
| --- | --- |
| Fresh local migration replay | PASS: both migrations applied without errors |
| Existing SQL suite | PASS: 75 assertions |
| Added final-review SQL suite | PASS: 85 assertions |
| Total SQL security assertions | **160 PASS** |
| Concurrent fourth-image prevention | PASS at READ COMMITTED and REPEATABLE READ |
| Concurrent duplicate active claims | PASS |
| Concurrent APPROVED claims | PASS |
| Claim insert after competing item-close lock | PASS |
| Database lint, public + campusfind_private | PASS, no schema errors |
| npm lint / typecheck / production build | PASS |
| Production dependency audit | PASS, zero vulnerabilities |
| Whitespace check including new files | PASS |
| Auth/Storage HTTP, signed URLs, deployed workflows/CI | NOT RUN |

The five concurrency cases used independent PostgreSQL sessions and cleaned up only their fixtures. Unique image slots enforce the cardinality even when a snapshot is stale. Claim guards acquire the same parent lock as item updates; partial unique indexes provide a final atomic guard. Future multi-row transactions must acquire parent locks first and handle deadlock/serialization errors. A table owner/superuser/service role can bypass RLS; the review does not claim protection from leaked privileged credentials or deliberately altered grants/policies.

There are no broader Storage policies in the reviewed local database: only this task's three bucket-scoped policies exist. A future permissive policy would combine with OR and could widen access; review policy additions. Existing untrusted views/RPCs must also be audited when integrating into a nonempty hosted project. FK/unique checks can reveal existence through errors; no client writes to claims exist here, and image allocation only locks an owned writable item. [PostgreSQL documents these RLS boundaries](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).

## Re-run commands

From the task worktree, using only its disposable local database:

```sh
npx --no-install supabase start -x gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
# ONLY if the local database is disposable and has no work to preserve:
npx --no-install supabase db reset --local
npx --no-install supabase test db
python3 supabase/tests/concurrency.py --confirm-disposable-local
npx --no-install supabase db lint --local --schema public,campusfind_private --level warning
npm run lint
npm run typecheck
npm run build
npm audit --omit=dev
git diff --check
npx --no-install supabase stop
```

The local database is stopped after review, with volumes retained. Review the diff in VS Code and wait for explicit approval before publishing any changes.
