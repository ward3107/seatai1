/**
 * Google Classroom roster provider.
 *
 * The mapping functions (`mapCourses`, `mapStudents`) are pure and the focus
 * of the unit tests — they turn raw Classroom REST JSON into our normalised
 * shapes and are defensive about missing/partial fields. The `fetch*`
 * helpers are thin: they call the Classroom REST API directly from the
 * browser with the user's OAuth access token, so **student data never
 * touches a SeatAI server** — it goes Google → this browser → IndexedDB.
 */

import { studentFromRoster, type RosterClass, type RosterStudentInput } from './types';

const API = 'https://classroom.googleapis.com/v1';

/** OAuth scopes we request — read-only course list + student rosters. */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
].join(' ');

export interface GoogleCourse {
  id: string;
  name: string;
}

// ── Pure mappers ──────────────────────────────────────────────────────────

/** Extract `{ id, name }` for each usable course from a courses.list reply. */
export function mapCourses(json: unknown): GoogleCourse[] {
  const courses = (json as { courses?: unknown[] })?.courses;
  if (!Array.isArray(courses)) return [];
  const out: GoogleCourse[] = [];
  for (const c of courses) {
    const course = c as { id?: unknown; name?: unknown };
    if (typeof course.id === 'string' && typeof course.name === 'string') {
      out.push({ id: course.id, name: course.name });
    }
  }
  return out;
}

/** Pull a display name + ids out of one students.list page. Skips entries
 *  with no resolvable name. Falls back from fullName → given+family. */
export function mapStudents(json: unknown): RosterStudentInput[] {
  const students = (json as { students?: unknown[] })?.students;
  if (!Array.isArray(students)) return [];
  const out: RosterStudentInput[] = [];
  for (const s of students) {
    const entry = s as {
      userId?: unknown;
      profile?: {
        name?: { fullName?: unknown; givenName?: unknown; familyName?: unknown };
        emailAddress?: unknown;
      };
    };
    const name = entry.profile?.name;
    const full =
      (typeof name?.fullName === 'string' && name.fullName.trim()) ||
      [name?.givenName, name?.familyName]
        .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
        .join(' ')
        .trim();
    if (!full) continue;
    out.push({
      name: full,
      sourceId: typeof entry.userId === 'string' ? entry.userId : undefined,
      email: typeof entry.profile?.emailAddress === 'string' ? entry.profile.emailAddress : undefined,
    });
  }
  return out;
}

// ── Thin network helpers ───────────────────────────────────────────────────

async function apiGet(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Google Classroom API ${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.json();
}

/** List the active courses the signed-in user teaches. */
export async function fetchCourses(token: string): Promise<GoogleCourse[]> {
  const json = await apiGet('/courses?teacherId=me&courseStates=ACTIVE&pageSize=100', token);
  return mapCourses(json);
}

/** Fetch every student in a course, following pagination, and normalise to
 *  full `Student` records ready to drop into the store. */
export async function fetchRoster(token: string, course: GoogleCourse): Promise<RosterClass> {
  const inputs: RosterStudentInput[] = [];
  let pageToken: string | undefined;
  // Cap pages defensively so a pathological response can't loop forever.
  for (let page = 0; page < 20; page++) {
    const qs = `?pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const json = (await apiGet(`/courses/${encodeURIComponent(course.id)}/students${qs}`, token)) as {
      nextPageToken?: string;
    };
    inputs.push(...mapStudents(json));
    pageToken = typeof json.nextPageToken === 'string' ? json.nextPageToken : undefined;
    if (!pageToken) break;
  }
  return {
    sourceId: course.id,
    name: course.name,
    students: inputs.map(studentFromRoster),
  };
}
