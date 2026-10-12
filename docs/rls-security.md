# CampusFind RLS and security — Task 02B

The migrations combine explicit SQL privileges with RLS. An owner policy alone does not protect role/status columns: table-wide write privileges are revoked and replaced by column grants. Authenticated ADMIN users receive the same client permissions as USER users. Service-role credentials are server-only and are not present in repository files.

## Access matrix

| Table | anon | authenticated | trusted service_role |
| --- | --- | --- | --- |
| profiles | No access | Read own row; update own `display_name` only | Read/insert/update; no DELETE |
| items | Read OPEN/IN_PROGRESS | Public read plus own terminal reports; create own OPEN reports; edit permitted columns on own reports | Read/insert/update; no DELETE |
| item_images | No access | Read images of visible reports; insert/delete for own reports | Read/insert/delete; no UPDATE |
| claims | No access | Read only own claims or claims on own reports; no writes | Read/insert/update; no DELETE |

RLS is enabled on every application table. The migration revokes inherited grants from PUBLIC, anon, authenticated and service_role on these new tables, then regrants only the operations above. `items` INSERT grants exclude status/id/timestamps; UPDATE grants exclude status/reporter/type/id/timestamps. `profiles` UPDATE grants exclude role/id/timestamps. No client claim write policy or grant exists. No public profile view exposes private data.

Policies use `auth.uid()` from Supabase's verified JWT context. A guest token is the `anon` role, not a PostgreSQL superuser. Missing user identity cannot pass ownership checks. Supabase anonymous Auth accounts, if enabled in a later setup, use `authenticated` and would receive member access unless signup/membership checks are added.

RLS limits which rows are returned, including SQL joins used by image and claim policies. Reporters can read their own terminal reports so claims remain visible to them. Claimants can still read their own proof after the item is closed; other users cannot read it. No ADMIN exception expands private evidence access.

## Privileged automation review

Only `campusfind_private.create_user_profile()` is SECURITY DEFINER. It is needed because an Auth-triggered insert must create a profile without allowing clients to create profiles. It uses an empty explicit `search_path`, schema-qualified references, no dynamic SQL, no metadata-derived role, and only inserts the new Auth UUID with literal role USER. Its owner is the migration owner (normally postgres), so its body and ownership must be reviewed when deploying. EXECUTE and schema access are revoked from public client roles, and the schema is not exposed by the Data API. SQL access to auth.users remains Supabase-managed; client users cannot create arbitrary Auth rows.

All other trigger functions are SECURITY INVOKER with an empty `search_path`. Profile/item/claim timestamp triggers set database time. Item guards enforce immutable identity/type and valid transitions. Claim guards enforce identity, FOUND/non-self/active-item invariants and transitions. Image allocation locks a writable item and uses unique slots. Trigger invocation itself does not require client EXECUTE privileges; clients cannot call these functions as RPCs.

The service role bypasses RLS but remains subject to CHECK/FK/unique constraints and triggers. It can modify role/status through its grants. It cannot identify a human reviewer on its own. Only the reporter should approve/reject through the later trusted workflow; only the claimant should cancel. Those actor checks and transactional RPC endpoints are **not implemented** here. There is no callable approval API in this task.

## Storage policies

The migration adds INSERT/SELECT/DELETE policies scoped to `item-images` on Supabase-owned `storage.objects`. It does not replace Storage's global grants, enable a public bucket, or modify Storage internals. Private object read requires authentication. Other members need a visible `item_images` row; the reporter may preview/clean up unregistered objects. Object write/delete ownership is based on the immutable report relationship and validated path; uploads also verify `owner_id`. No UPDATE/upsert/move policy exists.

These policies assume no additional permissive policies grant wider access to this bucket. Future migrations or Dashboard changes must review that assumption: PostgreSQL permissive policies combine with OR. Likewise, do not add table-wide authenticated UPDATE grants; those would defeat protected-column restrictions. Bucket MIME/size limits are enforced by the Storage API, not by a SQL insert of object metadata.

## Local validation commands

Run from the task worktree with Node.js 22+, Docker, and Python 3.11+ for the concurrency script. CLI is pinned in devDependencies.

```sh
npm ci
npx --no-install supabase --version
```

Start the isolated local database. The excluded services are unnecessary for SQL tests; the CLI initializes real Supabase Auth/Storage schemas during local database setup. API endpoints, Studio, Auth login and actual Storage uploads are unavailable in this database-only run.

```sh
npx --no-install supabase start -x gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
npx --no-install supabase test db
python3 supabase/tests/concurrency.py --confirm-disposable-local
npx --no-install supabase db lint --local --schema public --level warning
npx --no-install supabase db lint --local --schema campusfind_private --level warning
npm run lint
npm run typecheck
npm run build
git diff --check
```

For a fresh disposable database replay only, after confirming it contains no work to preserve:

```sh
npx --no-install supabase db reset --local
```

`db reset --local` destroys local data; it is not necessary for an already-migrated database. Never use `--linked` for these tests. Do not run `db push`, `link` or remote resets as part of Task 02B. SQL fixtures use `example.invalid` emails, not real accounts. pgTAP tests run in one rolled-back transaction. The concurrency script uses only the Docker container named from this task's config, refuses a different project ID, and cleans up only its UUID-tagged fixtures. Run it only in this disposable local project.

To stop this task's local services while retaining local volumes:

```sh
npx --no-install supabase stop
```

## Verified results (12 October 2026)

| Check | Result / boundary |
| --- | --- |
| Both SQL migrations | PASS on a fresh Supabase local PostgreSQL 17 database |
| pgTAP security suite | PASS: 160 assertions across two suites under actual anon/authenticated/service_role and owner roles |
| Concurrent fourth-image prevention | PASS at READ COMMITTED and REPEATABLE READ; at most three records |
| Concurrent duplicate active claims | PASS; exactly one insertion succeeds |
| Concurrent claim approvals | PASS; exactly one APPROVED claim |
| Claim insert racing item closure | PASS; creation waits for lock, then rejects CLOSED item |
| Database lint | PASS for public and campusfind_private; no schema errors |
| Next.js lint/typecheck/build | PASS; no application environment variables needed |
| Git whitespace validation | PASS |
| Hosted database / hosted CI | NOT RUN |
| Auth signup/login API integration | NOT RUN; only real auth.users insert trigger tested |
| Storage upload/download API, MIME/size, physical files, signed URLs | NOT RUN; SQL RLS policies tested only |
| Edge Function workflow and actor checks | NOT RUN; functions are a later task |

The pgTAP suite covers profile creation, metadata role escalation, own/cross-user profile writes, report creation/spoofing, anonymous public reads, private terminal reports, forbidden identity/status/type writes, direct claim write rejection, proof privacy, approved/active uniqueness, FOUND/non-self/active-item rules, FKs/CHECKs, image slots/paths, and Storage ownership/visibility. Expected failures are executed as the actual current role, not through a definer function.

Supabase's current Storage schema blocks direct SQL DELETE even before row policies are evaluated. The rolled-back Storage policy tests simulate the Storage API transaction's `storage.allow_delete_query` flag using metadata fixtures only, without weakening the installed guard or uploading/deleting files. Production file operations must go through Storage API. This is policy verification, not end-to-end Storage verification.

Final review: [Task 02B security review](security-review-task02b.md). The final-review suite adds 85 assertions for effective grants, function ACLs, ADMIN isolation, missing JWT identity and additional Storage restrictions. Both migrations were replayed successfully with `supabase db reset --local` after confirming zero application/Auth/Storage rows.

## Remaining dependencies

- Approve single-campus membership verification, account retention/deletion and ADMIN provisioning.
- Build browser/server Auth clients and session handling without exposing service-role credentials.
- Implement authenticated Edge Functions with reporter/claimant checks and narrowly scoped transactional RPCs for claim/status workflows.
- Add upload compensation, orphan cleanup, quotas, physical file validation and privacy controls.
- Test Auth and Storage APIs end to end, JWT expiry/revocation, and deployed RLS before enabling real user data.
- Resolve the foundation's existing five development-only ESLint audit findings when upstream provides a compatible fix; Task 02B does not change their status.

Next task: **Supabase Development Setup and Authentication**. No changes in this task are committed, pushed, merged or deployed.

## References

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security)
- [Supabase Auth profile automation](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase function security](https://supabase.com/docs/guides/database/functions)
- [Private Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [PostgreSQL 17 row locks](https://www.postgresql.org/docs/17/explicit-locking.html)
- [PostgreSQL partial unique indexes](https://www.postgresql.org/docs/17/indexes-partial.html)
