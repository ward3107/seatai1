# SeatAI — Step 1 Intake Questionnaire (DRAFT for review)

> **Status:** Draft for product/legal review. Nothing here is implemented in
> the app yet. This document is the spec we'd build *Step 1* against once
> approved. It is **not legal advice** — the jurisdiction items in
> `METHODOLOGY_AND_PRIVACY.md` need a local review (esp. Israeli Ministry of
> Education rules) before shipping.

---

## Purpose

SeatAI's optimizer needs a handful of inputs per student. "Step 1" gathers
them **before** the teacher starts optimizing. This is not one big
psychological test — it is a short intake split across three sources, each
giving only the data it's best placed to give.

## Design principles

1. **Minimize.** Every question must map to a field the optimizer actually
   uses. If it doesn't feed a field, it's cut. (Also a GDPR requirement.)
2. **Validated *methods*, honest claims.** The peer part uses sociometric
   nomination — a validated *method*. We do **not** claim our specific form
   is "scientifically validated" until it's been through expert review and
   piloting (see the validation ladder in `METHODOLOGY_AND_PRIVACY.md`).
3. **Positive framing only.** No "who would you NOT sit with." Nominations
   are about preference, never rejection.
4. **Right source for each field.** Sensitive things (special needs,
   behavior, known conflicts) are **teacher/parent-entered**, not asked of
   students.
5. **Teacher always overrides.** The output is a suggestion; the teacher can
   edit, lock, or ignore any seat. (This also keeps the tool firmly in
   "decision support," not "diagnosis.")
6. **Works with nothing.** If no student input exists (new class), Step 1 is
   skippable and the optimizer runs on objective fields alone.
7. **Confidential.** The app must never show students who nominated whom.

---

## The three intake sources

| Source | Gives us | Why this source |
|---|---|---|
| **A. Teacher** (per student) | academic, behavior, special needs, known conflicts/mentors | Objective, professional judgment; avoids asking kids sensitive things |
| **B. Student** (mini-survey) | preferred seatmates, seating/environment preferences | Only the student knows their own preferences & friendships |
| **C. Parent/guardian** (optional) | consent (required), accommodations they want flagged | Consent gate; some accommodations parents know best |

---

## Section A — Teacher fields (per student)

Most of these already exist in SeatAI's student form. Almost all optional;
sensible defaults.

| # | Field | Input | Maps to optimizer field |
|---|---|---|---|
| A1 | Academic level | import grade / 1–5 | `academic_level` / `academic_score` |
| A2 | Behavior (teacher's own observation) | 1–5 | `behavior_level` / `behavior_score` |
| A3 | Needs front row (vision/hearing/focus) | checkbox | `requires_front_row` / `front_row_ids` |
| A4 | Needs quiet area | checkbox | `requires_quiet_area` |
| A5 | Needs aisle / easy exit (mobility, breaks) | checkbox | `aisle_ids` / `has_mobility_issues` |
| A6 | Benefits from window side | checkbox | `near_window_ids` |
| A7 | Primary language / bilingual | select | `primary_language` / `is_bilingual` |
| A8 | Special-needs note | short text | `special_needs` (free text — no diagnoses) |
| A9 | Keep apart (known conflict) | pick 2 | `separate_pairs` |
| A10 | Keep together / mentor pairing | pick 2 | `keep_together_pairs` / `peer_mentor_pairs` |

> **A2 is deliberately the teacher's own 1–5 rating, NOT a licensed screener
> (SDQ/BASC/DESSA).** That avoids the paid license *and* the clinical-tool
> liability — see methodology doc.

---

## Section B — Student mini-survey (~5–8 items, < 5 min)

Short, simple language, private administration. For young children:
picture-assisted and/or read aloud by the teacher. Available in en/he/ar/ru.

| # | Question (draft wording) | Input | Maps to |
|---|---|---|---|
| B1 | "Pick up to **3 classmates you'd like to sit near**." | up to 3 names | friend adjacency → `keep_together_pairs` (soft) |
| B2 | *(optional)* "Is there a classmate who **helps you**, or who **you help**, with schoolwork?" | up to 2 names | `peer_mentor_pairs` |
| B3 | "Do you focus best **near the front**, the **middle**, or the **back**?" | choice | front/back preference |
| B4 | "Do you get distracted by **noise**?" | yes / a little / no | `requires_quiet_area` (soft) |
| B5 | "Do you prefer to sit **near a window**?" | yes/no | `near_window_ids` (soft) |
| B6 | "Do you need to **see or hear the board clearly**?" | yes/no | `requires_front_row` (soft) |
| B7 | *(optional, older students)* "Anything else that helps you learn?" | short text | teacher reviews → fields |

**Rules:**
- B1 nominations are **suggestions to the optimizer**, weighed against
  everything else — not hard guarantees.
- Student answers are **teacher-reviewable**; the teacher can correct obvious
  errors (e.g., a nominated student who left the class).
- No negative nominations. No "rank your classmates."

---

## Section C — Parent/guardian (optional, but consent is required)

| # | Item | Input | Purpose |
|---|---|---|---|
| C1 | **Consent** to the child completing the survey | signature/checkbox | Legal gate (see below) |
| C2 | Accommodations to flag (vision, hearing, needs quiet, mobility) | checkboxes | feeds A3–A6 |
| C3 | *(free text)* Anything the teacher should know | short text | teacher reviews |

Sensitive "please don't seat near X" requests are routed to the **teacher**
(→ A9), never exposed to other families.

---

## Cold-start: students don't know each other yet

Step 1 must degrade gracefully (new class, transfers, start of year):

1. **"We don't know each other yet" toggle** → skip Section B entirely.
   Optimizer runs on Section A objective fields (academic balance, behavior
   spread, diversity, special needs). Peer data is a *bonus*, never required.
2. **Proxies** → teacher enters any known conflicts/pairings (A9/A10);
   optional prior-year data.
3. **Re-survey after ~3–4 weeks** once students know each other → Section B
   becomes meaningful.
4. **Learn from reality** → SeatAI already records who actually sat together
   (rotation history). A light teacher "is this pairing working? 👍/👎" could
   feed future runs without any survey.

---

## Data dictionary (sensitivity & consent per item)

Tiers: **O** = ordinary personal data · **S** = special-category (health/SEN,
GDPR Art. 9) · **P** = PPRA-sensitive (peer appraisals / behavior).

| Item | Respondent | Tier | Handling |
|---|---|---|---|
| A1 academic | Teacher | O | Education record; teacher-held |
| A2 behavior | Teacher | P | Teacher observation; parental notice + opt-out |
| A3–A6 accommodations | Teacher/Parent | **S** | Needs Art. 9 condition; parental consent |
| A7 language | Teacher | O | — |
| A8 special-needs note | Teacher | **S** | No diagnoses; minimize free text |
| A9 keep-apart | Teacher | P | Teacher-only; never shown to students/parents |
| A10 keep-together/mentor | Teacher | O/P | Teacher-curated |
| B1 seatmate nominations | Student | P | Private; **never reveal who nominated whom** |
| B2 mentor | Student | P | Private; teacher-reviewed |
| B3–B6 preferences | Student | O | Low-sensitivity |
| B7 free text | Student | O/P | Teacher reviews before use |
| C1 consent | Parent | — | **Required gate** |
| C2 accommodations | Parent | **S** | Parental consent |

---

## What we deliberately do NOT ask (and why)

- ❌ **Negative peer nominations** ("don't want to sit with") — ethically
  contested; risky in a non-anonymous, teacher-visible tool.
- ❌ **SDQ / BASC / DESSA / SSIS-SEL** clinical screeners — paid license +
  clinical-tool liability. We use a teacher 1–5 rating instead.
- ❌ **"Learning style" / VARK quiz** — scientifically discredited as a basis
  for tailoring instruction, *and* VARK is trademarked/license-restricted.
- ❌ **Diagnoses / medical detail in free text** — minimize special-category
  data.

---

## Open questions for review

1. Do we include B2 (mentor) at launch, or keep v1 to nominations only?
2. Default: is Section B opt-in per school (some districts/MoE may disallow
   peer surveys)?
3. Reading-level / picture mode threshold for young students?
4. Confirm Israeli MoE position on sociometric surveys (flagged low-confidence
   in the research — needs human review).
