# SeatAI — Scientific Basis for the Seating Engine

This document records the **research evidence behind every rule and
objective** the optimizer uses. The goal is honesty, not marketing: each
factor below is tagged with how strong the evidence actually is, and where
the research is thin or mixed we say so plainly.

Evidence strength is graded:

- **Strong** — multiple peer‑reviewed studies and/or a review/meta‑analysis,
  replicated over years.
- **Moderate** — credible peer‑reviewed studies, but fewer, narrower, or with
  mixed results.
- **Practice / legal** — established professional practice or a legal
  accommodation requirement (IDEA / Section 504), rather than experimental
  proof of an achievement effect.
- **Weak** — limited or contested evidence; included as an optional preference,
  not a claim of proven benefit.

> Scope note: most classroom‑seating research is on K‑12 students. Effect sizes
> vary with grade, subject, classroom design, and teaching style, so these are
> tendencies, not guarantees. SeatAI uses them as *weighted preferences* in a
> search — it does not claim any single chart is optimal.

---

## 1. The core premise: teacher‑assigned seating

**What the app does:** SeatAI produces a teacher‑assigned seating chart rather
than letting students pick seats.

**Evidence: Strong.** In a controlled study, fifth‑graders showed disruptive
behaviour about **twice as often** during group seating, and **more than three
times as often** during individual seatwork, when *they* chose their seats
versus when the *teacher* assigned them.

- Bicard, D. F., Ervin, A., Bicard, S. C., & Baylot‑Casey, L. (2012).
  Differential effects of seating arrangements on disruptive behavior of fifth
  grade students during independent seatwork. *Journal of Applied Behavior
  Analysis, 45*(2), 407–411.
  https://pmc.ncbi.nlm.nih.gov/articles/PMC3405935/

---

## 2. Front‑row / proximity to the teacher (the "action zone")

**What the app does:** `requires_front_row`, the `front_row` rule, and the
`special_needs` objective reward seating certain students at the front / near
the teacher.

**Evidence: Strong for engagement and behaviour; moderate for raw achievement.**
The front‑and‑centre region is repeatedly identified as a high‑interaction
"action zone": more eye contact, questions, and on‑task behaviour. Closer
proximity to the teacher is associated with higher engagement.

- Wannarka, R., & Ruhl, K. (2008). Seating arrangements that promote positive
  academic and behavioural outcomes: A review of empirical research. *Support
  for Learning, 23*(2), 89–93.
  https://nasenjournals.onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-9604.2008.00375.x
- Blume, F., et al. (2021). The influence of teacher–student proximity, teacher
  feedback, and near‑seated peer groups on classroom engagement (agent‑based
  modelling). *PLOS ONE, 16*(1), e0244935. *(A modelling study — supports the
  mechanism, not a classroom trial.)*
  https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0244935

---

## 3. Seating students with ADHD / attention difficulties near the front

**What the app does:** `requires_front_row` is recommended for attention needs;
the optimizer keeps these students near the front and away from the periphery.

**Evidence: Strong (as best practice) / moderate (experimental).** Preferential
seating near the teacher is a long‑standing, evidence‑based recommendation for
students with ADHD: it improves monitoring and on‑task behaviour. A
meta‑analytic review found classroom (antecedent‑based) interventions reduce
off‑task and disruptive behaviour in children with ADHD symptoms.

- Gaastra, G. F., Groen, Y., Tucha, L., & Tucha, O. (2016). The effects of
  classroom interventions on off‑task and disruptive classroom behavior in
  children with symptoms of ADHD: A meta‑analytic review. *PLOS ONE, 11*(2),
  e0148841. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4757442/

---

## 4. Preferential seating for sensory & mobility needs

**What the app does:** `requires_front_row`, `has_mobility_issues`,
`requires_quiet_area` steer students with vision, hearing, or mobility needs to
appropriate seats (front, near the board, on an accessible edge/aisle).

**Evidence: Practice / legal.** This is standard accessibility practice and is
frequently written into IEP / Section 504 plans, which schools are legally
required to honour. The justification is access (seeing the board, hearing the
teacher, safe egress), not a measured achievement boost.

- Perkins School for the Blind — *Preferential seating and low vision.*
  https://www.perkins.org/resource/choosing-seat-class/
- College Board — *Documentation guidelines: hearing impairment accommodations.*
  https://accommodations.collegeboard.org/request-accommodations/provide-documentation/by-disability/hearing-impairments

---

## 5. Mixing ability among neighbours (the `academic_balance` objective)

**What the app does:** rewards seating each student near neighbours whose
academic level is close to theirs — i.e. avoids isolating very weak or very
strong students and avoids hard ability‑grouping.

**Evidence: Moderate, with an honest caveat.** Peer effects are real: lower‑
achieving students tend to **gain** from being seated near higher‑achieving
peers, and helping the weakest students can benefit the whole class. **But**
reshuffling a class purely by prior achievement does **not** raise the class
*average*, and pairing a top student directly with a very weak one can slightly
lower the top student's outcome. SeatAI therefore aims for *balance* (avoiding
extremes), which is the defensible reading of this literature — not a promise of
higher average grades.

- Burke, M. A., & Sass, T. R. (2013). Classroom peer effects and student
  achievement. *Journal of Labor Economics, 31*(1), 51–82.
  https://www.journals.uchicago.edu/doi/10.1086/666653
- Feld, J., & Zölitz, U., and related peer‑effects work; plus primary‑school
  evidence that improving low achievers benefits higher achievers too
  (*Journal of Public Economics*, 2023).
  https://www.sciencedirect.com/science/article/pii/S004727272300107X

---

## 6. Spreading out behavioural challenges (`behavioral_balance`, `separate_pairs`)

**What the app does:** the `behavioral_balance` objective avoids clustering
challenging students together; `separate_pairs` keeps specific pairs apart.

**Evidence: Strong.** Seating is one of the cheapest, most effective antecedent
classroom‑management tools, and rows / spread‑out arrangements produce more
on‑task and less disruptive behaviour during independent work — an effect that
is largest precisely for the more disruptive students. Keeping known‑disruptive
pairs apart follows directly.

- Wannarka & Ruhl (2008), as above.
- Bicard et al. (2012), as above.

---

## 7. Quiet zones & exam spacing (`requires_quiet_area`, exam mode)

**What the app does:** seats students who need calm on the perimeter; exam mode
spreads students apart and penalises similar‑ability / friend adjacency.

**Evidence: Moderate.** Fewer and less‑stimulating neighbours reduces
distraction during independent work (consistent with the rows‑vs‑groups
findings above). Physical spacing during tests is universal exam‑integrity
practice. We label the *anti‑cheating* spacing as practice‑based rather than a
specific cited effect size.

- Wannarka & Ruhl (2008), as above.

---

## 8. Gender / diversity mix (`diversity` objective)

**What the app does:** a low‑weight objective that nudges toward mixed‑gender
neighbours.

**Evidence: Weak / mixed.** Research on gender composition and seating is
limited and inconsistent; we do **not** claim a proven achievement effect. It is
offered as an *optional, low‑weight social/equity preference* that teachers can
turn down or off. This is the most speculative factor in the engine and is
labelled as such in the UI rationale.

---

## 9. Rotating neighbours over time ("freshen seating")

**What the app does:** optionally discourages re‑seating the same pairs of
neighbours across consecutive charts.

**Evidence: Weak / indirect.** The rationale is broadening peer exposure and
social mixing rather than a directly measured academic effect. Treated as an
opt‑in preference, not a core claim.

---

## How this maps to "hard" vs "soft" rules

The evidence above also tells us which rules deserve to be **non‑negotiable**
versus **preferences** — the basis for SeatAI's hard/soft rule distinction:

| Rule | Default strength | Why |
| --- | --- | --- |
| Accessibility seating (vision / hearing / mobility / ADHD front‑row) | **Hard** | Legal accommodation (IDEA/504) + strong best‑practice evidence |
| Keep specific students apart (`separate_pairs`) | **Hard** | Teachers mean these as absolute; safety/behaviour |
| Academic & behavioural balance | **Soft** | Optimization goals with moderate evidence |
| Keep‑together, diversity, rotation | **Soft** | Preferences; moderate‑to‑weak evidence |

---

## Maintenance note

When adding or changing a seating factor, add its evidence and a citation here,
with an honest strength grade. If a factor has no credible support, it should be
optional, low‑weight, and labelled as a preference — never presented to teachers
as scientifically established.

*Last updated: 2026‑06‑10.*
