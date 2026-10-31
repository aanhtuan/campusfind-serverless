# Task 04B — Search & Discovery review

Status: **local implementation PASS; ready for review. Full positive hosted Search/photo E2E NOT RUN because the development project has no active reports.** Read-only Cloud checks are recorded separately below. No hosted fixtures were created.

## Baseline and scope

- Isolated worktree: feat/item-search, created from origin/main at `4abe1a83c93f03b6031212c89899b3ee7d236f3f`, the merge of Reporting PR #7.
- Next.js, direct @next/env and eslint-config-next remain **16.4.3**, including security PR #6.
- Existing worktrees and local modifications are preserved. No develop synchronization, Authentication rebuild, Reporting business-logic modification, migrations, RLS/Storage policy changes, Cloud settings, Edge Functions, Claims implementation or deployment.
- package.json adds only test:search; package-lock.json and dependency declarations match main. The homepage adds a Browse items link and allows that navigation to wrap on mobile.

## Functionality

`/items` provides public active-item listing, title search, LOST/FOUND filter, category filter, location search, clear-all action, empty/no-results/error/loading states and 12-item pagination. Results use created_at descending with id descending as a deterministic tie-breaker. One extra row determines whether a next page exists; no full-table download or total-count query is required.

`/items/[id]` validates UUIDs and displays title, type, category, plain-text description, location, event date, status and creation date. Missing, malformed and unavailable items return the not-found state with HTTP 404. Claims are an informational future-release notice, with no submit/approval action.

Both public listing and detail explicitly select only OPEN/IN_PROGRESS records, including for signed-in owners. Terminal owner reports remain in the protected My reports module. This keeps the public detail text public-safe when a session ends. The request's normal user/anonymous context and existing RLS still enforce access.

## Search design and data access

- Server Components use the existing request-scoped Supabase SSR client. Public browsing does not call requireUser or require login; authenticated requests use their existing session under RLS.
- List fields: id, type, title, category, location, event_date, status. Detail adds description and created_at. No reporter_id, email, profiles, claims or image paths are selected into public page props.
- These are UI/data-minimization allowlists. Existing anon SELECT grants cover all item columns, including reporter_id and updated_at; omitted columns are not made confidential by this UI. No claim of new column-level secrecy is made.
- Keywords search titles using ILIKE contains; description searching is intentionally not included in this first implementation. Location also uses case-insensitive contains. Category is exact, matching existing free-text data and shared Reporting suggestions.
- User input is passed through scalar SDK filters, never interpolated into a raw PostgREST OR expression. Literal percent, underscore and backslash are escaped. Asterisk is rejected because PostgREST aliases it to a LIKE wildcard; the UI shows validation feedback instead of silently widening the query.
- Limits: query 120 characters, category 80, location 200; control characters/repeated known parameters/invalid types or pages are rejected. Pages are integers 1–10000. Unknown parameters are ignored and cannot override status, projection, limit or ownership.
- GET filter forms omit page, resetting pagination on apply. Page links use URLSearchParams to preserve/encode active filters. Browser Back/Forward works without client-only search state.
- Existing indexes were reviewed: discovery/location/owner B-trees and a GIN expression over combined text. There is no named search-vector column to assume. Substring ILIKE is not claimed to use that GIN index, and can scan at larger scale. No performance benchmark or speculative migration/index has been added.
- force-dynamic pages, uncached SDK requests and existing private/no-store proxy headers prevent sharing session-dependent server output.

## Private photo strategy

Cards use a neutral placeholder and link to details; they do not issue per-card Storage requests. The detail's client gallery receives only itemId, so no photo metadata/object path or bearer URL is serialized into anonymous HTML.

The gallery verifies the current user through getUser before requesting up to three item_images records under RLS. Anonymous visitors see a sign-in placeholder and make no metadata/download request. Verified members may download registered images of visible active reports as existing Storage RLS permits. Member visibility of another reporter's active photos is expected policy behavior, not owner-only evidence access.

Downloads use the existing private item-images bucket, Authorization through the SDK, fetch cache no-store and an AbortController. Images use temporary Blob URLs, not getPublicUrl, signed links or a shared image optimizer. Session events immediately hide old photos and invalidate pending work; verification runs outside Auth callbacks. Visibility/page lifecycle events recheck access. Cleanup aborts requests and revokes URLs; stale verification/load/download completion cannot repopulate a signed-out or newer-identity view.

No service-role key, new upload/remove operation, privileged signer or policy weakening is introduced. Photo actions remain read-only in this module. Existing Reporting uploads/orphan behavior is unchanged.

## Test results

| Check | Result / boundary |
| --- | --- |
| npm ci | PASS, exit 0 |
| npm run lint | PASS, exit 0 |
| npm run build | PASS, Next.js 16.4.3, exit 0 |
| npm run typecheck | PASS after build, exit 0 |
| npm run test:search | PASS, 31/31; actual SDK query builders with intercepted fetch plus access-lifecycle tests |
| npm run test:reports | PASS, 22/22 |
| npm run test:auth | PASS, 32/32 local regressions; no new hosted Auth investigation |
| npm run test:supabase-config | PASS, 5/5 |
| npm audit --omit=dev | PASS, zero findings |
| Full audit of unchanged dependency tree | 16 Moderate development-only findings, exit 1; not reported as PASS; no force fix |
| git diff --check | PASS, including new files through an external temporary review index |
| Production localhost HTTP | PASS: public listing/filter/validation routes, invalid/missing detail 404, private no-store headers, diagnostics 404 and 13 existing route checks |
| Offline browser UI | PASS, 20 checks; listing/detail at 360, 390, 768 and 1440px without overflow; filters, pagination, Back/Forward, anonymous placeholder and Blob/session lifecycle |
| Read-only real Cloud Data API | PASS, empty public/filter queries; missing detail; anonymous profiles/claims/photo metadata denied |
| Positive hosted Search E2E | NOT RUN: no active records to validate actual result matching/pagination/detail |
| Authenticated hosted private-photo E2E / cross-user access | NOT RUN: no approved photo/report fixtures |
| GitHub CI | NOT RUN; no Search changes published |

Unit tests cover projections, active statuses, title/type/category/location/combined filters, literal punctuation, bounds and duplicates, URL/page state, empty/missing details and sanitized errors. Access tests cover anonymous no-fetch, verified access, permission errors, stale responses, identity switches, suspension/sign-out/disposal. Mocked rows and simulated identities do not prove hosted RLS or Storage access.

Offline screenshots and verification results are retained outside the repository under `/tmp/campusfind-task04b-review/screenshots/` and ui-results.json. They are labeled OFFLINE SEARCH UI and contain only synthetic records. The harness is outside application source; it creates no production test route or auth bypass and is excluded from the proposed commit.

## Cloud acceptance and security evidence

Schema/policy metadata was reviewed read-only on campusfind-dev. Its item read rules allow OPEN/IN_PROGRESS for anon/authenticated plus owner-only terminal history. Bucket item-images remains private. The actual anonymous Data API checks used a modern publishable client without any user session or service-role credential:

- Public listing, title search, combined filters and escaped-punctuation query completed with zero rows.
- A valid but missing UUID returned no item.
- Anonymous profile/claim reads and photo metadata access were denied.

These empty reads prove connectivity and narrow negative/empty behavior only. They do not establish positive matching, cross-user item/photo authorization, real object downloads or complete Cloud E2E. No hosted reports, objects, accounts or emails were created/deleted, and no Cloud configuration changed.

The live local page at `http://localhost:3600/items` was also opened successfully against Cloud and showed the empty active-report state. Existing browser identity was not inspected or modified. No password, user JWT or cookie value was read or captured.

## Runtime notes and remaining release limitations

The first dev start hit the machine's existing EMFILE watcher limit. Only this task's port-3600 process was stopped; restarting with process-local WATCHPACK_POLLING=true succeeded. No system limit, unrelated server or source configuration was changed. The current local server runs with that environment workaround.

The first detail smoke exposed HTTP 200 with a streamed not-found boundary. Loading was scoped to a Suspense boundary inside listing, allowing detail to decide 404 before streaming. Final HTTP checks confirm both malformed and missing UUID routes return 404.

The earlier Authentication form credential-exposure remediation remains outside main in its separate reviewed worktree. It was not copied into Search. Integrate that critical fix through a separately approved Git process before production release. Human password rotation remains unconfirmed. Hosted positive Search/private-photo acceptance is still an explicit release-evidence gap; fixture creation requires separate approval.

Optional follow-ups are a measured search-index plan if scale warrants it, richer full-text/description search, category normalization and thumbnails. No such scope expansion, Claims work or Vercel deployment is included.

## Files created/modified

The exact 15-file proposed list is below; .env.local (public project settings only), dependencies, screenshots, browser harnesses and temporary logs are excluded. Starting next dev regenerated the local next-env.d.ts imports to .next/dev/types; that generated change is retained locally and excluded from the proposed commit. No other worktree's next-env.d.ts was changed.

| File |
| --- |
| `docs/task04b-search-review.md` |
| `package.json` |
| `src/app/items/[id]/page.tsx` |
| `src/app/items/error.tsx` |
| `src/app/items/not-found.tsx` |
| `src/app/items/page.tsx` |
| `src/app/page.tsx` |
| `src/features/discovery/discovery-loading.tsx` |
| `src/features/discovery/discovery-ui.tsx` |
| `src/features/discovery/photo-access.ts` |
| `src/features/discovery/photo-gallery.tsx` |
| `src/features/discovery/queries.ts` |
| `src/features/discovery/services.ts` |
| `src/features/discovery/validation.ts` |
| `tests/search.test.mjs` |

## Review and Git delivery plan

Full proposed diff: `/tmp/campusfind-task04b-review/search-publish.diff`. File manifest: stage-files.txt. Test, readonly Cloud, HTTP and UI results are in the same local review directory. The real Git index remains unchanged; no Search commit, push, PR or merge has occurred.

Proposed commit/PR title: `feat(search): implement lost and found discovery`, source feat/item-search, target main. Review this implementation and its limitations before authorizing publishing. After Reporting + Discovery are accepted, the initial Cloud deployment remains a separate approval step; sensitive Claims/Edge workflows remain Task 05.

## References checked

- Local application/storage migrations and installed Next.js 16.4.3 guides for Server/Client Components, fetching data and page/searchParams conventions.
- [Supabase ILIKE](https://supabase.com/docs/reference/javascript/using-filters-ilike), [private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) and the installed Storage download API's cache/abort options.
- [PostgREST filtering operators](https://docs.postgrest.org/en/stable/references/api/tables_views.html#operators), including asterisk as a LIKE wildcard alias.
- Supabase changelog reviewed; no Cloud setting changes or unrelated upgrade was required for this browser/Node SDK implementation.
