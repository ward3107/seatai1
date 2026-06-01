# SeatAI — Competitive Market Analysis

*Worldwide and Israel-focused landscape review, feature comparison, and a
prioritized plan to win locally and globally.*

**Prepared:** 2026-06-01 · **Status:** living document · **Scope:** every
product/platform we could find worldwide (open source + commercial) that
generates or optimizes seating, plus the academic literature.

---

## 1. Executive Summary

SeatAI plays in a market with **dozens of "seating chart" tools but very few
real optimizers**. The crowd is manual drag-and-drop chart drawers and
random-with-rules shufflers. Only a handful run an actual search/optimization
loop, and only a couple balance *multiple* student objectives at once.

**The three findings that matter most:**

1. **The algorithm is not novel; the product packaging is.** Genetic algorithms
   for classroom seating exist in academia since 2011 (Shin-ike & Iima) and the
   strongest event competitor (PerfectTablePlan) uses a GA too. What almost
   nobody else combines is: a **real multi-objective GA**, running **100%
   client-side in the browser (offline, no login, no server)**, with **native
   RTL Hebrew + Arabic**, multiple room shapes, and a transparent metrics/
   explanation panel. That *combination* is our moat.

2. **Two serious global competitors, both server-side and paid:** **Mega
   Seating Plan** (seatingplan.com, ~150–164k teachers) and **Class Charts**
   (Tes/Edukey, UK, school-wide subscriptions). Everything else is either
   manual, random, or LLM-prompt "AI" with shallow optimization.

3. **Israel is open whitespace.** No Israeli or Hebrew/Arabic tool does
   AI/optimized classroom seating. The dominant school systems — **Mashov**
   (~1.5M users), **Webtop**, **Shchaf** — don't even ship a manual seating
   chart. Israeli teachers do this by hand. SeatAI already ships he/ar RTL.

**One-line positioning:** *"The free, privacy-first, offline seating optimizer
that balances ability, behavior, diversity and special needs in seconds — in
your language, including Hebrew and Arabic."*

---

## 2. The Market, Segmented

Seating tools fall into four tiers by how much real optimization they do:

| Tier | What it does | Examples |
|------|--------------|----------|
| **A. True multi-objective optimizers** | Search many arrangements, balance several student attributes | **SeatAI**, Mega Seating Plan, Class Charts (peer-influence), SeatSmart |
| **B. Constraint-aware randomizers** | Honor keep-together/apart or "talker" rules, then randomize | School Seating Charts, Seating Chart Maker, Shuffle Buddy, Super Teacher Tools |
| **C. LLM-prompt "AI" generators** | An LLM suggests a layout from a list; no search loop | TeachQuill, SeatMate, Flint K12, EasyClass, SchoolAI |
| **D. Manual chart drawers** | Drag-and-drop / templates, no logic | ClassroomScreen, Canva, TeacherKit, Flippity, ClassDojo (no seating at all) |

The adjacent **event/wedding** market and **exam-hall** market mirror this:
mostly manual (Cvent $199/mo, PlanningPod $149/mo, Top Table Planner, Prismm)
with only **PerfectTablePlan** ($30 one-time, desktop) doing rigorous GA
optimization, and **LupSeat** (UC Davis, open source) doing exam anti-cheating
randomization.

---

## 3. Direct Competitors (deep dive)

### 🥇 Mega Seating Plan — the benchmark
- **seatingplan.com** · UK/Sweden origin · Web + iOS + Android
- **Real optimizer:** "generates thousands of plans and picks the best in ~2s."
  Relaunched Jan 2025 as explicitly "AI-driven." Smart Sorting groups/separates
  by student data.
- **Attributes:** behavior, target grades, SEND, attendance, gender, and
  **student-submitted preferences via QR codes** (clever data-collection idea).
- **Pricing:** Bronze free (1 plan); Silver free (unlimited plans); **Platinum
  whole-school from ~£9.38/teacher/yr** (syncs MIS via Wonde/Clever/ClassLink);
  Gold (CSV/API) elsewhere.
- **Reach:** ~150–164k teachers, 183 countries, ~40k US teachers / 3,727 US
  schools.
- **Strengths:** genuine optimization, deep MIS integration, big install base,
  name-learning + behavior-points + AI report extras.
- **Weaknesses:** best features gated behind whole-school Platinum/MIS sync;
  opaque public pricing; server-side (data leaves device); **no Hebrew/Arabic
  RTL**; grid-centric.

### 🥈 Class Charts (Tes / Edukey) — the behavior-suite bundle
- **classcharts.com** · UK · Web + mobile · from ~£870/yr school-level.
- **Optimizer:** "Instant Seating Plans" from stored data, plus a unique
  **"Influences"** engine that recommends seating based on the historical
  effect pupils have on each other's behavior/progress.
- **Strengths:** seating bundled into a full behavior-management/detention/
  homework/parent-comms suite; unique peer-influence modeling.
- **Weaknesses:** expensive, per-school not per-teacher, UK-focused, opaque
  pricing, heavyweight to adopt for just seating.

### 🥉 SeatSmart (Classivio, UK) — closest on strategy presets
- **seatsmart.classivio.com** · browser · £1.25/10 tokens or £10/mo unlimited
  (10 free tokens/mo).
- "Intelligent algorithm" with heterogeneous / homogeneous / randomized /
  gender / manual strategies; inputs academic level, behavior, special needs,
  relationships, gender. Strategy presets map closely to SeatAI's objectives.
- **Weakness:** token metering, algorithm undisclosed, small.

### Honorable mentions
- **Seats (Wayfare, iOS)** — genuine rules-based arrangement (chatty/ability/
  front/group), but iOS-only, 2-course free cap.
- **School Seating Charts** — one-click auto-assign + "Talker" separation;
  25k+ teachers; narrow constraint set.
- **EasyClass / TeachQuill / Flint K12 / SeatMate / SchoolAI** — LLM-prompt
  generators marketing "AI"; an SEO/positioning threat more than a technical
  one. They *do* surface IEP/504/behavior framing — copy the messaging, beat
  the substance.

### The "AI" tools that aren't (for honesty in our marketing)
ClassDojo has **no seating chart at all**. Canva, ClassroomScreen, TeacherKit,
Flippity, Smart Seat (Cornsoft) are manual/random. Cvent and AutomatedSeating
market "AI optimized seating" but it's largely table-placement/traffic-flow
heuristics, not guest-level constraint solving.

---

## 4. Feature Comparison Matrix

Legend: ✅ yes · ⚠️ partial/limited · ❌ no · ? undisclosed

| Capability | **SeatAI** | Mega Seating Plan | Class Charts | SeatSmart | PerfectTablePlan | Manual tools (Canva/ClassroomScreen/etc.) |
|---|---|---|---|---|---|---|
| True optimization loop | ✅ Genetic algorithm (multi-start) | ✅ search "thousands" | ⚠️ data-driven + Influences | ⚠️ "intelligent" (?) | ✅ Genetic algorithm | ❌ |
| **Multi-objective** (ability+behavior+diversity+special needs) | ✅ weighted, transparent | ✅ several attributes | ✅ several | ✅ strategies | ⚠️ proximity rules | ❌ |
| Transparent score + explanation | ✅ metrics + explanation panel | ⚠️ | ⚠️ | ❌ | ⚠️ shows score | ❌ |
| Constraints: keep-together / apart | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ some |
| Constraints: front/back/aisle/window/peer-mentor | ✅ | ⚠️ front/back | ⚠️ | ⚠️ | ⚠️ | ❌ |
| Multiple room shapes (rows/clusters/U/circle/custom) | ✅ layout-agnostic slots | ⚠️ grid-centric | ⚠️ grid | ⚠️ | ⚠️ tables | ⚠️ templates |
| 3D classroom view | ✅ | ❌ | ❌ | ❌ | ❌ (events have 3D) | ❌ |
| Runs offline, 100% client-side | ✅ Web Worker, IndexedDB | ❌ server | ❌ server | ❌ server | ⚠️ varies |
| No login required | ✅ | ⚠️ free tier | ❌ | ⚠️ | ✅ (desktop) | ⚠️ |
| **Privacy: no student PII leaves device** | ✅ | ❌ | ❌ | ❌ | ✅ | ⚠️ |
| **Hebrew + Arabic RTL UI** | ✅ (en/he/ar/ru) | ❌ | ❌ | ❌ | ❌ | ⚠️ Canva localized |
| PDF / image export | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CSV import | ✅ | ✅ | ✅ (MIS) | ✅ | ✅ | ⚠️ |
| Roster sync (Google Classroom / Clever / Wonde / LTI) | ❌ *(gap)* | ✅ deep | ✅ MIS | ⚠️ | ❌ | ❌ |
| Multi-class projects | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| Price | **Free** | Freemium→£9.38/tchr/yr | £870+/yr/school | tokens/£10mo | $30 once | free–$199/mo |

**Reading of the matrix:** SeatAI matches or beats the best optimizers on the
*engine* and *transparency*, uniquely wins on **offline/privacy**, **RTL
Hebrew/Arabic**, **room shapes**, and **3D**, and is the only top-tier optimizer
that is **free with no login**. Our one clear deficit is **roster
integration** (everyone serious has it; we have CSV only).

---

## 5. Where SeatAI Already Wins (defensible edges)

1. **Privacy-first / offline.** No student data leaves the device. In K-12 this
   is a procurement and trust advantage (FERPA/COPPA in the US, GDPR in the EU,
   and Israel's Privacy Protection Law). Competitors run server-side or pipe
   data to LLM APIs.
2. **Hebrew + Arabic RTL, plus Russian.** No serious competitor localizes to
   Hebrew/Arabic. This is the entire wedge for Israel and a differentiator for
   any RTL/multilingual market (Gulf, broader MENA, Russian-speaking diaspora).
3. **Multi-objective transparency.** We show *why* a plan scored as it did. Most
   tools are black boxes or single-objective.
4. **Layout-agnostic engine.** Rows/clusters/U/circle/custom + 3D from one slot
   model. Most rivals are grid-only.
5. **Free, no login, instant.** Zero friction vs. paid/whole-school sales cycles.

---

## 6. Gaps to Close (where rivals beat us)

| Gap | Who has it | Priority |
|---|---|---|
| **Roster import** (Google Classroom, Clever/ClassLink OneRoster, Wonde, LTI) | Mega Seating Plan, Class Charts, seatGEN | 🔴 High |
| Live constraint badges on seats during drag (green/red) | Table Tailor | 🔴 High (cheap) |
| Per-seat data overlays (IEP/behavior/ability tags on the card) | RSVPify, Cvent | 🟡 Med |
| Behavior-points / classroom-management bundle | Class Charts | 🟡 Med (scope risk) |
| Student-preference collection (QR "who do you work well with") | Mega Seating Plan | 🟡 Med |
| Exam / anti-cheating seating mode | LupSeat, India exam tools | 🟢 Low-cost adjacency |
| Honest "near-optimal, found in N generations" score framing | PerfectTablePlan | 🟢 Quick win |
| Stopping-criteria UX (time limit OR N gens no improvement) | PerfectTablePlan | 🟢 Quick win |

---

## 7. How to Win — Prioritized Plan

### Phase 0 — Sharpen the wedge (weeks, low cost, in-product)
- **Lead with privacy + multilingual + free** on the landing page. This is the
  exact ground no competitor contests.
- **Add live constraint badges** on seat cards during drag (steal from Table
  Tailor) and **per-seat IEP/behavior/ability overlays** (from RSVPify/Cvent).
- **Expose the score honestly** ("near-optimal plan, found in 2.1s over 100
  generations") and add **stopping-criteria controls** (from PerfectTablePlan).
- **Ship an exam/anti-cheating mode** — randomize + separate same-subject/
  neighbors. Low cost (we already have constraints + neighbors), opens the huge
  India exam-hall and higher-ed segment.

### Phase 1 — Kill the one real deficit: roster import (the priority integration)
Build a **single internal roster abstraction** (students/classes/enrollments)
and map providers onto it, in this order:
1. **Google Classroom API first** — self-serve, teacher-initiated, every region,
   no district sales cycle. Highest ROI, lowest cost, matches our i18n.
2. **LTI Advantage 1.3 + Names & Roles** — entry ticket to Canvas/Blackboard/
   Moodle and the higher-ed/exam segment (where seatGEN lives).
3. **OneRoster (→ ClassLink free for vendors)** before Clever (Clever charges
   vendors). One OneRoster importer also reads PowerSchool/Infinite Campus
   exports.
4. **Wonde** only if pushing UK/AU/NZ (Mega Seating Plan's turf).

*Note: keep the privacy promise intact — do imports client-side / per-session
where possible so we don't become "just another server-side tool."*

### Phase 2 — Win Israel (home-field, uncontested)
- **Native Hebrew + Arabic marketing site** (we already have the UI). Position
  as the first AI seating tool *built for Israeli classrooms*, Hebrew- and
  Arabic-native.
- **Distribute through teacher channels:** Israeli teacher Facebook groups,
  edunow.org.il-style listicles, מורים (teachers') communities, PD workshops.
- **Interoperate with Mashov/Webtop, don't fight them.** They own grades/
  attendance but have **no seating**. Offer CSV/roster import from a Mashov
  export so SeatAI is the seating layer on top of the system schools already
  use. (Strategic risk: Mashov could bundle basic seating using its behavior/
  academic data — our defense is optimization quality + the privacy/offline
  story + already being the habit.)
- **Lean on the national AI-in-education push** (Israel Innovation Authority +
  Ministry of Education "AI Sandbox") for credibility/pilots.

### Phase 3 — Win worldwide
- **Beat Mega Seating Plan on price + privacy + languages, match on optimization.**
  They're freemium-gated and English-only; we're free, multilingual, offline.
- **SEO/content** against the LLM-"AI" crowd (TeachQuill/EasyClass/Flint): rank
  for "free AI seating chart," "seating chart no login," "GDPR/FERPA-safe
  seating chart," and the Hebrew/Arabic equivalents.
- **Higher-ed/exam wedge via LTI** — productize the exam mode and embed in
  Canvas/Blackboard, the channel seatGEN occupies and where optimization depth
  is near zero.
- **Defensibility:** (a) privacy/offline architecture is hard for server-side
  incumbents to copy without re-platforming; (b) RTL/multilingual depth; (c)
  optimization transparency + multi-objective tuning; (d) breadth of room
  shapes + 3D. Keep widening these.

---

## 8. Pricing Recommendation

Stay **free for individual teachers** (it's our acquisition engine and nobody
else is both free *and* a real optimizer). Monetize where rivals do:
- **Pro (teacher):** roster sync, unlimited classes, premium exports,
  preference-collection — ~$3–5/mo or ~$30/yr (undercut Mega's £9.38 with more
  languages + privacy).
- **School/District:** OneRoster/Clever rostering, admin dashboard, SSO —
  per-seat annual, undercut Class Charts' £870 floor.
- **Higher-ed:** LTI install + exam mode, per-course or site license (seatGEN
  comparison).

---

## 9. Competitive Watch-List

| Watch | Why |
|---|---|
| **Mega Seating Plan** | Most mature true optimizer; benchmark features/speed/integrations. |
| **Class Charts (Tes)** | "Influences" peer-effect modeling; behavior-suite bundling. |
| **SeatSmart / Classivio** | Closest strategy-preset analog. |
| **PerfectTablePlan** | Proof a GA seating product sells; study fitness/stop-criteria UX. |
| **EasyClass / TeachQuill / Flint / SchoolAI** | LLM-"AI" SEO threat. |
| **Mashov / Webtop (IL)** | Installed-base risk if they bundle seating. |
| **Hill, Peuker & Mourtos 2024–25 (ILP, Wiley Networks)** | If productized, strongest technical rival. |

---

## Appendix — Source Highlights

**Direct competitors:** seatingplan.com · classcharts.com ·
seatsmart.classivio.com · schoolseatingcharts.com · seatgen.com ·
apps.apple.com (Seats by Wayfare)
**LLM "AI" tools:** easyclass.ai · teachquill.com · flintk12.com · seatmate.ai
**Event/optimization analogs:** perfecttableplan.com (+ /html/genetic_algorithm.html)
· socialtables.com / cvent.com · prismm.com · toptableplanner.com · tabletailor.app
**Exam / open source:** gitlab.com/luplab/lupseat · github.com/Miri-Shtul/Smart-Seating-Arrangement
**Integration standards:** 1edtech.org/standards/oneroster · developers.google.com/classroom
· imsglobal.org (LTI Advantage) · clever.com · classlink · wonde
**Academia:** Shin-ike & Iima 2011 (GA, ICCE/Springer) · Hill/Peuker/Mourtos
2024–25 (ILP, Wiley Networks) · Lewis & Carroll 2016 (metaheuristic, JORS) ·
Bodlaender et al. 2023 (arXiv 2305.10381)
**Israel:** mashov.info · webtop.smartschool.co.il · diginet.co.il (events) ·
innovationisrael.org.il (AI sandbox)

*Full URL list retained in the research notes that produced this document.*
