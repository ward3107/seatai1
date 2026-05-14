# SeatAI — Scientific Basis for the Data Collection Questionnaire

**Audience:** school principals, district administrators, Ministry of Education reviewers, parents who ask "what is this app collecting from my child and why?"

**Status:** approved foundation document. Items in the implementation spec ([QUESTIONNAIRE_SPEC.md](./QUESTIONNAIRE_SPEC.md)) are drawn directly from the validated instruments cited here.

**Last updated:** 2026-05-14

---

## Why a scientifically validated questionnaire

SeatAI optimizes classroom seating arrangements. The quality of the optimization depends entirely on the quality of the data fed to it. We made an explicit policy decision:

> **We do not invent psychological items.** Every question students or teachers answer is drawn from a published, peer-reviewed, validated instrument used in education and developmental psychology research. Where no validated instrument exists for a specific need (e.g., "where in the room do you focus best?"), we collect it as a *preference* — labelled as such — not as a psychometric measurement.

This policy gives SeatAI three things competitors cannot easily claim:

1. **Defensibility.** When a parent asks why their child is being asked who they don't like to sit next to, the answer is: this is the Coie-Dodge sociometric method, used in thousands of peer-reviewed studies since 1982.
2. **Trust from buyers.** Schools and ministries that procure educational technology have legal and reputational risk. Validated instruments materially reduce that risk.
3. **Cross-cultural validity.** Where we use instruments validated in Hebrew, Arabic, English, and Russian, we can deploy across our target markets with reasonable confidence in measurement equivalence.

---

## The four instruments we combine

SeatAI's questionnaire battery is a **hybrid** drawn from four validated sources. We chose this composition because each instrument addresses a different load-bearing question for seat placement, and together they cover what the optimizer needs without duplication.

### 1. Sociometric peer nominations (Coie, Dodge & Coppotelli, 1982)

**Citation:** Coie, J. D., Dodge, K. A., & Coppotelli, H. (1982). Dimensions and types of social status: A cross-age perspective. *Developmental Psychology, 18*(4), 557–570.

The Coie-Dodge methodology has been the gold standard for measuring children's peer status for over 40 years. Students nominate classmates they like most and like least, and the resulting scores classify children into five social status types (Popular, Rejected, Neglected, Controversial, Average). For SeatAI we use only the underlying nomination data; we do not assign status labels.

**Modern best practices** (Cillessen & Marks, 2017, *New Directions for Child and Adolescent Development, 157*, 21–44):
- Unlimited nominations are more reliable than fixed-number (e.g., "pick exactly 3") nominations
- Use both positive and negative nominations — they are statistically independent
- Counterbalance roster name order to remove alphabetical bias
- Administer privately, never aloud

**Ethics of negative nominations.** This is the most-debated aspect of sociometric research. Empirical studies that have measured harm (Mayeux, Underwood & Risser, 2007; Bukowski, Cillessen & Velásquez, 2012) **have not found measurable negative effects** on peer relations from participation. Modern practice requires:
- Active parental consent
- Child assent
- Private administration
- Confidential aggregate-only reporting to teachers
- Never display "who chose not to sit next to you" to peers

SeatAI implements all four safeguards. Negative nominations are stored encrypted and visible only to the teacher in aggregated form (e.g., "avoid seating Student A adjacent to Student B"), never displayed as raw "who disliked whom" lists.

**Verification source:** Cillessen & Marks 2017 — https://onlinelibrary.wiley.com/doi/10.1002/cad.20206 ; Poulin & Dishion 2008 — https://pmc.ncbi.nlm.nih.gov/articles/PMC2812902/

### 2. Strengths and Difficulties Questionnaire — Teacher Form (Goodman, 1997)

**Citation:** Goodman, R. (1997). The Strengths and Difficulties Questionnaire: A research note. *Journal of Child Psychology and Psychiatry, 38*(5), 581–586.

The SDQ is the most widely used child behavioral screener in the world — translated into 80+ languages, used in over 8,000 published studies. It is the standard instrument for measuring:

- **Emotional symptoms** (5 items)
- **Conduct problems** (5 items)
- **Hyperactivity-inattention** (5 items) — critical for seat placement (front row, away from windows, near teacher)
- **Peer relationship problems** (5 items)
- **Prosocial behavior** (5 items, strengths-based)

SeatAI embeds the **Teacher form (ages 4-17)** as the load-bearing "teacher overlay" — the professional clinical observation layer that complements student self-report.

**Validated translations relevant to SeatAI markets:**

- **Hebrew:** Mansbach-Kleinfeld, I., Apter, A., Farbstein, I., Levine, S. Z., & Ponizovsky, A. M. (2010). A population-based psychometric validation study of the Strengths and Difficulties Questionnaire – Hebrew version. *Frontiers in Psychiatry, 1*, 151. (Total Difficulties Cronbach's α = 0.77.) https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2010.00151/full
- **Arabic:** Alyahri, A., & Goodman, R. (2006). Validation of the Arabic Strengths and Difficulties Questionnaire and the Development and Well-Being Assessment. *Eastern Mediterranean Health Journal, 12*(Suppl 2), S138–S146.
- **English:** original instrument; widely validated.
- **Russian:** translation available via sdqinfo.org; multiple validation studies exist.

Full validated translation list: https://www.sdqinfo.org/py/sdqinfo/b3.py

**Licensing:** SDQ is free for paper non-commercial use. Electronic/app integration requires a commercial license from Youthinmind (https://youthinmind.com/copyright/). SeatAI's commercial model: license SDQ Teacher form for embedded use (~$2–3 per student per year, passed through in school pricing).

### 3. Psychological Sense of School Membership — short subset (Goodenow, 1993)

**Citation:** Goodenow, C. (1993). The psychological sense of school membership among adolescents: Scale development and educational correlates. *Psychology in the Schools, 30*(1), 79–90.

The PSSM is the most-cited classroom belonging scale internationally. We use a 2-item subset drawn from the most reliable items.

**Psychometric properties** (Goodenow, 1993): Cronbach's α = 0.77–0.88 across urban, suburban, English, and Spanish samples. Validated for ages 11–18 in the original paper; subsequent work has extended use down to age 8.

**Translation status:** No published peer-reviewed Hebrew or Arabic psychometric validation paper located. SeatAI uses working translations for Hebrew/Arabic and labels them clearly as *"translated; psychometric properties in these languages not yet established."* For ministry-level procurement, a small in-country validation study is recommended (cost ~$15–25K, university partner, n≈200).

**Verification source:** https://onlinelibrary.wiley.com/doi/10.1002/1520-6807%28199301%2930%3A1%3C79%3A%3AAID-PITS2310300113%3E3.0.CO%3B2-X

### 4. School Belongingness Scale (Arslan & Duru, 2017) + Asher Loneliness Scale (Asher, Hymel & Renshaw, 1984)

**Citations:**

- Arslan, G., & Duru, E. (2017). Initial development and validation of the School Belongingness Scale. *Child Indicators Research, 10*(4), 1043–1058. https://link.springer.com/article/10.1007/s12187-016-9414-y
- Asher, S. R., Hymel, S., & Renshaw, P. D. (1984). Loneliness in children. *Child Development, 55*(4), 1456–1464. https://www.jstor.org/stable/1130015

We use a small subset from each:
- SBS — 2 items (Social Acceptance, Social Exclusion factors). 10-item full scale; Cronbach's α = 0.89.
- Asher Loneliness — 2 items from the canonical 16-item scale. Cronbach's α = 0.90 (Asher et al., 1984).

These give two short, validated reads on whether the child currently feels included or isolated — material context for seat placement.

---

## What we deliberately do NOT use

### Learning styles inventories (VARK, Dunn & Dunn, Kolb LSI, Honey & Mumford)

The scientific status of "learning styles" is settled and negative.

**Citations:**
- Pashler, H., McDaniel, M., Rohrer, D., & Bjork, R. (2008). Learning styles: Concepts and evidence. *Psychological Science in the Public Interest, 9*(3), 105–119. https://journals.sagepub.com/doi/full/10.1111/j.1539-6053.2009.01038.x
- Riener, C., & Willingham, D. T. (2010). The myth of learning styles. *Change: The Magazine of Higher Learning, 42*(5), 32–35.

Pashler et al. (commissioned by the *Association for Psychological Science*) reviewed the entire empirical literature and concluded there is **no credible evidence** that matching instruction to a child's claimed "learning style" improves learning. Riener and Willingham state the conclusion directly: *"There is no credible evidence that learning styles exist."*

Teachers and parents will sometimes expect to see VARK-style ("are you visual, auditory, or kinesthetic?") items. Our position is that including discredited items would compromise the scientific integrity of the entire battery. **We will not include them.** Public-facing materials should be prepared to explain this politely.

### Bespoke "compatibility scores"

Any algorithm that scores how "compatible" two children are based on items we invented (vs. drawn from validated instruments) is unfalsifiable and not defensible to a reviewer. SeatAI's compatibility scoring is derived from peer nominations (Coie-Dodge), not from invented personality matching.

### Self-reported precise seating preferences

There is no peer-reviewed validated instrument for items like *"do you focus better near the window or near the door?"* Such items, where collected, are stored and labelled as **preferences**, not psychometric scores. The optimizer treats them as soft inputs, weighted below validated data.

### Public-display of negative peer nominations

Negative ("like-least") nominations are stored encrypted, visible only to the teacher in aggregate form. They are never displayed to students or parents. They are never used to label or rank a child.

---

## Age-appropriateness

| Grade band | Ages | Adaptations | Reference |
|---|---|---|---|
| K–2 | 5–7 | Picture sociometric (photo grid, point-and-select); teacher reads belonging items aloud; 5-point smiley-face scale | Hayvren & Hymel (1984), *Developmental Psychology, 20*(5), 844–849. Test-retest r = 0.79 over 8 weeks in 4–5-year-olds. |
| 3–5 | 8–10 | Full text-based sociometric with reduced item count; simplified Likert (3-point); reading-aloud option for ELL students | Asher Loneliness Scale validated from age 8 |
| 6–8 | 11–13 | Full battery; optional SDQ student self-report (11–17) | Goodenow PSSM validated from age 11 |
| 9–12 | 14–17 | Full battery + optional free-text "anything else the teacher should know?" | All instruments validated in this range |

---

## Ethics, consent, and privacy

SeatAI is a commercial product, not a research project, so its legal frame is service-agreement consent (not an IRB). We nonetheless adopt research-grade ethical practices because they are best practice and because schools require them:

1. **Active parental consent** before any student opens the questionnaire. SeatAI generates a consent form (in the family's language) the school distributes; the student questionnaire is locked until consent is recorded.
2. **Child assent** at the start of the questionnaire — a simple "this is voluntary, you can skip questions" affirmation appropriate to age.
3. **Private administration** — questionnaire is per-device, not classroom-projected.
4. **Confidential storage** — peer nominations encrypted at rest; aggregate visibility to teacher only.
5. **No public display of "like-least" data** at any point in the product.
6. **Right to withdraw** — student or parent can request deletion; teacher dashboard exposes a delete control.
7. **Data retention** — automatic deletion at end of school year by default; teacher may extend with explicit action.
8. **No data leaves the customer school** by default — SeatAI hosts data per-school instance; cross-school sharing requires explicit opt-in.

**Regulatory frameworks SeatAI complies with:**
- **GDPR-K** (EU/Israel): parental consent for minors under 16 (or country-specific lower bound).
- **FERPA** (US): data processing agreement signed with the school; SeatAI acts as a service provider, not an educational agency.
- **COPPA** (US, under 13): parental consent before any data collection.
- **Israeli Privacy Protection Law (5741-1981)** and Ministry of Education data protection guidelines.

---

## How the data feeds the optimizer

The four-instrument battery produces structured data the genetic-algorithm optimizer (`web/src/core/optimizer.ts` and successor) consumes as follows:

| Data point | Source instrument | Optimizer treatment |
|---|---|---|
| Positive peer nominations (item-level) | Coie-Dodge (items 1, 2, 4) | Soft constraint: maximize adjacency between mutually-nominating pairs |
| Negative peer nominations (item-level) | Coie-Dodge (item 3) | Soft constraint: minimize adjacency between mutually negative-nominating pairs |
| Teacher SDQ Hyperactivity-Inattention | SDQ Teacher (5 items) | Hard rule (top quartile): place in front, away from windows, near teacher |
| Teacher SDQ Peer Problems | SDQ Teacher (5 items) | Soft constraint: do not cluster high-scoring students; consider buddy placement |
| Teacher SDQ Emotional Symptoms | SDQ Teacher (5 items) | Soft constraint: prefer quiet area, away from frequent-traffic seats |
| Self-reported loneliness | Asher items | Soft constraint: prefer seat adjacent to a positive nomination from this student |
| Self-reported belonging | PSSM/SBS items | Outcome measure for whole-class evaluation (not a constraint per se) |
| Teacher clinical fields (vision, hearing, mobility, IEP/504) | Teacher overlay form (not psychometric) | Hard rules: e.g., vision impairment → front; mobility → aisle; specific accommodations encoded as case-by-case rules |
| Student preferences (focus location) | Free-form preferences (labelled, not validated) | Soft constraint, lowest weight |

Every optimization decision the platform shows to a teacher can be traced back to a specific data point from a specific instrument. This is the foundation of the per-placement explanations rendered in `ExplanationPanel.tsx`.

---

## Limitations we acknowledge openly

1. **No Hebrew/Arabic psychometric validation** for PSSM, SBS, and Asher Loneliness items in our current data set. Translations are working translations, not psychometrically equivalent to the originals. A small in-country validation study is recommended before regional ministry-level deployment.
2. **SDQ Peer Problems subscale** is the weakest SDQ subscale cross-culturally (Goodman, Renfrew & Mullick, 2000); we use it as a soft input only.
3. **No validated seating-preference instrument exists.** We collect preferences as labelled preferences, not as scored data.
4. **Self-report under age 8** is unreliable for belonging-type items; we rely on picture sociometric + teacher SDQ at K–2.
5. **Negative peer nominations remain ethically discussed.** We adopt research-grade safeguards; some districts may still prohibit them. SeatAI must support disabling negative-nomination items per district policy.

---

## Key references (full citation list)

- Arslan, G., & Duru, E. (2017). Initial development and validation of the School Belongingness Scale. *Child Indicators Research, 10*(4), 1043–1058.
- Asher, S. R., Hymel, S., & Renshaw, P. D. (1984). Loneliness in children. *Child Development, 55*(4), 1456–1464.
- Alyahri, A., & Goodman, R. (2006). Validation of the Arabic Strengths and Difficulties Questionnaire and the Development and Well-Being Assessment. *Eastern Mediterranean Health Journal, 12*(Suppl 2), S138–S146.
- Bukowski, W. M., Cillessen, A. H. N., & Velásquez, A. M. (2012). The use of peer ratings in developmental research. In B. Laursen, T. D. Little, & N. A. Card (Eds.), *Handbook of developmental research methods* (pp. 211–228). Guilford.
- Bukowski, W. M., Hoza, B., & Boivin, M. (1994). Measuring friendship quality during pre- and early adolescence: The development and psychometric properties of the Friendship Qualities Scale. *Journal of Social and Personal Relationships, 11*(3), 471–484.
- Cillessen, A. H. N. (2009). Sociometric methods. In K. H. Rubin, W. M. Bukowski, & B. Laursen (Eds.), *Handbook of peer interactions, relationships, and groups* (pp. 82–99). Guilford.
- Cillessen, A. H. N., & Marks, P. E. L. (2017). Methodological choices in peer nomination research. *New Directions for Child and Adolescent Development, 157*, 21–44.
- Coie, J. D., Dodge, K. A., & Coppotelli, H. (1982). Dimensions and types of social status: A cross-age perspective. *Developmental Psychology, 18*(4), 557–570.
- Goodenow, C. (1993). The psychological sense of school membership among adolescents: Scale development and educational correlates. *Psychology in the Schools, 30*(1), 79–90.
- Goodman, R. (1997). The Strengths and Difficulties Questionnaire: A research note. *Journal of Child Psychology and Psychiatry, 38*(5), 581–586.
- Goodman, R., Renfrew, D., & Mullick, M. (2000). Predicting type of psychiatric disorder from Strengths and Difficulties Questionnaires (SDQ) scores in child mental health clinics in London and Dhaka. *European Child & Adolescent Psychiatry, 9*(2), 129–134.
- Hayvren, M., & Hymel, S. (1984). Ethical issues in sociometric testing: Impact of sociometric measures on interaction behavior. *Developmental Psychology, 20*(5), 844–849.
- Mansbach-Kleinfeld, I., Apter, A., Farbstein, I., Levine, S. Z., & Ponizovsky, A. M. (2010). A population-based psychometric validation study of the Strengths and Difficulties Questionnaire – Hebrew version. *Frontiers in Psychiatry, 1*, 151.
- Mayeux, L., Underwood, M. K., & Risser, S. D. (2007). Perspectives on the ethics of sociometric research with children: How children, peers, and teachers help to inform the debate. *Merrill-Palmer Quarterly, 53*(1), 53–78.
- Moreno, J. L. (1934). *Who shall survive? A new approach to the problem of human interrelations*. Nervous and Mental Disease Publishing.
- Pashler, H., McDaniel, M., Rohrer, D., & Bjork, R. (2008). Learning styles: Concepts and evidence. *Psychological Science in the Public Interest, 9*(3), 105–119.
- Poulin, F., & Dishion, T. J. (2008). Methodological issues in the use of peer sociometric nominations with middle school youth. *Social Development, 17*(4), 908–921.
- Riener, C., & Willingham, D. T. (2010). The myth of learning styles. *Change: The Magazine of Higher Learning, 42*(5), 32–35.

---

*This document is the scientific charter for SeatAI's data collection. Any change to the questionnaire battery, scoring, or interpretation must be reflected here and reviewed against the cited literature.*
