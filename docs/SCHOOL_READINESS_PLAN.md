# School readiness implementation plan

## Goal
Teachers should create a usable first seating chart within five minutes,
understand unmet requests, and return to adjust the chart during the term.
This is a pilot target, not a measured product claim.

## Phase 1: First use and trust
- [x] Default setup to pasting names, with preview and append-only import.
- [x] Preserve duplicate names as separate students and flag them for review.
- [x] Translate the new workflow into English, Hebrew, Arabic and Russian.
- [x] Show existing conflict detection in the final generation step.
- [ ] Measure setup time with teachers unfamiliar with the product.
- [x] Audit constraint satisfaction reporting after generation and manual moves; add an always-visible class review.
- [x] Verify existing required/preferred categories; flag unmet required requests separately in the class review.
- [x] Verify tablet, keyboard, RTL, print and offline app-shell workflows in Chromium; other browser engines remain to be checked.

## Phase 2: Continued classroom use
- [x] Audit existing locked-seat, undo, rotation-planner and backup implementations; verify locks/undo/backup in the browser. Rotation usability remains for pilot testing.
- [x] Add a previewed two-seat suggestion that respects locks, reduces affected students, introduces no detected new required violations, and supports undo.
- [ ] Add absence handling without losing the original roster or chart.
- [x] Test backup restoration in an independent browser context, including reload and cancellation; explain device-local storage in all four languages. Physical device testing remains for the pilot.

## Phase 3: School pilot
Recruit 3–5 schools with two participating teachers each for six weeks.
Start with one class per teacher. Supply a short guide and a 15-minute introduction.
Record time to first chart, help required, repeat use and requests for expansion.
Use teacher interviews before introducing any analytics or student-data collection.
Do not claim improved learning outcomes without supporting evidence.

## Phase 4: School adoption
Define sharing permissions, private-note visibility, ownership and retention with
pilot schools before implementing accounts or cloud synchronization. Prepare
support materials and evaluate pricing using demonstrated value and interviews.

## Validation
Automated import tests cover spreadsheet tabs, blank lines, RTL names, duplicate
names, unique student IDs and preservation of the existing roster. Review and
suggestion tests cover manual moves, incomplete charts, hard/preferred rules,
locked seats, non-mutating previews, and undo. Chromium checks cover four-language
tablet setup, phone RTL/overflow, print, CSV, backup transfer and offline app-shell
reload. School pilot, physical devices, other browsers, sharing and deployment
remain separate validation gates. Suggestions search up to 1,000 candidate swaps
and do not claim a global optimum or improved academic scores.


## October 2 additions
- [x] Remove drag-overlay return animation and validate pointer alignment and drop in six RTL/zoom cases.
- [x] Explain the current seat on hover, including after manual changes, and provide research links with evidence limits.
- [x] Add editable physical room markers: windows, doors and teacher desk, saved with projects/backups. Explicit windows replace legacy left-wall assumptions; teacher/door proximity add bounded soft considerations.
- [x] Keep raw survey responses separately and require teacher review before applying suggestions; retain established teacher needs.
- [x] Expose the questionnaire during roster setup; retain eleven local items and provide a nine-item phone flow without peer-name disclosure.
- [x] Implement a capability-based seven-day phone-survey API with durable storage, close/delete, per-class teacher sessions and no in-memory fallback for answers.
- [ ] Configure a public school deployment, Redis and school access secret; verify real phones and agreed retention/consent practices. The API remains a single-school pilot rather than multi-school account management.
- [x] Hebrew first-visit default and a renewed home screen with reduced-motion support.

Evidence and implementation limits: [QUESTIONNAIRE_METHOD.md](QUESTIONNAIRE_METHOD.md).
API contract and setup: [SURVEY_API.md](SURVEY_API.md).
