# SeatAI — Questionnaire Implementation Spec

**Audience:** engineers building the questionnaire UI, translators reviewing language equivalents, school administrators evaluating exactly what their students will be asked.

**Scientific basis:** see [QUESTIONNAIRE_SCIENTIFIC_BASIS.md](./QUESTIONNAIRE_SCIENTIFIC_BASIS.md) for citations and methodology.

**Languages:** Hebrew (primary), Arabic (primary), English, Russian.

**Last updated:** 2026-05-14

---

## Architecture overview

SeatAI collects data through **two parallel forms** with different respondents:

1. **Student Questionnaire** — completed by each student on their own device, via a private link from the teacher. 14 items + 2 preference items. Age-tiered. 6–10 minutes.
2. **Teacher Observation Form** — completed by the teacher, once per student. Combines licensed SDQ Teacher form (25 items) + practical clinical fields. 5–10 minutes per student.

Both feed the optimizer. Neither alone is sufficient.

```
[Teacher]                          [Each student]
   │                                    │
   ├─ Teacher Observation Form ─────┐   ├─ Student Questionnaire ──┐
   │  (SDQ Teacher + clinical)      │   │  (sociometric +          │
   │                                │   │   belonging + loneliness │
   │                                │   │   + self-report)         │
   ↓                                ↓   ↓
                  [Server merges both → optimizer input]
                                      │
                                      ↓
                            [Seating arrangement]
```

---

## Part 1 — Student Questionnaire

### Structure

| Section | Items | Time |
|---|---|---|
| A. Sociometric peer nominations | 4 | 2–3 min |
| B. School belonging | 4 | 1–2 min |
| C. Loneliness | 2 | 30 sec |
| D. Self-reported behavior/attention | 4 | 1 min |
| E. Preferences (labelled, not scored) | 2 | 30 sec |
| **Total** | **16** | **5–7 min** |

### Age tier adaptations

| Grade band | Adaptations |
|---|---|
| **K–2 (ages 5–7)** | Picture sociometric (photo grid, tap to select); teacher reads belonging items aloud; 3-point smiley-face scale; sections A only mandatory; sections B, C, D collected via teacher proxy via SDQ Teacher form |
| **3–5 (ages 8–10)** | Full text sociometric; reduced wording; 3-point Likert (Agree / Not sure / Disagree); reading-aloud option for ELL students; section E optional |
| **6–8 (ages 11–13)** | Full battery; 5-point Likert; optional free-text in section E |
| **9–12 (ages 14–17)** | Full battery; 5-point Likert; free-text "anything else?" field |

---

### Section A — Sociometric Peer Nominations

**Source:** Coie, Dodge & Coppotelli (1982); Cillessen & Marks (2017).

**Format:** roster of all classmates displayed (counterbalanced order, not alphabetical). Student selects **unlimited** classmates per item. Negative-nomination item (A3) can be disabled per-district policy.

**Items:**

**A1.** Which classmates do you like to spend time with? *(Choose as many as you want, or none.)*

| Lang | Wording |
|---|---|
| **Hebrew** | עם אילו תלמידים בכיתה את/ה אוהב/ת לבלות זמן? *(בחר/י כמה שתרצה/י, או אף אחד.)* |
| **Arabic** | مع أيٍّ من زملائك في الصف تحبّ أن تقضي وقتك؟ *(اختر بقدر ما تريد، أو لا تختر أحداً.)* |
| **English** | Which classmates do you like to spend time with? *(Choose as many as you want, or none.)* |
| **Russian** | С кем из одноклассников тебе нравится проводить время? *(Выбери сколько хочешь, или никого.)* |

**A2.** Which classmates do you like to work with on schoolwork?

| Lang | Wording |
|---|---|
| **Hebrew** | עם אילו תלמידים בכיתה את/ה אוהב/ת לעבוד יחד על מטלות בית הספר? |
| **Arabic** | مع أيٍّ من زملائك تحبّ أن تعمل على الواجبات المدرسية؟ |
| **English** | Which classmates do you like to work with on schoolwork? |
| **Russian** | С кем из одноклассников тебе нравится работать над школьными заданиями? |

**A3.** Which classmates do you NOT enjoy spending time with? *(This is private. Only your teacher will see your answer. You can skip this question.)*

| Lang | Wording |
|---|---|
| **Hebrew** | עם אילו תלמידים את/ה לא נהנה/ית לבלות? *(זה פרטי. רק המורה תראה את התשובה שלך. אפשר לדלג.)* |
| **Arabic** | مع أيٍّ من زملائك لا تستمتع بقضاء الوقت؟ *(هذا سري. فقط معلمك يرى الإجابة. يمكنك التخطّي.)* |
| **English** | Which classmates do you NOT enjoy spending time with? *(This is private. Only your teacher will see your answer. You can skip.)* |
| **Russian** | С кем из одноклассников тебе не нравится проводить время? *(Это конфиденциально. Только учитель увидит ответ. Можно пропустить.)* |

**A4.** Which classmates help you when you don't understand something? *(Drawn from Bukowski, Hoza & Boivin 1994 FQS Help subscale, adapted as nomination.)*

| Lang | Wording |
|---|---|
| **Hebrew** | אילו תלמידים בכיתה עוזרים לך כשאת/ה לא מבין/ה משהו? |
| **Arabic** | أيٌّ من زملائك يساعدك حين لا تفهم شيئاً؟ |
| **English** | Which classmates help you when you don't understand something? |
| **Russian** | Кто из одноклассников помогает тебе, когда ты что-то не понимаешь? |

**K–2 modification:** display 3×3 grid of classmate photos for each item. Tap one or more. No text.

---

### Section B — School Belonging

**Sources:** Goodenow (1993) PSSM items #1 and #4 (B1, B2); Arslan & Duru (2017) SBS (B3, B4).

**Format:** 5-point Likert (grades 6+) — *Strongly disagree / Disagree / Not sure / Agree / Strongly agree*. 3-point (grades 3–5) — *Disagree / Not sure / Agree*. K–2 — teacher proxy via SDQ.

**B1.** I feel like a real part of my class. *(PSSM #1, Goodenow 1993)*

| Lang | Wording |
|---|---|
| **Hebrew** | אני מרגיש/ה חלק אמיתי מהכיתה שלי. |
| **Arabic** | أشعر أنّني جزء حقيقي من صفّي. |
| **English** | I feel like a real part of my class. |
| **Russian** | Я чувствую, что я настоящая часть моего класса. |

**B2.** Other students in my class take my opinions seriously. *(PSSM #4, Goodenow 1993)*

| Lang | Wording |
|---|---|
| **Hebrew** | תלמידים אחרים בכיתה מתייחסים לדעות שלי ברצינות. |
| **Arabic** | يأخذ زملائي في الصف آرائي بجدّية. |
| **English** | Other students in my class take my opinions seriously. |
| **Russian** | Другие ученики в моём классе серьёзно относятся к моему мнению. |

**B3.** I feel I belong at this school. *(SBS, Arslan & Duru 2017)*

| Lang | Wording |
|---|---|
| **Hebrew** | אני מרגיש/ה שייכות לבית הספר הזה. |
| **Arabic** | أشعر بالانتماء إلى هذه المدرسة. |
| **English** | I feel I belong at this school. |
| **Russian** | Я чувствую, что я принадлежу этой школе. |

**B4.** I feel excluded from things at school. *(SBS reverse-coded, Arslan & Duru 2017)*

| Lang | Wording |
|---|---|
| **Hebrew** | אני מרגיש/ה מודר/ת מדברים שקורים בבית הספר. |
| **Arabic** | أشعر أنّني مُستبعَد من أشياء تحدث في المدرسة. |
| **English** | I feel excluded from things at school. |
| **Russian** | Я чувствую, что меня исключают из того, что происходит в школе. |

> **Translation note:** validated peer-reviewed Hebrew/Arabic psychometric data exists only for the SDQ. PSSM and SBS items above are working translations. A small in-country validation study is recommended before regional ministry-level deployment. See [QUESTIONNAIRE_SCIENTIFIC_BASIS.md](./QUESTIONNAIRE_SCIENTIFIC_BASIS.md) §"Limitations".

---

### Section C — Loneliness

**Source:** Asher, Hymel & Renshaw (1984) Loneliness and Social Dissatisfaction Questionnaire — 2 items from the canonical 16.

**Format:** same Likert as Section B.

**C1.** I'm lonely at school.

| Lang | Wording |
|---|---|
| **Hebrew** | אני בודד/ה בבית הספר. |
| **Arabic** | أشعر بالوحدة في المدرسة. |
| **English** | I'm lonely at school. |
| **Russian** | Мне одиноко в школе. |

**C2.** I have nobody to talk to in class.

| Lang | Wording |
|---|---|
| **Hebrew** | אין לי עם מי לדבר בכיתה. |
| **Arabic** | ليس لديّ من أتحدّث إليه في الصف. |
| **English** | I have nobody to talk to in class. |
| **Russian** | Мне не с кем поговорить в классе. |

---

### Section D — Self-Reported Behavior / Attention

**Source:** Goodman (1997) SDQ Self-Report (ages 11+). Items selected for direct relevance to seating decisions.

**Note on licensing:** these items are reproduced verbatim from the SDQ Self-Report form. The SDQ is free for paper non-commercial use; commercial app integration requires licensing from Youthinmind. SeatAI's plan is to **license the Teacher form** for the teacher overlay and **either (a) license the Self-Report form** or **(b) replace Section D with equivalent public-domain items**. Engineering decision pending; see "Implementation TODOs" below.

**Format:** 3-point — *Not true / Somewhat true / Certainly true* (SDQ standard).

**D1.** I am restless, I cannot stay still for long. *(SDQ Hyperactivity subscale)*

| Lang | Wording |
|---|---|
| **Hebrew** | אני חסר/ת מנוחה, לא יכול/ה לשבת במקום אחד הרבה זמן. *(תרגום רשמי SDQ — Mansbach-Kleinfeld et al. 2010)* |
| **Arabic** | لا أهدأ، ولا أستطيع البقاء ثابتاً لفترة طويلة. *(الترجمة الرسمية SDQ — Alyahri & Goodman 2006)* |
| **English** | I am restless, I cannot stay still for long. |
| **Russian** | Я беспокойный, не могу долго сидеть на месте. |

**D2.** I am easily distracted, I find it difficult to concentrate. *(SDQ Hyperactivity subscale)*

| Lang | Wording |
|---|---|
| **Hebrew** | אני מסיח/ה דעת בקלות, קשה לי להתרכז. *(תרגום רשמי SDQ — Mansbach-Kleinfeld et al. 2010)* |
| **Arabic** | يسهل تشتيت انتباهي، وأجد صعوبة في التركيز. *(الترجمة الرسمية SDQ — Alyahri & Goodman 2006)* |
| **English** | I am easily distracted, I find it difficult to concentrate. |
| **Russian** | Меня легко отвлечь, мне трудно сосредоточиться. |

**D3.** Other children or young people pick on me or bully me. *(SDQ Peer Problems subscale)*

| Lang | Wording |
|---|---|
| **Hebrew** | ילדים אחרים מציקים לי או מתעמרים בי. *(תרגום רשמי SDQ — Mansbach-Kleinfeld et al. 2010)* |
| **Arabic** | يضايقني أو يتنمّر عليّ أطفال أو شباب آخرون. *(الترجمة الرسمية SDQ — Alyahri & Goodman 2006)* |
| **English** | Other children or young people pick on me or bully me. |
| **Russian** | Другие дети или подростки придираются ко мне или травят меня. |

**D4.** I have one good friend or more. *(SDQ Peer Problems subscale, reverse-coded protective factor)*

| Lang | Wording |
|---|---|
| **Hebrew** | יש לי חבר/ה טוב/ה אחד/ת או יותר. *(תרגום רשמי SDQ — Mansbach-Kleinfeld et al. 2010)* |
| **Arabic** | لديّ صديق جيّد واحد أو أكثر. *(الترجمة الرسمية SDQ — Alyahri & Goodman 2006)* |
| **English** | I have one good friend or more. |
| **Russian** | У меня есть один хороший друг или больше. |

---

### Section E — Preferences *(labelled, not psychometric)*

**Source:** none — these are **preferences**, not validated psychometric items. UI must label this section clearly. Optimizer treats inputs as low-weight soft constraints.

**E1.** Where do you focus best in the classroom? *(Optional)*
- Near the front (close to the teacher)
- In the middle
- Near the back
- Near a window
- Near a quiet corner
- No preference

**E2.** What distracts you most when you are trying to focus? *(Optional, multi-select)*
- Other students talking
- Movement around me
- Noise from outside the room
- Bright light
- Nothing in particular

**Translations** (E1 and E2 follow the same pattern; full Hebrew/Arabic/English/Russian wordings to be drafted with a native-speaking teacher reviewer before launch).

---

## Part 2 — Teacher Observation Form

### Structure

| Section | Items | Source | Time |
|---|---|---|---|
| F. SDQ Teacher Form | 25 items, 5 subscales | Goodman 1997 (licensed) | 5 min |
| G. Clinical / accessibility | 8 fields | Practical / non-psychometric | 2 min |
| H. Hard seating rules | 4 rule types | Practical / non-psychometric | 1 min |
| **Total per student** | **~37 items** | | **~8 min** |

### Section F — SDQ Teacher Form (25 items)

Used verbatim under license from Youthinmind. Full item list is reproduced in the SDQ Teacher form (ages 4–17) available at https://www.sdqinfo.org/py/sdqinfo/b3.py. Five subscales:

1. **Emotional symptoms** — 5 items (e.g., "often complains of headaches, stomach-aches or sickness")
2. **Conduct problems** — 5 items (e.g., "often loses temper")
3. **Hyperactivity-inattention** — 5 items (e.g., "restless, overactive, cannot stay still for long") *[load-bearing for seat placement]*
4. **Peer relationship problems** — 5 items (e.g., "rather solitary, tends to play alone")
5. **Prosocial behavior** — 5 items (e.g., "considerate of other people's feelings")

Plus optional **Impact Supplement** (Goodman, 1999): 5 questions on chronicity, distress, impairment, and burden.

**Validated translations to use:**
- Hebrew: Mansbach-Kleinfeld et al. 2010 official translation
- Arabic: Alyahri & Goodman 2006 official translation
- English: original
- Russian: sdqinfo.org official translation

> Do NOT translate SDQ items in-house. Use the official validated translations only — that is what licensing protects.

### Section G — Clinical / Accessibility Fields

Practical non-psychometric fields. The teacher (and only the teacher) fills these. They map directly to hard or soft optimizer constraints.

| Field | Type | Optimizer effect |
|---|---|---|
| Wears glasses / vision-impaired | Checkbox + severity (mild/moderate/severe) | Hard: severe → front 2 rows; moderate → front half |
| Hearing impairment | Checkbox + severity | Hard: prefer left/right side based on better ear; close to teacher |
| Mobility / wheelchair / crutches | Checkbox | Hard: aisle seat, near exit |
| ADHD (formal diagnosis) | Checkbox | Hard: front of room, away from window/door traffic, near teacher |
| Anxiety / sensory sensitivity | Checkbox | Soft: quiet area, not near group-work table |
| Allergies (food/environmental) | Free text | Display in substitute pack only |
| Medications (PRN, e.g., inhaler) | Free text | Display in substitute pack only |
| IEP / 504 accommodation summary | Free text | Display in per-student print sheet |

### Section H — Hard Seating Rules

Per-teacher overrides. Higher priority than any other data source.

| Rule | Format |
|---|---|
| Must sit in row N | Student + row number |
| Must sit next to / near Student X | Student + Student |
| Must NOT sit next to Student X | Student + Student |
| Must be near teacher's desk / aisle / window / door | Student + location preset |

---

## Implementation TODOs (engineering)

1. **Decide Section D licensing** — license SDQ Self-Report from Youthinmind, or replace with public-domain items? Recommend licensing for v1; cost passes through to school pricing.
2. **Generate official SDQ items only via Youthinmind license.** Do NOT embed SDQ verbatim items in repo without license.
3. **Picture roster for K–2** — store student photos, render as tap-grid for Section A.
4. **Per-district disable of A3 (negative nominations).** Settings toggle at class or district level.
5. **Parental consent capture** — must be recorded before student questionnaire link is active.
6. **Translation review** — Hebrew and Arabic working translations of PSSM, SBS, Asher items need native-speaker teacher review before launch. Schedule pilot validation.
7. **Counterbalance roster name order** — randomize per student (deterministic seed by student ID) per Cillessen & Marks (2017).
8. **Save & resume** — students must be able to leave and resume; do not require single-sitting completion.
9. **Reading aloud** — TTS option in Hebrew, Arabic, English, Russian for grades 3–5 and ELL learners.
10. **Aggregate-only display to teachers for A3 negative nominations.** Never show "Student B was nominated negatively by Student A" as raw data; show "Avoid adjacency: Student A & Student B."

---

## Optimizer input mapping

Each questionnaire item maps to a specific optimizer input. This is the source of explanations rendered in `ExplanationPanel.tsx`.

| Questionnaire item | Optimizer input | Constraint type |
|---|---|---|
| A1, A2 (positive noms) | `friends_ids[]` per student | Soft (maximize adjacency) |
| A3 (negative noms) | `incompatible_ids[]` per student | Soft (minimize adjacency) |
| A4 (help) | `mentor_pairs[]` | Soft (boost adjacency for peer tutoring) |
| B1–B4, C1–C2 | `belonging_score` (composite) | Outcome only; not a constraint |
| D1, D2 | self-report `attention_difficulty_score` | Soft (boost weight of front-row preference) |
| D3 | `is_bullied_self_report` | Hard (separate from any nominated bullies) |
| D4 | `has_close_friend` | Indirectly via A1/A2 |
| E1 | `preferred_location` | Soft, lowest weight |
| E2 | `distractors[]` | Soft (avoid placing near sources of named distractor) |
| F1 (Teacher Emotional) | `emotional_symptoms_score` | Soft (prefer quiet area) |
| F2 (Teacher Conduct) | `conduct_score` | Soft (avoid clustering high-conduct students) |
| F3 (Teacher Hyperactivity) | `hyperactivity_score` | Hard if top quartile (front + away from window) |
| F4 (Teacher Peer Problems) | `peer_problems_score` | Soft (consider buddy placement) |
| F5 (Teacher Prosocial) | `prosocial_score` | Soft (use as buddies for peer-problem students) |
| G (clinical) | mapped per row in §G table | Hard for vision/hearing/mobility/ADHD |
| H (hard rules) | direct optimizer constraints | Hard |

---

## Versioning

This spec is the source of truth for the questionnaire. Any change to wording, scoring, or order requires:
1. A pull request updating this file.
2. A note in [QUESTIONNAIRE_SCIENTIFIC_BASIS.md](./QUESTIONNAIRE_SCIENTIFIC_BASIS.md) if scientific basis changes.
3. A version bump in this file's header.
4. Re-review by a child psychology consultant if items are added or removed.

**Current version:** v1.0-draft (2026-05-14)
