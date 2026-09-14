# School pilot readiness

This is an engineering checklist, not a compliance certification or Ministry
of Education approval. Do not describe a proposed capability as implemented.

## Implemented baseline

- Browser-local storage by default; external Google, AI and LTI flows remain optional.
- AI API keys are not persisted by the application.
- CSV replacement is atomic, requires confirmation and rejects partially invalid files.
- Loading demonstration data requires confirmation when a roster already exists.
- Setup wizard supports RTL-aware keyboard navigation and accessible step names.
- Advanced sidebar tools load on first use and remain mounted to preserve edits.
- Unit tests, lint, production build, dependency audit and E2E typechecking are CI gates.
- The full Chromium regression suite is configured to fail CI on failures.
  Its run result must still be checked for each commit.

## Before a real-student pilot

- [ ] Obtain the school's authorization for the intended data and usage.
- [ ] Document data flows, recipients, retention and deletion for each integration.
- [ ] Confirm the applicable privacy, security, accessibility and procurement requirements.
- [ ] Review supplier terms and retention before enabling an external AI service.
- [ ] Complete an accessibility audit with keyboard and screen-reader users.
- [ ] Test the deployed PWA on school devices, weak networks and offline reloads.
- [ ] Verify backup export, restore and recovery on a different device.
- [ ] Establish support ownership and an incident-response contact.
- [ ] Use synthetic student data for demonstrations and test automation.

## Not implemented by this hardening work

School-wide accounts, SSO, tenant isolation, role-based access, centrally enforced
AI policies, managed backups, administrator audit logs and cross-teacher sharing
need a separately designed school backend. A browser-only preference is not an
enforceable school security policy. No hosting region or vendor approval is implied.

## Acceptance checks

Run from the repository root:

```sh
npm ci
npm test
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
npx tsc -p web/tsconfig.e2e.json --noEmit
```

Run browser checks from `web/` after installing the Playwright browsers:

```sh
npx playwright install chromium
npx playwright test --project=chromium
```

Firefox and WebKit projects are configured but are not covered by the Chromium CI
job. Validate them before claiming cross-browser readiness. A successful build or
green dependency scan alone does not establish application security.

## Pilot measurement

Measure time to first usable seating plan, teacher corrections to generated plans,
repeat use, failed imports and successful backup recovery. Collect aggregate,
approved telemetry only; do not send student names or notes to analytics.
