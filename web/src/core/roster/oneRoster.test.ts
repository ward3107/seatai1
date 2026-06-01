import { describe, it, expect } from 'vitest';
import { parseDelimited, parseOneRoster } from './oneRoster';

describe('parseDelimited', () => {
  it('parses quoted fields with commas and escaped quotes', () => {
    const csv = 'a,b,c\n"x,1","say ""hi""",z\nplain,2,3';
    expect(parseDelimited(csv)).toEqual([
      { a: 'x,1', b: 'say "hi"', c: 'z' },
      { a: 'plain', b: '2', c: '3' },
    ]);
  });

  it('handles CRLF line endings and trailing newline, dropping blank rows', () => {
    const csv = 'h1,h2\r\nv1,v2\r\n\r\n';
    expect(parseDelimited(csv)).toEqual([{ h1: 'v1', h2: 'v2' }]);
  });
});

const usersCsv = [
  'sourcedId,status,givenName,familyName,role,email',
  'u1,active,Alice,Cohen,student,alice@school.org',
  'u2,active,Yossi,Levi,student,',
  't1,active,Dana,Teacher,teacher,dana@school.org',
  'u3,tobedeleted,Old,Student,student,',
].join('\n');

const classesCsv = [
  'sourcedId,status,title,courseSourcedId',
  'c1,active,Grade 5 Math,course1',
  'c2,active,Grade 5 Science,course2',
].join('\n');

const enrollmentsCsv = [
  'sourcedId,status,classSourcedId,userSourcedId,role',
  'e1,active,c1,u1,student',
  'e2,active,c1,u2,student',
  'e3,active,c1,u1,student',       // duplicate enrollment — should dedupe
  'e4,active,c1,t1,teacher',       // teacher enrollment — ignored
  'e5,active,c2,u3,student',       // points at a tobedeleted user — skipped
].join('\n');

describe('parseOneRoster', () => {
  it('joins users + classes + enrollments into class rosters', () => {
    const res = parseOneRoster([
      { name: 'users.csv', text: usersCsv },
      { name: 'classes.csv', text: classesCsv },
      { name: 'enrollments.csv', text: enrollmentsCsv },
    ]);
    expect(res.errors).toEqual([]);
    // c2's only student was tobedeleted → class dropped (no students).
    expect(res.classes).toHaveLength(1);
    const math = res.classes[0];
    expect(math.name).toBe('Grade 5 Math');
    expect(math.students.map((s) => s.name).sort()).toEqual(['Alice Cohen', 'Yossi Levi']);
    // Alice's email is carried into notes; defaults applied.
    expect(math.students.find((s) => s.name === 'Alice Cohen')?.notes).toContain('alice@school.org');
    expect(math.students[0].academic_level).toBe('proficient');
  });

  it('errors clearly when required files are missing', () => {
    const res = parseOneRoster([{ name: 'classes.csv', text: classesCsv }]);
    expect(res.classes).toEqual([]);
    expect(res.errors).toContain('oneRoster.error_no_users');
    expect(res.errors).toContain('oneRoster.error_no_enrollments');
  });

  it('warns about unrecognised files but still imports', () => {
    const res = parseOneRoster([
      { name: 'users.csv', text: usersCsv },
      { name: 'enrollments.csv', text: enrollmentsCsv },
      { name: 'junk.csv', text: 'foo,bar\n1,2' },
    ]);
    expect(res.errors).toEqual([]);
    expect(res.warnings.some((w) => w.startsWith('oneRoster.warn_unrecognised_file:junk.csv'))).toBe(true);
    // Class title falls back to the class sourcedId when classes.csv absent.
    expect(res.classes[0].name).toBe('c1');
  });
});
