# CampusFind MVP scope

CampusFind helps a single university community report misplaced belongings and return them through an integrated, private ownership workflow. The application retains Next.js on Vercel and managed Supabase Auth / PostgreSQL / Storage / Edge Functions. No separate Node server or external paid service is introduced.

## Accounts and access

Registration, login, email verification, logout, verified SSR identity, safe redirects, protected routes and stale-session masking are implemented. Database roles are USER/ADMIN; registration cannot provision ADMIN and user metadata is not authorization. The current membership model is any authenticated account in one campus; university-domain verification and multi-campus isolation require a separately agreed access policy.

## Reporting and discovery

Members create/edit their own LOST/FOUND reports, keep history, manage up to three registered private photos, and recover old unregistered staged uploads. Public visitors browse active report text with title, type, category and location filters and bounded pagination. Photos require a member session. Reports use OPEN, IN_PROGRESS, RESOLVED and CLOSED; terminal reports disappear from discovery while authorized history remains.

## Claims and resolution

Another authenticated member can claim an OPEN FOUND report with immutable private evidence (20–5000 characters) and preview before submission. Active duplicates and self-claims are rejected. Claimants can cancel pending requests. Actual reporters review pending claims; one atomic approval rejects competing pending claims and starts the return. ADMIN receives no automatic evidence access.

Approved participants propose/accept revisioned arrangements at a public campus desk and can request changes before confirmation. Contact sharing is optional and requires explicit consent; account email is never automatically copied. Reporter and claimant confirm their own side separately. Both confirmations are required for matched FOUND and LOST resolution. The reporter may close a completed record; LOST owners can independently resolve an item they recover when no response is selected.

For an OPEN LOST report another member sends a private finder response. The reporter selects one response and submits immutable ownership evidence; only the selected finder can verify it. Selection does not establish ownership or start handover. Mismatch or withdrawal ends the selection while leaving the report OPEN. Verified matches use the shared arrangement and two-confirmation workflow, with the reporter receiving and the finder delivering. Pending responses are rejected atomically at independent recovery or final verification. See [the full flow and tests](lost-finder-workflow.md).

A structured operational issue pauses coordination/completion. Each participant must independently agree to resume; approved claims and existing confirmations remain recorded. A minimal ADMIN page exposes aggregate status counts and structured issue acknowledgement, without contact, evidence or unilateral forced resolution. Unresolved disputes require campus human assistance; full adjudication/reassignment is deferred.

## Acceptance and release

The source implementation and local evidence are documented in [MVP completion](mvp-completion.md), including real PostgreSQL/RLS/concurrency and local API/browser results. Hosted positive Auth/email, Storage, Edge and cross-user E2E acceptance must be recorded after separately authorized migration/function deployment and fixtures. Local tests do not establish hosted behavior or production readiness.

See [workflow and security design](mvp-workflow.md), [initial feature audit](mvp-audit.md) and [deployment approval procedure](mvp-deployment.md).

## Beyond this MVP

Realtime chat, automatic image matching, AI recommendations, push/email notifications for each workflow event, gamification, cross-campus federation, paid provisioning, image content scanning/EXIF stripping, background orphan sweeps/quotas, description/full-text search, forced Admin dispute decisions and university-membership verification are deferred. The existing title search, private Storage model and free-tier-friendly serverless architecture are preserved.
