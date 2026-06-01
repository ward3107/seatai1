# SeatAI — Methodology & Privacy (one-page summary for schools & parents)

> **Status:** Draft for review. Plain-language sheet a teacher can hand to a
> principal, DPO, or parent. **Not legal advice** — see "What still needs
> local review" at the end.

---

## What SeatAI does

SeatAI suggests classroom seating arrangements that balance academic ability,
behavior, diversity, and special needs, and (optionally) respect students'
preferred seatmates. It is **decision support**: the teacher reviews, edits,
locks, or ignores any suggestion. It does **not** diagnose, screen, or label
students.

## Is it scientifically sound?

- The peer-preference part uses **sociometric nomination**, a long-validated
  *method* in educational psychology for understanding classroom
  relationships.
- We use **positive-only** nominations ("who you'd like to sit near"), never
  "who you would not sit with."
- Seating/environment items (front-row, noise, light, mobility) are framed as
  **accommodations and preferences**, supported by evidence on classroom
  acoustics and seat location.

**What we do *not* claim:** we do not market this as a "scientifically
validated questionnaire." It is built on validated *methods*; formal
validation of our specific form (expert review → piloting → reliability →
independent study) is a deliberate, separate roadmap.

**What we deliberately avoid:** licensed clinical screeners (SDQ/BASC/etc.)
and "learning-style"/VARK quizzes (discredited as a basis for tailoring
instruction, and trademark-restricted).

## What data we collect, and why

We collect **only** what the optimizer uses — academic level, a teacher
behavior rating, special-needs/accommodation flags, language, and (optional)
student seatmate preferences. Each item maps to a specific purpose; see
`QUESTIONNAIRE.md` for the full data dictionary. We do not ask for diagnoses
or medical detail.

## Where the data lives (the important part)

- **Everything stays on the teacher's device**, in the browser's local
  storage. **No server. No account. No cloud. No tracking.** Nothing is
  transmitted to the developer.
- Because the developer never receives or accesses the data, the developer is
  generally **neither a data "controller" nor "processor"** for it — the
  **school/teacher is the data controller**.
- Student/parent responses are returned to the teacher **offline** (printable
  form or file import), not via a cloud form.

## Confidentiality

- The app **never reveals** who nominated whom. Peer answers are collected
  privately and used only to inform seating.
- "Keep apart" / conflict information is **teacher-only** and never shown to
  students or other families.

## Consent model (designed for the strict case — under-13)

- **Parental consent** before a child completes the survey, plus **student
  assent**.
- A **parent notice + opt-out** (covers US PPRA-style requirements for
  surveys touching peer/behavior topics).
- Parents can **see, correct, or delete** their child's data (the teacher can
  edit/remove any record).
- Schools can **disable the student survey** entirely where local rules
  require (then SeatAI runs on teacher-entered data only).

## Roles & responsibilities

| Party | Role |
|---|---|
| School / teacher | **Data controller** — decides purpose, obtains consent, holds the data |
| Developer (SeatAI) | Ships local software; **touches no student data** |
| Parent / student | Provide consent/assent and optional preferences |

## What still needs local review (be honest about these)

- **COPPA (US):** a strictly local, no-server tool likely falls outside
  COPPA's "operator collects online" trigger — a reasoned reading, not a
  formal FTC ruling. Any telemetry/cloud feature would change this.
- **Israel:** the Ministry of Education's specific rules on **sociometric
  surveys** could not be confirmed from a primary source and need human
  review (the gov.il students-privacy guide + current mankal circular).
  Israeli schools generally require **graded approval + advance written
  parental consent** for identifiable student data.
- **GDPR (EU/UK):** special-needs data is special-category (Art. 9); the
  school likely needs a **DPIA**. We provide a data-flow summary to support
  it.

## Key sources

- US: FTC COPPA FAQs (ftc.gov); studentprivacy.ed.gov (FERPA, PPRA).
- EU/UK: gdpr-info.eu (Arts. 4, 5, 8, 9, 35); ICO (special category, DPIA,
  Children's Code); EDPB Guidelines 07/2020 (controller/processor).
- Israel: Privacy Protection Law Amendment 13 (in force Aug 2025); Student
  Rights Law §14; gov.il students-privacy guide.
- Method/IP: U.S. Copyright Office Circular 33 (methods aren't copyrightable);
  youthinmind.com/copyright (SDQ license); vark-learn.com (VARK license);
  Pashler et al. 2008 & Coffield et al. 2004 (learning styles).

*This summary is informational, not legal advice. Confirm obligations for
your jurisdiction before deployment.*
