# School workspaces and optimization reports

The school workspace lives at `/#school`. The existing seating application remains local and usable without an account. Its home page and display-preferences menu link to the workspace.

## Activation status

The code contains the dashboards, same-origin account API and database migration. It does **not** provision a database, change another product's database, or upload existing local pupil data automatically. Without a dedicated configured backend, staff sign-in stays disabled and the UI offers an explicitly labeled, disposable demonstration. Demo roles are not real permissions.

Create a **separate SeatAI Supabase project** in the organization chosen by the owner. Do not reuse BizNix, Softecvision or another application's database. Project creation and any provider charges require the owner's organization/cost choice. The current Vercel integration must have access to the `seatai1-web` project before configuring it.

## Configure a school pilot

1. Create the dedicated hosted Postgres project in the approved region. Confirm the processor, location, school authorization and notice before real pupil use.
2. Apply all `supabase/migrations/*.sql` in filename order. The optimization-report migration follows the workspace migration; do not rerun completed migrations. Only the `public` schema is exposed in the Data API. Keep `seatai_private` unexposed. Run the Supabase security/performance advisors and investigate findings.
3. In Auth, enable email confirmations, TOTP MFA and a minimum password length of 12. Configure the site/confirmation URL for `https://seatai1-web.vercel.app/#school`. Review provider email delivery and rate limits. No staff invitation emails are sent by SeatAI.
4. Configure **server-only** Vercel variables `SEATAI_SUPABASE_URL` and `SEATAI_SUPABASE_PUBLISHABLE_KEY` in the intended environment, then redeploy. Use a publishable `sb_publishable_…` key. A secret/service-role key is neither required nor accepted. The browser uses only `/api/school`, so the existing CSP need not allow an additional external origin.
5. Register the school owner, verify their email, sign in and enroll/verify an authenticator. Create a school workspace with the approved data-use notice. New creators receive only the principal membership in their own workspace. This identifies the workspace administrator; it does not independently verify an official school job title. Existing memberships are preserved by the migration. The UI prefers an authorized principal membership on sign-in and identifies the creator through `isOwner`.
6. In teacher or principal role, explicitly publish a class. The sharing preview lists the pupil names. Names, opaque local references, seating coordinates and an optional class-level optimization report are shared. Individual pupil scores, questionnaires, notes, photos and peer relations stay local. The database rebuilds the snapshot/report from whitelists, validates bounds and derives the displayed average and seated/missing counts. Publishing without a result clears an older report instead of leaving stale metrics.
7. Each staff member registers and verifies their email. The principal grants a role and class assignments using that verified address. Teacher/counselor access requires a class assignment. An optional expiry supports temporary staff. The principal cannot self-grant the counselor role; another principal must authorize it.
8. Test real provider sign-in, MFA, logout/revocation and permission denial with synthetic pupils in the deployed environment. Complete the provider/school checks in `SCHOOL_READINESS.md` before a real-student pilot.

## Permission model

Authorization derives from Auth identity, a **live session**, MFA, current memberships, expiry and class assignments. User metadata and UI role selectors confer no permissions. Every mutation runs in a transaction and checks role + school + class/case. Direct table writes are revoked for browser roles. Read grants are paired with RLS; anonymous visitors receive no school-table or RPC grants.

| Resource | Teacher | Counselor | Principal |
| --- | --- | --- | --- |
| Published roster, map and optimization report | Assigned classes | Assigned classes | All classes in own school |
| Publish/update class | Assigned classes; can create a class | Denied | Own school |
| Referral | Own referrals in assigned classes | Referrals in assigned classes | Aggregate totals only |
| Recommendation/outcome | Own case: read; teacher writes outcome | Assigned case: recommendation and status | Aggregate totals only |
| Confidential note | Denied | Assigned case | Denied |
| Staff assignments | Denied | Denied | Own school |
| Audit | Denied | Denied | Action/time metadata in own school |

Principals can view published rosters, seating and class-level measures in their own school. Referral details, recommendations and outcomes require teacher/counselor case access; confidential notes require counselor access. A principal membership alone never grants counselor case access. Role selectors list server-authorized memberships only; changing a label cannot create access.

MFA is enforced in database authorization, including live verified-factor lookup, not only in the UI. Tokens remain in `Secure; HttpOnly; SameSite=Strict; Path=/` host-only cookies. Every POST checks origin and JSON content type. The access cookie lasts 15 minutes; refresh cookies last 30 minutes and rotate during refresh. Auth itself and database membership checks remain authoritative. Logout clears local cookies and requests revocation of the current provider session.

## Data flows and recovery

- The school database contains approved minimal rosters, referrals, shared recommendations, outcomes and separate counselor notes.
- An online workspace response lives only in React memory. It is not added to IndexedDB, browser backup exports or service-worker caches. API responses use `private, no-store`. Role/school changes, sign-out and detected offline transitions clear displayed records. Foreground refresh rechecks permissions; active tabs refresh every minute. Revoked access is denied on the next database/API request; already viewed information cannot be recalled from a person's memory or screenshots.
- School views are online. The existing independent seating tool retains its offline behavior. No offline queue writes confidential data later.
- A published report contains the actual seat map, four objective scores, their displayed average, missing/review counts, layout type, strategy, run date, generations and duration. These measure a seating arrangement, not pupil attainment or diagnosis. Detailed profiles, questionnaires and peer relationships remain local. Reports are explicit snapshots, not automatic two-way synchronization; republish after another optimization. Older classes without a report show a prompt to optimize and republish.
- Existing referrals prevent silent deletion of their pupil during roster replacement. A future explicit archive/year-rollover workflow will manage historical identity changes.
- MFA device loss/account recovery requires the authorized operator's identity-verification process and provider administration. There is no client endpoint that bypasses MFA or resets other users' factors.
- Configure and verify backup restoration, retention/deletion and incident ownership for the chosen provider. This first migration does not establish a school retention policy or managed backup service.

## Verification

For presentations, open `/#school`, choose the demonstration, select 15, 30 or 45 pupils and run the real optimizer. All three demonstration roles inspect the same generated class. After optimizing a local class, **Preview this result in dashboards** opens `/#school-preview` with that exact class and metrics, entirely on-device. Demo role switching grants no real permissions and never uploads the local class. **Publish result to school** opens the connected workspace, where sharing remains explicit.

`npm test` includes real Postgres RLS/RPC tests through PGlite with a test Auth schema, plus the same-origin API contract. It covers forged roles/metadata, cross-school IDs, direct-table writes, anonymous requests, assignment revocation, expiry, session removal, MFA and stale-factor claims, teacher/counselor collaboration and last-principal protection. These are database-engine tests, not a substitute for testing the live Supabase Auth/PostgREST deployment.

Browser tests cover 390/768/1440px flows, Hebrew/Arabic RTL, full dialogs/focus, isolated sample data, local roster preservation and the connected client MFA/sharing contract with a mocked endpoint. CI runs the browser suite in Chromium, Firefox and WebKit and separately tests touch workflows. Server functions and E2E tests are typechecked.

`docs/SCHOOL_API.openapi.json` describes the endpoint and `node scripts/check-school.mjs https://seatai1-web.vercel.app` checks unauthenticated deployment behavior without reading student data.

## Later phases

SSO, student-specific counselor assignment, explicit case reassignment, calendar integrations, academic-year rollover, managed retention/deletion, administrator exports and bidirectional conflict-aware seating synchronization are separate additions. External AI and centrally enforced AI policy are unchanged and outside this first workspace flow. The questionnaire remains a human-reviewed draft, not a diagnostic instrument.
