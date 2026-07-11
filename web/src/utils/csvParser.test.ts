import { describe, it, expect } from 'vitest';
import { parseCsv, MAX_ROSTER } from './csvParser';

// Pass-through translator — we assert on the keys & interpolated values
// rather than localized strings so tests don't depend on locale files.
const t = (key: string, vars?: Record<string, string | number>) => {
  if (!vars) return key;
  const parts = Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(' ');
  return `${key}|${parts}`;
};

describe('parseCsv', () => {
  it('errors when there are no rows', () => {
    const { students, errors, warnings } = parseCsv('', t);
    expect(students).toEqual([]);
    expect(errors).toContain('csvImport.error_no_header');
    expect(warnings).toEqual([]);
  });

  it('errors when there is no `name` column', () => {
    const { students, errors } = parseCsv('gender,academic_level\nfemale,advanced', t);
    expect(students).toEqual([]);
    expect(errors[0]).toBe('csvImport.error_missing_name');
  });

  it('accepts the `student_name` header the app export writes (round-trip)', () => {
    // The seating-chart CSV export historically wrote `student_name`; a
    // re-import of that exact file must work, not fail with missing-name.
    const csv = 'row,col,student_name,gender\n1,1,Alice,female\n1,2,Bob,male';
    const { students, errors } = parseCsv(csv, t);
    expect(errors).toEqual([]);
    expect(students.map((s) => s.name)).toEqual(['Alice', 'Bob']);
  });

  it('reports a per-row error when name cell is empty', () => {
    const csv = 'name,gender\n,female\nAlice,female';
    const { students, errors } = parseCsv(csv, t);
    expect(students).toHaveLength(1);
    expect(students[0].name).toBe('Alice');
    expect(errors.some((e) => e.includes('row=2'))).toBe(true);
  });

  it('parses a clean roster with no warnings', () => {
    const csv = [
      'name,gender,academic_level,academic_score,behavior_level,behavior_score,notes',
      'Alice,female,advanced,90,excellent,95,Strong reader',
      'Bob,male,proficient,75,good,80,',
    ].join('\n');
    const { students, errors, warnings } = parseCsv(csv, t);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(students).toHaveLength(2);
    expect(students[0]).toMatchObject({
      name: 'Alice',
      gender: 'female',
      academic_level: 'advanced',
      academic_score: 90,
      behavior_level: 'excellent',
      behavior_score: 95,
      notes: 'Strong reader',
    });
    expect(students[1].notes).toBeUndefined();
  });

  it('warns on invalid gender/academic/behavior values and applies safe defaults', () => {
    const csv = [
      'name,gender,academic_level,behavior_level',
      'Alice,martian,wizard,terrible',
    ].join('\n');
    const { students, warnings } = parseCsv(csv, t);
    expect(students[0].gender).toBe('other');
    expect(students[0].academic_level).toBe('proficient');
    expect(students[0].behavior_level).toBe('good');
    expect(warnings.some((w) => w.includes('column=gender'))).toBe(true);
    expect(warnings.some((w) => w.includes('column=academic_level'))).toBe(true);
    expect(warnings.some((w) => w.includes('column=behavior_level'))).toBe(true);
  });

  it('warns when a score is non-numeric and falls back to 70', () => {
    const csv = 'name,academic_score\nAlice,banana';
    const { students, warnings } = parseCsv(csv, t);
    expect(students[0].academic_score).toBe(70);
    expect(warnings.some((w) => w.includes('warn_invalid_score'))).toBe(true);
  });

  it('clamps out-of-range scores to [0, 100] and warns', () => {
    const csv = [
      'name,academic_score,behavior_score',
      'Alice,150,-20',
    ].join('\n');
    const { students, warnings } = parseCsv(csv, t);
    expect(students[0].academic_score).toBe(100);
    expect(students[0].behavior_score).toBe(0);
    expect(warnings.filter((w) => w.includes('warn_score_clamped'))).toHaveLength(2);
  });

  it('warns when two rows share the same name (case-insensitive)', () => {
    const csv = ['name', 'Alice', 'alice'].join('\n');
    const { students, warnings } = parseCsv(csv, t);
    expect(students).toHaveLength(2);
    expect(warnings.some((w) => w.includes('warn_duplicate_name'))).toBe(true);
    expect(warnings.some((w) => w.includes('first=2') && w.includes('second=3'))).toBe(true);
  });

  it(`caps imports at ${MAX_ROSTER} rows and warns about the overflow`, () => {
    const header = 'name';
    const rows = Array.from({ length: MAX_ROSTER + 50 }, (_, i) => `Student${i}`);
    const csv = [header, ...rows].join('\n');
    const { students, warnings } = parseCsv(csv, t);
    expect(students.length).toBe(MAX_ROSTER);
    expect(warnings.some((w) => w.includes(`max=${MAX_ROSTER}`))).toBe(true);
  });

  it('parses a quoted field containing a comma as a single value', () => {
    const csv = [
      'name,gender,notes',
      '"Cohen, Alice",female,Strong reader',
    ].join('\n');
    const { students, errors, warnings } = parseCsv(csv, t);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(students).toHaveLength(1);
    expect(students[0].name).toBe('Cohen, Alice');
    expect(students[0].gender).toBe('female');
    expect(students[0].notes).toBe('Strong reader');
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    const csv = [
      'name,notes',
      '"Alice ""The Great""","Says ""hi"", often"',
    ].join('\n');
    const { students, errors } = parseCsv(csv, t);
    expect(errors).toEqual([]);
    expect(students[0].name).toBe('Alice "The Great"');
    expect(students[0].notes).toBe('Says "hi", often');
  });

  it('accepts quoted header cells', () => {
    const csv = [
      '"name","gender","academic_score"',
      'Alice,female,88',
    ].join('\n');
    const { students, errors } = parseCsv(csv, t);
    expect(errors).toEqual([]);
    expect(students[0]).toMatchObject({ name: 'Alice', gender: 'female', academic_score: 88 });
  });

  it('parses boolean-ish columns from "true"/"1"/"yes"', () => {
    const csv = [
      'name,is_bilingual,requires_front_row,has_mobility_issues,requires_quiet_area',
      'A,true,1,yes,no',
      'B,false,0,,FALSE',
    ].join('\n');
    const { students } = parseCsv(csv, t);
    expect(students[0]).toMatchObject({
      is_bilingual: true,
      requires_front_row: true,
      has_mobility_issues: true,
      requires_quiet_area: false,
    });
    expect(students[1]).toMatchObject({
      is_bilingual: false,
      requires_front_row: false,
      has_mobility_issues: false,
      requires_quiet_area: false,
    });
  });
});
