import type { Student, SeatingConstraints } from '../../types';

/**
 * Pure mapping between the student questionnaire answers and the data
 * SeatAI's optimizer actually consumes. Kept side-effect free so it's
 * easy to unit-test and so the modal stays thin.
 *
 * See docs/QUESTIONNAIRE.md for the spec these items implement.
 */

export const MAX_SEATMATES = 3;

export interface SurveyAnswers {
  /** B1 — up to 3 classmates the student would like to sit near. */
  seatmates: string[];
  /** B3 — where the student focuses best. */
  focusZone: 'front' | 'middle' | 'back' | null;
  /** B4 — does noise distract them? */
  noise: 'yes' | 'somewhat' | 'no' | null;
  /** B5 — prefers sitting near a window. */
  preferWindow: boolean | null;
  /** B6 — needs to see/hear the board clearly. */
  needBoardClear: boolean | null;
  /** B2 — a classmate who helps this student with schoolwork (mentor). */
  helper: string | null;
}

export function emptyAnswers(): SurveyAnswers {
  return {
    seatmates: [],
    focusZone: null,
    noise: null,
    preferWindow: null,
    needBoardClear: null,
    helper: null,
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
  const nearWindow = constraints.near_window_ids ?? [];
  // The student's mentor is whoever is listed as their helper (mentor →
  // mentee, so we match on the mentee slot).
  const mentorPair = (constraints.peer_mentor_pairs ?? []).find(([, mentee]) => mentee === student.id);
  return {
    seatmates: (student.friends_ids ?? []).slice(0, MAX_SEATMATES),
    focusZone: student.requires_front_row ? 'front' : null,
    noise: student.requires_quiet_area ? 'yes' : null,
    preferWindow: nearWindow.includes(student.id) ? true : null,
    needBoardClear: student.requires_front_row ? true : null,
    helper: mentorPair ? mentorPair[0] : null,
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

  return {
    friends_ids: seatmates,
    requires_front_row: answers.focusZone === 'front' || answers.needBoardClear === true,
    requires_quiet_area: answers.noise === 'yes',
  };
}

/**
 * Add or remove the student from the constraints' near-window list based on
 * the window preference. Returns the same object reference when nothing
 * changes so callers can skip a no-op write. A null preference is treated
 * as "no opinion" and leaves any existing membership untouched.
 */
export function applyWindowPreference(
  constraints: SeatingConstraints,
  studentId: string,
  prefer: boolean | null,
): SeatingConstraints {
  if (prefer === null) return constraints;
  const current = constraints.near_window_ids ?? [];
  const has = current.includes(studentId);
  if (prefer && !has) {
    return { ...constraints, near_window_ids: [...current, studentId] };
  }
  if (!prefer && has) {
    return { ...constraints, near_window_ids: current.filter((id) => id !== studentId) };
  }
  return constraints;
}

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
