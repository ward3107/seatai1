/**
 * OneRoster CSV roster provider.
 *
 * OneRoster (1EdTech) is the open rostering standard every major SIS can
 * export — and ClassLink, PowerSchool and Infinite Campus all speak it. The
 * CSV profile is a bundle of files (users.csv, classes.csv, enrollments.csv,
 * …). Rather than depend on a zip library, we let the teacher/admin upload
 * those CSVs directly (multi-select) and auto-classify each by its header
 * columns, then join them into our normalised `RosterClass[]`.
 *
 * Everything here is pure and unit-tested; parsing happens entirely in the
 * browser, so no roster data leaves the device.
 */

import { studentFromRoster, type RosterClass, type RosterStudentInput } from './types';

export interface OneRosterFile {
  name: string;
  text: string;
}

export interface OneRosterParseResult {
  classes: RosterClass[];
  warnings: string[];
  errors: string[];
}

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, commas and
 *  newlines inside quotes, and "" escapes. Returns header-keyed rows. */
export function parseDelimited(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\n') {
      pushRow();
    } else if (ch === '\r') {
      // swallow — \r\n handled by the \n branch
    } else field += ch;
  }
  // Trailing field/row (file may not end with a newline).
  if (field.length > 0 || row.length > 0) pushRow();

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c.trim() !== '')) // drop blank lines
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
      return obj;
    });
}

type FileKind = 'users' | 'classes' | 'enrollments' | 'unknown';

/** Identify which OneRoster file this is from its header columns. */
function classify(rows: Record<string, string>[]): FileKind {
  if (rows.length === 0) return 'unknown';
  const cols = new Set(Object.keys(rows[0]));
  if (cols.has('classSourcedId') && cols.has('userSourcedId')) return 'enrollments';
  if (cols.has('givenName') && cols.has('familyName')) return 'users';
  if (cols.has('title') && (cols.has('courseSourcedId') || cols.has('classType'))) return 'classes';
  return 'unknown';
}

const isActive = (status: string | undefined) =>
  !status || status.toLowerCase() !== 'tobedeleted';

const fullName = (u: Record<string, string>) =>
  [u.givenName, u.middleName, u.familyName]
    .filter((p) => p && p.trim())
    .join(' ')
    .trim();

/**
 * Parse a set of uploaded OneRoster CSV files into class rosters. Skips
 * `tobedeleted` rows, dedupes students per class, and reports which files
 * were missing / unrecognised.
 */
export function parseOneRoster(files: OneRosterFile[]): OneRosterParseResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const users = new Map<string, RosterStudentInput>();
  const classTitles = new Map<string, string>();
  // classSourcedId -> ordered list of student userSourcedIds
  const enrolByClass = new Map<string, string[]>();
  let sawUsers = false;
  let sawEnrollments = false;

  for (const file of files) {
    let rows: Record<string, string>[];
    try {
      rows = parseDelimited(file.text);
    } catch {
      warnings.push(`oneRoster.warn_unreadable_file:${file.name}`);
      continue;
    }
    const kind = classify(rows);
    if (kind === 'users') {
      sawUsers = true;
      for (const u of rows) {
        if (!isActive(u.status)) continue;
        const role = (u.role ?? '').toLowerCase();
        // Keep students (and unspecified roles); ignore teachers/admins.
        if (role && role !== 'student') continue;
        const name = fullName(u);
        if (!u.sourcedId || !name) continue;
        users.set(u.sourcedId, { name, sourceId: u.sourcedId, email: u.email || undefined });
      }
    } else if (kind === 'classes') {
      for (const c of rows) {
        if (!isActive(c.status) || !c.sourcedId) continue;
        classTitles.set(c.sourcedId, c.title?.trim() || c.sourcedId);
      }
    } else if (kind === 'enrollments') {
      sawEnrollments = true;
      for (const e of rows) {
        if (!isActive(e.status)) continue;
        if ((e.role ?? '').toLowerCase() !== 'student') continue;
        if (!e.classSourcedId || !e.userSourcedId) continue;
        const list = enrolByClass.get(e.classSourcedId) ?? [];
        list.push(e.userSourcedId);
        enrolByClass.set(e.classSourcedId, list);
      }
    } else {
      warnings.push(`oneRoster.warn_unrecognised_file:${file.name}`);
    }
  }

  if (!sawUsers) errors.push('oneRoster.error_no_users');
  if (!sawEnrollments) errors.push('oneRoster.error_no_enrollments');
  if (errors.length) return { classes: [], warnings, errors };

  const classes: RosterClass[] = [];
  for (const [classId, userIds] of enrolByClass) {
    const seen = new Set<string>();
    const students = [];
    for (const uid of userIds) {
      if (seen.has(uid)) continue;
      seen.add(uid);
      const u = users.get(uid);
      if (!u) continue; // enrollment points at a non-student / unknown user
      students.push(studentFromRoster(u));
    }
    if (students.length === 0) continue;
    classes.push({
      sourceId: classId,
      name: classTitles.get(classId) ?? classId,
      students,
    });
  }

  // Stable, friendly ordering by class name.
  classes.sort((a, b) => a.name.localeCompare(b.name));
  return { classes, warnings, errors };
}
