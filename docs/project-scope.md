# CampusFind MVP scope

## Purpose

Help university communities report misplaced belongings, discover relevant reports, and return items safely. Task 01 creates only the project foundation. The following three modules are a proposed MVP grouping for review; detailed roles, campus membership verification, and moderation policy must be agreed before implementation.

## 1. Accounts & Access

- Sign in and sign out through Supabase Auth.
- Maintain authenticated sessions across browser and server rendering.
- Protect member routes and define student/staff access boundaries.
- Decide campus identity verification and staff authorization before exposing member data.

Acceptance: members can authenticate and sign out; protected pages reject unauthenticated access; sessions are handled securely; access cannot be gained by editing browser state.

## 2. Item Reporting & Discovery

- Submit lost or found reports with title, description, category, campus location, date, and optional photos.
- Browse reports, view details, and search/filter by category, location, report type, and status.
- Let report owners update their own reports and track whether an item remains open or is resolved.
- Store photos in Supabase Storage with approved access policies.

Acceptance: valid reports can be created and found through filters; owners can edit only their reports; uploads enforce approved restrictions; contact information follows the agreed privacy policy.

Existing `feature/reporting` and `feature/search` both map to this module.

## 3. Claims & Resolution

- Allow members to claim a found item with ownership evidence.
- Allow the responsible reporter or authorized staff to review a claim and accept or reject it.
- Record the claim outcome and confirmed return, with controlled status transitions.
- Limit ownership evidence and claim details to authorized participants.

Acceptance: unauthorized users cannot read private claim evidence or change outcomes; acceptance and return are distinct states; the final item status reflects a confirmed handover. Evidence requirements and dispute handling must be decided before development.

## Foundation boundaries

Included in Task 01: Next.js/TypeScript/Tailwind/ESLint setup, shared UI foundation, folder conventions, installed Supabase libraries, public configuration placeholders, landing page, and documentation.

Deferred: authentication UI, database schema/migrations, row-level security policies, Storage buckets, Edge Functions, CRUD/search/claim endpoints, real user data, and deployments. The landing page describes future capabilities and must not imply these features are available.

## Beyond the MVP

Automatic image matching, AI recommendations, chat, push notifications, gamification, analytics dashboards, cross-university federation, and paid service provisioning are out of scope.

## Suggested delivery order

1. Accounts & Access, including an explicit identity and authorization decision.
2. Approve the database/Storage design and access policies in a separate task.
3. Item Reporting & Discovery.
4. Claims & Resolution.
5. End-to-end validation and a separately approved deployment.
