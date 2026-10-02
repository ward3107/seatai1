import type { Student, SeatingConstraints } from '../../types';

/** Research-informed classroom feedback, not a validated psychometric or diagnostic instrument.
 * All thresholds below are product heuristics, not clinical cutoffs. A teacher reviews
 * the original responses before applying any suggested seating accommodations.
 * See docs/QUESTIONNAIRE_METHOD.md for evidence and limitations.
 */
export type NoiseSensitivity = 1 | 2 | 3 | 4 | 5;
export const MAX_SEATMATES = 3;

export type Likert5 = 1 | 2 | 3 | 4 | 5;

export const NOISE_QUIET_THRESHOLD: NoiseSensitivity = 4;

export const LOW_ATTENTION_THRESHOLD: Likert5 = 2;

export const HIGH_FOCUS_DIFFICULTY_THRESHOLD: Likert5 = 4;

export const LOW_SELF_EFFICACY_THRESHOLD: Likert5 = 2;

export const HIGH_MOVEMENT_THRESHOLD: Likert5 = 4;

export const HIGH_VISION_DIFFICULTY_THRESHOLD: Likert5 = 4;


export interface SurveyAnswers {

  seatmates: string[];

  frontPreference: 'front' | 'middle' | 'back' | null;

  noise: NoiseSensitivity | null;

  helper: string | null;

  belonging: Likert5 | null;

  learningStyle: 'alone' | 'pair' | 'group' | null;

  teacherAttention: Likert5 | null;

  focusDifficulty: Likert5 | null;

  selfEfficacy: Likert5 | null;

  movement: Likert5 | null;

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
  if (student.surveyAnswers) return structuredClone(student.surveyAnswers);
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

/** A missing question must not erase teacher-confirmed data. */
export function reviewedSurveyPatch(student: Student, answers: SurveyAnswers, includesPeers: boolean): Partial<Student> {
  const patch = surveyToStudentPatch(student.id, answers);
  if (!includesPeers) delete patch.friends_ids;
  patch.requires_front_row = student.requires_front_row || !!patch.requires_front_row;
  patch.requires_quiet_area = student.requires_quiet_area || !!patch.requires_quiet_area;
  return patch;
}
