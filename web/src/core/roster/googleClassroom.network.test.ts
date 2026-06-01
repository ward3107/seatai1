/**
 * @vitest-environment node
 *
 * Network-glue tests for the Google Classroom provider: the fetch helpers that
 * call the Classroom REST API (mocked here), including bearer auth and
 * nextPageToken pagination. The pure mappers are covered in
 * googleClassroom.test.ts.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { fetchCourses, fetchRoster } from './googleClassroom';

afterEach(() => vi.unstubAllGlobals());

const jsonRes = (obj: unknown, ok = true) =>
  new Response(JSON.stringify(obj), { status: ok ? 200 : 403, headers: { 'content-type': 'application/json' } });

describe('fetchCourses', () => {
  it('sends the bearer token and maps active courses', async () => {
    let authHeader = '';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        authHeader = String((init.headers as Record<string, string>).Authorization);
        return jsonRes({ courses: [{ id: '1', name: 'Math' }, { id: '2', name: 'Science' }] });
      }),
    );
    const courses = await fetchCourses('tok-abc');
    expect(authHeader).toBe('Bearer tok-abc');
    expect(courses).toEqual([{ id: '1', name: 'Math' }, { id: '2', name: 'Science' }]);
  });

  it('throws a helpful error on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonRes({ error: 'forbidden' }, false)));
    await expect(fetchCourses('tok')).rejects.toThrow(/403/);
  });
});

describe('fetchRoster', () => {
  it('follows nextPageToken pagination and builds students', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls++;
        if (!url.includes('pageToken')) {
          return jsonRes({
            students: [{ userId: 'a', profile: { name: { fullName: 'Alice' }, emailAddress: 'a@s.org' } }],
            nextPageToken: 'PAGE2',
          });
        }
        return jsonRes({
          students: [{ userId: 'b', profile: { name: { givenName: 'Bob', familyName: 'Levi' } } }],
        });
      }),
    );
    const roster = await fetchRoster('tok', { id: 'c1', name: 'Grade 5 Math' });
    expect(calls).toBe(2);
    expect(roster.name).toBe('Grade 5 Math');
    expect(roster.students.map((s) => s.name).sort()).toEqual(['Alice', 'Bob Levi']);
    // Email is carried into notes; neutral defaults applied.
    expect(roster.students.find((s) => s.name === 'Alice')?.notes).toContain('a@s.org');
    expect(roster.students[0].academic_level).toBe('proficient');
  });
});
