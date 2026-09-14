# Security Policy

## Reporting a Vulnerability

If you find a security issue in SeatAI, please report it privately.

**Please do not open a public GitHub issue for security problems.**

Open a private security advisory through the GitHub repository's
**Security → Report a vulnerability** flow, or contact the maintainers
through the email address listed in the repository's `package.json`
author field.

Include:
- A clear description of the issue.
- Reproduction steps or a minimal proof-of-concept.
- Your assessment of the impact (e.g. data exposure, denial of
  service, account takeover — n/a since there is no account).
- Suggested fix, if you have one.

We will acknowledge receipt within a few business days, work with
you on a timeline, and credit you in the advisory once a fix has
shipped (unless you prefer to remain anonymous).

Please do not publicly disclose the issue until a fix is available
and users have had a reasonable window to update.

## Trust Model

SeatAI is local-first. Its core manual/CSV workflow is browser-only, while
optional integrations add narrowly scoped network paths:

- All student data is stored in the user's own browser
  (IndexedDB / localStorage). No server-side component receives,
  stores, or processes roster data.
- There is no authentication, no multi-tenancy, and no cross-user
  data path. Each browser holds exactly its own teacher's data.
- Outbound or serverless data flows are:
  - First-load asset requests to the origin serving the app.
  - Optional, opt-in calls to a language-model API when the teacher
    has explicitly enabled AI explanations and entered their own
    API key. The key is not persisted and never leaves the teacher's browser except in
    the authentication header on that direct request. Relevant placement
    facts or teacher notes are included in the prompt.
  - Optional Google Classroom roster imports, called browser-to-Google.
  - Optional LTI 1.3 serverless endpoints, which validate the LMS launch and
    process a roster transiently without persisting it.

There are no SeatAI user accounts or shared application database, so account
hijacking and cross-tenant access do not apply to the core app. Browser data,
the optional LTI endpoints, supply-chain integrity, and third-party integration
boundaries remain in scope.

## Scope

In scope:
- Issues in the application source code in this repository.
- Issues in the official build deployed from `main`.

Out of scope:
- Findings that require physical access to the teacher's device
  (their IndexedDB is, by design, readable by anyone with access to
  the browser).
- Findings against forks or self-hosted deployments.
- Social-engineering attacks on individual teachers.
- Issues in third-party dependencies that are already addressed by
  an upstream release we have not yet adopted (please report
  upstream first).

## Coordinated Disclosure

We follow standard responsible-disclosure practice: private report,
private fix, coordinated public advisory. We will not pursue legal
action against good-faith research conducted within the scope above.

## Supported Versions

The latest released build is the only supported version. Bug fixes
are not back-ported.
