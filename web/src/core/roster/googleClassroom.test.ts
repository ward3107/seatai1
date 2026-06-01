import { describe, it, expect } from 'vitest';
import { mapCourses, mapStudents } from './googleClassroom';
import { studentFromRoster } from './types';

describe('mapCourses', () => {
  it('extracts id + name from a courses.list reply', () => {
    const json = {
      courses: [
        { id: '101', name: 'Grade 5 Math', section: 'A' },
        { id: '102', name: 'Grade 5 Science' },
      ],
    };
    expect(mapCourses(json)).toEqual([
      { id: '101', name: 'Grade 5 Math' },
      { id: '102', name: 'Grade 5 Science' },
    ]);
  });

  it('skips malformed entries and tolerates missing/empty input', () => {
    expect(mapCourses({ courses: [{ id: 7, name: 'no' }, { name: 'x' }, { id: '9', name: 'OK' }] }))
      .toEqual([{ id: '9', name: 'OK' }]);
    expect(mapCourses({})).toEqual([]);
    expect(mapCourses(null)).toEqual([]);
  });
});

describe('mapStudents', () => {
  it('reads fullName and keeps userId + email', () => {
    const json = {
      students: [
        { userId: 'u1', profile: { name: { fullName: 'Alice Cohen' }, emailAddress: 'a@school.org' } },
      ],
    };
    expect(mapStudents(json)).toEqual([
      { name: 'Alice Cohen', sourceId: 'u1', email: 'a@school.org' },
    ]);
  });

  it('falls back to given + family name when fullName is absent', () => {
    const json = {
      students: [{ userId: 'u2', profile: { name: { givenName: 'Yossi', familyName: 'Levi' } } }],
    };
    expect(mapStudents(json)[0].name).toBe('Yossi Levi');
  });

  it('skips students with no resolvable name and tolerates junk', () => {
    const json = {
      students: [
        { userId: 'u3', profile: { name: {} } },
        { userId: 'u4' },
        { userId: 'u5', profile: { name: { fullName: '   ' } } },
        { userId: 'u6', profile: { name: { fullName: 'Real Name' } } },
      ],
    };
    expect(mapStudents(json).map((s) => s.name)).toEqual(['Real Name']);
    expect(mapStudents({})).toEqual([]);
  });
});

describe('studentFromRoster', () => {
  it('produces a complete Student with neutral defaults and a unique id', () => {
    const a = studentFromRoster({ name: 'Mariam Hassan', email: 'm@school.org' });
    const b = studentFromRoster({ name: 'Mariam Hassan' });
    expect(a.name).toBe('Mariam Hassan');
    expect(a.academic_level).toBe('proficient');
    expect(a.behavior_level).toBe('good');
    expect(a.academic_score).toBe(70);
    expect(a.friends_ids).toEqual([]);
    expect(a.special_needs).toEqual([]);
    expect(a.notes).toContain('m@school.org');
    expect(b.notes).toBeUndefined();
    expect(a.id).not.toBe(b.id); // unique ids
  });
});
