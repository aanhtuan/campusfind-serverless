# Account identity and handover roles

Implemented and verified on 2026-11-09 in `/home/atuna/campusfind-serverless`, branch `feat/integrate-campusfind-mvp`. The frontend runs locally at `http://127.0.0.1:3000` against the existing development Supabase project. No Vercel release, Git commit or publication was performed.

## Visible behavior

The header shows the verified signed-in profile name and a stable `TK#xxxxxxxx-xxxx` account code on mobile and desktop. Every participant is identified by name plus code; only the current account receives `(Bạn)`. Two existing accounts both named Anh Tuấn were observed during browser verification and have different account codes.

| Context | Person posting | Person responding | Gives the object | Receives the object |
| --- | --- | --- | --- | --- |
| FOUND | Finder / holder | Person requesting ownership | Reporter | Approved claimant |
| LOST | Person reporting loss | Person who may have found it | Selected respondent | Reporter, after proof verification |

Report lists and details show the author and, for the participating accounts only, the selected counterparty with a link to the exact claim. Sent/incoming claim lists and claim details show both identities and their custody roles. Pending parties are explicitly prospective; cancelled/rejected claims do not imply a return. Approved matches on resolved/closed reports display completion and a history link.

Claim details identify the account currently expected to review, provide owner proof, verify proof, accept a meeting, confirm delivery/receipt, or resume a paused handover. Proposal, acceptance, confirmation, contact and issue rows use the participant names and account codes.

## Access boundary

`20261109164457_scoped_actor_labels.sql` was separately approved and applied to `campusfind-dev` (`gxbpprhivyxmtcqibncf`). The local filename matches the actual Cloud migration version. This is a read-only RPC; it adds no table write grant or profile SELECT policy and changes no Auth setting or existing report/claim/account.

- Only authenticated users with an existing profile may call `actor_labels`.
- Inputs are report/claim scope IDs, bounded to 40 each. There is no arbitrary account lookup input.
- Report authors are visible to members for active reports, or for their own/participating history under the existing item visibility rule.
- A selected respondent is returned for an item only to the reporter or that respondent. Competitors and unrelated members cannot learn the selected party from the item projection.
- A claim returns its two display identities only to its reporter or claimant. ADMIN has no extra private-identity privilege.
- Outputs exclude email, role, optional contact and ownership evidence. Anonymous discovery projections still omit account identity.
- If the RPC is unavailable during a rolling release, already-authorized claim/report IDs still render stable account codes. The UI does not falsely state there is no match when the projection failed.

## Verification

- Local database: **367 pgTAP assertions PASS**, including **24 identity-access assertions**, each suite rolled back. Covers duplicate display names, both participants, competitor isolation, unrelated ADMIN, active/terminal reports, anonymous/missing identity and bounded inputs.
- Identity rendering/client suite: **9 tests PASS**. Checks FOUND/LOST role reversal, next actor, duplicate names, rejected competitors on completed reports, completion labels and projection failure fallback.
- Existing workflow/report/search/auth tests: **103 tests PASS**.
- ESLint, TypeScript and isolated production webpack build: **PASS**. Build uses a separate source copy so the user's dev server remains available.
- Cloud SQL checks under authenticated role, rolled back: own report/claim names present; unrelated claim hidden; active author without selected-party disclosure; self-only profile SELECT; anonymous RPC execute denied. These are SQL authorization checks, not new Auth login tests.
- Actual signed-in browser: own reports, sent/incoming claims, LOST holder, LOST owner, FOUND paused handover, completed handover, discovery list and report detail verified against hosted data. No workflow action was submitted during this identity verification; existing records were left for the user to continue testing.

Screenshots are in the task artifact folder `campusfind-demo-2026-11-09/identity-*.jpg`. The prior [hosted workflow report](hosted-demo-verification.md) remains a dated fixture snapshot; user actions can change those statuses and counts.

Post-migration advisors report no actor-label function advisory. Existing notices remain: [leaked-password protection is disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [four unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), and [three unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index). This change did not alter those settings or indexes.
