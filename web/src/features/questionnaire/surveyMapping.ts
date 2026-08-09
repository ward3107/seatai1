import type { Student, SeatingConstraints } from '../../types';

/**
 * Pure mapping between the student questionnaire answers and the data
 * SeatAI's optimizer actually consumes. Kept side-effect free so it's
 * easy to unit-test and so the modal stays thin.
 *
 * Evidence base for each item:
 *
 * B1 — POSITIVE PEER NOMINATIONS (up to 3 seatmates)
 *   Sociometric method (Moreno; Coie, Dodge & Coppotelli 1982). We include
 *   positive nominations ONLY. Negative "like least" items were considered and
 *   REJECTED for use with students because:
 *     - They are the leading reason parents/schools refuse consent
 *       (Zakriski et al. 1999).
 *     - They show more response bias — students answer dislike items less
 *       carefully (roster list-order bias r ≈ −.31 for rejection vs −.14 for
 *       acceptance; Ryan & Bauman).
 *   The "do NOT seat these two together" input is instead collected from the
 *   TEACHER (`constraints.separate_pairs`), which is defensible clinical
 *   judgement rather than a peer-vote on rejection.
 *
 * B2 — RECIPROCAL "HELPER" NOMINATION (peer-mentor)
 *   Peer helping is protective for engagement; RECIPROCITY is the strongest
 *   predictor a nominated pair will actually cooperate (van der Wilt et al.
 *   2018). The optimizer treats mentor→mentee as adjacent when both students
 *   independently nominate the same person, so unreciprocated nominations
 *   are recorded but weighted lower — see docs/RESEARCH_BASIS.md.
 *
 * B3 — FRONT / TEACHER-PROXIMITY PREFERENCE
 *   Action-zone effect: front-and-centre seats correlate with higher
 *   engagement and participation (Adams & Biddle 1970; Sommer 1967).
 *   Bicard et al. 2012 (JABA reversal design) and Wheldall & Lam 1987
 *   further show that seat *arrangement* (rows vs clusters) and
 *   teacher-assignment causally affect on-task behaviour. NOTE: the
 *   old "need to see the board" item collapsed onto the same construct
 *   (both routed to `requires_front_row`), so we merged them into ONE
 *   question with a clearer label — asking twice inflated the signal.
 *
 * B4 — NOISE / SENSORY SENSITIVITY (5-point)
 *   Adapted from GSQ-P (Sensory Sensitivity Questionnaire — Auditory
 *   subscale). A 5-point rating is more informative than the previous
 *   yes/somewhat/no and matches the source instrument's scoring; a rating
 *   of 4–5 routes into `requires_quiet_area`.
 *
 * B5 — "Prefer a window seat" — REMOVED.
 *   The literature review found no validated construct behind window
 *   preference and it does not carry a learning signal; keeping it made the
 *   questionnaire feel like a preference poll rather than an evidence-based
 *   assessment. Teachers who need real accessibility routing (glare, hearing
 *   loop) enter it as a special need in the teacher-side profile.
 *
 * A separate TEACHER-report track (see teacherSurvey.ts) covers items that
 * children — especially under age 8 — cannot self-report reliably (attention
 * regulation from SNAP-IV, behavioural difficulties from SDQ). Meta-analyses
 * of youth self-report show teacher–child agreement is only fair (r ≈ .2–.4)
 * for externalising behaviour, so those items live on the teacher side.
 */

export const MAX_SEATMATES = 3;

/** GSQ-P style noise sensitivity: 1 = doesn't bother me at all, 5 = very much. */
export type NoiseSensitivity = 1 | 2 | 3 | 4 | 5;
/** Generic 5-point Likert used for the belonging and teacher-attention items. */
export type Likert5 = 1 | 2 | 3 | 4 | 5;
/** Threshold at (or above) which the student is routed into a quiet area.
 *  4 = "quite a bit", matching the GSQ-P cut-off convention. */
export const NOISE_QUIET_THRESHOLD: NoiseSensitivity = 4;
/** Threshold at (or below) which low teacher-attention reinforces front-row
 *  placement, even if the student didn't explicitly pick "front". A rating of
 *  2 means the student rarely gets teacher attention — action-zone research
 *  (Adams & Biddle) says moving them forward materially improves this. */
export const LOW_ATTENTION_THRESHOLD: Likert5 = 2;
/** Threshold at (or above) which self-reported focus difficulty triggers
 *  front-row + quiet-area placement. 4 matches the BSCS/self-control
 *  literature's "often/very often" cut. */
export const HIGH_FOCUS_DIFFICULTY_THRESHOLD: Likert5 = 4;
/** Threshold at (or below) which low academic self-efficacy is stored on the
 *  student for the teacher's downstream review (e.g. peer-mentor pairing).
 *  Two means the student rarely feels they can succeed — MSLQ-style single
 *  items with a rating of 1–2 are the most stable predictors. */
export const LOW_SELF_EFFICACY_THRESHOLD: Likert5 = 2;
/** Threshold at (or above) which high movement need is captured as a
 *  seat-type preference (aisle or back row). Matches SPM-P body-awareness
 *  cut for "raised" — 4 or above. */
export const HIGH_MOVEMENT_THRESHOLD: Likert5 = 4;
/** Threshold at (or above) which self-reported vision difficulty triggers
 *  front-row placement independent of the student's stated preference.
 *  Clinically unambiguous — a child who reports trouble seeing the board
 *  belongs at the front regardless of what they'd otherwise pick. */
export const HIGH_VISION_DIFFICULTY_THRESHOLD: Likert5 = 4;

/**
 * Additional constructs added on top of B1–B4:
 *
 * B5 — SENSE OF BELONGING (PSSM Scale; Goodenow 1993).
 *   Classroom belonging predicts engagement, effort, and reduced dropout.
 *   Phrased as a concrete behavioural proxy ("how easy is it to find someone
 *   to talk to at recess?") — easier for children to answer than the abstract
 *   "do you feel a part of the class?", and validated as a proxy in the
 *   belonging literature. Low scores hint at social isolation; downstream this
 *   can suggest an "anchor" (nominated seatmate) is high-priority.
 *
 * B6 — LEARNING-STYLE PREFERENCE (Cooperative Learning; Johnson & Johnson).
 *   Preference for solo / pair / group work is a legitimate self-report
 *   construct (children can reliably describe how they like to work by ~age 8).
 *   Informs LAYOUT selection (rows for solo-preferring classes, clusters for
 *   group-preferring), not individual seat assignment.
 *
 * B7 — TEACHER-ATTENTION ACCESS (UDL; extends the action-zone construct).
 *   Front-row preference measures the student's *stated* wish; teacher-
 *   attention access measures the *outcome* — how often they actually get
 *   heard. A low score with a "middle/back" preference still routes to the
 *   front, because the outcome trumps the preference when it comes to
 *   learning (UDL Principle 3: Multiple Means of Engagement).
 *
 * B8 — SELF-REPORTED FOCUS DIFFICULTY (BSCS proxy; Tangney, Baumeister,
 *   Boone 2004). A single-item self-control / focus-difficulty rating.
 *   Student self-report on inattention is fair-to-good from ~age 8, and
 *   Brief Self-Control Scale items correlate with classroom on-task
 *   behaviour (r ≈ .3–.5). A rating ≥ 4 reinforces BOTH requires_front_row
 *   and requires_quiet_area — line-of-sight to the teacher plus a lower
 *   sensory-load location together move the intervention window into the
 *   student's favour.
 *
 * B9 — ACADEMIC SELF-EFFICACY (MSLQ; Pintrich 1991; Bandura 1997).
 *   A single-item efficacy stem ("I believe I can do well in this class")
 *   is the most widely validated brief measure — meta-analytic path
 *   coefficient to achievement β ≈ .30 (Multon, Brown & Lent 1991). Kept
 *   as an ANSWER-ONLY field for now (no direct seat routing): teachers
 *   commonly use low ratings as a signal to pair the student with a
 *   peer-mentor (nominated separately in B2), and downstream we can
 *   surface it in the student card.
 *
 * B10 — MOVEMENT / FIDGET NEED (Sensory Processing Measure – Home form,
 *   Body Awareness / Proprioception subscale; Miller-Kuhaneck et al.
 *   2007). Predicts benefit from seat types that accommodate small
 *   movement (aisle, back row, wobble cushion). Rating ≥ 4 is stored for
 *   the teacher's downstream review — actual routing to a movement-tolerant
 *   seat needs a room-shape signal we don't yet expose in the optimizer.
 *
 * B11 — VISION AT THE BOARD (single-item self-screening; adapted from
 *   Snellen-style item / CISS — Convergence Insufficiency Symptom Survey).
 *   Distinct from every other item — a child who reports trouble seeing
 *   the board belongs at the front regardless of what B3 (preference), B7
 *   (attention) or B8 (focus) say. Rating ≥ HIGH_VISION_DIFFICULTY_
 *   THRESHOLD triggers requires_front_row directly. This is a screening
 *   proxy, not a diagnostic — teachers should still forward a positive
 *   report to the school nurse / optometrist.
 */

export interface SurveyAnswers {
  /** B1 — up to 3 classmates the student would like to sit near (positive
   *  sociometric nominations only; no negative "least like" item — see file
   *  header for the ethical basis). */
  seatmates: string[];
  /** B3 — teacher-proximity / action-zone preference. Merges the previous
   *  focus-zone and "needs to see the board" questions, which both collapsed
   *  onto the same underlying construct (front-row placement). */
  frontPreference: 'front' | 'middle' | 'back' | null;
  /** B4 — noise sensitivity on a 5-point scale (GSQ-P Auditory subscale). */
  noise: NoiseSensitivity | null;
  /** B2 — a classmate who helps this student with schoolwork (peer-mentor).
   *  Recorded even if not reciprocated; reciprocity is checked downstream. */
  helper: string | null;
  /** B5 — sense-of-belonging proxy (1 = hard to find someone at recess,
   *  5 = very easy). PSSM Scale (Goodenow 1993). Informational for now;
   *  downstream can prioritise an anchor seatmate. */
  belonging: Likert5 | null;
  /** B6 — preferred way to work (Cooperative Learning; Johnson & Johnson).
   *  Aggregated across the class this informs layout choice; per-student it
   *  is stored but does not directly rewrite the student record. */
  learningStyle: 'alone' | 'pair' | 'group' | null;
  /** B7 — how easy it is for the student to get the teacher's attention in
   *  class (1 = very hard, 5 = very easy). UDL Engagement construct. A rating
   *  ≤ LOW_ATTENTION_THRESHOLD reinforces front-row placement. */
  teacherAttention: Likert5 | null;
  /** B8 — self-reported focus difficulty (1 = never hard, 5 = very hard).
   *  BSCS proxy (Tangney/Baumeister/Boone 2004). Rating ≥
   *  HIGH_FOCUS_DIFFICULTY_THRESHOLD reinforces front-row + quiet-area. */
  focusDifficulty: Likert5 | null;
  /** B9 — academic self-efficacy (1 = not at all, 5 = strongly agree).
   *  MSLQ single-item stem (Pintrich 1991). Captured for the teacher's
   *  review; no direct routing yet. */
  selfEfficacy: Likert5 | null;
  /** B10 — movement / fidget need (1 = never, 5 = a lot). SPM-P Body
   *  Awareness proxy. Captured for review; downstream routing to
   *  movement-tolerant seats pending. */
  movement: Likert5 | null;
  /** B11 — vision at the board (1 = never hard, 5 = very hard). Snellen /
   *  CISS proxy. Rating ≥ HIGH_VISION_DIFFICULTY_THRESHOLD triggers
   *  requires_front_row unconditionally — clinically unambiguous. */
  visionDifficulty: Likert5 | null;
}

export function emptyAnswers(): SurveyAnswers {
  return {
    seatmates: [],
    frontPreference: null,
    noise: null,
    helper: null,
    belonging: null,
    learningStyle: null,
    teacherAttention: null,
    focusDifficulty: null,
    selfEfficacy: null,
    movement: null,
    visionDifficulty: null,
  };
}

/**
 * Reconstruct the answers that best match a student's currently-saved
 * profile, so re-opening the questionnaire pre-fills sensibly rather than
 * wiping prior input. (Some mappings are lossy — e.g. we can't tell
 * "front" from "needs board" once both collapse to requires_front_row —
 * so we make reasonable choices.)
 */
export function answersFromStudent(
  student: Student,
  constraints: SeatingConstraints,
): SurveyAnswers {
  // The student's mentor is whoever is listed as their helper (mentor →
  // mentee, so we match on the mentee slot).
  const mentorPair = (constraints.peer_mentor_pairs ?? []).find(([, mentee]) => mentee === student.id);
  return {
    seatmates: (student.friends_ids ?? []).slice(0, MAX_SEATMATES),
    frontPreference: student.requires_front_row ? 'front' : null,
    // We saved noise as a boolean before this redesign, so any pre-existing
    // "requires_quiet_area" is treated as the max of the new scale.
    noise: student.requires_quiet_area ? 5 : null,
    helper: mentorPair ? mentorPair[0] : null,
    // The additional Likert / preference items aren't (yet) round-tripped
    // through the Student record; the modal starts them null on re-open,
    // matching the "no new signal available" semantics.
    belonging: null,
    learningStyle: null,
    teacherAttention: null,
    focusDifficulty: null,
    selfEfficacy: null,
    movement: null,
    visionDifficulty: null,
  };
}

/**
 * The student-record changes implied by the answers. Self-nominations and
 * duplicates are stripped, and the seatmate list is capped.
 */
export function surveyToStudentPatch(
  studentId: string,
  answers: SurveyAnswers,
): Partial<Student> {
  const seatmates = Array.from(new Set(answers.seatmates))
    .filter((id) => id !== studentId)
    .slice(0, MAX_SEATMATES);

  // Front-row placement is triggered by ANY of: a stated front preference,
  // a low teacher-attention rating, high focus difficulty, or high vision
  // difficulty. Vision is clinically unambiguous — a child who can't see
  // the board belongs at the front regardless of what they'd otherwise
  // pick. The rest follow UDL: outcome trumps stated wish when the outcome
  // is engagement/attention (Adams & Biddle; CAST 2018; BSCS).
  const lowAttention =
    answers.teacherAttention !== null && answers.teacherAttention <= LOW_ATTENTION_THRESHOLD;
  const highFocusDifficulty =
    answers.focusDifficulty !== null && answers.focusDifficulty >= HIGH_FOCUS_DIFFICULTY_THRESHOLD;
  const highVisionDifficulty =
    answers.visionDifficulty !== null && answers.visionDifficulty >= HIGH_VISION_DIFFICULTY_THRESHOLD;

  return {
    friends_ids: seatmates,
    requires_front_row:
      answers.frontPreference === 'front' ||
      lowAttention ||
      highFocusDifficulty ||
      highVisionDifficulty,
    // Quiet area is triggered by high noise sensitivity OR high focus
    // difficulty — both point to a lower-sensory-load location.
    requires_quiet_area:
      (answers.noise !== null && answers.noise >= NOISE_QUIET_THRESHOLD) || highFocusDifficulty,
  };
}

/**
 * Removed: `applyWindowPreference`. The "prefer a window seat" question was
 * dropped in the evidence-based redesign (see file header). Window-side needs
 * that are actually accessibility-driven (glare sensitivity, hearing loops)
 * belong in the teacher-entered student profile, not a student self-report.
 */

/**
 * Set (or clear) the student's mentor in the constraints' peer-mentor pairs.
 * Pairs are stored mentor-first (`[mentor, mentee]`); this replaces any
 * existing pairing where the student is the mentee. A null/self helper just
 * clears it. Returns the same reference when nothing changes.
 */
export function applyMentorPreference(
  constraints: SeatingConstraints,
  studentId: string,
  helperId: string | null,
): SeatingConstraints {
  // A self-nominated (or empty) helper means "no mentor".
  const effective = helperId && helperId !== studentId ? helperId : null;
  const pairs = constraints.peer_mentor_pairs ?? [];
  const existing = pairs.find(([, mentee]) => mentee === studentId);

  // No-op cases: nothing to clear, or the same mentor is already set.
  if (!effective && !existing) return constraints;
  if (effective && existing && existing[0] === effective) return constraints;

  const without = pairs.filter(([, mentee]) => mentee !== studentId);
  const next: [string, string][] = effective ? [...without, [effective, studentId]] : without;
  return { ...constraints, peer_mentor_pairs: next };
}
