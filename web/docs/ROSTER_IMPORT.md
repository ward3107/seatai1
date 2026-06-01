# Roster import

SeatAI gets students in four ways, all **client-side** — no roster data ever
leaves the teacher's browser. Every source maps onto one internal shape
(`RosterClass` in `src/core/roster/types.ts`), so adding a provider never
touches the rest of the app.

| Source | How | Setup | Status |
|--------|-----|-------|--------|
| **Manual / sample** | Type students or load the demo class | none | ✅ |
| **CSV** | Upload SeatAI's CSV template | none | ✅ |
| **Google Classroom** | One-click OAuth, pick a class | `VITE_GOOGLE_CLIENT_ID` (see `GOOGLE_CLASSROOM_SETUP.md`) | ✅ |
| **OneRoster / SIS** | Upload OneRoster CSV files | none | ✅ |
| **LTI Advantage (NRPS)** | Embed in Canvas/Blackboard/Moodle | needs a server (see below) | ⛔ not yet |

## OneRoster / SIS export

[OneRoster](https://www.1edtech.org/standards/oneroster) is the open rostering
standard every major SIS can export, and **ClassLink, PowerSchool and Infinite
Campus all speak it**. SeatAI reads the **CSV profile**.

1. In your SIS / ClassLink, export the OneRoster **CSV** bundle (a zip of
   `users.csv`, `classes.csv`, `enrollments.csv`, …).
2. Unzip it.
3. In SeatAI's **OneRoster / SIS export** card, drop in (or pick) the
   `users.csv`, `classes.csv` and `enrollments.csv` files together.
4. Choose the class to import.

`users.csv` and `enrollments.csv` are required; `classes.csv` is optional but
gives friendly class names instead of ids. `tobedeleted` rows are skipped,
teacher enrollments are ignored, and duplicate enrollments are de-duped. All
parsing happens in `src/core/roster/oneRoster.ts` (pure + unit-tested).

> One OneRoster importer covers ClassLink for free (ClassLink gives vendors
> OneRoster access at no charge) plus any OneRoster-compliant SIS — which is
> why it was prioritised over the proprietary Clever API.

## Why not LTI yet?

LTI Advantage 1.3 + Names & Roles (the way to embed inside Canvas / Blackboard /
Moodle and pull the roster at launch) **requires a confidential server**: the
LMS POSTs a signed JWT to a launch endpoint, which must be validated against the
platform's JWKS, and the Names & Roles call needs a client-credentials grant
signed with a private key. None of that can run in a pure browser app without
leaking secrets. LTI is therefore tracked as a separate **server-side** effort,
not part of the current no-server build.
