/**
 * CSV roster parser — pure, no React or store dependencies so it can
 * be unit-tested in isolation. Returns the parsed students alongside
 * row-level errors and warnings; UI is responsible for surfacing them.
 */

import { generateId } from './sampleData';
import { parseDelimited } from '../core/roster/oneRoster';
import type { Student, Gender, AcademicLevel, BehaviorLevel } from '../types';

const VALID_GENDERS = ['male', 'female', 'other'];
const VALID_ACADEMIC = ['advanced', 'proficient', 'basic', 'below_basic'];
const VALID_BEHAVIOR = ['excellent', 'good', 'average', 'challenging'];

/** Hard ceiling on roster size — anything larger is almost certainly
 *  a malformed file or a copy-paste accident. */
export const MAX_ROSTER = 200;

export type Translator = (key: string, vars?: Record<string, string | number>) => string;

function parseBool(v: string): boolean {
  const s = v.trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

function parseStudent(
  row: Record<string, string>,
  rowNum: number,
  warnings: string[],
  t: Translator,
): Student | null {
  // Accept `name`, or the `student_name` / `student name` header the app's
  // own CSV export historically wrote, so an exported roster re-imports.
  const name = (row['name'] ?? row['student_name'] ?? row['student name'])?.trim();
  if (!name) return null;

  const rawGender = (row['gender'] ?? '').trim().toLowerCase();
  const gender: Gender = (
    VALID_GENDERS.includes(rawGender) ? rawGender : 'other'
  ) as Gender;
  if (rawGender && !VALID_GENDERS.includes(rawGender)) {
    warnings.push(t('csvImport.warn_invalid_value', { row: rowNum, column: 'gender', value: rawGender, fallback: 'other' }));
  }

  const rawAcad = (row['academic_level'] ?? '').trim().toLowerCase();
  const academic_level: AcademicLevel = (
    VALID_ACADEMIC.includes(rawAcad) ? rawAcad : 'proficient'
  ) as AcademicLevel;
  if (rawAcad && !VALID_ACADEMIC.includes(rawAcad)) {
    warnings.push(t('csvImport.warn_invalid_value', { row: rowNum, column: 'academic_level', value: rawAcad, fallback: 'proficient' }));
  }

  const rawBeh = (row['behavior_level'] ?? '').trim().toLowerCase();
  const behavior_level: BehaviorLevel = (
    VALID_BEHAVIOR.includes(rawBeh) ? rawBeh : 'good'
  ) as BehaviorLevel;
  if (rawBeh && !VALID_BEHAVIOR.includes(rawBeh)) {
    warnings.push(t('csvImport.warn_invalid_value', { row: rowNum, column: 'behavior_level', value: rawBeh, fallback: 'good' }));
  }

  const parseScore = (col: string, fallback: number): number => {
    const raw = row[col]?.trim();
    if (!raw) return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      warnings.push(t('csvImport.warn_invalid_score', { row: rowNum, column: col, value: raw }));
      return fallback;
    }
    if (n < 0 || n > 100) {
      warnings.push(t('csvImport.warn_score_clamped', { row: rowNum, column: col, value: n }));
      return Math.min(100, Math.max(0, n));
    }
    return n;
  };

  return {
    id: generateId(),
    name,
    gender,
    academic_level,
    academic_score: parseScore('academic_score', 70),
    behavior_level,
    behavior_score: parseScore('behavior_score', 70),
    primary_language: row['primary_language']?.trim() || undefined,
    is_bilingual: parseBool(row['is_bilingual'] ?? ''),
    requires_front_row: parseBool(row['requires_front_row'] ?? ''),
    has_mobility_issues: parseBool(row['has_mobility_issues'] ?? ''),
    requires_quiet_area: parseBool(row['requires_quiet_area'] ?? ''),
    friends_ids: [],
    incompatible_ids: [],
    special_needs: [],
    notes: row['notes']?.trim() || undefined,
  };
}

export function parseCsv(
  text: string,
  t: Translator,
): { students: Student[]; errors: string[]; warnings: string[] } {
  // RFC-4180-aware parsing (quoted fields, embedded commas, "" escapes) —
  // shared with the OneRoster importer. Returns header-keyed rows with
  // blank lines already dropped.
  const records = parseDelimited(text);
  if (records.length === 0) return { students: [], errors: [t('csvImport.error_no_header')], warnings: [] };

  // parseDelimited keys every row by the original (trimmed) header text;
  // our column names are case-insensitive, so lowercase the keys.
  const NAME_HEADERS = ['name', 'student_name', 'student name'];
  if (!Object.keys(records[0]).some((h) => NAME_HEADERS.includes(h.toLowerCase()))) {
    return { students: [], errors: [t('csvImport.error_missing_name')], warnings: [] };
  }

  const students: Student[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenNames = new Map<string, number>();

  const dataRecords = records.slice(0, MAX_ROSTER);
  if (records.length > MAX_ROSTER) {
    warnings.push(t('csvImport.warn_too_many_rows', { max: MAX_ROSTER }));
  }

  dataRecords.forEach((record, i) => {
    const rowNum = i + 2; // 1-indexed + header
    const row: Record<string, string> = {};
    for (const [h, v] of Object.entries(record)) row[h.toLowerCase()] = v;

    const student = parseStudent(row, rowNum, warnings, t);
    if (!student) {
      errors.push(t('csvImport.error_missing_name_row', { row: rowNum }));
      return;
    }

    // Duplicate-name detection — siblings can share a name so it's
    // only a warning, not a hard error.
    const key = student.name.toLowerCase();
    const seenAt = seenNames.get(key);
    if (seenAt) {
      warnings.push(t('csvImport.warn_duplicate_name', { name: student.name, first: seenAt, second: rowNum }));
    } else {
      seenNames.set(key, rowNum);
    }

    students.push(student);
  });

  return { students, errors, warnings };
}
