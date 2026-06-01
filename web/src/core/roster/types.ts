/**
 * Provider-agnostic roster import layer.
 *
 * Every external roster source (Google Classroom today; Clever / OneRoster /
 * LTI later) maps onto this single internal shape. The UI and store only ever
 * see `RosterClass` / `Student`, so adding a provider never touches the rest
 * of the app. Pure and dependency-light so the mappers can be unit-tested.
 */

import { generateId } from '../../utils/sampleData';
import type { Student } from '../../types';

/** A class roster pulled from an external source, normalised. */
export interface RosterClass {
  /** Stable provider id for the class (e.g. Google course id). */
  sourceId: string;
  /** Human-readable class name to show in the picker / save as a project. */
  name: string;
  /** Students in the class. */
  students: Student[];
}

/** The minimal per-student data a provider can supply. Everything beyond a
 *  name is optional — the teacher fills behaviour/ability in afterwards. */
export interface RosterStudentInput {
  name: string;
  /** Provider's stable id for the student, kept for future re-sync/dedup. */
  sourceId?: string;
  email?: string;
}

/**
 * Build a full `Student` from the sparse data a roster provider gives us,
 * applying the same neutral defaults the CSV importer uses (so an imported
 * student looks identical to a hand-entered one and the optimiser treats
 * them sensibly until the teacher adjusts the details).
 */
export function studentFromRoster(input: RosterStudentInput): Student {
  return {
    id: generateId(),
    name: input.name.trim(),
    gender: 'other',
    academic_level: 'proficient',
    academic_score: 70,
    behavior_level: 'good',
    behavior_score: 70,
    primary_language: undefined,
    is_bilingual: false,
    requires_front_row: false,
    has_mobility_issues: false,
    requires_quiet_area: false,
    friends_ids: [],
    incompatible_ids: [],
    special_needs: [],
    notes: input.email ? `Imported · ${input.email}` : undefined,
  };
}
